// src/backend/document/test/DocumentProcessorTest.cpp
#include <gtest/gtest.h>
#include <gmock/gmock.h>
#include <memory>
#include <filesystem>
#include <fstream>

#include "../DocumentProcessor.h"
#include "../../core/ConfigurationManager.h"
#include "../../core/Result.h"

using namespace PilotTraining;
using namespace PilotTraining::Document;
using namespace PilotTraining::Core;
using ::testing::Return;
using ::testing::_;

// Mock ConfigurationManager for testing
class MockConfigurationManager : public ConfigurationManager {
public:
    MOCK_METHOD(std::optional<std::string>, getString, (const std::string&), (const, override));
    MOCK_METHOD(std::optional<int>, getInt, (const std::string&), (const, override));
    MOCK_METHOD(std::optional<double>, getDouble, (const std::string&), (const, override));
    MOCK_METHOD(std::optional<bool>, getBool, (const std::string&), (const, override));
};

class DocumentProcessorTest : public ::testing::Test {
protected:
    void SetUp() override {
        _configManager = std::make_shared<MockConfigurationManager>();
        
        // Create test directory if it doesn't exist
        if (!std::filesystem::exists("test_files")) {
            std::filesystem::create_directory("test_files");
        }
        
        // Create a test PDF file
        _testPdfPath = "test_files/test_document.pdf";
        std::ofstream testFile(_testPdfPath);
        testFile << "%PDF-1.5\nTest PDF content\n%%EOF";
        testFile.close();
        
        // Create test metadata
        _metadata.id = "doc-001";
        _metadata.filename = "test_document.pdf";
        _metadata.contentType = "application/pdf";
        _metadata.organizationId = "org-001";
        _metadata.uploadedBy = "test-user";
        _metadata.createdAt = "2023-05-15T10:30:00Z";
        _metadata.updatedAt = "2023-05-15T10:30:00Z";
        _metadata.type = DocumentType::PDF;
        _metadata.fileSize = 100;
    }
    
    void TearDown() override {
        // Remove test file
        if (std::filesystem::exists(_testPdfPath)) {
            std::filesystem::remove(_testPdfPath);
        }
        
        // Remove test directory
        if (std::filesystem::exists("test_files")) {
            std::filesystem::remove("test_files");
        }
    }
    
    std::shared_ptr<MockConfigurationManager> _configManager;
    std::string _testPdfPath;
    DocumentMetadata _metadata;
};

TEST_F(DocumentProcessorTest, DetermineDocumentTypeFromExtension) {
    // Test PDF detection
    EXPECT_EQ(DocumentProcessorFactory::determineType("document.pdf"), DocumentType::PDF);
    EXPECT_EQ(DocumentProcessorFactory::determineType("document.PDF"), DocumentType::PDF);
    
    // Test DOCX detection
    EXPECT_EQ(DocumentProcessorFactory::determineType("document.docx"), DocumentType::DOCX);
    EXPECT_EQ(DocumentProcessorFactory::determineType("document.doc"), DocumentType::DOCX);
    
    // Test XLSX detection
    EXPECT_EQ(DocumentProcessorFactory::determineType("document.xlsx"), DocumentType::XLSX);
    EXPECT_EQ(DocumentProcessorFactory::determineType("document.xls"), DocumentType::XLSX);
    
    // Test HTML detection
    EXPECT_EQ(DocumentProcessorFactory::determineType("document.html"), DocumentType::HTML);
    EXPECT_EQ(DocumentProcessorFactory::determineType("document.htm"), DocumentType::HTML);
    
    // Test PPTX detection
    EXPECT_EQ(DocumentProcessorFactory::determineType("document.pptx"), DocumentType::PPTX);
    EXPECT_EQ(DocumentProcessorFactory::determineType("document.ppt"), DocumentType::PPTX);
    
    // Test unknown extension
    EXPECT_EQ(DocumentProcessorFactory::determineType("document.unknown"), DocumentType::UNKNOWN);
}

TEST_F(DocumentProcessorTest, CreateProcessorForDocumentType) {
    DocumentProcessorFactory factory(_configManager);
    
    // Test PDF processor creation
    auto pdfProcessor = factory.createProcessor(DocumentType::PDF);
    EXPECT_NE(pdfProcessor, nullptr);
    
    // Test DOCX processor creation
    auto docxProcessor = factory.createProcessor(DocumentType::DOCX);
    EXPECT_NE(docxProcessor, nullptr);
    
    // Test unknown type
    auto unknownProcessor = factory.createProcessor(DocumentType::UNKNOWN);
    EXPECT_EQ(unknownProcessor, nullptr);
}

TEST_F(DocumentProcessorTest, ProcessPDFDocument) {
    // Test processing a PDF document
    PDFDocumentProcessor processor(_configManager);
    
    bool progressCalled = false;
    float lastProgress = 0.0f;
    std::string lastStage;
    
    auto progressCallback = [&progressCalled, &lastProgress, &lastStage](float progress, const std::string& stage) {
        progressCalled = true;
        lastProgress = progress;
        lastStage = stage;
    };
    
    auto result = processor.processDocument(_testPdfPath, _metadata, progressCallback);
    
    // Verify result
    ASSERT_TRUE(result.isSuccess());
    EXPECT_EQ(result.getValue().documentId, _metadata.id);
    EXPECT_EQ(result.getValue().status, ProcessingStatus::COMPLETED);
    EXPECT_FALSE(result.getValue().content.rawText.empty());
    EXPECT_FALSE(result.getValue().summary.empty());
    
    // Verify progress callback was called
    EXPECT_TRUE(progressCalled);
    EXPECT_EQ(lastProgress, 1.0f);
    EXPECT_EQ(lastStage, "Processing completed");
}

TEST_F(DocumentProcessorTest, ProcessNonExistentDocument) {
    // Test processing a non-existent document
    PDFDocumentProcessor processor(_configManager);
    
    auto result = processor.processDocument("non_existent_file.pdf", _metadata, std::nullopt);
    
    // Verify result
    ASSERT_FALSE(result.isSuccess());
    EXPECT_EQ(result.getError().code, ErrorCode::FileNotFound);
}

TEST_F(DocumentProcessorTest, ProcessDocumentAsyncReturnsCorrectResult) {
    // Test asynchronous processing
    PDFDocumentProcessor processor(_configManager);
    
    auto futureResult = processor.processDocumentAsync(_testPdfPath, _metadata, std::nullopt);
    
    // Wait for result
    auto result = futureResult.get();
    
    // Verify result
    ASSERT_TRUE(result.isSuccess());
    EXPECT_EQ(result.getValue().documentId, _metadata.id);
    EXPECT_EQ(result.getValue().status, ProcessingStatus::COMPLETED);
}

TEST_F(DocumentProcessorTest, ProcessingPipelineHandlesDocumentCorrectly) {
    // Test the full processing pipeline
    DocumentProcessingPipeline pipeline(_configManager);
    
    auto result = pipeline.processDocument(_testPdfPath, _metadata, std::nullopt);
    
    // Verify result
    ASSERT_TRUE(result.isSuccess());
    EXPECT_EQ(result.getValue().documentId, _metadata.id);
    EXPECT_EQ(result.getValue().status, ProcessingStatus::COMPLETED);
}

TEST_F(DocumentProcessorTest, ProcessingPipelineHandlesBatchProcessing) {
    // Test batch processing
    DocumentProcessingPipeline pipeline(_configManager);
    
    // Create a second test file
    std::string testDocxPath = "test_files/test_document.docx";
    std::ofstream testFile(testDocxPath);
    testFile << "Test DOCX content";
    testFile.close();
    
    // Create second metadata
    DocumentMetadata metadata2 = _metadata;
    metadata2.id = "doc-002";
    metadata2.filename = "test_document.docx";
    metadata2.contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    metadata2.type = DocumentType::DOCX;
    
    // Process batch
    auto results = pipeline.processBatch(
        {_testPdfPath, testDocxPath},
        {_metadata, metadata2},
        std::nullopt
    );
    
    // Verify results
    ASSERT_EQ(results.size(), 2);
    ASSERT_TRUE(results[0].isSuccess());
    EXPECT_EQ(results[0].getValue().documentId, _metadata.id);
    ASSERT_TRUE(results[1].isSuccess());
    EXPECT_EQ(results[1].getValue().documentId, metadata2.id);
    
    // Cleanup
    if (std::filesystem::exists(testDocxPath)) {
        std::filesystem::remove(testDocxPath);
    }
}

TEST_F(DocumentProcessorTest, ProcessingPipelineHandlesInvalidBatchInput) {
    // Test batch processing with mismatched inputs
    DocumentProcessingPipeline pipeline(_configManager);
    
    // Process batch with mismatched lists
    auto results = pipeline.processBatch(
        {_testPdfPath},
        {_metadata, _metadata}, // Two metadata entries but only one path
        std::nullopt
    );
    
    // Verify error
    ASSERT_EQ(results.size(), 1);
    ASSERT_FALSE(results[0].isSuccess());
    EXPECT_EQ(results[0].getError().code, ErrorCode::InvalidInput);
}

// Test the AI-enhanced features
TEST_F(DocumentProcessorTest, GeneratesSummaryCorrectly) {
    PDFDocumentProcessor processor(_configManager);
    
    auto result = processor.processDocument(_testPdfPath, _metadata, std::nullopt);
    
    // Verify summary
    ASSERT_TRUE(result.isSuccess());
    EXPECT_FALSE(result.getValue().summary.empty());
}

TEST_F(DocumentProcessorTest, AnalyzesSentimentCorrectly) {
    PDFDocumentProcessor processor(_configManager);
    
    auto result = processor.processDocument(_testPdfPath, _metadata, std::nullopt);
    
    // Verify sentiment analysis
    ASSERT_TRUE(result.isSuccess());
    EXPECT_FALSE(result.getValue().sentimentAnalysis.empty());
    EXPECT_TRUE(result.getValue().sentimentAnalysis.find("positive") != result.getValue().sentimentAnalysis.end());
}

TEST_F(DocumentProcessorTest, GeneratesTagsCorrectly) {
    PDFDocumentProcessor processor(_configManager);
    
    auto result = processor.processDocument(_testPdfPath, _metadata, std::nullopt);
    
    // Verify tags
    ASSERT_TRUE(result.isSuccess());
    EXPECT_FALSE(result.getValue().autoTags.empty());
}

TEST_F(DocumentProcessorTest, RecognizesEntitiesCorrectly) {
    PDFDocumentProcessor processor(_configManager);
    
    auto result = processor.processDocument(_testPdfPath, _metadata, std::nullopt);
    
    // Verify entity recognition
    ASSERT_TRUE(result.isSuccess());
    EXPECT_FALSE(result.getValue().entityRecognition.empty());
    EXPECT_TRUE(result.getValue().entityRecognition.find("aircraft") != result.getValue().entityRecognition.end());
}
