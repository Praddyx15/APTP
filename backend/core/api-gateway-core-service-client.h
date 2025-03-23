#pragma once

#include "services/service_client_base.h"
#include "core_service.grpc.pb.h"
#include <cpprest/json.h>

namespace api_gateway {
namespace services {

/**
 * @brief Client for the Core Platform Service
 */
class CoreServiceClient : public ServiceClientBase {
public:
    /**
     * @brief Constructor
     * @param endpoint Service endpoint (host:port)
     * @param logger Logger instance
     * @param metrics Metrics instance
     */
    CoreServiceClient(
        const std::string& endpoint,
        std::shared_ptr<logging::Logger> logger,
        std::shared_ptr<metrics::RequestMetrics> metrics
    );
    
    /**
     * @brief Destructor
     */
    ~CoreServiceClient() override;
    
    /**
     * @brief Check service health
     * @return True if service is healthy
     */
    bool checkHealth() override;
    
    /**
     * @brief Login with username and password
     * @param username Username
     * @param password Password
     * @return JSON response
     */
    web::json::value login(
        const std::string& username,
        const std::string& password
    );
    
    /**
     * @brief Refresh token
     * @param refresh_token Refresh token
     * @return JSON response
     */
    web::json::value refreshToken(
        const std::string& refresh_token
    );
    
    /**
     * @brief Validate token
     * @param token JWT token
     * @return JSON response
     */
    web::json::value validateToken(
        const std::string& token
    );
    
    /**
     * @brief Get user info
     * @param token JWT token
     * @return JSON response
     */
    web::json::value getUserInfo(
        const std::string& token
    );
    
    /**
     * @brief Get service configuration
     * @param token JWT token
     * @param service_name Service name
     * @return JSON response
     */
    web::json::value getServiceConfig(
        const std::string& token,
        const std::string& service_name
    );
    
    /**
     * @brief Send message to another service via core platform
     * @param token JWT token
     * @param target_service Target service name
     * @param message_type Message type
     * @param payload Message payload
     * @return JSON response
     */
    web::json::value sendMessage(
        const std::string& token,
        const std::string& target_service,
        const std::string& message_type,
        const web::json::value& payload
    );
    
private:
    /**
     * @brief Convert auth response proto to JSON
     * @param response Auth response proto
     * @return JSON representation
     */
    web::json::value convertAuthResponseToJson(
        const core_platform::AuthResponse& response
    );
    
    /**
     * @brief Convert token validation response proto to JSON
     * @param response Token validation response proto
     * @return JSON representation
     */
    web::json::value convertTokenValidationResponseToJson(
        const core_platform::TokenValidationResponse& response
    );
    
    /**
     * @brief Convert config response proto to JSON
     * @param response Config response proto
     * @return JSON representation
     */
    web::json::value convertConfigResponseToJson(
        const core_platform::ConfigResponse& response
    );
    
    /**
     * @brief Convert message response proto to JSON
     * @param response Message response proto
     * @return JSON representation
     */
    web::json::value convertMessageResponseToJson(
        const core_platform::MessageResponse& response
    );
    
    std::unique_ptr<core_platform::AuthService::Stub> auth_stub_;
    std::unique_ptr<core_platform::ConfigService::Stub> config_stub_;
    std::unique_ptr<core_platform::MessagingService::Stub> messaging_stub_;
    std::unique_ptr<core_platform::HealthService::Stub> health_stub_;
};

} // namespace services
} // namespace api_gateway