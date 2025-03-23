#pragma once

#include <string>
#include <memory>
#include <vector>
#include <unordered_map>
#include <functional>
#include <chrono>
#include <optional>

#include <drogon/drogon.h>
#include <jwt-cpp/jwt.h>

#include "../core/error-handling.hpp"
#include "../core/logging-system.hpp"

namespace apt {
namespace api {

/**
 * API rate limit configuration
 */
struct RateLimitConfig {
    int requestsPerMinute = 60;
    int burstSize = 5;
    bool enabled = true;
};

/**
 * Authentication configuration
 */
struct AuthConfig {
    std::string jwtSecret;
    std::chrono::seconds tokenExpiration = std::chrono::hours(24);
    bool requireHttps = true;
    std::vector<std::string> allowedOrigins;
    std::vector<std::string> publicEndpoints;
};

/**
 * API Gateway configuration
 */
struct ApiGatewayConfig {
    std::string host = "0.0.0.0";
    int port = 8080;
    int threads = 0;  // 0 means auto-detect
    std::string logLevel = "info";
    std::chrono::seconds sessionTimeout = std::chrono::minutes(30);
    
    AuthConfig auth;
    RateLimitConfig rateLimit;
    
    std::string docsEndpoint = "/api/docs";
    bool enableSwagger = true;
    std::string swaggerPath = "/api/swagger";
};

/**
 * JWT token claims
 */
struct JwtClaims {
    std::string userId;
    std::string email;
    std::vector<std::string> roles;
    std::chrono::system_clock::time_point expiresAt;
    std::optional<std::string> sessionId;
};

/**
 * Token validation result
 */
struct TokenValidationResult {
    bool valid;
    std::optional<JwtClaims> claims;
    std::optional<std::string> error;
};

/**
 * API Gateway class for the Advanced Pilot Training Platform
 */
class ApiGateway {
public:
    /**
     * Constructor
     */
    explicit ApiGateway(const ApiGatewayConfig& config);
    
    /**
     * Initialize the API Gateway
     */
    Result<void, AptException> initialize();
    
    /**
     * Start the API Gateway
     */
    Result<void, AptException> start();
    
    /**
     * Stop the API Gateway
     */
    Result<void, AptException> stop();
    
    /**
     * Generate a JWT token for a user
     */
    Result<std::string, AptException> generateToken(const JwtClaims& claims);
    
    /**
     * Validate a JWT token
     */
    Result<TokenValidationResult, AptException> validateToken(const std::string& token);
    
    /**
     * Revoke a token or session
     */
    Result<void, AptException> revokeToken(const std::string& token);
    Result<void, AptException> revokeSession(const std::string& sessionId);
    
    /**
     * Get the underlying Drogon application
     */
    drogon::app& getApp() { return drogon::app(); }
    
private:
    ApiGatewayConfig config_;
    std::unordered_set<std::string> revokedTokens_;
    std::mutex revokedTokensMutex_;
    
    // Set up middleware
    void setupMiddleware();
    
    // Set up CORS
    void setupCORS();
    
    // Set up rate limiting
    void setupRateLimiting();
    
    // Set up JWT authentication
    void setupAuthentication();
    
    // Set up API documentation
    void setupApiDocs();
    
    // Clean up expired tokens
    void cleanupRevokedTokens();
};

/**
 * Authentication middleware for Drogon controllers
 */
class JwtAuthFilter : public drogon::HttpFilter<JwtAuthFilter> {
public:
    JwtAuthFilter(ApiGateway* gateway, const AuthConfig& config)
        : gateway_(gateway), config_(config) {}
    
    void doFilter(const drogon::HttpRequestPtr& req,
                 drogon::FilterCallback&& cb,
                 drogon::FilterChainCallback&& ccb) override;
    
private:
    ApiGateway* gateway_;
    AuthConfig config_;
};

/**
 * Rate limiting middleware for Drogon controllers
 */
class RateLimitFilter : public drogon::HttpFilter<RateLimitFilter> {
public:
    explicit RateLimitFilter(const RateLimitConfig& config);
    
    void doFilter(const drogon::HttpRequestPtr& req,
                 drogon::FilterCallback&& cb,
                 drogon::FilterChainCallback&& ccb) override;
    
private:
    RateLimitConfig config_;
    std::unordered_map<std::string, std::vector<std::chrono::system_clock::time_point>> clientRequests_;
    std::mutex mutex_;
    
    void cleanupOldRequests();
};

/**
 * Base controller interface with common functionality
 */
class BaseController : public drogon::HttpController<BaseController> {
public:
    virtual ~BaseController() = default;
    
protected:
    /**
     * Validate request data against a JSON schema
     */
    Result<nlohmann::json, AptException> validateJsonRequest(
        const drogon::HttpRequestPtr& req,
        const nlohmann::json& schema);
    
    /**
     * Extract claims from the request
     */
    std::optional<JwtClaims> getTokenClaims(const drogon::HttpRequestPtr& req);
    
    /**
     * Check if the user has the required role
     */
    bool hasRole(const drogon::HttpRequestPtr& req, const std::string& role);
    
    /**
     * Convert AptException to HTTP response
     */
    drogon::HttpResponsePtr exceptionToResponse(const AptException& ex);
    
    /**
     * Create a standardized JSON success response
     */
    template<typename T>
    drogon::HttpResponsePtr createJsonResponse(T&& data, drogon::HttpStatusCode code = drogon::k200OK) {
        nlohmann::json response = {
            {"success", true},
            {"data", std::forward<T>(data)}
        };
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(response);
        resp->setStatusCode(code);
        return resp;
    }
};

// Implementation of ApiGateway constructor
inline ApiGateway::ApiGateway(const ApiGatewayConfig& config)
    : config_(config) {
}

// Implementation of ApiGateway::initialize
inline Result<void, AptException> ApiGateway::initialize() {
    try {
        auto& app = drogon::app();
        
        // Set server options
        app.setLogLevel(
            config_.logLevel == "trace" ? trantor::Logger::kTrace :
            config_.logLevel == "debug" ? trantor::Logger::kDebug :
            config_.logLevel == "info" ? trantor::Logger::kInfo :
            config_.logLevel == "warn" ? trantor::Logger::kWarn :
            trantor::Logger::kError
        );
        
        app.setThreadNum(config_.threads);
        app.addListener(config_.host, config_.port);
        
        // Set session options
        app.setSessionTimeout(
            static_cast<uint64_t>(config_.sessionTimeout.count()));
        
        // Set up middleware
        setupMiddleware();
        
        // Set up documentation
        if (config_.enableSwagger) {
            setupApiDocs();
        }
        
        return Result<void, AptException>::success({});
    } catch (const std::exception& e) {
        return Result<void, AptException>::error(
            AptException(ErrorCode::API_ENDPOINT_NOT_FOUND, 
                         "Failed to initialize API Gateway: " + std::string(e.what()))
        );
    }
}

// Implementation of ApiGateway::start
inline Result<void, AptException> ApiGateway::start() {
    try {
        drogon::app().run();
        return Result<void, AptException>::success({});
    } catch (const std::exception& e) {
        return Result<void, AptException>::error(
            AptException(ErrorCode::UNKNOWN_ERROR, 
                         "Failed to start API Gateway: " + std::string(e.what()))
        );
    }
}

// Implementation of ApiGateway::stop
inline Result<void, AptException> ApiGateway::stop() {
    try {
        drogon::app().quit();
        return Result<void, AptException>::success({});
    } catch (const std::exception& e) {
        return Result<void, AptException>::error(
            AptException(ErrorCode::UNKNOWN_ERROR, 
                         "Failed to stop API Gateway: " + std::string(e.what()))
        );
    }
}

// Implementation of ApiGateway::setupMiddleware
inline void ApiGateway::setupMiddleware() {
    // Set up CORS
    setupCORS();
    
    // Set up rate limiting
    setupRateLimiting();
    
    // Set up authentication
    setupAuthentication();
}

// Implementation of ApiGateway::setupCORS
inline void ApiGateway::setupCORS() {
    auto& origins = config_.auth.allowedOrigins;
    
    // If no origins specified, allow all
    if (origins.empty()) {
        drogon::app().registerFilter([](const drogon::HttpRequestPtr& req,
                                     drogon::FilterCallback&& cb,
                                     drogon::FilterChainCallback&& ccb) {
            if (req->method() == drogon::Options) {
                auto resp = drogon::HttpResponse::newHttpResponse();
                resp->setStatusCode(drogon::k204NoContent);
                resp->addHeader("Access-Control-Allow-Origin", "*");
                resp->addHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
                resp->addHeader("Access-Control-Allow-Headers", "Origin,Content-Type,Accept,Authorization,X-Requested-With");
                resp->addHeader("Access-Control-Max-Age", "1728000");
                cb(resp);
                return;
            }
            
            ccb();
            
            if (req->getResponse()) {
                req->getResponse()->addHeader("Access-Control-Allow-Origin", "*");
            }
        });
    } else {
        // Allow specific origins
        drogon::app().