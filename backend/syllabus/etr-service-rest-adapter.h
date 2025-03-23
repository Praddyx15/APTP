#pragma once

#include <string>
#include <memory>
#include <cpprest/http_listener.h>
#include <cpprest/json.h>
#include <cpprest/uri.h>
#include <cpprest/http_client.h>
#include "records/record_service.h"
#include "signature/digital_signature.h"
#include "compliance/compliance_service.h"
#include "syllabus/syllabus_service.h"
#include "logging/logger.h"

namespace etr {
namespace rest {

/**
 * @brief REST API adapter for ETR service
 */
class RestApiAdapter {
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
    RestApiAdapter(
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
    ~RestApiAdapter();
    
    /**
     * @brief Start the REST API server
     * @return True if started successfully
     */
    bool start();
    
    /**
     * @brief Stop the REST API server
     */
    void stop();
    
private:
    // Record management handlers
    void handleGetRecord(web::http::http_request request);
    void handleCreateRecord(web::http::http_request request);
    void handleUpdateRecord(web::http::http_request request);
    void handleDeleteRecord(web::http::http_request request);
    void handleListRecords(web::http::http_request request);
    
    // Digital signature handlers
    void handleSignRecord(web::http::http_request request);
    void handleVerifySignature(web::http::http_request request);
    
    // Compliance handlers
    void handleCheckCompliance(web::http::http_request request);
    void handleListComplianceRequirements(web::http::http_request request);
    void handleMapRegulations(web::http::http_request request);
    
    // Syllabus handlers
    void handleGetSyllabus(web::http::http_request request);
    void handleCreateSyllabus(web::http::http_request request);
    void handleUpdateSyllabus(web::http::http_request request);
    void handleDeleteSyllabus(web::http::http_request request);
    void handleListSyllabi(web::http::http_request request);
    void handleTrackSyllabusChanges(web::http::http_request request);
    
    // Utility methods
    std::string extractToken(const web::http::http_request& request);
    bool validateToken(const std::string& token);
    std::string extractUserId(const std::string& token);
    
    // Convert between internal models and JSON
    web::json::value recordToJson(const records::TrainingRecord& record);
    records::TrainingRecord jsonToRecord(const web::json::value& json);
    
    web::json::value syllabusToJson(const syllabus::Syllabus& syllabus);
    syllabus::Syllabus jsonToSyllabus(const web::json::value& json);
    
    web::json::value complianceStatusToJson(const compliance::ComplianceStatus& status);
    
    std::string host_;
    int port_;
    std::unique_ptr<web::http::experimental::listener::http_listener> listener_;
    
    std::shared_ptr<records::IRecordService> record_service_;
    std::shared_ptr<signature::IDigitalSignatureService> signature_service_;
    std::shared_ptr<compliance::IComplianceService> compliance_service_;
    std::shared_ptr<syllabus::ISyllabusService> syllabus_service_;
};

} // namespace rest
} // namespace etr