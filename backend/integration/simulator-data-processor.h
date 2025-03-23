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
    virtual Result<std::vector<SimDataPoint>, AptException> getAvailableDataPoints() = 