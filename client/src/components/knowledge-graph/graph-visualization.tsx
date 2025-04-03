import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Types for the knowledge graph data
export interface GraphNode {
  id: string;
  type: string;
  content: string;
  metadata?: Record<string, any>;
  importance?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship: string;
  weight?: number;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// Configuration options for the visualization
interface GraphVisualizationProps {
  data: KnowledgeGraphData;
  width?: number;
  height?: number;
  onNodeClick?: (node: GraphNode) => void;
  onEdgeClick?: (edge: GraphEdge) => void;
  colorScheme?: 'category' | 'importance';
  showLabels?: boolean;
  enableDrag?: boolean;
  highlightConnections?: boolean;
  zoomable?: boolean;
  showControls?: boolean;
  isLoading?: boolean;
}

// Define node type colors
const NODE_COLORS = {
  concept: '#4F46E5', // indigo
  entity: '#0891B2', // cyan
  topic: '#BE123C', // rose
  term: '#15803D', // green
  reference: '#B45309', // amber
  requirement: '#7C3AED', // violet
  procedure: '#0369A1', // sky
  system: '#9333EA', // purple
  document: '#65A30D', // lime
  syllabus: '#EA580C', // orange
  module: '#0E7490', // teal
  lesson: '#1D4ED8', // blue
  competency: '#DC2626', // red
  objective: '#4338CA', // indigo
  unknown: '#71717A', // gray
};

// Define edge type colors
const EDGE_COLORS = {
  related_to: '#94A3B8', // slate
  part_of: '#475569', // slate
  has_part: '#334155', // slate
  derived_from: '#1E293B', // slate
  referenced_by: '#0F172A', // slate
  references: '#64748B', // slate
  depends_on: '#52525B', // gray
  prerequisite_for: '#27272A', // gray
  similar_to: '#78716C', // stone
  contrasts_with: '#44403C', // stone
  defined_in: '#292524', // stone
  defines: '#1C1917', // stone
  succeeded_by: '#57534E', // stone
  precedes: '#E7E5E4', // stone
  teaches: '#0E7490', // teal
  contains: '#0891B2', // cyan
  requires: '#BE123C', // rose
  unknown: '#9CA3AF', // gray
};

export default function GraphVisualization({
  data,
  width = 800,
  height = 600,
  onNodeClick,
  onEdgeClick,
  colorScheme = 'category',
  showLabels = true,
  enableDrag = true,
  highlightConnections = true,
  zoomable = true,
  showControls = true,
  isLoading = false,
}: GraphVisualizationProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [filteredNodeType, setFilteredNodeType] = useState<string | null>(null);
  const [filteredRelationship, setFilteredRelationship] = useState<string | null>(null);
  const [simulation, setSimulation] = useState<d3.Simulation<any, any> | null>(null);
  const [highlightedNode, setHighlightedNode] = useState<string | null>(null);

  // Extract unique node types and relationship types for filtering
  const nodeTypes = [...new Set(data.nodes.map(node => node.type))];
  const relationshipTypes = [...new Set(data.edges.map(edge => edge.relationship))];

  useEffect(() => {
    if (isLoading || !data || data.nodes.length === 0 || !svgRef.current) {
      return;
    }

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    // Filter nodes and edges based on selections
    const filteredNodes = filteredNodeType 
      ? data.nodes.filter(node => node.type === filteredNodeType)
      : data.nodes;
    
    const filteredEdges = filteredRelationship
      ? data.edges.filter(edge => edge.relationship === filteredRelationship)
      : data.edges;

    // Filter edges to only include connections between filtered nodes
    const filteredNodeIds = new Set(filteredNodes.map(node => node.id));
    const connectedEdges = filteredEdges.filter(
      edge => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
    );

    // Create a D3 force simulation
    const sim = d3.forceSimulation(filteredNodes)
      .force('charge', d3.forceManyBody().strength(-150))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('link', d3.forceLink(connectedEdges)
        .id((d: any) => d.id)
        .distance(100)
      )
      .force('collide', d3.forceCollide(30));

    // Create SVG container with zoom functionality
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    if (zoomable) {
      const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        });

      svg.call(zoom as any);
    }

    // Create a group to contain all the elements
    const g = svg.append('g');

    // Create edge lines
    const links = g.selectAll('.link')
      .data(connectedEdges)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', d => {
        const color = EDGE_COLORS[d.relationship as keyof typeof EDGE_COLORS] || EDGE_COLORS.unknown;
        return color;
      })
      .attr('stroke-width', d => Math.max(1, (d.weight || 1) * 2))
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrowhead)')
      .on('click', (event, d) => {
        if (onEdgeClick) {
          onEdgeClick(d);
        }
      })
      .on('mouseover', function() {
        d3.select(this)
          .attr('stroke-width', d => Math.max(3, (d.weight || 1) * 3))
          .attr('stroke-opacity', 1);
      })
      .on('mouseout', function() {
        d3.select(this)
          .attr('stroke-width', d => Math.max(1, (d.weight || 1) * 2))
          .attr('stroke-opacity', 0.6);
      });

    // Define arrowhead marker
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .append('path')
      .attr('d', 'M 0,-5 L 10,0 L 0,5')
      .attr('fill', '#999')
      .attr('stroke-width', 0);

    // Create labels for edges if showLabels is true
    if (showLabels) {
      const linkLabels = g.selectAll('.link-label')
        .data(connectedEdges)
        .enter()
        .append('text')
        .attr('class', 'link-label')
        .attr('dy', -5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '8px')
        .attr('fill', '#666')
        .text(d => d.relationship);
    }

    // Create node circles
    const nodes = g.selectAll('.node')
      .data(filteredNodes)
      .enter()
      .append('circle')
      .attr('class', 'node')
      .attr('r', d => 5 + (d.importance || 1) * 5)
      .attr('fill', d => {
        if (colorScheme === 'importance') {
          // Color based on importance using a color scale
          const importanceScale = d3.scaleSequential(d3.interpolateViridis)
            .domain([0, 1]);
          return importanceScale(d.importance || 0.5);
        } else {
          // Color based on node type
          return NODE_COLORS[d.type as keyof typeof NODE_COLORS] || NODE_COLORS.unknown;
        }
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .on('click', (event, d) => {
        if (onNodeClick) {
          onNodeClick(d);
        }
      })
      .on('mouseover', (event, d) => {
        if (highlightConnections) {
          setHighlightedNode(d.id);
          
          // Highlight this node
          d3.select(event.currentTarget)
            .attr('stroke', '#000')
            .attr('stroke-width', 2);
          
          // Highlight connected edges and nodes
          links.attr('stroke-opacity', link => 
            link.source.id === d.id || link.target.id === d.id ? 1 : 0.1
          ).attr('stroke-width', link => {
            const width = Math.max(1, (link.weight || 1) * 2);
            return link.source.id === d.id || link.target.id === d.id ? width * 1.5 : width;
          });
          
          nodes.attr('opacity', node => 
            node.id === d.id || 
            connectedEdges.some(link => 
              (link.source.id === d.id && link.target.id === node.id) || 
              (link.target.id === d.id && link.source.id === node.id)
            ) ? 1 : 0.2
          );
          
          // Show tooltip
          tooltip.style('visibility', 'visible')
            .html(`<strong>${d.content}</strong><br>Type: ${d.type}`);
        }
      })
      .on('mousemove', (event) => {
        // Position tooltip near mouse
        tooltip.style('top', (event.pageY - 10) + 'px')
          .style('left', (event.pageX + 10) + 'px');
      })
      .on('mouseout', (event) => {
        if (highlightConnections) {
          setHighlightedNode(null);
          
          // Reset node styling
          d3.select(event.currentTarget)
            .attr('stroke', '#fff')
            .attr('stroke-width', 1.5);
          
          // Reset edge opacity
          links.attr('stroke-opacity', 0.6)
            .attr('stroke-width', d => Math.max(1, (d.weight || 1) * 2));
          
          // Reset node opacity
          nodes.attr('opacity', 1);
          
          // Hide tooltip
          tooltip.style('visibility', 'hidden');
        }
      });

    // Add labels to nodes if showLabels is true
    if (showLabels) {
      const nodeLabels = g.selectAll('.node-label')
        .data(filteredNodes)
        .enter()
        .append('text')
        .attr('class', 'node-label')
        .attr('dx', 12)
        .attr('dy', 4)
        .attr('font-size', '10px')
        .attr('fill', '#333')
        .text(d => {
          // Truncate long labels
          const maxLength = 20;
          return d.content.length > maxLength 
            ? d.content.substring(0, maxLength) + '...' 
            : d.content;
        });
    }

    // Create a tooltip div
    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'graph-tooltip')
      .style('position', 'absolute')
      .style('padding', '8px')
      .style('background', 'white')
      .style('border', '1px solid #ddd')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('font-size', '12px')
      .style('visibility', 'hidden')
      .style('z-index', '10');

    // Enable node dragging if allowed
    if (enableDrag) {
      nodes.call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) sim.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }) as any);
    }

    // Update positions on each tick of the simulation
    sim.on('tick', () => {
      links
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      nodes
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      if (showLabels) {
        g.selectAll('.node-label')
          .attr('x', d => d.x)
          .attr('y', d => d.y);

        g.selectAll('.link-label')
          .attr('x', d => (d.source.x + d.target.x) / 2)
          .attr('y', d => (d.source.y + d.target.y) / 2);
      }
    });

    // Set the simulation
    setSimulation(sim);

    // Cleanup function
    return () => {
      if (simulation) {
        simulation.stop();
      }
      d3.select('body').selectAll('.graph-tooltip').remove();
    };
  }, [
    data, 
    width, 
    height, 
    colorScheme, 
    showLabels, 
    enableDrag, 
    highlightConnections, 
    zoomable, 
    onNodeClick, 
    onEdgeClick, 
    filteredNodeType, 
    filteredRelationship,
    isLoading
  ]);

  // Function to handle resetting the graph
  const handleReset = () => {
    setFilteredNodeType(null);
    setFilteredRelationship(null);
    if (simulation) {
      simulation.alpha(1).restart();
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border shadow-sm" style={{ width, height }}>
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Loading knowledge graph...</p>
      </div>
    );
  }

  if (!data || data.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border shadow-sm" style={{ width, height }}>
        <p className="text-muted-foreground mb-4">No knowledge graph data available</p>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {showControls && (
        <Card className="mb-4">
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Filter by node type:</span>
                <Select value={filteredNodeType || ''} onValueChange={(value) => setFilteredNodeType(value || null)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="All node types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All node types</SelectItem>
                    {nodeTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Filter by relationship:</span>
                <Select value={filteredRelationship || ''} onValueChange={(value) => setFilteredRelationship(value || null)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All relationships" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All relationships</SelectItem>
                    {relationshipTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleReset}
                    >
                      Reset View
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reset filters and graph position</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="ml-auto flex space-x-2">
                <div className="text-xs text-muted-foreground">
                  {data.nodes.length} nodes, {data.edges.length} connections
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative border rounded-lg overflow-hidden bg-white" style={{ width, height, minHeight: 300 }}>
        <svg ref={svgRef} className="w-full h-full"></svg>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {Object.entries(NODE_COLORS).slice(0, 5).map(([type, color]) => (
          <div key={type} className="flex items-center text-xs">
            <div className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: color }}></div>
            <span>{type}</span>
          </div>
        ))}
        <div className="text-xs text-muted-foreground ml-2">
          {Object.keys(NODE_COLORS).length > 5 && `+${Object.keys(NODE_COLORS).length - 5} more types`}
        </div>
      </div>
    </div>
  );
}