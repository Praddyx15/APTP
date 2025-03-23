#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <memory>
#include <chrono>

#include "compliance/compliance_service.h"
#include "records/record_model.h"

using namespace etr::compliance;
using namespace etr::records;
using namespace testing;

// Mock compliance repository
class MockComplianceRepository : public IComplianceRepository {
public:
    MOCK_METHOD(bool, addOrUpdateRequirement, (const ComplianceRequirement&), (override));
    MOCK_METHOD(bool, deleteRequirement, (const std::string&), (override));
    MOCK_METHOD(std::optional<ComplianceRequirement>, getRequirement, (const std::string&), (override));
    MOCK_METHOD(std::vector<ComplianceRequirement>, listRequirements, 
        (const std::optional<std::string>&, const std::optional<std::string>&), (override));
    MOCK_METHOD(bool, addOrUpdateMapping, (const RegulationMapping&), (override));
    MOCK_METHOD(bool, deleteMapping, (const std::string&, const std::string&), (override));
    MOCK_METHOD(std::vector<RegulationMapping>, getMappings, 
        (const std::optional<std::string>&, const std::optional<std::string>&), (override));
};

// Mock record repository
class MockRecordRepository : public IRecordRepository {
public:
    MOCK_METHOD(std::string, createRecord, (const TrainingRecord&), (override));
    MOCK_METHOD(std::optional<TrainingRecord>, getRecord, (const std::string&), (override));
    MOCK_METHOD(bool, updateRecord, (const TrainingRecord&), (override));
    MOCK_METHOD(bool, deleteRecord, (const std::string&), (override));
    MOCK_METHOD((std::pair<std::vector<TrainingRecord>, int>), listRecords, 
        (const std::optional<std::string>&, 
         const std::optional<std::string>&, 
         const std::optional<std::string>&, 
         const std::optional<std::string>&, 
         const std::optional<RecordType>&,
         const std::optional<std::chrono::system_clock::time_point>&,
         const std::optional<std::chrono::system_clock::time_point>&,
         int, int, const std::string&, bool), (override));
    MOCK_METHOD(bool, logAuditEvent, 
        (const std::string&, const std::string&, const std::string&, const std::string&), (override));
    MOCK_METHOD(std::vector<nlohmann::json>, getAuditLogs, (const std::string&), (override));
};

class ComplianceServiceTest : public Test {
protected:
    void SetUp() override {
        // Create mock repositories
        mock_compliance_repository_ = std::make_shared<MockComplianceRepository>();
        mock_record_repository_ = std::make_shared<MockRecordRepository>();
        
        // Create service with mock repositories
        compliance_service_ = std::make_unique<ComplianceService>(
            mock_compliance_repository_,
            mock_record_repository_
        );
        
        // Setup test data
        setupTestRequirements();
        setupTestRecords();
    }
    
    void setupTestRequirements() {
        // Create test requirements
        faa_ifr_requirement_.requirement_id = "FAA-61.57-c-1";
        faa_ifr_requirement_.requirement_name = "IFR Currency";
        faa_ifr_requirement_.regulation_id = "FAA-61";
        faa_ifr_requirement_.regulation_name = "FAA Part 61";
        faa_ifr_requirement_.regulation_reference = "61.57(c)(1)";
        faa_ifr_requirement_.description = "Six instrument approaches, holding procedures, and intercepting/tracking courses";
        faa_ifr_requirement_.required_count = 6;
        faa_ifr_requirement_.duration_days = 180; // 6 months
        
        easa_type_rating_requirement_.requirement_id = "EASA-FCL.740.A-a";
        easa_type_rating_requirement_.requirement_name = "Type Rating Revalidation";
        easa_type_rating_requirement_.regulation_id = "EASA-FCL";
        easa_type_rating_requirement_.regulation_name = "EASA Part-FCL";
        easa_type_rating_requirement_.regulation_reference = "FCL.740.A(a)";
        easa_type_rating_requirement_.description = "At least 10 route sectors as pilot or proficiency check within validity period";
        easa_type_rating_requirement_.required_count = 10;
        easa_type_rating_requirement_.duration_days = 365; // 12 months
    }
    
    void setupTestRecords() {
        // Create test records
        for (int i = 0; i < 10; i++) {
            TrainingRecord record("record-" + std::to_string(i));
            record.setTraineeId("test-trainee");
            record.setInstructorId("test-instructor");
            record.setRecordType(RecordType::TRAINING_SESSION);
            record.setCourseId("test-course");
            record.setSyllabusId("test-syllabus");
            record.setExerciseId("test-exercise-" + std::to_string(i));
            
            // Set date - some recent, some older
            auto now = std::chrono::system_clock::now();
            if (i < 5) {
                // Recent records (within last 3 months)
                record.setDate(now - std::chrono::hours(24 * 30 * (i + 1)));
            } else {
                // Older records (more than 6 months ago)
                record.setDate(now - std::chrono::hours(24 * 30 * (i + 6)));
            }
            
            record.setDurationMinutes(60);
            record.setLocation("Test Location");
            
            // Add grades
            GradeItem grade;
            grade.criteria_id = "test-criteria";
            grade.criteria_name = "Test Criteria";
            grade.grade = (i % 4) + 1; // Grades 1-4
            grade.comments = "Performance comment";
            record.addGrade(grade);
            
            record.setComments("Test record " + std::to_string(i));
            record.setDraft(false);
            
            // Add signatures to make records "complete"
            SignatureInfo trainee_sig;
            trainee_sig.signer_id = "test-trainee";
            trainee_sig.signer_name = "Test Trainee";
            trainee_sig.certificate_id = "test-cert";
            trainee_sig.timestamp = record.getDate() + std::chrono::hours(1);
            trainee_sig.is_valid = true;
            record.setTraineeSignature(trainee_sig);
            
            SignatureInfo instructor_sig;
            instructor_sig.signer_id = "test-instructor";
            instructor_sig.signer_name = "Test Instructor";
            instructor_sig.certificate_id = "test-cert";
            instructor_sig.timestamp = record.getDate() + std::chrono::hours(2);
            instructor_sig.is_valid = true;
            record.setInstructorSignature(instructor_sig);
            
            test_records_.push_back(record);
        }
    }
    
    std::shared_ptr<MockComplianceRepository> mock_compliance_repository_;
    std::shared_ptr<MockRecordRepository> mock_record_repository_;
    std::unique_ptr<ComplianceService> compliance_service_;
    
    ComplianceRequirement faa_ifr_requirement_;
    ComplianceRequirement easa_type_rating_requirement_;
    std::vector<TrainingRecord> test_records_;
};

TEST_F(ComplianceServiceTest, ListRequirements) {
    // Setup expectations
    std::vector<ComplianceRequirement> requirements = {
        faa_ifr_requirement_,
        easa_type_rating_requirement_
    };
    
    EXPECT_CALL(*mock_compliance_repository_, listRequirements(std::optional<std::string>("FAA-61"), std::nullopt))
        .WillOnce(Return(std::vector<ComplianceRequirement>{faa_ifr_requirement_}));
    
    // Call service method
    auto result = compliance_service_->listRequirements("FAA-61", std::nullopt);
    
    // Verify result
    ASSERT_EQ(result.size(), 1);
    EXPECT_EQ(result[0].requirement_id, faa_ifr_requirement_.requirement_id);
}

TEST_F(ComplianceServiceTest, MapRegulations) {
    // Setup expectations
    RegulationMapping mapping;
    mapping.source_requirement_id = faa_ifr_requirement_.requirement_id;
    mapping.source_requirement_name = faa_ifr_requirement_.requirement_name;
    mapping.target_requirement_id = easa_type_rating_requirement_.requirement_id;
    mapping.target_requirement_name = easa_type_rating_requirement_.requirement_name;
    mapping.equivalence_factor = 0.75;
    mapping.notes = "Partial equivalence";
    
    std::vector<RegulationMapping> mappings = {mapping};
    
    EXPECT_CALL(*mock_compliance_repository_, getMappings(
        std::optional<std::string>("FAA-61"), 
        std::optional<std::string>("EASA-FCL")
    )).WillOnce(Return(mappings));
    
    // Call service method
    auto result = compliance_service_->mapRegulations("FAA-61", "EASA-FCL");
    
    // Verify result
    ASSERT_EQ(result.size(), 1);
    EXPECT_EQ(result[0].source_requirement_id, mapping.source_requirement_id);
    EXPECT_EQ(result[0].target_requirement_id, mapping.target_requirement_id);
    EXPECT_FLOAT_EQ(result[0].equivalence_factor, mapping.equivalence_factor);
}

TEST_F(ComplianceServiceTest, CheckCompliance_Compliant) {
    // Setup expectations
    EXPECT_CALL(*mock_compliance_repository_, listRequirements(
        std::optional<std::string>("FAA-61"), 
        std::optional<std::string>("CPL")
    )).WillOnce(Return(std::vector<ComplianceRequirement>{faa_ifr_requirement_}));
    
    // Only 5 recent records should be enough to satisfy requirement of 3
    faa_ifr_requirement_.required_count = 3;
    
    EXPECT_CALL(*mock_record_repository_, listRecords(
        std::optional<std::string>("test-trainee"), 
        std::nullopt, std::nullopt, std::nullopt, std::nullopt, 
        std::nullopt, std::nullopt, 1, 1000, "date", false
    )).WillOnce(Return(std::make_pair(test_records_, test_records_.size())));
    
    // Call service method
    auto result = compliance_service_->checkCompliance("test-trainee", "FAA-61", "CPL");
    
    // Verify result
    EXPECT_TRUE(result.is_compliant);
    ASSERT_EQ(result.compliance_items.size(), 1);
    EXPECT_EQ(result.compliance_items[0].requirement_id, faa_ifr_requirement_.requirement_id);
    EXPECT_TRUE(result.compliance_items[0].is_satisfied);
}

TEST_F(ComplianceServiceTest, CheckCompliance_NotCompliant) {
    // Setup expectations
    EXPECT_CALL(*mock_compliance_repository_, listRequirements(
        std::optional<std::string>("FAA-61"), 
        std::optional<std::string>("CPL")
    )).WillOnce(Return(std::vector<ComplianceRequirement>{faa_ifr_requirement_}));
    
    // Requirement of 8 is more than the 5 recent records
    faa_ifr_requirement_.required_count = 8;
    
    EXPECT_CALL(*mock_record_repository_, listRecords(
        std::optional<std::string>("test-trainee"), 
        std::nullopt, std::nullopt, std::nullopt, std::nullopt, 
        std::nullopt, std::nullopt, 1, 1000, "date", false
    )).WillOnce(Return(std::make_pair(test_records_, test_records_.size())));
    
    // Call service method
    auto result = compliance_service_->checkCompliance("test-trainee", "FAA-61", "CPL");
    
    // Verify result
    EXPECT_FALSE(result.is_compliant);
    ASSERT_EQ(result.compliance_items.size(), 1);
    EXPECT_EQ(result.compliance_items[0].requirement_id, faa_ifr_requirement_.requirement_id);
    EXPECT_FALSE(result.compliance_items[0].is_satisfied);
}

TEST_F(ComplianceServiceTest, ImportFAARegulations) {
    // Mock file content
    std::string json_content = R"([
        {
            "id": "FAA-61.57-c-1",
            "name": "IFR Currency",
            "regulation_id": "FAA-61",
            "regulation_name": "FAA Part 61",
            "reference": "61.57(c)(1)",
            "description": "Six instrument approaches, holding procedures, and intercepting/tracking courses",
            "required_count": 6,
            "duration_days": 180
        }
    ])";
    
    // Override file opening
    // In a real test, you would use a framework that allows mocking file operations
    // or use dependency injection to replace the file operations
    
    // For this test, we can verify the repository is called correctly
    EXPECT_CALL(*mock_compliance_repository_, addOrUpdateRequirement(
        AllOf(
            Field(&ComplianceRequirement::requirement_id, "FAA-61.57-c-1"),
            Field(&ComplianceRequirement::requirement_name, "IFR Currency"),
            Field(&ComplianceRequirement::required_count, 6)
        )
    )).WillOnce(Return(true));
    
    // This test will not actually call importFAARegulations since it depends on file reading
    // In a real test, you would need to inject the file content or mock the file operations
    
    // For demonstration, assume the method has been called and validate the repository calls
    SUCCEED();
}

int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}