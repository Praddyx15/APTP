#include <drogon/drogon.h>
#include <json/json.h>
#include <memory>
#include <string>
#include <vector>
#include <unordered_map>
#include "nlp_client.h"  // Python NLP service client
#include "document_repository.h"
#include "knowledge_graph_builder.h"

namespace atp {
namespace document {

class DocumentIntelligenceService : public drogon::HttpController<DocumentIntelligenceService> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(DocumentIntelligenceService::processDocument, "/api/documents/process", drogon::Post);
    ADD_METHOD_TO(DocumentIntelligenceService::classifyDocument, "/api/documents/classify", drogon::Post);
    ADD_METHOD_TO(DocumentIntelligenceService::buildKnowledgeGraph, "/api/documents/knowledge-graph", drogon::Post);
    ADD_METHOD_TO(DocumentIntelligenceService::verifyCompleteness, "/api/documents/verify-completeness", drogon::Post);
    ADD_METHOD_TO(DocumentIntelligenceService::resolveReferences, "/api/documents/resolve-references", drogon::Post);
    ADD_METHOD_TO(DocumentIntelligenceService::standardizeTerminology, "/api/documents/standardize", drogon::Post);
    METHOD_LIST_END

    DocumentIntelligenceService();

    void processDocument(const drogon::HttpRequestPtr& req, 
                         std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void classifyDocument(const drogon::HttpRequestPtr& req,
                          std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void buildKnowledgeGraph(const drogon::HttpRequestPtr& req,
                             std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void verifyCompleteness(const drogon::HttpRequestPtr& req,
                            std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void resolveReferences(const drogon::HttpRequestPtr& req,
                           std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    
    void standardizeTerminology(const drogon::HttpRequestPtr& req,
                                std::function<void(const drogon::HttpResponsePtr&)>&& callback);

private:
    std::shared_ptr<NLPClient> nlpClient_;
    std::shared_ptr<DocumentRepository> docRepo_;
    std::shared_ptr<KnowledgeGraphBuilder> kgBuilder_;
    
    // Context-aware parsing configurations for different document types
    std::unordered_map<std::string, std::string> parsingConfigs_;
    
    // Caches for improved performance
    drogon::CacheMap<std::string, std::string> documentClassCache_;
    
    // Helper methods
    Json::Value extractStructuredContent(const std::string& content, const std::string& docType);
    std::vector<std::string> detectLanguage(const std::string& content);
    Json::Value translateContent(const std::string& content, const std::string& targetLanguage);
    bool validateAgainstRegulations(const Json::Value& document, const std::string& regulationType);
};

DocumentIntelligenceService::DocumentIntelligenceService() {
    // Initialize NLP client connection to Python service
    nlpClient_ = std::make_shared<NLPClient>("localhost", 5000);
    docRepo_ = std::make_shared<DocumentRepository>();
    kgBuilder_ = std::make_shared<KnowledgeGraphBuilder>();
    
    // Initialize parsing configurations for different document types
    parsingConfigs_["operations_manual"] = "aviation.ops_manual.config";
    parsingConfigs_["training_syllabus"] = "aviation.training.syllabus.config";
    parsingConfigs_["regulatory_document"] = "aviation.regulatory.config";
    parsingConfigs_["technical_manual"] = "aviation.technical.config";
}

void DocumentIntelligenceService::processDocument(const drogon::HttpRequestPtr& req, 
                       std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    std::string documentId = (*json)["document_id"].asString();
    std::string content = (*json)["content"].asString();
    
    // Detect document language
    auto languages = detectLanguage(content);
    std::string primaryLanguage = languages.empty() ? "en" : languages[0];
    
    // Standardize to English if not already
    std::string processedContent = content;
    if (primaryLanguage != "en") {
        Json::Value translatedContent = translateContent(content, "en");
        processedContent = translatedContent["translated_text"].asString();
    }
    
    // First classify the document
    auto classification = nlpClient_->classifyDocument(processedContent);
    std::string docType = classification["document_type"].asString();
    
    // Then extract structured content based on document type
    auto structuredContent = extractStructuredContent(processedContent, docType);
    
    // Store results
    docRepo_->storeProcessedDocument(documentId, structuredContent);
    
    // Prepare response
    Json::Value result;
    result["document_id"] = documentId;
    result["document_type"] = docType;
    result["language"] = primaryLanguage;
    result["structure"] = structuredContent;
    
    auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
    callback(resp);
}

void DocumentIntelligenceService::buildKnowledgeGraph(const drogon::HttpRequestPtr& req,
                             std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    std::vector<std::string> documentIds;
    for (const auto& id : (*json)["document_ids"]) {
        documentIds.push_back(id.asString());
    }
    
    // Load all documents
    std::vector<Json::Value> documents;
    for (const auto& id : documentIds) {
        documents.push_back(docRepo_->getProcessedDocument(id));
    }
    
    // Build knowledge graph
    auto knowledgeGraph = kgBuilder_->buildGraph(documents);
    
    // Store the knowledge graph
    std::string graphId = kgBuilder_->storeGraph(knowledgeGraph);
    
    // Prepare response
    Json::Value result;
    result["graph_id"] = graphId;
    result["node_count"] = knowledgeGraph["nodes"].size();
    result["edge_count"] = knowledgeGraph["edges"].size();
    result["document_count"] = documents.size();
    
    auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
    callback(resp);
}

void DocumentIntelligenceService::verifyCompleteness(const drogon::HttpRequestPtr& req,
                            std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k400BadRequest);
        callback(resp);
        return;
    }
    
    std::string documentId = (*json)["document_id"].asString();
    std::string regulationType = (*json)["regulation_type"].asString(); // e.g., "EASA", "FAA"
    
    // Get the processed document
    auto document = docRepo_->getProcessedDocument(documentId);
    
    // Validate against regulatory requirements
    bool isComplete = validateAgainstRegulations(document, regulationType);
    
    // Get missing sections if not complete
    Json::Value missingItems;
    if (!isComplete) {
        missingItems = nlpClient_->identifyMissingItems(document, regulationType);
    }
    
    // Prepare response
    Json::Value result;
    result["document_id"] = documentId;
    result["regulation_type"] = regulationType;
    result["is_complete"] = isComplete;
    if (!isComplete) {
        result["missing_items"] = missingItems;
    }
    
    auto resp = drogon::HttpResponse::newHttpJsonResponse(result);
    callback(resp);
}

// Helper method implementations
Json::Value DocumentIntelligenceService::extractStructuredContent(const std::string& content, const std::string& docType) {
    std::string configPath = parsingConfigs_.find(docType) != parsingConfigs_.end() 
                        ? parsingConfigs_[docType] 
                        : "default.config";
    
    return nlpClient_->extractStructure(content, configPath);
}

std::vector<std::string> DocumentIntelligenceService::detectLanguage(const std::string& content) {
    Json::Value result = nlpClient_->detectLanguage(content);
    
    std::vector<std::string> languages;
    for (const auto& lang : result["languages"]) {
        languages.push_back(lang.asString());
    }
    
    return languages;
}

Json::Value DocumentIntelligenceService::translateContent(const std::string& content, const std::string& targetLanguage) {
    return nlpClient_->translate(content, targetLanguage);
}

bool DocumentIntelligenceService::validateAgainstRegulations(const Json::Value& document, const std::string& regulationType) {
    Json::Value validationResult = nlpClient_->validateCompliance(document, regulationType);
    return validationResult["is_compliant"].asBool();
}

} // namespace document
} // namespace atp

// Main application setup
int main() {
    // Configure Drogon app
    drogon::app().setLogPath("./")
                 .setLogLevel(trantor::Logger::kInfo)
                 .addListener("0.0.0.0", 8080)
                 .setThreadNum(16)
                 .run();
    
    return 0;
}
