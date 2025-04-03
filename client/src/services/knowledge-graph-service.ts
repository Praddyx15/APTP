/**
 * Knowledge graph service for API interactions
 */

import { apiRequest } from '../lib/query-client';
import { KnowledgeGraph, GraphSearchOptions, GraphQueryResult } from '../../../shared/knowledge-graph-types';

export const knowledgeGraphService = {
  /**
   * Get all knowledge graphs with optional filtering
   */
  async getKnowledgeGraphs(params: {
    documentId?: number;
    createdBy?: number;
    limit?: number;
    offset?: number;
  } = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.documentId) queryParams.append('documentId', params.documentId.toString());
    if (params.createdBy) queryParams.append('createdBy', params.createdBy.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());
    
    const queryString = queryParams.toString();
    const url = `/api/knowledge-graphs${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiRequest('GET', url);
    return await response.json() as KnowledgeGraph[];
  },
  
  /**
   * Get a knowledge graph by ID
   */
  async getKnowledgeGraph(id: string) {
    const response = await apiRequest('GET', `/api/knowledge-graphs/${id}`);
    return await response.json() as KnowledgeGraph;
  },
  
  /**
   * Search within a knowledge graph
   */
  async searchGraph(graphId: string, options: GraphSearchOptions) {
    const queryParams = new URLSearchParams();
    
    if (options.query) queryParams.append('query', options.query);
    if (options.nodeTypes) queryParams.append('nodeTypes', options.nodeTypes.join(','));
    if (options.edgeTypes) queryParams.append('edgeTypes', options.edgeTypes.join(','));
    if (options.startNodeId) queryParams.append('startNodeId', options.startNodeId);
    if (options.maxDepth) queryParams.append('maxDepth', options.maxDepth.toString());
    if (options.maxResults) queryParams.append('maxResults', options.maxResults.toString());
    if (options.includeHidden) queryParams.append('includeHidden', options.includeHidden.toString());
    
    const queryString = queryParams.toString();
    const url = `/api/knowledge-graphs/${graphId}/search${queryString ? `?${queryString}` : ''}`;
    
    const response = await apiRequest('GET', url);
    return await response.json() as GraphQueryResult;
  }
};
