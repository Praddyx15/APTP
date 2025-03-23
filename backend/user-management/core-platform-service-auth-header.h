#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <optional>
#include <memory>
#include <chrono>
#include <functional>

#include <jwt-cpp/jwt.h>
#include <nlohmann/json.hpp>
#include <openssl/x509.h>

namespace core_platform {
namespace auth {

/**
 * @brief Role-based permission levels
 */
enum class PermissionLevel {
    NONE = 0,
    READ = 1,
    WRITE = 2,
    ADMIN = 3
};

/**
 * @brief Authentication result structure
 */
struct AuthResult {
    bool success;
    std::string user_id;
    std::string error_message;
};

/**
 * @brief User credentials structure
 */
struct Credentials {
    std::string username;
    std::string password;
    std::optional<std::string> certificate;
};

/**
 * @brief Token data structure
 */
struct TokenData {
    std::string token;
    std::string refresh_token;
    std::chrono::system_clock::time_point expiry;
    std::string user_id;
    std::vector<std::string> roles;
};

/**
 * @brief Authentication service interface
 */
class IAuthService {
public:
    virtual ~IAuthService() = default;
    
    /**
     * @brief Authenticate a user with credentials
     * @param credentials User credentials
     * @return Authentication result
     */
    virtual AuthResult authenticate(const Credentials& credentials) = 0;
    
    /**
     * @brief Generate JWT tokens for an authenticated user
     * @param user_id User identifier
     * @param roles User roles
     * @return Token data
     */
    virtual TokenData generateTokens(const std::string& user_id, const std::vector<std::string>& roles) = 0;
    
    /**
     * @brief Validate a JWT token
     * @param token JWT token string
     * @return True if token is valid
     */
    virtual bool validateToken(const std::string& token) = 0;
    
    /**
     * @brief Refresh an existing token
     * @param refresh_token Refresh token
     * @return New token data or nullopt if refresh fails
     */
    virtual std::optional<TokenData> refreshToken(const std::string& refresh_token) = 0;
    
    /**
     * @brief Revoke a user's tokens
     * @param user_id User identifier
     */
    virtual void revokeUserTokens(const std::string& user_id) = 0;
};

/**
 * @brief JWT-based authentication service implementation
 */
class JwtAuthService : public IAuthService {
public:
    /**
     * @brief Constructor
     * @param secret JWT secret key
     * @param token_expiry Token expiry time in seconds
     * @param refresh_expiry Refresh token expiry time in seconds
     * @param cert_path Path to X.509 certificate file for cert-based auth
     */
    JwtAuthService(
        const std::string& secret,
        int token_expiry = 3600,
        int refresh_expiry = 86400,
        const std::string& cert_path = ""
    );
    
    ~JwtAuthService() override;
    
    // IAuthService implementation
    AuthResult authenticate(const Credentials& credentials) override;
    TokenData generateTokens(const std::string& user_id, const std::vector<std::string>& roles) override;
    bool validateToken(const std::string& token) override;
    std::optional<TokenData> refreshToken(const std::string& refresh_token) override;
    void revokeUserTokens(const std::string& user_id) override;

private:
    /**
     * @brief Validate X.509 certificate
     * @param cert_str Certificate in PEM format
     * @return Validation result
     */
    bool validateCertificate(const std::string& cert_str);
    
    /**
     * @brief Extract user ID from certificate
     * @param cert_str Certificate in PEM format
     * @return User ID or empty string if not found
     */
    std::string extractCertUserID(const std::string& cert_str);

    std::string secret_;
    int token_expiry_seconds_;
    int refresh_expiry_seconds_;
    std::string cert_path_;
    std::unordered_map<std::string, std::vector<std::string>> revoked_tokens_;
    
    // User credential validation (in a real system, this would connect to a database)
    // This is a simplified mock for demonstration
    std::unordered_map<std::string, std::string> user_credentials_;
    std::unordered_map<std::string, std::vector<std::string>> user_roles_;
};

/**
 * @brief Authorization service for role-based access control
 */
class AuthorizationService {
public:
    /**
     * @brief Constructor
     * @param auth_service Authentication service reference
     */
    explicit AuthorizationService(std::shared_ptr<IAuthService> auth_service);
    
    /**
     * @brief Check if a token has permission for a resource
     * @param token JWT token
     * @param resource_path Resource path
     * @param required_level Required permission level
     * @return True if authorized
     */
    bool hasPermission(
        const std::string& token,
        const std::string& resource_path,
        PermissionLevel required_level
    );
    
    /**
     * @brief Add a permission mapping for a role
     * @param role Role name
     * @param resource_path Resource path
     * @param level Permission level
     */
    void addRolePermission(
        const std::string& role,
        const std::string& resource_path,
        PermissionLevel level
    );

private:
    std::shared_ptr<IAuthService> auth_service_;
    
    // Role-based permissions mapping
    std::unordered_map<
        std::string, // role
        std::unordered_map<
            std::string, // resource_path
            PermissionLevel
        >
    > role_permissions_;
    
    // Role hierarchy (parent -> children)
    std::unordered_map<
        std::string,
        std::vector<std::string>
    > role_hierarchy_;
};

} // namespace auth
} // namespace core_platform