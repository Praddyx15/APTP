#include <memory>
#include <string>
#include <vector>
#include <unordered_map>
#include <chrono>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <future>
#include <atomic>
#include <zmq.hpp>
#include <nlohmann/json.hpp>
#include <spdlog/spdlog.h>

// For shared memory
#include <boost/interprocess/shared_memory_object.hpp>
#include <boost/interprocess/mapped_region.hpp>
#include <boost/interprocess/sync/interprocess_mutex.hpp>
#include <boost/interprocess/sync/interprocess_condition.hpp>
#include <boost/interprocess/sync/scoped_lock.hpp>

namespace ai {

using json = nlohmann::json;
namespace bip = boost::interprocess;

// Forward declarations
class PyProcessManager;
class SharedMemoryManager;
class ModelVersionTracker;

/**
 * Enumeration for AI model types
 */
enum class ModelType {
    SYLLABUS_GENERATOR,
    DOCUMENT_ANALYZER,
    PERFORMANCE_PREDICTOR,
    SKILL_ASSESSOR,
    FLIGHT_ANOMALY_DETECTOR,
    TRAINING_RECOMMENDER,
    PROGRESS_ANALYZER
};

/**
 * Enumeration for ZeroMQ message types
 */
enum class MessageType {
    REQUEST,
    RESPONSE,
    HEARTBEAT,
    ERROR,
    CONTROL
};

/**
 * Structure for model metadata
 */
struct ModelInfo {
    std::string id;
    std::string name;
    std::string version;
    std::string description;
    std::unordered_map<std::string, std::string> parameters;
    std::chrono::system_clock::time_point lastUpdated;
    bool isActive;
};

/**
 * Structure for shared memory data header
 */
struct SharedMemoryHeader {
    bip::interprocess_mutex mutex;
    bip::interprocess_condition dataReady;
    bip::interprocess_condition dataProcessed;
    std::size_t dataSize;
    bool isReady;
    bool isProcessed;
    int status;
    char modelType[32];
    char operation[32];
    char messageId[64];
};

/**
 * Class for managing Python processes
 */
class PyProcessManager {
public:
    /**
     * Constructor
     */
    PyProcessManager(const std::string& pythonPath, const std::string& scriptDir);
    
    /**
     * Destructor
     */
    ~PyProcessManager();
    
    /**
     * Start a Python process for a specific model type
     */
    bool startProcess(ModelType modelType);
    
    /**
     * Stop a Python process
     */
    bool stopProcess(ModelType modelType);
    
    /**
     * Stop all Python processes
     */
    void stopAllProcesses();
    
    /**
     * Check if a process is running
     */
    bool isProcessRunning(ModelType modelType);
    
    /**
     * Restart a process if it's not responding
     */
    bool restartProcessIfNeeded(ModelType modelType);
    
    /**
     * Get process health metrics
     */
    json getProcessHealthMetrics();

private:
    std::string pythonPath;
    std::string scriptDir;
    std::unordered_map<ModelType, int> processes;
    std::unordered_map<ModelType, std::chrono::system_clock::time_point> lastHeartbeats;
    std::mutex processMutex;
    
    /**
     * Send signal to process
     */
    bool sendSignal(int pid, int signal);
    
    /**
     * Check if process is responding
     */
    bool isProcessResponding(ModelType modelType);
    
    /**
     * Get script path for model type
     */
    std::string getScriptPath(ModelType modelType);
    
    /**
     * Helper to convert ModelType to string
     */
    std::string modelTypeToString(ModelType modelType);
};

/**
 * Class for managing shared memory for large data transfers
 */
class SharedMemoryManager {
public:
    /**
     * Constructor
     */
    SharedMemoryManager();
    
    /**
     * Destructor
     */
    ~SharedMemoryManager();
    
    /**
     * Create a shared memory segment
     */
    bool createSharedMemory(const std::string& name, std::size_t size);
    
    /**
     * Destroy a shared memory segment
     */
    bool destroySharedMemory(const std::string& name);
    
    /**
     * Write data to shared memory
     */
    bool writeData(
        const std::string& name, 
        const void* data, 
        std::size_t size, 
        ModelType modelType,
        const std::string& operation,
        const std::string& messageId
    );
    
    /**
     * Read data from shared memory
     */
    std::vector<uint8_t> readData(
        const std::string& name, 
        int timeoutMs = 5000
    );
    
    /**
     * Wait for Python process to signal data processing completion
     */
    bool waitForProcessing(
        const std::string& name, 
        int timeoutMs = 30000
    );
    
    /**
     * Signal completion of data reading
     */
    void signalDataProcessed(const std::string& name);
    
    /**
     * Get status code from shared memory
     */
    int getStatusCode(const std::string& name);

private:
    std::unordered_map<std::string, std::unique_ptr<bip::shared_memory_object>> sharedMemories;
    std::unordered_map<std::string, std::unique_ptr<bip::mapped_region>> headerRegions;
    std::unordered_map<std::string, std::unique_ptr<bip::mapped_region>> dataRegions;
    std::mutex shmMutex;
    
    /**
     * Get header from mapped region
     */
    SharedMemoryHeader* getHeader(const std::string& name);
    
    /**
     * Get data pointer from mapped region
     */
    void* getDataPtr(const std::string& name);
};

/**
 * Class for tracking model versions
 */
class ModelVersionTracker {
public:
    /**
     * Constructor
     */
    ModelVersionTracker();
    
    /**
     * Get model info
     */
    ModelInfo getModelInfo(ModelType modelType);
    
    /**
     * Update model info
     */
    void updateModelInfo(ModelType modelType, const ModelInfo& info);
    
    /**
     * Check if model needs update
     */
    bool needsUpdate(ModelType modelType, const std::string& currentVersion);
    
    /**
     * Load model info from database
     */
    bool loadFromDatabase();
    
    /**
     * Save model info to database
     */
    bool saveToDatabase();

private:
    std::unordered_map<ModelType, ModelInfo> modelInfoMap;
    std::mutex modelMutex;
    
    /**
     * Helper to convert ModelType to string
     */
    std::string modelTypeToString(ModelType modelType);
    
    /**
     * Helper to convert string to ModelType
     */
    ModelType stringToModelType(const std::string& str);
};

/**
 * Main class for handling AI/Python integration
 */
class AIPythonIntegration {
public:
    /**
     * Constructor
     */
    AIPythonIntegration(
        const std::string& pythonPath, 
        const std::string& scriptDir,
        const std::string& zmqEndpoint
    );
    
    /**
     * Destructor
     */
    ~AIPythonIntegration();
    
    /**
     * Initialize the integration
     */
    bool initialize();
    
    /**
     * Shutdown the integration
     */
    void shutdown();
    
    /**
     * Process document with AI model
     */
    json processDocument(
        ModelType modelType, 
        const std::string& documentPath, 
        const json& parameters
    );
    
    /**
     * Analyze flight telemetry data
     */
    json analyzeFlightData(
        const std::vector<uint8_t>& telemetryData, 
        const json& parameters
    );
    
    /**
     * Generate training recommendations
     */
    json generateTrainingRecommendations(
        const std::string& traineeId, 
        const json& performanceData,
        const json& parameters
    );
    
    /**
     * Assess pilot skills
     */
    json assessSkills(
        const std::string& traineeId,
        const json& assessmentData,
        const json& parameters
    );
    
    /**
     * Generate syllabus
     */
    json generateSyllabus(
        const json& requirements,
        const json& constraints,
        const json& parameters
    );
    
    /**
     * Predict trainee performance
     */
    json predictPerformance(
        const std::string& traineeId,
        const json& historicalData,
        const json& parameters
    );
    
    /**
     * Check system health
     */
    json checkHealth();

private:
    std::unique_ptr<PyProcessManager> processManager;
    std::unique_ptr<SharedMemoryManager> sharedMemoryManager;
    std::unique_ptr<ModelVersionTracker> versionTracker;
    std::unique_ptr<zmq::context_t> zmqContext;
    std::unique_ptr<zmq::socket_t> zmqSocket;
    std::string zmqEndpoint;
    std::atomic<bool> isRunning;
    std::thread heartbeatThread;
    std::mutex zmqMutex;
    
    /**
     * Send message via ZeroMQ
     */
    bool sendMessage(
        const json& message, 
        MessageType messageType
    );
    
    /**
     * Receive message via ZeroMQ
     */
    std::optional<json> receiveMessage(int timeoutMs = 5000);
    
    /**
     * Send large data via shared memory
     */
    std::string sendLargeData(
        ModelType modelType,
        const std::string& operation, 
        const void* data, 
        std::size_t size,
        const json& parameters
    );
    
    /**
     * Handle heartbeat responses
     */
    void heartbeatThreadFunc();
    
    /**
     * Send heartbeat to Python processes
     */
    void sendHeartbeat();
    
    /**
     * Generate a unique message ID
     */
    std::string generateMessageId();
    
    /**
     * Helper to convert ModelType to string
     */
    std::string modelTypeToString(ModelType modelType);
};

// Implementation of AIPythonIntegration

AIPythonIntegration::AIPythonIntegration(
    const std::string& pythonPath, 
    const std::string& scriptDir,
    const std::string& zmqEndpoint
) : zmqEndpoint(zmqEndpoint), isRunning(false) {
    processManager = std::make_unique<PyProcessManager>(pythonPath, scriptDir);
    sharedMemoryManager = std::make_unique<SharedMemoryManager>();
    versionTracker = std::make_unique<ModelVersionTracker>();
    
    zmqContext = std::make_unique<zmq::context_t>(1);
}

AIPythonIntegration::~AIPythonIntegration() {
    shutdown();
}

bool AIPythonIntegration::initialize() {
    try {
        // Load model version information
        if (!versionTracker->loadFromDatabase()) {
            spdlog::warn("Failed to load model version information from database");
        }
        
        // Initialize ZeroMQ socket
        zmqSocket = std::make_unique<zmq::socket_t>(*zmqContext, ZMQ_ROUTER);
        
        int timeout = 5000; // 5 seconds
        zmqSocket->setsockopt(ZMQ_RCVTIMEO, &timeout, sizeof(timeout));
        
        // Bind socket
        zmqSocket->bind(zmqEndpoint);
        
        // Start Python processes for each model type
        processManager->startProcess(ModelType::DOCUMENT_ANALYZER);
        processManager->startProcess(ModelType::PERFORMANCE_PREDICTOR);
        processManager->startProcess(ModelType::SKILL_ASSESSOR);
        processManager->startProcess(ModelType::SYLLABUS_GENERATOR);
        processManager->startProcess(ModelType::FLIGHT_ANOMALY_DETECTOR);
        processManager->startProcess(ModelType::TRAINING_RECOMMENDER);
        
        // Start heartbeat thread
        isRunning = true;
        heartbeatThread = std::thread(&AIPythonIntegration::heartbeatThreadFunc