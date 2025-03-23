// /backend/visualization/include/visualization/VisualizationService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <unordered_map>
#include <mutex>
#include "core/ConfigurationManager.h"
#include "database/DatabaseManager.h"
#include "document/DocumentManager.h"
#include "syllabus/SyllabusManager.h"
#include "assessment/AssessmentManager.h"
#include "visualization/VisualizationTypes.h"
#include "visualization/ScenarioGenerator.h"

namespace Visualization {

class VisualizationService {
public:
    VisualizationService(
        std::shared_ptr<Core::ConfigurationManager> config,
        std::shared_ptr<Database::DatabaseManager> dbManager,
        std::shared_ptr<Document::DocumentManager> docManager,
        std::shared_ptr<Syllabus::SyllabusManager> syllabusManager,
        std::shared_ptr<Assessment::AssessmentManager> assessmentManager
    );
    ~VisualizationService();
    
    // 3D Knowledge Map methods
    std::shared_ptr<KnowledgeMap> createKnowledgeMap(const std::string& syllabusId);
    std::shared_ptr<KnowledgeMap> getKnowledgeMap(const std::string& mapId);
    bool updateKnowledgeMap(const std::shared_ptr<KnowledgeMap>& map);
    bool deleteKnowledgeMap(const std::string& mapId);
    std::vector<std::shared_ptr<KnowledgeMap>> getUserKnowledgeMaps(const std::string& userId);
    
    // 3D Model management
    std::shared_ptr<AircraftModel> getAircraftModel(const std::string& aircraftType);
    std::vector<std::string> getAvailableAircraftModels();
    bool addAircraftModel(const std::shared_ptr<AircraftModel>& model);
    
    // Simulation visualization
    std::shared_ptr<SimulationScene> createSimulationScene(
        const std::string& name, 
        const std::string& aircraftType,
        const SceneEnvironment& environment
    );
    std::shared_ptr<SimulationScene> getSimulationScene(const std::string& sceneId);
    bool updateSimulationScene(const std::shared_ptr<SimulationScene>& scene);
    bool deleteSimulationScene(const std::string& sceneId);
    
    // AR content generation
    std::shared_ptr<ARContent> generateARContent(
        const std::string& documentId, 
        ARContentType contentType
    );
    std::shared_ptr<ARContent> getARContent(const std::string& contentId);
    bool updateARContent(const std::shared_ptr<ARContent>& content);
    bool deleteARContent(const std::string& contentId);
    
    // Performance visualization
    std::shared_ptr<PerformanceVisualization> createPerformanceVisualization(
        const std::string& assessmentId,
        VisualizationType visualizationType
    );
    std::vector<std::shared_ptr<PerformanceVisualization>> getTraineePerformanceVisualizations(
        const std::string& traineeId
    );
    
    // Interactive Scenario Generation
    std::shared_ptr<TrainingScenario> generateScenario(
        const std::string& syllabusId,
        const std::string& moduleId,
        ScenarioDifficulty difficulty
    );
    std::shared_ptr<TrainingScenario> getScenario(const std::string& scenarioId);
    bool updateScenario(const std::shared_ptr<TrainingScenario>& scenario);
    std::vector<std::shared_ptr<TrainingScenario>> getModuleScenarios(
        const std::string& moduleId
    );
    
    // Visualization data export
    std::string exportVisualizationToGLTF(const std::string& visualizationId);
    std::string exportVisualizationToFBX(const std::string& visualizationId);
    std::string exportVisualizationToJSON(const std::string& visualizationId);

private:
    std::shared_ptr<Core::ConfigurationManager> config_;
    std::shared_ptr<Database::DatabaseManager> dbManager_;
    std::shared_ptr<Document::DocumentManager> docManager_;
    std::shared_ptr<Syllabus::SyllabusManager> syllabusManager_;
    std::shared_ptr<Assessment::AssessmentManager> assessmentManager_;
    std::shared_ptr<ScenarioGenerator> scenarioGenerator_;
    
    // Cache management
    std::unordered_map<std::string, std::shared_ptr<KnowledgeMap>> knowledgeMapCache_;
    std::unordered_map<std::string, std::shared_ptr<AircraftModel>> aircraftModelCache_;
    std::unordered_map<std::string, std::shared_ptr<SimulationScene>> simulationSceneCache_;
    std::unordered_map<std::string, std::shared_ptr<ARContent>> arContentCache_;
    std::mutex cacheMutex_;
    
    // Helper methods
    std::shared_ptr<KnowledgeNode> createNodeFromSyllabusItem(const Syllabus::SyllabusItem& item);
    std::vector<KnowledgeLink> generateLinksForNodes(const std::vector<std::shared_ptr<KnowledgeNode>>& nodes);
    void refreshCaches();
};

} // namespace Visualization

// /backend/visualization/include/visualization/VisualizationTypes.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <optional>
#include <chrono>
#include <nlohmann/json.hpp>
#include <Eigen/Dense>

namespace Visualization {

// 3D coordinate type
using Vector3 = Eigen::Vector3f;
using Vector2 = Eigen::Vector2f;
using Quaternion = Eigen::Quaternionf;

// Knowledge Map types
enum class NodeType {
    OBJECTIVE,
    COMPETENCY,
    TOPIC,
    PROCEDURE,
    REGULATION,
    AIRCRAFT_SYSTEM
};

class KnowledgeNode {
public:
    std::string id;
    std::string label;
    std::string description;
    NodeType type;
    Vector3 position;
    float size;
    std::string color;
    std::unordered_map<std::string, std::string> metadata;
    
    nlohmann::json toJson() const;
    static std::shared_ptr<KnowledgeNode> fromJson(const nlohmann::json& json);
};

struct KnowledgeLink {
    std::string id;
    std::string sourceNodeId;
    std::string targetNodeId;
    std::string label;
    float strength;
    std::string color;
    
    nlohmann::json toJson() const;
    static KnowledgeLink fromJson(const nlohmann::json& json);
};

class KnowledgeMap {
public:
    std::string id;
    std::string name;
    std::string description;
    std::string creatorId;
    std::string syllabusId;
    std::chrono::system_clock::time_point createdAt;
    std::chrono::system_clock::time_point updatedAt;
    std::vector<std::shared_ptr<KnowledgeNode>> nodes;
    std::vector<KnowledgeLink> links;
    
    nlohmann::json toJson() const;
    static std::shared_ptr<KnowledgeMap> fromJson(const nlohmann::json& json);
};

// Aircraft Model types
class AircraftModel {
public:
    std::string id;
    std::string aircraftType;
    std::string manufacturer;
    std::string modelVersion;
    std::string modelPath;
    std::string texturesPath;
    std::vector<std::string> animationNames;
    std::unordered_map<std::string, std::string> systemModels;
    
    nlohmann::json toJson() const;
    static std::shared_ptr<AircraftModel> fromJson(const nlohmann::json& json);
};

// Simulation Scene types
enum class WeatherCondition {
    CLEAR,
    SCATTERED_CLOUDS,
    BROKEN_CLOUDS,
    OVERCAST,
    RAIN,
    THUNDERSTORM,
    SNOW,
    FOG
};

enum class TimeOfDay {
    DAWN,
    MORNING,
    NOON,
    AFTERNOON,
    DUSK,
    NIGHT,
    MIDNIGHT
};

struct SceneEnvironment {
    WeatherCondition weather;
    TimeOfDay timeOfDay;
    float visibility;
    float windSpeed;
    float windDirection;
    float temperature;
    float cloudBase;
    
    nlohmann::json toJson() const;
    static SceneEnvironment fromJson(const nlohmann::json& json);
};

class SimulationScene {
public:
    std::string id;
    std::string name;
    std::string description;
    std::string creatorId;
    std::string aircraftModelId;
    SceneEnvironment environment;
    std::string airportIcao;
    std::string runwayId;
    Vector3 initialPosition;
    Quaternion initialOrientation;
    float initialAltitude;
    float initialSpeed;
    std::chrono::system_clock::time_point createdAt;
    
    nlohmann::json toJson() const;
    static std::shared_ptr<SimulationScene> fromJson(const nlohmann::json& json);
};

// AR Content types
enum class ARContentType {
    COCKPIT_OVERLAY,
    PROCEDURE_VISUALIZATION,
    SYSTEM_EXPLODED_VIEW,
    AIRPORT_DIAGRAM,
    FLIGHT_PATH_VISUALIZATION,
    EMERGENCY_PROCEDURE
};

class ARContent {
public:
    std::string id;
    std::string name;
    std::string description;
    ARContentType type;
    std::string sourceDocumentId;
    std::string modelPath;
    std::string texturesPath;
    std::unordered_map<std::string, std::string> annotations;
    std::chrono::system_clock::time_point createdAt;
    
    nlohmann::json toJson() const;
    static std::shared_ptr<ARContent> fromJson(const nlohmann::json& json);
};

// Performance Visualization types
enum class VisualizationType {
    FLIGHT_PATH_3D,
    CONTROL_INPUTS_TIMELINE,
    PARAMETER_COMPARISON,
    HEAT_MAP,
    DECISION_TREE,
    COMPETENCY_RADAR
};

struct DataPoint {
    std::chrono::system_clock::time_point timestamp;
    std::unordered_map<std::string, float> parameters;
    
    nlohmann::json toJson() const;
    static DataPoint fromJson(const nlohmann::json& json);
};

class PerformanceVisualization {
public:
    std::string id;
    std::string name;
    VisualizationType type;
    std::string assessmentId;
    std::string traineeId;
    std::string instructorId;
    std::vector<DataPoint> data;
    std::chrono::system_clock::time_point createdAt;
    
    nlohmann::json toJson() const;
    static std::shared_ptr<PerformanceVisualization> fromJson(const nlohmann::json& json);
};

// Training Scenario types
enum class ScenarioDifficulty {
    INTRODUCTORY,
    BASIC,
    INTERMEDIATE,
    ADVANCED,
    EXPERT
};

struct ScenarioEvent {
    std::string id;
    std::string name;
    std::string description;
    std::chrono::system_clock::time_point triggerTime;
    std::unordered_map<std::string, std::string> parameters;
    
    nlohmann::json toJson() const;
    static ScenarioEvent fromJson(const nlohmann::json& json);
};

class TrainingScenario {
public:
    std::string id;
    std::string name;
    std::string description;
    std::string syllabusId;
    std::string moduleId;
    ScenarioDifficulty difficulty;
    std::string aircraftModelId;
    SceneEnvironment environment;
    std::vector<ScenarioEvent> events;
    std::vector<std::string> learningObjectives;
    std::chrono::system_clock::time_point createdAt;
    
    nlohmann::json toJson() const;
    static std::shared_ptr<TrainingScenario> fromJson(const nlohmann::json& json);
};

} // namespace Visualization

// /backend/visualization/include/visualization/ScenarioGenerator.h
#pragma once

#include <string>
#include <memory>
#include <vector>
#include "visualization/VisualizationTypes.h"
#include "core/ConfigurationManager.h"
#include "database/DatabaseManager.h"
#include "syllabus/SyllabusManager.h"

namespace Visualization {

class ScenarioGenerator {
public:
    ScenarioGenerator(
        std::shared_ptr<Core::ConfigurationManager> config,
        std::shared_ptr<Database::DatabaseManager> dbManager,
        std::shared_ptr<Syllabus::SyllabusManager> syllabusManager
    );
    ~ScenarioGenerator();
    
    // Generate a training scenario based on syllabus module and difficulty
    std::shared_ptr<TrainingScenario> generateScenario(
        const std::string& syllabusId,
        const std::string& moduleId,
        ScenarioDifficulty difficulty
    );
    
    // Generate emergency scenario with specific aircraft system failures
    std::shared_ptr<TrainingScenario> generateEmergencyScenario(
        const std::string& aircraftType,
        const std::vector<std::string>& affectedSystems
    );
    
    // Generate weather-focused scenario
    std::shared_ptr<TrainingScenario> generateWeatherScenario(
        WeatherCondition condition,
        float intensity
    );
    
    // Generate a scenario focused on a specific airport and runway
    std::shared_ptr<TrainingScenario> generateAirportScenario(
        const std::string& airportIcao,
        const std::string& runwayId,
        TimeOfDay timeOfDay
    );
    
    // Save generated scenario
    bool saveScenario(const std::shared_ptr<TrainingScenario>& scenario);
    
    // Load a saved scenario
    std::shared_ptr<TrainingScenario> loadScenario(const std::string& scenarioId);
    
    // Get scenarios for a specific module
    std::vector<std::shared_ptr<TrainingScenario>> getModuleScenarios(
        const std::string& moduleId
    );

private:
    std::shared_ptr<Core::ConfigurationManager> config_;
    std::shared_ptr<Database::DatabaseManager> dbManager_;
    std::shared_ptr<Syllabus::SyllabusManager> syllabusManager_;
    
    // Helper methods
    std::vector<ScenarioEvent> generateEventsForModule(
        const std::string& moduleId,
        ScenarioDifficulty difficulty
    );
    
    SceneEnvironment generateEnvironmentForDifficulty(ScenarioDifficulty difficulty);
    
    std::vector<std::string> extractLearningObjectives(
        const std::string& syllabusId,
        const std::string& moduleId
    );
};

} // namespace Visualization

// /backend/visualization/src/VisualizationService.cpp
#include "visualization/VisualizationService.h"
#include <spdlog/spdlog.h>
#include <uuid/uuid.h>

namespace Visualization {

VisualizationService::VisualizationService(
    std::shared_ptr<Core::ConfigurationManager> config,
    std::shared_ptr<Database::DatabaseManager> dbManager,
    std::shared_ptr<Document::DocumentManager> docManager,
    std::shared_ptr<Syllabus::SyllabusManager> syllabusManager,
    std::shared_ptr<Assessment::AssessmentManager> assessmentManager
) : config_(config), 
    dbManager_(dbManager),
    docManager_(docManager),
    syllabusManager_(syllabusManager),
    assessmentManager_(assessmentManager) {
    
    // Initialize scenario generator
    scenarioGenerator_ = std::make_shared<ScenarioGenerator>(config_, dbManager_, syllabusManager_);
    
    // Load aircraft models into cache
    refreshCaches();
    
    spdlog::info("Visualization service initialized");
}

VisualizationService::~VisualizationService() {
    spdlog::info("Visualization service shutting down");
}

std::shared_ptr<KnowledgeMap> VisualizationService::createKnowledgeMap(const std::string& syllabusId) {
    // Get the syllabus
    auto syllabus = syllabusManager_->getSyllabus(syllabusId);
    if (!syllabus) {
        spdlog::error("Cannot create knowledge map: syllabus {} not found", syllabusId);
        return nullptr;
    }
    
    // Create a new knowledge map
    auto map = std::make_shared<KnowledgeMap>();
    
    // Generate a unique ID
    uuid_t uuid;
    uuid_generate(uuid);
    char uuid_str[37];
    uuid_unparse_lower(uuid, uuid_str);
    map->id = uuid_str;
    
    map->name = syllabus->getName() + " Knowledge Map";
    map->description = "3D visualization of " + syllabus->getName();
    map->creatorId = syllabus->getCreatorId();
    map->syllabusId = syllabusId;
    map->createdAt = std::chrono::system_clock::now();
    map->updatedAt = map->createdAt;
    
    // Create nodes from syllabus items
    std::vector<std::shared_ptr<KnowledgeNode>> nodes;
    
    // Process modules
    for (const auto& module : syllabus->getModules()) {
        // Create module node
        auto moduleNode = std::make_shared<KnowledgeNode>();
        moduleNode->id = module.getId();
        moduleNode->label = module.getName();
        moduleNode->description = module.getDescription();
        moduleNode->type = NodeType::TOPIC;
        moduleNode->size = 1.5f;
        moduleNode->color = "#4285F4";  // Blue
        
        // Set initial position (will be adjusted later)
        moduleNode->position = Vector3(
            static_cast<float>(rand()) / RAND_MAX * 20.0f - 10.0f,
            static_cast<float>(rand()) / RAND_MAX * 20.0f - 10.0f,
            static_cast<float>(rand()) / RAND_MAX * 20.0f - 10.0f
        );
        
        nodes.push_back(moduleNode);
        
        // Process lessons in this module
        for (const auto& lesson : module.getLessons()) {
            // Create lesson node
            auto lessonNode = std::make_shared<KnowledgeNode>();
            lessonNode->id = lesson.getId();
            lessonNode->label = lesson.getName();
            lessonNode->description = lesson.getDescription();
            lessonNode->type = NodeType::OBJECTIVE;
            lessonNode->size = 1.0f;
            lessonNode->color = "#34A853";  // Green
            
            // Set position near the module node
            lessonNode->position = moduleNode->position + Vector3(
                static_cast<float>(rand()) / RAND_MAX * 5.0f - 2.5f,
                static_cast<float>(rand()) / RAND_MAX * 5.0f - 2.5f,
                static_cast<float>(rand()) / RAND_MAX * 5.0f - 2.5f
            );
            
            nodes.push_back(lessonNode);
            
            // Process exercises in this lesson
            for (const auto& exercise : lesson.getExercises()) {
                // Create exercise node
                auto exerciseNode = std::make_shared<KnowledgeNode>();
                exerciseNode->id = exercise.getId();
                exerciseNode->label = exercise.getName();
                exerciseNode->description = exercise.getDescription();
                exerciseNode->type = NodeType::PROCEDURE;
                exerciseNode->size = 0.7f;
                exerciseNode->color = "#FBBC05";  // Yellow
                
                // Set position near the lesson node
                exerciseNode->position = lessonNode->position + Vector3(
                    static_cast<float>(rand()) / RAND_MAX * 3.0f - 1.5f,
                    static_cast<float>(rand()) / RAND_MAX * 3.0f - 1.5f,
                    static_cast<float>(rand()) / RAND_MAX * 3.0f - 1.5f
                );
                
                nodes.push_back(exerciseNode);
            }
        }
    }
    
    map->nodes = nodes;
    
    // Generate links between nodes
    map->links = generateLinksForNodes(nodes);
    
    // Save the map
    auto query = "INSERT INTO knowledge_maps (id, name, description, creator_id, syllabus_id, created_at, updated_at, data) "
                "VALUES ($1, $2, $3, $4, $5, $6, $7, $8)";
    
    nlohmann::json mapData = map->toJson();
    
    dbManager_->executeQuery(query, 
                           map->id, map->name, map->description, map->creatorId, map->syllabusId,
                           map->createdAt, map->updatedAt, mapData.dump());
    
    // Add to cache
    std::lock_guard<std::mutex> lock(cacheMutex_);
    knowledgeMapCache_[map->id] = map;
    
    spdlog::info("Created knowledge map {} for syllabus {}", map->id, syllabusId);
    
    return map;
}

std::shared_ptr<KnowledgeMap> VisualizationService::getKnowledgeMap(const std::string& mapId) {
    // Check cache first
    {
        std::lock_guard<std::mutex> lock(cacheMutex_);
        auto it = knowledgeMapCache_.find(mapId);
        if (it != knowledgeMapCache_.end()) {
            return it->second;
        }
    }
    
    // Not in cache, load from database
    auto query = "SELECT data FROM knowledge_maps WHERE id = $1";
    auto result = dbManager_->executeQuery(query, mapId);
    
    if (result.empty()) {
        spdlog::error("Knowledge map {} not found", mapId);
        return nullptr;
    }
    
    try {
        auto mapData = nlohmann::json::parse(result[0][0].as<std::string>());
        auto map = KnowledgeMap::fromJson(mapData);
        
        // Add to cache
        std::lock_guard<std::mutex> lock(cacheMutex_);
        knowledgeMapCache_[mapId] = map;
        
        return map;
    } catch (const std::exception& e) {
        spdlog::error("Error parsing knowledge map data: {}", e.what());
        return nullptr;
    }
}

bool VisualizationService::updateKnowledgeMap(const std::shared_ptr<KnowledgeMap>& map) {
    if (!map) {
        return false;
    }
    
    // Update timestamp
    map->updatedAt = std::chrono::system_clock::now();
    
    // Update in database
    auto query = "UPDATE knowledge_maps SET name = $1, description = $2, updated_at = $3, data = $4 "
                "WHERE id = $5";
    
    nlohmann::json mapData = map->toJson();
    
    bool success = dbManager_->executeQuery(query, 
                                         map->name, map->description, map->updatedAt, 
                                         mapData.dump(), map->id);
    
    if (success) {
        // Update cache
        std::lock_guard<std::mutex> lock(cacheMutex_);
        knowledgeMapCache_[map->id] = map;
        
        spdlog::info("Updated knowledge map {}", map->id);
    } else {
        spdlog::error("Failed to update knowledge map {}", map->id);
    }
    
    return success;
}

bool VisualizationService::deleteKnowledgeMap(const std::string& mapId) {
    // Delete from database
    auto query = "DELETE FROM knowledge_maps WHERE id = $1";
    bool success = dbManager_->executeQuery(query, mapId);
    
    if (success) {
        // Remove from cache
        std::lock_guard<std::mutex> lock(cacheMutex_);
        knowledgeMapCache_.erase(mapId);
        
        spdlog::info("Deleted knowledge map {}", mapId);
    } else {
        spdlog::error("Failed to delete knowledge map {}", mapId);
    }
    
    return success;
}

std::vector<std::shared_ptr<KnowledgeMap>> VisualizationService::getUserKnowledgeMaps(
    const std::string& userId
) {
    // Query database for user's knowledge maps
    auto query = "SELECT data FROM knowledge_maps WHERE creator_id = $1";
    auto result = dbManager_->executeQuery(query, userId);
    
    std::vector<std::shared_ptr<KnowledgeMap>> maps;
    
    for (const auto& row : result) {
        try {
            auto mapData = nlohmann::json::parse(row[0].as<std::string>());
            auto map = KnowledgeMap::fromJson(mapData);
            maps.push_back(map);
            
            // Update cache
            std::lock_guard<std::mutex> lock(cacheMutex_);
            knowledgeMapCache_[map->id] = map;
        } catch (const std::exception& e) {
            spdlog::error("Error parsing knowledge map data: {}", e.what());
        }
    }
    
    spdlog::info("Retrieved {} knowledge maps for user {}", maps.size(), userId);
    
    return maps;
}

std::vector<KnowledgeLink> VisualizationService::generateLinksForNodes(
    const std::vector<std::shared_ptr<KnowledgeNode>>& nodes
) {
    std::vector<KnowledgeLink> links;
    std::unordered_map<std::string, std::shared_ptr<KnowledgeNode>> nodeMap;
    
    // Create a map of node IDs to nodes for quick lookup
    for (const auto& node : nodes) {
        nodeMap[node->id] = node;
    }
    
    // Organize nodes by type
    std::unordered_map<NodeType, std::vector<std::shared_ptr<KnowledgeNode>>> nodesByType;
    for (const auto& node : nodes) {
        nodesByType[node->type].push_back(node);
    }
    
    // Helper function to generate a unique link ID
    auto generateLinkId = [](const std::string& sourceId, const std::string& targetId) {
        return sourceId + "-" + targetId;
    };
    
    // Link modules to their lessons
    for (const auto& moduleNode : nodesByType[NodeType::TOPIC]) {
        for (const auto& lessonNode : nodesByType[NodeType::OBJECTIVE]) {
            // Check if lesson position is close to module (indicating it belongs to this module)
            if ((lessonNode->position - moduleNode->position).norm() < 6.0f) {
                KnowledgeLink link;
                link.id = generateLinkId(moduleNode->id, lessonNode->id);
                link.sourceNodeId = moduleNode->id;
                link.targetNodeId = lessonNode->id;
                link.label = "Contains";
                link.strength = 1.0f;
                link.color = "#4285F4";  // Blue
                
                links.push_back(link);
            }
        }
    }
    
    // Link lessons to their exercises
    for (const auto& lessonNode : nodesByType[NodeType::OBJECTIVE]) {
        for (const auto& exerciseNode : nodesByType[NodeType::PROCEDURE]) {
            // Check if exercise position is close to lesson
            if ((exerciseNode->position - lessonNode->position).norm() < 4.0f) {
                KnowledgeLink link;
                link.id = generateLinkId(lessonNode->id, exerciseNode->id);
                link.sourceNodeId = lessonNode->id;
                link.targetNodeId = exerciseNode->id;
                link.label = "Includes";
                link.strength = 0.8f;
                link.color = "#34A853";  // Green
                
                links.push_back(link);
            }
        }
    }
    
    // Additionally, add some cross-linking between related nodes
    // This is a simplified example; in a real system, you would use more sophisticated
    // algorithms to determine related content
    
    // Link related exercises across lessons
    auto& exercises = nodesByType[NodeType::PROCEDURE];
    for (size_t i = 0; i < exercises.size(); ++i) {
        for (size_t j = i + 1; j < exercises.size(); ++j) {
            // Random chance of linking related exercises
            if (rand() % 10 == 0) {  // 10% chance
                KnowledgeLink link;
                link.id = generateLinkId(exercises[i]->id, exercises[j]->id);
                link.sourceNodeId = exercises[i]->id;
                link.targetNodeId = exercises[j]->id;
                link.label = "Related";
                link.strength = 0.3f;
                link.color = "#EA4335";  // Red
                
                links.push_back(link);
            }
        }
    }
    
    return links;
}

void VisualizationService::refreshCaches() {
    // Load aircraft models
    auto query = "SELECT data FROM aircraft_models";
    auto result = dbManager_->executeQuery(query);
    
    std::lock_guard<std::mutex> lock(cacheMutex_);
    
    for (const auto& row : result) {
        try {
            auto modelData = nlohmann::json::parse(row[0].as<std::string>());
            auto model = AircraftModel::fromJson(modelData);
            aircraftModelCache_[model->id] = model;
        } catch (const std::exception& e) {
            spdlog::error("Error parsing aircraft model data: {}", e.what());
        }
    }
    
    spdlog::info("Loaded {} aircraft models into cache", aircraftModelCache_.size());
    
    // Similarly load other caches as needed
}

std::shared_ptr<AircraftModel> VisualizationService::getAircraftModel(const std::string& aircraftType) {
    std::lock_guard<std::mutex> lock(cacheMutex_);
    
    // Find by aircraft type
    for (const auto& pair : aircraftModelCache_) {
        if (pair.second->aircraftType == aircraftType) {
            return pair.second;
        }
    }
    
    spdlog::error("Aircraft model for type {} not found", aircraftType);
    return nullptr;
}

std::vector<std::string> VisualizationService::getAvailableAircraftModels() {
    std::vector<std::string> availableModels;
    
    std::lock_guard<std::mutex> lock(cacheMutex_);
    for (const auto& pair : aircraftModelCache_) {
        availableModels.push_back(pair.second->aircraftType);
    }
    
    return availableModels;
}

// ... Additional method implementations would follow ...

} // namespace Visualization

// /backend/visualization/src/VisualizationTypes.cpp
#include "visualization/VisualizationTypes.h"
#include <spdlog/spdlog.h>

namespace Visualization {

// KnowledgeNode serialization
nlohmann::json KnowledgeNode::toJson() const {
    nlohmann::json json = {
        {"id", id},
        {"label", label},
        {"description", description},
        {"type", static_cast<int>(type)},
        {"size", size},
        {"color", color},
        {"position", {
            {"x", position.x()},
            {"y", position.y()},
            {"z", position.z()}
        }},
        {"metadata", metadata}
    };
    
    return json;
}

std::shared_ptr<KnowledgeNode> KnowledgeNode::fromJson(const nlohmann::json& json) {
    auto node = std::make_shared<KnowledgeNode>();
    
    node->id = json["id"].get<std::string>();
    node->label = json["label"].get<std::string>();
    node->description = json["description"].get<std::string>();
    node->type = static_cast<NodeType>(json["type"].get<int>());
    node->size = json["size"].get<float>();
    node->color = json["color"].get<std::string>();
    
    node->position = Vector3(
        json["position"]["x"].get<float>(),
        json["position"]["y"].get<float>(),
        json["position"]["z"].get<float>()
    );
    
    node->metadata = json["metadata"].get<std::unordered_map<std::string, std::string>>();
    
    return node;
}

// KnowledgeLink serialization
nlohmann::json KnowledgeLink::toJson() const {
    return {
        {"id", id},
        {"sourceNodeId", sourceNodeId},
        {"targetNodeId", targetNodeId},
        {"label", label},
        {"strength", strength},
        {"color", color}
    };
}

KnowledgeLink KnowledgeLink::fromJson(const nlohmann::json& json) {
    KnowledgeLink link;
    
    link.id = json["id"].get<std::string>();
    link.sourceNodeId = json["sourceNodeId"].get<std::string>();
    link.targetNodeId = json["targetNodeId"].get<std::string>();
    link.label = json["label"].get<std::string>();
    link.strength = json["strength"].get<float>();
    link.color = json["color"].get<std::string>();
    
    return link;
}

// KnowledgeMap serialization
nlohmann::json KnowledgeMap::toJson() const {
    nlohmann::json nodesJson = nlohmann::json::array();
    for (const auto& node : nodes) {
        nodesJson.push_back(node->toJson());
    }
    
    nlohmann::json linksJson = nlohmann::json::array();
    for (const auto& link : links) {
        linksJson.push_back(link.toJson());
    }
    
    return {
        {"id", id},
        {"name", name},
        {"description", description},
        {"creatorId", creatorId},
        {"syllabusId", syllabusId},
        {"createdAt", createdAt.time_since_epoch().count()},
        {"updatedAt", updatedAt.time_since_epoch().count()},
        {"nodes", nodesJson},
        {"links", linksJson}
    };
}

std::shared_ptr<KnowledgeMap> KnowledgeMap::fromJson(const nlohmann::json& json) {
    auto map = std::make_shared<KnowledgeMap>();
    
    map->id = json["id"].get<std::string>();
    map->name = json["name"].get<std::string>();
    map->description = json["description"].get<std::string>();
    map->creatorId = json["creatorId"].get<std::string>();
    map->syllabusId = json["syllabusId"].get<std::string>();
    
    map->createdAt = std::chrono::system_clock::time_point(
        std::chrono::milliseconds(json["createdAt"].get<int64_t>())
    );
    
    map->updatedAt = std::chrono::system_clock::time_point(
        std::chrono::milliseconds(json["updatedAt"].get<int64_t>())
    );
    
    for (const auto& nodeJson : json["nodes"]) {
        map->nodes.push_back(KnowledgeNode::fromJson(nodeJson));
    }
    
    for (const auto& linkJson : json["links"]) {
        map->links.push_back(KnowledgeLink::fromJson(linkJson));
    }
    
    return map;
}

// AircraftModel serialization
nlohmann::json AircraftModel::toJson() const {
    return {
        {"id", id},
        {"aircraftType", aircraftType},
        {"manufacturer", manufacturer},
        {"modelVersion", modelVersion},
        {"modelPath", modelPath},
        {"texturesPath", texturesPath},
        {"animationNames", animationNames},
        {"systemModels", systemModels}
    };
}

std::shared_ptr<AircraftModel> AircraftModel::fromJson(const nlohmann::json& json) {
    auto model = std::make_shared<AircraftModel>();
    
    model->id = json["id"].get<std::string>();
    model->aircraftType = json["aircraftType"].get<std::string>();
    model->manufacturer = json["manufacturer"].get<std::string>();
    model->modelVersion = json["modelVersion"].get<std::string>();
    model->modelPath = json["modelPath"].get<std::string>();
    model->texturesPath = json["texturesPath"].get<std::string>();
    model->animationNames = json["animationNames"].get<std::vector<std::string>>();
    model->systemModels = json["systemModels"].get<std::unordered_map<std::string, std::string>>();
    
    return model;
}

// SceneEnvironment serialization
nlohmann::json SceneEnvironment::toJson() const {
    return {
        {"weather", static_cast<int>(weather)},
        {"timeOfDay", static_cast<int>(timeOfDay)},
        {"visibility", visibility},
        {"windSpeed", windSpeed},
        {"windDirection", windDirection},
        {"temperature", temperature},
        {"cloudBase", cloudBase}
    };
}

SceneEnvironment SceneEnvironment::fromJson(const nlohmann::json& json) {
    SceneEnvironment env;
    
    env.weather = static_cast<WeatherCondition>(json["weather"].get<int>());
    env.timeOfDay = static_cast<TimeOfDay>(json["timeOfDay"].get<int>());
    env.visibility = json["visibility"].get<float>();
    env.windSpeed = json["windSpeed"].get<float>();
    env.windDirection = json["windDirection"].get<float>();
    env.temperature = json["temperature"].get<float>();
    env.cloudBase = json["cloudBase"].get<float>();
    
    return env;
}

// ... Additional serialization implementations for other types would follow ...

} // namespace Visualization

// /backend/visualization/python/knowledge_map_layout.py
import numpy as np
from typing import Dict, List, Tuple, Any
import json
import networkx as nx
from scipy.spatial import distance

class KnowledgeMapLayout:
    """Class for creating and optimizing 3D layouts for knowledge maps.
    
    This class provides methods to:
    1. Generate force-directed layouts for knowledge maps
    2. Organize nodes by clusters
    3. Create thematic layouts
    4. Export to various 3D formats
    """
    
    def __init__(self, knowledge_map_data: Dict[str, Any]):
        """Initialize with knowledge map data.
        
        Args:
            knowledge_map_data: Dictionary with nodes and links for the knowledge map
        """
        self.map_data = knowledge_map_data
        self.nodes = knowledge_map_data.get('nodes', [])
        self.links = knowledge_map_data.get('links', [])
        self.graph = self._build_graph()
        
    def _build_graph(self) -> nx.Graph:
        """Build a NetworkX graph from nodes and links."""
        G = nx.Graph()
        
        # Add nodes
        for node in self.nodes:
            node_attrs = {
                'label': node['label'],
                'type': node['type'],
                'size': node['size'],
                'color': node['color'],
                'pos': np.array([node['position']['x'], 
                                node['position']['y'], 
                                node['position']['z']])
            }
            G.add_node(node['id'], **node_attrs)
        
        # Add links
        for link in self.links:
            G.add_edge(link['sourceNodeId'], link['targetNodeId'], 
                      weight=link['strength'],
                      label=link['label'],
                      color=link['color'])
        
        return G
    
    def apply_force_directed_layout(self, iterations: int = 100, 
                                   repulsion: float = 1.0, 
                                   attraction: float = 0.1,
                                   gravity: float = 0.01) -> None:
        """Apply a 3D force-directed layout algorithm.
        
        Args:
            iterations: Number of iterations to run
            repulsion: Strength of repulsive force between nodes
            attraction: Strength of attractive force along edges
            gravity: Strength of force pulling nodes to origin
        """
        # Get positions
        pos = nx.get_node_attributes(self.graph, 'pos')
        if not pos:
            # Initialize random positions if none exist
            pos = {node: np.random.uniform(-10, 10, 3) for node in self.graph.nodes()}
            nx.set_node_attributes(self.graph, pos, 'pos')
        
        # Run force-directed algorithm
        for _ in range(iterations):
            # Calculate forces
            force = {node: np.zeros(3) for node in self.graph.nodes()}
            
            # Repulsive forces (node-node)
            nodes = list(self.graph.nodes())
            for i, node1 in enumerate(nodes):
                for node2 in nodes[i+1:]:
                    delta = pos[node1] - pos[node2]
                    dist = np.linalg.norm(delta)
                    if dist < 0.1:  # Avoid division by zero
                        dist = 0.1
                        delta = np.random.uniform(-0.1, 0.1, 3)
                    
                    # Inverse square law for repulsion
                    f_rep = repulsion * delta / (dist ** 2)
                    
                    force[node1] += f_rep
                    force[node2] -= f_rep
            
            # Attractive forces (connected nodes)
            for node1, node2 in self.graph.edges():
                delta = pos[node1] - pos[node2]
                dist = np.linalg.norm(delta)
                
                # Hooke's law for attraction (spring force)
                edge_data = self.graph.get_edge_data(node1, node2)
                weight = edge_data.get('weight', 1.0)
                f_attr = -attraction * weight * delta
                
                force[node1] += f_attr
                force[node2] -= f_attr
            
            # Gravity towards origin
            for node in self.graph.nodes():
                force[node] -= gravity * pos[node]
            
            # Update positions
            for node in self.graph.nodes():
                # Apply force with damping
                pos[node] += force[node] * 0.1
        
        # Update node positions in graph
        nx.set_node_attributes(self.graph, pos, 'pos')
        
        # Update original data
        for node in self.nodes:
            node_id = node['id']
            if node_id in pos:
                node['position']['x'] = float(pos[node_id][0])
                node['position']['y'] = float(pos[node_id][1])
                node['position']['z'] = float(pos[node_id][2])
    
    def cluster_by_type(self, spacing: float = 20.0) -> None:
        """Organize nodes in clusters by their type.
        
        Args:
            spacing: Spacing between clusters
        """
        # Group nodes by type
        nodes_by_type = {}
        for node in self.nodes:
            node_type = node['type']
            if node_type not in nodes_by_type:
                nodes_by_type[node_type] = []
            nodes_by_type[node_type].append(node)
        
        # Position clusters in a circle
        num_types = len(nodes_by_type)
        for i, (node_type, nodes) in enumerate(nodes_by_type.items()):
            # Calculate cluster center
            angle = 2 * np.pi * i / num_types
            center_x = spacing * np.cos(angle)
            center_y = spacing * np.sin(angle)
            center_z = 0
            
            # Position nodes within cluster using force-directed layout
            for j, node in enumerate(nodes):
                # Start with a spherical distribution around center
                radius = 5.0
                theta = np.pi * np.random.random()
                phi = 2 * np.pi * np.random.random()
                
                node['position']['x'] = center_x + radius * np.sin(theta) * np.cos(phi)
                node['position']['y'] = center_y + radius * np.sin(theta) * np.sin(phi)
                node['position']['z'] = center_z + radius * np.cos(theta)
            
            # Run a mini force-directed layout just for this cluster
            self._optimize_cluster_layout(nodes)
    
    def _optimize_cluster_layout(self, nodes: List[Dict[str, Any]], iterations: int = 50) -> None:
        """Optimize layout for a cluster of nodes.
        
        Args:
            nodes: List of nodes in the cluster
            iterations: Number of iterations to run
        """
        # Create a subgraph for this cluster
        node_ids = [node['id'] for node in nodes]
        subgraph = self.graph.subgraph(node_ids)
        
        # Get positions
        pos = {node['id']: np.array([node['position']['x'],
                                    node['position']['y'],
                                    node['position']['z']]) for node in nodes}
        
        # Run simplified force-directed algorithm
        for _ in range(iterations):
            # Calculate forces
            force = {node_id: np.zeros(3) for node_id in subgraph.nodes()}
            
            # Repulsive forces
            node_ids = list(subgraph.nodes())
            for i, node1 in enumerate(node_ids):
                for node2 in node_ids[i+1:]:
                    delta = pos[node1] - pos[node2]
                    dist = np.linalg.norm(delta)
                    if dist < 0.1:
                        dist = 0.1
                        delta = np.random.uniform(-0.1, 0.1, 3)
                    
                    f_rep = delta / (dist ** 2)
                    
                    force[node1] += f_rep
                    force[node2] -= f_rep
            
            # Attractive forces
            for node1, node2 in subgraph.edges():
                delta = pos[node1] - pos[node2]
                f_attr = -0.05 * delta
                
                force[node1] += f_attr
                force[node2] -= f_attr
            
            # Update positions
            for node_id in subgraph.nodes():
                pos[node_id] += force[node_id] * 0.1
        
        # Update node positions
        for node in nodes:
            node_id = node['id']
            node['position']['x'] = float(pos[node_id][0])
            node['position']['y'] = float(pos[node_id][1])
            node['position']['z'] = float(pos[node_id][2])
    
    def create_hierarchical_layout(self) -> None:
        """Organize nodes in a hierarchical 3D structure based on their relationships."""
        # Find root nodes (topics) and children
        node_map = {node['id']: node for node in self.nodes}
        
        # Create a directed graph to find the hierarchy
        digraph = nx.DiGraph()
        for link in self.links:
            source = link['sourceNodeId']
            target = link['targetNodeId']
            digraph.add_edge(source, target)
        
        # Find root nodes (nodes with no incoming edges or type == TOPIC)
        root_nodes = []
        for node in self.nodes:
            if node['type'] == 0:  # TOPIC
                root_nodes.append(node)
        
        if not root_nodes:
            # Fallback: use nodes with no incoming edges
            for node in self.nodes:
                if digraph.in_degree(node['id']) == 0:
                    root_nodes.append(node)
        
        if not root_nodes:
            # Fallback: use any node
            root_nodes = [self.nodes[0]]
        
        # Position root nodes in a circle on the top level
        num_roots = len(root_nodes)
        radius = 15.0
        for i, node in enumerate(root_nodes):
            angle = 2 * np.pi * i / num_roots
            node['position']['x'] = radius * np.cos(angle)
            node['position']['y'] = radius * np.sin(angle)
            node['position']['z'] = 20.0  # Top level
        
        # Position children recursively
        positioned = {node['id'] for node in root_nodes}
        self._position_children(digraph, node_map, root_nodes, positioned, level=1)
    
    def _position_children(self, digraph: nx.DiGraph, node_map: Dict[str, Dict],
                         parent_nodes: List[Dict], positioned: set, level: int) -> None:
        """Recursively position child nodes below their parents.
        
        Args:
            digraph: NetworkX directed graph
            node_map: Map of node IDs to node objects
            parent_nodes: List of parent nodes to process
            positioned: Set of already positioned node IDs
            level: Current hierarchy level (0 is top)
        """
        if not parent_nodes or level > 5:  # Limit depth
            return
        
        children = []
        for parent in parent_nodes:
            parent_id = parent['id']
            parent_pos = np.array([parent['position']['x'],
                                  parent['position']['y'],
                                  parent['position']['z']])
            
            # Get immediate children
            child_ids = list(digraph.successors(parent_id))
            parent_children = []
            
            for child_id in child_ids:
                if child_id not in positioned:
                    child = node_map[child_id]
                    parent_children.append(child)
                    positioned.add(child_id)
            
            # Position children in a circle below parent
            num_children = len(parent_children)
            if num_children == 0:
                continue
            
            radius = 5.0 + level * 2.0  # Increase radius with level
            for i, child in enumerate(parent_children):
                angle = 2 * np.pi * i / num_children
                
                # Position relative to parent
                child['position']['x'] = parent_pos[0] + radius * np.cos(angle)
                child['position']['y'] = parent_pos[1] + radius * np.sin(angle)
                child['position']['z'] = parent_pos[2] - 10.0  # Level below parent
            
            children.extend(parent_children)
        
        # Process next level
        self._position_children(digraph, node_map, children, positioned, level + 1)
    
    def export_to_json(self) -> Dict[str, Any]:
        """Export the knowledge map with updated positions to JSON."""
        # Update positions from graph
        pos = nx.get_node_attributes(self.graph, 'pos')
        for node in self.nodes:
            node_id = node['id']
            if node_id in pos:
                node['position']['x'] = float(pos[node_id][0])
                node['position']['y'] = float(pos[node_id][1])
                node['position']['z'] = float(pos[node_id][2])
        
        return self.map_data
    
    def export_to_gltf(self, filename: str) -> None:
        """Export the knowledge map to glTF format.
        
        This is a placeholder implementation that would need to be expanded
        with actual glTF export code in a production system.
        
        Args:
            filename: Output filename
        """
        # Get updated positions
        positions = {node['id']: np.array([node['position']['x'],
                                        node['position']['y'],
                                        node['position']['z']]) for node in self.nodes}
        
        # This is where the actual glTF export code would go
        # For a production system, you would use a library like pygltflib
        
        # For now, we'll just create a simple JSON with the data
        export_data = {
            'nodes': [{
                'id': node['id'],
                'label': node['label'],
                'position': [node['position']['x'], node['position']['y'], node['position']['z']],
                'size': node['size'],
                'color': node['color'],
                'type': node['type']
            } for node in self.nodes],
            'links': [{
                'source': link['sourceNodeId'],
                'target': link['targetNodeId'],
                'strength': link['strength'],
                'color': link['color']
            } for link in self.links]
        }
        
        with open(filename, 'w') as f:
            json.dump(export_data, f, indent=2)
        
        print(f"Exported knowledge map to {filename}")

# Example usage:
# with open('knowledge_map.json', 'r') as f:
#     map_data = json.load(f)
# 
# layout = KnowledgeMapLayout(map_data)
# layout.apply_force_directed_layout(iterations=200)
# # or layout.create_hierarchical_layout()
# 
# updated_map = layout.export_to_json()
# layout.export_to_gltf('knowledge_map.gltf')
