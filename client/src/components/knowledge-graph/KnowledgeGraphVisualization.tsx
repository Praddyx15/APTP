import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { SearchX, ZoomIn, ZoomOut, RefreshCw, Download, Filter, Save } from 'lucide-react';

interface Node {
  id: string;
  type: string;
  content: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Edge {
  source: string | Node;
  target: string | Node;
  relationship: string;
}

interface KnowledgeGraphProps {
  nodes: Node[];
  edges: Edge[];
  title?: string;
  description?: string;
  onSave?: (data: { nodes: Node[], edges: Edge[] }) => void;
}

export function KnowledgeGraphVisualization({ 
  nodes: initialNodes = [], 
  edges: initialEdges = [],
  title = 'Knowledge Graph',
  description = 'Interactive visualization of connected knowledge',
  onSave
}: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [nodeFilter, setNodeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [relatedNodes, setRelatedNodes] = useState<Node[]>([]);
  const [linkDistance, setLinkDistance] = useState<number>(150);
  const [chargeStrength, setChargeStrength] = useState<number>(-300);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedTab, setSelectedTab] = useState('graph');
  const { toast } = useToast();
  
  // Simulation reference
  const simulationRef = useRef<any>(null);
  
  // Effect for window resize
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current) {
        const container = svgRef.current.parentElement;
        if (container) {
          setWidth(container.clientWidth);
          setHeight(Math.max(500, container.clientHeight));
        }
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Filter nodes based on type and search query
  const filteredNodes = nodes.filter(node => 
    (nodeFilter === 'all' || node.type === nodeFilter) &&
    (searchQuery === '' || node.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Filter edges based on filtered nodes
  const filteredEdges = edges.filter(edge => {
    const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
    const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
    return filteredNodes.some(n => n.id === sourceId) && filteredNodes.some(n => n.id === targetId);
  });
  
  // Get unique node types for filter dropdown
  const nodeTypes = [...new Set(nodes.map(node => node.type))];
  
  // Get node by id
  const getNodeById = (id: string) => nodes.find(node => node.id === id);
  
  // Find related nodes for a given node
  const findRelatedNodes = (nodeId: string) => {
    const related: Node[] = [];
    
    edges.forEach(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      
      if (sourceId === nodeId) {
        const targetNode = getNodeById(targetId);
        if (targetNode) related.push(targetNode);
      } else if (targetId === nodeId) {
        const sourceNode = getNodeById(sourceId);
        if (sourceNode) related.push(sourceNode);
      }
    });
    
    return related;
  };
  
  // Handle node click
  const handleNodeClick = (node: Node) => {
    setSelectedNode(node);
    setRelatedNodes(findRelatedNodes(node.id));
  };
  
  // Converts id references in edges to actual node references
  const processEdges = (edges: Edge[], nodes: Node[]) => {
    return edges.map(edge => {
      const source = typeof edge.source === 'string' 
        ? nodes.find(n => n.id === edge.source) || edge.source 
        : edge.source;
        
      const target = typeof edge.target === 'string'
        ? nodes.find(n => n.id === edge.target) || edge.target
        : edge.target;
        
      return { ...edge, source, target };
    });
  };
  
  // Get color by node type
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'module':
        return '#3b82f6'; // blue
      case 'lesson':
        return '#10b981'; // green
      case 'competency':
        return '#f59e0b'; // amber
      case 'regulation':
        return '#ef4444'; // red
      case 'assessment':
        return '#8b5cf6'; // purple
      case 'resource':
        return '#ec4899'; // pink
      case 'concept':
        return '#6366f1'; // indigo
      default:
        return '#6b7280'; // gray
    }
  };
  
  // Initial graph setup and update when data changes
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;
    
    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove();
    
    // Create SVG container
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])
      .attr('style', 'max-width: 100%; height: auto;');
    
    // Add zoom functionality
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });
    
    svg.call(zoom as any);
    
    // Create group for zoom
    const g = svg.append('g');
    
    // Process the edges to use node objects instead of just ids
    const processedEdges = processEdges(filteredEdges, filteredNodes);
    
    // Create force simulation
    const simulation = d3.forceSimulation(filteredNodes as any)
      .force('link', d3.forceLink(processedEdges).id((d: any) => d.id).distance(linkDistance))
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));
    
    simulationRef.current = simulation;
    
    // Draw links
    const links = g.selectAll('.link')
      .data(processedEdges)
      .enter()
      .append('g')
      .attr('class', 'link');
    
    const linkLines = links
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1.5);
    
    // Add relationship text to links
    links.append('text')
      .attr('class', 'link-text')
      .attr('text-anchor', 'middle')
      .attr('dy', -5)
      .attr('fill', '#666')
      .attr('font-size', 10)
      .text((d: Edge) => d.relationship)
      .attr('pointer-events', 'none');
    
    // Create node groups
    const nodeGroups = g.selectAll('.node')
      .data(filteredNodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragging)
        .on('end', dragEnded) as any)
      .on('click', (event, d: Node) => handleNodeClick(d));
    
    // Add circles for nodes
    nodeGroups.append('circle')
      .attr('r', 20)
      .attr('fill', (d: Node) => getNodeColor(d.type))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);
    
    // Add text to nodes
    nodeGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 30)
      .attr('fill', '#333')
      .style('font-size', '10px')
      .style('pointer-events', 'none')
      .text((d: Node) => d.content?.length > 20 ? d.content.substring(0, 20) + '...' : d.content);
    
    // Add icons or first letter inside circles
    nodeGroups.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('fill', '#fff')
      .style('font-size', '10px')
      .style('font-weight', 'bold')
      .style('pointer-events', 'none')
      .text((d: Node) => d.type.charAt(0).toUpperCase());
    
    // Set up the simulation tick function
    simulation.on('tick', () => {
      // Update link positions
      linkLines
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      
      // Update link text positions
      links.select('text')
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2);
      
      // Update node positions
      nodeGroups.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });
    
    // Drag functions
    function dragStarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragging(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragEnded(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [filteredNodes, filteredEdges, width, height, linkDistance, chargeStrength]);
  
  // Update simulation parameters when they change
  useEffect(() => {
    if (!simulationRef.current) return;
    
    simulationRef.current
      .force('link', d3.forceLink(processEdges(filteredEdges, filteredNodes)).id((d: any) => d.id).distance(linkDistance))
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .alpha(1)
      .restart();
  }, [linkDistance, chargeStrength, filteredNodes, filteredEdges]);
  
  // Handle zoom changes
  const handleZoomIn = () => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call((d3.zoom() as any).scaleBy, 1.2);
  };
  
  const handleZoomOut = () => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call((d3.zoom() as any).scaleBy, 0.8);
  };
  
  const handleReset = () => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(500)
      .call((d3.zoom() as any).transform, d3.zoomIdentity);
  };
  
  const handleSaveGraph = () => {
    if (onSave) {
      onSave({ nodes, edges });
    }
    
    toast({
      title: 'Graph saved',
      description: 'The knowledge graph has been saved successfully',
    });
  };
  
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `knowledge-graph-${new Date().toISOString().split('T')[0]}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'SVG exported',
      description: 'The knowledge graph has been exported as SVG',
    });
  };
  
  return (
    <div className="space-y-4">
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="graph">Graph View</TabsTrigger>
          <TabsTrigger value="details">Node Details</TabsTrigger>
        </TabsList>
        
        <TabsContent value="graph">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </div>
                <div className="flex gap-1">
                  <Badge variant="outline">{filteredNodes.length} nodes</Badge>
                  <Badge variant="outline">{filteredEdges.length} connections</Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="nodeFilter">Filter by Type</Label>
                  <Select value={nodeFilter} onValueChange={setNodeFilter}>
                    <SelectTrigger id="nodeFilter">
                      <SelectValue placeholder="Select node type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {nodeTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="relative">
                  <Label htmlFor="searchNodes">Search Nodes</Label>
                  <div className="relative">
                    <Input
                      id="searchNodes"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by content..."
                      className="pr-10"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setSearchQuery('')}
                      >
                        <SearchX className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-1 flex justify-between">
                    <Label htmlFor="linkDistance">Link Distance: {linkDistance}</Label>
                  </div>
                  <Slider 
                    id="linkDistance"
                    min={50} 
                    max={300} 
                    step={10} 
                    value={[linkDistance]} 
                    onValueChange={(values) => setLinkDistance(values[0])} 
                  />
                </div>
                
                <div>
                  <div className="mb-1 flex justify-between">
                    <Label htmlFor="chargeStrength">Charge Strength: {chargeStrength}</Label>
                  </div>
                  <Slider 
                    id="chargeStrength"
                    min={-1000} 
                    max={0} 
                    step={50} 
                    value={[chargeStrength]} 
                    onValueChange={(values) => setChargeStrength(values[0])} 
                  />
                </div>
              </div>
              
              <div className="border rounded-md" style={{ height: '500px' }}>
                <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="text-sm font-medium">Node Types</div>
                <div className="flex flex-wrap gap-2">
                  {nodeTypes.map(type => (
                    <div key={type} className="flex items-center gap-1.5">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getNodeColor(type) }} 
                      />
                      <span className="text-xs">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportSVG}>
                  <Download className="mr-2 h-4 w-4" />
                  Export SVG
                </Button>
                <Button variant="outline" onClick={() => {
                  // Reset filters
                  setNodeFilter('all');
                  setSearchQuery('');
                }}>
                  <Filter className="mr-2 h-4 w-4" />
                  Reset Filters
                </Button>
              </div>
              
              {onSave && (
                <Button onClick={handleSaveGraph}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Graph
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Node Details</CardTitle>
              <CardDescription>
                {selectedNode ? `Details for ${selectedNode.type} node` : 'Select a node to view details'}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {selectedNode ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md">
                      <p className="text-sm text-gray-500">Type</p>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: getNodeColor(selectedNode.type) }} 
                        />
                        <p className="font-medium">
                          {selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md">
                      <p className="text-sm text-gray-500">ID</p>
                      <p className="font-medium">{selectedNode.id}</p>
                    </div>
                    
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md">
                      <p className="text-sm text-gray-500">Connections</p>
                      <p className="font-medium">{relatedNodes.length}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Node Content</h3>
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md">
                      <p>{selectedNode.content}</p>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Related Nodes</h3>
                    {relatedNodes.length > 0 ? (
                      <div className="space-y-2">
                        {relatedNodes.map(node => (
                          <div 
                            key={node.id} 
                            className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-3 rounded-md border cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                            onClick={() => handleNodeClick(node)}
                          >
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: getNodeColor(node.type) }} 
                              />
                              <span className="text-sm font-medium">{node.content}</span>
                            </div>
                            <Badge variant="outline">
                              {node.type}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-md">
                        <p className="text-sm text-gray-500">No connections found</p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Relationships</h3>
                    {edges.filter(edge => {
                      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
                      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
                      return sourceId === selectedNode.id || targetId === selectedNode.id;
                    }).length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">From</th>
                              <th className="text-left p-2">Relationship</th>
                              <th className="text-left p-2">To</th>
                            </tr>
                          </thead>
                          <tbody>
                            {edges.filter(edge => {
                              const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
                              const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
                              return sourceId === selectedNode.id || targetId === selectedNode.id;
                            }).map((edge, index) => {
                              const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
                              const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
                              const sourceNode = getNodeById(sourceId);
                              const targetNode = getNodeById(targetId);
                              
                              return (
                                <tr key={index} className="border-b">
                                  <td className="p-2">
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-2 h-2 rounded-full" 
                                        style={{ backgroundColor: getNodeColor(sourceNode?.type || '') }} 
                                      />
                                      <span className="text-sm">
                                        {sourceNode?.content?.substring(0, 20) || sourceId}
                                        {sourceNode?.content?.length > 20 ? '...' : ''}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-2">
                                    <Badge variant="outline" className="text-xs">
                                      {edge.relationship}
                                    </Badge>
                                  </td>
                                  <td className="p-2">
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className="w-2 h-2 rounded-full" 
                                        style={{ backgroundColor: getNodeColor(targetNode?.type || '') }} 
                                      />
                                      <span className="text-sm">
                                        {targetNode?.content?.substring(0, 20) || targetId}
                                        {targetNode?.content?.length > 20 ? '...' : ''}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center p-4 bg-slate-50 dark:bg-slate-900 rounded-md">
                        <p className="text-sm text-gray-500">No relationships found</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="mx-auto rounded-full bg-slate-100 dark:bg-slate-800 p-4 inline-flex mb-4">
                    <svg className="h-6 w-6 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium">No Node Selected</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    Click on a node in the graph view to see its details
                  </p>
                </div>
              )}
            </CardContent>
            
            <CardFooter>
              <Button 
                variant="outline" 
                onClick={() => setSelectedTab('graph')}
                className="ml-auto"
              >
                Back to Graph View
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default KnowledgeGraphVisualization;