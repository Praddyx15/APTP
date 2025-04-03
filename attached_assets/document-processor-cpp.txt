// src/backend/document/DocumentProcessor.h
#pragma once

#include <memory>
#include <string>
#include <vector>
#include <unordered_map>
#include <functional>
#include <optional>
#include <future>

#include "../core/Result.h"
#include "../core/Logger.h"
#include "../core/MemoryPool.h"
#include "../core/ConfigurationManager.h"

namespace PilotTraining {
namespace Document {

/**
 * Enum representing supported document types
 */
enum class DocumentType {
  PDF,
  DOCX,
  XLSX,
  HTML,
  PPTX,
  UNKNOWN
};

/**
 * Enum representing document processing status
 */
enum class ProcessingStatus {
  PENDING,
  PROCESSING,
  COMPLETED,
  FAILED
};

/**
 * Struct representing document metadata
 */
struct DocumentMetadata {
  std::string id;
  std::string filename;
  std::string contentType;
  std::string organizationId;
  std::string uploadedBy;
  std::string createdAt;
  std::string updatedAt;
  DocumentType type;
  size_t fileSize;
  std::unordered_map<std::string, std::string> additionalMetadata;
};

/**
 * Struct representing document content
 */
struct DocumentContent {
  std::string rawText;
  std::vector<std::string> paragraphs;
  std::vector<std::string> headings;
  std::vector<std::vector<std::string>> tables;
  std::unordered_map<std::string, std::string> metadata;
  float extractionConfidence;
};

/**
 * Struct representing document structure
 */
struct DocumentStructure {
  struct Section {
    std::string title;
    std::string content;
    std::vector<Section> subsections;
    std::unordered_map<std::string, std::string> metadata;
  };

  std::vector<Section> sections;
  std::unordered_map<std::string, std::vector<std::string>> entityReferences;
  std::unordered_map<std::string, std::vector<std::string>> regulatoryReferences;
};

/**
 * Struct representing extracted training elements
 */
struct TrainingElements {
  struct LearningObjective {
    std::string id;
    std::string description;
    std::string category;
    std::vector<std::string> relatedRegulations;
    std::vector<std::string> prerequisites;
    float importance;
  };

  struct Competency {
    std::string id;
    std::string name;
    std::string description;
    std::vector<std::string> assessmentCriteria;
    std::vector<std::string> relatedObjectives;
  };

  struct Procedure {
    std::string id;
    std::string name;
    std::string description;
    std::vector<std::string> steps;
    std::vector<std::string> relatedCompetencies;
    std::vector<std::string> safetyConsiderations;
  };

  std::vector<LearningObjective> learningObjectives;
  std::vector<Competency> competencies;
  std::vector<Procedure> procedures;
  std::unordered_map<std::string, std::vector<std::string>> regulatoryMapping;
};

/**
 * Struct representing quality assessment of processed document
 */
struct QualityAssessment {
  float completenessScore;
  float consistencyScore;
  float regulatoryComplianceScore;
  float overallConfidence;
  std::vector<std::string> potentialGaps;
  std::vector<std::string> inconsistencies;
  std::vector<std::string> complianceIssues;
};

/**
 * Class representing the result of document processing
 */
struct ProcessingResult {
  std::string documentId;
  ProcessingStatus status;
  DocumentContent content;
  DocumentStructure structure;
  TrainingElements trainingElements;
  QualityAssessment qualityAssessment;
  std::vector<std::string> errors;
  std::unordered_map<std::string, float> processingMetrics;
  
  // AI-enhanced features from extended prompt
  std::unordered_map<std::string, float> sentimentAnalysis;
  std::vector<std::string> autoTags;
  std::unordered_map<std::string, std::vector<std::string>> entityRecognition;
  std::string summary;
};

/**
 * Progress callback function type
 */
using ProgressCallback = std::function<void(float progress, const std::string& stage)>;

/**
 * Abstract base class for document processors
 */
class IDocumentProcessor {
public:
  virtual ~IDocumentProcessor() = default;
  
  /**
   * Process a document
   * 
   * @param documentPath Path to the document file
   * @param metadata Document metadata
   * @param progressCallback Optional callback for progress updates
   * @return Result containing processing result or error
   */
  virtual Result<ProcessingResult> processDocument(
    const std::string& documentPath,
    const DocumentMetadata& metadata,
    const std::optional<ProgressCallback>& progressCallback = std::nullopt
  ) = 0;
  
  /**
   * Process a document asynchronously
   * 
   * @param documentPath Path to the document file
   * @param metadata Document metadata
   * @param progressCallback Optional callback for progress updates
   * @return Future result containing processing result or error
   */
  virtual std::future<Result<ProcessingResult>> processDocumentAsync(
    const std::string& documentPath,
    const DocumentMetadata& metadata,
    const std::optional<ProgressCallback>& progressCallback = std::nullopt
  ) = 0;
};

/**
 * PDF Document Processor implementation
 */
class PDFDocumentProcessor : public IDocumentProcessor {
public:
  explicit PDFDocumentProcessor(std::shared_ptr<Core::ConfigurationManager> configManager);
  ~PDFDocumentProcessor() override;
  
  Result<ProcessingResult> processDocument(
    const std::string& documentPath,
    const DocumentMetadata& metadata,
    const std::optional<ProgressCallback>& progressCallback = std::nullopt
  ) override;
  
  std::future<Result<ProcessingResult>> processDocumentAsync(
    const std::string& documentPath,
    const DocumentMetadata& metadata,
    const std::optional<ProgressCallback>& progressCallback = std::nullopt
  ) override;
  
private:
  Result<DocumentContent> extractContent(const std::string& documentPath);
  Result<DocumentStructure> recognizeStructure(const DocumentContent& content);
  Result<TrainingElements> extractTrainingElements(const DocumentStructure& structure);
  Result<QualityAssessment> assessQuality(
    const DocumentContent& content,
    const DocumentStructure& structure,
    const TrainingElements& trainingElements
  );
  
  // Enhanced AI features from extended prompt
  Result<std::string> generateSummary(const DocumentContent& content);
  Result<std::unordered_map<std::string, float>> analyzeSentiment(const DocumentContent& content);
  Result<std::vector<std::string>> generateTags(const DocumentContent& content);
  Result<std::unordered_map<std::string, std::vector<std::string>>> recognizeEntities(const DocumentContent& content);
  
  std::shared_ptr<Core::ConfigurationManager> _configManager;
  Core::MemoryPool _memoryPool;
  
  // Additional members for OCR, text extraction, etc.
};

/**
 * Word Document Processor implementation
 */
class DOCXDocumentProcessor : public IDocumentProcessor {
public:
  explicit DOCXDocumentProcessor(std::shared_ptr<Core::ConfigurationManager> configManager);
  ~DOCXDocumentProcessor() override;
  
  Result<ProcessingResult> processDocument(
    const std::string& documentPath,
    const DocumentMetadata& metadata,
    const std::optional<ProgressCallback>& progressCallback = std::nullopt
  ) override;
  
  std::future<Result<ProcessingResult>> processDocumentAsync(
    const std::string& documentPath,
    const DocumentMetadata& metadata,
    const std::optional<ProgressCallback>& progressCallback = std::nullopt
  ) override;
  
private:
  // Similar private methods as PDFDocumentProcessor
  std::shared_ptr<Core::ConfigurationManager> _configManager;
  Core::MemoryPool _memoryPool;
};

/**
 * Factory for creating document processors based on document type
 */
class DocumentProcessorFactory {
public:
  explicit DocumentProcessorFactory(std::shared_ptr<Core::ConfigurationManager> configManager);
  
  /**
   * Create a document processor for the specified document type
   * 
   * @param type Document type
   * @return Shared pointer to document processor or null if type is not supported
   */
  std::shared_ptr<IDocumentProcessor> createProcessor(DocumentType type);
  
  /**
   * Determine document type from file extension
   * 
   * @param filename Filename with extension
   * @return Document type
   */
  static DocumentType determineType(const std::string& filename);
  
private:
  std::shared_ptr<Core::ConfigurationManager> _configManager;
};

/**
 * Main document processing pipeline
 */
class DocumentProcessingPipeline {
public:
  explicit DocumentProcessingPipeline(std::shared_ptr<Core::ConfigurationManager> configManager);
  
  /**
   * Process a document through the complete pipeline
   * 
   * @param documentPath Path to the document file
   * @param metadata Document metadata
   * @param progressCallback Optional callback for progress updates
   * @return Result containing processing result or error
   */
  Result<ProcessingResult> processDocument(
    const std::string& documentPath,
    const DocumentMetadata& metadata,
    const std::optional<ProgressCallback>& progressCallback = std::nullopt
  );
  
  /**
   * Process a document asynchronously through the complete pipeline
   * 
   * @param documentPath Path to the document file
   * @param metadata Document metadata
   * @param progressCallback Optional callback for progress updates
   * @return Future result containing processing result or error
   */
  std::future<Result<ProcessingResult>> processDocumentAsync(
    const std::string& documentPath,
    const DocumentMetadata& metadata,
    const std::optional<ProgressCallback>& progressCallback = std::nullopt
  );
  
  /**
   * Process multiple documents in batch
   * 
   * @param documentPaths Paths to document files
   * @param metadataList List of document metadata
   * @param progressCallback Optional callback for progress updates
   * @return Vector of results containing processing results or errors
   */
  std::vector<Result<ProcessingResult>> processBatch(
    const std::vector<std::string>& documentPaths,
    const std::vector<DocumentMetadata>& metadataList,
    const std::optional<ProgressCallback>& progressCallback = std::nullopt
  );
  
private:
  DocumentProcessorFactory _processorFactory;
  std::shared_ptr<Core::ConfigurationManager> _configManager;
};

} // namespace Document
} // namespace PilotTraining
