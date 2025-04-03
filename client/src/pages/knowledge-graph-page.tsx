/**
 * Knowledge Graph Page
 * Displays an interactive visualization of a knowledge graph
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'wouter';
import { knowledgeGraphService } from '../services/knowledge-graph-service';
import { NodeType, EdgeType } from '../../../shared/knowledge-graph-types';

// This is a placeholder for a real D3 or Three.js visualization
// In a real application, we would use a proper graph visualization library
function KnowledgeGraphVisualization({ 
  graphData, 
  onSelectNode 
}: { 
  graphData: any; 
  onSelectNode: (nodeId: string) => void 
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!graphData || !svgRef.current) return;
    
    // This is just a placeholder for demonstration
    // A real implementation would use D3.js or a similar visualization library
    const svg = svgRef.current;
    const width = svg.clientWidth;
    const height = svg.clientHeight;
    
    // Clear existing elements
    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }
    
    // Place nodes randomly for this demo
    const nodes = graphData.nodes.map((node: any) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      const x = Math.random() * (width - 100) + 50;
      const y = Math.random() * (height - 100) + 50;
      
      circle.setAttribute('cx', x.toString());
      circle.setAttribute('cy', y.toString());
      circle.setAttribute('r', '10');
      circle.setAttribute('fill', getNodeColor(node.type));
      circle.setAttribute('data-id', node.id);
      circle.addEventListener('click', () => onSelectNode(node.id));
      
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', (x + 15).toString());
      text.setAttribute('y', y.toString());
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('fill', '#333');
      text.setAttribute('font-size', '12px');
      text.textContent = node.label;
      
      svg.appendChild(circle);
      svg.appendChild(text);
      
      return { id: node.id, x, y };
    });
    
    // Draw edges
    graphData.edges.forEach((edge: any) => {
      const sourceNode = nodes.find((n: any) => n.id === edge.source);
      const targetNode = nodes.find((n: any) => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', sourceNode.x.toString());
        line.setAttribute('y1', sourceNode.y.toString());
        line.setAttribute('x2', targetNode.x.toString());
        line.setAttribute('y2', targetNode.y.toString());
        line.setAttribute('stroke', '#ccc');
        line.setAttribute('stroke-width', '1');
        
        svg.insertBefore(line, svg.firstChild);
      }
    });
  }, [graphData, onSelectNode]);
  
  const getNodeColor = (type: string) => {
    switch (type) {
      case NodeType.Concept:
        return '#4169E1'; // Royal Blue
      case NodeType.Entity:
        return '#32CD32'; // Lime Green
      case NodeType.Procedure:
        return '#FF8C00'; // Dark Orange
      case NodeType.Document:
        return '#9370DB'; // Medium Purple
      case NodeType.Regulation:
        return '#DC143C'; // Crimson
      case NodeType.Topic:
        return '#1E90FF'; // Dodger Blue
      default:
        return '#666666'; // Gray
    }
  };
  
  if (!graphData) {
    return (
      <div className="flex justify-center items-center h-96 bg-muted/30 rounded-lg">
        <p className="text-muted-foreground">No graph data available</p>
      </div>
    );
  }
  
  return (
    <svg
      ref={svgRef}
      className="w-full h-96 border rounded-lg"
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid meet"
    ></svg>
  );
}

interface KnowledgeGraphPageProps {
  id?: string;
}

export default function KnowledgeGraphPage({ id: propId }: KnowledgeGraphPageProps = {}) {
  const params = useParams<{ id: string }>();
  const id = propId || params.id;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string[]>([]);
  
  const {
    data: graph,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['/api/knowledge-graphs', id],
    queryFn: () => knowledgeGraphService.getKnowledgeGraph(id),
    enabled: !!id,
  });
  
  const {
    data: searchResults,
    isLoading: isSearching,
  } = useQuery({
    queryKey: ['/api/knowledge-graphs', id, 'search', searchQuery, nodeTypeFilter],
    queryFn: () => knowledgeGraphService.searchGraph(id, {
      query: searchQuery,
      nodeTypes: nodeTypeFilter.length > 0 ? nodeTypeFilter as NodeType[] : undefined,
    }),
    enabled: !!id && (searchQuery.length > 0 || nodeTypeFilter.length > 0),
  });
  
  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId === selectedNodeId ? null : nodeId);
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const handleNodeTypeFilterChange = (type: string) => {
    setNodeTypeFilter(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };
  
  const selectedNode = selectedNodeId
    ? (searchResults?.nodes || graph?.nodes || []).find(node => node.id === selectedNodeId)
    : null;
  
  const connectedEdges = selectedNodeId
    ? (searchResults?.edges || graph?.edges || []).filter(
        edge => edge.source === selectedNodeId || edge.target === selectedNodeId
      )
    : [];
  
  const connectedNodeIds = new Set<string>();
  if (selectedNodeId) {
    connectedEdges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });
  }
  
  const connectedNodes = (searchResults?.nodes || graph?.nodes || []).filter(
    node => connectedNodeIds.has(node.id) && node.id !== selectedNodeId
  );
  
  const graphData = searchResults || graph;
  
  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <Link href="/knowledge-graphs">
          <a className="text-primary hover:underline">
            &larr; Back to knowledge graphs
          </a>
        </Link>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> Failed to load knowledge graph.</span>
        </div>
      ) : (
        <>
          <div className="flex flex-col lg:flex-row justify-between lg:items-center mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">{graph?.name || 'Knowledge Graph'}</h1>
              <p className="text-muted-foreground">
                {graph?.description || 'Interactive visualization of knowledge graph'}
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 items-center">
              {graph?.documentIds && graph.documentIds.length > 0 && (
                <Link href={`/documents/${graph.documentIds[0]}`}>
                  <a className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90">
                    View Source Document
                  </a>
                </Link>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card rounded-lg shadow-md p-4 border">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Graph Visualization</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {graphData?.nodes?.length || 0} nodes, {graphData?.edges?.length || 0} edges
                    </span>
                  </div>
                </div>
                
                <div className="mb-4 flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search nodes..."
                    className="px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary flex-grow"
                  />
                  
                  <div className="flex flex-wrap gap-1">
                    {Object.values(NodeType).slice(0, 5).map((type) => (
                      <button
                        key={type}
                        onClick={() => handleNodeTypeFilterChange(type)}
                        className={`px-2 py-1 text-xs rounded-full ${
                          nodeTypeFilter.includes(type)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                
                {isSearching ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : (
                  <KnowledgeGraphVisualization
                    graphData={graphData}
                    onSelectNode={handleSelectNode}
                  />
                )}
              </div>
              
              {selectedNode && (
                <div className="bg-card rounded-lg shadow-md p-4 border">
                  <h3 className="text-lg font-medium mb-2">
                    {selectedNode.label}
                    <span className="ml-2 px-2 py-0.5 bg-muted rounded-full text-xs">
                      {selectedNode.type}
                    </span>
                  </h3>
                  
                  {selectedNode.context && (
                    <p className="text-muted-foreground mb-4">
                      {selectedNode.context}
                    </p>
                  )}
                  
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Connected Nodes ({connectedNodes.length})</h4>
                    {connectedNodes.length === 0 ? (
                      <p className="text-muted-foreground">No connected nodes</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {connectedNodes.map(node => (
                          <div
                            key={node.id}
                            className="flex items-center p-2 border rounded hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleSelectNode(node.id)}
                          >
                            <div className="h-3 w-3 rounded-full mr-2" style={{
                              backgroundColor: getNodeTypeColor(node.type)
                            }}></div>
                            <span className="truncate">{node.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-6">
              <div className="bg-card rounded-lg shadow-md p-4 border">
                <h2 className="text-xl font-semibold mb-4">Graph Information</h2>
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="col-span-2 font-medium">
                      {graph?.createdAt ? new Date(graph.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Updated:</span>
                    <span className="col-span-2 font-medium">
                      {graph?.updatedAt ? new Date(graph.updatedAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Status:</span>
                    <span className="col-span-2 font-medium">
                      {graph?.metadata?.status || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Node Count:</span>
                    <span className="col-span-2 font-medium">
                      {graph?.nodes?.length || 0}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">Edge Count:</span>
                    <span className="col-span-2 font-medium">
                      {graph?.edges?.length || 0}
                    </span>
                  </div>
                  
                  {graph?.metadata?.tags && graph.metadata.tags.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      <span className="text-muted-foreground">Tags:</span>
                      <div className="col-span-2">
                        <div className="flex flex-wrap gap-1">
                          {graph.metadata.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-0.5 bg-muted rounded-full text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-card rounded-lg shadow-md p-4 border">
                <h2 className="text-xl font-semibold mb-4">Node Types</h2>
                <div className="space-y-2">
                  {Object.values(NodeType).map(type => {
                    const count = (graphData?.nodes || []).filter(node => node.type === type).length;
                    return count > 0 ? (
                      <div key={type} className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="h-3 w-3 rounded-full mr-2" style={{
                            backgroundColor: getNodeTypeColor(type)
                          }}></div>
                          <span>{type}</span>
                        </div>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
              
              <div className="bg-card rounded-lg shadow-md p-4 border">
                <h2 className="text-xl font-semibold mb-4">Edge Types</h2>
                <div className="space-y-2">
                  {Object.values(EdgeType).map(type => {
                    const count = (graphData?.edges || []).filter(edge => edge.type === type).length;
                    return count > 0 ? (
                      <div key={type} className="flex justify-between items-center">
                        <span>{type.replace('_', ' ')}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function getNodeTypeColor(type: string): string {
  switch (type) {
    case NodeType.Concept:
      return '#4169E1'; // Royal Blue
    case NodeType.Entity:
      return '#32CD32'; // Lime Green
    case NodeType.Procedure:
      return '#FF8C00'; // Dark Orange
    case NodeType.Document:
      return '#9370DB'; // Medium Purple
    case NodeType.Regulation:
      return '#DC143C'; // Crimson
    case NodeType.Topic:
      return '#1E90FF'; // Dodger Blue
    default:
      return '#666666'; // Gray
  }
}
