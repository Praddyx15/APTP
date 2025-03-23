#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <optional>
#include <chrono>
#include <Eigen/Dense>
#include <nlohmann/json.hpp>

namespace ai_analytics {
namespace cognitive {

/**
 * @brief Cognitive state types
 */
enum class CognitiveState {
    FOCUSED,
    DISTRACTED,
    OVERLOADED,
    FATIGUED,
    STRESSED,
    CONFUSED,
    COMFORTABLE,
    VIGILANT
};

/**
 * @brief Convert CognitiveState to string
 */
std::string cognitiveStateToString(CognitiveState state);

/**
 * @brief Convert string to CognitiveState
 */
CognitiveState cognitiveStateFromString(const std::string& state_str);

/**
 * @brief Mental workload level
 */
enum class WorkloadLevel {
    LOW,
    MEDIUM,
    HIGH,
    OVERLOAD
};

/**
 * @brief Convert WorkloadLevel to string
 */
std::string workloadLevelToString(WorkloadLevel level);

/**
 * @brief Convert string to WorkloadLevel
 */
WorkloadLevel workloadLevelFromString(const std::string& level_str);

/**
 * @brief Eye tracking data
 */
struct EyeTrackingData {
    std::vector<std::pair<double, double>> gaze_positions;  // (x,y) normalized 0-1
    std::vector<double> pupil_diameters;
    std::vector<int> fixation_durations;
    std::vector<double> saccade_velocities;
    std::vector<std::chrono::microseconds> timestamps;
    
    /**
     * @brief Convert to JSON
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     */
    static std::optional<EyeTrackingData> fromJson(const nlohmann::json& json);
};

/**
 * @brief Physiological data
 */
struct PhysiologicalData {
    std::vector<double> heart_rate;
    std::vector<double> heart_rate_variability;
    std::vector<double> galvanic_skin_response;
    std::vector<double> respiration_rate;
    std::vector<std::chrono::microseconds> timestamps;
    
    /**
     * @brief Convert to JSON
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     */
    static std::optional<PhysiologicalData> fromJson(const nlohmann::json& json);
};

/**
 * @brief Performance data
 */
struct PerformanceData {
    std::vector<double> reaction_times;
    std::vector<int> error_counts;
    std::vector<double> task_completion_times;
    std::vector<double> accuracy_scores;
    std::vector<std::chrono::microseconds> timestamps;
    
    /**
     * @brief Convert to JSON
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     */
    static std::optional<PerformanceData> fromJson(const nlohmann::json& json);
};

/**
 * @brief Cognitive state assessment input data
 */
struct CognitiveAssessmentInput {
    std::string session_id;
    std::string trainee_id;
    std::string exercise_id;
    std::optional<EyeTrackingData> eye_tracking;
    std::optional<PhysiologicalData> physiological;
    std::optional<PerformanceData> performance;
    std::chrono::system_clock::time_point timestamp;
    
    /**
     * @brief Convert to JSON
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     */
    static std::optional<CognitiveAssessmentInput> fromJson(const nlohmann::json& json);
};

/**
 * @brief Cognitive state assessment result
 */
struct CognitiveAssessmentResult {
    std::string session_id;
    std::string trainee_id;
    std::string exercise_id;
    CognitiveState primary_state;
    std::map<CognitiveState, double> state_probabilities;
    WorkloadLevel workload_level;
    double workload_score;  // 0-100
    double attention_score;  // 0-100
    double stress_level;  // 0-100
    double fatigue_level;  // 0-100
    std::chrono::system_clock::time_point timestamp;
    std::vector<std::string> observations;
    std::vector<std::string> recommendations;
    
    /**
     * @brief Convert to JSON
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     */
    static std::optional<CognitiveAssessmentResult> fromJson(const nlohmann::json& json);
};

/**
 * @brief Cognitive state assessment model interface
 */
class ICognitiveModel {
public:
    virtual ~ICognitiveModel() = default;
    
    /**
     * @brief Initialize the model
     * @param config Configuration parameters
     * @return True if initialized successfully
     */
    virtual bool initialize(const nlohmann::json& config) = 0;
    
    /**
     * @brief Assess cognitive state
     * @param input Assessment input data
     * @return Assessment result
     */
    virtual CognitiveAssessmentResult assessCognitiveState(const CognitiveAssessmentInput& input) = 0;
    
    /**
     * @brief Train the model
     * @param training_data Training data
     * @return True if trained successfully
     */
    virtual bool train(const std::vector<std::pair<CognitiveAssessmentInput, CognitiveAssessmentResult>>& training_data) = 0;
    
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
 * @brief Feature-based cognitive model implementation
 */
class FeatureBasedCognitiveModel : public ICognitiveModel {
public:
    /**
     * @brief Constructor
     */
    FeatureBasedCognitiveModel();
    
    /**
     * @brief Destructor
     */
    ~FeatureBasedCognitiveModel() override;
    
    bool initialize(const nlohmann::json& config) override;
    CognitiveAssessmentResult assessCognitiveState(const CognitiveAssessmentInput& input) override;
    bool train(const std::vector<std::pair<CognitiveAssessmentInput, CognitiveAssessmentResult>>& training_data) override;
    bool saveModel(const std::string& file_path) override;
    bool loadModel(const std::string& file_path) override;
    nlohmann::json getModelMetrics() const override;
    
private:
    /**
     * @brief Extract eye tracking features
     * @param eye_data Eye tracking data
     * @return Extracted features
     */
    std::vector<double> extractEyeFeatures(const EyeTrackingData& eye_data) const;
    
    /**
     * @brief Extract physiological features
     * @param phys_data Physiological data
     * @return Extracted features
     */
    std::vector<double> extractPhysiologicalFeatures(const PhysiologicalData& phys_data) const;
    
    /**
     * @brief Extract performance features
     * @param perf_data Performance data
     * @return Extracted features
     */
    std::vector<double> extractPerformanceFeatures(const PerformanceData& perf_data) const;
    
    /**
     * @brief Generate recommendations based on cognitive state
     * @param state Cognitive state
     * @param workload Workload level
     * @return List of recommendations
     */
    std::vector<std::string> generateRecommendations(CognitiveState state, WorkloadLevel workload) const;
    
    /**
     * @brief Calculate workload level
     * @param features Feature vector
     * @return Workload level and score
     */
    std::pair<WorkloadLevel, double> calculateWorkload(const Eigen::VectorXd& features) const;
    
    /**
     * @brief Map features to cognitive state
     * @param features Feature vector
     * @return Cognitive state probabilities
     */
    std::map<CognitiveState, double> mapFeaturesToStates(const Eigen::VectorXd& features) const;
    
    std::vector<std::string> feature_names_;
    Eigen::MatrixXd model_weights_;
    Eigen::VectorXd model_bias_;
    bool initialized_;
    nlohmann::json model_metrics_;
    double attention_threshold_;
    double stress_threshold_;
    double fatigue_threshold_;
};

/**
 * @brief Deep learning based cognitive model
 */
class DeepLearningCognitiveModel : public ICognitiveModel {
public:
    DeepLearningCognitiveModel();
    ~DeepLearningCognitiveModel() override;
    
    bool initialize(const nlohmann::json& config) override;
    CognitiveAssessmentResult assessCognitiveState(const CognitiveAssessmentInput& input) override;
    bool train(const std::vector<std::pair<CognitiveAssessmentInput, CognitiveAssessmentResult>>& training_data) override;
    bool saveModel(const std::string& file_path) override;
    bool loadModel(const std::string& file_path) override;
    nlohmann::json getModelMetrics() const override;
    
private:
    // Deep learning model implementation details
    // In a real implementation, this would use a deep learning framework
    bool initialized_;
    nlohmann::json model_metrics_;
};

/**
 * @brief Cognitive model factory
 */
class CognitiveModelFactory {
public:
    /**
     * @brief Get singleton instance
     * @return Factory instance
     */
    static CognitiveModelFactory& getInstance();
    
    /**
     * @brief Create a cognitive model
     * @param model_type Model type name
     * @return Model instance
     */
    std::unique_ptr<ICognitiveModel> createModel(const std::string& model_type);
    
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
    CognitiveModelFactory();
    ~CognitiveModelFactory() = default;
    
    CognitiveModelFactory(const CognitiveModelFactory&) = delete;
    CognitiveModelFactory& operator=(const CognitiveModelFactory&) = delete;
    
    std::map<std::string, std::function<std::unique_ptr<ICognitiveModel>()>> creators_;
};

} // namespace cognitive
} // namespace ai_analytics