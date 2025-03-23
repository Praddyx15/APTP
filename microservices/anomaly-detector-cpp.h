// src/backend/simulator/AnomalyDetector.h
#pragma once

#include <vector>
#include <unordered_map>
#include <memory>
#include <functional>
#include <string>

#include "FlightParameters.h"

namespace PilotTraining {
namespace Simulator {

/**
 * @brief Models for anomaly detection
 */
enum class AnomalyModelType {
    STATISTICAL,    // Statistical model based on historical data
    RULE_BASED,     // Rule-based model with explicit thresholds
    MACHINE_LEARNING, // Machine learning model
    CUSTOM          // Custom user-defined model
};

/**
 * @brief Base class for anomaly detection models
 */
class AnomalyModel {
public:
    virtual ~AnomalyModel() = default;
    
    /**
     * @brief Initialize the model with parameters
     * 
     * @param parameters Model-specific parameters
     * @return true if initialization successful
     * @return false if initialization failed
     */
    virtual bool initialize(const std::unordered_map<std::string, std::string>& parameters) = 0;
    
    /**
     * @brief Train the model with historical data
     * 
     * @param trainingData Training data samples
     * @return true if training successful
     * @return false if training failed
     */
    virtual bool train(const std::vector<FlightParameters>& trainingData) = 0;
    
    /**
     * @brief Detect anomalies in new data
     * 
     * @param data Data samples to analyze
     * @return std::vector<FlightAnomaly> Detected anomalies
     */
    virtual std::vector<FlightAnomaly> detectAnomalies(const std::vector<FlightParameters>& data) = 0;
    
    /**
     * @brief Get the model type
     * 
     * @return AnomalyModelType Model type
     */
    virtual AnomalyModelType getType() const = 0;
    
    /**
     * @brief Get the model name
     * 
     * @return std::string Model name
     */
    virtual std::string getName() const = 0;
};

/**
 * @brief Statistical anomaly detection model
 */
class StatisticalAnomalyModel : public AnomalyModel {
public:
    StatisticalAnomalyModel();
    ~StatisticalAnomalyModel() override;
    
    bool initialize(const std::unordered_map<std::string, std::string>& parameters) override;
    bool train(const std::vector<FlightParameters>& trainingData) override;
    std::vector<FlightAnomaly> detectAnomalies(const std::vector<FlightParameters>& data) override;
    AnomalyModelType getType() const override { return AnomalyModelType::STATISTICAL; }
    std::string getName() const override { return "StatisticalAnomalyModel"; }
    
private:
    struct ParameterStatistics {
        double mean;
        double standardDeviation;
        double min;
        double max;
    };
    
    std::unordered_map<std::string, ParameterStatistics> _statistics;
    double _deviationThreshold;
    bool _trained;
};

/**
 * @brief Rule-based anomaly detection model
 */
class RuleBasedAnomalyModel : public AnomalyModel {
public:
    RuleBasedAnomalyModel();
    ~RuleBasedAnomalyModel() override;
    
    bool initialize(const std::unordered_map<std::string, std::string>& parameters) override;
    bool train(const std::vector<FlightParameters>& trainingData) override;
    std::vector<FlightAnomaly> detectAnomalies(const std::vector<FlightParameters>& data) override;
    AnomalyModelType getType() const override { return AnomalyModelType::RULE_BASED; }
    std::string getName() const override { return "RuleBasedAnomalyModel"; }
    
private:
    struct ParameterRule {
        double minValue;
        double maxValue;
        bool enabled;
    };
    
    std::unordered_map<std::string, ParameterRule> _rules;
    bool _initialized;
};

/**
 * @brief Flight anomaly detector
 * 
 * Detects anomalies in flight data that deviate from normal behavior.
 * Uses multiple detection models and can be configured for different
 * types of aircraft and flight regimes.
 */
class AnomalyDetector {
public:
    /**
     * @brief Construct a new Anomaly Detector
     * 
     * @param parameters Optional anomaly detection parameters
     */
    explicit AnomalyDetector(const AnomalyDetectionParameters& parameters = AnomalyDetectionParameters());
    
    /**
     * @brief Destroy the Anomaly Detector
     */
    ~AnomalyDetector();
    
    /**
     * @brief Set detection parameters
     * 
     * @param parameters New anomaly detection parameters
     */
    void setParameters(const AnomalyDetectionParameters& parameters);
    
    /**
     * @brief Get current detection parameters
     * 
     * @return AnomalyDetectionParameters Current parameters
     */
    AnomalyDetectionParameters getParameters() const;
    
    /**
     * @brief Detect anomalies in telemetry data
     * 
     * @param data Sequence of flight parameters to analyze
     * @return std::vector<FlightAnomaly> Detected anomalies
     */
    std::vector<FlightAnomaly> detectAnomalies(const std::vector<FlightParameters>& data);
    
    /**
     * @brief Train detector with normal flight data
     * 
     * @param trainingData Collection of normal flight data
     * @return true if training was successful
     * @return false if training failed
     */
    bool train(const std::vector<FlightParameters>& trainingData);
    
    /**
     * @brief Register a custom anomaly detection model
     * 
     * @param model Custom model to register
     * @return true if registration successful
     * @return false if registration failed
     */
    bool registerModel(std::shared_ptr<AnomalyModel> model);
    
    /**
     * @brief Unregister an anomaly detection model
     * 
     * @param modelName Name of the model to unregister
     * @return true if unregistration successful
     * @return false if model not found
     */
    bool unregisterModel(const std::string& modelName);
    
    /**
     * @brief Enable/disable a specific anomaly detection model
     * 
     * @param modelName Name of the model
     * @param enabled Whether the model should be enabled
     * @return true if the model state was changed
     * @return false if the model does not exist
     */
    bool setModelEnabled(const std::string& modelName, bool enabled);
    
    /**
     * @brief Check if a specific model is enabled
     * 
     * @param modelName Name of the model
     * @return true if the model is enabled
     * @return false if the model is disabled or does not exist
     */
    bool isModelEnabled(const std::string& modelName) const;
    
    /**
     * @brief Configure model parameters
     * 
     * @param modelName Name of the model to configure
     * @param parameters Model-specific parameters
     * @return true if configuration successful
     * @return false if configuration failed or model not found
     */
    bool configureModel(const std::string& modelName, 
                       const std::unordered_map<std::string, std::string>& parameters);

private:
    // Internal model configuration
    struct ModelConfig {
        std::shared_ptr<AnomalyModel> model;
        bool enabled;
    };
    
    // Detection parameters
    AnomalyDetectionParameters _parameters;
    
    // Registered models
    std::unordered_map<std::string, ModelConfig> _models;
    
    // Initialize default models
    void initializeDefaultModels();
    
    // Helper methods
    FlightAnomaly createAnomaly(
        const FlightParameters& params,
        FlightAnomalyType type,
        double confidence,
        const std::string& description,
        const std::string& expectedBehavior,
        const std::string& actualBehavior,
        const std::string& modelReference
    );
};

} // namespace Simulator
} // namespace PilotTraining
