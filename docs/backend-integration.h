// /backend/integration/include/integration/IntegrationService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <unordered_map>
#include <mutex>
#include "core/ConfigurationManager.h"
#include "database/DatabaseManager.h"
#include "integration/SimulatorConnector.h"
#include "integration/BiometricConnector.h"
#include "integration/EnterpriseConnector.h"
#include "integration/CalendarConnector.h"
#include "integration/IntegrationTypes.h"

namespace Integration {

class IntegrationService {
public:
    IntegrationService(
        std::shared_ptr<Core::ConfigurationManager> config,
        std::shared_ptr<Database::DatabaseManager> dbManager
    );
    ~IntegrationService();
    
    // Simulator integration
    bool connectToSimulator(const SimulatorConnectionParams& params);
    bool disconnectFromSimulator(const std::string& simulatorId);
    bool startTelemetryStream(const std::string& simulatorId, 
                             const TelemetryStreamParams& params,
                             TelemetryCallback callback);
    bool stopTelemetryStream(const std::string& simulatorId);
    SimulatorStatus getSimulatorStatus(const std::string& simulatorId);
    std::vector<std::string> getConnectedSimulators();
    
    // Biometric device integration
    bool connectToBiometricDevice(const BiometricDeviceParams& params);
    bool disconnectFromBiometricDevice(const std::string& deviceId);
    bool startBiometricStream(const std::string& deviceId, 
                             BiometricDataCallback callback);
    bool stopBiometricStream(const std::string& deviceId);
    BiometricDeviceStatus getBiometricDeviceStatus(const std::string& deviceId);
    std::vector<std::string> getConnectedBiometricDevices();
    
    // Enterprise system integration (HR/ERP)
    bool connectToEnterpriseSystem(const EnterpriseSystemParams& params);
    bool disconnectFromEnterpriseSystem(const std::string& systemId);
    std::vector<TraineeProfile> syncTraineeProfiles();
    std::vector<CourseRegistration> syncCourseRegistrations();
    bool pushTrainingResults(const std::vector<TrainingResult>& results);
    EnterpriseSystemStatus getEnterpriseSystemStatus(const std::string& systemId);
    std::vector<std::string> getConnectedEnterpriseSystems();
    
    // Calendar integration
    bool connectToCalendar(const CalendarConnectionParams& params);
    bool disconnectFromCalendar(const std::string& calendarId);
    std::vector<CalendarEvent> getCalendarEvents(
        const std::string& calendarId,
        const TimeRange& range
    );
    bool createCalendarEvent(const std::string& calendarId, const CalendarEvent& event);
    bool updateCalendarEvent(const std::string& calendarId, const CalendarEvent& event);
    bool deleteCalendarEvent(const std::string& calendarId, const std::string& eventId);
    CalendarStatus getCalendarStatus(const std::string& calendarId);
    std::vector<std::string> getConnectedCalendars();
    
    // Connection management
    std::vector<Connection> getAllConnections();
    Connection getConnection(const std::string& connectionId);
    bool updateConnection(const Connection& connection);
    bool deleteConnection(const std::string& connectionId);
    
    // Health checks
    bool checkAllConnections();
    ConnectionHealth getConnectionHealth(const std::string& connectionId);
    std::vector<ConnectionHealth> getAllConnectionsHealth();

private:
    std::shared_ptr<Core::ConfigurationManager> config_;
    std::shared_ptr<Database::DatabaseManager> dbManager_;
    
    // Connector instances
    std::unordered_map<std::string, std::shared_ptr<SimulatorConnector>> simulatorConnectors_;
    std::unordered_map<std::string, std::shared_ptr<BiometricConnector>> biometricConnectors_;
    std::unordered_map<std::string, std::shared_ptr<EnterpriseConnector>> enterpriseConnectors_;
    std::unordered_map<std::string, std::shared_ptr<CalendarConnector>> calendarConnectors_;
    
    // Thread safety
    std::mutex connectorsMutex_;
    
    // Helper methods
    std::string generateConnectionId(const std::string& type, const std::string& name);
    bool saveConnectionToDb(const Connection& connection);
    bool loadConnectionsFromDb();
};

} // namespace Integration

// /backend/integration/include/integration/IntegrationTypes.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <chrono>
#include <functional>
#include <unordered_map>
#include <optional>
#include <nlohmann/json.hpp>

namespace Integration {

// Common types
enum class ConnectionType {
    SIMULATOR,
    BIOMETRIC_DEVICE,
    ENTERPRISE_SYSTEM,
    CALENDAR
};

enum class ConnectionStatus {
    CONNECTED,
    DISCONNECTED,
    CONNECTING,
    ERROR
};

struct TimeRange {
    std::chrono::system_clock::time_point start;
    std::chrono::system_clock::time_point end;
};

struct Connection {
    std::string id;
    std::string name;
    ConnectionType type;
    ConnectionStatus status;
    std::string errorMessage;
    std::chrono::system_clock::time_point lastConnected;
    std::chrono::system_clock::time_point createdAt;
    nlohmann::json connectionParams;
    
    nlohmann::json toJson() const;
    static Connection fromJson(const nlohmann::json& json);
};

struct ConnectionHealth {
    std::string connectionId;
    bool isHealthy;
    int latencyMs;
    std::string statusMessage;
    std::chrono::system_clock::time_point checkedAt;
    
    nlohmann::json toJson() const;
    static ConnectionHealth fromJson(const nlohmann::json& json);
};

// Simulator types
struct SimulatorConnectionParams {
    std::string name;
    std::string host;
    int port;
    std::string username;
    std::string password;
    std::string simulatorType;  // e.g., "X-Plane", "FSX", "P3D", "MSFS"
    int updateFrequencyHz;
    
    nlohmann::json toJson() const;
    static SimulatorConnectionParams fromJson(const nlohmann::json& json);
};

struct TelemetryStreamParams {
    std::vector<std::string> parameters;  // e.g., "altitude", "airspeed", "heading"
    int samplingRateHz;
    bool includeTimestamp;
    std::string outputFormat;  // e.g., "json", "binary", "csv"
    
    nlohmann::json toJson() const;
    static TelemetryStreamParams fromJson(const nlohmann::json& json);
};

struct SimulatorTelemetry {
    double timestamp;
    std::unordered_map<std::string, double> parameters;
    
    nlohmann::json toJson() const;
    static SimulatorTelemetry fromJson(const nlohmann::json& json);
};

using TelemetryCallback = std::function<void(const SimulatorTelemetry&)>;

struct SimulatorStatus {
    std::string simulatorId;
    std::string simulatorType;
    ConnectionStatus connectionStatus;
    bool isTelemetryActive;
    int currentUpdateFrequencyHz;
    std::chrono::system_clock::time_point connectedSince;
    std::string aircraftType;
    std::string aircraftPosition;
    
    nlohmann::json toJson() const;
    static SimulatorStatus fromJson(const nlohmann::json& json);
};

// Biometric device types
struct BiometricDeviceParams {
    std::string name;
    std::string deviceType;  // e.g., "EyeTracker", "HeartRateMonitor", "GSR"
    std::string connectionMethod;  // e.g., "Bluetooth", "USB", "WiFi"
    std::string deviceId;
    std::string host;  // For network-connected devices
    int port;
    std::string apiKey;
    
    nlohmann::json toJson() const;
    static BiometricDeviceParams fromJson(const nlohmann::json& json);
};

struct BiometricData {
    double timestamp;
    std::string deviceId;
    std::string dataType;  // e.g., "heartRate", "eyePosition", "GSR"
    nlohmann::json value;
    
    nlohmann::json toJson() const;
    static BiometricData fromJson(const nlohmann::json& json);
};

using BiometricDataCallback = std::function<void(const BiometricData&)>;

struct BiometricDeviceStatus {
    std::string deviceId;
    std::string deviceType;
    ConnectionStatus connectionStatus;
    bool isStreamActive;
    std::chrono::system_clock::time_point connectedSince;
    int batteryLevel;  // Percentage, if applicable
    
    nlohmann::json toJson() const;
    static BiometricDeviceStatus fromJson(const nlohmann::json& json);
};

// Enterprise system types
struct EnterpriseSystemParams {
    std::string name;
    std::string systemType;  // e.g., "SAP", "Workday", "CustomHR"
    std::string baseUrl;
    std::string username;
    std::string password;
    std::string apiKey;
    std::string tenantId;
    int syncIntervalMinutes;
    
    nlohmann::json toJson() const;
    static EnterpriseSystemParams fromJson(const nlohmann::json& json);
};

struct TraineeProfile {
    std::string id;
    std::string externalId;  // ID in the enterprise system
    std::string firstName;
    std::string lastName;
    std::string email;
    std::string department;
    std::string position;
    std::string employeeId;
    std::chrono::system_clock::time_point hireDate;
    std::unordered_map<std::string, std::string> customAttributes;
    
    nlohmann::json toJson() const;
    static TraineeProfile fromJson(const nlohmann::json& json);
};

struct CourseRegistration {
    std::string id;
    std::string traineeId;
    std::string courseId;
    std::string courseName;
    std::chrono::system_clock::time_point registrationDate;
    std::chrono::system_clock::time_point startDate;
    std::chrono::system_clock::time_point endDate;
    std::string status;  // e.g., "Registered", "In Progress", "Completed"
    
    nlohmann::json toJson() const;
    static CourseRegistration fromJson(const nlohmann::json& json);
};

struct TrainingResult {
    std::string traineeId;
    std::string courseId;
    std::string assessmentId;
    std::string status;  // e.g., "Passed", "Failed", "In Progress"
    double score;
    std::chrono::system_clock::time_point completionDate;
    std::vector<std::string> completedCompetencies;
    std::unordered_map<std::string, double> competencyScores;
    
    nlohmann::json toJson() const;
    static TrainingResult fromJson(const nlohmann::json& json);
};

struct EnterpriseSystemStatus {
    std::string systemId;
    std::string systemType;
    ConnectionStatus connectionStatus;
    std::chrono::system_clock::time_point lastSyncTime;
    int syncIntervalMinutes;
    int recordsProcessed;
    
    nlohmann::json toJson() const;
    static EnterpriseSystemStatus fromJson(const nlohmann::json& json);
};

// Calendar types
struct CalendarConnectionParams {
    std::string name;
    std::string calendarType;  // e.g., "Google", "Outlook", "iCalendar"
    std::string authMethod;  // e.g., "OAuth", "Basic", "ApiKey"
    std::string baseUrl;
    std::string username;
    std::string password;
    std::string apiKey;
    std::string calendarId;
    
    nlohmann::json toJson() const;
    static CalendarConnectionParams fromJson(const nlohmann::json& json);
};

struct CalendarEvent {
    std::string id;
    std::string title;
    std::string description;
    std::string location;
    std::chrono::system_clock::time_point startTime;
    std::chrono::system_clock::time_point endTime;
    bool isAllDay;
    std::vector<std::string> attendees;
    std::string organizer;
    std::string status;  // e.g., "Confirmed", "Tentative", "Cancelled"
    std::unordered_map<std::string, std::string> metadata;
    
    nlohmann::json toJson() const;
    static CalendarEvent fromJson(const nlohmann::json& json);
};

struct CalendarStatus {
    std::string calendarId;
    std::string calendarType;
    ConnectionStatus connectionStatus;
    std::chrono::system_clock::time_point lastSyncTime;
    int totalEvents;
    
    nlohmann::json toJson() const;
    static CalendarStatus fromJson(const nlohmann::json& json);
};

} // namespace Integration

// /backend/integration/include/integration/SimulatorConnector.h
#pragma once

#include <string>
#include <memory>
#include <thread>
#include <atomic>
#include <mutex>
#include <queue>
#include <condition_variable>
#include "integration/IntegrationTypes.h"

namespace Integration {

class SimulatorConnector {
public:
    SimulatorConnector(const SimulatorConnectionParams& params);
    ~SimulatorConnector();
    
    // Connection management
    bool connect();
    bool disconnect();
    ConnectionStatus getStatus() const;
    std::string getErrorMessage() const;
    
    // Telemetry streaming
    bool startTelemetryStream(const TelemetryStreamParams& params, TelemetryCallback callback);
    bool stopTelemetryStream();
    bool isTelemetryActive() const;
    
    // Simulator control
    bool sendCommand(const std::string& command, const std::string& params = "");
    bool loadScenario(const std::string& scenarioPath);
    bool setAircraftPosition(double latitude, double longitude, double altitude, 
                           double heading, double speed);
    bool injectFailure(const std::string& system, double severity = 1.0);
    bool resetFailures();
    
    // Simulator status
    SimulatorStatus getStatus();
    
    // Settings
    bool setUpdateFrequency(int frequencyHz);
    int getUpdateFrequency() const;

private:
    SimulatorConnectionParams params_;
    ConnectionStatus status_;
    std::string errorMessage_;
    std::atomic<bool> isConnected_;
    std::atomic<bool> isTelemetryActive_;
    std::atomic<int> updateFrequencyHz_;
    std::chrono::system_clock::time_point connectedSince_;
    
    // Telemetry processing
    TelemetryStreamParams streamParams_;
    TelemetryCallback telemetryCallback_;
    std::thread telemetryThread_;
    std::atomic<bool> stopTelemetry_;
    
    // Data buffering
    std::queue<SimulatorTelemetry> telemetryBuffer_;
    std::mutex bufferMutex_;
    std::condition_variable bufferCV_;
    
    // Protocols
    void initializeProtocol();
    bool xplaneConnect();
    bool p3dConnect();
    bool msfsConnect();
    bool genericConnect();
    
    // Telemetry processing
    void telemetryWorker();
    void processTelemetry();
    SimulatorTelemetry parseTelemetryData(const std::string& data);
};

} // namespace Integration

// /backend/integration/include/integration/BiometricConnector.h
#pragma once

#include <string>
#include <memory>
#include <thread>
#include <atomic>
#include <mutex>
#include <queue>
#include <condition_variable>
#include "integration/IntegrationTypes.h"

namespace Integration {

class BiometricConnector {
public:
    BiometricConnector(const BiometricDeviceParams& params);
    ~BiometricConnector();
    
    // Connection management
    bool connect();
    bool disconnect();
    ConnectionStatus getStatus() const;
    std::string getErrorMessage() const;
    
    // Data streaming
    bool startDataStream(BiometricDataCallback callback);
    bool stopDataStream();
    bool isStreamActive() const;
    
    // Device control
    bool calibrate();
    bool resetDevice();
    bool setDataRate(int samplesPerSecond);
    
    // Device status
    BiometricDeviceStatus getStatus();
    int getBatteryLevel() const;
    
    // Device settings
    bool setSetting(const std::string& setting, const std::string& value);
    std::string getSetting(const std::string& setting) const;

private:
    BiometricDeviceParams params_;
    ConnectionStatus status_;
    std::string errorMessage_;
    std::atomic<bool> isConnected_;
    std::atomic<bool> isStreamActive_;
    std::chrono::system_clock::time_point connectedSince_;
    std::atomic<int> batteryLevel_;
    
    // Data processing
    BiometricDataCallback dataCallback_;
    std::thread dataThread_;
    std::atomic<bool> stopDataStream_;
    
    // Data buffering
    std::queue<BiometricData> dataBuffer_;
    std::mutex bufferMutex_;
    std::condition_variable bufferCV_;
    
    // Protocol handlers
    void initializeProtocols();
    bool eyeTrackerConnect();
    bool heartRateMonitorConnect();
    bool gsrConnect();
    bool genericConnect();
    
    // Data processing
    void dataWorker();
    void processRawData();
    BiometricData parseRawData(const std::string& data);
};

} // namespace Integration

// /backend/integration/include/integration/EnterpriseConnector.h
#pragma once

#include <string>
#include <memory>
#include <thread>
#include <atomic>
#include <mutex>
#include <vector>
#include <unordered_map>
#include <chrono>
#include "integration/IntegrationTypes.h"

namespace Integration {

class EnterpriseConnector {
public:
    EnterpriseConnector(const EnterpriseSystemParams& params);
    ~EnterpriseConnector();
    
    // Connection management
    bool connect();
    bool disconnect();
    ConnectionStatus getStatus() const;
    std::string getErrorMessage() const;
    
    // Data synchronization
    std::vector<TraineeProfile> syncTraineeProfiles();
    std::vector<CourseRegistration> syncCourseRegistrations();
    bool pushTrainingResults(const std::vector<TrainingResult>& results);
    
    // Automatic sync
    bool startAutoSync(int intervalMinutes);
    bool stopAutoSync();
    bool isAutoSyncActive() const;
    
    // Status and settings
    EnterpriseSystemStatus getStatus();
    bool setSyncInterval(int intervalMinutes);
    int getSyncInterval() const;
    std::chrono::system_clock::time_point getLastSyncTime() const;

private:
    EnterpriseSystemParams params_;
    ConnectionStatus status_;
    std::string errorMessage_;
    std::atomic<bool> isConnected_;
    std::atomic<bool> isAutoSyncActive_;
    std::atomic<int> syncIntervalMinutes_;
    std::chrono::system_clock::time_point connectedSince_;
    std::chrono::system_clock::time_point lastSyncTime_;
    std::atomic<int> recordsProcessed_;
    
    // Sync thread
    std::thread syncThread_;
    std::atomic<bool> stopSync_;
    std::mutex syncMutex_;
    
    // API clients for different ERP systems
    void initializeApiClient();
    bool sapConnect();
    bool workdayConnect();
    bool customErpConnect();
    
    // Sync workers
    void autoSyncWorker();
    std::vector<TraineeProfile> fetchTraineeProfiles();
    std::vector<CourseRegistration> fetchCourseRegistrations();
    bool sendTrainingResults(const std::vector<TrainingResult>& results);
    
    // Utility methods
    std::string buildApiUrl(const std::string& endpoint);
    std::string executeApiRequest(const std::string& url, const std::string& method, 
                                const std::string& data = "");
};

} // namespace Integration

// /backend/integration/include/integration/CalendarConnector.h
#pragma once

#include <string>
#include <memory>
#include <thread>
#include <atomic>
#include <mutex>
#include <vector>
#include <chrono>
#include "integration/IntegrationTypes.h"

namespace Integration {

class CalendarConnector {
public:
    CalendarConnector(const CalendarConnectionParams& params);
    ~CalendarConnector();
    
    // Connection management
    bool connect();
    bool disconnect();
    ConnectionStatus getStatus() const;
    std::string getErrorMessage() const;
    
    // Calendar operations
    std::vector<CalendarEvent> getEvents(const TimeRange& range);
    bool createEvent(const CalendarEvent& event);
    bool updateEvent(const CalendarEvent& event);
    bool deleteEvent(const std::string& eventId);
    
    // Automatic sync
    bool startAutoSync(int intervalMinutes);
    bool stopAutoSync();
    bool isAutoSyncActive() const;
    
    // Status and settings
    CalendarStatus getStatus();
    bool setSyncInterval(int intervalMinutes);
    int getSyncInterval() const;
    std::chrono::system_clock::time_point getLastSyncTime() const;
    int getTotalEvents() const;

private:
    CalendarConnectionParams params_;
    ConnectionStatus status_;
    std::string errorMessage_;
    std::atomic<bool> isConnected_;
    std::atomic<bool> isAutoSyncActive_;
    std::atomic<int> syncIntervalMinutes_;
    std::chrono::system_clock::time_point connectedSince_;
    std::chrono::system_clock::time_point lastSyncTime_;
    std::atomic<int> totalEvents_;
    
    // Sync thread
    std::thread syncThread_;
    std::atomic<bool> stopSync_;
    std::mutex syncMutex_;
    
    // Calendar API implementations
    void initializeApiClient();
    bool googleCalendarConnect();
    bool outlookCalendarConnect();
    bool icalendarConnect();
    
    // Sync workers
    void autoSyncWorker();
    std::vector<CalendarEvent> fetchEvents(const TimeRange& range);
    
    // API utility methods
    std::string buildApiUrl(const std::string& endpoint);
    std::string executeApiRequest(const std::string& url, const std::string& method, 
                                const std::string& data = "");
    CalendarEvent parseEventData(const std::string& data);
};

} // namespace Integration

// /backend/integration/src/IntegrationService.cpp
#include "integration/IntegrationService.h"
#include <spdlog/spdlog.h>
#include <uuid/uuid.h>

namespace Integration {

IntegrationService::IntegrationService(
    std::shared_ptr<Core::ConfigurationManager> config,
    std::shared_ptr<Database::DatabaseManager> dbManager
) : config_(config), dbManager_(dbManager) {
    // Load existing connections from database
    loadConnectionsFromDb();
    
    spdlog::info("Integration service initialized");
}

IntegrationService::~IntegrationService() {
    // Disconnect all connectors
    {
        std::lock_guard<std::mutex> lock(connectorsMutex_);
        
        for (auto& [id, connector] : simulatorConnectors_) {
            connector->disconnect();
        }
        simulatorConnectors_.clear();
        
        for (auto& [id, connector] : biometricConnectors_) {
            connector->disconnect();
        }
        biometricConnectors_.clear();
        
        for (auto& [id, connector] : enterpriseConnectors_) {
            connector->disconnect();
        }
        enterpriseConnectors_.clear();
        
        for (auto& [id, connector] : calendarConnectors_) {
            connector->disconnect();
        }
        calendarConnectors_.clear();
    }
    
    spdlog::info("Integration service shutdown");
}

bool IntegrationService::connectToSimulator(const SimulatorConnectionParams& params) {
    // Generate a connection ID
    std::string connectionId = generateConnectionId("SIM", params.name);
    
    // Create connector
    auto connector = std::make_shared<SimulatorConnector>(params);
    
    // Attempt connection
    bool connected = connector->connect();
    
    if (connected) {
        // Store connector
        std::lock_guard<std::mutex> lock(connectorsMutex_);
        simulatorConnectors_[connectionId] = connector;
        
        // Save connection to database
        Connection connection{
            .id = connectionId,
            .name = params.name,
            .type = ConnectionType::SIMULATOR,
            .status = ConnectionStatus::CONNECTED,
            .errorMessage = "",
            .lastConnected = std::chrono::system_clock::now(),
            .createdAt = std::chrono::system_clock::now(),
            .connectionParams = params.toJson()
        };
        
        saveConnectionToDb(connection);
        
        spdlog::info("Connected to simulator: {}", params.name);
    } else {
        spdlog::error("Failed to connect to simulator: {} - {}", 
                    params.name, connector->getErrorMessage());
    }
    
    return connected;
}

bool IntegrationService::disconnectFromSimulator(const std::string& simulatorId) {
    std::lock_guard<std::mutex> lock(connectorsMutex_);
    
    auto it = simulatorConnectors_.find(simulatorId);
    if (it == simulatorConnectors_.end()) {
        spdlog::error("Simulator not found: {}", simulatorId);
        return false;
    }
    
    // Disconnect
    bool success = it->second->disconnect();
    
    if (success) {
        // Update connection in database
        auto query = "UPDATE connections SET status = $1 WHERE id = $2";
        dbManager_->executeQuery(query, 
                               static_cast<int>(ConnectionStatus::DISCONNECTED), 
                               simulatorId);
        
        // Remove from map
        simulatorConnectors_.erase(it);
        
        spdlog::info("Disconnected from simulator: {}", simulatorId);
    }
    
    return success;
}

bool IntegrationService::startTelemetryStream(
    const std::string& simulatorId, 
    const TelemetryStreamParams& params,
    TelemetryCallback callback
) {
    std::lock_guard<std::mutex> lock(connectorsMutex_);
    
    auto it = simulatorConnectors_.find(simulatorId);
    if (it == simulatorConnectors_.end()) {
        spdlog::error("Simulator not found: {}", simulatorId);
        return false;
    }
    
    bool success = it->second->startTelemetryStream(params, callback);
    
    if (success) {
        spdlog::info("Started telemetry stream for simulator: {}", simulatorId);
    } else {
        spdlog::error("Failed to start telemetry stream for simulator: {}", simulatorId);
    }
    
    return success;
}

bool IntegrationService::stopTelemetryStream(const std::string& simulatorId) {
    std::lock_guard<std::mutex> lock(connectorsMutex_);
    
    auto it = simulatorConnectors_.find(simulatorId);
    if (it == simulatorConnectors_.end()) {
        spdlog::error("Simulator not found: {}", simulatorId);
        return false;
    }
    
    bool success = it->second->stopTelemetryStream();
    
    if (success) {
        spdlog::info("Stopped telemetry stream for simulator: {}", simulatorId);
    } else {
        spdlog::error("Failed to stop telemetry stream for simulator: {}", simulatorId);
    }
    
    return success;
}

SimulatorStatus IntegrationService::getSimulatorStatus(const std::string& simulatorId) {
    std::lock_guard<std::mutex> lock(connectorsMutex_);
    
    auto it = simulatorConnectors_.find(simulatorId);
    if (it == simulatorConnectors_.end()) {
        spdlog::error("Simulator not found: {}", simulatorId);
        return SimulatorStatus{
            .simulatorId = simulatorId,
            .connectionStatus = ConnectionStatus::DISCONNECTED
        };
    }
    
    return it->second->getStatus();
}

std::vector<std::string> IntegrationService::getConnectedSimulators() {
    std::lock_guard<std::mutex> lock(connectorsMutex_);
    
    std::vector<std::string> simulatorIds;
    for (const auto& [id, _] : simulatorConnectors_) {
        simulatorIds.push_back(id);
    }
    
    return simulatorIds;
}

// ... Similar implementations for other connector types ...

std::vector<Connection> IntegrationService::getAllConnections() {
    std::vector<Connection> connections;
    
    auto query = "SELECT id, name, type, status, error_message, last_connected, created_at, connection_params "
                "FROM connections";
    
    auto result = dbManager_->executeQuery(query);
    
    for (const auto& row : result) {
        Connection connection;
        connection.id = row[0].as<std::string>();
        connection.name = row[1].as<std::string>();
        connection.type = static_cast<ConnectionType>(row[2].as<int>());
        connection.status = static_cast<ConnectionStatus>(row[3].as<int>());
        connection.errorMessage = row[4].as<std::string>();
        connection.lastConnected = std::chrono::system_clock::time_point(
            std::chrono::milliseconds(row[5].as<int64_t>())
        );
        connection.createdAt = std::chrono::system_clock::time_point(
            std::chrono::milliseconds(row[6].as<int64_t>())
        );
        
        try {
            connection.connectionParams = nlohmann::json::parse(row[7].as<std::string>());
        } catch (const std::exception& e) {
            spdlog::error("Error parsing connection params: {}", e.what());
            connection.connectionParams = nlohmann::json({});
        }
        
        connections.push_back(connection);
    }
    
    return connections;
}

Connection IntegrationService::getConnection(const std::string& connectionId) {
    auto query = "SELECT id, name, type, status, error_message, last_connected, created_at, connection_params "
                "FROM connections WHERE id = $1";
    
    auto result = dbManager_->executeQuery(query, connectionId);
    
    if (result.empty()) {
        spdlog::error("Connection not found: {}", connectionId);
        return Connection{};
    }
    
    Connection connection;
    const auto& row = result[0];
    
    connection.id = row[0].as<std::string>();
    connection.name = row[1].as<std::string>();
    connection.type = static_cast<ConnectionType>(row[2].as<int>());
    connection.status = static_cast<ConnectionStatus>(row[3].as<int>());
    connection.errorMessage = row[4].as<std::string>();
    connection.lastConnected = std::chrono::system_clock::time_point(
        std::chrono::milliseconds(row[5].as<int64_t>())
    );
    connection.createdAt = std::chrono::system_clock::time_point(
        std::chrono::milliseconds(row[6].as<int64_t>())
    );
    
    try {
        connection.connectionParams = nlohmann::json::parse(row[7].as<std::string>());
    } catch (const std::exception& e) {
        spdlog::error("Error parsing connection params: {}", e.what());
        connection.connectionParams = nlohmann::json({});
    }
    
    return connection;
}

bool IntegrationService::updateConnection(const Connection& connection) {
    auto query = "UPDATE connections SET name = $1, status = $2, error_message = $3, "
                "last_connected = $4, connection_params = $5 WHERE id = $6";
    
    return dbManager_->executeQuery(query, 
                                  connection.name, 
                                  static_cast<int>(connection.status), 
                                  connection.errorMessage, 
                                  connection.lastConnected.time_since_epoch().count(), 
                                  connection.connectionParams.dump(), 
                                  connection.id);
}

bool IntegrationService::deleteConnection(const std::string& connectionId) {
    // First disconnect if connected
    ConnectionType type = ConnectionType::SIMULATOR;  // Default value
    
    {
        std::lock_guard<std::mutex> lock(connectorsMutex_);
        
        // Check which type of connector it is
        if (simulatorConnectors_.find(connectionId) != simulatorConnectors_.end()) {
            simulatorConnectors_[connectionId]->disconnect();
            simulatorConnectors_.erase(connectionId);
            type = ConnectionType::SIMULATOR;
        } else if (biometricConnectors_.find(connectionId) != biometricConnectors_.end()) {
            biometricConnectors_[connectionId]->disconnect();
            biometricConnectors_.erase(connectionId);
            type = ConnectionType::BIOMETRIC_DEVICE;
        } else if (enterpriseConnectors_.find(connectionId) != enterpriseConnectors_.end()) {
            enterpriseConnectors_[connectionId]->disconnect();
            enterpriseConnectors_.erase(connectionId);
            type = ConnectionType::ENTERPRISE_SYSTEM;
        } else if (calendarConnectors_.find(connectionId) != calendarConnectors_.end()) {
            calendarConnectors_[connectionId]->disconnect();
            calendarConnectors_.erase(connectionId);
            type = ConnectionType::CALENDAR;
        }
    }
    
    // Remove from database
    auto query = "DELETE FROM connections WHERE id = $1";
    bool success = dbManager_->executeQuery(query, connectionId);
    
    if (success) {
        spdlog::info("Deleted connection: {}", connectionId);
    } else {
        spdlog::error("Failed to delete connection: {}", connectionId);
    }
    
    return success;
}

bool IntegrationService::checkAllConnections() {
    std::lock_guard<std::mutex> lock(connectorsMutex_);
    
    bool allHealthy = true;
    
    // Check simulators
    for (const auto& [id, connector] : simulatorConnectors_) {
        if (connector->getStatus() != ConnectionStatus::CONNECTED) {
            allHealthy = false;
            spdlog::warn("Simulator connection unhealthy: {}", id);
        }
    }
    
    // Check biometric devices
    for (const auto& [id, connector] : biometricConnectors_) {
        if (connector->getStatus() != ConnectionStatus::CONNECTED) {
            allHealthy = false;
            spdlog::warn("Biometric device connection unhealthy: {}", id);
        }
    }
    
    // Check enterprise systems
    for (const auto& [id, connector] : enterpriseConnectors_) {
        if (connector->getStatus() != ConnectionStatus::CONNECTED) {
            allHealthy = false;
            spdlog::warn("Enterprise system connection unhealthy: {}", id);
        }
    }
    
    // Check calendars
    for (const auto& [id, connector] : calendarConnectors_) {
        if (connector->getStatus() != ConnectionStatus::CONNECTED) {
            allHealthy = false;
            spdlog::warn("Calendar connection unhealthy: {}", id);
        }
    }
    
    return allHealthy;
}

ConnectionHealth IntegrationService::getConnectionHealth(const std::string& connectionId) {
    ConnectionHealth health{
        .connectionId = connectionId,
        .isHealthy = false,
        .latencyMs = -1,
        .statusMessage = "Connection not found",
        .checkedAt = std::chrono::system_clock::now()
    };
    
    std::lock_guard<std::mutex> lock(connectorsMutex_);
    
    // Check which type of connector it is and get health
    if (simulatorConnectors_.find(connectionId) != simulatorConnectors_.end()) {
        auto status = simulatorConnectors_[connectionId]->getStatus();
        health.isHealthy = (status.connectionStatus == ConnectionStatus::CONNECTED);
        health.statusMessage = health.isHealthy ? "Connected" : "Disconnected";
        health.latencyMs = 0;  // Would need to implement actual latency measurement
    } else if (biometricConnectors_.find(connectionId) != biometricConnectors_.end()) {
        auto status = biometricConnectors_[connectionId]->getStatus();
        health.isHealthy = (status.connectionStatus == ConnectionStatus::CONNECTED);
        health.statusMessage = health.isHealthy ? "Connected" : "Disconnected";
        health.latencyMs = 0;
    } else if (enterpriseConnectors_.find(connectionId) != enterpriseConnectors_.end()) {
        auto status = enterpriseConnectors_[connectionId]->getStatus();
        health.isHealthy = (status.connectionStatus == ConnectionStatus::CONNECTED);
        health.statusMessage = health.isHealthy ? "Connected" : "Disconnected";
        health.latencyMs = 0;
    } else if (calendarConnectors_.find(connectionId) != calendarConnectors_.end()) {
        auto status = calendarConnectors_[connectionId]->getStatus();
        health.isHealthy = (status.connectionStatus == ConnectionStatus::CONNECTED);
        health.statusMessage = health.isHealthy ? "Connected" : "Disconnected";
        health.latencyMs = 0;
    }
    
    return health;
}

std::vector<ConnectionHealth> IntegrationService::getAllConnectionsHealth() {
    std::vector<ConnectionHealth> healthResults;
    
    auto connections = getAllConnections();
    for (const auto& connection : connections) {
        healthResults.push_back(getConnectionHealth(connection.id));
    }
    
    return healthResults;
}

std::string IntegrationService::generateConnectionId(const std::string& type, const std::string& name) {
    // Generate a unique ID with a prefix
    uuid_t uuid;
    uuid_generate(uuid);
    char uuid_str[37];
    uuid_unparse_lower(uuid, uuid_str);
    
    return type + "-" + uuid_str;
}

bool IntegrationService::saveConnectionToDb(const Connection& connection) {
    auto query = "INSERT INTO connections (id, name, type, status, error_message, last_connected, created_at, connection_params) "
                "VALUES ($1, $2, $3, $4, $5, $6, $7, $8) "
                "ON CONFLICT (id) DO UPDATE SET name = $2, status = $4, error_message = $5, "
                "last_connected = $6, connection_params = $8";
    
    return dbManager_->executeQuery(query, 
                                  connection.id, 
                                  connection.name, 
                                  static_cast<int>(connection.type), 
                                  static_cast<int>(connection.status), 
                                  connection.errorMessage, 
                                  connection.lastConnected.time_since_epoch().count(), 
                                  connection.createdAt.time_since_epoch().count(), 
                                  connection.connectionParams.dump());
}

bool IntegrationService::loadConnectionsFromDb() {
    auto query = "SELECT id, name, type, status, error_message, last_connected, created_at, connection_params "
                "FROM connections WHERE status = $1";
    
    auto result = dbManager_->executeQuery(query, static_cast<int>(ConnectionStatus::CONNECTED));
    
    for (const auto& row : result) {
        std::string id = row[0].as<std::string>();
        std::string name = row[1].as<std::string>();
        ConnectionType type = static_cast<ConnectionType>(row[2].as<int>());
        std::string params_json = row[7].as<std::string>();
        
        try {
            // Reconnect based on connection type
            nlohmann::json params = nlohmann::json::parse(params_json);
            
            switch (type) {
                case ConnectionType::SIMULATOR: {
                    auto simParams = SimulatorConnectionParams::fromJson(params);
                    auto connector = std::make_shared<SimulatorConnector>(simParams);
                    if (connector->connect()) {
                        std::lock_guard<std::mutex> lock(connectorsMutex_);
                        simulatorConnectors_[id] = connector;
                        spdlog::info("Reconnected to simulator: {}", name);
                    }
                    break;
                }
                case ConnectionType::BIOMETRIC_DEVICE: {
                    auto bioParams = BiometricDeviceParams::fromJson(params);
                    auto connector = std::make_shared<BiometricConnector>(bioParams);
                    if (connector->connect()) {
                        std::lock_guard<std::mutex> lock(connectorsMutex_);
                        biometricConnectors_[id] = connector;
                        spdlog::info("Reconnected to biometric device: {}", name);
                    }
                    break;
                }
                case ConnectionType::ENTERPRISE_SYSTEM: {
                    auto erpParams = EnterpriseSystemParams::fromJson(params);
                    auto connector = std::make_shared<EnterpriseConnector>(erpParams);
                    if (connector->connect()) {
                        std::lock_guard<std::mutex> lock(connectorsMutex_);
                        enterpriseConnectors_[id] = connector;
                        spdlog::info("Reconnected to enterprise system: {}", name);
                    }
                    break;
                }
                case ConnectionType::CALENDAR: {
                    auto calParams = CalendarConnectionParams::fromJson(params);
                    auto connector = std::make_shared<CalendarConnector>(calParams);
                    if (connector->connect()) {
                        std::lock_guard<std::mutex> lock(connectorsMutex_);
                        calendarConnectors_[id] = connector;
                        spdlog::info("Reconnected to calendar: {}", name);
                    }
                    break;
                }
            }
        } catch (const std::exception& e) {
            spdlog::error("Error reconnecting to {}: {}", name, e.what());
        }
    }
    
    return true;
}

} // namespace Integration

// /backend/integration/src/SimulatorConnector.cpp
#include "integration/SimulatorConnector.h"
#include <spdlog/spdlog.h>
#include <random>  // For mock implementation

namespace Integration {

SimulatorConnector::SimulatorConnector(const SimulatorConnectionParams& params)
    : params_(params),
      status_(ConnectionStatus::DISCONNECTED),
      isConnected_(false),
      isTelemetryActive_(false),
      updateFrequencyHz_(params.updateFrequencyHz),
      stopTelemetry_(false) {
    
    spdlog::debug("Created simulator connector for {}", params.name);
}

SimulatorConnector::~SimulatorConnector() {
    // Ensure telemetry is stopped
    if (isTelemetryActive_) {
        stopTelemetryStream();
    }
    
    // Ensure disconnected
    if (isConnected_) {
        disconnect();
    }
    
    spdlog::debug("Destroyed simulator connector for {}", params_.name);
}

bool SimulatorConnector::connect() {
    if (isConnected_) {
        spdlog::warn("Already connected to simulator {}", params_.name);
        return true;
    }
    
    spdlog::info("Connecting to simulator {} at {}:{}...", 
               params_.name, params_.host, params_.port);
    
    // Initialize appropriate protocol handler
    initializeProtocol();
    
    // Connect based on simulator type
    bool connected = false;
    
    if (params_.simulatorType == "X-Plane") {
        connected = xplaneConnect();
    } else if (params_.simulatorType == "P3D") {
        connected = p3dConnect();
    } else if (params_.simulatorType == "MSFS") {
        connected = msfsConnect();
    } else {
        connected = genericConnect();
    }
    
    if (connected) {
        isConnected_ = true;
        status_ = ConnectionStatus::CONNECTED;
        connectedSince_ = std::chrono::system_clock::now();
        spdlog::info("Connected to simulator {}", params_.name);
    } else {
        status_ = ConnectionStatus::ERROR;
        spdlog::error("Failed to connect to simulator {}: {}", params_.name, errorMessage_);
    }
    
    return connected;
}

bool SimulatorConnector::disconnect() {
    if (!isConnected_) {
        spdlog::warn("Not connected to simulator {}", params_.name);
        return true;
    }
    
    // Stop telemetry if active
    if (isTelemetryActive_) {
        stopTelemetryStream();
    }
    
    // Disconnect logic depends on simulator type
    // For now, just set the flags
    isConnected_ = false;
    status_ = ConnectionStatus::DISCONNECTED;
    
    spdlog::info("Disconnected from simulator {}", params_.name);
    return true;
}

ConnectionStatus SimulatorConnector::getStatus() const {
    return status_;
}

std::string SimulatorConnector::getErrorMessage() const {
    return errorMessage_;
}

bool SimulatorConnector::startTelemetryStream(
    const TelemetryStreamParams& params, 
    TelemetryCallback callback
) {
    if (!isConnected_) {
        errorMessage_ = "Not connected to simulator";
        spdlog::error("Cannot start telemetry: {}", errorMessage_);
        return false;
    }
    
    if (isTelemetryActive_) {
        spdlog::warn("Telemetry already active for simulator {}", params_.name);
        return true;
    }
    
    // Store parameters
    streamParams_ = params;
    telemetryCallback_ = callback;
    
    // Start telemetry thread
    stopTelemetry_ = false;
    telemetryThread_ = std::thread(&SimulatorConnector::telemetryWorker, this);
    
    isTelemetryActive_ = true;
    spdlog::info("Started telemetry stream for simulator {} at {} Hz", 
               params_.name, params.samplingRateHz);
    
    return true;
}

bool SimulatorConnector::stopTelemetryStream() {
    if (!isTelemetryActive_) {
        spdlog::warn("Telemetry not active for simulator {}", params_.name);
        return true;
    }
    
    // Stop telemetry thread
    stopTelemetry_ = true;
    
    // Wait for thread to finish
    if (telemetryThread_.joinable()) {
        telemetryThread_.join();
    }
    
    isTelemetryActive_ = false;
    spdlog::info("Stopped telemetry stream for simulator {}", params_.name);
    
    return true;
}

bool SimulatorConnector::isTelemetryActive() const {
    return isTelemetryActive_;
}

SimulatorStatus SimulatorConnector::getStatus() {
    SimulatorStatus status;
    status.simulatorId = params_.name;
    status.simulatorType = params_.simulatorType;
    status.connectionStatus = status_;
    status.isTelemetryActive = isTelemetryActive_;
    status.currentUpdateFrequencyHz = updateFrequencyHz_;
    status.connectedSince = connectedSince_;
    
    // These would need to be retrieved from the simulator in a real implementation
    status.aircraftType = "C172";
    status.aircraftPosition = "KSFO";
    
    return status;
}

bool SimulatorConnector::setUpdateFrequency(int frequencyHz) {
    if (frequencyHz <= 0 || frequencyHz > 1000) {
        errorMessage_ = "Invalid update frequency";
        spdlog::error("{}: {}", errorMessage_, frequencyHz);
        return false;
    }
    
    updateFrequencyHz_ = frequencyHz;
    spdlog::info("Set update frequency for simulator {} to {} Hz", params_.name, frequencyHz);
    
    return true;
}

int SimulatorConnector::getUpdateFrequency() const {
    return updateFrequencyHz_;
}

void SimulatorConnector::initializeProtocol() {
    // This would initialize the appropriate protocol handler
    spdlog::debug("Initializing protocol for simulator type: {}", params_.simulatorType);
}

bool SimulatorConnector::xplaneConnect() {
    // X-Plane specific connection logic
    // This is a mock implementation
    spdlog::debug("Connecting to X-Plane at {}:{}", params_.host, params_.port);
    
    // Simulate success (would be real connection code in production)
    return true;
}

bool SimulatorConnector::p3dConnect() {
    // P3D specific connection logic
    // This is a mock implementation
    spdlog::debug("Connecting to P3D at {}:{}", params_.host, params_.port);
    
    // Simulate success (would be real connection code in production)
    return true;
}

bool SimulatorConnector::msfsConnect() {
    // MSFS specific connection logic
    // This is a mock implementation
    spdlog::debug("Connecting to MSFS at {}:{}", params_.host, params_.port);
    
    // Simulate success (would be real connection code in production)
    return true;
}

bool SimulatorConnector::genericConnect() {
    // Generic simulator connection logic
    // This is a mock implementation
    spdlog::debug("Connecting to generic simulator at {}:{}", params_.host, params_.port);
    
    // Simulate success (would be real connection code in production)
    return true;
}

void SimulatorConnector::telemetryWorker() {
    spdlog::debug("Telemetry worker started for simulator {}", params_.name);
    
    // Calculate sleep time based on sampling rate
    auto sleepTime = std::chrono::microseconds(1000000 / streamParams_.samplingRateHz);
    
    while (!stopTelemetry_) {
        // Process telemetry data
        processTelemetry();
        
        // Sleep for the calculated time
        std::this_thread::sleep_for(sleepTime);
    }
    
    spdlog::debug("Telemetry worker stopped for simulator {}", params_.name);
}

void SimulatorConnector::processTelemetry() {
    // In a real implementation, this would fetch data from the simulator
    // For this example, we generate mock data
    
    // Generate timestamp
    double timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()
    ).count() / 1000.0;
    
    // Create telemetry data
    SimulatorTelemetry telemetry;
    telemetry.timestamp = timestamp;
    
    // Generate mock parameter values
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_real_distribution<> altDist(5000.0, 5100.0);  // altitude in feet
    std::uniform_real_distribution<> spdDist(120.0, 125.0);    // airspeed in knots
    std::uniform_real_distribution<> hdgDist(0.0, 360.0);      // heading in degrees
    std::uniform_real_distribution<> vspDist(-100.0, 100.0);   // vertical speed in ft/min
    
    // Set parameters based on requested parameters
    for (const auto& param : streamParams_.parameters) {
        if (param == "altitude") {
            telemetry.parameters["altitude"] = altDist(gen);
        } else if (param == "airspeed") {
            telemetry.parameters["airspeed"] = spdDist(gen);
        } else if (param == "heading") {
            telemetry.parameters["heading"] = hdgDist(gen);
        } else if (param == "vertical_speed") {
            telemetry.parameters["vertical_speed"] = vspDist(gen);
        } else {
            // Default to a random value between 0 and 100
            std::uniform_real_distribution<> defaultDist(0.0, 100.0);
            telemetry.parameters[param] = defaultDist(gen);
        }
    }
    
    // Call the callback with the telemetry data
    if (telemetryCallback_) {
        telemetryCallback_(telemetry);
    }
}

SimulatorTelemetry SimulatorConnector::parseTelemetryData(const std::string& data) {
    // Parse the raw data from the simulator
    // This is a mock implementation
    SimulatorTelemetry telemetry;
    telemetry.timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::system_clock::now().time_since_epoch()
    ).count() / 1000.0;
    
    // In a real implementation, would parse the data format
    
    return telemetry;
}

} // namespace Integration

// /backend/integration/python/biometric_data_processor.py
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Any, Tuple
import json
import time
import threading
from collections import deque
import logging

logger = logging.getLogger(__name__)

class BiometricDataProcessor:
    """Processes and analyzes biometric data from various devices.
    
    This class provides functionality to:
    1. Process raw biometric data streams
    2. Detect patterns and anomalies
    3. Calculate derived metrics
    4. Correlate biometric data with simulator events
    """
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize the biometric data processor.
        
        Args:
            config: Configuration parameters for the processor
        """
        self.config = config
        self.buffer_size = config.get('buffer_size', 1000)
        self.sampling_rate = config.get('sampling_rate', 50)  # Hz
        
        # Data buffers for different sensor types
        self.eye_tracking_buffer = deque(maxlen=self.buffer_size)
        self.heart_rate_buffer = deque(maxlen=self.buffer_size)
        self.gsr_buffer = deque(maxlen=self.buffer_size)
        
        # Processed metrics
        self.metrics = {
            'eye_tracking': {},
            'heart_rate': {},
            'gsr': {},
            'combined': {}
        }
        
        # Processing thread
        self.processing_thread = None
        self.stop_processing = threading.Event()
        
        logger.info("Biometric data processor initialized")
    
    def start_processing(self) -> bool:
        """Start the background processing thread."""
        if self.processing_thread and self.processing_thread.is_alive():
            logger.warning("Processing thread already running")
            return False
        
        self.stop_processing.clear()
        self.processing_thread = threading.Thread(target=self._processing_loop)
        self.processing_thread.daemon = True
        self.processing_thread.start()
        
        logger.info("Biometric data processing started")
        return True
    
    def stop_processing(self) -> bool:
        """Stop the background processing thread."""
        if not (self.processing_thread and self.processing_thread.is_alive()):
            logger.warning("Processing thread not running")
            return False
        
        self.stop_processing.set()
        self.processing_thread.join(timeout=2.0)
        
        if self.processing_thread.is_alive():
            logger.error("Failed to stop processing thread")
            return False
        
        logger.info("Biometric data processing stopped")
        return True
    
    def add_eye_tracking_data(self, data: Dict[str, Any]) -> None:
        """Add eye tracking data to the buffer.
        
        Args:
            data: Eye tracking data point with timestamp and values
        """
        self.eye_tracking_buffer.append(data)
    
    def add_heart_rate_data(self, data: Dict[str, Any]) -> None:
        """Add heart rate data to the buffer.
        
        Args:
            data: Heart rate data point with timestamp and values
        """
        self.heart_rate_buffer.append(data)
    
    def add_gsr_data(self, data: Dict[str, Any]) -> None:
        """Add galvanic skin response data to the buffer.
        
        Args:
            data: GSR data point with timestamp and values
        """
        self.gsr_buffer.append(data)
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get the current computed metrics."""
        return self.metrics
    
    def get_cognitive_load_estimate(self) -> float:
        """Estimate the current cognitive load based on all biometric data.
        
        Returns:
            Estimated cognitive load on a scale of 0.0 to 1.0
        """
        # This is a simplified model - a real implementation would use more
        # sophisticated algorithms combining multiple biometric signals
        
        metrics = self.metrics['combined']
        if not metrics:
            return 0.0
        
        # Normalized pupil dilation (if available)
        pupil_factor = metrics.get('normalized_pupil_dilation', 0.5)
        
        # Heart rate variability factor (if available)
        hrv_factor = 1.0 - metrics.get('normalized_hrv', 0.5)  # Lower HRV = higher stress
        
        # GSR factor (if available)
        gsr_factor = metrics.get('normalized_gsr', 0.5)
        
        # Combine factors (equal weights for this simple example)
        available_factors = 0
        combined_score = 0.0
        
        if 'normalized_pupil_dilation' in metrics:
            combined_score += pupil_factor
            available_factors += 1
            
        if 'normalized_hrv' in metrics:
            combined_score += hrv_factor
            available_factors += 1
            
        if 'normalized_gsr' in metrics:
            combined_score += gsr_factor
            available_factors += 1
        
        if available_factors == 0:
            return 0.0
            
        return combined_score / available_factors
    
    def detect_attention_shift(self) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """Detect if the trainee's attention shifted away from critical instruments.
        
        Returns:
            Tuple of (detected, details)
        """
        if not self.eye_tracking_buffer:
            return False, None
        
        # Get recent eye tracking data
        recent_data = list(self.eye_tracking_buffer)[-30:]  # Last 30 samples
        
        # Check if gaze points are within defined areas of interest
        # This is a simplified mock implementation
        aoi_violations = 0
        for sample in recent_data:
            if 'gaze_point' in sample:
                gx, gy = sample['gaze_point']
                # Check if gaze is outside defined instrument areas
                # This would use actual screen coordinates in a real implementation
                if gx < 0.2 or gx > 0.8 or gy < 0.2 or gy > 0.8:
                    aoi_violations += 1
        
        # If more than 50% of recent samples are outside AOIs, consider it an attention shift
        if aoi_violations > len(recent_data) * 0.5:
            return True, {
                'violation_count': aoi_violations,
                'total_samples': len(recent_data),
                'violation_percentage': (aoi_violations / len(recent_data)) * 100,
                'timestamp': time.time()
            }
        
        return False, None
    
    def detect_stress_reaction(self) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """Detect if the trainee is experiencing high stress based on biometric data.
        
        Returns:
            Tuple of (detected, details)
        """
        metrics = self.metrics
        
        # Check heart rate (if available)
        hr_elevated = False
        hr_details = {}
        if self.heart_rate_buffer and 'heart_rate' in metrics:
            recent_hr = metrics['heart_rate'].get('mean', 0)
            baseline_hr = metrics['heart_rate'].get('baseline', 70)
            
            # If heart rate is 20% above baseline, consider it elevated
            if recent_hr > baseline_hr * 1.2:
                hr_elevated = True
                hr_details = {
                    'recent_hr': recent_hr,
                    'baseline_hr': baseline_hr,
                    'percent_increase': ((recent_hr - baseline_hr) / baseline_hr) * 100
                }
        
        # Check GSR (if available)
        gsr_elevated = False
        gsr_details = {}
        if self.gsr_buffer and 'gsr' in metrics:
            recent_gsr = metrics['gsr'].get('mean', 0)
            baseline_gsr = metrics['gsr'].get('baseline', 5)
            
            # If GSR is 30% above baseline, consider it elevated
            if recent_gsr > baseline_gsr * 1.3:
                gsr_elevated = True
                gsr_details = {
                    'recent_gsr': recent_gsr,
                    'baseline_gsr': baseline_gsr,
                    'percent_increase': ((recent_gsr - baseline_gsr) / baseline_gsr) * 100
                }
        
        # Consider it a stress reaction if either metric is elevated
        if hr_elevated or gsr_elevated:
            return True, {
                'heart_rate_elevated': hr_elevated,
                'heart_rate_details': hr_details,
                'gsr_elevated': gsr_elevated,
                'gsr_details': gsr_details,
                'timestamp': time.time()
            }
        
        return False, None
    
    def _processing_loop(self) -> None:
        """Background thread for continuous data processing."""
        logger.debug("Processing loop started")
        
        processing_interval = 1.0 / self.config.get('processing_rate', 10)  # Default 10Hz
        
        while not self.stop_processing.is_set():
            start_time = time.time()
            
            # Process eye tracking data
            if self.eye_tracking_buffer:
                self._process_eye_tracking()
            
            # Process heart rate data
            if self.heart_rate_buffer:
                self._process_heart_rate()
            
            # Process GSR data
            if self.gsr_buffer:
                self._process_gsr()
            
            # Compute combined metrics
            self._compute_combined_metrics()
            
            # Sleep to maintain target processing rate
            elapsed = time.time() - start_time
            sleep_time = max(0, processing_interval - elapsed)
            if sleep_time > 0:
                time.sleep(sleep_time)
        
        logger.debug("Processing loop stopped")
    
    def _process_eye_tracking(self) -> None:
        """Process eye tracking data to extract metrics."""
        data = list(self.eye_tracking_buffer)
        
        # Extract pupil diameters
        pupil_diameters = []
        for sample in data:
            if 'pupil_diameter' in sample:
                if isinstance(sample['pupil_diameter'], (list, tuple)) and len(sample['pupil_diameter']) >= 2:
                    # Average left and right eye if available
                    pd_avg = sum(sample['pupil_diameter']) / len(sample['pupil_diameter'])
                    pupil_diameters.append(pd_avg)
                else:
                    # Single value
                    pupil_diameters.append(sample['pupil_diameter'])
        
        if pupil_diameters:
            # Calculate metrics
            pd_mean = np.mean(pupil_diameters)
            pd_std = np.std(pupil_diameters)
            pd_min = np.min(pupil_diameters)
            pd_max = np.max(pupil_diameters)
            
            # Normalized pupil dilation (0-1 scale)
            # This is a simplified approach - proper normalization would use baseline measurements
            pd_range = self.config.get('pupil_diameter_range', (2.0, 8.0))  # mm
            pd_norm = np.clip((pd_mean - pd_range[0]) / (pd_range[1] - pd_range[0]), 0, 1)
            
            # Update metrics
            self.metrics['eye_tracking'] = {
                'mean_pupil_diameter': pd_mean,
                'std_pupil_diameter': pd_std,
                'min_pupil_diameter': pd_min,
                'max_pupil_diameter': pd_max,
                'normalized_pupil_dilation': pd_norm,
                'samples_processed': len(pupil_diameters)
            }
    
    def _process_heart_rate(self) -> None:
        """Process heart rate data to extract metrics."""
        data = list(self.heart_rate_buffer)
        
        # Extract heart rates and timestamps
        heart_rates = []
        timestamps = []
        for sample in data:
            if 'heart_rate' in sample and 'timestamp' in sample:
                heart_rates.append(sample['heart_rate'])
                timestamps.append(sample['timestamp'])
        
        if heart_rates and len(heart_rates) > 1:
            # Calculate metrics
            hr_mean = np.mean(heart_rates)
            hr_std = np.std(heart_rates)
            hr_min = np.min(heart_rates)
            hr_max = np.max(heart_rates)
            
            # Calculate heart rate variability
            # Convert timestamps to RR intervals in ms
            rr_intervals = []
            if len(timestamps) > 1:
                for i in range(1, len(timestamps)):
                    # Convert time difference to milliseconds
                    rr = (timestamps[i] - timestamps[i-1]) * 1000
                    if 300 < rr < 2000:  # Filter physiologically plausible values
                        rr_intervals.append(rr)
            
            hrv = 0
            if rr_intervals:
                # RMSSD (Root Mean Square of Successive Differences)
                rr_diffs = np.diff(rr_intervals)
                hrv = np.sqrt(np.mean(np.square(rr_diffs)))
            
            # Normalize HRV (0-1 scale)
            # This is simplified - proper normalization would use baseline measurements
            hrv_norm = np.clip(hrv / 100.0, 0, 1)  # Arbitrary scaling
            
            # Update metrics
            self.metrics['heart_rate'] = {
                'mean': hr_mean,
                'std': hr_std,
                'min': hr_min,
                'max': hr_max,
                'baseline': self.metrics.get('heart_rate', {}).get('baseline', hr_mean),
                'hrv': hrv,
                'normalized_hrv': hrv_norm,
                'samples_processed': len(heart_rates)
            }
    
    def _process_gsr(self) -> None:
        """Process galvanic skin response data to extract metrics."""
        data = list(self.gsr_buffer)
        
        # Extract GSR values
        gsr_values = []
        for sample in data:
            if 'gsr' in sample:
                gsr_values.append(sample['gsr'])
        
        if gsr_values:
            # Calculate metrics
            gsr_mean = np.mean(gsr_values)
            gsr_std = np.std(gsr_values)
            gsr_min = np.min(gsr_values)
            gsr_max = np.max(gsr_values)
            
            # Normalize GSR (0-1 scale)
            # This is simplified - proper normalization would use baseline measurements
            gsr_range = self.config.get('gsr_range', (0.1, 20.0))  # microSiemens
            gsr_norm = np.clip((gsr_mean - gsr_range[0]) / (gsr_range[1] - gsr_range[0]), 0, 1)
            
            # Update metrics
            self.metrics['gsr'] = {
                'mean': gsr_mean,
                'std': gsr_std,
                'min': gsr_min,
                'max': gsr_max,
                'baseline': self.metrics.get('gsr', {}).get('baseline', gsr_mean),
                'normalized_gsr': gsr_norm,
                'samples_processed': len(gsr_values)
            }
    
    def _compute_combined_metrics(self) -> None:
        """Compute metrics that combine multiple biometric signals."""
        combined = {}
        
        # Copy normalized metrics from individual sources
        if 'eye_tracking' in self.metrics and 'normalized_pupil_dilation' in self.metrics['eye_tracking']:
            combined['normalized_pupil_dilation'] = self.metrics['eye_tracking']['normalized_pupil_dilation']
        
        if 'heart_rate' in self.metrics and 'normalized_hrv' in self.metrics['heart_rate']:
            combined['normalized_hrv'] = self.metrics['heart_rate']['normalized_hrv']
        
        if 'gsr' in self.metrics and 'normalized_gsr' in self.metrics['gsr']:
            combined['normalized_gsr'] = self.metrics['gsr']['normalized_gsr']
        
        # Calculate cognitive load
        if combined:
            combined['cognitive_load'] = self.get_cognitive_load_estimate()
        
        self.metrics['combined'] = combined

# Example usage:
# config = {
#     'buffer_size': 500,
#     'sampling_rate': 50,
#     'processing_rate': 10
# }
# processor = BiometricDataProcessor(config)
# processor.start_processing()
# 
# # Add mock data
# processor.add_heart_rate_data({'timestamp': time.time(), 'heart_rate': 75})
# processor.add_eye_tracking_data({'pupil_diameter': [4.2, 4.3]})
# 
# # Get metrics
# metrics = processor.get_metrics()
# cognitive_load = processor.get_cognitive_load_estimate()
# 
# processor.stop_processing()
