#include <iostream>
#include <csignal>
#include <thread>
#include <chrono>

#include "auth/jwt_auth_service.h"
#include "config/config_service.h"
#include "communication/grpc_messaging_service.h"
#include "logging/logger.h"
#include "metrics/metrics_service.h"

using namespace core_platform;

// Global flag for graceful shutdown
std::atomic<bool> running{true};

// Signal handler
void signalHandler(int signal) {
    logging::Logger::getInstance().info("Received signal {}, shutting down...", signal);
    running = false;
}

int main(int argc, char** argv) {
    try {
        // Register signal handlers
        std::signal(SIGINT, signalHandler);
        std::signal(SIGTERM, signalHandler);
        
        // Initialize logger
        logging::Logger::getInstance().initialize(
            "core-platform-service",
            logging::LogLevel::INFO,
            "logs/core-platform-service.log"
        );
        
        logging::Logger::getInstance().info("Core Platform Service starting up");
        
        // Initialize configuration
        auto& config_service = config::ConfigService::getInstance();
        
        // Add configuration sources
        auto file_config = std::make_shared<config::FileConfigSource>("config/config.json");
        auto env_config = std::make_shared<config::EnvConfigSource>("CPS_");
        
        config_service.addSource(file_config);
        config_service.addSource(env_config);
        
        // Get configuration values
        std::string host = config_service.get<std::string>("server.host").value_or("0.0.0.0");
        int port = config_service.get<int>("server.port").value_or(50051);
        std::string jwt_secret = config_service.get<std::string>("auth.jwt_secret").value_or("default_secret_key_change_in_production");
        int token_expiry = config_service.get<int>("auth.token_expiry_seconds").value_or(3600);
        int refresh_expiry = config_service.get<int>("auth.refresh_expiry_seconds").value_or(86400);
        std::string metrics_host = config_service.get<std::string>("metrics.host").value_or("0.0.0.0");
        int metrics_port = config_service.get<int>("metrics.port").value_or(9100);
        
        // Initialize metrics
        metrics::MetricsService::getInstance().initialize(
            "core-platform-service",
            true,
            metrics_host,
            metrics_port
        );
        
        // Create authentication service
        auto auth_service = std::make_shared<auth::JwtAuthService>(
            jwt_secret,
            token_expiry,
            refresh_expiry
        );
        
        // Create authorization service
        auto authz_service = std::make_shared<auth::AuthorizationService>(auth_service);
        
        // Initialize service discovery
        auto service_discovery = std::make_shared<communication::LocalServiceDiscovery>();
        
        // Register this service
        service_discovery->registerService(
            "core-platform-service",
            host + ":" + std::to_string(port)
        );
        
        // Initialize messaging service
        auto messaging_service = std::make_shared<communication::GrpcMessagingService>(
            "core-platform-service",
            host,
            port,
            service_discovery
        );
        
        // Start messaging service
        if (!messaging_service->start()) {
            logging::Logger::getInstance().critical("Failed to start messaging service");
            return 1;
        }
        
        logging::Logger::getInstance().info("Core Platform Service started on {}:{}", host, port);
        
        // Create performance metrics
        auto& request_counter = metrics::MetricsService::getInstance().createCounter(
            "requests_total",
            "Total number of requests",
            {{"service", "core-platform-service"}}
        );
        
        auto& request_duration = metrics::MetricsService::getInstance().createHistogram(
            "request_duration_seconds",
            "Request duration in seconds",
            {{"service", "core-platform-service"}}
        );
        
        auto& active_connections = metrics::MetricsService::getInstance().createGauge(
            "active_connections",
            "Number of active connections",
            {{"service", "core-platform-service"}}
        );
        
        // Main loop
        while (running) {
            // Update metrics
            active_connections.Set(42); // Example value, should be replaced with actual logic
            
            // Sleep to avoid busy waiting
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
        
        // Graceful shutdown
        logging::Logger::getInstance().info("Shutting down Core Platform Service");
        
        // Stop messaging service
        messaging_service->stop();
        
        // Unregister service
        service_discovery->unregisterService(
            "core-platform-service",
            host + ":" + std::to_string(port)
        );
        
        // Shutdown metrics
        metrics::MetricsService::getInstance().shutdown();
        
        logging::Logger::getInstance().info("Core Platform Service shut down successfully");
        return 0;
    }
    catch (const std::exception& e) {
        // Use std::cerr in case logging is not available
        std::cerr << "Fatal error: " << e.what() << std::endl;
        
        try {
            logging::Logger::getInstance().critical("Fatal error: {}", e.what());
        } catch (...) {
            // Ignore if logging fails
        }
        
        return 1;
    }
}