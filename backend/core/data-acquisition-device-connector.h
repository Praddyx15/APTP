#pragma once

#include <string>
#include <vector>
#include <memory>
#include <optional>
#include <functional>
#include <unordered_map>
#include <chrono>
#include <nlohmann/json.hpp>

namespace data_acquisition {
namespace connectors {

/**
 * @brief Device types
 */
enum class DeviceType {
    UNKNOWN,
    EYE_TRACKER,
    HEART_RATE_MONITOR,
    EEG,
    SIMULATOR,
    CAMERA
};

/**
 * @brief Data types
 */
enum class DataType {
    UNKNOWN,
    GAZE,
    PUPIL,
    HEART_RATE,
    EEG_SIGNAL,
    SIMULATOR_POSITION,
    SIMULATOR_CONTROL,
    SIMULATOR_INSTRUMENT,
    VIDEO_FRAME
};

/**
 * @brief Convert DeviceType to string
 * @param type Device type
 * @return String representation
 */
std::string deviceTypeToString(DeviceType type);

/**
 * @brief Convert string to DeviceType
 * @param str String representation
 * @return Device type
 */
DeviceType deviceTypeFromString(const std::string& str);

/**
 * @brief Convert DataType to string
 * @param type Data type
 * @return String representation
 */
std::string dataTypeToString(DataType type);

/**
 * @brief Convert string to DataType
 * @param str String representation
 * @return Data type
 */
DataType dataTypeFromString(const std::string& str);

/**
 * @brief Device capabilities
 */
struct DeviceCapabilities {
    std::vector<DataType> supported_data_types;
    std::unordered_map<std::string, std::string> parameters;
    int max_sample_rate_hz;
    bool supports_streaming;
    bool supports_recording;
};

/**
 * @brief Device information
 */
struct DeviceInfo {
    std::string device_id;
    DeviceType device_type;
    std::string model;
    std::string serial_number;
    std::string firmware_version;
    DeviceCapabilities capabilities;
    bool is_connected;
    std::string connection_info;
};

/**
 * @brief Device configuration
 */
struct DeviceConfig {
    std::string device_id;
    std::vector<DataType> data_types;
    int sample_rate_hz;
    std::unordered_map<std::string, std::string> parameters;
};

/**
 * @brief Base class for device data
 */
struct DeviceData {
    std::string device_id;
    DataType data_type;
    std::chrono::microseconds timestamp;
    
    virtual ~DeviceData() = default;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    virtual nlohmann::json toJson() const = 0;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Device data or nullopt if invalid
     */
    static std::optional<std::unique_ptr<DeviceData>> fromJson(const nlohmann::json& json);
};

/**
 * @brief Gaze data (eye tracking)
 */
struct GazeData : public DeviceData {
    double x;  // X position in normalized coordinates (0-1)
    double y;  // Y position in normalized coordinates (0-1)
    double z;  // Distance from screen in mm
    double confidence;  // Confidence level (0-1)
    
    nlohmann::json toJson() const override;
};

/**
 * @brief Pupil data (eye tracking)
 */
struct PupilData : public DeviceData {
    double left_diameter;  // Left pupil diameter in mm
    double right_diameter;  // Right pupil diameter in mm
    double left_confidence;  // Confidence level (0-1)
    double right_confidence;  // Confidence level (0-1)
    
    nlohmann::json toJson() const override;
};

/**
 * @brief Heart rate data
 */
struct HeartRateData : public DeviceData {
    double bpm;  // Beats per minute
    double confidence;  // Confidence level (0-1)
    
    nlohmann::json toJson() const override;
};

/**
 * @brief EEG data
 */
struct EegData : public DeviceData {
    std::vector<double> channels;  // Raw EEG channel values
    std::vector<std::string> channel_names;  // Channel names
    double sampling_rate;  // Sampling rate in Hz
    
    nlohmann::json toJson() const override;
};

/**
 * @brief Simulator position data
 */
struct SimulatorPositionData : public DeviceData {
    double latitude;
    double longitude;
    double altitude;
    double heading;
    double pitch;
    double roll;
    double ground_speed;
    
    nlohmann::json toJson() const override;
};

/**
 * @brief Simulator control data
 */
struct SimulatorControlData : public DeviceData {
    double aileron;  // -1 to 1
    double elevator;  // -1 to 1
    double rudder;  // -1 to 1
    double throttle;  // 0 to 1
    std::vector<double> engine_controls;  // Multiple engine controls
    
    nlohmann::json toJson() const override;
};

/**
 * @brief Simulator instrument data
 */
struct SimulatorInstrumentData : public DeviceData {
    std::unordered_map<std::string, double> instrument_values;  // Name-value pairs for instruments
    
    nlohmann::json toJson() const override;
};

/**
 * @brief Video frame data
 */
struct VideoFrameData : public DeviceData {
    std::vector<uint8_t> frame_data;  // Compressed image data
    std::string format;  // Format (e.g., "jpeg", "h264")
    int width;
    int height;
    
    nlohmann::json toJson() const override;
};

/**
 * @brief Data callback type
 */
using DataCallback = std::function<void(std::unique_ptr<DeviceData>)>;

/**
 * @brief Status callback type
 */
using StatusCallback = std::function<void(const std::string& device_id, const std::string& status, const std::string& message)>;

/**
 * @brief Device connector interface
 */
class IDeviceConnector {
public:
    virtual ~IDeviceConnector() = default;
    
    /**
     * @brief Get device type
     * @return Device type
     */
    virtual DeviceType getDeviceType() const = 0;
    
    /**
     * @brief Get connector name
     * @return Connector name
     */
    virtual std::string getName() const = 0;
    
    /**
     * @brief Initialize the connector
     * @param config Configuration parameters
     * @return True if initialized successfully
     */
    virtual bool initialize(const std::unordered_map<std::string, std::string>& config) = 0;
    
    /**
     * @brief Shutdown the connector
     */
    virtual void shutdown() = 0;
    
    /**
     * @brief Discover available devices
     * @return List of discovered devices
     */
    virtual std::vector<DeviceInfo> discoverDevices() = 0;
    
    /**
     * @brief Connect to a device
     * @param device_id Device ID
     * @param config Device configuration
     * @return True if connected successfully
     */
    virtual bool connectDevice(const std::string& device_id, const DeviceConfig& config) = 0;
    
    /**
     * @brief Disconnect from a device
     * @param device_id Device ID
     * @return True if disconnected successfully
     */
    virtual bool disconnectDevice(const std::string& device_id) = 0;
    
    /**
     * @brief Start data streaming
     * @param device_id Device ID
     * @param callback Data callback
     * @return True if streaming started successfully
     */
    virtual bool startStreaming(const std::string& device_id, DataCallback callback) = 0;
    
    /**
     * @brief Stop data streaming
     * @param device_id Device ID
     * @return True if streaming stopped successfully
     */
    virtual bool stopStreaming(const std::string& device_id) = 0;
    
    /**
     * @brief Start data recording
     * @param device_id Device ID
     * @param session_id Session ID
     * @param output_dir Output directory
     * @return True if recording started successfully
     */
    virtual bool startRecording(const std::string& device_id, const std::string& session_id, const std::string& output_dir) = 0;
    
    /**
     * @brief Stop data recording
     * @param device_id Device ID
     * @param session_id Session ID
     * @return Path to recorded data or empty string if failed
     */
    virtual std::string stopRecording(const std::string& device_id, const std::string& session_id) = 0;
    
    /**
     * @brief Get device status
     * @param device_id Device ID
     * @return Status message
     */
    virtual std::string getDeviceStatus(const std::string& device_id) = 0;
    
    /**
     * @brief Set status callback
     * @param callback Status callback
     */
    virtual void setStatusCallback(StatusCallback callback) = 0;
    
    /**
     * @brief Get device capabilities
     * @param device_id Device ID
     * @return Device capabilities
     */
    virtual DeviceCapabilities getDeviceCapabilities(const std::string& device_id) = 0;
    
    /**
     * @brief Configure device
     * @param device_id Device ID
     * @param config Configuration parameters
     * @return True if configured successfully
     */
    virtual bool configureDevice(const std::string& device_id, const std::unordered_map<std::string, std::string>& config) = 0;
    
    /**
     * @brief Get device information
     * @param device_id Device ID
     * @return Device information
     */
    virtual DeviceInfo getDeviceInfo(const std::string& device_id) = 0;
};

/**
 * @brief Factory for creating device connectors
 */
class DeviceConnectorFactory {
public:
    /**
     * @brief Get the singleton instance
     * @return Factory instance
     */
    static DeviceConnectorFactory& getInstance();
    
    /**
     * @brief Register a connector type
     * @tparam T Connector type
     * @param type Device type
     * @param name Connector name
     */
    template<typename T>
    void registerConnector(DeviceType type, const std::string& name) {
        creators_[std::make_pair(type, name)] = []() { return std::make_unique<T>(); };
    }
    
    /**
     * @brief Create a connector
     * @param type Device type
     * @param name Connector name
     * @return Connector instance or nullptr if not found
     */
    std::unique_ptr<IDeviceConnector> createConnector(DeviceType type, const std::string& name) const;
    
    /**
     * @brief Get all registered connector types
     * @return List of (device type, connector name) pairs
     */
    std::vector<std::pair<DeviceType, std::string>> getRegisteredConnectors() const;
    
private:
    DeviceConnectorFactory() = default;
    ~DeviceConnectorFactory() = default;
    
    DeviceConnectorFactory(const DeviceConnectorFactory&) = delete;
    DeviceConnectorFactory& operator=(const DeviceConnectorFactory&) = delete;
    
    using CreatorFunc = std::function<std::unique_ptr<IDeviceConnector>()>;
    std::unordered_map<std::pair<DeviceType, std::string>, CreatorFunc, 
                      decltype([](const std::pair<DeviceType, std::string>& p) {
                          return std::hash<int>{}(static_cast<int>(p.first)) ^ 
                                 std::hash<std::string>{}(p.second);
                      })> creators_;
};

} // namespace connectors
} // namespace data_acquisition