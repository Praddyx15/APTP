#include <iostream>
#include <memory>
#include <string>
#include <csignal>
#include <thread>
#include <chrono>
#include <fstream>
#include <sstream>

#include <grpcpp/grpcpp.h>
#include <grpcpp/health_check_service_interface.h>
#include <grpcpp/ext/proto_server_reflection_plugin.h>
#include <nlohmann/json.hpp>

#include "service/etr_service_impl.h"
#include "records/record_service.h"
#include "records/record_repository.h"
#include "signature/digital_signature.h"
#include "compliance/compliance_service.h"
#include "compliance/compliance_repository.h"
#include "syllabus/syllabus_service.h"
#include "syllabus/syllabus_repository.h"
#include "persistence/database_connection.h"
#include "logging/logger.h"
#include "metrics/metrics_service.h"

using namespace etr;

// Global flag for graceful shutdown
std::atomic<bool> running{true};

// Signal handler
void signalHandler(int signal) {
    logging::Logger::getInstance().info("Received signal {}, shutting down...", signal);
    running = false;
}

// Load configuration from file
nlohmann::json loadConfig(const std::string& config_path) {
    try {
        std::ifstream config_file(config_path);
        if (!config_file.is_open()) {
            throw std::runtime_error("Failed to open config file: " + config_path);
        }
        
        nlohmann::json config;
        config_file >> config;
        return config;
    } catch (const std::exception& e) {
        std::cerr << "Error loading configuration: " << e.what() << std::endl;
        return nlohmann::json::object();
    }
}

int main(int argc, char** argv) {
    try {
        // Register signal handlers
        std::signal(SIGINT, signalHandler);
        std::signal(SIGTERM, signalHandler);
        
        // Load configuration
        std::string config_path = "config/config.json";
        if (argc > 1) {
            config_path = argv[1];
        }
        
        auto config = loadConfig(config_path);
        
        // Initialize logger
        logging::Logger::getInstance().initialize(
            "etr-service",
            logging::LogLevel::INFO,
            config.value("logging", nlohmann::json::object()).value("file_path", "logs/etr-service.log")
        );
        
        logging::Logger::getInstance().info("ETR Service starting up");
        
        // Initialize metrics
        std::string metrics_host = config.value("metrics", nlohmann::json::object()).value("host", "0.0.0.0");
        int metrics_port = config.value("metrics", nlohmann::json::object()).value("port", 9103);
        
        metrics::MetricsService::getInstance().initialize(
            "etr-service",
            true,
            metrics_host,
            metrics_port
        );
        
        // Initialize database connection
        std::string db_host = config.value("database", nlohmann::json::object()).value("host", "localhost");
        int db_port = config.value("database", nlohmann::json::object()).value("port", 5432);
        std::string db_name = config.value("database", nlohmann::json::object()).value("name", "etr_db");
        std::string db_user = config.value("database", nlohmann::json::object()).value("user", "etr_user");
        std::string db_password = config.value("database", nlohmann::json::object()).value("password", "etr_password");
        
        auto db_connection = std::make_shared<persistence::DatabaseConnection>(
            db_host,
            db_port,
            db_name,
            db_user,
            db_password
        );
        
        if (!db_connection->connect()) {
            throw std::runtime_error("Failed to connect to database");
        }
        
        // Create repositories
        auto record_repository = std::make_shared<records::RecordRepository>(db_connection);
        auto certificate_repository = std::make_shared<signature::CertificateRepository>(db_connection);
        auto compliance_repository = std::make_shared<compliance::ComplianceRepository>(db_connection);
        auto syllabus_repository = std::make_shared<syllabus::SyllabusRepository>(db_connection);
        
        // Create services
        auto record_service = std::make_shared<records::RecordService>(record_repository);
        
        std::string ca_certificate_path = config.value("security", nlohmann::json::object()).value("ca_certificate_path", "");
        std::string crl_path = config.value("security", nlohmann::json::object()).value("crl_path", "");
        
        auto signature_service = std::make_shared<signature::X509DigitalSignatureService>(
            ca_certificate_path,
            crl_path
        );
        
        auto compliance_service = std::make_shared<compliance::ComplianceService>(
            compliance_repository,
            record_repository
        );
        
        auto syllabus_service = std::make_shared<syllabus::SyllabusService>(
            syllabus_repository,
            signature_service
        );
        
        // Initialize gRPC server
        std::string server_address = 
            config.value("server", nlohmann::json::object()).value("host", "0.0.0.0") + ":" + 
            std::to_string(config.value("server", nlohmann::json::object()).value("port", 50053));
        
        service::ETRServiceImpl service(
            record_service,
            signature_service,
            compliance_service,
            syllabus_service
        );
        
        grpc::EnableDefaultHealthCheckService(true);
        grpc::reflection::InitProtoReflectionServerBuilderPlugin();
        
        grpc::ServerBuilder builder;
        
        // Set authentication credentials if TLS is enabled
        if (config.value("security", nlohmann::json::object()).value("tls_enabled", false)) {
            std::string key_path = config.value("security", nlohmann::json::object()).value("key_path", "");
            std::string cert_path = config.value("security", nlohmann::json::object()).value("cert_path", "");
            
            std::ifstream key_file(key_path);
            std::ifstream cert_file(cert_path);
            
            if (!key_file.is_open() || !cert_file.is_open()) {
                throw std::runtime_error("Failed to open TLS key or certificate file");
            }
            
            std::stringstream key_buffer, cert_buffer;
            key_buffer << key_file.rdbuf();
            cert_buffer << cert_file.rdbuf();
            
            grpc::SslServerCredentialsOptions ssl_opts;
            ssl_opts.pem_key_cert_pairs.push_back({key_buffer.str(), cert_buffer.str()});
            
            builder.AddListeningPort(server_address, grpc::SslServerCredentials(ssl_opts));
        } else {
            builder.AddListeningPort(server_address, grpc::InsecureServerCredentials());
        }
        
        // Add authentication interceptor
        // Note: In a real-world implementation, you would add proper authentication here
        
        builder.RegisterService(&service);
        
        // Set server options
        builder.SetMaxReceiveMessageSize(config.value("server", nlohmann::json::object()).value("max_message_size_mb", 100) * 1024 * 1024);
        builder.SetMaxSendMessageSize(config.value("server", nlohmann::json::object()).value("max_message_size_mb", 100) * 1024 * 1024);
        
        // Add metrics recorder
        // Note: In a real-world implementation, you would add a proper metrics interceptor here
        
        // Build and start server
        std::unique_ptr<grpc::Server> server(builder.BuildAndStart());
        logging::Logger::getInstance().info("Server listening on {}", server_address);
        
        // Create performance metrics
        auto& request_counter = metrics::MetricsService::getInstance().createCounter(
            "requests_total",
            "Total number of requests",
            {{"service", "etr-service"}}
        );
        
        auto& request_duration = metrics::MetricsService::getInstance().createHistogram(
            "request_duration_seconds",
            "Request duration in seconds",
            {{"service", "etr-service"}}
        );
        
        auto& active_connections = metrics::MetricsService::getInstance().createGauge(
            "active_connections",
            "Number of active connections",
            {{"service", "etr-service"}}
        );
        
        // Main loop
        while (running) {
            // Update metrics (in a real implementation, these would be updated by the interceptor)
            active_connections.Set(server->GetNumActiveConnections());
            
            // Sleep to avoid busy waiting
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
        
        // Graceful shutdown
        logging::Logger::getInstance().info("Shutting down server...");
        server->Shutdown();
        logging::Logger::getInstance().info("Server shutting down");
        
        // Shutdown metrics
        metrics::MetricsService::getInstance().shutdown();
        
        // Close database connection
        db_connection->disconnect();
        
        logging::Logger::getInstance().info("ETR Service shut down successfully");
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Fatal error: " << e.what() << std::endl;
        
        try {
            logging::Logger::getInstance().critical("Fatal error: {}", e.what());
        } catch (...) {
            // Ignore if logging fails
        }
        
        return 1;
    }
}