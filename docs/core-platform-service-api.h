#pragma once

#include <string>
#include <memory>
#include <functional>
#include <nlohmann/json.hpp>
#include "auth/jwt_auth_service.h"

namespace core_platform {
namespace api {

/**
 * @brief HTTP method types
 */
enum class HttpMethod {
    GET,
    POST,
    PUT,
    DELETE,
    OPTIONS
};

/**
 * @brief HTTP request structure
 */
struct HttpRequest {
    HttpMethod method;
    std::string path;
    std::unordered_map<std::string, std::string> headers;
    std::unordered_map<std::string, std::string> query_params;
    std::string body;
    std::unordered_map<std::string, std::string> path_params;
};

/**
 * @brief HTTP response structure
 */
struct HttpResponse {
    int status_code = 200;
    std::unordered_map<std::string, std::string> headers;
    std::string body;
    
    static HttpResponse ok(const nlohmann::json& data) {
        HttpResponse response;
        response.status_code = 200;
        response.headers["Content-Type"] = "application/json";
        response.body = data.dump();
        return response;
    }
    
    static HttpResponse created(const nlohmann::json& data) {
        HttpResponse response;
        response.status_code = 201;
        response.headers["Content-Type"] = "application/json";
        response.body = data.dump();
        return response;
    }
    
    static HttpResponse noContent() {
        HttpResponse response;
        response.status_code = 204;
        return response;
    }
    
    static HttpResponse badRequest(const std::string& message) {
        HttpResponse response;
        response.status_code = 400;
        response.headers["Content-Type"] = "application/json";
        response.body = nlohmann::json({{"error", message}}).dump();
        return response;
    }
    
    static HttpResponse unauthorized(const std::string& message) {
        HttpResponse response;
        response.status_code = 401;
        response.headers["Content-Type"] = "application/json";
        response.body = nlohmann::json({{"error", message}}).dump();
        return response;
    }
    
    static HttpResponse forbidden(const std::string& message) {
        HttpResponse response;
        response.status_code = 403;
        response.headers["Content-Type"] = "application/json";
        response.body = nlohmann::json({{"error", message}}).dump();
        return response;
    }
    
    static HttpResponse notFound(const std::string& message) {
        HttpResponse response;
        response.status_code = 404;
        response.headers["Content-Type"] = "application/json";
        response.body = nlohmann::json({{"error", message}}).dump();
        return response;
    }
    
    static HttpResponse internalError(const std::string& message) {
        HttpResponse response;
        response.status_code = 500;
        response.headers["Content-Type"] = "application/json";
        response.body = nlohmann::json({{"error", message}}).dump();
        return response;
    }
};

/**
 * @brief Route handler function type
 */
using RouteHandler = std::function<HttpResponse(const HttpRequest&)>;

/**
 * @brief API route structure
 */
struct Route {
    HttpMethod method;
    std::string path;
    RouteHandler handler;
    bool requires_auth;
    auth::PermissionLevel required_permission;
};

/**
 * @brief API router
 */
class Router {
public:
    /**
     * @brief Constructor
     * @param auth_service Authentication service
     * @param authz_service Authorization service
     */
    Router(
        std::shared_ptr<auth::IAuthService> auth_service,
        std::shared_ptr<auth::AuthorizationService> authz_service
    );
    
    /**
     * @brief Add a route
     * @param method HTTP method
     * @param path Route path
     * @param handler Route handler
     * @param requires_auth Whether authentication is required
     * @param required_permission Required permission level
     */
    void addRoute(
        HttpMethod method,
        const std::string& path,
        RouteHandler handler,
        bool requires_auth = true,
        auth::PermissionLevel required_permission = auth::PermissionLevel::READ
    );
    
    /**
     * @brief Handle an HTTP request
     * @param request HTTP request
     * @return HTTP response
     */
    HttpResponse handleRequest(const HttpRequest& request);
    
private:
    /**
     * @brief Get route for request
     * @param method HTTP method
     * @param path Request path
     * @return Route and path parameters
     */
    std::pair<Route*, std::unordered_map<std::string, std::string>> getRoute(
        HttpMethod method, 
        const std::string& path
    );
    
    /**
     * @brief Check if route pattern matches path
     * @param pattern Route pattern
     * @param path Request path
     * @return Path parameters if match, empty if no match
     */
    std::optional<std::unordered_map<std::string, std::string>> matchRoute(
        const std::string& pattern, 
        const std::string& path
    );
    
    std::vector<Route> routes_;
    std::shared_ptr<auth::IAuthService> auth_service_;
    std::shared_ptr<auth::AuthorizationService> authz_service_;
};

/**
 * @brief API server
 */
class ApiServer {
public:
    /**
     * @brief Constructor
     * @param host Host to bind to
     * @param port Port to bind to
     * @param auth_service Authentication service
     * @param authz_service Authorization service
     */
    ApiServer(
        const std::string& host,
        int port,
        std::shared_ptr<auth::IAuthService> auth_service,
        std::shared_ptr<auth::AuthorizationService> authz_service
    );
    
    /**
     * @brief Start the API server
     * @return True if started successfully
     */
    bool start();
    
    /**
     * @brief Stop the API server
     */
    void stop();
    
    /**
     * @brief Get the router
     * @return Router reference
     */
    Router& getRouter();
    
private:
    std::string host_;
    int port_;
    Router router_;
    std::atomic<bool> running_;
    std::thread server_thread_;
};

// Authentication API implementations

/**
 * @brief Login handler
 * @param auth_service Authentication service
 * @return Route handler
 */
RouteHandler createLoginHandler(std::shared_ptr<auth::IAuthService> auth_service);

/**
 * @brief Token refresh handler
 * @param auth_service Authentication service
 * @return Route handler
 */
RouteHandler createRefreshHandler(std::shared_ptr<auth::IAuthService> auth_service);

/**
 * @brief Current user info handler
 * @param auth_service Authentication service
 * @return Route handler
 */
RouteHandler createCurrentUserHandler(std::shared_ptr<auth::IAuthService> auth_service);

// Setup API routes
void setupAuthenticationApi(
    Router& router,
    std::shared_ptr<auth::IAuthService> auth_service
);

} // namespace api
} // namespace core_platform