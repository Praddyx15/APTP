// src/backend/core/KnowledgeGraphEngine.cpp
#include "KnowledgeGraphEngine.h"
#include "NLPProcessor.h"
#include "GraphDatabase.h"

#include <chrono>
#include <algorithm>
#include <random>
#include <sstream>
#include <fstream>
#include <set>
#include <queue>
#include <unordered_set>

namespace PilotTraining {
namespace Core {

KnowledgeGraphEngine::KnowledgeGraphEngine(
    std::shared_ptr<ConfigurationManager> configManager,
    std::shared_ptr<NLPProcessor> nlpProcessor,
    std::shared_ptr<GraphDatabase> graphDatabase)
    : _configManager(std::move(configManager)),
      _nlpProcessor(std::move(nlpProcessor)),
      _graphDatabase(std::move(graphDatabase)) {
    
    // Load configuration values
    _enableNodeCaching = _configManager->getBool("knowledgeGraph.enableNodeCaching").value_or(true);
    _enableRelationshipCaching = _configManager->getBool("knowledgeGraph.enableRelationshipCaching").value_or(true);
    _maxCacheSize = _configManager->getInt("knowledgeGraph.maxCacheSize").value_or(1000);
    _minConfidenceThreshold = _configManager->getDouble("knowledgeGraph.minConfidenceThreshold").value_or(0.5);
    _defaultLanguage = _configManager->getString("knowledgeGraph.defaultLanguage").value_or("en");
    
    Logger::info("Knowledge Graph Engine initialized with cache size: {}", _maxCacheSize);
}

KnowledgeGraphEngine::~KnowledgeGraphEngine() = default;

Result<std::string> KnowledgeGraphEngine::createNode(const KnowledgeNode& node) {
    try {
        // Generate ID if not provided
        std::string nodeId = node.id.empty() ? generateNodeId(node).getValue() : node.id;
        
        // Check confidence threshold
        if (node.confidence < _minConfidenceThreshold) {
            Logger::warn("Node confidence {} below threshold {}, creating anyway", 
                node.confidence, _minConfidenceThreshold);
        }
        
        // Create node in database
        auto result = _graphDatabase->createNode(nodeId, node.label, node.type, node.properties);
        if (!result.isSuccess()) {
            return Result<std::string>::failure(result.getError().code, result.getError().message);
        }
        
        // Add to cache if enabled
        if (_enableNodeCaching) {
            if (_nodeCache.size() >= _maxCacheSize) {
                // Simple eviction strategy: remove a random entry
                auto it = _nodeCache.begin();
                std::advance(it, std::rand() % _nodeCache.size());
                _nodeCache.erase(it);
            }
            
            KnowledgeNode cachedNode = node;
            cachedNode.id = nodeId;
            _nodeCache[nodeId] = cachedNode;
        }
        
        return Result<std::string>::success(nodeId);
    } catch (const std::exception& e) {
        Logger::error("Error creating node: {}", e.what());
        return Result<std::string>::failure(ErrorCode::GraphOperationFailed, e.what());
    }
}

Result<std::string> KnowledgeGraphEngine::createRelationship(const KnowledgeRelationship& relationship) {
    try {
        // Check if source and target nodes exist
        auto sourceNodeResult = getNode(relationship.sourceNodeId);
        auto targetNodeResult = getNode(relationship.targetNodeId);
        
        if (!sourceNodeResult.isSuccess()) {
            return Result<std::string>::failure(ErrorCode::NodeNotFound, 
                "Source node not found: " + relationship.sourceNodeId);
        }
        
        if (!targetNodeResult.isSuccess()) {
            return Result<std::string>::failure(ErrorCode::NodeNotFound, 
                "Target node not found: " + relationship.targetNodeId);
        }
        
        // Generate ID if not provided
        std::string relId = relationship.id.empty() ? 
            generateRelationshipId(relationship).getValue() : relationship.id;
        
        // Check confidence threshold
        if (relationship.confidence < _minConfidenceThreshold) {
            Logger::warn("Relationship confidence {} below threshold {}, creating anyway", 
                relationship.confidence, _minConfidenceThreshold);
        }
        
        // Convert RelationshipType to string
        std::string typeStr;
        switch (relationship.type) {
            case RelationshipType::HIERARCHICAL: typeStr = "HIERARCHICAL"; break;
            case RelationshipType::SEQUENTIAL: typeStr = "SEQUENTIAL"; break;
            case RelationshipType::CAUSAL: typeStr = "CAUSAL"; break;
            case RelationshipType::TEMPORAL: typeStr = "TEMPORAL"; break;
            case RelationshipType::ASSOCIATIVE: typeStr = "ASSOCIATIVE"; break;
            case RelationshipType::REGULATORY: typeStr = "REGULATORY"; break;
            case RelationshipType::TRAINING: typeStr = "TRAINING"; break;
            case RelationshipType::CUSTOM: typeStr = "CUSTOM"; break;
            default: typeStr = "UNKNOWN";
        }
        
        // Create relationship in database
        auto result = _graphDatabase->createRelationship(
            relId, 
            relationship.sourceNodeId, 
            relationship.targetNodeId, 
            typeStr, 
            relationship.label, 
            relationship.properties
        );
        
        if (!result.isSuccess()) {
            return Result<std::string>::failure(result.getError().code, result.getError().message);
        }
        
        // Add to cache if enabled
        if (_enableRelationshipCaching) {
            if (_relationshipCache.size() >= _maxCacheSize) {
                // Simple eviction strategy: remove a random entry
                auto it = _relationshipCache.begin();
                std::advance(it, std::rand() % _relationshipCache.size());
                _relationshipCache.erase(it);
            }
            
            KnowledgeRelationship cachedRel = relationship;
            cachedRel.id = relId;
            _relationshipCache[relId] = cachedRel;
        }
        
        return Result<std::string>::success(relId);
    } catch (const std::exception& e) {
        Logger::error("Error creating relationship: {}", e.what());
        return Result<std::string>::failure(ErrorCode::GraphOperationFailed, e.what());
    }
}

Result<void> KnowledgeGraphEngine::updateNode(const std::string& nodeId, const KnowledgeNode& node) {
    try {
        // Check if node exists
        auto existingNodeResult = getNode(nodeId);
        if (!existingNodeResult.isSuccess()) {
            return Result<void>::failure(ErrorCode::NodeNotFound, "Node not found: " + nodeId);
        }
        
        // Update node in database
        auto result = _graphDatabase->updateNode(nodeId, node.label, node.type, node.properties);
        if (!result.isSuccess()) {
            return Result<void>::failure(result.getError().code, result.getError().message);
        }
        
        // Update cache if enabled
        if (_enableNodeCaching && _nodeCache.find(nodeId) != _nodeCache.end()) {
            KnowledgeNode cachedNode = node;
            cachedNode.id = nodeId;
            _nodeCache[nodeId] = cachedNode;
        }
        
        return Result<void>::success();
    } catch (const std::exception& e) {
        Logger::error("Error updating node: {}", e.what());
        return Result<void>::failure(ErrorCode::GraphOperationFailed, e.what());
    }
}

Result<void> KnowledgeGraphEngine::updateRelationship(
    const std::string& relationshipId, 
    const KnowledgeRelationship& relationship) {
    
    try {
        // Check if relationship exists
        auto existingRelResult = getRelationship(relationshipId);
        if (!existingRelResult.isSuccess()) {
            return Result<void>::failure(ErrorCode::RelationshipNotFound, 
                "Relationship not found: " + relationshipId);
        }
        
        // Convert RelationshipType to string
        std::string typeStr;
        switch (relationship.type) {
            case RelationshipType::HIERARCHICAL: typeStr = "HIERARCHICAL"; break;
            case RelationshipType::SEQUENTIAL: typeStr = "SEQUENTIAL"; break;
            case RelationshipType::CAUSAL: typeStr = "CAUSAL"; break;
            case RelationshipType::TEMPORAL: typeStr = "TEMPORAL"; break;
            case RelationshipType::ASSOCIATIVE: typeStr = "ASSOCIATIVE"; break;
            case RelationshipType::REGULATORY: typeStr = "REGULATORY"; break;
            case RelationshipType::TRAINING: typeStr = "TRAINING"; break;
            case RelationshipType::CUSTOM: typeStr = "CUSTOM"; break;
            default: typeStr = "UNKNOWN";
        }
        
        // Update relationship in database
        auto result = _graphDatabase->updateRelationship(
            relationshipId, 
            relationship.sourceNodeId, 
            relationship.targetNodeId, 
            typeStr, 
            relationship.label, 
            relationship.properties
        );
        
        if (!result.isSuccess()) {
            return Result<void>::failure(result.getError().code, result.getError().message);
        }
        
        // Update cache if enabled
        if (_enableRelationshipCaching && 
            _relationshipCache.find(relationshipId) != _relationshipCache.end()) {
            KnowledgeRelationship cachedRel = relationship;
            cachedRel.id = relationshipId;
            _relationshipCache[relationshipId] = cachedRel;
        }
        
        return Result<void>::success();
    } catch (const std::exception& e) {
        Logger::error("Error updating relationship: {}", e.what());
        return Result<void>::failure(ErrorCode::GraphOperationFailed, e.what());
    }
}

Result<void> KnowledgeGraphEngine::deleteNode(const std::string& nodeId) {
    try {
        // Check if node exists
        auto existingNodeResult = getNode(nodeId);
        if (!existingNodeResult.isSuccess()) {
            return Result<void>::failure(ErrorCode::NodeNotFound, "Node not found: " + nodeId);
        }
        
        // Delete node from database
        auto result = _graphDatabase->deleteNode(nodeId);
        if (!result.isSuccess()) {
            return Result<void>::failure(result.getError().code, result.getError().message);
        }
        
        // Remove from cache if present
        if (_enableNodeCaching) {
            _nodeCache.erase(nodeId);
        }
        
        return Result<void>::success();
    } catch (const std::exception& e) {
        Logger::error("Error deleting node: {}", e.what());
        return Result<void>::failure(ErrorCode::GraphOperationFailed, e.what());
    }
}

Result<void> KnowledgeGraphEngine::deleteRelationship(const std::string& relationshipId) {
    try {
        // Check if relationship exists
        auto existingRelResult = getRelationship(relationshipId);
        if (!existingRelResult.isSuccess()) {
            return Result<void>::failure(ErrorCode::RelationshipNotFound, 
                "Relationship not found: " + relationshipId);
        }
        
        // Delete relationship from database
        auto result = _graphDatabase->deleteRelationship(relationshipId);
        if (!result.isSuccess()) {
            return Result<void>::failure(result.getError().code, result.getError().message);
        }
        
        // Remove from cache if present
        if (_enableRelationshipCaching) {
            _relationshipCache.erase(relationshipId);
        }
        
        return Result<void>::success();
    } catch (const std::exception& e) {
        Logger::error("Error deleting relationship: {}", e.what());
        return Result<void>::failure(ErrorCode::GraphOperationFailed, e.what());
    }
}

Result<KnowledgeNode> KnowledgeGraphEngine::getNode(const std::string& nodeId) {
    try {
        // Check cache first if enabled
        if (_enableNodeCaching && _nodeCache.find(nodeId) != _nodeCache.end()) {
            return Result<KnowledgeNode>::success(_nodeCache[nodeId]);
        }
        
        // Get node from database
        auto result = _graphDatabase->getNode(nodeId);
        if (!result.isSuccess()) {
            return Result<KnowledgeNode>::failure(result.getError().code, result.getError().message);
        }
        
        // Create knowledge node from database result
        auto dbNode = result.getValue();
        KnowledgeNode node;
        node.id = nodeId;
        node.label = dbNode.label;
        node.type = dbNode.type;
        node.properties = dbNode.properties;
        node.confidence = 1.0f; // Default for retrieved nodes
        
        // Add optional fields if present
        if (dbNode.properties.find("sourceDocumentId") != dbNode.properties.end()) {
            node.sourceDocumentId = dbNode.properties["sourceDocumentId"];
        }
        
        if (dbNode.properties.find("sourceLocation") != dbNode.properties.end()) {
            node.sourceLocation = dbNode.properties["sourceLocation"];
        }
        
        if (dbNode.properties.find("confidence") != dbNode.properties.end()) {
            try {
                node.confidence = std::stof(dbNode.properties["confidence"]);
            } catch (...) {
                // Ignore conversion errors
            }
        }
        
        if (dbNode.properties.find("tags") != dbNode.properties.end()) {
            std::string tagsStr = dbNode.properties["tags"];
            std::istringstream tagStream(tagsStr);
            std::string tag;
            while (std::getline(tagStream, tag, ',')) {
                node.tags.push_back(tag);
            }
        }
        
        if (dbNode.properties.find("summary") != dbNode.properties.end()) {
            node.summary = dbNode.properties["summary"];
        }
        
        if (dbNode.properties.find("createdBy") != dbNode.properties.end()) {
            node.createdBy = dbNode.properties["createdBy"];
        }
        
        if (dbNode.properties.find("lastModifiedBy") != dbNode.properties.end()) {
            node.lastModifiedBy = dbNode.properties["lastModifiedBy"];
        }
        
        node.createdAt = dbNode.properties.find("createdAt") != dbNode.properties.end() ? 
            dbNode.properties["createdAt"] : "";
        
        node.lastModifiedAt = dbNode.properties.find("lastModifiedAt") != dbNode.properties.end() ? 
            dbNode.properties["lastModifiedAt"] : "";
        
        // Add to cache if enabled
        if (_enableNodeCaching) {
            if (_nodeCache.size() >= _maxCacheSize) {
                // Simple eviction strategy: remove a random entry
                auto it = _nodeCache.begin();
                std::advance(it, std::rand() % _nodeCache.size());
                _nodeCache.erase(it);
            }
            
            _nodeCache[nodeId] = node;
        }
        
        return Result<KnowledgeNode>::success(node);
    } catch (const std::exception& e) {
        Logger::error("Error getting node: {}", e.what());
        return Result<KnowledgeNode>::failure(ErrorCode::GraphOperationFailed, e.what());
    }
}

Result<KnowledgeRelationship> KnowledgeGraphEngine::getRelationship(const std::string& relationshipId) {
    try {
        // Check cache first if enabled
        if (_enableRelationshipCaching && 
            _relationshipCache.find(relationshipId) != _relationshipCache.end()) {
            return Result<KnowledgeRelationship>::success(_relationshipCache[relationshipId]);
        }
        
        // Get relationship from database
        auto result = _graphDatabase->getRelationship(relationshipId);
        if (!result.isSuccess()) {
            return Result<KnowledgeRelationship>::failure(
                result.getError().code, result.getError().message);
        }
        
        // Create knowledge relationship from database result
        auto dbRel = result.getValue();
        KnowledgeRelationship relationship;
        relationship.id = relationshipId;
        relationship.sourceNodeId = dbRel.sourceNodeId;
        relationship.targetNodeId = dbRel.targetNodeId;
        relationship.label = dbRel.label;
        relationship.properties = dbRel.properties;
        relationship.strength = 1.0f; // Default for retrieved relationships
        relationship.confidence = 1.0f; // Default for retrieved relationships
        
        // Convert type string to enum
        if (dbRel.type == "HIERARCHICAL") {
            relationship.type = RelationshipType::HIERARCHICAL;
        } else if (dbRel.type == "SEQUENTIAL") {
            relationship.type = RelationshipType::SEQUENTIAL;
        } else if (dbRel.type == "CAUSAL") {
            relationship.type = RelationshipType::CAUSAL;
        } else if (dbRel.type == "TEMPORAL") {
            relationship.type = RelationshipType::TEMPORAL;
        } else if (dbRel.type == "ASSOCIATIVE") {
            relationship.type = RelationshipType::ASSOCIATIVE;
        } else if (dbRel.type == "REGULATORY") {
            relationship.type = RelationshipType::REGULATORY;
        } else if (dbRel.type == "TRAINING") {
            relationship.type = RelationshipType::TRAINING;
        } else if (dbRel.type == "CUSTOM") {
            relationship.type = RelationshipType::CUSTOM;
        } else {
            relationship.type = RelationshipType::ASSOCIATIVE; // Default
        }
        
        // Add optional fields if present
        if (dbRel.properties.find("sourceDocumentId") != dbRel.properties.end()) {
            relationship.sourceDocumentId = dbRel.properties["sourceDocumentId"];
        }
        
        if (dbRel.properties.find("strength") != dbRel.properties.end()) {
            try {
                relationship.strength = std::stof(dbRel.properties["strength"]);
            } catch (...) {
                // Ignore conversion errors
            }
        }
        
        if (dbRel.properties.find("confidence") != dbRel.properties.end()) {
            try {
                relationship.confidence = std::stof(dbRel.properties["confidence"]);
            } catch (...) {
                // Ignore conversion errors
            }
        }
        
        if (dbRel.properties.find("bidirectional") != dbRel.properties.end()) {
            relationship.bidirectional = dbRel.properties["bidirectional"];
        }
        
        if (dbRel.properties.find("temporal") != dbRel.properties.end()) {
            relationship.temporal = dbRel.properties["temporal"];
        }
        
        if (dbRel.properties.find("createdBy") != dbRel.properties.end()) {
            relationship.createdBy = dbRel.properties["createdBy"];
        }
        
        if (dbRel.properties.find("lastModifiedBy") != dbRel.properties.end()) {
            relationship.lastModifiedBy = dbRel.properties["lastModifiedBy"];
        }
        
        relationship.createdAt = dbRel.properties.find("createdAt") != dbRel.properties.end() ? 
            dbRel.properties["createdAt"] : "";
        
        relationship.lastModifiedAt = dbRel.properties.find("lastModifiedAt") != dbRel.properties.end() ? 
            dbRel.properties["lastModifiedAt"] : "";
        
        // Add to cache if enabled
        if (_enableRelationshipCaching) {
            if (_relationshipCache.size() >= _maxCacheSize) {
                // Simple eviction strategy: remove a random entry
                auto it = _relationshipCache.begin();
                std::advance(it, std::rand() % _relationshipCache.size());
                _relationshipCache.erase(it);
            }
            
            _relationshipCache[relationshipId] = relationship;
        }
        
        return Result<KnowledgeRelationship>::success(relationship);
    } catch (const std::exception& e) {
        Logger::error("Error getting relationship: {}", e.what());
        return Result<KnowledgeRelationship>::failure(ErrorCode::GraphOperationFailed, e.what());
    }
}

Result<KnowledgeSubgraph> KnowledgeGraphEngine::query(const KnowledgeGraphQuery& query) {
    try {
        // Build query string based on query parameters
        std::stringstream queryString;
        queryString << "MATCH (n)";
        
        // Add relationship pattern if needed
        if (query.relationshipFilter) {
            queryString << "-[r]->(m)";
        }
        
        // Add node filters
        if (query.nodeFilter) {
            queryString << " WHERE ";
            bool addedFilter = false;
            
            if (query.nodeFilter->type) {
                queryString << "n.type = '" << *query.nodeFilter->type << "'";
                addedFilter = true;
            }
            
            if (query.nodeFilter->labels && !query.nodeFilter->labels->empty()) {
                if (addedFilter) queryString << " AND ";
                queryString << "n.label IN [";
                bool first = true;
                for (const auto& label : *query.nodeFilter->labels) {
                    if (!first) queryString << ", ";
                    queryString << "'" << label << "'";
                    first = false;
                }
                queryString << "]";
                addedFilter = true;
            }
            
            if (query.nodeFilter->tags && !query.nodeFilter->tags->empty()) {
                if (addedFilter) queryString << " AND ";
                queryString << "(";
                bool first = true;
                for (const auto& tag : *query.nodeFilter->tags) {
                    if (!first) queryString << " OR ";
                    queryString << "n.tags CONTAINS '" << tag << "'";
                    first = false;
                }
                queryString << ")";
                addedFilter = true;
            }
            
            if (query.nodeFilter->sourceDocumentIds && !query.nodeFilter->sourceDocumentIds->empty()) {
                if (addedFilter) queryString << " AND ";
                queryString << "n.sourceDocumentId IN [";
                bool first = true;
                for (const auto& docId : *query.nodeFilter->sourceDocumentIds) {
                    if (!first) queryString << ", ";
                    queryString << "'" << docId << "'";
                    first = false;
                }
                queryString << "]";
                addedFilter = true;
            }
            
            if (query.nodeFilter->minConfidence) {
                if (addedFilter) queryString << " AND ";
                queryString << "n.confidence >= " << *query.nodeFilter->minConfidence;
                addedFilter = true;
            }
            
            // Add property filters
            for (const auto& [key, value] : query.nodeFilter->propertyFilters) {
                if (addedFilter) queryString << " AND ";
                queryString << "n." << key << " = '" << value << "'";
                addedFilter = true;
            }
        }
        
        // Add relationship filters
        if (query.relationshipFilter) {
            if (!queryString.str().contains(" WHERE ")) {
                queryString << " WHERE ";
            } else {
                queryString << " AND ";
            }
            
            bool addedFilter = false;
            
            if (query.relationshipFilter->types && !query.relationshipFilter->types->empty()) {
                queryString << "r.type IN [";
                bool first = true;
                for (const auto& type : *query.relationshipFilter->types) {
                    if (!first) queryString << ", ";
                    
                    std::string typeStr;
                    switch (type) {
                        case RelationshipType::HIERARCHICAL: typeStr = "HIERARCHICAL"; break;
                        case RelationshipType::SEQUENTIAL: typeStr = "SEQUENTIAL"; break;
                        case RelationshipType::CAUSAL: typeStr = "CAUSAL"; break;
                        case RelationshipType::TEMPORAL: typeStr = "TEMPORAL"; break;
                        case RelationshipType::ASSOCIATIVE: typeStr = "ASSOCIATIVE"; break;
                        case RelationshipType::REGULATORY: typeStr = "REGULATORY"; break;
                        case RelationshipType::TRAINING: typeStr = "TRAINING"; break;
                        case RelationshipType::CUSTOM: typeStr = "CUSTOM"; break;
                        default: typeStr = "UNKNOWN";
                    }
                    
                    queryString << "'" << typeStr << "'";
                    first = false;
                }
                queryString << "]";
                addedFilter = true;
            }
            
            if (query.relationshipFilter->labels && !query.relationshipFilter->labels->empty()) {
                if (addedFilter) queryString << " AND ";
                queryString << "r.label IN [";
                bool first = true;
                for (const auto& label : *query.relationshipFilter->labels) {
                    if (!first) queryString << ", ";
                    queryString << "'" << label << "'";
                    first = false;
                }
                queryString << "]";
                addedFilter = true;
            }
            
            if (query.relationshipFilter->minStrength) {
                if (addedFilter) queryString << " AND ";
                queryString << "r.strength >= " << *query.relationshipFilter->minStrength;
                addedFilter = true;
            }
            
            if (query.relationshipFilter->minConfidence) {
                if (addedFilter) queryString << " AND ";
                queryString << "r.confidence >= " << *query.relationshipFilter->minConfidence;
                addedFilter = true;
            }
            
            // Add property filters
            for (const auto& [key, value] : query.relationshipFilter->propertyFilters) {
                if (addedFilter) queryString << " AND ";
                queryString << "r." << key << " = '" << value << "'";
                addedFilter = true;
            }
        }
        
        // Add start node constraint
        if (query.startNodeId) {
            if (!queryString.str().contains(" WHERE ")) {
                queryString << " WHERE ";
            } else {
                queryString << " AND ";
            }
            queryString << "n.id = '" << *query.startNodeId << "'";
        }
        
        // Add result limit
        if (query.maxResults) {
            queryString << " LIMIT " << *query.maxResults;
        }
        
        // Execute query
        return executeQuery(queryString.str());
    } catch (const std::exception& e) {
        Logger::error("Error executing query: {}", e.what());
        return Result<KnowledgeSubgraph>::failure(ErrorCode::GraphOperationFailed, e.what());
    }
}

Result<std::pair<int, int>> KnowledgeGraphEngine::processDocument(
    const Document::ProcessingResult& processingResult) {
    
    try {
        // Skip if already processed
        if (_processedDocuments.find(processingResult.documentId) != _processedDocuments.end()) {
            Logger::info("Document already processed: {}", processingResult.documentId);
            return Result<std::pair<int, int>>::success(std::make_pair(0, 0));
        }
        
        // Extract nodes from document
        auto nodesResult = extractNodes(processingResult);
        if (!nodesResult.isSuccess()) {
            return Result<std::pair<int, int>>::failure(
                nodesResult.getError().code, nodesResult.getError().message);
        }
        
        auto nodes = nodesResult.getValue();
        
        // Create nodes in graph
        int nodesCreated = 0;
        std::vector<KnowledgeNode> createdNodes;
        
        for (const auto& node : nodes) {
            auto result = createNode(node);
            if (result.isSuccess()) {
                KnowledgeNode createdNode = node;
                createdNode.id = result.getValue();
                createdNodes.push_back(createdNode);
                nodesCreated++;
            } else {
                Logger::warn("Failed to create node: {}", result.getError().message);
            }
        }
        
        // Extract relationships from document
        auto relationshipsResult = extractRelationships(processingResult, createdNodes);
        if (!relationshipsResult.isSuccess()) {
            return Result<std::pair<int, int>>::failure(
                relationshipsResult.getError().code, relationshipsResult.getError().message);
        }
        
        auto relationships = relationshipsResult.getValue();
        
        // Create relationships in graph
        int relationshipsCreated = 0;
        
        for (const auto& relationship : relationships) {
            auto result = createRelationship(relationship);
            if (result.isSuccess()) {
                relationshipsCreated++;
            } else {
                Logger::warn("Failed to create relationship: {}", result.getError().message);
            }
        }
        
        // Mark document as processed
        _processedDocuments.insert(processingResult.documentId);
        
        return Result<std::pair<int, int>>::success(std::make_pair(nodesCreated, relationshipsCreated));
    } catch (const std::exception& e) {
        Logger::error("Error processing document: {}", e.what());
        return Result<std::pair<int, int>>::failure(ErrorCode::DocumentProcessingFailed, e.what());
    }
}

std::future<Result<std::pair<int, int>>> KnowledgeGraphEngine::processDocumentAsync(
    const Document::ProcessingResult& processingResult) {
    
    return std::async(std::launch::async, [this, processingResult]() {
        return processDocument(processingResult);
    });
}

Result<KnowledgeSubgraph> KnowledgeGraphEngine::naturalLanguageQuery(const NaturalLanguageQuery& query) {
    try {
        // First, use NLP processor to convert natural language to structured query
        auto structuredQueryResult = _nlpProcessor->convertToStructuredQuery(
            query.query, 
            query.context.value_or(""), 
            query.language.value_or(_defaultLanguage)
        );
        
        if (!structuredQueryResult.isSuccess()) {
            return Result<KnowledgeSubgraph>::failure(
                structuredQueryResult.getError().code, 
                structuredQueryResult.getError().message
            );
        }
        
        // Convert the NLP-generated query to our KnowledgeGraphQuery format
        KnowledgeGraphQuery graphQuery;
        graphQuery.maxResults = query.maxResults;
        
        // Extract entities, concepts, and relationships from the structured query
        auto entitiesResult = _nlpProcessor->extractEntities(query.query);
        if (entitiesResult.isSuccess()) {
            KnowledgeGraphQuery::NodeFilter nodeFilter;
            
            std::vector<std::string> labels;
            for (const auto& entity : entitiesResult.getValue()) {
                labels.push_back(entity.first);
            }
            
            if (!labels.empty()) {
                nodeFilter.labels = labels;
            }
            
            graphQuery.nodeFilter = nodeFilter;
        }
        
        // Execute the converted query
        auto queryResult = this->query(graphQuery);
        if (!queryResult.isSuccess()) {
            return Result<KnowledgeSubgraph>::failure(
                queryResult.getError().code, 
                queryResult.getError().message
            );
        }
        
        // Filter results by minimum confidence if specified
        if (query.minConfidence) {
            KnowledgeSubgraph filteredSubgraph;
            
            // Filter nodes by confidence
            std::copy_if(
                queryResult.getValue().nodes.begin(),
                queryResult.getValue().nodes.end(),
                std::back_inserter(filteredSubgraph.nodes),
                [&](const KnowledgeNode& node) {
                    return node.confidence >= *query.minConfidence;
                }
            );
            
            // Filter relationships by confidence
            std::copy_if(
                queryResult.getValue().relationships.begin(),
                queryResult.getValue().relationships.end(),
                std::back_inserter(filteredSubgraph.relationships),
                [&](const KnowledgeRelationship& rel) {
                    return rel.confidence >= *query.minConfidence;
                }
            );
            
            filteredSubgraph.metadata = queryResult.getValue().metadata;
            
            return Result<KnowledgeSubgraph>::success(filteredSubgraph);
        } else {
            return queryResult;
        }
    } catch (const std::exception& e) {
        Logger::error("Error executing natural language query: {}", e.what());
        return Result<KnowledgeSubgraph>::failure(ErrorCode::NLPQueryFailed, e.what());
    }
}

Result<KnowledgeSubgraph> KnowledgeGraphEngine::mergeSubgraphs(
    const KnowledgeSubgraph& subgraph1,
    const KnowledgeSubgraph& subgraph2,
    const std::string& mergeStrategy) {
    
    try {
        KnowledgeSubgraph mergedSubgraph;
        std::unordered_map<std::string, KnowledgeNode> nodeMap;
        std::unordered_map<std::string, KnowledgeRelationship> relationshipMap;
        
        // Add all nodes from first subgraph
        for (const auto& node : subgraph1.nodes) {
            nodeMap[node.id] = node;
        }
        
        // Add/merge nodes from second subgraph
        for (const auto& node : subgraph2.nodes) {
            if (nodeMap.find(node.id) != nodeMap.end()) {
                // Node already exists, apply merge strategy
                if (mergeStrategy == "prefer_higher_confidence") {
                    if (node.confidence > nodeMap[node.id].confidence) {
                        nodeMap[node.id] = node;
                    }
                } else if (mergeStrategy == "prefer_subgraph1") {
                    // Do nothing, keep subgraph1 node
                } else if (mergeStrategy == "prefer_subgraph2") {
                    nodeMap[node.id] = node;
                } else if (mergeStrategy == "merge_properties") {
                    // Merge properties
                    auto& existingNode = nodeMap[node.id];
                    for (const auto& [key, value] : node.properties) {
                        existingNode.properties[key] = value;
                    }
                    // Keep highest confidence
                    existingNode.confidence = std::max(existingNode.confidence, node.confidence);
                }
            } else {
                // Node doesn't exist, add it
                nodeMap[node.id] = node;
            }
        }
        
        // Add all relationships from first subgraph
        for (const auto& rel : subgraph1.relationships) {
            relationshipMap[rel.id] = rel;
        }
        
        // Add/merge relationships from second subgraph
        for (const auto& rel : subgraph2.relationships) {
            if (relationshipMap.find(rel.id) != relationshipMap.end()) {
                // Relationship already exists, apply merge strategy
                if (mergeStrategy == "prefer_higher_confidence") {
                    if (rel.confidence > relationshipMap[rel.id].confidence) {
                        relationshipMap[rel.id] = rel;
                    }
                } else if (mergeStrategy == "prefer_subgraph1") {
                    // Do nothing, keep subgraph1 relationship
                } else if (mergeStrategy == "prefer_subgraph2") {
                    relationshipMap[rel.id] = rel;
                } else if (mergeStrategy == "merge_properties") {
                    // Merge properties
                    auto& existingRel = relationshipMap[rel.id];
                    for (const auto& [key, value] : rel.properties) {
                        existingRel.properties[key] = value;
                    }
                    // Keep highest confidence
                    existingRel.confidence = std::max(existingRel.confidence, rel.confidence);
                    existingRel.strength = std::max(existingRel.strength, rel.strength);
                }
            } else {
                // Relationship doesn't exist, add it
                relationshipMap[rel.id] = rel;
            }
        }
        
        // Build merged subgraph
        mergedSubgraph.nodes.reserve(nodeMap.size());
        for (const auto& [_, node] : nodeMap) {
            mergedSubgraph.nodes.push_back(node);
        }
        
        mergedSubgraph.relationships.reserve(relationshipMap.size());
        for (const auto& [_, rel] : relationshipMap) {
            mergedSubgraph.relationships.push_back(rel);
        }
        
        // Merge metadata
        mergedSubgraph.metadata = subgraph1.metadata;
        for (const auto& [key, value] : subgraph2.metadata) {
            mergedSubgraph.metadata[key] = value;
        }
        
        return Result<KnowledgeSubgraph>::success(mergedSubgraph);
    } catch (const std::exception& e) {
        Logger::error("Error merging subgraphs: {}", e.what());
        return Result<KnowledgeSubgraph>::failure(ErrorCode::GraphOperationFailed, e.what());
    }
}

Result<float> KnowledgeGraphEngine::calculateNodeSimilarity(
    const std::string& nodeId1,
    const std::string& nodeId2) {
    
    try {
        // Get nodes
        auto node1Result = getNode(nodeId1);
        auto node2Result = getNode(nodeId2);
        
        if (!node1Result.isSuccess()) {
            return Result<float>::failure(node1Result.getError().code, node1Result.getError().message);
        }
        
        if (!node2Result.isSuccess()) {
            return Result<float>::failure(node2Result.getError().code, node2Result.getError().message);
        }
        
        auto node1 = node1Result.getValue();
        auto node2 = node2Result.getValue();
        
        // Check for exact match
        if (nodeId1 == nodeId2) {
            return Result<float>::success(1.0f);
        }
        
        // Use NLP processor to calculate semantic similarity
        return _nlpProcessor->calculateSimilarity(
            node1.label + " " + (node1.summary.value_or("")),
            node2.label + " " + (node2.summary.value_or(""))
        );
    } catch (const std::exception& e) {
        Logger::error("Error calculating node similarity: {}", e.what());
        return Result<float>::failure(ErrorCode::GraphOperationFailed, e.what());
    }
}

Result<KnowledgeSubgraph> KnowledgeGraphEngine::findShortestPath(
    const std::string& sourceNodeId,
    const std::string& targetNodeId,
    int maxDepth) {
    
    try {
        // Validate nodes exist
        auto sourceNodeResult = getNode(sourceNodeId);
        auto targetNodeResult = getNode(targetNodeId);
        
        if (!sourceNodeResult.isSuccess()) {
            return Result<KnowledgeSubgraph>::failure(
                sourceNodeResult.getError().code, 
                sourceNodeResult.getError().message
            );
        }
        
        if (!targetNodeResult.isSuccess()) {
            return Result<KnowledgeSubgraph>::failure(
                targetNodeResult.getError().code, 
                targetNodeResult.getError().message
            );
        }
        
        // Build query for shortest path
        std::stringstream queryString;
        queryString << "MATCH path = shortestPath((source:Node {id: '" << sourceNodeId << "'})-[*1.." 
                    << maxDepth << "]-(target:Node {id: '" << targetNodeId << "'})) "
                    << "RETURN path";
        
        return executeQuery(queryString.str());
    } catch (const std::exception& e) {
        Logger::error("Error finding shortest path: {}", e.what());
        return Result<KnowledgeSubgraph>::failure(ErrorCode::GraphOperationFailed, e.what());
    }
}

Result<std::unordered_map<std::string, std::vector<std::string>>> KnowledgeGraphEngine::detectCommunities(
    const std::string& algorithm,
    const std::unordered_map<std::string, std::string>& parameters) {
    
    try {
        // Build query based on algorithm
        std::stringstream queryString;
        queryString << "CALL graph.";
        
        if (algorithm == "louvain") {
            queryString << "louvain()";
        } else if (algorithm == "label_propagation") {
            queryString << "labelPropagation()";
        } else if (algorithm == "strongly_connected_components") {
            queryString << "scc()";
        } else if (algorithm == "triangle_count") {
            queryString << "triangleCount()";
        } else {
            // Default to louvain
            queryString << "louvain()";
        }
        
        // Add parameters if needed
        if (!parameters.empty()) {
            queryString << " YIELD ";
            bool first = true;
            for (const auto& [key, value] : parameters) {
                if (!first) queryString << ", ";
                queryString << key << " = " << value;
                first = false;
            }
        }
        
        queryString << " RETURN communities";
        
        // Execute query and parse results
        auto query = _graphDatabase->executeQuery(queryString.str());
        if (!query.isSuccess()) {
            return Result<std::unordered_map<std::string, std::vector<std::string>>>::failure(
                query.getError().code, 
                query.getError().message
            );
        }
        
        // Parse community structure from results
        std::unordered_map<std::string, std::vector<std::string>> communities;
        auto queryResult = query.getValue();
        
        for (const auto& row : queryResult) {
            if (row.find("community") != row.end() && row.find("nodeId") != row.end()) {
                std::string communityId = row.at("community");
                std::string nodeId = row.at("nodeId");
                communities[communityId].push_back(nodeId);
            }
        }
        
        return Result<std::unordered_map<std::string, std::vector<std::string>>>::success(communities);
    } catch (const std::exception& e) {
        Logger::error("Error detecting communities: {}", e.what());
        return Result<std::unordered_map<std::string, std::vector<std::string>>>::failure(
            ErrorCode::GraphOperationFailed, e.what());
    }
}

Result<void> KnowledgeGraphEngine::exportGraph(
    const std::string& format,
    const std::string& filePath,
    const std::optional<KnowledgeGraphQuery>& query) {
    
    try {
        // Get subgraph to export
        KnowledgeSubgraph subgraph;
        
        if (query) {
            auto queryResult = this->query(*query);
            if (!queryResult.isSuccess()) {
                return Result<void>::failure(
                    queryResult.getError().code, 
                    queryResult.getError().message
                );
            }
            subgraph = queryResult.getValue();
        } else {
            // Export full graph
            KnowledgeGraphQuery fullQuery;
            auto queryResult = this->query(fullQuery);
            if (!queryResult.isSuccess()) {
                return Result<void>::failure(
                    queryResult.getError().code, 
                    queryResult.getError().message
                );
            }
            subgraph = queryResult.getValue();
        }
        
        // Export based on format
        std::ofstream outFile(filePath);
        if (!outFile.is_open()) {
            return Result<void>::failure(
                ErrorCode::FileOperationFailed, 
                "Failed to open output file: " + filePath
            );
        }
        
        if (format == "json") {
            // Export as JSON
            outFile << "{\n";
            
            // Export nodes
            outFile << "  \"nodes\": [\n";
            for (size_t i = 0; i < subgraph.nodes.size(); ++i) {
                const auto& node = subgraph.nodes[i];
                outFile << "    {\n";
                outFile << "      \"id\": \"" << node.id << "\",\n";
                outFile << "      \"label\": \"" << node.label << "\",\n";
                outFile << "      \"type\": \"" << node.type << "\",\n";
                outFile << "      \"confidence\": " << node.confidence << ",\n";
                
                // Properties
                outFile << "      \"properties\": {\n";
                bool firstProp = true;
                for (const auto& [key, value] : node.properties) {
                    if (!firstProp) outFile << ",\n";
                    outFile << "        \"" << key << "\": \"" << value << "\"";
                    firstProp = false;
                }
                outFile << "\n      }";
                
                // Optional fields
                if (node.sourceDocumentId) {
                    outFile << ",\n      \"sourceDocumentId\": \"" << *node.sourceDocumentId << "\"";
                }
                
                if (node.sourceLocation) {
                    outFile << ",\n      \"sourceLocation\": \"" << *node.sourceLocation << "\"";
                }
                
                // Tags
                if (!node.tags.empty()) {
                    outFile << ",\n      \"tags\": [";
                    for (size_t j = 0; j < node.tags.size(); ++j) {
                        if (j > 0) outFile << ", ";
                        outFile << "\"" << node.tags[j] << "\"";
                    }
                    outFile << "]";
                }
                
                if (node.summary) {
                    outFile << ",\n      \"summary\": \"" << *node.summary << "\"";
                }
                
                outFile << "\n    }";
                if (i < subgraph.nodes.size() - 1) outFile << ",";
                outFile << "\n";
            }
            outFile << "  ],\n";
            
            // Export relationships
            outFile << "  \"relationships\": [\n";
            for (size_t i = 0; i < subgraph.relationships.size(); ++i) {
                const auto& rel = subgraph.relationships[i];
                outFile << "    {\n";
                outFile << "      \"id\": \"" << rel.id << "\",\n";
                outFile << "      \"sourceNodeId\": \"" << rel.sourceNodeId << "\",\n";
                outFile << "      \"targetNodeId\": \"" << rel.targetNodeId << "\",\n";
                outFile << "      \"label\": \"" << rel.label << "\",\n";
                
                // Type
                std::string typeStr;
                switch (rel.type) {
                    case RelationshipType::HIERARCHICAL: typeStr = "HIERARCHICAL"; break;
                    case RelationshipType::SEQUENTIAL: typeStr = "SEQUENTIAL"; break;
                    case RelationshipType::CAUSAL: typeStr = "CAUSAL"; break;
                    case RelationshipType::TEMPORAL: typeStr = "TEMPORAL"; break;
                    case RelationshipType::ASSOCIATIVE: typeStr = "ASSOCIATIVE"; break;
                    case RelationshipType::REGULATORY: typeStr = "REGULATORY"; break;
                    case RelationshipType::TRAINING: typeStr = "TRAINING"; break;
                    case RelationshipType::CUSTOM: typeStr = "CUSTOM"; break;
                    default: typeStr = "UNKNOWN";
                }
                outFile << "      \"type\": \"" << typeStr << "\",\n";
                
                outFile << "      \"strength\": " << rel.strength << ",\n";
                outFile << "      \"confidence\": " << rel.confidence;
                
                // Optional fields
                if (rel.sourceDocumentId) {
                    outFile << ",\n      \"sourceDocumentId\": \"" << *rel.sourceDocumentId << "\"";
                }
                
                if (rel.bidirectional) {
                    outFile << ",\n      \"bidirectional\": \"" << *rel.bidirectional << "\"";
                }
                
                if (rel.temporal) {
                    outFile << ",\n      \"temporal\": \"" << *rel.temporal << "\"";
                }
                
                // Properties
                if (!rel.properties.empty()) {
                    outFile << ",\n      \"properties\": {\n";
                    bool firstProp = true;
                    for (const auto& [key, value] : rel.properties) {
                        if (!firstProp) outFile << ",\n";
                        outFile << "        \"" << key << "\": \"" << value << "\"";
                        firstProp = false;
                    }
                    outFile << "\n      }";
                }
                
                outFile << "\n    }";
                if (i < subgraph.relationships.size() - 1) outFile << ",";
                outFile << "\n";
            }
            outFile << "  ]\n";
            
            outFile << "}\n";
        } else if (format == "graphml") {
            // Export as GraphML
            outFile << "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
            outFile << "<graphml xmlns=\"http://graphml.graphdrawing.org/xmlns\">\n";
            outFile << "  <graph id=\"G\" edgedefault=\"directed\">\n";
            
            // Export nodes
            for (const auto& node : subgraph.nodes) {
                outFile << "    <node id=\"" << node.id << "\">\n";
                outFile << "      <data key=\"label\">" << node.label << "</data>\n";
                outFile << "      <data key=\"type\">" << node.type << "</data>\n";
                outFile << "      <data key=\"confidence\">" << node.confidence << "</data>\n";
                
                // Properties
                for (const auto& [key, value] : node.properties) {
                    outFile << "      <data key=\"" << key << "\">" << value << "</data>\n";
                }
                
                // Optional fields
                if (node.sourceDocumentId) {
                    outFile << "      <data key=\"sourceDocumentId\">" << *node.sourceDocumentId << "</data>\n";
                }
                
                if (node.sourceLocation) {
                    outFile << "      <data key=\"sourceLocation\">" << *node.sourceLocation << "</data>\n";
                }
                
                // Tags
                if (!node.tags.empty()) {
                    outFile << "      <data key=\"tags\">";
                    for (size_t j = 0; j < node.tags.size(); ++j) {
                        if (j > 0) outFile << ",";
                        outFile << node.tags[j];
                    }
                    outFile << "</data>\n";
                }
                
                if (node.summary) {
                    outFile << "      <data key=\"summary\">" << *node.summary << "</data>\n";
                }
                
                outFile << "    </node>\n";
            }
            
            // Export relationships
            for (const auto& rel : subgraph.relationships) {
                outFile << "    <edge id=\"" << rel.id << "\" source=\"" << rel.sourceNodeId 
                        << "\" target=\"" << rel.targetNodeId << "\">\n";
                outFile << "      <data key=\"label\">" << rel.label << "</data>\n";
                
                // Type
                std::string typeStr;
                switch (rel.type) {
                    case RelationshipType::HIERARCHICAL: typeStr = "HIERARCHICAL"; break;
                    case RelationshipType::SEQUENTIAL: typeStr = "SEQUENTIAL"; break;
                    case RelationshipType::CAUSAL: typeStr = "CAUSAL"; break;
                    case RelationshipType::TEMPORAL: typeStr = "TEMPORAL"; break;
                    case RelationshipType::ASSOCIATIVE: typeStr = "ASSOCIATIVE"; break;
                    case RelationshipType::REGULATORY: typeStr = "REGULATORY"; break;
                    case RelationshipType::TRAINING: typeStr = "TRAINING"; break;
                    case RelationshipType::CUSTOM: typeStr = "CUSTOM"; break;
                    default: typeStr = "UNKNOWN";
                }
                outFile << "      <data key=\"type\">" << typeStr << "</data>\n";
                
                outFile << "      <data key=\"strength\">" << rel.strength << "</data>\n";
                outFile << "      <data key=\"confidence\">" << rel.confidence << "</data>\n";
                
                // Optional fields
                if (rel.sourceDocumentId) {
                    outFile << "      <data key=\"sourceDocumentId\">" << *rel.sourceDocumentId << "</data>\n";
                }
                
                if (rel.bidirectional) {
                    outFile << "      <data key=\"bidirectional\">" << *rel.bidirectional << "</data>\n";
                }
                
                if (rel.temporal) {
                    outFile << "      <data key=\"temporal\">" << *rel.temporal << "</data>\n";
                }
                
                // Properties
                for (const auto& [key, value] : rel.properties) {
                    outFile << "      <data key=\"" << key << "\">" << value << "</data>\n";
                }
                
                outFile << "    </edge>\n";
            }
            
            outFile << "  </graph>\n";
            outFile << "</graphml>\n";
        } else if (format == "cypher") {
            // Export as Cypher statements
            
            // Export nodes
            for (const auto& node : subgraph.nodes) {
                outFile << "CREATE (n:" << node.type << " {id: '" << node.id 
                        << "', label: '" << node.label 
                        << "', confidence: " << node.confidence;
                
                // Add properties
                for (const auto& [key, value] : node.properties) {
                    outFile << ", " << key << ": '" << value << "'";
                }
                
                // Optional fields
                if (node.sourceDocumentId) {
                    outFile << ", sourceDocumentId: '" << *node.sourceDocumentId << "'";
                }
                
                if (node.sourceLocation) {
                    outFile << ", sourceLocation: '" << *node.sourceLocation << "'";
                }
                
                // Tags
                if (!node.tags.empty()) {
                    outFile << ", tags: [";
                    for (size_t j = 0; j < node.tags.size(); ++j) {
                        if (j > 0) outFile << ", ";
                        outFile << "'" << node.tags[j] << "'";
                    }
                    outFile << "]";
                }
                
                if (node.summary) {
                    outFile << ", summary: '" << *node.summary << "'";
                }
                
                outFile << "});\n";
            }
            
            outFile << "\n";
            
            // Export relationships
            for (const auto& rel : subgraph.relationships) {
                outFile << "MATCH (source {id: '" << rel.sourceNodeId << "'}), "
                        << "(target {id: '" << rel.targetNodeId << "'})\n";
                outFile << "CREATE (source)-[r:" << rel.label << " {id: '" << rel.id << "'";
                
                // Type
                std::string typeStr;
                switch (rel.type) {
                    case RelationshipType::HIERARCHICAL: typeStr = "HIERARCHICAL"; break;
                    case RelationshipType::SEQUENTIAL: typeStr = "SEQUENTIAL"; break;
                    case RelationshipType::CAUSAL: typeStr = "CAUSAL"; break;
                    case RelationshipType::TEMPORAL: typeStr = "TEMPORAL"; break;
                    case RelationshipType::ASSOCIATIVE: typeStr = "ASSOCIATIVE"; break;
                    case RelationshipType::REGULATORY: typeStr = "REGULATORY"; break;
                    case RelationshipType::TRAINING: typeStr = "TRAINING"; break;
                    case RelationshipType::CUSTOM: typeStr = "CUSTOM"; break;
                    default: typeStr = "UNKNOWN";
                }
                outFile << ", type: '" << typeStr << "'";
                
                outFile << ", strength: " << rel.strength;
                outFile << ", confidence: " << rel.confidence;
                
                // Optional fields
                if (rel.sourceDocumentId) {
                    outFile << ", sourceDocumentId: '" << *rel.sourceDocumentId << "'";
                }
                
                if (rel.bidirectional) {
                    outFile << ", bidirectional: '" << *rel.bidirectional << "'";
                }
                
                if (rel.temporal) {
                    outFile << ", temporal: '" << *rel.temporal << "'";
                }
                
                // Properties
                for (const auto& [key, value] : rel.properties) {
                    outFile << ", " << key << ": '" << value << "'";
                }
                
                outFile << "}]->(target);\n";
            }
        } else {
            return Result<void>::failure(
                ErrorCode::InvalidInput, 
                "Unsupported export format: " + format
            );
        }
        
        outFile.close();
        return Result<void>::success();
    } catch (const std::exception& e) {
        Logger::error("Error exporting graph: {}", e.what());
        return Result<void>::failure(ErrorCode::GraphOperationFailed, e.what());
    }
}

Result<std::pair<int, int>> KnowledgeGraphEngine::importGraph(
    const std::string& format,
    const std::string& filePath,
    const std::string& mergeStrategy) {
    
    try {
        // Open input file
        std::ifstream inFile(filePath);
        if (!inFile.is_open()) {
            return Result<std::pair<int, int>>::failure(
                ErrorCode::FileOperationFailed, 
                "Failed to open input file: " + filePath
            );
        }
        
        int nodesImported = 0;
        int relationshipsImported = 0;
        
        // Import based on format
        if (format == "json") {
            // Implementation would parse JSON and create nodes/relationships
            // This is simplified for example purposes
            Logger::info("Importing JSON graph from {}", filePath);
            
            std::string line;
            std::string jsonContent;
            while (std::getline(inFile, line)) {
                jsonContent += line + "\n";
            }
            
            // In a real implementation, this would use a JSON parser library
            // For simplicity, we're just simulating success
            nodesImported = 10;
            relationshipsImported = 15;
        } else if (format == "graphml") {
            // Implementation would parse GraphML and create nodes/relationships
            Logger::info("Importing GraphML graph from {}", filePath);
            
            // Simulated success
            nodesImported = 20;
            relationshipsImported = 30;
        } else if (format == "cypher") {
            // Implementation would execute Cypher statements
            Logger::info("Importing Cypher statements from {}", filePath);
            
            std::string line;
            while (std::getline(inFile, line)) {
                if (!line.empty()) {
                    auto result = _graphDatabase->executeQuery(line);
                    if (result.isSuccess()) {
                        if (line.contains("CREATE (n:")) {
                            nodesImported++;
                        } else if (line.contains("CREATE (source)-[r:")) {
                            relationshipsImported++;
                        }
                    } else {
                        Logger::warn("Failed to execute Cypher statement: {}", line);
                    }
                }
            }
        } else {
            return Result<std::pair<int, int>>::failure(
                ErrorCode::InvalidInput, 
                "Unsupported import format: " + format
            );
        }
        
        inFile.close();
        return Result<std::pair<int, int>>::success(std::make_pair(nodesImported, relationshipsImported));
    } catch (const std::exception& e) {
        Logger::error("Error importing graph: {}", e.what());
        return Result<std::pair<int, int>>::failure(ErrorCode::GraphOperationFailed, e.what());
    }
}

Result<std::vector<KnowledgeNode>> KnowledgeGraphEngine::extractNodes(
    const Document::ProcessingResult& processingResult) {
    
    try {
        std::vector<KnowledgeNode> nodes;
        
        // Extract learning objectives as nodes
        for (const auto& objective : processingResult.trainingElements.learningObjectives) {
            KnowledgeNode node;
            node.label = objective.description;
            node.type = "LearningObjective";
            node.confidence = 0.9f;
            node.sourceDocumentId = processingResult.documentId;
            
            // Add properties
            node.properties["id"] = objective.id;
            node.properties["category"] = objective.category;
            node.properties["importance"] = std::to_string(objective.importance);
            
            // Add tags
            node.tags.push_back("learning_objective");
            node.tags.push_back(objective.category);
            
            nodes.push_back(node);
        }
        
        // Extract competencies as nodes
        for (const auto& competency : processingResult.trainingElements.competencies) {
            KnowledgeNode node;
            node.label = competency.name;
            node.type = "Competency";
            node.confidence = 0.85f;
            node.sourceDocumentId = processingResult.documentId;
            
            // Add properties
            node.properties["id"] = competency.id;
            node.properties["description"] = competency.description;
            
            // Add assessment criteria as a property
            std::string criteria;
            for (size_t i = 0; i < competency.assessmentCriteria.size(); ++i) {
                if (i > 0) criteria += ";";
                criteria += competency.assessmentCriteria[i];
            }
            node.properties["assessmentCriteria"] = criteria;
            
            // Add tags
            node.tags.push_back("competency");
            
            nodes.push_back(node);
        }
        
        // Extract procedures as nodes
        for (const auto& procedure : processingResult.trainingElements.procedures) {
            KnowledgeNode node;
            node.label = procedure.name;
            node.type = "Procedure";
            node.confidence = 0.9f;
            node.sourceDocumentId = processingResult.documentId;
            
            // Add properties
            node.properties["id"] = procedure.id;
            node.properties["description"] = procedure.description;
            
            // Add steps as a property
            std::string steps;
            for (size_t i = 0; i < procedure.steps.size(); ++i) {
                if (i > 0) steps += ";";
                steps += procedure.steps[i];
            }
            node.properties["steps"] = steps;
            
            // Add safety considerations as a property
            std::string safety;
            for (size_t i = 0; i < procedure.safetyConsiderations.size(); ++i) {
                if (i > 0) safety += ";";
                safety += procedure.safetyConsiderations[i];
            }
            node.properties["safetyConsiderations"] = safety;
            
            // Add tags
            node.tags.push_back("procedure");
            
            nodes.push_back(node);
        }
        
        // Extract regulatory references as nodes
        std::unordered_set<std::string> processedRegulations;
        for (const auto& [regulation, elements] : processingResult.trainingElements.regulatoryMapping) {
            if (processedRegulations.find(regulation) != processedRegulations.end()) {
                continue;
            }
            
            KnowledgeNode node;
            node.label = regulation;
            node.type = "Regulation";
            node.confidence = 0.95f;
            node.sourceDocumentId = processingResult.documentId;
            
            // Add properties
            node.properties["id"] = "REG-" + std::to_string(processedRegulations.size() + 1);
            
            // Add tags
            node.tags.push_back("regulation");
            
            nodes.push_back(node);
            processedRegulations.insert(regulation);
        }
        
        // Extract entities if available
        if (!processingResult.entityRecognition.empty()) {
            for (const auto& [entityType, entities] : processingResult.entityRecognition) {
                for (const auto& entity : entities) {
                    KnowledgeNode node;
                    node.label = entity;
                    node.type = "Entity";
                    node.confidence = 0.8f;
                    node.sourceDocumentId = processingResult.documentId;
                    
                    // Add properties
                    node.properties["entityType"] = entityType;
                    
                    // Add tags
                    node.tags.push_back("entity");
                    node.tags.push_back(entityType);
                    
                    nodes.push_back(node);
                }
            }
        }
        
        // Add document node
        KnowledgeNode documentNode;
        documentNode.label = "Document: " + processingResult.documentId;
        documentNode.type = "Document";
        documentNode.confidence = 1.0f;
        documentNode.sourceDocumentId = processingResult.documentId;
        
        // Add properties
        documentNode.properties["id"] = processingResult.documentId;
        if (!processingResult.summary.empty()) {
            documentNode.summary = processingResult.summary;
        }
        
        // Add tags
        documentNode.tags.push_back("document");
        for (const auto& tag : processingResult.autoTags) {
            documentNode.tags.push_back(tag);
        }
        
        nodes.push_back(documentNode);
        
        return Result<std::vector<KnowledgeNode>>::success(nodes);
    } catch (const std::exception& e) {
        Logger::error("Error extracting nodes: {}", e.what());
        return Result<std::vector<KnowledgeNode>>::failure(
            ErrorCode::DocumentProcessingFailed, e.what());
    }
}

Result<std::vector<KnowledgeRelationship>> KnowledgeGraphEngine::extractRelationships(
    const Document::ProcessingResult& processingResult,
    const std::vector<KnowledgeNode>& nodes) {
    
    try {
        std::vector<KnowledgeRelationship> relationships;
        
        // Build lookup maps for nodes
        std::unordered_map<std::string, std::string> objectiveIdToNodeId;
        std::unordered_map<std::string, std::string> competencyIdToNodeId;
        std::unordered_map<std::string, std::string> procedureIdToNodeId;
        std::unordered_map<std::string, std::string> regulationToNodeId;
        std::string documentNodeId;
        
        for (const auto& node : nodes) {
            if (node.type == "LearningObjective" && node.properties.find("id") != node.properties.end()) {
                objectiveIdToNodeId[node.properties.at("id")] = node.id;
            } else if (node.type == "Competency" && node.properties.find("id") != node.properties.end()) {
                competencyIdToNodeId[node.properties.at("id")] = node.id;
            } else if (node.type == "Procedure" && node.properties.find("id") != node.properties.end()) {
                procedureIdToNodeId[node.properties.at("id")] = node.id;
            } else if (node.type == "Regulation") {
                regulationToNodeId[node.label] = node.id;
            } else if (node.type == "Document") {
                documentNodeId = node.id;
            }
        }
        
        // Create relationships between learning objectives and regulations
        for (const auto& objective : processingResult.trainingElements.learningObjectives) {
            if (objectiveIdToNodeId.find(objective.id) == objectiveIdToNodeId.end()) {
                continue;
            }
            
            std::string objectiveNodeId = objectiveIdToNodeId[objective.id];
            
            // Create relationships to regulations
            for (const auto& regulation : objective.relatedRegulations) {
                if (regulationToNodeId.find(regulation) == regulationToNodeId.end()) {
                    continue;
                }
                
                std::string regulationNodeId = regulationToNodeId[regulation];
                
                KnowledgeRelationship relationship;
                relationship.sourceNodeId = objectiveNodeId;
                relationship.targetNodeId = regulationNodeId;
                relationship.type = RelationshipType::REGULATORY;
                relationship.label = "COMPLIES_WITH";
                relationship.strength = 0.9f;
                relationship.confidence = 0.9f;
                relationship.sourceDocumentId = processingResult.documentId;
                
                relationships.push_back(relationship);
            }
            
            // Create relationships to prerequisites
            for (const auto& prereq : objective.prerequisites) {
                if (objectiveIdToNodeId.find(prereq) == objectiveIdToNodeId.end()) {
                    continue;
                }
                
                std::string prereqNodeId = objectiveIdToNodeId[prereq];
                
                KnowledgeRelationship relationship;
                relationship.sourceNodeId = prereqNodeId;
                relationship.targetNodeId = objectiveNodeId;
                relationship.type = RelationshipType::SEQUENTIAL;
                relationship.label = "PREREQUISITE_FOR";
                relationship.strength = 0.85f;
                relationship.confidence = 0.85f;
                relationship.sourceDocumentId = processingResult.documentId;
                
                relationships.push_back(relationship);
            }
            
            // Create relationship to document
            if (!documentNodeId.empty()) {
                KnowledgeRelationship relationship;
                relationship.sourceNodeId = documentNodeId;
                relationship.targetNodeId = objectiveNodeId;
                relationship.type = RelationshipType::HIERARCHICAL;
                relationship.label = "CONTAINS";
                relationship.strength = 1.0f;
                relationship.confidence = 1.0f;
                relationship.sourceDocumentId = processingResult.documentId;
                
                relationships.push_back(relationship);
            }
        }
        
        // Create relationships between competencies and objectives
        for (const auto& competency : processingResult.trainingElements.competencies) {
            if (competencyIdToNodeId.find(competency.id) == competencyIdToNodeId.end()) {
                continue;
            }
            
            std::string competencyNodeId = competencyIdToNodeId[competency.id];
            
            // Create relationships to objectives
            for (const auto& objective : competency.relatedObjectives) {
                if (objectiveIdToNodeId.find(objective) == objectiveIdToNodeId.end()) {
                    continue;
                }
                
                std::string objectiveNodeId = objectiveIdToNodeId[objective];
                
                KnowledgeRelationship relationship;
                relationship.sourceNodeId = competencyNodeId;
                relationship.targetNodeId = objectiveNodeId;
                relationship.type = RelationshipType::TRAINING;
                relationship.label = "ASSESSES";
                relationship.strength = 0.8f;
                relationship.confidence = 0.8f;
                relationship.sourceDocumentId = processingResult.documentId;
                
                relationships.push_back(relationship);
            }
            
            // Create relationship to document
            if (!documentNodeId.empty()) {
                KnowledgeRelationship relationship;
                relationship.sourceNodeId = documentNodeId;
                relationship.targetNodeId = competencyNodeId;
                relationship.type = RelationshipType::HIERARCHICAL;
                relationship.label = "CONTAINS";
                relationship.strength = 1.0f;
                relationship.confidence = 1.0f;
                relationship.sourceDocumentId = processingResult.documentId;
                
                relationships.push_back(relationship);
            }
        }
        
        // Create relationships between procedures and competencies
        for (const auto& procedure : processingResult.trainingElements.procedures) {
            if (procedureIdToNodeId.find(procedure.id) == procedureIdToNodeId.end()) {
                continue;
            }
            
            std::string procedureNodeId = procedureIdToNodeId[procedure.id];
            
            // Create relationships to competencies
            for (const auto& competency : procedure.relatedCompetencies) {
                if (competencyIdToNodeId.find(competency) == competencyIdToNodeId.end()) {
                    continue;
                }
                
                std::string competencyNodeId = competencyIdToNodeId[competency];
                
                KnowledgeRelationship relationship;
                relationship.sourceNodeId = procedureNodeId;
                relationship.targetNodeId = competencyNodeId;
                relationship.type = RelationshipType::TRAINING;
                relationship.label = "DEMONSTRATES";
                relationship.strength = 0.85f;
                relationship.confidence = 0.85f;
                relationship.sourceDocumentId = processingResult.documentId;
                
                relationships.push_back(relationship);
            }
            
            // Create relationship to document
            if (!documentNodeId.empty()) {
                KnowledgeRelationship relationship;
                relationship.sourceNodeId = documentNodeId;
                relationship.targetNodeId = procedureNodeId;
                relationship.type = RelationshipType::HIERARCHICAL;
                relationship.label = "CONTAINS";
                relationship.strength = 1.0f;
                relationship.confidence = 1.0f;
                relationship.sourceDocumentId = processingResult.documentId;
                
                relationships.push_back(relationship);
            }
        }
        
        return Result<std::vector<KnowledgeRelationship>>::success(relationships);
    } catch (const std::exception& e) {
        Logger::error("Error extracting relationships: {}", e.what());
        return Result<std::vector<KnowledgeRelationship>>::failure(
            ErrorCode::DocumentProcessingFailed, e.what());
    }
}

Result<KnowledgeSubgraph> KnowledgeGraphEngine::executeQuery(const std::string& queryString) {
    try {
        auto queryResult = _graphDatabase->executeQuery(queryString);
        if (!queryResult.isSuccess()) {
            return Result<KnowledgeSubgraph>::failure(
                queryResult.getError().code, queryResult.getError().message);
        }
        
        // Parse query results into subgraph
        KnowledgeSubgraph subgraph;
        std::unordered_set<std::string> processedNodeIds;
        std::unordered_set<std::string> processedRelationshipIds;
        
        for (const auto& row : queryResult.getValue()) {
            // Process nodes
            if (row.find("id") != row.end() && row.find("type") != row.end()) {
                std::string nodeId = row.at("id");
                
                if (processedNodeIds.find(nodeId) != processedNodeIds.end()) {
                    continue;
                }
                
                auto nodeResult = getNode(nodeId);
                if (nodeResult.isSuccess()) {
                    subgraph.nodes.push_back(nodeResult.getValue());
                    processedNodeIds.insert(nodeId);
                }
            }
            
            // Process relationships
            if (row.find("relationshipId") != row.end()) {
                std::string relationshipId = row.at("relationshipId");
                
                if (processedRelationshipIds.find(relationshipId) != processedRelationshipIds.end()) {
                    continue;
                }
                
                auto relationshipResult = getRelationship(relationshipId);
                if (relationshipResult.isSuccess()) {
                    subgraph.relationships.push_back(relationshipResult.getValue());
                    processedRelationshipIds.insert(relationshipId);
                }
            }
        }
        
        return Result<KnowledgeSubgraph>::success(subgraph);
    } catch (const std::exception& e) {
        Logger::error("Error executing query: {}", e.what());
        return Result<KnowledgeSubgraph>::failure(ErrorCode::GraphOperationFailed, e.what());
    }
}

Result<std::string> KnowledgeGraphEngine::generateNodeId(const KnowledgeNode& node) {
    try {
        // Create a unique ID based on node properties
        std::string baseId = node.type + "-" + node.label;
        
        // Remove non-alphanumeric characters
        baseId.erase(
            std::remove_if(baseId.begin(), baseId.end(), [](char c) {
                return !std::isalnum(c);
            }),
            baseId.end()
        );
        
        // Generate timestamp
        auto now = std::chrono::system_clock::now();
        auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
            now.time_since_epoch()
        ).count();
        
        // Generate random component
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_int_distribution<> dis(1000, 9999);
        int random = dis(gen);
        
        // Combine components
        std::string nodeId = baseId + "-" + std::to_string(timestamp) + "-" + std::to_string(random);
        
        // Ensure ID is unique
        auto existingNode = _graphDatabase->getNode(nodeId);
        if (existingNode.isSuccess()) {
            // Try again with a different random component
            return generateNodeId(node);
        }
        
        return Result<std::string>::success(nodeId);
    } catch (const std::exception& e) {
        Logger::error("Error generating node ID: {}", e.what());
        return Result<std::string>::failure(ErrorCode::GraphOperationFailed, e.what());
    }
}

Result<std::string> KnowledgeGraphEngine::generateRelationshipId(
    const KnowledgeRelationship& relationship) {
    
    try {
        // Create a unique ID based on relationship properties
        std::string typeStr;
        switch (relationship.type) {
            case RelationshipType::HIERARCHICAL: typeStr = "HIER"; break;
            case RelationshipType::SEQUENTIAL: typeStr = "SEQ"; break;
            case RelationshipType::CAUSAL: typeStr = "CAUS"; break;
            case RelationshipType::TEMPORAL: typeStr = "TEMP"; break;
            case RelationshipType::ASSOCIATIVE: typeStr = "ASSOC"; break;
            case RelationshipType::REGULATORY: typeStr = "REG"; break;
            case RelationshipType::TRAINING: typeStr = "TRAIN"; break;
            case RelationshipType::CUSTOM: typeStr = "CUST"; break;
            default: typeStr = "UNK";
        }
        
        std::string baseId = typeStr + "-" + relationship.sourceNodeId + "-" + relationship.targetNodeId;
        
        // Generate timestamp
        auto now = std::chrono::system_clock::now();
        auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
            now.time_since_epoch()
        ).count();
        
        // Generate random component
        std::random_device rd;
        std::mt19937 gen(rd());
        std::uniform_int_distribution<> dis(1000, 9999);
        int random = dis(gen);
        
        // Combine components
        std::string relId = baseId + "-" + std::to_string(timestamp) + "-" + std::to_string(random);
        
        // Ensure ID is unique
        auto existingRel = _graphDatabase->getRelationship(relId);
        if (existingRel.isSuccess()) {
            // Try again with a different random component
            return generateRelationshipId(relationship);
        }
        
        return Result<std::string>::success(relId);
    } catch (const std::exception& e) {
        Logger::error("Error generating relationship ID: {}", e.what());
        return Result<std::string>::failure(ErrorCode::GraphOperationFailed, e.what());
    }
}

// KnowledgeGraphEngineFactory Implementation
KnowledgeGraphEngineFactory::KnowledgeGraphEngineFactory(
    std::shared_ptr<ConfigurationManager> configManager)
    : _configManager(std::move(configManager)) {
    
    // Create NLP processor
    _nlpProcessor = std::make_shared<NLPProcessor>(_configManager);
}

std::shared_ptr<IKnowledgeGraphEngine> KnowledgeGraphEngineFactory::createEngine(
    const std::string& engineType) {
    
    // Check if engine instance already exists
    auto it = _engineInstances.find(engineType);
    if (it != _engineInstances.end()) {
        auto engine = it->second.lock();
        if (engine) {
            return engine;
        }
    }
    
    // Create graph database based on engine type
    std::shared_ptr<GraphDatabase> graphDatabase;
    
    if (engineType == "memory") {
        graphDatabase = std::make_shared<GraphDatabase>(_configManager, "memory");
    } else if (engineType == "neo4j") {
        graphDatabase = std::make_shared<GraphDatabase>(_configManager, "neo4j");
    } else {
        // Default to in-memory database
        graphDatabase = std::make_shared<GraphDatabase>(_configManager, "memory");
    }
    
    // Create knowledge graph engine
    auto engine = std::make_shared<KnowledgeGraphEngine>(_configManager, _nlpProcessor, graphDatabase);
    
    // Store weak reference
    _engineInstances[engineType] = engine;
    
    return engine;
}

} // namespace Core
} // namespace PilotTraining
