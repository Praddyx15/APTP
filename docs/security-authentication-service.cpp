#include <drogon/drogon.h>
#include <json/json.h>
#include <openssl/sha.h>
#include <openssl/evp.h>
#include <openssl/rand.h>
#include <string>
#include <vector>
#include <map>
#include <chrono>
#include <memory>
#include <mutex>
#include <jwt-cpp/jwt.h>

namespace atp {
namespace security {

// Forward declarations
class TokenManager;
class RoleBasedAccessControl;
class BiometricAuthenticator;
class EncryptionService;
class GDPRComplianceManager;

class SecurityAuthenticationService : public drogon::HttpController<SecurityAuthenticationService> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(SecurityAuthenticationService::authenticate, "/api/auth/login", drogon::Post);
    ADD_METHOD_TO(SecurityAuthenticationService::refreshToken, "/api/auth/refresh", drogon::Post);
    ADD_METHOD_TO(SecurityAuthenticationService::validateToken, "/api/auth/validate", drogon::Post);
    ADD_METHOD_TO(SecurityAuthenticationService::logout, "/api/auth/logout", drogon::Post);
    ADD_METHOD_TO(SecurityAuthenticationService::registerMultiFactor, "/api/auth/mfa/register", drogon::Post);
    ADD_METHOD_TO(SecurityAuthenticationService::validateMultiFactor, "/api/auth/mfa/validate", drogon::Post);
    ADD_METHOD_TO(SecurityAuthenticationService::registerBiometric, "/api/auth/biometric/register", drogon::Post);
    ADD_METHOD_TO(SecurityAuthenticationService::validateBiometric, "/api/auth/biometric/validate", drogon::Post);
    ADD_METHOD_TO(SecurityAuthenticationService::checkPermission, "/api/auth/permission", drogon::Post);
    ADD_METHOD_TO(SecurityAuthenticationService::getRolePermissions, "/api/auth/roles/{role}", drogon::Get);
    ADD_METHOD_TO(SecurityAuthenticationService::updateUserRoles, "/api/auth/users/{userId}/roles", drogon::Put);
    ADD_METHOD_TO(SecurityAuthenticationService::encryptData, "/api/security/encrypt", drogon::Post);
    ADD_METHOD_TO(SecurityAuthenticationService::decryptData, "/api/security/decrypt", drogon::Post);
    ADD_METHOD_TO(SecurityAuthenticationService::processDeletionRequest, "/api/gdpr/request-deletion", drogon::Post);
    ADD_METHOD_TO(SecurityAuthenticationService::exportUserData, "/api/gdpr/export-data", drogon::Post);
    METHOD_LIST_END

    SecurityAuthenticationService();

    // Authentication methods
    void authenticate(const drogon::HttpRequestPtr& req, 
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void refreshToken(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void validateToken(const drogon::HttpRequestPtr& req,
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void logout(const drogon::HttpRequestPtr& req,
               std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Multi-factor authentication methods
    void registerMultiFactor(const drogon::HttpRequestPtr& req,
                            std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void validateMultiFactor(const drogon::HttpRequestPtr& req,
                            std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Biometric authentication methods
    void registerBiometric(const drogon::HttpRequestPtr& req,
                          std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void validateBiometric(const drogon::HttpRequestPtr& req,
                          std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // Role-based access control methods
    void checkPermission(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void getRolePermissions(const drogon::HttpRequestPtr& req,
                           std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                           const std::string& role);
    
    void updateUserRoles(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                        const std::string& userId);
    
    // Encryption methods
    void encryptData(const drogon::HttpRequestPtr& req,
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void decryptData(const drogon::HttpRequestPtr& req,
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    // GDPR compliance methods
    void processDeletionRequest(const drogon::HttpRequestPtr& req,
                               std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void exportUserData(const drogon::HttpRequestPtr& req,
                       std::function<void(const drogon::HttpResponsePtr&)>&& callback);

private:
    std::shared_ptr<TokenManager> tokenManager_;
    std::shared_ptr<RoleBasedAccessControl> rbac_;
    std::shared_ptr<BiometricAuthenticator> biometricAuth_;
    std::shared_ptr<EncryptionService> encryptionService_;
    std::shared_ptr<GDPRComplianceManager> gdprManager_;
    
    // JWT secret key (would be loaded from secure configuration in production)
    std::string jwtSecret_;
    
    // Helper methods
    bool verifyPassword(const std::string& hashedPassword, const std::string& plainPassword, const std::string& salt);
    std::string hashPassword(const std::string& password, const std::string& salt);
    std::string generateSalt(size_t length);
    void recordAuthEvent(const std::string& userId, const std::string& eventType, bool success, const std::string& details);
};

// Token Manager class
class TokenManager {
public:
    TokenManager(const std::string& jwtSecret);
    
    std::string generateToken(const std::string& userId, const std::vector<std::string>& roles, int expiryMinutes);
    std::string generateRefreshToken(const std::string& userId);
    bool validateToken(const std::string& token, Json::Value& payload);
    bool invalidateToken(const std::string& token);
    bool invalidateAllUserTokens(const std::string& userId);
    std::string refreshAccessToken(const std::string& refreshToken);

private:
    std::string jwtSecret_;
    std::map<std::string, std::string> refreshTokens_;  // userId -> refreshToken
    std::set<std::string> invalidatedTokens_;  // Tokens that have been explicitly invalidated
    std::mutex tokenMutex_;
    
    std::string generateTokenId();
    bool isTokenInvalidated(const std::string& jti);
};

// Role-Based Access Control class
class RoleBasedAccessControl {
public:
    RoleBasedAccessControl();
    
    bool checkPermission(const std::string& userId, const std::string& resource, const std::string& action);
    Json::Value getRolePermissions(const std::string& role);
    bool updateUserRoles(const std::string& userId, const std::vector<std::string>& roles);
    std::vector<std::string> getUserRoles(const std::string& userId);

private:
    // Role definitions: role -> [permissions]
    std::map<std::string, std::vector<std::string>> rolePermissions_;
    
    // User role assignments: userId -> [roles]
    std::map<std::string, std::vector<std::string>> userRoles_;
    
    void loadRoleDefinitions();
};

// Biometric Authenticator class
class BiometricAuthenticator {
public:
    BiometricAuthenticator();
    
    bool registerBiometric(const std::string& userId, const std::string& biometricType, const std::string& biometricData);
    bool validateBiometric(const std::string& userId, const std::string& biometricType, const std::string& biometricData);

private:
    // User biometric templates: userId -> {biometricType -> templateData}
    std::map<std::string, std::map<std::string, std::string>> biometricTemplates_;
    
    // Validation methods for different biometric types
    bool validateFingerprint(const std::string& storedTemplate, const std::string& providedData);
    bool validateFacialRecognition(const std::string& storedTemplate, const std::string& providedData);
    bool validateIrisRecognition(const std::string& storedTemplate, const std::string& providedData);
};

// Encryption Service class
class EncryptionService {
public:
    EncryptionService();
    
    std::string encryptData(const std::string& plaintext, const std::string& keyId);
    std::string decryptData(const std::string& ciphertext, const std::string& keyId);
    std::string generateEncryptionKey();

private:
    // Encryption keys: keyId -> keyData
    std::map<std::string, std::string> encryptionKeys_;
    
    // Encryption IV (should be unique per encryption operation in production)
    std::vector<unsigned char> iv_;
    
    void initializeKeys();
};

// GDPR Compliance Manager class
class GDPRComplianceManager {
public:
    GDPRComplianceManager();
    
    Json::Value processDeletionRequest(const std::string& userId, const std::string& requestReason);
    Json::Value exportUserData(const std::string& userId);
    bool logDataAccess(const std::string& userId, const std::string& dataCategory, const std::string& accessReason);

private:
    // Log of data access: timestamp -> {userId, dataCategory, reason}
    std::vector<std::tuple<std::string, std::string, std::string, std::string>> dataAccessLog_;
    
    // Deletion requests: requestId -> {userId, status, timestamp}
    std::map<std::string, Json::Value> deletionRequests_;
    
    void anonymizeUserData(const std::string& userId);
    void notifyDataControllers(const std::string& userId, const std::string& requestType);
};

// TokenManager implementation
TokenManager::TokenManager(const std::string& jwtSecret) : jwtSecret_(jwtSecret) {}

std::string TokenManager::generateToken(const std::string& userId, const std::vector<std::string>& roles, int expiryMinutes) {
    auto now = std::chrono::system_clock::now();
    auto exp = now + std::chrono::minutes(expiryMinutes);
    
    std::string tokenId = generateTokenId();
    
    auto token = jwt::create()
        .set_issuer("atp-security-service")
        .set_type("JWT")
        .set_id(tokenId)
        .set_issued_at(now)
        .set_expires_at(exp)
        .set_subject(userId);
    
    // Add roles as an array claim
    std::vector<std::string> rolesCopy = roles;
    token.set_payload_claim("roles", jwt::claim(rolesCopy));
    
    // Sign token with secret
    return token.sign(jwt::algorithm::hs256{jwtSecret_});
}

std::string TokenManager::generateRefreshToken(const std::string& userId) {
    // Generate a secure random token
    const int TOKEN_LENGTH = 64;
    std::string refreshToken = generateSalt(TOKEN_LENGTH);
    
    // Store token for the user
    {
        std::lock_guard<std::mutex> lock(tokenMutex_);
        refreshTokens_[userId] = refreshToken;
    }
    
    return refreshToken;
}

bool TokenManager::validateToken(const std::string& token, Json::Value& payload) {
    try {
        auto decoded = jwt::decode(token);
        auto verifier = jwt::verify()
            .allow_algorithm(jwt::algorithm::hs256{jwtSecret_})
            .with_issuer("atp-security-service");
        
        verifier.verify(decoded);
        
        // Check if token has been invalidated
        std::string tokenId = decoded.get_id();
        if (isTokenInvalidated(tokenId)) {
            return false;
        }
        
        // Extract payload claims
        payload["sub"] = decoded.get_subject();
        
        // Extract roles
        auto rolesJson = Json::Value(Json::arrayValue);
        for (const auto& role : decoded.get_payload_claim("roles").as_array()) {
            rolesJson.append(role.as_string());
        }
        payload["roles"] = rolesJson;
        
        return true;
    }
    catch (const std::exception& e) {
        // Token invalid or expired
        return false;
    }
}

bool TokenManager::invalidateToken(const std::string& token) {
    try {
        auto decoded = jwt::decode(token);
        std::string tokenId = decoded.get_id();
        
        std::lock_guard<std::mutex> lock(tokenMutex_);
        invalidatedTokens_.insert(tokenId);
        return true;
    }
    catch (const std::exception& e) {
        return false;
    }
}

bool TokenManager::invalidateAllUserTokens(const std::string& userId) {
    std::lock_guard<std::mutex> lock(tokenMutex_);
    
    // Remove refresh token for the user
    auto it = refreshTokens_.find(userId);
    if (it != refreshTokens_.end()) {
        refreshTokens_.erase(it);
    }
    
    // Note: In a production system, we would need a more sophisticated
    // way to track and invalidate all active tokens for a user
    
    return true;
}

std::string TokenManager::refreshAccessToken(const std::string& refreshToken) {
    std::lock_guard<std::mutex> lock(tokenMutex_);
    
    // Find user for this refresh token
    std::string userId;
    for (const auto& pair : refreshTokens_) {
        if (pair.second == refreshToken) {
            userId = pair.first;
            break;
        }
    }
    
    if (userId.empty()) {
        return "";  // Refresh token not found
    }
    
    // In a real system, we would look up the user's roles here
    std::vector<std::string> roles = {"user"};  // Default role
    
    // Generate a new access token
    return generateToken(userId, roles, 60);  // 1 hour expiry
}

std::string TokenManager::generateTokenId() {
    // Generate a unique token ID
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

bool TokenManager::isTokenInvalidated(const std::string& jti) {
    std::lock_guard<std::mutex> lock(tokenMutex_);
    return invalidatedTokens_.find(jti) != invalidatedTokens_.end();
}

// RoleBasedAccessControl implementation
RoleBasedAccessControl::RoleBasedAccessControl() {
    loadRoleDefinitions();
}

bool RoleBasedAccessControl::checkPermission(const std::string& userId, const std::string& resource, const std::string& action) {
    // Get user's roles
    auto roles = getUserRoles(userId);
    
    // Check if any role has the required permission
    std::string permission = resource + ":" + action;
    
    for (const auto& role : roles) {
        auto it = rolePermissions_.find(role);
        if (it != rolePermissions_.end()) {
            const auto& permissions = it->second;
            
            // Check for direct permission
            if (std::find(permissions.begin(), permissions.end(), permission) != permissions.end()) {
                return true;
            }
            
            // Check for wildcard permissions
            if (std::find(permissions.begin(), permissions.end(), resource + ":*") != permissions.end()) {
                return true;
            }
            
            if (std::find(permissions.begin(), permissions.end(), "*:*") != permissions.end()) {
                return true;
            }
        }
    }
    
    return false;
}

Json::Value RoleBasedAccessControl::getRolePermissions(const std::string& role) {
    Json::Value result(Json::objectValue);
    result["role"] = role;
    
    Json::Value permissions(Json::arrayValue);
    
    auto it = rolePermissions_.find(role);
    if (it != rolePermissions_.end()) {
        for (const auto& permission : it->second) {
            permissions.append(permission);
        }
    }
    
    result["permissions"] = permissions;
    return result;
}

bool RoleBasedAccessControl::updateUserRoles(const std::string& userId, const std::vector<std::string>& roles) {
    // Validate that all roles exist
    for (const auto& role : roles) {
        if (rolePermissions_.find(role) == rolePermissions_.end()) {
            return false;  // Role doesn't exist
        }
    }
    
    // Update user's roles
    userRoles_[userId] = roles;
    return true;
}

std::vector<std::string> RoleBasedAccessControl::getUserRoles(const std::string& userId) {
    auto it = userRoles_.find(userId);
    if (it != userRoles_.end()) {
        return it->second;
    }
    
    // Default roles for new users
    return {"user"};
}

void RoleBasedAccessControl::loadRoleDefinitions() {
    // Define standard roles and permissions
    // In production, these would be loaded from a database or configuration file
    
    // Administrator role
    rolePermissions_["admin"] = {
        "*:*"  // All permissions
    };
    
    // Instructor role
    rolePermissions_["instructor"] = {
        "syllabus:read",
        "syllabus:use",
        "assessment:create",
        "assessment:read",
        "assessment:update",
        "trainee:read",
        "training:manage",
        "document:read"
    };
    
    // Trainee role
    rolePermissions_["trainee"] = {
        "syllabus:read",
        "assessment:read",
        "training:view",
        "document:read"
    };
    
    // Training manager role
    rolePermissions_["training_manager"] = {
        "syllabus:read",
        "syllabus:create",
        "syllabus:update",
        "assessment:read",
        "trainee:read",
        "trainee:assign",
        "instructor:assign",
        "training:manage",
        "analytics:read",
        "document:read",
        "document:create",
        "document:update"
    };
    
    // Default user role
    rolePermissions_["user"] = {
        "profile:read",
        "profile:update"
    };
}

// BiometricAuthenticator implementation
BiometricAuthenticator::BiometricAuthenticator() {}

bool BiometricAuthenticator::registerBiometric(const std::string& userId, const std::string& biometricType, const std::string& biometricData) {
    // In production, biometric data should be properly processed and securely stored
    // This is a simplified implementation for demonstration
    
    // Store the biometric template
    biometricTemplates_[userId][biometricType] = biometricData;
    return true;
}

bool BiometricAuthenticator::validateBiometric(const std::string& userId, const std::string& biometricType, const std::string& biometricData) {
    // Check if user has registered this biometric type
    auto userIt = biometricTemplates_.find(userId);
    if (userIt == biometricTemplates_.end()) {
        return false;
    }
    
    auto biometricIt = userIt->second.find(biometricType);
    if (biometricIt == userIt->second.end()) {
        return false;
    }
    
    // Get stored template
    const std::string& storedTemplate = biometricIt->second;
    
    // Validate based on biometric type
    if (biometricType == "fingerprint") {
        return validateFingerprint(storedTemplate, biometricData);
    }
    else if (biometricType == "facial") {
        return validateFacialRecognition(storedTemplate, biometricData);
    }
    else if (biometricType == "iris") {
        return validateIrisRecognition(storedTemplate, biometricData);
    }
    
    return false;  // Unsupported biometric type
}

bool BiometricAuthenticator::validateFingerprint(const std::string& storedTemplate, const std::string& providedData) {
    // In production, this would use a specialized biometric matching algorithm
    // For demonstration, we're doing a simplified comparison
    
    // Calculate match score (0-100) between template and provided data
    int matchScore = 0;
    
    // Simple similarity measure (for demonstration only)
    if (storedTemplate.length() == providedData.length()) {
        int matchingChars = 0;
        for (size_t i = 0; i < storedTemplate.length(); ++i) {
            if (storedTemplate[i] == providedData[i]) {
                matchingChars++;
            }
        }
        
        matchScore = (matchingChars * 100) / storedTemplate.length();
    }
    
    // Threshold for fingerprint matching (typically 40-60 in real systems)
    return matchScore >= 50;
}

bool BiometricAuthenticator::validateFacialRecognition(const std::string& storedTemplate, const std::string& providedData) {
    // Similar to fingerprint but with facial recognition algorithm
    // For demonstration, using simplified comparison
    
    int matchScore = 0;
    
    // Simple similarity measure (for demonstration only)
    if (storedTemplate.length() == providedData.length()) {
        int matchingChars = 0;
        for (size_t i = 0; i < storedTemplate.length(); ++i) {
            if (storedTemplate[i] == providedData[i]) {
                matchingChars++;
            }
        }
        
        matchScore = (matchingChars * 100) / storedTemplate.length();
    }
    
    // Threshold for facial recognition (typically 70-90 in real systems)
    return matchScore >= 80;
}

bool BiometricAuthenticator::validateIrisRecognition(const std::string& storedTemplate, const std::string& providedData) {
    // Similar to fingerprint but with iris recognition algorithm
    // For demonstration, using simplified comparison
    
    int matchScore = 0;
    
    // Simple similarity measure (for demonstration only)
    if (storedTemplate.length() == providedData.length()) {
        int matchingChars = 0;
        for (size_t i = 0; i < storedTemplate.length(); ++i) {
            if (storedTemplate[i] == providedData[i]) {
                matchingChars++;
            }
        }
        
        matchScore = (matchingChars * 100) / storedTemplate.length();
    }
    
    // Threshold for iris recognition (typically 85-95 in real systems)
    return matchScore >= 90;
}

// EncryptionService implementation
EncryptionService::EncryptionService() {
    initializeKeys();
    
    // Initialize IV (in production, should be unique per encryption)
    iv_.resize(16);  // 16 bytes for AES
    RAND_bytes(iv_.data(), static_cast<int>(iv_.size()));
}

std::string EncryptionService::encryptData(const std::string& plaintext, const std::string& keyId) {
    // Find encryption key
    auto keyIt = encryptionKeys_.find(keyId);
    if (keyIt == encryptionKeys_.end()) {
        throw std::runtime_error("Invalid encryption key ID: " + keyId);
    }
    
    const std::string& key = keyIt->second;
    
    // Initialize encryption context
    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    if (!ctx) {
        throw std::runtime_error("Failed to create encryption context");
    }
    
    // Initialize encryption operation
    if (EVP_EncryptInit_ex(ctx, EVP_aes_256_cbc(), NULL, 
                          reinterpret_cast<const unsigned char*>(key.c_str()), 
                          iv_.data()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Failed to initialize encryption");
    }
    
    // Prepare output buffer (plaintext length + block size for padding)
    std::vector<unsigned char> ciphertext(plaintext.length() + 16);
    int len = 0;
    int ciphertext_len = 0;
    
    // Encrypt data
    if (EVP_EncryptUpdate(ctx, ciphertext.data(), &len, 
                         reinterpret_cast<const unsigned char*>(plaintext.c_str()), 
                         static_cast<int>(plaintext.length())) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Failed to encrypt data");
    }
    
    ciphertext_len = len;
    
    // Finalize encryption
    if (EVP_EncryptFinal_ex(ctx, ciphertext.data() + len, &len) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Failed to finalize encryption");
    }
    
    ciphertext_len += len;
    
    // Clean up
    EVP_CIPHER_CTX_free(ctx);
    
    // Resize ciphertext to actual length
    ciphertext.resize(ciphertext_len);
    
    // Combine IV and ciphertext, and encode as base64
    std::vector<unsigned char> combined;
    combined.reserve(iv_.size() + ciphertext.size());
    combined.insert(combined.end(), iv_.begin(), iv_.end());
    combined.insert(combined.end(), ciphertext.begin(), ciphertext.end());
    
    // Base64 encode the combined data
    return base64Encode(combined);
}

std::string EncryptionService::decryptData(const std::string& ciphertext, const std::string& keyId) {
    // Find encryption key
    auto keyIt = encryptionKeys_.find(keyId);
    if (keyIt == encryptionKeys_.end()) {
        throw std::runtime_error("Invalid encryption key ID: " + keyId);
    }
    
    const std::string& key = keyIt->second;
    
    // Decode base64
    auto combinedData = base64Decode(ciphertext);
    
    // Extract IV and ciphertext
    if (combinedData.size() <= 16) {
        throw std::runtime_error("Invalid ciphertext format");
    }
    
    std::vector<unsigned char> iv(combinedData.begin(), combinedData.begin() + 16);
    std::vector<unsigned char> encryptedData(combinedData.begin() + 16, combinedData.end());
    
    // Initialize decryption context
    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    if (!ctx) {
        throw std::runtime_error("Failed to create decryption context");
    }
    
    // Initialize decryption operation
    if (EVP_DecryptInit_ex(ctx, EVP_aes_256_cbc(), NULL, 
                          reinterpret_cast<const unsigned char*>(key.c_str()), 
                          iv.data()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Failed to initialize decryption");
    }
    
    // Prepare output buffer
    std::vector<unsigned char> plaintext(encryptedData.size());
    int len = 0;
    int plaintext_len = 0;
    
    // Decrypt data
    if (EVP_DecryptUpdate(ctx, plaintext.data(), &len, 
                         encryptedData.data(), 
                         static_cast<int>(encryptedData.size())) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Failed to decrypt data");
    }
    
    plaintext_len = len;
    
    // Finalize decryption
    if (EVP_DecryptFinal_ex(ctx, plaintext.data() + len, &len) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Failed to finalize decryption");
    }
    
    plaintext_len += len;
    
    // Clean up
    EVP_CIPHER_CTX_free(ctx);
    
    // Resize plaintext to actual length
    plaintext.resize(plaintext_len);
    
    // Convert to string
    return std::string(reinterpret_cast<char*>(plaintext.data()), plaintext.size());
}

std::string EncryptionService::generateEncryptionKey() {
    // Generate a secure random 32-byte key (256 bits)
    const int KEY_LENGTH = 32;  // 32 bytes for AES-256
    
    std::vector<unsigned char> key(KEY_LENGTH);
    RAND_bytes(key.data(), KEY_LENGTH);
    
    // Convert to hex string for storage
    std::stringstream ss;
    for (unsigned char byte : key) {
        ss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(byte);
    }
    
    // Generate key ID
    std::string keyId = "key-" + std::to_string(encryptionKeys_.size() + 1);
    
    // Store the key
    encryptionKeys_[keyId] = ss.str();
    
    return keyId;
}

void EncryptionService::initializeKeys() {
    // In production, encryption keys would be securely loaded from a key management system
    // For demonstration, we're creating some initial keys
    
    // Master key (used for most sensitive data)
    std::string masterKeyHex = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    encryptionKeys_["master"] = masterKeyHex;
    
    // User data key
    std::string userDataKeyHex = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    encryptionKeys_["user-data"] = userDataKeyHex;
    
    // Generate additional keys for the service
    for (int i = 0; i < 3; ++i) {
        generateEncryptionKey();
    }
}

std::string EncryptionService::base64Encode(const std::vector<unsigned char>& data) {
    // Base64 encoding implementation
    static const char base64Chars[] = 
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    
    std::string encoded;
    encoded.reserve(((data.size() + 2) / 3) * 4);
    
    for (size_t i = 0; i < data.size(); i += 3) {
        uint32_t value = data[i] << 16;
        if (i + 1 < data.size()) value |= data[i + 1] << 8;
        if (i + 2 < data.size()) value |= data[i + 2];
        
        encoded.push_back(base64Chars[(value >> 18) & 0x3F]);
        encoded.push_back(base64Chars[(value >> 12) & 0x3F]);
        encoded.push_back(i + 1 < data.size() ? base64Chars[(value >> 6) & 0x3F] : '=');
        encoded.push_back(i + 2 < data.size() ? base64Chars[value & 0x3F] : '=');
    }
    
    return encoded;
}

std::vector<unsigned char> EncryptionService::base64Decode(const std::string& encoded) {
    // Base64 decoding implementation
    static const std::string base64Chars = 
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    
    std::vector<unsigned char> decoded;
    decoded.reserve((encoded.size() / 4) * 3);
    
    for (size_t i = 0; i < encoded.size(); i += 4) {
        uint32_t value = 0;
        
        for (size_t j = 0; j < 4; ++j) {
            if (i + j < encoded.size() && encoded[i + j] != '=') {
                value <<= 6;
                size_t pos = base64Chars.find(encoded[i + j]);
                if (pos != std::string::npos) {
                    value |= pos;
                }
            }
            else {
                value <<= 6;
            }
        }
        
        decoded.push_back((value >> 16) & 0xFF);
        if (i + 2 < encoded.size() && encoded[i + 2] != '=') {
            decoded.push_back((value >> 8) & 0xFF);
        }
        if (i + 3 < encoded.size() && encoded[i + 3] != '=') {
            decoded.push_back(value & 0xFF);
        }
    }
    
    return decoded;
}

// GDPRComplianceManager implementation
GDPRComplianceManager::GDPRComplianceManager() {}

Json::Value GDPRComplianceManager::processDeletionRequest(const std::string& userId, const std::string& requestReason) {
    // Generate a unique request ID
    std::string requestId = "del-" + std::to_string(deletionRequests_.size() + 1);
    
    // Create deletion request record
    Json::Value request;
    request["request_id"] = requestId;
    request["user_id"] = userId;
    request["reason"] = requestReason;
    request["status"] = "pending";
    request["timestamp"] = drogon::utils::getFormattedDate();
    
    // Store the request
    deletionRequests_[requestId] = request;
    
    // Notify data controllers about the deletion request
    notifyDataControllers(userId, "deletion");
    
    // In a real system, this would trigger a workflow for data deletion
    // For demonstration, we'll simulate immediate anonymization
    anonymizeUserData(userId);
    
    // Update request status
    request["status"] = "completed";
    deletionRequests_[requestId] = request;
    
    return request;
}

Json::Value GDPRComplianceManager::exportUserData(const std::string& userId) {
    // Log this data access
    logDataAccess(userId, "full_export", "GDPR data subject request");
    
    // In a real system, this would gather data from all relevant systems
    // For demonstration, we'll create a sample data package
    
    Json::Value userData;
    userData["user_id"] = userId;
    userData["export_date"] = drogon::utils::getFormattedDate();
    
    // Personal information
    Json::Value personalInfo;
    personalInfo["name"] = "Simulated User";  // In real system, actual user data
    personalInfo["email"] = "user@example.com";
    personalInfo["created_at"] = "2023-01-01T00:00:00Z";
    
    // Training records
    Json::Value trainingRecords(Json::arrayValue);
    
    Json::Value record1;
    record1["course_id"] = "TR-101";
    record1["course_name"] = "Basic Flight Training";
    record1["completion_date"] = "2023-02-15T00:00:00Z";
    record1["score"] = 92;
    trainingRecords.append(record1);
    
    Json::Value record2;
    record2["course_id"] = "TR-202";
    record2["course_name"] = "Advanced Navigation";
    record2["completion_date"] = "2023-05-20T00:00:00Z";
    record2["score"] = 88;
    trainingRecords.append(record2);
    
    // Assessment data
    Json::Value assessments(Json::arrayValue);
    
    Json::Value assessment1;
    assessment1["assessment_id"] = "A-501";
    assessment1["type"] = "Practical Test";
    assessment1["date"] = "2023-03-10T00:00:00Z";
    assessment1["result"] = "Pass";
    assessments.append(assessment1);
    
    // Combine all data
    userData["personal_info"] = personalInfo;
    userData["training_records"] = trainingRecords;
    userData["assessments"] = assessments;
    
    // Include data access logs
    Json::Value accessLogs(Json::arrayValue);
    for (const auto& log : dataAccessLog_) {
        if (std::get<1>(log) == userId) {
            Json::Value logEntry;
            logEntry["timestamp"] = std::get<0>(log);
            logEntry["data_category"] = std::get<2>(log);
            logEntry["reason"] = std::get<3>(log);
            accessLogs.append(logEntry);
        }
    }
    
    userData["data_access_logs"] = accessLogs;
    
    // Notify data controllers about the export
    notifyDataControllers(userId, "export");
    
    return userData;
}

bool GDPRComplianceManager::logDataAccess(const std::string& userId, const std::string& dataCategory, const std::string& accessReason) {
    // Log the data access event
    std::string timestamp = drogon::utils::getFormattedDate();
    dataAccessLog_.emplace_back(timestamp, userId, dataCategory, accessReason);
    return true;
}

void GDPRComplianceManager::anonymizeUserData(const std::string& userId) {
    // In a real system, this would anonymize or delete the user's data
    // across all relevant databases and systems
    
    // For demonstration, we'll just log the action
    std::cout << "Anonymizing data for user: " << userId << std::endl;
    
    // Steps that would be taken in a real system:
    // 1. Replace personal identifiers with anonymized values
    // 2. Delete unnecessary data
    // 3. Keep required data with anonymized identifiers
    // 4. Update audit logs to reflect the anonymization
}

void GDPRComplianceManager::notifyDataControllers(const std::string& userId, const std::string& requestType) {
    // In a real system, this would notify relevant data controllers
    // about the data subject request
    
    // For demonstration, we'll just log the notification
    std::cout << "Notifying data controllers about " << requestType
              << " request for user: " << userId << std::endl;
    
    // In a real system, this might:
    // 1. Send emails to data protection officers
    // 2. Create tickets in a workflow system
    // 3. Log the notifications for compliance purposes
}

// SecurityAuthenticationService implementation
SecurityAuthenticationService::SecurityAuthenticationService() {
    // Initialize JWT secret (in production, load from secure configuration)
    jwtSecret_ = "YourSecretKeyForSigningJwtsReplaceMeWithSecureKey";
    
    // Initialize components
    tokenManager_ = std::make_shared<TokenManager>(jwtSecret_);
    rbac_ = std::make_shared<RoleBasedAccessControl>();
    biometricAuth_ = std::make_shared<BiometricAuthenticator>();
    encryptionService_ = std::make_shared<EncryptionService>();
    gdprManager_ = std::make_shared<GDPRComplianceManager>();
}

void SecurityAuthenticationService::authenticate(const drogon::HttpRequestPtr& req, 
                   std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        std::string username = (*json)["username"].asString();
        std::string password = (*json)["password"].asString();
        
        // In production, we would look up the user in a database
        // For demonstration, we'll use hardcoded values
        
        // Check if credentials are valid
        bool isValid = false;
        std::string userId;
        std::string hashedPassword;
        std::string salt;
        
        if (username == "admin") {
            userId = "user-1";
            salt = "abcdef1234";
            hashedPassword = hashPassword("admin123", salt);
            isValid = verifyPassword(hashedPassword, password, salt);
        }
        else if (username == "instructor") {
            userId = "user-2";
            salt = "1234abcdef";
            hashedPassword = hashPassword("instructor456", salt);
            isValid = verifyPassword(hashedPassword, password, salt);
        }
        
        if (!isValid) {
            // Record failed login attempt
            recordAuthEvent(username, "login", false, "Invalid credentials");
            
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Invalid credentials";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k401Unauthorized);
            callback(resp);
            return;
        }
        
        // Get user roles
        auto roles = rbac_->getUserRoles(userId);
        
        // Generate tokens
        std::string accessToken = tokenManager_->generateToken(userId, roles, 60);  // 1 hour expiry
        std::string refreshToken = tokenManager_->generateRefreshToken(userId);
        
        // Record successful login
        recordAuthEvent(userId, "login", true, "");
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["access_token"] = accessToken;
        result["refresh_token"] = refreshToken;
        result["token_type"] = "Bearer";
        result["expires_in"] = 3600;  // 1 hour in seconds
        
        // Include user info
        Json::Value userInfo;
        userInfo["user_id"] = userId;
        userInfo["username"] = username;
        
        Json::Value rolesJson(Json::arrayValue);
        for (const auto& role : roles) {
            rolesJson.append(role);
        }
        userInfo["roles"] = rolesJson;
        
        result["user_info"] = userInfo;
        
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

void SecurityAuthenticationService::refreshToken(const drogon::HttpRequestPtr& req,
                   std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        std::string refreshToken = (*json)["refresh_token"].asString();
        
        // Generate new access token
        std::string newAccessToken = tokenManager_->refreshAccessToken(refreshToken);
        
        if (newAccessToken.empty()) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Invalid refresh token";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k401Unauthorized);
            callback(resp);
            return;
        }
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["access_token"] = newAccessToken;
        result["token_type"] = "Bearer";
        result["expires_in"] = 3600;  // 1 hour in seconds
        
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

void SecurityAuthenticationService::validateToken(const drogon::HttpRequestPtr& req,
                    std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        std::string token = (*json)["token"].asString();
        
        // Validate token
        Json::Value payload;
        bool isValid = tokenManager_->validateToken(token, payload);
        
        if (!isValid) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Invalid or expired token";
            error["valid"] = false;
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k401Unauthorized);
            callback(resp);
            return;
        }
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["valid"] = true;
        result["payload"] = payload;
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
        callback(resp);
    }
    catch (const std::exception& e) {
        Json::Value error;
        error["status"] = "error";
        error["message"] = e.what();
        error["valid"] = false;
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
        resp->setStatusCode(drogon::k500InternalServerError);
        callback(resp);
    }
}

void SecurityAuthenticationService::logout(const drogon::HttpRequestPtr& req,
             std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        std::string token = (*json)["token"].asString();
        std::string userId = (*json).get("user_id", "").asString();
        
        // If userId is provided, invalidate all tokens for the user
        if (!userId.empty()) {
            tokenManager_->invalidateAllUserTokens(userId);
        }
        else {
            // Otherwise, invalidate just the provided token
            tokenManager_->invalidateToken(token);
        }
        
        // Record logout event
        if (!userId.empty()) {
            recordAuthEvent(userId, "logout", true, "");
        }
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["message"] = "Logged out successfully";
        
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

void SecurityAuthenticationService::registerMultiFactor(const drogon::HttpRequestPtr& req,
                          std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        std::string userId = (*json)["user_id"].asString();
        std::string mfaType = (*json)["mfa_type"].asString();
        
        // In production, this would integrate with actual MFA providers
        // For demonstration, we'll simulate MFA registration
        
        Json::Value result;
        result["status"] = "success";
        
        if (mfaType == "totp") {
            // Time-based One-Time Password setup
            
            // Generate a random secret key
            std::string secretKey = generateSalt(20);
            
            // In production, store this key securely associated with the user
            
            // Provide information for QR code generation
            result["secret_key"] = secretKey;
            result["qr_code_url"] = "otpauth://totp/ATPSecurity:" + userId + 
                                    "?secret=" + secretKey + 
                                    "&issuer=Advanced%20Pilot%20Training%20Platform";
            
            result["message"] = "TOTP MFA registered successfully";
        }
        else if (mfaType == "sms") {
            // SMS-based MFA setup
            
            // In production, verify the phone number and store it
            std::string phoneNumber = (*json)["phone_number"].asString();
            
            // Simulate sending verification code
            result["verification_sent"] = true;
            result["message"] = "SMS verification code sent";
        }
        else {
            throw std::runtime_error("Unsupported MFA type: " + mfaType);
        }
        
        // Record MFA registration
        recordAuthEvent(userId, "mfa_register", true, "Type: " + mfaType);
        
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

void SecurityAuthenticationService::validateMultiFactor(const drogon::HttpRequestPtr& req,
                          std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        std::string userId = (*json)["user_id"].asString();
        std::string mfaType = (*json)["mfa_type"].asString();
        std::string code = (*json)["code"].asString();
        
        // In production, this would validate against actual MFA providers
        // For demonstration, we'll simulate validation
        
        bool isValid = false;
        
        if (mfaType == "totp") {
            // Simulate TOTP validation
            // In production, this would validate the code against the stored secret
            
            // For demonstration, accept code "123456"
            isValid = (code == "123456");
        }
        else if (mfaType == "sms") {
            // Simulate SMS code validation
            
            // For demonstration, accept code "123456"
            isValid = (code == "123456");
        }
        else {
            throw std::runtime_error("Unsupported MFA type: " + mfaType);
        }
        
        // Record MFA validation attempt
        recordAuthEvent(userId, "mfa_validate", isValid, "Type: " + mfaType);
        
        if (!isValid) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Invalid MFA code";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k401Unauthorized);
            callback(resp);
            return;
        }
        
        // Prepare response for success
        Json::Value result;
        result["status"] = "success";
        result["message"] = "MFA validated successfully";
        
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

void SecurityAuthenticationService::registerBiometric(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        std::string userId = (*json)["user_id"].asString();
        std::string biometricType = (*json)["biometric_type"].asString();
        std::string biometricData = (*json)["biometric_data"].asString();
        
        // Register biometric data
        bool success = biometricAuth_->registerBiometric(userId, biometricType, biometricData);
        
        if (!success) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Failed to register biometric data";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k500InternalServerError);
            callback(resp);
            return;
        }
        
        // Record biometric registration
        recordAuthEvent(userId, "biometric_register", true, "Type: " + biometricType);
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["message"] = "Biometric data registered successfully";
        result["biometric_type"] = biometricType;
        
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

void SecurityAuthenticationService::validateBiometric(const drogon::HttpRequestPtr& req,
                        std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        std::string userId = (*json)["user_id"].asString();
        std::string biometricType = (*json)["biometric_type"].asString();
        std::string biometricData = (*json)["biometric_data"].asString();
        
        // Validate biometric data
        bool isValid = biometricAuth_->validateBiometric(userId, biometricType, biometricData);
        
        // Record biometric validation attempt
        recordAuthEvent(userId, "biometric_validate", isValid, "Type: " + biometricType);
        
        if (!isValid) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Biometric validation failed";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k401Unauthorized);
            callback(resp);
            return;
        }
        
        // Generate tokens upon successful biometric authentication
        auto roles = rbac_->getUserRoles(userId);
        std::string accessToken = tokenManager_->generateToken(userId, roles, 60);  // 1 hour expiry
        std::string refreshToken = tokenManager_->generateRefreshToken(userId);
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["message"] = "Biometric validation successful";
        result["access_token"] = accessToken;
        result["refresh_token"] = refreshToken;
        result["token_type"] = "Bearer";
        result["expires_in"] = 3600;  // 1 hour in seconds
        
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

void SecurityAuthenticationService::checkPermission(const drogon::HttpRequestPtr& req,
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        std::string userId = (*json)["user_id"].asString();
        std::string resource = (*json)["resource"].asString();
        std::string action = (*json)["action"].asString();
        
        // Check permission
        bool hasPermission = rbac_->checkPermission(userId, resource, action);
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["has_permission"] = hasPermission;
        result["user_id"] = userId;
        result["resource"] = resource;
        result["action"] = action;
        
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

void SecurityAuthenticationService::getRolePermissions(const drogon::HttpRequestPtr& req,
                         std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                         const std::string& role) {
    try {
        // Get permissions for the role
        Json::Value permissions = rbac_->getRolePermissions(role);
        
        if (permissions["permissions"].empty()) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Role not found: " + role;
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k404NotFound);
            callback(resp);
            return;
        }
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["role"] = role;
        result["permissions"] = permissions["permissions"];
        
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

void SecurityAuthenticationService::updateUserRoles(const drogon::HttpRequestPtr& req,
                      std::function<void(const drogon::HttpResponsePtr&)>&& callback,
                      const std::string& userId) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        // Extract roles from request
        std::vector<std::string> roles;
        for (const auto& role : (*json)["roles"]) {
            roles.push_back(role.asString());
        }
        
        // Update user's roles
        bool success = rbac_->updateUserRoles(userId, roles);
        
        if (!success) {
            Json::Value error;
            error["status"] = "error";
            error["message"] = "Failed to update roles. One or more roles are invalid.";
            
            auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
            resp->setStatusCode(drogon::k400BadRequest);
            callback(resp);
            return;
        }
        
        // Invalidate existing tokens for the user
        tokenManager_->invalidateAllUserTokens(userId);
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["message"] = "User roles updated successfully";
        result["user_id"] = userId;
        
        Json::Value rolesJson(Json::arrayValue);
        for (const auto& role : roles) {
            rolesJson.append(role);
        }
        result["roles"] = rolesJson;
        
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

void SecurityAuthenticationService::encryptData(const drogon::HttpRequestPtr& req,
                  std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        std::string plaintext = (*json)["plaintext"].asString();
        std::string keyId = (*json).get("key_id", "master").asString();
        
        // Encrypt the data
        std::string ciphertext = encryptionService_->encryptData(plaintext, keyId);
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["ciphertext"] = ciphertext;
        result["key_id"] = keyId;
        
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

void SecurityAuthenticationService::decryptData(const drogon::HttpRequestPtr& req,
                  std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        std::string ciphertext = (*json)["ciphertext"].asString();
        std::string keyId = (*json).get("key_id", "master").asString();
        
        // Decrypt the data
        std::string plaintext = encryptionService_->decryptData(ciphertext, keyId);
        
        // Prepare response
        Json::Value result;
        result["status"] = "success";
        result["plaintext"] = plaintext;
        
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

void SecurityAuthenticationService::processDeletionRequest(const drogon::HttpRequestPtr& req,
                             std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        std::string userId = (*json)["user_id"].asString();
        std::string requestReason = (*json).get("reason", "User requested data deletion").asString();
        
        // Process deletion request
        Json::Value result = gdprManager_->processDeletionRequest(userId, requestReason);
        
        // Invalidate all tokens for the user
        tokenManager_->invalidateAllUserTokens(userId);
        
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

void SecurityAuthenticationService::exportUserData(const drogon::HttpRequestPtr& req,
                     std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    try {
        std::string userId = (*json)["user_id"].asString();
        
        // Validate token to ensure request is authorized
        std::string token = (*json).get("token", "").asString();
        
        if (!token.empty()) {
            Json::Value payload;
            bool isValid = tokenManager_->validateToken(token, payload);
            
            if (!isValid || payload["sub"].asString() != userId) {
                Json::Value error;
                error["status"] = "error";
                error["message"] = "Unauthorized access";
                
                auto resp = drogon::HttpResponse::newHttpJsonResponse(error);
                resp->setStatusCode(drogon::k403Forbidden);
                callback(resp);
                return;
            }
        }
        
        // Export user data
        Json::Value userData = gdprManager_->exportUserData(userId);
        
        auto resp = drogon::HttpResponse::newHttpJsonResponse(userData);
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
bool SecurityAuthenticationService::verifyPassword(const std::string& hashedPassword, const std::string& plainPassword, const std::string& salt) {
    std::string hashedInput = hashPassword(plainPassword, salt);
    return (hashedInput == hashedPassword);
}

std::string SecurityAuthenticationService::hashPassword(const std::string& password, const std::string& salt) {
    // Combine password and salt
    std::string combined = password + salt;
    
    // Generate SHA-256 hash
    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256(reinterpret_cast<const unsigned char*>(combined.c_str()), combined.length(), hash);
    
    // Convert hash to hexadecimal string
    std::stringstream ss;
    for (int i = 0; i < SHA256_DIGEST_LENGTH; ++i) {
        ss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(hash[i]);
    }
    
    return ss.str();
}

std::string SecurityAuthenticationService::generateSalt(size_t length) {
    const std::string charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    
    std::random_device rd;
    std::mt19937 gen(rd());
    std::uniform_int_distribution<size_t> dist(0, charset.length() - 1);
    
    std::string salt;
    salt.reserve(length);
    
    for (size_t i = 0; i < length; ++i) {
        salt += charset[dist(gen)];
    }
    
    return salt;
}

void SecurityAuthenticationService::recordAuthEvent(const std::string& userId, const std::string& eventType, bool success, const std::string& details) {
    // In production, this would log to a secure audit trail
    // For demonstration, we'll just print to console
    
    std::cout << "Auth Event - User: " << userId
              << ", Event: " << eventType
              << ", Success: " << (success ? "true" : "false");
    
    if (!details.empty()) {
        std::cout << ", Details: " << details;
    }
    
    std::cout << std::endl;
}

} // namespace security
} // namespace atp

// Main application entry point
int main() {
    // Configure Drogon app
    drogon::app().setLogPath("./")
                 .setLogLevel(trantor::Logger::kInfo)
                 .addListener("0.0.0.0", 8083)
                 .setThreadNum(16)
                 .run();
    
    return 0;
}
