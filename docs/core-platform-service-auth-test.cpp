#include <gtest/gtest.h>
#include <gmock/gmock.h>

#include "auth/jwt_auth_service.h"

using namespace core_platform::auth;
using namespace testing;

class AuthServiceTest : public Test {
protected:
    void SetUp() override {
        // Create auth service with test secret
        auth_service = std::make_unique<JwtAuthService>(
            "test_secret_key", 
            60,     // Short token expiry for testing
            300     // Short refresh expiry for testing
        );
    }
    
    std::unique_ptr<JwtAuthService> auth_service;
};

TEST_F(AuthServiceTest, AuthenticateValidCredentials) {
    // Create test credentials
    Credentials credentials;
    credentials.username = "admin";
    credentials.password = "admin_password";
    
    // Authenticate
    AuthResult result = auth_service->authenticate(credentials);
    
    // Verify result
    EXPECT_TRUE(result.success);
    EXPECT_EQ(result.user_id, "admin");
    EXPECT_TRUE(result.error_message.empty());
}

TEST_F(AuthServiceTest, AuthenticateInvalidCredentials) {
    // Create test credentials with wrong password
    Credentials credentials;
    credentials.username = "admin";
    credentials.password = "wrong_password";
    
    // Authenticate
    AuthResult result = auth_service->authenticate(credentials);
    
    // Verify result
    EXPECT_FALSE(result.success);
    EXPECT_TRUE(result.user_id.empty());
    EXPECT_FALSE(result.error_message.empty());
}

TEST_F(AuthServiceTest, GenerateAndValidateToken) {
    // Generate token for test user
    std::string user_id = "test_user";
    std::vector<std::string> roles = {"admin", "instructor"};
    
    TokenData token_data = auth_service->generateTokens(user_id, roles);
    
    // Verify token data
    EXPECT_FALSE(token_data.token.empty());
    EXPECT_FALSE(token_data.refresh_token.empty());
    EXPECT_GT(std::chrono::system_clock::to_time_t(token_data.expiry),
              std::chrono::system_clock::to_time_t(std::chrono::system_clock::now()));
    EXPECT_EQ(token_data.user_id, user_id);
    EXPECT_EQ(token_data.roles, roles);
    
    // Validate token
    bool valid = auth_service->validateToken(token_data.token);
    EXPECT_TRUE(valid);
    
    // Validate with wrong token
    valid = auth_service->validateToken("wrong_token");
    EXPECT_FALSE(valid);
}

TEST_F(AuthServiceTest, RefreshToken) {
    // Generate token for test user
    std::string user_id = "test_user";
    std::vector<std::string> roles = {"admin", "instructor"};
    
    TokenData token_data = auth_service->generateTokens(user_id, roles);
    
    // Refresh token
    auto refreshed = auth_service->refreshToken(token_data.refresh_token);
    
    // Verify refreshed token
    EXPECT_TRUE(refreshed.has_value());
    EXPECT_FALSE(refreshed->token.empty());
    EXPECT_FALSE(refreshed->refresh_token.empty());
    EXPECT_GT(std::chrono::system_clock::to_time_t(refreshed->expiry),
              std::chrono::system_clock::to_time_t(std::chrono::system_clock::now()));
    EXPECT_EQ(refreshed->user_id, user_id);
    EXPECT_EQ(refreshed->roles, roles);
    
    // Refresh with wrong token
    auto invalid_refresh = auth_service->refreshToken("wrong_token");
    EXPECT_FALSE(invalid_refresh.has_value());
}

TEST_F(AuthServiceTest, RevokeToken) {
    // Generate token for test user
    std::string user_id = "test_user";
    std::vector<std::string> roles = {"admin", "instructor"};
    
    TokenData token_data = auth_service->generateTokens(user_id, roles);
    
    // Validate token
    bool valid = auth_service->validateToken(token_data.token);
    EXPECT_TRUE(valid);
    
    // Revoke token
    auth_service->revokeUserTokens(user_id);
    
    // Validate token again
    valid = auth_service->validateToken(token_data.token);
    EXPECT_FALSE(valid);
}

TEST_F(AuthServiceTest, TokenExpiry) {
    // Create auth service with very short expiry
    auto short_expiry_auth = std::make_unique<JwtAuthService>(
        "test_secret_key", 
        1,   // 1 second expiry
        10   // 10 second refresh expiry
    );
    
    // Generate token
    std::string user_id = "test_user";
    std::vector<std::string> roles = {"admin"};
    
    TokenData token_data = short_expiry_auth->generateTokens(user_id, roles);
    
    // Validate token immediately
    bool valid = short_expiry_auth->validateToken(token_data.token);
    EXPECT_TRUE(valid);
    
    // Wait for token to expire
    std::this_thread::sleep_for(std::chrono::seconds(2));
    
    // Validate token again
    valid = short_expiry_auth->validateToken(token_data.token);
    EXPECT_FALSE(valid);
}

// Authorization service tests

class AuthorizationServiceTest : public Test {
protected:
    void SetUp() override {
        // Create auth service
        auth_service = std::make_shared<JwtAuthService>(
            "test_secret_key", 
            60,    // Token expiry
            300    // Refresh expiry
        );
        
        // Create authorization service
        authz_service = std::make_unique<AuthorizationService>(auth_service);
        
        // Add test permissions
        authz_service->addRolePermission("admin", "/api/admin", PermissionLevel::ADMIN);
        authz_service->addRolePermission("instructor", "/api/courses", PermissionLevel::ADMIN);
        authz_service->addRolePermission("trainee", "/api/courses", PermissionLevel::READ);
    }
    
    std::shared_ptr<JwtAuthService> auth_service;
    std::unique_ptr<AuthorizationService> authz_service;
};

TEST_F(AuthorizationServiceTest, CheckPermission) {
    // Generate tokens for different roles
    auto admin_token = auth_service->generateTokens("admin", {"admin"});
    auto instructor_token = auth_service->generateTokens("instructor", {"instructor"});
    auto trainee_token = auth_service->generateTokens("trainee", {"trainee"});
    
    // Admin should have ADMIN permission on /api/admin
    EXPECT_TRUE(authz_service->hasPermission(
        admin_token.token, "/api/admin", PermissionLevel::ADMIN));
    
    // Instructor should NOT have permission on /api/admin
    EXPECT_FALSE(authz_service->hasPermission(
        instructor_token.token, "/api/admin", PermissionLevel::READ));
    
    // Instructor should have ADMIN permission on /api/courses
    EXPECT_TRUE(authz_service->hasPermission(
        instructor_token.token, "/api/courses", PermissionLevel::ADMIN));
    
    // Trainee should have READ permission on /api/courses
    EXPECT_TRUE(authz_service->hasPermission(
        trainee_token.token, "/api/courses", PermissionLevel::READ));
    
    // Trainee should NOT have WRITE permission on /api/courses
    EXPECT_FALSE(authz_service->hasPermission(
        trainee_token.token, "/api/courses", PermissionLevel::WRITE));
}

TEST_F(AuthorizationServiceTest, RoleHierarchy) {
    // Generate token for admin (who should inherit instructor and trainee permissions)
    auto admin_token = auth_service->generateTokens("admin_user", {"admin"});
    
    // Admin should have ADMIN permission on /api/courses (instructor permission)
    EXPECT_TRUE(authz_service->hasPermission(
        admin_token.token, "/api/courses", PermissionLevel::ADMIN));
}

int main(int argc, char** argv) {
    // Initialize Google Test
    ::testing::InitGoogleTest(&argc, argv);
    
    // Run all tests
    return RUN_ALL_TESTS();
}