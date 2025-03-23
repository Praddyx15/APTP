#include <iostream>
#include <memory>
#include <string>
#include <csignal>
#include <thread>
#include <chrono>
#include <fstream>
#include <grpcpp/grpcpp.h>
#include <grpcpp/health_check_service_interface.h>
#include <grpcpp/ext/proto_server_reflection_plugin.h>
#include <nlohmann/json.hpp>

#include "service/assessment_service_impl.h"
#include "grading/grading_service.h"
#include "tracking/session_tracking.h"
#include "benchmarking/compliance_benchmarking.h"
#include "feedback/feedback_service.h"
#include "persistence/database_connection.h"
#include "logging/logger.h"
#include "metrics/metrics_service.h"

using namespace assessment;

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
            "assessment-service",
            logging::LogLevel::INFO,
            config.value("logging", nlohmann::json::object()).value("file_path", "logs/assessment-service.log")
        );
        
        logging::Logger::getInstance().info("Assessment Service starting up");
        
        // Initialize metrics
        std::string metrics_host = config.value("metrics", nlohmann::json::object()).value("host", "0.0.0.0");
        int metrics_port = config.value("metrics", nlohmann::json::object()).value("port", 9107);
        
        metrics::MetricsService::getInstance().initialize(
            "assessment-service",
            true,
            metrics_host,
            metrics_port
        );
        
        // Initialize database connection
        std::string db_host = config.value("database", nlohmann::json::object()).value("host", "localhost");
        int db_port = config.value("database", nlohmann::json::object()).value("port", 5432);
        std::string db_name = config.value("database", nlohmann::json::object()).value("name", "assessment_db");
        std::string db_user = config.value("database", nlohmann::json::object()).value("user", "assessment_user");
        std::string db_password = config.value("database", nlohmann::json::object()).value("password", "assessment_password");
        
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
        auto assessment_repository = std::make_shared<persistence::AssessmentRepository>(db_connection);
        auto session_repository = std::make_shared<persistence::SessionRepository>(db_connection);
        auto benchmark_repository = std::make_shared<persistence::BenchmarkRepository>(db_connection);
        auto feedback_repository = std::make_shared<persistence::FeedbackRepository>(db_connection);
        
        // Create services
        auto grading_service = std::make_shared<grading::GradingService>(assessment_repository);
        auto tracking_service = std::make_shared<tracking::SessionTrackingService>(session_repository);
        auto benchmark_service = std::make_shared<benchmarking::ComplianceBenchmarkingService>(benchmark_repository);
        auto feedback_service = std::make_shared<feedback::FeedbackService>(feedback_repository);
        
        // Initialize gRPC server
        std::string server_address = 
            config.value("server", nlohmann::json::object()).value("host", "0.0.0.0") + ":" + 
            std::to_string(config.value("server", nlohmann::json::object()).value("port", 50057));
        
        service::AssessmentServiceImpl service(
            grading_service,
            tracking_service,
            benchmark_service,
            feedback_service
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
            {{"service", "assessment-service"}}
        );
        
        auto& request_duration = metrics::MetricsService::getInstance().createHistogram(
            "request_duration_seconds",
            "Request duration in seconds",
            {{"service", "assessment-service"}}
        );
        
        auto& active_connections = metrics::MetricsService::getInstance().createGauge(
            "active_connections",
            "Number of active connections",
            {{"service", "assessment-service"}}
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
        
        // Shutdown metrics
        metrics::MetricsService::getInstance().shutdown();
        
        // Close database connection
        db_connection->disconnect();
        
        logging::Logger::getInstance().info("Assessment Service shut down successfully");
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