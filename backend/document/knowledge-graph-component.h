// src/backend/core/KnowledgeGraphEngine.h
#pragma once

#include <memory>
#include <string>
#include <vector>
#include <unordered_map>
#include <optional>
#include <functional>
#include <future>
#include <set>

#include "Result.h"
#include "Logger.h"
#include "ConfigurationManager.h"
#include "../document/DocumentProcessor.h"

namespace PilotTraining {
namespace Core {

// Forward declarations
class NLPProcessor;
class GraphDatabase;

/**
 * Enum representing relationship types in the knowledge graph
 */
enum class RelationshipType {
  HIERARCHICAL,  // Parent-child, contains, part of
  SEQUENTIAL,    // Precedes, follows
  CAUSAL,        // Causes, affects, influences
  TEMPORAL,      // Before, after, during
  ASSOCIATIVE,   // Related to, similar to
  REGULATORY,    // Regulated by, complies with
  TRAINING,      // Trains for, teaches, assesses
  CUSTOM         // User-defined relationship
};

/**
 * Struct representing a node in the knowledge graph
 */
struct KnowledgeNode {
  std::string id;
  std::string label;
  std::string type;
  std::unordered_map<std::string, std::string> properties;
  float confidence;
  std::optional<std::string> sourceDocumentId;
  std::optional<std::string> sourceLocation; // e.g., "page 5, paragraph 2"
  std::vector<std::string> tags;
  
  // Advanced features
  std::optional<std::string> summary;
  std::unordered_map<std::string, float> sentiment;
  std::optional<std::string> createdBy;
  std::optional<std::string> lastModifiedBy;
  std::string createdAt;
  std::string lastModifiedAt;
};

/**
 * Struct representing a relationship between nodes in the knowledge graph
 */
struct KnowledgeRelationship {
  std::string id;
  std::string sourceNodeId;
  std::string targetNodeId;
  RelationshipType type;
  std::string label;
  std::unordered_map<std::string, std::string> properties;
  float strength;
  float confidence;
  std::optional<std::string> sourceDocumentId;
  
  // Advanced features
  std::optional<std::string> bidirectional;
  std::optional<std::string> temporal; // e.g., "before", "after", "during"
  std::optional<std::string> createdBy;
  std::optional<std::string> lastModifiedBy;
  std::string createdAt;
  std::string lastModifiedAt;
};

/**
 * Struct representing a subgraph (a portion of the knowledge graph)
 */
struct KnowledgeSubgraph {
  std::vector<KnowledgeNode> nodes;
  std::vector<KnowledgeRelationship> relationships;
  std::unordered_map<std::string, std::string> metadata;
};

/**
 * Struct for knowledge graph query parameters
 */
struct KnowledgeGraphQuery {
  struct NodeFilter {
    std::optional<std::string> type;
    std::optional<std::vector<std::string>> labels;
    std::optional<std::vector<std::string>> tags;
    std::optional<std::vector<std::string>> sourceDocumentIds;
    std::optional<float> minConfidence;
    std::unordered_map<std::string, std::string> propertyFilters;
  };
  
  struct RelationshipFilter {
    std::optional<std::vector<RelationshipType>> types;
    std::optional<std::vector<std::string>> labels;
    std::optional<float> minStrength;
    std::optional<float> minConfidence;
    std::unordered_map<std::string, std::string> propertyFilters;
  };
  
  std::optional<NodeFilter> nodeFilter;
  std::optional<RelationshipFilter> relationshipFilter;
  std::optional<std::string> startNodeId;
  std::optional<int> maxDepth;
  std::optional<int> maxResults;
  bool includeProperties = true;
};

/**
 * Struct for natural language query parameters
 */
struct NaturalLanguageQuery {
  std::string query;
  std::optional<std::string> context;
  std::optional<std::string> language;
  std::optional<int> maxResults;
  std::optional<float> minConfidence;
};

/**
 * Interface for the Knowledge Graph Engine
 */
class IKnowledgeGraphEngine {
public:
  virtual ~IKnowledgeGraphEngine() = default;
  
  /**
   * Create a node in the knowledge graph
   * 
   * @param node Node to create
   * @return Result containing the created node ID or error
   */
  virtual Result<std::string> createNode(const KnowledgeNode& node) = 0;
  
  /**
   * Create a relationship between nodes in the knowledge graph
   * 
   * @param relationship Relationship to create
   * @return Result containing the created relationship ID or error
   */
  virtual Result<std::string> createRelationship(const KnowledgeRelationship& relationship) = 0;
  
  /**
   * Update a node in the knowledge graph
   * 
   * @param nodeId ID of the node to update
   * @param node Updated node data
   * @return Result indicating success or error
   */
  virtual Result<void> updateNode(const std::string& nodeId, const KnowledgeNode& node) = 0;
  
  /**
   * Update a relationship in the knowledge graph
   * 
   * @param relationshipId ID of the relationship to update
   * @param relationship Updated relationship data
   * @return Result indicating success or error
   */
  virtual Result<void> updateRelationship(
    const std::string& relationshipId, 
    const KnowledgeRelationship& relationship
  ) = 0;
  
  /**
   * Delete a node from the knowledge graph
   * 
   * @param nodeId ID of the node to delete
   * @return Result indicating success or error
   */
  virtual Result<void> deleteNode(const std::string& nodeId) = 0;
  
  /**
   * Delete a relationship from the knowledge graph
   * 
   * @param relationshipId ID of the relationship to delete
   * @return Result indicating success or error
   */
  virtual Result<void> deleteRelationship(const std::string& relationshipId) = 0;
  
  /**
   * Get a node from the knowledge graph
   * 
   * @param nodeId ID of the node to retrieve
   * @return Result containing the node or error
   */
  virtual Result<KnowledgeNode> getNode(const std::string& nodeId) = 0;
  
  /**
   * Get a relationship from the knowledge graph
   * 
   * @param relationshipId ID of the relationship to retrieve
   * @return Result containing the relationship or error
   */
  virtual Result<KnowledgeRelationship> getRelationship(const std::string& relationshipId) = 0;
  
  /**
   * Query the knowledge graph
   * 
   * @param query Query parameters
   * @return Result containing a subgraph of the knowledge graph or error
   */
  virtual Result<KnowledgeSubgraph> query(const KnowledgeGraphQuery& query) = 0;
  
  /**
   * Process a document to extract knowledge and build the graph
   * 
   * @param processingResult Result from document processing
   * @return Result containing the number of nodes and relationships created or error
   */
  virtual Result<std::pair<int, int>> processDocument(
    const Document::ProcessingResult& processingResult
  ) = 0;
  
  /**
   * Process a document asynchronously to extract knowledge and build the graph
   * 
   * @param processingResult Result from document processing
   * @return Future result containing the number of nodes and relationships created or error
   */
  virtual std::future<Result<std::pair<int, int>>> processDocumentAsync(
    const Document::ProcessingResult& processingResult
  ) = 0;
  
  /**
   * Query the knowledge graph using natural language
   * 
   * @param query Natural language query
   * @return Result containing a subgraph of the knowledge graph or error
   */
  virtual Result<KnowledgeSubgraph> naturalLanguageQuery(const NaturalLanguageQuery& query) = 0;
  
  /**
   * Merge two subgraphs
   * 
   * @param subgraph1 First subgraph
   * @param subgraph2 Second subgraph
   * @param mergeStrategy Strategy for resolving conflicts
   * @return Result containing the merged subgraph or error
   */
  virtual Result<KnowledgeSubgraph> mergeSubgraphs(
    const KnowledgeSubgraph& subgraph1,
    const KnowledgeSubgraph& subgraph2,
    const std::string& mergeStrategy = "prefer_higher_confidence"
  ) = 0;
  
  /**
   * Calculate the semantic similarity between two nodes
   * 
   * @param nodeId1 ID of the first node
   * @param nodeId2 ID of the second node
   * @return Result containing the similarity score (0.0 to 1.0) or error
   */
  virtual Result<float> calculateNodeSimilarity(
    const std::string& nodeId1,
    const std::string& nodeId2
  ) = 0;
  
  /**
   * Find the shortest path between two nodes
   * 
   * @param sourceNodeId ID of the source node
   * @param targetNodeId ID of the target node
   * @param maxDepth Maximum path length to consider
   * @return Result containing a subgraph representing the path or error
   */
  virtual Result<KnowledgeSubgraph> findShortestPath(
    const std::string& sourceNodeId,
    const std::string& targetNodeId,
    int maxDepth = 5
  ) = 0;
  
  /**
   * Detect communities in the knowledge graph
   * 
   * @param algorithm Community detection algorithm to use
   * @param parameters Algorithm-specific parameters
   * @return Result containing a map of community IDs to node IDs or error
   */
  virtual Result<std::unordered_map<std::string, std::vector<std::string>>> detectCommunities(
    const std::string& algorithm = "louvain",
    const std::unordered_map<std::string, std::string>& parameters = {}
  ) = 0;
  
  /**
   * Export the knowledge graph to a specified format
   * 
   * @param format Export format (e.g., "json", "graphml", "cypher")
   * @param filePath Path to save the exported graph
   * @param query Optional query to filter the exported graph
   * @return Result indicating success or error
   */
  virtual Result<void> exportGraph(
    const std::string& format,
    const std::string& filePath,
    const std::optional<KnowledgeGraphQuery>& query = std::nullopt
  ) = 0;
  
  /**
   * Import a knowledge graph from a file
   * 
   * @param format Import format (e.g., "json", "graphml", "cypher")
   * @param filePath Path to the file to import
   * @param mergeStrategy Strategy for resolving conflicts with existing data
   * @return Result containing the number of nodes and relationships imported or error
   */
  virtual Result<std::pair<int, int>> importGraph(
    const std::string& format,
    const std::string& filePath,
    const std::string& mergeStrategy = "prefer_higher_confidence"
  ) = 0;
};

/**
 * Implementation of the Knowledge Graph Engine
 */
class KnowledgeGraphEngine : public IKnowledgeGraphEngine {
public:
  explicit KnowledgeGraphEngine(
    std::shared_ptr<ConfigurationManager> configManager,
    std::shared_ptr<NLPProcessor> nlpProcessor,
    std::shared_ptr<GraphDatabase> graphDatabase
  );
  
  ~KnowledgeGraphEngine() override;
  
  Result<std::string> createNode(const KnowledgeNode& node) override;
  Result<std::string> createRelationship(const KnowledgeRelationship& relationship) override;
  Result<void> updateNode(const std::string& nodeId, const KnowledgeNode& node) override;
  Result<void> updateRelationship(
    const std::string& relationshipId, 
    const KnowledgeRelationship& relationship
  ) override;
  Result<void> deleteNode(const std::string& nodeId) override;
  Result<void> deleteRelationship(const std::string& relationshipId) override;
  Result<KnowledgeNode> getNode(const std::string& nodeId) override;
  Result<KnowledgeRelationship> getRelationship(const std::string& relationshipId) override;
  Result<KnowledgeSubgraph> query(const KnowledgeGraphQuery& query) override;
  Result<std::pair<int, int>> processDocument(
    const Document::ProcessingResult& processingResult
  ) override;
  std::future<Result<std::pair<int, int>>> processDocumentAsync(
    const Document::ProcessingResult& processingResult
  ) override;
  Result<KnowledgeSubgraph> naturalLanguageQuery(const NaturalLanguageQuery& query) override;
  Result<KnowledgeSubgraph> mergeSubgraphs(
    const KnowledgeSubgraph& subgraph1,
    const KnowledgeSubgraph& subgraph2,
    const std::string& mergeStrategy
  ) override;
  Result<float> calculateNodeSimilarity(
    const std::string& nodeId1,
    const std::string& nodeId2
  ) override;
  Result<KnowledgeSubgraph> findShortestPath(
    const std::string& sourceNodeId,
    const std::string& targetNodeId,
    int maxDepth
  ) override;
  Result<std::unordered_map<std::string, std::vector<std::string>>> detectCommunities(
    const std::string& algorithm,
    const std::unordered_map<std::string, std::string>& parameters
  ) override;
  Result<void> exportGraph(
    const std::string& format,
    const std::string& filePath,
    const std::optional<KnowledgeGraphQuery>& query
  ) override;
  Result<std::pair<int, int>> importGraph(
    const std::string& format,
    const std::string& filePath,
    const std::string& mergeStrategy
  ) override;
  
private:
  // Helper methods for document processing
  Result<std::vector<KnowledgeNode>> extractNodes(const Document::ProcessingResult& processingResult);
  Result<std::vector<KnowledgeRelationship>> extractRelationships(
    const Document::ProcessingResult& processingResult,
    const std::vector<KnowledgeNode>& nodes
  );
  
  // Helper methods for NLP processing
  Result<std::vector<std::pair<std::string, std::string>>> extractEntities(const std::string& text);
  Result<std::vector<std::tuple<std::string, std::string, RelationshipType>>> extractRelations(
    const std::string& text
  );
  
  // Helper methods for graph operations
  Result<KnowledgeSubgraph> executeQuery(const std::string& queryString);
  Result<std::string> generateNodeId(const KnowledgeNode& node);
  Result<std::string> generateRelationshipId(const KnowledgeRelationship& relationship);
  
  std::shared_ptr<ConfigurationManager> _configManager;
  std::shared_ptr<NLPProcessor> _nlpProcessor;
  std::shared_ptr<GraphDatabase> _graphDatabase;
  
  // Cache frequently accessed nodes and relationships
  std::unordered_map<std::string, KnowledgeNode> _nodeCache;
  std::unordered_map<std::string, KnowledgeRelationship> _relationshipCache;
  std::set<std::string> _processedDocuments;
  
  // Configuration values
  bool _enableNodeCaching;
  bool _enableRelationshipCaching;
  int _maxCacheSize;
  float _minConfidenceThreshold;
  std::string _defaultLanguage;
};

/**
 * Factory for creating knowledge graph engines
 */
class KnowledgeGraphEngineFactory {
public:
  explicit KnowledgeGraphEngineFactory(std::shared_ptr<ConfigurationManager> configManager);
  
  /**
   * Create a knowledge graph engine
   * 
   * @param engineType Type of engine to create
   * @return Shared pointer to knowledge graph engine
   */
  std::shared_ptr<IKnowledgeGraphEngine> createEngine(const std::string& engineType = "default");
  
private:
  std::shared_ptr<ConfigurationManager> _configManager;
  std::shared_ptr<NLPProcessor> _nlpProcessor;
  std::unordered_map<std::string, std::weak_ptr<IKnowledgeGraphEngine>> _engineInstances;
};

} // namespace Core
} // namespace PilotTraining
