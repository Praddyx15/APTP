#include "api/api_server.h"
#include "logging/logger.h"
#include "metrics/metrics_service.h"

#include <algorithm>
#include <regex>
#include <sstream>
#include <thread>
#include <chrono>

// This would be replaced with actual HTTP server like Crow or RESTinio
// For simplicity, we're mocking the HTTP server implementation

namespace core_platform {
namespace api {

// Convert string to HTTP method
HttpMethod methodFromString(const std::string& method) {
    if (method == "GET") return HttpMethod::GET;
    if (method == "POST") return HttpMethod::POST;
    if (method == "PUT") return HttpMethod::PUT;
    if (method == "DELETE") return HttpMethod::DELETE;
    if (method == "OPTIONS") return HttpMethod::OPTIONS;
    
    throw std::invalid_argument("Invalid HTTP method: " + method);
}

// Convert HTTP method to string
std::string methodToString(HttpMethod method) {
    switch (method) {
        case HttpMethod::GET: return "GET";
        case HttpMethod::POST: return "POST";
        case HttpMethod::PUT: return "PUT";
        case HttpMethod::DELETE: return "DELETE";
        case HttpMethod::OPTIONS: return "OPTIONS";
        default: return "UNKNOWN";
    }
}

// Router implementation
Router::Router(
    std::shared_ptr<auth::IAuthService> auth_service,
    std::shared_ptr<auth::AuthorizationService> authz_service
) :
    auth_service_(std::move(auth_service)),
    authz_service_(std::move(authz_service)) {
}

void Router::addRoute(
    HttpMethod method,
    const std::string& path,
    RouteHandler handler,
    bool requires_auth,
    auth::PermissionLevel required_permission
) {
    Route route;
    route.method = method;
    route.path = path;
    route.handler = std::move(handler);
    route.requires_auth = requires_auth;
    route.required_permission = required_permission;
    
    routes_.push_back(std::move(route));
    
    logging::Logger::getInstance().debug("Added route: {} {}", 
        methodToString(method), path);
}

HttpResponse Router::handleRequest(const HttpRequest& request) {
    // Find matching route
    auto [route, path_params] = getRoute(request.method, request.path);
    
    if (!route) {
        return HttpResponse::notFound("Route not found: " + request.path);
    }
    
    // Check authentication if required
    if (route->requires_auth) {
        auto it = request.headers.find("Authorization");
        if (it == request.headers.end()) {
            return HttpResponse::unauthorized("Authorization header missing");
        }
        
        std::string auth_header = it->second;
        if (auth_header.substr(0, 7) != "Bearer ") {
            return HttpResponse::unauthorized("Invalid authorization format, expected Bearer token");
        }
        
        std::string token = auth_header.substr(7);
        
        // Validate token
        if (!auth_service_->validateToken(token)) {
            return HttpResponse::unauthorized("Invalid or expired token");
        }
        
        // Check authorization
        if (route->required_permission != auth::PermissionLevel::NONE) {
            if (!authz_service_->hasPermission(token, request.path, route->required_permission)) {
                return HttpResponse::forbidden("Insufficient permissions");
            }
        }
    }
    
    // Create a copy of the request with path parameters
    HttpRequest req_with_params = request;
    req_with_params.path_params = path_params;
    
    // Metrics for request handling
    auto& request_counter = metrics::MetricsService::getInstance().createCounter(
        "http_requests_total",
        "Total number of HTTP requests",
        {
            {"method", methodToString(request.method)},
            {"path", route->path}
        }
    );
    
    auto& request_duration = metrics::MetricsService::getInstance().createHistogram(
        "http_request_duration_seconds",
        "HTTP request duration in seconds",
        {
            {"method", methodToString(request.method)},
            {"path", route->path}
        }
    );
    
    // Increment request counter
    request_counter.Increment();
    
    // Time the request
    auto start_time = std::chrono::steady_clock::now();
    
    try {
        // Handle the request
        HttpResponse response = route->handler(req_with_params);
        
        // Record request duration
        auto end_time = std::chrono::steady_clock::now();
        double duration = std::chrono::duration<double>(end_time - start_time).count();
        request_duration.Observe(duration);
        
        // Track response status codes
        auto& status_counter = metrics::MetricsService::getInstance().createCounter(
            "http_response_status",
            "HTTP response status codes",
            {
                {"method", methodToString(request.method)},
                {"path", route->path},
                {"status", std::to_string(response.status_code)}
            }
        );
        status_counter.Increment();
        
        return response;
    }
    catch (const std::exception& e) {
        // Record request duration for errors
        auto end_time = std::chrono::steady_clock::now();
        double duration = std::chrono::duration<double>(end_time - start_time).count();
        request_duration.Observe(duration);
        
        // Log error
        logging::Logger::getInstance().error("Error handling request: {}", e.what());
        
        // Track error responses
        auto& error_counter = metrics::MetricsService::getInstance().createCounter(
            "http_response_status",
            "HTTP response status codes",
            {
                {"method", methodToString(request.method)},
                {"path", route->path},
                {"status", "500"}
            }
        );
        error_counter.Increment();
        
        return HttpResponse::internalError(e.what());
    }
}

std::pair<Route*, std::unordered_map<std::string, std::string>> Router::getRoute(
    HttpMethod method, 
    const std::string& path
) {
    for (auto& route : routes_) {
        if (route.method == method) {
            auto path_params = matchRoute(route.path, path);
            if (path_params) {
                return {&route, *path_params};
            }
        }
    }
    
    return {nullptr, {}};
}

std::optional<std::unordered_map<std::string, std::string>> Router::matchRoute(
    const std::string& pattern, 
    const std::string& path
) {
    // Simple path matching with parameters
    std::vector<std::string> pattern_parts;
    std::vector<std::string> path_parts;
    
    std::istringstream pattern_stream(pattern);
    std::istringstream path_stream(path);
    
    std::string part;
    while (std::getline(pattern_stream, part, '/')) {
        if (!part.empty()) {
            pattern_parts.push_back(part);
        }
    }
    
    while (std::getline(path_stream, part, '/')) {
        if (!part.empty()) {
            path_parts.push_back(part);
        }
    }
    
    if (pattern_parts.size() != path_parts.size()) {
        return std::nullopt;
    }
    
    std::unordered_map<std::string, std::string> params;
    
    for (size_t i = 0; i < pattern_parts.size(); ++i) {
        const auto& pattern_part = pattern_parts[i];
        const auto& path_part = path_parts[i];
        
        if (pattern_part[0] == ':') {
            // This is a parameter
            std::string param_name = pattern_part.substr(1);
            params[param_name] = path_part;
        }
        else if (pattern_part != path_part) {
            // Static part doesn't match
            return std::nullopt;
        }
    }
    
    return params;
}

// ApiServer implementation
ApiServer::ApiServer(
    const std::string& host,
    int port,
    std::shared_ptr<auth::IAuthService> auth_service,
    std::shared_ptr<auth::AuthorizationService> authz_service
) :
    host_(host),
    port_(port),
    router_(auth_service, authz_service),
    running_(false) {
}

bool ApiServer::start() {
    if (running_) {
        logging::Logger::getInstance().warn("API server already running");
        return true;
    }
    
    running_ = true;
    
    // In a real implementation, this would start an HTTP server
    // For this example, we're just logging that it started
    logging::Logger::getInstance().info("API server started on {}:{}", host_, port_);
    
    return true;
}

void ApiServer::stop() {
    if (!running_) {
        return;
    }
    
    running_ = false;
    
    // In a real implementation, this would stop the HTTP server
    logging::Logger::getInstance().info("API server stopped");
}

Router& ApiServer::getRouter() {
    return router_;
}

// Authentication API handlers
RouteHandler createLoginHandler(std::shared_ptr<auth::IAuthService> auth_service) {
    return [auth_service](const HttpRequest& request) -> HttpResponse {
        try {
            // Parse request body
            nlohmann::json request_data = nlohmann::json::parse(request.body);
            
            // Validate required fields
            if (!request_data.contains("username") || !request_data.contains("password")) {
                return HttpResponse::badRequest("Missing required fields: username and password");
            }
            
            // Create credentials
            auth::Credentials credentials;
            credentials.username = request_data["username"];
            credentials.password = request_data["password"];
            
            // Check for certificate
            if (request_data.contains("certificate")) {
                credentials.certificate = request_data["certificate"];
            }
            
            // Authenticate
            auth::AuthResult result = auth_service->authenticate(credentials);
            
            if (!result.success) {
                return HttpResponse::unauthorized(result.error_message);
            }
            
            // Generate tokens
            // In a real system, user roles would come from a database
            std::vector<std::string> roles;
            if (result.user_id == "admin") {
                roles = {"admin", "instructor", "trainee"};
            }
            else if (result.user_id == "instructor") {
                roles = {"instructor", "trainee"};
            }
            else {
                roles = {"trainee"};
            }
            
            auth::TokenData token_data = auth_service->generateTokens(result.user_id, roles);
            
            // Create response
            nlohmann::json response = {
                {"token", token_data.token},
                {"refresh_token", token_data.refresh_token},
                {"expires_in", std::chrono::duration_cast<std::chrono::seconds>(
                    token_data.expiry - std::chrono::system_clock::now()).count()},
                {"user_id", token_data.user_id},
                {"roles", token_data.roles}
            };
            
            return HttpResponse::ok(response);
        }
        catch (const nlohmann::json::exception& e) {
            return HttpResponse::badRequest("Invalid JSON: " + std::string(e.what()));
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Login error: {}", e.what());
            return HttpResponse::internalError(e.what());
        }
    };
}

RouteHandler createRefreshHandler(std::shared_ptr<auth::IAuthService> auth_service) {
    return [auth_service](const HttpRequest& request) -> HttpResponse {
        try {
            // Parse request body
            nlohmann::json request_data = nlohmann::json::parse(request.body);
            
            // Validate required fields
            if (!request_data.contains("refresh_token")) {
                return HttpResponse::badRequest("Missing required field: refresh_token");
            }
            
            std::string refresh_token = request_data["refresh_token"];
            
            // Refresh token
            std::optional<auth::TokenData> token_data = auth_service->refreshToken(refresh_token);
            
            if (!token_data) {
                return HttpResponse::unauthorized("Invalid or expired refresh token");
            }
            
            // Create response
            nlohmann::json response = {
                {"token", token_data->token},
                {"refresh_token", token_data->refresh_token},
                {"expires_in", std::chrono::duration_cast<std::chrono::seconds>(
                    token_data->expiry - std::chrono::system_clock::now()).count()},
                {"user_id", token_data->user_id},
                {"roles", token_data->roles}
            };
            
            return HttpResponse::ok(response);
        }
        catch (const nlohmann::json::exception& e) {
            return HttpResponse::badRequest("Invalid JSON: " + std::string(e.what()));
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Token refresh error: {}", e.what());
            return HttpResponse::internalError(e.what());
        }
    };
}

RouteHandler createCurrentUserHandler(std::shared_ptr<auth::IAuthService> auth_service) {
    return [auth_service](const HttpRequest& request) -> HttpResponse {
        try {
            // Get token from Authorization header
            auto it = request.headers.find("Authorization");
            if (it == request.headers.end()) {
                return HttpResponse::unauthorized("Authorization header missing");
            }
            
            std::string auth_header = it->second;
            if (auth_header.substr(0, 7) != "Bearer ") {
                return HttpResponse::unauthorized("Invalid authorization format, expected Bearer token");
            }
            
            std::string token = auth_header.substr(7);
            
            // Validate token
            if (!auth_service->validateToken(token)) {
                return HttpResponse::unauthorized("Invalid or expired token");
            }
            
            // Parse token to get user data
            auto decoded = jwt::decode(token);
            
            // Get user ID
            std::string user_id = decoded.get_subject();
            
            // Get roles
            std::vector<std::string> roles;
            if (decoded.has_payload_claim("roles")) {
                std::string roles_json = decoded.get_payload_claim("roles").as_string();
                roles = nlohmann::json::parse(roles_json);
            }
            
            // Create response
            nlohmann::json response = {
                {"user_id", user_id},
                {"roles", roles}
            };
            
            return HttpResponse::ok(response);
        }
        catch (const std::exception& e) {
            logging::Logger::getInstance().error("Current user info error: {}", e.what());
            return HttpResponse::internalError(e.what());
        }
    };
}

void setupAuthenticationApi(
    Router& router,
    std::shared_ptr<auth::IAuthService> auth_service
) {
    // Login endpoint - POST /auth/login
    router.addRoute(
        HttpMethod::POST,
        "/auth/login",
        createLoginHandler(auth_service),
        false,  // No authentication required for login
        auth::PermissionLevel::NONE
    );
    
    // Token refresh endpoint - POST /auth/refresh
    router.addRoute(
        HttpMethod::POST,
        "/auth/refresh",
        createRefreshHandler(auth_service),
        false,  // No authentication required for refresh
        auth::PermissionLevel::NONE
    );
    
    // Current user info endpoint - GET /auth/me
    router.addRoute(
        HttpMethod::GET,
        "/auth/me",
        createCurrentUserHandler(auth_service),
        true,  // Authentication required
        auth::PermissionLevel::NONE
    );
    
    logging::Logger::getInstance().info("Authentication API routes set up");
}

} // namespace api
} // namespace core_platform