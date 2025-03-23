#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include "records/record_service.h"
#include <memory>
#include <chrono>

using namespace etr::records;
using namespace testing;

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

class RecordServiceTest : public Test {
protected:
    void SetUp() override {
        // Create mock repository
        mock_repository_ = std::make_shared<MockRecordRepository>();
        
        // Create service with mock repository
        record_service_ = std::make_unique<RecordService>(mock_repository_);
    }
    
    // Helper to create a valid record for testing
    TrainingRecord createValidRecord() {
        TrainingRecord record("test-record-id");
        record.setTraineeId("test-trainee");
        record.setInstructorId("test-instructor");
        record.setRecordType(RecordType::TRAINING_SESSION);
        record.setCourseId("test-course");
        record.setSyllabusId("test-syllabus");
        record.setExerciseId("test-exercise");
        record.setDate(std::chrono::system_clock::now());
        record.setDurationMinutes(60);
        record.setLocation("Test Location");
        
        GradeItem grade;
        grade.criteria_id = "test-criteria";
        grade.criteria_name = "Test Criteria";
        grade.grade = 3;
        grade.comments = "Good performance";
        record.addGrade(grade);
        
        record.setComments("Test comments");
        record.setDraft(true);
        
        return record;
    }
    
    std::shared_ptr<MockRecordRepository> mock_repository_;
    std::unique_ptr<RecordService> record_service_;
};

TEST_F(RecordServiceTest, CreateRecordSuccess) {
    // Setup expectations
    auto record = createValidRecord();
    EXPECT_CALL(*mock_repository_, createRecord(AllOf(
        Field(&TrainingRecord::getTraineeId, "test-trainee"),
        Field(&TrainingRecord::getInstructorId, "test-instructor"),
        Field(&TrainingRecord::getRecordType, RecordType::TRAINING_SESSION)
    ))).WillOnce(Return("test-record-id"));
    
    // Call service method
    std::string result = record_service_->createRecord(record);
    
    // Verify result
    EXPECT_EQ(result, "test-record-id");
}

TEST_F(RecordServiceTest, CreateRecordInvalid) {
    // Create invalid record (missing required fields)
    TrainingRecord record;
    
    // Call service method
    std::string result = record_service_->createRecord(record);
    
    // Verify result
    EXPECT_TRUE(result.empty());
}

TEST_F(RecordServiceTest, GetRecordSuccess) {
    // Setup expectations
    auto record = createValidRecord();
    EXPECT_CALL(*mock_repository_, getRecord("test-record-id"))
        .WillOnce(Return(record));
    
    // Call service method
    auto result = record_service_->getRecord("test-record-id");
    
    // Verify result
    ASSERT_TRUE(result.has_value());
    EXPECT_EQ(result->getRecordId(), "test-record-id");
    EXPECT_EQ(result->getTraineeId(), "test-trainee");
}

TEST_F(RecordServiceTest, GetRecordNotFound) {
    // Setup expectations
    EXPECT_CALL(*mock_repository_, getRecord("nonexistent-id"))
        .WillOnce(Return(std::nullopt));
    
    // Call service method
    auto result = record_service_->getRecord("nonexistent-id");
    
    // Verify result
    EXPECT_FALSE(result.has_value());
}

TEST_F(RecordServiceTest, UpdateRecordSuccess) {
    // Setup expectations
    auto record = createValidRecord();
    EXPECT_CALL(*mock_repository_, getRecord("test-record-id"))
        .WillOnce(Return(record));
    EXPECT_CALL(*mock_repository_, updateRecord(_))
        .WillOnce(Return(true));
    
    // Update record
    record.setComments("Updated comments");
    
    // Call service method
    bool result = record_service_->updateRecord(record);
    
    // Verify result
    EXPECT_TRUE(result);
}

TEST_F(RecordServiceTest, UpdateRecordInvalid) {
    // Create invalid record (missing required fields)
    TrainingRecord record("test-record-id");
    
    // Call service method
    bool result = record_service_->updateRecord(record);
    
    // Verify result
    EXPECT_FALSE(result);
}

TEST_F(RecordServiceTest, UpdateRecordNotFound) {
    // Setup expectations
    auto record = createValidRecord();
    EXPECT_CALL(*mock_repository_, getRecord("test-record-id"))
        .WillOnce(Return(std::nullopt));
    
    // Call service method
    bool result = record_service_->updateRecord(record);
    
    // Verify result
    EXPECT_FALSE(result);
}

TEST_F(RecordServiceTest, DeleteRecordSuccess) {
    // Setup expectations
    auto record = createValidRecord();
    EXPECT_CALL(*mock_repository_, getRecord("test-record-id"))
        .WillOnce(Return(record));
    EXPECT_CALL(*mock_repository_, deleteRecord("test-record-id"))
        .WillOnce(Return(true));
    
    // Call service method
    bool result = record_service_->deleteRecord("test-record-id");
    
    // Verify result
    EXPECT_TRUE(result);
}

TEST_F(RecordServiceTest, DeleteRecordNotFound) {
    // Setup expectations
    EXPECT_CALL(*mock_repository_, getRecord("nonexistent-id"))
        .WillOnce(Return(std::nullopt));
    
    // Call service method
    bool result = record_service_->deleteRecord("nonexistent-id");
    
    // Verify result
    EXPECT_FALSE(result);
}

TEST_F(RecordServiceTest, ListRecordsSuccess) {
    // Setup expectations
    std::vector<TrainingRecord> records = {
        createValidRecord(),
        createValidRecord()
    };
    records[1].setRecordId("test-record-id-2");
    
    EXPECT_CALL(*mock_repository_, listRecords(
        Optional(std::string("test-trainee")),
        Eq(std::nullopt),
        Eq(std::nullopt),
        Eq(std::nullopt),
        Eq(std::nullopt),
        _, _,
        1, 10, "date", false
    )).WillOnce(Return(std::make_pair(records, 2)));
    
    // Call service method
    auto [result_records, count] = record_service_->listRecords(
        "test-trainee",
        std::nullopt,
        std::nullopt,
        std::nullopt,
        std::nullopt,
        std::nullopt,
        std::nullopt,
        1,
        10,
        "date",
        false
    );
    
    // Verify result
    EXPECT_EQ(result_records.size(), 2);
    EXPECT_EQ(count, 2);
}

TEST_F(RecordServiceTest, GetAuditLogsSuccess) {
    // Setup expectations
    std::vector<nlohmann::json> logs = {
        {{"action", "create"}, {"user_id", "test-user"}},
        {{"action", "update"}, {"user_id", "test-user"}}
    };
    
    EXPECT_CALL(*mock_repository_, getAuditLogs("test-record-id"))
        .WillOnce(Return(logs));
    
    // Call service method
    auto result = record_service_->getAuditLogs("test-record-id");
    
    // Verify result
    EXPECT_EQ(result.size(), 2);
}

int main(int argc, char** argv) {
    ::testing::InitGoogleTest(&argc, argv);
    return RUN_ALL_TESTS();
}