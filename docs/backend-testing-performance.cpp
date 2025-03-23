// /backend/tests/core/ConfigurationManagerTests.cpp
#include <gtest/gtest.h>
#include "core/ConfigurationManager.h"

class ConfigurationManagerTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Set up test environment
        // Create a temporary config file for testing
        std::ofstream configFile("test_config.json");
        configFile << "{ \"apiKey\": \"test-key\", \"maxConnections\": 100 }";
        configFile.close();
    }

    void TearDown() override {
        // Clean up test environment
        std::remove("test_config.json");
    }
};

TEST_F(ConfigurationManagerTest, LoadConfigFromFile) {
    ConfigurationManager config;
    bool loaded = config.loadFromFile("test_config.json");
    EXPECT_TRUE(loaded);
    EXPECT_EQ(config.getString("apiKey"), "test-key");
    EXPECT_EQ(config.getInt("maxConnections"), 100);
}

TEST_F(ConfigurationManagerTest, GetNonExistentKey) {
    ConfigurationManager config;
    config.loadFromFile("test_config.json");
    EXPECT_THROW(config.getString("nonExistentKey"), std::out_of_range);
}

// /backend/tests/document/DocumentProcessorTests.cpp
#include <gtest/gtest.h>
#include "document/DocumentProcessor.h"
#include "document/PDFProcessor.h"

class DocumentProcessorTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Set up document processing test environment
        testPdfPath = "test_document.pdf";
        // Create a mock PDF file or use a fixture
    }

    void TearDown() override {
        // Clean up document processing test environment
    }

    std::string testPdfPath;
};

TEST_F(DocumentProcessorTest, ProcessPdfDocument) {
    PDFProcessor processor;
    auto result = processor.process(testPdfPath);
    EXPECT_TRUE(result.isSuccess());
    EXPECT_FALSE(result.getExtractedText().empty());
}

// /backend/tests/performance/SimulatorDataBenchmark.cpp
#include <benchmark/benchmark.h>
#include "integration/SimulatorDataProcessor.h"

// Benchmark for processing high-frequency simulator data
static void BM_SimulatorDataProcessing(benchmark::State& state) {
    // Setup simulator data processor
    SimulatorDataProcessor processor(1000); // 1000Hz frequency
    
    // Create sample telemetry data
    const size_t dataSize = state.range(0);
    std::vector<SimulatorTelemetry> telemetryData(dataSize);
    
    // Generate sample data
    for (size_t i = 0; i < dataSize; ++i) {
        telemetryData[i] = SimulatorTelemetry{
            /* timestamp */ static_cast<double>(i) / 1000.0,
            /* altitude */ 10000.0 + std::sin(static_cast<double>(i) / 100.0) * 1000.0,
            /* speed */ 250.0 + std::cos(static_cast<double>(i) / 50.0) * 50.0,
            /* heading */ static_cast<float>(i % 360),
            // Additional telemetry fields...
        };
    }
    
    // Benchmark processing loop
    for (auto _ : state) {
        processor.processBatch(telemetryData);
    }
    
    // Report processing rate (items/second)
    state.SetItemsProcessed(static_cast<int64_t>(state.iterations()) * dataSize);
}

// Register benchmark with different data sizes
BENCHMARK(BM_SimulatorDataProcessing)->Range(1000, 10000);

// /backend/tests/integration/SyllabusWorkflowTests.cpp
#include <gtest/gtest.h>
#include "document/DocumentProcessor.h"
#include "syllabus/SyllabusGenerator.h"
#include "compliance/ComplianceChecker.h"

class SyllabusWorkflowTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Set up the components for the workflow
        docProcessor = std::make_unique<DocumentProcessor>();
        syllabusGenerator = std::make_unique<SyllabusGenerator>();
        complianceChecker = std::make_unique<ComplianceChecker>();
        
        // Set up test files and database connection
        testDocPath = "test_training_manual.pdf";
        // Setup database with test data
    }
    
    void TearDown() override {
        // Clean up resources
    }
    
    std::unique_ptr<DocumentProcessor> docProcessor;
    std::unique_ptr<SyllabusGenerator> syllabusGenerator;
    std::unique_ptr<ComplianceChecker> complianceChecker;
    std::string testDocPath;
};

TEST_F(SyllabusWorkflowTest, EndToEndSyllabusGeneration) {
    // Test the entire workflow from document processing to syllabus generation
    
    // 1. Process document
    auto docResult = docProcessor->process(testDocPath);
    ASSERT_TRUE(docResult.isSuccess());
    
    // 2. Extract training requirements
    auto extractedData = docProcessor->extractTrainingRequirements(docResult);
    ASSERT_FALSE(extractedData.empty());
    
    // 3. Generate syllabus
    auto syllabus = syllabusGenerator->generateFromRequirements(extractedData);
    ASSERT_TRUE(syllabus.isValid());
    ASSERT_GT(syllabus.getModules().size(), 0);
    
    // 4. Check compliance with regulations
    auto complianceResult = complianceChecker->checkCompliance(syllabus, "FAA");
    ASSERT_TRUE(complianceResult.isCompliant());
}

// /backend/tests/CMakeLists.txt
cmake_minimum_required(VERSION 3.14)
project(AdvancedPilotTrainingPlatformTests)

# Find packages
find_package(GTest REQUIRED)
find_package(benchmark REQUIRED)

# Include directories
include_directories(${CMAKE_SOURCE_DIR}/../)

# Unit tests executable
add_executable(unit_tests
    core/ConfigurationManagerTests.cpp
    document/DocumentProcessorTests.cpp
    # Add other test files
)

target_link_libraries(unit_tests
    GTest::GTest
    GTest::Main
    AdvancedPilotTrainingPlatformLib
)

# Performance benchmarks executable
add_executable(performance_benchmarks
    performance/SimulatorDataBenchmark.cpp
    # Add other benchmark files
)

target_link_libraries(performance_benchmarks
    benchmark::benchmark
    AdvancedPilotTrainingPlatformLib
)

# Integration tests executable
add_executable(integration_tests
    integration/SyllabusWorkflowTests.cpp
    # Add other integration test files
)

target_link_libraries(integration_tests
    GTest::GTest
    GTest::Main
    AdvancedPilotTrainingPlatformLib
)

# Python tests with pytest
add_custom_target(pytest
    COMMAND ${CMAKE_COMMAND} -E env PYTHONPATH=${CMAKE_SOURCE_DIR}/../python pytest -xvs ${CMAKE_SOURCE_DIR}/python
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
)

# /backend/tests/python/test_document_ai.py
import pytest
import numpy as np
from document.ai.document_classifier import DocumentClassifier
from document.ai.entity_extractor import EntityExtractor

class TestDocumentAI:
    @pytest.fixture
    def document_classifier(self):
        return DocumentClassifier()
    
    @pytest.fixture
    def entity_extractor(self):
        return EntityExtractor()
    
    @pytest.fixture
    def sample_document(self):
        # Load or create sample document text
        with open("test_data/flight_manual.txt", "r") as f:
            return f.read()
    
    def test_document_classification(self, document_classifier, sample_document):
        # Test that document is correctly classified
        result = document_classifier.classify(sample_document)
        assert result.top_class == "flight_manual"
        assert result.confidence > 0.85
    
    def test_entity_extraction(self, entity_extractor, sample_document):
        # Test that entities are correctly extracted
        entities = entity_extractor.extract(sample_document)
        
        # Check for expected entities
        procedure_entities = [e for e in entities if e.type == "procedure"]
        assert len(procedure_entities) > 0
        
        # Check for specific procedure
        takeoff_procedures = [p for p in procedure_entities if "takeoff" in p.text.lower()]
        assert len(takeoff_procedures) > 0

# /backend/tests/python/test_performance_prediction.py
import pytest
import numpy as np
import pandas as pd
from analytics.performance_predictor import PerformancePredictor
from analytics.feature_engineering import FeatureEngineer

class TestPerformancePredictor:
    @pytest.fixture
    def performance_data(self):
        # Create sample performance data
        return pd.DataFrame({
            'trainee_id': np.repeat(range(1, 21), 5),  # 20 trainees, 5 sessions each
            'session_id': np.tile(range(1, 6), 20),    # 5 sessions per trainee
            'exercise_score': np.random.uniform(60, 100, 100),
            'reaction_time': np.random.uniform(0.5, 2.0, 100),
            'error_count': np.random.randint(0, 10, 100),
            'completion_time': np.random.uniform(5, 30, 100),
            'passed': np.random.choice([0, 1], 100, p=[0.2, 0.8])  # 80% pass rate
        })
    
    @pytest.fixture
    def feature_engineer(self):
        return FeatureEngineer()
    
    @pytest.fixture
    def performance_predictor(self):
        return PerformancePredictor()
    
    def test_feature_engineering(self, feature_engineer, performance_data):
        # Test feature engineering pipeline
        features = feature_engineer.transform(performance_data)
        
        # Check that we have the expected features
        assert 'avg_exercise_score' in features.columns
        assert 'trend_error_count' in features.columns
        assert features.shape[0] == len(performance_data['trainee_id'].unique())
    
    def test_performance_prediction(self, performance_predictor, feature_engineer, performance_data):
        # Split data for testing
        train_data = performance_data[performance_data['session_id'] < 4]
        test_data = performance_data[performance_data['session_id'] >= 4]
        
        # Generate features
        train_features = feature_engineer.transform(train_data)
        train_labels = train_data.groupby('trainee_id')['passed'].mean() > 0.7
        
        # Train the model
        performance_predictor.train(train_features, train_labels)
        
        # Make predictions
        test_features = feature_engineer.transform(test_data)
        predictions = performance_predictor.predict(test_features)
        
        # Check predictions shape
        assert len(predictions) == test_features.shape[0]
        
        # Evaluate accuracy (should be better than random)
        test_labels = test_data.groupby('trainee_id')['passed'].mean() > 0.7
        accuracy = (predictions == test_labels).mean()
        assert accuracy > 0.6  # Should be better than random guessing
