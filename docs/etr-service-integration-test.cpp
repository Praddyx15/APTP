#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <memory>
#include <chrono>
#include <thread>

#include "records/record_service.h"
#include "records/record_repository.h"
#include "signature/digital_signature.h"
#include "compliance/compliance_service.h"
#include "compliance/compliance_repository.h"
#include "syllabus/syllabus_service.h"
#include "syllabus/syllabus_repository.h"
#include "persistence/database_connection.h"
#include "service/etr_service_impl.h"

using namespace etr;
using namespace testing;

// Mock database connection to avoid actual database operations
class MockDatabaseConnection : public persistence::DatabaseConnection {
public:
    MockDatabaseConnection() 
        : persistence::DatabaseConnection("localhost", 5432, "test_db", "test_user", "test_password") {}
    
    MOCK_METHOD(bool, connect, (), (override));
    MOCK_METHOD(void, disconnect, (), (override));
    MOCK_METHOD(bool, isConnected, (), (const, override));
    MOCK_METHOD(persistence::PgResult, executeQuery, 
                (const std::string&, const std::vector<persistence::PgParam>&), (override));
    MOCK_METHOD(nlohmann::json, queryFirstRowAsJson, 
                (const std::string&, const std::vector<persistence::PgParam>&), (override));
    MOCK_METHOD(nlohmann::json, queryAllRowsAsJson, 
                (const std::string&, const std::vector<persistence::PgParam>&), (override));
    MOCK_METHOD(bool, beginTransaction, (), (override));
    MOCK_METHOD(bool, commitTransaction, (), (override));
    MOCK_METHOD(bool, rollbackTransaction, (), (override));
    MOCK_METHOD(bool, inTransaction, (), (const, override));
    MOCK_METHOD(std::string, escapeString, (const std::string&), (const, override));
    MOCK_METHOD(std::string, escapeIdentifier, (const std::string&), (const, override));
    MOCK_METHOD(std::string, getLastError, (), (const, override));
    MOCK_METHOD(std::string, getConnectionInfo, (), (const, override));
};

// Fixture for integration tests
class ETRServiceIntegrationTest : public Test {
protected:
    void SetUp() override {
        // Create mock database connection
        db_connection_ = std::make_shared<MockDatabaseConnection>();
        EXPECT_CALL(*db_connection_, connect()).WillRepeatedly(Return(true));
        EXPECT_CALL(*db_connection_, isConnected()).WillRepeatedly(Return(true));
        
        // Create repositories with mock connection
        record_repository_ = std::make_shared<records::RecordRepository>(db_connection_);
        compliance_repository_ = std::make_shared<compliance::ComplianceRepository>(db_connection_);
        syllabus_repository_ = std::make_shared<syllabus::SyllabusRepository>(db_connection_);
        
        // Create services
        record_service_ = std::make_shared<records::RecordService>(record_repository_);
        signature_service_ = std::make_shared<signature::X509DigitalSignatureService>();
        compliance_service_ = std::make_shared<compliance::ComplianceService>(
            compliance_repository_, record_repository_);
        syllabus_service_ = std::make_shared<syllabus::SyllabusService>(
            syllabus_repository_, signature_service_);
        
        // Create gRPC service implementation
        etr_service_ = std::make_unique<service::ETRServiceImpl>(
            record_service_, signature_service_, compliance_service_, syllabus_service_);
        
        // Setup common test data
        setupTestData();
    }
    
    void setupTestData() {
        // Create test record
        test_record_ = createTestRecord();
        
        // Create test syllabus
        test_syllabus_ = createTestSyllabus();
        
        // Set up mock repository responses
        setupMockRepositoryResponses();
    }
    
    records::TrainingRecord createTestRecord() {
        records::TrainingRecord record("test-record-id");
        record.setTraineeId("test-trainee");
        record.setInstructorId("test-instructor");
        record.setRecordType(records::RecordType::TRAINING_SESSION);
        record.setCourseId("test-course");
        record.setSyllabusId("test-syllabus");
        record.setExerciseId("test-exercise");
        record.setDate(std::chrono::system_clock::now());
        record.setDurationMinutes(60);
        record.setLocation("Test Location");
        
        records::GradeItem grade;
        grade.criteria_id = "test-criteria";
        grade.criteria_name = "Test Criteria";
        grade.grade = 3;
        grade.comments = "Good performance";
        record.addGrade(grade);
        
        record.setComments("Test comments");
        record.setDraft(true);
        
        return record;
    }
    
    syllabus::Syllabus createTestSyllabus() {
        syllabus::Syllabus syllabus("test-syllabus-id");
        syllabus.setCourseId("test-course");
        syllabus.setTitle("Test Syllabus");
        syllabus.setDescription("Test Description");
        syllabus.setVersion("1.0");
        syllabus.setEffectiveDate(std::chrono::system_clock::now());
        syllabus.setStatus(syllabus::SyllabusStatus::APPROVED);
        syllabus.setAuthorId("test-author");
        
        // Add a section
        syllabus::SyllabusSection section;
        section.section_id = "test-section";
        section.title = "Test Section";
        section.description = "Test Section Description";
        section.order = 1;
        
        // Add an exercise to the section
        syllabus::SyllabusExercise exercise;
        exercise.exercise_id = "test-exercise";
        exercise.title = "Test Exercise";
        exercise.description = "Test Exercise Description";
        exercise.order = 1;
        exercise.duration_minutes = 60;
        exercise.exercise_type = "SIMULATOR";
        exercise.objectives.push_back("Test Objective 1");
        exercise.objectives.push_back("Test Objective 2");
        
        // Add grading criteria to the exercise
        syllabus::GradingCriteria criteria;
        criteria.criteria_id = "test-criteria";
        criteria.name = "Test Criteria";
        criteria.description = "Test Criteria Description";
        criteria.is_required = true;
        
        // Add grade definitions to the criteria
        syllabus::GradeDefinition grade1;
        grade1.grade = 1;
        grade1.description = "Unsatisfactory";
        grade1.is_passing = false;
        criteria.grade_definitions.push_back(grade1);
        
        syllabus::GradeDefinition grade2;
        grade2.grade = 2;
        grade2.description = "Needs Improvement";
        grade2.is_passing = true;
        criteria.grade_definitions.push_back(grade2);
        
        syllabus::GradeDefinition grade3;
        grade3.grade = 3;
        grade3.description = "Meets Standards";
        grade3.is_passing = true;
        criteria.grade_definitions.push_back(grade3);
        
        syllabus::GradeDefinition grade4;
        grade4.grade = 4;
        grade4.description = "Exceeds Standards";
        grade4.is_passing = true;
        criteria.grade_definitions.push_back(grade4);
        
        exercise.grading_criteria.push_back(criteria);
        
        section.exercises.push_back(exercise);
        
        syllabus.addSection(section);
        
        return syllabus;
    }
    
    void setupMockRepositoryResponses() {
        // Setup record repository responses
        ON_CALL(*db_connection_, executeQuery(_, _))
            .WillByDefault(Return(persistence::PgResult(nullptr)));
        
        ON_CALL(*db_connection_, queryFirstRowAsJson(_, _))
            .WillByDefault(Return(nlohmann::json::object()));
        
        ON_CALL(*db_connection_, queryAllRowsAsJson(_, _))
            .WillByDefault(Return(nlohmann::json::array()));
        
        // Add specific mock responses as needed for tests
    }
    
    // Helper methods for tests
    etr::TrainingRecord convertToProtoRecord(const records::TrainingRecord& record) {
        etr::TrainingRecord proto_record;
        
        proto_record.set_record_id(record.getRecordId());
        proto_record.set_trainee_id(record.getTraineeId());
        proto_record.set_instructor_id(record.getInstructorId());
        proto_record.set_record_type(static_cast<etr::RecordType>(
            static_cast<int>(record.getRecordType()) + 1
        ));
        proto_record.set_course_id(record.getCourseId());
        proto_record.set_syllabus_id(record.getSyllabusId());
        proto_record.set_exercise_id(record.getExerciseId());
        
        proto_record.set_date(
            std::chrono::duration_cast<std::chrono::milliseconds>(
                record.getDate().time_since_epoch()
            ).count()
        );
        
        proto_record.set_duration_minutes(record.getDurationMinutes());
        proto_record.set_location(record.getLocation());
        proto_record.set_aircraft_type(record.getAircraftType());
        
        // Add grades
        for (const auto& grade : record.getGrades()) {
            auto* proto_grade = proto_record.add_grades();
            proto_grade->set_criteria_id(grade.criteria_id);
            proto_grade->set_criteria_name(grade.criteria_name);
            proto_grade->set_grade(grade.grade);
            proto_grade->set_comments(grade.comments);
        }
        
        // Add attachments
        for (const auto& attachment : record.getAttachments()) {
            proto_record.add_attachments(attachment);
        }
        
        proto_record.set_comments(record.getComments());
        proto_record.set_is_draft(record.isDraft());
        
        return proto_record;
    }
    
    // Member variables
    std::shared_ptr<MockDatabaseConnection> db_connection_;
    std::shared_ptr<records::RecordRepository> record_repository_;
    std::shared_ptr<compliance::ComplianceRepository> compliance_repository_;
    std::shared_ptr<syllabus::SyllabusRepository> syllabus_repository_;
    
    std::shared_ptr<records::RecordService> record_service_;
    std::shared_ptr<signature::X509DigitalSignatureService> signature_service_;
    std::shared_ptr<compliance::ComplianceService> compliance_service_;
    std::shared_ptr<syllabus::SyllabusService> syllabus_service_;
    
    std::unique_ptr<service::ETRServiceImpl> etr_service_;
    
    records::TrainingRecord test_record_;
    syllabus::Syllabus test_syllabus_;
};

// Test Cases

TEST_F(ETRServiceIntegrationTest, CreateTrainingRecordFlow) {
    // Setup mock for createRecord
    auto pgResult = persistence::PgResult(nullptr); // Mock empty result
    EXPECT_CALL(*db_connection_, executeQuery(
        HasSubstr("INSERT INTO etr.training_records"), _))
        .WillOnce(Return(pgResult));
    
    // Convert internal record to proto
    etr::TrainingRecord proto_record = convertToProtoRecord(test_record_);
    
    // Setup context and response
    grpc::ServerContext context;
    etr::RecordResponse response;
    
    // Add authentication metadata
    context.AddMetadata("authorization", "Bearer test_token");
    
    // Call the service method
    auto status = etr_service_->CreateTrainingRecord(&context, &proto_record, &response);
    
    // Verify the result
    EXPECT_TRUE(status.ok()) << status.error_message();
    EXPECT_TRUE(response.success());
    EXPECT_FALSE(response.record_id().empty());
}

TEST_F(ETRServiceIntegrationTest, GetTrainingRecordFlow) {
    // Setup mock for getRecord
    nlohmann::json record_json = test_record_.toJson();
    EXPECT_CALL(*db_connection_, queryFirstRowAsJson(
        HasSubstr("SELECT * FROM etr.training_records"), _))
        .WillOnce(Return(record_json));
    
    // Setup context and request/response
    grpc::ServerContext context;
    etr::RecordRequest request;
    etr::TrainingRecord response;
    
    // Add authentication metadata
    context.AddMetadata("authorization", "Bearer test_token");
    
    // Set request parameters
    request.set_record_id("test-record-id");
    
    // Call the service method
    auto status = etr_service_->GetTrainingRecord(&context, &request, &response);
    
    // Verify the result
    EXPECT_TRUE(status.ok()) << status.error_message();
    EXPECT_EQ(response.record_id(), "test-record-id");
    EXPECT_EQ(response.trainee_id(), "test-trainee");
    EXPECT_EQ(response.instructor_id(), "test-instructor");
}

TEST_F(ETRServiceIntegrationTest, SignRecordFlow) {
    // Setup mock for getRecord and updateRecord
    nlohmann::json record_json = test_record_.toJson();
    EXPECT_CALL(*db_connection_, queryFirstRowAsJson(
        HasSubstr("SELECT * FROM etr.training_records"), _))
        .WillOnce(Return(record_json));
    
    auto pgResult = persistence::PgResult(nullptr); // Mock empty result
    EXPECT_CALL(*db_connection_, executeQuery(
        HasSubstr("UPDATE etr.training_records"), _))
        .WillOnce(Return(pgResult));
    
    // Setup context and request/response
    grpc::ServerContext context;
    etr::SignatureRequest request;
    etr::SignatureResponse response;
    
    // Add authentication metadata
    context.AddMetadata("authorization", "Bearer test_token");
    
    // Set request parameters
    request.set_record_id("test-record-id");
    request.set_signer_id("test-instructor");
    request.set_is_instructor(true);
    
    // Create dummy signature data
    std::vector<uint8_t> signature_data(32, 1); // 32 bytes of 1s
    request.set_signature_data(signature_data.data(), signature_data.size());
    
    // Create mock certificate data
    std::string cert_data = "-----BEGIN CERTIFICATE-----\n"
                           "MIIDvTCCAqWgAwIBAgIUJjw/8D5VHf9WihxF5AvZkbA1VBcwDQYJKoZIhvcNAQEL\n"
                           "BQAwbjELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAkNBMRYwFAYDVQQHDA1TYW4gRnJh\n"
                           "bmNpc2NvMRAwDgYDVQQKDAdUZXN0IE9yZzETMBEGA1UECwwKRW5naW5lZXJpbmcx\n"
                           "DzANBgNVBAMMBnRlc3RDQTAeFw0yMDAzMDEwMDAwMDBaFw0zMDAzMDEwMDAwMDBa\n"
                           "MG4xCzAJBgNVBAYTAlVTMQswCQYDVQQIDAJDQTEWMBQGA1UEBwwNU2FuIEZyYW5j\n"
                           "aXNjbzEQMA4GA1UECgwHVGVzdCBPcmcxEzARBgNVBAsMCkVuZ2luZWVyaW5nMQ8w\n"
                           "DQYDVQQDDAZpeG90ZXN0MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA\n"
                           "y8kvL7wJjCqj4tnxLqSgAHjDNvPG7rSvYrQoiFnLZD0PnCN+9Mbz3qGQbZUYUhwJ\n"
                           "VVv7VxsZVFJUZY4zE6CxMcxJwbVc1xZOUBHLJTRWjDm7y5/YbfNLJkGXlS7WYgQ1\n"
                           "sCOl+B1nsQ5qpvWYM+di4Yp0WTuCfCBPy5DoWr2vElKdapOJir1NXMpnH1MZ6W1n\n"
                           "7DfZ+5McQuXJUkBnNKpKPD1V/Bxf2Mq7Q3xN+oETBuYI/fUQzsNvhlQj/AeS0LLj\n"
                           "nECkY7msYAzCMXkPpnEMfHbYeaiYgGGY0bKas3PQ6yFQQCqW+6iyo22Y8x7DWMBO\n"
                           "yOjMGwmNvRvE3L8jG2sldwIDAQABo1MwUTAdBgNVHQ4EFgQUdjvMJPrRsvsMk5Tr\n"
                           "1wzl7iQMvbowHwYDVR0jBBgwFoAUdjvMJPrRsvsMk5Tr1wzl7iQMvbowDwYDVR0T\n"
                           "AQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOCAQEAGR/9vbpCBaE16QhojmYH1kKd\n"
                           "rkziNl9k5TYTwJgptAMStCH93HEUihEwo9QzO/jSVGGJQ1I3bNJ+lUoiWNQiB9KP\n"
                           "kOKvYjG9GYuXDnKvKlkr+Pvo9iGUG8D5HHXcYRZzOE80TGMZpPwGEpOC1Y8pHZPT\n"
                           "GkNlCnDmVSIbBJzW/GBhP0KlMX+qMrm+KgFJWnzCPpviMdFCYw1gTQKYcQ1OHh2z\n"
                           "v9i+sRUJZVTgFPYOTGZlFXgUDQ9P9PW+Zv8d3dhmELmXwFsFySRvQJ4ZJGnIuxkJ\n"
                           "qE6Yg0sINl985SdjHkzKFYRqVGBBQBCNLNTd7dOdAp8B59H2nmOPwyZx9ABH4w==\n"
                           "-----END CERTIFICATE-----\n";
    request.set_certificate_data(cert_data);
    
    // Call the service method
    auto status = etr_service_->SignRecord(&context, &request, &response);
    
    // Verify the result - this should fail in integration test without a real certificate
    // but we're testing the flow, not the actual signature verification
    EXPECT_FALSE(status.ok());
}

TEST_F(ETRServiceIntegrationTest, CheckComplianceFlow) {
    // Setup mock for compliance check
    EXPECT_CALL(*db_connection_, queryAllRowsAsJson(
        HasSubstr("SELECT * FROM etr.compliance_requirements"), _))
        .WillOnce(Return(nlohmann::json::array({
            {
                {"requirement_id", "FAA-61.57-1"},
                {"requirement_name", "Recent Flight Experience"},
                {"regulation_id", "FAA-61"},
                {"regulation_name", "Pilot Certification"},
                {"regulation_reference", "61.57(a)"},
                {"description", "Recent takeoff and landing experience"},
                {"required_count", 3},
                {"duration_days", 90}
            }
        })));
    
    EXPECT_CALL(*db_connection_, queryAllRowsAsJson(
        HasSubstr("SELECT * FROM etr.training_records"), _))
        .WillOnce(Return(nlohmann::json::array({test_record_.toJson()})));
    
    // Setup context and request/response
    grpc::ServerContext context;
    etr::ComplianceRequest request;
    etr::ComplianceResponse response;
    
    // Add authentication metadata
    context.AddMetadata("authorization", "Bearer test_token");
    
    // Set request parameters
    request.set_trainee_id("test-trainee");
    request.set_regulation_id("FAA-61");
    request.set_certification_type("CPL");
    
    // Call the service method
    auto status = etr_service_->CheckCompliance(&context, &request, &response);
    
    // Verify the result
    EXPECT_TRUE(status.ok()) << status.error_message();
    EXPECT_FALSE(response.is_compliant()); // Not compliant with only one record
    EXPECT_GT(response.compliance_items_size(), 0);
}

// More tests for other service methods...

int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}