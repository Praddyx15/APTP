#pragma once

#include <string>
#include <vector>
#include <map>
#include <optional>
#include <chrono>
#include <nlohmann/json.hpp>

namespace assessment {
namespace model {

/**
 * @brief Assessment type
 */
enum class AssessmentType {
    UNKNOWN,
    KNOWLEDGE_TEST,
    PRACTICAL_TEST,
    SIMULATOR_SESSION,
    FLIGHT_SESSION,
    WRITTEN_EXAM,
    ORAL_EXAM
};

/**
 * @brief Convert AssessmentType to string
 */
std::string assessmentTypeToString(AssessmentType type);

/**
 * @brief Convert string to AssessmentType
 */
AssessmentType assessmentTypeFromString(const std::string& str);

/**
 * @brief Assessment status
 */
enum class AssessmentStatus {
    UNKNOWN,
    SCHEDULED,
    IN_PROGRESS,
    COMPLETED,
    GRADED,
    CANCELLED
};

/**
 * @brief Convert AssessmentStatus to string
 */
std::string assessmentStatusToString(AssessmentStatus status);

/**
 * @brief Convert string to AssessmentStatus
 */
AssessmentStatus assessmentStatusFromString(const std::string& str);

/**
 * @brief Grading scale
 */
enum class GradingScale {
    UNKNOWN,
    SCALE_1_4,          // 1-4 scale (1=unsatisfactory, 4=excellent)
    SCALE_PERCENTAGE,   // 0-100%
    SCALE_PASS_FAIL,    // Pass/Fail
    SCALE_LETTER        // A, B, C, D, F
};

/**
 * @brief Convert GradingScale to string
 */
std::string gradingScaleToString(GradingScale scale);

/**
 * @brief Convert string to GradingScale
 */
GradingScale gradingScaleFromString(const std::string& str);

/**
 * @brief Grade item
 */
struct GradeItem {
    std::string criteria_id;
    std::string criteria_name;
    double score;
    std::string comments;
    bool is_critical;
    bool satisfactory;

    /**
     * @brief Convert to JSON
     */
    nlohmann::json toJson() const;

    /**
     * @brief Create from JSON
     */
    static std::optional<GradeItem> fromJson(const nlohmann::json& json);
};

/**
 * @brief Assessment model
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

    // Getters and setters
    const std::string& getAssessmentId() const;
    void setAssessmentId(const std::string& id);

    const std::string& getTitle() const;
    void setTitle(const std::string& title);

    const std::string& getDescription() const;
    void setDescription(const std::string& description);

    AssessmentType getType() const;
    void setType(AssessmentType type);

    AssessmentStatus getStatus() const;
    void setStatus(AssessmentStatus status);

    const std::string& getTraineeId() const;
    void setTraineeId(const std::string& id);

    const std::string& getInstructorId() const;
    void setInstructorId(const std::string& id);

    const std::string& getCourseId() const;
    void setCourseId(const std::string& id);

    const std::string& getSyllabusId() const;
    void setSyllabusId(const std::string& id);

    const std::string& getExerciseId() const;
    void setExerciseId(const std::string& id);

    std::chrono::system_clock::time_point getScheduledTime() const;
    void setScheduledTime(const std::chrono::system_clock::time_point& time);

    std::optional<std::chrono::system_clock::time_point> getActualStartTime() const;
    void setActualStartTime(const std::chrono::system_clock::time_point& time);
    void clearActualStartTime();

    std::optional<std::chrono::system_clock::time_point> getActualEndTime() const;
    void setActualEndTime(const std::chrono::system_clock::time_point& time);
    void clearActualEndTime();

    GradingScale getGradingScale() const;
    void setGradingScale(GradingScale scale);

    const std::vector<GradeItem>& getGrades() const;
    void setGrades(const std::vector<GradeItem>& grades);
    void addGrade(const GradeItem& grade);
    std::optional<GradeItem> getGradeByCriteriaId(const std::string& criteriaId) const;
    bool updateGrade(const GradeItem& grade);

    bool isPassed() const;
    void setPassed(bool passed);

    double getOverallScore() const;
    void setOverallScore(double score);

    const std::string& getComments() const;
    void setComments(const std::string& comments);
    void appendComments(const std::string& additional_comments);

    const std::vector<std::string>& getAttachments() const;
    void setAttachments(const std::vector<std::string>& attachments);
    void addAttachment(const std::string& attachment);
    bool removeAttachment(const std::string& attachment);

    const std::vector<std::string>& getTags() const;
    void setTags(const std::vector<std::string>& tags);
    void addTag(const std::string& tag);
    bool removeTag(const std::string& tag);
    bool hasTag(const std::string& tag) const;

    const std::map<std::string, std::string>& getMetadata() const;
    void setMetadata(const std::map<std::string, std::string>& metadata);
    std::string getMetadataValue(const std::string& key) const;
    void setMetadataValue(const std::string& key, const std::string& value);
    bool removeMetadataValue(const std::string& key);

    bool isDraft() const;
    void setDraft(bool is_draft);

    const std::string& getCreatedBy() const;
    void setCreatedBy(const std::string& user_id);

    std::chrono::system_clock::time_point getCreatedAt() const;
    void setCreatedAt(const std::chrono::system_clock::time_point& time);

    std::chrono::system_clock::time_point getUpdatedAt() const;
    void setUpdatedAt(const std::chrono::system_clock::time_point& time);

    /**
     * @brief Calculate overall score from grades
     * @return Calculated score
     */
    double calculateOverallScore() const;

    /**
     * @brief Determine if assessment is passed based on grades
     * @return True if passed
     */
    bool calculatePassStatus() const;

    /**
     * @brief Check if assessment is valid
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
     * @return Assessment or nullopt if invalid
     */
    static std::optional<Assessment> fromJson(const nlohmann::json& json);

    /**
     * @brief Generate audit log entry
     * @param action Action performed
     * @param user_id User ID
     * @param details Additional details
     * @return Audit log entry as JSON
     */
    nlohmann::json generateAuditLog(
        const std::string& action,
        const std::string& user_id,
        const std::string& details = ""
    ) const;

private:
    std::string assessment_id_;
    std::string title_;
    std::string description_;
    AssessmentType type_;
    AssessmentStatus status_;
    std::string trainee_id_;
    std::string instructor_id_;
    std::string course_id_;
    std::string syllabus_id_;
    std::string exercise_id_;
    std::chrono::system_clock::time_point scheduled_time_;
    std::optional<std::chrono::system_clock::time_point> actual_start_time_;
    std::optional<std::chrono::system_clock::time_point> actual_end_time_;
    GradingScale grading_scale_;
    std::vector<GradeItem> grades_;
    bool passed_;
    double overall_score_;
    std::string comments_;
    std::vector<std::string> attachments_;
    std::vector<std::string> tags_;
    std::map<std::string, std::string> metadata_;
    bool is_draft_;
    std::string created_by_;
    std::chrono::system_clock::time_point created_at_;
    std::chrono::system_clock::time_point updated_at_;
};

/**
 * @brief Assessment repository interface
 */
class IAssessmentRepository {
public:
    virtual ~IAssessmentRepository() = default;

    /**
     * @brief Create a new assessment
     * @param assessment Assessment to create
     * @return Created assessment ID or empty string if failed
     */
    virtual std::string createAssessment(const Assessment& assessment) = 0;

    /**
     * @brief Get an assessment by ID
     * @param assessment_id Assessment ID
     * @return Assessment or nullopt if not found
     */
    virtual std::optional<Assessment> getAssessment(const std::string& assessment_id) = 0;

    /**
     * @brief Update an assessment
     * @param assessment Assessment to update
     * @return True if updated successfully
     */
    virtual bool updateAssessment(const Assessment& assessment) = 0;

    /**
     * @brief Delete an assessment
     * @param assessment_id Assessment ID
     * @return True if deleted successfully
     */
    virtual bool deleteAssessment(const std::string& assessment_id) = 0;

    /**
     * @brief List assessments matching criteria
     * @param trainee_id Trainee ID (optional)
     * @param instructor_id Instructor ID (optional)
     * @param course_id Course ID (optional)
     * @param syllabus_id Syllabus ID (optional)
     * @param type Assessment type (optional)
     * @param status Assessment status (optional)
     * @param start_date Start date (optional)
     * @param end_date End date (optional)
     * @param tags Tags to filter by (optional)
     * @param page Page number (starting from 1)
     * @param page_size Page size
     * @param sort_by Sort field
     * @param ascending Sort direction
     * @return Pair of assessments and total count
     */
    virtual std::pair<std::vector<Assessment>, int> listAssessments(
        const std::optional<std::string>& trainee_id = std::nullopt,
        const std::optional<std::string>& instructor_id = std::nullopt,
        const std::optional<std::string>& course_id = std::nullopt,
        const std::optional<std::string>& syllabus_id = std::nullopt,
        const std::optional<AssessmentType>& type = std::nullopt,
        const std::optional<AssessmentStatus>& status = std::nullopt,
        const std::optional<std::chrono::system_clock::time_point>& start_date = std::nullopt,
        const std::optional<std::chrono::system_clock::time_point>& end_date = std::nullopt,
        const std::vector<std::string>& tags = {},
        int page = 1,
        int page_size = 10,
        const std::string& sort_by = "scheduled_time",
        bool ascending = false
    ) = 0;

    /**
     * @brief Log audit event
     * @param assessment_id Assessment ID
     * @param action Action performed
     * @param user_id User ID
     * @param details Additional details
     * @return True if logged successfully
     */
    virtual bool logAuditEvent(
        const std::string& assessment_id,
        const std::string& action,
        const std::string& user_id,
        const std::string& details
    ) = 0;

    /**
     * @brief Get audit logs for an assessment
     * @param assessment_id Assessment ID
     * @return Audit logs as JSON array
     */
    virtual std::vector<nlohmann::json> getAuditLogs(const std::string& assessment_id) = 0;
};

} // namespace model
} // namespace assessment