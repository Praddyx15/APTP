#include "records/record_service.h"
#include "logging/logger.h"
#include <filesystem>
#include <fstream>
#include <sstream>
#include <uuid.h>

namespace etr {
namespace records {

RecordService::RecordService(std::shared_ptr<IRecordRepository> repository)
    : repository_(std::move(repository)), 
      attachment_base_path_("/app/data/attachments") {
    
    // Create attachments directory if it doesn't exist
    std::filesystem::path attachment_dir(attachment_base_path_);
    if (!std::filesystem::exists(attachment_dir)) {
        std::filesystem::create_directories(attachment_dir);
    }
    
    logging::Logger::getInstance().info("RecordService initialized");
}

RecordService::~RecordService() = default;

std::string RecordService::createRecord(const TrainingRecord& record) {
    // Validate record
    if (!validateRecord(record)) {
        logging::Logger::getInstance().error("Invalid record data");
        return "";
    }
    
    // Set creation and update time if not already set
    TrainingRecord record_copy = record;
    
    auto now = std::chrono::system_clock::now();
    
    if (record_copy.getCreatedAt() == std::chrono::system_clock::time_point()) {
        record_copy.setCreatedAt(now);
    }
    
    if (record_copy.getUpdatedAt() == std::chrono::system_clock::time_point()) {
        record_copy.setUpdatedAt(now);
    }
    
    // Create the record
    std::string record_id = repository_->createRecord(record_copy);
    
    if (!record_id.empty()) {
        logging::Logger::getInstance().info("Created record with ID: {}", record_id);
    } else {
        logging::Logger::getInstance().error("Failed to create record");
    }
    
    return record_id;
}

std::optional<TrainingRecord> RecordService::getRecord(const std::string& record_id) {
    auto record = repository_->getRecord(record_id);
    
    if (record) {
        logging::Logger::getInstance().debug("Retrieved record with ID: {}", record_id);
    } else {
        logging::Logger::getInstance().debug("Record not found with ID: {}", record_id);
    }
    
    return record;
}

bool RecordService::updateRecord(const TrainingRecord& record) {
    // Validate record
    if (!validateRecord(record)) {
        logging::Logger::getInstance().error("Invalid record data");
        return false;
    }
    
    // Get existing record to check permissions
    auto existing_record = repository_->getRecord(record.getRecordId());
    if (!existing_record) {
        logging::Logger::getInstance().error("Record not found with ID: {}", record.getRecordId());
        return false;
    }
    
    // Check if record is already signed
    if (existing_record->isFullySigned() && !record.isDraft()) {
        logging::Logger::getInstance().error("Cannot update signed record: {}", record.getRecordId());
        return false;
    }
    
    // Update the record
    TrainingRecord record_copy = record;
    record_copy.setUpdatedAt(std::chrono::system_clock::now());
    
    bool success = repository_->updateRecord(record_copy);
    
    if (success) {
        logging::Logger::getInstance().info("Updated record with ID: {}", record.getRecordId());
    } else {
        logging::Logger::getInstance().error("Failed to update record with ID: {}", record.getRecordId());
    }
    
    return success;
}

bool RecordService::deleteRecord(const std::string& record_id) {
    // Get existing record to check permissions
    auto existing_record = repository_->getRecord(record_id);
    if (!existing_record) {
        logging::Logger::getInstance().error("Record not found with ID: {}", record_id);
        return false;
    }
    
    // Check if record is already signed
    if (existing_record->isFullySigned() && !existing_record->isDraft()) {
        logging::Logger::getInstance().error("Cannot delete signed record: {}", record_id);
        return false;
    }
    
    // Delete the record
    bool success = repository_->deleteRecord(record_id);
    
    if (success) {
        logging::Logger::getInstance().info("Deleted record with ID: {}", record_id);
        
        // Delete attachments
        for (const auto& attachment : existing_record->getAttachments()) {
            std::string attachment_path = attachment_base_path_ + "/" + attachment;
            
            if (std::filesystem::exists(attachment_path)) {
                try {
                    std::filesystem::remove(attachment_path);
                    logging::Logger::getInstance().debug("Deleted attachment: {}", attachment);
                } 
                catch (const std::exception& e) {
                    logging::Logger::getInstance().error("Failed to delete attachment {}: {}", 
                        attachment, e.what());
                }
            }
        }
    } else {
        logging::Logger::getInstance().error("Failed to delete record with ID: {}", record_id);
    }
    
    return success;
}

std::pair<std::vector<TrainingRecord>, int> RecordService::listRecords(
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
    // List records
    auto [records, total_count] = repository_->listRecords(
        trainee_id,
        instructor_id,
        course_id,
        syllabus_id,
        record_type,
        start_date,
        end_date,
        page,
        page_size,
        sort_by,
        ascending
    );
    
    logging::Logger::getInstance().debug("Listed {} records out of {} total", 
        records.size(), total_count);
    
    return {records, total_count};
}

std::vector<nlohmann::json> RecordService::getAuditLogs(const std::string& record_id) {
    auto logs = repository_->getAuditLogs(record_id);
    
    logging::Logger::getInstance().debug("Retrieved {} audit logs for record: {}", 
        logs.size(), record_id);
    
    return logs;
}

std::vector<TrainingRecord> RecordService::getRecordsForTraineeAndCriteria(
    const std::string& trainee_id,
    const std::string& criteria_id
) {
    // List records for the trainee
    auto [records, _] = repository_->listRecords(
        trainee_id,
        std::nullopt,
        std::nullopt,
        std::nullopt,
        std::nullopt,
        std::nullopt,
        std::nullopt,
        1,
        1000,  // Fetch a large batch
        "date",
        false
    );
    
    // Filter records that have the specified criteria
    std::vector<TrainingRecord> filtered_records;
    
    for (const auto& record : records) {
        for (const auto& grade : record.getGrades()) {
            if (grade.criteria_id == criteria_id) {
                filtered_records.push_back(record);
                break;
            }
        }
    }
    
    logging::Logger::getInstance().debug("Found {} records for trainee {} and criteria {}", 
        filtered_records.size(), trainee_id, criteria_id);
    
    return filtered_records;
}

double RecordService::getTraineeProgress(
    const std::string& trainee_id,
    const std::string& course_id
) {
    // Get all records for the trainee in the course
    auto [records, _] = repository_->listRecords(
        trainee_id,
        std::nullopt,
        course_id,
        std::nullopt,
        std::nullopt,
        std::nullopt,
        std::nullopt,
        1,
        1000,  // Fetch a large batch
        "date",
        false
    );
    
    // TODO: Get course syllabus and calculate actual progress
    // For now, just return a placeholder progress value
    double progress = 0.0;
    
    if (!records.empty()) {
        // Simple calculation: number of completed exercises / total exercises in syllabus
        // In a real implementation, we would need to get the syllabus structure
        
        // For demo purposes, assume 10 exercises in the syllabus
        int total_exercises = 10;
        
        // Count unique exercise IDs
        std::unordered_set<std::string> completed_exercises;
        for (const auto& record : records) {
            if (!record.isDraft() && record.isFullySigned()) {
                completed_exercises.insert(record.getExerciseId());
            }
        }
        
        progress = static_cast<double>(completed_exercises.size()) / total_exercises * 100.0;
    }
    
    logging::Logger::getInstance().debug("Trainee {} progress in course {}: {:.2f}%", 
        trainee_id, course_id, progress);
    
    return progress;
}

bool RecordService::addAttachment(
    const std::string& record_id,
    const std::string& attachment_name,
    const std::string& content_type,
    const std::vector<uint8_t>& data
) {
    // Get existing record
    auto existing_record = repository_->getRecord(record_id);
    if (!existing_record) {
        logging::Logger::getInstance().error("Record not found with ID: {}", record_id);
        return false;
    }
    
    // Generate a unique attachment path
    std::string attachment_path = generateAttachmentPath(record_id, attachment_name);
    std::string full_path = attachment_base_path_ + "/" + attachment_path;
    
    // Create parent directories if they don't exist
    std::filesystem::path parent_dir = std::filesystem::path(full_path).parent_path();
    if (!std::filesystem::exists(parent_dir)) {
        std::filesystem::create_directories(parent_dir);
    }
    
    // Write attachment data to file
    try {
        std::ofstream file(full_path, std::ios::binary);
        if (!file) {
            logging::Logger::getInstance().error("Failed to create attachment file: {}", full_path);
            return false;
        }
        
        file.write(reinterpret_cast<const char*>(data.data()), data.size());
        file.close();
        
        // Update record with attachment
        auto record_copy = *existing_record;
        auto attachments = record_copy.getAttachments();
        attachments.push_back(attachment_path);
        record_copy.setAttachments(attachments);
        
        // Save updated record
        bool success = repository_->updateRecord(record_copy);
        
        if (success) {
            logging::Logger::getInstance().info("Added attachment {} to record: {}", 
                attachment_name, record_id);
        } else {
            // Clean up the file if record update failed
            std::filesystem::remove(full_path);
            logging::Logger::getInstance().error("Failed to update record with attachment");
            return false;
        }
        
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error adding attachment: {}", e.what());
        return false;
    }
}

std::vector<uint8_t> RecordService::getAttachment(
    const std::string& record_id,
    const std::string& attachment_path
) {
    // Get existing record
    auto existing_record = repository_->getRecord(record_id);
    if (!existing_record) {
        logging::Logger::getInstance().error("Record not found with ID: {}", record_id);
        return {};
    }
    
    // Check if attachment belongs to the record
    auto attachments = existing_record->getAttachments();
    if (std::find(attachments.begin(), attachments.end(), attachment_path) == attachments.end()) {
        logging::Logger::getInstance().error("Attachment not found for record: {}", record_id);
        return {};
    }
    
    // Read attachment data
    std::string full_path = attachment_base_path_ + "/" + attachment_path;
    
    try {
        if (!std::filesystem::exists(full_path)) {
            logging::Logger::getInstance().error("Attachment file not found: {}", full_path);
            return {};
        }
        
        std::ifstream file(full_path, std::ios::binary | std::ios::ate);
        if (!file) {
            logging::Logger::getInstance().error("Failed to open attachment file: {}", full_path);
            return {};
        }
        
        // Get file size
        std::streamsize size = file.tellg();
        file.seekg(0, std::ios::beg);
        
        // Read file data
        std::vector<uint8_t> data(size);
        if (file.read(reinterpret_cast<char*>(data.data()), size)) {
            logging::Logger::getInstance().debug("Retrieved attachment: {}", attachment_path);
            return data;
        } else {
            logging::Logger::getInstance().error("Failed to read attachment file: {}", full_path);
            return {};
        }
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error reading attachment: {}", e.what());
        return {};
    }
}

std::string RecordService::generateAttachmentPath(
    const std::string& record_id,
    const std::string& attachment_name
) {
    // Generate a unique ID for the attachment
    uuids::uuid uuid = uuids::uuid_system_generator{}();
    std::string uuid_str = uuids::to_string(uuid);
    
    // Extract file extension
    std::string extension;
    auto pos = attachment_name.find_last_of('.');
    if (pos != std::string::npos) {
        extension = attachment_name.substr(pos);
    }
    
    // Create path with record ID and unique name
    return record_id + "/" + uuid_str + extension;
}

bool RecordService::validateRecord(const TrainingRecord& record) {
    // Check required fields
    if (record.getTraineeId().empty()) {
        logging::Logger::getInstance().error("Record validation failed: missing trainee ID");
        return false;
    }
    
    if (record.getInstructorId().empty()) {
        logging::Logger::getInstance().error("Record validation failed: missing instructor ID");
        return false;
    }
    
    if (record.getCourseId().empty()) {
        logging::Logger::getInstance().error("Record validation failed: missing course ID");
        return false;
    }
    
    if (record.getSyllabusId().empty()) {
        logging::Logger::getInstance().error("Record validation failed: missing syllabus ID");
        return false;
    }
    
    if (record.getExerciseId().empty()) {
        logging::Logger::getInstance().error("Record validation failed: missing exercise ID");
        return false;
    }
    
    if (record.getRecordType() == RecordType::UNKNOWN) {
        logging::Logger::getInstance().error("Record validation failed: invalid record type");
        return false;
    }
    
    // Check grade values
    for (const auto& grade : record.getGrades()) {
        if (grade.grade < 1 || grade.grade > 4) {
            logging::Logger::getInstance().error("Record validation failed: invalid grade value");
            return false;
        }
    }
    
    return true;
}

} // namespace records
} // namespace etr