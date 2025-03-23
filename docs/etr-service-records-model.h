#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <optional>
#include <chrono>
#include <nlohmann/json.hpp>

namespace etr {
namespace records {

/**
 * @brief Record types
 */
enum class RecordType {
    UNKNOWN,
    TRAINING_SESSION,
    ASSESSMENT,
    CERTIFICATION,
    QUALIFICATION,
    ENDORSEMENT
};

/**
 * @brief Convert RecordType to string
 * @param type Record type
 * @return String representation
 */
std::string recordTypeToString(RecordType type);

/**
 * @brief Convert string to RecordType
 * @param str String representation
 * @return Record type
 */
RecordType recordTypeFromString(const std::string& str);

/**
 * @brief Signature information
 */
struct SignatureInfo {
    std::string signer_id;
    std::string signer_name;
    std::string certificate_id;
    std::vector<uint8_t> signature_data;
    std::chrono::system_clock::time_point timestamp;
    bool is_valid{false};
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Signature info or nullopt if invalid
     */
    static std::optional<SignatureInfo> fromJson(const nlohmann::json& json);
};

/**
 * @brief Grade item
 */
struct GradeItem {
    std::string criteria_id;
    std::string criteria_name;
    int grade;  // 1-4 scale
    std::string comments;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Grade item or nullopt if invalid
     */
    static std::optional<GradeItem> fromJson(const nlohmann::json& json);
};

/**
 * @brief Training record
 */
class TrainingRecord {
public:
    /**
     * @brief Default constructor
     */
    TrainingRecord();
    
    /**
     * @brief Constructor with ID
     * @param id Record ID
     */
    explicit TrainingRecord(const std::string& id);
    
    /**
     * @brief Get record ID
     * @return Record ID
     */
    const std::string& getRecordId() const;
    
    /**
     * @brief Set record ID
     * @param id Record ID
     */
    void setRecordId(const std::string& id);
    
    /**
     * @brief Get trainee ID
     * @return Trainee ID
     */
    const std::string& getTraineeId() const;
    
    /**
     * @brief Set trainee ID
     * @param id Trainee ID
     */
    void setTraineeId(const std::string& id);
    
    /**
     * @brief Get instructor ID
     * @return Instructor ID
     */
    const std::string& getInstructorId() const;
    
    /**
     * @brief Set instructor ID
     * @param id Instructor ID
     */
    void setInstructorId(const std::string& id);
    
    /**
     * @brief Get record type
     * @return Record type
     */
    RecordType getRecordType() const;
    
    /**
     * @brief Set record type
     * @param type Record type
     */
    void setRecordType(RecordType type);
    
    /**
     * @brief Get course ID
     * @return Course ID
     */
    const std::string& getCourseId() const;
    
    /**
     * @brief Set course ID
     * @param id Course ID
     */
    void setCourseId(const std::string& id);
    
    /**
     * @brief Get syllabus ID
     * @return Syllabus ID
     */
    const std::string& getSyllabusId() const;
    
    /**
     * @brief Set syllabus ID
     * @param id Syllabus ID
     */
    void setSyllabusId(const std::string& id);
    
    /**
     * @brief Get exercise ID
     * @return Exercise ID
     */
    const std::string& getExerciseId() const;
    
    /**
     * @brief Set exercise ID
     * @param id Exercise ID
     */
    void setExerciseId(const std::string& id);
    
    /**
     * @brief Get date
     * @return Date
     */
    std::chrono::system_clock::time_point getDate() const;
    
    /**
     * @brief Set date
     * @param date Date
     */
    void setDate(const std::chrono::system_clock::time_point& date);
    
    /**
     * @brief Get duration in minutes
     * @return Duration in minutes
     */
    int getDurationMinutes() const;
    
    /**
     * @brief Set duration in minutes
     * @param minutes Duration in minutes
     */
    void setDurationMinutes(int minutes);
    
    /**
     * @brief Get location
     * @return Location
     */
    const std::string& getLocation() const;
    
    /**
     * @brief Set location
     * @param location Location
     */
    void setLocation(const std::string& location);
    
    /**
     * @brief Get aircraft type
     * @return Aircraft type
     */
    const std::string& getAircraftType() const;
    
    /**
     * @brief Set aircraft type
     * @param type Aircraft type
     */
    void setAircraftType(const std::string& type);
    
    /**
     * @brief Get grades
     * @return Grades
     */
    const std::vector<GradeItem>& getGrades() const;
    
    /**
     * @brief Set grades
     * @param grades Grades
     */
    void setGrades(const std::vector<GradeItem>& grades);
    
    /**
     * @brief Add grade
     * @param grade Grade
     */
    void addGrade(const GradeItem& grade);
    
    /**
     * @brief Get grade by criteria ID
     * @param criteria_id Criteria ID
     * @return Grade or nullopt if not found
     */
    std::optional<GradeItem> getGradeByCriteriaId(const std::string& criteria_id) const;
    
    /**
     * @brief Update grade
     * @param grade Grade
     * @return True if updated, false if not found
     */
    bool updateGrade(const GradeItem& grade);
    
    /**
     * @brief Get attachments
     * @return Attachments
     */
    const std::vector<std::string>& getAttachments() const;
    
    /**
     * @brief Set attachments
     * @param attachments Attachments
     */
    void setAttachments(const std::vector<std::string>& attachments);
    
    /**
     * @brief Add attachment
     * @param attachment Attachment
     */
    void addAttachment(const std::string& attachment);
    
    /**
     * @brief Remove attachment
     * @param attachment Attachment
     * @return True if removed, false if not found
     */
    bool removeAttachment(const std::string& attachment);
    
    /**
     * @brief Get comments
     * @return Comments
     */
    const std::string& getComments() const;
    
    /**
     * @brief Set comments
     * @param comments Comments
     */
    void setComments(const std::string& comments);
    
    /**
     * @brief Get trainee signature
     * @return Trainee signature
     */
    const std::optional<SignatureInfo>& getTraineeSignature() const;
    
    /**
     * @brief Set trainee signature
     * @param signature Trainee signature
     */
    void setTraineeSignature(const SignatureInfo& signature);
    
    /**
     * @brief Get instructor signature
     * @return Instructor signature
     */
    const std::optional<SignatureInfo>& getInstructorSignature() const;
    
    /**
     * @brief Set instructor signature
     * @param signature Instructor signature
     */
    void setInstructorSignature(const SignatureInfo& signature);
    
    /**
     * @brief Check if record is draft
     * @return True if draft
     */
    bool isDraft() const;
    
    /**
     * @brief Set draft status
     * @param is_draft Draft status
     */
    void setDraft(bool is_draft);
    
    /**
     * @brief Get creation time
     * @return Creation time
     */
    std::chrono::system_clock::time_point getCreatedAt() const;
    
    /**
     * @brief Set creation time
     * @param time Creation time
     */
    void setCreatedAt(const std::chrono::system_clock::time_point& time);
    
    /**
     * @brief Get update time
     * @return Update time
     */
    std::chrono::system_clock::time_point getUpdatedAt() const;
    
    /**
     * @brief Set update time
     * @param time Update time
     */
    void setUpdatedAt(const std::chrono::system_clock::time_point& time);
    
    /**
     * @brief Get metadata
     * @return Metadata
     */
    const std::map<std::string, std::string>& getMetadata() const;
    
    /**
     * @brief Set metadata
     * @param metadata Metadata
     */
    void setMetadata(const std::map<std::string, std::string>& metadata);
    
    /**
     * @brief Get metadata value
     * @param key Metadata key
     * @return Metadata value or empty string if not found
     */
    std::string getMetadataValue(const std::string& key) const;
    
    /**
     * @brief Set metadata value
     * @param key Metadata key
     * @param value Metadata value
     */
    void setMetadataValue(const std::string& key, const std::string& value);
    
    /**
     * @brief Check if record is signed by trainee
     * @return True if signed by trainee
     */
    bool isSignedByTrainee() const;
    
    /**
     * @brief Check if record is signed by instructor
     * @return True if signed by instructor
     */
    bool isSignedByInstructor() const;
    
    /**
     * @brief Check if record is fully signed
     * @return True if fully signed
     */
    bool isFullySigned() const;
    
    /**
     * @brief Check if record is valid
     * @return True if valid
     */
    bool isValid() const;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Training record or nullopt if invalid
     */
    static std::optional<TrainingRecord> fromJson(const nlohmann::json& json);
    
    /**
     * @brief Generate audit log entry
     * @param action Action performed
     * @param user_id User ID
     * @param details Additional details
     * @return Audit log entry
     */
    nlohmann::json generateAuditLog(const std::string& action, const std::string& user_id, const std::string& details = "") const;
    
private:
    std::string record_id_;
    std::string trainee_id_;
    std::string instructor_id_;
    RecordType record_type_;
    std::string course_id_;
    std::string syllabus_id_;
    std::string exercise_id_;
    std::chrono::system_clock::time_point date_;
    int duration_minutes_;
    std::string location_;
    std::string aircraft_type_;
    std::vector<GradeItem> grades_;
    std::vector<std::string> attachments_;
    std::string comments_;
    std::optional<SignatureInfo> trainee_signature_;
    std::optional<SignatureInfo> instructor_signature_;
    bool is_draft_;
    std::chrono::system_clock::time_point created_at_;
    std::chrono::system_clock::time_point updated_at_;
    std::map<std::string, std::string> metadata_;
};

/**
 * @brief Record repository interface
 */
class IRecordRepository {
public:
    virtual ~IRecordRepository() = default;
    
    /**
     * @brief Create a record
     * @param record Record to create
     * @return Created record ID or empty string if failed
     */
    virtual std::string createRecord(const TrainingRecord& record) = 0;
    
    /**
     * @brief Get a record by ID
     * @param record_id Record ID
     * @return Record or nullopt if not found
     */
    virtual std::optional<TrainingRecord> getRecord(const std::string& record_id) = 0;
    
    /**
     * @brief Update a record
     * @param record Record to update
     * @return True if updated, false if not found
     */
    virtual bool updateRecord(const TrainingRecord& record) = 0;
    
    /**
     * @brief Delete a record
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
     * @brief Log audit event
     * @param record_id Record ID
     * @param action Action performed
     * @param user_id User ID
     * @param details Additional details
     * @return True if logged successfully
     */
    virtual bool logAuditEvent(
        const std::string& record_id, 
        const std::string& action, 
        const std::string& user_id, 
        const std::string& details
    ) = 0;
    
    /**
     * @brief Get audit logs for a record
     * @param record_id Record ID
     * @return Audit logs
     */
    virtual std::vector<nlohmann::json> getAuditLogs(const std::string& record_id) = 0;
};

} // namespace records
} // namespace etr