#include "rest/rest_api_adapter.h"
#include <jwt-cpp/jwt.h>
#include <chrono>
#include <regex>

namespace etr {
namespace rest {

RestApiAdapter::RestApiAdapter(
    const std::string& host,
    int port,
    std::shared_ptr<records::IRecordService> record_service,
    std::shared_ptr<signature::IDigitalSignatureService> signature_service,
    std::shared_ptr<compliance::IComplianceService> compliance_service,
    std::shared_ptr<syllabus::ISyllabusService> syllabus_service
) : host_(host),
    port_(port),
    record_service_(std::move(record_service)),
    signature_service_(std::move(signature_service)),
    compliance_service_(std::move(compliance_service)),
    syllabus_service_(std::move(syllabus_service)) {
    
    // Create listener URI
    web::uri_builder uri_builder;
    uri_builder.set_scheme("http");
    uri_builder.set_host(host_);
    uri_builder.set_port(port_);
    
    auto uri = uri_builder.to_uri();
    listener_ = std::make_unique<web::http::experimental::listener::http_listener>(uri);
    
    // Set up request handlers
    
    // Record management endpoints
    listener_->support(web::http::methods::GET, [this](auto request) {
        auto path = web::uri::decode(request.relative_uri().path());
        
        if (std::regex_match(path, std::regex("/api/records/[^/]+"))) {
            handleGetRecord(request);
        } else if (std::regex_match(path, std::regex("/api/records"))) {
            handleListRecords(request);
        } else if (std::regex_match(path, std::regex("/api/compliance/check"))) {
            handleCheckCompliance(request);
        } else if (std::regex_match(path, std::regex("/api/compliance/requirements"))) {
            handleListComplianceRequirements(request);
        } else if (std::regex_match(path, std::regex("/api/syllabi/[^/]+"))) {
            handleGetSyllabus(request);
        } else if (std::regex_match(path, std::regex("/api/syllabi"))) {
            handleListSyllabi(request);
        } else if (std::regex_match(path, std::regex("/api/syllabi/[^/]+/changes"))) {
            handleTrackSyllabusChanges(request);
        } else {
            request.reply(web::http::status_codes::NotFound);
        }
    });
    
    listener_->support(web::http::methods::POST, [this](auto request) {
        auto path = web::uri::decode(request.relative_uri().path());
        
        if (std::regex_match(path, std::regex("/api/records"))) {
            handleCreateRecord(request);
        } else if (std::regex_match(path, std::regex("/api/records/[^/]+/sign"))) {
            handleSignRecord(request);
        } else if (std::regex_match(path, std::regex("/api/records/[^/]+/verify"))) {
            handleVerifySignature(request);
        } else if (std::regex_match(path, std::regex("/api/compliance/map"))) {
            handleMapRegulations(request);
        } else if (std::regex_match(path, std::regex("/api/syllabi"))) {
            handleCreateSyllabus(request);
        } else {
            request.reply(web::http::status_codes::NotFound);
        }
    });
    
    listener_->support(web::http::methods::PUT, [this](auto request) {
        auto path = web::uri::decode(request.relative_uri().path());
        
        if (std::regex_match(path, std::regex("/api/records/[^/]+"))) {
            handleUpdateRecord(request);
        } else if (std::regex_match(path, std::regex("/api/syllabi/[^/]+"))) {
            handleUpdateSyllabus(request);
        } else {
            request.reply(web::http::status_codes::NotFound);
        }
    });
    
    listener_->support(web::http::methods::DEL, [this](auto request) {
        auto path = web::uri::decode(request.relative_uri().path());
        
        if (std::regex_match(path, std::regex("/api/records/[^/]+"))) {
            handleDeleteRecord(request);
        } else if (std::regex_match(path, std::regex("/api/syllabi/[^/]+"))) {
            handleDeleteSyllabus(request);
        } else {
            request.reply(web::http::status_codes::NotFound);
        }
    });
    
    logging::Logger::getInstance().info("REST API adapter initialized at http://{}:{}", host_, port_);
}

RestApiAdapter::~RestApiAdapter() {
    stop();
}

bool RestApiAdapter::start() {
    try {
        listener_->open().wait();
        logging::Logger::getInstance().info("REST API adapter started");
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Failed to start REST API adapter: {}", e.what());
        return false;
    }
}

void RestApiAdapter::stop() {
    try {
        if (listener_) {
            listener_->close().wait();
            logging::Logger::getInstance().info("REST API adapter stopped");
        }
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error stopping REST API adapter: {}", e.what());
    }
}

// Record management handlers

void RestApiAdapter::handleGetRecord(web::http::http_request request) {
    // Extract token and validate
    std::string token = extractToken(request);
    if (!validateToken(token)) {
        request.reply(web::http::status_codes::Unauthorized, U("Invalid authentication token"));
        return;
    }
    
    try {
        // Extract record ID from URL
        auto path = web::uri::decode(request.relative_uri().path());
        std::regex record_regex("/api/records/([^/]+)");
        std::smatch matches;
        
        if (std::regex_search(path, matches, record_regex) && matches.size() > 1) {
            std::string record_id = matches[1].str();
            
            // Get record
            auto record = record_service_->getRecord(record_id);
            
            if (record) {
                // Convert to JSON and respond
                auto response_json = recordToJson(*record);
                request.reply(web::http::status_codes::OK, response_json);
            } else {
                request.reply(web::http::status_codes::NotFound, U("Record not found"));
            }
        } else {
            request.reply(web::http::status_codes::BadRequest, U("Invalid record ID"));
        }
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error handling GET record request: {}", e.what());
        request.reply(web::http::status_codes::InternalError, U("Internal server error"));
    }
}

void RestApiAdapter::handleCreateRecord(web::http::http_request request) {
    // Extract token and validate
    std::string token = extractToken(request);
    if (!validateToken(token)) {
        request.reply(web::http::status_codes::Unauthorized, U("Invalid authentication token"));
        return;
    }
    
    try {
        // Extract record from request body
        request.extract_json().then([this, request](web::json::value json) {
            try {
                // Convert JSON to record
                auto record = jsonToRecord(json);
                
                // Create record
                std::string record_id = record_service_->createRecord(record);
                
                if (!record_id.empty()) {
                    // Create response
                    web::json::value response;
                    response[U("success")] = web::json::value::boolean(true);
                    response[U("record_id")] = web::json::value::string(record_id);
                    
                    // Respond
                    request.reply(web::http::status_codes::Created, response);
                } else {
                    request.reply(web::http::status_codes::BadRequest, U("Failed to create record"));
                }
            }
            catch (const std::exception& e) {
                logging::Logger::getInstance().error("Error processing record creation: {}", e.what());
                request.reply(web::http::status_codes::BadRequest, 
                    web::json::value::string(U("Invalid record data: ") + e.what()));
            }
        }).wait();
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error handling CREATE record request: {}", e.what());
        request.reply(web::http::status_codes::InternalError, U("Internal server error"));
    }
}

void RestApiAdapter::handleUpdateRecord(web::http::http_request request) {
    // Extract token and validate
    std::string token = extractToken(request);
    if (!validateToken(token)) {
        request.reply(web::http::status_codes::Unauthorized, U("Invalid authentication token"));
        return;
    }
    
    try {
        // Extract record ID from URL
        auto path = web::uri::decode(request.relative_uri().path());
        std::regex record_regex("/api/records/([^/]+)");
        std::smatch matches;
        
        if (std::regex_search(path, matches, record_regex) && matches.size() > 1) {
            std::string record_id = matches[1].str();
            
            // Extract record from request body
            request.extract_json().then([this, request, record_id](web::json::value json) {
                try {
                    // Convert JSON to record
                    auto record = jsonToRecord(json);
                    
                    // Ensure record ID matches
                    if (record.getRecordId() != record_id) {
                        record.setRecordId(record_id);
                    }
                    
                    // Update record
                    bool success = record_service_->updateRecord(record);
                    
                    if (success) {
                        // Create response
                        web::json::value response;
                        response[U("success")] = web::json::value::boolean(true);
                        response[U("record_id")] = web::json::value::string(record_id);
                        
                        // Respond
                        request.reply(web::http::status_codes::OK, response);
                    } else {
                        request.reply(web::http::status_codes::NotFound, U("Record not found"));
                    }
                }
                catch (const std::exception& e) {
                    logging::Logger::getInstance().error("Error processing record update: {}", e.what());
                    request.reply(web::http::status_codes::BadRequest, 
                        web::json::value::string(U("Invalid record data: ") + e.what()));
                }
            }).wait();
        } else {
            request.reply(web::http::status_codes::BadRequest, U("Invalid record ID"));
        }
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error handling UPDATE record request: {}", e.what());
        request.reply(web::http::status_codes::InternalError, U("Internal server error"));
    }
}

void RestApiAdapter::handleDeleteRecord(web::http::http_request request) {
    // Extract token and validate
    std::string token = extractToken(request);
    if (!validateToken(token)) {
        request.reply(web::http::status_codes::Unauthorized, U("Invalid authentication token"));
        return;
    }
    
    try {
        // Extract record ID from URL
        auto path = web::uri::decode(request.relative_uri().path());
        std::regex record_regex("/api/records/([^/]+)");
        std::smatch matches;
        
        if (std::regex_search(path, matches, record_regex) && matches.size() > 1) {
            std::string record_id = matches[1].str();
            
            // Delete record
            bool success = record_service_->deleteRecord(record_id);
            
            if (success) {
                // Create response
                web::json::value response;
                response[U("success")] = web::json::value::boolean(true);
                response[U("record_id")] = web::json::value::string(record_id);
                
                // Respond
                request.reply(web::http::status_codes::OK, response);
            } else {
                request.reply(web::http::status_codes::NotFound, U("Record not found"));
            }
        } else {
            request.reply(web::http::status_codes::BadRequest, U("Invalid record ID"));
        }
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error handling DELETE record request: {}", e.what());
        request.reply(web::http::status_codes::InternalError, U("Internal server error"));
    }
}

void RestApiAdapter::handleListRecords(web::http::http_request request) {
    // Extract token and validate
    std::string token = extractToken(request);
    if (!validateToken(token)) {
        request.reply(web::http::status_codes::Unauthorized, U("Invalid authentication token"));
        return;
    }
    
    try {
        // Extract query parameters
        auto query_params = request.relative_uri().query();
        auto query_map = web::uri::split_query(query_params);
        
        // Parse parameters
        std::optional<std::string> trainee_id;
        std::optional<std::string> instructor_id;
        std::optional<std::string> course_id;
        std::optional<std::string> syllabus_id;
        std::optional<records::RecordType> record_type;
        std::optional<std::chrono::system_clock::time_point> start_date;
        std::optional<std::chrono::system_clock::time_point> end_date;
        int page = 1;
        int page_size = 10;
        std::string sort_by = "date";
        bool ascending = false;
        
        // Extract parameters from query string
        if (query_map.find(U("trainee_id")) != query_map.end()) {
            trainee_id = utility::conversions::to_utf8string(query_map[U("trainee_id")]);
        }
        
        if (query_map.find(U("instructor_id")) != query_map.end()) {
            instructor_id = utility::conversions::to_utf8string(query_map[U("instructor_id")]);
        }
        
        if (query_map.find(U("course_id")) != query_map.end()) {
            course_id = utility::conversions::to_utf8string(query_map[U("course_id")]);
        }
        
        if (query_map.find(U("syllabus_id")) != query_map.end()) {
            syllabus_id = utility::conversions::to_utf8string(query_map[U("syllabus_id")]);
        }
        
        if (query_map.find(U("record_type")) != query_map.end()) {
            std::string type_str = utility::conversions::to_utf8string(query_map[U("record_type")]);
            int type_value = std::stoi(type_str);
            record_type = static_cast<records::RecordType>(type_value);
        }
        
        if (query_map.find(U("start_date")) != query_map.end()) {
            std::string date_str = utility::conversions::to_utf8string(query_map[U("start_date")]);
            int64_t timestamp = std::stoll(date_str);
            start_date = std::chrono::system_clock::time_point(std::chrono::milliseconds(timestamp));
        }
        
        if (query_map.find(U("end_date")) != query_map.end()) {
            std::string date_str = utility::conversions::to_utf8string(query_map[U("end_date")]);
            int64_t timestamp = std::stoll(date_str);
            end_date = std::chrono::system_clock::time_point(std::chrono::milliseconds(timestamp));
        }
        
        if (query_map.find(U("page")) != query_map.end()) {
            page = std::stoi(utility::conversions::to_utf8string(query_map[U("page")]));
        }
        
        if (query_map.find(U("page_size")) != query_map.end()) {
            page_size = std::stoi(utility::conversions::to_utf8string(query_map[U("page_size")]));
        }
        
        if (query_map.find(U("sort_by")) != query_map.end()) {
            sort_by = utility::conversions::to_utf8string(query_map[U("sort_by")]);
        }
        
        if (query_map.find(U("ascending")) != query_map.end()) {
            std::string asc_str = utility::conversions::to_utf8string(query_map[U("ascending")]);
            ascending = (asc_str == "true" || asc_str == "1");
        }
        
        // List records
        auto [records, total_count] = record_service_->listRecords(
            trainee_id,
            instructor_id,
            course_id,
            syllabus_id,
            record_type,
            start_date,
            end_date,
            page,
            page_size,
            sort_by,
            ascending
        );
        
        // Create response
        web::json::value response;
        response[U("success")] = web::json::value::boolean(true);
        response[U("total_count")] = web::json::value::number(total_count);
        response[U("page")] = web::json::value::number(page);
        response[U("page_size")] = web::json::value::number(page_size);
        
        // Add records to response
        web::json::value records_array = web::json::value::array(records.size());
        for (size_t i = 0; i < records.size(); i++) {
            records_array[i] = recordToJson(records[i]);
        }
        
        response[U("records")] = records_array;
        
        // Respond
        request.reply(web::http::status_codes::OK, response);
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error handling LIST records request: {}", e.what());
        request.reply(web::http::status_codes::InternalError, U("Internal server error"));
    }
}

// Digital signature handlers

void RestApiAdapter::handleSignRecord(web::http::http_request request) {
    // Extract token and validate
    std::string token = extractToken(request);
    if (!validateToken(token)) {
        request.reply(web::http::status_codes::Unauthorized, U("Invalid authentication token"));
        return;
    }
    
    try {
        // Extract record ID from URL
        auto path = web::uri::decode(request.relative_uri().path());
        std::regex record_regex("/api/records/([^/]+)/sign");
        std::smatch matches;
        
        if (std::regex_search(path, matches, record_regex) && matches.size() > 1) {
            std::string record_id = matches[1].str();
            
            // Extract signature data from request body
            request.extract_json().then([this, request, record_id](web::json::value json) {
                try {
                    // Get record
                    auto record_opt = record_service_->getRecord(record_id);
                    if (!record_opt) {
                        request.reply(web::http::status_codes::NotFound, U("Record not found"));
                        return;
                    }
                    
                    auto record = *record_opt;
                    
                    // Extract signature parameters
                    std::string signer_id = utility::conversions::to_utf8string(json[U("signer_id")].as_string());
                    std::string certificate_data = utility::conversions::to_utf8string(json[U("certificate_data")].as_string());
                    bool is_instructor = json[U("is_instructor")].as_bool();
                    
                    // Extract signature data
                    auto sig_data_array = json[U("signature_data")].as_array();
                    std::vector<uint8_t> signature_data;
                    for (const auto& val : sig_data_array) {
                        signature_data.push_back(static_cast<uint8_t>(val.as_integer()));
                    }
                    
                    // Sign record
                    auto signature_info = signature_service_->signRecord(
                        record,
                        signer_id,
                        certificate_data,
                        signature_data,
                        is_instructor
                    );
                    
                    if (signature_info) {
                        // Update record
                        bool update_success = record_service_->updateRecord(record);
                        
                        if (update_success) {
                            // Create response
                            web::json::value response;
                            response[U("success")] = web::json::value::boolean(true);
                            response[U("record_id")] = web::json::value::string(record_id);
                            response[U("signer_id")] = web::json::value::string(signer_id);
                            response[U("is_valid")] = web::json::value::boolean(signature_info->is_valid);
                            
                            // Respond
                            request.reply(web::http::status_codes::OK, response);
                        } else {
                            request.reply(web::http::status_codes::InternalError, U("Failed to update record with signature"));
                        }
                    } else {
                        request.reply(web::http::status_codes::BadRequest, U("Failed to sign record"));
                    }
                }
                catch (const std::exception& e) {
                    logging::Logger::getInstance().error("Error processing record signing: {}", e.what());
                    request.reply(web::http::status_codes::BadRequest, 
                        web::json::value::string(U("Invalid signature data: ") + e.what()));
                }
            }).wait();
        } else {
            request.reply(web::http::status_codes::BadRequest, U("Invalid record ID"));
        }
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error handling SIGN record request: {}", e.what());
        request.reply(web::http::status_codes::InternalError, U("Internal server error"));
    }
}

void RestApiAdapter::handleVerifySignature(web::http::http_request request) {
    // Extract token and validate
    std::string token = extractToken(request);
    if (!validateToken(token)) {
        request.reply(web::http::status_codes::Unauthorized, U("Invalid authentication token"));
        return;
    }
    
    try {
        // Extract record ID from URL
        auto path = web::uri::decode(request.relative_uri().path());
        std::regex record_regex("/api/records/([^/]+)/verify");
        std::smatch matches;
        
        if (std::regex_search(path, matches, record_regex) && matches.size() > 1) {
            std::string record_id = matches[1].str();
            
            // Extract signer ID from request body
            request.extract_json().then([this, request, record_id](web::json::value json) {
                try {
                    // Get record
                    auto record_opt = record_service_->getRecord(record_id);
                    if (!record_opt) {
                        request.reply(web::http::status_codes::NotFound, U("Record not found"));
                        return;
                    }
                    
                    std::string signer_id = utility::conversions::to_utf8string(json[U("signer_id")].as_string());
                    
                    // Verify signature
                    auto verification = signature_service_->verifySignature(*record_opt, signer_id);
                    
                    if (verification) {
                        // Create response
                        web::json::value response;
                        response[U("success")] = web::json::value::boolean(true);
                        response[U("record_id")] = web::json::value::string(record_id);
                        response[U("signer_id")] = web::json::value::string(signer_id);
                        response[U("is_valid")] = web::json::value::boolean(verification->first);
                        
                        // Respond
                        request.reply(web::http::status_codes::OK, response);
                    } else {
                        request.reply(web::http::status_codes::BadRequest, U("Signature not found"));
                    }
                }
                catch (const std::exception& e) {
                    logging::Logger::getInstance().error("Error processing signature verification: {}", e.what());
                    request.reply(web::http::status_codes::BadRequest, 
                        web::json::value::string(U("Error verifying signature: ") + e.what()));
                }
            }).wait();
        } else {
            request.reply(web::http::status_codes::BadRequest, U("Invalid record ID"));
        }
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error handling VERIFY signature request: {}", e.what());
        request.reply(web::http::status_codes::InternalError, U("Internal server error"));
    }
}

// Compliance handlers

void RestApiAdapter::handleCheckCompliance(web::http::http_request request) {
    // Extract token and validate
    std::string token = extractToken(request);
    if (!validateToken(token)) {
        request.reply(web::http::status_codes::Unauthorized, U("Invalid authentication token"));
        return;
    }
    
    try {
        // Extract query parameters
        auto query_params = request.relative_uri().query();
        auto query_map = web::uri::split_query(query_params);
        
        if (query_map.find(U("trainee_id")) == query_map.end() ||
            query_map.find(U("regulation_id")) == query_map.end() ||
            query_map.find(U("certification_type")) == query_map.end()) {
            
            request.reply(web::http::status_codes::BadRequest, U("Missing required parameters"));
            return;
        }
        
        std::string trainee_id = utility::conversions::to_utf8string(query_map[U("trainee_id")]);
        std::string regulation_id = utility::conversions::to_utf8string(query_map[U("regulation_id")]);
        std::string certification_type = utility::conversions::to_utf8string(query_map[U("certification_type")]);
        
        // Check compliance
        auto status = compliance_service_->checkCompliance(
            trainee_id,
            regulation_id,
            certification_type
        );
        
        // Create response
        auto response_json = complianceStatusToJson(status);
        
        // Respond
        request.reply(web::http::status_codes::OK, response_json);
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error handling CHECK compliance request: {}", e.what());
        request.reply(web::http::status_codes::InternalError, U("Internal server error"));
    }
}

void RestApiAdapter::handleListComplianceRequirements(web::http::http_request request) {
    // Extract token and validate
    std::string token = extractToken(request);
    if (!validateToken(token)) {
        request.reply(web::http::status_codes::Unauthorized, U("Invalid authentication token"));
        return;
    }
    
    try {
        // Extract query parameters
        auto query_params = request.relative_uri().query();
        auto query_map = web::uri::split_query(query_params);
        
        std::optional<std::string> regulation_id;
        std::optional<std::string> certification_type;
        
        if (query_map.find(U("regulation_id")) != query_map.end()) {
            regulation_id = utility::conversions::to_utf8string(query_map[U("regulation_id")]);
        }
        
        if (query_map.find(U("certification_type")) != query_map.end()) {
            certification_type = utility::conversions::to_utf8string(query_map[U("certification_type")]);
        }
        
        // List requirements
        auto requirements = compliance_service_->listRequirements(
            regulation_id,
            certification_type
        );
        
        // Create response
        web::json::value response;
        response[U("success")] = web::json::value::boolean(true);
        
        // Add requirements to response
        web::json::value requirements_array = web::json::value::array(requirements.size());
        for (size_t i = 0; i < requirements.size(); i++) {
            web::json::value req;
            req[U("requirement_id")] = web::json::value::string(requirements[i].requirement_id);
            req[U("requirement_name")] = web::json::value::string(requirements[i].requirement_name);
            req[U("regulation_id")] = web::json::value::string(requirements[i].regulation_id);
            req[U("regulation_name")] = web::json::value::string(requirements[i].regulation_name);
            req[U("regulation_reference")] = web::json::value::string(requirements[i].regulation_reference);
            req[U("description")] = web::json::value::string(requirements[i].description);
            req[U("required_count")] = web::json::value::number(requirements[i].required_count);
            
            if (requirements[i].duration_days) {
                req[U("duration_days")] = web::json::value::number(*requirements[i].duration_days);
            }
            
            requirements_array[i] = req;
        }
        
        response[U("requirements")] = requirements_array;
        
        // Respond
        request.reply(web::http::status_codes::OK, response);
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error handling LIST compliance requirements request: {}", e.what());
        request.reply(web::http::status_codes::InternalError, U("Internal server error"));
    }
}

void RestApiAdapter::handleMapRegulations(web::http::http_request request) {
    // Extract token and validate
    std::string token = extractToken(request);
    if (!validateToken(token)) {
        request.reply(web::http::status_codes::Unauthorized, U("Invalid authentication token"));
        return;
    }
    
    try {
        // Extract mapping request from request body
        request.extract_json().then([this, request](web::json::value json) {
            try {
                std::string source_regulation_id = utility::conversions::to_utf8string(json[U("source_regulation_id")].as_string());
                std::string target_regulation_id = utility::conversions::to_utf8string(json[U("target_regulation_id")].as_string());
                
                // Map regulations
                auto mappings = compliance_service_->mapRegulations(
                    source_regulation_id,
                    target_regulation_id
                );
                
                // Create response
                web::json::value response;
                response[U("success")] = web::json::value::boolean(true);
                
                // Add mappings to response
                web::json::value mappings_array = web::json::value::array(mappings.size());
                for (size_t i = 0; i < mappings.size(); i++) {
                    web::json::value mapping;
                    mapping[U("source_requirement_id")] = web::json::value::string(mappings[i].source_requirement_id);
                    mapping[U("source_requirement_name")] = web::json::value::string(mappings[i].source_requirement_name);
                    mapping[U("target_requirement_id")] = web::json::value::string(mappings[i].target_requirement_id);
                    mapping[U("target_requirement_name")] = web::json::value::string(mappings[i].target_requirement_name);
                    mapping[U("equivalence_factor")] = web::json::value::number(mappings[i].equivalence_factor);
                    mapping[U("notes")] = web::json::value::string(mappings[i].notes);
                    
                    mappings_array[i] = mapping;
                }
                
                response[U("mappings")] = mappings_array;
                
                // Respond
                request.reply(web::http::status_codes::OK, response);
            }
            catch (const std::exception& e) {
                logging::Logger::getInstance().error("Error processing regulation mapping: {}", e.what());
                request.reply(web::http::status_codes::BadRequest, 
                    web::json::value::string(U("Invalid mapping request: ") + e.what()));
            }
        }).wait();
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error handling MAP regulations request: {}", e.what());
        request.reply(web::http::status_codes::InternalError, U("Internal server error"));
    }
}

// Syllabus handlers

void RestApiAdapter::handleGetSyllabus(web::http::http_request request) {
    // Extract token and validate
    std::string token = extractToken(request);
    if (!validateToken(token)) {
        request.reply(web::http::status_codes::Unauthorized, U("Invalid authentication token"));
        return;
    }
    
    try {
        // Extract syllabus ID from URL
        auto path = web::uri::decode(request.relative_uri().path());
        std::regex syllabus_regex("/api/syllabi/([^/]+)");
        std::smatch matches;
        
        if (std::regex_search(path, matches, syllabus_regex) && matches.size() > 1) {
            std::string syllabus_id = matches[1].str();
            
            // Extract query parameters
            auto query_params = request.relative_uri().query();
            auto query_map = web::uri::split_query(query_params);
            
            std::optional<std::string> version;
            
            if (query_map.find(U("version")) != query_map.end()) {
                version = utility::conversions::to_utf8string(query_map[U("version")]);
            }
            
            // Get syllabus
            auto syllabus = syllabus_service_->getSyllabus(syllabus_id, version);
            
            if (syllabus) {
                // Convert to JSON and respond
                auto response_json = syllabusToJson(*syllabus);
                request.reply(web::http::status_codes::OK, response_json);
            } else {
                request.reply(web::http::status_codes::NotFound, U("Syllabus not found"));
            }
        } else {
            request.reply(web::http::status_codes::BadRequest, U("Invalid syllabus ID"));
        }
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error handling GET syllabus request: {}", e.what());
        request.reply(web::http::status_codes::InternalError, U("Internal server error"));
    }
}

void RestApiAdapter::handleCreateSyllabus(web::http::http_request request) {
    // Extract token and validate
    std::string token = extractToken(request);
    if (!validateToken(token)) {
        request.reply(web::http::status_codes::Unauthorized, U("Invalid authentication token"));
        return;
    }
    
    try {
        // Extract syllabus from request body
        request.extract_json().then([this, request](web::json::value json) {
            try {
                // Convert JSON to syllabus
                auto syllabus = jsonToSyllabus(json);
                
                // Create syllabus
                std::string syllabus_id = syllabus_service_->createSyllabus(syllabus);
                
                if (!syllabus_id.empty()) {
                    // Create response
                    web::json::value response;
                    response[U("success")] = web::json::value::boolean(true);
                    response[U("syllabus_id")] = web::json::value::string(syllabus_id);
                    response[U("version")] = web::json::value::string(syllabus.getVersion());
                    
                    // Respond
                    request.reply(web::http::status_codes::Created, response);
                } else {
                    request.reply(web::http::status_codes::BadRequest, U("Failed to create syllabus"));
                }
            }
            catch (const std::exception& e) {
                logging::Logger::getInstance().error("Error processing syllabus creation: {}", e.what());
                request.reply(web::http::status_codes::BadRequest, 
                    web::json::value::string(U("Invalid syllabus data: ") + e.what()));
            }
        }).wait();
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error handling CREATE syllabus request: {}", e.what());
        request.reply(web::http::status_codes::InternalError, U("Internal server error"));
    }
}

void RestApiAdapter::handleUpdateSyllabus(web::http::http_request request) {
    // Extract token and validate
    std::string token = extractToken(request);
    if (!validateToken(token)) {
        request.reply(web::http::status_codes::Unauthorized, U("Invalid authentication token"));
        return;
    }
    
    std::string user_id = extractUserId(token);
    
    try {
        // Extract syllabus ID from URL
        auto path = web::uri::decode(request.relative_uri().path());
        std::regex syllabus_regex("/api/syllabi/([^/]+)");
        std::smatch matches;
        
        if (std::regex_search(path, matches, syllabus_regex) && matches.size() > 1) {
            std::string syllabus_id = matches[1].str();
            
            // Extract syllabus from request body
            request.extract_json().then([this, request, syllabus_id, user_id](web::json::value json) {
                try {
                    // Convert JSON to syllabus
                    auto syllabus = jsonToSyllabus(json);
                    
                    // Ensure syllabus ID matches
                    if (syllabus.getSyllabusId() != syllabus_id) {
                        syllabus.setSyllabusId(syllabus_id);
                    }
                    
                    // Update syllabus
                    bool success = syllabus_service_->updateSyllabus(syllabus, user_id);
                    
                    if (success) {
                        // Create response
                        web::json::value response;
                        response[U("success")] = web::json::value::boolean(true);
                        response[U("syllabus_id")] = web::json::value::string(syllabus_id);
                        response[U("version")] = web::json::value::string(syllabus.getVersion());
                        
                        // Respond
                        request.reply(web::http::status_codes::OK, response);
                    } else {
                        request.reply(web::http::status_codes::NotFound, U("Syllabus not found or not authorized"));
                    }
                }
                catch (const std::exception& e) {
                    logging::Logger::getInstance().error("Error processing syllabus update: {}", e.what());
                    request.reply(web::http::status_codes::BadRequest, 
                        web::json::value::string(U("Invalid syllabus data: ") + e.what()));
                }
            }).wait();
        } else {
            request.reply(web::http::status_codes::BadRequest, U("Invalid syllabus ID"));
        }
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error handling UPDATE syllabus request: {}", e.what());
        request.reply(web::http::status_codes::InternalError, U("Internal server error"));
    }
}

void RestApiAdapter::handleDeleteSyllabus(web::http::http_request request) {
    // Extract token and validate
    std::string token = extractToken(request);
    if (!validateToken(token)) {
        request.reply(web::http::status_codes::Unauthorized, U("Invalid authentication token"));
        return;
    }
    
    std::string user_id = extractUserId(token);
    
    try {
        // Extract syllabus ID from URL
        auto path = web::uri::decode(request.relative_uri().path());
        std::regex syllabus_regex("/api/syllabi/([^/]+)");
        std::smatch matches;
        
        if (std::regex_search(path, matches, syllabus_regex) && matches.size() > 1) {
            std::string syllabus_id = matches[1].str();
            
            // Delete syllabus
            bool success = syllabus_service_->deleteSyllabus(syllabus_id, user_id);
            
            if (success) {
                // Create response
                web::json::value response;
                response[U("success")] = web::json::value::boolean(true);
                response[U("syllabus_id")] = web::json::value::string(syllabus_id);
                
                // Respond
                request.reply(web::http::status_codes::OK, response);
            } else {
                request.reply(web::http::status_codes::NotFound, U("Syllabus not found or not authorized"));
            }
        } else {
            request.reply(web::http::status_codes::BadRequest, U("Invalid syllabus ID"));
        }
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error handling DELETE syllabus request: {}", e.what());
        request.reply(web::http::status_codes::InternalError, U("Internal server error"));
    }
}

void RestApiAdapter::handleListSyllabi(web::http::http_request request) {
    // Extract token and validate
    std::string token = extractToken(request);
    if (!validateToken(token)) {
        request.reply(web::http::status_codes::Unauthorized, U("Invalid authentication token"));
        return;
    }
    
    try {
        // Extract query parameters
        auto query_params = request.relative_uri().query();
        auto query_map = web::uri::split_query(query_params);
        
        // Parse parameters
        std::optional<std::string> course_id;
        std::optional<syllabus::SyllabusStatus> status;
        std::optional<std::chrono::system_clock::time_point> effective_date;
        int page = 1;
        int page_size = 10;
        std::string sort_by = "effective_date";
        bool ascending = false;
        
        // Extract parameters from query string
        if (query_map.find(U("course_id")) != query_map.end()) {
            course_id = utility::conversions::to_utf8string(query_map[U("course_id")]);
        }
        
        if (query_map.find(U("status")) != query_map.end()) {
            std::string status_str = utility::conversions::to_utf8string(query_map[U("status")]);
            int status_value = std::stoi(status_str);
            status = static_cast<syllabus::SyllabusStatus>(status_value);
        }
        
        if (query_map.find(U("effective_date")) != query_map.end()) {
            std::string date_str = utility::conversions::to_utf8string(query_map[U("effective_date")]);
            int64_t timestamp = std::stoll(date_str);
            effective_date = std::chrono::system_clock::time_point(std::chrono::milliseconds(timestamp));
        }
        
        if (query_map.find(U("page")) != query_map.end()) {
            page = std::stoi(utility::conversions::to_utf8string(query_map[U("page")]));
        }
        
        if (query_map.find(U("page_size")) != query_map.end()) {
            page_size = std::stoi(utility::conversions::to_utf8string(query_map[U("page_size")]));
        }
        
        if (query_map.find(U("sort_by")) != query_map.end()) {
            sort_by = utility::conversions::to_utf8string(query_map[U("sort_by")]);
        }
        
        if (query_map.find(U("ascending")) != query_map.end()) {
            std::string asc_str = utility::conversions::to_utf8string(query_map[U("ascending")]);
            ascending = (asc_str == "true" || asc_str == "1");
        }
        
        // List syllabi
        auto [syllabi, total_count] = syllabus_service_->listSyllabi(
            course_id,
            status,
            effective_date,
            page,
            page_size,
            sort_by,
            ascending
        );
        
        // Create response
        web::json::value response;
        response[U("success")] = web::json::value::boolean(true);
        response[U("total_count")] = web::json::value::number(total_count);
        response[U("page")] = web::json::value::number(page);
        response[U("page_size")] = web::json::value::number(page_size);
        
        // Add syllabi to response
        web::json::value syllabi_array = web::json::value::array(syllabi.size());
        for (size_t i = 0; i < syllabi.size(); i++) {
            web::json::value syllabus_json;
            syllabus_json[U("syllabus_id")] = web::json::value::string(syllabi[i].syllabus_id);
            syllabus_json[U("course_id")] = web::json::value::string(syllabi[i].course_id);
            syllabus_json[U("title")] = web::json::value::string(syllabi[i].title);
            syllabus_json[U("version")] = web::json::value::string(syllabi[i].version);
            syllabus_json[U("effective_date")] = web::json::value::number(
                std::chrono::duration_cast<std::chrono::milliseconds>(
                    syllabi[i].effective_date.time_since_epoch()
                ).count()
            );
            
            if (syllabi[i].expiration_date) {
                syllabus_json[U("expiration_date")] = web::json::value::number(
                    std::chrono::duration_cast<std::chrono::milliseconds>(
                        syllabi[i].expiration_date->time_since_epoch()
                    ).count()
                );
            }
            
            syllabus_json[U("status")] = web::json::value::number(static_cast<int>(syllabi[i].status));
            syllabus_json[U("author_id")] = web::json::value::string(syllabi[i].author_id);
            
            syllabi_array[i] = syllabus_json;
        }
        
        response[U("syllabi")] = syllabi_array;
        
        // Respond
        request.reply(web::http::status_codes::OK, response);
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error handling LIST syllabi request: {}", e.what());
        request.reply(web::http::status_codes::InternalError, U("Internal server error"));
    }
}

void RestApiAdapter::handleTrackSyllabusChanges(web::http::http_request request) {
    // Extract token and validate
    std::string token = extractToken(request);
    if (!validateToken(token)) {
        request.reply(web::http::status_codes::Unauthorized, U("Invalid authentication token"));
        return;
    }
    
    try {
        // Extract syllabus ID from URL
        auto path = web::uri::decode(request.relative_uri().path());
        std::regex syllabus_regex("/api/syllabi/([^/]+)/changes");
        std::smatch matches;
        
        if (std::regex_search(path, matches, syllabus_regex) && matches.size() > 1) {
            std::string syllabus_id = matches[1].str();
            
            // Extract query parameters
            auto query_params = request.relative_uri().query();
            auto query_map = web::uri::split_query(query_params);
            
            if (query_map.find(U("from_version")) == query_map.end() || 
                query_map.find(U("to_version")) == query_map.end()) {
                
                request.reply(web::http::status_codes::BadRequest, U("Missing required parameters"));
                return;
            }
            
            std::string from_version = utility::conversions::to_utf8string(query_map[U("from_version")]);
            std::string to_version = utility::conversions::to_utf8string(query_map[U("to_version")]);
            
            // Track changes
            auto changes = syllabus_service_->trackChanges(
                syllabus_id,
                from_version,
                to_version
            );
            
            // Create response
            web::json::value response;
            response[U("success")] = web::json::value::boolean(true);
            response[U("syllabus_id")] = web::json::value::string(syllabus_id);
            response[U("from_version")] = web::json::value::string(from_version);
            response[U("to_version")] = web::json::value::string(to_version);
            
            // Add changes to response
            web::json::value changes_array = web::json::value::array(changes.size());
            for (size_t i = 0; i < changes.size(); i++) {
                web::json::value change;
                change[U("change_type")] = web::json::value::string(
                    syllabus::changeTypeToString(changes[i].change_type)
                );
                change[U("element_type")] = web::json::value::string(
                    syllabus::elementTypeToString(changes[i].element_type)
                );
                change[U("element_id")] = web::json::value::string(changes[i].element_id);
                
                if (changes[i].parent_id) {
                    change[U("parent_id")] = web::json::value::string(*changes[i].parent_id);
                }
                
                change[U("description")] = web::json::value::string(changes[i].description);
                change[U("rationale")] = web::json::value::string(changes[i].rationale);
                change[U("author_id")] = web::json::value::string(changes[i].author_id);
                change[U("timestamp")] = web::json::value::number(
                    std::chrono::duration_cast<std::chrono::milliseconds>(
                        changes[i].timestamp.time_since_epoch()
                    ).count()
                );
                
                // Add old and new values
                web::json::value old_values = web::json::value::object();
                for (const auto& [key, value] : changes[i].old_values) {
                    old_values[utility::conversions::to_string_t(key)] = 
                        web::json::value::string(utility::conversions::to_string_t(value));
                }
                change[U("old_values")] = old_values;
                
                web::json::value new_values = web::json::value::object();
                for (const auto& [key, value] : changes[i].new_values) {
                    new_values[utility::conversions::to_string_t(key)] = 
                        web::json::value::string(utility::conversions::to_string_t(value));
                }
                change[U("new_values")] = new_values;
                
                changes_array[i] = change;
            }
            
            response[U("changes")] = changes_array;
            
            // Respond
            request.reply(web::http::status_codes::OK, response);
        } else {
            request.reply(web::http::status_codes::BadRequest, U("Invalid syllabus ID"));
        }
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Error handling TRACK syllabus changes request: {}", e.what());
        request.reply(web::http::status_codes::InternalError, U("Internal server error"));
    }
}

// Utility methods

std::string RestApiAdapter::extractToken(const web::http::http_request& request) {
    // Get Authorization header
    auto headers = request.headers();
    auto auth_iter = headers.find("Authorization");
    
    if (auth_iter != headers.end()) {
        std::string auth_header = auth_iter->second;
        
        // Check for Bearer prefix
        if (auth_header.substr(0, 7) == "Bearer ") {
            return auth_header.substr(7);
        }
    }
    
    return "";
}

bool RestApiAdapter::validateToken(const std::string& token) {
    // For demo purposes, just check if token is not empty
    // In a real implementation, this would validate with the core platform service
    if (token.empty()) {
        return false;
    }
    
    try {
        // Basic JWT validation
        auto decoded = jwt::decode(token);
        
        // Check expiration
        if (decoded.has_expires_at() && decoded.get_expires_at() < std::chrono::system_clock::now()) {
            logging::Logger::getInstance().warn("Token expired");
            return false;
        }
        
        return true;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().warn("Token validation error: {}", e.what());
        return false;
    }
}

std::string RestApiAdapter::extractUserId(const std::string& token) {
    if (token.empty()) {
        return "";
    }
    
    try {
        // Decode JWT to extract user ID
        auto decoded = jwt::decode(token);
        return decoded.get_subject();
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().warn("Error extracting user ID from token: {}", e.what());
        return "";
    }
}

// Conversion methods

web::json::value RestApiAdapter::recordToJson(const records::TrainingRecord& record) {
    web::json::value json;
    
    json[U("record_id")] = web::json::value::string(record.getRecordId());
    json[U("trainee_id")] = web::json::value::string(record.getTraineeId());
    json[U("instructor_id")] = web::json::value::string(record.getInstructorId());
    json[U("record_type")] = web::json::value::number(static_cast<int>(record.getRecordType()));
    json[U("course_id")] = web::json::value::string(record.getCourseId());
    json[U("syllabus_id")] = web::json::value::string(record.getSyllabusId());
    json[U("exercise_id")] = web::json::value::string(record.getExerciseId());
    
    // Set date
    json[U("date")] = web::json::value::number(
        std::chrono::duration_cast<std::chrono::milliseconds>(
            record.getDate().time_since_epoch()
        ).count()
    );
    
    json[U("duration_minutes")] = web::json::value::number(record.getDurationMinutes());
    json[U("location")] = web::json::value::string(record.getLocation());
    json[U("aircraft_type")] = web::json::value::string(record.getAircraftType());
    
    // Set grades
    web::json::value grades_array = web::json::value::array(record.getGrades().size());
    for (size_t i = 0; i < record.getGrades().size(); i++) {
        web::json::value grade;
        grade[U("criteria_id")] = web::json::value::string(record.getGrades()[i].criteria_id);
        grade[U("criteria_name")] = web::json::value::string(record.getGrades()[i].criteria_name);
        grade[U("grade")] = web::json::value::number(record.getGrades()[i].grade);
        grade[U("comments")] = web::json::value::string(record.getGrades()[i].comments);
        
        grades_array[i] = grade;
    }
    
    json[U("grades")] = grades_array;
    
    // Set attachments
    web::json::value attachments_array = web::json::value::array(record.getAttachments().size());
    for (size_t i = 0; i < record.getAttachments().size(); i++) {
        attachments_array[i] = web::json::value::string(record.getAttachments()[i]);
    }
    
    json[U("attachments")] = attachments_array;
    
    json[U("comments")] = web::json::value::string(record.getComments());
    
    // Set signatures
    if (record.getTraineeSignature()) {
        web::json::value trainee_sig;
        trainee_sig[U("signer_id")] = web::json::value::string(record.getTraineeSignature()->signer_id);
        trainee_sig[U("signer_name")] = web::json::value::string(record.getTraineeSignature()->signer_name);
        trainee_sig[U("certificate_id")] = web::json::value::string(record.getTraineeSignature()->certificate_id);
        trainee_sig[U("timestamp")] = web::json::value::number(
            std::chrono::duration_cast<std::chrono::milliseconds>(
                record.getTraineeSignature()->timestamp.time_since_epoch()
            ).count()
        );
        trainee_sig[U("is_valid")] = web::json::value::boolean(record.getTraineeSignature()->is_valid);
        
        json[U("trainee_signature")] = trainee_sig;
    }
    
    if (record.getInstructorSignature()) {
        web::json::value instructor_sig;
        instructor_sig[U("signer_id")] = web::json::value::string(record.getInstructorSignature()->signer_id);
        instructor_sig[U("signer_name")] = web::json::value::string(record.getInstructorSignature()->signer_name);
        instructor_sig[U("certificate_id")] = web::json::value::string(record.getInstructorSignature()->certificate_id);
        instructor_sig[U("timestamp")] = web::json::value::number(
            std::chrono::duration_cast<std::chrono::milliseconds>(
                record.getInstructorSignature()->timestamp.time_since_epoch()
            ).count()
        );
        instructor_sig[U("is_valid")] = web::json::value::boolean(record.getInstructorSignature()->is_valid);
        
        json[U("instructor_signature")] = instructor_sig;
    }
    
    json[U("is_draft")] = web::json::value::boolean(record.isDraft());
    
    // Set timestamps
    json[U("created_at")] = web::json::value::number(
        std::chrono::duration_cast<std::chrono::milliseconds>(
            record.getCreatedAt().time_since_epoch()
        ).count()
    );
    
    json[U("updated_at")] = web::json::value::number(
        std::chrono::duration_cast<std::chrono::milliseconds>(
            record.getUpdatedAt().time_since_epoch()
        ).count()
    );
    
    // Set metadata
    web::json::value metadata = web::json::value::object();
    for (const auto& [key, value] : record.getMetadata()) {
        metadata[utility::conversions::to_string_t(key)] = web::json::value::string(utility::conversions::to_string_t(value));
    }
    
    json[U("metadata")] = metadata;
    
    return json;
}

records::TrainingRecord RestApiAdapter::jsonToRecord(const web::json::value& json) {
    records::TrainingRecord record;
    
    if (json.has_field(U("record_id"))) {
        record.setRecordId(utility::conversions::to_utf8string(json.at(U("record_id")).as_string()));
    }
    
    record.setTraineeId(utility::conversions::to_utf8string(json.at(U("trainee_id")).as_string()));
    record.setInstructorId(utility::conversions::to_utf8string(json.at(U("instructor_id")).as_string()));
    record.setRecordType(static_cast<records::RecordType>(json.at(U("record_type")).as_integer()));
    record.setCourseId(utility::conversions::to_utf8string(json.at(U("course_id")).as_string()));
    record.setSyllabusId(utility::conversions::to_utf8string(json.at(U("syllabus_id")).as_string()));
    record.setExerciseId(utility::conversions::to_utf8string(json.at(U("exercise_id")).as_string()));
    
    // Set date
    record.setDate(std::chrono::system_clock::time_point(
        std::chrono::milliseconds(json.at(U("date")).as_number().to_int64())
    ));
    
    record.setDurationMinutes(json.at(U("duration_minutes")).as_integer());
    record.setLocation(utility::conversions::to_utf8string(json.at(U("location")).as_string()));
    record.setAircraftType(utility::conversions::to_utf8string(json.at(U("aircraft_type")).as_string()));
    
    // Set grades
    std::vector<records::GradeItem> grades;
    for (const auto& grade_json : json.at(U("grades")).as_array()) {
        records::GradeItem grade;
        grade.criteria_id = utility::conversions::to_utf8string(grade_json.at(U("criteria_id")).as_string());
        grade.criteria_name = utility::conversions::to_utf8string(grade_json.at(U("criteria_name")).as_string());
        grade.grade = grade_json.at(U("grade")).as_integer();
        grade.comments = utility::conversions::to_utf8string(grade_json.at(U("comments")).as_string());
        
        grades.push_back(grade);
    }
    
    record.setGrades(grades);
    
    // Set attachments
    std::vector<std::string> attachments;
    for (const auto& attachment : json.at(U("attachments")).as_array()) {
        attachments.push_back(utility::conversions::to_utf8string(attachment.as_string()));
    }
    
    record.setAttachments(attachments);
    
    record.setComments(utility::conversions::to_utf8string(json.at(U("comments")).as_string()));
    
    record.setDraft(json.at(U("is_draft")).as_bool());
    
    // Set metadata
    std::map<std::string, std::string> metadata;
    for (const auto& pair : json.at(U("metadata")).as_object()) {
        metadata[utility::conversions::to_utf8string(pair.first)] = 
            utility::conversions::to_utf8string(pair.second.as_string());
    }
    
    record.setMetadata(metadata);
    
    return record;
}

web::json::value RestApiAdapter::syllabusToJson(const syllabus::Syllabus& syllabus) {
    // Implement conversion from Syllabus to JSON
    // Since Syllabus is complex, I'm providing a simplified implementation
    web::json::value json;
    
    json[U("syllabus_id")] = web::json::value::string(syllabus.getSyllabusId());
    json[U("course_id")] = web::json::value::string(syllabus.getCourseId());
    json[U("title")] = web::json::value::string(syllabus.getTitle());
    json[U("description")] = web::json::value::string(syllabus.getDescription());
    json[U("version")] = web::json::value::string(syllabus.getVersion());
    
    return json;
}

syllabus::Syllabus RestApiAdapter::jsonToSyllabus(const web::json::value& json) {
    // Implement conversion from JSON to Syllabus
    // Since Syllabus is complex, I'm providing a simplified implementation
    syllabus::Syllabus syllabus;
    
    if (json.has_field(U("syllabus_id"))) {
        syllabus.setSyllabusId(utility::conversions::to_utf8string(json.at(U("syllabus_id")).as_string()));
    }
    
    syllabus.setCourseId(utility::conversions::to_utf8string(json.at(U("course_id")).as_string()));
    syllabus.setTitle(utility::conversions::to_utf8string(json.at(U("title")).as_string()));
    syllabus.setDescription(utility::conversions::to_utf8string(json.at(U("description")).as_string()));
    syllabus.setVersion(utility::conversions::to_utf8string(json.at(U("version")).as_string()));
    
    return syllabus;
}

web::json::value RestApiAdapter::complianceStatusToJson(const compliance::ComplianceStatus& status) {
    web::json::value json;
    
    json[U("is_compliant")] = web::json::value::boolean(status.is_compliant);
    
    web::json::value items_array = web::json::value::array(status.compliance_items.size());
    for (size_t i = 0; i < status.compliance_items.size(); i++) {
        web::json::value item;
        item[U("requirement_id")] = web::json::value::string(status.compliance_items[i].requirement_id);
        item[U("requirement_name")] = web::json::value::string(status.compliance_items[i].requirement_name);
        item[U("regulation_reference")] = web::json::value::string(status.compliance_items[i].regulation_reference);
        item[U("is_satisfied")] = web::json::value::boolean(status.compliance_items[i].is_satisfied);
        item[U("required_count")] = web::json::value::number(status.compliance_items[i].required_count);
        item[U("completed_count")] = web::json::value::number(status.compliance_items[i].completed_count);
        
        web::json::value records_array = web::json::value::array(status.compliance_items[i].satisfied_by_records.size());
        for (size_t j = 0; j < status.compliance_items[i].satisfied_by_records.size(); j++) {
            records_array[j] = web::json::value::string(status.compliance_items[i].satisfied_by_records[j]);
        }
        
        item[U("satisfied_by_records")] = records_array;
        
        if (status.compliance_items[i].expiration_date) {
            item[U("expiration_date")] = web::json::value::number(
                std::chrono::duration_cast<std::chrono::milliseconds>(
                    status.compliance_items[i].expiration_date->time_since_epoch()
                ).count()
            );
        }
        
        items_array[i] = item;
    }
    
    json[U("compliance_items")] = items_array;
    
    return json;
}

} // namespace rest
} // namespace etr