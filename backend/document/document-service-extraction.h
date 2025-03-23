#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <optional>
#include <nlohmann/json.hpp>
#include "parsers/document_parser.h"

namespace document {
namespace extraction {

/**
 * @brief Content type categories
 */
enum class ContentType {
    UNKNOWN,
    REGULATORY,
    TRAINING,
    TECHNICAL,
    REFERENCE,
    PROCEDURE
};

/**
 * @brief Convert ContentType to string
 * @param type Content type
 * @return String representation
 */
std::string contentTypeToString(ContentType type);

/**
 * @brief Convert string to ContentType
 * @param str String representation
 * @return Content type
 */
ContentType contentTypeFromString(const std::string& str);

/**
 * @brief Extracted content section
 */
struct ContentSection {
    std::string id;
    std::string title;
    std::string content;
    int section_level;
    std::vector<std::string> tags;
    std::map<std::string, std::string> metadata;
    std::vector<std::string> references;
    ContentType type;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Content section or nullopt if invalid
     */
    static std::optional<ContentSection> fromJson(const nlohmann::json& json);
};

/**
 * @brief Extracted training objective
 */
struct TrainingObjective {
    std::string id;
    std::string description;
    std::string level;  // Knowledge, Comprehension, Application, Analysis, Synthesis, Evaluation
    std::vector<std::string> related_sections;
    std::vector<std::string> keywords;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Training objective or nullopt if invalid
     */
    static std::optional<TrainingObjective> fromJson(const nlohmann::json& json);
};

/**
 * @brief Extracted regulatory reference
 */
struct RegulatoryReference {
    std::string id;
    std::string regulation;
    std::string section;
    std::string reference;
    std::string description;
    std::vector<std::string> related_sections;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Regulatory reference or nullopt if invalid
     */
    static std::optional<RegulatoryReference> fromJson(const nlohmann::json& json);
};

/**
 * @brief Extracted procedure step
 */
struct ProcedureStep {
    std::string id;
    int step_number;
    std::string description;
    std::string actor;  // Who performs the step
    std::vector<std::string> conditions;  // Conditions for step
    std::vector<std::string> notes;
    std::vector<std::string> warnings;
    std::vector<std::string> related_sections;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Procedure step or nullopt if invalid
     */
    static std::optional<ProcedureStep> fromJson(const nlohmann::json& json);
};

/**
 * @brief Extracted procedure
 */
struct Procedure {
    std::string id;
    std::string title;
    std::string description;
    std::vector<ProcedureStep> steps;
    std::vector<std::string> references;
    std::map<std::string, std::string> metadata;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Procedure or nullopt if invalid
     */
    static std::optional<Procedure> fromJson(const nlohmann::json& json);
};

/**
 * @brief Extracted training content
 */
struct TrainingContent {
    std::string document_id;
    std::string title;
    std::string description;
    std::vector<ContentSection> sections;
    std::vector<TrainingObjective> objectives;
    std::vector<RegulatoryReference> regulations;
    std::vector<Procedure> procedures;
    std::map<std::string, std::string> metadata;
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Training content or nullopt if invalid
     */
    static std::optional<TrainingContent> fromJson(const nlohmann::json& json);
};

/**
 * @brief Extraction options
 */
struct ExtractionOptions {
    bool extract_objectives = true;
    bool extract_regulations = true;
    bool extract_procedures = true;
    bool extract_related_content = true;
    std::string language = "en";
    std::string document_type;  // Optional document type hint
    std::vector<std::string> keywords;  // Optional keywords to focus on
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Extraction options or nullopt if invalid
     */
    static std::optional<ExtractionOptions> fromJson(const nlohmann::json& json);
};

/**
 * @brief Content extractor interface
 */
class IContentExtractor {
public:
    virtual ~IContentExtractor() = default;
    
    /**
     * @brief Extract training content from document
     * @param document_content Document content
     * @param options Extraction options
     * @return Training content or nullopt if extraction failed
     */
    virtual std::optional<TrainingContent> extractContent(
        const parsers::DocumentContent& document_content,
        const ExtractionOptions& options = ExtractionOptions()
    ) = 0;
    
    /**
     * @brief Extract training content from file
     * @param file_path File path
     * @param options Extraction options
     * @return Training content or nullopt if extraction failed
     */
    virtual std::optional<TrainingContent> extractFromFile(
        const std::string& file_path,
        const ExtractionOptions& options = ExtractionOptions()
    ) = 0;
    
    /**
     * @brief Extract training content from data
     * @param data Document data
     * @param doc_type Document type
     * @param options Extraction options
     * @return Training content or nullopt if extraction failed
     */
    virtual std::optional<TrainingContent> extractFromData(
        const std::vector<uint8_t>& data,
        parsers::DocumentType doc_type,
        const ExtractionOptions& options = ExtractionOptions()
    ) = 0;
};

/**
 * @brief Standard content extractor
 */
class StandardContentExtractor : public IContentExtractor {
public:
    /**
     * @brief Constructor
     * @param parser_factory Document parser factory
     */
    explicit StandardContentExtractor(
        std::shared_ptr<parsers::DocumentParserFactory> parser_factory = nullptr
    );
    
    /**
     * @brief Destructor
     */
    ~StandardContentExtractor() override;
    
    /**
     * @brief Extract training content from document
     * @param document_content Document content
     * @param options Extraction options
     * @return Training content or nullopt if extraction failed
     */
    std::optional<TrainingContent> extractContent(
        const parsers::DocumentContent& document_content,
        const ExtractionOptions& options = ExtractionOptions()
    ) override;
    
    /**
     * @brief Extract training content from file
     * @param file_path File path
     * @param options Extraction options
     * @return Training content or nullopt if extraction failed
     */
    std::optional<TrainingContent> extractFromFile(
        const std::string& file_path,
        const ExtractionOptions& options = ExtractionOptions()
    ) override;
    
    /**
     * @brief Extract training content from data
     * @param data Document data
     * @param doc_type Document type
     * @param options Extraction options
     * @return Training content or nullopt if extraction failed
     */
    std::optional<TrainingContent> extractFromData(
        const std::vector<uint8_t>& data,
        parsers::DocumentType doc_type,
        const ExtractionOptions& options = ExtractionOptions()
    ) override;
    
private:
    /**
     * @brief Extract sections from document content
     * @param content Document content
     * @param options Extraction options
     * @return Content sections
     */
    std::vector<ContentSection> extractSections(
        const parsers::DocumentContent& content,
        const ExtractionOptions& options
    );
    
    /**
     * @brief Extract training objectives from document content
     * @param content Document content
     * @param sections Extracted sections
     * @param options Extraction options
     * @return Training objectives
     */
    std::vector<TrainingObjective> extractObjectives(
        const parsers::DocumentContent& content,
        const std::vector<ContentSection>& sections,
        const ExtractionOptions& options
    );
    
    /**
     * @brief Extract regulatory references from document content
     * @param content Document content
     * @param sections Extracted sections
     * @param options Extraction options
     * @return Regulatory references
     */
    std::vector<RegulatoryReference> extractRegulations(
        const parsers::DocumentContent& content,
        const std::vector<ContentSection>& sections,
        const ExtractionOptions& options
    );
    
    /**
     * @brief Extract procedures from document content
     * @param content Document content
     * @param sections Extracted sections
     * @param options Extraction options
     * @return Procedures
     */
    std::vector<Procedure> extractProcedures(
        const parsers::DocumentContent& content,
        const std::vector<ContentSection>& sections,
        const ExtractionOptions& options
    );
    
    /**
     * @brief Detect content type
     * @param text Text to analyze
     * @return Content type
     */
    ContentType detectContentType(const std::string& text);
    
    /**
     * @brief Extract section title from heading
     * @param heading Heading text
     * @return Section title
     */
    std::string extractSectionTitle(const std::string& heading);
    
    /**
     * @brief Generate section ID
     * @param title Section title
     * @param level Section level
     * @return Section ID
     */
    std::string generateSectionId(const std::string& title, int level);
    
    std::shared_ptr<parsers::DocumentParserFactory> parser_factory_;
};

/**
 * @brief NLP-based content extractor
 */
class NlpContentExtractor : public IContentExtractor {
public:
    /**
     * @brief Constructor
     * @param parser_factory Document parser factory
     * @param model_path Path to NLP model
     */
    NlpContentExtractor(
        std::shared_ptr<parsers::DocumentParserFactory> parser_factory = nullptr,
        const std::string& model_path = ""
    );
    
    /**
     * @brief Destructor
     */
    ~NlpContentExtractor() override;
    
    /**
     * @brief Extract training content from document
     * @param document_content Document content
     * @param options Extraction options
     * @return Training content or nullopt if extraction failed
     */
    std::optional<TrainingContent> extractContent(
        const parsers::DocumentContent& document_content,
        const ExtractionOptions& options = ExtractionOptions()
    ) override;
    
    /**
     * @brief Extract training content from file
     * @param file_path File path
     * @param options Extraction options
     * @return Training content or nullopt if extraction failed
     */
    std::optional<TrainingContent> extractFromFile(
        const std::string& file_path,
        const ExtractionOptions& options = ExtractionOptions()
    ) override;
    
    /**
     * @brief Extract training content from data
     * @param data Document data
     * @param doc_type Document type
     * @param options Extraction options
     * @return Training content or nullopt if extraction failed
     */
    std::optional<TrainingContent> extractFromData(
        const std::vector<uint8_t>& data,
        parsers::DocumentType doc_type,
        const ExtractionOptions& options = ExtractionOptions()
    ) override;
    
private:
    /**
     * @brief Initialize NLP model
     * @param model_path Path to NLP model
     * @return True if initialized successfully
     */
    bool initializeModel(const std::string& model_path);
    
    /**
     * @brief Process text with NLP model
     * @param text Text to process
     * @return Processed text
     */
    std::string processText(const std::string& text);
    
    /**
     * @brief Extract named entities
     * @param text Text to analyze
     * @return Named entities (type -> text)
     */
    std::map<std::string, std::vector<std::string>> extractNamedEntities(const std::string& text);
    
    std::shared_ptr<parsers::DocumentParserFactory> parser_factory_;
    void* nlp_model_;  // Opaque pointer to NLP model
    std::string model_path_;
    bool model_initialized_;
};

} // namespace extraction
} // namespace document