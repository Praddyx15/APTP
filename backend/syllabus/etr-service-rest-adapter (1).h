#pragma once

#include <string>
#include <memory>
#include <functional>
#include <cpprest/http_listener.h>
#include <cpprest/json.h>
#include <cpprest/uri.h>
#include <cpprest/http_client.h>
#include <cpprest/filestream.h>
#include <cpprest/interopstream.h>

#include "records/record_service.h"
#include "signature/digital_signature.h"
#include "compliance/compliance_service.h"
#include "syllabus/syllabus_service.h"

namespace etr {
namespace rest {

/**
 * @brief REST adapter for the ETR service
 */
class RestAdapter {
public:
    /**
     * @brief Constructor
     * @param host Host to bind to
     * @param port Port to bind to
     * @param record_service Record service
     * @param signature_service Signature service
     * @param compliance_service Compliance service
     * @param syllabus_service Syllabus service
     */
    RestAdapter(
        const std::string& host,
        int port,
        std::shared_ptr<records::IRecordService> record_service,
        std::shared_ptr<signature::IDigitalSignatureService> signature_service,
        std::shared_ptr<compliance::IComplianceService> compliance_service,
        std::shared_ptr<syllabus::ISyllabusService> syllabus_service
    );
    
    /**
     * @brief Destructor
     */
    ~RestAdapter();
    
    /**
     * @brief Start the REST server
     * @return True if started successfully
     */
    bool start();
    
    /**
     * @brief Stop the REST server
     */
    void stop();
    
private:
    /**
     * @brief Validate JWT token
     * @param request HTTP request
     * @return User ID or empty string if invalid
     */
    std::string validateToken(const web::http::http_request& request);
    
    /**
     * @brief Handle HTTP GET /api/health
     * @param request HTTP request
     */
    void handleHealth(const web::http::http_request& request);
    
    /**
     * @brief Handle HTTP OPTIONS requests
     * @param request HTTP request
     */
    void handleOptions(const web::http::http_request& request);
    
    // Records API
    
    /**
     * @brief Handle HTTP GET /api/records
     * @param request HTTP request
     */
    void handleGetRecords(const web::http::http_request& request);
    
    /**
     * @brief Handle HTTP GET /api/records/{id}
     * @param request HTTP request
     */
    void handleGetRecord(const web::http::http_request& request);
    
    /**
     * @brief Handle HTTP POST /api/records
     * @param request HTTP request
     */
    void handleCreateRecord(const web::http::http_request& request);
    
    /**
     * @brief Handle HTTP PUT /api/records/{id}
     * @param request HTTP request
     */
    void handleUpdateRecord(const web::http::http_request& request);
    
    /**
     * @brief Handle HTTP DELETE /api/records/{id}
     * @param request HTTP request
     */
    void handleDeleteRecord(const web::http::http_request& request);
    
    /**
     * @brief Handle HTTP GET /api/records/{id}/audit
     * @param request HTTP request
     */
    void handleGetRecordAudit(const web::http::http_request& request);
    
    /**
     * @brief Handle HTTP POST /api/records/{id}/attachments
     * @param request HTTP request
     */
    void handleAddAttachment(const web::http::http_request& request);
    
    /**
     * @brief Handle HTTP GET /api/records/{id}/attachments/{path}
     * @param request HTTP request
     */
    void handleGetAttachment(const web::http::http_request& request);
    
    // Signature API
    
    /**
     * @brief Handle HTTP POST /api/records/{id}/sign
     * @param request HTTP request
     */
    void handleSignRecord(const web::http::http_request& request);
    
    /**
     * @brief Handle HTTP GET /api/records/{id}/verify
     * @param request HTTP request
     */
    void handleVerifySignature(const web::http::http_request& request);
    
    // Compliance API
    
    /**
     * @brief Handle HTTP GET /api/compliance/{traineeId}
     * @param request HTTP request
     */
    void handleCheckCompliance(const web::http::http_request& request);
    
    /**
     * @brief Handle HTTP GET /api/compliance/requirements
     * @param request HTTP request
     */
    void handleGetRequirements(const web::http::http_request& request);
    
    /**
     * @brief Handle HTTP GET /api/compliance/mapping
     * @param request HTTP request
     */
    void handleGetMapping(const web::http::http_request& request);
    
    // Syllabus API
    
    /**
     * @brief Handle HTTP GET /api/syllabi
     * @param request HTTP request
     */
    void handleGetSyllabi(const web::http::http_request& request);
    
    /**
     * @brief Handle HTTP GET /api/syllabi/{id}
     * @param request HTTP request
     */
    void handleGetSyllabus(const web::http::http_request& request);
    
    /**
     * @brief Handle HTTP POST /api/syllabi
     * @param request HTTP request
     */
    void handleCreateSyllabus(const web::http::http_request& request);
    
    /**
     * @brief Handle HTTP PUT /api/syllabi/{id}
     * @param request HTTP request
     */
    void handleUpdateSyllabus(const web::http::http_request& request);
    
    /**
     * @brief Handle HTTP DELETE /api/syllabi/{id}
     * @param request HTTP request
     */
    void handleDeleteSyllabus(const web::http::http_request& request);
    
    /**
     * @brief Handle HTTP GET /api/syllabi/{id}/changes
     * @param request HTTP request
     */
    void handleGetSyllabusChanges(const web::http::http_request& request);
    
    std::shared_ptr<records::IRecordService> record_service_;
    std::shared_ptr<signature::IDigitalSignatureService> signature_service_;
    std::shared_ptr<compliance::IComplianceService> compliance_service_;
    std::shared_ptr<syllabus::ISyllabusService> syllabus_service_;
    
    std::unique_ptr<web::http::experimental::listener::http_listener> listener_;
    std::string host_;
    int port_;
    std::string base_url_;
    
    // CORS settings
    std::vector<std::string> allowed_origins_;
    std::vector<std::string> allowed_methods_;
    std::vector<std::string> allowed_headers_;
    bool allow_credentials_;
    int max_age_;
};

} // namespace rest
} // namespace etr