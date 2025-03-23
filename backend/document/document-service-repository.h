#pragma once

#include <string>
#include <vector>
#include <memory>
#include <optional>
#include <chrono>
#include <map>
#include "document/document_model.h"
#include "persistence/database_connection.h"

namespace document {
namespace repository {

/**
 * @brief Document repository interface
 */
class IDocumentRepository {
public:
    virtual ~IDocumentRepository() = default;
    
    /**
     * @brief Create a document
     * @param document Document to create
     * @return Created document ID or empty string if failed
     */
    virtual std::string createDocument(const Document& document) = 0;
    
    /**
     * @brief Get a document by ID
     * @param document_id Document ID
     * @param include_content Whether to include document content
     * @return Document or nullopt if not found
     */
    virtual std::optional<Document> getDocument(
        const std::string& document_id,
        bool include_content = false
    ) = 0;
    
    /**
     * @brief Update a document
     * @param document Document to update
     * @return True if updated, false if not found
     */
    virtual bool updateDocument(const Document& document) = 0;
    
    /**
     * @brief Delete a document
     * @param document_id Document ID
     * @param permanently Whether to permanently delete
     * @return True if deleted, false if not found
     */
    virtual bool deleteDocument(
        const std::string& document_id,
        bool permanently = false
    ) = 0;
    
    /**
     * @brief List documents matching criteria
     * @param author_id Author ID (optional)
     * @param document_type Document type (optional)
     * @param status Document status (optional)
     * @param category Category (optional)
     * @param tags Tags (optional)
     * @param start_date Start date (optional)
     * @param end_date End date (optional)
     * @param query Search query (optional)
     * @param page Page number (starting from 1)
     * @param page_size Page size
     * @param sort_by Sort field
     * @param ascending Sort direction
     * @return Pair of document summaries and total count
     */
    virtual std::pair<std::vector<DocumentSummary>, int> listDocuments(
        const std::optional<std::string>& author_id = std::nullopt,
        const std::optional<DocumentType>& document_type = std::nullopt,
        const std::optional<DocumentStatus>& status = std::nullopt,
        const std::optional<std::string>& category = std::nullopt,
        const std::optional<std::vector<std::string>>& tags = std::nullopt,
        const std::optional<std::chrono::system_clock::time_point>& start_date = std::nullopt,
        const std::optional<std::chrono::system_clock::time_point>& end_date = std::nullopt,
        const std::optional<std::string>& query = std::nullopt,
        int page = 1,
        int page_size = 10,
        const std::string& sort_by = "updated_at",
        bool ascending = false
    ) = 0;
    
    /**
     * @brief Store document content
     * @param document_id Document ID
     * @param content Document content
     * @param version Version
     * @return True if stored successfully
     */
    virtual bool storeContent(
        const std::string& document_id,
        const std::vector<uint8_t>& content,
        const std::string& version = "latest"
    ) = 0;
    
    /**
     * @brief Get document content
     * @param document_id Document ID
     * @param version Version (optional)
     * @return Document content or empty vector if not found
     */
    virtual std::vector<uint8_t> getContent(
        const std::string& document_id,
        const std::string& version = "latest"
    ) = 0;
    
    /**
     * @brief Store extracted text
     * @param document_id Document ID
     * @param text Extracted text
     * @return True if stored successfully
     */
    virtual bool storeExtractedText(
        const std::string& document_id,
        const std::string& text
    ) = 0;
    
    /**
     * @brief Get extracted text
     * @param document_id Document ID
     * @return Extracted text or empty string if not found
     */
    virtual std::string getExtractedText(const std::string& document_id) = 0;
    
    /**
     * @brief Store metadata
     * @param document_id Document ID
     * @param metadata Metadata
     * @return True if stored successfully
     */
    virtual bool storeMetadata(
        const std::string& document_id,
        const std::map<std::string, std::string>& metadata
    ) = 0;
    
    /**
     * @brief Get metadata
     * @param document_id Document ID
     * @return Metadata or empty map if not found
     */
    virtual std::map<std::string, std::string> getMetadata(const std::string& document_id) = 0;
    
    /**
     * @brief Create document version
     * @param document_id Document ID
     * @param version Version
     * @param author_id Author ID
     * @param comment Comment
     * @param content Document content
     * @return True if created successfully
     */
    virtual bool createVersion(
        const std::string& document_id,
        const std::string& version,
        const std::string& author_id,
        const std::string& comment,
        const std::vector<uint8_t>& content
    ) = 0;
    
    /**
     * @brief Get document version
     * @param document_id Document ID
     * @param version Version
     * @param include_content Whether to include document content
     * @return Document or nullopt if not found
     */
    virtual std::optional<Document> getVersion(
        const std::string& document_id,
        const std::string& version,
        bool include_content = false
    ) = 0;
    
    /**
     * @brief List document versions
     * @param document_id Document ID
     * @param page Page number (starting from 1)
     * @param page_size Page size
     * @return Pair of version info and total count
     */
    virtual std::pair<std::vector<VersionInfo>, int> listVersions(
        const std::string& document_id,
        int page = 1,
        int page_size = 10
    ) = 0;
    
    /**
     * @brief Search documents
     * @param query Search query
     * @param document_ids Document IDs to search (optional)
     * @param category Category (optional)
     * @param tags Tags (optional)
     * @param document_type Document type (optional)
     * @param page Page number (starting from 1)
     * @param page_size Page size
     * @param highlight_results Whether to highlight matching text
     * @return Pair of search results and total count
     */
    virtual std::pair<std::vector<SearchResult>, int> searchDocuments(
        const std::string& query,
        const std::optional<std::vector<std::string>>& document_ids = std::nullopt,
        const std::optional<std::string>& category = std::nullopt,
        const std::optional<std::vector<std::string>>& tags = std::nullopt,
        const std::optional<DocumentType>& document_type = std::nullopt,
        int page = 1,
        int page_size = 10,
        bool highlight_results = true
    ) = 0;
};

/**
 * @brief PostgreSQL document repository implementation
 */
class PostgresDocumentRepository : public IDocumentRepository {
public:
    /**
     * @brief Constructor
     * @param db_connection Database connection
     * @param content_base_path Base path for document content storage
     */
    PostgresDocumentRepository(
        std::shared_ptr<persistence::DatabaseConnection> db_connection,
        const std::string& content_base_path = "/app/data/documents"
    );
    
    /**
     * @brief Destructor
     */
    ~PostgresDocumentRepository() override;
    
    // IDocumentRepository implementation
    std::string createDocument(const Document& document) override;
    std::optional<Document> getDocument(const std::string& document_id, bool include_content) override;
    bool updateDocument(const Document& document) override;
    bool deleteDocument(const std::string& document_id, bool permanently) override;
    std::pair<std::vector<DocumentSummary>, int> listDocuments(
        const std::optional<std::string>& author_id,
        const std::optional<DocumentType>& document_type,
        const std::optional<DocumentStatus>& status,
        const std::optional<std::string>& category,
        const std::optional<std::vector<std::string>>& tags,
        const std::optional<std::chrono::system_clock::time_point>& start_date,
        const std::optional<std::chrono::system_clock::time_point>& end_date,
        const std::optional<std::string>& query,
        int page,
        int page_size,
        const std::string& sort_by,
        bool ascending
    ) override;
    bool storeContent(
        const std::string& document_id,
        const std::vector<uint8_t>& content,
        const std::string& version
    ) override;
    std::vector<uint8_t> getContent(
        const std::string& document_id,
        const std::string& version
    ) override;
    bool storeExtractedText(
        const std::string& document_id,
        const std::string& text
    ) override;
    std::string getExtractedText(const std::string& document_id) override;
    bool storeMetadata(
        const std::string& document_id,
        const std::map<std::string, std::string>& metadata
    ) override;
    std::map<std::string, std::string> getMetadata(const std::string& document_id) override;
    bool createVersion(
        const std::string& document_id,
        const std::string& version,
        const std::string& author_id,
        const std::string& comment,
        const std::vector<uint8_t>& content
    ) override;
    std::optional<Document> getVersion(
        const std::string& document_id,
        const std::string& version,
        bool include_content
    ) override;
    std::pair<std::vector<VersionInfo>, int> listVersions(
        const std::string& document_id,
        int page,
        int page_size
    ) override;
    std::pair<std::vector<SearchResult>, int> searchDocuments(
        const std::string& query,
        const std::optional<std::vector<std::string>>& document_ids,
        const std::optional<std::string>& category,
        const std::optional<std::vector<std::string>>& tags,
        const std::optional<DocumentType>& document_type,
        int page,
        int page_size,
        bool highlight_results
    ) override;
    
private:
    /**
     * @brief Generate content path for document
     * @param document_id Document ID
     * @param version Version
     * @return Content path
     */
    std::string generateContentPath(
        const std::string& document_id,
        const std::string& version
    );
    
    /**
     * @brief Store tags for document
     * @param document_id Document ID
     * @param tags Tags
     * @param transaction Transaction
     * @return True if stored successfully
     */
    bool storeTags(
        const std::string& document_id,
        const std::vector<std::string>& tags,
        persistence::Transaction& transaction
    );
    
    /**
     * @brief Get tags for document
     * @param document_id Document ID
     * @return Tags
     */
    std::vector<std::string> getTags(const std::string& document_id);
    
    /**
     * @brief Extract document from result row
     * @param result Result
     * @param row_index Row index
     * @param include_content Whether to include content
     * @return Document
     */
    Document extractDocumentFromRow(
        const persistence::PgResult& result,
        int row_index,
        bool include_content
    );
    
    /**
     * @brief Extract document summary from result row
     * @param result Result
     * @param row_index Row index
     * @return Document summary
     */
    DocumentSummary extractSummaryFromRow(
        const persistence::PgResult& result,
        int row_index
    );
    
    /**
     * @brief Generate parameters for document query
     * @param author_id Author ID (optional)
     * @param document_type Document type (optional)
     * @param status Document status (optional)
     * @param category Category (optional)
     * @param tags Tags (optional)
     * @param start_date Start date (optional)
     * @param end_date End date (optional)
     * @param query Search query (optional)
     * @return Pair of (query conditions, parameters)
     */
    std::pair<std::string, std::vector<persistence::PgParam>> generateQueryParams(
        const std::optional<std::string>& author_id,
        const std::optional<DocumentType>& document_type,
        const std::optional<DocumentStatus>& status,
        const std::optional<std::string>& category,
        const std::optional<std::vector<std::string>>& tags,
        const std::optional<std::chrono::system_clock::time_point>& start_date,
        const std::optional<std::chrono::system_clock::time_point>& end_date,
        const std::optional<std::string>& query
    );
    
    /**
     * @brief Generate unique ID
     * @return Unique ID
     */
    std::string generateUniqueId();
    
    std::shared_ptr<persistence::DatabaseConnection> db_connection_;
    std::string content_base_path_;
};

} // namespace repository
} // namespace document