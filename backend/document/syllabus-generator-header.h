// src/backend/syllabus/SyllabusGenerator.h
#pragma once

#include <memory>
#include <string>
#include <vector>
#include <unordered_map>
#include <optional>
#include <functional>

#include "../core/Result.h"
#include "../core/Logger.h"
#include "../core/ConfigurationManager.h"
#include "../document/DocumentProcessor.h"

namespace PilotTraining {
namespace Syllabus {

/**
 * @brief Type of learning objective
 */
enum class ObjectiveType {
    KNOWLEDGE,   // Knowledge-based objective
    SKILL,       // Skill-based objective
    ATTITUDE     // Attitude-based objective
};

/**
 * @brief Type of syllabus element
 */
enum class ElementType {
    MODULE,      // Top-level container (e.g., "Basic Flight Maneuvers")
    LESSON,      // Mid-level container (e.g., "Introduction to Takeoffs")
    EXERCISE,    // Specific activity (e.g., "Normal Takeoff Procedure")
    ASSESSMENT   // Evaluation activity
};

/**
 * @brief Type of training environment
 */
enum class TrainingEnvironment {
    CLASSROOM,   // Classroom instruction
    SIMULATOR,   // Simulator training
    AIRCRAFT,    // Aircraft training
    CBT,         // Computer-based training
    BRIEFING,    // Pre/post-flight briefing
    OTHER        // Other environment
};

/**
 * @brief Learning objective definition
 */
struct LearningObjective {
    std::string id;
    std::string description;
    ObjectiveType type;
    std::string taxonomyLevel; // e.g., "Apply", "Analyze", "Evaluate"
    std::vector<std::string> relatedRegulations;
    std::vector<std::string> prerequisiteObjectives;
    int difficulty; // 1-5 scale
    std::string assessmentMethod;
};

/**
 * @brief Competency area definition
 */
struct CompetencyArea {
    std::string id;
    std::string name;
    std::string description;
    std::vector<std::string> indicators; // Performance indicators
    std::vector<std::string> objectives; // Related learning objectives
    std::vector<std::string> regulations; // Related regulations
};

/**
 * @brief Regulatory requirement definition
 */
struct RegulatoryRequirement {
    std::string id;
    std::string authority; // e.g., "FAA", "EASA"
    std::string reference; // e.g., "14 CFR § 61.107"
    std::string description;
    std::string textContent;
    bool mandatory;
    std::vector<std::string> relatedObjectives;
};

/**
 * @brief Syllabus module (top-level container)
 */
struct SyllabusModule {
    std::string id;
    std::string title;
    std::string description;
    int sequenceNumber;
    std::vector<std::string> prerequisites;
    std::vector<std::string> objectives;
    std::vector<std::string> lessons;
    int estimatedDuration; // In minutes
};

/**
 * @brief Syllabus lesson (mid-level container)
 */
struct SyllabusLesson {
    std::string id;
    std::string title;
    std::string description;
    int sequenceNumber;
    std::string moduleId;
    std::vector<std::string> objectives;
    std::vector<std::string> exercises;
    TrainingEnvironment environment;
    int estimatedDuration; // In minutes
};

/**
 * @brief Syllabus exercise (specific activity)
 */
struct SyllabusExercise {
    std::string id;
    std::string title;
    std::string description;
    int sequenceNumber;
    std::string lessonId;
    std::vector<std::string> objectives;
    std::string procedure;
    std::vector<std::string> resources;
    TrainingEnvironment environment;
    int estimatedDuration; // In minutes
    std::string assessmentCriteria;
};

/**
 * @brief Complete syllabus structure
 */
struct Syllabus {
    std::string id;
    std::string title;
    std::string description;
    std::string version;
    std::string author;
    std::string organization;
    std::string createdDate;
    std::string lastModifiedDate;
    std::string regulatoryFramework;
    
    std::vector<LearningObjective> objectives;
    std::vector<CompetencyArea> competencies;
    std::vector<RegulatoryRequirement> regulations;
    std::vector<SyllabusModule> modules;
    std::unordered_map<std::string, SyllabusLesson> lessons;
    std::unordered_map<std::string, SyllabusExercise> exercises;
    
    std::unordered_map<std::string, std::string> metadata;
};

/**
 * @brief Configuration for the syllabus generator
 */
struct SyllabusGeneratorConfig {
    std::string defaultRegulator;
    std::vector<std::string> regulatoryDocuments;
    std::string templateDirectory;
    bool enableAIExtraction;
    bool enableRegulationMapping;
    std::string outputDirectory;
};

/**
 * @brief Generator for training syllabi
 * 
 * This class processes training materials and regulatory documents to extract
 * structured syllabus elements, maps regulatory requirements to training elements,
 * and generates complete training syllabi.
 */
class SyllabusGenerator {
public:
    /**
     * @brief Construct a new Syllabus Generator
     * 
     * @param configManager Configuration manager
     * @param documentProcessor Document processor for parsing input materials
     */
    SyllabusGenerator(
        std::shared_ptr<Core::ConfigurationManager> configManager,
        std::shared_ptr<Document::DocumentProcessingPipeline> documentProcessor
    );
    
    /**
     * @brief Destroy the Syllabus Generator
     */
    ~SyllabusGenerator();
    
    /**
     * @brief Initialize the generator with configuration
     * 
     * @param config Generator configuration
     * @return Core::Result<void> Success or error
     */
    Core::Result<void> initialize(const SyllabusGeneratorConfig& config);
    
    /**
     * @brief Process a training document to extract syllabus elements
     * 
     * @param documentPath Path to the document
     * @return Core::Result<std::string> Document ID if successful
     */
    Core::Result<std::string> processDocument(const std::string& documentPath);
    
    /**
     * @brief Process a regulatory document to extract requirements
     * 
     * @param documentPath Path to the document
     * @param regulator Regulatory authority (e.g., "FAA", "EASA")
     * @return Core::Result<std::string> Document ID if successful
     */
    Core::Result<std::string> processRegulatoryDocument(
        const std::string& documentPath,
        const std::string& regulator
    );
    
    /**
     * @brief Extract learning objectives from processed documents
     * 
     * @return Core::Result<std::vector<LearningObjective>> Extracted objectives
     */
    Core::Result<std::vector<LearningObjective>> extractLearningObjectives();
    
    /**
     * @brief Extract competency areas from processed documents
     * 
     * @return Core::Result<std::vector<CompetencyArea>> Extracted competencies
     */
    Core::Result<std::vector<CompetencyArea>> extractCompetencyAreas();
    
    /**
     * @brief Extract regulatory requirements from processed documents
     * 
     * @return Core::Result<std::vector<RegulatoryRequirement>> Extracted requirements
     */
    Core::Result<std::vector<RegulatoryRequirement>> extractRegulatoryRequirements();
    
    /**
     * @brief Map regulatory requirements to learning objectives
     * 
     * @param regulations Regulatory requirements
     * @param objectives Learning objectives
     * @return Core::Result<void> Success or error
     */
    Core::Result<void> mapRegulationsToObjectives(
        const std::vector<RegulatoryRequirement>& regulations,
        std::vector<LearningObjective>& objectives
    );
    
    /**
     * @brief Create a syllabus structure from extracted elements
     * 
     * @param title Syllabus title
     * @param description Syllabus description
     * @param regulatoryFramework Regulatory framework
     * @return Core::Result<Syllabus> Generated syllabus
     */
    Core::Result<Syllabus> createSyllabus(
        const std::string& title,
        const std::string& description,
        const std::string& regulatoryFramework
    );
    
    /**
     * @brief Apply a syllabus template to generate a complete syllabus
     * 
     * @param templatePath Path to the template file
     * @param objectives Learning objectives
     * @param competencies Competency areas
     * @param regulations Regulatory requirements
     * @return Core::Result<Syllabus> Generated syllabus
     */
    Core::Result<Syllabus> applyTemplate(
        const std::string& templatePath,
        const std::vector<LearningObjective>& objectives,
        const std::vector<CompetencyArea>& competencies,
        const std::vector<RegulatoryRequirement>& regulations
    );
    
    /**
     * @brief Customize a syllabus by adding, removing, or modifying elements
     * 
     * @param syllabus Syllabus to customize
     * @param customizations Customization operations
     * @return Core::Result<Syllabus> Customized syllabus
     */
    Core::Result<Syllabus> customizeSyllabus(
        const Syllabus& syllabus,
        const std::unordered_map<std::string, std::string>& customizations
    );
    
    /**
     * @brief Export a syllabus to a file
     * 
     * @param syllabus Syllabus to export
     * @param format Export format (e.g., "json", "xml", "html", "pdf")
     * @param outputPath Output file path
     * @return Core::Result<void> Success or error
     */
    Core::Result<void> exportSyllabus(
        const Syllabus& syllabus,
        const std::string& format,
        const std::string& outputPath
    );
    
    /**
     * @brief Validate a syllabus for completeness and regulatory compliance
     * 
     * @param syllabus Syllabus to validate
     * @return Core::Result<std::unordered_map<std::string, std::string>> Validation results
     */
    Core::Result<std::unordered_map<std::string, std::string>> validateSyllabus(
        const Syllabus& syllabus
    );
    
    /**
     * @brief Add a custom learning objective
     * 
     * @param objective Learning objective to add
     * @return Core::Result<std::string> Objective ID if successful
     */
    Core::Result<std::string> addLearningObjective(const LearningObjective& objective);
    
    /**
     * @brief Add a custom competency area
     * 
     * @param competency Competency area to add
     * @return Core::Result<std::string> Competency ID if successful
     */
    Core::Result<std::string> addCompetencyArea(const CompetencyArea& competency);
    
    /**
     * @brief Add a custom regulatory requirement
     * 
     * @param requirement Regulatory requirement to add
     * @return Core::Result<std::string> Requirement ID if successful
     */
    Core::Result<std::string> addRegulatoryRequirement(const RegulatoryRequirement& requirement);

private:
    std::shared_ptr<Core::ConfigurationManager> _configManager;
    std::shared_ptr<Document::DocumentProcessingPipeline> _documentProcessor;
    SyllabusGeneratorConfig _config;
    
    std::vector<Document::ProcessingResult> _processedDocuments;
    
    // Extract structured content from document processing results
    std::vector<LearningObjective> extractObjectivesFromDocument(const Document::ProcessingResult& result);
    std::vector<CompetencyArea> extractCompetenciesFromDocument(const Document::ProcessingResult& result);
    std::vector<RegulatoryRequirement> extractRegulationsFromDocument(const Document::ProcessingResult& result);
    
    // Helper methods for syllabus generation
    void organizeModules(Syllabus& syllabus);
    void organizeLessons(Syllabus& syllabus);
    void organizeExercises(Syllabus& syllabus);
    
    // AI-assisted content extraction
    Core::Result<std::vector<LearningObjective>> extractObjectivesWithAI(const std::string& documentContent);
    Core::Result<std::vector<CompetencyArea>> extractCompetenciesWithAI(const std::string& documentContent);
    Core::Result<std::vector<RegulatoryRequirement>> extractRegulationsWithAI(const std::string& documentContent);
    
    // Template handling
    Core::Result<Syllabus> loadTemplate(const std::string& templatePath);
    void applyObjectivesToTemplate(Syllabus& syllabus, const std::vector<LearningObjective>& objectives);
    
    // Validation and compliance checking
    bool validateObjectiveCoverage(const Syllabus& syllabus, std::unordered_map<std::string, std::string>& results);
    bool validateRegulatoryCoverage(const Syllabus& syllabus, std::unordered_map<std::string, std::string>& results);
    bool validateStructuralIntegrity(const Syllabus& syllabus, std::unordered_map<std::string, std::string>& results);
};

} // namespace Syllabus
} // namespace PilotTraining
