#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <optional>
#include <chrono>
#include <nlohmann/json.hpp>

namespace assessment {
namespace model {

/**
 * @brief Assessment types
 */
enum class AssessmentType {
    UNKNOWN,
    PRACTICAL,
    WRITTEN,
    ORAL,
    SIMULATOR
};

/**
 * @brief Convert AssessmentType to string
 * @param type Assessment type
 * @return String representation
 */
std::string assessmentTypeToString(AssessmentType type);

/**
 * @brief Convert string to AssessmentType
 * @param str String representation
 * @return Assessment type
 */
AssessmentType assessmentTypeFromString(const std::string& str);

/**
 * @brief Assessment status
 */
enum class AssessmentStatus {
    DRAFT,
    IN_PROGRESS,
    SUBMITTED,
    GRADED,
    APPROVED
};

/**
 * @brief Convert AssessmentStatus to string
 * @param status Assessment status
 * @return String representation
 */
std::string assessmentStatusToString(AssessmentStatus status);

/**
 * @brief Convert string to AssessmentStatus
 * @param str String representation
 * @return Assessment status
 */
AssessmentStatus assessmentStatusFromString(const std::string& str);

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
 * @brief Assessment
 */
class Assessment {
public:
    /**
     * @brief Default constructor
     */
    Assessment();
    
    /**
     * @brief Constructor with ID
     * @param id Assessment ID
     */
    explicit Assessment(const std::string& id);
    
    /**
     * @brief Get assessment ID
     * @return Assessment ID
     */
    const std::string& getAssessmentId() const;
    
    /**
     * @brief Set assessment ID
     * @param id Assessment ID
     */
    void setAssessmentId(const std::string& id);
    
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
     * @brief Get assessor ID
     * @return Assessor ID
     */
    const std::string& getAssessorId() const;
    
    /**
     * @brief Set assessor ID
     * @param id Assessor ID
     */
    void setAssessorId(const std::string& id);
    
    /**
     * @brief Get assessment type
     * @return Assessment type
     */
    AssessmentType getAssessmentType() const;
    
    /**
     * @brief Set assessment type
     * @param type Assessment type
     */
    void setAssessmentType(AssessmentType type);
    
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
     * @brief Get assessment date
     * @return Assessment date
     */
    std::chrono::system_clock::time_point getDate() const;
    
    /**
     * @brief Set assessment date
     * @param date Assessment date
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
     * @brief Get assessor signature
     * @return Assessor signature
     */
    const std::optional<SignatureInfo>& getAssessorSignature() const;
    
    /**
     * @brief Set assessor signature
     * @param signature Assessor signature
     */
    void setAssessorSignature(const SignatureInfo& signature);
    
    /**
     * @brief Get assessment status
     * @return Assessment status
     */
    AssessmentStatus getStatus() const;
    
    /**
     * @brief Set assessment status
     * @param status Assessment status
     */
    void setStatus(AssessmentStatus status);
    
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
     * @brief Check if assessment is signed by trainee
     * @return True if signed by trainee
     */
    bool isSignedByTrainee() const;
    
    /**
     * @brief Check if assessment is signed by assessor
     * @return True if signed by assessor
     */
    bool isSignedByAssessor() const;
    
    /**
     * @brief Check if assessment is fully signed
     * @return True if fully signed
     */
    bool isFullySigned() const;
    
    /**
     * @brief Check if assessment is in draft state
     * @return True if draft
     */
    bool isDraft() const;
    
    /**
     * @brief Get overall grade (average)
     * @return Overall grade or 0 if no grades
     */
    double getOverallGrade() const;
    
    /**
     * @brief Check if assessment is passed
     * @return True if passed
     */
    bool isPassed() const;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Assessment or nullopt if invalid
     */
    static std::optional<Assessment> fromJson(const nlohmann::json& json);
    
    /**
     * @brief Generate audit log entry
     * @param action Action performed
     * @param user_id User ID
     * @param details Additional details
     * @return Audit log entry
     */
    nlohmann::json generateAuditLog(const std::string& action, const std::string& user_id, const std::string& details = "") const;
    
private:
    std::string assessment_id_;
    std::string trainee_id_;
    std::string assessor_id_;
    AssessmentType assessment_type_;
    std::string course_id_;
    std::string syllabus_id_;
    std::string exercise_id_;
    std::chrono::system_clock::time_point date_;
    int duration_minutes_;
    std::string location_;
    std::vector<GradeItem> grades_;
    std::string comments_;
    std::optional<SignatureInfo> trainee_signature_;
    std::optional<SignatureInfo> assessor_signature_;
    AssessmentStatus status_;
    std::chrono::system_clock::time_point created_at_;
    std::chrono::system_clock::time_point updated_at_;
    std::map<std::string, std::string> metadata_;
};

/**
 * @brief Session status
 */
enum class SessionStatus {
    SCHEDULED,
    IN_PROGRESS,
    COMPLETED,
    CANCELLED
};

/**
 * @brief Convert SessionStatus to string
 * @param status Session status
 * @return String representation
 */
std::string sessionStatusToString(SessionStatus status);

/**
 * @brief Convert string to SessionStatus
 * @param str String representation
 * @return Session status
 */
SessionStatus sessionStatusFromString(const std::string& str);

/**
 * @brief Session information
 */
struct SessionInfo {
    std::string session_id;
    std::string trainee_id;
    std::string instructor_id;
    std::string course_id;
    std::string syllabus_id;
    std::string exercise_id;
    std::chrono::system_clock::time_point scheduled_time;
    int scheduled_duration_minutes;
    std::string location;
    SessionStatus status;
    std::chrono::system_clock::time_point start_time;
    std::chrono::system_clock::time_point end_time;
    std::map<std::string, std::string> metadata;
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point updated_at;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Session info or nullopt if invalid
     */
    static std::optional<SessionInfo> fromJson(const nlohmann::json& json);
};

/**
 * @brief Feedback entry
 */
struct FeedbackEntry {
    std::string feedback_id;
    std::string assessment_id;
    std::string session_id;
    std::string user_id;
    std::string feedback_text;
    int rating;  // 1-5 scale
    std::chrono::system_clock::time_point timestamp;
    bool is_anonymous;
    std::map<std::string, std::string> metadata;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Feedback entry or nullopt if invalid
     */
    static std::optional<FeedbackEntry> fromJson(const nlohmann::json& json);
};

/**
 * @brief Compliance benchmark
 */
struct ComplianceBenchmark {
    std::string benchmark_id;
    std::string regulation_id;
    std::string requirement_id;
    std::string requirement_name;
    std::string assessment_criteria;
    int min_passing_grade;
    double target_compliance_percentage;
    double current_compliance_percentage;
    int total_assessments;
    int compliant_assessments;
    std::chrono::system_clock::time_point timestamp;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Compliance benchmark or nullopt if invalid
     */
    static std::optional<ComplianceBenchmark> fromJson(const nlohmann::json& json);
};

/**
 * @brief Performance trend
 */
struct PerformanceTrend {
    std::string trend_id;
    std::string trainee_id;
    std::string course_id;
    std::string criteria_id;
    std::vector<std::pair<std::chrono::system_clock::time_point, double>> data_points;
    double trend_slope;
    std::chrono::system_clock::time_point timestamp;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Performance trend or nullopt if invalid
     */
    static std::optional<PerformanceTrend> fromJson(const nlohmann::json& json);
};

} // namespace model
} // namespace assessment