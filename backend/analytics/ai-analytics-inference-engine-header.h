#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <optional>
#include <functional>
#include <nlohmann/json.hpp>

namespace ai_analytics {
namespace inference {

/**
 * @brief Model input data
 */
struct ModelInput {
    std::string model_id;
    std::string input_type;
    nlohmann::json parameters;
    std::vector<uint8_t> binary_data;
};

/**
 * @brief Model output data
 */
struct ModelOutput {
    std::string model_id;
    std::string output_type;
    nlohmann::json results;
    std::vector<uint8_t> binary_data;
    double confidence;
    double latency_ms;
    bool success;
    std::string error_message;
};

/**
 * @brief Model metadata
 */
struct ModelMetadata {
    std::string model_id;
    std::string name;
    std::string version;
    std::string description;
    std::vector<std::string> input_types;
    std::vector<std::string> output_types;
    std::map<std::string, std::string> capabilities;
    bool is_loaded;
    double average_inference_time_ms;
    std::string creation_date;
    std::string last_updated;
};

/**
 * @brief Inference callback type
 */
using InferenceCallback = std::function<void(const ModelOutput&)>;

/**
 * @brief Model interface for inference engines
 */
class IModel {
public:
    virtual ~IModel() = default;
    
    /**
     * @brief Get model metadata
     * @return Model metadata
     */
    virtual ModelMetadata getMetadata() const = 0;
    
    /**
     * @brief Load the model
     * @return True if loaded successfully
     */
    virtual bool load() = 0;
    
    /**
     * @brief Unload the model
     */
    virtual void unload() = 0;
    
    /**
     * @brief Run inference
     * @param input Model input
     * @return Model output
     */
    virtual ModelOutput runInference(const ModelInput& input) = 0;
    
    /**
     * @brief Run inference asynchronously
     * @param input Model input
     * @param callback Callback to receive results
     * @return Request ID for tracking
     */
    virtual std::string runInferenceAsync(const ModelInput& input, InferenceCallback callback) = 0;
    
    /**
     * @brief Check if model supports input type
     * @param input_type Input type
     * @return True if supported
     */
    virtual bool supportsInputType(const std::string& input_type) const = 0;
    
    /**
     * @brief Check if model supports output type
     * @param output_type Output type
     * @return True if supported
     */
    virtual bool supportsOutputType(const std::string& output_type) const = 0;
};

/**
 * @brief Inference engine interface
 */
class IInferenceEngine {
public:
    virtual ~IInferenceEngine() = default;
    
    /**
     * @brief Initialize the engine
     * @param config Engine configuration
     * @return True if initialized successfully
     */
    virtual bool initialize(const nlohmann::json& config) = 0;
    
    /**
     * @brief Shutdown the engine
     */
    virtual void shutdown() = 0;
    
    /**
     * @brief Load model
     * @param model_path Path to model
     * @param model_id Model ID (empty for auto-generation)
     * @return Model ID if loaded successfully, empty string otherwise
     */
    virtual std::string loadModel(const std::string& model_path, const std::string& model_id = "") = 0;
    
    /**
     * @brief Unload model
     * @param model_id Model ID
     * @return True if unloaded successfully
     */
    virtual bool unloadModel(const std::string& model_id) = 0;
    
    /**
     * @brief Get model
     * @param model_id Model ID
     * @return Model instance or nullptr if not found
     */
    virtual std::shared_ptr<IModel> getModel(const std::string& model_id) = 0;
    
    /**
     * @brief List available models
     * @return List of model metadata
     */
    virtual std::vector<ModelMetadata> listModels() = 0;
    
    /**
     * @brief Run inference
     * @param input Model input
     * @return Model output
     */
    virtual ModelOutput runInference(const ModelInput& input) = 0;
    
    /**
     * @brief Run inference asynchronously
     * @param input Model input
     * @param callback Callback to receive results
     * @return Request ID for tracking
     */
    virtual std::string runInferenceAsync(const ModelInput& input, InferenceCallback callback) = 0;
    
    /**
     * @brief Cancel asynchronous inference request
     * @param request_id Request ID
     * @return True if cancelled successfully
     */
    virtual bool cancelAsyncRequest(const std::string& request_id) = 0;
    
    /**
     * @brief Get engine capabilities
     * @return Engine capabilities as JSON
     */
    virtual nlohmann::json getCapabilities() const = 0;
    
    /**
     * @brief Get engine statistics
     * @return Engine statistics as JSON
     */
    virtual nlohmann::json getStatistics() const = 0;
};

/**
 * @brief Tensor data type
 */
enum class TensorDataType {
    FLOAT32,
    INT32,
    INT64,
    UINT8,
    STRING
};

/**
 * @brief Convert tensor data type to string
 * @param type Tensor data type
 * @return String representation
 */
std::string tensorDataTypeToString(TensorDataType type);

/**
 * @brief Convert string to tensor data type
 * @param str String representation
 * @return Tensor data type
 */
TensorDataType tensorDataTypeFromString(const std::string& str);

/**
 * @brief Tensor shape
 */
using TensorShape = std::vector<int64_t>;

/**
 * @brief Tensor definition
 */
struct TensorDef {
    std::string name;
    TensorDataType data_type;
    TensorShape shape;
};

/**
 * @brief Tensor data
 */
class Tensor {
public:
    /**
     * @brief Constructor
     * @param name Tensor name
     * @param data_type Tensor data type
     * @param shape Tensor shape
     */
    Tensor(const std::string& name, TensorDataType data_type, const TensorShape& shape);
    
    /**
     * @brief Constructor with data
     * @param name Tensor name
     * @param data_type Tensor data type
     * @param shape Tensor shape
     * @param data Tensor data
     * @param data_size Data size in bytes
     */
    Tensor(const std::string& name, TensorDataType data_type, const TensorShape& shape, 
           const void* data, size_t data_size);
    
    /**
     * @brief Get tensor definition
     * @return Tensor definition
     */
    TensorDef getDefinition() const;
    
    /**
     * @brief Get tensor name
     * @return Tensor name
     */
    const std::string& getName() const;
    
    /**
     * @brief Get tensor data type
     * @return Tensor data type
     */
    TensorDataType getDataType() const;
    
    /**
     * @brief Get tensor shape
     * @return Tensor shape
     */
    const TensorShape& getShape() const;
    
    /**
     * @brief Get tensor data
     * @return Tensor data
     */
    const void* getData() const;
    
    /**
     * @brief Get tensor data size
     * @return Tensor data size in bytes
     */
    size_t getDataSize() const;
    
    /**
     * @brief Set tensor data
     * @param data Tensor data
     * @param data_size Data size in bytes
     * @return True if data set successfully
     */
    bool setData(const void* data, size_t data_size);
    
    /**
     * @brief Resize tensor
     * @param shape New tensor shape
     * @return True if resized successfully
     */
    bool resize(const TensorShape& shape);
    
    /**
     * @brief Get number of elements
     * @return Number of elements
     */
    int64_t getNumElements() const;
    
    /**
     * @brief Get element size
     * @return Element size in bytes
     */
    size_t getElementSize() const;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Tensor or nullopt if invalid
     */
    static std::optional<Tensor> fromJson(const nlohmann::json& json);
    
private:
    std::string name_;
    TensorDataType data_type_;
    TensorShape shape_;
    std::vector<uint8_t> data_;
    
    /**
     * @brief Calculate buffer size
     * @return Buffer size in bytes
     */
    size_t calculateBufferSize() const;
};

/**
 * @brief Factory for creating inference engines
 */
class InferenceEngineFactory {
public:
    /**
     * @brief Get the singleton instance
     * @return Factory instance
     */
    static InferenceEngineFactory& getInstance();
    
    /**
     * @brief Register an inference engine type
     * @tparam T Engine type
     * @param name Engine name
     */
    template<typename T>
    void registerEngine(const std::string& name) {
        creators_[name] = []() { return std::make_unique<T>(); };
    }
    
    /**
     * @brief Create an inference engine
     * @param name Engine name
     * @return Engine instance or nullptr if not found
     */
    std::unique_ptr<IInferenceEngine> createEngine(const std::string& name);
    
    /**
     * @brief Get all registered engine names
     * @return List of engine names
     */
    std::vector<std::string> getRegisteredEngines() const;
    
private:
    InferenceEngineFactory() = default;
    ~InferenceEngineFactory() = default;
    
    InferenceEngineFactory(const InferenceEngineFactory&) = delete;
    InferenceEngineFactory& operator=(const InferenceEngineFactory&) = delete;
    
    using CreatorFunc = std::function<std::unique_ptr<IInferenceEngine>()>;
    std::map<std::string, CreatorFunc> creators_;
};

} // namespace inference
} // namespace ai_analytics