# backend/CMakeLists.txt
cmake_minimum_required(VERSION 3.15)
project(AdvancedPilotTrainingPlatform CXX)

# Set C++ standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Add compiler flags
if(MSVC)
    add_compile_options(/W4)
else()
    add_compile_options(-Wall -Wextra -pedantic)
endif()

# Find required packages
find_package(Drogon REQUIRED)
find_package(OpenSSL REQUIRED)
find_package(PostgreSQL REQUIRED)
find_package(nlohmann_json REQUIRED)
find_package(Boost REQUIRED COMPONENTS system filesystem)
find_package(GTest REQUIRED)
find_package(Threads REQUIRED)

# Optional: Enable testing
enable_testing()

# Add subdirectories
add_subdirectory(core)
add_subdirectory(document)
add_subdirectory(syllabus)
add_subdirectory(assessment)
add_subdirectory(user-management)
add_subdirectory(scheduler)
add_subdirectory(analytics)
add_subdirectory(compliance)
add_subdirectory(collaboration)
add_subdirectory(visualization)
add_subdirectory(integration)
add_subdirectory(security)
add_subdirectory(api)

# Main application
add_executable(aptp_server main.cpp)
target_link_libraries(aptp_server
    PRIVATE
    aptp_core
    aptp_api
    Drogon::Drogon
    Threads::Threads
)

# Installation
install(TARGETS aptp_server
    RUNTIME DESTINATION bin
)

# backend/core/CMakeLists.txt
add_library(aptp_core
    src/ConfigurationManager.cpp
    src/Logger.cpp
    src/ErrorHandling.cpp
    src/DatabaseManager.cpp
)

target_include_directories(aptp_core
    PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_link_libraries(aptp_core
    PUBLIC
    PostgreSQL::PostgreSQL
    OpenSSL::SSL
    OpenSSL::Crypto
    nlohmann_json::nlohmann_json
    Boost::system
    Boost::filesystem
)

# Tests
add_executable(core_tests
    test/ConfigurationManagerTest.cpp
    test/LoggerTest.cpp
    test/ErrorHandlingTest.cpp
    test/DatabaseManagerTest.cpp
)

target_link_libraries(core_tests
    PRIVATE
    aptp_core
    GTest::GTest
    GTest::Main
)

add_test(NAME core_tests COMMAND core_tests)

# backend/document/CMakeLists.txt
add_library(aptp_document
    src/DocumentProcessor.cpp
    src/OCRProcessor.cpp
    src/AIDocumentAnalyzer.cpp
)

target_include_directories(aptp_document
    PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_link_libraries(aptp_document
    PUBLIC
    aptp_core
    nlohmann_json::nlohmann_json
    # Add OCR and document processing libraries
)

# Tests
add_executable(document_tests
    test/DocumentProcessorTest.cpp
    test/OCRProcessorTest.cpp
    test/AIDocumentAnalyzerTest.cpp
)

target_link_libraries(document_tests
    PRIVATE
    aptp_document
    GTest::GTest
    GTest::Main
)

add_test(NAME document_tests COMMAND document_tests)

# backend/syllabus/CMakeLists.txt
add_library(aptp_syllabus
    src/SyllabusGenerator.cpp
)

target_include_directories(aptp_syllabus
    PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_link_libraries(aptp_syllabus
    PUBLIC
    aptp_core
    aptp_document
    nlohmann_json::nlohmann_json
)

# Tests
add_executable(syllabus_tests
    test/SyllabusGeneratorTest.cpp
)

target_link_libraries(syllabus_tests
    PRIVATE
    aptp_syllabus
    GTest::GTest
    GTest::Main
)

add_test(NAME syllabus_tests COMMAND syllabus_tests)

# backend/assessment/CMakeLists.txt
add_library(aptp_assessment
    src/AssessmentManager.cpp
    src/GradeManager.cpp
    src/BiometricProcessor.cpp
)

target_include_directories(aptp_assessment
    PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_link_libraries(aptp_assessment
    PUBLIC
    aptp_core
    aptp_syllabus
    nlohmann_json::nlohmann_json
)

# Tests
add_executable(assessment_tests
    test/AssessmentManagerTest.cpp
    test/GradeManagerTest.cpp
    test/BiometricProcessorTest.cpp
)

target_link_libraries(assessment_tests
    PRIVATE
    aptp_assessment
    GTest::GTest
    GTest::Main
)

add_test(NAME assessment_tests COMMAND assessment_tests)

# backend/scheduler/CMakeLists.txt
add_library(aptp_scheduler
    src/SchedulerEngine.cpp
)

target_include_directories(aptp_scheduler
    PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_link_libraries(aptp_scheduler
    PUBLIC
    aptp_core
    nlohmann_json::nlohmann_json
)

# Tests
add_executable(scheduler_tests
    test/SchedulerEngineTest.cpp
)

target_link_libraries(scheduler_tests
    PRIVATE
    aptp_scheduler
    GTest::GTest
    GTest::Main
)

add_test(NAME scheduler_tests COMMAND scheduler_tests)

# backend/analytics/CMakeLists.txt
add_library(aptp_analytics
    src/AnalyticsEngine.cpp
)

target_include_directories(aptp_analytics
    PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_link_libraries(aptp_analytics
    PUBLIC
    aptp_core
    aptp_assessment
    nlohmann_json::nlohmann_json
)

# Tests
add_executable(analytics_tests
    test/AnalyticsEngineTest.cpp
)

target_link_libraries(analytics_tests
    PRIVATE
    aptp_analytics
    GTest::GTest
    GTest::Main
)

add_test(NAME analytics_tests COMMAND analytics_tests)

# backend/integration/CMakeLists.txt
add_library(aptp_integration
    src/SimulatorDataProcessor.cpp
)

target_include_directories(aptp_integration
    PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_link_libraries(aptp_integration
    PUBLIC
    aptp_core
    nlohmann_json::nlohmann_json
)

# Tests
add_executable(integration_tests
    test/SimulatorDataProcessorTest.cpp
)

target_link_libraries(integration_tests
    PRIVATE
    aptp_integration
    GTest::GTest
    GTest::Main
)

add_test(NAME integration_tests COMMAND integration_tests)

# backend/security/CMakeLists.txt
add_library(aptp_security
    src/SecurityManager.cpp
)

target_include_directories(aptp_security
    PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_link_libraries(aptp_security
    PUBLIC
    aptp_core
    OpenSSL::SSL
    OpenSSL::Crypto
    nlohmann_json::nlohmann_json
)

# Tests
add_executable(security_tests
    test/SecurityManagerTest.cpp
)

target_link_libraries(security_tests
    PRIVATE
    aptp_security
    GTest::GTest
    GTest::Main
)

add_test(NAME security_tests COMMAND security_tests)

# backend/compliance/CMakeLists.txt
add_library(aptp_compliance
    src/ComplianceManager.cpp
)

target_include_directories(aptp_compliance
    PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_link_libraries(aptp_compliance
    PUBLIC
    aptp_core
    aptp_security
    nlohmann_json::nlohmann_json
)

# Tests
add_executable(compliance_tests
    test/ComplianceManagerTest.cpp
)

target_link_libraries(compliance_tests
    PRIVATE
    aptp_compliance
    GTest::GTest
    GTest::Main
)

add_test(NAME compliance_tests COMMAND compliance_tests)

# backend/api/CMakeLists.txt
add_library(aptp_api
    src/ApiGateway.cpp
    src/controllers/DocumentController.cpp
    src/controllers/SyllabusController.cpp
    src/controllers/AssessmentController.cpp
    src/controllers/UserController.cpp
    src/middleware/JwtMiddleware.cpp
)

target_include_directories(aptp_api
    PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
    PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

target_link_libraries(aptp_api
    PUBLIC
    aptp_core
    aptp_document
    aptp_syllabus
    aptp_assessment
    aptp_user-management
    aptp_scheduler
    aptp_analytics
    aptp_compliance
    aptp_security
    Drogon::Drogon
    nlohmann_json::nlohmann_json
)

# Tests
add_executable(api_tests
    test/ApiGatewayTest.cpp
    test/controllers/DocumentControllerTest.cpp
    test/controllers/SyllabusControllerTest.cpp
    test/controllers/AssessmentControllerTest.cpp
    test/controllers/UserControllerTest.cpp
    test/middleware/JwtMiddlewareTest.cpp
)

target_link_libraries(api_tests
    PRIVATE
    aptp_api
    GTest::GTest
    GTest::Main
)

add_test(NAME api_tests COMMAND api_tests)

# backend/main.cpp
#include <drogon/drogon.h>
#include "core/include/ConfigurationManager.h"
#include "core/include/Logger.h"
#include "api/include/ApiGateway.h"

int main() {
    try {
        // Initialize logger
        APTP::Core::Logger::getInstance().info("Starting Advanced Pilot Training Platform");
        
        // Load configuration
        auto& config = APTP::Core::ConfigurationManager::getInstance();
        config.loadFromEnvironment();
        config.loadFromFile("config/aptp.json");
        
        // Initialize API gateway
        APTP::API::ApiConfig apiConfig;
        apiConfig.host = config.getOrDefault<std::string>("api_host", "0.0.0.0");
        apiConfig.port = config.getOrDefault<uint16_t>("api_port", 8080);
        apiConfig.threadNum = config.getOrDefault<uint32_t>("api_thread_num", 16);
        apiConfig.jwtSecret = config.getOrDefault<std::string>("jwt_secret", "");
        apiConfig.enableSSL = config.getOrDefault<bool>("api_enable_ssl", false);
        apiConfig.sslCertPath = config.getOrDefault<std::string>("api_ssl_cert", "");
        apiConfig.sslKeyPath = config.getOrDefault<std::string>("api_ssl_key", "");
        
        APTP::API::ApiGateway::getInstance().initialize(apiConfig);
        
        // Start API server
        APTP::API::ApiGateway::getInstance().start();
        
        // Keep the main thread running (Drogon runs in separate threads)
        APTP::Core::Logger::getInstance().info("Server started successfully");
        
        // Wait for signal to exit
        drogon::app().waitForShutdown();
        
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "Error starting server: " << e.what() << std::endl;
        return 1;
    }
}
