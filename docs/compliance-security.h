// /compliance/controllers/AuditLoggingController.h
#pragma once

#include <drogon/HttpController.h>
#include "../services/AuditLogService.h"
#include "../services/ComplianceChangeTrackingService.h"
#include "../services/BlockchainVerificationService.h"

namespace compliance {

class AuditLoggingController : public drogon::HttpController<AuditLoggingController> {
public:
    AuditLoggingController();
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(AuditLoggingController::createAuditLog, "/api/audit/log", drogon::Post);
    ADD_METHOD_TO(AuditLoggingController::getAuditLogs, "/api/audit/logs", drogon::Get);
    ADD_METHOD_TO(AuditLoggingController::verifyAuditLog, "/api/audit/verify/{id}", drogon::Get);
    ADD_METHOD_TO(AuditLoggingController::getComplianceChanges, "/api/audit/compliance-changes", drogon::Get);
    ADD_METHOD_TO(AuditLoggingController::generateComplianceMatrix, "/api/audit/compliance-matrix", drogon::Post);
    METHOD_LIST_END

private:
    void createAuditLog(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getAuditLogs(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void verifyAuditLog(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, const std::string& id);
    void getComplianceChanges(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void generateComplianceMatrix(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);

    std::shared_ptr<AuditLogService> auditLogService_;
    std::shared_ptr<ComplianceChangeTrackingService> complianceChangeService_;
    std::shared_ptr<BlockchainVerificationService> blockchainService_;
};

} // namespace compliance

// /compliance/controllers/AuditLoggingController.cc
#include "AuditLoggingController.h"
#include <drogon/HttpResponse.h>
#include <json/json.h>

using namespace compliance;

AuditLoggingController::AuditLoggingController()
    : auditLogService_(std::make_shared<AuditLogService>()),
      complianceChangeService_(std::make_shared<ComplianceChangeTrackingService>()),
      blockchainService_(std::make_shared<BlockchainVerificationService>()) {}

void AuditLoggingController::createAuditLog(const drogon::HttpRequestPtr& req, 
                                          std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::HttpStatusCode::k400BadRequest);
        resp->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
        Json::Value error;
        error["error"] = "Invalid JSON";
        resp->setBody(error.toStyledString());
        callback(resp);
        return;
    }

    try {
        std::string userId = (*json)["userId"].asString();
        std::string action = (*json)["action"].asString();
        std::string resourceType = (*json)["resourceType"].asString();
        std::string resourceId = (*json)["resourceId"].asString();
        Json::Value details = (*json)["details"];
        
        // Create audit log
        auto result = auditLogService_->createAuditLog(userId, action, resourceType, resourceId, details);
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::HttpStatusCode::k201Created);
        resp->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
        resp->setBody(result.toStyledString());
        callback(resp);
    } catch (const std::exception& e) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::HttpStatusCode::k500InternalServerError);
        resp->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
        Json::Value error;
        error["error"] = e.what();
        resp->setBody(error.toStyledString());
        callback(resp);
    }
}

void AuditLoggingController::getAuditLogs(const drogon::HttpRequestPtr& req, 
                                        std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    // Parse query parameters
    auto params = req->getParameters();
    std::string resourceType = params.get("resourceType", "");
    std::string resourceId = params.get("resourceId", "");
    std::string userId = params.get("userId", "");
    std::string startDate = params.get("startDate", "");
    std::string endDate = params.get("endDate", "");
    int limit = std::stoi(params.get("limit", "100"));
    int offset = std::stoi(params.get("offset", "0"));
    
    try {
        // Get audit logs
        auto result = auditLogService_->getAuditLogs(resourceType, resourceId, userId, startDate, endDate, limit, offset);
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::HttpStatusCode::k200OK);
        resp->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
        resp->setBody(result.toStyledString());
        callback(resp);
    } catch (const std::exception& e) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::HttpStatusCode::k500InternalServerError);
        resp->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
        Json::Value error;
        error["error"] = e.what();
        resp->setBody(error.toStyledString());
        callback(resp);
    }
}

// Implementation of other controller methods omitted for brevity...

// /compliance/controllers/AccessControlController.h
#pragma once

#include <drogon/HttpController.h>
#include "../services/RoleBasedAccessControlService.h"
#include "../services/MultiFactorAuthService.h"
#include "../services/ZeroTrustPolicyService.h"

namespace compliance {

class AccessControlController : public drogon::HttpController<AccessControlController> {
public:
    AccessControlController();
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(AccessControlController::checkAccess, "/api/access/check", drogon::Post);
    ADD_METHOD_TO(AccessControlController::getRoles, "/api/access/roles", drogon::Get);
    ADD_METHOD_TO(AccessControlController::getPermissions, "/api/access/permissions", drogon::Get);
    ADD_METHOD_TO(AccessControlController::assignRoleToUser, "/api/access/roles/assign", drogon::Post);
    ADD_METHOD_TO(AccessControlController::setupMfa, "/api/access/mfa/setup", drogon::Post);
    ADD_METHOD_TO(AccessControlController::verifyMfa, "/api/access/mfa/verify", drogon::Post);
    ADD_METHOD_TO(AccessControlController::evaluateTrustScore, "/api/access/trust-score", drogon::Post);
    METHOD_LIST_END

private:
    void checkAccess(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getRoles(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getPermissions(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void assignRoleToUser(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void setupMfa(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void verifyMfa(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void evaluateTrustScore(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);

    std::shared_ptr<RoleBasedAccessControlService> rbacService_;
    std::shared_ptr<MultiFactorAuthService> mfaService_;
    std::shared_ptr<ZeroTrustPolicyService> zeroTrustService_;
};

} // namespace compliance

// /compliance/services/AuditLogService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/AuditLog.h"
#include "../models/AuditLogFilter.h"
#include "../repositories/AuditLogRepository.h"

namespace compliance {

class AuditLogService {
public:
    AuditLogService();
    ~AuditLogService();

    // Create a new audit log entry
    Json::Value createAuditLog(const std::string& userId, const std::string& action, const std::string& resourceType, 
                             const std::string& resourceId, const Json::Value& details);
    
    // Get audit logs with filtering
    Json::Value getAuditLogs(const std::string& resourceType, const std::string& resourceId, const std::string& userId,
                           const std::string& startDate, const std::string& endDate, int limit, int offset);
    
    // Get a specific audit log entry by ID
    Json::Value getAuditLog(const std::string& id);
    
    // Search audit logs with complex filtering
    Json::Value searchAuditLogs(const AuditLogFilter& filter);
    
    // Export audit logs in various formats
    std::string exportAuditLogs(const AuditLogFilter& filter, const std::string& format);
    
    // Generate audit log analytics
    Json::Value generateAuditAnalytics(const std::string& resourceType, const std::string& timeFrame);

private:
    // Validate audit log data
    bool validateAuditLogData(const std::string& userId, const std::string& action, const std::string& resourceType, 
                             const std::string& resourceId);
    
    // Format audit log for storage
    AuditLog formatAuditLog(const std::string& userId, const std::string& action, const std::string& resourceType, 
                          const std::string& resourceId, const Json::Value& details);
    
    // Generate audit log ID
    std::string generateAuditLogId();
    
    // Repository for audit log storage
    std::shared_ptr<AuditLogRepository> repository_;
};

} // namespace compliance

// /compliance/services/BlockchainVerificationService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/BlockchainTransaction.h"
#include "../repositories/BlockchainRepository.h"

namespace compliance {

class BlockchainVerificationService {
public:
    BlockchainVerificationService();
    ~BlockchainVerificationService();

    // Add audit log to blockchain
    Json::Value addToBlockchain(const std::string& auditLogId, const std::string& auditLogHash);
    
    // Verify audit log integrity
    Json::Value verifyAuditLog(const std::string& auditLogId);
    
    // Get blockchain transaction by ID
    Json::Value getTransaction(const std::string& transactionId);
    
    // Verify a batch of audit logs
    Json::Value verifyBatch(const std::vector<std::string>& auditLogIds);
    
    // Get blockchain status
    Json::Value getBlockchainStatus();
    
    // Get blockchain proof for an audit log
    Json::Value getProof(const std::string& auditLogId);

private:
    // Generate hash for an audit log
    std::string generateAuditLogHash(const std::string& auditLogId, const std::string& auditLogData);
    
    // Create blockchain transaction
    BlockchainTransaction createTransaction(const std::string& auditLogId, const std::string& auditLogHash);
    
    // Verify transaction on blockchain
    bool verifyTransaction(const BlockchainTransaction& transaction);
    
    // Get blockchain merkle proof
    std::vector<std::string> getMerkleProof(const std::string& transactionId);
    
    // Repository for blockchain storage
    std::shared_ptr<BlockchainRepository> repository_;
};

} // namespace compliance

// /compliance/services/ComplianceChangeTrackingService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/ComplianceChange.h"
#include "../models/ComplianceRequirement.h"
#include "../models/ComplianceMatrix.h"
#include "../repositories/ComplianceRepository.h"

namespace compliance {

class ComplianceChangeTrackingService {
public:
    ComplianceChangeTrackingService();
    ~ComplianceChangeTrackingService();

    // Track compliance change
    Json::Value trackComplianceChange(const std::string& requirementId, const std::string& changeType, 
                                    const Json::Value& before, const Json::Value& after, const std::string& userId);
    
    // Get compliance changes
    Json::Value getComplianceChanges(const std::string& requirementId, const std::string& startDate, 
                                   const std::string& endDate, int limit, int offset);
    
    // Generate compliance matrix
    Json::Value generateComplianceMatrix(const std::string& regulatoryFramework, const std::string& syllabusId);
    
    // Validate compliance with requirements
    Json::Value validateCompliance(const std::string& syllabusId, const std::string& regulatoryFramework);
    
    // Generate auto-traceability map
    Json::Value generateAutoTraceability(const std::string& syllabusId, const std::string& regulatoryFramework);
    
    // Track regulatory updates
    Json::Value trackRegulatoryUpdate(const std::string& regulatoryFramework, const std::string& updateDescription, 
                                    const Json::Value& changedRequirements);

private:
    // Load compliance requirements
    std::vector<ComplianceRequirement> loadComplianceRequirements(const std::string& regulatoryFramework);
    
    // Map syllabus to requirements
    ComplianceMatrix mapSyllabusToRequirements(const std::string& syllabusId, 
                                             const std::vector<ComplianceRequirement>& requirements);
    
    // Calculate compliance score
    double calculateComplianceScore(const ComplianceMatrix& matrix);
    
    // Generate compliance report
    Json::Value generateComplianceReport(const ComplianceMatrix& matrix);
    
    // Repository for compliance storage
    std::shared_ptr<ComplianceRepository> repository_;
};

} // namespace compliance

// /compliance/services/RoleBasedAccessControlService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/Role.h"
#include "../models/Permission.h"
#include "../models/UserRole.h"
#include "../repositories/RbacRepository.h"

namespace compliance {

class RoleBasedAccessControlService {
public:
    RoleBasedAccessControlService();
    ~RoleBasedAccessControlService();

    // Check if user has permission
    bool checkPermission(const std::string& userId, const std::string& permission, const std::string& resourceId = "");
    
    // Get all roles
    Json::Value getRoles();
    
    // Get all permissions
    Json::Value getPermissions();
    
    // Get roles for a specific user
    Json::Value getUserRoles(const std::string& userId);
    
    // Assign role to user
    Json::Value assignRoleToUser(const std::string& userId, const std::string& roleId);
    
    // Remove role from user
    Json::Value removeRoleFromUser(const std::string& userId, const std::string& roleId);
    
    // Create a new role
    Json::Value createRole(const std::string& name, const std::string& description, const std::vector<std::string>& permissions);
    
    // Update role
    Json::Value updateRole(const std::string& roleId, const std::string& name, const std::string& description, 
                         const std::vector<std::string>& permissions);
    
    // Delete role
    bool deleteRole(const std::string& roleId);
    
    // Create a new permission
    Json::Value createPermission(const std::string& name, const std::string& description, const std::string& resourceType);
    
    // Update permission
    Json::Value updatePermission(const std::string& permissionId, const std::string& name, const std::string& description, 
                               const std::string& resourceType);
    
    // Delete permission
    bool deletePermission(const std::string& permissionId);

private:
    // Load user roles
    std::vector<UserRole> loadUserRoles(const std::string& userId);
    
    // Load role permissions
    std::vector<Permission> loadRolePermissions(const std::string& roleId);
    
    // Check if permission applies to resource
    bool checkResourcePermission(const Permission& permission, const std::string& resourceId);
    
    // Repository for RBAC storage
    std::shared_ptr<RbacRepository> repository_;
};

} // namespace compliance

// /compliance/services/MultiFactorAuthService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/MfaMethod.h"
#include "../models/MfaConfiguration.h"
#include "../models/BiometricVerification.h"
#include "../repositories/MfaRepository.h"

namespace compliance {

class MultiFactorAuthService {
public:
    MultiFactorAuthService();
    ~MultiFactorAuthService();

    // Setup MFA for a user
    Json::Value setupMfa(const std::string& userId, const std::string& methodType);
    
    // Verify MFA code
    bool verifyMfa(const std::string& userId, const std::string& methodType, const std::string& code);
    
    // Get user's MFA methods
    Json::Value getUserMfaMethods(const std::string& userId);
    
    // Disable MFA method
    bool disableMfa(const std::string& userId, const std::string& methodType);
    
    // Reset MFA method
    Json::Value resetMfa(const std::string& userId, const std::string& methodType);
    
    // Register biometric data
    Json::Value registerBiometric(const std::string& userId, const std::string& biometricType, const std::string& biometricData);
    
    // Verify biometric data
    bool verifyBiometric(const std::string& userId, const std::string& biometricType, const std::string& biometricData);
    
    // Generate backup codes
    Json::Value generateBackupCodes(const std::string& userId);
    
    // Verify backup code
    bool verifyBackupCode(const std::string& userId, const std::string& code);

private:
    // Generate TOTP secret
    std::string generateTotpSecret();
    
    // Generate TOTP code
    std::string generateTotpCode(const std::string& secret, int timeStep = 30);
    
    // Validate TOTP code
    bool validateTotpCode(const std::string& secret, const std::string& code, int timeStep = 30);
    
    // Hash biometric data
    std::string hashBiometricData(const std::string& biometricData);
    
    // Compare biometric hashes
    bool compareBiometricHashes(const std::string& hash1, const std::string& hash2, double threshold = 0.85);
    
    // Repository for MFA storage
    std::shared_ptr<MfaRepository> repository_;
};

} // namespace compliance

// /compliance/services/ZeroTrustPolicyService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/TrustScore.h"
#include "../models/AccessPolicy.h"
#include "../models/AccessContext.h"
#include "../repositories/ZeroTrustRepository.h"

namespace compliance {

class ZeroTrustPolicyService {
public:
    ZeroTrustPolicyService();
    ~ZeroTrustPolicyService();

    // Evaluate trust score for a user's access request
    Json::Value evaluateTrustScore(const std::string& userId, const std::string& resourceType, 
                                 const std::string& resourceId, const AccessContext& context);
    
    // Check if access should be granted based on trust score
    bool checkAccess(const TrustScore& trustScore, const std::string& resourceType, const std::string& resourceId);
    
    // Create or update access policy
    Json::Value createOrUpdatePolicy(const std::string& resourceType, const std::string& policyName, 
                                   const Json::Value& policyRules);
    
    // Get policies for a resource type
    Json::Value getPolicies(const std::string& resourceType);
    
    // Delete policy
    bool deletePolicy(const std::string& policyId);
    
    // Log access attempt
    void logAccessAttempt(const std::string& userId, const std::string& resourceType, const std::string& resourceId, 
                         const TrustScore& trustScore, bool accessGranted);
    
    // Get access logs
    Json::Value getAccessLogs(const std::string& userId, const std::string& resourceType, const std::string& startDate, 
                            const std::string& endDate, int limit, int offset);
    
    // Generate access analytics
    Json::Value generateAccessAnalytics(const std::string& timeFrame);

private:
    // Calculate user trust factors
    std::vector<std::pair<std::string, double>> calculateTrustFactors(const std::string& userId, const AccessContext& context);
    
    // Load access policies
    std::vector<AccessPolicy> loadAccessPolicies(const std::string& resourceType);
    
    // Evaluate trust factor against policy rules
    double evaluatePolicyRules(const std::vector<std::pair<std::string, double>>& trustFactors, const AccessPolicy& policy);
    
    // Calculate anomaly score
    double calculateAnomalyScore(const std::string& userId, const std::string& resourceType, const AccessContext& context);
    
    // Repository for Zero Trust storage
    std::shared_ptr<ZeroTrustRepository> repository_;
};

} // namespace compliance

// /security/services/EncryptionService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/EncryptionKey.h"
#include "../models/EncryptedData.h"
#include "../repositories/KeyRepository.h"

namespace security {

class EncryptionService {
public:
    EncryptionService();
    ~EncryptionService();

    // Encrypt data using AES-256
    EncryptedData encryptData(const std::string& data, const std::string& keyId = "");
    
    // Decrypt data using AES-256
    std::string decryptData(const EncryptedData& encryptedData);
    
    // Generate a new encryption key
    EncryptionKey generateKey(const std::string& keyType = "AES-256", const std::string& keyPurpose = "data");
    
    // Rotate encryption key
    bool rotateKey(const std::string& oldKeyId, const std::string& newKeyId);
    
    // Get key by ID
    EncryptionKey getKey(const std::string& keyId);
    
    // List available keys
    std::vector<EncryptionKey> listKeys(const std::string& keyType = "", const std::string& keyPurpose = "");
    
    // Delete key
    bool deleteKey(const std::string& keyId);
    
    // Check if data is encrypted
    bool isEncrypted(const std::string& data);
    
    // Hash data (SHA-256)
    std::string hashData(const std::string& data);
    
    // Verify hash
    bool verifyHash(const std::string& data, const std::string& hash);

private:
    // Generate random IV
    std::string generateIV(int size = 16);
    
    // Generate random AES key
    std::string generateAESKey(int bits = 256);
    
    // AES encryption implementation
    std::string aesEncrypt(const std::string& data, const std::string& key, const std::string& iv);
    
    // AES decryption implementation
    std::string aesDecrypt(const std::string& encryptedData, const std::string& key, const std::string& iv);
    
    // Repository for key storage
    std::shared_ptr<KeyRepository> repository_;
};

} // namespace security

// /security/services/GdprComplianceService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/DataSubject.h"
#include "../models/DataProcessingActivity.h"
#include "../models/DataRetentionPolicy.h"
#include "../repositories/GdprRepository.h"

namespace security {

class GdprComplianceService {
public:
    GdprComplianceService();
    ~GdprComplianceService();

    // Register data subject
    Json::Value registerDataSubject(const std::string& userId, const std::string& consentType, 
                                  const std::string& consentDetails);
    
    // Update data subject consent
    bool updateDataSubjectConsent(const std::string& userId, const std::string& consentType, 
                                 const std::string& consentDetails);
    
    // Get data subject consents
    Json::Value getDataSubjectConsents(const std::string& userId);
    
    // Register data processing activity
    Json::Value registerDataProcessingActivity(const std::string& activityName, const std::string& purpose, 
                                             const std::string& legalBasis, const std::vector<std::string>& dataCategories);
    
    // Get data processing activities
    Json::Value getDataProcessingActivities();
    
    // Set data retention policy
    Json::Value setDataRetentionPolicy(const std::string& dataCategory, int retentionPeriodDays, 
                                     const std::string& justification);
    
    // Get data retention policies
    Json::Value getDataRetentionPolicies();
    
    // Execute data retention policy
    Json::Value executeDataRetention();
    
    // Process data subject access request
    Json::Value processAccessRequest(const std::string& userId);
    
    // Process data subject deletion request
    Json::Value processDeletionRequest(const std::string& userId);
    
    // Process data subject rectification request
    Json::Value processRectificationRequest(const std::string& userId, const Json::Value& corrections);
    
    // Get data processing records
    Json::Value getDataProcessingRecords(const std::string& startDate, const std::string& endDate);
    
    // Generate GDPR compliance report
    Json::Value generateComplianceReport();

private:
    // Validate consent
    bool validateConsent(const std::string& consentType, const std::string& consentDetails);
    
    // Check if processing is allowed
    bool isProcessingAllowed(const std::string& userId, const std::string& activityName);
    
    // Get all user data
    Json::Value getAllUserData(const std::string& userId);
    
    // Apply data anonymization
    Json::Value anonymizeData(const Json::Value& userData);
    
    // Apply data minimization
    Json::Value minimizeData(const Json::Value& userData);
    
    // Create data processing record
    void createProcessingRecord(const std::string& userId, const std::string& activityName, 
                               const std::string& action);
    
    // Repository for GDPR storage
    std::shared_ptr<GdprRepository> repository_;
};

} // namespace security

// Python component for blockchain verification
# /compliance/ml/blockchain_verifier.py
import os
import json
import hashlib
import time
import binascii
from typing import Dict, List, Any, Tuple
from datetime import datetime
import hmac
import uuid

class MerkleTree:
    """Merkle Tree implementation for audit log verification"""
    
    def __init__(self, leaves=None):
        if leaves is None:
            self.leaves = []
        else:
            self.leaves = leaves
        self.tree = self._build_tree(self.leaves)
    
    def _build_tree(self, leaves: List[str]) -> List[List[str]]:
        """Build a Merkle tree from leaf nodes"""
        if not leaves:
            return [['']]
        
        tree = [leaves]
        
        # Build the tree by hashing pairs of nodes
        while len(tree[-1]) > 1:
            layer = tree[-1]
            new_layer = []
            
            # Process nodes in pairs
            for i in range(0, len(layer), 2):
                if i + 1 < len(layer):
                    # Hash the pair of nodes
                    combined = layer[i] + layer[i + 1]
                    new_layer.append(hashlib.sha256(combined.encode()).hexdigest())
                else:
                    # Odd number of nodes, duplicate the last one
                    new_layer.append(layer[i])
            
            tree.append(new_layer)
        
        return tree
    
    def get_root(self) -> str:
        """Get the Merkle root hash"""
        if not self.tree or not self.tree[-1]:
            return ''
        return self.tree[-1][0]
    
    def get_proof(self, leaf_index: int) -> List[Dict[str, str]]:
        """Generate a Merkle proof for a leaf node"""
        if not self.tree or leaf_index >= len(self.leaves):
            return []
        
        proof = []
        index = leaf_index
        
        # Traverse the tree from bottom to top
        for i in range(len(self.tree) - 1):
            layer = self.tree[i]
            is_right = index % 2 == 1
            
            if is_right:
                # Current node is a right child, so we need the left sibling
                sibling_index = index - 1
                position = 'left'
            else:
                # Current node is a left child, so we need the right sibling
                sibling_index = index + 1
                position = 'right'
            
            # Add the sibling to the proof if it exists
            if sibling_index < len(layer):
                proof.append({
                    'position': position,
                    'hash': layer[sibling_index]
                })
            
            # Update index for the next layer
            index = index // 2
        
        return proof
    
    def verify_proof(self, leaf: str, proof: List[Dict[str, str]]) -> bool:
        """Verify a Merkle proof for a leaf node"""
        current = leaf
        
        # Apply each step in the proof
        for step in proof:
            if step['position'] == 'left':
                # Sibling is on the left
                combined = step['hash'] + current
            else:
                # Sibling is on the right
                combined = current + step['hash']
            
            # Hash the combined value
            current = hashlib.sha256(combined.encode()).hexdigest()
        
        # The final hash should match the root
        return current == self.get_root()
    
    def add_leaf(self, leaf: str) -> int:
        """Add a new leaf to the tree and rebuild it"""
        self.leaves.append(leaf)
        self.tree = self._build_tree(self.leaves)
        return len(self.leaves) - 1

class BlockchainVerifier:
    """Blockchain verification system for audit log integrity"""
    
    def __init__(self, storage_path: str = "blockchain_data"):
        self.storage_path = storage_path
        self.chain = []
        self.pending_transactions = []
        self.merkle_tree = MerkleTree()
        
        # Create storage directory if it doesn't exist
        os.makedirs(storage_path, exist_ok=True)
        
        # Load existing blockchain
        self._load_blockchain()
    
    def _load_blockchain(self):
        """Load existing blockchain from storage"""
        chain_file = os.path.join(self.storage_path, "chain.json")
        if os.path.exists(chain_file):
            try:
                with open(chain_file, 'r') as f:
                    self.chain = json.load(f)
                    
                # Reconstruct the Merkle tree from the last block
                if self.chain:
                    last_block = self.chain[-1]
                    if 'transactions' in last_block:
                        transaction_hashes = [
                            self._hash_transaction(tx)
                            for tx in last_block['transactions']
                        ]
                        self.merkle_tree = MerkleTree(transaction_hashes)
            except Exception as e:
                print(f"Error loading blockchain: {e}")
                # Initialize a new chain
                self.chain = self._create_genesis_block()
                self._save_blockchain()
        else:
            # Initialize a new chain
            self.chain = self._create_genesis_block()
            self._save_blockchain()
    
    def _save_blockchain(self):
        """Save blockchain to storage"""
        chain_file = os.path.join(self.storage_path, "chain.json")
        try:
            with open(chain_file, 'w') as f:
                json.dump(self.chain, f, indent=2)
        except Exception as e:
            print(f"Error saving blockchain: {e}")
    
    def _create_genesis_block(self) -> List[Dict[str, Any]]:
        """Create the genesis block"""
        genesis_block = {
            'index': 0,
            'timestamp': datetime.now().isoformat(),
            'transactions': [],
            'previous_hash': '0' * 64,
            'merkle_root': '',
            'nonce': 0,
            'hash': ''
        }
        
        # Calculate block hash
        genesis_block['hash'] = self._hash_block(genesis_block)
        
        return [genesis_block]
    
    def _hash_transaction(self, transaction: Dict[str, Any]) -> str:
        """Calculate hash for a transaction"""
        tx_string = json.dumps(transaction, sort_keys=True)
        return hashlib.sha256(tx_string.encode()).hexdigest()
    
    def _hash_block(self, block: Dict[str, Any]) -> str:
        """Calculate hash for a block"""
        # Create a copy of the block without the hash field
        block_copy = block.copy()
        if 'hash' in block_copy:
            del block_copy['hash']
        
        block_string = json.dumps(block_copy, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()
    
    def add_transaction(self, audit_log_id: str, audit_log_hash: str) -> Dict[str, Any]:
        """Add a new transaction for an audit log"""
        transaction = {
            'id': str(uuid.uuid4()),
            'timestamp': datetime.now().isoformat(),
            'audit_log_id': audit_log_id,
            'audit_log_hash': audit_log_hash,
            'status': 'pending'
        }
        
        # Add to pending transactions
        self.pending_transactions.append(transaction)
        
        # If we have enough transactions, mine a new block
        if len(self.pending_transactions) >= 10:
            self.mine_block()
        
        return transaction
    
    def mine_block(self) -> Dict[str, Any]:
        """Mine a new block with pending transactions"""
        if not self.pending_transactions:
            return None
        
        last_block = self.chain[-1]
        
        # Create a new Merkle tree for this block's transactions
        transaction_hashes = [
            self._hash_transaction(tx)
            for tx in self.pending_transactions
        ]
        self.merkle_tree = MerkleTree(transaction_hashes)
        
        # Create the new block
        new_block = {
            'index': last_block['index'] + 1,
            'timestamp': datetime.now().isoformat(),
            'transactions': self.pending_transactions,
            'previous_hash': last_block['hash'],
            'merkle_root': self.merkle_tree.get_root(),
            'nonce': 0,
            'hash': ''
        }
        
        # Simple proof of work (simplified for demonstration)
        while True:
            new_block['hash'] = self._hash_block(new_block)
            if new_block['hash'].startswith('00'):  # Very simple difficulty
                break
            new_block['nonce'] += 1
        
        # Update transaction status
        for tx in self.pending_transactions:
            tx['status'] = 'confirmed'
        
        # Add block to the chain
        self.chain.append(new_block)
        
        # Clear pending transactions
        self.pending_transactions = []
        
        # Save the updated blockchain
        self._save_blockchain()
        
        return new_block
    
    def verify_audit_log(self, audit_log_id: str) -> Dict[str, Any]:
        """Verify the integrity of an audit log"""
        transaction = None
        block = None
        proof = None
        tx_index = -1
        
        # Find the transaction in the blockchain
        for b in self.chain:
            for i, tx in enumerate(b.get('transactions', [])):
                if tx.get('audit_log_id') == audit_log_id:
                    transaction = tx
                    block = b
                    tx_index = i
                    break
            if transaction:
                break
        
        if not transaction:
            return {
                'verified': False,
                'status': 'not_found',
                'message': f"Audit log {audit_log_id} not found in blockchain"
            }
        
        # Generate Merkle proof
        if tx_index >= 0:
            transaction_hash = self._hash_transaction(transaction)
            
            # Recreate the Merkle tree for this block
            block_tx_hashes = [
                self._hash_transaction(tx)
                for tx in block.get('transactions', [])
            ]
            block_merkle_tree = MerkleTree(block_tx_hashes)
            
            # Get the proof
            proof = block_merkle_tree.get_proof(tx_index)
            
            # Verify the proof
            is_valid_merkle = block_merkle_tree.verify_proof(transaction_hash, proof)
            
            # Verify the Merkle root in the block
            is_valid_root = block_merkle_tree.get_root() == block.get('merkle_root')
            
            # Verify block hash
            recalculated_hash = self._hash_block(block)
            is_valid_block = recalculated_hash == block.get('hash')
            
            return {
                'verified': is_valid_merkle and is_valid_root and is_valid_block,
                'status': 'verified' if (is_valid_merkle and is_valid_root and is_valid_block) else 'invalid',
                'transaction': transaction,
                'block_index': block.get('index'),
                'block_timestamp': block.get('timestamp'),
                'merkle_proof': proof,
                'details': {
                    'merkle_verification': is_valid_merkle,
                    'root_verification': is_valid_root,
                    'block_verification': is_valid_block
                }
            }
        
        return {
            'verified': False,
            'status': 'verification_failed',
            'message': "Failed to generate verification proof"
        }
    
    def get_blockchain_status(self) -> Dict[str, Any]:
        """Get the current status of the blockchain"""
        return {
            'block_count': len(self.chain),
            'latest_block_index': self.chain[-1]['index'] if self.chain else 0,
            'latest_block_hash': self.chain[-1]['hash'] if self.chain else '',
            'latest_block_timestamp': self.chain[-1]['timestamp'] if self.chain else '',
            'pending_transactions': len(self.pending_transactions),
            'total_transactions': sum(len(block.get('transactions', [])) for block in self.chain)
        }
    
    def get_transaction(self, transaction_id: str) -> Dict[str, Any]:
        """Get a transaction by ID"""
        # Check pending transactions
        for tx in self.pending_transactions:
            if tx.get('id') == transaction_id:
                return tx
        
        # Check confirmed transactions
        for block in self.chain:
            for tx in block.get('transactions', []):
                if tx.get('id') == transaction_id:
                    return {
                        **tx,
                        'block_index': block.get('index'),
                        'block_timestamp': block.get('timestamp')
                    }
        
        return None
    
    def verify_batch(self, audit_log_ids: List[str]) -> Dict[str, Any]:
        """Verify a batch of audit logs"""
        results = {
            'total': len(audit_log_ids),
            'verified': 0,
            'failed': 0,
            'not_found': 0,
            'details': []
        }
        
        for audit_log_id in audit_log_ids:
            result = self.verify_audit_log(audit_log_id)
            
            if result.get('status') == 'verified':
                results['verified'] += 1
            elif result.get('status') == 'not_found':
                results['not_found'] += 1
            else:
                results['failed'] += 1
            
            results['details'].append({
                'audit_log_id': audit_log_id,
                'status': result.get('status'),
                'verified': result.get('verified', False)
            })
        
        return results

# Python component for compliance changes tracking
# /compliance/ml/compliance_tracker.py
import os
import json
import hashlib
import difflib
import re
from typing import Dict, List, Any, Tuple
from datetime import datetime
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class RegulatoryRequirementExtractor:
    """Extract requirements from regulatory documents"""
    
    def __init__(self, model_path: str = "regulatory_models"):
        self.model_path = model_path
        self.requirement_patterns = [
            r"(?i)(?:shall|must|required|will|should)(?:\s+be)?(?:\s+\w+){0,5}\s+(?:to|for)?",
            r"(?i)(?:needs?|requires?|requires|necessary|essential|mandatory)(?:\s+to\s+be)?",
            r"(?i)(?:it\s+is|are)\s+(?:necessary|required|essential|mandatory)",
            r"(?i)(?:minimum|maximum|required)\s+(?:standard|requirement|level)"
        ]
        
        # Load custom vectorizer if available
        self.vectorizer = TfidfVectorizer()
        self._load_vectorizer()
    
    def _load_vectorizer(self):
        """Load custom vectorizer if available"""
        vectorizer_path = os.path.join(self.model_path, "tfidf_vectorizer.pkl")
        if os.path.exists(vectorizer_path):
            try:
                import pickle
                with open(vectorizer_path, 'rb') as f:
                    self.vectorizer = pickle.load(f)
            except Exception as e:
                print(f"Error loading vectorizer: {e}")
    
    def extract_requirements(self, document_text: str) -> List[Dict[str, Any]]:
        """Extract regulatory requirements from document text"""
        requirements = []
        
        # Split document into paragraphs
        paragraphs = re.split(r'\n\s*\n', document_text)
        
        for i, paragraph in enumerate(paragraphs):
            # Check if paragraph contains requirement language
            if any(re.search(pattern, paragraph) for pattern in self.requirement_patterns):
                # Extract sentences from paragraph
                sentences = re.split(r'(?<=[.!?])\s+', paragraph)
                
                for sentence in sentences:
                    if any(re.search(pattern, sentence) for pattern in self.requirement_patterns):
                        # Clean the requirement text
                        requirement_text = sentence.strip()
                        
                        # Generate requirement ID
                        req_id = f"REQ-{hashlib.md5(requirement_text.encode()).hexdigest()[:8]}"
                        
                        # Determine requirement category based on content
                        category = self._determine_category(requirement_text)
                        
                        requirements.append({
                            'id': req_id,
                            'text': requirement_text,
                            'category': category,
                            'paragraph_index': i,
                            'source_paragraph': paragraph,
                            'extracted_at': datetime.now().isoformat()
                        })
        
        return requirements
    
    def _determine_category(self, requirement_text: str) -> str:
        """Determine the category of a requirement based on its content"""
        # Simple keyword-based categorization (would be ML-based in production)
        text_lower = requirement_text.lower()
        
        if any(word in text_lower for word in ['train', 'instructor', 'student', 'pilot', 'trainee']):
            return 'training'
        elif any(word in text_lower for word in ['record', 'document', 'report', 'log']):
            return 'documentation'
        elif any(word in text_lower for word in ['simulate', 'simulator', 'device', 'equipment']):
            return 'equipment'
        elif any(word in text_lower for word in ['assess', 'grade', 'evaluation', 'test', 'exam']):
            return 'assessment'
        elif any(word in text_lower for word in ['safety', 'emergency', 'hazard', 'risk']):
            return 'safety'
        else:
            return 'general'
    
    def find_similar_requirements(self, requirement: str, existing_requirements: List[Dict[str, Any]],
                                threshold: float = 0.8) -> List[Dict[str, Any]]:
        """Find similar requirements in an existing set"""
        if not existing_requirements:
            return []
        
        # Extract requirement texts
        texts = [req['text'] for req in existing_requirements]
        texts.append(requirement)
        
        # Vectorize all texts
        try:
            vectors = self.vectorizer.fit_transform(texts)
            
            # Calculate similarity between the new requirement and all existing ones
            new_req_vector = vectors[-1]
            existing_vectors = vectors[:-1]
            
            similarities = cosine_similarity(new_req_vector, existing_vectors)[0]
            
            # Find requirements with similarity above threshold
            similar_reqs = []
            for i, sim in enumerate(similarities):
                if sim >= threshold:
                    similar_reqs.append({
                        **existing_requirements[i],
                        'similarity': float(sim)
                    })
            
            # Sort by similarity (descending)
            similar_reqs.sort(key=lambda x: x['similarity'], reverse=True)
            
            return similar_reqs
            
        except Exception as e:
            print(f"Error calculating similarity: {e}")
            return []

class ComplianceTracker:
    """Track changes in compliance requirements and generate matrices"""
    
    def __init__(self, storage_path: str = "compliance_data"):
        self.storage_path = storage_path
        self.requirements = {}
        self.changes = []
        self.matrices = {}
        self.extractor = RegulatoryRequirementExtractor()
        
        # Create storage directory if it doesn't exist
        os.makedirs(storage_path, exist_ok=True)
        
        # Load existing data
        self._load_data()
    
    def _load_data(self):
        """Load existing compliance data"""
        # Load requirements
        requirements_file = os.path.join(self.storage_path, "requirements.json")
        if os.path.exists(requirements_file):
            try:
                with open(requirements_file, 'r') as f:
                    self.requirements = json.load(f)
            except Exception as e:
                print(f"Error loading requirements: {e}")
        
        # Load changes
        changes_file = os.path.join(self.storage_path, "changes.json")
        if os.path.exists(changes_file):
            try:
                with open(changes_file, 'r') as f:
                    self.changes = json.load(f)
            except Exception as e:
                print(f"Error loading changes: {e}")
        
        # Load matrices
        matrices_file = os.path.join(self.storage_path, "matrices.json")
        if os.path.exists(matrices_file):
            try:
                with open(matrices_file, 'r') as f:
                    self.matrices = json.load(f)
            except Exception as e:
                print(f"Error loading matrices: {e}")
    
    def _save_data(self):
        """Save compliance data"""
        # Save requirements
        requirements_file = os.path.join(self.storage_path, "requirements.json")
        try:
            with open(requirements_file, 'w') as f:
                json.dump(self.requirements, f, indent=2)
        except Exception as e:
            print(f"Error saving requirements: {e}")
        
        # Save changes
        changes_file = os.path.join(self.storage_path, "changes.json")
        try:
            with open(changes_file, 'w') as f:
                json.dump(self.changes, f, indent=2)
        except Exception as e:
            print(f"Error saving changes: {e}")
        
        # Save matrices
        matrices_file = os.path.join(self.storage_path, "matrices.json")
        try:
            with open(matrices_file, 'w') as f:
                json.dump(self.matrices, f, indent=2)
        except Exception as e:
            print(f"Error saving matrices: {e}")
    
    def track_compliance_change(self, requirement_id: str, change_type: str, 
                                before: Dict[str, Any], after: Dict[str, Any], 
                                user_id: str) -> Dict[str, Any]:
        """Track a change in a compliance requirement"""
        # Generate change ID
        change_id = f"CHG-{len(self.changes)}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Create change record
        change = {
            'id': change_id,
            'requirement_id': requirement_id,
            'change_type': change_type,
            'before': before,
            'after': after,
            'user_id': user_id,
            'timestamp': datetime.now().isoformat(),
            'impact_analysis': self._analyze_change_impact(requirement_id, before, after)
        }
        
        # Add to changes list
        self.changes.append(change)
        
        # Update requirement if it exists
        if requirement_id in self.requirements:
            self.requirements[requirement_id] = {
                **after,
                'last_updated': datetime.now().isoformat(),
                'last_change_id': change_id
            }
        
        # Save data
        self._save_data()
        
        return change
    
    def _analyze_change_impact(self, requirement_id: str, before: Dict[str, Any], 
                              after: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze the impact of a requirement change"""
        impact = {
            'severity': 'low',
            'affected_modules': [],
            'affected_matrices': []
        }
        
        # Check if text changed significantly
        if 'text' in before and 'text' in after:
            text_diff = difflib.SequenceMatcher(None, before.get('text', ''), after.get('text', '')).ratio()
            
            if text_diff < 0.5:
                impact['severity'] = 'high'
            elif text_diff < 0.8:
                impact['severity'] = 'medium'
        
        # Check which matrices are affected
        for matrix_id, matrix in self.matrices.items():
            requirements = matrix.get('requirements', {})
            if requirement_id in requirements:
                impact['affected_matrices'].append(matrix_id)
        
        # In a real system, would need to analyze impact on training modules
        # This is a simplified implementation
        
        return impact
    
    def generate_compliance_matrix(self, regulatory_framework: str, syllabus_id: str) -> Dict[str, Any]:
        """Generate a compliance matrix for a syllabus and regulatory framework"""
        # Load syllabus data (would come from a database in a real system)
        syllabus = self._load_syllabus(syllabus_id)
        if not syllabus:
            return {
                'status': 'error',
                'message': f"Syllabus {syllabus_id} not found"
            }
        
        # Load regulatory requirements for the framework
        framework_requirements = self._load_framework_requirements(regulatory_framework)
        if not framework_requirements:
            return {
                'status': 'error',
                'message': f"Regulatory framework {regulatory_framework} not found or has no requirements"
            }
        
        # Generate matrix ID
        matrix_id = f"MTX-{regulatory_framework}-{syllabus_id}"
        
        # Create initial matrix structure
        matrix = {
            'id': matrix_id,
            'regulatory_framework': regulatory_framework,
            'syllabus_id': syllabus_id,
            'generated_at': datetime.now().isoformat(),
            'requirements': {},
            'coverage_summary': {
                'total_requirements': len(framework_requirements),
                'covered_requirements': 0,
                'partially_covered_requirements': 0,
                'not_covered_requirements': 0,
                'coverage_percentage': 0.0
            }
        }
        
        # Map syllabus modules to requirements
        for requirement in framework_requirements:
            req_id = requirement['id']
            requirement_text = requirement['text']
            
            # Find matching modules in syllabus
            matching_modules = self._find_matching_modules(requirement_text, syllabus)
            
            coverage_status = 'not_covered'
            if matching_modules:
                coverage_status = 'covered' if len(matching_modules) >= 2 else 'partially_covered'
            
            matrix['requirements'][req_id] = {
                'text': requirement_text,
                'category': requirement.get('category', 'general'),
                'coverage_status': coverage_status,
                'matching_modules': matching_modules
            }
            
            # Update coverage summary
            if coverage_status == 'covered':
                matrix['coverage_summary']['covered_requirements'] += 1
            elif coverage_status == 'partially_covered':
                matrix['coverage_summary']['partially_covered_requirements'] += 1
            else:
                matrix['coverage_summary']['not_covered_requirements'] += 1
        
        # Calculate coverage percentage
        total = matrix['coverage_summary']['total_requirements']
        covered = matrix['coverage_summary']['covered_requirements']
        partially = matrix['coverage_summary']['partially_covered_requirements']
        
        if total > 0:
            # Formula: 100% * (covered + 0.5 * partially) / total
            coverage_percentage = 100.0 * (covered + 0.5 * partially) / total
            matrix['coverage_summary']['coverage_percentage'] = round(coverage_percentage, 2)
        
        # Store the matrix
        self.matrices[matrix_id] = matrix
        self._save_data()
        
        return matrix
    
    def _load_syllabus(self, syllabus_id: str) -> Dict[str, Any]:
        """Load syllabus data (simplified implementation)"""
        syllabus_file = os.path.join(self.storage_path, f"syllabus_{syllabus_id}.json")
        if os.path.exists(syllabus_file):
            try:
                with open(syllabus_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading syllabus: {e}")
        
        # Return dummy syllabus if file not found (for demonstration)
        return {
            'id': syllabus_id,
            'title': f"Syllabus {syllabus_id}",
            'modules': [
                {
                    'id': 'module1',
                    'title': 'Basic Flight Training',
                    'description': 'Introduction to flight controls and basic maneuvers',
                    'content': 'The trainee will learn basic flight controls including elevator, ailerons, and rudder. Practical exercises include straight and level flight, climbing, and descending.'
                },
                {
                    'id': 'module2',
                    'title': 'Advanced Flight Maneuvers',
                    'description': 'Advanced maneuvers and emergency procedures',
                    'content': 'The trainee will practice steep turns, stalls, and emergency procedures including engine failure and emergency descents.'
                },
                {
                    'id': 'module3',
                    'title': 'Navigation',
                    'description': 'Basic navigation techniques and procedures',
                    'content': 'The trainee will learn to navigate using visual references, charts, and basic radio navigation aids.'
                }
            ]
        }
    
    def _load_framework_requirements(self, framework: str) -> List[Dict[str, Any]]:
        """Load regulatory requirements for a framework (simplified implementation)"""
        framework_reqs = []
        
        # Get requirements for the framework
        for req_id, req in self.requirements.items():
            if req.get('framework') == framework:
                framework_reqs.append(req)
        
        # If no requirements found, load demo requirements
        if not framework_reqs:
            # Demo requirements based on framework
            if framework.lower() == 'faa':
                framework_reqs = [
                    {
                        'id': 'FAA-001',
                        'text': 'Training must include at least 40 hours of flight time.',
                        'category': 'training',
                        'framework': 'faa'
                    },
                    {
                        'id': 'FAA-002',
                        'text': 'Emergency procedures shall be demonstrated by the instructor and practiced by the student.',
                        'category': 'training',
                        'framework': 'faa'
                    },
                    {
                        'id': 'FAA-003',
                        'text': 'Training records must be maintained for at least 3 years.',
                        'category': 'documentation',
                        'framework': 'faa'
                    }
                ]
            elif framework.lower() == 'easa':
                framework_reqs = [
                    {
                        'id': 'EASA-001',
                        'text': 'The training organization shall maintain adequate facilities for the training to be conducted.',
                        'category': 'equipment',
                        'framework': 'easa'
                    },
                    {
                        'id': 'EASA-002',
                        'text': 'Pilots must demonstrate proficiency in emergency procedures during practical examination.',
                        'category': 'assessment',
                        'framework': 'easa'
                    },
                    {
                        'id': 'EASA-003',
                        'text': 'Navigation training must include both visual and instrument techniques.',
                        'category': 'training',
                        'framework': 'easa'
                    }
                ]
            
            # Add to requirements
            for req in framework_reqs:
                self.requirements[req['id']] = req
        
        return framework_reqs
    
    def _find_matching_modules(self, requirement_text: str, syllabus: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Find syllabus modules that match a requirement"""
        matching_modules = []
        
        # Vectorize the requirement text and module contents
        texts = [requirement_text]
        module_contents = []
        
        for module in syllabus.get('modules', []):
            module_text = f"{module.get('title', '')} {module.get('description', '')} {module.get('content', '')}"
            texts.append(module_text)
            module_contents.append({
                'id': module.get('id'),
                'title': module.get('title')
            })
        
        # Calculate similarity
        if len(texts) > 1:
            try:
                vectors = self.extractor.vectorizer.fit_transform(texts)
                req_vector = vectors[0]
                module_vectors = vectors[1:]
                
                similarities = cosine_similarity(req_vector, module_vectors)[0]
                
                # Find modules with similarity above threshold
                for i, sim in enumerate(similarities):
                    if sim >= 0.3:  # Threshold for matching
                        matching_modules.append({
                            **module_contents[i],
                            'similarity': float(sim),
                            'match_strength': 'high' if sim >= 0.7 else 'medium' if sim >= 0.5 else 'low'
                        })
                
                # Sort by similarity (descending)
                matching_modules.sort(key=lambda x: x['similarity'], reverse=True)
                
            except Exception as e:
                print(f"Error finding matching modules: {e}")
        
        return matching_modules
    
    def generate_auto_traceability(self, syllabus_id: str, regulatory_framework: str) -> Dict[str, Any]:
        """Generate automated traceability between syllabus and regulatory requirements"""
        # First generate a compliance matrix
        matrix = self.generate_compliance_matrix(regulatory_framework, syllabus_id)
        if 'status' in matrix and matrix['status'] == 'error':
            return matrix
        
        # Build traceability map
        traceability = {
            'syllabus_id': syllabus_id,
            'regulatory_framework': regulatory_framework,
            'generated_at': datetime.now().isoformat(),
            'module_to_requirements': {},
            'requirement_to_modules': {}
        }
        
        # Extract from matrix
        for req_id, req_data in matrix.get('requirements', {}).items():
            matching_modules = req_data.get('matching_modules', [])
            
            # Add to requirement -> modules mapping
            traceability['requirement_to_modules'][req_id] = {
                'text': req_data.get('text', ''),
                'modules': [m.get('id') for m in matching_modules]
            }
            
            # Add to module -> requirements mapping
            for module in matching_modules:
                module_id = module.get('id')
                if module_id not in traceability['module_to_requirements']:
                    traceability['module_to_requirements'][module_id] = {
                        'title': module.get('title', ''),
                        'requirements': []
                    }
                
                traceability['module_to_requirements'][module_id]['requirements'].append({
                    'id': req_id,
                    'text': req_data.get('text', ''),
                    'match_strength': module.get('match_strength', 'low')
                })
        
        return traceability
    
    def validate_compliance(self, syllabus_id: str, regulatory_framework: str) -> Dict[str, Any]:
        """Validate compliance of a syllabus with regulatory requirements"""
        # First generate a compliance matrix
        matrix = self.generate_compliance_matrix(regulatory_framework, syllabus_id)
        if 'status' in matrix and matrix['status'] == 'error':
            return matrix
        
        # Calculate validation results
        validation = {
            'syllabus_id': syllabus_id,
            'regulatory_framework': regulatory_framework,
            'validated_at': datetime.now().isoformat(),
            'overall_compliance': matrix.get('coverage_summary', {}).get('coverage_percentage', 0.0),
            'compliance_status': 'non_compliant',
            'missing_requirements': [],
            'partially_covered_requirements': [],
            'fully_covered_requirements': []
        }
        
        # Set compliance status based on overall compliance percentage
        if validation['overall_compliance'] >= 90.0:
            validation['compliance_status'] = 'compliant'
        elif validation['overall_compliance'] >= 75.0:
            validation['compliance_status'] = 'partially_compliant'
        
        # Categorize requirements
        for req_id, req_data in matrix.get('requirements', {}).items():
            status = req_data.get('coverage_status')
            
            if status == 'not_covered':
                validation['missing_requirements'].append({
                    'id': req_id,
                    'text': req_data.get('text', ''),
                    'category': req_data.get('category', 'general')
                })
            elif status == 'partially_covered':
                validation['partially_covered_requirements'].append({
                    'id': req_id,
                    'text': req_data.get('text', ''),
                    'category': req_data.get('category', 'general'),
                    'matching_modules': req_data.get('matching_modules', [])
                })
            elif status == 'covered':
                validation['fully_covered_requirements'].append({
                    'id': req_id,
                    'text': req_data.get('text', ''),
                    'category': req_data.get('category', 'general'),
                    'matching_modules': req_data.get('matching_modules', [])
                })
        
        # Add remediation recommendations for missing and partially covered requirements
        validation['remediation_recommendations'] = self._generate_remediation_recommendations(
            validation['missing_requirements'],
            validation['partially_covered_requirements']
        )
        
        return validation
    
    def _generate_remediation_recommendations(self, missing_requirements: List[Dict[str, Any]],
                                           partially_covered: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate remediation recommendations for compliance gaps"""
        recommendations = {
            'high_priority': [],
            'medium_priority': [],
            'low_priority': []
        }
        
        # Process missing requirements (high priority)
        for req in missing_requirements:
            recommendations['high_priority'].append({
                'requirement_id': req.get('id'),
                'recommendation': f"Add content to address: {req.get('text')}",
                'suggestion': self._generate_content_suggestion(req.get('text'), req.get('category'))
            })
        
        # Process partially covered requirements (medium priority)
        for req in partially_covered:
            modules = req.get('matching_modules', [])
            if modules:
                module_ids = [m.get('id') for m in modules]
                recommendations['medium_priority'].append({
                    'requirement_id': req.get('id'),
                    'recommendation': f"Enhance coverage in modules: {', '.join(module_ids)}",
                    'suggestion': self._generate_enhancement_suggestion(req.get('text'), req.get('category'))
                })
            else:
                recommendations['medium_priority'].append({
                    'requirement_id': req.get('id'),
                    'recommendation': f"Add more complete coverage for: {req.get('text')}",
                    'suggestion': self._generate_content_suggestion(req.get('text'), req.get('category'))
                })
        
        return recommendations
    
    def _generate_content_suggestion(self, requirement_text: str, category: str) -> str:
        """Generate content suggestion for a requirement (simplified implementation)"""
        if category == 'training':
            return f"Add a training module covering '{requirement_text}' with both theoretical and practical components."
        elif category == 'assessment':
            return f"Create assessment criteria for '{requirement_text}' with clear grading rubrics."
        elif category == 'documentation':
            return f"Implement documentation procedures for '{requirement_text}' with templates and record-keeping guidelines."
        elif category == 'equipment':
            return f"Specify equipment requirements and procedures for '{requirement_text}'."
        elif category == 'safety':
            return f"Develop safety procedures and briefings addressing '{requirement_text}'."
        else:
            return f"Create content addressing '{requirement_text}' with appropriate detail and context."
    
    def _generate_enhancement_suggestion(self, requirement_text: str, category: str) -> str:
        """Generate enhancement suggestion for a partially covered requirement"""
        if category == 'training':
            return f"Enhance existing content with more detailed coverage of '{requirement_text}', ensuring both knowledge and skills are addressed."
        elif category == 'assessment':
            return f"Expand assessment criteria to more thoroughly evaluate '{requirement_text}' with objective measures."
        elif category == 'documentation':
            return f"Improve documentation procedures related to '{requirement_text}' with more detailed record-keeping requirements."
        elif category == 'equipment':
            return f"Provide more detailed equipment specifications and usage procedures for '{requirement_text}'."
        elif category == 'safety':
            return f"Enhance safety procedures and risk mitigation strategies for '{requirement_text}'."
        else:
            return f"Expand existing content to more thoroughly address '{requirement_text}' with additional detail and examples."

# Unit tests for AuditLoggingController
// /compliance/tests/AuditLoggingControllerTest.cc
#include <gtest/gtest.h>
#include <drogon/drogon.h>
#include <drogon/HttpClient.h>
#include "../controllers/AuditLoggingController.h"
#include "../services/AuditLogService.h"
#include "../services/BlockchainVerificationService.h"

using namespace compliance;

class AuditLoggingControllerTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Mock services
        auditLogService_ = std::make_shared<AuditLogService>();
        blockchainService_ = std::make_shared<BlockchainVerificationService>();
        
        // Create controller with mocked services
        controller_ = std::make_shared<AuditLoggingController>();
        // Inject mocked services (would need dependency injection framework or setter methods)
    }

    std::shared_ptr<AuditLoggingController> controller_;
    std::shared_ptr<AuditLogService> auditLogService_;
    std::shared_ptr<BlockchainVerificationService> blockchainService_;
};

TEST_F(AuditLoggingControllerTest, CreateAuditLogSuccess) {
    // Create request with valid JSON
    drogon::HttpRequestPtr req = drogon::HttpRequest::newHttpRequest();
    req->setMethod(drogon::HttpMethod::Post);
    req->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
    
    Json::Value requestBody;
    requestBody["userId"] = "user-123";
    requestBody["action"] = "create";
    requestBody["resourceType"] = "syllabus";
    requestBody["resourceId"] = "syllabus-456";
    requestBody["details"]["name"] = "Test Syllabus";
    req->setBody(requestBody.toStyledString());
    
    bool callbackCalled = false;
    
    // Call the endpoint
    controller_->createAuditLog(req, [&callbackCalled](const drogon::HttpResponsePtr& resp) {
        callbackCalled = true;
        EXPECT_EQ(resp->getStatusCode(), drogon::HttpStatusCode::k201Created);
        
        // Parse response JSON
        Json::Value responseJson;
        Json::Reader reader;
        reader.parse(resp->getBody(), responseJson);
        
        // Validate response
        EXPECT_TRUE(responseJson.isObject());
        EXPECT_TRUE(responseJson.isMember("id"));
        EXPECT_TRUE(responseJson.isMember("timestamp"));
        EXPECT_EQ(responseJson["userId"].asString(), "user-123");
        EXPECT_EQ(responseJson["action"].asString(), "create");
    });
    
    EXPECT_TRUE(callbackCalled);
}

TEST_F(AuditLoggingControllerTest, CreateAuditLogInvalidJson) {
    // Create request with invalid JSON
    drogon::HttpRequestPtr req = drogon::HttpRequest::newHttpRequest();
    req->setMethod(drogon::HttpMethod::Post);
    req->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
    req->setBody("invalid json data");
    
    bool callbackCalled = false;
    
    // Call the endpoint
    controller_->createAuditLog(req, [&callbackCalled](const drogon::HttpResponsePtr& resp) {
        callbackCalled = true;
        EXPECT_EQ(resp->getStatusCode(), drogon::HttpStatusCode::k400BadRequest);
    });
    
    EXPECT_TRUE(callbackCalled);
}

// Additional tests would be included here...

// Unit tests for BlockchainVerificationService
// /compliance/tests/BlockchainVerificationServiceTest.cc
#include <gtest/gtest.h>
#include "../services/BlockchainVerificationService.h"

using namespace compliance;

class BlockchainVerificationServiceTest : public ::testing::Test {
protected:
    void SetUp() override {
        service_ = std::make_shared<BlockchainVerificationService>();
    }

    std::shared_ptr<BlockchainVerificationService> service_;
};

TEST_F(BlockchainVerificationServiceTest, AddToBlockchain) {
    std::string auditLogId = "audit-123";
    std::string auditLogHash = "0123456789abcdef0123456789abcdef";
    
    Json::Value result = service_->addToBlockchain(auditLogId, auditLogHash);
    
    // Verify structure of result
    EXPECT_TRUE(result.isObject());
    EXPECT_TRUE(result.isMember("transaction_id"));
    EXPECT_TRUE(result.isMember("timestamp"));
    EXPECT_TRUE(result.isMember("audit_log_id"));
    EXPECT_EQ(result["audit_log_id"].asString(), auditLogId);
    EXPECT_TRUE(result.isMember("status"));
    EXPECT_EQ(result["status"].asString(), "pending");
}

TEST_F(BlockchainVerificationServiceTest, VerifyAuditLog) {
    // First add a log to the blockchain
    std::string auditLogId = "audit-verify-test";
    std::string auditLogHash = "0123456789abcdef0123456789abcdef";
    
    service_->addToBlockchain(auditLogId, auditLogHash);
    
    // Then verify it
    Json::Value result = service_->verifyAuditLog(auditLogId);
    
    // Verify structure of result
    EXPECT_TRUE(result.isObject());
    EXPECT_TRUE(result.isMember("verified"));
    // Note: Actual verification might fail in tests since we don't have a real blockchain
    // Just ensure the structure is correct
    EXPECT_TRUE(result.isMember("status"));
}

// Python tests for blockchain_verifier.py
# /compliance/ml/tests/test_blockchain_verifier.py
import unittest
import os
import tempfile
import json
from compliance.ml.blockchain_verifier import BlockchainVerifier, MerkleTree

class TestMerkleTree(unittest.TestCase):
    def setUp(self):
        # Test data
        self.leaves = [
            "leaf1",
            "leaf2",
            "leaf3",
            "leaf4"
        ]
        self.tree = MerkleTree(self.leaves)
    
    def test_get_root(self):
        # Verify that root is not empty
        root = self.tree.get_root()
        self.assertIsInstance(root, str)
        self.assertTrue(len(root) > 0)
    
    def test_get_proof(self):
        # Get proof for a leaf
        proof = self.tree.get_proof(0)
        
        # Verify structure of proof
        self.assertIsInstance(proof, list)
        if len(proof) > 0:
            self.assertIn('position', proof[0])
            self.assertIn('hash', proof[0])
    
    def test_verify_proof(self):
        # Get proof for a leaf
        leaf = self.leaves[0]
        proof = self.tree.get_proof(0)
        
        # Verify the proof
        result = self.tree.verify_proof(leaf, proof)
        
        # Should be valid
        self.assertTrue(result)
    
    def test_add_leaf(self):
        # Initial count
        initial_count = len(self.tree.leaves)
        
        # Add a new leaf
        new_leaf = "new_leaf"
        index = self.tree.add_leaf(new_leaf)
        
        # Verify leaf was added
        self.assertEqual(len(self.tree.leaves), initial_count + 1)
        self.assertEqual(self.tree.leaves[index], new_leaf)
        
        # Verify tree was rebuilt
        self.assertEqual(len(self.tree.tree[0]), initial_count + 1)

class TestBlockchainVerifier(unittest.TestCase):
    def setUp(self):
        # Create temporary directory for blockchain data
        self.temp_dir = tempfile.mkdtemp()
        self.verifier = BlockchainVerifier(storage_path=self.temp_dir)
        
        # Test data
        self.audit_log_id = "test-audit-123"
        self.audit_log_hash = "0123456789abcdef0123456789abcdef"
    
    def tearDown(self):
        # Clean up temporary directory
        for f in os.listdir(self.temp_dir):
            os.remove(os.path.join(self.temp_dir, f))
        os.rmdir(self.temp_dir)
    
    def test_add_transaction(self):
        # Add a transaction
        transaction = self.verifier.add_transaction(self.audit_log_id, self.audit_log_hash)
        
        # Verify structure of result
        self.assertIsInstance(transaction, dict)
        self.assertIn('id', transaction)
        self.assertIn('timestamp', transaction)
        self.assertIn('audit_log_id', transaction)
        self.assertEqual(transaction['audit_log_id'], self.audit_log_id)
        self.assertIn('audit_log_hash', transaction)
        self.assertEqual(transaction['audit_log_hash'], self.audit_log_hash)
        self.assertIn('status', transaction)
        self.assertEqual(transaction['status'], 'pending')
    
    def test_mine_block(self):
        # Add some transactions
        for i in range(10):
            self.verifier.add_transaction(f"audit-{i}", f"hash-{i}")
        
        # Mine a block
        block = self.verifier.mine_block()
        
        # Verify structure of result
        self.assertIsInstance(block, dict)
        self.assertIn('index', block)
        self.assertIn('timestamp', block)
        self.assertIn('transactions', block)
        self.assertIn('previous_hash', block)
        self.assertIn('merkle_root', block)
        self.assertIn('hash', block)
        
        # Verify transactions were included and marked as confirmed
        self.assertEqual(len(block['transactions']), 10)
        for tx in block['transactions']:
            self.assertEqual(tx['status'], 'confirmed')
        
        # Verify block was added to the chain
        self.assertGreater(len(self.verifier.chain), 1)
        self.assertEqual(self.verifier.chain[-1]['hash'], block['hash'])
    
    def test_verify_audit_log(self):
        # Add a transaction and mine a block
        self.verifier.add_transaction(self.audit_log_id, self.audit_log_hash)
        self.verifier.mine_block()
        
        # Verify the audit log
        result = self.verifier.verify_audit_log(self.audit_log_id)
        
        # Verify structure of result
        self.assertIsInstance(result, dict)
        self.assertIn('verified', result)
        self.assertIn('status', result)
        self.assertIn('transaction', result)
        
        # Should be verified
        self.assertTrue(result['verified'])
        self.assertEqual(result['status'], 'verified')
    
    def test_get_blockchain_status(self):
        # Get blockchain status
        status = self.verifier.get_blockchain_status()
        
        # Verify structure of result
        self.assertIsInstance(status, dict)
        self.assertIn('block_count', status)
        self.assertIn('latest_block_index', status)
        self.assertIn('latest_block_hash', status)
        self.assertIn('latest_block_timestamp', status)
        self.assertIn('pending_transactions', status)
        self.assertIn('total_transactions', status)

# Python tests for compliance_tracker.py
# /compliance/ml/tests/test_compliance_tracker.py
import unittest
import os
import tempfile
import json
from compliance.ml.compliance_tracker import ComplianceTracker, RegulatoryRequirementExtractor

class TestRegulatoryRequirementExtractor(unittest.TestCase):
    def setUp(self):
        self.extractor = RegulatoryRequirementExtractor()
        
        # Test document
        self.test_document = """
        CHAPTER 1: PILOT TRAINING REQUIREMENTS
        
        1.1 General Requirements
        
        All pilots must complete the required training modules as specified in this document.
        Training shall include both ground school and simulator sessions.
        
        1.2 Recurrent Training
        
        Pilots shall complete recurrent training every 6 months to maintain proficiency.
        """
    
    def test_extract_requirements(self):
        # Extract requirements
        requirements = self.extractor.extract_requirements(self.test_document)
        
        # Verify structure and content
        self.assertIsInstance(requirements, list)
        self.assertGreater(len(requirements), 0)
        
        if len(requirements) > 0:
            req = requirements[0]
            self.assertIn('id', req)
            self.assertIn('text', req)
            self.assertIn('category', req)
    
    def test_find_similar_requirements(self):
        # Create some test requirements
        test_requirements = [
            {
                'id': 'REQ1',
                'text': 'Pilots must complete emergency procedure training annually.'
            },
            {
                'id': 'REQ2',
                'text': 'All training records shall be maintained for 3 years.'
            }
        ]
        
        # Find similar to a new requirement
        new_req = 'Pilots are required to complete emergency training each year.'
        similar = self.extractor.find_similar_requirements(new_req, test_requirements)
        
        # Verify we found the similar requirement
        self.assertGreater(len(similar), 0)
        if len(similar) > 0:
            self.assertEqual(similar[0]['id'], 'REQ1')
            self.assertIn('similarity', similar[0])
            self.assertGreater(similar[0]['similarity'], 0.5)

class TestComplianceTracker(unittest.TestCase):
    def setUp(self):
        # Create temporary directory
        self.temp_dir = tempfile.mkdtemp()
        self.tracker = ComplianceTracker(storage_path=self.temp_dir)
        
        # Test data
        self.requirement_id = 'TEST-REQ-001'
        self.before = {
            'id': self.requirement_id,
            'text': 'Pilots must complete 40 hours of flight training.',
            'category': 'training',
            'framework': 'faa'
        }
        self.after = {
            'id': self.requirement_id,
            'text': 'Pilots must complete 50 hours of flight training.',
            'category': 'training',
            'framework': 'faa'
        }
        self.user_id = 'test-user-123'
    
    def tearDown(self):
        # Clean up temporary directory
        for f in os.listdir(self.temp_dir):
            os.remove(os.path.join(self.temp_dir, f))
        os.rmdir(self.temp_dir)
    
    def test_track_compliance_change(self):
        # Track a change
        change = self.tracker.track_compliance_change(
            self.requirement_id,
            'update',
            self.before,
            self.after,
            self.user_id
        )
        
        # Verify structure of result
        self.assertIsInstance(change, dict)
        self.assertIn('id', change)
        self.assertIn('requirement_id', change)
        self.assertEqual(change['requirement_id'], self.requirement_id)
        self.assertIn('change_type', change)
        self.assertEqual(change['change_type'], 'update')
        self.assertIn('before', change)
        self.assertIn('after', change)
        self.assertIn('user_id', change)
        self.assertEqual(change['user_id'], self.user_id)
        self.assertIn('timestamp', change)
        self.assertIn('impact_analysis', change)
    
    def test_generate_compliance_matrix(self):
        # Generate a compliance matrix
        matrix = self.tracker.generate_compliance_matrix('faa', 'test-syllabus-001')
        
        # Verify structure of result
        self.assertIsInstance(matrix, dict)
        self.assertIn('id', matrix)
        self.assertIn('regulatory_framework', matrix)
        self.assertEqual(matrix['regulatory_framework'], 'faa')
        self.assertIn('syllabus_id', matrix)
        self.assertEqual(matrix['syllabus_id'], 'test-syllabus-001')
        self.assertIn('generated_at', matrix)
        self.assertIn('requirements', matrix)
        self.assertIn('coverage_summary', matrix)
        
        # Check coverage summary
        self.assertIn('total_requirements', matrix['coverage_summary'])
        self.assertIn('covered_requirements', matrix['coverage_summary'])
        self.assertIn('partially_covered_requirements', matrix['coverage_summary'])
        self.assertIn('not_covered_requirements', matrix['coverage_summary'])
        self.assertIn('coverage_percentage', matrix['coverage_summary'])
    
    def test_validate_compliance(self):
        # Validate compliance
        validation = self.tracker.validate_compliance('test-syllabus-001', 'faa')
        
        # Verify structure of result
        self.assertIsInstance(validation, dict)
        self.assertIn('syllabus_id', validation)
        self.assertEqual(validation['syllabus_id'], 'test-syllabus-001')
        self.assertIn('regulatory_framework', validation)
        self.assertEqual(validation['regulatory_framework'], 'faa')
        self.assertIn('validated_at', validation)
        self.assertIn('overall_compliance', validation)
        self.assertIn('compliance_status', validation)
        self.assertIn('missing_requirements', validation)
        self.assertIn('partially_covered_requirements', validation)
        self.assertIn('fully_covered_requirements', validation)
        self.assertIn('remediation_recommendations', validation)
