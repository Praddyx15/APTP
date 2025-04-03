#include <iostream>
#include <csignal>
#include <thread>
#include <chrono>
#include <grpcpp/server.h>
#include <grpcpp/server_builder.h>
#include <grpcpp/security/server_credentials.h>
#include <nlohmann/json.hpp>

#include "connectors/device_connector.h"
#include "connectors/tobii_connector.h"
#include "fusion/data_fusion.h"
#include "persistence/data_persistence.h"
#include "services/data_acquisition_service.h"

// Include generated protobuf headers
#include "data_acquisition.grpc.pb.h"

using namespace data_acquisition;

// Global flag for graceful shutdown
std::atomic<bool> running{true};

// Signal handler
void signalHandler(int signal) {
    std::cout << "Received signal " << signal << ", shutting down..." << std::endl;
    running = false;
}

class DataAcquisitionServiceImpl final : public data_acquisition::DataAcquisitionService::Service {
public:
    DataAcquisitionServiceImpl() {
        // Register device connectors
        auto& factory = connectors::DeviceConnectorFactory::getInstance();
        factory.registerConnector<connectors::TobiiEyeTrackerConnector>(
            connectors::DeviceType::EYE_TRACKER, "Tobii");
            
        // More connectors would be registered here
    }
    
    grpc::Status StreamData(
        grpc::ServerContext* context,
        const StreamDataRequest* request,
        grpc::ServerWriter<DataPoint>* writer
    ) override {
        std::cout << "Received StreamData request for session " << request->session_id() << std::endl;
        
        // Implement the streaming logic here
        // For each device in the request, start streaming data
        
        // Example implementation with a simple loop
        while (!context->IsCancelled() && running) {
            // Create a sample data point
            DataPoint data_point;
            data_point.set_device_id("sample_device");
            data_point.set_data_type(DataType::GAZE);
            data_point.set_timestamp(
                std::chrono::duration_cast<std::chrono::microseconds>(
                    std::chrono::system_clock::now().time_since_epoch()
                ).count()
            );
            
            // Set gaze data
            auto* gaze = new GazeData();
            gaze->set_x(0.5 + (rand() % 100 - 50) / 1000.0);
            gaze->set_y(0.5 + (rand() % 100 - 50) / 1000.0);
            gaze->set_z(600.0 + (rand() % 100 - 50));
            gaze->set_confidence(0.95);
            data_point.set_allocated_gaze(gaze);
            
            // Write data point
            writer->Write(data_point);
            
            // Sleep for a short time
            std::this_thread::sleep_for(std::chrono::milliseconds(16));  // ~60Hz
        }
        
        return grpc::Status::OK;
    }
    
    grpc::Status GetHistoricalData(
        grpc::ServerContext* context,
        const HistoricalDataRequest* request,
        DataSeries* response
    ) override {
        std::cout << "Received GetHistoricalData request for session " << request->session_id() << std::endl;
        
        // Set response session ID
        response->set_session_id(request->session_id());
        
        // Query historical data from persistence
        persistence::SessionDataQuery query;
        query.session_id = request->session_id();
        
        if (!request->device_types().empty()) {
            // Convert protobuf device types to our internal types
            // For simplicity, we'll use the first one
            auto device_type = request->device_types(0);
            // In a real implementation, we would map these properly
        }
        
        if (!request->data_types().empty()) {
            // Convert protobuf data types to our internal types
            // For simplicity, we'll use the first one
            auto data_type = request->data_types(0);
            // In a real implementation, we would map these properly
        }
        
        query.start_time = std::chrono::system_clock::time_point(
            std::chrono::microseconds(request->start_time())
        );
        
        query.end_time = std::chrono::system_clock::time_point(
            std::chrono::microseconds(request->end_time())
        );
        
        query.limit = request->max_points() > 0 ? 
            std::optional<int>(request->max_points()) : std::nullopt;
        
        // Query data from persistence manager
        auto& persistence_manager = persistence::DataPersistenceManager::getInstance();
        auto result = persistence_manager.querySessionData(query);
        
        // Convert internal data to protobuf data points
        for (const auto& device_data : result.device_data) {
            DataPoint* data_point = response->add_data_points();
            
            // Set common fields
            data_point->set_device_id(device_data->device_id);
            data_point->set_data_type(static_cast<data_acquisition::DataType>(
                static_cast<int>(device_data->data_type)
            ));
            data_point->set_timestamp(
                std::chrono::duration_cast<std::chrono::microseconds>(
                    device_data->timestamp.time_since_epoch()
                ).count()
            );
            
            // Set specific data fields based on type
            switch (device_data->data_type) {
                case connectors::DataType::GAZE: {
                    const auto* gaze_data = dynamic_cast<const connectors::GazeData*>(device_data.get());
                    if (gaze_data) {
                        auto* gaze = new data_acquisition::GazeData();
                        gaze->set_x(gaze_data->x);
                        gaze->set_y(gaze_data->y);
                        gaze->set_z(gaze_data->z);
                        gaze->set_confidence(gaze_data->confidence);
                        data_point->set_allocated_gaze(gaze);
                    }
                    break;
                }
                case connectors::DataType::PUPIL: {
                    const auto* pupil_data = dynamic_cast<const connectors::PupilData*>(device_data.get());
                    if (pupil_data) {
                        auto* pupil = new data_acquisition::PupilData();
                        pupil->set_left_diameter(pupil_data->left_diameter);
                        pupil->set_right_diameter(pupil_data->right_diameter);
                        pupil->set_left_confidence(pupil_data->left_confidence);
                        pupil->set_right_confidence(pupil_data->right_confidence);
                        data_point->set_allocated_pupil(pupil);
                    }
                    break;
                }
                // More data types would be handled here
                default:
                    // Unsupported data type
                    break;
            }
        }
        
        return grpc::Status::OK;
    }
    
    grpc::Status StartRecording(
        grpc::ServerContext* context,
        const RecordingRequest* request,
        RecordingResponse* response
    ) override {
        std::cout << "Received StartRecording request for session " << request->session_id() << std::endl;
        
        // Create session metadata
        persistence::SessionMetadata metadata;
        metadata.session_id = request->session_id();
        metadata.user_id = request->user_id();
        metadata.exercise_id = request->exercise_id();
        metadata.start_time = std::chrono::system_clock::now();
        
        // Add device IDs
        for (const auto& device : request->devices()) {
            metadata.device_ids.push_back(device.device_id());
        }
        
        // Add additional metadata
        for (const auto& [key, value] : request->metadata()) {
            metadata.additional_metadata[key] = value;
        }
        
        // Start recording
        auto& persistence_manager = persistence::DataPersistenceManager::getInstance();
        bool success = persistence_manager.createSession(metadata);
        
        // Set response
        response->set_success(success);
        response->set_session_id(request->session_id());
        
        if (!success) {
            response->set_error_message("Failed to create session");
        }
        
        return grpc::Status::OK;
    }
    
    grpc::Status StopRecording(
        grpc::ServerContext* context,
        const StopRecordingRequest* request,
        RecordingResponse* response
    ) override {
        std::cout << "Received StopRecording request for session " << request->session_id() << std::endl;
        
        // Stop recording
        auto& persistence_manager = persistence::DataPersistenceManager::getInstance();
        bool success = persistence_manager.closeSession(request->session_id());
        
        // Set response
        response->set_success(success);
        response->set_session_id(request->session_id());
        
        if (!success) {
            response->set_error_message("Failed to close session");
        }
        
        return grpc::Status::OK;
    }
    
    grpc::Status GetAvailableDevices(
        grpc::ServerContext* context,
        const DeviceRequest* request,
        DeviceList* response
    ) override {
        std::cout << "Received GetAvailableDevices request" << std::endl;
        
        // Get registered connectors
        auto& factory = connectors::DeviceConnectorFactory::getInstance();
        auto registered_connectors = factory.getRegisteredConnectors();
        
        // For each connector, discover devices
        for (const auto& [device_type, connector_name] : registered_connectors) {
            // Check if this device type is requested
            bool type_requested = request->device_types().empty();
            for (const auto& requested_type : request->device_types()) {
                if (static_cast<connectors::DeviceType>(requested_type) == device_type) {
                    type_requested = true;
                    break;
                }
            }
            
            if (!type_requested) {
                continue;
            }
            
            // Create connector
            auto connector = factory.createConnector(device_type, connector_name);
            if (!connector) {
                continue;
            }
            
            // Initialize connector
            std::unordered_map<std::string, std::string> config;
            if (!connector->initialize(config)) {
                continue;
            }
            
            // Discover devices
            auto devices = connector->discoverDevices();
            
            // Add devices to response
            for (const auto& device_info : devices) {
                auto* device = response->add_devices();
                device->set_device_id(device_info.device_id);
                device->set_device_type(static_cast<data_acquisition::DeviceType>(
                    static_cast<int>(device_info.device_type)
                ));
                device->set_model(device_info.model);
                device->set_serial_number(device_info.serial_number);
                device->set_firmware_version(device_info.firmware_version);
                
                for (const auto& data_type : device_info.capabilities.supported_data_types) {
                    device->add_supported_data_types(static_cast<data_acquisition::DataType>(
                        static_cast<int>(data_type)
                    ));
                }
                
                for (const auto& [key, value] : device_info.capabilities.parameters) {
                    (*device->mutable_capabilities())[key] = value;
                }
                
                device->set_is_connected(device_info.is_connected);
                device->set_connection_info(device_info.connection_info);
            }
            
            // Shutdown connector
            connector->shutdown();
        }
        
        return grpc::Status::OK;
    }
    
    grpc::Status ConfigureDevice(
        grpc::ServerContext* context,
        const DeviceConfig* request,
        DeviceConfigResponse* response
    ) override {
        std::cout << "Received ConfigureDevice request for device " << request->device_id() << std::endl;
        
        // Find connector for device type
        auto& factory = connectors::DeviceConnectorFactory::getInstance();
        auto device_type = static_cast<connectors::DeviceType>(request->device_type());
        
        // In a real implementation, we would need to track which connector is associated with
        // which device ID. For simplicity, we'll just try to find any connector for the device type.
        auto registered_connectors = factory.getRegisteredConnectors();
        
        for (const auto& [registered_type, connector_name] : registered_connectors) {
            if (registered_type == device_type) {
                // Create and initialize connector
                auto connector = factory.createConnector(device_type, connector_name);
                if (!connector || !connector->initialize({})) {
                    continue;
                }
                
                // Convert request parameters
                std::unordered_map<std::string, std::string> config;
                for (const auto& [key, value] : request->parameters()) {
                    config[key] = value;
                }
                
                // Configure device
                bool success = connector->configureDevice(request->device_id(), config);
                
                // Set response
                response->set_success(success);
                response->set_device_id(request->device_id());
                
                if (!success) {
                    response->set_error_message("Failed to configure device");
                }
                
                // Shutdown connector
                connector->shutdown();
                
                return grpc::Status::OK;
            }
        }
        
        // No suitable connector found
        response->set_success(false);
        response->set_device_id(request->device_id());
        response->set_error_message("No suitable connector found for device type");
        
        return grpc::Status::OK;
    }
};

int main(int argc, char** argv) {
    // Register signal handlers
    std::signal(SIGINT, signalHandler);
    std::signal(SIGTERM, signalHandler);
    
    std::cout << "Starting Data Acquisition Service..." << std::endl;
    
    // Parse configuration
    // In a real implementation, we would load this from a config file
    nlohmann::json config = {
        {"server", {
            {"host", "0.0.0.0"},
            {"port", 50052}
        }},
        {"persistence", {
            {"type", "file"},
            {"format", "json"},
            {"path", "data"},
            {"compression", false},
            {"flush_interval_ms", 1000}
        }}
    };
    
    std::string server_address = 
        config["server"]["host"].get<std::string>() + ":" + 
        std::to_string(config["server"]["port"].get<int>());
    
    // Initialize persistence
    persistence::StorageOptions storage_options;
    storage_options.format = persistence::StorageFormat::JSON;
    storage_options.compress = config["persistence"]["compression"].get<bool>();
    storage_options.include_metadata = true;
    storage_options.flush_interval_ms = config["persistence"]["flush_interval_ms"].get<int>();
    
    auto& persistence_manager = persistence::DataPersistenceManager::getInstance();
    if (!persistence_manager.initialize(
            config["persistence"]["type"].get<std::string>(),
            storage_options
        )) {
        std::cerr << "Failed to initialize persistence manager" << std::endl;
        return 1;
    }
    
    // Initialize fusion
    auto& fusion_manager = fusion::DataFusionManager::getInstance();
    if (!fusion_manager.initialize()) {
        std::cerr << "Failed to initialize fusion manager" << std::endl;
        return 1;
    }
    
    // Create and start gRPC server
    DataAcquisitionServiceImpl service;
    
    grpc::ServerBuilder builder;
    builder.AddListeningPort(server_address, grpc::InsecureServerCredentials());
    builder.RegisterService(&service);
    
    std::unique_ptr<grpc::Server> server(builder.BuildAndStart());
    std::cout << "Server listening on " << server_address << std::endl;
    
    // Keep running until signal
    while (running) {
        std::this_thread::sleep_for(std::chrono::seconds(1));
    }
    
    // Shutdown
    std::cout << "Shutting down server..." << std::endl;
    server->Shutdown();
    server->Wait();
    
    // Shutdown managers
    fusion_manager.shutdown();
    persistence_manager.shutdown();
    
    std::cout << "Server shutdown complete" << std::endl;
    return 0;
}