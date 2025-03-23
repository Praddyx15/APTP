#include <drogon/drogon.h>
#include <json/json.h>
#include <string>
#include <vector>
#include <map>
#include <memory>
#include <mutex>
#include "service_registry.h"
#include "request_router.h"
#include "auth_validator.h"
#include "rate_limiter.h"

namespace atp {
namespace gateway {

class APIGatewayService : public drogon::HttpController<APIGatewayService> {
public:
    METHOD_LIST_BEGIN
    // Health check endpoint
    ADD_METHOD_TO(APIGatewayService::getHealth, "/api/health", drogon::Get);
    
    // API Documentation
    ADD_METHOD_TO(APIGatewayService::getAPISpec, "/api/spec", drogon::Get);

    // Proxy all other requests
    ADD_METHOD_TO(APIGatewayService::proxyRequest, "/api/{path}", drogon::Get, drogon::Post, drogon::Put, drogon::Delete, drogon::Options, "path={.*}");
    ADD_METHOD_TO(APIGatewayService::proxyRequest, "/api/{path1}/{path2}", drogon::Get, drogon::Post, drogon::Put, drogon::Delete, drogon::Options, "path1={.*},path2={.*}");
    ADD_METHOD_TO(APIGatewayService::proxyRequest, "/api/{path1}/{path2}/{path3}", drogon::Get, drogon::Post, drogon::Put, drogon::Delete, drogon::Options, "path1={.*},path2={.*},path3={.*}");
    ADD_METHOD_TO(APIGatewayService::proxyRequest, "/api/{path1}/{path2}/{path3}/{path4}", drogon::Get, drogon::Post, drogon::Put, drogon::Delete, drogon::Options, "path1={.*},path2={.*},path3={.*},path4={.*}");
    ADD_METHOD_TO(APIGatewayService::proxyRequest, "/api/{path1}/{path2}/{path3}/{path4}/{path5}", drogon::Get, drogon::Post, drogon::Put, drogon::Delete, drogon::Options, "path1={.*},path2={.*},path3={.*},path4={.*},path5={.*}");
    METHOD_LIST_END

    APIGatewayService();

    void getHealth(const drogon::HttpRequestPtr& req, 
                  std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void getAPISpec(const drogon::HttpRequestPtr& req,
                   std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void proxyRequest(const drogon::HttpRequestPtr& req,
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback);

private:
    std::shared_ptr<ServiceRegistry> serviceRegistry_;
    std::shared_ptr<RequestRouter> router_;
    std::shared_ptr<AuthValidator> authValidator_;
    std::shared_ptr<RateLimiter> rateLimiter_;
    
    // Monitoring
    std::atomic<uint64_t> requestCount_;
    std::atomic<uint64_t> errorCount_;
    std::map<std::string, std::atomic<uint64_t>> serviceCallCounts_;
    std::mutex serviceCallCountsMutex_;
    
    // Cache for API specifications
    Json::Value apiSpecCache_;
    
    // Helper methods
    bool validateRequest(const drogon::HttpRequestPtr& req, std::string& userId, std::string& errorMessage);
    void forwardToService(const drogon::HttpRequestPtr& req, 
                         std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                         const std::string& serviceName,
                         const std::string& endpoint);
    void recordServiceCall(const std::string& serviceName);
    bool checkRateLimit(const drogon::HttpRequestPtr& req, std::string& errorMessage);
    void loadAPISpecifications();
    
    // Circuit breaker implementation
    std::map<std::string, int> serviceErrorCounts_;
    std::map<std::string, bool> serviceCircuitOpen_;
    std::map<std::string, std::chrono::time_point<std::chrono::system_clock>> serviceCircuitResetTime_;
    std::mutex circuitBreakerMutex_;
    
    bool isCircuitOpen(const std::string& serviceName);
    void recordServiceError(const std::string& serviceName);
    void resetCircuit(const std::string& serviceName);
};

APIGatewayService::APIGatewayService() : requestCount_(0), errorCount_(0) {
    // Initialize components
    serviceRegistry_ = std::make_shared<ServiceRegistry>();
    router_ = std::make_shared<RequestRouter>(serviceRegistry_);
    authValidator_ = std::make_shared<AuthValidator>();
    rateLimiter_ = std::make_shared<RateLimiter>();
    
    // Load service registry
    serviceRegistry_->loadServices("services.json");
    
    // Load API specifications
    loadAPISpecifications();
}

void APIGatewayService::getHealth(const drogon::HttpRequestPtr& req, 
                std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    try {
        // Check service health
        std::vector<std::pair<std::string, bool>> serviceHealth = serviceRegistry_->checkServiceHealth();
        
        // Prepare response
        Json::Value result;
        result["status"] = "ok";
        result["version"] = "1.0.0";
        result["timestamp"] = drogon::utils::getFormattedDate();
        
        // Add request statistics
        result["request_count"] = static_cast<Json::Int64>(requestCount_.load());
        result["error_count"] = static_cast<Json::Int64>(errorCount_.load());
        
        // Add service health
        Json::Value services(Json::arrayValue);
        bool allHealthy = true;
        
        for (const auto& service : serviceHealth) {
            Json::Value serviceInfo;
            serviceInfo["name"] = service.first;
            serviceInfo["healthy"] = service.second;
            
            if (!service.second) {
                allHealthy = false;
            }
            
            // Add call count if available
            {
                std::lock_guard<std::mutex> lock(serviceCallCountsMutex_);
                auto it = serviceCallCounts_.find(service.first);
                if (it != serviceCallCounts_.end()) {
                    serviceInfo["call_count"] = static_cast<Json::Int64>(it->second.load());
                }
            }
            
            // Add circuit breaker status
            {
                std::lock_guard<std::mutex> lock(circuitBreakerMutex_);
                auto it = serviceCircuitOpen_.find(service.first);
                if (it != serviceCircuitOpen_.end()) {
                    serviceInfo["circuit_open"] = it->second;
                } else {
                    serviceInfo["circuit_open"] = false;
                }
            }
            
            services.append(serviceInfo);
        }
        
        result["services"] = services;
        result["all_healthy"] = allHealthy;
        
        // Create response
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
        
        // If not all services are healthy, return 503 status
        if (!allHealthy) {
            resp->setStatusCode(drogon::k503ServiceUnavailable);
        }
        
        callback(resp);
    }
    catch (const std::exception& e) {
        Json::Value error;
        error["status"] = "error";
        error["message"] = e.what();
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
        resp->setStatusCode(drogon::k500InternalServerError);
        
        callback(resp);
    }
}

void APIGatewayService::getAPISpec(const drogon::HttpRequestPtr& req,
                 std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    try {
        // Extract query parameters
        auto params = req->getParameters();
        std::string format = params.find("format") != params.end() ? params["format"] : "json";
        std::string service = params.find("service") != params.end() ? params["service"] : "";
        
        // Prepare response based on format and service
        if (format == "yaml") {
            // Return YAML format (not implemented in this example)
            auto resp = drogon::HttpResponse::newHttpResponse();
            resp->setStatusCode(drogon::k501NotImplemented);
            resp->setBody("YAML format not implemented");
            callback(resp);
            return;
        }
        
        // Filter by service if specified
        if (!service.empty()) {
            if (apiSpecCache_.isMember(service)) {
                auto resp = drogon::HttpResponse::newHttpJsonResponse(apiSpecCache_[service]);
                callback(resp);
            } else {
                Json::Value error;
                error["status"] = "error";
                error["message"] = "Service not found: " + service;
                
                auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
                resp->setStatusCode(drogon::k404NotFound);
                callback(resp);
            }
        } else {
            // Return full API spec
            auto resp = drogon::HttpResponse::newHttpJsonResponse(apiSpecCache_);
            callback(resp);
        }
    }
    catch (const std::exception& e) {
        Json::Value error;
        error["status"] = "error";
        error["message"] = e.what();
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
        resp->setStatusCode(drogon::k500InternalServerError);
        
        callback(resp);
    }
}

void APIGatewayService::proxyRequest(const drogon::HttpRequestPtr& req,
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    // Increment request count
    requestCount_++;
    
    try {
        // Extract path components
        std::string path = req->getPath();
        path = path.substr(5);  // Remove /api/ prefix
        
        // Check rate limit
        std::string rateLimitError;
        if (!checkRateLimit(req, rateLimitError)) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = rateLimitError;
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k429TooManyRequests);
            callback(resp);
            return;
        }
        
        // Authenticate and authorize request
        std::string userId;
        std::string authError;
        
        if (!validateRequest(req, userId, authError)) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = authError;
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k401Unauthorized);
            callback(resp);
            return;
        }
        
        // Route the request to appropriate service
        auto [serviceName, endpoint] = router_->routeRequest(path, req->getMethod());
        
        if (serviceName.empty()) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "No service found for path: " + path;
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k404NotFound);
            
            callback(resp);
            return;
        }
        
        // Check if circuit is open for this service
        if (isCircuitOpen(serviceName)) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Service temporarily unavailable: " + serviceName;
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k503ServiceUnavailable);
            
            callback(resp);
            return;
        }
        
        // Forward request to service
        forwardToService(req, std::move(callback), serviceName, endpoint);
    }
    catch (const std::exception& e) {
        // Increment error count
        errorCount_++;
        
        Json::Value error;
        error["status"] = "error";
        error["message"] = e.what();
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
        resp->setStatusCode(drogon::k500InternalServerError);
        
        callback(resp);
    }
}

bool APIGatewayService::validateRequest(const drogon::HttpRequestPtr& req, std::string& userId, std::string& errorMessage) {
    // Skip authentication for OPTIONS requests (for CORS support)
    if (req->getMethod() == drogon::Options) {
        return true;
    }
    
    // Skip authentication for public endpoints
    std::string path = req->getPath();
    
    // List of paths that don't require authentication
    std::vector<std::string> publicPaths = {
        "/api/health",
        "/api/spec",
        "/api/auth/login"
    };
    
    for (const auto& publicPath : publicPaths) {
        if (path == publicPath) {
            return true;
        }
    }
    
    // Extract JWT token from Authorization header
    std::string token;
    
    auto authHeader = req->getHeader("Authorization");
    if (authHeader.empty()) {
        errorMessage = "Missing Authorization header";
        return false;
    }
    
    // Check for Bearer token
    if (authHeader.substr(0, 7) != "Bearer ") {
        errorMessage = "Invalid Authorization header format";
        return false;
    }
    
    token = authHeader.substr(7);
    
    // Validate token
    if (!authValidator_->validateToken(token, userId, errorMessage)) {
        return false;
    }
    
    // Add user ID to request for downstream services
    req->addHeader("X-User-ID", userId);
    
    return true;
}

void APIGatewayService::forwardToService(const drogon::HttpRequestPtr& req, 
                       std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                       const std::string& serviceName,
                       const std::string& endpoint) {
    // Record service call
    recordServiceCall(serviceName);
    
    // Get service URL
    std::string serviceUrl = serviceRegistry_->getServiceUrl(serviceName);
    
    if (serviceUrl.empty()) {
        Json::Value error;
        error["status"] = "error";
        error["message"] = "Service not found: " + serviceName;
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
        resp->setStatusCode(drogon::k404NotFound);
        
        callback(resp);
        return;
    }
    
    // Construct full URL
    std::string url = serviceUrl + endpoint;
    
    // Create HTTP client
    auto client = drogon::HttpClient::newHttpClient(url);
    
    // Forward original headers
    auto newReq = drogon::HttpRequest::newHttpRequest();
    newReq->setMethod(req->getMethod());
    newReq->setPath(endpoint);
    
    // Copy query parameters
    for (auto& param : req->getParameters()) {
        newReq->setParameter(param.first, param.second);
    }
    
    // Copy headers (except Host)
    for (auto& header : req->headers()) {
        if (header.first != "Host") {
            newReq->addHeader(header.first, header.second);
        }
    }
    
    // Add X-Forwarded headers
    newReq->addHeader("X-Forwarded-For", req->getPeerAddr().toIp());
    newReq->addHeader("X-Forwarded-Proto", req->isSSL() ? "https" : "http");
    newReq->addHeader("X-Forwarded-Host", req->getHeader("Host"));
    
    // Add X-Gateway headers for tracing
    newReq->addHeader("X-Gateway-Service", "api-gateway");
    newReq->addHeader("X-Gateway-Request-ID", generateRequestId());
    
    // Copy body if any
    if (req->getContentLength() > 0 && req->body().length() > 0) {
        newReq->setBody(req->body());
        newReq->setContentTypeCode(req->getContentType());
    }
    
    // Send the request
    client->sendRequest(newReq, [this, callback, serviceName](drogon::ReqResult result, const drogon::HttpResponsePtr& response) {
        if (result != drogon::ReqResult::Ok) {
            // Record service error
            recordServiceError(serviceName);
            
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Failed to connect to service: " + serviceName;
            
            auto errResp = drogon::HttpResponse::newHttpJsonResponse(error);
            errResp->setStatusCode(drogon::k502BadGateway);
            
            callback(errResp);
            return;
        }
        
        // Check for error response
        if (response->getStatusCode() >= drogon::k500InternalServerError) {
            // Record service error
            recordServiceError(serviceName);
        }
        
        // Add CORS headers if needed
        response->addHeader("Access-Control-Allow-Origin", "*");
        response->addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        response->addHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
        
        callback(response);
    });
}

void APIGatewayService::recordServiceCall(const std::string& serviceName) {
    std::lock_guard<std::mutex> lock(serviceCallCountsMutex_);
    
    auto it = serviceCallCounts_.find(serviceName);
    if (it != serviceCallCounts_.end()) {
        it->second++;
    } else {
        serviceCallCounts_[serviceName] = 1;
    }
}

bool APIGatewayService::checkRateLimit(const drogon::HttpRequestPtr& req, std::string& errorMessage) {
    // Extract client IP
    std::string clientIp = req->getPeerAddr().toIp();
    
    // Extract path for endpoint-specific rate limits
    std::string path = req->getPath();
    
    // Check if rate limited
    if (!rateLimiter_->allowRequest(clientIp, path)) {
        errorMessage = "Rate limit exceeded. Please try again later.";
        return false;
    }
    
    return true;
}

void APIGatewayService::loadAPISpecifications() {
    // In a real implementation, this would load OpenAPI specifications from each service
    // or from a central repository
    
    // For this example, we're creating a mock API spec
    apiSpecCache_["openapi"] = "3.0.0";
    apiSpecCache_["info"]["title"] = "Advanced Pilot Training Platform API";
    apiSpecCache_["info"]["version"] = "1.0.0";
    apiSpecCache_["info"]["description"] = "API for the Advanced Pilot Training Platform";
    
    // Add paths for each service
    apiSpecCache_["paths"] = Json::Value(Json::objectValue);
    
    // Auth Service Endpoints
    Json::Value authService;
    authService["info"]["title"] = "Authentication Service";
    authService["info"]["version"] = "1.0.0";
    authService["paths"]["/api/auth/login"]["post"]["summary"] = "Authenticate user";
    authService["paths"]["/api/auth/refresh"]["post"]["summary"] = "Refresh access token";
    authService["paths"]["/api/auth/validate"]["post"]["summary"] = "Validate token";
    
    // Document Service Endpoints
    Json::Value documentService;
    documentService["info"]["title"] = "Document Service";
    documentService["info"]["version"] = "1.0.0";
    documentService["paths"]["/api/documents/process"]["post"]["summary"] = "Process document";
    documentService["paths"]["/api/documents/classify"]["post"]["summary"] = "Classify document";
    
    // Syllabus Service Endpoints
    Json::Value syllabusService;
    syllabusService["info"]["title"] = "Syllabus Service";
    syllabusService["info"]["version"] = "1.0.0";
    syllabusService["paths"]["/api/syllabus/templates"]["get"]["summary"] = "Get syllabus templates";
    syllabusService["paths"]["/api/syllabus/templates/{id}"]["get"]["summary"] = "Get syllabus template by ID";
    
    // Add more services as needed
    
    // Add services to cache
    apiSpecCache_["services"]["auth"] = authService;
    apiSpecCache_["services"]["document"] = documentService;
    apiSpecCache_["services"]["syllabus"] = syllabusService;
    
    // Merge paths for simplified view
    for (const auto& service : apiSpecCache_["services"].getMemberNames()) {
        const auto& servicePaths = apiSpecCache_["services"][service]["paths"];
        
        for (const auto& path : servicePaths.getMemberNames()) {
            apiSpecCache_["paths"][path] = servicePaths[path];
        }
    }
}

std::string APIGatewayService::generateRequestId() {
    // Generate a unique request ID
    auto now = std::chrono::system_clock::now();
    auto now_ms = std::chrono::time_point_cast<std::chrono::milliseconds>(now);
    auto epoch = now_ms.time_since_epoch();
    uint64_t timestamp = static_cast<uint64_t>(epoch.count());
    
    // Combine timestamp with a random number
    std::random_device rd;
    std::mt19937_64 gen(rd());
    std::uniform_int_distribution<uint64_t> dist;
    uint64_t random = dist(gen);
    
    std::stringstream ss;
    ss << std::hex << timestamp << "-" << random;
    return ss.str();
}

bool APIGatewayService::isCircuitOpen(const std::string& serviceName) {
    std::lock_guard<std::mutex> lock(circuitBreakerMutex_);
    
    auto it = serviceCircuitOpen_.find(serviceName);
    if (it != serviceCircuitOpen_.end() && it->second) {
        // Check if reset time has passed
        auto resetIt = serviceCircuitResetTime_.find(serviceName);
        if (resetIt != serviceCircuitResetTime_.end()) {
            auto now = std::chrono::system_clock::now();
            if (now > resetIt->second) {
                // Reset circuit
                resetCircuit(serviceName);
                return false;
            }
        }
        
        return true;
    }
    
    return false;
}

void APIGatewayService::recordServiceError(const std::string& serviceName) {
    std::lock_guard<std::mutex> lock(circuitBreakerMutex_);
    
    // Increment error count
    auto it = serviceErrorCounts_.find(serviceName);
    if (it != serviceErrorCounts_.end()) {
        it->second++;
    } else {
        serviceErrorCounts_[serviceName] = 1;
    }
    
    // Check if error threshold exceeded
    const int ERROR_THRESHOLD = 5; // Open circuit after 5 errors
    
    if (serviceErrorCounts_[serviceName] >= ERROR_THRESHOLD) {
        // Open circuit
        serviceCircuitOpen_[serviceName] = true;
        
        // Set reset time (30 seconds)
        auto resetTime = std::chrono::system_clock::now() + std::chrono::seconds(30);
        serviceCircuitResetTime_[serviceName] = resetTime;
        
        // Log circuit open event
        std::cout << "Circuit opened for service: " << serviceName 
                  << " (Error count: " << serviceErrorCounts_[serviceName] << ")" << std::endl;
    }
}

void APIGatewayService::resetCircuit(const std::string& serviceName) {
    // Reset circuit breaker state
    serviceCircuitOpen_[serviceName] = false;
    serviceErrorCounts_[serviceName] = 0;
    
    // Log circuit reset event
    std::cout << "Circuit reset for service: " << serviceName << std::endl;
}

} // namespace gateway
} // namespace atp

// Service Registry implementation
namespace atp {
namespace gateway {

ServiceRegistry::ServiceRegistry() {
    // Initialize with default services
    services_["auth"] = "http://localhost:8083";
    services_["document"] = "http://localhost:8080";
    services_["syllabus"] = "http://localhost:8081";
    services_["compliance"] = "http://localhost:8082";
    services_["debrief"] = "http://localhost:8084";
    services_["admin"] = "http://localhost:8085";
    services_["gamification"] = "http://localhost:8086";
    services_["community"] = "http://localhost:8087";
}

void ServiceRegistry::loadServices(const std::string& configFile) {
    // In a real implementation, this would load service configurations from a JSON file
    // For this example, we'll use hardcoded values
    
    // You might add additional services or modify existing ones
    services_["analytics"] = "http://localhost:5001";
}

std::string ServiceRegistry::getServiceUrl(const std::string& serviceName) {
    auto it = services_.find(serviceName);
    if (it != services_.end()) {
        return it->second;
    }
    
    return "";
}

std::vector<std::pair<std::string, bool>> ServiceRegistry::checkServiceHealth() {
    std::vector<std::pair<std::string, bool>> results;
    
    for (const auto& service : services_) {
        // In a real implementation, this would make a health check request to each service
        // For this example, we'll assume all services are healthy
        results.push_back({service.first, true});
    }
    
    return results;
}

} // namespace gateway
} // namespace atp

// Request Router implementation
namespace atp {
namespace gateway {

RequestRouter::RequestRouter(std::shared_ptr<ServiceRegistry> serviceRegistry) 
    : serviceRegistry_(serviceRegistry) {
    // Initialize route patterns
    initializeRoutes();
}

void RequestRouter::initializeRoutes() {
    // Define routes for each service
    // Format: {path_regex, service_name}
    
    // Auth Service
    routes_.push_back({std::regex("^auth/.*"), "auth"});
    
    // Document Service
    routes_.push_back({std::regex("^documents/.*"), "document"});
    
    // Syllabus Service
    routes_.push_back({std::regex("^syllabus/.*"), "syllabus"});
    
    // Compliance Service
    routes_.push_back({std::regex("^compliance/.*"), "compliance"});
    routes_.push_back({std::regex("^audit/.*"), "compliance"});
    
    // Debrief Service
    routes_.push_back({std::regex("^debrief/.*"), "debrief"});
    
    // Admin Service
    routes_.push_back({std::regex("^admin/.*"), "admin"});
    
    // Gamification Service
    routes_.push_back({std::regex("^gamification/.*"), "gamification"});
    
    // Community Service
    routes_.push_back({std::regex("^community/.*"), "community"});
    
    // Analytics Service
    routes_.push_back({std::regex("^analytics/.*"), "analytics"});
}

std::pair<std::string, std::string> RequestRouter::routeRequest(const std::string& path, drogon::HttpMethod method) {
    // Check each route pattern
    for (const auto& route : routes_) {
        if (std::regex_search(path, route.first)) {
            std::string serviceName = route.second;
            
            // Ensure the path starts with a /
            std::string endpoint = "/" + path;
            
            return {serviceName, endpoint};
        }
    }
    
    // No matching route
    return {"", ""};
}

} // namespace gateway
} // namespace atp

// Auth Validator implementation
namespace atp {
namespace gateway {

AuthValidator::AuthValidator() {
    // Initialize with JWT secret
    // In a real implementation, this would be loaded from a secure configuration
    jwtSecret_ = "YourSecretKeyForSigningJwtsReplaceMeWithSecureKey";
}

bool AuthValidator::validateToken(const std::string& token, std::string& userId, std::string& errorMessage) {
    try {
        // In a real implementation, this would verify the JWT signature and expiration
        // For this example, we'll use a simple placeholder implementation
        
        // Simple check for a valid JWT format
        auto parts = splitString(token, '.');
        if (parts.size() != 3) {
            errorMessage = "Invalid token format";
            return false;
        }
        
        // Decode payload
        std::string payload = base64UrlDecode(parts[1]);
        
        // Parse JSON payload
        Json::CharReaderBuilder builder;
        Json::CharReader* reader = builder.newCharReader();
        Json::Value json;
        std::string errors;
        
        if (!reader->parse(payload.c_str(), payload.c_str() + payload.length(), &json, &errors)) {
            delete reader;
            errorMessage = "Invalid token payload: " + errors;
            return false;
        }
        delete reader;
        
        // Check for required claims
        if (!json.isMember("sub") || json["sub"].asString().empty()) {
            errorMessage = "Token missing subject claim";
            return false;
        }
        
        if (!json.isMember("exp") || !json["exp"].isInt64()) {
            errorMessage = "Token missing or invalid expiration claim";
            return false;
        }
        
        // Check expiration
        int64_t expTime = json["exp"].asInt64();
        int64_t currentTime = std::chrono::duration_cast<std::chrono::seconds>(
            std::chrono::system_clock::now().time_since_epoch()
        ).count();
        
        if (currentTime > expTime) {
            errorMessage = "Token expired";
            return false;
        }
        
        // Set user ID from subject claim
        userId = json["sub"].asString();
        
        return true;
    }
    catch (const std::exception& e) {
        errorMessage = std::string("Token validation error: ") + e.what();
        return false;
    }
}

std::vector<std::string> AuthValidator::splitString(const std::string& str, char delimiter) {
    std::vector<std::string> tokens;
    std::string token;
    std::istringstream tokenStream(str);
    
    while (std::getline(tokenStream, token, delimiter)) {
        tokens.push_back(token);
    }
    
    return tokens;
}

std::string AuthValidator::base64UrlDecode(const std::string& input) {
    // Base64 URL decoding
    std::string base64 = input;
    
    // Replace URL-safe characters
    std::replace(base64.begin(), base64.end(), '-', '+');
    std::replace(base64.begin(), base64.end(), '_', '/');
    
    // Add padding if needed
    while (base64.length() % 4 != 0) {
        base64 += '=';
    }
    
    // Decode Base64
    const size_t outputLength = (base64.length() * 3) / 4;
    std::vector<unsigned char> output(outputLength);
    
    // In a real implementation, use a proper Base64 decoder library
    // For this example, return a placeholder decoded string
    return "{\"sub\":\"user-123\",\"exp\":9999999999}";
}

} // namespace gateway
} // namespace atp

// Rate Limiter implementation
namespace atp {
namespace gateway {

RateLimiter::RateLimiter() {
    // Initialize rate limits
    // Format: path prefix -> {requests per minute, window size in seconds}
    
    // Default rate limit: 60 requests per minute per IP
    defaultLimit_ = {60, 60};
    
    // Path-specific rate limits
    pathLimits_["/api/auth/"] = {20, 60};  // 20 auth requests per minute
    pathLimits_["/api/documents/process"] = {10, 60};  // 10 document process requests per minute
}

bool RateLimiter::allowRequest(const std::string& clientIp, const std::string& path) {
    // Get current time
    auto now = std::chrono::system_clock::now();
    auto nowMs = std::chrono::time_point_cast<std::chrono::milliseconds>(now).time_since_epoch().count();
    
    // Find applicable rate limit
    std::pair<int, int> limit = defaultLimit_;
    
    for (const auto& pathLimit : pathLimits_) {
        if (path.find(pathLimit.first) == 0) {
            limit = pathLimit.second;
            break;
        }
    }
    
    // Get rate limiter key (IP + path prefix)
    std::string key = clientIp + ":" + path.substr(0, path.find('/', 5));
    
    // Clean up old request timestamps
    cleanupRequestHistory(nowMs);
    
    // Check if rate limited
    std::lock_guard<std::mutex> lock(mutex_);
    
    auto& history = requestHistory_[key];
    
    // Remove requests outside the window
    int64_t windowStart = nowMs - limit.second * 1000;
    
    while (!history.empty() && history.front() < windowStart) {
        history.pop_front();
    }
    
    // Check if limit exceeded
    if (history.size() >= limit.first) {
        return false;
    }
    
    // Add current request timestamp
    history.push_back(nowMs);
    
    return true;
}

void RateLimiter::cleanupRequestHistory(int64_t currentTimeMs) {
    // Clean up request history periodically
    // This prevents memory leaks from accumulating request history for inactive clients
    
    static int64_t lastCleanupTime = 0;
    const int64_t CLEANUP_INTERVAL_MS = 60 * 1000; // 1 minute
    
    if (currentTimeMs - lastCleanupTime < CLEANUP_INTERVAL_MS) {
        return;
    }
    
    lastCleanupTime = currentTimeMs;
    
    std::lock_guard<std::mutex> lock(mutex_);
    
    // Calculate oldest timestamp to keep (5 minutes ago)
    int64_t cutoffTime = currentTimeMs - 5 * 60 * 1000;
    
    // Remove request history for inactive clients
    for (auto it = requestHistory_.begin(); it != requestHistory_.end();) {
        auto& history = it->second;
        
        // Remove requests older than cutoff time
        while (!history.empty() && history.front() < cutoffTime) {
            history.pop_front();
        }
        
        // Remove client if no recent requests
        if (history.empty()) {
            it = requestHistory_.erase(it);
        } else {
            ++it;
        }
    }
}

} // namespace gateway
} // namespace atp

// Main application entry point
int main() {
    // Configure Drogon app
    drogon::app().setLogPath("./")
                 .setLogLevel(trantor::Logger::kInfo)
                 .addListener("0.0.0.0", 8000)
                 .setThreadNum(16)
                 .run();
    
    return 0;
}
