#include "rest/rest_adapter.h"
#include "logging/logger.h"
#include <regex>
#include <cpprest/uri_builder.h>

namespace etr {
namespace rest {

RestAdapter::RestAdapter(
    const std::string& host,
    int port,
    std::shared_ptr<service::ETRServiceImpl> service_impl
) : host_(host),
    port_(port),
    service_impl_(service_impl),
    running_(false) {
    
    // Create listener URI
    web::uri_builder uri_builder;
    uri_builder.set_scheme("http");
    uri_builder.set_host(host_);
    uri_builder.set_port(port_);
    
    // Create listener
    listener_ = std::make_unique<web::http::experimental::listener::http_listener>(uri_builder.to_uri());
    
    // Configure listener
    listener_->support(web::http::methods::GET, [this](web::http::http_request request) {
        handleGet(request);
    });
    
    listener_->support(web::http::methods::POST, [this](web::http::http_request request) {
        handlePost(request);
    });
    
    listener_->support(web::http::methods::PUT, [this](web::http::http_request request) {
        handlePut(request);
    });
    
    listener_->support(web::http::methods::DEL, [this](web::http::http_request request) {
        handleDelete(request);
    });
    
    listener_->support(web::http::methods::OPTIONS, [this](web::http::http_request request) {
        web::http::http_response response(web::http::status_codes::OK);
        setCorsHeaders(response);
        request.reply(response);
    });
    
    logging::Logger::getInstance().info("REST adapter created for {}:{}", host_, port_);
}

RestAdapter::~RestAdapter() {
    stop();
}

bool RestAdapter::start() {
    if (running_) {
        logging::Logger::getInstance().warn("REST adapter already running");
        return true;
    }
    
    try {
        listener_->open().wait();
        running_ = true;
        
        logging::Logger::getInstance().info("REST adapter started on {}:{}", host_, port_);
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Failed to start REST adapter: {}", e.what());
        return false;
    }
}

void RestAdapter::stop() {
    if (!running_) {
        return;
    }
    
    try {
        listener_->close().wait();
        running_ = false;
        
        logging::Logger::getInstance().info("REST adapter stopped");
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error stopping REST adapter: {}", e.what());
    }
}

web::http::http_response RestAdapter::handleGet(web::http::http_request request) {
    try {
        const web::uri& uri = request.request_uri();
        const std::string& path = uri.path();
        
        logging::Logger::getInstance().debug("GET request: {}", path);
        
        // Route the request based on the path
        if (std::regex_match(path, std::regex("/api/records/([^/]+)"))) {
            handleGetRecord(request);
            return web::http::http_response();
        }
        else if (std::regex_match(path, std::regex("/api/records"))) {
            handleListRecords(request);
            return web::http::http_response();
        }
        else if (std::regex_match(path, std::regex("/api/syllabi/([^/]+)"))) {
            handleGetSyllabus(request);
            return web::http::http_response();
        }
        else if (std::regex_match(path, std::regex("/api/syllabi"))) {
            handleListSyllabi(request);
            return web::http::http_response();
        }
        else if (std::regex_match(path, std::regex("/api/compliance/requirements"))) {
            handleListComplianceRequirements(request);
            return web::http::http_response();
        }
        // Add more routes as needed
        
        // If no route matches, return 404
        web::http::http_response response(web::http::status_codes::NotFound);
        response.headers().add("Content-Type", "application/json");
        
        web::json::value error_json;
        error_json["error"] = web::json::value::string("Resource not found");
        response.set_body(error_json);
        
        setCorsHeaders(response);
        request.reply(response);
        
        return response;
    }
    catch (const std::exception& e) {
        // Handle unexpected exceptions
        handleInternalError(request, e);
        return web::http::http_response();
    }
}

web::http::http_response RestAdapter::handlePost(web::http::http_request request) {
    try {
        const web::uri& uri = request.request_uri();
        const std::string& path = uri.path();
        
        logging::Logger::getInstance().debug("POST request: {}", path);
        
        // Route the request based on the path
        if (path == "/api/records") {
            handleCreateRecord(request);
            return web::http::http_response();
        }
        else if (path == "/api/records/sign") {
            handleSignRecord(request);
            return web::http::http_response();
        }
        else if (path == "/api/records/verify") {
            handleVerifySignature(request);
            return web::http::http_response();
        }
        else if (path == "/api/syllabi") {
            handleCreateSyllabus(request);
            return web::http::http_response();
        }
        else if (path == "/api/compliance/check") {
            handleCheckCompliance(request);
            return web::http::http_response();
        }
        else if (path == "/api/compliance/map") {
            handleMapRegulations(request);
            return web::http::http_response();
        }
        // Add more routes as needed
        
        // If no route matches, return 404
        web::http::http_response response(web::http::status_codes::NotFound);
        response.headers().add("Content-Type", "application/json");
        
        web::json::value error_json;
        error_json["error"] = web::json::value::string("Resource not found");
        response.set_body(error_json);
        
        setCorsHeaders(response);
        request.reply(response);
        
        return response;
    }
    catch (const std::exception& e) {
        // Handle unexpected exceptions
        handleInternalError(request, e);
        return web::http::http_response();
    }
}

web::http::http_response RestAdapter::handlePut(web::http::http_request request) {
    try {
        const web::uri& uri = request.request_uri();
        const std::string& path = uri.path();
        
        logging::Logger::getInstance().debug("PUT request: {}", path);
        
        // Route the request based on the path
        if (std::regex_match(path, std::regex("/api/records/([^/]+)"))) {
            handleUpdateRecord(request);
            return web::http::http_response();
        }
        else if (std::regex_match(path, std::regex("/api/syllabi/([^/]+)"))) {
            handleUpdateSyllabus(request);
            return web::http::http_response();
        }
        // Add more routes as needed
        
        // If no route matches, return 404
        web::http::http_response response(web::http::status_codes::NotFound);
        response.headers().add("Content-Type", "application/json");
        
        web::json::value error_json;
        error_json["error"] = web::json::value::string("Resource not found");
        response.set_body(error_json);
        
        setCorsHeaders(response);
        request.reply(response);
        
        return response;
    }
    catch (const std::exception& e) {
        // Handle unexpected exceptions
        handleInternalError(request, e);
        return web::http::http_response();
    }
}

web::http::http_response RestAdapter::handleDelete(web::http::http_request request) {
    try {
        const web::uri& uri = request.request_uri();
        const std::string& path = uri.path();
        
        logging::Logger::getInstance().debug("DELETE request: {}", path);
        
        // Route the request based on the path
        if (std::regex_match(path, std::regex("/api/records/([^/]+)"))) {
            handleDeleteRecord(request);
            return web::http::http_response();
        }
        else if (std::regex_match(path, std::regex("/api/syllabi/([^/]+)"))) {
            handleDeleteSyllabus(request);
            return web::http::http_response();
        }
        // Add more routes as needed
        
        // If no route matches, return 404
        web::http::http_response response(web::http::status_codes::NotFound);
        response.headers().add("Content-Type", "application/json");
        
        web::json::value error_json;
        error_json["error"] = web::json::value::string("Resource not found");
        response.set_body(error_json);
        
        setCorsHeaders(response);
        request.reply(response);
        
        return response;
    }
    catch (const std::exception& e) {
        // Handle unexpected exceptions
        handleInternalError(request, e);
        return web::http::http_response();
    }
}

std::string RestAdapter::extractToken(const web::http::http_request& request) {
    // Check for Authorization header
    const web::http::http_headers& headers = request.headers();
    auto it = headers.find("Authorization");
    
    if (it != headers.end()) {
        const std::string& auth_header = it->second;
        
        // Check Bearer prefix
        if (auth_header.substr(0, 7) == "Bearer ") {
            return auth_header.substr(7);
        }
    }
    
    return "";
}

std::map<std::string, std::string> RestAdapter::extractPathParams(
    const web::uri& uri,
    const std::string& path_template
) {
    std::map<std::string, std::string> params;
    
    // Extract parameters from URI path using regular expressions
    std::regex param_regex("\\{([^\\}]+)\\}");
    std::string path_regex_str = path_template;
    
    // Replace {param} with capture groups
    path_regex_str = std::regex_replace(path_regex_str, param_regex, "([^/]+)");
    
    // Extract parameter names
    std::vector<std::string> param_names;
    auto param_begin = std::sregex_iterator(path_template.begin(), path_template.end(), param_regex);
    auto param_end = std::sregex_iterator();
    
    for (auto it = param_begin; it != param_end; ++it) {
        param_names.push_back((*it)[1].str());
    }
    
    // Match the path against the regex
    std::regex path_regex(path_regex_str);
    std::smatch matches;
    
    std::string path = uri.path();
    if (std::regex_match(path, matches, path_regex)) {
        // First match is the full string, skip it
        for (size_t i = 1; i < matches.size() && i - 1 < param_names.size(); ++i) {
            params[param_names[i - 1]] = matches[i].str();
        }
    }
    
    return params;
}

std::unique_ptr<grpc::ClientContext> RestAdapter::createContext(const std::string& token) {
    auto context = std::make_unique<grpc::ClientContext>();
    
    if (!token.empty()) {
        context->AddMetadata("authorization", "Bearer " + token);
    }
    
    return context;
}

void RestAdapter::handleAuthError(
    web::http::http_request& request,
    const std::string& message
) {
    web::http::http_response response(web::http::status_codes::Unauthorized);
    response.headers().add("Content-Type", "application/json");
    
    web::json::value error_json;
    error_json["error"] = web::json::value::string(message);
    response.set_body(error_json);
    
    setCorsHeaders(response);
    request.reply(response);
}

void RestAdapter::handleNotFoundError(
    web::http::http_request& request,
    const std::string& resource
) {
    web::http::http_response response(web::http::status_codes::NotFound);
    response.headers().add("Content-Type", "application/json");
    
    web::json::value error_json;
    error_json["error"] = web::json::value::string(resource + " not found");
    response.set_body(error_json);
    
    setCorsHeaders(response);
    request.reply(response);
}

void RestAdapter::handleInternalError(
    web::http::http_request& request,
    const std::exception& e
) {
    logging::Logger::getInstance().error("Internal server error: {}", e.what());
    
    web::http::http_response response(web::http::status_codes::InternalError);
    response.headers().add("Content-Type", "application/json");
    
    web::json::value error_json;
    error_json["error"] = web::json::value::string("Internal server error");
    response.set_body(error_json);
    
    setCorsHeaders(response);
    request.reply(response);
}

void RestAdapter::setCorsHeaders(web::http::http_response& response) {
    response.headers().add("Access-Control-Allow-Origin", "*");
    response.headers().add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers().add("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.headers().add("Access-Control-Max-Age", "86400");
}

} // namespace rest
} // namespace etr