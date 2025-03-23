#include "auth/jwt_auth_service.h"
#include "logging/logger.h"

#include <fstream>
#include <iomanip>
#include <sstream>
#include <chrono>
#include <algorithm>
#include <openssl/pem.h>
#include <openssl/err.h>

namespace core_platform {
namespace auth {

JwtAuthService::JwtAuthService(
    const std::string& secret,
    int token_expiry,
    int refresh_expiry,
    const std::string& cert_path
) : 
    secret_(secret),
    token_expiry_seconds_(token_expiry),
    refresh_expiry_seconds_(refresh_expiry),
    cert_path_(cert_path)
{
    // Initialize OpenSSL
    OpenSSL_add_all_algorithms();
    ERR_load_crypto_strings();
    
    // Mock user data - in a real system, this would come from a database
    user_credentials_["admin"] = "admin_password";
    user_credentials_["instructor"] = "instructor_password";
    user_credentials_["trainee"] = "trainee_password";
    
    user_roles_["admin"] = {"admin", "instructor", "trainee"};
    user_roles_["instructor"] = {"instructor", "trainee"};
    user_roles_["trainee"] = {"trainee"};
    
    logging::Logger::getInstance().info("JwtAuthService initialized");
}

JwtAuthService::~JwtAuthService() {
    // Clean up OpenSSL
    EVP_cleanup();
    ERR_free_strings();
}

AuthResult JwtAuthService::authenticate(const Credentials& credentials) {
    AuthResult result;
    result.success = false;
    
    // Check for certificate-based authentication
    if (credentials.certificate.has_value() && !credentials.certificate.value().empty()) {
        const std::string& cert_str = credentials.certificate.value();
        if (validateCertificate(cert_str)) {
            std::string user_id = extractCertUserID(cert_str);
            if (!user_id.empty()) {
                result.success = true;
                result.user_id = user_id;
                logging::Logger::getInstance().info("User {} authenticated with certificate", user_id);
                return result;
            }
        }
        result.error_message = "Invalid certificate";
        logging::Logger::getInstance().warn("Certificate authentication failed");
        return result;
    }
    
    // Fall back to username/password authentication
    auto it = user_credentials_.find(credentials.username);
    if (it != user_credentials_.end() && it->second == credentials.password) {
        result.success = true;
        result.user_id = credentials.username;
        logging::Logger::getInstance().info("User {} authenticated with password", credentials.username);
    } else {
        result.error_message = "Invalid username or password";
        logging::Logger::getInstance().warn("Password authentication failed for user {}", credentials.username);
    }
    
    return result;
}

TokenData JwtAuthService::generateTokens(const std::string& user_id, const std::vector<std::string>& roles) {
    auto now = std::chrono::system_clock::now();
    auto token_exp = now + std::chrono::seconds(token_expiry_seconds_);
    auto refresh_exp = now + std::chrono::seconds(refresh_expiry_seconds_);
    
    // Create token payload
    auto token = jwt::create()
        .set_issuer("core-platform-service")
        .set_subject(user_id)
        .set_issued_at(now)
        .set_expires_at(token_exp);
    
    // Add roles to token
    nlohmann::json roles_json = roles;
    token.set_payload_claim("roles", jwt::claim(roles_json.dump()));
    
    // Sign the token
    std::string token_str = token.sign(jwt::algorithm::hs256{secret_});
    
    // Create refresh token
    auto refresh_token = jwt::create()
        .set_issuer("core-platform-service")
        .set_subject(user_id)
        .set_issued_at(now)
        .set_expires_at(refresh_exp)
        .set_payload_claim("type", jwt::claim(std::string("refresh")))
        .sign(jwt::algorithm::hs256{secret_});
    
    TokenData token_data;
    token_data.token = token_str;
    token_data.refresh_token = refresh_token;
    token_data.expiry = token_exp;
    token_data.user_id = user_id;
    token_data.roles = roles;
    
    logging::Logger::getInstance().info("Generated tokens for user {}", user_id);
    
    return token_data;
}

bool JwtAuthService::validateToken(const std::string& token) {
    try {
        // Check if token has been revoked
        auto decoded = jwt::decode(token);
        std::string user_id = decoded.get_subject();
        
        auto it = revoked_tokens_.find(user_id);
        if (it != revoked_tokens_.end()) {
            for (const auto& revoked_token : it->second) {
                if (revoked_token == token) {
                    logging::Logger::getInstance().warn("Token has been revoked for user {}", user_id);
                    return false;
                }
            }
        }
        
        // Verify token signature and expiration
        auto verifier = jwt::verify()
            .allow_algorithm(jwt::algorithm::hs256{secret_})
            .with_issuer("core-platform-service");
        
        verifier.verify(decoded);
        logging::Logger::getInstance().debug("Token validated for user {}", user_id);
        return true;
    } 
    catch (const jwt::token_verification_exception& e) {
        logging::Logger::getInstance().warn("Token validation failed: {}", e.what());
        return false;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Token validation error: {}", e.what());
        return false;
    }
}

std::optional<TokenData> JwtAuthService::refreshToken(const std::string& refresh_token) {
    try {
        auto decoded = jwt::decode(refresh_token);
        
        // Verify token
        auto verifier = jwt::verify()
            .allow_algorithm(jwt::algorithm::hs256{secret_})
            .with_issuer("core-platform-service");
        
        verifier.verify(decoded);
        
        // Check if it's a refresh token
        if (!decoded.has_payload_claim("type") || 
            decoded.get_payload_claim("type").as_string() != "refresh") {
            logging::Logger::getInstance().warn("Not a refresh token");
            return std::nullopt;
        }
        
        // Get user data
        std::string user_id = decoded.get_subject();
        
        // Check if user exists and get roles
        auto roles_it = user_roles_.find(user_id);
        if (roles_it == user_roles_.end()) {
            logging::Logger::getInstance().warn("User {} not found for token refresh", user_id);
            return std::nullopt;
        }
        
        // Generate new tokens
        auto token_data = generateTokens(user_id, roles_it->second);
        logging::Logger::getInstance().info("Refreshed tokens for user {}", user_id);
        
        return token_data;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Token refresh error: {}", e.what());
        return std::nullopt;
    }
}

void JwtAuthService::revokeUserTokens(const std::string& user_id) {
    // In a real implementation, all tokens for this user would be added to a
    // blacklist or revocation list, possibly in a database or redis cache
    
    // Here we're just clearing any existing revoked tokens and creating a new entry
    revoked_tokens_[user_id] = std::vector<std::string>();
    logging::Logger::getInstance().info("Revoked all tokens for user {}", user_id);
}

bool JwtAuthService::validateCertificate(const std::string& cert_str) {
    BIO* bio = BIO_new(BIO_s_mem());
    BIO_puts(bio, cert_str.c_str());
    
    X509* cert = PEM_read_bio_X509(bio, nullptr, nullptr, nullptr);
    BIO_free(bio);
    
    if (!cert) {
        logging::Logger::getInstance().error("Failed to parse X.509 certificate");
        return false;
    }
    
    // Check certificate validity period
    auto now = std::chrono::system_clock::now();
    auto now_time_t = std::chrono::system_clock::to_time_t(now);
    
    if (X509_cmp_time(X509_get_notBefore(cert), &now_time_t) >= 0 ||
        X509_cmp_time(X509_get_notAfter(cert), &now_time_t) <= 0) {
        X509_free(cert);
        logging::Logger::getInstance().warn("Certificate is not valid at current time");
        return false;
    }
    
    // In a real implementation, you would also:
    // 1. Verify certificate against a trusted CA
    // 2. Check certificate revocation status using CRL or OCSP
    // 3. Verify certificate extensions and usage
    
    X509_free(cert);
    return true;
}

std::string JwtAuthService::extractCertUserID(const std::string& cert_str) {
    BIO* bio = BIO_new(BIO_s_mem());
    BIO_puts(bio, cert_str.c_str());
    
    X509* cert = PEM_read_bio_X509(bio, nullptr, nullptr, nullptr);
    BIO_free(bio);
    
    if (!cert) {
        return "";
    }
    
    // Get subject name
    X509_NAME* subject_name = X509_get_subject_name(cert);
    if (!subject_name) {
        X509_free(cert);
        return "";
    }
    
    // Extract Common Name (CN) which often contains the user ID
    int index = X509_NAME_get_index_by_NID(subject_name, NID_commonName, -1);
    if (index < 0) {
        X509_free(cert);
        return "";
    }
    
    X509_NAME_ENTRY* entry = X509_NAME_get_entry(subject_name, index);
    if (!entry) {
        X509_free(cert);
        return "";
    }
    
    ASN1_STRING* data = X509_NAME_ENTRY_get_data(entry);
    unsigned char* utf8 = nullptr;
    int len = ASN1_STRING_to_UTF8(&utf8, data);
    
    std::string user_id;
    if (len > 0) {
        user_id = std::string(reinterpret_cast<char*>(utf8), len);
        OPENSSL_free(utf8);
    }
    
    X509_free(cert);
    return user_id;
}

// AuthorizationService implementation

AuthorizationService::AuthorizationService(std::shared_ptr<IAuthService> auth_service)
    : auth_service_(std::move(auth_service)) {
    
    // Setup role hierarchy
    role_hierarchy_["admin"] = {"instructor", "trainee"};
    role_hierarchy_["instructor"] = {"trainee"};
    
    // Setup default permissions
    addRolePermission("admin", "/api/admin", PermissionLevel::ADMIN);
    addRolePermission("admin", "/api/users", PermissionLevel::ADMIN);
    addRolePermission("instructor", "/api/courses", PermissionLevel::ADMIN);
    addRolePermission("instructor", "/api/assessments", PermissionLevel::ADMIN);
    addRolePermission("trainee", "/api/courses", PermissionLevel::READ);
    addRolePermission("trainee", "/api/assessments", PermissionLevel::READ);
    
    logging::Logger::getInstance().info("AuthorizationService initialized");
}

bool AuthorizationService::hasPermission(
    const std::string& token,
    const std::string& resource_path,
    PermissionLevel required_level
) {
    // Validate token first
    if (!auth_service_->validateToken(token)) {
        return false;
    }
    
    try {
        // Extract roles from token
        auto decoded = jwt::decode(token);
        if (!decoded.has_payload_claim("roles")) {
            logging::Logger::getInstance().warn("Token has no roles claim");
            return false;
        }
        
        std::string roles_json = decoded.get_payload_claim("roles").as_string();
        auto roles = nlohmann::json::parse(roles_json).get<std::vector<std::string>>();
        
        // Check each role for permission
        for (const auto& role : roles) {
            // Check direct permission
            auto role_it = role_permissions_.find(role);
            if (role_it != role_permissions_.end()) {
                auto perm_it = role_it->second.find(resource_path);
                if (perm_it != role_it->second.end() && 
                    static_cast<int>(perm_it->second) >= static_cast<int>(required_level)) {
                    return true;
                }
            }
            
            // Check hierarchical permissions
            std::function<bool(const std::string&)> check_hierarchy;
            check_hierarchy = [&](const std::string& parent_role) -> bool {
                auto hier_it = role_hierarchy_.find(parent_role);
                if (hier_it == role_hierarchy_.end()) {
                    return false;
                }
                
                for (const auto& child_role : hier_it->second) {
                    if (child_role == role) {
                        auto parent_perm_it = role_permissions_.find(parent_role);
                        if (parent_perm_it != role_permissions_.end()) {
                            auto res_perm_it = parent_perm_it->second.find(resource_path);
                            if (res_perm_it != parent_perm_it->second.end() && 
                                static_cast<int>(res_perm_it->second) >= static_cast<int>(required_level)) {
                                return true;
                            }
                        }
                    }
                    
                    if (check_hierarchy(child_role)) {
                        return true;
                    }
                }
                
                return false;
            };
            
            for (const auto& [parent_role, _] : role_hierarchy_) {
                if (check_hierarchy(parent_role)) {
                    return true;
                }
            }
        }
        
        logging::Logger::getInstance().warn("User does not have required permissions for {}", resource_path);
        return false;
    }
    catch (const std::exception& e) {
        logging::Logger::getInstance().error("Permission check error: {}", e.what());
        return false;
    }
}

void AuthorizationService::addRolePermission(
    const std::string& role,
    const std::string& resource_path,
    PermissionLevel level
) {
    role_permissions_[role][resource_path] = level;
    logging::Logger::getInstance().debug("Added permission {} for role {} on resource {}", 
        static_cast<int>(level), role, resource_path);
}

} // namespace auth
} // namespace core_platform