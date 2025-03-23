#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <optional>
#include <Eigen/Dense>
#include <mlpack/core.hpp>
#include <mlpack/methods/random_forest/random_forest.hpp>

namespace ai_analytics {
namespace models {

/**
 * @brief Performance metric types
 */
enum class MetricType {
    ACCURACY,
    REACTION_TIME,
    DECISION_QUALITY,
    CONSISTENCY,
    WORKLOAD_MANAGEMENT,
    SITUATIONAL_AWARENESS,
    COMMUNICATION_QUALITY,
    PROCEDURAL_COMPLIANCE,
    RESOURCE_MANAGEMENT,
    TECHNICAL_PROFICIENCY
};

/**
 * @brief Performance rating scale (1-5)
 */
enum class PerformanceRating {
    UNSATISFACTORY = 1,
    NEEDS_IMPROVEMENT = 2,
    SATISFACTORY = 3,
    GOOD = 4,
    EXCELLENT = 5
};

/**
 * @brief Training session data
 */
struct SessionData {
    std::string session_id;
    std::string trainee_id;
    std::string exercise_id;
    std::vector<double> features;
    std::vector<double> labels;
    std::chrono::system_clock::time_point timestamp;
    
    /**
     * @brief Convert to vector for model input
     */
    Eigen::VectorXd toVector() const;
};

/**
 * @brief Performance prediction result
 */
struct PerformancePrediction {
    std::string trainee_id;
    std::string exercise_id;
    std::map<MetricType, double> metric_scores;
    std::map<std::string, double> skill_scores;
    double overall_score;
    PerformanceRating overall_rating;
    std::vector<std::string> strengths;
    std::vector<std::string> improvement_areas;
    std::map<std::string, std::vector<double>> trend_data;
    std::chrono::system_clock::time_point timestamp;
    
    /**
     * @brief Convert to JSON
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     */
    static std::optional<PerformancePrediction> fromJson(const nlohmann::json& json);
};

/**
 * @brief Feature extraction result
 */
struct FeatureExtractionResult {
    std::vector<double> features;
    std::vector<std::string> feature_names;
    std::map<std::string, double> feature_importances;
    
    /**
     * @brief Convert to JSON
     */
    nlohmann::json toJson() const;
};

/**
 * @brief Performance analysis model interface
 */
class IPerformanceModel {
public:
    virtual ~IPerformanceModel() = default;
    
    /**
     * @brief Initialize the model
     * @param config Configuration parameters
     * @return True if initialized successfully
     */
    virtual bool initialize(const nlohmann::json& config) = 0;
    
    /**
     * @brief Train the model
     * @param training_data Training data
     * @return True if trained successfully
     */
    virtual bool train(const std::vector<SessionData>& training_data) = 0;
    
    /**
     * @brief Predict performance
     * @param session_data Session data
     * @return Performance prediction
     */
    virtual PerformancePrediction predict(const SessionData& session_data) = 0;
    
    /**
     * @brief Extract features from raw data
     * @param raw_data Raw session data
     * @return Extracted features
     */
    virtual FeatureExtractionResult extractFeatures(const nlohmann::json& raw_data) = 0;
    
    /**
     * @brief Save model to file
     * @param file_path File path
     * @return True if saved successfully
     */
    virtual bool saveModel(const std::string& file_path) = 0;
    
    /**
     * @brief Load model from file
     * @param file_path File path
     * @return True if loaded successfully
     */
    virtual bool loadModel(const std::string& file_path) = 0;
    
    /**
     * @brief Get model metrics
     * @return Model metrics as JSON
     */
    virtual nlohmann::json getModelMetrics() const = 0;
};

/**
 * @brief Random forest based performance model
 */
class RandomForestPerformanceModel : public IPerformanceModel {
public:
    /**
     * @brief Constructor
     */
    RandomForestPerformanceModel();
    
    /**
     * @brief Destructor
     */
    ~RandomForestPerformanceModel() override;
    
    bool initialize(const nlohmann::json& config) override;
    bool train(const std::vector<SessionData>& training_data) override;
    PerformancePrediction predict(const SessionData& session_data) override;
    FeatureExtractionResult extractFeatures(const nlohmann::json& raw_data) override;
    bool saveModel(const std::string& file_path) override;
    bool loadModel(const std::string& file_path) override;
    nlohmann::json getModelMetrics() const override;
    
private:
    /**
     * @brief Preprocess training data
     * @param training_data Training data
     * @return Preprocessed data as arma::mat
     */
    std::pair<arma::mat, arma::Row<size_t>> preprocessTrainingData(
        const std::vector<SessionData>& training_data
    );
    
    /**
     * @brief Map raw features to prediction metrics
     * @param raw_prediction Raw model prediction
     * @return Mapped performance prediction
     */
    PerformancePrediction mapPredictionToMetrics(
        const SessionData& session_data,
        const arma::Row<size_t>& raw_prediction
    );
    
    /**
     * @brief Calculate feature importances
     * @return Feature importance map
     */
    std::map<std::string, double> calculateFeatureImportances() const;
    
    /**
     * @brief Generate improvement recommendations
     * @param metrics Performance metrics
     * @return Pair of strengths and improvement areas
     */
    std::pair<std::vector<std::string>, std::vector<std::string>> generateRecommendations(
        const std::map<MetricType, double>& metrics
    ) const;
    
    /**
     * @brief Extract time series features
     * @param time_series Time series data
     * @return Extracted features
     */
    std::vector<double> extractTimeSeriesFeatures(
        const std::vector<double>& time_series
    ) const;
    
    /**
     * @brief Extract spatial features
     * @param spatial_data Spatial data
     * @return Extracted features
     */
    std::vector<double> extractSpatialFeatures(
        const std::vector<std::vector<double>>& spatial_data
    ) const;
    
    std::unique_ptr<mlpack::RandomForest<>> model_;
    std::vector<std::string> feature_names_;
    std::vector<std::string> label_names_;
    std::map<std::string, double> feature_importances_;
    nlohmann::json model_metrics_;
    bool initialized_;
    unsigned int num_trees_;
    unsigned int min_leaf_size_;
    unsigned int max_depth_;
    double minimum_gain_split_;
    unsigned int num_samples_;
};

/**
 * @brief Neural network based performance model
 */
class NeuralNetworkPerformanceModel : public IPerformanceModel {
public:
    NeuralNetworkPerformanceModel();
    ~NeuralNetworkPerformanceModel() override;
    
    bool initialize(const nlohmann::json& config) override;
    bool train(const std::vector<SessionData>& training_data) override;
    PerformancePrediction predict(const SessionData& session_data) override;
    FeatureExtractionResult extractFeatures(const nlohmann::json& raw_data) override;
    bool saveModel(const std::string& file_path) override;
    bool loadModel(const std::string& file_path) override;
    nlohmann::json getModelMetrics() const override;
    
private:
    // Neural network implementation details
    // This would use a deep learning framework in a real implementation
    bool initialized_;
    nlohmann::json model_metrics_;
};

/**
 * @brief Performance model factory
 */
class PerformanceModelFactory {
public:
    /**
     * @brief Get singleton instance
     * @return Factory instance
     */
    static PerformanceModelFactory& getInstance();
    
    /**
     * @brief Create a performance model
     * @param model_type Model type name
     * @return Model instance
     */
    std::unique_ptr<IPerformanceModel> createModel(const std::string& model_type);
    
    /**
     * @brief Register a model type
     * @tparam T Model class type
     * @param model_type Model type name
     */
    template<typename T>
    void registerModel(const std::string& model_type) {
        creators_[model_type] = []() { return std::make_unique<T>(); };
    }
    
private:
    PerformanceModelFactory();
    ~PerformanceModelFactory() = default;
    
    PerformanceModelFactory(const PerformanceModelFactory&) = delete;
    PerformanceModelFactory& operator=(const PerformanceModelFactory&) = delete;
    
    std::map<std::string, std::function<std::unique_ptr<IPerformanceModel>()>> creators_;
};

} // namespace models
} // namespace ai_analytics