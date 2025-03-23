#include "syllabus/syllabus_repository.h"
#include "logging/logger.h"
#include "persistence/database_connection.h"
#include <algorithm>
#include <uuid.h>

namespace etr {
namespace syllabus {

class SyllabusRepository : public ISyllabusRepository {
public:
    explicit SyllabusRepository(std::shared_ptr<persistence::DatabaseConnection> db_connection)
        : db_connection_(std::move(db_connection)) {
        logging::Logger::getInstance().info("SyllabusRepository initialized");
    }
    
    ~SyllabusRepository() override = default;

    std::string createSyllabus(const Syllabus& syllabus) override {
        try {
            auto transaction = db_connection_->createTransaction();
            
            // Generate ID if not provided
            std::string syllabus_id = syllabus.getSyllabusId();
            if (syllabus_id.empty()) {
                syllabus_id = generateUniqueId();
            }
            
            // Insert basic syllabus info
            std::string query = R"(
                INSERT INTO etr.syllabi (
                    syllabus_id, course_id, title, description, version, 
                    effective_date, expiration_date, status, author_id, 
                    created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
                ) RETURNING syllabus_id
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"syllabus_id", syllabus_id, persistence::PgParamType::TEXT, false});
            params.push_back({"course_id", syllabus.getCourseId(), persistence::PgParamType::TEXT, false});
            params.push_back({"title", syllabus.getTitle(), persistence::PgParamType::TEXT, false});
            params.push_back({"description", syllabus.getDescription(), persistence::PgParamType::TEXT, false});
            params.push_back({"version", syllabus.getVersion(), persistence::PgParamType::TEXT, false});
            
            auto effective_date = std::chrono::duration_cast<std::chrono::milliseconds>(
                syllabus.getEffectiveDate().time_since_epoch()).count();
            params.push_back({"effective_date", std::to_string(effective_date), persistence::PgParamType::TIMESTAMP, false});
            
            if (syllabus.getExpirationDate()) {
                auto expiration_date = std::chrono::duration_cast<std::chrono::milliseconds>(
                    syllabus.getExpirationDate()->time_since_epoch()).count();
                params.push_back({"expiration_date", std::to_string(expiration_date), persistence::PgParamType::TIMESTAMP, false});
            } else {
                params.push_back({"expiration_date", "", persistence::PgParamType::TIMESTAMP, true});
            }
            
            params.push_back({"status", syllabusStatusToString(syllabus.getStatus()), persistence::PgParamType::TEXT, false});
            params.push_back({"author_id", syllabus.getAuthorId(), persistence::PgParamType::TEXT, false});
            
            auto created_at = std::chrono::duration_cast<std::chrono::milliseconds>(
                syllabus.getCreatedAt().time_since_epoch()).count();
            params.push_back({"created_at", std::to_string(created_at), persistence::PgParamType::TIMESTAMP, false});
            
            auto updated_at = std::chrono::duration_cast<std::chrono::milliseconds>(
                syllabus.getUpdatedAt().time_since_epoch()).count();
            params.push_back({"updated_at", std::to_string(updated_at), persistence::PgParamType::TIMESTAMP, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.isEmpty() || result.hasError()) {
                logging::Logger::getInstance().error("Failed to insert syllabus: {}", result.getErrorMessage());
                transaction.rollback();
                return "";
            }
            
            // Insert syllabus metadata
            for (const auto& [key, value] : syllabus.getMetadata()) {
                std::string metadata_query = R"(
                    INSERT INTO etr.syllabus_metadata (
                        syllabus_id, version, key, value
                    ) VALUES (
                        $1, $2, $3, $4
                    )
                )";
                
                std::vector<persistence::PgParam> metadata_params;
                metadata_params.push_back({"syllabus_id", syllabus_id, persistence::PgParamType::TEXT, false});
                metadata_params.push_back({"version", syllabus.getVersion(), persistence::PgParamType::TEXT, false});
                metadata_params.push_back({"key", key, persistence::PgParamType::TEXT, false});
                metadata_params.push_back({"value", value, persistence::PgParamType::TEXT, false});
                
                auto metadata_result = db_connection_->executeQuery(metadata_query, metadata_params);
                
                if (metadata_result.hasError()) {
                    logging::Logger::getInstance().error("Failed to insert syllabus metadata: {}", 
                        metadata_result.getErrorMessage());
                    transaction.rollback();
                    return "";
                }
            }
            
            // Insert signature if available
            if (syllabus.getApprovalSignature()) {
                const auto& signature = *syllabus.getApprovalSignature();
                
                std::string signature_query = R"(
                    INSERT INTO etr.syllabus_signatures (
                        syllabus_id, version, signer_id, signer_name, 
                        certificate_id, signature_data, timestamp, is_valid
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8
                    )
                )";
                
                std::vector<persistence::PgParam> signature_params;
                signature_params.push_back({"syllabus_id", syllabus_id, persistence::PgParamType::TEXT, false});
                signature_params.push_back({"version", syllabus.getVersion(), persistence::PgParamType::TEXT, false});
                signature_params.push_back({"signer_id", signature.signer_id, persistence::PgParamType::TEXT, false});
                signature_params.push_back({"signer_name", signature.signer_name, persistence::PgParamType::TEXT, false});
                
                if (!signature.certificate_id.empty()) {
                    signature_params.push_back({"certificate_id", signature.certificate_id, persistence::PgParamType::TEXT, false});
                } else {
                    signature_params.push_back({"certificate_id", "", persistence::PgParamType::TEXT, true});
                }
                
                std::string signature_data(reinterpret_cast<const char*>(signature.signature_data.data()), 
                                          signature.signature_data.size());
                signature_params.push_back({"signature_data", signature_data, persistence::PgParamType::BYTEA, false});
                
                auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
                    signature.timestamp.time_since_epoch()).count();
                signature_params.push_back({"timestamp", std::to_string(timestamp), persistence::PgParamType::TIMESTAMP, false});
                
                signature_params.push_back({"is_valid", signature.is_valid ? "true" : "false", persistence::PgParamType::BOOLEAN, false});
                
                auto signature_result = db_connection_->executeQuery(signature_query, signature_params);
                
                if (signature_result.hasError()) {
                    logging::Logger::getInstance().error("Failed to insert syllabus signature: {}", 
                        signature_result.getErrorMessage());
                    transaction.rollback();
                    return "";
                }
            }
            
            // Insert sections
            for (const auto& section : syllabus.getSections()) {
                if (!insertSection(transaction, syllabus_id, syllabus.getVersion(), section)) {
                    transaction.rollback();
                    return "";
                }
            }
            
            // Commit transaction
            if (!transaction.commit()) {
                logging::Logger::getInstance().error("Failed to commit syllabus transaction");
                return "";
            }
            
            logging::Logger::getInstance().info("Created syllabus: {}, version: {}", 
                syllabus_id, syllabus.getVersion());
            
            return syllabus_id;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error creating syllabus: {}", e.what());
            return "";
        }
    }
    
    std::optional<Syllabus> getSyllabus(
        const std::string& syllabus_id,
        const std::optional<std::string>& version
    ) override {
        try {
            // Get syllabus basic info
            std::string query = R"(
                SELECT 
                    syllabus_id, course_id, title, description, version, 
                    effective_date, expiration_date, status, author_id, 
                    created_at, updated_at
                FROM etr.syllabi
                WHERE syllabus_id = $1
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"syllabus_id", syllabus_id, persistence::PgParamType::TEXT, false});
            
            if (version) {
                query += " AND version = $2";
                params.push_back({"version", *version, persistence::PgParamType::TEXT, false});
            } else {
                // Get latest version if not specified
                query += " ORDER BY effective_date DESC LIMIT 1";
            }
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.isEmpty() || result.hasError()) {
                if (result.hasError()) {
                    logging::Logger::getInstance().error("Failed to get syllabus: {}", result.getErrorMessage());
                }
                return std::nullopt;
            }
            
            // Extract syllabus info
            Syllabus syllabus(result.getString(0, "syllabus_id"));
            syllabus.setCourseId(result.getString(0, "course_id"));
            syllabus.setTitle(result.getString(0, "title"));
            syllabus.setDescription(result.getString(0, "description"));
            syllabus.setVersion(result.getString(0, "version"));
            
            auto effective_date = result.getTimestamp(0, "effective_date");
            if (effective_date) {
                syllabus.setEffectiveDate(*effective_date);
            }
            
            auto expiration_date = result.getTimestamp(0, "expiration_date");
            if (expiration_date) {
                syllabus.setExpirationDate(*expiration_date);
            }
            
            syllabus.setStatus(syllabusStatusFromString(result.getString(0, "status")));
            syllabus.setAuthorId(result.getString(0, "author_id"));
            
            auto created_at = result.getTimestamp(0, "created_at");
            if (created_at) {
                syllabus.setCreatedAt(*created_at);
            }
            
            auto updated_at = result.getTimestamp(0, "updated_at");
            if (updated_at) {
                syllabus.setUpdatedAt(*updated_at);
            }
            
            // Get syllabus metadata
            std::string metadata_query = R"(
                SELECT key, value
                FROM etr.syllabus_metadata
                WHERE syllabus_id = $1 AND version = $2
            )";
            
            std::vector<persistence::PgParam> metadata_params;
            metadata_params.push_back({"syllabus_id", syllabus_id, persistence::PgParamType::TEXT, false});
            metadata_params.push_back({"version", syllabus.getVersion(), persistence::PgParamType::TEXT, false});
            
            auto metadata_result = db_connection_->executeQuery(metadata_query, metadata_params);
            
            if (!metadata_result.hasError()) {
                std::map<std::string, std::string> metadata;
                
                for (int i = 0; i < metadata_result.getNumRows(); ++i) {
                    std::string key = metadata_result.getString(i, "key");
                    std::string value = metadata_result.getString(i, "value");
                    metadata[key] = value;
                }
                
                syllabus.setMetadata(metadata);
            }
            
            // Get signature if available
            std::string signature_query = R"(
                SELECT 
                    signer_id, signer_name, certificate_id, signature_data, 
                    timestamp, is_valid
                FROM etr.syllabus_signatures
                WHERE syllabus_id = $1 AND version = $2
            )";
            
            std::vector<persistence::PgParam> signature_params;
            signature_params.push_back({"syllabus_id", syllabus_id, persistence::PgParamType::TEXT, false});
            signature_params.push_back({"version", syllabus.getVersion(), persistence::PgParamType::TEXT, false});
            
            auto signature_result = db_connection_->executeQuery(signature_query, signature_params);
            
            if (!signature_result.isEmpty() && !signature_result.hasError()) {
                records::SignatureInfo signature;
                signature.signer_id = signature_result.getString(0, "signer_id");
                signature.signer_name = signature_result.getString(0, "signer_name");
                signature.certificate_id = signature_result.getString(0, "certificate_id");
                
                auto signature_data = signature_result.getBinary(0, "signature_data");
                signature.signature_data = signature_data;
                
                auto timestamp = signature_result.getTimestamp(0, "timestamp");
                if (timestamp) {
                    signature.timestamp = *timestamp;
                }
                
                signature.is_valid = signature_result.getBool(0, "is_valid");
                
                syllabus.setApprovalSignature(signature);
            }
            
            // Get sections
            std::vector<SyllabusSection> sections = getSyllabusSection(syllabus_id, syllabus.getVersion());
            syllabus.setSections(sections);
            
            logging::Logger::getInstance().debug("Retrieved syllabus: {}, version: {}", 
                syllabus_id, syllabus.getVersion());
            
            return syllabus;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error getting syllabus: {}", e.what());
            return std::nullopt;
        }
    }
    
    bool updateSyllabus(const Syllabus& syllabus) override {
        try {
            // Check if syllabus exists
            auto existing = getSyllabus(syllabus.getSyllabusId(), syllabus.getVersion());
            if (!existing) {
                logging::Logger::getInstance().error("Cannot update non-existent syllabus: {}, version: {}", 
                    syllabus.getSyllabusId(), syllabus.getVersion());
                return false;
            }
            
            auto transaction = db_connection_->createTransaction();
            
            // Update basic syllabus info
            std::string query = R"(
                UPDATE etr.syllabi SET
                    course_id = $1,
                    title = $2,
                    description = $3,
                    effective_date = $4,
                    expiration_date = $5,
                    status = $6,
                    author_id = $7,
                    updated_at = $8
                WHERE syllabus_id = $9 AND version = $10
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"course_id", syllabus.getCourseId(), persistence::PgParamType::TEXT, false});
            params.push_back({"title", syllabus.getTitle(), persistence::PgParamType::TEXT, false});
            params.push_back({"description", syllabus.getDescription(), persistence::PgParamType::TEXT, false});
            
            auto effective_date = std::chrono::duration_cast<std::chrono::milliseconds>(
                syllabus.getEffectiveDate().time_since_epoch()).count();
            params.push_back({"effective_date", std::to_string(effective_date), persistence::PgParamType::TIMESTAMP, false});
            
            if (syllabus.getExpirationDate()) {
                auto expiration_date = std::chrono::duration_cast<std::chrono::milliseconds>(
                    syllabus.getExpirationDate()->time_since_epoch()).count();
                params.push_back({"expiration_date", std::to_string(expiration_date), persistence::PgParamType::TIMESTAMP, false});
            } else {
                params.push_back({"expiration_date", "", persistence::PgParamType::TIMESTAMP, true});
            }
            
            params.push_back({"status", syllabusStatusToString(syllabus.getStatus()), persistence::PgParamType::TEXT, false});
            params.push_back({"author_id", syllabus.getAuthorId(), persistence::PgParamType::TEXT, false});
            
            auto updated_at = std::chrono::duration_cast<std::chrono::milliseconds>(
                syllabus.getUpdatedAt().time_since_epoch()).count();
            params.push_back({"updated_at", std::to_string(updated_at), persistence::PgParamType::TIMESTAMP, false});
            
            params.push_back({"syllabus_id", syllabus.getSyllabusId(), persistence::PgParamType::TEXT, false});
            params.push_back({"version", syllabus.getVersion(), persistence::PgParamType::TEXT, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.hasError() || result.getAffectedRows() == 0) {
                logging::Logger::getInstance().error("Failed to update syllabus: {}", 
                    result.hasError() ? result.getErrorMessage() : "No rows affected");
                transaction.rollback();
                return false;
            }
            
            // Update syllabus metadata
            // First delete existing metadata
            std::string delete_metadata_query = R"(
                DELETE FROM etr.syllabus_metadata
                WHERE syllabus_id = $1 AND version = $2
            )";
            
            std::vector<persistence::PgParam> delete_metadata_params;
            delete_metadata_params.push_back({"syllabus_id", syllabus.getSyllabusId(), persistence::PgParamType::TEXT, false});
            delete_metadata_params.push_back({"version", syllabus.getVersion(), persistence::PgParamType::TEXT, false});
            
            auto delete_metadata_result = db_connection_->executeQuery(delete_metadata_query, delete_metadata_params);
            
            if (delete_metadata_result.hasError()) {
                logging::Logger::getInstance().error("Failed to delete syllabus metadata: {}", 
                    delete_metadata_result.getErrorMessage());
                transaction.rollback();
                return false;
            }
            
            // Then insert new metadata
            for (const auto& [key, value] : syllabus.getMetadata()) {
                std::string metadata_query = R"(
                    INSERT INTO etr.syllabus_metadata (
                        syllabus_id, version, key, value
                    ) VALUES (
                        $1, $2, $3, $4
                    )
                )";
                
                std::vector<persistence::PgParam> metadata_params;
                metadata_params.push_back({"syllabus_id", syllabus.getSyllabusId(), persistence::PgParamType::TEXT, false});
                metadata_params.push_back({"version", syllabus.getVersion(), persistence::PgParamType::TEXT, false});
                metadata_params.push_back({"key", key, persistence::PgParamType::TEXT, false});
                metadata_params.push_back({"value", value, persistence::PgParamType::TEXT, false});
                
                auto metadata_result = db_connection_->executeQuery(metadata_query, metadata_params);
                
                if (metadata_result.hasError()) {
                    logging::Logger::getInstance().error("Failed to insert syllabus metadata: {}", 
                        metadata_result.getErrorMessage());
                    transaction.rollback();
                    return false;
                }
            }
            
            // Update signature if available
            if (syllabus.getApprovalSignature()) {
                // First delete existing signature
                std::string delete_signature_query = R"(
                    DELETE FROM etr.syllabus_signatures
                    WHERE syllabus_id = $1 AND version = $2
                )";
                
                std::vector<persistence::PgParam> delete_signature_params;
                delete_signature_params.push_back({"syllabus_id", syllabus.getSyllabusId(), persistence::PgParamType::TEXT, false});
                delete_signature_params.push_back({"version", syllabus.getVersion(), persistence::PgParamType::TEXT, false});
                
                auto delete_signature_result = db_connection_->executeQuery(delete_signature_query, delete_signature_params);
                
                if (delete_signature_result.hasError()) {
                    logging::Logger::getInstance().error("Failed to delete syllabus signature: {}", 
                        delete_signature_result.getErrorMessage());
                    transaction.rollback();
                    return false;
                }
                
                // Then insert new signature
                const auto& signature = *syllabus.getApprovalSignature();
                
                std::string signature_query = R"(
                    INSERT INTO etr.syllabus_signatures (
                        syllabus_id, version, signer_id, signer_name, 
                        certificate_id, signature_data, timestamp, is_valid
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8
                    )
                )";
                
                std::vector<persistence::PgParam> signature_params;
                signature_params.push_back({"syllabus_id", syllabus.getSyllabusId(), persistence::PgParamType::TEXT, false});
                signature_params.push_back({"version", syllabus.getVersion(), persistence::PgParamType::TEXT, false});
                signature_params.push_back({"signer_id", signature.signer_id, persistence::PgParamType::TEXT, false});
                signature_params.push_back({"signer_name", signature.signer_name, persistence::PgParamType::TEXT, false});
                
                if (!signature.certificate_id.empty()) {
                    signature_params.push_back({"certificate_id", signature.certificate_id, persistence::PgParamType::TEXT, false});
                } else {
                    signature_params.push_back({"certificate_id", "", persistence::PgParamType::TEXT, true});
                }
                
                std::string signature_data(reinterpret_cast<const char*>(signature.signature_data.data()), 
                                          signature.signature_data.size());
                signature_params.push_back({"signature_data", signature_data, persistence::PgParamType::BYTEA, false});
                
                auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
                    signature.timestamp.time_since_epoch()).count();
                signature_params.push_back({"timestamp", std::to_string(timestamp), persistence::PgParamType::TIMESTAMP, false});
                
                signature_params.push_back({"is_valid", signature.is_valid ? "true" : "false", persistence::PgParamType::BOOLEAN, false});
                
                auto signature_result = db_connection_->executeQuery(signature_query, signature_params);
                
                if (signature_result.hasError()) {
                    logging::Logger::getInstance().error("Failed to insert syllabus signature: {}", 
                        signature_result.getErrorMessage());
                    transaction.rollback();
                    return false;
                }
            }
            
            // Update sections
            // First delete existing sections and all related data (cascade)
            if (!deleteSyllabusSection(transaction, syllabus.getSyllabusId(), syllabus.getVersion())) {
                transaction.rollback();
                return false;
            }
            
            // Then insert new sections
            for (const auto& section : syllabus.getSections()) {
                if (!insertSection(transaction, syllabus.getSyllabusId(), syllabus.getVersion(), section)) {
                    transaction.rollback();
                    return false;
                }
            }
            
            // Commit transaction
            if (!transaction.commit()) {
                logging::Logger::getInstance().error("Failed to commit syllabus update transaction");
                return false;
            }
            
            logging::Logger::getInstance().info("Updated syllabus: {}, version: {}", 
                syllabus.getSyllabusId(), syllabus.getVersion());
            
            return true;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error updating syllabus: {}", e.what());
            return false;
        }
    }
    
    bool deleteSyllabus(const std::string& syllabus_id) override {
        try {
            // Delete syllabus and all related data (cascade)
            std::string query = R"(
                DELETE FROM etr.syllabi
                WHERE syllabus_id = $1
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"syllabus_id", syllabus_id, persistence::PgParamType::TEXT, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.hasError()) {
                logging::Logger::getInstance().error("Failed to delete syllabus: {}", result.getErrorMessage());
                return false;
            }
            
            logging::Logger::getInstance().info("Deleted syllabus: {}", syllabus_id);
            
            return result.getAffectedRows() > 0;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error deleting syllabus: {}", e.what());
            return false;
        }
    }
    
    std::pair<std::vector<SyllabusSummary>, int> listSyllabi(
        const std::optional<std::string>& course_id,
        const std::optional<SyllabusStatus>& status,
        const std::optional<std::chrono::system_clock::time_point>& effective_date,
        int page,
        int page_size,
        const std::string& sort_by,
        bool ascending
    ) override {
        try {
            // Build query
            std::string query = R"(
                SELECT 
                    syllabus_id, course_id, title, version, 
                    effective_date, expiration_date, status, author_id, 
                    created_at, updated_at,
                    COUNT(*) OVER() AS total_count
                FROM etr.syllabi
                WHERE 1=1
            )";
            
            std::vector<persistence::PgParam> params;
            int param_index = 1;
            
            if (course_id) {
                query += " AND course_id = $" + std::to_string(param_index++);
                params.push_back({"course_id", *course_id, persistence::PgParamType::TEXT, false});
            }
            
            if (status) {
                query += " AND status = $" + std::to_string(param_index++);
                params.push_back({"status", syllabusStatusToString(*status), persistence::PgParamType::TEXT, false});
            }
            
            if (effective_date) {
                query += " AND effective_date <= $" + std::to_string(param_index++);
                auto effective_date_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
                    effective_date->time_since_epoch()).count();
                params.push_back({"effective_date", std::to_string(effective_date_ms), 
                                  persistence::PgParamType::TIMESTAMP, false});
            }
            
            // Determine sort column
            std::string sort_column;
            if (sort_by == "title") {
                sort_column = "title";
            } else if (sort_by == "version") {
                sort_column = "version";
            } else if (sort_by == "created_at") {
                sort_column = "created_at";
            } else if (sort_by == "updated_at") {
                sort_column = "updated_at";
            } else {
                sort_column = "effective_date";
            }
            
            query += " ORDER BY " + sort_column + (ascending ? " ASC" : " DESC");
            query += " LIMIT $" + std::to_string(param_index++) + " OFFSET $" + std::to_string(param_index++);
            
            params.push_back({"limit", std::to_string(page_size), persistence::PgParamType::INTEGER, false});
            params.push_back({"offset", std::to_string((page - 1) * page_size), persistence::PgParamType::INTEGER, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.hasError()) {
                logging::Logger::getInstance().error("Failed to list syllabi: {}", result.getErrorMessage());
                return {{}, 0};
            }
            
            std::vector<SyllabusSummary> summaries;
            int total_count = 0;
            
            for (int i = 0; i < result.getNumRows(); ++i) {
                SyllabusSummary summary;
                summary.syllabus_id = result.getString(i, "syllabus_id");
                summary.course_id = result.getString(i, "course_id");
                summary.title = result.getString(i, "title");
                summary.version = result.getString(i, "version");
                
                auto effective_date = result.getTimestamp(i, "effective_date");
                if (effective_date) {
                    summary.effective_date = *effective_date;
                }
                
                auto expiration_date = result.getTimestamp(i, "expiration_date");
                if (expiration_date) {
                    summary.expiration_date = *expiration_date;
                }
                
                summary.status = syllabusStatusFromString(result.getString(i, "status"));
                summary.author_id = result.getString(i, "author_id");
                
                auto created_at = result.getTimestamp(i, "created_at");
                if (created_at) {
                    summary.created_at = *created_at;
                }
                
                auto updated_at = result.getTimestamp(i, "updated_at");
                if (updated_at) {
                    summary.updated_at = *updated_at;
                }
                
                summaries.push_back(summary);
                
                // Get total count from first row
                if (i == 0) {
                    total_count = result.getInt(i, "total_count");
                }
            }
            
            logging::Logger::getInstance().debug("Listed {} syllabi (total: {})", summaries.size(), total_count);
            
            return {summaries, total_count};
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error listing syllabi: {}", e.what());
            return {{}, 0};
        }
    }
    
    std::vector<SyllabusChange> trackChanges(
        const std::string& syllabus_id,
        const std::string& from_version,
        const std::string& to_version
    ) override {
        try {
            // Get changes from the database
            std::string query = R"(
                SELECT 
                    id, change_type, element_type, element_id, parent_id,
                    description, rationale, author_id, timestamp
                FROM etr.syllabus_changes
                WHERE syllabus_id = $1 AND from_version = $2 AND to_version = $3
                ORDER BY timestamp ASC
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"syllabus_id", syllabus_id, persistence::PgParamType::TEXT, false});
            params.push_back({"from_version", from_version, persistence::PgParamType::TEXT, false});
            params.push_back({"to_version", to_version, persistence::PgParamType::TEXT, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.hasError()) {
                logging::Logger::getInstance().error("Failed to get syllabus changes: {}", result.getErrorMessage());
                return {};
            }
            
            std::vector<SyllabusChange> changes;
            
            for (int i = 0; i < result.getNumRows(); ++i) {
                SyllabusChange change;
                change.change_type = changeTypeFromString(result.getString(i, "change_type"));
                change.element_type = elementTypeFromString(result.getString(i, "element_type"));
                change.element_id = result.getString(i, "element_id");
                
                if (!result.isNull(i, "parent_id")) {
                    change.parent_id = result.getString(i, "parent_id");
                }
                
                change.description = result.getString(i, "description");
                change.rationale = result.getString(i, "rationale");
                change.author_id = result.getString(i, "author_id");
                
                auto timestamp = result.getTimestamp(i, "timestamp");
                if (timestamp) {
                    change.timestamp = *timestamp;
                }
                
                // Get change values
                int change_id = result.getInt(i, "id");
                
                std::string values_query = R"(
                    SELECT key, old_value, new_value
                    FROM etr.syllabus_change_values
                    WHERE change_id = $1
                )";
                
                std::vector<persistence::PgParam> values_params;
                values_params.push_back({"change_id", std::to_string(change_id), persistence::PgParamType::INTEGER, false});
                
                auto values_result = db_connection_->executeQuery(values_query, values_params);
                
                if (!values_result.hasError()) {
                    for (int j = 0; j < values_result.getNumRows(); ++j) {
                        std::string key = values_result.getString(j, "key");
                        
                        if (!values_result.isNull(j, "old_value")) {
                            change.old_values[key] = values_result.getString(j, "old_value");
                        }
                        
                        if (!values_result.isNull(j, "new_value")) {
                            change.new_values[key] = values_result.getString(j, "new_value");
                        }
                    }
                }
                
                changes.push_back(change);
            }
            
            logging::Logger::getInstance().debug("Tracked {} changes between versions {} and {} of syllabus {}", 
                changes.size(), from_version, to_version, syllabus_id);
            
            return changes;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error tracking syllabus changes: {}", e.what());
            return {};
        }
    }
    
    bool logChange(
        const std::string& syllabus_id,
        const SyllabusChange& change
    ) override {
        try {
            auto transaction = db_connection_->createTransaction();
            
            // Insert change
            std::string query = R"(
                INSERT INTO etr.syllabus_changes (
                    syllabus_id, from_version, to_version, change_type, 
                    element_type, element_id, parent_id, description, 
                    rationale, author_id, timestamp
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
                ) RETURNING id
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"syllabus_id", syllabus_id, persistence::PgParamType::TEXT, false});
            params.push_back({"from_version", change.old_values.at("version"), persistence::PgParamType::TEXT, false});
            params.push_back({"to_version", change.new_values.at("version"), persistence::PgParamType::TEXT, false});
            params.push_back({"change_type", changeTypeToString(change.change_type), persistence::PgParamType::TEXT, false});
            params.push_back({"element_type", elementTypeToString(change.element_type), persistence::PgParamType::TEXT, false});
            params.push_back({"element_id", change.element_id, persistence::PgParamType::TEXT, false});
            
            if (change.parent_id) {
                params.push_back({"parent_id", *change.parent_id, persistence::PgParamType::TEXT, false});
            } else {
                params.push_back({"parent_id", "", persistence::PgParamType::TEXT, true});
            }
            
            params.push_back({"description", change.description, persistence::PgParamType::TEXT, false});
            params.push_back({"rationale", change.rationale, persistence::PgParamType::TEXT, false});
            params.push_back({"author_id", change.author_id, persistence::PgParamType::TEXT, false});
            
            auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
                change.timestamp.time_since_epoch()).count();
            params.push_back({"timestamp", std::to_string(timestamp), persistence::PgParamType::TIMESTAMP, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.isEmpty() || result.hasError()) {
                logging::Logger::getInstance().error("Failed to insert syllabus change: {}", 
                    result.hasError() ? result.getErrorMessage() : "No rows affected");
                transaction.rollback();
                return false;
            }
            
            int change_id = result.getInt(0, 0);
            
            // Insert change values
            for (const auto& [key, value] : change.old_values) {
                std::string values_query = R"(
                    INSERT INTO etr.syllabus_change_values (
                        change_id, key, old_value, new_value
                    ) VALUES (
                        $1, $2, $3, $4
                    )
                )";
                
                std::vector<persistence::PgParam> values_params;
                values_params.push_back({"change_id", std::to_string(change_id), persistence::PgParamType::INTEGER, false});
                values_params.push_back({"key", key, persistence::PgParamType::TEXT, false});
                values_params.push_back({"old_value", value, persistence::PgParamType::TEXT, false});
                
                std::string new_value;
                if (change.new_values.find(key) != change.new_values.end()) {
                    new_value = change.new_values.at(key);
                    values_params.push_back({"new_value", new_value, persistence::PgParamType::TEXT, false});
                } else {
                    values_params.push_back({"new_value", "", persistence::PgParamType::TEXT, true});
                }
                
                auto values_result = db_connection_->executeQuery(values_query, values_params);
                
                if (values_result.hasError()) {
                    logging::Logger::getInstance().error("Failed to insert syllabus change value: {}", 
                        values_result.getErrorMessage());
                    transaction.rollback();
                    return false;
                }
            }
            
            // Insert new values that weren't in old values
            for (const auto& [key, value] : change.new_values) {
                if (change.old_values.find(key) == change.old_values.end()) {
                    std::string values_query = R"(
                        INSERT INTO etr.syllabus_change_values (
                            change_id, key, old_value, new_value
                        ) VALUES (
                            $1, $2, $3, $4
                        )
                    )";
                    
                    std::vector<persistence::PgParam> values_params;
                    values_params.push_back({"change_id", std::to_string(change_id), persistence::PgParamType::INTEGER, false});
                    values_params.push_back({"key", key, persistence::PgParamType::TEXT, false});
                    values_params.push_back({"old_value", "", persistence::PgParamType::TEXT, true});
                    values_params.push_back({"new_value", value, persistence::PgParamType::TEXT, false});
                    
                    auto values_result = db_connection_->executeQuery(values_query, values_params);
                    
                    if (values_result.hasError()) {
                        logging::Logger::getInstance().error("Failed to insert syllabus change value: {}", 
                            values_result.getErrorMessage());
                        transaction.rollback();
                        return false;
                    }
                }
            }
            
            // Commit transaction
            if (!transaction.commit()) {
                logging::Logger::getInstance().error("Failed to commit syllabus change transaction");
                return false;
            }
            
            logging::Logger::getInstance().info("Logged change for syllabus {}: {} {} {}", 
                syllabus_id, changeTypeToString(change.change_type), 
                elementTypeToString(change.element_type), change.element_id);
            
            return true;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error logging syllabus change: {}", e.what());
            return false;
        }
    }
    
    std::vector<std::string> getAllVersions(const std::string& syllabus_id) override {
        try {
            std::string query = R"(
                SELECT version
                FROM etr.syllabi
                WHERE syllabus_id = $1
                ORDER BY effective_date ASC
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"syllabus_id", syllabus_id, persistence::PgParamType::TEXT, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.hasError()) {
                logging::Logger::getInstance().error("Failed to get syllabus versions: {}", result.getErrorMessage());
                return {};
            }
            
            std::vector<std::string> versions;
            
            for (int i = 0; i < result.getNumRows(); ++i) {
                versions.push_back(result.getString(i, "version"));
            }
            
            logging::Logger::getInstance().debug("Retrieved {} versions for syllabus {}", versions.size(), syllabus_id);
            
            return versions;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error getting syllabus versions: {}", e.what());
            return {};
        }
    }
    
    std::optional<Syllabus> getLatestApprovedSyllabus(const std::string& course_id) override {
        try {
            std::string query = R"(
                SELECT syllabus_id, version
                FROM etr.syllabi
                WHERE course_id = $1 AND status = $2
                ORDER BY effective_date DESC
                LIMIT 1
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"course_id", course_id, persistence::PgParamType::TEXT, false});
            params.push_back({"status", syllabusStatusToString(SyllabusStatus::APPROVED), 
                             persistence::PgParamType::TEXT, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.isEmpty() || result.hasError()) {
                if (result.hasError()) {
                    logging::Logger::getInstance().error("Failed to get latest approved syllabus: {}", 
                        result.getErrorMessage());
                }
                return std::nullopt;
            }
            
            std::string syllabus_id = result.getString(0, "syllabus_id");
            std::string version = result.getString(0, "version");
            
            return getSyllabus(syllabus_id, version);
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error getting latest approved syllabus: {}", e.what());
            return std::nullopt;
        }
    }

private:
    bool insertSection(
        persistence::Transaction& transaction,
        const std::string& syllabus_id,
        const std::string& version,
        const SyllabusSection& section
    ) {
        try {
            // Generate section ID if not provided
            std::string section_id = section.section_id;
            if (section_id.empty()) {
                section_id = generateUniqueId();
            }
            
            // Insert section
            std::string query = R"(
                INSERT INTO etr.syllabus_sections (
                    section_id, syllabus_id, version, title, 
                    description, section_order
                ) VALUES (
                    $1, $2, $3, $4, $5, $6
                ) RETURNING section_id
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"section_id", section_id, persistence::PgParamType::TEXT, false});
            params.push_back({"syllabus_id", syllabus_id, persistence::PgParamType::TEXT, false});
            params.push_back({"version", version, persistence::PgParamType::TEXT, false});
            params.push_back({"title", section.title, persistence::PgParamType::TEXT, false});
            params.push_back({"description", section.description, persistence::PgParamType::TEXT, false});
            params.push_back({"section_order", std::to_string(section.order), persistence::PgParamType::INTEGER, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.isEmpty() || result.hasError()) {
                logging::Logger::getInstance().error("Failed to insert syllabus section: {}", 
                    result.hasError() ? result.getErrorMessage() : "No rows affected");
                return false;
            }
            
            // Insert exercises
            for (const auto& exercise : section.exercises) {
                if (!insertExercise(transaction, section_id, exercise)) {
                    return false;
                }
            }
            
            return true;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error inserting syllabus section: {}", e.what());
            return false;
        }
    }
    
    bool insertExercise(
        persistence::Transaction& transaction,
        const std::string& section_id,
        const SyllabusExercise& exercise
    ) {
        try {
            // Generate exercise ID if not provided
            std::string exercise_id = exercise.exercise_id;
            if (exercise_id.empty()) {
                exercise_id = generateUniqueId();
            }
            
            // Insert exercise
            std::string query = R"(
                INSERT INTO etr.syllabus_exercises (
                    exercise_id, section_id, title, description, 
                    exercise_order, duration_minutes, exercise_type
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7
                ) RETURNING exercise_id
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"exercise_id", exercise_id, persistence::PgParamType::TEXT, false});
            params.push_back({"section_id", section_id, persistence::PgParamType::TEXT, false});
            params.push_back({"title", exercise.title, persistence::PgParamType::TEXT, false});
            params.push_back({"description", exercise.description, persistence::PgParamType::TEXT, false});
            params.push_back({"exercise_order", std::to_string(exercise.order), persistence::PgParamType::INTEGER, false});
            params.push_back({"duration_minutes", std::to_string(exercise.duration_minutes), 
                             persistence::PgParamType::INTEGER, false});
            params.push_back({"exercise_type", exercise.exercise_type, persistence::PgParamType::TEXT, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.isEmpty() || result.hasError()) {
                logging::Logger::getInstance().error("Failed to insert syllabus exercise: {}", 
                    result.hasError() ? result.getErrorMessage() : "No rows affected");
                return false;
            }
            
            // Insert objectives
            for (size_t i = 0; i < exercise.objectives.size(); ++i) {
                std::string objective_query = R"(
                    INSERT INTO etr.exercise_objectives (
                        exercise_id, objective, objective_order
                    ) VALUES (
                        $1, $2, $3
                    )
                )";
                
                std::vector<persistence::PgParam> objective_params;
                objective_params.push_back({"exercise_id", exercise_id, persistence::PgParamType::TEXT, false});
                objective_params.push_back({"objective", exercise.objectives[i], persistence::PgParamType::TEXT, false});
                objective_params.push_back({"objective_order", std::to_string(i + 1), persistence::PgParamType::INTEGER, false});
                
                auto objective_result = db_connection_->executeQuery(objective_query, objective_params);
                
                if (objective_result.hasError()) {
                    logging::Logger::getInstance().error("Failed to insert exercise objective: {}", 
                        objective_result.getErrorMessage());
                    return false;
                }
            }
            
            // Insert references
            for (size_t i = 0; i < exercise.references.size(); ++i) {
                std::string reference_query = R"(
                    INSERT INTO etr.exercise_references (
                        exercise_id, reference, reference_order
                    ) VALUES (
                        $1, $2, $3
                    )
                )";
                
                std::vector<persistence::PgParam> reference_params;
                reference_params.push_back({"exercise_id", exercise_id, persistence::PgParamType::TEXT, false});
                reference_params.push_back({"reference", exercise.references[i], persistence::PgParamType::TEXT, false});
                reference_params.push_back({"reference_order", std::to_string(i + 1), persistence::PgParamType::INTEGER, false});
                
                auto reference_result = db_connection_->executeQuery(reference_query, reference_params);
                
                if (reference_result.hasError()) {
                    logging::Logger::getInstance().error("Failed to insert exercise reference: {}", 
                        reference_result.getErrorMessage());
                    return false;
                }
            }
            
            // Insert equipment
            for (size_t i = 0; i < exercise.equipment.size(); ++i) {
                std::string equipment_query = R"(
                    INSERT INTO etr.exercise_equipment (
                        exercise_id, equipment, equipment_order
                    ) VALUES (
                        $1, $2, $3
                    )
                )";
                
                std::vector<persistence::PgParam> equipment_params;
                equipment_params.push_back({"exercise_id", exercise_id, persistence::PgParamType::TEXT, false});
                equipment_params.push_back({"equipment", exercise.equipment[i], persistence::PgParamType::TEXT, false});
                equipment_params.push_back({"equipment_order", std::to_string(i + 1), persistence::PgParamType::INTEGER, false});
                
                auto equipment_result = db_connection_->executeQuery(equipment_query, equipment_params);
                
                if (equipment_result.hasError()) {
                    logging::Logger::getInstance().error("Failed to insert exercise equipment: {}", 
                        equipment_result.getErrorMessage());
                    return false;
                }
            }
            
            // Insert prerequisites
            for (const auto& prerequisite : exercise.prerequisite_exercises) {
                std::string prerequisite_query = R"(
                    INSERT INTO etr.exercise_prerequisites (
                        exercise_id, prerequisite_exercise_id
                    ) VALUES (
                        $1, $2
                    )
                )";
                
                std::vector<persistence::PgParam> prerequisite_params;
                prerequisite_params.push_back({"exercise_id", exercise_id, persistence::PgParamType::TEXT, false});
                prerequisite_params.push_back({"prerequisite_exercise_id", prerequisite, 
                                             persistence::PgParamType::TEXT, false});
                
                auto prerequisite_result = db_connection_->executeQuery(prerequisite_query, prerequisite_params);
                
                if (prerequisite_result.hasError()) {
                    logging::Logger::getInstance().error("Failed to insert exercise prerequisite: {}", 
                        prerequisite_result.getErrorMessage());
                    return false;
                }
            }
            
            // Insert metadata
            for (const auto& [key, value] : exercise.metadata) {
                std::string metadata_query = R"(
                    INSERT INTO etr.exercise_metadata (
                        exercise_id, key, value
                    ) VALUES (
                        $1, $2, $3
                    )
                )";
                
                std::vector<persistence::PgParam> metadata_params;
                metadata_params.push_back({"exercise_id", exercise_id, persistence::PgParamType::TEXT, false});
                metadata_params.push_back({"key", key, persistence::PgParamType::TEXT, false});
                metadata_params.push_back({"value", value, persistence::PgParamType::TEXT, false});
                
                auto metadata_result = db_connection_->executeQuery(metadata_query, metadata_params);
                
                if (metadata_result.hasError()) {
                    logging::Logger::getInstance().error("Failed to insert exercise metadata: {}", 
                        metadata_result.getErrorMessage());
                    return false;
                }
            }
            
            // Insert grading criteria
            for (const auto& criteria : exercise.grading_criteria) {
                if (!insertGradingCriteria(transaction, exercise_id, criteria)) {
                    return false;
                }
            }
            
            return true;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error inserting syllabus exercise: {}", e.what());
            return false;
        }
    }
    
    bool insertGradingCriteria(
        persistence::Transaction& transaction,
        const std::string& exercise_id,
        const GradingCriteria& criteria
    ) {
        try {
            // Generate criteria ID if not provided
            std::string criteria_id = criteria.criteria_id;
            if (criteria_id.empty()) {
                criteria_id = generateUniqueId();
            }
            
            // Insert criteria
            std::string query = R"(
                INSERT INTO etr.grading_criteria (
                    criteria_id, exercise_id, name, description, is_required
                ) VALUES (
                    $1, $2, $3, $4, $5
                ) RETURNING criteria_id
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"criteria_id", criteria_id, persistence::PgParamType::TEXT, false});
            params.push_back({"exercise_id", exercise_id, persistence::PgParamType::TEXT, false});
            params.push_back({"name", criteria.name, persistence::PgParamType::TEXT, false});
            params.push_back({"description", criteria.description, persistence::PgParamType::TEXT, false});
            params.push_back({"is_required", criteria.is_required ? "true" : "false", 
                             persistence::PgParamType::BOOLEAN, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.isEmpty() || result.hasError()) {
                logging::Logger::getInstance().error("Failed to insert grading criteria: {}", 
                    result.hasError() ? result.getErrorMessage() : "No rows affected");
                return false;
            }
            
            // Insert regulation references
            for (const auto& [regulation_id, reference] : criteria.regulation_references) {
                std::string regulation_query = R"(
                    INSERT INTO etr.criteria_regulations (
                        criteria_id, regulation_id, regulation_reference
                    ) VALUES (
                        $1, $2, $3
                    )
                )";
                
                std::vector<persistence::PgParam> regulation_params;
                regulation_params.push_back({"criteria_id", criteria_id, persistence::PgParamType::TEXT, false});
                regulation_params.push_back({"regulation_id", regulation_id, persistence::PgParamType::TEXT, false});
                regulation_params.push_back({"regulation_reference", reference, persistence::PgParamType::TEXT, false});
                
                auto regulation_result = db_connection_->executeQuery(regulation_query, regulation_params);
                
                if (regulation_result.hasError()) {
                    logging::Logger::getInstance().error("Failed to insert criteria regulation: {}", 
                        regulation_result.getErrorMessage());
                    return false;
                }
            }
            
            // Insert grade definitions
            for (const auto& grade_def : criteria.grade_definitions) {
                std::string grade_query = R"(
                    INSERT INTO etr.grade_definitions (
                        criteria_id, grade, description, is_passing
                    ) VALUES (
                        $1, $2, $3, $4
                    )
                )";
                
                std::vector<persistence::PgParam> grade_params;
                grade_params.push_back({"criteria_id", criteria_id, persistence::PgParamType::TEXT, false});
                grade_params.push_back({"grade", std::to_string(grade_def.grade), persistence::PgParamType::INTEGER, false});
                grade_params.push_back({"description", grade_def.description, persistence::PgParamType::TEXT, false});
                grade_params.push_back({"is_passing", grade_def.is_passing ? "true" : "false", 
                                      persistence::PgParamType::BOOLEAN, false});
                
                auto grade_result = db_connection_->executeQuery(grade_query, grade_params);
                
                if (grade_result.hasError()) {
                    logging::Logger::getInstance().error("Failed to insert grade definition: {}", 
                        grade_result.getErrorMessage());
                    return false;
                }
            }
            
            return true;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error inserting grading criteria: {}", e.what());
            return false;
        }
    }
    
    bool deleteSyllabusSection(
        persistence::Transaction& transaction,
        const std::string& syllabus_id,
        const std::string& version
    ) {
        try {
            std::string query = R"(
                DELETE FROM etr.syllabus_sections
                WHERE syllabus_id = $1 AND version = $2
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"syllabus_id", syllabus_id, persistence::PgParamType::TEXT, false});
            params.push_back({"version", version, persistence::PgParamType::TEXT, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.hasError()) {
                logging::Logger::getInstance().error("Failed to delete syllabus sections: {}", 
                    result.getErrorMessage());
                return false;
            }
            
            return true;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error deleting syllabus sections: {}", e.what());
            return false;
        }
    }
    
    std::vector<SyllabusSection> getSyllabusSection(
        const std::string& syllabus_id,
        const std::string& version
    ) {
        try {
            std::string query = R"(
                SELECT 
                    section_id, title, description, section_order
                FROM etr.syllabus_sections
                WHERE syllabus_id = $1 AND version = $2
                ORDER BY section_order ASC
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"syllabus_id", syllabus_id, persistence::PgParamType::TEXT, false});
            params.push_back({"version", version, persistence::PgParamType::TEXT, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.hasError()) {
                logging::Logger::getInstance().error("Failed to get syllabus sections: {}", 
                    result.getErrorMessage());
                return {};
            }
            
            std::vector<SyllabusSection> sections;
            
            for (int i = 0; i < result.getNumRows(); ++i) {
                SyllabusSection section;
                section.section_id = result.getString(i, "section_id");
                section.title = result.getString(i, "title");
                section.description = result.getString(i, "description");
                section.order = result.getInt(i, "section_order");
                
                // Get exercises for this section
                section.exercises = getExercises(section.section_id);
                
                sections.push_back(section);
            }
            
            return sections;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error getting syllabus sections: {}", e.what());
            return {};
        }
    }
    
    std::vector<SyllabusExercise> getExercises(const std::string& section_id) {
        try {
            std::string query = R"(
                SELECT 
                    exercise_id, title, description, exercise_order, 
                    duration_minutes, exercise_type
                FROM etr.syllabus_exercises
                WHERE section_id = $1
                ORDER BY exercise_order ASC
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"section_id", section_id, persistence::PgParamType::TEXT, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.hasError()) {
                logging::Logger::getInstance().error("Failed to get exercises: {}", 
                    result.getErrorMessage());
                return {};
            }
            
            std::vector<SyllabusExercise> exercises;
            
            for (int i = 0; i < result.getNumRows(); ++i) {
                SyllabusExercise exercise;
                exercise.exercise_id = result.getString(i, "exercise_id");
                exercise.title = result.getString(i, "title");
                exercise.description = result.getString(i, "description");
                exercise.order = result.getInt(i, "exercise_order");
                exercise.duration_minutes = result.getInt(i, "duration_minutes");
                exercise.exercise_type = result.getString(i, "exercise_type");
                
                // Get objectives
                exercise.objectives = getExerciseObjectives(exercise.exercise_id);
                
                // Get references
                exercise.references = getExerciseReferences(exercise.exercise_id);
                
                // Get equipment
                exercise.equipment = getExerciseEquipment(exercise.exercise_id);
                
                // Get prerequisites
                exercise.prerequisite_exercises = getExercisePrerequisites(exercise.exercise_id);
                
                // Get metadata
                exercise.metadata = getExerciseMetadata(exercise.exercise_id);
                
                // Get grading criteria
                exercise.grading_criteria = getGradingCriteria(exercise.exercise_id);
                
                exercises.push_back(exercise);
            }
            
            return exercises;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error getting exercises: {}", e.what());
            return {};
        }
    }
    
    std::vector<std::string> getExerciseObjectives(const std::string& exercise_id) {
        try {
            std::string query = R"(
                SELECT objective
                FROM etr.exercise_objectives
                WHERE exercise_id = $1
                ORDER BY objective_order ASC
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"exercise_id", exercise_id, persistence::PgParamType::TEXT, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.hasError()) {
                logging::Logger::getInstance().error("Failed to get exercise objectives: {}", 
                    result.getErrorMessage());
                return {};
            }
            
            std::vector<std::string> objectives;
            
            for (int i = 0; i < result.getNumRows(); ++i) {
                objectives.push_back(result.getString(i, "objective"));
            }
            
            return objectives;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error getting exercise objectives: {}", e.what());
            return {};
        }
    }
    
    std::vector<std::string> getExerciseReferences(const std::string& exercise_id) {
        try {
            std::string query = R"(
                SELECT reference
                FROM etr.exercise_references
                WHERE exercise_id = $1
                ORDER BY reference_order ASC
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"exercise_id", exercise_id, persistence::PgParamType::TEXT, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.hasError()) {
                logging::Logger::getInstance().error("Failed to get exercise references: {}", 
                    result.getErrorMessage());
                return {};
            }
            
            std::vector<std::string> references;
            
            for (int i = 0; i < result.getNumRows(); ++i) {
                references.push_back(result.getString(i, "reference"));
            }
            
            return references;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error getting exercise references: {}", e.what());
            return {};
        }
    }
    
    std::vector<std::string> getExerciseEquipment(const std::string& exercise_id) {
        try {
            std::string query = R"(
                SELECT equipment
                FROM etr.exercise_equipment
                WHERE exercise_id = $1
                ORDER BY equipment_order ASC
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"exercise_id", exercise_id, persistence::PgParamType::TEXT, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.hasError()) {
                logging::Logger::getInstance().error("Failed to get exercise equipment: {}", 
                    result.getErrorMessage());
                return {};
            }
            
            std::vector<std::string> equipment;
            
            for (int i = 0; i < result.getNumRows(); ++i) {
                equipment.push_back(result.getString(i, "equipment"));
            }
            
            return equipment;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error getting exercise equipment: {}", e.what());
            return {};
        }
    }
    
    std::vector<std::string> getExercisePrerequisites(const std::string& exercise_id) {
        try {
            std::string query = R"(
                SELECT prerequisite_exercise_id
                FROM etr.exercise_prerequisites
                WHERE exercise_id = $1
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"exercise_id", exercise_id, persistence::PgParamType::TEXT, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.hasError()) {
                logging::Logger::getInstance().error("Failed to get exercise prerequisites: {}", 
                    result.getErrorMessage());
                return {};
            }
            
            std::vector<std::string> prerequisites;
            
            for (int i = 0; i < result.getNumRows(); ++i) {
                prerequisites.push_back(result.getString(i, "prerequisite_exercise_id"));
            }
            
            return prerequisites;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error getting exercise prerequisites: {}", e.what());
            return {};
        }
    }
    
    std::map<std::string, std::string> getExerciseMetadata(const std::string& exercise_id) {
        try {
            std::string query = R"(
                SELECT key, value
                FROM etr.exercise_metadata
                WHERE exercise_id = $1
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"exercise_id", exercise_id, persistence::PgParamType::TEXT, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.hasError()) {
                logging::Logger::getInstance().error("Failed to get exercise metadata: {}", 
                    result.getErrorMessage());
                return {};
            }
            
            std::map<std::string, std::string> metadata;
            
            for (int i = 0; i < result.getNumRows(); ++i) {
                metadata[result.getString(i, "key")] = result.getString(i, "value");
            }
            
            return metadata;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error getting exercise metadata: {}", e.what());
            return {};
        }
    }
    
    std::vector<GradingCriteria> getGradingCriteria(const std::string& exercise_id) {
        try {
            std::string query = R"(
                SELECT 
                    criteria_id, name, description, is_required
                FROM etr.grading_criteria
                WHERE exercise_id = $1
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"exercise_id", exercise_id, persistence::PgParamType::TEXT, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.hasError()) {
                logging::Logger::getInstance().error("Failed to get grading criteria: {}", 
                    result.getErrorMessage());
                return {};
            }
            
            std::vector<GradingCriteria> criteria;
            
            for (int i = 0; i < result.getNumRows(); ++i) {
                GradingCriteria criterion;
                criterion.criteria_id = result.getString(i, "criteria_id");
                criterion.name = result.getString(i, "name");
                criterion.description = result.getString(i, "description");
                criterion.is_required = result.getBool(i, "is_required");
                
                // Get regulation references
                criterion.regulation_references = getCriteriaRegulations(criterion.criteria_id);
                
                // Get grade definitions
                criterion.grade_definitions = getGradeDefinitions(criterion.criteria_id);
                
                criteria.push_back(criterion);
            }
            
            return criteria;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error getting grading criteria: {}", e.what());
            return {};
        }
    }
    
    std::map<std::string, std::string> getCriteriaRegulations(const std::string& criteria_id) {
        try {
            std::string query = R"(
                SELECT regulation_id, regulation_reference
                FROM etr.criteria_regulations
                WHERE criteria_id = $1
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"criteria_id", criteria_id, persistence::PgParamType::TEXT, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.hasError()) {
                logging::Logger::getInstance().error("Failed to get criteria regulations: {}", 
                    result.getErrorMessage());
                return {};
            }
            
            std::map<std::string, std::string> regulations;
            
            for (int i = 0; i < result.getNumRows(); ++i) {
                regulations[result.getString(i, "regulation_id")] = result.getString(i, "regulation_reference");
            }
            
            return regulations;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error getting criteria regulations: {}", e.what());
            return {};
        }
    }
    
    std::vector<GradeDefinition> getGradeDefinitions(const std::string& criteria_id) {
        try {
            std::string query = R"(
                SELECT 
                    grade, description, is_passing
                FROM etr.grade_definitions
                WHERE criteria_id = $1
                ORDER BY grade ASC
            )";
            
            std::vector<persistence::PgParam> params;
            params.push_back({"criteria_id", criteria_id, persistence::PgParamType::TEXT, false});
            
            auto result = db_connection_->executeQuery(query, params);
            
            if (result.hasError()) {
                logging::Logger::getInstance().error("Failed to get grade definitions: {}", 
                    result.getErrorMessage());
                return {};
            }
            
            std::vector<GradeDefinition> definitions;
            
            for (int i = 0; i < result.getNumRows(); ++i) {
                GradeDefinition definition;
                definition.grade = result.getInt(i, "grade");
                definition.description = result.getString(i, "description");
                definition.is_passing = result.getBool(i, "is_passing");
                
                definitions.push_back(definition);
            }
            
            return definitions;
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Error getting grade definitions: {}", e.what());
            return {};
        }
    }
    
    std::string generateUniqueId() {
        uuids::uuid uuid = uuids::uuid_system_generator{}();
        return uuids::to_string(uuid);
    }
    
    std::shared_ptr<persistence::DatabaseConnection> db_connection_;
};

} // namespace syllabus
} // namespace etr