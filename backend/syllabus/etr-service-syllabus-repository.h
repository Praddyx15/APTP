#pragma once

#include "syllabus/syllabus_service.h"
#include "persistence/database_connection.h"
#include <memory>
#include <mutex>

namespace etr {
namespace syllabus {

/**
 * @brief PostgreSQL syllabus repository implementation
 */
class SyllabusRepository : public ISyllabusRepository {
public:
    /**
     * @brief Constructor
     * @param db_connection Database connection
     */
    explicit SyllabusRepository(std::shared_ptr<persistence::DatabaseConnection> db_connection);
    
    /**
     * @brief Destructor
     */
    ~SyllabusRepository() override;
    
    // ISyllabusRepository implementation
    std::string createSyllabus(const Syllabus& syllabus) override;
    std::optional<Syllabus> getSyllabus(
        const std::string& syllabus_id,
        const std::optional<std::string>& version = std::nullopt
    ) override;
    bool updateSyllabus(const Syllabus& syllabus) override;
    bool deleteSyllabus(const std::string& syllabus_id) override;
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
    bool logChange(
        const std::string& syllabus_id,
        const SyllabusChange& change
    ) override;
    std::vector<std::string> getAllVersions(const std::string& syllabus_id) override;
    std::optional<Syllabus> getLatestApprovedSyllabus(const std::string& course_id) override;

private:
    /**
     * @brief Save syllabus sections
     * @param syllabus_id Syllabus ID
     * @param version Version
     * @param sections Sections
     * @param transaction Transaction
     * @return True if saved successfully
     */
    bool saveSections(
        const std::string& syllabus_id,
        const std::string& version,
        const std::vector<SyllabusSection>& sections,
        persistence::Transaction& transaction
    );
    
    /**
     * @brief Get syllabus sections
     * @param syllabus_id Syllabus ID
     * @param version Version
     * @return Sections
     */
    std::vector<SyllabusSection> getSections(
        const std::string& syllabus_id,
        const std::string& version
    );
    
    /**
     * @brief Save exercises for a section
     * @param section_id Section ID
     * @param exercises Exercises
     * @param transaction Transaction
     * @return True if saved successfully
     */
    bool saveExercises(
        const std::string& section_id,
        const std::vector<SyllabusExercise>& exercises,
        persistence::Transaction& transaction
    );
    
    /**
     * @brief Get exercises for a section
     * @param section_id Section ID
     * @return Exercises
     */
    std::vector<SyllabusExercise> getExercises(const std::string& section_id);
    
    /**
     * @brief Save exercise objectives
     * @param exercise_id Exercise ID
     * @param objectives Objectives
     * @param transaction Transaction
     * @return True if saved successfully
     */
    bool saveObjectives(
        const std::string& exercise_id,
        const std::vector<std::string>& objectives,
        persistence::Transaction& transaction
    );
    
    /**
     * @brief Get exercise objectives
     * @param exercise_id Exercise ID
     * @return Objectives
     */
    std::vector<std::string> getObjectives(const std::string& exercise_id);
    
    /**
     * @brief Save exercise references
     * @param exercise_id Exercise ID
     * @param references References
     * @param transaction Transaction
     * @return True if saved successfully
     */
    bool saveReferences(
        const std::string& exercise_id,
        const std::vector<std::string>& references,
        persistence::Transaction& transaction
    );
    
    /**
     * @brief Get exercise references
     * @param exercise_id Exercise ID
     * @return References
     */
    std::vector<std::string> getReferences(const std::string& exercise_id);
    
    /**
     * @brief Save exercise equipment
     * @param exercise_id Exercise ID
     * @param equipment Equipment
     * @param transaction Transaction
     * @return True if saved successfully
     */
    bool saveEquipment(
        const std::string& exercise_id,
        const std::vector<std::string>& equipment,
        persistence::Transaction& transaction
    );
    
    /**
     * @brief Get exercise equipment
     * @param exercise_id Exercise ID
     * @return Equipment
     */
    std::vector<std::string> getEquipment(const std::string& exercise_id);
    
    /**
     * @brief Save exercise prerequisites
     * @param exercise_id Exercise ID
     * @param prerequisites Prerequisites
     * @param transaction Transaction
     * @return True if saved successfully
     */
    bool savePrerequisites(
        const std::string& exercise_id,
        const std::vector<std::string>& prerequisites,
        persistence::Transaction& transaction
    );
    
    /**
     * @brief Get exercise prerequisites
     * @param exercise_id Exercise ID
     * @return Prerequisites
     */
    std::vector<std::string> getPrerequisites(const std::string& exercise_id);
    
    /**
     * @brief Save exercise metadata
     * @param exercise_id Exercise ID
     * @param metadata Metadata
     * @param transaction Transaction
     * @return True if saved successfully
     */
    bool saveExerciseMetadata(
        const std::string& exercise_id,
        const std::map<std::string, std::string>& metadata,
        persistence::Transaction& transaction
    );
    
    /**
     * @brief Get exercise metadata
     * @param exercise_id Exercise ID
     * @return Metadata
     */
    std::map<std::string, std::string> getExerciseMetadata(const std::string& exercise_id);
    
    /**
     * @brief Save grading criteria
     * @param exercise_id Exercise ID
     * @param criteria Criteria
     * @param transaction Transaction
     * @return True if saved successfully
     */
    bool saveGradingCriteria(
        const std::string& exercise_id,
        const std::vector<GradingCriteria>& criteria,
        persistence::Transaction& transaction
    );
    
    /**
     * @brief Get grading criteria
     * @param exercise_id Exercise ID
     * @return Criteria
     */
    std::vector<GradingCriteria> getGradingCriteria(const std::string& exercise_id);
    
    /**
     * @brief Save grade definitions
     * @param criteria_id Criteria ID
     * @param definitions Definitions
     * @param transaction Transaction
     * @return True if saved successfully
     */
    bool saveGradeDefinitions(
        const std::string& criteria_id,
        const std::vector<GradeDefinition>& definitions,
        persistence::Transaction& transaction
    );
    
    /**
     * @brief Get grade definitions
     * @param criteria_id Criteria ID
     * @return Definitions
     */
    std::vector<GradeDefinition> getGradeDefinitions(const std::string& criteria_id);
    
    /**
     * @brief Save regulation references
     * @param criteria_id Criteria ID
     * @param references References
     * @param transaction Transaction
     * @return True if saved successfully
     */
    bool saveRegulationReferences(
        const std::string& criteria_id,
        const std::map<std::string, std::string>& references,
        persistence::Transaction& transaction
    );
    
    /**
     * @brief Get regulation references
     * @param criteria_id Criteria ID
     * @return References
     */
    std::map<std::string, std::string> getRegulationReferences(const std::string& criteria_id);
    
    /**
     * @brief Save syllabus metadata
     * @param syllabus_id Syllabus ID
     * @param version Version
     * @param metadata Metadata
     * @param transaction Transaction
     * @return True if saved successfully
     */
    bool saveSyllabusMetadata(
        const std::string& syllabus_id,
        const std::string& version,
        const std::map<std::string, std::string>& metadata,
        persistence::Transaction& transaction
    );
    
    /**
     * @brief Get syllabus metadata
     * @param syllabus_id Syllabus ID
     * @param version Version
     * @return Metadata
     */
    std::map<std::string, std::string> getSyllabusMetadata(
        const std::string& syllabus_id,
        const std::string& version
    );
    
    /**
     * @brief Save syllabus signature
     * @param syllabus_id Syllabus ID
     * @param version Version
     * @param signature Signature
     * @param transaction Transaction
     * @return True if saved successfully
     */
    bool saveSyllabusSignature(
        const std::string& syllabus_id,
        const std::string& version,
        const records::SignatureInfo& signature,
        persistence::Transaction& transaction
    );
    
    /**
     * @brief Get syllabus signature
     * @param syllabus_id Syllabus ID
     * @param version Version
     * @return Signature or nullopt if not found
     */
    std::optional<records::SignatureInfo> getSyllabusSignature(
        const std::string& syllabus_id,
        const std::string& version
    );
    
    /**
     * @brief Generate query parameters
     * @param course_id Course ID (optional)
     * @param status Status (optional)
     * @param effective_date Effective date (optional)
     * @return Pair of (query conditions, parameters)
     */
    std::pair<std::string, std::vector<persistence::PgParam>> generateQueryParams(
        const std::optional<std::string>& course_id,
        const std::optional<SyllabusStatus>& status,
        const std::optional<std::chrono::system_clock::time_point>& effective_date
    );
    
    /**
     * @brief Generate unique ID
     * @return Unique ID
     */
    std::string generateUniqueId();
    
    std::shared_ptr<persistence::DatabaseConnection> db_connection_;
};

} // namespace syllabus
} // namespace etr