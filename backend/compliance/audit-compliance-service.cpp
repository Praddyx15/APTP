#include <drogon/drogon.h>
#include <json/json.h>
#include <openssl/sha.h>
#include <string>
#include <vector>
#include <chrono>
#include <memory>
#include <mutex>
#include "blockchain_verifier.h"
#include "regulatory_matrix.h"

namespace atp {
namespace compliance {

class AuditComplianceService : public drogon::HttpController<AuditComplianceService> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(AuditComplianceService::recordAuditEvent, "/api/audit/record", drogon::Post);
    ADD_METHOD_TO(AuditComplianceService::verifyAuditTrail, "/api/audit/verify", drogon::Post);
    ADD_METHOD_TO(AuditComplianceService::queryAuditLogs, "/api/audit/query", drogon::Post);
    ADD_METHOD_TO(AuditComplianceService::checkCompliance, "/api/compliance/check", drogon::Post);
    ADD_METHOD_TO(AuditComplianceService::trackComplianceChanges, "/api/compliance/changes", drogon::Post);
    ADD_METHOD_TO(AuditComplianceService::generateComplianceReport, "/api/compliance/report", drogon::Post);
    ADD_METHOD_TO(AuditComplianceService::detectComplianceImpact, "/api/compliance/impact", drogon::Post);
    METHOD_LIST_END

    AuditComplianceService();

    void recordAuditEvent(const drogon::HttpRequestPtr& req, 
                         std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void verifyAuditTrail(const drogon::HttpRequestPtr& req,
                         std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void queryAuditLogs(const drogon::HttpRequestPtr& req,
                       std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void checkCompliance(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void trackComplianceChanges(const drogon::HttpRequestPtr& req,
                               std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void generateComplianceReport(const drogon::HttpRequestPtr& req,
                                 std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void detectComplianceImpact(const drogon::HttpRequestPtr& req,
                               std::function<void(const drogon::HttpResponsePtr&)>&& callback);

private:
    std::shared_ptr<BlockchainVerifier> blockchainVerifier_;
    std::shared_ptr<RegulatoryMatrix> regulatoryMatrix_;
    
    // Thread-safe audit log cache
    std::vector<Json::Value> auditLogCache_;
    std::mutex auditLogMutex_;
    
    // Maximum cache size before flushing to persistent storage
    const size_t MAX_CACHE_SIZE = 1000;
    
    // Helper methods
    std::string generateHash(const Json::Value& event);
    bool verifyHash(const std::string& hash, const Json::Value& event);
    void flushAuditLogCache();
    Json::Value enrichAuditEvent(const Json::Value& baseEvent, const drogon::HttpRequestPtr& req);
    Json::Value filterAuditLogs(const std::vector<Json::Value>& logs, const Json::Value& filters);
    Json::Value analyzeComplianceImpact(const Json::Value& changes, const std::string& regulationType);
};

AuditComplianceService::AuditComplianceService() {
    // Initialize components
    blockchainVerifier_ = std::make_shared<BlockchainVerifier>();
    regulatoryMatrix_ = std::make_shared<RegulatoryMatrix>();
    
    // Load regulatory frameworks
    regulatoryMatrix_->loadRegulatoryFrameworks();
}

void AuditComplianceService::recordAuditEvent(const drogon::HttpRequestPtr& req, 
                       std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        // Enrich the event with metadata
        Json::Value enrichedEvent = enrichAuditEvent(*json, req);
        
        // Generate hash for integrity verification
        std::string eventHash = generateHash(enrichedEvent);
        enrichedEvent["hash"] = eventHash;
        
        // Add to blockchain for tamper-proof verification
        std::string blockId = blockchainVerifier_->addToChain(eventHash, enrichedEvent);
        enrichedEvent["block_id"] = blockId;
        
        // Store in cache
        {
            std::lock_guard<std::mutex> lock(auditLogMutex_);
            auditLogCache_.push_back(enrichedEvent);
            
            // Flush if cache reaches threshold
            if (auditLogCache_.size() >= MAX_CACHE_SIZE) {
                flushAuditLogCache();
            }
        }
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["event_id"] = enrichedEvent["event_id"];
        result["hash"] = eventHash;
        result["block_id"] = blockId;
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
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

void AuditComplianceService::verifyAuditTrail(const drogon::HttpRequestPtr& req,
                       std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        std::string eventId = (*json)["event_id"].asString();
        
        // Retrieve event from storage
        Json::Value event = blockchainVerifier_->getEvent(eventId);
        
        if (event.isNull()) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Event not found";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k404NotFound);
            callback(resp);
            return;
        }
        
        // Verify hash for tampering detection
        std::string storedHash = event["hash"].asString();
        
        // Create a copy without the hash field for verification
        Json::Value eventForVerification = event;
        eventForVerification.removeMember("hash");
        eventForVerification.removeMember("block_id");
        
        std::string calculatedHash = generateHash(eventForVerification);
        bool hashValid = (calculatedHash == storedHash);
        
        // Verify blockchain integrity
        bool blockchainValid = blockchainVerifier_->verifyBlock(event["block_id"].asString());
        
        // Prepare response
        Json::Value result;
        result["event_id"] = eventId;
        result["hash_valid"] = hashValid;
        result["blockchain_valid"] = blockchainValid;
        result["overall_validity"] = (hashValid && blockchainValid);
        
        if (!hashValid || !blockchainValid) {
            result["tampering_detected"] = true;
            result["timestamp"] = drogon::utils::getFormattedDate();
        }
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
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

void AuditComplianceService::queryAuditLogs(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        // Extract query parameters
        Json::Value filters = (*json)["filters"];
        int limit = (*json)["limit"].asInt();
        int offset = (*json)["offset"].asInt();
        
        if (limit <= 0) limit = 100;  // Default limit
        if (offset < 0) offset = 0;   // Default offset
        
        // Get audit logs from storage
        std::vector<Json::Value> logs = blockchainVerifier_->getAuditLogs(limit, offset);
        
        // Apply filters if specified
        if (!filters.isNull()) {
            logs = filterAuditLogs(logs, filters);
        }
        
        // Prepare response
        Json::Value result;
        result["total"] = static_cast<int>(logs.size());
        
        Json::Value events(Json::arrayValue);
        for (const auto& log : logs) {
            events.append(log);
        }
        
        result["events"] = events;
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
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

void AuditComplianceService::checkCompliance(const drogon::HttpRequestPtr& req,
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        std::string entityType = (*json)["entity_type"].asString();
        std::string entityId = (*json)["entity_id"].asString();
        std::string regulationType = (*json)["regulation_type"].asString();
        
        // Get entity data for compliance checking
        Json::Value entityData = (*json)["entity_data"];
        
        // Check compliance against specified regulatory framework
        Json::Value complianceResult = regulatoryMatrix_->checkCompliance(
            entityType, entityData, regulationType
        );
        
        // Record compliance check in audit log
        Json::Value auditEvent;
        auditEvent["event_type"] = "compliance_check";
        auditEvent["entity_type"] = entityType;
        auditEvent["entity_id"] = entityId;
        auditEvent["regulation_type"] = regulationType;
        auditEvent["compliance_result"] = complianceResult["compliant"];
        
        // Asynchronously record audit event
        auto auditReq = drogon::HttpRequest::newHttpJsonRequest(auditEvent);
        recordAuditEvent(auditReq, [](const drogon::HttpResponsePtr&) {});
        
        // Prepare response
        Json::Value result;
        result["entity_id"] = entityId;
        result["regulation_type"] = regulationType;
        result["compliance_result"] = complianceResult;
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
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

void AuditComplianceService::trackComplianceChanges(const drogon::HttpRequestPtr& req,
                             std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        std::string regulationType = (*json)["regulation_type"].asString();
        std::string entityType = (*json)["entity_type"].asString();
        std::string entityId = (*json)["entity_id"].asString();
        
        // Get dates for comparison
        std::string fromDate = (*json)["from_date"].asString();
        std::string toDate = (*json)["to_date"].asString();
        
        // Get compliance changes over time
        Json::Value changeHistory = regulatoryMatrix_->trackComplianceChanges(
            entityType, entityId, regulationType, fromDate, toDate
        );
        
        // Analyze trends
        bool improvingTrend = false;
        bool deterioratingTrend = false;
        
        if (changeHistory["changes"].size() > 1) {
            int positiveDelta = 0;
            int negativeDelta = 0;
            
            for (int i = 1; i < changeHistory["changes"].size(); ++i) {
                int prevCompliance = changeHistory["changes"][i-1]["compliance_percentage"].asInt();
                int currCompliance = changeHistory["changes"][i]["compliance_percentage"].asInt();
                
                if (currCompliance > prevCompliance) {
                    positiveDelta++;
                } else if (currCompliance < prevCompliance) {
                    negativeDelta++;
                }
            }
            
            improvingTrend = (positiveDelta > negativeDelta);
            deterioratingTrend = (negativeDelta > positiveDelta);
        }
        
        // Prepare response
        Json::Value result;
        result["entity_id"] = entityId;
        result["regulation_type"] = regulationType;
        result["change_history"] = changeHistory;
        result["improving_trend"] = improvingTrend;
        result["deteriorating_trend"] = deterioratingTrend;
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
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

void AuditComplianceService::generateComplianceReport(const drogon::HttpRequestPtr& req,
                               std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        std::string reportType = (*json)["report_type"].asString();
        std::string regulationType = (*json)["regulation_type"].asString();
        std::string entityType = (*json)["entity_type"].asString();
        std::string entityId = (*json).get("entity_id", "").asString();
        
        // Optional date range
        std::string fromDate = (*json).get("from_date", "").asString();
        std::string toDate = (*json).get("to_date", "").asString();
        
        // Generate appropriate compliance report
        Json::Value report;
        
        if (reportType == "entity") {
            // Report for specific entity
            if (entityId.empty()) {
                throw std::runtime_error("Entity ID required for entity-level report");
            }
            
            report = regulatoryMatrix_->generateEntityReport(
                entityType, entityId, regulationType
            );
        }
        else if (reportType == "summary") {
            // Summary report across all entities of specified type
            report = regulatoryMatrix_->generateSummaryReport(
                entityType, regulationType, fromDate, toDate
            );
        }
        else if (reportType == "trend") {
            // Trend report over time
            if (fromDate.empty() || toDate.empty()) {
                throw std::runtime_error("Date range required for trend report");
            }
            
            report = regulatoryMatrix_->generateTrendReport(
                entityType, regulationType, fromDate, toDate
            );
        }
        else if (reportType == "gap") {
            // Gap analysis report
            report = regulatoryMatrix_->generateGapAnalysisReport(
                entityType, entityId, regulationType
            );
        }
        else {
            throw std::runtime_error("Unknown report type: " + reportType);
        }
        
        // Add metadata to report
        report["report_type"] = reportType;
        report["regulation_type"] = regulationType;
        report["entity_type"] = entityType;
        report["generated_at"] = drogon::utils::getFormattedDate();
        
        if (!entityId.empty()) {
            report["entity_id"] = entityId;
        }
        
        if (!fromDate.empty()) {
            report["from_date"] = fromDate;
        }
        
        if (!toDate.empty()) {
            report["to_date"] = toDate;
        }
        
        // Record report generation in audit log
        Json::Value auditEvent;
        auditEvent["event_type"] = "compliance_report_generated";
        auditEvent["report_type"] = reportType;
        auditEvent["regulation_type"] = regulationType;
        auditEvent["entity_type"] = entityType;
        
        if (!entityId.empty()) {
            auditEvent["entity_id"] = entityId;
        }
        
        // Asynchronously record audit event
        auto auditReq = drogon::HttpRequest::newHttpJsonRequest(auditEvent);
        recordAuditEvent(auditReq, [](const drogon::HttpResponsePtr&) {});
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(report);
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

void AuditComplianceService::detectComplianceImpact(const drogon::HttpRequestPtr& req,
                             std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        std::string entityType = (*json)["entity_type"].asString();
        std::string entityId = (*json)["entity_id"].asString();
        std::string regulationType = (*json)["regulation_type"].asString();
        
        // Get the proposed changes
        Json::Value currentState = (*json)["current_state"];
        Json::Value proposedChanges = (*json)["proposed_changes"];
        
        // Apply proposed changes to current state to create new state
        Json::Value newState = currentState;
        
        // Merge changes into new state
        for (const auto& key : proposedChanges.getMemberNames()) {
            newState[key] = proposedChanges[key];
        }
        
        // Check compliance for both states
        Json::Value currentCompliance = regulatoryMatrix_->checkCompliance(
            entityType, currentState, regulationType
        );
        
        Json::Value newCompliance = regulatoryMatrix_->checkCompliance(
            entityType, newState, regulationType
        );
        
        // Analyze impact of changes
        Json::Value impact = analyzeComplianceImpact(proposedChanges, regulationType);
        
        // Prepare response
        Json::Value result;
        result["entity_id"] = entityId;
        result["regulation_type"] = regulationType;
        result["current_compliance"] = currentCompliance;
        result["projected_compliance"] = newCompliance;
        result["impact_analysis"] = impact;
        
        // Determine overall impact
        bool hasNegativeImpact = false;
        bool hasPositiveImpact = false;
        
        for (const auto& item : impact) {
            if (item["impact_type"].asString() == "negative") {
                hasNegativeImpact = true;
            }
            else if (item["impact_type"].asString() == "positive") {
                hasPositiveImpact = true;
            }
        }
        
        if (hasNegativeImpact) {
            result["alert"] = "Proposed changes may negatively impact compliance";
            result["alert_level"] = "warning";
            
            if (newCompliance["compliant"].asBool() == false && 
                currentCompliance["compliant"].asBool() == true) {
                result["alert_level"] = "critical";
                result["alert"] = "Proposed changes will cause non-compliance";
            }
        }
        else if (hasPositiveImpact) {
            result["alert"] = "Proposed changes improve compliance";
            result["alert_level"] = "positive";
        }
        else {
            result["alert"] = "No significant compliance impact detected";
            result["alert_level"] = "info";
        }
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
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

// Helper methods
std::string AuditComplianceService::generateHash(const Json::Value& event) {
    // Convert JSON to string for hashing
    std::string eventStr = event.toStyledString();
    
    // Generate SHA-256 hash
    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256(reinterpret_cast<const unsigned char*>(eventStr.c_str()), eventStr.length(), hash);
    
    // Convert hash to hexadecimal string
    std::stringstream ss;
    for (int i = 0; i < SHA256_DIGEST_LENGTH; ++i) {
        ss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(hash[i]);
    }
    
    return ss.str();
}

bool AuditComplianceService::verifyHash(const std::string& hash, const Json::Value& event) {
    // Regenerate hash and compare
    std::string calculatedHash = generateHash(event);
    return (calculatedHash == hash);
}

void AuditComplianceService::flushAuditLogCache() {
    // In production, this would persist logs to a database
    // For this example, we're simulating persistence
    
    std::lock_guard<std::mutex> lock(auditLogMutex_);
    
    // Process each cached log
    for (const auto& log : auditLogCache_) {
        // In production, this would be a database write operation
        // Here we're just ensuring the logs are recorded in the blockchain
        blockchainVerifier_->ensurePersisted(log["event_id"].asString());
    }
    
    // Clear cache after flushing
    auditLogCache_.clear();
}

Json::Value AuditComplianceService::enrichAuditEvent(const Json::Value& baseEvent, const drogon::HttpRequestPtr& req) {
    Json::Value enrichedEvent = baseEvent;
    
    // Add timestamp if not present
    if (!enrichedEvent.isMember("timestamp")) {
        enrichedEvent["timestamp"] = drogon::utils::getFormattedDate();
    }
    
    // Add event ID if not present
    if (!enrichedEvent.isMember("event_id")) {
        // Generate a unique ID (e.g., UUID)
        std::string eventId = generateUniqueId();
        enrichedEvent["event_id"] = eventId;
    }
    
    // Add source information
    if (!enrichedEvent.isMember("source")) {
        Json::Value source;
        source["ip_address"] = req->getPeerAddr().toIp();
        
        // Get user information from request (assuming authentication is in place)
        auto userIdPtr = req->getAttributes()->find("user_id");
        if (userIdPtr) {
            source["user_id"] = *any_cast<std::string>(userIdPtr);
        }
        
        enrichedEvent["source"] = source;
    }
    
    return enrichedEvent;
}

std::string AuditComplianceService::generateUniqueId() {
    // Implementation for generating a unique ID (e.g., UUID)
    // This is a simplified version for illustration
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

Json::Value AuditComplianceService::filterAuditLogs(const std::vector<Json::Value>& logs, const Json::Value& filters) {
    std::vector<Json::Value> filteredLogs;
    
    // Apply filters to each log
    for (const auto& log : logs) {
        bool matchesAllFilters = true;
        
        // Check each filter condition
        for (const auto& filterKey : filters.getMemberNames()) {
            if (log.isMember(filterKey)) {
                // Simple string equality for now
                // In production, this would support more complex filtering
                if (log[filterKey].asString() != filters[filterKey].asString()) {
                    matchesAllFilters = false;
                    break;
                }
            }
            else {
                // Filter key doesn't exist in log
                matchesAllFilters = false;
                break;
            }
        }
        
        if (matchesAllFilters) {
            filteredLogs.push_back(log);
        }
    }
    
    // Convert to JSON array
    Json::Value result(Json::arrayValue);
    for (const auto& log : filteredLogs) {
        result.append(log);
    }
    
    return result;
}

Json::Value AuditComplianceService::analyzeComplianceImpact(const Json::Value& changes, const std::string& regulationType) {
    // In a real implementation, this would analyze specific regulatory impacts
    // For now, we'll use a simplified approach
    
    Json::Value impacts(Json::arrayValue);
    
    // Get regulatory requirements for the specified type
    auto requirements = regulatoryMatrix_->getRegulatoryRequirements(regulationType);
    
    // Check each change against requirements
    for (const auto& key : changes.getMemberNames()) {
        for (const auto& req : requirements) {
            // Check if this change affects the requirement
            if (req["affects_field"].asString() == key) {
                Json::Value impact;
                impact["requirement_id"] = req["id"];
                impact["requirement_description"] = req["description"];
                impact["field"] = key;
                
                // Determine impact type (simplified logic)
                if (req["allowed_values"].isArray()) {
                    bool inAllowedValues = false;
                    
                    for (const auto& allowedValue : req["allowed_values"]) {
                        if (changes[key].asString() == allowedValue.asString()) {
                            inAllowedValues = true;
                            break;
                        }
                    }
                    
                    if (inAllowedValues) {
                        impact["impact_type"] = "positive";
                        impact["description"] = "Change aligns with regulatory requirement";
                    }
                    else {
                        impact["impact_type"] = "negative";
                        impact["description"] = "Change may violate regulatory requirement";
                    }
                }
                else if (req["min_value"].isNumeric() && changes[key].isNumeric()) {
                    if (changes[key].asDouble() < req["min_value"].asDouble()) {
                        impact["impact_type"] = "negative";
                        impact["description"] = "Value below required minimum";
                    }
                    else if (req["max_value"].isNumeric() && changes[key].asDouble() > req["max_value"].asDouble()) {
                        impact["impact_type"] = "negative";
                        impact["description"] = "Value above allowed maximum";
                    }
                    else {
                        impact["impact_type"] = "positive";
                        impact["description"] = "Value within allowed range";
                    }
                }
                else {
                    impact["impact_type"] = "unknown";
                    impact["description"] = "Cannot determine impact automatically";
                }
                
                impacts.append(impact);
            }
        }
    }
    
    return impacts;
}

} // namespace compliance
} // namespace atp

// Main application entry point
int main() {
    // Configure Drogon app
    drogon::app().setLogPath("./")
                 .setLogLevel(trantor::Logger::kInfo)
                 .addListener("0.0.0.0", 8082)
                 .setThreadNum(16)
                 .run();
    
    return 0;
}
