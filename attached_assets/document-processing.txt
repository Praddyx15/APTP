// backend/document/include/DocumentProcessor.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <functional>
#include <optional>
#include <filesystem>
#include <future>
#include <unordered_map>

#include "core/include/ErrorHandling.h"

namespace APTP::Document {

// Enum for document types
enum class DocumentType {
    PDF,
    DOCX,
    XLSX,
    HTML,
    PPTX,
    TXT,
    XML,
    JSON,
    Unknown
};

// Processing status
enum class ProcessingStatus {
    NotStarted,
    Processing,
    Completed,
    Failed
};

// Structure to hold document metadata
struct DocumentMetadata {
    std::string documentId;
    std::string title;
    std::string author;
    std::string creationDate;
    std::string lastModifiedDate;
    std::size_t sizeInBytes;
    DocumentType type;
    std::unordered_map<std::string, std::string> customMetadata;
};

// Structure for document content
struct DocumentContent {
    std::string plainText;
    std::vector<std::string> paragraphs;
    std::vector<std::string> headers;
    std::unordered_map<std::string, std::vector<std::string>> tables;
    std::vector<std::string> images; // Paths or identifiers to extracted images
    std::unordered_map<std::string, std::string> extractedData; // Key-value pairs from forms, etc.
};

// Structure for regulatory mapping
struct RegulatoryMapping {
    std::string regulatoryBody; // e.g., "FAA", "EASA", "ICAO"
    std::string regulationId;   // e.g., "14 CFR Part 61", "EASA Part-FCL"
    std::string sectionId;      // e.g., "61.57", "FCL.060"
    std::string subsectionId;   // e.g., "61.57(c)", "FCL.060(b)"
    std::string description;
    double confidenceScore;     // 0.0 to 1.0
};

// Processing progress
struct ProcessingProgress {
    double percentComplete;
    ProcessingStatus status;
    std::string currentStage;
    std::string message;
    std::vector<std::string> warnings;
    std::vector<std::string> errors;
};

// Callback for progress updates
using ProgressCallback = std::function<void(const ProcessingProgress&)>;

// Result of document processing
struct ProcessingResult {
    std::string documentId;
    DocumentMetadata metadata;
    DocumentContent content;
    std::vector<RegulatoryMapping> regulatoryMappings;
    ProcessingProgress progress;
};

// Abstract base class for document processors
class DocumentProcessor {
public:
    virtual ~DocumentProcessor() = default;
    
    // Process a document from a file path
    virtual APTP::Core::Result<ProcessingResult> processDocument(
        const std::filesystem::path& filePath,
        const ProgressCallback& progressCallback = nullptr) = 0;
    
    // Process a document from a memory buffer
    virtual APTP::Core::Result<ProcessingResult> processDocument(
        const std::vector<uint8_t>& data,
        const std::string& filename,
        const ProgressCallback& progressCallback = nullptr) = 0;
    
    // Process a document asynchronously
    virtual std::future<APTP::Core::Result<ProcessingResult>> processDocumentAsync(
        const std::filesystem::path& filePath,
        const ProgressCallback& progressCallback = nullptr) = 0;
    
    // Detect document type
    static DocumentType detectDocumentType(const std::filesystem::path& filePath);
    static DocumentType detectDocumentType(const std::vector<uint8_t>& data, const std::string& filename);
    
    // Create appropriate processor for the document type
    static std::unique_ptr<DocumentProcessor> createProcessor(DocumentType type);
    static std::unique_ptr<DocumentProcessor> createProcessor(const std::filesystem::path& filePath);
    static std::unique_ptr<DocumentProcessor> createProcessor(const std::vector<uint8_t>& data, const std::string& filename);
};

// Concrete implementation for PDF documents
class PDFProcessor : public DocumentProcessor {
public:
    PDFProcessor();
    ~PDFProcessor() override;
    
    APTP::Core::Result<ProcessingResult> processDocument(
        const std::filesystem::path& filePath,
        const ProgressCallback& progressCallback = nullptr) override;
    
    APTP::Core::Result<ProcessingResult> processDocument(
        const std::vector<uint8_t>& data,
        const std::string& filename,
        const ProgressCallback& progressCallback = nullptr) override;
    
    std::future<APTP::Core::Result<ProcessingResult>> processDocumentAsync(
        const std::filesystem::path& filePath,
        const ProgressCallback& progressCallback = nullptr) override;

private:
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

// Concrete implementation for DOCX documents
class DOCXProcessor : public DocumentProcessor {
public:
    DOCXProcessor();
    ~DOCXProcessor() override;
    
    APTP::Core::Result<ProcessingResult> processDocument(
        const std::filesystem::path& filePath,
        const ProgressCallback& progressCallback = nullptr) override;
    
    APTP::Core::Result<ProcessingResult> processDocument(
        const std::vector<uint8_t>& data,
        const std::string& filename,
        const ProgressCallback& progressCallback = nullptr) override;
    
    std::future<APTP::Core::Result<ProcessingResult>> processDocumentAsync(
        const std::filesystem::path& filePath,
        const ProgressCallback& progressCallback = nullptr) override;

private:
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

// Additional concrete implementations for XLSX, HTML, PPTX, etc. would be defined similarly

// Factory method to create document processors
class DocumentProcessorFactory {
public:
    static std::unique_ptr<DocumentProcessor> createProcessor(DocumentType type);
    static std::unique_ptr<DocumentProcessor> createProcessor(const std::filesystem::path& filePath);
    static std::unique_ptr<DocumentProcessor> createProcessor(const std::vector<uint8_t>& data, const std::string& filename);
};

} // namespace APTP::Document

// backend/document/include/OCRProcessor.h
#pragma once

#include <string>
#include <vector>
#include <filesystem>
#include <memory>
#include <future>

#include "core/include/ErrorHandling.h"

namespace APTP::Document {

struct OCRResult {
    std::string text;
    double confidenceScore;
    std::vector<std::string> warnings;
    std::vector<std::string> errors;
};

// OCR processor for extracting text from images
class OCRProcessor {
public:
    static OCRProcessor& getInstance();
    
    // Process image file
    APTP::Core::Result<OCRResult> processImage(const std::filesystem::path& imagePath);
    
    // Process image data in memory
    APTP::Core::Result<OCRResult> processImage(const std::vector<uint8_t>& imageData);
    
    // Process multiple images and combine results
    APTP::Core::Result<OCRResult> processImages(const std::vector<std::filesystem::path>& imagePaths);
    
    // Process image asynchronously
    std::future<APTP::Core::Result<OCRResult>> processImageAsync(const std::filesystem::path& imagePath);
    
    // Configure OCR settings
    void setLanguage(const std::string& language);
    void setAccuracyMode(bool highAccuracy);
    void setPageSegmentationMode(int mode);

private:
    OCRProcessor();
    ~OCRProcessor();
    
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

} // namespace APTP::Document

// backend/document/include/AIDocumentAnalyzer.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <future>
#include <unordered_map>

#include "DocumentProcessor.h"
#include "core/include/ErrorHandling.h"

namespace APTP::Document {

// Entity types that can be extracted
enum class EntityType {
    Person,
    Organization,
    Location,
    Date,
    LearningObjective,
    Competency,
    Regulation,
    Equipment,
    Procedure,
    Safety,
    Custom
};

// Entity found in document
struct Entity {
    std::string text;
    EntityType type;
    std::string customType; // For custom entity types
    double confidenceScore;
    std::size_t startPosition;
    std::size_t endPosition;
    std::unordered_map<std::string, std::string> attributes;
};

// Relation between entities
struct Relation {
    std::string sourceEntityId;
    std::string targetEntityId;
    std::string relationType;
    double confidenceScore;
    std::unordered_map<std::string, std::string> attributes;
};

// Document summarization result
struct DocumentSummary {
    std::string shortSummary; // 1-2 sentences
    std::string detailedSummary; // Paragraph level
    std::vector<std::string> keyPoints;
    double confidenceScore;
};

// Document classification result
struct DocumentClassification {
    std::string primaryCategory;
    std::vector<std::string> secondaryCategories;
    std::unordered_map<std::string, double> categoryConfidences;
};

// AI analysis result
struct AIAnalysisResult {
    std::vector<Entity> entities;
    std::vector<Relation> relations;
    DocumentSummary summary;
    DocumentClassification classification;
    std::unordered_map<std::string, std::string> extractedMetadata;
    std::vector<RegulatoryMapping> regulatoryMappings;
};

// AI Document Analyzer class
class AIDocumentAnalyzer {
public:
    static AIDocumentAnalyzer& getInstance();
    
    // Analyze document content
    APTP::Core::Result<AIAnalysisResult> analyzeDocument(const DocumentContent& content);
    
    // Analyze document directly
    APTP::Core::Result<AIAnalysisResult> analyzeDocument(
        const std::filesystem::path& filePath);
    
    // Analyze document asynchronously
    std::future<APTP::Core::Result<AIAnalysisResult>> analyzeDocumentAsync(
        const DocumentContent& content);
    
    // Extract specific entity types
    APTP::Core::Result<std::vector<Entity>> extractEntities(
        const std::string& text, 
        const std::vector<EntityType>& entityTypes);
    
    // Summarize document
    APTP::Core::Result<DocumentSummary> summarizeDocument(
        const DocumentContent& content);
    
    // Classify document
    APTP::Core::Result<DocumentClassification> classifyDocument(
        const DocumentContent& content);
    
    // Map document to regulatory standards
    APTP::Core::Result<std::vector<RegulatoryMapping>> mapToRegulations(
        const DocumentContent& content,
        const std::vector<std::string>& regulatoryBodies = {"FAA", "EASA", "ICAO"});
    
    // Configure analyzer
    void setAnalysisDepth(int depth); // 1-5, where 5 is most detailed
    void setConfidenceThreshold(double threshold); // 0.0-1.0
    void enableEntityTypes(const std::vector<EntityType>& types);
    void disableEntityTypes(const std::vector<EntityType>& types);

private:
    AIDocumentAnalyzer();
    ~AIDocumentAnalyzer();
    
    struct Impl;
    std::unique_ptr<Impl> impl_;
};

} // namespace APTP::Document

// backend/document/src/DocumentProcessor.cpp (partial implementation)
#include "DocumentProcessor.h"
#include "core/include/Logger.h"
#include <thread>

namespace APTP::Document {

// DocumentProcessor static methods
DocumentType DocumentProcessor::detectDocumentType(const std::filesystem::path& filePath) {
    // Implementation for detecting document type based on file extension and content
    std::string extension = filePath.extension().string();
    
    // Convert to lowercase for case-insensitive comparison
    std::transform(extension.begin(), extension.end(), extension.begin(),
                   [](unsigned char c) { return std::tolower(c); });
    
    if (extension == ".pdf") return DocumentType::PDF;
    if (extension == ".docx") return DocumentType::DOCX;
    if (extension == ".xlsx") return DocumentType::XLSX;
    if (extension == ".html" || extension == ".htm") return DocumentType::HTML;
    if (extension == ".pptx") return DocumentType::PPTX;
    if (extension == ".txt") return DocumentType::TXT;
    if (extension == ".xml") return DocumentType::XML;
    if (extension == ".json") return DocumentType::JSON;
    
    // More advanced detection could include content analysis
    return DocumentType::Unknown;
}

DocumentType DocumentProcessor::detectDocumentType(const std::vector<uint8_t>& data, const std::string& filename) {
    // Simple implementation based on filename
    std::filesystem::path path(filename);
    return detectDocumentType(path);
    
    // A more robust implementation would analyze the file headers/magic bytes
}

std::unique_ptr<DocumentProcessor> DocumentProcessor::createProcessor(DocumentType type) {
    return DocumentProcessorFactory::createProcessor(type);
}

std::unique_ptr<DocumentProcessor> DocumentProcessor::createProcessor(const std::filesystem::path& filePath) {
    return DocumentProcessorFactory::createProcessor(filePath);
}

std::unique_ptr<DocumentProcessor> DocumentProcessor::createProcessor(const std::vector<uint8_t>& data, const std::string& filename) {
    return DocumentProcessorFactory::createProcessor(data, filename);
}

// DocumentProcessorFactory implementation
std::unique_ptr<DocumentProcessor> DocumentProcessorFactory::createProcessor(DocumentType type) {
    switch (type) {
        case DocumentType::PDF:
            return std::make_unique<PDFProcessor>();
        case DocumentType::DOCX:
            return std::make_unique<DOCXProcessor>();
        // Additional cases for other document types
        default:
            throw APTP::Core::APTPException(
                APTP::Core::ErrorCode::InvalidArgument,
                "Unsupported document type"
            );
    }
}

std::unique_ptr<DocumentProcessor> DocumentProcessorFactory::createProcessor(const std::filesystem::path& filePath) {
    DocumentType type = DocumentProcessor::detectDocumentType(filePath);
    return createProcessor(type);
}

std::unique_ptr<DocumentProcessor> DocumentProcessorFactory::createProcessor(const std::vector<uint8_t>& data, const std::string& filename) {
    DocumentType type = DocumentProcessor::detectDocumentType(data, filename);
    return createProcessor(type);
}

// PDFProcessor implementation
struct PDFProcessor::Impl {
    // Internal implementation details
};

PDFProcessor::PDFProcessor() : impl_(std::make_unique<Impl>()) {}
PDFProcessor::~PDFProcessor() = default;

APTP::Core::Result<ProcessingResult> PDFProcessor::processDocument(
    const std::filesystem::path& filePath,
    const ProgressCallback& progressCallback) {
    
    APTP::Core::Logger::getInstance().info("Processing PDF document: {}", filePath.string());
    
    ProcessingResult result;
    result.documentId = std::to_string(std::hash<std::string>{}(filePath.string()));
    result.progress.status = ProcessingStatus::Processing;
    
    // Update initial progress
    if (progressCallback) {
        result.progress.percentComplete = 0.0;
        result.progress.currentStage = "Starting PDF processing";
        progressCallback(result.progress);
    }
    
    try {
        // 1. Extract metadata
        result.metadata.type = DocumentType::PDF;
        result.metadata.sizeInBytes = std::filesystem::file_size(filePath);
        // ... more metadata extraction
        
        if (progressCallback) {
            result.progress.percentComplete = 25.0;
            result.progress.currentStage = "Extracted metadata";
            progressCallback(result.progress);
        }
        
        // 2. Extract text content
        // ... implementation for text extraction
        
        if (progressCallback) {
            result.progress.percentComplete = 50.0;
            result.progress.currentStage = "Extracted text content";
            progressCallback(result.progress);
        }
        
        // 3. Extract tables and other structured data
        // ... implementation for structured data extraction
        
        if (progressCallback) {
            result.progress.percentComplete = 75.0;
            result.progress.currentStage = "Extracted structured data";
            progressCallback(result.progress);
        }
        
        // 4. Perform regulatory mapping
        // ... implementation for regulatory mapping
        
        // Complete the processing
        result.progress.status = ProcessingStatus::Completed;
        result.progress.percentComplete = 100.0;
        result.progress.currentStage = "Processing completed";
        if (progressCallback) {
            progressCallback(result.progress);
        }
        
        return APTP::Core::Success(result);
    }
    catch (const std::exception& e) {
        result.progress.status = ProcessingStatus::Failed;
        result.progress.errors.push_back(e.what());
        if (progressCallback) {
            progressCallback(result.progress);
        }
        return APTP::Core::Error<ProcessingResult>(APTP::Core::ErrorCode::DocumentProcessingError);
    }
}

APTP::Core::Result<ProcessingResult> PDFProcessor::processDocument(
    const std::vector<uint8_t>& data,
    const std::string& filename,
    const ProgressCallback& progressCallback) {
    
    // Implementation for processing from memory buffer
    // Similar to the file-based implementation but working with the data buffer
    
    // This is a simplified implementation
    APTP::Core::Logger::getInstance().info("Processing PDF document from memory: {}", filename);
    
    // Create a temporary file
    std::filesystem::path tempPath = std::filesystem::temp_directory_path() / filename;
    try {
        std::ofstream tempFile(tempPath, std::ios::binary);
        tempFile.write(reinterpret_cast<const char*>(data.data()), data.size());
        tempFile.close();
        
        // Process the temporary file
        auto result = processDocument(tempPath, progressCallback);
        
        // Clean up
        std::filesystem::remove(tempPath);
        
        return result;
    }
    catch (const std::exception& e) {
        // Clean up in case of exception
        if (std::filesystem::exists(tempPath)) {
            std::filesystem::remove(tempPath);
        }
        
        ProcessingResult result;
        result.documentId = std::to_string(std::hash<std::string>{}(filename));
        result.progress.status = ProcessingStatus::Failed;
        result.progress.errors.push_back(e.what());
        if (progressCallback) {
            progressCallback(result.progress);
        }
        return APTP::Core::Error<ProcessingResult>(APTP::Core::ErrorCode::DocumentProcessingError);
    }
}

std::future<APTP::Core::Result<ProcessingResult>> PDFProcessor::processDocumentAsync(
    const std::filesystem::path& filePath,
    const ProgressCallback& progressCallback) {
    
    return std::async(std::launch::async, [this, filePath, progressCallback]() {
        return this->processDocument(filePath, progressCallback);
    });
}

// DOCXProcessor implementation would follow a similar pattern
// Other document processor implementations would follow as well

} // namespace APTP::Document

// Additional implementations for OCRProcessor.cpp and AIDocumentAnalyzer.cpp would follow
