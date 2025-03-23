// src/backend/simulator/SimulatorDataProcessor.cpp
#include "SimulatorDataProcessor.h"
#include <fstream>
#include <iomanip>
#include <sstream>
#include <cassert>
#include <cmath>
#include <algorithm>
#include <filesystem>

namespace PilotTraining {
namespace Simulator {

using namespace std::chrono;

SimulatorDataProcessor::SimulatorDataProcessor(std::shared_ptr<Core::ConfigurationManager> configManager)
    : _configManager(std::move(configManager)) {
    
    Core::Logger::info("SimulatorDataProcessor created");
}

SimulatorDataProcessor::~SimulatorDataProcessor() {
    // Ensure all threads are stopped cleanly
    if (_running.load()) {
        stop();
    }
    
    Core::Logger::info("SimulatorDataProcessor destroyed");
}

Core::Result<void> SimulatorDataProcessor::initialize(const SimulatorProcessorConfig& config) {
    try {
        // Store configuration
        _config = config;
        
        // Create data structures with specified capacities
        _inputQueue = std::make_unique<LockFreeQueue<FlightParameters>>(10000);
        _telemetryBuffer = std::make_unique<LockFreeRingBuffer<FlightParameters>>(config.bufferCapacity);
        _eventQueue = std::make_unique<LockFreeQueue<FlightEvent>>(1000);
        _anomalyQueue = std::make_unique<LockFreeQueue<FlightAnomaly>>(1000);
        
        // Create detection engines
        _eventDetector = std::make_unique<EventDetector>();
        _anomalyDetector = std::make_unique<AnomalyDetector>();
        
        // Initialize statistics
        _statistics.startTime = steady_clock::now();
        
        // Create recordings directory if it doesn't exist
        if (_config.enableDataRecording) {
            std::filesystem::create_directories(_config.recordingDirectory);
        }
        
        updateStatus(ProcessorStatus::STOPPED, "Initialized successfully");
        Core::Logger::info("SimulatorDataProcessor initialized with buffer capacity: {}", config.bufferCapacity);
        
        return Core::Result<void>::success();
    } catch (const std::exception& e) {
        const std::string error = "Failed to initialize SimulatorDataProcessor: " + std::string(e.what());
        Core::Logger::error(error);
        updateStatus(ProcessorStatus::ERROR, error);
        return Core::Result<void>::failure(Core::ErrorCode::InitializationFailed, error);
    }
}

Core::Result<void> SimulatorDataProcessor::start() {
    // Check if already running
    if (_running.load()) {
        return Core::Result<void>::failure(
            Core::ErrorCode::InvalidOperation,
            "SimulatorDataProcessor is already running"
        );
    }
    
    try {
        updateStatus(ProcessorStatus::STARTING, "Starting data processor");
        
        // Reset statistics
        _statistics.samplesReceived = 0;
        _statistics.samplesProcessed = 0;
        _statistics.eventsDetected = 0;
        _statistics.anomaliesDetected = 0;
        _statistics.samplesDropped = 0;
        _statistics.currentSampleRateHz = 0;
        _statistics.currentProcessingLatencyMs = 0;
        _statistics.bufferUtilizationPercent = 0;
        _statistics.lastSampleTimestampUs = 0;
        _statistics.startTime = steady_clock::now();
        
        // Start the threads
        _running.store(true);
        startThreads();
        
        updateStatus(ProcessorStatus::RUNNING, "Data processor running");
        Core::Logger::info("SimulatorDataProcessor started with {} processing threads", _config.processingThreads);
        
        return Core::Result<void>::success();
    } catch (const std::exception& e) {
        const std::string error = "Failed to start SimulatorDataProcessor: " + std::string(e.what());
        Core::Logger::error(error);
        updateStatus(ProcessorStatus::ERROR, error);
        return Core::Result<void>::failure(Core::ErrorCode::OperationFailed, error);
    }
}

Core::Result<void> SimulatorDataProcessor::stop() {
    // Check if already stopped
    if (!_running.load()) {
        return Core::Result<void>::failure(
            Core::ErrorCode::InvalidOperation,
            "SimulatorDataProcessor is not running"
        );
    }
    
    try {
        updateStatus(ProcessorStatus::STOPPING, "Stopping data processor");
        
        // Stop all threads
        _running.store(false);
        stopThreads();
        
        // Clear queues
        FlightParameters params;
        while (_inputQueue->dequeue(params)) {}
        
        FlightEvent event;
        while (_eventQueue->dequeue(event)) {}
        
        FlightAnomaly anomaly;
        while (_anomalyQueue->dequeue(anomaly)) {}
        
        updateStatus(ProcessorStatus::STOPPED, "Data processor stopped");
        Core::Logger::info("SimulatorDataProcessor stopped");
        
        return Core::Result<void>::success();
    } catch (const std::exception& e) {
        const std::string error = "Failed to stop SimulatorDataProcessor: " + std::string(e.what());
        Core::Logger::error(error);
        updateStatus(ProcessorStatus::ERROR, error);
        return Core::Result<void>::failure(Core::ErrorCode::OperationFailed, error);
    }
}

Core::Result<void> SimulatorDataProcessor::pause() {
    // Check if running
    if (_status.load() != ProcessorStatus::RUNNING) {
        return Core::Result<void>::failure(
            Core::ErrorCode::InvalidOperation,
            "SimulatorDataProcessor is not running"
        );
    }
    
    updateStatus(ProcessorStatus::PAUSED, "Data processor paused");
    Core::Logger::info("SimulatorDataProcessor paused");
    
    return Core::Result<void>::success();
}

Core::Result<void> SimulatorDataProcessor::resume() {
    // Check if paused
    if (_status.load() != ProcessorStatus::PAUSED) {
        return Core::Result<void>::failure(
            Core::ErrorCode::InvalidOperation,
            "SimulatorDataProcessor is not paused"
        );
    }
    
    updateStatus(ProcessorStatus::RUNNING, "Data processor resumed");
    Core::Logger::info("SimulatorDataProcessor resumed");
    
    return Core::Result<void>::success();
}

ProcessorStatus SimulatorDataProcessor::getStatus() const {
    return _status.load();
}

ProcessorStatistics SimulatorDataProcessor::getStatistics() const {
    return _statistics;
}

bool SimulatorDataProcessor::processSample(const FlightParameters& parameters) {
    // Check if we're running
    if (_status.load() != ProcessorStatus::RUNNING && _status.load() != ProcessorStatus::PAUSED) {
        _statistics.samplesDropped.fetch_add(1);
        return false;
    }
    
    // Add to input queue
    bool success = _inputQueue->enqueue(parameters);
    
    if (success) {
        _statistics.samplesReceived.fetch_add(1);
        _statistics.lastSampleTimestampUs.store(parameters.timestamp);
    } else {
        _statistics.samplesDropped.fetch_add(1);
    }
    
    return success;
}

Core::Result<void> SimulatorDataProcessor::subscribeTelemetry(TelemetryCallback callback, const std::string& id) {
    if (id.empty()) {
        return Core::Result<void>::failure(
            Core::ErrorCode::InvalidInput,
            "Subscriber ID cannot be empty"
        );
    }
    
    try {
        std::lock_guard<std::mutex> lock(_telemetrySubscribersMutex);
        _telemetrySubscribers[id] = callback;
        Core::Logger::info("Telemetry subscriber added: {}", id);
        return Core::Result<void>::success();
    } catch (const std::exception& e) {
        const std::string error = "Failed to add telemetry subscriber: " + std::string(e.what());
        Core::Logger::error(error);
        return Core::Result<void>::failure(Core::ErrorCode::OperationFailed, error);
    }
}

Core::Result<void> SimulatorDataProcessor::unsubscribeTelemetry(const std::string& id) {
    try {
        std::lock_guard<std::mutex> lock(_telemetrySubscribersMutex);
        size_t removed = _telemetrySubscribers.erase(id);
        if (removed > 0) {
            Core::Logger::info("Telemetry subscriber removed: {}", id);
            return Core::Result<void>::success();
        } else {
            return Core::Result<void>::failure(
                Core::ErrorCode::NotFound,
                "Telemetry subscriber not found: " + id
            );
        }
    } catch (const std::exception& e) {
        const std::string error = "Failed to remove telemetry subscriber: " + std::string(e.what());
        Core::Logger::error(error);
        return Core::Result<void>::failure(Core::ErrorCode::OperationFailed, error);
    }
}

Core::Result<void> SimulatorDataProcessor::subscribeEvents(EventCallback callback, const std::string& id) {
    if (id.empty()) {
        return Core::Result<void>::failure(
            Core::ErrorCode::InvalidInput,
            "Subscriber ID cannot be empty"
        );
    }
    
    try {
        std::lock_guard<std::mutex> lock(_eventSubscribersMutex);
        _eventSubscribers[id] = callback;
        Core::Logger::info("Event subscriber added: {}", id);
        return Core::Result<void>::success();
    } catch (const std::exception& e) {
        const std::string error = "Failed to add event subscriber: " + std::string(e.what());
        Core::Logger::error(error);
        return Core::Result<void>::failure(Core::ErrorCode::OperationFailed, error);
    }
}

Core::Result<void> SimulatorDataProcessor::unsubscribeEvents(const std::string& id) {
    try {
        std::lock_guard<std::mutex> lock(_eventSubscribersMutex);
        size_t removed = _eventSubscribers.erase(id);
        if (removed > 0) {
            Core::Logger::info("Event subscriber removed: {}", id);
            return Core::Result<void>::success();
        } else {
            return Core::Result<void>::failure(
                Core::ErrorCode::NotFound,
                "Event subscriber not found: " + id
            );
        }
    } catch (const std::exception& e) {
        const std::string error = "Failed to remove event subscriber: " + std::string(e.what());
        Core::Logger::error(error);
        return Core::Result<void>::failure(Core::ErrorCode::OperationFailed, error);
    }
}

Core::Result<void> SimulatorDataProcessor::subscribeAnomalies(AnomalyCallback callback, const std::string& id) {
    if (id.empty()) {
        return Core::Result<void>::failure(
            Core::ErrorCode::InvalidInput,
            "Subscriber ID cannot be empty"
        );
    }
    
    try {
        std::lock_guard<std::mutex> lock(_anomalySubscribersMutex);
        _anomalySubscribers[id] = callback;
        Core::Logger::info("Anomaly subscriber added: {}", id);
        return Core::Result<void>::success();
    } catch (const std::exception& e) {
        const std::string error = "Failed to add anomaly subscriber: " + std::string(e.what());
        Core::Logger::error(error);
        return Core::Result<void>::failure(Core::ErrorCode::OperationFailed, error);
    }
}

Core::Result<void> SimulatorDataProcessor::unsubscribeAnomalies(const std::string& id) {
    try {
        std::lock_guard<std::mutex> lock(_anomalySubscribersMutex);
        size_t removed = _anomalySubscribers.erase(id);
        if (removed > 0) {
            Core::Logger::info("Anomaly subscriber removed: {}", id);
            return Core::Result<void>::success();
        } else {
            return Core::Result<void>::failure(
                Core::ErrorCode::NotFound,
                "Anomaly subscriber not found: " + id
            );
        }
    } catch (const std::exception& e) {
        const std::string error = "Failed to remove anomaly subscriber: " + std::string(e.what());
        Core::Logger::error(error);
        return Core::Result<void>::failure(Core::ErrorCode::OperationFailed, error);
    }
}

Core::Result<void> SimulatorDataProcessor::subscribeStatus(StatusCallback callback, const std::string& id) {
    if (id.empty()) {
        return Core::Result<void>::failure(
            Core::ErrorCode::InvalidInput,
            "Subscriber ID cannot be empty"
        );
    }
    
    try {
        std::lock_guard<std::mutex> lock(_statusSubscribersMutex);
        _statusSubscribers[id] = callback;
        
        // Immediately notify the subscriber of the current status
        callback(_status.load(), _statusMessage);
        
        Core::Logger::info("Status subscriber added: {}", id);
        return Core::Result<void>::success();
    } catch (const std::exception& e) {
        const std::string error = "Failed to add status subscriber: " + std::string(e.what());
        Core::Logger::error(error);
        return Core::Result<void>::failure(Core::ErrorCode::OperationFailed, error);
    }
}

Core::Result<void> SimulatorDataProcessor::unsubscribeStatus(const std::string& id) {
    try {
        std::lock_guard<std::mutex> lock(_statusSubscribersMutex);
        size_t removed = _statusSubscribers.erase(id);
        if (removed > 0) {
            Core::Logger::info("Status subscriber removed: {}", id);
            return Core::Result<void>::success();
        } else {
            return Core::Result<void>::failure(
                Core::ErrorCode::NotFound,
                "Status subscriber not found: " + id
            );
        }
    } catch (const std::exception& e) {
        const std::string error = "Failed to remove status subscriber: " + std::string(e.what());
        Core::Logger::error(error);
        return Core::Result<void>::failure(Core::ErrorCode::OperationFailed, error);
    }
}

Core::Result<std::vector<FlightParameters>> SimulatorDataProcessor::getHistoricalData(
    int64_t startTime, int64_t endTime) {
    
    try {
        std::vector<FlightParameters> result;
        std::vector<FlightParameters> allData;
        
        // Get all data from the buffer
        _telemetryBuffer->getAllData(allData);
        
        // Filter by time range
        for (const auto& params : allData) {
            if (params.timestamp >= startTime && params.timestamp <= endTime) {
                result.push_back(params);
            }
        }
        
        return Core::Result<std::vector<FlightParameters>>::success(result);
    } catch (const std::exception& e) {
        const std::string error = "Failed to get historical data: " + std::string(e.what());
        Core::Logger::error(error);
        return Core::Result<std::vector<FlightParameters>>::failure(
            Core::ErrorCode::OperationFailed,
            error
        );
    }
}

Core::Result<std::vector<FlightParameters>> SimulatorDataProcessor::getRecentData(size_t count) {
    try {
        std::vector<FlightParameters> result;
        
        // Get the most recent data from the buffer
        size_t retrieved = _telemetryBuffer->getSnapshot(result, count);
        
        if (retrieved == 0) {
            return Core::Result<std::vector<FlightParameters>>::failure(
                Core::ErrorCode::NotFound,
                "No data available in the buffer"
            );
        }
        
        return Core::Result<std::vector<FlightParameters>>::success(result);
    } catch (const std::exception& e) {
        const std::string error = "Failed to get recent data: " + std::string(e.what());
        Core::Logger::error(error);
        return Core::Result<std::vector<FlightParameters>>::failure(
            Core::ErrorCode::OperationFailed,
            error
        );
    }
}

Core::Result<std::vector<FlightEvent>> SimulatorDataProcessor::getHistoricalEvents(
    int64_t startTime, int64_t endTime) {
    
    // This would typically retrieve events from a database
    // For this implementation, we'll return an empty list
    return Core::Result<std::vector<FlightEvent>>::success({});
}

Core::Result<std::vector<FlightAnomaly>> SimulatorDataProcessor::getHistoricalAnomalies(
    int64_t startTime, int64_t endTime) {
    
    // This would typically retrieve anomalies from a database
    // For this implementation, we'll return an empty list
    return Core::Result<std::vector<FlightAnomaly>>::success({});
}

Core::Result<void> SimulatorDataProcessor::startRecording(const std::string& filename) {
    if (!_config.enableDataRecording) {
        return Core::Result<void>::failure(
            Core::ErrorCode::FeatureDisabled,
            "Data recording is disabled in configuration"
        );
    }
    
    try {
        std::lock_guard<std::mutex> lock(_recordingMutex);
        
        if (_recording.load()) {
            return Core::Result<void>::failure(
                Core::ErrorCode::InvalidOperation,
                "Recording is already in progress"
            );
        }
        
        // Set recording filename
        _recordingFilename = _config.recordingDirectory + "/" + filename;
        if (!_recordingFilename.ends_with(".csv")) {
            _recordingFilename += ".csv";
        }
        
        // Start recording
        _recording.store(true);
        
        Core::Logger::info("Started recording to file: {}", _recordingFilename);
        return Core::Result<void>::success();
    } catch (const std::exception& e) {
        const std::string error = "Failed to start recording: " + std::string(e.what());
        Core::Logger::error(error);
        return Core::Result<void>::failure(Core::ErrorCode::OperationFailed, error);
    }
}

Core::Result<void> SimulatorDataProcessor::stopRecording() {
    try {
        std::lock_guard<std::mutex> lock(_recordingMutex);
        
        if (!_recording.load()) {
            return Core::Result<void>::failure(
                Core::ErrorCode::InvalidOperation,
                "No recording in progress"
            );
        }
        
        // Stop recording
        _recording.store(false);
        
        Core::Logger::info("Stopped recording to file: {}", _recordingFilename);
        return Core::Result<void>::success();
    } catch (const std::exception& e) {
        const std::string error = "Failed to stop recording: " + std::string(e.what());
        Core::Logger::error(error);
        return Core::Result<void>::failure(Core::ErrorCode::OperationFailed, error);
    }
}

Core::Result<size_t> SimulatorDataProcessor::loadRecording(const std::string& filename, bool append) {
    try {
        std::string filepath = filename;
        if (!std::filesystem::exists(filepath)) {
            filepath = _config.recordingDirectory + "/" + filename;
            if (!filepath.ends_with(".csv")) {
                filepath += ".csv";
            }
            
            if (!std::filesystem::exists(filepath)) {
                return Core::Result<size_t>::failure(
                    Core::ErrorCode::FileNotFound,
                    "Recording file not found: " + filepath
                );
            }
        }
        
        // Open the file
        std::ifstream file(filepath);
        if (!file.is_open()) {
            return Core::Result<size_t>::failure(
                Core::ErrorCode::FileOpenFailed,
                "Failed to open recording file: " + filepath
            );
        }
        
        // Skip header line
        std::string line;
        std::getline(file, line);
        
        // Clear existing data if not appending
        if (!append) {
            // Reset buffer
            _telemetryBuffer->reset();
        }
        
        // Read and parse data
        size_t count = 0;
        while (std::getline(file, line)) {
            // Parse CSV line to FlightParameters
            // This is a simplified version - a real implementation would parse all fields
            std::istringstream iss(line);
            std::string token;
            
            FlightParameters params;
            
            // Parse timestamp
            std::getline(iss, token, ',');
            params.timestamp = std::stoll(token);
            
            // Parse session ID
            std::getline(iss, token, ',');
            params.sessionId = token;
            
            // Parse aircraft ID
            std::getline(iss, token, ',');
            params.aircraftId = token;
            
            // Parse aircraft type
            std::getline(iss, token, ',');
            params.aircraftType = static_cast<AircraftType>(std::stoi(token));
            
            // Parse position and attitude
            std::getline(iss, token, ','); params.latitude = std::stod(token);
            std::getline(iss, token, ','); params.longitude = std::stod(token);
            std::getline(iss, token, ','); params.altitude = std::stod(token);
            std::getline(iss, token, ','); params.heading = std::stod(token);
            std::getline(iss, token, ','); params.pitch = std::stod(token);
            std::getline(iss, token, ','); params.roll = std::stod(token);
            std::getline(iss, token, ','); params.groundSpeed = std::stod(token);
            std::getline(iss, token, ','); params.indicatedAirspeed = std::stod(token);
            std::getline(iss, token, ','); params.trueAirspeed = std::stod(token);
            std::getline(iss, token, ','); params.verticalSpeed = std::stod(token);
            
            // Add to buffer
            _telemetryBuffer->write(params);
            count++;
        }
        
        Core::Logger::info("Loaded {} records from recording file: {}", count, filepath);
        return Core::Result<size_t>::success(count);
    } catch (const std::exception& e) {
        const std::string error = "Failed to load recording: " + std::string(e.what());
        Core::Logger::error(error);
        return Core::Result<size_t>::failure(Core::ErrorCode::OperationFailed, error);
    }
}

Core::Result<void> SimulatorDataProcessor::setEventDetectionParameters(const EventDetectionParameters& parameters) {
    try {
        _eventDetector->setParameters(parameters);
        return Core::Result<void>::success();
    } catch (const std::exception& e) {
        const std::string error = "Failed to set event detection parameters: " + std::string(e.what());
        Core::Logger::error(error);
        return Core::Result<void>::failure(Core::ErrorCode::OperationFailed, error);
    }
}

Core::Result<void> SimulatorDataProcessor::setAnomalyDetectionParameters(const AnomalyDetectionParameters& parameters) {
    try {
        _anomalyDetector->setParameters(parameters);
        return Core::Result<void>::success();
    } catch (const std::exception& e) {
        const std::string error = "Failed to set anomaly detection parameters: " + std::string(e.what());
        Core::Logger::error(error);
        return Core::Result<void>::failure(Core::ErrorCode::OperationFailed, error);
    }
}

// Private methods

void SimulatorDataProcessor::processingThread() {
    Core::Logger::debug("Processing thread started");
    
    auto lastProcessTime = steady_clock::now();
    size_t samplesProcessed = 0;
    
    while (_running.load()) {
        FlightParameters params;
        
        // Process samples from the input queue
        while (_inputQueue->dequeue(params)) {
            auto startTime = steady_clock::now();
            
            // Add to telemetry buffer
            _telemetryBuffer->write(params);
            
            // Notify subscribers
            notifyTelemetrySubscribers(params);
            
            auto endTime = steady_clock::now();
            double latencyMs = duration_cast<microseconds>(endTime - startTime).count() / 1000.0;
            
            // Update statistics
            _statistics.samplesProcessed.fetch_add(1);
            _statistics.currentProcessingLatencyMs.store(latencyMs);
            _statistics.bufferUtilizationPercent.store(_telemetryBuffer->utilization());
            
            samplesProcessed++;
        }
        
        // Calculate current sample rate
        auto now = steady_clock::now();
        auto elapsed = duration_cast<milliseconds>(now - lastProcessTime).count();
        
        if (elapsed >= 1000) { // Update rate every second
            double sampleRateHz = samplesProcessed * 1000.0 / elapsed;
            _statistics.currentSampleRateHz.store(sampleRateHz);
            
            samplesProcessed = 0;
            lastProcessTime = now;
        }
        
        // Sleep briefly to avoid busy-waiting
        std::this_thread::sleep_for(std::chrono::microseconds(100));
    }
    
    Core::Logger::debug("Processing thread stopped");
}

void SimulatorDataProcessor::eventDetectionThread() {
    Core::Logger::debug("Event detection thread started");
    
    auto lastDetectionTime = steady_clock::now();
    
    while (_running.load()) {
        auto now = steady_clock::now();
        auto elapsed = duration_cast<milliseconds>(now - lastDetectionTime).count();
        
        // Run event detection at configured interval
        if (elapsed >= _config.eventDetectionIntervalMs) {
            lastDetectionTime = now;
            
            // Skip if paused
            if (_status.load() == ProcessorStatus::PAUSED) {
                std::this_thread::sleep_for(std::chrono::milliseconds(100));
                continue;
            }
            
            // Get latest telemetry data for analysis
            std::vector<FlightParameters> recentData;
            size_t dataCount = _telemetryBuffer->getSnapshot(recentData, 100); // Get last 100 samples
            
            if (dataCount > 0) {
                // Detect events
                std::vector<FlightEvent> events = _eventDetector->detectEvents(recentData);
                
                // Process detected events
                for (const auto& event : events) {
                    // Add to event queue
                    _eventQueue->enqueue(event);
                    
                    // Notify subscribers
                    notifyEventSubscribers(event);
                    
                    // Update statistics
                    _statistics.eventsDetected.fetch_add(1);
                }
            }
        }
        
        // Sleep briefly to avoid busy-waiting
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
    
    Core::Logger::debug("Event detection thread stopped");
}

void SimulatorDataProcessor::anomalyDetectionThread() {
    Core::Logger::debug("Anomaly detection thread started");
    
    auto lastDetectionTime = steady_clock::now();
    
    while (_running.load()) {
        auto now = steady_clock::now();
        auto elapsed = duration_cast<milliseconds>(now - lastDetectionTime).count();
        
        // Run anomaly detection at configured interval
        if (elapsed >= _config.anomalyDetectionIntervalMs) {
            lastDetectionTime = now;
            
            // Skip if paused
            if (_status.load() == ProcessorStatus::PAUSED) {
                std::this_thread::sleep_for(std::chrono::milliseconds(100));
                continue;
            }
            
            // Get latest telemetry data for analysis
            std::vector<FlightParameters> recentData;
            size_t dataCount = _telemetryBuffer->getSnapshot(recentData, 200); // Get last 200 samples
            
            if (dataCount > 0) {
                // Detect anomalies
                std::vector<FlightAnomaly> anomalies = _anomalyDetector->detectAnomalies(recentData);
                
                // Process detected anomalies
                for (const auto& anomaly : anomalies) {
                    // Add to anomaly queue
                    _anomalyQueue->enqueue(anomaly);
                    
                    // Notify subscribers
                    notifyAnomalySubscribers(anomaly);
                    
                    // Update statistics
                    _statistics.anomaliesDetected.fetch_add(1);
                }
            }
        }
        
        // Sleep briefly to avoid busy-waiting
        std::this_thread::sleep_for(std::chrono::milliseconds(10));
    }
    
    Core::Logger::debug("Anomaly detection thread stopped");
}

void SimulatorDataProcessor::statisticsThread() {
    Core::Logger::debug("Statistics thread started");
    
    while (_running.load()) {
        // Update statistics periodically
        updateStatistics();
        
        // Sleep to avoid busy-waiting
        std::this_thread::sleep_for(std::chrono::milliseconds(1000));
    }
    
    Core::Logger::debug("Statistics thread stopped");
}

void SimulatorDataProcessor::recordingThread() {
    Core::Logger::debug("Recording thread started");
    
    auto lastRecordTime = steady_clock::now();
    std::vector<FlightParameters> recordingBatch;
    
    while (_running.load()) {
        auto now = steady_clock::now();
        auto elapsed = duration_cast<milliseconds>(now - lastRecordTime).count();
        
        // Run recording at configured interval
        if (elapsed >= _config.dataPersistenceIntervalMs && _recording.load()) {
            lastRecordTime = now;
            
            // Skip if paused
            if (_status.load() == ProcessorStatus::PAUSED) {
                std::this_thread::sleep_for(std::chrono::milliseconds(100));
                continue;
            }
            
            try {
                std::lock_guard<std::mutex> lock(_recordingMutex);
                
                // Get data since last recording
                std::vector<FlightParameters> newData;
                size_t dataCount = _telemetryBuffer->readBatch(newData, 1000); // Get up to 1000 samples
                
                if (dataCount > 0) {
                    // Open file in append mode
                    std::ofstream file(_recordingFilename, std::ios::app);
                    
                    if (!file.is_open()) {
                        Core::Logger::error("Failed to open recording file: {}", _recordingFilename);
                        continue;
                    }
                    
                    // Write header if file is empty
                    if (file.tellp() == 0) {
                        file << "timestamp,sessionId,aircraftId,aircraftType,"
                            << "latitude,longitude,altitude,heading,pitch,roll,"
                            << "groundSpeed,indicatedAirspeed,trueAirspeed,verticalSpeed,"
                            << "controlPitch,controlRoll,controlYaw,controlThrottle,"
                            << "phase,onGround,stall,overspeed\n";
                    }
                    
                    // Write data
                    for (const auto& params : newData) {
                        file << params.timestamp << ","
                            << params.sessionId << ","
                            << params.aircraftId << ","
                            << static_cast<int>(params.aircraftType) << ","
                            << params.latitude << ","
                            << params.longitude << ","
                            << params.altitude << ","
                            << params.heading << ","
                            << params.pitch << ","
                            << params.roll << ","
                            << params.groundSpeed << ","
                            << params.indicatedAirspeed << ","
                            << params.trueAirspeed << ","
                            << params.verticalSpeed << ","
                            << params.controlPitch << ","
                            << params.controlRoll << ","
                            << params.controlYaw << ","
                            << params.controlThrottle << ","
                            << static_cast<int>(params.phase) << ","
                            << (params.onGround ? "1" : "0") << ","
                            << (params.stall ? "1" : "0") << ","
                            << (params.overspeed ? "1" : "0") << "\n";
                    }
                    
                    file.close();
                }
            } catch (const std::exception& e) {
                Core::Logger::error("Error in recording thread: {}", e.what());
            }
        }
        
        // Sleep briefly to avoid busy-waiting
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
    
    Core::Logger::debug("Recording thread stopped");
}

void SimulatorDataProcessor::updateStatus(ProcessorStatus status, const std::string& message) {
    _status.store(status);
    _statusMessage = message;
    
    // Notify status subscribers
    std::lock_guard<std::mutex> lock(_statusSubscribersMutex);
    for (const auto& [id, callback] : _statusSubscribers) {
        callback(status, message);
    }
    
    // Log status change
    if (!message.empty()) {
        Core::Logger::info("SimulatorDataProcessor status: {} - {}", static_cast<int>(status), message);
    } else {
        Core::Logger::info("SimulatorDataProcessor status: {}", static_cast<int>(status));
    }
}

void SimulatorDataProcessor::notifyTelemetrySubscribers(const FlightParameters& parameters) {
    std::lock_guard<std::mutex> lock(_telemetrySubscribersMutex);
    for (const auto& [id, callback] : _telemetrySubscribers) {
        try {
            callback(parameters);
        } catch (const std::exception& e) {
            Core::Logger::error("Error in telemetry subscriber {}: {}", id, e.what());
        }
    }
}

void SimulatorDataProcessor::notifyEventSubscribers(const FlightEvent& event) {
    std::lock_guard<std::mutex> lock(_eventSubscribersMutex);
    for (const auto& [id, callback] : _eventSubscribers) {
        try {
            callback(event);
        } catch (const std::exception& e) {
            Core::Logger::error("Error in event subscriber {}: {}", id, e.what());
        }
    }
}

void SimulatorDataProcessor::notifyAnomalySubscribers(const FlightAnomaly& anomaly) {
    std::lock_guard<std::mutex> lock(_anomalySubscribersMutex);
    for (const auto& [id, callback] : _anomalySubscribers) {
        try {
            callback(anomaly);
        } catch (const std::exception& e) {
            Core::Logger::error("Error in anomaly subscriber {}: {}", id, e.what());
        }
    }
}

void SimulatorDataProcessor::updateStatistics() {
    // Calculate time since start
    auto now = steady_clock::now();
    auto uptime = duration_cast<seconds>(now - _statistics.startTime).count();
    
    // Log statistics periodically
    Core::Logger::debug("SimulatorDataProcessor statistics: received={}, processed={}, dropped={}, rate={:.1f} Hz, latency={:.2f} ms, buffer={:.1f}%, uptime={}s",
        _statistics.samplesReceived.load(),
        _statistics.samplesProcessed.load(),
        _statistics.samplesDropped.load(),
        _statistics.currentSampleRateHz.load(),
        _statistics.currentProcessingLatencyMs.load(),
        _statistics.bufferUtilizationPercent.load(),
        uptime
    );
}

void SimulatorDataProcessor::startThreads() {
    // Create processing threads
    for (int i = 0; i < _config.processingThreads; ++i) {
        _processingThreads.emplace_back([this] { this->processingThread(); });
    }
    
    // Create event detection thread
    if (_config.enableEventDetection) {
        _eventDetectionThread = std::thread([this] { this->eventDetectionThread(); });
    }
    
    // Create anomaly detection thread
    if (_config.enableAnomalyDetection) {
        _anomalyDetectionThread = std::thread([this] { this->anomalyDetectionThread(); });
    }
    
    // Create statistics thread
    _statisticsThread = std::thread([this] { this->statisticsThread(); });
    
    // Create recording thread
    if (_config.enableDataRecording) {
        _recordingThread = std::thread([this] { this->recordingThread(); });
    }
}

void SimulatorDataProcessor::stopThreads() {
    // Join processing threads
    for (auto& thread : _processingThreads) {
        if (thread.joinable()) {
            thread.join();
        }
    }
    _processingThreads.clear();
    
    // Join event detection thread
    if (_eventDetectionThread.joinable()) {
        _eventDetectionThread.join();
    }
    
    // Join anomaly detection thread
    if (_anomalyDetectionThread.joinable()) {
        _anomalyDetectionThread.join();
    }
    
    // Join statistics thread
    if (_statisticsThread.joinable()) {
        _statisticsThread.join();
    }
    
    // Join recording thread
    if (_recordingThread.joinable()) {
        _recordingThread.join();
    }
}

} // namespace Simulator
} // namespace PilotTraining
