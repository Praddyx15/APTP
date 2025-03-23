#pragma once

#include <vector>
#include <string>
#include <memory>
#include <thread>
#include <atomic>
#include <unordered_map>
#include <functional>
#include <chrono>
#include <queue>
#include <mutex>
#include <condition_variable>
#include <optional>
#include <variant>
#include <boost/lockfree/spsc_queue.hpp>
#include <boost/circular_buffer.hpp>
#include <simd/simd.h>

#include "../core/error-handling.hpp"
#include "../core/logging-system.hpp"

namespace apt {
namespace integration {

/**
 * Simulator data types
 */
enum class SimValueType {
    BOOLEAN,
    INTEGER,
    FLOAT,
    DOUBLE,
    STRING,
    ENUM
};

/**
 * Simulator data value
 */
using SimValue = std::variant<bool, int32_t, float, double, std::string, int32_t>;

/**
 * Simulator data point definition
 */
struct SimDataPoint {
    std::string id;
    std::string name;
    std::string description;
    std::string category;
    SimValueType type;
    std::string units;
    double minValue = 0.0;
    double maxValue = 0.0;
    bool isReadOnly = false;
    std::vector<std::string> enumValues;  // Only used for ENUM type
};

/**
 * Simulator data frame containing multiple data points at a specific timestamp
 */
struct SimDataFrame {
    std::chrono::system_clock::time_point timestamp;
    std::unordered_map<std::string, SimValue> values;
};

/**
 * Data subscription options
 */
struct DataSubscriptionOptions {
    int sampleRateHz = 1000;  // Default to 1000 Hz (1 kHz)
    bool includeHistory = false;
    std::optional<size_t> historySize;
    bool applyFiltering = false;
    double filterCutoffFrequency = 0.0;
    bool detectAnomaly = false;
    double anomalyThreshold = 3.0;  // Standard deviations
};

/**
 * Simulator data processing options
 */
struct DataProcessingOptions {
    bool useSIMD = true;
    bool useParallelProcessing = true;
    size_t processingThreads = 0;  // 0 means auto-detect
    size_t queueSize = 10000;
    size_t batchSize = 100;
    bool computeDerivatives = false;
    bool detectEvents = false;
};

/**
 * Data receiver interface for processing simulator data frames
 */
class DataReceiver {
public:
    virtual ~DataReceiver() = default;
    
    /**
     * Process a batch of simulator data frames
     */
    virtual void processBatch(const std::vector<SimDataFrame>& frames) = 0;
};

/**
 * Simulator data connection interface
 */
class SimConnection {
public:
    virtual ~SimConnection() = default;
    
    /**
     * Connect to the simulator
     */
    virtual Result<void, AptException> connect() = 0;
    
    /**
     * Disconnect from the simulator
     */
    virtual Result<void, AptException> disconnect() = 0;
    
    /**
     * Check if connected to the simulator
     */
    virtual bool isConnected() const = 0;
    
    /**
     * Get available data points from the simulator
     */
    virtual Result<std::vector<SimDataPoint>, AptException> getAvailableDataPoints() = 0;
    
    /**
     * Subscribe to data points
     */
    virtual Result<void, AptException> subscribeToDataPoints(
        const std::vector<std::string>& dataPointIds,
        const DataSubscriptionOptions& options = {}) = 0;
    
    /**
     * Unsubscribe from data points
     */
    virtual Result<void, AptException> unsubscribeFromDataPoints(
        const std::vector<std::string>& dataPointIds) = 0;
    
    /**
     * Set a data point value
     */
    virtual Result<void, AptException> setDataPointValue(
        const std::string& dataPointId,
        const SimValue& value) = 0;
    
    /**
     * Register a data receiver
     */
    virtual void registerDataReceiver(std::shared_ptr<DataReceiver> receiver) = 0;
    
    /**
     * Unregister a data receiver
     */
    virtual void unregisterDataReceiver(std::shared_ptr<DataReceiver> receiver) = 0;
};

/**
 * Lock-free queue wrapper for high-frequency data processing
 */
template<typename T>
class LockFreeQueue {
public:
    explicit LockFreeQueue(size_t capacity)
        : queue_(capacity) {}
    
    bool push(const T& item) {
        return queue_.push(item);
    }
    
    bool pop(T& item) {
        return queue_.pop(item);
    }
    
    bool empty() const {
        return queue_.empty();
    }
    
private:
    boost::lockfree::spsc_queue<T> queue_;
};

/**
 * SimulatorDataProcessor class for processing high-frequency simulator data
 */
class SimulatorDataProcessor : public DataReceiver {
public:
    /**
     * Constructor
     */
    explicit SimulatorDataProcessor(const DataProcessingOptions& options = {});
    
    /**
     * Destructor
     */
    ~SimulatorDataProcessor() override;
    
    /**
     * Start processing data
     */
    Result<void, AptException> start();
    
    /**
     * Stop processing data
     */
    Result<void, AptException> stop();
    
    /**
     * Set simulator connection
     */
    void setSimConnection(std::shared_ptr<SimConnection> connection);
    
    /**
     * Process a batch of simulator data frames (implementing DataReceiver interface)
     */
    void processBatch(const std::vector<SimDataFrame>& frames) override;
    
    /**
     * Register a callback for processed data
     * The callback will be called with processed frames on a separate thread
     */
    using ProcessedDataCallback = std::function<void(const std::vector<SimDataFrame>&)>;
    void registerProcessedDataCallback(ProcessedDataCallback callback);
    
    /**
     * Query historical data
     */
    Result<std::vector<SimDataFrame>, AptException> queryHistory(
        const std::chrono::system_clock::time_point& startTime,
        const std::chrono::system_clock::time_point& endTime,
        const std::vector<std::string>& dataPointIds = {});
    
    /**
     * Detect anomalies in real-time data
     */
    Result<void, AptException> enableAnomalyDetection(
        const std::vector<std::string>& dataPointIds,
        double threshold = 3.0);
    
    /**
     * Register a callback for anomaly detection
     */
    using AnomalyCallback = std::function<void(const std::string&, double, double)>;
    void registerAnomalyCallback(AnomalyCallback callback);
    
private:
    // Processing thread function
    void processingThreadFunc();
    
    // Process a batch of frames using SIMD if available
    void processBatchInternal(std::vector<SimDataFrame>& frames);
    
    // Apply filtering to a batch of frames
    void applyFiltering(std::vector<SimDataFrame>& frames);
    
    // Compute derivatives for specified data points
    void computeDerivatives(std::vector<SimDataFrame>& frames);
    
    // Detect events in the data
    void detectEvents(std::vector<SimDataFrame>& frames);
    
    // Detect anomalies in the data
    void detectAnomalies(std::vector<SimDataFrame>& frames);
    
    // Configuration
    DataProcessingOptions options_;
    
    // Connection to simulator
    std::shared_ptr<SimConnection> simConnection_;
    
    // Processing thread and control
    std::thread processingThread_;
    std::atomic<bool> running_;
    
    // Queue for incoming data frames
    using FrameBatch = std::vector<SimDataFrame>;
    LockFreeQueue<FrameBatch> incomingQueue_;
    
    // Historical data storage
    std::mutex historyMutex_;
    boost::circular_buffer<SimDataFrame> history_;
    
    // Processed data callbacks
    std::mutex callbackMutex_;
    std::vector<ProcessedDataCallback> dataCallbacks_;
    
    // Anomaly detection
    std::mutex anomalyMutex_;
    std::unordered_map<std::string, double> anomalyThresholds_;
    std::unordered_map<std::string, std::vector<double>> recentValues_;
    std::vector<AnomalyCallback> anomalyCallbacks_;
};

// Implementation of SimulatorDataProcessor constructor
inline SimulatorDataProcessor::SimulatorDataProcessor(const DataProcessingOptions& options)
    : options_(options),
      running_(false),
      incomingQueue_(options.queueSize),
      history_(options.includeHistory ? 100000 : 1) {
    
    // Auto-detect number of processing threads if not specified
    if (options_.processingThreads == 0) {
        options_.processingThreads = std::thread::hardware_concurrency();
        if (options_.processingThreads == 0) {
            options_.processingThreads = 1; // Fallback to single thread
        }
    }
}

// Implementation of SimulatorDataProcessor destructor
inline SimulatorDataProcessor::~SimulatorDataProcessor() {
    // Ensure processing is stopped
    stop();
}

// Implementation of start method
inline Result<void, AptException> SimulatorDataProcessor::start() {
    if (running_) {
        return Result<void, AptException>::success({});
    }
    
    if (!simConnection_) {
        return Result<void, AptException>::error(
            AptException(ErrorCode::INVALID_STATE, "No simulator connection set")
        );
    }
    
    // Start processing thread
    running_ = true;
    processingThread_ = std::thread(&SimulatorDataProcessor::processingThreadFunc, this);
    
    return Result<void, AptException>::success({});
}

// Implementation of stop method
inline Result<void, AptException> SimulatorDataProcessor::stop() {
    if (!running_) {
        return Result<void, AptException>::success({});
    }
    
    // Signal thread to stop
    running_ = false;
    
    // Wait for thread to join
    if (processingThread_.joinable()) {
        processingThread_.join();
    }
    
    return Result<void, AptException>::success({});
}

// Implementation of setSimConnection method
inline void SimulatorDataProcessor::setSimConnection(std::shared_ptr<SimConnection> connection) {
    // Ensure processing is stopped before changing connection
    if (running_) {
        stop();
    }
    
    simConnection_ = connection;
    
    // Register as a data receiver
    if (simConnection_) {
        simConnection_->registerDataReceiver(
            std::static_pointer_cast<DataReceiver>(shared_from_this()));
    }
}

// Implementation of processBatch method
inline void SimulatorDataProcessor::processBatch(const std::vector<SimDataFrame>& frames) {
    if (!running_) {
        return;
    }
    
    // Try to push frames to the queue
    if (!incomingQueue_.push(frames)) {
        LOG_WARN("integration", "SimulatorDataProcessor") 
            << "Queue is full, dropping " << frames.size() << " frames";
    }
}

// Implementation of registerProcessedDataCallback method
inline void SimulatorDataProcessor::registerProcessedDataCallback(ProcessedDataCallback callback) {
    std::lock_guard<std::mutex> lock(callbackMutex_);
    dataCallbacks_.push_back(callback);
}

// Implementation of queryHistory method
inline Result<std::vector<SimDataFrame>, AptException> SimulatorDataProcessor::queryHistory(
    const std::chrono::system_clock::time_point& startTime,
    const std::chrono::system_clock::time_point& endTime,
    const std::vector<std::string>& dataPointIds) {
    
    if (!options_.includeHistory) {
        return Result<std::vector<SimDataFrame>, AptException>::error(
            AptException(ErrorCode::INVALID_STATE, "History tracking is not enabled")
        );
    }
    
    std::lock_guard<std::mutex> lock(historyMutex_);
    
    std::vector<SimDataFrame> result;
    
    for (const auto& frame : history_) {
        if (frame.timestamp >= startTime && frame.timestamp <= endTime) {
            // If specific data points are requested, filter the frame
            if (!dataPointIds.empty()) {
                SimDataFrame filteredFrame;
                filteredFrame.timestamp = frame.timestamp;
                
                for (const auto& id : dataPointIds) {
                    auto it = frame.values.find(id);
                    if (it != frame.values.end()) {
                        filteredFrame.values[id] = it->second;
                    }
                }
                
                result.push_back(filteredFrame);
            } else {
                // Otherwise add the whole frame
                result.push_back(frame);
            }
        }
    }
    
    return Result<std::vector<SimDataFrame>, AptException>::success(result);
}

// Implementation of enableAnomalyDetection method
inline Result<void, AptException> SimulatorDataProcessor::enableAnomalyDetection(
    const std::vector<std::string>& dataPointIds,
    double threshold) {
    
    std::lock_guard<std::mutex> lock(anomalyMutex_);
    
    for (const auto& id : dataPointIds) {
        anomalyThresholds_[id] = threshold;
        recentValues_[id] = std::vector<double>();
    }
    
    return Result<void, AptException>::success({});
}

// Implementation of registerAnomalyCallback method
inline void SimulatorDataProcessor::registerAnomalyCallback(AnomalyCallback callback) {
    std::lock_guard<std::mutex> lock(anomalyMutex_);
    anomalyCallbacks_.push_back(callback);
}

// Implementation of processingThreadFunc method
inline void SimulatorDataProcessor::processingThreadFunc() {
    while (running_) {
        // Wait for data to process
        FrameBatch batch;
        
        // Try to get a batch of frames
        if (incomingQueue_.pop(batch)) {
            // Process the batch
            processBatchInternal(batch);
            
            // Store in history if enabled
            if (options_.includeHistory) {
                std::lock_guard<std::mutex> lock(historyMutex_);
                for (const auto& frame : batch) {
                    history_.push_back(frame);
                }
            }
            
            // Call callbacks with processed data
            std::vector<ProcessedDataCallback> callbacks;
            {
                std::lock_guard<std::mutex> lock(callbackMutex_);
                callbacks = dataCallbacks_;
            }
            
            for (const auto& callback : callbacks) {
                try {
                    callback(batch);
                } catch (const std::exception& e) {
                    LOG_ERROR("integration", "SimulatorDataProcessor") 
                        << "Error in callback: " << e.what();
                }
            }
        } else {
            // No data, sleep briefly to avoid spinning
            std::this_thread::sleep_for(std::chrono::microseconds(100));
        }
    }
}

// Implementation of processBatchInternal method
inline void SimulatorDataProcessor::processBatchInternal(std::vector<SimDataFrame>& frames) {
    // Apply processing steps as configured
    
    if (options_.applyFiltering) {
        applyFiltering(frames);
    }
    
    if (options_.computeDerivatives) {
        computeDerivatives(frames);
    }
    
    if (options_.detectEvents) {
        detectEvents(frames);
    }
    
    // Always check for anomalies if any are registered
    {
        std::lock_guard<std::mutex> lock(anomalyMutex_);
        if (!anomalyThresholds_.empty()) {
            detectAnomalies(frames);
        }
    }
}

// Implementation of applyFiltering method
inline void SimulatorDataProcessor::applyFiltering(std::vector<SimDataFrame>& frames) {
    // This is a placeholder for filtering implementation
    // In a real implementation, we would apply low-pass, high-pass, or other filters
    // using SIMD for performance if available
    
    if (!options_.useSIMD) {
        // Non-SIMD implementation of filtering
        // ...
    } else {
        // SIMD implementation of filtering
        // ...
    }
}

// Implementation of computeDerivatives method
inline void SimulatorDataProcessor::computeDerivatives(std::vector<SimDataFrame>& frames) {
    // This is a placeholder for derivative computation
    // In a real implementation, we would compute first and second derivatives
    // of selected data points
    
    if (frames.size() < 2) {
        return; // Need at least two frames for derivatives
    }
    
    // For each frame (except the first), compute derivatives
    for (size_t i = 1; i < frames.size(); ++i) {
        auto& currentFrame = frames[i];
        const auto& prevFrame = frames[i-1];
        
        // Time delta between frames
        auto dt = std::chrono::duration<double>(
            currentFrame.timestamp - prevFrame.timestamp).count();
        
        if (dt <= 0.0) {
            continue; // Skip if time delta is zero or negative
        }
        
        // For each value, compute derivative
        for (const auto& [id, value] : currentFrame.values) {
            // Check if this value exists in previous frame
            auto prevIt = prevFrame.values.find(id);
            if (prevIt != prevFrame.values.end()) {
                try {
                    // Compute derivative for numeric types
                    if (std::holds_alternative<float>(value) && 
                        std::holds_alternative<float>(prevIt->second)) {
                        
                        float current = std::get<float>(value);
                        float prev = std::get<float>(prevIt->second);
                        float derivative = (current - prev) / static_cast<float>(dt);
                        
                        // Store derivative in the frame with a special id
                        currentFrame.values[id + "_derivative"] = derivative;
                    }
                    else if (std::holds_alternative<double>(value) && 
                             std::holds_alternative<double>(prevIt->second)) {
                        
                        double current = std::get<double>(value);
                        double prev = std::get<double>(prevIt->second);
                        double derivative = (current - prev) / dt;
                        
                        // Store derivative in the frame with a special id
                        currentFrame.values[id + "_derivative"] = derivative;
                    }
                    else if (std::holds_alternative<int32_t>(value) && 
                             std::holds_alternative<int32_t>(prevIt->second)) {
                        
                        int32_t current = std::get<int32_t>(value);
                        int32_t prev = std::get<int32_t>(prevIt->second);
                        double derivative = static_cast<double>(current - prev) / dt;
                        
                        // Store derivative in the frame with a special id
                        currentFrame.values[id + "_derivative"] = derivative;
                    }
                } catch (const std::exception& e) {
                    LOG_ERROR("integration", "SimulatorDataProcessor") 
                        << "Error computing derivative for " << id << ": " << e.what();
                }
            }
        }
    }
}

// Implementation of detectEvents method
inline void SimulatorDataProcessor::detectEvents(std::vector<SimDataFrame>& frames) {
    // This is a placeholder for event detection
    // In a real implementation, we would detect significant events in the data
    // such as state changes, threshold crossings, etc.
}

// Implementation of detectAnomalies method
inline void SimulatorDataProcessor::detectAnomalies(std::vector<SimDataFrame>& frames) {
    std::lock_guard<std::mutex> lock(anomalyMutex_);
    
    // For each frame, check for anomalies in registered data points
    for (const auto& frame : frames) {
        for (const auto& [id, threshold] : anomalyThresholds_) {
            auto it = frame.values.find(id);
            if (it == frame.values.end()) {
                continue; // Skip if data point not in frame
            }
            
            // Extract value (only process numeric types)
            double value = 0.0;
            bool isNumeric = false;
            
            try {
                if (std::holds_alternative<float>(it->second)) {
                    value = static_cast<double>(std::get<float>(it->second));
                    isNumeric = true;
                }
                else if (std::holds_alternative<double>(it->second)) {
                    value = std::get<double>(it->second);
                    isNumeric = true;
                }
                else if (std::holds_alternative<int32_t>(it->second)) {
                    value = static_cast<double>(std::get<int32_t>(it->second));
                    isNumeric = true;
                }
            } catch (const std::exception& e) {
                LOG_ERROR("integration", "SimulatorDataProcessor") 
                    << "Error extracting value for anomaly detection: " << e.what();
                continue;
            }
            
            if (!isNumeric) {
                continue; // Skip non-numeric types
            }
            
            // Add to recent values
            auto& recent = recentValues_[id];
            recent.push_back(value);
            
            // Limit history size
            const size_t MAX_HISTORY = 1000;
            if (recent.size() > MAX_HISTORY) {
                recent.erase(recent.begin());
            }
            
            // Need enough history for meaningful statistics
            if (recent.size() < 10) {
                continue;
            }
            
            // Compute mean and standard deviation
            double sum = 0.0;
            for (double v : recent) {
                sum += v;
            }
            double mean = sum / recent.size();
            
            double sumSq = 0.0;
            for (double v : recent) {
                double diff = v - mean;
                sumSq += diff * diff;
            }
            double stdDev = std::sqrt(sumSq / recent.size());
            
            // Check if current value is an anomaly
            if (stdDev > 0.0) {
                double zScore = std::abs(value - mean) / stdDev;
                if (zScore > threshold) {
                    // Anomaly detected, call callbacks
                    for (const auto& callback : anomalyCallbacks_) {
                        try {
                            callback(id, value, zScore);
                        } catch (const std::exception& e) {
                            LOG_ERROR("integration", "SimulatorDataProcessor") 
                                << "Error in anomaly callback: " << e.what();
                        }
                    }
                }
            }
        }
    }
}

} // namespace integration
} // namespace apt