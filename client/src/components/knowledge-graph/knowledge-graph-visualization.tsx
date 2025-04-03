import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ZoomIn, ZoomOut, RefreshCw, Download, Search, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchKnowledgeGraph } from '@/services/knowledge-graph-service';
import { Node, Edge, KnowledgeGraph } from '@shared/knowledge-graph-types';

interface KnowledgeGraphVisualizationProps {
  documentId: number;
  width?: number;
  height?: number;
}

const KnowledgeGraphVisualization: React.FC<KnowledgeGraphVisualizationProps> = ({
  documentId,
  width = 800,
  height = 600
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeType, setSelectedNodeType] = useState<string | null>(null);
  const [showLabels, setShowLabels] = useState(true);
  
  const { data, isLoading, error, refetch } = useQuery<KnowledgeGraph>({
    queryKey: ['/api/knowledge-graph', documentId],
    queryFn: () => fetchKnowledgeGraph(documentId)
  });
  
  useEffect(() => {
    if (!data || isLoading || !svgRef.current) return;
    
    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();
    
    const svg = d3.select(svgRef.current);
    const g = svg.append('g');
    
    // Apply zoom behavior
    const zoomBehavior = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoom(event.transform.k);
      });
    
    svg.call(zoomBehavior as any);
    
    // Filter nodes based on search and filter
    let filteredNodes = [...data.nodes];
    let filteredEdges = [...data.edges];
    
    if (searchQuery) {
      const lowercaseQuery = searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(node => 
        node.label.toLowerCase().includes(lowercaseQuery)
      );
      
      // Only keep edges that connect to filtered nodes
      const nodeIds = new Set(filteredNodes.map(n => n.id));
      filteredEdges = filteredEdges.filter(edge => 
        nodeIds.has(edge.source) && nodeIds.has(edge.target)
      );
    }
    
    if (selectedNodeType) {
      filteredNodes = filteredNodes.filter(node => node.type === selectedNodeType);
      const nodeIds = new Set(filteredNodes.map(n => n.id));
      filteredEdges = filteredEdges.filter(edge => 
        nodeIds.has(edge.source) && nodeIds.has(edge.target)
      );
    }
    
    // Create a force simulation
    const simulation = d3.forceSimulation(filteredNodes as d3.SimulationNodeDatum[])
      .force('link', d3.forceLink(filteredEdges)
        .id((d: any) => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2));
    
    // Define color scale based on node types
    const nodeTypes = Array.from(new Set(data.nodes.map(n => n.type)));
    const colorScale = d3.scaleOrdinal()
      .domain(nodeTypes)
      .range(d3.schemeCategory10);
    
    // Draw links
    const links = g.selectAll('.link')
      .data(filteredEdges)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1);
    
    // Create node groups
    const nodeGroups = g.selectAll('.node')
      .data(filteredNodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragging)
        .on('end', dragEnded) as any);
    
    // Add circles to nodes
    nodeGroups.append('circle')
      .attr('r', (d: Node) => getNodeSize(d))
      .attr('fill', (d: Node) => colorScale(d.type) as string)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);
    
    // Add labels to nodes if showLabels is true
    if (showLabels) {
      nodeGroups.append('text')
        .attr('dy', 4)
        .attr('dx', (d: Node) => getNodeSize(d) + 5)
        .text((d: Node) => truncateLabel(d.label))
        .attr('font-size', '10px')
        .attr('fill', '#333');
    }
    
    // Add hover title
    nodeGroups.append('title')
      .text((d: Node) => `${d.label}\nType: ${d.type}`);
    
    // Update positions on each simulation tick
    simulation.on('tick', () => {
      links
        .attr('x1', (d: Edge) => (d as any).source.x)
        .attr('y1', (d: Edge) => (d as any).source.y)
        .attr('x2', (d: Edge) => (d as any).target.x)
        .attr('y2', (d: Edge) => (d as any).target.y);
      
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
    
    // Helper function for getting node size
    function getNodeSize(node: Node): number {
      // Adjust size based on node properties
      return node.importance ? 7 + node.importance * 3 : 7;
    }
    
    // Helper function to truncate node labels
    function truncateLabel(label: string): string {
      return label.length > 15 ? label.substring(0, 15) + '...' : label;
    }
    
    // Initial zoom to fit the graph
    const initialTransform = d3.zoomIdentity.scale(0.8);
    svg.call(zoomBehavior.transform as any, initialTransform);
    
    return () => {
      simulation.stop();
    };
  }, [data, isLoading, documentId, searchQuery, selectedNodeType, showLabels, width, height]);
  
  // Handle zoom controls
  const handleZoomIn = () => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const currentTransform = d3.zoomTransform(svg.node() as Element);
    const newZoom = Math.min(currentTransform.k * 1.3, 4);
    
    svg.transition().duration(300).call(
      (d3.zoom() as any).transform,
      d3.zoomIdentity.scale(newZoom).translate(
        currentTransform.x / currentTransform.k,
        currentTransform.y / currentTransform.k
      )
    );
  };
  
  const handleZoomOut = () => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    const currentTransform = d3.zoomTransform(svg.node() as Element);
    const newZoom = Math.max(currentTransform.k / 1.3, 0.1);
    
    svg.transition().duration(300).call(
      (d3.zoom() as any).transform,
      d3.zoomIdentity.scale(newZoom).translate(
        currentTransform.x / currentTransform.k,
        currentTransform.y / currentTransform.k
      )
    );
  };
  
  // Handle download as SVG or PNG
  const handleDownload = (format: 'svg' | 'png') => {
    if (!svgRef.current) return;
    
    const svgElement = svgRef.current;
    
    if (format === 'svg') {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `knowledge-graph-${documentId}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'png') {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        const img = new Image();
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const blob = new Blob([svgData], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);
          
          const pngUrl = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = pngUrl;
          link.download = `knowledge-graph-${documentId}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };
        
        img.src = url;
      }
    }
  };
  
  // List of available node types for filtering
  const nodeTypes = data 
    ? Array.from(new Set(data.nodes.map(n => n.type)))
    : [];
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-96">Loading knowledge graph...</div>;
  }
  
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            Error loading knowledge graph: {(error as Error).message}
          </div>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (!data || data.nodes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            No knowledge graph data available for this document.
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {data.nodes.length} Nodes
          </Badge>
          <Badge variant="outline">
            {data.edges.length} Connections
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleDownload('svg')}>
            <Download className="h-4 w-4 mr-1" />
            SVG
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleDownload('png')}>
            <Download className="h-4 w-4 mr-1" />
            PNG
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="graph">
        <TabsList className="mb-4">
          <TabsTrigger value="graph">Graph View</TabsTrigger>
          <TabsTrigger value="filters">Filters & Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="filters">
          <Card>
            <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Search & Filter</h3>
                
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search nodes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span>Filter by node type:</span>
                  </div>
                  
                  <Select
                    value={selectedNodeType || ''}
                    onValueChange={(value) => setSelectedNodeType(value || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All node types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All node types</SelectItem>
                      {nodeTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Display Settings</h3>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-labels">Show Node Labels</Label>
                  <Switch
                    id="show-labels"
                    checked={showLabels}
                    onCheckedChange={setShowLabels}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Zoom Level</Label>
                    <span className="text-sm text-muted-foreground">{Math.round(zoom * 100)}%</span>
                  </div>
                  <Slider
                    value={[zoom * 100]}
                    min={10}
                    max={400}
                    step={10}
                    onValueChange={([value]) => {
                      if (!svgRef.current) return;
                      
                      const svg = d3.select(svgRef.current);
                      const newZoom = value / 100;
                      
                      svg.transition().duration(300).call(
                        (d3.zoom() as any).transform,
                        d3.zoomIdentity.scale(newZoom)
                      );
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="graph">
          <div className="border rounded-md overflow-hidden bg-background">
            <svg 
              ref={svgRef} 
              width={width} 
              height={height}
              className="w-full h-auto max-h-[70vh]"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default KnowledgeGraphVisualization;
