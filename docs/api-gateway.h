// backend/api/include/ApiGateway.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <unordered_map>
#include <drogon/drogon.h>

#include "core/include/ErrorHandling.h"

namespace APTP::API {

// Configuration for the API server
struct ApiConfig {
    std::string host = "0.0.0.0";
    uint16_t port = 8080;
    uint32_t threadNum = 16;
    std::string jwtSecret;
    bool enableSSL = false;
    std::string sslCertPath;
    std::string sslKeyPath;
    uint32_t maxConnectionNum = 100000;
    uint32_t maxConnectionNumPerIP = 0;
    uint32_t keepAliveRequestsNumber = 0;
    uint32_t keepAliveTimeout = 60;
    int sessionTimeout = 0;
    bool useSession = false;
    std::string documentRoot = "./public";
    std::string uploadPath = "./uploads";
    size_t maxUploadSize = 20 * 1024 * 1024; // 20MB
    std::vector<std::string> allowedOrigins = {"*"};
    uint32_t maxRequestBodySize = 8 * 1024 * 1024;
    std::string logLevel = "debug";
    std::string logPath = "./logs";
    uint32_t rateLimitRequests = 0;
    uint32_t rateLimitWindow = 0;
};

// Rate limiting configuration
struct RateLimitConfig {
    bool enabled = false;
    uint32_t requestsPerWindow = 100;
    uint32_t windowSeconds = 60;
    bool applyPerIP = true;
    bool applyPerUser = false;
    std::vector<std::string> excludedPaths;
};

// API Gateway class
class ApiGateway {
public:
    static ApiGateway& getInstance();
    
    // Initialize the API gateway
    APTP::Core::Result<void> initialize(const ApiConfig& config);
    
    // Start the server
    APTP::Core::Result<void> start();
    
    // Stop the server
    APTP::Core::Result<void> stop();
    
    // Configure CORS
    void configureCORS(const std::vector<std::string>& allowedOrigins);
    
    // Configure rate limiting
    void configureRateLimit(const RateLimitConfig& rateLimitConfig);
    
    // Configure JWT authentication
    void configureJWT(const std::string& secret, uint32_t expireSeconds = 3600);
    
    // Get API documentation as OpenAPI/Swagger JSON
    std::string getOpenApiSpec() const;

private:
    ApiGateway();
    ~ApiGateway();
    
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

} // namespace APTP::API

// backend/api/include/controllers/DocumentController.h
#pragma once

#include <drogon/HttpController.h>
#include "document/include/DocumentProcessor.h"

namespace APTP::API {

class DocumentController : public drogon::HttpController<DocumentController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(DocumentController::uploadDocument, "/api/documents", drogon::Post);
    ADD_METHOD_TO(DocumentController::getDocument, "/api/documents/{id}", drogon::Get);
    ADD_METHOD_TO(DocumentController::listDocuments, "/api/documents", drogon::Get);
    ADD_METHOD_TO(DocumentController::deleteDocument, "/api/documents/{id}", drogon::Delete);
    ADD_METHOD_TO(DocumentController::processDocument, "/api/documents/{id}/process", drogon::Post);
    METHOD_LIST_END

    // Upload a new document
    void uploadDocument(const drogon::HttpRequestPtr& req, 
                       std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Get document by ID
    void getDocument(const drogon::HttpRequestPtr& req,
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                    const std::string& id);
    
    // List all documents
    void listDocuments(const drogon::HttpRequestPtr& req,
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Delete a document
    void deleteDocument(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                        const std::string& id);
    
    // Process a document
    void processDocument(const drogon::HttpRequestPtr& req,
                         std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                         const std::string& id);
    
private:
    // Helper methods
};

} // namespace APTP::API

// backend/api/include/controllers/SyllabusController.h
#pragma once

#include <drogon/HttpController.h>
#include "syllabus/include/SyllabusGenerator.h"

namespace APTP::API {

class SyllabusController : public drogon::HttpController<SyllabusController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(SyllabusController::getSyllabus, "/api/syllabi/{id}", drogon::Get);
    ADD_METHOD_TO(SyllabusController::listSyllabi, "/api/syllabi", drogon::Get);
    ADD_METHOD_TO(SyllabusController::createSyllabus, "/api/syllabi", drogon::Post);
    ADD_METHOD_TO(SyllabusController::updateSyllabus, "/api/syllabi/{id}", drogon::Put);
    ADD_METHOD_TO(SyllabusController::deleteSyllabus, "/api/syllabi/{id}", drogon::Delete);
    ADD_METHOD_TO(SyllabusController::generateSyllabusFromDocument, "/api/syllabi/generate/document/{documentId}", drogon::Post);
    ADD_METHOD_TO(SyllabusController::generateSyllabusFromTemplate, "/api/syllabi/generate/template/{templateId}", drogon::Post);
    ADD_METHOD_TO(SyllabusController::getTemplates, "/api/syllabi/templates", drogon::Get);
    ADD_METHOD_TO(SyllabusController::getSyllabusModules, "/api/syllabi/{id}/modules", drogon::Get);
    ADD_METHOD_TO(SyllabusController::getSyllabusModule, "/api/syllabi/{id}/modules/{moduleId}", drogon::Get);
    METHOD_LIST_END

    // Get syllabus by ID
    void getSyllabus(const drogon::HttpRequestPtr& req,
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                    const std::string& id);
    
    // List all syllabi
    void listSyllabi(const drogon::HttpRequestPtr& req,
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Create a new syllabus
    void createSyllabus(const drogon::HttpRequestPtr& req,
                       std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Update an existing syllabus
    void updateSyllabus(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                        const std::string& id);
    
    // Delete a syllabus
    void deleteSyllabus(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                        const std::string& id);
    
    // Generate syllabus from document
    void generateSyllabusFromDocument(const drogon::HttpRequestPtr& req,
                                      std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                                      const std::string& documentId);
    
    // Generate syllabus from template
    void generateSyllabusFromTemplate(const drogon::HttpRequestPtr& req,
                                      std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                                      const std::string& templateId);
    
    // Get available templates
    void getTemplates(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Get syllabus modules
    void getSyllabusModules(const drogon::HttpRequestPtr& req,
                           std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                           const std::string& id);
    
    // Get specific module
    void getSyllabusModule(const drogon::HttpRequestPtr& req,
                          std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                          const std::string& id,
                          const std::string& moduleId);
};

} // namespace APTP::API

// backend/api/include/controllers/AssessmentController.h
#pragma once

#include <drogon/HttpController.h>

namespace APTP::API {

class AssessmentController : public drogon::HttpController<AssessmentController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(AssessmentController::getAssessment, "/api/assessments/{id}", drogon::Get);
    ADD_METHOD_TO(AssessmentController::listAssessments, "/api/assessments", drogon::Get);
    ADD_METHOD_TO(AssessmentController::createAssessment, "/api/assessments", drogon::Post);
    ADD_METHOD_TO(AssessmentController::updateAssessment, "/api/assessments/{id}", drogon::Put);
    ADD_METHOD_TO(AssessmentController::deleteAssessment, "/api/assessments/{id}", drogon::Delete);
    ADD_METHOD_TO(AssessmentController::submitGrade, "/api/assessments/{id}/grade", drogon::Post);
    ADD_METHOD_TO(AssessmentController::getTraineeAssessments, "/api/trainees/{traineeId}/assessments", drogon::Get);
    ADD_METHOD_TO(AssessmentController::getAssessmentForms, "/api/assessment-forms", drogon::Get);
    ADD_METHOD_TO(AssessmentController::syncOfflineAssessments, "/api/assessments/sync", drogon::Post);
    METHOD_LIST_END

    // Get assessment by ID
    void getAssessment(const drogon::HttpRequestPtr& req,
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                      const std::string& id);
    
    // List all assessments
    void listAssessments(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Create a new assessment
    void createAssessment(const drogon::HttpRequestPtr& req,
                         std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Update an existing assessment
    void updateAssessment(const drogon::HttpRequestPtr& req,
                          std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                          const std::string& id);
    
    // Delete an assessment
    void deleteAssessment(const drogon::HttpRequestPtr& req,
                          std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                          const std::string& id);
    
    // Submit a grade for an assessment
    void submitGrade(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                     const std::string& id);
    
    // Get assessments for a trainee
    void getTraineeAssessments(const drogon::HttpRequestPtr& req,
                              std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                              const std::string& traineeId);
    
    // Get available assessment forms
    void getAssessmentForms(const drogon::HttpRequestPtr& req,
                           std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Sync offline assessments
    void syncOfflineAssessments(const drogon::HttpRequestPtr& req,
                               std::function<void(const drogon::HttpResponsePtr&)>&& callback);
};

} // namespace APTP::API

// backend/api/include/controllers/UserController.h
#pragma once

#include <drogon/HttpController.h>

namespace APTP::API {

class UserController : public drogon::HttpController<UserController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(UserController::login, "/api/auth/login", drogon::Post);
    ADD_METHOD_TO(UserController::logout, "/api/auth/logout", drogon::Post);
    ADD_METHOD_TO(UserController::refreshToken, "/api/auth/refresh", drogon::Post);
    ADD_METHOD_TO(UserController::getUser, "/api/users/{id}", drogon::Get);
    ADD_METHOD_TO(UserController::getCurrentUser, "/api/users/me", drogon::Get);
    ADD_METHOD_TO(UserController::listUsers, "/api/users", drogon::Get);
    ADD_METHOD_TO(UserController::createUser, "/api/users", drogon::Post);
    ADD_METHOD_TO(UserController::updateUser, "/api/users/{id}", drogon::Put);
    ADD_METHOD_TO(UserController::deleteUser, "/api/users/{id}", drogon::Delete);
    ADD_METHOD_TO(UserController::getUserRoles, "/api/users/{id}/roles", drogon::Get);
    ADD_METHOD_TO(UserController::updateUserRoles, "/api/users/{id}/roles", drogon::Put);
    ADD_METHOD_TO(UserController::resetPassword, "/api/auth/reset-password", drogon::Post);
    ADD_METHOD_TO(UserController::changePassword, "/api/auth/change-password", drogon::Post);
    ADD_METHOD_TO(UserController::setupMFA, "/api/auth/mfa/setup", drogon::Post);
    ADD_METHOD_TO(UserController::verifyMFA, "/api/auth/mfa/verify", drogon::Post);
    METHOD_LIST_END

    // Login
    void login(const drogon::HttpRequestPtr& req,
              std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Logout
    void logout(const drogon::HttpRequestPtr& req,
               std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Refresh token
    void refreshToken(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Get user by ID
    void getUser(const drogon::HttpRequestPtr& req,
                std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                const std::string& id);
    
    // Get current user
    void getCurrentUser(const drogon::HttpRequestPtr& req,
                       std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // List all users
    void listUsers(const drogon::HttpRequestPtr& req,
                  std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Create a new user
    void createUser(const drogon::HttpRequestPtr& req,
                   std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Update an existing user
    void updateUser(const drogon::HttpRequestPtr& req,
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                    const std::string& id);
    
    // Delete a user
    void deleteUser(const drogon::HttpRequestPtr& req,
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                    const std::string& id);
    
    // Get user roles
    void getUserRoles(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                     const std::string& id);
    
    // Update user roles
    void updateUserRoles(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                        const std::string& id);
    
    // Reset password
    void resetPassword(const drogon::HttpRequestPtr& req,
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Change password
    void changePassword(const drogon::HttpRequestPtr& req,
                       std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Setup MFA
    void setupMFA(const drogon::HttpRequestPtr& req,
                 std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Verify MFA
    void verifyMFA(const drogon::HttpRequestPtr& req,
                  std::function<void(const drogon::HttpResponsePtr&)>&& callback);
};

} // namespace APTP::API

// backend/api/include/middleware/JwtMiddleware.h
#pragma once

#include <drogon/HttpFilter.h>

namespace APTP::API {

class JwtAuthFilter : public drogon::HttpFilter<JwtAuthFilter> {
public:
    JwtAuthFilter() = default;
    void doFilter(const drogon::HttpRequestPtr& req,
                 drogon::FilterCallback&& fcb,
                 drogon::FilterChainCallback&& fccb) override;
};

} // namespace APTP::API

// backend/api/src/ApiGateway.cpp (partial implementation)
#include "ApiGateway.h"
#include "core/include/ConfigurationManager.h"
#include "core/include/Logger.h"
#include "middleware/JwtMiddleware.h"
#include <drogon/drogon.h>

namespace APTP::API {

struct ApiGateway::Impl {
    ApiConfig config;
    std::unordered_map<std::string, std::string> openApiPaths;
    bool initialized = false;
    bool running = false;
    
    // Swagger API documentation
    nlohmann::json openApiSpec;
    
    // Initialize OpenAPI spec
    void initializeOpenApiSpec() {
        openApiSpec = {
            {"openapi", "3.0.0"},
            {"info", {
                {"title", "Advanced Pilot Training Platform API"},
                {"description", "API for the Advanced Pilot Training Platform"},
                {"version", "1.0.0"}
            }},
            {"servers", nlohmann::json::array({
                {{"url", "http://" + config.host + ":" + std::to_string(config.port)}}
            })},
            {"paths", {}}
        };
        
        // Add paths and schemas for all endpoints
        // This would be populated with all API endpoints and schemas
    }
};

ApiGateway& ApiGateway::getInstance() {
    static ApiGateway instance;
    return instance;
}

ApiGateway::ApiGateway() : impl_(std::make_unique<Impl>()) {}
ApiGateway::~ApiGateway() {
    stop();
}

APTP::Core::Result<void> ApiGateway::initialize(const ApiConfig& config) {
    if (impl_->initialized) {
        return APTP::Core::Error<void>(APTP::Core::ErrorCode::InvalidState);
    }
    
    impl_->config = config;
    
    // Configure Drogon
    drogon::app().setLogPath(config.logPath)
                 .setLogLevel(config.logLevel)
                 .addListener(config.host, config.port)
                 .setThreadNum(config.threadNum)
                 .setMaxConnectionNum(config.maxConnectionNum)
                 .setMaxConnectionNumPerIP(config.maxConnectionNumPerIP)
                 .setKeepAliveRequestsNumber(config.keepAliveRequestsNumber)
                 .setKeepAliveTimeout(config.keepAliveTimeout)
                 .setDocumentRoot(config.documentRoot)
                 .setUploadPath(config.uploadPath)
                 .setMaxBodySize(config.maxRequestBodySize);
    
    // Configure SSL if enabled
    if (config.enableSSL && !config.sslCertPath.empty() && !config.sslKeyPath.empty()) {
        drogon::app().setSSLFiles(config.sslCertPath, config.sslKeyPath);
    }
    
    // Configure JWT if provided
    if (!config.jwtSecret.empty()) {
        configureJWT(config.jwtSecret);
    }
    
    // Configure CORS
    configureCORS(config.allowedOrigins);
    
    // Initialize OpenAPI documentation
    impl_->initializeOpenApiSpec();
    
    impl_->initialized = true;
    
    APTP::Core::Logger::getInstance().info("API Gateway initialized on {}:{}", config.host, config.port);
    return APTP::Core::Success();
}

APTP::Core::Result<void> ApiGateway::start() {
    if (!impl_->initialized) {
        return APTP::Core::Error<void>(APTP::Core::ErrorCode::InvalidState);
    }
    
    if (impl_->running) {
        return APTP::Core::Success();
    }
    
    try {
        drogon::app().run();
        impl_->running = true;
        
        APTP::Core::Logger::getInstance().info("API Gateway started");
        return APTP::Core::Success();
    } catch (const std::exception& e) {
        APTP::Core::Logger::getInstance().error("Failed to start API Gateway: {}", e.what());
        return APTP::Core::Error<void>(APTP::Core::ErrorCode::ResourceUnavailable);
    }
}

APTP::Core::Result<void> ApiGateway::stop() {
    if (!impl_->running) {
        return APTP::Core::Success();
    }
    
    try {
        drogon::app().quit();
        impl_->running = false;
        
        APTP::Core::Logger::getInstance().info("API Gateway stopped");
        return APTP::Core::Success();
    } catch (const std::exception& e) {
        APTP::Core::Logger::getInstance().error("Failed to stop API Gateway: {}", e.what());
        return APTP::Core::Error<void>(APTP::Core::ErrorCode::Unknown);
    }
}

void ApiGateway::configureCORS(const std::vector<std::string>& allowedOrigins) {
    auto corsFilter = []() -> drogon::HttpResponsePtr {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k200OK);
        return resp;
    };
    
    // Configure CORS options
    auto corsOptions = std::make_shared<drogon::CorsOptions>();
    corsOptions->allowMethods = {"GET", "POST", "PUT", "DELETE", "OPTIONS"};
    corsOptions->allowHeaders = {"x-requested-with", "content-type", "authorization"};
    corsOptions->exposeHeaders = {"authorization"};
    corsOptions->allowCredentials = true;
    
    if (allowedOrigins.size() == 1 && allowedOrigins[0] == "*") {
        corsOptions->allowOrigins = {"*"};
    } else {
        corsOptions->allowOrigins = allowedOrigins;
    }
    
    drogon::app().registerHttpController(corsFilter, "/api/.*", corsOptions);
}

void ApiGateway::configureJWT(const std::string& secret, uint32_t expireSeconds) {
    // Store JWT secret in configuration
    APTP::Core::ConfigurationManager::getInstance().set("jwt_secret", secret, APTP::Core::ConfigSource::Environment);
    APTP::Core::ConfigurationManager::getInstance().set("jwt_expire_seconds", expireSeconds, APTP::Core::ConfigSource::Environment);
    
    // Register JWT middleware for protected routes
    drogon::app().registerFilter<JwtAuthFilter>("/api/.*");
    
    // Exclude auth endpoints from JWT check
    drogon::app().registerFilterWithPriority<JwtAuthFilter>(
        drogon::FilterPriority::None,
        "/api/auth/.*"
    );
}

void ApiGateway::configureRateLimit(const RateLimitConfig& rateLimitConfig) {
    // Implementation for rate limiting would go here
    // This could use Drogon's built-in rate limiting or a custom solution
}

std::string ApiGateway::getOpenApiSpec() const {
    return impl_->openApiSpec.dump(4); // Pretty print with 4-space indentation
}

// Implementation for controllers would follow a similar pattern
// Each controller class would have implementations for its methods
// These would handle the HTTP requests, process them, and return responses

} // namespace APTP::API

// backend/api/src/controllers/DocumentController.cpp (example implementation)
#include "controllers/DocumentController.h"
#include <drogon/HttpResponse.h>
#include <json/json.h>

namespace APTP::API {

void DocumentController::uploadDocument(const drogon::HttpRequestPtr& req, 
                                       std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    // Example implementation for document upload
    auto resp = drogon::HttpResponse::newHttpJsonResponse(Json::Value());
    Json::Value result;
    
    // Check if this is a multipart/form-data request
    if (req->contentType() != drogon::CT_APPLICATION_JSON &&
        req->contentType() != drogon::CT_MULTIPART_FORM_DATA) {
        result["success"] = false;
        result["error"] = "Invalid content type";
        resp->setStatusCode(drogon::k400BadRequest);
        resp->setBody(result.toStyledString());
        callback(resp);
        return;
    }
    
    // Handle multipart/form-data upload
    auto& files = req->getFilesFromMultipartForm();
    if (files.empty()) {
        result["success"] = false;
        result["error"] = "No files uploaded";
        resp->setStatusCode(drogon::k400BadRequest);
        resp->setBody(result.toStyledString());
        callback(resp);
        return;
    }
    
    // Process each uploaded file
    Json::Value uploadedDocs(Json::arrayValue);
    for (auto& file : files) {
        // Create a unique ID for the document
        std::string docId = std::to_string(std::hash<std::string>{}(file.getFileName() + std::to_string(std::time(nullptr))));
        
        // Save file to uploads directory
        std::string savePath = "uploads/" + docId + "_" + file.getFileName();
        file.saveAs(savePath);
        
        // Create document processor to extract metadata
        auto docProcessor = APTP::Document::DocumentProcessor::createProcessor(savePath);
        auto processResult = docProcessor->processDocument(savePath);
        
        if (processResult.isSuccess()) {
            // Add document to database (simplified here)
            // In a real implementation, this would interact with the database
            
            // Return information about the uploaded document
            Json::Value docInfo;
            docInfo["id"] = docId;
            docInfo["filename"] = file.getFileName();
            docInfo["size"] = static_cast<Json::UInt64>(file.getSize());
            docInfo["contentType"] = file.getContentType();
            docInfo["path"] = savePath;
            
            // Add metadata if available
            const auto& metadata = processResult.value().metadata;
            docInfo["title"] = metadata.title;
            docInfo["author"] = metadata.author;
            docInfo["creationDate"] = metadata.creationDate;
            
            uploadedDocs.append(docInfo);
        } else {
            // Document processing failed
            Json::Value docInfo;
            docInfo["id"] = docId;
            docInfo["filename"] = file.getFileName();
            docInfo["size"] = static_cast<Json::UInt64>(file.getSize());
            docInfo["contentType"] = file.getContentType();
            docInfo["path"] = savePath;
            docInfo["processingError"] = "Failed to process document";
            
            uploadedDocs.append(docInfo);
        }
    }
    
    // Return success response
    result["success"] = true;
    result["documents"] = uploadedDocs;
    resp->setStatusCode(drogon::k201Created);
    resp->setBody(result.toStyledString());
    callback(resp);
}

// Additional method implementations would follow

} // namespace APTP::API

// Implementation for other controllers would follow a similar pattern
