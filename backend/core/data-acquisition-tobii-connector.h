#pragma once

#include "connectors/device_connector.h"
#include <mutex>
#include <thread>
#include <atomic>
#include <queue>
#include <condition_variable>
#include <fstream>
#include <filesystem>

namespace data_acquisition {
namespace connectors {

/**
 * @brief Implementation of the Tobii eye tracker connector
 */
class TobiiEyeTrackerConnector : public IDeviceConnector {
public:
    TobiiEyeTrackerConnector();
    ~TobiiEyeTrackerConnector() override;
    
    // IDeviceConnector implementation
    DeviceType getDeviceType() const override;
    std::string getName() const override;
    bool initialize(const std::unordered_map<std::string, std::string>& config) override;
    void shutdown() override;
    std::vector<DeviceInfo> discoverDevices() override;
    bool connectDevice(const std::string& device_id, const DeviceConfig& config) override;
    bool disconnectDevice(const std::string& device_id) override;
    bool startStreaming(const std::string& device_id, DataCallback callback) override;
    bool stopStreaming(const std::string& device_id) override;
    bool startRecording(const std::string& device_id, const std::string& session_id, const std::string& output_dir) override;
    std::string stopRecording(const std::string& device_id, const std::string& session_id) override;
    std::string getDeviceStatus(const std::string& device_id) override;
    void setStatusCallback(StatusCallback callback) override;
    DeviceCapabilities getDeviceCapabilities(const std::string& device_id) override;
    bool configureDevice(const std::string& device_id, const std::unordered_map<std::string, std::string>& config) override;
    DeviceInfo getDeviceInfo(const std::string& device_id) override;
    
private:
    /**
     * @brief Information about a connected device
     */
    struct ConnectedDevice {
        DeviceInfo info;
        DeviceConfig config;
        std::atomic<bool> is_streaming{false};
        std::atomic<bool> is_recording{false};
        std::string session_id;
        std::string output_dir;
        std::unique_ptr<std::ofstream> recording_file;
        DataCallback data_callback;
        std::thread streaming_thread;
    };
    
    /**
     * @brief Initialize the Tobii API
     * @return True if initialized successfully
     */
    bool initializeApi();
    
    /**
     * @brief Shutdown the Tobii API
     */
    void shutdownApi();
    
    /**
     * @brief Get a connected device
     * @param device_id Device ID
     * @return Connected device or nullptr if not found
     */
    ConnectedDevice* getConnectedDevice(const std::string& device_id);
    
    /**
     * @brief Stream data from a device
     * @param device_id Device ID
     */
    void streamData(const std::string& device_id);
    
    /**
     * @brief Generate sample gaze data (for simulation)
     * @param device_id Device ID
     * @return Gaze data
     */
    std::unique_ptr<GazeData> generateGazeData(const std::string& device_id);
    
    /**
     * @brief Generate sample pupil data (for simulation)
     * @param device_id Device ID
     * @return Pupil data
     */
    std::unique_ptr<PupilData> generatePupilData(const std::string& device_id);
    
    /**
     * @brief Write data to recording file
     * @param device Device
     * @param data Data to write
     */
    void writeToRecording(ConnectedDevice& device, const DeviceData& data);
    
    /**
     * @brief Report device status
     * @param device_id Device ID
     * @param status Status message
     * @param message Additional information
     */
    void reportStatus(const std::string& device_id, const std::string& status, const std::string& message);
    
    std::atomic<bool> initialized_{false};
    std::unordered_map<std::string, std::unique_ptr<ConnectedDevice>> connected_devices_;
    mutable std::mutex devices_mutex_;
    StatusCallback status_callback_;
    std::atomic<bool> api_initialized_{false};
    
    // Simulation parameters
    double simulation_noise_level_{0.01};
    std::atomic<bool> simulate_{true};  // Use simulated data if true
    
    // Device discovery cache
    std::vector<DeviceInfo> discovered_devices_;
    std::chrono::steady_clock::time_point last_discovery_time_;
    static constexpr auto discovery_cache_duration = std::chrono::seconds(10);
};

} // namespace connectors
} // namespace data_acquisition