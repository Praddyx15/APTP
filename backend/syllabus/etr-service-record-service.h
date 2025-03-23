#pragma once

#include <string>
#include <vector>
#include <memory>
#include <optional>
#include "records/record_model.h"

namespace etr {
namespace records {

/**
 * @brief Record service interface
 */
class IRecordService {
public:
    virtual ~IRecordService() = default;
    
    /**
     * @brief Create a training record
     * @param record Record to create
     * @return Created record ID or empty string if failed
     */
    virtual std::string createRecord(const TrainingRecord& record) = 0;
    
    /**
     * @brief Get a training record
     * @param record_id Record ID
     * @return Record or nullopt if not found
     */
    virtual std::optional<TrainingRecord> getRecord(const std::string& record_id) = 0;
    
    /**
     * @brief Update a training record
     * @param record Record to update
     * @return True if updated, false if not found
     */
    virtual bool updateRecord(const TrainingRecord& record) = 0;
    
    /**
     * @brief Delete a training record
     * @param record_id Record ID
     * @return True if deleted, false if not found
     */
    virtual bool deleteRecord(const std::string& record_id) = 0;
    
    /**
     * @brief List records matching criteria
     * @param trainee_id Trainee ID (optional)
     * @param instructor_id Instructor ID (optional)
     * @param course_id Course ID (optional)
     * @param syllabus_id Syllabus ID (optional)
     * @param record_type Record type (optional)
     * @param start_date Start date (optional)
     * @param end_date End date (optional)
     * @param page Page number (starting from 1)
     * @param page_size Page size
     * @param sort_by Sort field
     * @param ascending Sort direction
     * @return Pair of records and total count
     */
    virtual std::pair<std::vector<TrainingRecord>, int> listRecords(
        const std::optional<std::string>& trainee_id = std::nullopt,
        const std::optional<std::string>& instructor_id = std::nullopt,
        const std::optional<std::string>& course_id = std::nullopt,
        const std::optional<std::string>& syllabus_id = std::nullopt,
        const std::optional<RecordType>& record_type = std::nullopt,
        const std::optional<std::chrono::system_clock::time_point>& start_date = std::nullopt,
        const std::optional<std::chrono::system_clock::time_point>& end_date = std::nullopt,
        int page = 1,
        int page_size = 10,
        const std::string& sort_by = "date",
        bool ascending = false
    ) = 0;
    
    /**
     * @brief Get record audit logs
     * @param record_id Record ID
     * @return Audit logs
     */
    virtual std::vector<nlohmann::json> getAuditLogs(const std::string& record_id) = 0;
    
    /**
     * @brief Get records for trainee and criteria
     * @param trainee_id Trainee ID
     * @param criteria_id Criteria ID
     * @return Records
     */
    virtual std::vector<TrainingRecord> getRecordsForTraineeAndCriteria(
        const std::string& trainee_id,
        const std::string& criteria_id
    ) = 0;
    
    /**
     * @brief Get trainee progress
     * @param trainee_id Trainee ID
     * @param course_id Course ID
     * @return Progress as percentage (0-100)
     */
    virtual double getTraineeProgress(
        const std::string& trainee_id,
        const std::string& course_id
    ) = 0;
    
    /**
     * @brief Add attachment to record
     * @param record_id Record ID
     * @param attachment_path Attachment path
     * @param attachment_name Attachment name
     * @param content_type Content type
     * @param data Attachment data
     * @return True if added successfully
     */
    virtual bool addAttachment(
        const std::string& record_id,
        const std::string& attachment_name,
        const std::string& content_type,
        const std::vector<uint8_t>& data
    ) = 0;
    
    /**
     * @brief Get attachment
     * @param record_id Record ID
     * @param attachment_path Attachment path
     * @return Attachment data or empty vector if not found
     */
    virtual std::vector<uint8_t> getAttachment(
        const std::string& record_id,
        const std::string& attachment_path
    ) = 0;
};

/**
 * @brief Record service implementation
 */
class RecordService : public IRecordService {
public:
    /**
     * @brief Constructor
     * @param repository Record repository
     */
    explicit RecordService(std::shared_ptr<IRecordRepository> repository);
    
    /**
     * @brief Destructor
     */
    ~RecordService() override;
    
    std::string createRecord(const TrainingRecord& record) override;
    
    std::optional<TrainingRecord> getRecord(const std::string& record_id) override;
    
    bool updateRecord(const TrainingRecord& record) override;
    
    bool deleteRecord(const std::string& record_id) override;
    
    std::pair<std::vector<TrainingRecord>, int> listRecords(
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
    ) override;
    
    std::vector<nlohmann::json> getAuditLogs(const std::string& record_id) override;
    
    std::vector<TrainingRecord> getRecordsForTraineeAndCriteria(
        const std::string& trainee_id,
        const std::string& criteria_id
    ) override;
    
    double getTraineeProgress(
        const std::string& trainee_id,
        const std::string& course_id
    ) override;
    
    bool addAttachment(
        const std::string& record_id,
        const std::string& attachment_name,
        const std::string& content_type,
        const std::vector<uint8_t>& data
    ) override;
    
    std::vector<uint8_t> getAttachment(
        const std::string& record_id,
        const std::string& attachment_path
    ) override;
    
private:
    /**
     * @brief Generate attachment path
     * @param record_id Record ID
     * @param attachment_name Attachment name
     * @return Attachment path
     */
    std::string generateAttachmentPath(
        const std::string& record_id,
        const std::string& attachment_name
    );
    
    /**
     * @brief Validate record
     * @param record Record to validate
     * @return True if valid
     */
    bool validateRecord(const TrainingRecord& record);
    
    std::shared_ptr<IRecordRepository> repository_;
    std::string attachment_base_path_;
};

} // namespace records
} // namespace etr