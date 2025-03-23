#pragma once

#include <string>
#include <vector>
#include <memory>
#include <optional>
#include <functional>
#include <future>
#include <chrono>
#include <unordered_map>
#include <unordered_set>

#include <drogon/drogon.h>
#include <nlohmann/json.hpp>

#include "../core/error-handling.hpp"
#include "../document/document-processor-interface.hpp"

namespace apt {
namespace syllabus {

/**
 * Regulatory authority types
 */
enum class RegulatoryAuthority {
    FAA,    // Federal Aviation Administration (US)
    EASA,   // European Union Aviation Safety Agency
    ICAO,   // International Civil Aviation Organization
    DGCA,   // Directorate General of Civil Aviation (India)
    CAAC,   // Civil Aviation Administration of China
    TCCA,   // Transport Canada Civil Aviation
    CASA,   // Civil Aviation Safety Authority (Australia)
    ANAC,   // Agência Nacional de Aviação Civil (Brazil)
    OTHER
};

/**
 * Training program types
 */
enum class ProgramType {
    INITIAL_TYPE_RATING,
    RECURRENT_TRAINING,
    COMMAND_UPGRADE,
    JOC_MCC,             // Jet Orientation Course / Multi-Crew Cooperation
    INSTRUCTOR_TRAINING,
    EMERGENCY_PROCEDURES,
    LINE_ORIENTED_FLIGHT_TRAINING,
    TYPE_SPECIFIC_TRAINING,
    CUSTOM
};

/**
 * Competency area
 */
struct CompetencyArea {
    std::string id;
    std::string name;
    std::string description;
    std::optional<std::string> regulatoryReference;
    std::vector<std::string> requiredKnowledge;
    std::vector<std::string> requiredSkills;
    std::vector<std::string> assessmentCriteria;
    std::unordered_map<std::string, std::string> attributes;
};

/**
 * Learning objective
 */
struct LearningObjective {
    std::string id;
    std::string description;
    std::vector<std::string> competencyAreaIds;
    std::optional<std::string> regulatoryReference;
    std::string taxonomyLevel; // e.g., "Knowledge", "Comprehension", "Application", etc.
    std::unordered_map<std::string, std::string> attributes;
};

/**
 * Training activity type
 */
enum class ActivityType {
    GROUND_SCHOOL,
    BRIEFING,
    SIMULATOR_SESSION,
    FLIGHT_SESSION,
    DEBRIEFING,
    ASSESSMENT,
    SELF_STUDY,
    GROUP_EXERCISE,
    DEMONSTRATION,
    OTHER
};

/**
 * Resource requirement
 */
struct ResourceRequirement {
    std::string id;
    std::string resourceType; // e.g., "Simulator", "Classroom", "Instructor", etc.
    std::string resourceId;
    std::optional<std::string> resourceName;
    std::optional<int> quantity;
    std::optional<std::chrono::minutes> durationMinutes;
    std::unordered_map<std::string, std::string> attributes;
};

/**
 * Training activity
 */
struct TrainingActivity {
    std::string id;
    std::string name;
    std::string description;
    ActivityType type;
    std::vector<std::string> learningObjectiveIds;
    std::vector<ResourceRequirement> resources;
    std::optional<std::chrono::minutes> durationMinutes;
    std::unordered_map<std::string, std::string> attributes;
};

/**
 * Assessment criteria
 */
struct AssessmentCriteria {
    std::string id;
    std::string description;
    std::vector<std::string> learningObjectiveIds;
    std::vector<std::string> competencyAreaIds;
    std::vector<std::pair<int, std::string>> gradingScale; // e.g., {1, "Unsatisfactory"}, {2, "Below Standard"}, etc.
    std::optional<std::string> regulatoryReference;
    std::unordered_map<std::string, std::string> attributes;
};

/**
 * Training module
 */
struct TrainingModule {
    std::string id;
    std::string name;
    std::string description;
    std::vector<std::string> learningObjectiveIds;
    std::vector<std::string> prerequisiteModuleIds;
    std::vector<std::string> activityIds;
    std::vector<std::string> assessmentCriteriaIds;
    std::optional<std::chrono::minutes> totalDurationMinutes;
    std::unordered_map<std::string, std::string> attributes;
};

/**
 * Syllabus phase
 */
struct SyllabusPhase {
    std::string id;
    std::string name;
    std::string description;
    std::vector<std::string> moduleIds;
    std::optional<int> sequenceNumber;
    std::unordered_map<std::string, std::string> attributes;
};

/**
 * Syllabus version
 */
struct SyllabusVersion {
    std::string id;
    std::string version;
    std::chrono::system_clock::time_point creationDate;
    std::optional<std::chrono::system_clock::time_point> approvalDate;
    std::string createdBy;
    std::optional<std::string> approvedBy;
    std::string changeDescription;
    std::unordered_map<std::string, std::string> attributes;
};

/**
 * Complete training syllabus
 */
struct Syllabus {
    std::string id;
    std::string name;
    std::string description;
    ProgramType programType;
    std::vector<RegulatoryAuthority> regulatoryAuthorities;
    std::unordered_map<std::string, std::string> regulatoryReferences;
    
    SyllabusVersion currentVersion;
    std::vector<SyllabusVersion> versionHistory;
    
    std::vector<CompetencyArea> competencyAreas;
    std::vector<LearningObjective> learningObjectives;
    std::vector<TrainingActivity> activities;
    std::vector<AssessmentCriteria> assessmentCriteria;
    std::vector<TrainingModule> modules;
    std::vector<SyllabusPhase> phases;
    
    std::unordered_map<std::string, std::string> attributes;
    
    // Progress tracking
    std::chrono::system_clock::time_point creationDate;
    std::optional<std::chrono::system_clock::time_point> lastModifiedDate;
    std::string createdBy;
    std::optional<std::string> lastModifiedBy;
    
    // Version control metadata
    std::optional<std::string> sourceRepositoryUrl;
    std::optional<std::string> sourceCommitId;
};

/**
 * Syllabus template type
 */
enum class TemplateType {
    INITIAL_TYPE_RATING_EASA,
    INITIAL_TYPE_RATING_FAA,
    RECURRENT_EASA,
    RECURRENT_FAA,
    JOC_MCC_EASA,
    UPGRADE_TRAINING_EASA,
    UPGRADE_TRAINING_FAA,
    CUSTOM
};

/**
 * Syllabus template
 */
struct SyllabusTemplate {
    std::string id;
    std::string name;
    std::string description;
    TemplateType type;
    std::vector<RegulatoryAuthority> regulatoryAuthorities;
    std::string createdBy;
    std::chrono::system_clock::time_point creationDate;
    
    // Template content
    Syllabus baseContent;
    
    // Customization points (parts that can be customized)
    std::vector<std::string> customizableElementIds;
    
    // Constraints (rules that must be followed when customizing)
    nlohmann::json constraints;
};

/**
 * Compliance verification result
 */
struct ComplianceResult {
    bool compliant;
    std::vector<std::string> missingRequirements;
    std::vector<std::string> incompleteRequirements;
    std::unordered_map<std::string, std::vector<std::string>> regulatoryGaps;
    std::unordered_map<std::string, std::vector<std::string>> warnings;
};

/**
 * Progress callback for syllabus generation
 */
using SyllabusProgressCallback = std::function<void(float progress, const std::string& statusMessage)>;

/**
 * Syllabus generator options
 */
struct SyllabusGeneratorOptions {
    ProgramType programType = ProgramType::INITIAL_TYPE_RATING;
    std::vector<RegulatoryAuthority> regulatoryAuthorities = {RegulatoryAuthority::EASA};
    std::optional<TemplateType> templateType;
    std::optional<std::string> aircraftType;
    std::optional<SyllabusProgressCallback> progressCallback;
    bool extractCompetencyAreas = true;
    bool extractLearningObjectives = true;
    bool mapRegulatoryRequirements = true;
    bool generateAssessmentCriteria = true;
    bool includeVersionControl = true;
};

/**
 * Syllabus Generator interface
 */
class SyllabusGenerator {
public:
    virtual ~SyllabusGenerator() = default;
    
    /**
     * Generate a syllabus from document analysis results
     */
    virtual std::future<Result<Syllabus, AptException>> generateSyllabus(
        const std::vector<document::ProcessedDocument>& documents,
        const SyllabusGeneratorOptions& options = {}) = 0;
    
    /**
     * Generate a syllabus from a template
     */
    virtual std::future<Result<Syllabus, AptException>> generateFromTemplate(
        const SyllabusTemplate& template_,
        const std::unordered_map<std::string, std::string>& customizations,
        const SyllabusGeneratorOptions& options = {}) = 0;
    
    /**
     * Verify compliance of a syllabus with regulatory requirements
     */
    virtual Result<ComplianceResult, AptException> verifyCompliance(
        const Syllabus& syllabus,
        const std::vector<RegulatoryAuthority>& authorities) = 0;
    
    /**
     * Update an existing syllabus based on new document analysis
     */
    virtual std::future<Result<Syllabus, AptException>> updateSyllabus(
        const Syllabus& existingSyllabus,
        const std::vector<document::ProcessedDocument>& newDocuments,
        const SyllabusGeneratorOptions& options = {}) = 0;
};

/**
 * Concrete implementation of the Syllabus Generator
 */
class StandardSyllabusGenerator : public SyllabusGenerator {
public:
    std::future<Result<Syllabus, AptException>> generateSyllabus(
        const std::vector<document::ProcessedDocument>& documents,
        const SyllabusGeneratorOptions& options = {}) override;
    
    std::future<Result<Syllabus, AptException>> generateFromTemplate(
        const SyllabusTemplate& template_,
        const std::unordered_map<std::string, std::string>& customizations,
        const SyllabusGeneratorOptions& options = {}) override;
    
    Result<ComplianceResult, AptException> verifyCompliance(
        const Syllabus& syllabus,
        const std::vector<RegulatoryAuthority>& authorities) override;
    
    std::future<Result<Syllabus, AptException>> updateSyllabus(
        const Syllabus& existingSyllabus,
        const std::vector<document::ProcessedDocument>& newDocuments,
        const SyllabusGeneratorOptions& options = {}) override;
    
private:
    Result<std::vector<CompetencyArea>, AptException> extractCompetencyAreas(
        const std::vector<document::ProcessedDocument>& documents,
        const SyllabusGeneratorOptions& options);
    
    Result<std::vector<LearningObjective>, AptException> extractLearningObjectives(
        const std::vector<document::ProcessedDocument>& documents,
        const std::vector<CompetencyArea>& competencyAreas,
        const SyllabusGeneratorOptions& options);
    
    Result<std::vector<TrainingActivity>, AptException> generateTrainingActivities(
        const std::vector<LearningObjective>& learningObjectives,
        const SyllabusGeneratorOptions& options);
    
    Result<std::vector<AssessmentCriteria>, AptException> generateAssessmentCriteria(
        const std::vector<CompetencyArea>& competencyAreas,
        const std::vector<LearningObjective>& learningObjectives,
        const SyllabusGeneratorOptions& options);
    
    Result<std::vector<TrainingModule>, AptException> generateTrainingModules(
        const std::vector<LearningObjective>& learningObjectives,
        const std::vector<TrainingActivity>& activities,
        const std::vector<AssessmentCriteria>& assessmentCriteria,
        const SyllabusGeneratorOptions& options);
    
    Result<std::vector<SyllabusPhase>, AptException> generateSyllabusPhases(
        const std::vector<TrainingModule>& modules,
        const SyllabusGeneratorOptions& options);
    
    Result<std::unordered_map<std::string, std::string>, AptException> mapRegulatoryRequirements(
        const std::vector<document::ProcessedDocument>& documents,
        const std::vector<RegulatoryAuthority>& authorities);
};

// Implementation of StandardSyllabusGenerator::generateSyllabus
inline std::future<Result<Syllabus, AptException>> StandardSyllabusGenerator::generateSyllabus(
    const std::vector<document::ProcessedDocument>& documents,
    const SyllabusGeneratorOptions& options) {
    
    return std::async(std::launch::async, [this, documents, options