#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <optional>
#include <nlohmann/json.hpp>

namespace document {
namespace parsers {

/**
 * @brief Supported document types
 */
enum class DocumentType {
    UNKNOWN,
    PDF,
    DOCX,
    XLSX,
    HTML,
    TXT,
    MD,
    XML,
    JSON
};

/**
 * @brief Convert DocumentType to string
 * @param type Document type
 * @return String representation
 */
std::string documentTypeToString(DocumentType type);

/**
 * @brief Convert string to DocumentType
 * @param str String representation
 * @return Document type
 */
DocumentType documentTypeFromString(const std::string& str);

/**
 * @brief Get document type from file extension
 * @param filename Filename
 * @return Document type
 */
DocumentType documentTypeFromExtension(const std::string& filename);

/**
 * @brief Document content structure
 */
struct DocumentContent {
    std::string text;                       // Plain text content
    std::vector<std::string> paragraphs;    // Text split into paragraphs
    std::map<std::string, std::string> metadata; // Document metadata
    std::vector<std::map<std::string, std::string>> tables; // Extracted tables
    std::vector<std::string> headings;      // Document headings
    std::vector<std::string> links;         // Links in document
    std::map<std::string, std::string> images; // Image descriptions
    nlohmann::json structured_content;      // Structured representation
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Document content or nullopt if invalid
     */
    static std::optional<DocumentContent> fromJson(const nlohmann::json& json);
};

/**
 * @brief Document parser options
 */
struct ParserOptions {
    bool extract_metadata = true;
    bool extract_tables = true;
    bool extract_images = false;
    bool preserve_layout = true;
    bool extract_links = true;
    int max_text_length = 0;  // 0 = no limit
    std::string password;     // For password-protected documents
    
    /**
     * @brief Convert to JSON
     * @return JSON representation
     */
    nlohmann::json toJson() const;
    
    /**
     * @brief Create from JSON
     * @param json JSON representation
     * @return Parser options or nullopt if invalid
     */
    static std::optional<ParserOptions> fromJson(const nlohmann::json& json);
};

/**
 * @brief Document parser interface
 */
class IDocumentParser {
public:
    virtual ~IDocumentParser() = default;
    
    /**
     * @brief Parse document from file
     * @param file_path File path
     * @param options Parser options
     * @return Parsed document content or nullopt if parsing failed
     */
    virtual std::optional<DocumentContent> parseFile(
        const std::string& file_path,
        const ParserOptions& options = ParserOptions()
    ) = 0;
    
    /**
     * @brief Parse document from memory
     * @param data Document data
     * @param options Parser options
     * @return Parsed document content or nullopt if parsing failed
     */
    virtual std::optional<DocumentContent> parseData(
        const std::vector<uint8_t>& data,
        const ParserOptions& options = ParserOptions()
    ) = 0;
    
    /**
     * @brief Get supported document type
     * @return Document type
     */
    virtual DocumentType getDocumentType() const = 0;
    
    /**
     * @brief Check if parser supports the given file
     * @param file_path File path
     * @return True if supported
     */
    virtual bool supportsFile(const std::string& file_path) = 0;
    
    /**
     * @brief Check if parser supports the given data
     * @param data Document data
     * @return True if supported
     */
    virtual bool supportsData(const std::vector<uint8_t>& data) = 0;
};

/**
 * @brief PDF document parser
 */
class PdfParser : public IDocumentParser {
public:
    /**
     * @brief Constructor
     */
    PdfParser();
    
    /**
     * @brief Destructor
     */
    ~PdfParser() override;
    
    /**
     * @brief Parse PDF file
     * @param file_path File path
     * @param options Parser options
     * @return Parsed document content or nullopt if parsing failed
     */
    std::optional<DocumentContent> parseFile(
        const std::string& file_path,
        const ParserOptions& options = ParserOptions()
    ) override;
    
    /**
     * @brief Parse PDF data
     * @param data Document data
     * @param options Parser options
     * @return Parsed document content or nullopt if parsing failed
     */
    std::optional<DocumentContent> parseData(
        const std::vector<uint8_t>& data,
        const ParserOptions& options = ParserOptions()
    ) override;
    
    /**
     * @brief Get supported document type
     * @return Document type
     */
    DocumentType getDocumentType() const override {
        return DocumentType::PDF;
    }
    
    /**
     * @brief Check if parser supports the given file
     * @param file_path File path
     * @return True if supported
     */
    bool supportsFile(const std::string& file_path) override;
    
    /**
     * @brief Check if parser supports the given data
     * @param data Document data
     * @return True if supported
     */
    bool supportsData(const std::vector<uint8_t>& data) override;
    
private:
    /**
     * @brief Extract text from PDF
     * @param doc PDF document
     * @param options Parser options
     * @return Document content
     */
    DocumentContent extractContent(void* doc, const ParserOptions& options);
    
    /**
     * @brief Extract metadata from PDF
     * @param doc PDF document
     * @return Metadata
     */
    std::map<std::string, std::string> extractMetadata(void* doc);
    
    /**
     * @brief Extract tables from PDF
     * @param doc PDF document
     * @return Tables
     */
    std::vector<std::map<std::string, std::string>> extractTables(void* doc);
};

/**
 * @brief DOCX document parser
 */
class DocxParser : public IDocumentParser {
public:
    /**
     * @brief Constructor
     */
    DocxParser();
    
    /**
     * @brief Destructor
     */
    ~DocxParser() override;
    
    /**
     * @brief Parse DOCX file
     * @param file_path File path
     * @param options Parser options
     * @return Parsed document content or nullopt if parsing failed
     */
    std::optional<DocumentContent> parseFile(
        const std::string& file_path,
        const ParserOptions& options = ParserOptions()
    ) override;
    
    /**
     * @brief Parse DOCX data
     * @param data Document data
     * @param options Parser options
     * @return Parsed document content or nullopt if parsing failed
     */
    std::optional<DocumentContent> parseData(
        const std::vector<uint8_t>& data,
        const ParserOptions& options = ParserOptions()
    ) override;
    
    /**
     * @brief Get supported document type
     * @return Document type
     */
    DocumentType getDocumentType() const override {
        return DocumentType::DOCX;
    }
    
    /**
     * @brief Check if parser supports the given file
     * @param file_path File path
     * @return True if supported
     */
    bool supportsFile(const std::string& file_path) override;
    
    /**
     * @brief Check if parser supports the given data
     * @param data Document data
     * @return True if supported
     */
    bool supportsData(const std::vector<uint8_t>& data) override;
    
private:
    /**
     * @brief Extract content from DOCX
     * @param doc DOCX document
     * @param options Parser options
     * @return Document content
     */
    DocumentContent extractContent(void* doc, const ParserOptions& options);
    
    /**
     * @brief Extract metadata from DOCX
     * @param doc DOCX document
     * @return Metadata
     */
    std::map<std::string, std::string> extractMetadata(void* doc);
    
    /**
     * @brief Extract tables from DOCX
     * @param doc DOCX document
     * @return Tables
     */
    std::vector<std::map<std::string, std::string>> extractTables(void* doc);
};

/**
 * @brief HTML document parser
 */
class HtmlParser : public IDocumentParser {
public:
    /**
     * @brief Constructor
     */
    HtmlParser();
    
    /**
     * @brief Destructor
     */
    ~HtmlParser() override;
    
    /**
     * @brief Parse HTML file
     * @param file_path File path
     * @param options Parser options
     * @return Parsed document content or nullopt if parsing failed
     */
    std::optional<DocumentContent> parseFile(
        const std::string& file_path,
        const ParserOptions& options = ParserOptions()
    ) override;
    
    /**
     * @brief Parse HTML data
     * @param data Document data
     * @param options Parser options
     * @return Parsed document content or nullopt if parsing failed
     */
    std::optional<DocumentContent> parseData(
        const std::vector<uint8_t>& data,
        const ParserOptions& options = ParserOptions()
    ) override;
    
    /**
     * @brief Get supported document type
     * @return Document type
     */
    DocumentType getDocumentType() const override {
        return DocumentType::HTML;
    }
    
    /**
     * @brief Check if parser supports the given file
     * @param file_path File path
     * @return True if supported
     */
    bool supportsFile(const std::string& file_path) override;
    
    /**
     * @brief Check if parser supports the given data
     * @param data Document data
     * @return True if supported
     */
    bool supportsData(const std::vector<uint8_t>& data) override;
    
private:
    /**
     * @brief Extract content from HTML
     * @param doc HTML document
     * @param options Parser options
     * @return Document content
     */
    DocumentContent extractContent(void* doc, const ParserOptions& options);
    
    /**
     * @brief Extract metadata from HTML
     * @param doc HTML document
     * @return Metadata
     */
    std::map<std::string, std::string> extractMetadata(void* doc);
    
    /**
     * @brief Extract tables from HTML
     * @param doc HTML document
     * @return Tables
     */
    std::vector<std::map<std::string, std::string>> extractTables(void* doc);
    
    /**
     * @brief Extract links from HTML
     * @param doc HTML document
     * @return Links
     */
    std::vector<std::string> extractLinks(void* doc);
};

/**
 * @brief Document parser factory
 */
class DocumentParserFactory {
public:
    /**
     * @brief Get the singleton instance
     * @return Factory instance
     */
    static DocumentParserFactory& getInstance();
    
    /**
     * @brief Register a parser type
     * @tparam T Parser type
     */
    template<typename T>
    void registerParser() {
        auto parser = std::make_unique<T>();
        parsers_[parser->getDocumentType()] = std::move(parser);
    }
    
    /**
     * @brief Get parser for document type
     * @param type Document type
     * @return Parser or nullptr if not found
     */
    std::shared_ptr<IDocumentParser> getParser(DocumentType type);
    
    /**
     * @brief Get parser for file
     * @param file_path File path
     * @return Parser or nullptr if not found
     */
    std::shared_ptr<IDocumentParser> getParserForFile(const std::string& file_path);
    
    /**
     * @brief Get parser for data
     * @param data Document data
     * @return Parser or nullptr if not found
     */
    std::shared_ptr<IDocumentParser> getParserForData(const std::vector<uint8_t>& data);
    
private:
    DocumentParserFactory();
    ~DocumentParserFactory() = default;
    
    DocumentParserFactory(const DocumentParserFactory&) = delete;
    DocumentParserFactory& operator=(const DocumentParserFactory&) = delete;
    
    std::map<DocumentType, std::unique_ptr<IDocumentParser>> parsers_;
};

} // namespace parsers
} // namespace document