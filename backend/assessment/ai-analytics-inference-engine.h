#pragma once

#include "models/model_interface.h"
#include <string>
#include <memory>
#include <unordered_map>
#include <mutex>
#include <thread>
#include <queue>
#include <future>
#include <functional>
#include <condition_variable>

namespace ai_analytics {
namespace inference {

/**
 * @brief Inference request
 */
struct InferenceRequest {
    std::string request_id;
    std::string model_id;
    nlohmann::json input_data;
    std::chrono::system_clock::time_point timestamp;
    std::promise<nlohmann::json> result_promise;
};

/**
 * @brief Inference engine interface
 */
class IInferenceEngine {
public:
    virtual ~IInferenceEngine() = default;
    
    /**
     * @brief Initialize the inference engine
     * @param model_repository Model repository
     * @return True if initialized successfully
     */
    virtual bool initialize(std::shared_ptr<models::IModelRepository> model_repository) = 0;
    
    /**
     * @brief Shutdown the inference engine
     */
    virtual void shutdown() = 0;
    
    /**
     * @brief Run inference
     * @param model_id Model ID
     * @param input_data Input data
     * @return Inference result or nullopt if inference failed
     */
    virtual std::optional<nlohmann::json> runInference(
        const std::string& model_id,
        const nlohmann::json& input_data
    ) = 0;
    
    /**
     * @brief Submit inference request
     * @param model_id Model ID
     * @param input_data Input data
     * @return Future with inference result
     */
    virtual std::future<nlohmann::json> submitInferenceRequest(
        const std::string& model_id,
        const nlohmann::json& input_data
    ) = 0;
    
    /**
     * @brief Get model by ID
     * @param model_id Model ID
     * @return Model instance or nullptr if not found
     */
    virtual std::shared_ptr<models::IModel> getModel(const std::string& model_id) = 0;
    
    /**
     * @brief Load model
     * @param model_id Model ID
     * @return True if loaded successfully
     */
    virtual bool loadModel(const std::string& model_id) = 0;
    
    /**
     * @brief Unload model
     * @param model_id Model ID
     * @return True if unloaded successfully
     */
    virtual bool unloadModel(const std::string& model_id) = 0;
    
    /**
     * @brief Get loaded models
     * @return List of loaded model IDs
     */
    virtual std::vector<std::string> getLoadedModels() const = 0;
    
    /**
     * @brief Get engine statistics
     * @return Statistics as JSON
     */
    virtual nlohmann::json getStatistics() const = 0;
};

/**
 * @brief Inference engine implementation
 */
class InferenceEngine : public IInferenceEngine {
public:
    /**
     * @brief Constructor
     * @param num_threads Number of worker threads (default: number of CPU cores)
     */
    explicit InferenceEngine(
        int num_threads = std::thread::hardware_concurrency()
    );
    
    /**
     * @brief Destructor
     */
    ~InferenceEngine() override;
    
    // IInferenceEngine implementation
    bool initialize(std::shared_ptr<models::IModelRepository> model_repository) override;
    void shutdown() override;
    std::optional<nlohmann::json> runInference(
        const std::string& model_id,
        const nlohmann::json& input_data
    ) override;
    std::future<nlohmann::json> submitInferenceRequest(
        const std::string& model_id,
        const nlohmann::json& input_data
    ) override;
    std::shared_ptr<models::IModel> getModel(const std::string& model_id) override;
    bool loadModel(const std::string& model_id) override;
    bool unloadModel(const std::string& model_id) override;
    std::vector<std::string> getLoadedModels() const override;
    nlohmann::json getStatistics() const override;

private:
    /**
     * @brief Worker thread function
     */
    void workerFunction();
    
    /**
     * @brief Generate unique request ID
     * @return Unique request ID
     */
    std::string generateRequestId();
    
    std::shared_ptr<models::IModelRepository> model_repository_;
    std::unordered_map<std::string, std::shared_ptr<models::IModel>> loaded_models_;
    mutable std::mutex models_mutex_;
    
    std::queue<InferenceRequest> request_queue_;
    std::mutex queue_mutex_;
    std::condition_variable queue_condition_;
    std::atomic<bool> running_;
    
    std::vector<std::thread> worker_threads_;
    int num_threads_;
    
    // Statistics
    std::atomic<uint64_t> total_requests_;
    std::atomic<uint64_t> successful_requests_;
    std::atomic<uint64_t> failed_requests_;
    std::unordered_map<std::string, uint64_t> model_usage_;
    mutable std::mutex stats_mutex_;
    
    std::chrono::system_clock::time_point start_time_;
};

/**
 * @brief Cognitive state assessment model interface
 */
class ICognitiveStateModel : public models::IModel {
public:
    /**
     * @brief Cognitive state type
     */
    enum class StateType {
        WORKLOAD,
        FATIGUE,
        ATTENTION,
        STRESS,
        EXPERTISE_LEVEL
    };
    
    /**
     * @brief Cognitive state result
     */
    struct StateResult {
        StateType type;
        double value;
        double confidence;
        std::string interpretation;
        std::unordered_map<std::string, double> contributing_factors;
    };
    
    /**
     * @brief Predict cognitive state
     * @param input_data Input data
     * @return Cognitive state result or nullopt if prediction failed
     */
    virtual std::optional<StateResult> predictState(
        const nlohmann::json& input_data
    ) = 0;
};

/**
 * @brief Performance prediction model interface
 */
class IPerformanceModel : public models::IModel {
public:
    /**
     * @brief Performance prediction result
     */
    struct PredictionResult {
        double score;
        double confidence;
        std::unordered_map<std::string, double> factor_contributions;
        std::vector<std::string> areas_for_improvement;
        std::vector<std::string> strengths;
    };
    
    /**
     * @brief Predict performance
     * @param input_data Input data
     * @return Performance prediction result or nullopt if prediction failed
     */
    virtual std::optional<PredictionResult> predictPerformance(
        const nlohmann::json& input_data
    ) = 0;
};

/**
 * @brief Anomaly detection model interface
 */
class IAnomalyDetectionModel : public models::IModel {
public:
    /**
     * @brief Anomaly detection result
     */
    struct AnomalyResult {
        bool is_anomaly;
        double anomaly_score;
        double confidence;
        std::string anomaly_type;
        std::unordered_map<std::string, double> contributing_factors;
        std::vector<std::string> recommendations;
    };
    
    /**
     * @brief Detect anomalies
     * @param input_data Input data
     * @return Anomaly detection result or nullopt if detection failed
     */
    virtual std::optional<AnomalyResult> detectAnomalies(
        const nlohmann::json& input_data
    ) = 0;
};

} // namespace inference
} // namespace ai_analytics