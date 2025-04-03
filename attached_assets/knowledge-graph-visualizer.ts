/**
 * KnowledgeGraphVisualizer - Interactive visualization of syllabus topics and their relationships
 * using D3.js for graph visualization with proper TypeScript typings.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';

// Node data structure representing a syllabus topic
export interface KnowledgeNode {
  id: string;
  title: string;
  category: string;
  description?: string;
  level: number; // 1 = beginner, 5 = advanced
  importance: number; // 1 = low, 5 = high
  estimatedHours?: number;
  status?: 'notStarted' | 'inProgress' | 'completed' | 'assessed';
  score?: number; // 0-100 assessment score if assessed
  tags?: string[];
  moduleId?: string;
}

// Edge data structure representing relationships between topics
export interface KnowledgeEdge {
  source: string; // Node ID
  target: string; // Node ID
  type: 'prerequisite' | 'related' | 'builds-on' | 'recommended-sequence';
  strength: number; // 1-10, how strong the relationship is
  description?: string;
}

// Full graph data structure
export interface KnowledgeGraphData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  categories: {
    [key: string]: {
      name: string;
      color: string;
      description?: string;
    };
  };
}

// Component props
export interface KnowledgeGraphVisualizerProps {
  data: KnowledgeGraphData;
  width?: number;
  height?: number;
  onNodeClick?: (node: KnowledgeNode) => void;
  onEdgeClick?: (edge: KnowledgeEdge) => void;
  highlightNodeIds?: string[];
  highlightEdgeIds?: string[];
  filterCategories?: string[];
  filterMinLevel?: number;
  filterMaxLevel?: number;
  filterTags?: string[];
  layout?: 'force' | 'radial' | 'hierarchical';
  showLabels?: boolean;
  enableZoom?: boolean;
  enableDrag?: boolean;
  nodeSize?: 'fixed' | 'byLevel' | 'byImportance';
  darkMode?: boolean;
}

// Internal D3 node type including simulation properties
interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  title: string;
  category: string;
  level: number;
  importance: number;
  status?: 'notStarted' | 'inProgress' | 'completed' | 'assessed';
  score?: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  radius?: number;
  highlighted?: boolean;
}

// Internal D3 link type
interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
  source: string | SimulationNode;
  target: string | SimulationNode;
  type: string;
  strength: number;
  highlighted?: boolean;
}

// Main Knowledge Graph Visualizer component
export const KnowledgeGraphVisualizer: React.FC<KnowledgeGraphVisualizerProps> = ({
  data,
  width = 800,
  height = 600,
  onNodeClick,
  onEdgeClick,
  highlightNodeIds = [],
  highlightEdgeIds = [],
  filterCategories,
  filterMinLevel = 1,
  filterMaxLevel = 5,
  filterTags,
  layout = 'force',
  showLabels = true,
  enableZoom = true,
  enableDrag = true,
  nodeSize = 'byImportance',
  darkMode = false
}) => {
  // Refs for D3 elements
  const svgRef = useRef<SVGSVGElement>(null);
  const graphRef = useRef<SVGGElement>(null);
  
  // State for the current simulation and selection
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<KnowledgeEdge | null>(null);
  const [simulation, setSimulation] = useState<d3.Simulation<SimulationNode, SimulationLink> | null>(null);
  
  // Theme colors based on dark mode
  const theme = useMemo(() => ({
    background: darkMode ? '#1a1a2e' : '#ffffff',
    text: darkMode ? '#ffffff' : '#333333',
    nodeStroke: darkMode ? '#444444' : '#ffffff',
    linkStroke: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
    highlightStroke: darkMode ? '#ffffff' : '#000000',
    tooltip: {
      background: darkMode ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
      text: darkMode ? '#ffffff' : '#333333',
      border: darkMode ? '#444444' : '#cccccc'
    }
  }), [darkMode]);
  
  // Filter data based on props
  const filteredData = useMemo(() => {
    let filteredNodes = [...data.nodes];
    
    // Apply category filter
    if (filterCategories && filterCategories.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        filterCategories.includes(node.category)
      );
    }
    
    // Apply level filter
    filteredNodes = filteredNodes.filter(node => 
      node.level >= filterMinLevel && node.level <= filterMaxLevel
    );
    
    // Apply tags filter
    if (filterTags && filterTags.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        node.tags && node.tags.some(tag => filterTags.includes(tag))
      );
    }
    
    // Get filtered node IDs
    const filteredNodeIds = new Set(filteredNodes.map(node => node.id));
    
    // Filter edges to only include connections between filtered nodes
    const filteredEdges = data.edges.filter(edge => 
      filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
    );
    
    return {
      nodes: filteredNodes,
      edges: filteredEdges
    };
  }, [data, filterCategories, filterMinLevel, filterMaxLevel, filterTags]);
  
  // Create simulation nodes and links
  const simulationData = useMemo(() => {
    // Create node map for faster lookups
    const nodeMap = new Map<string, KnowledgeNode>();
    filteredData.nodes.forEach(node => nodeMap.set(node.id, node));
    
    // Prepare nodes for simulation
    const simNodes: SimulationNode[] = filteredData.nodes.map(node => {
      // Calculate node radius based on nodeSize setting
      let radius = 7; // Default size
      
      if (nodeSize === 'byImportance') {
        radius = 5 + (node.importance * 1.5);
      } else if (nodeSize === 'byLevel') {
        radius = 5 + (node.level * 1.5);
      }
      
      // Highlight nodes if specified
      const highlighted = highlightNodeIds.includes(node.id);
      
      return {
        ...node,
        radius,
        highlighted
      };
    });
    
    // Prepare links for simulation
    const simLinks: SimulationLink[] = filteredData.edges.map(edge => ({
      ...edge,
      highlighted: highlightEdgeIds.some(id => 
        id === `${edge.source}-${edge.target}-${edge.type}` || 
        id === `${edge.source}-${edge.target}`
      )
    }));
    
    return { nodes: simNodes, links: simLinks };
  }, [filteredData, nodeSize, highlightNodeIds, highlightEdgeIds]);
  
  // Initialize and update D3 visualization
  useEffect(() => {
    if (!svgRef.current || !graphRef.current) return;
    
    // Clear previous graph
    d3.select(graphRef.current).selectAll("*").remove();
    
    // Create tooltip
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "knowledge-graph-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", theme.tooltip.background)
      .style("color", theme.tooltip.text)
      .style("border", `1px solid ${theme.tooltip.border}`)
      .style("border-radius", "5px")
      .style("padding", "10px")
      .style("pointer-events", "none")
      .style("z-index", "10");
    
    // Create SVG elements
    const svg = d3.select(svgRef.current);
    const g = d3.select(graphRef.current);
    
    // Create forces based on layout
    let simulationForces;
    
    if (layout === 'force') {
      // Standard force-directed layout
      simulationForces = d3.forceSimulation<SimulationNode, SimulationLink>(simulationData.nodes)
        .force("link", d3.forceLink<SimulationNode, SimulationLink>(simulationData.links)
          .id(d => d.id)
          .distance(link => 100 - (link.strength * 5)) // Stronger links are shorter
        )
        .force("charge", d3.forceManyBody()
          .strength(-100)
          .distanceMax(500)
        )
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(d => (d.radius || 7) + 5));
    } else if (layout === 'radial') {
      // Radial layout (nodes organized in concentric circles by level)
      simulationForces = d3.forceSimulation<SimulationNode, SimulationLink>(simulationData.nodes)
        .force("link", d3.forceLink<SimulationNode, SimulationLink>(simulationData.links)
          .id(d => d.id)
          .distance(80)
        )
        .force("r", d3.forceRadial(d => (d.level * 80), width / 2, height / 2))
        .force("charge", d3.forceManyBody().strength(-200))
        .force("collision", d3.forceCollide().radius(d => (d.radius || 7) + 5));
    } else if (layout === 'hierarchical') {
      // Hierarchical layout (top-down tree-like structure)
      // First sort nodes by level
      simulationData.nodes.sort((a, b) => a.level - b.level);
      
      // Position nodes in layers
      const levelCounts = new Map<number, number>();
      const levelPositions = new Map<number, number[]>();
      
      // Count nodes per level
      simulationData.nodes.forEach(node => {
        const count = levelCounts.get(node.level) || 0;
        levelCounts.set(node.level, count + 1);
      });
      
      // Calculate node positions for each level
      levelCounts.forEach((count, level) => {
        const positions = [];
        const levelHeight = height / (Math.max(...Array.from(levelCounts.keys())) + 1);
        const levelY = level * levelHeight;
        
        for (let i = 0; i < count; i++) {
          const levelWidth = width / (count + 1);
          const levelX = (i + 1) * levelWidth;
          positions.push({ x: levelX, y: levelY });
        }
        
        levelPositions.set(level, positions);
      });
      
      // Assign initial positions
      levelCounts.clear();
      simulationData.nodes.forEach(node => {
        const count = levelCounts.get(node.level) || 0;
        const positions = levelPositions.get(node.level) || [];
        
        if (positions[count]) {
          node.x = positions[count].x;
          node.y = positions[count].y;
          node.fx = positions[count].x;
          node.fy = positions[count].y;
        }
        
        levelCounts.set(node.level, count + 1);
      });
      
      // Use weaker forces for fine-tuning positions
      simulationForces = d3.forceSimulation<SimulationNode, SimulationLink>(simulationData.nodes)
        .force("link", d3.forceLink<SimulationNode, SimulationLink>(simulationData.links)
          .id(d => d.id)
          .distance(60)
          .strength(0.2)
        )
        .force("charge", d3.forceManyBody().strength(-30))
        .force("collision", d3.forceCollide().radius(d => (d.radius || 7) + 2));
    }
    
    // Create arrow marker for directed edges
    svg.append("defs").selectAll("marker")
      .data(["arrow"])
      .enter().append("marker")
      .attr("id", d => d)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 18)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", theme.linkStroke)
      .attr("d", "M0,-5L10,0L0,5");
    
    // Create links (edges)
    const links = g.selectAll(".link")
      .data(simulationData.links)
      .enter().append("line")
      .attr("class", "link")
      .attr("stroke", d => d.highlighted ? theme.highlightStroke : theme.linkStroke)
      .attr("stroke-width", d => d.highlighted ? 2 : 1)
      .attr("stroke-dasharray", d => {
        if (d.type === 'recommended-sequence') return "5,5";
        if (d.type === 'related') return "3,3";
        return null; // Solid line for prerequisite and builds-on
      })
      .attr("marker-end", "url(#arrow)")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("stroke-width", 3)
          .attr("stroke", theme.highlightStroke);
        
        tooltip.style("visibility", "visible")
          .html(`
            <div style="font-weight: bold;">${d.type}</div>
            <div>Strength: ${d.strength}/10</div>
            ${d.description ? `<div>${d.description}</div>` : ''}
          `);
      })
      .on("mousemove", function(event) {
        tooltip
          .style("top", (event.pageY - 10) + "px")
          .style("left", (event.pageX + 10) + "px");
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .attr("stroke-width", d.highlighted ? 2 : 1)
          .attr("stroke", d.highlighted ? theme.highlightStroke : theme.linkStroke);
        
        tooltip.style("visibility", "hidden");
      })
      .on("click", function(event, d) {
        if (onEdgeClick) {
          // Convert SimulationLink back to KnowledgeEdge
          const edge: KnowledgeEdge = {
            source: typeof d.source === 'object' ? d.source.id : d.source,
            target: typeof d.target === 'object' ? d.target.id : d.target,
            type: d.type as any,
            strength: d.strength
          };
          
          setSelectedEdge(edge);
          onEdgeClick(edge);
        }
      });
    
    // Create nodes
    const nodes = g.selectAll(".node")
      .data(simulationData.nodes)
      .enter().append("g")
      .attr("class", "node")
      .call(enableDrag 
        ? d3.drag<SVGGElement, SimulationNode>()
            .on("start", dragStarted)
            .on("drag", dragging)
            .on("end", dragEnded)
        : () => {} // No-op if drag is disabled
      );
    
    // Add node circle
    nodes.append("circle")
      .attr("r", d => d.radius || 7)
      .attr("fill", d => {
        const categoryColor = data.categories[d.category]?.color || "#999999";
        
        // Adjust color based on status
        switch (d.status) {
          case 'completed':
            return d3.color(categoryColor)!.brighter(0.5).toString(); // Brighter version
          case 'assessed':
            return d3.interpolateRgb(categoryColor, "#ffffff")(d.score ? d.score / 100 : 0.5); // Blend with white based on score
          case 'inProgress':
            return d3.color(categoryColor)!.toString(); // Normal color
          case 'notStarted':
          default:
            return d3.color(categoryColor)!.darker(0.3).toString(); // Darker version
        }
      })
      .attr("stroke", d => d.highlighted ? theme.highlightStroke : theme.nodeStroke)
      .attr("stroke-width", d => d.highlighted ? 3 : 1.5)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("stroke-width", 4)
          .attr("stroke", theme.highlightStroke);
        
        // Highlight connected links and nodes
        links.each(function(link) {
          if ((typeof link.source === 'object' && link.source.id === d.id) ||
              (typeof link.target === 'object' && link.target.id === d.id)) {
            d3.select(this)
              .attr("stroke-width", 2)
              .attr("stroke", theme.highlightStroke);
          }
        });
        
        tooltip.style("visibility", "visible")
          .html(`
            <div style="font-weight: bold;">${d.title}</div>
            <div>${data.categories[d.category]?.name || d.category}</div>
            <div>Level: ${d.level}/5 | Importance: ${d.importance}/5</div>
            ${d.status ? `<div>Status: ${d.status}</div>` : ''}
            ${d.score !== undefined ? `<div>Score: ${d.score}%</div>` : ''}
            ${d.description ? `<div>${d.description}</div>` : ''}
            ${d.estimatedHours ? `<div>Estimated Hours: ${d.estimatedHours}h</div>` : ''}
          `);
      })
      .on("mousemove", function(event) {
        tooltip
          .style("top", (event.pageY - 10) + "px")
          .style("left", (event.pageX + 10) + "px");
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .attr("stroke-width", d.highlighted ? 3 : 1.5)
          .attr("stroke", d.highlighted ? theme.highlightStroke : theme.nodeStroke);
        
        // Restore link styling
        links.each(function(link) {
          if ((typeof link.source === 'object' && link.source.id === d.id) ||
              (typeof link.target === 'object' && link.target.id === d.id)) {
            d3.select(this)
              .attr("stroke-width", link.highlighted ? 2 : 1)
              .attr("stroke", link.highlighted ? theme.highlightStroke : theme.linkStroke);
          }
        });
        
        tooltip.style("visibility", "hidden");
      })
      .on("click", function(event, d) {
        if (onNodeClick) {
          // Convert SimulationNode back to KnowledgeNode
          const node: KnowledgeNode = {
            id: d.id,
            title: d.title,
            category: d.category,
            level: d.level,
            importance: d.importance,
            status: d.status,
            score: d.score
          };
          
          setSelectedNode(node);
          onNodeClick(node);
        }
      });
    
    // Add status indicator (checkmark for completed, progress circle for in-progress)
    nodes.filter(d => d.status === 'completed' || d.status === 'assessed')
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".3em")
      .attr("font-family", "sans-serif")
      .attr("font-size", d => d.radius ? d.radius * 0.8 : 6)
      .attr("fill", theme.nodeStroke)
      .text("✓");
    
    nodes.filter(d => d.status === 'inProgress')
      .append("circle")
      .attr("r", d => (d.radius || 7) * 0.4)
      .attr("fill", "none")
      .attr("stroke", theme.nodeStroke)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "1,1");
    
    // Add text labels if enabled
    if (showLabels) {
      nodes.append("text")
        .attr("dy", d => (d.radius || 7) + 12)
        .attr("text-anchor", "middle")
        .attr("font-family", "sans-serif")
        .attr("font-size", "10px")
        .attr("fill", theme.text)
        .text(d => d.title)
        .each(function(d) {
          // Truncate long labels
          const textElement = d3.select(this);
          const text = d.title;
          
          if (text.length > 15) {
            textElement.text(text.substring(0, 12) + "...");
          }
        })
        .style("pointer-events", "none") // Prevent labels from intercepting mouse events
        .style("user-select", "none"); // Prevent text selection
    }
    
    // Update positions on simulation tick
    if (simulationForces) {
      simulationForces
        .on("tick", () => {
          // Update link positions
          links
            .attr("x1", d => typeof d.source === 'object' ? d.source.x || 0 : 0)
            .attr("y1", d => typeof d.source === 'object' ? d.source.y || 0 : 0)
            .attr("x2", d => typeof d.target === 'object' ? d.target.x || 0 : 0)
            .attr("y2", d => typeof d.target === 'object' ? d.target.y || 0 : 0);
          
          // Update node positions
          nodes
            .attr("transform", d => `translate(${Math.max(d.radius || 7, Math.min(width - (d.radius || 7), d.x || 0))},${Math.max(d.radius || 7, Math.min(height - (d.radius || 7), d.y || 0))})`);
        })
        .alphaTarget(0)
        .alphaDecay(0.05);
      
      setSimulation(simulationForces);
    }
    
    // Add zoom behavior if enabled
    if (enableZoom) {
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.2, 3])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        });
      
      svg.call(zoom);
    }
    
    // Drag functions
    function dragStarted(event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>, d: SimulationNode) {
      if (!event.active && simulation) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragging(event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>, d: SimulationNode) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragEnded(event: d3.D3DragEvent<SVGGElement, SimulationNode, SimulationNode>, d: SimulationNode) {
      if (!event.active && simulation) simulation.alphaTarget(0);
      if (!enableDrag) {
        d.fx = null;
        d.fy = null;
      }
    }
    
    // Cleanup on unmount
    return () => {
      tooltip.remove();
      if (simulation) simulation.stop();
    };
  }, [
    simulationData, 
    width, 
    height, 
    layout, 
    showLabels, 
    enableZoom, 
    enableDrag, 
    theme, 
    onNodeClick, 
    onEdgeClick,
    data.categories
  ]);
  
  return (
    <div 
      className="knowledge-graph-container" 
      style={{ 
        width, 
        height, 
        position: 'relative',
        backgroundColor: theme.background,
        borderRadius: '5px',
        overflow: 'hidden'
      }}
    >
      <svg 
        ref={svgRef}
        width={width}
        height={height}
        style={{ display: 'block' }}
      >
        <g ref={graphRef} />
      </svg>
      
      {/* Legend */}
      <div 
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          maxWidth: '250px'
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Categories</div>
        {Object.entries(data.categories).map(([key, category]) => (
          <div 
            key={key} 
            style={{ 
              display: 'flex', 
              alignItems: 'center',
              marginBottom: '3px',
              opacity: filterCategories && !filterCategories.includes(key) ? 0.5 : 1
            }}
          >
            <div 
              style={{ 
                width: '12px', 
                height: '12px', 
                backgroundColor: category.color,
                marginRight: '5px',
                borderRadius: '2px'
              }} 
            />
            <span>{category.name}</span>
          </div>
        ))}
        
        <div style={{ fontWeight: 'bold', marginTop: '10px', marginBottom: '5px' }}>Status</div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
          <div 
            style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '14px', 
              height: '14px', 
              backgroundColor: '#888888',
              marginRight: '5px',
              borderRadius: '50%',
              fontSize: '10px',
              color: '#ffffff',
              fontWeight: 'bold'
            }} 
          >
            ✓
          </div>
          <span>Completed</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px' }}>
          <div 
            style={{ 
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '14px', 
              height: '14px', 
              border: '1px dashed #888888',
              marginRight: '5px',
              borderRadius: '50%'
            }} 
          />
          <span>In Progress</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div 
            style={{ 
              width: '14px', 
              height: '14px', 
              backgroundColor: '#555555',
              marginRight: '5px',
              borderRadius: '50%'
            }} 
          />
          <span>Not Started</span>
        </div>
      </div>
      
      {/* Controls */}
      <div 
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          display: 'flex',
          gap: '5px'
        }}
      >
        {enableZoom && (
          <>
            <button
              onClick={() => {
                if (svgRef.current && graphRef.current) {
                  const svg = d3.select(svgRef.current);
                  const zoom = d3.zoom<SVGSVGElement, unknown>()
                    .scaleExtent([0.2, 3]);
                  
                  svg.transition().duration(500).call(
                    zoom.transform,
                    d3.zoomIdentity.scale(1.2)
                  );
                }
              }}
              style={{
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                cursor: 'pointer'
              }}
            >
              Zoom In
            </button>
            <button
              onClick={() => {
                if (svgRef.current && graphRef.current) {
                  const svg = d3.select(svgRef.current);
                  const zoom = d3.zoom<SVGSVGElement, unknown>()
                    .scaleExtent([0.2, 3]);
                  
                  svg.transition().duration(500).call(
                    zoom.transform,
                    d3.zoomIdentity.scale(0.8)
                  );
                }
              }}
              style={{
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                cursor: 'pointer'
              }}
            >
              Zoom Out
            </button>
            <button
              onClick={() => {
                if (svgRef.current && graphRef.current) {
                  const svg = d3.select(svgRef.current);
                  const zoom = d3.zoom<SVGSVGElement, unknown>()
                    .scaleExtent([0.2, 3]);
                  
                  svg.transition().duration(500).call(
                    zoom.transform,
                    d3.zoomIdentity
                  );
                }
              }}
              style={{
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 10px',
                cursor: 'pointer'
              }}
            >
              Reset
            </button>
          </>
        )}
        
        {simulation && (
          <button
            onClick={() => {
              if (simulation) {
                simulation.alpha(0.3).restart();
              }
            }}
            style={{
              background: 'rgba(0,0,0,0.7)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '5px 10px',
              cursor: 'pointer'
            }}
          >
            Rearrange
          </button>
        )}
      </div>
    </div>
  );
};

// Example usage:
/*
import React, { useState } from 'react';
import { KnowledgeGraphVisualizer, KnowledgeGraphData, KnowledgeNode } from './KnowledgeGraphVisualizer';

const exampleData: KnowledgeGraphData = {
  nodes: [
    {
      id: "node1",
      title: "Introduction to React",
      category: "frontend",
      level: 1,
      importance: 5,
      status: "completed",
      score: 92
    },
    {
      id: "node2",
      title: "Component Lifecycle",
      category: "frontend",
      level: 2,
      importance: 4,
      status: "completed",
      score: 85
    },
    {
      id: "node3",
      title: "Hooks and State Management",
      category: "frontend",
      level: 3,
      importance: 5,
      status: "inProgress"
    },
    {
      id: "node4",
      title: "Redux",
      category: "state-management",
      level: 4,
      importance: 3,
      status: "notStarted"
    },
    {
      id: "node5",
      title: "Performance Optimization",
      category: "frontend",
      level: 5,
      importance: 4,
      status: "notStarted"
    }
  ],
  edges: [
    {
      source: "node1",
      target: "node2",
      type: "prerequisite",
      strength: 9
    },
    {
      source: "node2",
      target: "node3",
      type: "prerequisite",
      strength: 8
    },
    {
      source: "node3",
      target: "node4",
      type: "related",
      strength: 5
    },
    {
      source: "node3",
      target: "node5",
      type: "builds-on",
      strength: 7
    },
    {
      source: "node4",
      target: "node5",
      type: "recommended-sequence",
      strength: 3
    }
  ],
  categories: {
    "frontend": {
      name: "Frontend Development",
      color: "#4CAF50"
    },
    "state-management": {
      name: "State Management",
      color: "#2196F3"
    }
  }
};

function App() {
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [layout, setLayout] = useState<'force' | 'radial' | 'hierarchical'>('force');
  
  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setLayout('force')}>Force Layout</button>
        <button onClick={() => setLayout('radial')}>Radial Layout</button>
        <button onClick={() => setLayout('hierarchical')}>Hierarchical Layout</button>
      </div>
      
      <KnowledgeGraphVisualizer
        data={exampleData}
        width={800}
        height={600}
        onNodeClick={setSelectedNode}
        layout={layout}
        showLabels={true}
        enableZoom={true}
        enableDrag={true}
        nodeSize="byImportance"
        darkMode={true}
      />
      
      {selectedNode && (
        <div style={{ marginTop: '20px' }}>
          <h3>Selected: {selectedNode.title}</h3>
          <p>Category: {exampleData.categories[selectedNode.category]?.name}</p>
          <p>Level: {selectedNode.level}/5</p>
          <p>Importance: {selectedNode.importance}/5</p>
          <p>Status: {selectedNode.status || 'Not Started'}</p>
          {selectedNode.score !== undefined && <p>Score: {selectedNode.score}%</p>}
        </div>
      )}
    </div>
  );
}
*/
