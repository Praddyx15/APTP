#pragma once

#include <string>
#include <vector>
#include <memory>
#include <optional>
#include <functional>
#include <future>
#include <filesystem>
#include <chrono>

#include <nlohmann/json.hpp>
#include <drogon/drogon.h>

#include "../core/error-handling.hpp"

namespace apt {
namespace document {

/**
 * Document types supported by the system
 */
enum class DocumentType {
    PDF,
    DOCX,
    XLSX,
    HTML,
    PPTX,
    TXT,
    XML,
    JSON,
    MARKDOWN,
    UNKNOWN
};

/**
 * Document processing status
 */
enum class ProcessingStatus {
    PENDING,
    PROCESSING,
    COMPLETED,
    FAILED
};

/**
 * Extracted entity types
 */
enum class EntityType {
    PERSON,
    ORGANIZATION,
    LOCATION,
    DATE,
    TIME,
    DURATION,
    PROCEDURE,
    EXERCISE,
    REGULATION,
    LEARNING_OBJECTIVE,
    AIRCRAFT_SYSTEM,
    AIRCRAFT_COMPONENT,
    MANEUVER,
    EMERGENCY_PROCEDURE,
    WEATHER_CONDITION,
    LIMITATION,
    PERFORMANCE_METRIC,
    CUSTOM
};

/**
 * Text span in a document
 */
struct TextSpan {
    size_t startOffset;
    size_t endOffset;
    std::string text;
};

/**
 * Extracted entity from a document
 */
struct Entity {
    std::string id;
    EntityType type;
    std::string value;
    std::string normalizedValue;
    std::optional<std::string> category;
    TextSpan span;
    std::optional<double> confidence;
    std::unordered_map<std::string, std::string> attributes;
};

/**
 * Relationship between entities
 */
struct Relationship {
    std::string id;
    std::string sourceEntityId;
    std::string targetEntityId;
    std::string relationType;
    std::optional<double> confidence;
    std::unordered_map<std::string, std::string> attributes;
};

/**
 * Document section (chapter, paragraph, etc.)
 */
struct DocumentSection {
    std::string id;
    std::string title;
    int level;
    TextSpan span;
    std::vector<std::string> childSectionIds;
    std::optional<std::string> parentSectionId;
};

/**
 * Table structure in a document
 */
struct Table {
    std::string id;
    std::string title;
    std::vector<std::vector<std::string>> cells;
    std::vector<std::string> headers;
    TextSpan span;
};

/**
 * Image in a document
 */
struct Image {
    std::string id;
    std::string caption;
    std::vector<uint8_t> data;
    std::string mimeType;
    TextSpan span;
};

/**
 * Document metadata
 */
struct DocumentMetadata {
    std::string title;
    std::string author;
    std::optional<std::chrono::system_clock::time_point> creationDate;
    std::optional<std::chrono::system_clock::time_point> modificationDate;
    std::unordered_map<std::string, std::string> customProperties;
};

/**
 * Regulatory compliance reference
 */
struct RegulatoryReference {
    std::string id;
    std::string authority; // FAA, EASA, ICAO, etc.
    std::string document;
    std::string section;
    std::string text;
    std::optional<std::string> url;
};

/**
 * Processed document result
 */
struct ProcessedDocument {
    std::string id;
    std::string originalFilename;
    DocumentType documentType;
    ProcessingStatus status;
    std::optional<std::string> errorMessage;
    
    std::string textContent;
    DocumentMetadata metadata;
    
    std::vector<Entity> entities;
    std::vector<Relationship> relationships;
    std::vector<DocumentSection> sections;
    std::vector<Table> tables;
    std::vector<Image> images;
    
    std::vector<RegulatoryReference> regulatoryReferences;
    
    nlohmann::json rawParsingResult;
    
    // Progress information
    float progress;
    std::chrono::system_clock::time_point startTime;
    std::optional<std::chrono::system_clock::time_point> endTime;
    
    // Audit information
    std::string userId;
    std::string requestId;
    std::chrono::system_clock::time_point uploadTime;
};

/**
 * Document processing progress callback
 */
using ProgressCallback = std::function<void(float progress, const std::string& statusMessage)>;

/**
 * Document processor options
 */
struct ProcessorOptions {
    bool extractText = true;
    bool extractEntities = true;
    bool extractRelationships = true;
    bool extractSections = true;
    bool extractTables = true;
    bool extractImages = false;
    bool identifyRegulations = true;
    bool performOcr = true;
    
    std::optional<std::string> language;
    std::optional<std::vector<EntityType>> entityTypesToExtract;
    
    std::optional<ProgressCallback> progressCallback;
};

/**
 * Abstract document processor interface
 */
class DocumentProcessor {
public:
    virtual ~DocumentProcessor() = default;
    
    /**
     * Process a document from a file path
     */
    virtual std::future<Result<ProcessedDocument, AptException>> processFile(
        const std::filesystem::path& filePath,
        const ProcessorOptions& options = {}) = 0;
    
    /**
     * Process a document from binary data
     */
    virtual std::future<Result<ProcessedDocument, AptException>> processData(
        const std::vector<uint8_t>& data,
        const std::string& filename,
        const ProcessorOptions& options = {}) = 0;
    
    /**
     * Check if this processor can handle the given document type
     */
    virtual bool canProcess(DocumentType type) const = 0;
    
    /**
     * Get the document type from a file extension
     */
    static DocumentType getDocumentTypeFromExtension(const std::string& extension);
    
    /**
     * Get the document type from a MIME type
     */
    static DocumentType getDocumentTypeFromMimeType(const std::string& mimeType);
};

/**
 * Factory for creating document processors
 */
class DocumentProcessorFactory {
public:
    /**
     * Register a document processor
     */
    static void registerProcessor(std::shared_ptr<DocumentProcessor> processor);
    
    /**
     * Get a processor for the given document type
     */
    static std::shared_ptr<DocumentProcessor> getProcessor(DocumentType type);
    
    /**
     * Get a processor for the given file extension
     */
    static std::shared_ptr<DocumentProcessor> getProcessorForExtension(const std::string& extension);
    
    /**
     * Get a processor for the given MIME type
     */
    static std::shared_ptr<DocumentProcessor> getProcessorForMimeType(const std::string& mimeType);
    
private:
    static std::vector<std::shared_ptr<DocumentProcessor>> processors_;
    static std::once_flag initFlag_;
    
    static void initialize();
};

// Implementation of DocumentProcessor::getDocumentTypeFromExtension
inline DocumentType DocumentProcessor::getDocumentTypeFromExtension(const std::string& extension) {
    std::string ext = extension;
    
    // Remove leading dot if present
    if (!ext.empty() && ext[0] == '.') {
        ext = ext.substr(1);
    }
    
    // Convert to lowercase
    std::transform(ext.begin(), ext.end(), ext.begin(), 
                   [](unsigned char c) { return std::tolower(c); });
    
    if (ext == "pdf") return DocumentType::PDF;
    if (ext == "docx" || ext == "doc") return DocumentType::DOCX;
    if (ext == "xlsx" || ext == "xls") return DocumentType::XLSX;
    if (ext == "html" || ext == "htm") return DocumentType::HTML;
    if (ext == "pptx" || ext == "ppt") return DocumentType::PPTX;
    if (ext == "txt") return DocumentType::TXT;
    if (ext == "xml") return DocumentType::XML;
    if (ext == "json") return DocumentType::JSON;
    if (ext == "md" || ext == "markdown") return DocumentType::MARKDOWN;
    
    return DocumentType::UNKNOWN;
}

// Implementation of DocumentProcessor::getDocumentTypeFromMimeType
inline DocumentType DocumentProcessor::getDocumentTypeFromMimeType(const std::string& mimeType) {
    std::string mime = mimeType;
    
    // Convert to lowercase
    std::transform(mime.begin(), mime.end(), mime.begin(), 
                   [](unsigned char c) { return std::tolower(c); });
    
    if (mime == "application/pdf") return DocumentType::PDF;
    if (mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mime == "application/msword") return DocumentType::DOCX;
    if (mime == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        mime == "application/vnd.ms-excel") return DocumentType::XLSX;
    if (mime == "text/html") return DocumentType::HTML;
    if (mime == "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
        mime == "application/vnd.ms-powerpoint") return DocumentType::PPTX;
    if (mime == "text/plain") return DocumentType::TXT;
    if (mime == "application/xml" || mime == "text/xml") return DocumentType::XML;
    if (mime == "application/json") return DocumentType::JSON;
    if (mime == "text/markdown") return DocumentType::MARKDOWN;
    
    return DocumentType::UNKNOWN;
}

// Initialize static members
std::vector<std::shared_ptr<DocumentProcessor>> DocumentProcessorFactory::processors_;
std::once_flag DocumentProcessorFactory::initFlag_;

// Implementation of DocumentProcessorFactory::registerProcessor
inline void DocumentProcessorFactory::registerProcessor(std::shared_ptr<DocumentProcessor> processor) {
    std::call_once(initFlag_, initialize);
    processors_.push_back(processor);
}

// Implementation of DocumentProcessorFactory::getProcessor
inline std::shared_ptr<DocumentProcessor> DocumentProcessorFactory::getProcessor(DocumentType type) {
    std::call_once(initFlag_, initialize);
    
    for (const auto& processor : processors_) {
        if (processor->canProcess(type)) {
            return processor;
        }
    }
    
    return nullptr;
}

// Implementation of DocumentProcessorFactory::getProcessorForExtension
inline std::shared_ptr<DocumentProcessor> DocumentProcessorFactory::getProcessorForExtension(const std::string& extension) {
    DocumentType type = DocumentProcessor::getDocumentTypeFromExtension(extension);
    return getProcessor(type);
}

// Implementation of DocumentProcessorFactory::getProcessorForMimeType
inline std::shared_ptr<DocumentProcessor> DocumentProcessorFactory::getProcessorForMimeType(const std::string& mimeType) {
    DocumentType type = DocumentProcessor::getDocumentTypeFromMimeType(mimeType);
    return getProcessor(type);
}

// Implementation of DocumentProcessorFactory::initialize
inline void DocumentProcessorFactory::initialize() {
    // This method will be implemented to register built-in processors
    processors_.clear();
}

} // namespace document
} // namespace apt