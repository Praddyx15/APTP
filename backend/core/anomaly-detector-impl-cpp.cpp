// src/backend/simulator/AnomalyDetector.cpp
#include "AnomalyDetector.h"
#include "../core/Logger.h"
#include <cmath>
#include <numeric>
#include <algorithm>
#include <sstream>

namespace PilotTraining {
namespace Simulator {

//----------------------------------------------------------
// StatisticalAnomalyModel Implementation
//----------------------------------------------------------

StatisticalAnomalyModel::StatisticalAnomalyModel()
    : _deviationThreshold(3.0), _trained(false) {
}

StatisticalAnomalyModel::~StatisticalAnomalyModel() = default;

bool StatisticalAnomalyModel::initialize(const std::unordered_map<std::string, std::string>& parameters) {
    try {
        // Parse configuration parameters
        for (const auto& [key, value] : parameters) {
            if (key == "deviationThreshold") {
                _deviationThreshold = std::stod(value);
            }
        }
        
        Core::Logger::debug("StatisticalAnomalyModel initialized with deviation threshold: {}", _deviationThreshold);
        return true;
    } catch (const std::exception& e) {
        Core::Logger::error("Failed to initialize StatisticalAnomalyModel: {}", e.what());
        return false;
    }
}

bool StatisticalAnomalyModel::train(const std::vector<FlightParameters>& trainingData) {
    try {
        if (trainingData.empty()) {
            Core::Logger::error("Cannot train StatisticalAnomalyModel with empty data");
            return false;
        }
        
        Core::Logger::debug("Training StatisticalAnomalyModel with {} samples", trainingData.size());
        
        // Track all numeric parameters we want to model
        std::unordered_map<std::string, std::vector<double>> allValues;
        
        // Collect values for each parameter
        for (const auto& params : trainingData) {
            // Position and attitude
            allValues["altitude"].push_back(params.altitude);
            allValues["heading"].push_back(params.heading);
            allValues["pitch"].push_back(params.pitch);
            allValues["roll"].push_back(params.roll);
            allValues["groundSpeed"].push_back(params.groundSpeed);
            allValues["indicatedAirspeed"].push_back(params.indicatedAirspeed);
            allValues["trueAirspeed"].push_back(params.trueAirspeed);
            allValues["verticalSpeed"].push_back(params.verticalSpeed);
            
            // Control inputs
            allValues["controlPitch"].push_back(params.controlPitch);
            allValues["controlRoll"].push_back(params.controlRoll);
            allValues["controlYaw"].push_back(params.controlYaw);
            allValues["controlThrottle"].push_back(params.controlThrottle);
            
            // Engine parameters (just first engine for simplicity)
            if (!params.engineRpm.empty()) {
                allValues["engineRpm"].push_back(params.engineRpm[0]);
            }
            if (!params.enginePower.empty()) {
                allValues["enginePower"].push_back(params.enginePower[0]);
            }
            
            // Other parameters of interest
            allValues["glideSlope"].push_back(params.glideSlope);
            allValues["localizer"].push_back(params.localizer);
        }
        
        // Calculate statistics for each parameter
        for (const auto& [param, values] : allValues) {
            if (values.empty()) {
                continue;
            }
            
            // Calculate mean
            double sum = std::accumulate(values.begin(), values.end(), 0.0);
            double mean = sum / values.size();
            
            // Calculate standard deviation
            double sqSum = std::inner_product(
                values.begin(), values.end(), values.begin(), 0.0,
                std::plus<>(), [mean](double x, double y) { return (x - mean) * (y - mean); }
            );
            double stdDev = std::sqrt(sqSum / values.size());
            
            // Find min and max
            double min = *std::min_element(values.begin(), values.end());
            double max = *std::max_element(values.begin(), values.end());
            
            // Store statistics
            _statistics[param] = {mean, stdDev, min, max};
            
            Core::Logger::debug("Parameter {}: mean={:.2f}, stdDev={:.2f}, min={:.2f}, max={:.2f}",
                param, mean, stdDev, min, max);
        }
        
        _trained = true;
        return true;
    } catch (const std::exception& e) {
        Core::Logger::error("Failed to train StatisticalAnomalyModel: {}", e.what());
        _trained = false;
        return false;
    }
}

std::vector<FlightAnomaly> StatisticalAnomalyModel::detectAnomalies(const std::vector<FlightParameters>& data) {
    std::vector<FlightAnomaly> anomalies;
    
    if (!_trained || data.empty()) {
        return anomalies;
    }
    
    // Get the latest data point
    const auto& params = data.back();
    
    // Check each parameter against the statistical model
    if (auto it = _statistics.find("altitude"); it != _statistics.end()) {
        double deviation = std::abs(params.altitude - it->second.mean) / it->second.standardDeviation;
        if (deviation > _deviationThreshold) {
            FlightAnomaly anomaly;
            anomaly.timestamp = params.timestamp;
            anomaly.sessionId = params.sessionId;
            anomaly.type = FlightAnomalyType::TRAJECTORY_ANOMALY;
            anomaly.confidence = std::min(1.0, deviation / (_deviationThreshold * 2));
            anomaly.description = "Altitude anomaly detected";
            anomaly.expectedBehavior = "Altitude within normal range";
            anomaly.actualBehavior = "Altitude deviation: " + std::to_string(params.altitude) +
                " (expected " + std::to_string(it->second.mean) + " ± " +
                std::to_string(it->second.standardDeviation * _deviationThreshold) + ")";
            anomaly.modelReference = "StatisticalAnomalyModel";
            anomaly.deviationScore = deviation;
            anomaly.parameters["altitude"] = params.altitude;
            anomaly.parameters["meanAltitude"] = it->second.mean;
            anomaly.parameters["stdDevAltitude"] = it->second.standardDeviation;
            
            anomalies.push_back(anomaly);
        }
    }
    
    // Check pitch
    if (auto it = _statistics.find("pitch"); it != _statistics.end()) {
        double deviation = std::abs(params.pitch - it->second.mean) / it->second.standardDeviation;
        if (deviation > _deviationThreshold) {
            FlightAnomaly anomaly;
            anomaly.timestamp = params.timestamp;
            anomaly.sessionId = params.sessionId;
            anomaly.type = FlightAnomalyType::CONTROL_INPUT_ANOMALY;
            anomaly.confidence = std::min(1.0, deviation / (_deviationThreshold * 2));
            anomaly.description = "Pitch anomaly detected";
            anomaly.expectedBehavior = "Pitch within normal range";
            anomaly.actualBehavior = "Pitch deviation: " + std::to_string(params.pitch) +
                " (expected " + std::to_string(it->second.mean) + " ± " +
                std::to_string(it->second.standardDeviation * _deviationThreshold) + ")";
            anomaly.modelReference = "StatisticalAnomalyModel";
            anomaly.deviationScore = deviation;
            anomaly.parameters["pitch"] = params.pitch;
            anomaly.parameters["meanPitch"] = it->second.mean;
            anomaly.parameters["stdDevPitch"] = it->second.standardDeviation;
            
            anomalies.push_back(anomaly);
        }
    }
    
    // Check roll
    if (auto it = _statistics.find("roll"); it != _statistics.end()) {
        double deviation = std::abs(params.roll - it->second.mean) / it->second.standardDeviation;
        if (deviation > _deviationThreshold) {
            FlightAnomaly anomaly;
            anomaly.timestamp = params.timestamp;
            anomaly.sessionId = params.sessionId;
            anomaly.type = FlightAnomalyType::CONTROL_INPUT_ANOMALY;
            anomaly.confidence = std::min(1.0, deviation / (_deviationThreshold * 2));
            anomaly.description = "Roll anomaly detected";
            anomaly.expectedBehavior = "Roll within normal range";
            anomaly.actualBehavior = "Roll deviation: " + std::to_string(params.roll) +
                " (expected " + std::to_string(it->second.mean) + " ± " +
                std::to_string(it->second.standardDeviation * _deviationThreshold) + ")";
            anomaly.modelReference = "StatisticalAnomalyModel";
            anomaly.deviationScore = deviation;
            anomaly.parameters["roll"] = params.roll;
            anomaly.parameters["meanRoll"] = it->second.mean;
            anomaly.parameters["stdDevRoll"] = it->second.standardDeviation;
            
            anomalies.push_back(anomaly);
        }
    }
    
    // Check vertical speed
    if (auto it = _statistics.find("verticalSpeed"); it != _statistics.end()) {
        double deviation = std::abs(params.verticalSpeed - it->second.mean) / it->second.standardDeviation;
        if (deviation > _deviationThreshold) {
            FlightAnomaly anomaly;
            anomaly.timestamp = params.timestamp;
            anomaly.sessionId = params.sessionId;
            anomaly.type = FlightAnomalyType::TRAJECTORY_ANOMALY;
            anomaly.confidence = std::min(1.0, deviation / (_deviationThreshold * 2));
            anomaly.description = "Vertical speed anomaly detected";
            anomaly.expectedBehavior = "Vertical speed within normal range";
            anomaly.actualBehavior = "Vertical speed deviation: " + std::to_string(params.verticalSpeed) +
                " (expected " + std::to_string(it->second.mean) + " ± " +
                std::to_string(it->second.standardDeviation * _deviationThreshold) + ")";
            anomaly.modelReference = "StatisticalAnomalyModel";
            anomaly.deviationScore = deviation;
            anomaly.parameters["verticalSpeed"] = params.verticalSpeed;
            anomaly.parameters["meanVerticalSpeed"] = it->second.mean;
            anomaly.parameters["stdDevVerticalSpeed"] = it->second.standardDeviation;
            
            anomalies.push_back(anomaly);
        }
    }
    
    // Check airspeed
    if (auto it = _statistics.find("indicatedAirspeed"); it != _statistics.end()) {
        double deviation = std::abs(params.indicatedAirspeed - it->second.mean) / it->second.standardDeviation;
        if (deviation > _deviationThreshold) {
            FlightAnomaly anomaly;
            anomaly.timestamp = params.timestamp;
            anomaly.sessionId = params.sessionId;
            anomaly.type = FlightAnomalyType::TRAJECTORY_ANOMALY;
            anomaly.confidence = std::min(1.0, deviation / (_deviationThreshold * 2));
            anomaly.description = "Airspeed anomaly detected";
            anomaly.expectedBehavior = "Airspeed within normal range";
            anomaly.actualBehavior = "Airspeed deviation: " + std::to_string(params.indicatedAirspeed) +
                " (expected " + std::to_string(it->second.mean) + " ± " +
                std::to_string(it->second.standardDeviation * _deviationThreshold) + ")";
            anomaly.modelReference = "StatisticalAnomalyModel";
            anomaly.deviationScore = deviation;
            anomaly.parameters["indicatedAirspeed"] = params.indicatedAirspeed;
            anomaly.parameters["meanAirspeed"] = it->second.mean;
            anomaly.parameters["stdDevAirspeed"] = it->second.standardDeviation;
            
            anomalies.push_back(anomaly);
        }
    }
    
    // Check control inputs
    if (auto it = _statistics.find("controlPitch"); it != _statistics.end()) {
        double deviation = std::abs(params.controlPitch - it->second.mean) / it->second.standardDeviation;
        if (deviation > _deviationThreshold) {
            FlightAnomaly anomaly;
            anomaly.timestamp = params.timestamp;
            anomaly.sessionId = params.sessionId;
            anomaly.type = FlightAnomalyType::CONTROL_INPUT_ANOMALY;
            anomaly.confidence = std::min(1.0, deviation / (_deviationThreshold * 2));
            anomaly.description = "Control input anomaly detected (pitch)";
            anomaly.expectedBehavior = "Pitch control within normal range";
            anomaly.actualBehavior = "Pitch control deviation: " + std::to_string(params.controlPitch) +
                " (expected " + std::to_string(it->second.mean) + " ± " +
                std::to_string(it->second.standardDeviation * _deviationThreshold) + ")";
            anomaly.modelReference = "StatisticalAnomalyModel";
            anomaly.deviationScore = deviation;
            anomaly.parameters["controlPitch"] = params.controlPitch;
            anomaly.parameters["meanControlPitch"] = it->second.mean;
            anomaly.parameters["stdDevControlPitch"] = it->second.standardDeviation;
            
            anomalies.push_back(anomaly);
        }
    }
    
    return anomalies;
}

//----------------------------------------------------------
// RuleBasedAnomalyModel Implementation
//----------------------------------------------------------

RuleBasedAnomalyModel::RuleBasedAnomalyModel()
    : _initialized(false) {
}

RuleBasedAnomalyModel::~RuleBasedAnomalyModel() = default;

bool RuleBasedAnomalyModel::initialize(const std::unordered_map<std::string, std::string>& parameters) {
    try {
        // Define default rules
        _rules["airspeed"] = {60.0, 250.0, true}; // Min/max airspeed
        _rules["altitude"] = {0.0, 10000.0, true}; // Min/max altitude
        _rules["verticalSpeed"] = {-1000.0, 1000.0, true}; // Min/max vertical speed
        _rules["pitch"] = {-20.0, 20.0, true}; // Min/max pitch
        _rules["roll"] = {-45.0, 45.0, true}; // Min/max roll
        
        // Override defaults with provided parameters
        for (const auto& [key, value] : parameters) {
            std::string paramName = key;
            std::string paramType;
            
            // Parse parameter name and type
            size_t dotPos = key.find('.');
            if (dotPos != std::string::npos) {
                paramName = key.substr(0, dotPos);
                paramType = key.substr(dotPos + 1);
            }
            
            // Update rule
            if (_rules.find(paramName) != _rules.end()) {
                if (paramType == "min") {
                    _rules[paramName].minValue = std::stod(value);
                } else if (paramType == "max") {
                    _rules[paramName].maxValue = std::stod(value);
                } else if (paramType == "enabled") {
                    _rules[paramName].enabled = (value == "true" || value == "1");
                }
            } else if (paramType.empty()) {
                // Add new rule with default settings
                _rules[paramName] = {0.0, 0.0, true};
            }
        }
        
        Core::Logger::debug("RuleBasedAnomalyModel initialized with {} rules", _rules.size());
        _initialized = true;
        return true;
    } catch (const std::exception& e) {
        Core::Logger::error("Failed to initialize RuleBasedAnomalyModel: {}", e.what());
        return false;
    }
}

bool RuleBasedAnomalyModel::train(const std::vector<FlightParameters>& trainingData) {
    // Rule-based model doesn't need training, just initialization
    return _initialized;
}

std::vector<FlightAnomaly> RuleBasedAnomalyModel::detectAnomalies(const std::vector<FlightParameters>& data) {
    std::vector<FlightAnomaly> anomalies;
    
    if (!_initialized || data.empty()) {
        return anomalies;
    }
    
    // Get the latest data point
    const auto& params = data.back();
    
    // Check each parameter against the rules
    if (auto it = _rules.find("airspeed"); it != _rules.end() && it->second.enabled) {
        if (params.indicatedAirspeed < it->second.minValue || 
            params.indicatedAirspeed > it->second.maxValue) {
            
            FlightAnomaly anomaly;
            anomaly.timestamp = params.timestamp;
            anomaly.sessionId = params.sessionId;
            anomaly.type = FlightAnomalyType::TRAJECTORY_ANOMALY;
            anomaly.confidence = 0.9; // High confidence for rule violations
            anomaly.description = "Airspeed outside allowed range";
            anomaly.expectedBehavior = "Airspeed between " + std::to_string(it->second.minValue) + 
                                      " and " + std::to_string(it->second.maxValue) + " knots";
            anomaly.actualBehavior = "Airspeed: " + std::to_string(params.indicatedAirspeed) + " knots";
            anomaly.modelReference = "RuleBasedAnomalyModel";
            
            // Calculate deviation score
            if (params.indicatedAirspeed < it->second.minValue) {
                anomaly.deviationScore = (it->second.minValue - params.indicatedAirspeed) / it->second.minValue;
            } else {
                anomaly.deviationScore = (params.indicatedAirspeed - it->second.maxValue) / it->second.maxValue;
            }
            
            anomaly.parameters["airspeed"] = params.indicatedAirspeed;
            anomaly.parameters["minAirspeed"] = it->second.minValue;
            anomaly.parameters["maxAirspeed"] = it->second.maxValue;
            
            anomalies.push_back(anomaly);
        }
    }
    
    // Check altitude
    if (auto it = _rules.find("altitude"); it != _rules.end() && it->second.enabled) {
        if (params.altitude < it->second.minValue || params.altitude > it->second.maxValue) {
            FlightAnomaly anomaly;
            anomaly.timestamp = params.timestamp;
            anomaly.sessionId = params.sessionId;
            anomaly.type = FlightAnomalyType::TRAJECTORY_ANOMALY;
            anomaly.confidence = 0.9; // High confidence for rule violations
            anomaly.description = "Altitude outside allowed range";
            anomaly.expectedBehavior = "Altitude between " + std::to_string(it->second.minValue) + 
                                      " and " + std::to_string(it->second.maxValue) + " feet";
            anomaly.actualBehavior = "Altitude: " + std::to_string(params.altitude) + " feet";
            anomaly.modelReference = "RuleBasedAnomalyModel";
            
            // Calculate deviation score
            if (params.altitude < it->second.minValue) {
                anomaly.deviationScore = (it->second.minValue - params.altitude) / it->second.minValue;
            } else {
                anomaly.deviationScore = (params.altitude - it->second.maxValue) / it->second.maxValue;
            }
            
            anomaly.parameters["altitude"] = params.altitude;
            anomaly.parameters["minAltitude"] = it->second.minValue;
            anomaly.parameters["maxAltitude"] = it->second.maxValue;
            
            anomalies.push_back(anomaly);
        }
    }
    
    // Check vertical speed
    if (auto it = _rules.find("verticalSpeed"); it != _rules.end() && it->second.enabled) {
        if (params.verticalSpeed < it->second.minValue || params.verticalSpeed > it->second.maxValue) {
            FlightAnomaly anomaly;
            anomaly.timestamp = params.timestamp;
            anomaly.sessionId = params.sessionId;
            anomaly.type = FlightAnomalyType::TRAJECTORY_ANOMALY;
            anomaly.confidence = 0.9; // High confidence for rule violations
            anomaly.description = "Vertical speed outside allowed range";
            anomaly.expectedBehavior = "Vertical speed between " + std::to_string(it->second.minValue) + 
                                      " and " + std::to_string(it->second.maxValue) + " feet/min";
            anomaly.actualBehavior = "Vertical speed: " + std::to_string(params.verticalSpeed) + " feet/min";
            anomaly.modelReference = "RuleBasedAnomalyModel";
            
            // Calculate deviation score
            if (params.verticalSpeed < it->second.minValue) {
                anomaly.deviationScore = (it->second.minValue - params.verticalSpeed) / std::abs(it->second.minValue);
            } else {
                anomaly.deviationScore = (params.verticalSpeed - it->second.maxValue) / it->second.maxValue;
            }
            
            anomaly.parameters["verticalSpeed"] = params.verticalSpeed;
            anomaly.parameters["minVerticalSpeed"] = it->second.minValue;
            anomaly.parameters["maxVerticalSpeed"] = it->second.maxValue;
            
            anomalies.push_back(anomaly);
        }
    }
    
    // Check pitch
    if (auto it = _rules.find("pitch"); it != _rules.end() && it->second.enabled) {
        if (params.pitch < it->second.minValue || params.pitch > it->second.maxValue) {
            FlightAnomaly anomaly;
            anomaly.timestamp = params.timestamp;
            anomaly.sessionId = params.sessionId;
            anomaly.type = FlightAnomalyType::CONTROL_INPUT_ANOMALY;
            anomaly.confidence = 0.9; // High confidence for rule violations
            anomaly.description = "Pitch outside allowed range";
            anomaly.expectedBehavior = "Pitch between " + std::to_string(it->second.minValue) + 
                                      " and " + std::to_string(it->second.maxValue) + " degrees";
            anomaly.actualBehavior = "Pitch: " + std::to_string(params.pitch) + " degrees";
            anomaly.modelReference = "RuleBasedAnomalyModel";
            
            // Calculate deviation score
            if (params.pitch < it->second.minValue) {
                anomaly.deviationScore = (it->second.minValue - params.pitch) / std::abs(it->second.minValue);
            } else {
                anomaly.deviationScore = (params.pitch - it->second.maxValue) / it->second.maxValue;
            }
            
            anomaly.parameters["pitch"] = params.pitch;
            anomaly.parameters["minPitch"] = it->second.minValue;
            anomaly.parameters["maxPitch"] = it->second.maxValue;
            
            anomalies.push_back(anomaly);
        }
    }
    
    // Check roll
    if (auto it = _rules.find("roll"); it != _rules.end() && it->second.enabled) {
        if (params.roll < it->second.minValue || params.roll > it->second.maxValue) {
            FlightAnomaly anomaly;
            anomaly.timestamp = params.timestamp;
            anomaly.sessionId = params.sessionId;
            anomaly.type = FlightAnomalyType::CONTROL_INPUT_ANOMALY;
            anomaly.confidence = 0.9; // High confidence for rule violations
            anomaly.description = "Roll outside allowed range";
            anomaly.expectedBehavior = "Roll between " + std::to_string(it->second.minValue) + 
                                     " and " + std::to_string(it->second.maxValue) + " degrees";
            anomaly.actualBehavior = "Roll: " + std::to_string(params.roll) + " degrees";
            anomaly.modelReference = "RuleBasedAnomalyModel";
            
            // Calculate deviation score
            if (params.roll < it->second.minValue) {
                anomaly.deviationScore = (it->second.minValue - params.roll) / std::abs(it->second.minValue);
            } else {
                anomaly.deviationScore = (params.roll - it->second.maxValue) / it->second.maxValue;
            }
            
            anomaly.parameters["roll"] = params.roll;
            anomaly.parameters["minRoll"] = it->second.minValue;
            anomaly.parameters["maxRoll"] = it->second.maxValue;
            
            anomalies.push_back(anomaly);
        }
    }
    
    return anomalies;
}

//----------------------------------------------------------
// AnomalyDetector Implementation
//----------------------------------------------------------

AnomalyDetector::AnomalyDetector(const AnomalyDetectionParameters& parameters)
    : _parameters(parameters) {
    
    initializeDefaultModels();
    Core::Logger::debug("AnomalyDetector initialized");
}

AnomalyDetector::~AnomalyDetector() {
    Core::Logger::debug("AnomalyDetector destroyed");
}

void AnomalyDetector::setParameters(const AnomalyDetectionParameters& parameters) {
    _parameters = parameters;
    Core::Logger::debug("AnomalyDetector parameters updated");
}

AnomalyDetectionParameters AnomalyDetector::getParameters() const {
    return _parameters;
}

std::vector<FlightAnomaly> AnomalyDetector::detectAnomalies(const std::vector<FlightParameters>& data) {
    std::vector<FlightAnomaly> allAnomalies;
    
    if (data.empty()) {
        return allAnomalies;
    }
    
    // Run all enabled models
    for (const auto& [name, config] : _models) {
        if (config.enabled) {
            try {
                auto modelAnomalies = config.model->detectAnomalies(data);
                
                // Filter by confidence threshold
                std::copy_if(
                    modelAnomalies.begin(), modelAnomalies.end(),
                    std::back_inserter(allAnomalies),
                    [this](const auto& anomaly) {
                        return anomaly.confidence >= _parameters.confidenceThreshold;
                    }
                );
            } catch (const std::exception& e) {
                Core::Logger::error("Error in anomaly detection model {}: {}", name, e.what());
            }
        }
    }
    
    // Sort anomalies by confidence (highest first)
    std::sort(
        allAnomalies.begin(), allAnomalies.end(),
        [](const auto& a, const auto& b) {
            return a.confidence > b.confidence;
        }
    );
    
    return allAnomalies;
}

bool AnomalyDetector::train(const std::vector<FlightParameters>& trainingData) {
    bool allSuccess = true;
    
    // Train each model
    for (auto& [name, config] : _models) {
        try {
            bool success = config.model->train(trainingData);
            if (!success) {
                Core::Logger::error("Failed to train anomaly model: {}", name);
                allSuccess = false;
            } else {
                Core::Logger::debug("Successfully trained anomaly model: {}", name);
            }
        } catch (const std::exception& e) {
            Core::Logger::error("Error training anomaly model {}: {}", name, e.what());
            allSuccess = false;
        }
    }
    
    return allSuccess;
}

bool AnomalyDetector::registerModel(std::shared_ptr<AnomalyModel> model) {
    if (!model) {
        Core::Logger::error("Cannot register null anomaly model");
        return false;
    }
    
    const std::string name = model->getName();
    
    // Check if model with this name already exists
    if (_models.find(name) != _models.end()) {
        Core::Logger::error("Anomaly model already exists: {}", name);
        return false;
    }
    
    // Register the model
    _models[name] = {model, true};
    Core::Logger::info("Registered anomaly model: {}", name);
    
    return true;
}

bool AnomalyDetector::unregisterModel(const std::string& modelName) {
    auto it = _models.find(modelName);
    if (it == _models.end()) {
        Core::Logger::error("Anomaly model not found: {}", modelName);
        return false;
    }
    
    _models.erase(it);
    Core::Logger::info("Unregistered anomaly model: {}", modelName);
    
    return true;
}

bool AnomalyDetector::setModelEnabled(const std::string& modelName, bool enabled) {
    auto it = _models.find(modelName);
    if (it == _models.end()) {
        Core::Logger::error("Anomaly model not found: {}", modelName);
        return false;
    }
    
    it->second.enabled = enabled;
    Core::Logger::debug("Anomaly model {} {}", modelName, enabled ? "enabled" : "disabled");
    
    return true;
}

bool AnomalyDetector::isModelEnabled(const std::string& modelName) const {
    auto it = _models.find(modelName);
    if (it == _models.end()) {
        return false;
    }
    
    return it->second.enabled;
}

bool AnomalyDetector::configureModel(const std::string& modelName, 
                                     const std::unordered_map<std::string, std::string>& parameters) {
    auto it = _models.find(modelName);
    if (it == _models.end()) {
        Core::Logger::error("Anomaly model not found: {}", modelName);
        return false;
    }
    
    bool success = it->second.model->initialize(parameters);
    if (success) {
        Core::Logger::debug("Configured anomaly model: {}", modelName);
    } else {
        Core::Logger::error("Failed to configure anomaly model: {}", modelName);
    }
    
    return success;
}

void AnomalyDetector::initializeDefaultModels() {
    // Create and register statistical model
    auto statisticalModel = std::make_shared<StatisticalAnomalyModel>();
    statisticalModel->initialize({{"deviationThreshold", "3.0"}});
    registerModel(statisticalModel);
    
    // Create and register rule-based model
    auto ruleBasedModel = std::make_shared<RuleBasedAnomalyModel>();
    ruleBasedModel->initialize({
        {"airspeed.min", "60.0"},
        {"airspeed.max", "250.0"},
        {"altitude.min", "0.0"},
        {"altitude.max", "10000.0"},
        {"verticalSpeed.min", "-1000.0"},
        {"verticalSpeed.max", "1000.0"},
        {"pitch.min", "-20.0"},
        {"pitch.max", "20.0"},
        {"roll.min", "-45.0"},
        {"roll.max", "45.0"}
    });
    registerModel(ruleBasedModel);
}

FlightAnomaly AnomalyDetector::createAnomaly(
    const FlightParameters& params,
    FlightAnomalyType type,
    double confidence,
    const std::string& description,
    const std::string& expectedBehavior,
    const std::string& actualBehavior,
    const std::string& modelReference) {
    
    FlightAnomaly anomaly;
    anomaly.timestamp = params.timestamp;
    anomaly.sessionId = params.sessionId;
    anomaly.type = type;
    anomaly.confidence = confidence;
    anomaly.description = description;
    anomaly.expectedBehavior = expectedBehavior;
    anomaly.actualBehavior = actualBehavior;
    anomaly.modelReference = modelReference;
    
    return anomaly;
}

} // namespace Simulator
} // namespace PilotTraining
