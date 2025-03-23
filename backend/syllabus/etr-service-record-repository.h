#pragma once

#include <string>
#include <vector>
#include <memory>
#include <optional>
#include "records/record_model.h"
#include "persistence/database_connection.h"

namespace etr {
namespace records {

/**
 * @brief PostgreSQL record repository implementation
 */
class RecordRepository : public IRecordRepository {
public:
    /**
     * @brief Constructor
     * @param db_connection Database connection
     */
    explicit RecordRepository(std::shared_ptr<persistence::DatabaseConnection> db_connection);
    
    /**
     * @brief Destructor
     */
    ~RecordRepository() override;
    
    // IRecordRepository implementation
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
    bool logAuditEvent(
        const std::string& record_id, 
        const std::string& action, 
        const std::string& user_id, 
        const std::string& details
    ) override;
    std::vector<nlohmann::json> getAuditLogs(const std::string& record_id) override;

private:
    /**
     * @brief Save record grades
     * @param record_id Record ID
     * @param grades Grades
     * @param transaction Transaction
     * @return True if saved successfully
     */
    bool saveGrades(
        const std::string& record_id, 
        const std::vector<GradeItem>& grades,
        persistence::Transaction& transaction
    );
    
    /**
     * @brief Get record grades
     * @param record_id Record ID
     * @return Grades
     */
    std::vector<GradeItem> getGrades(const std::string& record_id);
    
    /**
     * @brief Save record attachments
     * @param record_id Record ID
     * @param attachments Attachments
     * @param transaction Transaction
     * @return True if saved successfully
     */
    bool saveAttachments(
        const std::string& record_id, 
        const std::vector<std::string>& attachments,
        persistence::Transaction& transaction
    );
    
    /**
     * @brief Get record attachments
     * @param record_id Record ID
     * @return Attachments
     */
    std::vector<std::string> getAttachments(const std::string& record_id);
    
    /**
     * @brief Save record metadata
     * @param record_id Record ID
     * @param metadata Metadata
     * @param transaction Transaction
     * @return True if saved successfully
     */
    bool saveMetadata(
        const std::string& record_id, 
        const std::map<std::string, std::string>& metadata,
        persistence::Transaction& transaction
    );
    
    /**
     * @brief Get record metadata
     * @param record_id Record ID
     * @return Metadata
     */
    std::map<std::string, std::string> getMetadata(const std::string& record_id);
    
    /**
     * @brief Save record signature
     * @param record_id Record ID
     * @param signature Signature
     * @param is_instructor Whether signature is from instructor
     * @param transaction Transaction
     * @return True if saved successfully
     */
    bool saveSignature(
        const std::string& record_id, 
        const SignatureInfo& signature,
        bool is_instructor,
        persistence::Transaction& transaction
    );
    
    /**
     * @brief Get record signature
     * @param record_id Record ID
     * @param is_instructor Whether to get instructor signature
     * @return Signature or nullopt if not found
     */
    std::optional<SignatureInfo> getSignature(
        const std::string& record_id, 
        bool is_instructor
    );
    
    /**
     * @brief Generate parameters for record query
     * @param trainee_id Trainee ID (optional)
     * @param instructor_id Instructor ID (optional)
     * @param course_id Course ID (optional)
     * @param syllabus_id Syllabus ID (optional)
     * @param record_type Record type (optional)
     * @param start_date Start date (optional)
     * @param end_date End date (optional)
     * @return Pair of (query conditions, parameters)
     */
    std::pair<std::string, std::vector<persistence::PgParam>> generateQueryParams(
        const std::optional<std::string>& trainee_id,
        const std::optional<std::string>& instructor_id,
        const std::optional<std::string>& course_id,
        const std::optional<std::string>& syllabus_id,
        const std::optional<RecordType>& record_type,
        const std::optional<std::chrono::system_clock::time_point>& start_date,
        const std::optional<std::chrono::system_clock::time_point>& end_date
    );
    
    /**
     * @brief Extract record data from result row
     * @param result Result
     * @param row_index Row index
     * @return Training record
     */
    TrainingRecord extractRecordFromRow(const persistence::PgResult& result, int row_index);
    
    /**
     * @brief Generate unique ID
     * @return Unique ID
     */
    std::string generateUniqueId();
    
    std::shared_ptr<persistence::DatabaseConnection> db_connection_;
};

} // namespace records
} // namespace etr