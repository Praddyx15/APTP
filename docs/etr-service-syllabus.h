#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <optional>
#include <chrono>
#include <nlohmann/json.hpp>
#include "records/record_model.h"
#include "signature/digital_signature.h"

namespace etr {
namespace syllabus {

/**
 * @brief Syllabus status
 */
enum class SyllabusStatus {
    DRAFT,
    APPROVED,
    ARCHIVED
};

/**
 * @brief Convert SyllabusStatus to string
 * @param status Syllabus status
 * @return String representation
 */
std::string syllabusStatusToString(SyllabusStatus status);

/**
 * @brief Convert string to SyllabusStatus
 * @param str String representation
 * @return Syllabus status
 */
SyllabusStatus syllabusStatusFromString(const std::string& str);

/**
 * @brief Grade definition
 */
struct GradeDefinition {
    int grade;  // 1-4 scale
    std::string description;
    bool is_passing;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Grade definition or nullopt if invalid
     */
    static std::optional<GradeDefinition> fromJson(const nlohmann::json& json);
};

/**
 * @brief Grading criteria
 */
struct GradingCriteria {
    std::string criteria_id;
    std::string name;
    std::string description;
    std::vector<GradeDefinition> grade_definitions;
    bool is_required;
    std::map<std::string, std::string> regulation_references;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Grading criteria or nullopt if invalid
     */
    static std::optional<GradingCriteria> fromJson(const nlohmann::json& json);
};

/**
 * @brief Syllabus exercise
 */
struct SyllabusExercise {
    std::string exercise_id;
    std::string title;
    std::string description;
    int order;
    int duration_minutes;
    std::string exercise_type;  // GROUND, SIMULATOR, FLIGHT, etc.
    std::vector<std::string> objectives;
    std::vector<std::string> references;
    std::vector<std::string> equipment;
    std::vector<GradingCriteria> grading_criteria;
    std::vector<std::string> prerequisite_exercises;
    std::map<std::string, std::string> metadata;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Syllabus exercise or nullopt if invalid
     */
    static std::optional<SyllabusExercise> fromJson(const nlohmann::json& json);
};

/**
 * @brief Syllabus section
 */
struct SyllabusSection {
    std::string section_id;
    std::string title;
    std::string description;
    int order;
    std::vector<SyllabusExercise> exercises;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Syllabus section or nullopt if invalid
     */
    static std::optional<SyllabusSection> fromJson(const nlohmann::json& json);
};

/**
 * @brief Syllabus
 */
class Syllabus {
public:
    /**
     * @brief Default constructor
     */
    Syllabus();
    
    /**
     * @brief Constructor with ID
     * @param id Syllabus ID
     */
    explicit Syllabus(const std::string& id);
    
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
     * @brief Get title
     * @return Title
     */
    const std::string& getTitle() const;
    
    /**
     * @brief Set title
     * @param title Title
     */
    void setTitle(const std::string& title);
    
    /**
     * @brief Get description
     * @return Description
     */
    const std::string& getDescription() const;
    
    /**
     * @brief Set description
     * @param description Description
     */
    void setDescription(const std::string& description);
    
    /**
     * @brief Get version
     * @return Version
     */
    const std::string& getVersion() const;
    
    /**
     * @brief Set version
     * @param version Version
     */
    void setVersion(const std::string& version);
    
    /**
     * @brief Get effective date
     * @return Effective date
     */
    std::chrono::system_clock::time_point getEffectiveDate() const;
    
    /**
     * @brief Set effective date
     * @param date Effective date
     */
    void setEffectiveDate(const std::chrono::system_clock::time_point& date);
    
    /**
     * @brief Get expiration date
     * @return Expiration date or nullopt if not set
     */
    std::optional<std::chrono::system_clock::time_point> getExpirationDate() const;
    
    /**
     * @brief Set expiration date
     * @param date Expiration date
     */
    void setExpirationDate(const std::chrono::system_clock::time_point& date);
    
    /**
     * @brief Clear expiration date
     */
    void clearExpirationDate();
    
    /**
     * @brief Get status
     * @return Status
     */
    SyllabusStatus getStatus() const;
    
    /**
     * @brief Set status
     * @param status Status
     */
    void setStatus(SyllabusStatus status);
    
    /**
     * @brief Get author ID
     * @return Author ID
     */
    const std::string& getAuthorId() const;
    
    /**
     * @brief Set author ID
     * @param id Author ID
     */
    void setAuthorId(const std::string& id);
    
    /**
     * @brief Get sections
     * @return Sections
     */
    const std::vector<SyllabusSection>& getSections() const;
    
    /**
     * @brief Set sections
     * @param sections Sections
     */
    void setSections(const std::vector<SyllabusSection>& sections);
    
    /**
     * @brief Add section
     * @param section Section
     */
    void addSection(const SyllabusSection& section);
    
    /**
     * @brief Update section
     * @param section Section
     * @return True if updated, false if not found
     */
    bool updateSection(const SyllabusSection& section);
    
    /**
     * @brief Remove section
     * @param section_id Section ID
     * @return True if removed, false if not found
     */
    bool removeSection(const std::string& section_id);
    
    /**
     * @brief Get section by ID
     * @param section_id Section ID
     * @return Section or nullopt if not found
     */
    std::optional<SyllabusSection> getSection(const std::string& section_id) const;
    
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
     * @brief Get approval signature
     * @return Approval signature or nullopt if not approved
     */
    const std::optional<records::SignatureInfo>& getApprovalSignature() const;
    
    /**
     * @brief Set approval signature
     * @param signature Approval signature
     */
    void setApprovalSignature(const records::SignatureInfo& signature);
    
    /**
     * @brief Find exercise by ID
     * @param exercise_id Exercise ID
     * @return Pair of (exercise, section_id) or nullopt if not found
     */
    std::optional<std::pair<SyllabusExercise, std::string>> findExercise(const std::string& exercise_id) const;
    
    /**
     * @brief Update exercise
     * @param exercise Exercise
     * @param section_id Section ID
     * @return True if updated, false if not found
     */
    bool updateExercise(const SyllabusExercise& exercise, const std::string& section_id);
    
    /**
     * @brief Add exercise to section
     * @param exercise Exercise
     * @param section_id Section ID
     * @return True if added, false if section not found
     */
    bool addExerciseToSection(const SyllabusExercise& exercise, const std::string& section_id);
    
    /**
     * @brief Remove exercise
     * @param exercise_id Exercise ID
     * @return True if removed, false if not found
     */
    bool removeExercise(const std::string& exercise_id);
    
    /**
     * @brief Check if syllabus is approved
     * @return True if approved
     */
    bool isApproved() const;
    
    /**
     * @brief Check if syllabus is valid
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
     * @return Syllabus or nullopt if invalid
     */
    static std::optional<Syllabus> fromJson(const nlohmann::json& json);
    
    /**
     * @brief Generate audit log entry
     * @param action Action performed
     * @param user_id User ID
     * @param details Additional details
     * @return Audit log entry
     */
    nlohmann::json generateAuditLog(const std::string& action, const std::string& user_id, const std::string& details = "") const;
    
private:
    std::string syllabus_id_;
    std::string course_id_;
    std::string title_;
    std::string description_;
    std::string version_;
    std::chrono::system_clock::time_point effective_date_;
    std::optional<std::chrono::system_clock::time_point> expiration_date_;
    SyllabusStatus status_;
    std::string author_id_;
    std::vector<SyllabusSection> sections_;
    std::map<std::string, std::string> metadata_;
    std::chrono::system_clock::time_point created_at_;
    std::chrono::system_clock::time_point updated_at_;
    std::optional<records::SignatureInfo> approval_signature_;
};

/**
 * @brief Syllabus change type
 */
enum class ChangeType {
    ADDED,
    MODIFIED,
    REMOVED
};

/**
 * @brief Convert ChangeType to string
 * @param type Change type
 * @return String representation
 */
std::string changeTypeToString(ChangeType type);

/**
 * @brief Convert string to ChangeType
 * @param str String representation
 * @return Change type
 */
ChangeType changeTypeFromString(const std::string& str);

/**
 * @brief Element type
 */
enum class ElementType {
    SYLLABUS,
    SECTION,
    EXERCISE,
    CRITERIA,
    OBJECTIVE,
    REFERENCE,
    EQUIPMENT,
    PREREQUISITE,
    METADATA
};

/**
 * @brief Convert ElementType to string
 * @param type Element type
 * @return String representation
 */
std::string elementTypeToString(ElementType type);

/**
 * @brief Convert string to ElementType
 * @param str String representation
 * @return Element type
 */
ElementType elementTypeFromString(const std::string& str);

/**
 * @brief Syllabus change
 */
struct SyllabusChange {
    ChangeType change_type;
    ElementType element_type;
    std::string element_id;
    std::optional<std::string> parent_id;
    std::string description;
    std::map<std::string, std::string> old_values;
    std::map<std::string, std::string> new_values;
    std::string rationale;
    std::string author_id;
    std::chrono::system_clock::time_point timestamp;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Syllabus change or nullopt if invalid
     */
    static std::optional<SyllabusChange> fromJson(const nlohmann::json& json);
};

/**
 * @brief Syllabus summary
 */
struct SyllabusSummary {
    std::string syllabus_id;
    std::string course_id;
    std::string title;
    std::string version;
    std::chrono::system_clock::time_point effective_date;
    std::optional<std::chrono::system_clock::time_point> expiration_date;
    SyllabusStatus status;
    std::string author_id;
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
     * @return Syllabus summary or nullopt if invalid
     */
    static std::optional<SyllabusSummary> fromJson(const nlohmann::json& json);
};

/**
 * @brief Syllabus repository interface
 */
class ISyllabusRepository {
public:
    virtual ~ISyllabusRepository() = default;
    
    /**
     * @brief Create a syllabus
     * @param syllabus Syllabus to create
     * @return Created syllabus ID or empty string if failed
     */
    virtual std::string createSyllabus(const Syllabus& syllabus) = 0;
    
    /**
     * @brief Get a syllabus by ID
     * @param syllabus_id Syllabus ID
     * @param version Version (optional)
     * @return Syllabus or nullopt if not found
     */
    virtual std::optional<Syllabus> getSyllabus(
        const std::string& syllabus_id,
        const std::optional<std::string>& version = std::nullopt
    ) = 0;
    
    /**
     * @brief Update a syllabus
     * @param syllabus Syllabus to update
     * @return True if updated, false if not found
     */
    virtual bool updateSyllabus(const Syllabus& syllabus) = 0;
    
    /**
     * @brief Delete a syllabus
     * @param syllabus_id Syllabus ID
     * @return True if deleted, false if not found
     */
    virtual bool deleteSyllabus(const std::string& syllabus_id) = 0;
    
    /**
     * @brief List syllabi matching criteria
     * @param course_id Course ID (optional)
     * @param status Status (optional)
     * @param effective_date Effective date (optional)
     * @param page Page number (starting from 1)
     * @param page_size Page size
     * @param sort_by Sort field
     * @param ascending Sort direction
     * @return Pair of summaries and total count
     */
    virtual std::pair<std::vector<SyllabusSummary>, int> listSyllabi(
        const std::optional<std::string>& course_id = std::nullopt,
        const std::optional<SyllabusStatus>& status = std::nullopt,
        const std::optional<std::chrono::system_clock::time_point>& effective_date = std::nullopt,
        int page = 1,
        int page_size = 10,
        const std::string& sort_by = "effective_date",
        bool ascending = false
    ) = 0;
    
    /**
     * @brief Track syllabus changes
     * @param syllabus_id Syllabus ID
     * @param from_version From version
     * @param to_version To version
     * @return Syllabus changes
     */
    virtual std::vector<SyllabusChange> trackChanges(
        const std::string& syllabus_id,
        const std::string& from_version,
        const std::string& to_version
    ) = 0;
    
    /**
     * @brief Log syllabus change
     * @param syllabus_id Syllabus ID
     * @param change Syllabus change
     * @return True if logged successfully
     */
    virtual bool logChange(
        const std::string& syllabus_id,
        const SyllabusChange& change
    ) = 0;
    
    /**
     * @brief Get all syllabus versions
     * @param syllabus_id Syllabus ID
     * @return Syllabus versions
     */
    virtual std::vector<std::string> getAllVersions(const std::string& syllabus_id) = 0;
    
    /**
     * @brief Get latest approved syllabus for course
     * @param course_id Course ID
     * @return Syllabus or nullopt if not found
     */
    virtual std::optional<Syllabus> getLatestApprovedSyllabus(const std::string& course_id) = 0;
};

/**
 * @brief Syllabus service interface
 */
class ISyllabusService {
public:
    virtual ~ISyllabusService() = default;
    
    /**
     * @brief Create a syllabus
     * @param syllabus Syllabus to create
     * @return Created syllabus ID or empty string if failed
     */
    virtual std::string createSyllabus(const Syllabus& syllabus) = 0;
    
    /**
     * @brief Get a syllabus
     * @param syllabus_id Syllabus ID
     * @param version Version (optional)
     * @return Syllabus or nullopt if not found
     */
    virtual std::optional<Syllabus> getSyllabus(
        const std::string& syllabus_id,
        const std::optional<std::string>& version = std::nullopt
    ) = 0;
    
    /**
     * @brief Update a syllabus
     * @param syllabus Syllabus to update
     * @param user_id User ID
     * @return True if updated, false if not found or not authorized
     */
    virtual bool updateSyllabus(const Syllabus& syllabus, const std::string& user_id) = 0;
    
    /**
     * @brief Delete a syllabus
     * @param syllabus_id Syllabus ID
     * @param user_id User ID
     * @return True if deleted, false if not found or not authorized
     */
    virtual bool deleteSyllabus(const std::string& syllabus_id, const std::string& user_id) = 0;
    
    /**
     * @brief List syllabi
     * @param course_id Course ID (optional)
     * @param status Status (optional)
     * @param effective_date Effective date (optional)
     * @param page Page number (starting from 1)
     * @param page_size Page size
     * @param sort_by Sort field
     * @param ascending Sort direction
     * @return Pair of summaries and total count
     */
    virtual std::pair<std::vector<SyllabusSummary>, int> listSyllabi(
        const std::optional<std::string>& course_id = std::nullopt,
        const std::optional<SyllabusStatus>& status = std::nullopt,
        const std::optional<std::chrono::system_clock::time_point>& effective_date = std::nullopt,
        int page = 1,
        int page_size = 10,
        const std::string& sort_by = "effective_date",
        bool ascending = false
    ) = 0;
    
    /**
     * @brief Track syllabus changes
     * @param syllabus_id Syllabus ID
     * @param from_version From version
     * @param to_version To version
     * @return Syllabus changes
     */
    virtual std::vector<SyllabusChange> trackChanges(
        const std::string& syllabus_id,
        const std::string& from_version,
        const std::string& to_version
    ) = 0;
    
    /**
     * @brief Approve syllabus
     * @param syllabus_id Syllabus ID
     * @param approver_id Approver ID
     * @param certificate_data Certificate data
     * @param signature_data Signature data
     * @return True if approved, false if not found or not authorized
     */
    virtual bool approveSyllabus(
        const std::string& syllabus_id,
        const std::string& approver_id,
        const std::string& certificate_data,
        const std::vector<uint8_t>& signature_data
    ) = 0;
    
    /**
     * @brief Archive syllabus
     * @param syllabus_id Syllabus ID
     * @param user_id User ID
     * @return True if archived, false if not found or not authorized
     */
    virtual bool archiveSyllabus(
        const std::string& syllabus_id,
        const std::string& user_id
    ) = 0;
    
    /**
     * @brief Clone syllabus
     * @param syllabus_id Syllabus ID
     * @param new_version New version
     * @param user_id User ID
     * @return New syllabus ID or empty string if failed
     */
    virtual std::string cloneSyllabus(
        const std::string& syllabus_id,
        const std::string& new_version,
        const std::string& user_id
    ) = 0;
    
    /**
     * @brief Import syllabus from JSON
     * @param json_content JSON content
     * @param user_id User ID
     * @return Syllabus ID or empty string if failed
     */
    virtual std::string importSyllabusFromJson(
        const std::string& json_content,
        const std::string& user_id
    ) = 0;
    
    /**
     * @brief Export syllabus to JSON
     * @param syllabus_id Syllabus ID
     * @param version Version (optional)
     * @return JSON content or empty string if failed
     */
    virtual std::string exportSyllabusToJson(
        const std::string& syllabus_id,
        const std::optional<std::string>& version = std::nullopt
    ) = 0;
};

/**
 * @brief Syllabus service implementation
 */
class SyllabusService : public ISyllabusService {
public:
    /**
     * @brief Constructor
     * @param syllabus_repository Syllabus repository
     * @param signature_service Signature service
     */
    SyllabusService(
        std::shared_ptr<ISyllabusRepository> syllabus_repository,
        std::shared_ptr<signature::IDigitalSignatureService> signature_service
    );
    
    /**
     * @brief Destructor
     */
    ~SyllabusService() override;
    
    std::string createSyllabus(const Syllabus& syllabus) override;
    
    std::optional<Syllabus> getSyllabus(
        const std::string& syllabus_id,
        const std::optional<std::string>& version
    ) override;
    
    bool updateSyllabus(const Syllabus& syllabus, const std::string& user_id) override;
    
    bool deleteSyllabus(const std::string& syllabus_id, const std::string& user_id) override;
    
    std::pair<std::vector<SyllabusSummary>, int> listSyllabi(
        const std::optional<std::string>& course_id,
        const std::optional<SyllabusStatus>& status,
        const std::optional<std::chrono::system_clock::time_point>& effective_date,
        int page,
        int page_size,
        const std::string& sort_by,
        bool ascending
    ) override;
    
    std::vector<SyllabusChange> trackChanges(
        const std::string& syllabus_id,
        const std::string& from_version,
        const std::string& to_version
    ) override;
    
    bool approveSyllabus(
        const std::string& syllabus_id,
        const std::string& approver_id,
        const std::string& certificate_data,
        const std::vector<uint8_t>& signature_data
    ) override;
    
    bool archiveSyllabus(
        const std::string& syllabus_id,
        const std::string& user_id
    ) override;
    
    std::string cloneSyllabus(
        const std::string& syllabus_id,
        const std::string& new_version,
        const std::string& user_id
    ) override;
    
    std::string importSyllabusFromJson(
        const std::string& json_content,
        const std::string& user_id
    ) override;
    
    std::string exportSyllabusToJson(
        const std::string& syllabus_id,
        const std::optional<std::string>& version
    ) override;
    
private:
    /**
     * @brief Generate syllabus digest
     * @param syllabus Syllabus
     * @return Digest
     */
    std::vector<uint8_t> generateSyllabusDigest(const Syllabus& syllabus);
    
    /**
     * @brief Check if user is authorized to modify syllabus
     * @param syllabus Syllabus
     * @param user_id User ID
     * @return True if authorized
     */
    bool isAuthorizedToModify(const Syllabus& syllabus, const std::string& user_id);
    
    /**
     * @brief Calculate syllabus changes
     * @param old_syllabus Old syllabus
     * @param new_syllabus New syllabus
     * @param user_id User ID
     * @return Syllabus changes
     */
    std::vector<SyllabusChange> calculateChanges(
        const Syllabus& old_syllabus,
        const Syllabus& new_syllabus,
        const std::string& user_id
    );
    
    std::shared_ptr<ISyllabusRepository> syllabus_repository_;
    std::shared_ptr<signature::IDigitalSignatureService> signature_service_;
};

} // namespace syllabus
} // namespace etr