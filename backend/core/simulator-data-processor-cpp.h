// src/backend/simulator/SimulatorDataProcessor.h
#pragma once

#include <atomic>
#include <chrono>
#include <functional>
#include <memory>
#include <string>
#include <thread>
#include <unordered_map>
#include <vector>

#include "../core/Result.h"
#include "../core/Logger.h"
#include "../core/ConfigurationManager.h"
#include "LockFreeQueue.h"
#include "LockFreeRingBuffer.h"
#include "FlightParameters.h"
#include "AnomalyDetector.h"
#include "EventDetector.h"

namespace PilotTraining {
namespace Simulator {

/**
 * @brief Status of the simulator data processor
 */
enum class ProcessorStatus {
    STOPPED,
    STARTING,
    RUNNING,
    PAUSED,
    STOPPING,
    ERROR
};

/**
 * @brief Subscriber callback function type
 * Called when new telemetry data is available
 */
using TelemetryCallback = std::function<void(const FlightParameters&)>;

/**
 * @brief Event callback function type
 * Called when flight events are detected
 */
using EventCallback = std::function<void(const FlightEvent&)>;

/**
 * @brief Anomaly callback function type
 * Called when flight anomalies are detected
 */
using AnomalyCallback = std::function<void(const FlightAnomaly&)>;

/**
 * @brief Status callback function type
 * Called when processor status changes
 */
using StatusCallback = std::function<void(ProcessorStatus, const std::string&)>;

/**
 * @brief Simulator data processor configuration
 */
struct SimulatorProcessorConfig {
    int sampleRateHz = 1000;             // Target sample rate in Hz
    int bufferCapacity = 10000;          // Capacity of the telemetry buffer
    int processingThreads = 4;           // Number of processing threads
    int eventDetectionIntervalMs = 100;  // Event detection interval in milliseconds
    int anomalyDetectionIntervalMs = 50; // Anomaly detection interval in milliseconds
    int dataPersistenceIntervalMs = 1000; // Data persistence interval in milliseconds
    bool enableEventDetection = true;     // Enable event detection
    bool enableAnomalyDetection = true;   // Enable anomaly detection
    bool enableDataRecording = true;      // Enable data recording to disk
    std::string recordingDirectory = "./recordings"; // Directory for flight recordings
};

/**
 * @brief Statistics for the simulator data processor
 */
struct ProcessorStatistics {
    std::atomic<uint64_t> samplesReceived{0};      // Total samples received
    std::atomic<uint64_t> samplesProcessed{0};     // Total samples processed
    std::atomic<uint64_t> eventsDetected{0};       // Total events detected
    std::atomic<uint64_t> anomaliesDetected{0};    // Total anomalies detected
    std::atomic<uint64_t> samplesDropped{0};       // Total samples dropped due to buffer full
    std::atomic<double> currentSampleRateHz{0.0};   // Current sample rate in Hz
    std::atomic<double> currentProcessingLatencyMs{0.0}; // Current processing latency in ms
    std::atomic<double> bufferUtilizationPercent{0.0};   // Current buffer utilization
    std::atomic<int64_t> lastSampleTimestampUs{0}; // Last sample timestamp in microseconds
    std::chrono::steady_clock::time_point startTime; // Start time of the processor
};

/**
 * @brief Simulator data processor class
 * 
 * High-performance processor for real-time telemetry data from flight simulators.
 * Features include:
 * - Lock-free concurrent data structures for high throughput
 * - Real-time analysis of flight parameters
 * - Event and anomaly detection
 * - Support for multiple subscriber callbacks
 * - Historical data access
 */
class SimulatorDataProcessor {
public:
    /**
     * @brief Construct a new Simulator Data Processor
     * 
     * @param configManager Configuration manager for settings
     */
    explicit SimulatorDataProcessor(std::shared_ptr<Core::ConfigurationManager> configManager);
    
    /**
     * @brief Destroy the Simulator Data Processor
     */
    ~SimulatorDataProcessor();
    
    /**
     * @brief Initialize the processor
     * 
     * @param config Configuration for the processor
     * @return Result<void> Success or error
     */
    Core::Result<void> initialize(const SimulatorProcessorConfig& config);
    
    /**
     * @brief Start the processor
     * 
     * @return Result<void> Success or error
     */
    Core::Result<void> start();
    
    /**
     * @brief Stop the processor
     * 
     * @return Result<void> Success or error
     */
    Core::Result<void> stop();
    
    /**
     * @brief Pause the processor
     * 
     * @return Result<void> Success or error
     */
    Core::Result<void> pause();
    
    /**
     * @brief Resume the processor
     * 
     * @return Result<void> Success or error
     */
    Core::Result<void> resume();
    
    /**
     * @brief Get the current status
     * 
     * @return ProcessorStatus Current status
     */
    ProcessorStatus getStatus() const;
    
    /**
     * @brief Get processor statistics
     * 
     * @return ProcessorStatistics Current statistics
     */
    ProcessorStatistics getStatistics() const;
    
    /**
     * @brief Process a new telemetry sample
     * 
     * @param parameters Flight parameters to process
     * @return true if sample was processed successfully
     * @return false if sample was dropped
     */
    bool processSample(const FlightParameters& parameters);
    
    /**
     * @brief Subscribe to real-time telemetry updates
     * 
     * @param callback Callback function to be called for each sample
     * @param id Unique identifier for the subscription
     * @return Result<void> Success or error
     */
    Core::Result<void> subscribeTelemetry(TelemetryCallback callback, const std::string& id);
    
    /**
     * @brief Unsubscribe from telemetry updates
     * 
     * @param id Subscription identifier
     * @return Result<void> Success or error
     */
    Core::Result<void> unsubscribeTelemetry(const std::string& id);
    
    /**
     * @brief Subscribe to flight events
     * 
     * @param callback Callback function to be called for each event
     * @param id Unique identifier for the subscription
     * @return Result<void> Success or error
     */
    Core::Result<void> subscribeEvents(EventCallback callback, const std::string& id);
    
    /**
     * @brief Unsubscribe from flight events
     * 
     * @param id Subscription identifier
     * @return Result<void> Success or error
     */
    Core::Result<void> unsubscribeEvents(const std::string& id);
    
    /**
     * @brief Subscribe to flight anomalies
     * 
     * @param callback Callback function to be called for each anomaly
     * @param id Unique identifier for the subscription
     * @return Result<void> Success or error
     */
    Core::Result<void> subscribeAnomalies(AnomalyCallback callback, const std::string& id);
    
    /**
     * @brief Unsubscribe from flight anomalies
     * 
     * @param id Subscription identifier
     * @return Result<void> Success or error
     */
    Core::Result<void> unsubscribeAnomalies(const std::string& id);
    
    /**
     * @brief Subscribe to status updates
     * 
     * @param callback Callback function to be called for each status change
     * @param id Unique identifier for the subscription
     * @return Result<void> Success or error
     */
    Core::Result<void> subscribeStatus(StatusCallback callback, const std::string& id);
    
    /**
     * @brief Unsubscribe from status updates
     * 
     * @param id Subscription identifier
     * @return Result<void> Success or error
     */
    Core::Result<void> unsubscribeStatus(const std::string& id);
    
    /**
     * @brief Get historical telemetry data
     * 
     * @param startTime Start time in microseconds since epoch
     * @param endTime End time in microseconds since epoch
     * @return Result<std::vector<FlightParameters>> Historical data or error
     */
    Core::Result<std::vector<FlightParameters>> getHistoricalData(
        int64_t startTime, 
        int64_t endTime
    );
    
    /**
     * @brief Get the most recent telemetry data
     * 
     * @param count Number of samples to retrieve
     * @return Result<std::vector<FlightParameters>> Recent data or error
     */
    Core::Result<std::vector<FlightParameters>> getRecentData(size_t count);
    
    /**
     * @brief Get historical flight events
     * 
     * @param startTime Start time in microseconds since epoch
     * @param endTime End time in microseconds since epoch
     * @return Result<std::vector<FlightEvent>> Historical events or error
     */
    Core::Result<std::vector<FlightEvent>> getHistoricalEvents(
        int64_t startTime, 
        int64_t endTime
    );
    
    /**
     * @brief Get historical flight anomalies
     * 
     * @param startTime Start time in microseconds since epoch
     * @param endTime End time in microseconds since epoch
     * @return Result<std::vector<FlightAnomaly>> Historical anomalies or error
     */
    Core::Result<std::vector<FlightAnomaly>> getHistoricalAnomalies(
        int64_t startTime, 
        int64_t endTime
    );
    
    /**
     * @brief Start recording telemetry data to disk
     * 
     * @param filename Name of the recording file
     * @return Result<void> Success or error
     */
    Core::Result<void> startRecording(const std::string& filename);
    
    /**
     * @brief Stop recording telemetry data
     * 
     * @return Result<void> Success or error
     */
    Core::Result<void> stopRecording();
    
    /**
     * @brief Load telemetry data from a recording file
     * 
     * @param filename Name of the recording file
     * @param append Whether to append to current buffer (true) or replace (false)
     * @return Result<size_t> Number of samples loaded or error
     */
    Core::Result<size_t> loadRecording(const std::string& filename, bool append = false);
    
    /**
     * @brief Set event detection parameters
     * 
     * @param parameters Event detection parameters
     * @return Result<void> Success or error
     */
    Core::Result<void> setEventDetectionParameters(const EventDetectionParameters& parameters);
    
    /**
     * @brief Set anomaly detection parameters
     * 
     * @param parameters Anomaly detection parameters
     * @return Result<void> Success or error
     */
    Core::Result<void> setAnomalyDetectionParameters(const AnomalyDetectionParameters& parameters);

private:
    // Processing threads
    void processingThread();
    void eventDetectionThread();
    void anomalyDetectionThread();
    void statisticsThread();
    void recordingThread();
    
    // Helper methods
    void updateStatus(ProcessorStatus status, const std::string& message = "");
    void notifyTelemetrySubscribers(const FlightParameters& parameters);
    void notifyEventSubscribers(const FlightEvent& event);
    void notifyAnomalySubscribers(const FlightAnomaly& anomaly);
    void updateStatistics();
    
    // Thread management
    void startThreads();
    void stopThreads();
    
    // Member variables
    std::shared_ptr<Core::ConfigurationManager> _configManager;
    SimulatorProcessorConfig _config;
    std::atomic<ProcessorStatus> _status{ProcessorStatus::STOPPED};
    std::string _statusMessage;
    ProcessorStatistics _statistics;
    
    // Concurrent data structures
    std::unique_ptr<LockFreeQueue<FlightParameters>> _inputQueue;
    std::unique_ptr<LockFreeRingBuffer<FlightParameters>> _telemetryBuffer;
    std::unique_ptr<LockFreeQueue<FlightEvent>> _eventQueue;
    std::unique_ptr<LockFreeQueue<FlightAnomaly>> _anomalyQueue;
    
    // Detection engines
    std::unique_ptr<EventDetector> _eventDetector;
    std::unique_ptr<AnomalyDetector> _anomalyDetector;
    
    // Subscriber callbacks
    std::mutex _telemetrySubscribersMutex;
    std::unordered_map<std::string, TelemetryCallback> _telemetrySubscribers;
    
    std::mutex _eventSubscribersMutex;
    std::unordered_map<std::string, EventCallback> _eventSubscribers;
    
    std::mutex _anomalySubscribersMutex;
    std::unordered_map<std::string, AnomalyCallback> _anomalySubscribers;
    
    std::mutex _statusSubscribersMutex;
    std::unordered_map<std::string, StatusCallback> _statusSubscribers;
    
    // Thread management
    std::vector<std::thread> _processingThreads;
    std::thread _eventDetectionThread;
    std::thread _anomalyDetectionThread;
    std::thread _statisticsThread;
    std::thread _recordingThread;
    std::atomic<bool> _running{false};
    
    // Recording
    std::atomic<bool> _recording{false};
    std::string _recordingFilename;
    std::mutex _recordingMutex;
};

} // namespace Simulator
} // namespace PilotTraining
