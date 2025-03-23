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

#include "service/analytics_service_impl.h"
#include "models/model_manager.h"
#include "inference/inference_engine.h"
#include "analytics/analytics_processor.h"
#include "database/database_connection.h"
#include "logging/logger.h"
#include "metrics/metrics_service.h"
#include "visualization/visualization_service.h"

using namespace ai_analytics;

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
            "ai-analytics-service",
            logging::LogLevel::INFO,
            config.value("logging", nlohmann::json::object()).value("file_path", "logs/ai-analytics-service.log")
        );
        
        logging::Logger::getInstance().info("AI Analytics Service starting up");
        
        // Initialize metrics
        std::string metrics_host = config.value("metrics", nlohmann::json::object()).value("host", "0.0.0.0");
        int metrics_port = config.value("metrics", nlohmann::json::object()).value("port", 9104);
        
        metrics::MetricsService::getInstance().initialize(
            "ai-analytics-service",
            true,
            metrics_host,
            metrics_port
        );
        
        // Initialize database connection
        std::string db_host = config.value("database", nlohmann::json::object()).value("host", "localhost");
        int db_port = config.value("database", nlohmann::json::object()).value("port", 5432);
        std::string db_name = config.value("database", nlohmann::json::object()).value("name", "analytics_db");
        std::string db_user = config.value("database", nlohmann::json::object()).value("user", "analytics_user");
        std::string db_password = config.value("database", nlohmann::json::object()).value("password", "analytics_password");
        
        auto db_connection = std::make_shared<database::DatabaseConnection>(
            db_host,
            db_port,
            db_name,
            db_user,
            db_password
        );
        
        if (!db_connection->connect()) {
            throw std::runtime_error("Failed to connect to database");
        }
        
        // Initialize model manager
        std::string model_path = config.value("models", nlohmann::json::object()).value("path", "models");
        auto model_manager = std::make_shared<models::ModelManager>(model_path);
        
        if (!model_manager->initialize()) {
            logging::Logger::getInstance().warn("Failed to initialize model manager, will run with limited functionality");
        }
        
        // Initialize inference engine
        auto inference_engine = std::make_shared<inference::InferenceEngine>(model_manager);
        
        if (!inference_engine->initialize()) {
            logging::Logger::getInstance().warn("Failed to initialize inference engine, will run with limited functionality");
        }
        
        // Initialize analytics processor
        auto analytics_processor = std::make_shared<analytics::AnalyticsProcessor>(db_connection);
        
        if (!analytics_processor->initialize()) {
            logging::Logger::getInstance().warn("Failed to initialize analytics processor, will run with limited functionality");
        }
        
        // Initialize visualization service
        auto visualization_service = std::make_shared<visualization::VisualizationService>(db_connection);
        
        if (!visualization_service->initialize()) {
            logging::Logger::getInstance().warn("Failed to initialize visualization service, will run with limited functionality");
        }
        
        // Initialize gRPC server
        std::string server_address = 
            config.value("server", nlohmann::json::object()).value("host", "0.0.0.0") + ":" + 
            std::to_string(config.value("server", nlohmann::json::object()).value("port", 50054));
        
        service::AnalyticsServiceImpl service(
            model_manager,
            inference_engine,
            analytics_processor,
            visualization_service,
            db_connection
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
        
        builder.RegisterService(&service);
        
        // Set server options
        builder.SetMaxReceiveMessageSize(config.value("server", nlohmann::json::object()).value("max_message_size_mb", 100) * 1024 * 1024);
        builder.SetMaxSendMessageSize(config.value("server", nlohmann::json::object()).value("max_message_size_mb", 100) * 1024 * 1024);
        
        // Build and start server
        std::unique_ptr<grpc::Server> server(builder.BuildAndStart());
        logging::Logger::getInstance().info("Server listening on {}", server_address);
        
        // Create performance metrics
        auto& request_counter = metrics::MetricsService::getInstance().createCounter(
            "requests_total",
            "Total number of requests",
            {{"service", "ai-analytics-service"}}
        );
        
        auto& request_duration = metrics::MetricsService::getInstance().createHistogram(
            "request_duration_seconds",
            "Request duration in seconds",
            {{"service", "ai-analytics-service"}}
        );
        
        auto& active_connections = metrics::MetricsService::getInstance().createGauge(
            "active_connections",
            "Number of active connections",
            {{"service", "ai-analytics-service"}}
        );
        
        // Main loop
        while (running) {
            // Update metrics
            active_connections.Set(server->GetNumActiveConnections());
            
            // Sleep to avoid busy waiting
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
        
        // Graceful shutdown
        logging::Logger::getInstance().info("Shutting down server...");
        server->Shutdown();
        logging::Logger::getInstance().info("Server shutting down");
        
        // Shutdown components
        visualization_service->shutdown();
        analytics_processor->shutdown();
        inference_engine->shutdown();
        model_manager->shutdown();
        
        // Shutdown metrics
        metrics::MetricsService::getInstance().shutdown();
        
        // Close database connection
        db_connection->disconnect();
        
        logging::Logger::getInstance().info("AI Analytics Service shut down successfully");
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