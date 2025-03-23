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
        heartbeatThread = std::thread(&AIPythonIntegration::heartbeatThreadFunc, this);
        
        spdlog::info("AI/Python integration initialized successfully");
        return true;
    } catch (const std::exception& e) {
        spdlog::error("Failed to initialize AI/Python integration: {}", e.what());
        shutdown();
        return false;
    }
}

void AIPythonIntegration::shutdown() {
    if (isRunning.exchange(false)) {
        // Stop heartbeat thread
        if (heartbeatThread.joinable()) {
            heartbeatThread.join();
        }
        
        // Stop Python processes
        processManager->stopAllProcesses();
        
        // Close ZeroMQ socket
        zmqSocket.reset();
        
        spdlog::info("AI/Python integration shutdown complete");
    }
}

json AIPythonIntegration::processDocument(
    ModelType modelType, 
    const std::string& documentPath, 
    const json& parameters
) {
    // Ensure the appropriate Python process is running
    if (!processManager->isProcessRunning(modelType)) {
        if (!processManager->startProcess(modelType)) {
            throw std::runtime_error("Failed to start Python process for document processing");
        }
    }
    
    // Prepare request
    json request = {
        {"operation", "process_document"},
        {"document_path", documentPath},
        {"parameters", parameters},
        {"model_type", modelTypeToString(modelType)}
    };
    
    // Check if model needs update
    ModelInfo info = versionTracker->getModelInfo(modelType);
    if (info.isActive) {
        request["model_version"] = info.version;
    }
    
    // Send request via ZeroMQ
    {
        std::lock_guard<std::mutex> lock(zmqMutex);
        if (!sendMessage(request, MessageType::REQUEST)) {
            throw std::runtime_error("Failed to send document processing request");
        }
        
        // Receive response
        auto response = receiveMessage(30000); // 30 second timeout
        if (!response) {
            throw std::runtime_error("Timeout waiting for document processing response");
        }
        
        // Update model info if version changed
        if (response->contains("model_version") && 
            response->at("model_version") != info.version) {
            info.version = response->at("model_version");
            info.lastUpdated = std::chrono::system_clock::now();
            versionTracker->updateModelInfo(modelType, info);
        }
        
        return *response;
    }
}

json AIPythonIntegration::analyzeFlightData(
    const std::vector<uint8_t>& telemetryData, 
    const json& parameters
) {
    // For large data, use shared memory
    if (telemetryData.size() > 1024 * 1024) { // 1MB threshold
        const ModelType modelType = ModelType::FLIGHT_ANOMALY_DETECTOR;
        
        // Ensure the process is running
        if (!processManager->isProcessRunning(modelType)) {
            if (!processManager->startProcess(modelType)) {
                throw std::runtime_error("Failed to start Python process for flight data analysis");
            }
        }
        
        // Send data via shared memory
        std::string messageId = sendLargeData(
            modelType,
            "analyze_flight_data",
            telemetryData.data(),
            telemetryData.size(),
            parameters
        );
        
        // Wait for processing to complete
        const std::string shmName = "flight_data_" + messageId;
        if (!sharedMemoryManager->waitForProcessing(shmName, 60000)) { // 60 second timeout
            throw std::runtime_error("Timeout waiting for flight data analysis");
        }
        
        // Read result
        std::vector<uint8_t> resultData = sharedMemoryManager->readData(shmName);
        
        // Check status code
        int status = sharedMemoryManager->getStatusCode(shmName);
        if (status != 0) {
            throw std::runtime_error("Flight data analysis failed with status code: " + 
                                     std::to_string(status));
        }
        
        // Signal data processed
        sharedMemoryManager->signalDataProcessed(shmName);
        
        // Destroy shared memory
        sharedMemoryManager->destroySharedMemory(shmName);
        
        // Parse result
        std::string resultStr(resultData.begin(), resultData.end());
        return json::parse(resultStr);
    } else {
        // For smaller data, use ZeroMQ directly
        const ModelType modelType = ModelType::FLIGHT_ANOMALY_DETECTOR;
        
        // Ensure the process is running
        if (!processManager->isProcessRunning(modelType)) {
            if (!processManager->startProcess(modelType)) {
                throw std::runtime_error("Failed to start Python process for flight data analysis");
            }
        }
        
        // Convert binary data to base64
        std::string base64Data = ""; // Implement base64 encoding here
        
        // Prepare request
        json request = {
            {"operation", "analyze_flight_data"},
            {"telemetry_data", base64Data},
            {"parameters", parameters},
            {"model_type", modelTypeToString(modelType)}
        };
        
        // Send request via ZeroMQ
        {
            std::lock_guard<std::mutex> lock(zmqMutex);
            if (!sendMessage(request, MessageType::REQUEST)) {
                throw std::runtime_error("Failed to send flight data analysis request");
            }
            
            // Receive response
            auto response = receiveMessage(30000); // 30 second timeout
            if (!response) {
                throw std::runtime_error("Timeout waiting for flight data analysis response");
            }
            
            return *response;
        }
    }
}

json AIPythonIntegration::generateTrainingRecommendations(
    const std::string& traineeId, 
    const json& performanceData,
    const json& parameters
) {
    const ModelType modelType = ModelType::TRAINING_RECOMMENDER;
    
    // Ensure the process is running
    if (!processManager->isProcessRunning(modelType)) {
        if (!processManager->startProcess(modelType)) {
            throw std::runtime_error("Failed to start Python process for training recommendations");
        }
    }
    
    // Prepare request
    json request = {
        {"operation", "generate_recommendations"},
        {"trainee_id", traineeId},
        {"performance_data", performanceData},
        {"parameters", parameters},
        {"model_type", modelTypeToString(modelType)}
    };
    
    // Check if model needs update
    ModelInfo info = versionTracker->getModelInfo(modelType);
    if (info.isActive) {
        request["model_version"] = info.version;
    }
    
    // Send request via ZeroMQ
    {
        std::lock_guard<std::mutex> lock(zmqMutex);
        if (!sendMessage(request, MessageType::REQUEST)) {
            throw std::runtime_error("Failed to send training recommendations request");
        }
        
        // Receive response
        auto response = receiveMessage(15000); // 15 second timeout
        if (!response) {
            throw std::runtime_error("Timeout waiting for training recommendations response");
        }
        
        // Update model info if version changed
        if (response->contains("model_version") && 
            response->at("model_version") != info.version) {
            info.version = response->at("model_version");
            info.lastUpdated = std::chrono::system_clock::now();
            versionTracker->updateModelInfo(modelType, info);
        }
        
        return *response;
    }
}

json AIPythonIntegration::assessSkills(
    const std::string& traineeId,
    const json& assessmentData,
    const json& parameters
) {
    const ModelType modelType = ModelType::SKILL_ASSESSOR;
    
    // Ensure the process is running
    if (!processManager->isProcessRunning(modelType)) {
        if (!processManager->startProcess(modelType)) {
            throw std::runtime_error("Failed to start Python process for skill assessment");
        }
    }
    
    // Prepare request
    json request = {
        {"operation", "assess_skills"},
        {"trainee_id", traineeId},
        {"assessment_data", assessmentData},
        {"parameters", parameters},
        {"model_type", modelTypeToString(modelType)}
    };
    
    // Check if model needs update
    ModelInfo info = versionTracker->getModelInfo(modelType);
    if (info.isActive) {
        request["model_version"] = info.version;
    }
    
    // Send request via ZeroMQ
    {
        std::lock_guard<std::mutex> lock(zmqMutex);
        if (!sendMessage(request, MessageType::REQUEST)) {
            throw std::runtime_error("Failed to send skill assessment request");
        }
        
        // Receive response
        auto response = receiveMessage(20000); // 20 second timeout
        if (!response) {
            throw std::runtime_error("Timeout waiting for skill assessment response");
        }
        
        // Update model info if version changed
        if (response->contains("model_version") && 
            response->at("model_version") != info.version) {
            info.version = response->at("model_version");
            info.lastUpdated = std::chrono::system_clock::now();
            versionTracker->updateModelInfo(modelType, info);
        }
        
        return *response;
    }
}

json AIPythonIntegration::generateSyllabus(
    const json& requirements,
    const json& constraints,
    const json& parameters
) {
    const ModelType modelType = ModelType::SYLLABUS_GENERATOR;
    
    // Ensure the process is running
    if (!processManager->isProcessRunning(modelType)) {
        if (!processManager->startProcess(modelType)) {
            throw std::runtime_error("Failed to start Python process for syllabus generation");
        }
    }
    
    // Prepare request
    json request = {
        {"operation", "generate_syllabus"},
        {"requirements", requirements},
        {"constraints", constraints},
        {"parameters", parameters},
        {"model_type", modelTypeToString(modelType)}
    };
    
    // Check if model needs update
    ModelInfo info = versionTracker->getModelInfo(modelType);
    if (info.isActive) {
        request["model_version"] = info.version;
    }
    
    // Send request via ZeroMQ
    {
        std::lock_guard<std::mutex> lock(zmqMutex);
        if (!sendMessage(request, MessageType::REQUEST)) {
            throw std::runtime_error("Failed to send syllabus generation request");
        }
        
        // Receive response
        auto response = receiveMessage(30000); // 30 second timeout
        if (!response) {
            throw std::runtime_error("Timeout waiting for syllabus generation response");
        }
        
        // Update model info if version changed
        if (response->contains("model_version") && 
            response->at("model_version") != info.version) {
            info.version = response->at("model_version");
            info.lastUpdated = std::chrono::system_clock::now();
            versionTracker->updateModelInfo(modelType, info);
        }
        
        return *response;
    }
}

json AIPythonIntegration::predictPerformance(
    const std::string& traineeId,
    const json& historicalData,
    const json& parameters
) {
    const ModelType modelType = ModelType::PERFORMANCE_PREDICTOR;
    
    // Ensure the process is running
    if (!processManager->isProcessRunning(modelType)) {
        if (!processManager->startProcess(modelType)) {
            throw std::runtime_error("Failed to start Python process for performance prediction");
        }
    }
    
    // Prepare request
    json request = {
        {"operation", "predict_performance"},
        {"trainee_id", traineeId},
        {"historical_data", historicalData},
        {"parameters", parameters},
        {"model_type", modelTypeToString(modelType)}
    };
    
    // Check if model needs update
    ModelInfo info = versionTracker->getModelInfo(modelType);
    if (info.isActive) {
        request["model_version"] = info.version;
    }
    
    // Send request via ZeroMQ
    {
        std::lock_guard<std::mutex> lock(zmqMutex);
        if (!sendMessage(request, MessageType::REQUEST)) {
            throw std::runtime_error("Failed to send performance prediction request");
        }
        
        // Receive response
        auto response = receiveMessage(15000); // 15 second timeout
        if (!response) {
            throw std::runtime_error("Timeout waiting for performance prediction response");
        }
        
        // Update model info if version changed
        if (response->contains("model_version") && 
            response->at("model_version") != info.version) {
            info.version = response->at("model_version");
            info.lastUpdated = std::chrono::system_clock::now();
            versionTracker->updateModelInfo(modelType, info);
        }
        
        return *response;
    }
}

json AIPythonIntegration::checkHealth() {
    json health = {
        {"status", "ok"},
        {"processes", processManager->getProcessHealthMetrics()},
        {"models", json::array()}
    };
    
    // Add model information
    for (int i = 0; i < 7; i++) {
        ModelType type = static_cast<ModelType>(i);
        ModelInfo info = versionTracker->getModelInfo(type);
        
        health["models"].push_back({
            {"type", modelTypeToString(type)},
            {"version", info.version},
            {"active", info.isActive},
            {"last_updated", info.lastUpdated.time_since_epoch().count()}
        });
    }
    
    return health;
}

bool AIPythonIntegration::sendMessage(
    const json& message, 
    MessageType messageType
) {
    try {
        // Add message ID and type
        json enrichedMessage = message;
        enrichedMessage["message_id"] = generateMessageId();
        enrichedMessage["message_type"] = static_cast<int>(messageType);
        enrichedMessage["timestamp"] = std::chrono::system_clock::now().time_since_epoch().count();
        
        // Convert to string
        std::string messageStr = enrichedMessage.dump();
        
        // Send message
        zmq::message_t zmqMessage(messageStr.size());
        memcpy(zmqMessage.data(), messageStr.c_str(), messageStr.size());
        return zmqSocket->send(zmqMessage, zmq::send_flags::none);
    } catch (const std::exception& e) {
        spdlog::error("Failed to send ZeroMQ message: {}", e.what());
        return false;
    }
}

std::optional<json> AIPythonIntegration::receiveMessage(int timeoutMs) {
    try {
        zmq::message_t message;
        
        // Set timeout (temporarily)
        int oldTimeout;
        size_t optionSize = sizeof(oldTimeout);
        zmqSocket->getsockopt(ZMQ_RCVTIMEO, &oldTimeout, &optionSize);
        zmqSocket->setsockopt(ZMQ_RCVTIMEO, &timeoutMs, sizeof(timeoutMs));
        
        // Receive message
        if (!zmqSocket->recv(message)) {
            // Restore original timeout
            zmqSocket->setsockopt(ZMQ_RCVTIMEO, &oldTimeout, sizeof(oldTimeout));
            return std::nullopt;
        }
        
        // Restore original timeout
        zmqSocket->setsockopt(ZMQ_RCVTIMEO, &oldTimeout, sizeof(oldTimeout));
        
        // Parse JSON
        std::string messageStr(static_cast<char*>(message.data()), message.size());
        return json::parse(messageStr);
    } catch (const std::exception& e) {
        spdlog::error("Failed to receive ZeroMQ message: {}", e.what());
        return std::nullopt;
    }
}

std::string AIPythonIntegration::sendLargeData(
    ModelType modelType,
    const std::string& operation, 
    const void* data, 
    std::size_t size,
    const json& parameters
) {
    // Generate message ID
    std::string messageId = generateMessageId();
    
    // Create shared memory name
    std::string shmName = "flight_data_" + messageId;
    
    // Create shared memory
    if (!sharedMemoryManager->createSharedMemory(shmName, size + sizeof(SharedMemoryHeader))) {
        throw std::runtime_error("Failed to create shared memory for large data transfer");
    }
    
    // Write data to shared memory
    if (!sharedMemoryManager->writeData(
            shmName, data, size, modelType, operation, messageId)) {
        sharedMemoryManager->destroySharedMemory(shmName);
        throw std::runtime_error("Failed to write data to shared memory");
    }
    
    // Notify Python process via ZeroMQ
    json notification = {
        {"operation", operation},
        {"shared_memory_name", shmName},
        {"parameters", parameters},
        {"model_type", modelTypeToString(modelType)},
        {"data_size", size}
    };
    
    {
        std::lock_guard<std::mutex> lock(zmqMutex);
        if (!sendMessage(notification, MessageType::REQUEST)) {
            sharedMemoryManager->destroySharedMemory(shmName);
            throw std::runtime_error("Failed to send shared memory notification");
        }
    }
    
    return messageId;
}

void AIPythonIntegration::heartbeatThreadFunc() {
    while (isRunning) {
        sendHeartbeat();
        std::this_thread::sleep_for(std::chrono::seconds(10));
    }
}

void AIPythonIntegration::sendHeartbeat() {
    try {
        json heartbeat = {
            {"operation", "heartbeat"}
        };
        
        std::lock_guard<std::mutex> lock(zmqMutex);
        sendMessage(heartbeat, MessageType::HEARTBEAT);
        
        // We don't wait for responses here, as they'll be handled by the main thread
    } catch (const std::exception& e) {
        spdlog::error("Failed to send heartbeat: {}", e.what());
    }
}

std::string AIPythonIntegration::generateMessageId() {
    static std::atomic<uint64_t> counter(0);
    uint64_t id = counter.fetch_add(1, std::memory_order_relaxed);
    
    std::stringstream ss;
    ss << std::hex << id << "-" 
       << std::chrono::system_clock::now().time_since_epoch().count();
    return ss.str();
}

std::string AIPythonIntegration::modelTypeToString(ModelType modelType) {
    switch (modelType) {
        case ModelType::SYLLABUS_GENERATOR:
            return "syllabus_generator";
        case ModelType::DOCUMENT_ANALYZER:
            return "document_analyzer";
        case ModelType::PERFORMANCE_PREDICTOR:
            return "performance_predictor";
        case ModelType::SKILL_ASSESSOR:
            return "skill_assessor";
        case ModelType::FLIGHT_ANOMALY_DETECTOR:
            return "flight_anomaly_detector";
        case ModelType::TRAINING_RECOMMENDER:
            return "training_recommender";
        case ModelType::PROGRESS_ANALYZER:
            return "progress_analyzer";
        default:
            return "unknown";
    }
}

} // namespace ai