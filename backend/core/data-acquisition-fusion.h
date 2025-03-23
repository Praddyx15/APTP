#pragma once

#include "connectors/device_connector.h"
#include <Eigen/Dense>
#include <deque>
#include <mutex>

namespace data_acquisition {
namespace fusion {

/**
 * @brief Data fusion algorithm types
 */
enum class FusionAlgorithm {
    KALMAN_FILTER,
    EXTENDED_KALMAN_FILTER,
    UNSCENTED_KALMAN_FILTER,
    PARTICLE_FILTER,
    MOVING_AVERAGE
};

/**
 * @brief Convert FusionAlgorithm to string
 * @param algorithm Fusion algorithm
 * @return String representation
 */
std::string fusionAlgorithmToString(FusionAlgorithm algorithm);

/**
 * @brief Convert string to FusionAlgorithm
 * @param str String representation
 * @return Fusion algorithm
 */
FusionAlgorithm fusionAlgorithmFromString(const std::string& str);

/**
 * @brief Data fusion configuration
 */
struct FusionConfig {
    FusionAlgorithm algorithm;
    std::vector<std::string> input_device_ids;
    std::vector<connectors::DataType> input_data_types;
    double sample_rate_hz;
    int buffer_size;
    std::unordered_map<std::string, double> weights;
    std::unordered_map<std::string, std::string> parameters;
};

/**
 * @brief Fused data output
 */
struct FusedData {
    std::string fusion_id;
    std::chrono::microseconds timestamp;
    std::vector<std::string> source_devices;
    std::vector<connectors::DataType> source_data_types;
    std::unordered_map<std::string, double> fused_values;
    double confidence;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Fused data or nullopt if invalid
     */
    static std::optional<FusedData> fromJson(const nlohmann::json& json);
};

/**
 * @brief Data fusion result callback
 */
using FusionCallback = std::function<void(const FusedData&)>;

/**
 * @brief Base class for data fusion algorithms
 */
class IFusionAlgorithm {
public:
    virtual ~IFusionAlgorithm() = default;
    
    /**
     * @brief Initialize the algorithm
     * @param config Fusion configuration
     * @return True if initialized successfully
     */
    virtual bool initialize(const FusionConfig& config) = 0;
    
    /**
     * @brief Process a new data point
     * @param data Input data
     * @return True if processed successfully
     */
    virtual bool processData(const std::unique_ptr<connectors::DeviceData>& data) = 0;
    
    /**
     * @brief Get the latest fused data
     * @return Fused data
     */
    virtual FusedData getFusedData() const = 0;
    
    /**
     * @brief Reset the algorithm state
     */
    virtual void reset() = 0;
    
    /**
     * @brief Get the algorithm type
     * @return Algorithm type
     */
    virtual FusionAlgorithm getAlgorithmType() const = 0;
};

/**
 * @brief Kalman filter implementation for data fusion
 */
class KalmanFilterFusion : public IFusionAlgorithm {
public:
    KalmanFilterFusion();
    ~KalmanFilterFusion() override;
    
    bool initialize(const FusionConfig& config) override;
    bool processData(const std::unique_ptr<connectors::DeviceData>& data) override;
    FusedData getFusedData() const override;
    void reset() override;
    FusionAlgorithm getAlgorithmType() const override;
    
private:
    /**
     * @brief Initialize state and covariance matrices
     */
    void initializeMatrices();
    
    /**
     * @brief Predict step of the Kalman filter
     */
    void predict();
    
    /**
     * @brief Update step of the Kalman filter
     * @param data Input data
     */
    void update(const std::unique_ptr<connectors::DeviceData>& data);
    
    /**
     * @brief Convert device data to measurement vector
     * @param data Input data
     * @return Measurement vector
     */
    Eigen::VectorXd dataToMeasurement(const std::unique_ptr<connectors::DeviceData>& data);
    
    /**
     * @brief Get measurement matrix for data type
     * @param data_type Data type
     * @return Measurement matrix
     */
    Eigen::MatrixXd getMeasurementMatrix(connectors::DataType data_type);
    
    /**
     * @brief Get process noise for data type
     * @param data_type Data type
     * @return Process noise covariance
     */
    Eigen::MatrixXd getProcessNoise(connectors::DataType data_type);
    
    /**
     * @brief Get measurement noise for data type
     * @param data_type Data type
     * @return Measurement noise covariance
     */
    Eigen::MatrixXd getMeasurementNoise(connectors::DataType data_type);
    
    FusionConfig config_;
    bool initialized_;
    
    // Kalman filter state
    Eigen::VectorXd state_;
    Eigen::MatrixXd covariance_;
    Eigen::MatrixXd transition_matrix_;
    Eigen::MatrixXd process_noise_;
    
    // Output state
    FusedData fused_data_;
    mutable std::mutex mutex_;
    
    // State history for confidence calculation
    std::deque<Eigen::VectorXd> state_history_;
    
    // Mapping from data types to state indices
    std::unordered_map<connectors::DataType, int, std::hash<int>> data_type_indices_;
    
    // Last update timestamp for each data type
    std::unordered_map<connectors::DataType, std::chrono::microseconds, std::hash<int>> last_update_times_;
};

/**
 * @brief Data fusion manager
 */
class DataFusionManager {
public:
    /**
     * @brief Get the singleton instance
     * @return Manager instance
     */
    static DataFusionManager& getInstance();
    
    /**
     * @brief Initialize the manager
     * @return True if initialized successfully
     */
    bool initialize();
    
    /**
     * @brief Shutdown the manager
     */
    void shutdown();
    
    /**
     * @brief Create a new fusion pipeline
     * @param config Fusion configuration
     * @return Fusion ID or empty string if creation failed
     */
    std::string createFusion(const FusionConfig& config);
    
    /**
     * @brief Remove a fusion pipeline
     * @param fusion_id Fusion ID
     * @return True if removed successfully
     */
    bool removeFusion(const std::string& fusion_id);
    
    /**
     * @brief Get fusion configuration
     * @param fusion_id Fusion ID
     * @return Fusion configuration or nullopt if not found
     */
    std::optional<FusionConfig> getFusionConfig(const std::string& fusion_id) const;
    
    /**
     * @brief Set fusion callback
     * @param fusion_id Fusion ID
     * @param callback Fusion callback
     * @return True if set successfully
     */
    bool setFusionCallback(const std::string& fusion_id, FusionCallback callback);
    
    /**
     * @brief Process data for fusion
     * @param data Input data
     */
    void processData(const std::unique_ptr<connectors::DeviceData>& data);
    
    /**
     * @brief Get all fusion pipelines
     * @return List of fusion IDs
     */
    std::vector<std::string> getFusionIds() const;
    
    /**
     * @brief Get the latest fused data
     * @param fusion_id Fusion ID
     * @return Fused data or nullopt if not found
     */
    std::optional<FusedData> getLatestFusedData(const std::string& fusion_id) const;
    
private:
    DataFusionManager();
    ~DataFusionManager();
    
    DataFusionManager(const DataFusionManager&) = delete;
    DataFusionManager& operator=(const DataFusionManager&) = delete;
    
    /**
     * @brief Create a fusion algorithm
     * @param algorithm Algorithm type
     * @return Algorithm instance
     */
    std::unique_ptr<IFusionAlgorithm> createAlgorithm(FusionAlgorithm algorithm);
    
    /**
     * @brief Information about a fusion pipeline
     */
    struct FusionInfo {
        FusionConfig config;
        std::unique_ptr<IFusionAlgorithm> algorithm;
        FusionCallback callback;
        FusedData latest_data;
    };
    
    bool initialized_;
    std::unordered_map<std::string, std::unique_ptr<FusionInfo>> fusions_;
    mutable std::mutex mutex_;
};

} // namespace fusion
} // namespace data_acquisition