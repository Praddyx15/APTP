#pragma once

#include <string>
#include <vector>
#include <memory>
#include <optional>
#include <nlohmann/json.hpp>
#include <tensorflow/c/c_api.h>

namespace ai_analytics {
namespace models {

/**
 * @brief Model type enumeration
 */
enum class ModelType {
    COGNITIVE_STATE,
    PERFORMANCE_PREDICTION,
    ATTENTION_ASSESSMENT,
    ANOMALY_DETECTION,
    ERROR_PREDICTION,
    CUSTOM
};

/**
 * @brief Model metadata
 */
struct ModelMetadata {
    std::string model_id;
    std::string name;
    std::string version;
    std::string description;
    ModelType type;
    std::vector<std::string> input_features;
    std::vector<std::string> output_features;
    std::string framework;  // TensorFlow, PyTorch, etc.
    std::string creation_date;
    std::string author;
    double accuracy;
    std::unordered_map<std::string, std::string> additional_metadata;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Model metadata or nullopt if invalid
     */
    static std::optional<ModelMetadata> fromJson(const nlohmann::json& json);
};

/**
 * @brief Model inference interface
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
     * @brief Load model from file
     * @param model_path Path to model file
     * @return True if loaded successfully
     */
    virtual bool loadFromFile(const std::string& model_path) = 0;
    
    /**
     * @brief Predict using input data
     * @param input_data Input data as JSON
     * @return Prediction result as JSON or nullopt if prediction failed
     */
    virtual std::optional<nlohmann::json> predict(const nlohmann::json& input_data) = 0;
    
    /**
     * @brief Check if model is loaded
     * @return True if loaded
     */
    virtual bool isLoaded() const = 0;
    
    /**
     * @brief Get model version
     * @return Model version
     */
    virtual std::string getVersion() const = 0;
    
    /**
     * @brief Get model type
     * @return Model type
     */
    virtual ModelType getType() const = 0;
    
    /**
     * @brief Get model ID
     * @return Model ID
     */
    virtual std::string getId() const = 0;
};

/**
 * @brief TensorFlow model implementation
 */
class TensorFlowModel : public IModel {
public:
    /**
     * @brief Constructor
     * @param metadata Model metadata
     */
    explicit TensorFlowModel(const ModelMetadata& metadata);
    
    /**
     * @brief Destructor
     */
    ~TensorFlowModel() override;
    
    // IModel implementation
    ModelMetadata getMetadata() const override;
    bool loadFromFile(const std::string& model_path) override;
    std::optional<nlohmann::json> predict(const nlohmann::json& input_data) override;
    bool isLoaded() const override;
    std::string getVersion() const override;
    ModelType getType() const override;
    std::string getId() const override;

private:
    ModelMetadata metadata_;
    TF_Graph* graph_;
    TF_Session* session_;
    bool loaded_;
    
    /**
     * @brief Preprocess input data
     * @param input_data Input data as JSON
     * @return Preprocessed data as TF_Tensor* or nullptr if preprocessing failed
     */
    std::vector<TF_Tensor*> preprocessInput(const nlohmann::json& input_data);
    
    /**
     * @brief Postprocess output data
     * @param output_tensors Output tensors
     * @return Postprocessed data as JSON
     */
    nlohmann::json postprocessOutput(const std::vector<TF_Tensor*>& output_tensors);
    
    /**
     * @brief Free tensors
     * @param tensors Tensors to free
     */
    void freeTensors(const std::vector<TF_Tensor*>& tensors);
};

/**
 * @brief Model factory
 */
class ModelFactory {
public:
    /**
     * @brief Get singleton instance
     * @return Model factory instance
     */
    static ModelFactory& getInstance();
    
    /**
     * @brief Create model
     * @param metadata Model metadata
     * @return Model instance
     */
    std::shared_ptr<IModel> createModel(const ModelMetadata& metadata);
    
    /**
     * @brief Load model
     * @param model_path Path to model file
     * @return Model instance or nullptr if loading failed
     */
    std::shared_ptr<IModel> loadModel(const std::string& model_path);

private:
    ModelFactory() = default;
    ~ModelFactory() = default;
    
    ModelFactory(const ModelFactory&) = delete;
    ModelFactory& operator=(const ModelFactory&) = delete;
};

/**
 * @brief Model repository interface
 */
class IModelRepository {
public:
    virtual ~IModelRepository() = default;
    
    /**
     * @brief Save model
     * @param model Model to save
     * @param model_data Model data
     * @return True if saved successfully
     */
    virtual bool saveModel(
        const ModelMetadata& model,
        const std::vector<uint8_t>& model_data
    ) = 0;
    
    /**
     * @brief Load model
     * @param model_id Model ID
     * @return Model instance or nullptr if loading failed
     */
    virtual std::shared_ptr<IModel> loadModel(const std::string& model_id) = 0;
    
    /**
     * @brief Delete model
     * @param model_id Model ID
     * @return True if deleted successfully
     */
    virtual bool deleteModel(const std::string& model_id) = 0;
    
    /**
     * @brief List models
     * @param type Model type (optional)
     * @return List of model metadata
     */
    virtual std::vector<ModelMetadata> listModels(
        const std::optional<ModelType>& type = std::nullopt
    ) = 0;
    
    /**
     * @brief Get model metadata
     * @param model_id Model ID
     * @return Model metadata or nullopt if not found
     */
    virtual std::optional<ModelMetadata> getModelMetadata(
        const std::string& model_id
    ) = 0;
    
    /**
     * @brief Update model metadata
     * @param metadata Model metadata
     * @return True if updated successfully
     */
    virtual bool updateModelMetadata(
        const ModelMetadata& metadata
    ) = 0;
};

/**
 * @brief File-based model repository
 */
class FileModelRepository : public IModelRepository {
public:
    /**
     * @brief Constructor
     * @param base_path Base path for model storage
     */
    explicit FileModelRepository(const std::string& base_path);
    
    /**
     * @brief Destructor
     */
    ~FileModelRepository() override;
    
    // IModelRepository implementation
    bool saveModel(
        const ModelMetadata& model,
        const std::vector<uint8_t>& model_data
    ) override;
    
    std::shared_ptr<IModel> loadModel(const std::string& model_id) override;
    
    bool deleteModel(const std::string& model_id) override;
    
    std::vector<ModelMetadata> listModels(
        const std::optional<ModelType>& type = std::nullopt
    ) override;
    
    std::optional<ModelMetadata> getModelMetadata(
        const std::string& model_id
    ) override;
    
    bool updateModelMetadata(
        const ModelMetadata& metadata
    ) override;

private:
    std::string base_path_;
    
    /**
     * @brief Get model path
     * @param model_id Model ID
     * @return Model path
     */
    std::string getModelPath(const std::string& model_id) const;
    
    /**
     * @brief Get metadata path
     * @param model_id Model ID
     * @return Metadata path
     */
    std::string getMetadataPath(const std::string& model_id) const;
};

} // namespace models
} // namespace ai_analytics