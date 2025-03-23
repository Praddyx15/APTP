#pragma once

#include <string>
#include <memory>
#include <map>
#include <vector>
#include <optional>
#include <mutex>
#include <filesystem>
#include <nlohmann/json.hpp>

namespace ai_analytics {
namespace models {

/**
 * @brief Model type enumeration
 */
enum class ModelType {
    COGNITIVE_STATE,
    PERFORMANCE_PREDICTION,
    ANOMALY_DETECTION,
    RECOMMENDATION,
    TEXT_ANALYSIS,
    CUSTOM
};

/**
 * @brief Convert ModelType to string
 * @param type Model type
 * @return String representation
 */
std::string modelTypeToString(ModelType type);

/**
 * @brief Convert string to ModelType
 * @param str String representation
 * @return Model type
 */
ModelType modelTypeFromString(const std::string& str);

/**
 * @brief Model framework enumeration
 */
enum class ModelFramework {
    TENSORFLOW,
    ONNX,
    PYTORCH,
    SCIKIT_LEARN,
    CUSTOM
};

/**
 * @brief Convert ModelFramework to string
 * @param framework Model framework
 * @return String representation
 */
std::string modelFrameworkToString(ModelFramework framework);

/**
 * @brief Convert string to ModelFramework
 * @param str String representation
 * @return Model framework
 */
ModelFramework modelFrameworkFromString(const std::string& str);

/**
 * @brief Model metadata
 */
struct ModelMetadata {
    std::string model_id;
    std::string name;
    std::string version;
    ModelType type;
    ModelFramework framework;
    std::string description;
    std::map<std::string, std::string> properties;
    std::vector<std::string> input_features;
    std::vector<std::string> output_features;
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point updated_at;
    std::string author;
    double accuracy;
    std::string path;
    bool is_active;
    
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
 * @brief Base model interface
 */
class IModel {
public:
    virtual ~IModel() = default;
    
    /**
     * @brief Get model metadata
     * @return Model metadata
     */
    virtual const ModelMetadata& getMetadata() const = 0;
    
    /**
     * @brief Load model from file
     * @param path Path to model file
     * @return True if loaded successfully
     */
    virtual bool load(const std::string& path) = 0;
    
    /**
     * @brief Unload model
     */
    virtual void unload() = 0;
    
    /**
     * @brief Check if model is loaded
     * @return True if loaded
     */
    virtual bool isLoaded() const = 0;
    
    /**
     * @brief Predict using model
     * @param inputs Input features
     * @return Output predictions
     */
    virtual nlohmann::json predict(const nlohmann::json& inputs) = 0;
    
    /**
     * @brief Get model accuracy
     * @return Accuracy value
     */
    virtual double getAccuracy() const = 0;
    
    /**
     * @brief Get model type
     * @return Model type
     */
    virtual ModelType getType() const = 0;
    
    /**
     * @brief Get model framework
     * @return Model framework
     */
    virtual ModelFramework getFramework() const = 0;
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
    
    const ModelMetadata& getMetadata() const override;
    bool load(const std::string& path) override;
    void unload() override;
    bool isLoaded() const override;
    nlohmann::json predict(const nlohmann::json& inputs) override;
    double getAccuracy() const override;
    ModelType getType() const override;
    ModelFramework getFramework() const override;
    
private:
    ModelMetadata metadata_;
    bool loaded_;
    void* model_ptr_; // TensorFlow C API model pointer
};

/**
 * @brief ONNX model implementation
 */
class ONNXModel : public IModel {
public:
    /**
     * @brief Constructor
     * @param metadata Model metadata
     */
    explicit ONNXModel(const ModelMetadata& metadata);
    
    /**
     * @brief Destructor
     */
    ~ONNXModel() override;
    
    const ModelMetadata& getMetadata() const override;
    bool load(const std::string& path) override;
    void unload() override;
    bool isLoaded() const override;
    nlohmann::json predict(const nlohmann::json& inputs) override;
    double getAccuracy() const override;
    ModelType getType() const override;
    ModelFramework getFramework() const override;
    
private:
    ModelMetadata metadata_;
    bool loaded_;
    void* model_ptr_; // ONNX Runtime model pointer
};

/**
 * @brief Model manager
 */
class ModelManager {
public:
    /**
     * @brief Constructor
     * @param models_path Path to models directory
     */
    explicit ModelManager(const std::string& models_path);
    
    /**
     * @brief Destructor
     */
    ~ModelManager();
    
    /**
     * @brief Initialize the model manager
     * @return True if initialized successfully
     */
    bool initialize();
    
    /**
     * @brief Shutdown the model manager
     */
    void shutdown();
    
    /**
     * @brief Get model by ID
     * @param model_id Model ID
     * @return Model pointer or nullptr if not found
     */
    std::shared_ptr<IModel> getModel(const std::string& model_id);
    
    /**
     * @brief Get models by type
     * @param type Model type
     * @return Vector of model pointers
     */
    std::vector<std::shared_ptr<IModel>> getModelsByType(ModelType type);
    
    /**
     * @brief Get all models
     * @return Map of model ID to model pointer
     */
    std::map<std::string, std::shared_ptr<IModel>> getAllModels();
    
    /**
     * @brief Add model
     * @param model Model pointer
     * @return True if added successfully
     */
    bool addModel(std::shared_ptr<IModel> model);
    
    /**
     * @brief Remove model
     * @param model_id Model ID
     * @return True if removed successfully
     */
    bool removeModel(const std::string& model_id);
    
    /**
     * @brief Load model from path
     * @param path Path to model file
     * @return Model pointer or nullptr if loading failed
     */
    std::shared_ptr<IModel> loadModelFromPath(const std::string& path);
    
    /**
     * @brief Create model from metadata
     * @param metadata Model metadata
     * @return Model pointer or nullptr if creation failed
     */
    std::shared_ptr<IModel> createModel(const ModelMetadata& metadata);
    
    /**
     * @brief Save model metadata
     * @param metadata Model metadata
     * @return True if saved successfully
     */
    bool saveModelMetadata(const ModelMetadata& metadata);
    
    /**
     * @brief Load model metadata
     * @param model_id Model ID
     * @return Model metadata or nullopt if not found
     */
    std::optional<ModelMetadata> loadModelMetadata(const std::string& model_id);
    
    /**
     * @brief Scan models directory for model files
     * @return Vector of discovered model metadata
     */
    std::vector<ModelMetadata> scanModelsDirectory();
    
private:
    std::string models_path_;
    std::map<std::string, std::shared_ptr<IModel>> models_;
    std::mutex models_mutex_;
    bool initialized_;
    
    /**
     * @brief Detect model framework from file
     * @param path Path to model file
     * @return Model framework or nullopt if detection failed
     */
    std::optional<ModelFramework> detectModelFramework(const std::string& path);
    
    /**
     * @brief Load metadata from JSON file
     * @param path Path to metadata JSON file
     * @return Model metadata or nullopt if loading failed
     */
    std::optional<ModelMetadata> loadMetadataFromFile(const std::string& path);
};

} // namespace models
} // namespace ai_analytics