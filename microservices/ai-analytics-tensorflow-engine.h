#pragma once

#include "inference/inference_engine.h"
#include <unordered_map>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <queue>
#include <atomic>
#include <chrono>
#include <tensorflow/c/c_api.h>

namespace ai_analytics {
namespace inference {

/**
 * @brief TensorFlow model implementation
 */
class TensorFlowModel : public IModel {
public:
    /**
     * @brief Constructor
     * @param model_path Path to model
     * @param model_id Model ID
     */
    TensorFlowModel(const std::string& model_path, const std::string& model_id);
    
    /**
     * @brief Destructor
     */
    ~TensorFlowModel() override;
    
    // IModel implementation
    ModelMetadata getMetadata() const override;
    bool load() override;
    void unload() override;
    ModelOutput runInference(const ModelInput& input) override;
    std::string runInferenceAsync(const ModelInput& input, InferenceCallback callback) override;
    bool supportsInputType(const std::string& input_type) const override;
    bool supportsOutputType(const std::string& output_type) const override;
    
private:
    /**
     * @brief Convert TensorFlow data type to tensor data type
     * @param tf_type TensorFlow data type
     * @return Tensor data type
     */
    static TensorDataType convertTfDataType(TF_DataType tf_type);
    
    /**
     * @brief Convert tensor data type to TensorFlow data type
     * @param type Tensor data type
     * @return TensorFlow data type
     */
    static TF_DataType convertToTfDataType(TensorDataType type);
    
    /**
     * @brief Convert TensorFlow tensor to internal tensor
     * @param tensor TensorFlow tensor
     * @param name Tensor name
     * @return Internal tensor
     */
    Tensor convertTfTensor(TF_Tensor* tensor, const std::string& name);
    
    /**
     * @brief Convert internal tensor to TensorFlow tensor
     * @param tensor Internal tensor
     * @return TensorFlow tensor
     */
    TF_Tensor* convertToTfTensor(const Tensor& tensor);
    
    /**
     * @brief Process JSON input
     * @param json_input JSON input
     * @return Map of input tensors
     */
    std::map<std::string, Tensor> processJsonInput(const nlohmann::json& json_input);
    
    /**
     * @brief Process binary input
     * @param binary_data Binary data
     * @param parameters Input parameters
     * @return Map of input tensors
     */
    std::map<std::string, Tensor> processBinaryInput(const std::vector<uint8_t>& binary_data, 
                                                   const nlohmann::json& parameters);
    
    /**
     * @brief Convert output tensors to JSON
     * @param output_tensors Output tensors
     * @return JSON output
     */
    nlohmann::json tensorsToJson(const std::map<std::string, Tensor>& output_tensors);
    
    /**
     * @brief Convert output tensors to binary
     * @param output_tensors Output tensors
     * @return Binary output
     */
    std::vector<uint8_t> tensorsToBinary(const std::map<std::string, Tensor>& output_tensors);
    
    std::string model_path_;
    std::string model_id_;
    std::atomic<bool> is_loaded_;
    
    TF_Graph* graph_;
    TF_Session* session_;
    
    std::vector<TensorDef> input_tensor_defs_;
    std::vector<TensorDef> output_tensor_defs_;
    
    ModelMetadata metadata_;
    mutable std::mutex mutex_;
    
    // Statistics
    std::atomic<uint64_t> inference_count_;
    std::atomic<double> total_inference_time_ms_;
    std::chrono::system_clock::time_point load_time_;
};

/**
 * @brief TensorFlow inference engine implementation
 */
class TensorFlowInferenceEngine : public IInferenceEngine {
public:
    /**
     * @brief Constructor
     */
    TensorFlowInferenceEngine();
    
    /**
     * @brief Destructor
     */
    ~TensorFlowInferenceEngine() override;
    
    // IInferenceEngine implementation
    bool initialize(const nlohmann::json& config) override;
    void shutdown() override;
    std::string loadModel(const std::string& model_path, const std::string& model_id = "") override;
    bool unloadModel(const std::string& model_id) override;
    std::shared_ptr<IModel> getModel(const std::string& model_id) override;
    std::vector<ModelMetadata> listModels() override;
    ModelOutput runInference(const ModelInput& input) override;
    std::string runInferenceAsync(const ModelInput& input, InferenceCallback callback) override;
    bool cancelAsyncRequest(const std::string& request_id) override;
    nlohmann::json getCapabilities() const override;
    nlohmann::json getStatistics() const override;
    
private:
    /**
     * @brief Async request
     */
    struct AsyncRequest {
        std::string request_id;
        ModelInput input;
        InferenceCallback callback;
        std::chrono::system_clock::time_point submit_time;
    };
    
    /**
     * @brief Worker thread function
     */
    void workerThread();
    
    /**
     * @brief Generate unique request ID
     * @return Unique request ID
     */
    std::string generateRequestId();
    
    nlohmann::json config_;
    std::unordered_map<std::string, std::shared_ptr<TensorFlowModel>> models_;
    mutable std::mutex models_mutex_;
    
    // Async processing
    std::queue<AsyncRequest> request_queue_;
    std::mutex queue_mutex_;
    std::condition_variable queue_condition_;
    std::vector<std::thread> worker_threads_;
    std::atomic<bool> running_;
    
    // Statistics
    std::atomic<uint64_t> total_inference_count_;
    std::atomic<double> total_inference_time_ms_;
    std::chrono::system_clock::time_point start_time_;
};

} // namespace inference
} // namespace ai_analytics