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
        drogon::app().registerFilter([origins](const drogon::HttpRequestPtr& req,
                                            drogon::FilterCallback&& cb,
                                            drogon::FilterChainCallback&& ccb) {
            std::string origin = req->getHeader("Origin");
            bool originAllowed = false;
            
            for (const auto& allowedOrigin : origins) {
                if (origin == allowedOrigin || allowedOrigin == "*") {
                    originAllowed = true;
                    break;
                }
            }
            
            if (req->method() == drogon::Options) {
                auto resp = drogon::HttpResponse::newHttpResponse();
                resp->setStatusCode(drogon::k204NoContent);
                
                if (originAllowed) {
                    resp->addHeader("Access-Control-Allow-Origin", origin);
                }
                
                resp->addHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
                resp->addHeader("Access-Control-Allow-Headers", "Origin,Content-Type,Accept,Authorization,X-Requested-With");
                resp->addHeader("Access-Control-Max-Age", "1728000");
                cb(resp);
                return;
            }
            
            ccb();
            
            if (req->getResponse() && originAllowed) {
                req->getResponse()->addHeader("Access-Control-Allow-Origin", origin);
            }
        });
    }
}

// Implementation of ApiGateway::setupRateLimiting
inline void ApiGateway::setupRateLimiting() {
    if (config_.rateLimit.enabled) {
        auto rateLimitFilter = std::make_shared<RateLimitFilter>(config_.rateLimit);
        drogon::app().registerFilter(rateLimitFilter);
    }
}

// Implementation of ApiGateway::setupAuthentication
inline void ApiGateway::setupAuthentication() {
    auto jwtFilter = std::make_shared<JwtAuthFilter>(this, config_.auth);
    
    // Apply JWT filter to all endpoints except public ones
    for (const auto& publicEndpoint : config_.auth.publicEndpoints) {
        drogon::app().registerFilter(jwtFilter, publicEndpoint, drogon::FilterMethods::NotFound);
    }
    
    // Apply to all other endpoints
    drogon::app().registerFilter(jwtFilter);
}

// Implementation of ApiGateway::setupApiDocs
inline void ApiGateway::setupApiDocs() {
    // Register Swagger UI files as static resources
    drogon::app().setDocumentRoot("./swagger-ui");
    drogon::app().registerHandler(config_.swaggerPath,
        [](const drogon::HttpRequestPtr& req,
           std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
            // Redirect to Swagger UI
            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->setStatusCode(drogon::k302Found);
            resp->addHeader("Location", "/index.html?url=/api/swagger.json");
            callback(resp);
        },
        {drogon::Get}
    );
    
    // Register Swagger JSON endpoint
    drogon::app().registerHandler("/api/swagger.json",
        [](const drogon::HttpRequestPtr& req,
           std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
            // Generate Swagger JSON
            nlohmann::json swagger = {
                {"openapi", "3.0.0"},
                {"info", {
                    {"title", "Advanced Pilot Training Platform API"},
                    {"description", "API for the Advanced Pilot Training Platform"},
                    {"version", "1.0.0"}
                }},
                {"servers", {
                    {{"url", "/api"}}
                }},
                {"paths", {}} // Paths will be populated by controllers
            };
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(swagger);
            callback(resp);
        },
        {drogon::Get}
    );
}

// Implementation of ApiGateway::generateToken
inline Result<std::string, AptException> ApiGateway::generateToken(const JwtClaims& claims) {
    try {
        auto token = jwt::create()
            .set_issuer("apt-platform")
            .set_subject(claims.userId)
            .set_issued_at(std::chrono::system_clock::now())
            .set_expires_at(claims.expiresAt);
        
        // Add custom claims
        token.set_payload_claim("email", jwt::claim(claims.email));
        
        nlohmann::json rolesJson = claims.roles;
        token.set_payload_claim("roles", jwt::claim(rolesJson.dump()));
        
        if (claims.sessionId) {
            token.set_payload_claim("sessionId", jwt::claim(*claims.sessionId));
        }
        
        // Sign token
        return Result<std::string, AptException>::success(
            token.sign(jwt::algorithm::hs256{config_.auth.jwtSecret})
        );
    } catch (const std::exception& e) {
        return Result<std::string, AptException>::error(
            AptException(ErrorCode::SECURITY_TOKEN_ERROR, 
                         "Failed to generate JWT token: " + std::string(e.what()))
        );
    }
}

// Implementation of ApiGateway::validateToken
inline Result<TokenValidationResult, AptException> ApiGateway::validateToken(const std::string& token) {
    try {
        // Check if token is revoked
        {
            std::lock_guard<std::mutex> lock(revokedTokensMutex_);
            if (revokedTokens_.find(token) != revokedTokens_.end()) {
                TokenValidationResult result;
                result.valid = false;
                result.error = "Token has been revoked";
                return Result<TokenValidationResult, AptException>::success(result);
            }
        }
        
        // Verify token
        auto verifier = jwt::verify()
            .allow_algorithm(jwt::algorithm::hs256{config_.auth.jwtSecret})
            .with_issuer("apt-platform");
        
        auto decoded = jwt::decode(token);
        verifier.verify(decoded);
        
        // Extract claims
        JwtClaims claims;
        claims.userId = decoded.get_subject();
        claims.email = decoded.get_payload_claim("email").as_string();
        
        auto rolesJson = nlohmann::json::parse(decoded.get_payload_claim("roles").as_string());
        claims.roles = rolesJson.get<std::vector<std::string>>();
        
        claims.expiresAt = decoded.get_expires_at();
        
        if (decoded.has_payload_claim("sessionId")) {
            claims.sessionId = decoded.get_payload_claim("sessionId").as_string();
        }
        
        TokenValidationResult result;
        result.valid = true;
        result.claims = claims;
        
        return Result<TokenValidationResult, AptException>::success(result);
    } catch (const jwt::token_verification_exception& e) {
        TokenValidationResult result;
        result.valid = false;
        result.error = e.what();
        return Result<TokenValidationResult, AptException>::success(result);
    } catch (const std::exception& e) {
        return Result<TokenValidationResult, AptException>::error(
            AptException(ErrorCode::SECURITY_TOKEN_ERROR, 
                         "Failed to validate JWT token: " + std::string(e.what()))
        );
    }
}

// Implementation of ApiGateway::revokeToken
inline Result<void, AptException> ApiGateway::revokeToken(const std::string& token) {
    try {
        std::lock_guard<std::mutex> lock(revokedTokensMutex_);
        revokedTokens_.insert(token);
        return Result<void, AptException>::success({});
    } catch (const std::exception& e) {
        return Result<void, AptException>::error(
            AptException(ErrorCode::SECURITY_TOKEN_ERROR, 
                         "Failed to revoke token: " + std::string(e.what()))
        );
    }
}

// Implementation of ApiGateway::revokeSession
inline Result<void, AptException> ApiGateway::revokeSession(const std::string& sessionId) {
    // For a real implementation, we would track which tokens are associated with
    // which sessions and revoke all tokens for the session
    
    return Result<void, AptException>::success({});
}

// Implementation of ApiGateway::cleanupRevokedTokens
inline void ApiGateway::cleanupRevokedTokens() {
    try {
        std::lock_guard<std::mutex> lock(revokedTokensMutex_);
        
        auto now = std::chrono::system_clock::now();
        std::vector<std::string> tokensToRemove;
        
        for (const auto& token : revokedTokens_) {
            try {
                auto decoded = jwt::decode(token);
                auto expiry = decoded.get_expires_at();
                
                if (expiry <= now) {
                    tokensToRemove.push_back(token);
                }
            } catch (...) {
                // If the token can't be decoded, it's probably invalid anyway
                tokensToRemove.push_back(token);
            }
        }
        
        for (const auto& token : tokensToRemove) {
            revokedTokens_.erase(token);
        }
    } catch (const std::exception& e) {
        LOG_ERROR("api", "cleanupRevokedTokens") 
            << "Failed to cleanup revoked tokens: " << e.what();
    }
}

// Implementation of JwtAuthFilter::doFilter
inline void JwtAuthFilter::doFilter(const drogon::HttpRequestPtr& req,
                                   drogon::FilterCallback&& cb,
                                   drogon::FilterChainCallback&& ccb) {
    // Check if the endpoint is public
    std::string path = req->getPath();
    for (const auto& publicPath : config_.publicEndpoints) {
        if (path == publicPath || 
            (publicPath.back() == '*' && 
             path.substr(0, publicPath.size() - 1) == publicPath.substr(0, publicPath.size() - 1))) {
            ccb();
            return;
        }
    }
    
    // Check for HTTPS if required
    if (config_.requireHttps && req->getHeader("X-Forwarded-Proto") != "https") {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k403Forbidden);
        resp->setBody("HTTPS is required for this endpoint");
        cb(resp);
        return;
    }
    
    // Check for Authorization header
    std::string authHeader = req->getHeader("Authorization");
    if (authHeader.empty() || authHeader.substr(0, 7) != "Bearer ") {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k401Unauthorized);
        resp->setBody("Authorization required");
        cb(resp);
        return;
    }
    
    // Extract token
    std::string token = authHeader.substr(7);
    
    // Validate token
    auto result = gateway_->validateToken(token);
    if (result.isError()) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k500InternalServerError);
        resp->setBody("Error validating token");
        cb(resp);
        return;
    }
    
    auto validationResult = result.value();
    if (!validationResult.valid) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k401Unauthorized);
        resp->setBody("Invalid token" + (validationResult.error ? ": " + *validationResult.error : ""));
        cb(resp);
        return;
    }
    
    // Store claims in request attributes
    if (validationResult.claims) {
        auto claims = *validationResult.claims;
        req->setSession("userId", claims.userId);
        req->setSession("email", claims.email);
        
        nlohmann::json rolesJson = claims.roles;
        req->setSession("roles", rolesJson.dump());
        
        if (claims.sessionId) {
            req->setSession("sessionId", *claims.sessionId);
        }
    }
    
    // Continue filter chain
    ccb();
}

// Implementation of RateLimitFilter constructor
inline RateLimitFilter::RateLimitFilter(const RateLimitConfig& config)
    : config_(config) {
}

// Implementation of RateLimitFilter::doFilter
inline void RateLimitFilter::doFilter(const drogon::HttpRequestPtr& req,
                                     drogon::FilterCallback&& cb,
                                     drogon::FilterChainCallback&& ccb) {
    if (!config_.enabled) {
        ccb();
        return;
    }
    
    std::string clientIp = req->getPeerAddr().toIp();
    
    {
        std::lock_guard<std::mutex> lock(mutex_);
        
        // Clean up old requests
        cleanupOldRequests();
        
        // Get client's request history
        auto& requests = clientRequests_[clientIp];
        
        // Check rate limit
        if (requests.size() >= static_cast<size_t>(config_.requestsPerMinute)) {
            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->setStatusCode(drogon::k429TooManyRequests);
            resp->setBody("Rate limit exceeded");
            resp->addHeader("Retry-After", "60");
            cb(resp);
            return;
        }
        
        // Check burst limit
        auto now = std::chrono::system_clock::now();
        if (requests.size() >= static_cast<size_t>(config_.burstSize)) {
            auto burstWindow = std::chrono::seconds(60) / config_.burstSize;
            auto oldestInBurst = requests[requests.size() - config_.burstSize];
            
            if (now - oldestInBurst < burstWindow) {
                auto resp = drogon::HttpResponse::newHttpResponse();
                resp->setStatusCode(drogon::k429TooManyRequests);
                resp->setBody("Burst limit exceeded");
                
                auto retryAfter = std::chrono::duration_cast<std::chrono::seconds>(
                    burstWindow - (now - oldestInBurst)).count();
                resp->addHeader("Retry-After", std::to_string(retryAfter));
                
                cb(resp);
                return;
            }
        }
        
        // Add current request to history
        requests.push_back(now);
    }
    
    // Continue filter chain
    ccb();
}

// Implementation of RateLimitFilter::cleanupOldRequests
inline void RateLimitFilter::cleanupOldRequests() {
    auto now = std::chrono::system_clock::now();
    auto window = std::chrono::minutes(1);
    
    for (auto it = clientRequests_.begin(); it != clientRequests_.end();) {
        auto& requests = it->second;
        
        // Remove requests older than the window
        while (!requests.empty() && now - requests.front() > window) {
            requests.erase(requests.begin());
        }
        
        // Remove client if no recent requests
        if (requests.empty()) {
            it = clientRequests_.erase(it);
        } else {
            ++it;
        }
    }
}

// Implementation of BaseController::validateJsonRequest
inline Result<nlohmann::json, AptException> BaseController::validateJsonRequest(
    const drogon::HttpRequestPtr& req,
    const nlohmann::json& schema) {
    
    try {
        if (req->getContentType() != drogon::CT_APPLICATION_JSON) {
            return Result<nlohmann::json, AptException>::error(
                AptException(ErrorCode::API_CONTENT_TYPE_ERROR, "Expected Content-Type: application/json")
            );
        }
        
        std::string body = req->getBody();
        if (body.empty()) {
            return Result<nlohmann::json, AptException>::error(
                AptException(ErrorCode::API_REQUEST_VALIDATION_ERROR, "Request body is empty")
            );
        }
        
        // Parse JSON
        nlohmann::json json = nlohmann::json::parse(body);
        
        // TODO: Validate against schema
        // For a real implementation, we would use a JSON schema validator
        // like nlohmann/json-schema
        
        return Result<nlohmann::json, AptException>::success(json);
    } catch (const nlohmann::json::exception& e) {
        return Result<nlohmann::json, AptException>::error(
            AptException(ErrorCode::API_REQUEST_VALIDATION_ERROR, 
                         "Invalid JSON: " + std::string(e.what()))
        );
    } catch (const std::exception& e) {
        return Result<nlohmann::json, AptException>::error(
            AptException(ErrorCode::API_REQUEST_VALIDATION_ERROR, 
                         "Error validating request: " + std::string(e.what()))
        );
    }
}

// Implementation of BaseController::getTokenClaims
inline std::optional<JwtClaims> BaseController::getTokenClaims(const drogon::HttpRequestPtr& req) {
    auto session = req->getSession();
    if (!session) {
        return std::nullopt;
    }
    
    auto userId = session->get<std::string>("userId", "");
    if (userId.empty()) {
        return std::nullopt;
    }
    
    JwtClaims claims;
    claims.userId = userId;
    claims.email = session->get<std::string>("email", "");
    
    auto rolesJson = session->get<std::string>("roles", "[]");
    claims.roles = nlohmann::json::parse(rolesJson).get<std::vector<std::string>>();
    
    if (session->find("sessionId")) {
        claims.sessionId = session->get<std::string>("sessionId");
    }
    
    return claims;
}

// Implementation of BaseController::hasRole
inline bool BaseController::hasRole(const drogon::HttpRequestPtr& req, const std::string& role) {
    auto claims = getTokenClaims(req);
    if (!claims) {
        return false;
    }
    
    return std::find(claims->roles.begin(), claims->roles.end(), role) != claims->roles.end();
}

// Implementation of BaseController::exceptionToResponse
inline drogon::HttpResponsePtr BaseController::exceptionToResponse(const AptException& ex) {
    // Map error code to HTTP status
    drogon::HttpStatusCode statusCode;
    
    switch (ex.code()) {
        case ErrorCode::NOT_FOUND:
            statusCode = drogon::k404NotFound;
            break;
        case ErrorCode::INVALID_ARGUMENT:
        case ErrorCode::API_REQUEST_VALIDATION_ERROR:
            statusCode = drogon::k400BadRequest;
            break;
        case ErrorCode::PERMISSION_DENIED:
        case ErrorCode::USER_AUTHORIZATION_ERROR:
            statusCode = drogon::k403Forbidden;
            break;
        case ErrorCode::USER_AUTHENTICATION_ERROR:
            statusCode = drogon::k401Unauthorized;
            break;
        case ErrorCode::ALREADY_EXISTS:
            statusCode = drogon::k409Conflict;
            break;
        case ErrorCode::TIMEOUT:
            statusCode = drogon::k408RequestTimeout;
            break;
        case ErrorCode::RESOURCE_EXHAUSTED:
        case ErrorCode::API_RATE_LIMIT_EXCEEDED:
            statusCode = drogon::k429TooManyRequests;
            break;
        default:
            statusCode = drogon::k500InternalServerError;
    }
    
    // Create JSON response
    nlohmann::json error = {
        {"success", false},
        {"error", {
            {"code", static_cast<int>(ex.code())},
            {"message", ex.what()}
        }}
    };
    
    auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
    resp->setStatusCode(statusCode);
    
    return resp;
}

} // namespace api
} // namespace apt