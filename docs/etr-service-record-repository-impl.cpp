#include "records/record_repository.h"
#include "logging/logger.h"
#include <uuid.h>
#include <chrono>
#include <sstream>

namespace etr {
namespace records {

RecordRepository::RecordRepository(std::shared_ptr<persistence::DatabaseConnection> db_connection)
    : db_connection_(std::move(db_connection)) {
    
    logging::Logger::getInstance().info("RecordRepository initialized");
}

RecordRepository::~RecordRepository() = default;

std::string RecordRepository::createRecord(const TrainingRecord& record) {
    auto transaction = db_connection_->createTransaction();
    
    try {
        // Generate a new ID if not provided
        std::string record_id = record.getRecordId();
        if (record_id.empty()) {
            record_id = generateUniqueId();
        }
        
        // Convert timestamps to database format
        int64_t date = std::chrono::duration_cast<std::chrono::milliseconds>(
            record.getDate().time_since_epoch()).count();
        
        int64_t created_at = std::chrono::duration_cast<std::chrono::milliseconds>(
            record.getCreatedAt().time_since_epoch()).count();
        
        int64_t updated_at = std::chrono::duration_cast<std::chrono::milliseconds>(
            record.getUpdatedAt().time_since_epoch()).count();
        
        // Convert record type to string
        std::string record_type = recordTypeToString(record.getRecordType());
        
        // Insert record into database
        std::string query = R"(
            INSERT INTO etr.training_records(
                record_id, trainee_id, instructor_id, record_type, course_id, syllabus_id,
                exercise_id, date, duration_minutes, location, aircraft_type, comments,
                is_draft, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4::etr.record_type, $5, $6, $7, TO_TIMESTAMP($8/1000.0),
                $9, $10, $11, $12, $13, TO_TIMESTAMP($14/1000.0), TO_TIMESTAMP($15/1000.0)
            ) RETURNING record_id
        )";
        
        std::vector<persistence::PgParam> params = {
            {"record_id", record_id, persistence::PgParamType::TEXT, false},
            {"trainee_id", record.getTraineeId(), persistence::PgParamType::TEXT, false},
            {"instructor_id", record.getInstructorId(), persistence::PgParamType::TEXT, false},
            {"record_type", record_type, persistence::PgParamType::TEXT, false},
            {"course_id", record.getCourseId(), persistence::PgParamType::TEXT, false},
            {"syllabus_id", record.getSyllabusId(), persistence::PgParamType::TEXT, false},
            {"exercise_id", record.getExerciseId(), persistence::PgParamType::TEXT, false},
            {"date", std::to_string(date), persistence::PgParamType::BIGINT, false},
            {"duration_minutes", std::to_string(record.getDurationMinutes()), persistence::PgParamType::INTEGER, false},
            {"location", record.getLocation(), persistence::PgParamType::TEXT, false},
            {"aircraft_type", record.getAircraftType(), persistence::PgParamType::TEXT, record.getAircraftType().empty()},
            {"comments", record.getComments(), persistence::PgParamType::TEXT, record.getComments().empty()},
            {"is_draft", record.isDraft() ? "true" : "false", persistence::PgParamType::BOOLEAN, false},
            {"created_at", std::to_string(created_at), persistence::PgParamType::BIGINT, false},
            {"updated_at", std::to_string(updated_at), persistence::PgParamType::BIGINT, false}
        };
        
        auto result = db_connection_->executeQuery(query, params);
        
        if (result.isEmpty() || result.hasError()) {
            logging::Logger::getInstance().error("Failed to insert record: {}", result.getErrorMessage());
            transaction.rollback();
            return "";
        }
        
        // Save grades, attachments, metadata, and signatures
        if (!saveGrades(record_id, record.getGrades(), transaction)) {
            logging::Logger::getInstance().error("Failed to save grades for record: {}", record_id);
            transaction.rollback();
            return "";
        }
        
        if (!saveAttachments(record_id, record.getAttachments(), transaction)) {
            logging::Logger::getInstance().error("Failed to save attachments for record: {}", record_id);
            transaction.rollback();
            return "";
        }
        
        if (!saveMetadata(record_id, record.getMetadata(), transaction)) {
            logging::Logger::getInstance().error("Failed to save metadata for record: {}", record_id);
            transaction.rollback();
            return "";
        }
        
        // Save trainee signature if present
        if (record.getTraineeSignature()) {
            if (!saveSignature(record_id, *record.getTraineeSignature(), false, transaction)) {
                logging::Logger::getInstance().error("Failed to save trainee signature for record: {}", record_id);
                transaction.rollback();
                return "";
            }
        }
        
        // Save instructor signature if present
        if (record.getInstructorSignature()) {
            if (!saveSignature(record_id, *record.getInstructorSignature(), true, transaction)) {
                logging::Logger::getInstance().error("Failed to save instructor signature for record: {}", record_id);
                transaction.rollback();
                return "";
            }
        }
        
        // Log audit event
        if (!logAuditEvent(record_id, "create", record.getInstructorId(), "Record created")) {
            logging::Logger::getInstance().error("Failed to log audit event for record: {}", record_id);
            transaction.rollback();
            return "";
        }
        
        // Commit transaction
        if (!transaction.commit()) {
            logging::Logger::getInstance().error("Failed to commit transaction for record: {}", record_id);
            return "";
        }
        
        logging::Logger::getInstance().info("Created record: {}", record_id);
        
        return record_id;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error creating record: {}", e.what());
        transaction.rollback();
        return "";
    }
}

std::optional<TrainingRecord> RecordRepository::getRecord(const std::string& record_id) {
    try {
        // Query the record
        std::string query = R"(
            SELECT record_id, trainee_id, instructor_id, record_type, course_id, syllabus_id,
                exercise_id, date, duration_minutes, location, aircraft_type, comments,
                is_draft, created_at, updated_at
            FROM etr.training_records
            WHERE record_id = $1
        )";
        
        std::vector<persistence::PgParam> params = {
            {"record_id", record_id, persistence::PgParamType::TEXT, false}
        };
        
        auto result = db_connection_->executeQuery(query, params);
        
        if (result.isEmpty() || result.hasError()) {
            logging::Logger::getInstance().error("Failed to query record {}: {}", 
                record_id, result.getErrorMessage());
            return std::nullopt;
        }
        
        if (result.getNumRows() == 0) {
            logging::Logger::getInstance().debug("Record not found: {}", record_id);
            return std::nullopt;
        }
        
        // Extract record from result
        TrainingRecord record = extractRecordFromRow(result, 0);
        
        // Load grades
        record.setGrades(getGrades(record_id));
        
        // Load attachments
        record.setAttachments(getAttachments(record_id));
        
        // Load metadata
        record.setMetadata(getMetadata(record_id));
        
        // Load trainee signature
        auto trainee_signature = getSignature(record_id, false);
        if (trainee_signature) {
            record.setTraineeSignature(*trainee_signature);
        }
        
        // Load instructor signature
        auto instructor_signature = getSignature(record_id, true);
        if (instructor_signature) {
            record.setInstructorSignature(*instructor_signature);
        }
        
        logging::Logger::getInstance().debug("Retrieved record: {}", record_id);
        
        return record;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error getting record {}: {}", record_id, e.what());
        return std::nullopt;
    }
}

bool RecordRepository::updateRecord(const TrainingRecord& record) {
    auto transaction = db_connection_->createTransaction();
    
    try {
        // Check if record exists
        std::string check_query = "SELECT 1 FROM etr.training_records WHERE record_id = $1";
        std::vector<persistence::PgParam> check_params = {
            {"record_id", record.getRecordId(), persistence::PgParamType::TEXT, false}
        };
        
        auto check_result = db_connection_->executeQuery(check_query, check_params);
        
        if (check_result.isEmpty() || check_result.hasError() || check_result.getNumRows() == 0) {
            logging::Logger::getInstance().error("Record not found for update: {}", record.getRecordId());
            transaction.rollback();
            return false;
        }
        
        // Convert timestamps to database format
        int64_t date = std::chrono::duration_cast<std::chrono::milliseconds>(
            record.getDate().time_since_epoch()).count();
        
        int64_t updated_at = std::chrono::duration_cast<std::chrono::milliseconds>(
            record.getUpdatedAt().time_since_epoch()).count();
        
        // Convert record type to string
        std::string record_type = recordTypeToString(record.getRecordType());
        
        // Update record in database
        std::string query = R"(
            UPDATE etr.training_records SET
                trainee_id = $2,
                instructor_id = $3,
                record_type = $4::etr.record_type,
                course_id = $5,
                syllabus_id = $6,
                exercise_id = $7,
                date = TO_TIMESTAMP($8/1000.0),
                duration_minutes = $9,
                location = $10,
                aircraft_type = $11,
                comments = $12,
                is_draft = $13,
                updated_at = TO_TIMESTAMP($14/1000.0)
            WHERE record_id = $1
        )";
        
        std::vector<persistence::PgParam> params = {
            {"record_id", record.getRecordId(), persistence::PgParamType::TEXT, false},
            {"trainee_id", record.getTraineeId(), persistence::PgParamType::TEXT, false},
            {"instructor_id", record.getInstructorId(), persistence::PgParamType::TEXT, false},
            {"record_type", record_type, persistence::PgParamType::TEXT, false},
            {"course_id", record.getCourseId(), persistence::PgParamType::TEXT, false},
            {"syllabus_id", record.getSyllabusId(), persistence::PgParamType::TEXT, false},
            {"exercise_id", record.getExerciseId(), persistence::PgParamType::TEXT, false},
            {"date", std::to_string(date), persistence::PgParamType::BIGINT, false},
            {"duration_minutes", std::to_string(record.getDurationMinutes()), persistence::PgParamType::INTEGER, false},
            {"location", record.getLocation(), persistence::PgParamType::TEXT, false},
            {"aircraft_type", record.getAircraftType(), persistence::PgParamType::TEXT, record.getAircraftType().empty()},
            {"comments", record.getComments(), persistence::PgParamType::TEXT, record.getComments().empty()},
            {"is_draft", record.isDraft() ? "true" : "false", persistence::PgParamType::BOOLEAN, false},
            {"updated_at", std::to_string(updated_at), persistence::PgParamType::BIGINT, false}
        };
        
        auto result = db_connection_->executeQuery(query, params);
        
        if (result.isEmpty() || result.hasError() || result.getAffectedRows() == 0) {
            logging::Logger::getInstance().error("Failed to update record: {}", result.getErrorMessage());
            transaction.rollback();
            return false;
        }
        
        // Delete existing related data
        std::string delete_query = "DELETE FROM etr.record_grades WHERE record_id = $1";
        db_connection_->executeQuery(delete_query, {{"record_id", record.getRecordId(), persistence::PgParamType::TEXT, false}});
        
        delete_query = "DELETE FROM etr.record_attachments WHERE record_id = $1";
        db_connection_->executeQuery(delete_query, {{"record_id", record.getRecordId(), persistence::PgParamType::TEXT, false}});
        
        delete_query = "DELETE FROM etr.record_metadata WHERE record_id = $1";
        db_connection_->executeQuery(delete_query, {{"record_id", record.getRecordId(), persistence::PgParamType::TEXT, false}});
        
        // Delete signatures only if they have changed
        if (record.getTraineeSignature()) {
            delete_query = "DELETE FROM etr.record_signatures WHERE record_id = $1 AND is_instructor = false";
            db_connection_->executeQuery(delete_query, {{"record_id", record.getRecordId(), persistence::PgParamType::TEXT, false}});
        }
        
        if (record.getInstructorSignature()) {
            delete_query = "DELETE FROM etr.record_signatures WHERE record_id = $1 AND is_instructor = true";
            db_connection_->executeQuery(delete_query, {{"record_id", record.getRecordId(), persistence::PgParamType::TEXT, false}});
        }
        
        // Save updated related data
        if (!saveGrades(record.getRecordId(), record.getGrades(), transaction)) {
            logging::Logger::getInstance().error("Failed to save grades for record: {}", record.getRecordId());
            transaction.rollback();
            return false;
        }
        
        if (!saveAttachments(record.getRecordId(), record.getAttachments(), transaction)) {
            logging::Logger::getInstance().error("Failed to save attachments for record: {}", record.getRecordId());
            transaction.rollback();
            return false;
        }
        
        if (!saveMetadata(record.getRecordId(), record.getMetadata(), transaction)) {
            logging::Logger::getInstance().error("Failed to save metadata for record: {}", record.getRecordId());
            transaction.rollback();
            return false;
        }
        
        // Save trainee signature if present
        if (record.getTraineeSignature()) {
            if (!saveSignature(record.getRecordId(), *record.getTraineeSignature(), false, transaction)) {
                logging::Logger::getInstance().error("Failed to save trainee signature for record: {}", record.getRecordId());
                transaction.rollback();
                return false;
            }
        }
        
        // Save instructor signature if present
        if (record.getInstructorSignature()) {
            if (!saveSignature(record.getRecordId(), *record.getInstructorSignature(), true, transaction)) {
                logging::Logger::getInstance().error("Failed to save instructor signature for record: {}", record.getRecordId());
                transaction.rollback();
                return false;
            }
        }
        
        // Log audit event
        if (!logAuditEvent(record.getRecordId(), "update", record.getInstructorId(), "Record updated")) {
            logging::Logger::getInstance().error("Failed to log audit event for record: {}", record.getRecordId());
            transaction.rollback();
            return false;
        }
        
        // Commit transaction
        if (!transaction.commit()) {
            logging::Logger::getInstance().error("Failed to commit transaction for record: {}", record.getRecordId());
            return false;
        }
        
        logging::Logger::getInstance().info("Updated record: {}", record.getRecordId());
        
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error updating record: {}", e.what());
        transaction.rollback();
        return false;
    }
}

bool RecordRepository::deleteRecord(const std::string& record_id) {
    auto transaction = db_connection_->createTransaction();
    
    try {
        // Delete related data first (foreign key constraints will handle this,
        // but we'll do it explicitly for clarity)
        std::string delete_query = "DELETE FROM etr.record_grades WHERE record_id = $1";
        db_connection_->executeQuery(delete_query, {{"record_id", record_id, persistence::PgParamType::TEXT, false}});
        
        delete_query = "DELETE FROM etr.record_attachments WHERE record_id = $1";
        db_connection_->executeQuery(delete_query, {{"record_id", record_id, persistence::PgParamType::TEXT, false}});
        
        delete_query = "DELETE FROM etr.record_metadata WHERE record_id = $1";
        db_connection_->executeQuery(delete_query, {{"record_id", record_id, persistence::PgParamType::TEXT, false}});
        
        delete_query = "DELETE FROM etr.record_signatures WHERE record_id = $1";
        db_connection_->executeQuery(delete_query, {{"record_id", record_id, persistence::PgParamType::TEXT, false}});
        
        // Delete the record itself
        delete_query = "DELETE FROM etr.training_records WHERE record_id = $1";
        
        std::vector<persistence::PgParam> params = {
            {"record_id", record_id, persistence::PgParamType::TEXT, false}
        };
        
        auto result = db_connection_->executeQuery(delete_query, params);
        
        if (result.isEmpty() || result.hasError()) {
            logging::Logger::getInstance().error("Failed to delete record: {}", result.getErrorMessage());
            transaction.rollback();
            return false;
        }
        
        if (result.getAffectedRows() == 0) {
            logging::Logger::getInstance().debug("Record not found for deletion: {}", record_id);
            transaction.rollback();
            return false;
        }
        
        // Log audit event
        if (!logAuditEvent(record_id, "delete", "system", "Record deleted")) {
            logging::Logger::getInstance().error("Failed to log audit event for record: {}", record_id);
            transaction.rollback();
            return false;
        }
        
        // Commit transaction
        if (!transaction.commit()) {
            logging::Logger::getInstance().error("Failed to commit transaction for record: {}", record_id);
            return false;
        }
        
        logging::Logger::getInstance().info("Deleted record: {}", record_id);
        
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error deleting record: {}", e.what());
        transaction.rollback();
        return false;
    }
}

std::pair<std::vector<TrainingRecord>, int> RecordRepository::listRecords(
    const std::optional<std::string>& trainee_id,
    const std::optional<std::string>& instructor_id,
    const std::optional<std::string>& course_id,
    const std::optional<std::string>& syllabus_id,
    const std::optional<RecordType>& record_type,
    const std::optional<std::chrono::system_clock::time_point>& start_date,
    const std::optional<std::chrono::system_clock::time_point>& end_date,
    int page,
    int page_size,
    const std::string& sort_by,
    bool ascending
) {
    try {
        // Build query conditions
        auto [conditions, condition_params] = generateQueryParams(
            trainee_id, 
            instructor_id, 
            course_id, 
            syllabus_id, 
            record_type, 
            start_date, 
            end_date
        );
        
        // Validate and sanitize sort column
        std::string sort_column;
        if (sort_by == "date" || sort_by == "created_at" || sort_by == "updated_at") {
            sort_column = sort_by;
        }
        else if (sort_by == "trainee") {
            sort_column = "trainee_id";
        }
        else if (sort_by == "instructor") {
            sort_column = "instructor_id";
        }
        else if (sort_by == "course") {
            sort_column = "course_id";
        }
        else if (sort_by == "syllabus") {
            sort_column = "syllabus_id";
        }
        else if (sort_by == "exercise") {
            sort_column = "exercise_id";
        }
        else if (sort_by == "type") {
            sort_column = "record_type";
        }
        else {
            // Default to date
            sort_column = "date";
        }
        
        // Build sort direction
        std::string sort_direction = ascending ? "ASC" : "DESC";
        
        // Calculate offset
        int offset = (page - 1) * page_size;
        
        // Build the query
        std::string query = R"(
            SELECT record_id, trainee_id, instructor_id, record_type, course_id, syllabus_id,
                exercise_id, date, duration_minutes, location, aircraft_type, comments,
                is_draft, created_at, updated_at
            FROM etr.training_records
        )";
        
        if (!conditions.empty()) {
            query += " WHERE " + conditions;
        }
        
        query += " ORDER BY " + sort_column + " " + sort_direction;
        query += " LIMIT " + std::to_string(page_size) + " OFFSET " + std::to_string(offset);
        
        // Execute query
        auto result = db_connection_->executeQuery(query, condition_params);
        
        if (result.isEmpty() || result.hasError()) {
            logging::Logger::getInstance().error("Failed to list records: {}", result.getErrorMessage());
            return {{}, 0};
        }
        
        // Extract records
        std::vector<TrainingRecord> records;
        for (int i = 0; i < result.getNumRows(); ++i) {
            records.push_back(extractRecordFromRow(result, i));
        }
        
        // Get total count for pagination
        std::string count_query = "SELECT COUNT(*) FROM etr.training_records";
        if (!conditions.empty()) {
            count_query += " WHERE " + conditions;
        }
        
        auto count_result = db_connection_->executeQuery(count_query, condition_params);
        
        int total_count = 0;
        if (!count_result.isEmpty() && !count_result.hasError() && count_result.getNumRows() > 0) {
            total_count = count_result.getInt(0, 0);
        }
        
        logging::Logger::getInstance().debug("Listed {} records (total: {})", records.size(), total_count);
        
        return {records, total_count};
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error listing records: {}", e.what());
        return {{}, 0};
    }
}

bool RecordRepository::logAuditEvent(
    const std::string& record_id, 
    const std::string& action, 
    const std::string& user_id, 
    const std::string& details
) {
    try {
        std::string query = R"(
            INSERT INTO etr.record_audit_log(
                record_id, action, user_id, details, timestamp
            ) VALUES (
                $1, $2, $3, $4, NOW()
            )
        )";
        
        std::vector<persistence::PgParam> params = {
            {"record_id", record_id, persistence::PgParamType::TEXT, false},
            {"action", action, persistence::PgParamType::TEXT, false},
            {"user_id", user_id, persistence::PgParamType::TEXT, false},
            {"details", details, persistence::PgParamType::TEXT, false}
        };
        
        auto result = db_connection_->executeQuery(query, params);
        
        if (result.isEmpty() || result.hasError()) {
            logging::Logger::getInstance().error("Failed to log audit event: {}", result.getErrorMessage());
            return false;
        }
        
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error logging audit event: {}", e.what());
        return false;
    }
}

std::vector<nlohmann::json> RecordRepository::getAuditLogs(const std::string& record_id) {
    try {
        std::string query = R"(
            SELECT id, record_id, action, user_id, details, timestamp
            FROM etr.record_audit_log
            WHERE record_id = $1
            ORDER BY timestamp DESC
        )";
        
        std::vector<persistence::PgParam> params = {
            {"record_id", record_id, persistence::PgParamType::TEXT, false}
        };
        
        auto result = db_connection_->executeQuery(query, params);
        
        if (result.isEmpty() || result.hasError()) {
            logging::Logger::getInstance().error("Failed to get audit logs: {}", result.getErrorMessage());
            return {};
        }
        
        // Convert to JSON
        return result.getAllRowsAsJson();
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error getting audit logs: {}", e.what());
        return {};
    }
}

bool RecordRepository::saveGrades(
    const std::string& record_id, 
    const std::vector<GradeItem>& grades,
    persistence::Transaction& transaction
) {
    try {
        for (const auto& grade : grades) {
            std::string query = R"(
                INSERT INTO etr.record_grades(
                    record_id, criteria_id, criteria_name, grade, comments
                ) VALUES (
                    $1, $2, $3, $4, $5
                )
            )";
            
            std::vector<persistence::PgParam> params = {
                {"record_id", record_id, persistence::PgParamType::TEXT, false},
                {"criteria_id", grade.criteria_id, persistence::PgParamType::TEXT, false},
                {"criteria_name", grade.criteria_name, persistence::PgParamType::TEXT, false},
                {"grade", std::to_string(grade.grade), persistence::PgParamType::INTEGER, false},
                {"comments", grade.comments, persistence::PgParamType::TEXT, grade.comments.empty()}
            };
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.isEmpty() || result.hasError()) {
                logging::Logger::getInstance().error("Failed to save grade: {}", result.getErrorMessage());
                return false;
            }
        }
        
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error saving grades: {}", e.what());
        return false;
    }
}

std::vector<GradeItem> RecordRepository::getGrades(const std::string& record_id) {
    try {
        std::string query = R"(
            SELECT criteria_id, criteria_name, grade, comments
            FROM etr.record_grades
            WHERE record_id = $1
        )";
        
        std::vector<persistence::PgParam> params = {
            {"record_id", record_id, persistence::PgParamType::TEXT, false}
        };
        
        auto result = db_connection_->executeQuery(query, params);
        
        if (result.isEmpty() || result.hasError()) {
            logging::Logger::getInstance().error("Failed to get grades: {}", result.getErrorMessage());
            return {};
        }
        
        std::vector<GradeItem> grades;
        for (int i = 0; i < result.getNumRows(); ++i) {
            GradeItem grade;
            grade.criteria_id = result.getString(i, "criteria_id");
            grade.criteria_name = result.getString(i, "criteria_name");
            grade.grade = result.getInt(i, "grade");
            grade.comments = result.getString(i, "comments");
            
            grades.push_back(grade);
        }
        
        return grades;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error getting grades: {}", e.what());
        return {};
    }
}

bool RecordRepository::saveAttachments(
    const std::string& record_id, 
    const std::vector<std::string>& attachments,
    persistence::Transaction& transaction
) {
    try {
        for (const auto& attachment : attachments) {
            std::string query = R"(
                INSERT INTO etr.record_attachments(
                    record_id, attachment_path, attachment_name, content_type, size_bytes
                ) VALUES (
                    $1, $2, $3, $4, $5
                )
            )";
            
            // Extract attachment name from path
            std::string attachment_name = attachment;
            auto pos = attachment.find_last_of('/');
            if (pos != std::string::npos) {
                attachment_name = attachment.substr(pos + 1);
            }
            
            // In a real implementation, content type and size would be determined
            // from the actual file. For now, we'll use placeholder values.
            std::string content_type = "application/octet-stream";
            int64_t size_bytes = 0;
            
            std::vector<persistence::PgParam> params = {
                {"record_id", record_id, persistence::PgParamType::TEXT, false},
                {"attachment_path", attachment, persistence::PgParamType::TEXT, false},
                {"attachment_name", attachment_name, persistence::PgParamType::TEXT, false},
                {"content_type", content_type, persistence::PgParamType::TEXT, false},
                {"size_bytes", std::to_string(size_bytes), persistence::PgParamType::BIGINT, false}
            };
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.isEmpty() || result.hasError()) {
                logging::Logger::getInstance().error("Failed to save attachment: {}", result.getErrorMessage());
                return false;
            }
        }
        
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error saving attachments: {}", e.what());
        return false;
    }
}

std::vector<std::string> RecordRepository::getAttachments(const std::string& record_id) {
    try {
        std::string query = R"(
            SELECT attachment_path
            FROM etr.record_attachments
            WHERE record_id = $1
        )";
        
        std::vector<persistence::PgParam> params = {
            {"record_id", record_id, persistence::PgParamType::TEXT, false}
        };
        
        auto result = db_connection_->executeQuery(query, params);
        
        if (result.isEmpty() || result.hasError()) {
            logging::Logger::getInstance().error("Failed to get attachments: {}", result.getErrorMessage());
            return {};
        }
        
        std::vector<std::string> attachments;
        for (int i = 0; i < result.getNumRows(); ++i) {
            attachments.push_back(result.getString(i, "attachment_path"));
        }
        
        return attachments;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error getting attachments: {}", e.what());
        return {};
    }
}

bool RecordRepository::saveMetadata(
    const std::string& record_id, 
    const std::map<std::string, std::string>& metadata,
    persistence::Transaction& transaction
) {
    try {
        for (const auto& [key, value] : metadata) {
            std::string query = R"(
                INSERT INTO etr.record_metadata(
                    record_id, key, value
                ) VALUES (
                    $1, $2, $3
                )
            )";
            
            std::vector<persistence::PgParam> params = {
                {"record_id", record_id, persistence::PgParamType::TEXT, false},
                {"key", key, persistence::PgParamType::TEXT, false},
                {"value", value, persistence::PgParamType::TEXT, false}
            };
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.isEmpty() || result.hasError()) {
                logging::Logger::getInstance().error("Failed to save metadata: {}", result.getErrorMessage());
                return false;
            }
        }
        
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error saving metadata: {}", e.what());
        return false;
    }
}

std::map<std::string, std::string> RecordRepository::getMetadata(const std::string& record_id) {
    try {
        std::string query = R"(
            SELECT key, value
            FROM etr.record_metadata
            WHERE record_id = $1
        )";
        
        std::vector<persistence::PgParam> params = {
            {"record_id", record_id, persistence::PgParamType::TEXT, false}
        };
        
        auto result = db_connection_->executeQuery(query, params);
        
        if (result.isEmpty() || result.hasError()) {
            logging::Logger::getInstance().error("Failed to get metadata: {}", result.getErrorMessage());
            return {};
        }
        
        std::map<std::string, std::string> metadata;
        for (int i = 0; i < result.getNumRows(); ++i) {
            metadata[result.getString(i, "key")] = result.getString(i, "value");
        }
        
        return metadata;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error getting metadata: {}", e.what());
        return {};
    }
}

bool RecordRepository::saveSignature(
    const std::string& record_id, 
    const SignatureInfo& signature,
    bool is_instructor,
    persistence::Transaction& transaction
) {
    try {
        std::string query = R"(
            INSERT INTO etr.record_signatures(
                record_id, signer_id, signer_name, certificate_id, signature_data,
                timestamp, is_valid, is_instructor
            ) VALUES (
                $1, $2, $3, $4, $5, TO_TIMESTAMP($6/1000.0), $7, $8
            )
        )";
        
        int64_t timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
            signature.timestamp.time_since_epoch()).count();
        
        std::vector<persistence::PgParam> params = {
            {"record_id", record_id, persistence::PgParamType::TEXT, false},
            {"signer_id", signature.signer_id, persistence::PgParamType::TEXT, false},
            {"signer_name", signature.signer_name, persistence::PgParamType::TEXT, false},
            {"certificate_id", signature.certificate_id, persistence::PgParamType::TEXT, signature.certificate_id.empty()},
            {"signature_data", "", persistence::PgParamType::BYTEA, signature.signature_data.empty()},
            {"timestamp", std::to_string(timestamp), persistence::PgParamType::BIGINT, false},
            {"is_valid", signature.is_valid ? "true" : "false", persistence::PgParamType::BOOLEAN, false},
            {"is_instructor", is_instructor ? "true" : "false", persistence::PgParamType::BOOLEAN, false}
        };
        
        auto result = db_connection_->executeQuery(query, params);
        
        if (result.isEmpty() || result.hasError()) {
            logging::Logger::getInstance().error("Failed to save signature: {}", result.getErrorMessage());
            return false;
        }
        
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error saving signature: {}", e.what());
        return false;
    }
}

std::optional<SignatureInfo> RecordRepository::getSignature(
    const std::string& record_id, 
    bool is_instructor
) {
    try {
        std::string query = R"(
            SELECT signer_id, signer_name, certificate_id, signature_data, 
                timestamp, is_valid
            FROM etr.record_signatures
            WHERE record_id = $1 AND is_instructor = $2
        )";
        
        std::vector<persistence::PgParam> params = {
            {"record_id", record_id, persistence::PgParamType::TEXT, false},
            {"is_instructor", is_instructor ? "true" : "false", persistence::PgParamType::BOOLEAN, false}
        };
        
        auto result = db_connection_->executeQuery(query, params);
        
        if (result.isEmpty() || result.hasError() || result.getNumRows() == 0) {
            return std::nullopt;
        }
        
        SignatureInfo signature;
        signature.signer_id = result.getString(0, "signer_id");
        signature.signer_name = result.getString(0, "signer_name");
        signature.certificate_id = result.getString(0, "certificate_id");
        
        // Get signature data as binary
        signature.signature_data = result.getBinary(0, "signature_data");
        
        // Get timestamp
        auto timestamp_opt = result.getTimestamp(0, "timestamp");
        if (timestamp_opt) {
            signature.timestamp = *timestamp_opt;
        } else {
            signature.timestamp = std::chrono::system_clock::now();
        }
        
        signature.is_valid = result.getBool(0, "is_valid");
        
        return signature;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error getting signature: {}", e.what());
        return std::nullopt;
    }
}

std::pair<std::string, std::vector<persistence::PgParam>> RecordRepository::generateQueryParams(
    const std::optional<std::string>& trainee_id,
    const std::optional<std::string>& instructor_id,
    const std::optional<std::string>& course_id,
    const std::optional<std::string>& syllabus_id,
    const std::optional<RecordType>& record_type,
    const std::optional<std::chrono::system_clock::time_point>& start_date,
    const std::optional<std::chrono::system_clock::time_point>& end_date
) {
    std::vector<std::string> conditions;
    std::vector<persistence::PgParam> params;
    
    int param_index = 1;
    
    if (trainee_id) {
        conditions.push_back("trainee_id = $" + std::to_string(param_index));
        params.push_back({"trainee_id", *trainee_id, persistence::PgParamType::TEXT, false});
        param_index++;
    }
    
    if (instructor_id) {
        conditions.push_back("instructor_id = $" + std::to_string(param_index));
        params.push_back({"instructor_id", *instructor_id, persistence::PgParamType::TEXT, false});
        param_index++;
    }
    
    if (course_id) {
        conditions.push_back("course_id = $" + std::to_string(param_index));
        params.push_back({"course_id", *course_id, persistence::PgParamType::TEXT, false});
        param_index++;
    }
    
    if (syllabus_id) {
        conditions.push_back("syllabus_id = $" + std::to_string(param_index));
        params.push_back({"syllabus_id", *syllabus_id, persistence::PgParamType::TEXT, false});
        param_index++;
    }
    
    if (record_type) {
        conditions.push_back("record_type = $" + std::to_string(param_index) + "::etr.record_type");
        params.push_back({"record_type", recordTypeToString(*record_type), persistence::PgParamType::TEXT, false});
        param_index++;
    }
    
    if (start_date) {
        int64_t start = std::chrono::duration_cast<std::chrono::milliseconds>(
            start_date->time_since_epoch()).count();
        conditions.push_back("date >= TO_TIMESTAMP($" + std::to_string(param_index) + "/1000.0)");
        params.push_back({"start_date", std::to_string(start), persistence::PgParamType::BIGINT, false});
        param_index++;
    }
    
    if (end_date) {
        int64_t end = std::chrono::duration_cast<std::chrono::milliseconds>(
            end_date->time_since_epoch()).count();
        conditions.push_back("date <= TO_TIMESTAMP($" + std::to_string(param_index) + "/1000.0)");
        params.push_back({"end_date", std::to_string(end), persistence::PgParamType::BIGINT, false});
        param_index++;
    }
    
    std::string condition_str;
    if (!conditions.empty()) {
        condition_str = conditions[0];
        for (size_t i = 1; i < conditions.size(); ++i) {
            condition_str += " AND " + conditions[i];
        }
    }
    
    return {condition_str, params};
}

TrainingRecord RecordRepository::extractRecordFromRow(const persistence::PgResult& result, int row_index) {
    TrainingRecord record(result.getString(row_index, "record_id"));
    
    record.setTraineeId(result.getString(row_index, "trainee_id"));
    record.setInstructorId(result.getString(row_index, "instructor_id"));
    
    // Convert record type from string
    std::string record_type_str = result.getString(row_index, "record_type");
    record.setRecordType(recordTypeFromString(record_type_str));
    
    record.setCourseId(result.getString(row_index, "course_id"));
    record.setSyllabusId(result.getString(row_index, "syllabus_id"));
    record.setExerciseId(result.getString(row_index, "exercise_id"));
    
    // Get timestamps
    auto date_opt = result.getTimestamp(row_index, "date");
    if (date_opt) {
        record.setDate(*date_opt);
    }
    
    record.setDurationMinutes(result.getInt(row_index, "duration_minutes"));
    record.setLocation(result.getString(row_index, "location"));
    record.setAircraftType(result.getString(row_index, "aircraft_type"));
    record.setComments(result.getString(row_index, "comments"));
    record.setDraft(result.getBool(row_index, "is_draft"));
    
    auto created_at_opt = result.getTimestamp(row_index, "created_at");
    if (created_at_opt) {
        record.setCreatedAt(*created_at_opt);
    }
    
    auto updated_at_opt = result.getTimestamp(row_index, "updated_at");
    if (updated_at_opt) {
        record.setUpdatedAt(*updated_at_opt);
    }
    
    return record;
}

std::string RecordRepository::generateUniqueId() {
    uuids::uuid uuid = uuids::uuid_system_generator{}();
    return uuids::to_string(uuid);
}

} // namespace records
} // namespace etr