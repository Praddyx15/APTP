// src/backend/syllabus/SyllabusGenerator.cpp
#include "SyllabusGenerator.h"
#include <fstream>
#include <sstream>
#include <filesystem>
#include <chrono>
#include <algorithm>
#include <cctype>
#include <regex>
#include <nlohmann/json.hpp>
#include <tinyxml2.h>

using json = nlohmann::json;
using namespace tinyxml2;

namespace PilotTraining {
namespace Syllabus {

SyllabusGenerator::SyllabusGenerator(
    std::shared_ptr<Core::ConfigurationManager> configManager,
    std::shared_ptr<Document::DocumentProcessingPipeline> documentProcessor)
    : _configManager(std::move(configManager)),
      _documentProcessor(std::move(documentProcessor)) {
    
    Core::Logger::info("SyllabusGenerator created");
}

SyllabusGenerator::~SyllabusGenerator() {
    Core::Logger::info("SyllabusGenerator destroyed");
}

Core::Result<void> SyllabusGenerator::initialize(const SyllabusGeneratorConfig& config) {
    try {
        _config = config;
        
        // Create output directory if it doesn't exist
        std::filesystem::create_directories(_config.outputDirectory);
        
        // Ensure template directory exists
        if (!_config.templateDirectory.empty() && 
            !std::filesystem::exists(_config.templateDirectory)) {
            return Core::Result<void>::failure(
                Core::ErrorCode::DirectoryNotFound,
                "Template directory not found: " + _config.templateDirectory
            );
        }
        
        Core::Logger::info("SyllabusGenerator initialized with regulator: {}", _config.defaultRegulator);
        return Core::Result<void>::success();
    } catch (const std::exception& e) {
        Core::Logger::error("Failed to initialize SyllabusGenerator: {}", e.what());
        return Core::Result<void>::failure(
            Core::ErrorCode::InitializationFailed,
            "Failed to initialize SyllabusGenerator: " + std::string(e.what())
        );
    }
}

Core::Result<std::string> SyllabusGenerator::processDocument(const std::string& documentPath) {
    try {
        if (!std::filesystem::exists(documentPath)) {
            return Core::Result<std::string>::failure(
                Core::ErrorCode::FileNotFound,
                "Document file not found: " + documentPath
            );
        }
        
        // Create document metadata
        Document::DocumentMetadata metadata;
        metadata.id = "doc-" + std::to_string(std::chrono::system_clock::now().time_since_epoch().count());
        metadata.filename = std::filesystem::path(documentPath).filename().string();
        metadata.contentType = "application/octet-stream"; // Default, will be determined by processor
        metadata.organizationId = "default-org";
        metadata.uploadedBy = "system";
        metadata.createdAt = std::to_string(std::chrono::system_clock::now().time_since_epoch().count());
        metadata.updatedAt = metadata.createdAt;
        metadata.type = Document::DocumentType::UNKNOWN; // Will be determined by processor
        metadata.fileSize = std::filesystem::file_size(documentPath);
        
        // Process the document
        auto result = _documentProcessor->processDocument(documentPath, metadata);
        if (!result.isSuccess()) {
            return Core::Result<std::string>::failure(
                result.getError().code,
                "Failed to process document: " + result.getError().message
            );
        }
        
        // Store the processing result
        _processedDocuments.push_back(result.getValue());
        
        Core::Logger::info("Processed document: {}", metadata.filename);
        return Core::Result<std::string>::success(metadata.id);
    } catch (const std::exception& e) {
        Core::Logger::error("Failed to process document: {}", e.what());
        return Core::Result<std::string>::failure(
            Core::ErrorCode::DocumentProcessingFailed,
            "Failed to process document: " + std::string(e.what())
        );
    }
}

Core::Result<std::string> SyllabusGenerator::processRegulatoryDocument(
    const std::string& documentPath,
    const std::string& regulator) {
    
    try {
        if (!std::filesystem::exists(documentPath)) {
            return Core::Result<std::string>::failure(
                Core::ErrorCode::FileNotFound,
                "Regulatory document file not found: " + documentPath
            );
        }
        
        // Create document metadata
        Document::DocumentMetadata metadata;
        metadata.id = "reg-" + std::to_string(std::chrono::system_clock::now().time_since_epoch().count());
        metadata.filename = std::filesystem::path(documentPath).filename().string();
        metadata.contentType = "application/octet-stream"; // Default, will be determined by processor
        metadata.organizationId = "default-org";
        metadata.uploadedBy = "system";
        metadata.createdAt = std::to_string(std::chrono::system_clock::now().time_since_epoch().count());
        metadata.updatedAt = metadata.createdAt;
        metadata.type = Document::DocumentType::UNKNOWN; // Will be determined by processor
        metadata.fileSize = std::filesystem::file_size(documentPath);
        
        // Add regulatory authority to metadata
        metadata.additionalMetadata["regulator"] = regulator;
        metadata.additionalMetadata["documentType"] = "regulatory";
        
        // Process the document
        auto result = _documentProcessor->processDocument(documentPath, metadata);
        if (!result.isSuccess()) {
            return Core::Result<std::string>::failure(
                result.getError().code,
                "Failed to process regulatory document: " + result.getError().message
            );
        }
        
        // Store the processing result
        _processedDocuments.push_back(result.getValue());
        
        Core::Logger::info("Processed regulatory document: {}", metadata.filename);
        return Core::Result<std::string>::success(metadata.id);
    } catch (const std::exception& e) {
        Core::Logger::error("Failed to process regulatory document: {}", e.what());
        return Core::Result<std::string>::failure(
            Core::ErrorCode::DocumentProcessingFailed,
            "Failed to process regulatory document: " + std::string(e.what())
        );
    }
}

Core::Result<std::vector<LearningObjective>> SyllabusGenerator::extractLearningObjectives() {
    try {
        std::vector<LearningObjective> allObjectives;
        
        // Process each document
        for (const auto& document : _processedDocuments) {
            auto objectives = extractObjectivesFromDocument(document);
            allObjectives.insert(allObjectives.end(), objectives.begin(), objectives.end());
        }
        
        // De-duplicate objectives
        std::unordered_map<std::string, LearningObjective> uniqueObjectives;
        for (const auto& objective : allObjectives) {
            // Use description as a key for deduplication
            std::string key = objective.description;
            
            // Convert to lowercase for case-insensitive comparison
            std::transform(key.begin(), key.end(), key.begin(), 
                [](unsigned char c) { return std::tolower(c); });
            
            // Keep the objective with the most complete data
            if (uniqueObjectives.find(key) == uniqueObjectives.end()) {
                uniqueObjectives[key] = objective;
            } else {
                // If new objective has more data, update
                auto& existing = uniqueObjectives[key];
                if (existing.relatedRegulations.empty() && !objective.relatedRegulations.empty()) {
                    existing.relatedRegulations = objective.relatedRegulations;
                }
                if (existing.prerequisiteObjectives.empty() && !objective.prerequisiteObjectives.empty()) {
                    existing.prerequisiteObjectives = objective.prerequisiteObjectives;
                }
                if (existing.assessmentMethod.empty() && !objective.assessmentMethod.empty()) {
                    existing.assessmentMethod = objective.assessmentMethod;
                }
            }
        }
        
        // Convert map back to vector
        std::vector<LearningObjective> result;
        result.reserve(uniqueObjectives.size());
        for (const auto& [_, objective] : uniqueObjectives) {
            result.push_back(objective);
        }
        
        Core::Logger::info("Extracted {} unique learning objectives", result.size());
        return Core::Result<std::vector<LearningObjective>>::success(result);
    } catch (const std::exception& e) {
        Core::Logger::error("Failed to extract learning objectives: {}", e.what());
        return Core::Result<std::vector<LearningObjective>>::failure(
            Core::ErrorCode::ExtractionFailed,
            "Failed to extract learning objectives: " + std::string(e.what())
        );
    }
}

Core::Result<std::vector<CompetencyArea>> SyllabusGenerator::extractCompetencyAreas() {
    try {
        std::vector<CompetencyArea> allCompetencies;
        
        // Process each document
        for (const auto& document : _processedDocuments) {
            auto competencies = extractCompetenciesFromDocument(document);
            allCompetencies.insert(allCompetencies.end(), competencies.begin(), competencies.end());
        }
        
        // De-duplicate competencies
        std::unordered_map<std::string, CompetencyArea> uniqueCompetencies;
        for (const auto& competency : allCompetencies) {
            // Use name as a key for deduplication
            std::string key = competency.name;
            
            // Convert to lowercase for case-insensitive comparison
            std::transform(key.begin(), key.end(), key.begin(), 
                [](unsigned char c) { return std::tolower(c); });
            
            // Keep the competency with the most complete data
            if (uniqueCompetencies.find(key) == uniqueCompetencies.end()) {
                uniqueCompetencies[key] = competency;
            } else {
                // If new competency has more data, update
                auto& existing = uniqueCompetencies[key];
                if (existing.description.empty() && !competency.description.empty()) {
                    existing.description = competency.description;
                }
                if (existing.indicators.empty() && !competency.indicators.empty()) {
                    existing.indicators = competency.indicators;
                }
                if (existing.objectives.empty() && !competency.objectives.empty()) {
                    existing.objectives = competency.objectives;
                }
                if (existing.regulations.empty() && !competency.regulations.empty()) {
                    existing.regulations = competency.regulations;
                }
            }
        }
        
        // Convert map back to vector
        std::vector<CompetencyArea> result;
        result.reserve(uniqueCompetencies.size());
        for (const auto& [_, competency] : uniqueCompetencies) {
            result.push_back(competency);
        }
        
        Core::Logger::info("Extracted {} unique competency areas", result.size());
        return Core::Result<std::vector<CompetencyArea>>::success(result);
    } catch (const std::exception& e) {
        Core::Logger::error("Failed to extract competency areas: {}", e.what());
        return Core::Result<std::vector<CompetencyArea>>::failure(
            Core::ErrorCode::ExtractionFailed,
            "Failed to extract competency areas: " + std::string(e.what())
        );
    }
}

Core::Result<std::vector<RegulatoryRequirement>> SyllabusGenerator::extractRegulatoryRequirements() {
    try {
        std::vector<RegulatoryRequirement> allRegulations;
        
        // Process each document
        for (const auto& document : _processedDocuments) {
            // Only process documents marked as regulatory
            if (document.content.metadata.find("documentType") != document.content.metadata.end() &&
                document.content.metadata.at("documentType") == "regulatory") {
                
                auto regulations = extractRegulationsFromDocument(document);
                allRegulations.insert(allRegulations.end(), regulations.begin(), regulations.end());
            }
        }
        
        // De-duplicate regulations
        std::unordered_map<std::string, RegulatoryRequirement> uniqueRegulations;
        for (const auto& regulation : allRegulations) {
            // Use reference as a key for deduplication
            std::string key = regulation.authority + "-" + regulation.reference;
            
            // Keep the regulation with the most complete data
            if (uniqueRegulations.find(key) == uniqueRegulations.end()) {
                uniqueRegulations[key] = regulation;
            } else {
                // If new regulation has more data, update
                auto& existing = uniqueRegulations[key];
                if (existing.description.empty() && !regulation.description.empty()) {
                    existing.description = regulation.description;
                }
                if (existing.textContent.empty() && !regulation.textContent.empty()) {
                    existing.textContent = regulation.textContent;
                }
                if (existing.relatedObjectives.empty() && !regulation.relatedObjectives.empty()) {
                    existing.relatedObjectives = regulation.relatedObjectives;
                }
            }
        }
        
        // Convert map back to vector
        std::vector<RegulatoryRequirement> result;
        result.reserve(uniqueRegulations.size());
        for (const auto& [_, regulation] : uniqueRegulations) {
            result.push_back(regulation);
        }
        
        Core::Logger::info("Extracted {} unique regulatory requirements", result.size());
        return Core::Result<std::vector<RegulatoryRequirement>>::success(result);
    } catch (const std::exception& e) {
        Core::Logger::error("Failed to extract regulatory requirements: {}", e.what());
        return Core::Result<std::vector<RegulatoryRequirement>>::failure(
            Core::ErrorCode::ExtractionFailed,
            "Failed to extract regulatory requirements: " + std::string(e.what())
        );
    }
}

Core::Result<void> SyllabusGenerator::mapRegulationsToObjectives(
    const std::vector<RegulatoryRequirement>& regulations,
    std::vector<LearningObjective>& objectives) {
    
    try {
        // Use AI to help with mapping if enabled
        if (_config.enableRegulationMapping) {
            // For each regulation
            for (const auto& regulation : regulations) {
                // Find relevant objectives based on content similarity
                for (auto& objective : objectives) {
                    bool isRelevant = false;
                    
                    // Simple keyword matching (would be replaced with more sophisticated NLP in real implementation)
                    std::string regText = regulation.textContent + " " + regulation.description;
                    std::string objText = objective.description;
                    
                    // Convert to lowercase for comparison
                    std::transform(regText.begin(), regText.end(), regText.begin(), 
                        [](unsigned char c) { return std::tolower(c); });
                    std::transform(objText.begin(), objText.end(), objText.begin(), 
                        [](unsigned char c) { return std::tolower(c); });
                    
                    // Extract key terms (simplified for demo)
                    std::vector<std::string> keyTerms = {
                        "takeoff", "landing", "maneuver", "navigation", "communication",
                        "emergency", "procedure", "operate", "control", "flight",
                        "safety", "instrument", "visual", "weather", "preflight"
                    };
                    
                    // Check if both texts contain the same key terms
                    for (const auto& term : keyTerms) {
                        if (regText.find(term) != std::string::npos && 
                            objText.find(term) != std::string::npos) {
                            isRelevant = true;
                            break;
                        }
                    }
                    
                    // If relevant, add reference
                    if (isRelevant) {
                        // Check if regulation is already linked
                        auto it = std::find(objective.relatedRegulations.begin(), 
                                          objective.relatedRegulations.end(), 
                                          regulation.id);
                        
                        if (it == objective.relatedRegulations.end()) {
                            objective.relatedRegulations.push_back(regulation.id);
                        }
                    }
                }
            }
        } else {
            // Manual mapping would be done here in a real implementation
            Core::Logger::info("Regulation mapping disabled, skipping");
        }
        
        Core::Logger::info("Mapped regulations to objectives");
        return Core::Result<void>::success();
    } catch (const std::exception& e) {
        Core::Logger::error("Failed to map regulations to objectives: {}", e.what());
        return Core::Result<void>::failure(
            Core::ErrorCode::MappingFailed,
            "Failed to map regulations to objectives: " + std::string(e.what())
        );
    }
}

Core::Result<Syllabus> SyllabusGenerator::createSyllabus(
    const std::string& title,
    const std::string& description,
    const std::string& regulatoryFramework) {
    
    try {
        // Create a new syllabus
        Syllabus syllabus;
        syllabus.id = "syllabus-" + std::to_string(std::chrono::system_clock::now().time_since_epoch().count());
        syllabus.title = title;
        syllabus.description = description;
        syllabus.version = "1.0";
        syllabus.author = "System";
        syllabus.organization = "Default Organization";
        
        // Set dates
        auto now = std::chrono::system_clock::now();
        auto now_time_t = std::chrono::system_clock::to_time_t(now);
        std::stringstream ss;
        ss << std::put_time(std::localtime(&now_time_t), "%Y-%m-%d %H:%M:%S");
        syllabus.createdDate = ss.str();
        syllabus.lastModifiedDate = ss.str();
        
        syllabus.regulatoryFramework = regulatoryFramework;
        
        // Extract elements from processed documents
        auto objectivesResult = extractLearningObjectives();
        if (!objectivesResult.isSuccess()) {
            return Core::Result<Syllabus>::failure(
                objectivesResult.getError().code,
                objectivesResult.getError().message
            );
        }
        syllabus.objectives = objectivesResult.getValue();
        
        auto competenciesResult = extractCompetencyAreas();
        if (!competenciesResult.isSuccess()) {
            return Core::Result<Syllabus>::failure(
                competenciesResult.getError().code,
                competenciesResult.getError().message
            );
        }
        syllabus.competencies = competenciesResult.getValue();
        
        auto regulationsResult = extractRegulatoryRequirements();
        if (!regulationsResult.isSuccess()) {
            return Core::Result<Syllabus>::failure(
                regulationsResult.getError().code,
                regulationsResult.getError().message
            );
        }
        syllabus.regulations = regulationsResult.getValue();
        
        // Map regulations to objectives
        auto mapResult = mapRegulationsToObjectives(syllabus.regulations, syllabus.objectives);
        if (!mapResult.isSuccess()) {
            return Core::Result<Syllabus>::failure(
                mapResult.getError().code,
                mapResult.getError().message
            );
        }
        
        // Create initial structure
        // This would be more sophisticated in a real implementation
        organizeModules(syllabus);
        organizeLessons(syllabus);
        organizeExercises(syllabus);
        
        Core::Logger::info("Created syllabus: {}", syllabus.title);
        return Core::Result<Syllabus>::success(syllabus);
    } catch (const std::exception& e) {
        Core::Logger::error("Failed to create syllabus: {}", e.what());
        return Core::Result<Syllabus>::failure(
            Core::ErrorCode::CreationFailed,
            "Failed to create syllabus: " + std::string(e.what())
        );
    }
}

Core::Result<Syllabus> SyllabusGenerator::applyTemplate(
    const std::string& templatePath,
    const std::vector<LearningObjective>& objectives,
    const std::vector<CompetencyArea>& competencies,
    const std::vector<RegulatoryRequirement>& regulations) {
    
    try {
        // Load template
        auto templateResult = loadTemplate(templatePath);
        if (!templateResult.isSuccess()) {
            return templateResult;
        }
        
        // Get template syllabus
        Syllabus syllabus = templateResult.getValue();
        
        // Add objectives, competencies, and regulations
        syllabus.objectives = objectives;
        syllabus.competencies = competencies;
        syllabus.regulations = regulations;
        
        // Apply objectives to template structure
        applyObjectivesToTemplate(syllabus, objectives);
        
        // Update metadata
        auto now = std::chrono::system_clock::now();
        auto now_time_t = std::chrono::system_clock::to_time_t(now);
        std::stringstream ss;
        ss << std::put_time(std::localtime(&now_time_t), "%Y-%m-%d %H:%M:%S");
        syllabus.lastModifiedDate = ss.str();
        syllabus.version = "1.0";
        
        Core::Logger::info("Applied template to create syllabus: {}", syllabus.title);
        return Core::Result<Syllabus>::success(syllabus);
    } catch (const std::exception& e) {
        Core::Logger::error("Failed to apply template: {}", e.what());
        return Core::Result<Syllabus>::failure(
            Core::ErrorCode::TemplateFailed,
            "Failed to apply template: " + std::string(e.what())
        );
    }
}

Core::Result<Syllabus> SyllabusGenerator::customizeSyllabus(
    const Syllabus& syllabus,
    const std::unordered_map<std::string, std::string>& customizations) {
    
    try {
        // Create a copy to work with
        Syllabus customizedSyllabus = syllabus;
        
        // Apply customizations
        for (const auto& [key, value] : customizations) {
            std::string action, target;
            
            // Parse customization key (format: "action:target")
            size_t colonPos = key.find(':');
            if (colonPos != std::string::npos) {
                action = key.substr(0, colonPos);
                target = key.substr(colonPos + 1);
            } else {
                action = key;
            }
            
            // Apply action
            if (action == "title") {
                customizedSyllabus.title = value;
            } else if (action == "description") {
                customizedSyllabus.description = value;
            } else if (action == "version") {
                customizedSyllabus.version = value;
            } else if (action == "author") {
                customizedSyllabus.author = value;
            } else if (action == "organization") {
                customizedSyllabus.organization = value;
            } else if (action == "remove_module" && !target.empty()) {
                // Remove module
                customizedSyllabus.modules.erase(
                    std::remove_if(
                        customizedSyllabus.modules.begin(),
                        customizedSyllabus.modules.end(),
                        [&target](const SyllabusModule& module) { return module.id == target; }
                    ),
                    customizedSyllabus.modules.end()
                );
            } else if (action == "remove_lesson" && !target.empty()) {
                // Remove lesson
                customizedSyllabus.lessons.erase(target);
            } else if (action == "remove_exercise" && !target.empty()) {
                // Remove exercise
                customizedSyllabus.exercises.erase(target);
            } else if (action == "add_module" && !value.empty()) {
                // Parse module data from JSON
                try {
                    json moduleData = json::parse(value);
                    SyllabusModule module;
                    module.id = moduleData.value("id", "module-" + std::to_string(customizedSyllabus.modules.size() + 1));
                    module.title = moduleData.value("title", "New Module");
                    module.description = moduleData.value("description", "");
                    module.sequenceNumber = moduleData.value("sequenceNumber", static_cast<int>(customizedSyllabus.modules.size() + 1));
                    
                    if (moduleData.contains("prerequisites") && moduleData["prerequisites"].is_array()) {
                        for (const auto& prereq : moduleData["prerequisites"]) {
                            module.prerequisites.push_back(prereq);
                        }
                    }
                    
                    if (moduleData.contains("objectives") && moduleData["objectives"].is_array()) {
                        for (const auto& obj : moduleData["objectives"]) {
                            module.objectives.push_back(obj);
                        }
                    }
                    
                    if (moduleData.contains("lessons") && moduleData["lessons"].is_array()) {
                        for (const auto& lesson : moduleData["lessons"]) {
                            module.lessons.push_back(lesson);
                        }
                    }
                    
                    module.estimatedDuration = moduleData.value("estimatedDuration", 0);
                    
                    customizedSyllabus.modules.push_back(module);
                } catch (const json::exception& e) {
                    Core::Logger::error("Failed to parse module JSON: {}", e.what());
                }
            } else if (action == "add_lesson" && !value.empty() && !target.empty()) {
                // Parse lesson data from JSON and add to specified module
                try {
                    json lessonData = json::parse(value);
                    SyllabusLesson lesson;
                    lesson.id = lessonData.value("id", "lesson-" + std::to_string(customizedSyllabus.lessons.size() + 1));
                    lesson.title = lessonData.value("title", "New Lesson");
                    lesson.description = lessonData.value("description", "");
                    lesson.sequenceNumber = lessonData.value("sequenceNumber", 1);
                    lesson.moduleId = target;
                    
                    if (lessonData.contains("objectives") && lessonData["objectives"].is_array()) {
                        for (const auto& obj : lessonData["objectives"]) {
                            lesson.objectives.push_back(obj);
                        }
                    }
                    
                    if (lessonData.contains("exercises") && lessonData["exercises"].is_array()) {
                        for (const auto& exercise : lessonData["exercises"]) {
                            lesson.exercises.push_back(exercise);
                        }
                    }
                    
                    std::string envStr = lessonData.value("environment", "CLASSROOM");
                    if (envStr == "CLASSROOM") lesson.environment = TrainingEnvironment::CLASSROOM;
                    else if (envStr == "SIMULATOR") lesson.environment = TrainingEnvironment::SIMULATOR;
                    else if (envStr == "AIRCRAFT") lesson.environment = TrainingEnvironment::AIRCRAFT;
                    else if (envStr == "CBT") lesson.environment = TrainingEnvironment::CBT;
                    else if (envStr == "BRIEFING") lesson.environment = TrainingEnvironment::BRIEFING;
                    else lesson.environment = TrainingEnvironment::OTHER;
                    
                    lesson.estimatedDuration = lessonData.value("estimatedDuration", 0);
                    
                    // Add lesson to syllabus
                    customizedSyllabus.lessons[lesson.id] = lesson;
                    
                    // Add lesson to module
                    for (auto& module : customizedSyllabus.modules) {
                        if (module.id == target) {
                            module.lessons.push_back(lesson.id);
                            break;
                        }
                    }
                } catch (const json::exception& e) {
                    Core::Logger::error("Failed to parse lesson JSON: {}", e.what());
                }
            } else if (action == "add_exercise" && !value.empty() && !target.empty()) {
                // Parse exercise data from JSON and add to specified lesson
                try {
                    json exerciseData = json::parse(value);
                    SyllabusExercise exercise;
                    exercise.id = exerciseData.value("id", "exercise-" + std::to_string(customizedSyllabus.exercises.size() + 1));
                    exercise.title = exerciseData.value("title", "New Exercise");
                    exercise.description = exerciseData.value("description", "");
                    exercise.sequenceNumber = exerciseData.value("sequenceNumber", 1);
                    exercise.lessonId = target;
                    
                    if (exerciseData.contains("objectives") && exerciseData["objectives"].is_array()) {
                        for (const auto& obj : exerciseData["objectives"]) {
                            exercise.objectives.push_back(obj);
                        }
                    }
                    
                    exercise.procedure = exerciseData.value("procedure", "");
                    
                    if (exerciseData.contains("resources") && exerciseData["resources"].is_array()) {
                        for (const auto& resource : exerciseData["resources"]) {
                            exercise.resources.push_back(resource);
                        }
                    }
                    
                    std::string envStr = exerciseData.value("environment", "CLASSROOM");
                    if (envStr == "CLASSROOM") exercise.environment = TrainingEnvironment::CLASSROOM;
                    else if (envStr == "SIMULATOR") exercise.environment = TrainingEnvironment::SIMULATOR;
                    else if (envStr == "AIRCRAFT") exercise.environment = TrainingEnvironment::AIRCRAFT;
                    else if (envStr == "CBT") exercise.environment = TrainingEnvironment::CBT;
                    else if (envStr == "BRIEFING") exercise.environment = TrainingEnvironment::BRIEFING;
                    else exercise.environment = TrainingEnvironment::OTHER;
                    
                    exercise.estimatedDuration = exerciseData.value("estimatedDuration", 0);
                    exercise.assessmentCriteria = exerciseData.value("assessmentCriteria", "");
                    
                    // Add exercise to syllabus
                    customizedSyllabus.exercises[exercise.id] = exercise;
                    
                    // Add exercise to lesson
                    auto lessonIt = customizedSyllabus.lessons.find(target);
                    if (lessonIt != customizedSyllabus.lessons.end()) {
                        lessonIt->second.exercises.push_back(exercise.id);
                    }
                } catch (const json::exception& e) {
                    Core::Logger::error("Failed to parse exercise JSON: {}", e.what());
                }
            }
        }
        
        // Update modification date
        auto now = std::chrono::system_clock::now();
        auto now_time_t = std::chrono::system_clock::to_time_t(now);
        std::stringstream ss;
        ss << std::put_time(std::localtime(&now_time_t), "%Y-%m-%d %H:%M:%S");
        customizedSyllabus.lastModifiedDate = ss.str();
        
        Core::Logger::info("Customized syllabus: {}", customizedSyllabus.title);
        return Core::Result<Syllabus>::success(customizedSyllabus);
    } catch (const std::exception& e) {
        Core::Logger::error("Failed to customize syllabus: {}", e.what());
        return Core::Result<Syllabus>::failure(
            Core::ErrorCode::CustomizationFailed,
            "Failed to customize syllabus: " + std::string(e.what())
        );
    }
}

Core::Result<void> SyllabusGenerator::exportSyllabus(
    const Syllabus& syllabus,
    const std::string& format,
    const std::string& outputPath) {
    
    try {
        std::string path = outputPath;
        
        // If output path is a directory, create a filename
        if (std::filesystem::is_directory(outputPath)) {
            std::string filename = syllabus.title;
            
            // Replace spaces and special characters
            std::regex nonAlphanumeric("[^a-zA-Z0-9]");
            filename = std::regex_replace(filename, nonAlphanumeric, "_");
            
            path = (std::filesystem::path(outputPath) / (filename + "." + format)).string();
        }
        
        // Export based on format
        if (format == "json") {
            // Convert syllabus to JSON
            json syllabusJson;
            
            // Basic metadata
            syllabusJson["id"] = syllabus.id;
            syllabusJson["title"] = syllabus.title;
            syllabusJson["description"] = syllabus.description;
            syllabusJson["version"] = syllabus.version;
            syllabusJson["author"] = syllabus.author;
            syllabusJson["organization"] = syllabus.organization;
            syllabusJson["createdDate"] = syllabus.createdDate;
            syllabusJson["lastModifiedDate"] = syllabus.lastModifiedDate;
            syllabusJson["regulatoryFramework"] = syllabus.regulatoryFramework;
            
            // Learning objectives
            syllabusJson["objectives"] = json::array();
            for (const auto& objective : syllabus.objectives) {
                json obj;
                obj["id"] = objective.id;
                obj["description"] = objective.description;
                obj["type"] = static_cast<int>(objective.type);
                obj["taxonomyLevel"] = objective.taxonomyLevel;
                obj["relatedRegulations"] = objective.relatedRegulations;
                obj["prerequisiteObjectives"] = objective.prerequisiteObjectives;
                obj["difficulty"] = objective.difficulty;
                obj["assessmentMethod"] = objective.assessmentMethod;
                
                syllabusJson["objectives"].push_back(obj);
            }
            
            // Competency areas
            syllabusJson["competencies"] = json::array();
            for (const auto& competency : syllabus.competencies) {
                json comp;
                comp["id"] = competency.id;
                comp["name"] = competency.name;
                comp["description"] = competency.description;
                comp["indicators"] = competency.indicators;
                comp["objectives"] = competency.objectives;
                comp["regulations"] = competency.regulations;
                
                syllabusJson["competencies"].push_back(comp);
            }
            
            // Regulatory requirements
            syllabusJson["regulations"] = json::array();
            for (const auto& regulation : syllabus.regulations) {
                json reg;
                reg["id"] = regulation.id;
                reg["authority"] = regulation.authority;
                reg["reference"] = regulation.reference;
                reg["description"] = regulation.description;
                reg["textContent"] = regulation.textContent;
                reg["mandatory"] = regulation.mandatory;
                reg["relatedObjectives"] = regulation.relatedObjectives;
                
                syllabusJson["regulations"].push_back(reg);
            }
            
            // Modules
            syllabusJson["modules"] = json::array();
            for (const auto& module : syllabus.modules) {
                json mod;
                mod["id"] = module.id;
                mod["title"] = module.title;
                mod["description"] = module.description;
                mod["sequenceNumber"] = module.sequenceNumber;
                mod["prerequisites"] = module.prerequisites;
                mod["objectives"] = module.objectives;
                mod["lessons"] = module.lessons;
                mod["estimatedDuration"] = module.estimatedDuration;
                
                syllabusJson["modules"].push_back(mod);
            }
            
            // Lessons
            syllabusJson["lessons"] = json::object();
            for (const auto& [id, lesson] : syllabus.lessons) {
                json les;
                les["id"] = lesson.id;
                les["title"] = lesson.title;
                les["description"] = lesson.description;
                les["sequenceNumber"] = lesson.sequenceNumber;
                les["moduleId"] = lesson.moduleId;
                les["objectives"] = lesson.objectives;
                les["exercises"] = lesson.exercises;
                les["environment"] = static_cast<int>(lesson.environment);
                les["estimatedDuration"] = lesson.estimatedDuration;
                
                syllabusJson["lessons"][id] = les;
            }
            
            // Exercises
            syllabusJson["exercises"] = json::object();
            for (const auto& [id, exercise] : syllabus.exercises) {
                json ex;
                ex["id"] = exercise.id;
                ex["title"] = exercise.title;
                ex["description"] = exercise.description;
                ex["sequenceNumber"] = exercise.sequenceNumber;
                ex["lessonId"] = exercise.lessonId;
                ex["objectives"] = exercise.objectives;
                ex["procedure"] = exercise.procedure;
                ex["resources"] = exercise.resources;
                ex["environment"] = static_cast<int>(exercise.environment);
                ex["estimatedDuration"] = exercise.estimatedDuration;
                ex["assessmentCriteria"] = exercise.assessmentCriteria;
                
                syllabusJson["exercises"][id] = ex;
            }
            
            // Additional metadata
            syllabusJson["metadata"] = syllabus.metadata;
            
            // Write to file
            std::ofstream outFile(path);
            if (!outFile.is_open()) {
                return Core::Result<void>::failure(
                    Core::ErrorCode::FileWriteFailed,
                    "Failed to open output file: " + path
                );
            }
            
            outFile << std::setw(4) << syllabusJson << std::endl;
            outFile.close();
        } else if (format == "xml") {
            // Create XML document
            XMLDocument doc;
            
            // Root element
            XMLElement* rootElement = doc.NewElement("Syllabus");
            rootElement->SetAttribute("id", syllabus.id.c_str());
            rootElement->SetAttribute("version", syllabus.version.c_str());
            doc.InsertEndChild(rootElement);
            
            // Metadata
            XMLElement* metaElement = doc.NewElement("Metadata");
            rootElement->InsertEndChild(metaElement);
            
            XMLElement* titleElement = doc.NewElement("Title");
            titleElement->SetText(syllabus.title.c_str());
            metaElement->InsertEndChild(titleElement);
            
            XMLElement* descElement = doc.NewElement("Description");
            descElement->SetText(syllabus.description.c_str());
            metaElement->InsertEndChild(descElement);
            
            XMLElement* authorElement = doc.NewElement("Author");
            authorElement->SetText(syllabus.author.c_str());
            metaElement->InsertEndChild(authorElement);
            
            XMLElement* orgElement = doc.NewElement("Organization");
            orgElement->SetText(syllabus.organization.c_str());
            metaElement->InsertEndChild(orgElement);
            
            XMLElement* createdElement = doc.NewElement("CreatedDate");
            createdElement->SetText(syllabus.createdDate.c_str());
            metaElement->InsertEndChild(createdElement);
            
            XMLElement* modifiedElement = doc.NewElement("LastModifiedDate");
            modifiedElement->SetText(syllabus.lastModifiedDate.c_str());
            metaElement->InsertEndChild(modifiedElement);
            
            XMLElement* frameworkElement = doc.NewElement("RegulatoryFramework");
            frameworkElement->SetText(syllabus.regulatoryFramework.c_str());
            metaElement->InsertEndChild(frameworkElement);
            
            // Objectives
            XMLElement* objectivesElement = doc.NewElement("LearningObjectives");
            rootElement->InsertEndChild(objectivesElement);
            
            for (const auto& objective : syllabus.objectives) {
                XMLElement* objElement = doc.NewElement("Objective");
                objElement->SetAttribute("id", objective.id.c_str());
                objElement->SetAttribute("type", static_cast<int>(objective.type));
                
                XMLElement* objDescElement = doc.NewElement("Description");
                objDescElement->SetText(objective.description.c_str());
                objElement->InsertEndChild(objDescElement);
                
                XMLElement* objTaxElement = doc.NewElement("TaxonomyLevel");
                objTaxElement->SetText(objective.taxonomyLevel.c_str());
                objElement->InsertEndChild(objTaxElement);
                
                XMLElement* objDiffElement = doc.NewElement("Difficulty");
                objDiffElement->SetText(objective.difficulty);
                objElement->InsertEndChild(objDiffElement);
                
                XMLElement* objAssessElement = doc.NewElement("AssessmentMethod");
                objAssessElement->SetText(objective.assessmentMethod.c_str());
                objElement->InsertEndChild(objAssessElement);
                
                if (!objective.relatedRegulations.empty()) {
                    XMLElement* objRegsElement = doc.NewElement("RelatedRegulations");
                    objElement->InsertEndChild(objRegsElement);
                    
                    for (const auto& reg : objective.relatedRegulations) {
                        XMLElement* regElement = doc.NewElement("Regulation");
                        regElement->SetAttribute("id", reg.c_str());
                        objRegsElement->InsertEndChild(regElement);
                    }
                }
                
                if (!objective.prerequisiteObjectives.empty()) {
                    XMLElement* objPrereqsElement = doc.NewElement("Prerequisites");
                    objElement->InsertEndChild(objPrereqsElement);
                    
                    for (const auto& prereq : objective.prerequisiteObjectives) {
                        XMLElement* prereqElement = doc.NewElement("Prerequisite");
                        prereqElement->SetAttribute("id", prereq.c_str());
                        objPrereqsElement->InsertEndChild(prereqElement);
                    }
                }
                
                objectivesElement->InsertEndChild(objElement);
            }
            
            // Modules
            XMLElement* modulesElement = doc.NewElement("Modules");
            rootElement->InsertEndChild(modulesElement);
            
            for (const auto& module : syllabus.modules) {
                XMLElement* modElement = doc.NewElement("Module");
                modElement->SetAttribute("id", module.id.c_str());
                modElement->SetAttribute("sequenceNumber", module.sequenceNumber);
                
                XMLElement* modTitleElement = doc.NewElement("Title");
                modTitleElement->SetText(module.title.c_str());
                modElement->InsertEndChild(modTitleElement);
                
                XMLElement* modDescElement = doc.NewElement("Description");
                modDescElement->SetText(module.description.c_str());
                modElement->InsertEndChild(modDescElement);
                
                XMLElement* modDurElement = doc.NewElement("EstimatedDuration");
                modDurElement->SetText(module.estimatedDuration);
                modElement->InsertEndChild(modDurElement);
                
                if (!module.objectives.empty()) {
                    XMLElement* modObjsElement = doc.NewElement("Objectives");
                    modElement->InsertEndChild(modObjsElement);
                    
                    for (const auto& obj : module.objectives) {
                        XMLElement* objElement = doc.NewElement("Objective");
                        objElement->SetAttribute("id", obj.c_str());
                        modObjsElement->InsertEndChild(objElement);
                    }
                }
                
                if (!module.lessons.empty()) {
                    XMLElement* modLessonsElement = doc.NewElement("Lessons");
                    modElement->InsertEndChild(modLessonsElement);
                    
                    for (const auto& lesson : module.lessons) {
                        XMLElement* lessonElement = doc.NewElement("Lesson");
                        lessonElement->SetAttribute("id", lesson.c_str());
                        modLessonsElement->InsertEndChild(lessonElement);
                    }
                }
                
                modulesElement->InsertEndChild(modElement);
            }
            
            // Lessons
            XMLElement* lessonsElement = doc.NewElement("Lessons");
            rootElement->InsertEndChild(lessonsElement);
            
            for (const auto& [id, lesson] : syllabus.lessons) {
                XMLElement* lesElement = doc.NewElement("Lesson");
                lesElement->SetAttribute("id", lesson.id.c_str());
                lesElement->SetAttribute("sequenceNumber", lesson.sequenceNumber);
                lesElement->SetAttribute("moduleId", lesson.moduleId.c_str());
                
                XMLElement* lesTitleElement = doc.NewElement("Title");
                lesTitleElement->SetText(lesson.title.c_str());
                lesElement->InsertEndChild(lesTitleElement);
                
                XMLElement* lesDescElement = doc.NewElement("Description");
                lesDescElement->SetText(lesson.description.c_str());
                lesElement->InsertEndChild(lesDescElement);
                
                XMLElement* lesEnvElement = doc.NewElement("Environment");
                lesEnvElement->SetText(static_cast<int>(lesson.environment));
                lesElement->InsertEndChild(lesEnvElement);
                
                XMLElement* lesDurElement = doc.NewElement("EstimatedDuration");
                lesDurElement->SetText(lesson.estimatedDuration);
                lesElement->InsertEndChild(lesDurElement);
                
                if (!lesson.objectives.empty()) {
                    XMLElement* lesObjsElement = doc.NewElement("Objectives");
                    lesElement->InsertEndChild(lesObjsElement);
                    
                    for (const auto& obj : lesson.objectives) {
                        XMLElement* objElement = doc.NewElement("Objective");
                        objElement->SetAttribute("id", obj.c_str());
                        lesObjsElement->InsertEndChild(objElement);
                    }
                }
                
                if (!lesson.exercises.empty()) {
                    XMLElement* lesExsElement = doc.NewElement("Exercises");
                    lesElement->InsertEndChild(lesExsElement);
                    
                    for (const auto& exercise : lesson.exercises) {
                        XMLElement* exElement = doc.NewElement("Exercise");
                        exElement->SetAttribute("id", exercise.c_str());
                        lesExsElement->InsertEndChild(exElement);
                    }
                }
                
                lessonsElement->InsertEndChild(lesElement);
            }
            
            // Exercises
            XMLElement* exercisesElement = doc.NewElement("Exercises");
            rootElement->InsertEndChild(exercisesElement);
            
            for (const auto& [id, exercise] : syllabus.exercises) {
                XMLElement* exElement = doc.NewElement("Exercise");
                exElement->SetAttribute("id", exercise.id.c_str());
                exElement->SetAttribute("sequenceNumber", exercise.sequenceNumber);
                exElement->SetAttribute("lessonId", exercise.lessonId.c_str());
                
                XMLElement* exTitleElement = doc.NewElement("Title");
                exTitleElement->SetText(exercise.title.c_str());
                exElement->InsertEndChild(exTitleElement);
                
                XMLElement* exDescElement = doc.NewElement("Description");
                exDescElement->SetText(exercise.description.c_str());
                exElement->InsertEndChild(exDescElement);
                
                XMLElement* exEnvElement = doc.NewElement("Environment");
                exEnvElement->SetText(static_cast<int>(exercise.environment));
                exElement->InsertEndChild(exEnvElement);
                
                XMLElement* exDurElement = doc.NewElement("EstimatedDuration");
                exDurElement->SetText(exercise.estimatedDuration);
                exElement->InsertEndChild(exDurElement);
                
                XMLElement* exProcElement = doc.NewElement("Procedure");
                exProcElement->SetText(exercise.procedure.c_str());
                exElement->InsertEndChild(exProcElement);
                
                XMLElement* exAssessElement = doc.NewElement("AssessmentCriteria");
                exAssessElement->SetText(exercise.assessmentCriteria.c_str());
                exElement->InsertEndChild(exAssessElement);
                
                if (!exercise.objectives.empty()) {
                    XMLElement* exObjsElement = doc.NewElement("Objectives");
                    exElement->InsertEndChild(exObjsElement);
                    
                    for (const auto& obj : exercise.objectives) {
                        XMLElement* objElement = doc.NewElement("Objective");
                        objElement->SetAttribute("id", obj.c_str());
                        exObjsElement->InsertEndChild(objElement);
                    }
                }
                
                if (!exercise.resources.empty()) {
                    XMLElement* exResElement = doc.NewElement("Resources");
                    exElement->InsertEndChild(exResElement);
                    
                    for (const auto& resource : exercise.resources) {
                        XMLElement* resElement = doc.NewElement("Resource");
                        resElement->SetText(resource.c_str());
                        exResElement->InsertEndChild(resElement);
                    }
                }
                
                exercisesElement->InsertEndChild(exElement);
            }
            
            // Save XML document
            XMLError result = doc.SaveFile(path.c_str());
            if (result != XML_SUCCESS) {
                return Core::Result<void>::failure(
                    Core::ErrorCode::FileWriteFailed,
                    "Failed to write XML file: " + path
                );
            }
        } else if (format == "html") {
            // Simple HTML export
            std::ofstream outFile(path);
            if (!outFile.is_open()) {
                return Core::Result<void>::failure(
                    Core::ErrorCode::FileWriteFailed,
                    "Failed to open output file: " + path
                );
            }
            
            // Write HTML header
            outFile << "<!DOCTYPE html>\n"
                    << "<html>\n"
                    << "<head>\n"
                    << "  <title>" << syllabus.title << "</title>\n"
                    << "  <style>\n"
                    << "    body { font-family: Arial, sans-serif; margin: 20px; }\n"
                    << "    h1, h2, h3, h4 { color: #333; }\n"
                    << "    .module { margin-bottom: 20px; border: 1px solid #ddd; padding: 10px; }\n"
                    << "    .lesson { margin: 10px 0; margin-left: 20px; border: 1px solid #eee; padding: 10px; }\n"
                    << "    .exercise { margin: 10px 0; margin-left: 40px; border: 1px solid #f0f0f0; padding: 10px; }\n"
                    << "    .metadata { color: #666; font-size: 0.9em; }\n"
                    << "  </style>\n"
                    << "</head>\n"
                    << "<body>\n"
                    << "  <h1>" << syllabus.title << "</h1>\n"
                    << "  <div class=\"metadata\">\n"
                    << "    <p><strong>Version:</strong> " << syllabus.version << "</p>\n"
                    << "    <p><strong>Author:</strong> " << syllabus.author << "</p>\n"
                    << "    <p><strong>Organization:</strong> " << syllabus.organization << "</p>\n"
                    << "    <p><strong>Created:</strong> " << syllabus.createdDate << "</p>\n"
                    << "    <p><strong>Last Modified:</strong> " << syllabus.lastModifiedDate << "</p>\n"
                    << "    <p><strong>Regulatory Framework:</strong> " << syllabus.regulatoryFramework << "</p>\n"
                    << "  </div>\n"
                    << "  <h2>Description</h2>\n"
                    << "  <p>" << syllabus.description << "</p>\n";
            
            // Modules
            outFile << "  <h2>Modules</h2>\n";
            
            // Sort modules by sequence number
            std::vector<SyllabusModule> sortedModules = syllabus.modules;
            std::sort(sortedModules.begin(), sortedModules.end(),
                [](const SyllabusModule& a, const SyllabusModule& b) {
                    return a.sequenceNumber < b.sequenceNumber;
                });
            
            for (const auto& module : sortedModules) {
                outFile << "  <div class=\"module\">\n"
                        << "    <h3>" << module.sequenceNumber << ". " << module.title << "</h3>\n"
                        << "    <p>" << module.description << "</p>\n"
                        << "    <p><strong>Duration:</strong> " << module.estimatedDuration << " minutes</p>\n";
                
                // Objectives
                if (!module.objectives.empty()) {
                    outFile << "    <h4>Learning Objectives</h4>\n"
                            << "    <ul>\n";
                    
                    for (const auto& objId : module.objectives) {
                        // Find objective by ID
                        auto it = std::find_if(syllabus.objectives.begin(), syllabus.objectives.end(),
                            [&objId](const LearningObjective& obj) { return obj.id == objId; });
                        
                        if (it != syllabus.objectives.end()) {
                            outFile << "      <li>" << it->description << "</li>\n";
                        } else {
                            outFile << "      <li>Objective ID: " << objId << "</li>\n";
                        }
                    }
                    
                    outFile << "    </ul>\n";
                }
                
                // Lessons
                if (!module.lessons.empty()) {
                    outFile << "    <h4>Lessons</h4>\n";
                    
                    // Find and sort lessons by sequence number
                    std::vector<std::reference_wrapper<const SyllabusLesson>> moduleLessons;
                    for (const auto& lessonId : module.lessons) {
                        auto it = syllabus.lessons.find(lessonId);
                        if (it != syllabus.lessons.end()) {
                            moduleLessons.push_back(std::cref(it->second));
                        }
                    }
                    
                    std::sort(moduleLessons.begin(), moduleLessons.end(),
                        [](const std::reference_wrapper<const SyllabusLesson>& a, 
                           const std::reference_wrapper<const SyllabusLesson>& b) {
                            return a.get().sequenceNumber < b.get().sequenceNumber;
                        });
                    
                    for (const auto& lessonRef : moduleLessons) {
                        const auto& lesson = lessonRef.get();
                        
                        // Environment string
                        std::string envStr;
                        switch (lesson.environment) {
                            case TrainingEnvironment::CLASSROOM: envStr = "Classroom"; break;
                            case TrainingEnvironment::SIMULATOR: envStr = "Simulator"; break;
                            case TrainingEnvironment::AIRCRAFT: envStr = "Aircraft"; break;
                            case TrainingEnvironment::CBT: envStr = "Computer-Based Training"; break;
                            case TrainingEnvironment::BRIEFING: envStr = "Briefing"; break;
                            case TrainingEnvironment::OTHER: envStr = "Other"; break;
                            default: envStr = "Unknown";
                        }
                        
                        outFile << "    <div class=\"lesson\">\n"
                                << "      <h4>" << module.sequenceNumber << "." << lesson.sequenceNumber 
                                << ". " << lesson.title << "</h4>\n"
                                << "      <p>" << lesson.description << "</p>\n"
                                << "      <p><strong>Environment:</strong> " << envStr << "</p>\n"
                                << "      <p><strong>Duration:</strong> " << lesson.estimatedDuration << " minutes</p>\n";
                        
                        // Exercises
                        if (!lesson.exercises.empty()) {
                            outFile << "      <h5>Exercises</h5>\n";
                            
                            // Find and sort exercises by sequence number
                            std::vector<std::reference_wrapper<const SyllabusExercise>> lessonExercises;
                            for (const auto& exerciseId : lesson.exercises) {
                                auto it = syllabus.exercises.find(exerciseId);
                                if (it != syllabus.exercises.end()) {
                                    lessonExercises.push_back(std::cref(it->second));
                                }
                            }
                            
                            std::sort(lessonExercises.begin(), lessonExercises.end(),
                                [](const std::reference_wrapper<const SyllabusExercise>& a, 
                                  const std::reference_wrapper<const SyllabusExercise>& b) {
                                    return a.get().sequenceNumber < b.get().sequenceNumber;
                                });
                            
                            for (const auto& exerciseRef : lessonExercises) {
                                const auto& exercise = exerciseRef.get();
                                
                                // Environment string
                                std::string exEnvStr;
                                switch (exercise.environment) {
                                    case TrainingEnvironment::CLASSROOM: exEnvStr = "Classroom"; break;
                                    case TrainingEnvironment::SIMULATOR: exEnvStr = "Simulator"; break;
                                    case TrainingEnvironment::AIRCRAFT: exEnvStr = "Aircraft"; break;
                                    case TrainingEnvironment::CBT: exEnvStr = "Computer-Based Training"; break;
                                    case TrainingEnvironment::BRIEFING: exEnvStr = "Briefing"; break;
                                    case TrainingEnvironment::OTHER: exEnvStr = "Other"; break;
                                    default: exEnvStr = "Unknown";
                                }
                                
                                outFile << "      <div class=\"exercise\">\n"
                                        << "        <h5>" << module.sequenceNumber << "." << lesson.sequenceNumber 
                                        << "." << exercise.sequenceNumber << ". " << exercise.title << "</h5>\n"
                                        << "        <p>" << exercise.description << "</p>\n"
                                        << "        <p><strong>Environment:</strong> " << exEnvStr << "</p>\n"
                                        << "        <p><strong>Duration:</strong> " << exercise.estimatedDuration << " minutes</p>\n";
                                
                                if (!exercise.procedure.empty()) {
                                    outFile << "        <h6>Procedure</h6>\n"
                                            << "        <p>" << exercise.procedure << "</p>\n";
                                }
                                
                                if (!exercise.assessmentCriteria.empty()) {
                                    outFile << "        <h6>Assessment Criteria</h6>\n"
                                            << "        <p>" << exercise.assessmentCriteria << "</p>\n";
                                }
                                
                                outFile << "      </div>\n";
                            }
                        }
                        
                        outFile << "    </div>\n";
                    }
                }
                
                outFile << "  </div>\n";
            }
            
            // HTML footer
            outFile << "</body>\n"
                    << "</html>\n";
            
            outFile.close();
        } else {
            return Core::Result<void>::failure(
                Core::ErrorCode::UnsupportedFormat,
                "Unsupported export format: " + format
            );
        }
        
        Core::Logger::info("Exported syllabus to {}", path);
        return Core::Result<void>::success();
    } catch (const std::exception& e) {
        Core::Logger::error("Failed to export syllabus: {}", e.what());
        return Core::Result<void>::failure(
            Core::ErrorCode::ExportFailed,
            "Failed to export syllabus: " + std::string(e.what())
        );
    }
}

Core::Result<std::unordered_map<std::string, std::string>> SyllabusGenerator::validateSyllabus(
    const Syllabus& syllabus) {
    
    try {
        std::unordered_map<std::string, std::string> results;
        
        // Validate structural integrity
        if (!validateStructuralIntegrity(syllabus, results)) {
            return Core::Result<std::unordered_map<std::string, std::string>>::success(results);
        }
        
        // Validate objective coverage
        if (!validateObjectiveCoverage(syllabus, results)) {
            return Core::Result<std::unordered_map<std::string, std::string>>::success(results);
        }
        
        // Validate regulatory coverage
        if (!validateRegulatoryCoverage(syllabus, results)) {
            return Core::Result<std::unordered_map<std::string, std::string>>::success(results);
        }
        
        // If we get here, no issues were found
        if (results.empty()) {
            results["overall"] = "Syllabus validation passed with no issues.";
        }
        
        Core::Logger::info("Validated syllabus: {}", syllabus.title);
        return Core::Result<std::unordered_map<std::string, std::string>>::success(results);
    } catch (const std::exception& e) {
        Core::Logger::error("Failed to validate syllabus: {}", e.what());
        return Core::Result<std::unordered_map<std::string, std::string>>::failure(
            Core::ErrorCode::ValidationFailed,
            "Failed to validate syllabus: " + std::string(e.what())
        );
    }
}

Core::Result<std::string> SyllabusGenerator::addLearningObjective(const LearningObjective& objective) {
    try {
        // Generate an ID if not provided
        std::string id = objective.id;
        if (id.empty()) {
            id = "obj-" + std::to_string(std::chrono::system_clock::now().time_since_epoch().count());
        }
        
        Core::Logger::info("Added learning objective: {}", id);
        return Core::Result<std::string>::success(id);
    } catch (const std::exception& e) {
        Core::Logger::error("Failed to add learning objective: {}", e.what());
        return Core::Result<std::string>::failure(
            Core::ErrorCode::CreationFailed,
            "Failed to add learning objective: " + std::string(e.what())
        );
    }
}

Core::Result<std::string> SyllabusGenerator::addCompetencyArea(const CompetencyArea& competency) {
    try {
        // Generate an ID if not provided
        std::string id = competency.id;
        if (id.empty()) {
            id = "comp-" + std::to_string(std::chrono::system_clock::now().time_since_epoch().count());
        }
        
        Core::Logger::info("Added competency area: {}", id);
        return Core::Result<std::string>::success(id);
    } catch (const std::exception& e) {
        Core::Logger::error("Failed to add competency area: {}", e.what());
        return Core::Result<std::string>::failure(
            Core::ErrorCode::CreationFailed,
            "Failed to add competency area: " + std::string(e.what())
        );
    }
}

Core::Result<std::string> SyllabusGenerator::addRegulatoryRequirement(const RegulatoryRequirement& requirement) {
    try {
        // Generate an ID if not provided
        std::string id = requirement.id;
        if (id.empty()) {
            id = "reg-" + std::to_string(std::chrono::system_clock::now().time_since_epoch().count());
        }
        
        Core::Logger::info("Added regulatory requirement: {}", id);
        return Core::Result<std::string>::success(id);
    } catch (const std::exception& e) {
        Core::Logger::error("Failed to add regulatory requirement: {}", e.what());
        return Core::Result<std::string>::failure(
            Core::ErrorCode::CreationFailed,
            "Failed to add regulatory requirement: " + std::string(e.what())
        );
    }
}

// Private methods

std::vector<LearningObjective> SyllabusGenerator::extractObjectivesFromDocument(const Document::ProcessingResult& result) {
    std::vector<LearningObjective> objectives;
    
    // Extract from structured content
    for (const auto& objective : result.trainingElements.learningObjectives) {
        LearningObjective newObj;
        newObj.id = objective.id;
        newObj.description = objective.description;
        
        // Determine objective type (simplified)
        if (objective.description.find("knowledge") != std::string::npos ||
            objective.description.find("understand") != std::string::npos ||
            objective.description.find("identify") != std::string::npos) {
            newObj.type = ObjectiveType::KNOWLEDGE;
        } else if (objective.description.find("attitude") != std::string::npos ||
                  objective.description.find("value") != std::string::npos ||
                  objective.description.find("appreciate") != std::string::npos) {
            newObj.type = ObjectiveType::ATTITUDE;
        } else {
            newObj.type = ObjectiveType::SKILL;
        }
        
        // Determine taxonomy level (simplified)
        if (objective.description.find("analyze") != std::string::npos ||
            objective.description.find("evaluate") != std::string::npos) {
            newObj.taxonomyLevel = "Analyze";
        } else if (objective.description.find("apply") != std::string::npos ||
                  objective.description.find("demonstrate") != std::string::npos ||
                  objective.description.find("perform") != std::string::npos) {
            newObj.taxonomyLevel = "Apply";
        } else if (objective.description.find("create") != std::string::npos ||
                  objective.description.find("design") != std::string::npos ||
                  objective.description.find("develop") != std::string::npos) {
            newObj.taxonomyLevel = "Create";
        } else {
            newObj.taxonomyLevel = "Understand";
        }
        
        // Add related regulations
        for (const auto& reg : objective.relatedRegulations) {
            newObj.relatedRegulations.push_back(reg);
        }
        
        // Add prerequisites
        for (const auto& prereq : objective.prerequisites) {
            newObj.prerequisiteObjectives.push_back(prereq);
        }
        
        // Assign difficulty (simplified)
        newObj.difficulty = objective.importance > 0.8 ? 5 : 
                          objective.importance > 0.6 ? 4 :
                          objective.importance > 0.4 ? 3 :
                          objective.importance > 0.2 ? 2 : 1;
        
        // Determine assessment method (simplified)
        if (newObj.type == ObjectiveType::KNOWLEDGE) {
            newObj.assessmentMethod = "Written test";
        } else if (newObj.type == ObjectiveType::SKILL) {
            newObj.assessmentMethod = "Performance demonstration";
        } else {
            newObj.assessmentMethod = "Observation";
        }
        
        objectives.push_back(newObj);
    }
    
    // If AI extraction is enabled, use it for additional objectives
    if (_config.enableAIExtraction) {
        try {
            auto aiObjectives = extractObjectivesWithAI(result.content.rawText);
            if (aiObjectives.isSuccess()) {
                objectives.insert(objectives.end(), 
                                 aiObjectives.getValue().begin(), 
                                 aiObjectives.getValue().end());
            }
        } catch (const std::exception& e) {
            Core::Logger::error("AI extraction error: {}", e.what());
        }
    }
    
    return objectives;
}

std::vector<CompetencyArea> SyllabusGenerator::extractCompetenciesFromDocument(const Document::ProcessingResult& result) {
    std::vector<CompetencyArea> competencies;
    
    // Extract from document structure sections
    for (const auto& section : result.structure.sections) {
        // Look for competency sections
        if (section.title.find("Competenc") != std::string::npos ||
            section.title.find("Proficienc") != std::string::npos ||
            section.title.find("Skill") != std::string::npos) {
            
            CompetencyArea competency;
            competency.id = "comp-" + std::to_string(competencies.size() + 1);
            competency.name = section.title;
            competency.description = section.content;
            
            // Extract indicators from subsections
            for (const auto& subsection : section.subsections) {
                if (subsection.title.find("Indicator") != std::string::npos ||
                    subsection.title.find("Criteria") != std::string::npos ||
                    subsection.title.find("Standard") != std::string::npos) {
                    
                    // Parse content as indicators (simplified)
                    std::istringstream iss(subsection.content);
                    std::string line;
                    while (std::getline(iss, line)) {
                        // Remove leading/trailing whitespace
                        line.erase(0, line.find_first_not_of(" \t\r\n"));
                        line.erase(line.find_last_not_of(" \t\r\n") + 1);
                        
                        if (!line.empty()) {
                            competency.indicators.push_back(line);
                        }
                    }
                }
            }
            
            competencies.push_back(competency);
        }
    }
    
    // If AI extraction is enabled, use it for additional competencies
    if (_config.enableAIExtraction) {
        try {
            auto aiCompetencies = extractCompetenciesWithAI(result.content.rawText);
            if (aiCompetencies.isSuccess()) {
                competencies.insert(competencies.end(), 
                                   aiCompetencies.getValue().begin(), 
                                   aiCompetencies.getValue().end());
            }
        } catch (const std::exception& e) {
            Core::Logger::error("AI extraction error: {}", e.what());
        }
    }
    
    return competencies;
}

std::vector<RegulatoryRequirement> SyllabusGenerator::extractRegulationsFromDocument(const Document::ProcessingResult& result) {
    std::vector<RegulatoryRequirement> regulations;
    
    // Extract from document structure sections
    for (const auto& section : result.structure.sections) {
        // Look for regulatory sections
        if (section.title.find("Regulation") != std::string::npos ||
            section.title.find("Requirement") != std::string::npos ||
            section.title.find("Compliance") != std::string::npos) {
            
            RegulatoryRequirement regulation;
            regulation.id = "reg-" + std::to_string(regulations.size() + 1);
            
            // Determine authority from metadata
            regulation.authority = result.content.metadata.find("regulator") != result.content.metadata.end() ?
                                  result.content.metadata.at("regulator") : _config.defaultRegulator;
            
            // Extract reference from title (simplified)
            std::regex refRegex(R"((\w+\s*\d+(\.\d+)*)|(Part\s*\d+))");
            std::smatch match;
            if (std::regex_search(section.title, match, refRegex)) {
                regulation.reference = match[0];
            } else {
                regulation.reference = section.title;
            }
            
            regulation.description = section.title;
            regulation.textContent = section.content;
            regulation.mandatory = true; // Assume all extracted regulations are mandatory
            
            regulations.push_back(regulation);
        }
    }
    
    // Extract from regulatory references in document
    for (const auto& [reference, citations] : result.structure.regulatoryReferences) {
        RegulatoryRequirement regulation;
        regulation.id = "reg-" + std::to_string(regulations.size() + 1);
        regulation.authority = result.content.metadata.find("regulator") != result.content.metadata.end() ?
                              result.content.metadata.at("regulator") : _config.defaultRegulator;
        regulation.reference = reference;
        regulation.description = reference;
        
        // Combine citations as text content
        std::ostringstream citationText;
        for (const auto& citation : citations) {
            citationText << citation << "\n\n";
        }
        regulation.textContent = citationText.str();
        regulation.mandatory = true; // Assume all extracted regulations are mandatory
        
        regulations.push_back(regulation);
    }
    
    // If AI extraction is enabled, use it for additional regulations
    if (_config.enableAIExtraction) {
        try {
            auto aiRegulations = extractRegulationsWithAI(result.content.rawText);
            if (aiRegulations.isSuccess()) {
                regulations.insert(regulations.end(), 
                                  aiRegulations.getValue().begin(), 
                                  aiRegulations.getValue().end());
            }
        } catch (const std::exception& e) {
            Core::Logger::error("AI extraction error: {}", e.what());
        }
    }
    
    return regulations;
}

void SyllabusGenerator::organizeModules(Syllabus& syllabus) {
    // Group objectives by category/topic
    std::unordered_map<std::string, std::vector<std::string>> objectiveGroups;
    
    // Simple grouping by keywords (would be more sophisticated in real implementation)
    std::vector<std::pair<std::string, std::vector<std::string>>> moduleKeywords = {
        {"Basic Aircraft Knowledge", {"aircraft", "system", "component", "instrument"}},
        {"Flight Fundamentals", {"basic", "fundamental", "principle", "aerodynamic"}},
        {"Takeoff and Landing", {"takeoff", "landing", "approach"}},
        {"Navigation", {"navigation", "route", "chart", "plan"}},
        {"Emergency Procedures", {"emergency", "abnormal", "failure", "malfunction"}},
        {"Advanced Maneuvers", {"advanced", "maneuver", "stall", "spin"}}
    };
    
    // Group objectives by module
    for (const auto& objective : syllabus.objectives) {
        std::string bestMatch;
        int bestMatchCount = 0;
        
        // Convert description to lowercase for comparison
        std::string lowerDesc = objective.description;
        std::transform(lowerDesc.begin(), lowerDesc.end(), lowerDesc.begin(), 
            [](unsigned char c) { return std::tolower(c); });
        
        // Find best match
        for (const auto& [module, keywords] : moduleKeywords) {
            int matchCount = 0;
            for (const auto& keyword : keywords) {
                if (lowerDesc.find(keyword) != std::string::npos) {
                    matchCount++;
                }
            }
            
            if (matchCount > bestMatchCount) {
                bestMatchCount = matchCount;
                bestMatch = module;
            }
        }
        
        // If no match found, put in "Other"
        if (bestMatch.empty()) {
            bestMatch = "Other";
        }
        
        objectiveGroups[bestMatch].push_back(objective.id);
    }
    
    // Create modules from groups
    int sequenceNumber = 1;
    for (const auto& [moduleName, objectiveIds] : objectiveGroups) {
        SyllabusModule module;
        module.id = "module-" + std::to_string(sequenceNumber);
        module.title = moduleName;
        module.description = "Module covering " + moduleName + " topics";
        module.sequenceNumber = sequenceNumber++;
        module.objectives = objectiveIds;
        module.estimatedDuration = objectiveIds.size() * 30; // Estimate 30 minutes per objective
        
        syllabus.modules.push_back(module);
    }
}

void SyllabusGenerator::organizeLessons(Syllabus& syllabus) {
    // Create lessons for each module
    for (auto& module : syllabus.modules) {
        // Group objectives for lessons (simplified)
        std::vector<std::vector<std::string>> lessonGroups;
        
        // Naive grouping - just split objectives into groups of 3
        const int objectivesPerLesson = 3;
        for (size_t i = 0; i < module.objectives.size(); i += objectivesPerLesson) {
            std::vector<std::string> group;
            for (size_t j = i; j < i + objectivesPerLesson && j < module.objectives.size(); j++) {
                group.push_back(module.objectives[j]);
            }
            lessonGroups.push_back(group);
        }
        
        // Create lessons from groups
        int sequenceNumber = 1;
        for (const auto& objectiveIds : lessonGroups) {
            SyllabusLesson lesson;
            lesson.id = module.id + "-lesson-" + std::to_string(sequenceNumber);
            
            // Generate lesson title
            if (objectiveIds.empty()) {
                lesson.title = module.title + " Lesson " + std::to_string(sequenceNumber);
            } else {
                // Find objective text for first objective
                auto it = std::find_if(syllabus.objectives.begin(), syllabus.objectives.end(),
                    [&objectiveIds](const LearningObjective& obj) { return obj.id == objectiveIds[0]; });
                
                if (it != syllabus.objectives.end()) {
                    // Take first few words as lesson title
                    std::istringstream iss(it->description);
                    std::vector<std::string> words;
                    std::string word;
                    int wordCount = 0;
                    while (iss >> word && wordCount++ < 5) {
                        words.push_back(word);
                    }
                    
                    lesson.title = "";
                    for (const auto& w : words) {
                        if (!lesson.title.empty()) {
                            lesson.title += " ";
                        }
                        lesson.title += w;
                    }
                    
                    if (!lesson.title.empty()) {
                        lesson.title += "...";
                    } else {
                        lesson.title = module.title + " Lesson " + std::to_string(sequenceNumber);
                    }
                } else {
                    lesson.title = module.title + " Lesson " + std::to_string(sequenceNumber);
                }
            }
            
            lesson.description = "Lesson covering " + lesson.title + " topics";
            lesson.sequenceNumber = sequenceNumber++;
            lesson.moduleId = module.id;
            lesson.objectives = objectiveIds;
            lesson.estimatedDuration = objectiveIds.size() * 30; // Estimate 30 minutes per objective
            
            // Determine environment based on objectives
            // Default to classroom, but use simulator or aircraft if keywords suggest it
            lesson.environment = TrainingEnvironment::CLASSROOM;
            
            for (const auto& objId : objectiveIds) {
                auto it = std::find_if(syllabus.objectives.begin(), syllabus.objectives.end(),
                    [&objId](const LearningObjective& obj) { return obj.id == objId; });
                
                if (it != syllabus.objectives.end()) {
                    std::string lowerDesc = it->description;
                    std::transform(lowerDesc.begin(), lowerDesc.end(), lowerDesc.begin(), 
                        [](unsigned char c) { return std::tolower(c); });
                    
                    if (lowerDesc.find("simulator") != std::string::npos || 
                        lowerDesc.find("fly") != std::string::npos ||
                        lowerDesc.find("perform") != std::string::npos ||
                        lowerDesc.find("demonstrate") != std::string::npos) {
                        lesson.environment = TrainingEnvironment::SIMULATOR;
                        break;
                    }
                    
                    if (lowerDesc.find("aircraft") != std::string::npos && 
                        (lowerDesc.find("actual") != std::string::npos || 
                         lowerDesc.find("real") != std::string::npos)) {
                        lesson.environment = TrainingEnvironment::AIRCRAFT;
                        break;
                    }
                }
            }
            
            // Add lesson to module
            module.lessons.push_back(lesson.id);
            
            // Add lesson to syllabus
            syllabus.lessons[lesson.id] = lesson;
        }
    }
}

void SyllabusGenerator::organizeExercises(Syllabus& syllabus) {
    // Create exercises for each lesson
    for (auto& [lessonId, lesson] : syllabus.lessons) {
        // Create one exercise per objective
        int sequenceNumber = 1;
        for (const auto& objId : lesson.objectives) {
            SyllabusExercise exercise;
            exercise.id = lessonId + "-exercise-" + std::to_string(sequenceNumber);
            
            // Find objective
            auto it = std::find_if(syllabus.objectives.begin(), syllabus.objectives.end(),
                [&objId](const LearningObjective& obj) { return obj.id == objId; });
            
            if (it != syllabus.objectives.end()) {
                exercise.title = it->description;
                
                // Determine exercise type based on objective
                std::string lowerDesc = it->description;
                std::transform(lowerDesc.begin(), lowerDesc.end(), lowerDesc.begin(), 
                    [](unsigned char c) { return std::tolower(c); });
                
                if (lowerDesc.find("describe") != std::string::npos || 
                    lowerDesc.find("explain") != std::string::npos ||
                    lowerDesc.find("identify") != std::string::npos) {
                    exercise.description = "Discussion exercise on " + it->description;
                    exercise.procedure = "1. Instructor introduction\n2. Group discussion\n3. Q&A session\n4. Summary";
                } else if (lowerDesc.find("demonstrate") != std::string::npos || 
                          lowerDesc.find("perform") != std::string::npos ||
                          lowerDesc.find("execute") != std::string::npos) {
                    exercise.description = "Practical exercise on " + it->description;
                    exercise.procedure = "1. Instructor demonstration\n2. Student practice\n3. Feedback\n4. Evaluation";
                } else {
                    exercise.description = "Exercise on " + it->description;
                    exercise.procedure = "1. Introduction\n2. Practice\n3. Assessment";
                }
            } else {
                exercise.title = "Exercise " + std::to_string(sequenceNumber);
                exercise.description = "Exercise related to lesson " + lesson.title;
                exercise.procedure = "1. Introduction\n2. Main activity\n3. Conclusion";
            }
            
            exercise.sequenceNumber = sequenceNumber++;
            exercise.lessonId = lessonId;
            exercise.objectives = {objId};
            exercise.environment = lesson.environment;
            exercise.estimatedDuration = 30; // Default 30 minutes per exercise
            
            // Assessment criteria based on objective
            if (it != syllabus.objectives.end()) {
                exercise.assessmentCriteria = "The student should be able to " + it->description + 
                                            " according to the standards.";
            } else {
                exercise.assessmentCriteria = "The student should be able to complete the exercise satisfactorily.";
            }
            
            // Add exercise to lesson
            lesson.exercises.push_back(exercise.id);
            
            // Add exercise to syllabus
            syllabus.exercises[exercise.id] = exercise;
        }
    }
}

Core::Result<std::vector<LearningObjective>> SyllabusGenerator::extractObjectivesWithAI(const std::string& documentContent) {
    // This would be implemented with actual AI integration in a real system
    // For this example, we'll return a simplified result
    
    std::vector<LearningObjective> objectives;
    
    // Simulate AI extraction with a few sample objectives
    LearningObjective obj1;
    obj1.id = "ai-obj-1";
    obj1.description = "Demonstrate proper use of flight controls during normal takeoff";
    obj1.type = ObjectiveType::SKILL;
    obj1.taxonomyLevel = "Apply";
    obj1.difficulty = 3;
    obj1.assessmentMethod = "Performance demonstration";
    
    LearningObjective obj2;
    obj2.id = "ai-obj-2";
    obj2.description = "Explain the aerodynamic principles affecting the aircraft during stall recovery";
    obj2.type = ObjectiveType::KNOWLEDGE;
    obj2.taxonomyLevel = "Understand";
    obj2.difficulty = 4;
    obj2.assessmentMethod = "Written test";
    
    LearningObjective obj3;
    obj3.id = "ai-obj-3";
    obj3.description = "Analyze the impact of weather conditions on flight planning decisions";
    obj3.type = ObjectiveType::SKILL;
    obj3.taxonomyLevel = "Analyze";
    obj3.difficulty = 4;
    obj3.assessmentMethod = "Case study";
    
    objectives.push_back(obj1);
    objectives.push_back(obj2);
    objectives.push_back(obj3);
    
    Core::Logger::debug("AI extraction simulated {} objectives", objectives.size());
    return Core::Result<std::vector<LearningObjective>>::success(objectives);
}

Core::Result<std::vector<CompetencyArea>> SyllabusGenerator::extractCompetenciesWithAI(const std::string& documentContent) {
    // This would be implemented with actual AI integration in a real system
    // For this example, we'll return a simplified result
    
    std::vector<CompetencyArea> competencies;
    
    // Simulate AI extraction with a few sample competencies
    CompetencyArea comp1;
    comp1.id = "ai-comp-1";
    comp1.name = "Aircraft Control";
    comp1.description = "Ability to maintain precise control of the aircraft throughout all phases of flight";
    comp1.indicators = {
        "Maintains altitude within ±100 feet",
        "Maintains heading within ±10 degrees",
        "Maintains airspeed within ±10 knots"
    };
    
    CompetencyArea comp2;
    comp2.id = "ai-comp-2";
    comp2.name = "Decision Making";
    comp2.description = "Ability to make sound decisions based on available information and changing conditions";
    comp2.indicators = {
        "Identifies potential issues before they become critical",
        "Evaluates multiple options before selecting course of action",
        "Adapts plan when conditions change"
    };
    
    competencies.push_back(comp1);
    competencies.push_back(comp2);
    
    Core::Logger::debug("AI extraction simulated {} competencies", competencies.size());
    return Core::Result<std::vector<CompetencyArea>>::success(competencies);
}

Core::Result<std::vector<RegulatoryRequirement>> SyllabusGenerator::extractRegulationsWithAI(const std::string& documentContent) {
    // This would be implemented with actual AI integration in a real system
    // For this example, we'll return a simplified result
    
    std::vector<RegulatoryRequirement> regulations;
    
    // Simulate AI extraction with a few sample regulations
    RegulatoryRequirement reg1;
    reg1.id = "ai-reg-1";
    reg1.authority = "FAA";
    reg1.reference = "14 CFR § 61.109";
    reg1.description = "Aeronautical experience for private pilot certificate";
    reg1.textContent = "A person who applies for a private pilot certificate must present logbook entries showing...";
    reg1.mandatory = true;
    
    RegulatoryRequirement reg2;
    reg2.id = "ai-reg-2";
    reg2.authority = "EASA";
    reg2.reference = "FCL.210";
    reg2.description = "Training course for private pilot license";
    reg2.textContent = "Applicants for a PPL shall complete a training course at an ATO...";
    reg2.mandatory = true;
    
    regulations.push_back(reg1);
    regulations.push_back(reg2);
    
    Core::Logger::debug("AI extraction simulated {} regulations", regulations.size());
    return Core::Result<std::vector<RegulatoryRequirement>>::success(regulations);
}

Core::Result<Syllabus> SyllabusGenerator::loadTemplate(const std::string& templatePath) {
    try {
        // Check if template file exists
        if (!std::filesystem::exists(templatePath)) {
            return Core::Result<Syllabus>::failure(
                Core::ErrorCode::FileNotFound,
                "Template file not found: " + templatePath
            );
        }
        
        // Determine template format
        std::string extension = std::filesystem::path(templatePath).extension().string();
        
        if (extension == ".json") {
            // Load JSON template
            std::ifstream file(templatePath);
            if (!file.is_open()) {
                return Core::Result<Syllabus>::failure(
                    Core::ErrorCode::FileOpenFailed,
                    "Failed to open template file: " + templatePath
                );
            }
            
            json templateJson;
            file >> templateJson;
            file.close();
            
            // Parse JSON into syllabus
            Syllabus syllabus;
            
            // Basic metadata
            syllabus.id = templateJson.value("id", "syllabus-template");
            syllabus.title = templateJson.value("title", "Syllabus Template");
            syllabus.description = templateJson.value("description", "");
            syllabus.version = templateJson.value("version", "1.0");
            syllabus.author = templateJson.value("author", "System");
            syllabus.organization = templateJson.value("organization", "Default Organization");
            
            // Set dates
            auto now = std::chrono::system_clock::now();
            auto now_time_t = std::chrono::system_clock::to_time_t(now);
            std::stringstream ss;
            ss << std::put_time(std::localtime(&now_time_t), "%Y-%m-%d %H:%M:%S");
            syllabus.createdDate = templateJson.value("createdDate", ss.str());
            syllabus.lastModifiedDate = ss.str();
            
            syllabus.regulatoryFramework = templateJson.value("regulatoryFramework", "");
            
            // Modules
            if (templateJson.contains("modules") && templateJson["modules"].is_array()) {
                for (const auto& modJson : templateJson["modules"]) {
                    SyllabusModule module;
                    module.id = modJson.value("id", "");
                    module.title = modJson.value("title", "");
                    module.description = modJson.value("description