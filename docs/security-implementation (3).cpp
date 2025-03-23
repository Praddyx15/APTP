#include <string>
#include <vector>
#include <chrono>
#include <memory>
#include <optional>
#include <unordered_map>
#include <cstring>
#include <openssl/evp.h>
#include <openssl/rand.h>
#include <openssl/hmac.h>
#include <openssl/aes.h>
#include <jwt-cpp/jwt.h>
#include <nlohmann/json.hpp>
#include <pqxx/pqxx>
#include <spdlog/spdlog.h>

// Forward declarations
namespace db {
    class DatabaseConnection;
}

namespace security {

// Constants
constexpr size_t AES_KEY_SIZE = 32; // 256 bits
constexpr size_t IV_SIZE = 16;      // 128 bits
constexpr size_t SALT_SIZE = 16;    // 128 bits
constexpr int PBKDF2_ITERATIONS = 10000;

using json = nlohmann::json;

/**
 * Enumeration for different security log levels
 */
enum class SecurityLogLevel {
    INFO,
    WARNING,
    ERROR,
    CRITICAL
};

/**
 * Enumeration for different permission types
 */
enum class Permission {
    READ,
    WRITE,
    DELETE,
    ADMIN
};

/**
 * Role-based permissions class
 */
class RolePermissions {
public:
    // Predefined roles
    static const std::string ROLE_ADMIN;
    static const std::string ROLE_INSTRUCTOR;
    static const std::string ROLE_TRAINEE;
    static const std::string ROLE_ANALYST;
    static const std::string ROLE_SUPPORT;

    /**
     * Check if a role has a specific permission for a resource
     */
    static bool hasPermission(
        const std::string& role,
        const std::string& resource,
        Permission permission
    );

    /**
     * Get all permissions for a role
     */
    static std::unordered_map<std::string, std::vector<Permission>> 
    getRolePermissions(const std::string& role);

    /**
     * Add a permission to a role
     */
    static void addPermission(
        const std::string& role,
        const std::string& resource,
        Permission permission
    );

    /**
     * Remove a permission from a role
     */
    static void removePermission(
        const std::string& role,
        const std::string& resource,
        Permission permission
    );

private:
    // Role-based permission mappings
    static std::unordered_map<std::string, 
           std::unordered_map<std::string, std::vector<Permission>>> rolePermissionsMap;
    
    // Initialize default role permissions
    static void initializeDefaultPermissions();
    
    // Singleton initialization flag
    static bool initialized;
};

/**
 * JWT Authentication Service
 */
class JwtAuthService {
public:
    /**
     * Constructor
     */
    JwtAuthService(
        const std::string& secretKey, 
        const std::string& issuer,
        std::shared_ptr<db::DatabaseConnection> dbConnection
    );

    /**
     * Generate a JWT token for a user
     */
    std::string generateToken(
        const std::string& userId,
        const std::string& username,
        const std::string& role,
        const std::vector<std::string>& permissions,
        const std::optional<std::chrono::seconds>& expiresIn = std::nullopt
    );

    /**
     * Validate a JWT token
     */
    bool validateToken(const std::string& token);

    /**
     * Decode token and extract claims
     */
    std::optional<json> decodeToken(const std::string& token);

    /**
     * Refresh a token with new expiration
     */
    std::string refreshToken(const std::string& token);

    /**
     * Revoke a token
     */
    bool revokeToken(const std::string& token);

    /**
     * Check if a token has been revoked
     */
    bool isTokenRevoked(const std::string& token);

private:
    std::string secretKey;
    std::string issuer;
    std::chrono::seconds defaultExpiryTime;
    std::shared_ptr<db::DatabaseConnection> dbConnection;
    
    // Cache of revoked tokens (to avoid DB lookups for every request)
    std::unordered_map<std::string, std::chrono::system_clock::time_point> revokedTokensCache;
    
    // Extract token ID from token
    std::string extractTokenId(const std::string& token);
    
    // Update revoked tokens cache from database
    void updateRevokedTokensCache();
};

/**
 * Multi-factor authentication service
 */
class MfaService {
public:
    /**
     * Constructor
     */
    MfaService(std::shared_ptr<db::DatabaseConnection> dbConnection);

    /**
     * Generate a new secret key for TOTP
     */
    std::string generateTotpSecret();

    /**
     * Generate a QR code URL for TOTP setup
     */
    std::string generateQrCodeUrl(
        const std::string& secret,
        const std::string& accountName,
        const std::string& issuer
    );

    /**
     * Validate a TOTP code
     */
    bool validateTotpCode(const std::string& secret, const std::string& code);

    /**
     * Enable MFA for a user
     */
    bool enableMfaForUser(const std::string& userId, const std::string& secret);

    /**
     * Disable MFA for a user
     */
    bool disableMfaForUser(const std::string& userId);

    /**
     * Check if MFA is enabled for a user
     */
    bool isMfaEnabledForUser(const std::string& userId);

    /**
     * Generate backup codes for a user
     */
    std::vector<std::string> generateBackupCodes(const std::string& userId);

    /**
     * Validate a backup code
     */
    bool validateBackupCode(const std::string& userId, const std::string& code);

private:
    std::shared_ptr<db::DatabaseConnection> dbConnection;
    
    // HMAC-based One-time Password (HOTP) implementation
    std::string generateHotp(const std::string& secret, uint64_t counter);
    
    // Time-based One-time Password (TOTP) implementation
    std::string generateTotp(const std::string& secret, uint64_t timeStep = 30);
    
    // Get current UNIX time
    uint64_t getCurrentTime();
};

/**
 * Encryption service for sensitive data
 */
class EncryptionService {
public:
    /**
     * Constructor
     */
    EncryptionService(const std::string& masterKey);

    /**
     * Encrypt data using AES-256 GCM
     */
    std::string encrypt(const std::string& plaintext);

    /**
     * Decrypt data using AES-256 GCM
     */
    std::optional<std::string> decrypt(const std::string& ciphertext);

    /**
     * Hash a password using PBKDF2
     */
    std::string hashPassword(const std::string& password);

    /**
     * Verify a password against its hash
     */
    bool verifyPassword(const std::string& password, const std::string& passwordHash);

    /**
     * Generate a random string of specified length
     */
    static std::string generateRandomString(size_t length);

private:
    std::string masterKey;
    
    // Derive encryption key from master key
    std::vector<uint8_t> deriveKey(
        const std::string& salt,
        const std::string& key,
        size_t keyLength
    );
    
    // Generate random initialization vector
    std::vector<uint8_t> generateIv();
    
    // Generate random salt
    std::vector<uint8_t> generateSalt();
    
    // Encode binary data to base64
    std::string base64Encode(const std::vector<uint8_t>& data);
    
    // Decode base64 to binary data
    std::vector<uint8_t> base64Decode(const std::string& encoded);
};

/**
 * Audit logging service
 */
class AuditLogService {
public:
    /**
     * Constructor
     */
    AuditLogService(std::shared_ptr<db::DatabaseConnection> dbConnection);

    /**
     * Log an audit event
     */
    void logEvent(
        const std::string& userId,
        const std::string& action,
        const std::string& entityType,
        const std::string& entityId,
        const std::string& ipAddress,
        const std::string& userAgent,
        const json& details,
        const std::string& status = "success"
    );

    /**
     * Log a failed authentication attempt
     */
    void logFailedAuthentication(
        const std::string& username,
        const std::string& ipAddress,
        const std::string& userAgent,
        const std::string& reason
    );

    /**
     * Get audit logs for a user
     */
    std::vector<json> getUserAuditLogs(
        const std::string& userId,
        size_t limit = 100,
        size_t offset = 0
    );

    /**
     * Get audit logs for an entity
     */
    std::vector<json> getEntityAuditLogs(
        const std::string& entityType,
        const std::string& entityId,
        size_t limit = 100,
        size_t offset = 0
    );

    /**
     * Search audit logs
     */
    std::vector<json> searchAuditLogs(
        const std::optional<std::string>& userId,
        const std::optional<std::string>& action,
        const std::optional<std::string>& entityType,
        const std::optional<std::string>& entityId,
        const std::optional<std::string>& status,
        const std::optional<std::chrono::system_clock::time_point>& startTime,
        const std::optional<std::chrono::system_clock::time_point>& endTime,
        size_t limit = 100,
        size_t offset = 0
    );

private:
    std::shared_ptr<db::DatabaseConnection> dbConnection;
    
    // Format timestamp for database
    std::string formatTimestamp(const std::chrono::system_clock::time_point& timePoint);
};

/**
 * Rate limiting service to prevent brute force attacks
 */
class RateLimitService {
public:
    /**
     * Constructor
     */
    RateLimitService(
        size_t maxAttempts = 5,
        std::chrono::seconds windowDuration = std::chrono::seconds(300)
    );

    /**
     * Record an attempt and check if rate limit is exceeded
     */
    bool checkRateLimit(const std::string& key);

    /**
     * Reset attempts for a key
     */
    void resetAttempts(const std::string& key);

    /**
     * Get remaining attempts for a key
     */
    size_t getRemainingAttempts(const std::string& key);

    /**
     * Get time until rate limit reset
     */
    std::chrono::seconds getTimeUntilReset(const std::string& key);

private:
    struct RateLimitInfo {
        size_t attempts;
        std::chrono::system_clock::time_point windowStart;
    };
    
    size_t maxAttempts;
    std::chrono::seconds windowDuration;
    std::unordered_map<std::string, RateLimitInfo> rateLimitMap;
    
    // Clean expired entries from rate limit map
    void cleanExpiredEntries();
};

/**
 * Main security service that combines all security features
 */
class SecurityService {
public:
    /**
     * Constructor
     */
    SecurityService(
        const std::string& jwtSecret,
        const std::string& jwtIssuer,
        const std::string& encryptionMasterKey,
        std::shared_ptr<db::DatabaseConnection> dbConnection
    );

    /**
     * Get JWT authentication service
     */
    std::shared_ptr<JwtAuthService> getJwtAuthService() const;

    /**
     * Get MFA service
     */
    std::shared_ptr<MfaService> getMfaService() const;

    /**
     * Get encryption service
     */
    std::shared_ptr<EncryptionService> getEncryptionService() const;

    /**
     * Get audit log service
     */
    std::shared_ptr<AuditLogService> getAuditLogService() const;

    /**
     * Get rate limit service
     */
    std::shared_ptr<RateLimitService> getRateLimitService() const;

    /**
     * Check if a user has permission for an action
     */
    bool checkPermission(
        const std::string& userId,
        const std::string& resource,
        Permission permission
    );

    /**
     * Authenticate a user with username and password
     */
    std::optional<json> authenticateUser(
        const std::string& username,
        const std::string& password,
        const std::string& ipAddress,
        const std::string& userAgent
    );

    /**
     * Complete MFA authentication
     */
    std::optional<std::string> completeMfaAuthentication(
        const std::string& userId,
        const std::string& mfaCode
    );

    /**
     * Encrypt and store sensitive data
     */
    bool storeSensitiveData(
        const std::string& entityType,
        const std::string& entityId,
        const std::string& fieldName,
        const std::string& value
    );

    /**
     * Retrieve and decrypt sensitive data
     */
    std::optional<std::string> retrieveSensitiveData(
        const std::string& entityType,
        const std::string& entityId,
        const std::string& fieldName
    );

    /**
     * Log security event
     */
    void logSecurityEvent(
        SecurityLogLevel level,
        const std::string& message,
        const json& details = json::object()
    );

private:
    std::shared_ptr<JwtAuthService> jwtAuthService;
    std::shared_ptr<MfaService> mfaService;
    std::shared_ptr<EncryptionService> encryptionService;
    std::shared_ptr<AuditLogService> auditLogService;
    std::shared_ptr<RateLimitService> rateLimitService;
    std::shared_ptr<db::DatabaseConnection> dbConnection;
    
    // Get user role and permissions from database
    std::optional<std::pair<std::string, std::vector<std::string>>> 
    getUserRoleAndPermissions(const std::string& userId);
    
    // Get user by username
    std::optional<json> getUserByUsername(const std::string& username);
};

// Implementation of SecurityService methods

SecurityService::SecurityService(
    const std::string& jwtSecret,
    const std::string& jwtIssuer,
    const std::string& encryptionMasterKey,
    std::shared_ptr<db::DatabaseConnection> dbConnection
) : dbConnection(dbConnection) {
    // Initialize services
    jwtAuthService = std::make_shared<JwtAuthService>(jwtSecret, jwtIssuer, dbConnection);
    mfaService = std::make_shared<MfaService>(dbConnection);
    encryptionService = std::make_shared<EncryptionService>(encryptionMasterKey);
    auditLogService = std::make_shared<AuditLogService>(dbConnection);
    rateLimitService = std::make_shared<RateLimitService>();
    
    // Initialize role permissions
    if (!RolePermissions::initialized) {
        RolePermissions::initializeDefaultPermissions();
    }
    
    spdlog::info("Security service initialized");
}

std::shared_ptr<JwtAuthService> SecurityService::getJwtAuthService() const {
    return jwtAuthService;
}

std::shared_ptr<MfaService> SecurityService::getMfaService() const {
    return mfaService;
}

std::shared_ptr<EncryptionService> SecurityService::getEncryptionService() const {
    return encryptionService;
}

std::shared_ptr<AuditLogService> SecurityService::getAuditLogService() const {
    return auditLogService;
}

std::shared_ptr<RateLimitService> SecurityService::getRateLimitService() const {
    return rateLimitService;
}

bool SecurityService::checkPermission(
    const std::string& userId,
    const std::string& resource,
    Permission permission
) {
    // Get user role and permissions
    auto roleAndPermissions = getUserRoleAndPermissions(userId);
    
    if (!roleAndPermissions) {
        return false;
    }
    
    const auto& [role, permissions] = *roleAndPermissions;
    
    // Check role-based permission
    if (RolePermissions::hasPermission(role, resource, permission)) {
        return true;
    }
    
    // TODO: Check user-specific permissions if needed
    
    return false;
}

std::optional<json> SecurityService::authenticateUser(
    const std::string& username,
    const std::string& password,
    const std::string& ipAddress,
    const std::string& userAgent
) {
    // Check rate limit for login attempts
    std::string rateLimitKey = "auth:" + username + ":" + ipAddress;
    if (rateLimitService->checkRateLimit(rateLimitKey)) {
        logSecurityEvent(
            SecurityLogLevel::WARNING,
            "Rate limit exceeded for authentication",
            {{"username", username}, {"ip_address", ipAddress}}
        );
        auditLogService->logFailedAuthentication(
            username, ipAddress, userAgent, "Rate limit exceeded"
        );
        return std::nullopt;
    }
    
    // Get user from database
    auto user = getUserByUsername(username);
    if (!user) {
        rateLimitService->checkRateLimit(rateLimitKey); // Increment attempt counter
        auditLogService->logFailedAuthentication(
            username, ipAddress, userAgent, "User not found"
        );
        return std::nullopt;
    }
    
    // Verify password
    const std::string storedHash = (*user)["password_hash"];
    if (!encryptionService->verifyPassword(password, storedHash)) {
        rateLimitService->checkRateLimit(rateLimitKey); // Increment attempt counter
        auditLogService->logFailedAuthentication(
            username, ipAddress, userAgent, "Invalid password"
        );
        return std::nullopt;
    }
    
    // Reset rate limit attempts on successful authentication
    rateLimitService->resetAttempts(rateLimitKey);
    
    // Check if MFA is required
    const bool mfaEnabled = (*user)["mfa_enabled"];
    if (mfaEnabled) {
        // Return partial auth info for MFA step
        json mfaInfo = {
            {"user_id", (*user)["id"]},
            {"username", username},
            {"mfa_required", true}
        };
        return mfaInfo;
    }
    
    // Get user role and permissions
    const std::string userId = (*user)["id"];
    auto roleAndPermissions = getUserRoleAndPermissions(userId);
    
    if (!roleAndPermissions) {
        auditLogService->logFailedAuthentication(
            username, ipAddress, userAgent, "Role or permissions not found"
        );
        return std::nullopt;
    }
    
    const auto& [role, permissions] = *roleAndPermissions;
    
    // Generate JWT token
    std::string token = jwtAuthService->generateToken(
        userId, username, role, permissions
    );
    
    // Log successful authentication
    auditLogService->logEvent(
        userId, "authentication", "user", userId, ipAddress, userAgent, {}, "success"
    );
    
    // Return auth info
    json authInfo = {
        {"user_id", userId},
        {"username", username},
        {"role", role},
        {"token", token},
        {"permissions", permissions}
    };
    
    return authInfo;
}

std::optional<std::string> SecurityService::completeMfaAuthentication(
    const std::string& userId,
    const std::string& mfaCode
) {
    // Get user from database
    // This implementation assumes a method to get user by ID
    // For brevity, this is not fully implemented
    std::string username = "user"; // Placeholder
    
    // Verify MFA code
    if (!mfaService->validateTotpCode("user_secret", mfaCode) && 
        !mfaService->validateBackupCode(userId, mfaCode)) {
        return std::nullopt;
    }
    
    // Get user role and permissions
    auto roleAndPermissions = getUserRoleAndPermissions(userId);
    
    if (!roleAndPermissions) {
        return std::nullopt;
    }
    
    const auto& [role, permissions] = *roleAndPermissions;
    
    // Generate JWT token
    std::string token = jwtAuthService->generateToken(
        userId, username, role, permissions
    );
    
    return token;
}

bool SecurityService::storeSensitiveData(
    const std::string& entityType,
    const std::string& entityId,
    const std::string& fieldName,
    const std::string& value
) {
    // Encrypt the sensitive data
    std::string encryptedValue = encryptionService->encrypt(value);
    
    try {
        // Store in database
        pqxx::work txn(*static_cast<pqxx::connection*>(dbConnection.get()));
        
        txn.exec_params(
            "INSERT INTO encrypted_data (entity_type, entity_id, field_name, encrypted_value, encryption_method) "
            "VALUES ($1, $2, $3, $4, $5) "
            "ON CONFLICT (entity_type, entity_id, field_name) "
            "DO UPDATE SET encrypted_value = EXCLUDED.encrypted_value, "
            "encryption_method = EXCLUDED.encryption_method, "
            "updated_at = NOW()",
            entityType, entityId, fieldName, encryptedValue, "AES-256-GCM"
        );
        
        txn.commit();
        return true;
    } catch (const std::exception& e) {
        spdlog::error("Failed to store encrypted data: {}", e.what());
        return false;
    }
}

std::optional<std::string> SecurityService::retrieveSensitiveData(
    const std::string& entityType,
    const std::string& entityId,
    const std::string& fieldName
) {
    try {
        // Retrieve from database
        pqxx::work txn(*static_cast<pqxx::connection*>(dbConnection.get()));
        
        auto result = txn.exec_params(
            "SELECT encrypted_value FROM encrypted_data "
            "WHERE entity_type = $1 AND entity_id = $2 AND field_name = $3",
            entityType, entityId, fieldName
        );
        
        if (result.empty()) {
            return std::nullopt;
        }
        
        std::string encryptedValue = result[0][0].as<std::string>();
        
        // Decrypt the value
        auto decryptedValue = encryptionService->decrypt(encryptedValue);
        return decryptedValue;
    } catch (const std::exception& e) {
        spdlog::error("Failed to retrieve encrypted data: {}", e.what());
        return std::nullopt;
    }
}

void SecurityService::logSecurityEvent(
    SecurityLogLevel level,
    const std::string& message,
    const json& details
) {
    std::string levelStr;
    
    switch (level) {
        case SecurityLogLevel::INFO:
            levelStr = "INFO";
            spdlog::info("[SECURITY] {}", message);
            break;
        case SecurityLogLevel::WARNING:
            levelStr = "WARNING";
            spdlog::warn("[SECURITY] {}", message);
            break;
        case SecurityLogLevel::ERROR:
            levelStr = "ERROR";
            spdlog::error("[SECURITY] {}", message);
            break;
        case SecurityLogLevel::CRITICAL:
            levelStr = "CRITICAL";
            spdlog::critical("[SECURITY] {}", message);
            break;
    }
    
    // Store security event in audit log
    json eventDetails = details;
    eventDetails["security_level"] = levelStr;
    
    auditLogService->logEvent(
        "", // No user ID for system events
        "security_event",
        "system",
        "",
        "",
        "",
        eventDetails
    );
}

std::optional<std::pair<std::string, std::vector<std::string>>> 
SecurityService::getUserRoleAndPermissions(const std::string& userId) {
    try {
        pqxx::work txn(*static_cast<pqxx::connection*>(dbConnection.get()));
        
        auto result = txn.exec_params(
            "SELECT role FROM users WHERE id = $1",
            userId
        );
        
        if (result.empty()) {
            return std::nullopt;
        }
        
        std::string role = result[0][0].as<std::string>();
        auto permissionsMap = RolePermissions::getRolePermissions(role);
        
        // Convert permission map to flat list of strings for JWT
        std::vector<std::string> permissionsList;
        for (const auto& [resource, permissions] : permissionsMap) {
            for (const auto& permission : permissions) {
                std::string permString;
                switch (permission) {
                    case Permission::READ:
                        permString = "read";
                        break;
                    case Permission::WRITE:
                        permString = "write";
                        break;
                    case Permission::DELETE:
                        permString = "delete";
                        break;
                    case Permission::ADMIN:
                        permString = "admin";
                        break;
                }
                permissionsList.push_back(resource + ":" + permString);
            }
        }
        
        return std::make_pair(role, permissionsList);
    } catch (const std::exception& e) {
        spdlog::error("Failed to get user role and permissions: {}", e.what());
        return std::nullopt;
    }
}

std::optional<json> SecurityService::getUserByUsername(const std::string& username) {
    try {
        pqxx::work txn(*static_cast<pqxx::connection*>(dbConnection.get()));
        
        auto result = txn.exec_params(
            "SELECT id, username, password_hash, role, mfa_enabled "
            "FROM users WHERE username = $1",
            username
        );
        
        if (result.empty()) {
            return std::nullopt;
        }
        
        json user = {
            {"id", result[0][0].as<std::string>()},
            {"username", result[0][1].as<std::string>()},
            {"password_hash", result[0][2].as<std::string>()},
            {"role", result[0][3].as<std::string>()},
            {"mfa_enabled", result[0][4].as<bool>()}
        };
        
        return user;
    } catch (const std::exception& e) {
        spdlog::error("Failed to get user by username: {}", e.what());
        return std::nullopt;
    }
}

// Implementation of EncryptionService methods

EncryptionService::EncryptionService(const std::string& masterKey) 
    : masterKey(masterKey) {
    // Initialize OpenSSL
    OpenSSL_add_all_algorithms();
}

std::string EncryptionService::encrypt(const std::string& plaintext) {
    // Generate random salt
    auto salt = generateSalt();
    
    // Derive key from master key and salt
    auto key = deriveKey(std::string(salt.begin(), salt.end()), masterKey, AES_KEY_SIZE);
    
    // Generate random IV
    auto iv = generateIv();
    
    // Prepare encryption context
    EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
    if (!ctx) {
        throw std::runtime_error("Failed to create encryption context");
    }
    
    // Initialize encryption operation
    if (EVP_EncryptInit_ex(ctx, EVP_aes_256_gcm(), nullptr, key.data(), iv.data()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Failed to initialize encryption");
    }
    
    // Prepare output buffer
    std::vector<uint8_t> ciphertext(plaintext.size() + EVP_MAX_BLOCK_LENGTH);
    int outlen = 0;
    
    // Encrypt data
    if (EVP_EncryptUpdate(ctx, ciphertext.data(), &outlen, 
                        reinterpret_cast<const uint8_t*>(plaintext.data()), 
                        plaintext.size()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Failed to encrypt data");
    }
    
    int tmplen = 0;
    
    // Finalize encryption
    if (EVP_EncryptFinal_ex(ctx, ciphertext.data() + outlen, &tmplen) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Failed to finalize encryption");
    }
    
    outlen += tmplen;
    ciphertext.resize(outlen);
    
    // Get authentication tag
    std::vector<uint8_t> tag(16);
    if (EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_GET_TAG, 16, tag.data()) != 1) {
        EVP_CIPHER_CTX_free(ctx);
        throw std::runtime_error("Failed to get authentication tag");
    }
    
    EVP_CIPHER_CTX_free(ctx);
    
    // Combine salt, IV, ciphertext, and tag
    std::vector<uint8_t> result;
    result.insert(result.end(), salt.begin(), salt.end());
    result.insert(result.end(), iv.begin(), iv.end());
    result.insert(result.end(), ciphertext.begin(), ciphertext.end());
    result.insert(result.end(), tag.begin(), tag.end());
    
    // Base64 encode the result
    return base64Encode(result);
}

std::optional<std::string> EncryptionService::decrypt(const std::string& ciphertext) {
    try {
        // Base64 decode
        auto data = base64Decode(ciphertext);
        
        // Extract salt, IV, ciphertext, and tag
        if (data.size() < SALT_SIZE + IV_SIZE + 16) {
            // Invalid format
            return std::nullopt;
        }
        
        std::vector<uint8_t> salt(data.begin(), data.begin() + SALT_SIZE);
        std::vector<uint8_t> iv(data.begin() + SALT_SIZE, data.begin() + SALT_SIZE + IV_SIZE);
        std::vector<uint8_t> tag(data.end() - 16, data.end());
        std::vector<uint8_t> encryptedData(data.begin() + SALT_SIZE + IV_SIZE, data.end() - 16);
        
        // Derive key from master key and salt
        auto key = deriveKey(std::string(salt.begin(), salt.end()), masterKey, AES_KEY_SIZE);
        
        // Prepare decryption context
        EVP_CIPHER_CTX* ctx = EVP_CIPHER_CTX_new();
        if (!ctx) {
            throw std::runtime_error("Failed to create decryption context");
        }
        
        // Initialize decryption operation
        if (EVP_DecryptInit_ex(ctx, EVP_aes_256_gcm(), nullptr, key.data(), iv.data()) != 1) {
            EVP_CIPHER_CTX_free(ctx);
            throw std::runtime_error("Failed to initialize decryption");
        }
        
        // Set authentication tag
        if (EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_TAG, tag.size(), tag.data()) != 1) {
            EVP_CIPHER_CTX_free(ctx);
            throw std::runtime_error("Failed to set authentication tag");
        }
        
        // Prepare output buffer
        std::vector<uint8_t> plaintext(encryptedData.size());
        int outlen = 0;
        
        // Decrypt data
        if (EVP_DecryptUpdate(ctx, plaintext.data(), &outlen, 
                            encryptedData.data(), encryptedData.size()) != 1) {
            EVP_CIPHER_CTX_free(ctx);
            throw std::runtime_error("Failed to decrypt data");
        }
        
        int tmplen = 0;
        
        // Finalize decryption
        if (EVP_DecryptFinal_ex(ctx, plaintext.data() + outlen, &tmplen) != 1) {
            // Authentication failed
            EVP_CIPHER_CTX_free(ctx);
            return std::nullopt;
        }
        
        outlen += tmplen;
        plaintext.resize(outlen);
        
        EVP_CIPHER_CTX_free(ctx);
        
        // Convert to string
        return std::string(plaintext.begin(), plaintext.end());
    } catch (const std::exception& e) {
        spdlog::error("Decryption failed: {}", e.what());
        return std::nullopt;
    }
}

std::string EncryptionService::hashPassword(const std::string& password) {
    // Generate random salt
    auto salt = generateSalt();
    
    // Derive key using PBKDF2
    std::vector<uint8_t> derivedKey(32); // 256 bits
    
    if (PKCS5_PBKDF2_HMAC(
            password.c_str(),
            password.size(),
            salt.data(),
            salt.size(),
            PBKDF2_ITERATIONS,
            EVP_sha256(),
            derivedKey.size(),
            derivedKey.data()) != 1) {
        throw std::runtime_error("Failed to derive key for password");
    }
    
    // Combine salt and derived key
    std::vector<uint8_t> result;
    result.insert(result.end(), salt.begin(), salt.end());
    result.insert(result.end(), derivedKey.begin(), derivedKey.end());
    
    // Base64 encode
    return base64Encode(result);
}

bool EncryptionService::verifyPassword(const std::string& password, const std::string& passwordHash) {
    try {
        // Base64 decode
        auto data = base64Decode(passwordHash);
        
        // Extract salt and hash
        if (data.size() != SALT_SIZE + 32) {
            // Invalid format
            return false;
        }
        
        std::vector<uint8_t> salt(data.begin(), data.begin() + SALT_SIZE);
        std::vector<uint8_t> storedHash(data.begin() + SALT_SIZE, data.end());
        
        // Derive key using the same parameters
        std::vector<uint8_t> derivedKey(32); // 256 bits
        
        if (PKCS5_PBKDF2_HMAC(
                password.c_str(),
                password.size(),
                salt.data(),
                salt.size(),
                PBKDF2_ITERATIONS,
                EVP_sha256(),
                derivedKey.size(),
                derivedKey.data()) != 1) {
            throw std::runtime_error("Failed to derive key for password verification");
        }
        
        // Compare hashes using constant-time comparison
        return CRYPTO_memcmp(derivedKey.data(), storedHash.data(), derivedKey.size()) == 0;
    } catch (const std::exception& e) {
        spdlog::error("Password verification failed: {}", e.what());
        return false;
    }
}

std::string EncryptionService::generateRandomString(size_t length) {
    static const char charset[] = 
        "0123456789"
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "abcdefghijklmnopqrstuvwxyz";
    
    std::vector<uint8_t> randomData(length);
    RAND_bytes(randomData.data(), randomData.size());
    
    std::string result(length, 0);
    for (size_t i = 0; i < length; ++i) {
        result[i] = charset[randomData[i] % (sizeof(charset) - 1)];
    }
    
    return result;
}

std::vector<uint8_t> EncryptionService::deriveKey(
    const std::string& salt,
    const std::string& key,
    size_t keyLength
) {
    std::vector<uint8_t> derivedKey(keyLength);
    
    if (PKCS5_PBKDF2_HMAC(
            key.c_str(),
            key.size(),
            reinterpret_cast<const uint8_t*>(salt.c_str()),
            salt.size(),
            10000,
            EVP_sha256(),
            keyLength,
            derivedKey.data()) != 1) {
        throw std::runtime_error("Failed to derive key");
    }
    
    return derivedKey;
}

std::vector<uint8_t> EncryptionService::generateIv() {
    std::vector<uint8_t> iv(IV_SIZE);
    RAND_bytes(iv.data(), iv.size());
    return iv;
}

std::vector<uint8_t> EncryptionService::generateSalt() {
    std::vector<uint8_t> salt(SALT_SIZE);
    RAND_bytes(salt.data(), salt.size());
    return salt;
}

std::string EncryptionService::base64Encode(const std::vector<uint8_t>& data) {
    BIO* b64 = BIO_new(BIO_f_base64());
    BIO* bmem = BIO_new(BIO_s_mem());
    b64 = BIO_push(b64, bmem);
    BIO_set_flags(b64, BIO_FLAGS_BASE64_NO_NL);
    BIO_write(b64, data.data(), data.size());
    BIO_flush(b64);
    
    BUF_MEM* bptr;
    BIO_get_mem_ptr(b64, &bptr);
    
    std::string result(bptr->data, bptr->length);
    BIO_free_all(b64);
    
    return result;
}

std::vector<uint8_t> EncryptionService::base64Decode(const std::string& encoded) {
    BIO* b64 = BIO_new(BIO_f_base64());
    BIO* bmem = BIO_new_mem_buf(encoded.c_str(), encoded.size());
    bmem = BIO_push(b64, bmem);
    BIO_set_flags(bmem, BIO_FLAGS_BASE64_NO_NL);
    
    std::vector<uint8_t> output(encoded.size());
    int decodedSize = BIO_read(bmem, output.data(), encoded.size());
    BIO_free_all(bmem);
    
    if (decodedSize < 0) {
        throw std::runtime_error("Failed to decode base64 data");
    }
    
    output.resize(decodedSize);
    return output;
}

} // namespace security