/**
 * KnowledgeGraphVisualizer Component
 * Interactive visualization of syllabus topics and their relationships
 * using D3.js for graph visualization.
 */
import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Network, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Download,
  Info,
  Search, 
  Tag, 
  Filter,
  Lightbulb,
  AlignLeft,
  Layers,
  RotateCcw
} from 'lucide-react';

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
  className?: string;
  moduleId?: string;
  programId?: number;
  width?: number;
  height?: number;
  onNodeClick?: (node: KnowledgeNode) => void;
  onEdgeClick?: (edge: KnowledgeEdge) => void;
  highlightNodeIds?: string[];
  highlightEdgeIds?: string[];
  initialFilterCategories?: string[];
  initialFilterMinLevel?: number;
  initialFilterMaxLevel?: number;
  initialFilterTags?: string[];
  defaultLayout?: 'force' | 'radial' | 'hierarchical';
  darkMode?: boolean;
  variant?: 'standard' | 'compact' | 'embedded';
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

export const KnowledgeGraphVisualizer: React.FC<KnowledgeGraphVisualizerProps> = ({
  className,
  moduleId,
  programId,
  width = 800,
  height = 600,
  onNodeClick,
  onEdgeClick,
  highlightNodeIds = [],
  highlightEdgeIds = [],
  initialFilterCategories,
  initialFilterMinLevel = 1,
  initialFilterMaxLevel = 5,
  initialFilterTags,
  defaultLayout = 'force',
  darkMode = false,
  variant = 'standard'
}) => {
  // Refs for D3 elements
  const svgRef = useRef<SVGSVGElement>(null);
  const graphRef = useRef<SVGGElement>(null);
  
  // State for the current simulation and selections
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<KnowledgeEdge | null>(null);
  const [simulation, setSimulation] = useState<d3.Simulation<SimulationNode, SimulationLink> | null>(null);
  
  // State for graph settings
  const [layout, setLayout] = useState<'force' | 'radial' | 'hierarchical'>(defaultLayout);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [nodeSize, setNodeSize] = useState<'fixed' | 'byLevel' | 'byImportance'>('byImportance');
  const [filterMinLevel, setFilterMinLevel] = useState<number>(initialFilterMinLevel);
  const [filterMaxLevel, setFilterMaxLevel] = useState<number>(initialFilterMaxLevel);
  const [filterCategories, setFilterCategories] = useState<string[]>(initialFilterCategories || []);
  const [filterTags, setFilterTags] = useState<string[]>(initialFilterTags || []);
  const [zoom, setZoom] = useState<number>(1);
  const [selectedModuleId, setSelectedModuleId] = useState<string | undefined>(moduleId);
  const [selectedProgramId, setSelectedProgramId] = useState<number | undefined>(programId);
  
  // Fetch knowledge graph data
  const { data: graphData, isLoading } = useQuery({
    queryKey: ['/api/knowledge-graph', selectedModuleId, selectedProgramId],
    queryFn: async () => {
      try {
        let url = '/api/knowledge-graph';
        if (selectedModuleId) {
          url += `?moduleId=${selectedModuleId}`;
        } else if (selectedProgramId) {
          url += `?programId=${selectedProgramId}`;
        }
        
        const response = await apiRequest('GET', url);
        return await response.json();
      } catch (error) {
        console.error('Error fetching knowledge graph data:', error);
        
        // For development - return sample data
        return {
          nodes: [
            {
              id: 'topic-1',
              title: 'Aircraft Systems',
              category: 'systems',
              description: 'Overview of all major aircraft systems',
              level: 3,
              importance: 5,
              estimatedHours: 25,
              status: 'completed',
              score: 85,
              tags: ['technical', 'systems', 'core']
            },
            {
              id: 'topic-2',
              title: 'Aerodynamics',
              category: 'theory',
              description: 'Principles of flight and aerodynamics',
              level: 4,
              importance: 5,
              estimatedHours: 30,
              status: 'completed',
              score: 78,
              tags: ['technical', 'physics', 'core']
            },
            {
              id: 'topic-3',
              title: 'Navigation',
              category: 'operational',
              description: 'Principles and techniques of air navigation',
              level: 3,
              importance: 4,
              estimatedHours: 20,
              status: 'inProgress',
              tags: ['operational', 'core']
            },
            {
              id: 'topic-4',
              title: 'Weather Theory',
              category: 'theory',
              description: 'Meteorology and weather patterns',
              level: 3,
              importance: 4,
              estimatedHours: 15,
              status: 'inProgress',
              tags: ['meteorology', 'safety']
            },
            {
              id: 'topic-5',
              title: 'Radio Communication',
              category: 'operational',
              description: 'ATC communications and radio procedures',
              level: 2,
              importance: 4,
              estimatedHours: 10,
              status: 'notStarted',
              tags: ['communication', 'operational']
            },
            {
              id: 'topic-6',
              title: 'Emergency Procedures',
              category: 'safety',
              description: 'Handling aircraft emergencies',
              level: 5,
              importance: 5,
              estimatedHours: 20,
              status: 'notStarted',
              tags: ['safety', 'critical']
            },
            {
              id: 'topic-7',
              title: 'Aircraft Performance',
              category: 'systems',
              description: 'Performance characteristics and limitations',
              level: 4,
              importance: 4,
              estimatedHours: 15,
              status: 'notStarted',
              tags: ['technical', 'performance']
            },
            {
              id: 'topic-8',
              title: 'Flight Planning',
              category: 'operational',
              description: 'Route planning and flight preparation',
              level: 3,
              importance: 4,
              estimatedHours: 15,
              status: 'notStarted',
              tags: ['operational', 'planning']
            }
          ],
          edges: [
            {
              source: 'topic-2',
              target: 'topic-7',
              type: 'prerequisite',
              strength: 9,
              description: 'Aerodynamics is essential for understanding aircraft performance'
            },
            {
              source: 'topic-2',
              target: 'topic-1',
              type: 'related',
              strength: 6,
              description: 'Aerodynamics relates to how aircraft systems function'
            },
            {
              source: 'topic-3',
              target: 'topic-8',
              type: 'prerequisite',
              strength: 8,
              description: 'Navigation principles are required for flight planning'
            },
            {
              source: 'topic-4',
              target: 'topic-8',
              type: 'prerequisite',
              strength: 7,
              description: 'Weather knowledge is essential for flight planning'
            },
            {
              source: 'topic-1',
              target: 'topic-6',
              type: 'builds-on',
              strength: 7,
              description: 'Systems knowledge is applied in emergency procedures'
            },
            {
              source: 'topic-5',
              target: 'topic-6',
              type: 'related',
              strength: 5,
              description: 'Communication is important during emergencies'
            },
            {
              source: 'topic-4',
              target: 'topic-6',
              type: 'related',
              strength: 6,
              description: 'Weather conditions can lead to emergencies'
            },
            {
              source: 'topic-7',
              target: 'topic-8',
              type: 'builds-on',
              strength: 8,
              description: 'Performance data is used in flight planning'
            }
          ],
          categories: {
            systems: {
              name: 'Aircraft Systems',
              color: '#4f46e5', // Indigo
              description: 'Topics related to aircraft systems and components'
            },
            theory: {
              name: 'Theoretical Knowledge',
              color: '#0ea5e9', // Sky blue
              description: 'Fundamental theoretical concepts'
            },
            operational: {
              name: 'Operational Procedures',
              color: '#10b981', // Emerald
              description: 'Practical operational knowledge and procedures'
            },
            safety: {
              name: 'Safety Procedures',
              color: '#ef4444', // Red
              description: 'Safety-related topics and emergency procedures'
            }
          }
        };
      }
    }
  });
  
  // Available modules query
  const { data: modules } = useQuery({
    queryKey: ['/api/modules', selectedProgramId],
    queryFn: async () => {
      try {
        const url = selectedProgramId 
          ? `/api/modules?programId=${selectedProgramId}` 
          : '/api/modules';
          
        const response = await apiRequest('GET', url);
        return await response.json();
      } catch (error) {
        console.error('Error fetching modules:', error);
        
        // For development - return sample data
        return [
          { id: 'module-1', title: 'Private Pilot Ground School' },
          { id: 'module-2', title: 'Commercial Pilot Theory' },
          { id: 'module-3', title: 'Instrument Rating Theory' },
          { id: 'module-4', title: 'Advanced Aircraft Systems' }
        ];
      }
    },
    enabled: !moduleId,
  });
  
  // Available programs query
  const { data: programs } = useQuery({
    queryKey: ['/api/programs'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/programs');
        return await response.json();
      } catch (error) {
        console.error('Error fetching programs:', error);
        
        // For development - return sample data
        return [
          { id: 1, name: 'Private Pilot License' },
          { id: 2, name: 'Commercial Pilot License' },
          { id: 3, name: 'Instrument Rating' },
          { id: 4, name: 'Airline Transport Pilot License' }
        ];
      }
    },
    enabled: !programId && !moduleId,
  });
  
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
  
  // Filter data based on settings
  const filteredData = useMemo(() => {
    if (!graphData) return { nodes: [], edges: [] };
    
    let filteredNodes = [...graphData.nodes];
    
    // Apply category filter
    if (filterCategories.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        filterCategories.includes(node.category)
      );
    }
    
    // Apply level filter
    filteredNodes = filteredNodes.filter(node => 
      node.level >= filterMinLevel && node.level <= filterMaxLevel
    );
    
    // Apply tags filter
    if (filterTags.length > 0) {
      filteredNodes = filteredNodes.filter(node => 
        node.tags && node.tags.some(tag => filterTags.includes(tag))
      );
    }
    
    // Get filtered node IDs
    const filteredNodeIds = new Set(filteredNodes.map(node => node.id));
    
    // Filter edges to only include connections between filtered nodes
    const filteredEdges = graphData.edges.filter(edge => 
      filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
    );
    
    return {
      nodes: filteredNodes,
      edges: filteredEdges
    };
  }, [graphData, filterCategories, filterMinLevel, filterMaxLevel, filterTags]);
  
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
    if (!svgRef.current || !graphRef.current || !graphData || filteredData.nodes.length === 0) return;
    
    // Clear previous graph
    d3.select(graphRef.current).selectAll("*").remove();
    
    // Create tooltip
    let tooltip = d3.select("body").select(".knowledge-graph-tooltip");
    
    if (tooltip.empty()) {
      tooltip = d3.select("body")
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
        .style("z-index", "10")
        .style("max-width", "250px");
    }
    
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
          .distance(link => 150 - (link.strength * 5)) // Increased base distance
        )
        .force("charge", d3.forceManyBody()
          .strength(-300) // Increased repulsion
          .distanceMax(700) // Increased maximum distance
        )
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(d => (d.radius || 7) + 20)); // Increased collision radius
    } else if (layout === 'radial') {
      // Radial layout (nodes organized in concentric circles by level)
      simulationForces = d3.forceSimulation<SimulationNode, SimulationLink>(simulationData.nodes)
        .force("link", d3.forceLink<SimulationNode, SimulationLink>(simulationData.links)
          .id(d => d.id)
          .distance(150) // Increased link distance for better spacing
        )
        .force("r", d3.forceRadial(d => (d.level * 150), width / 2, height / 2)) // Significantly increased radius multiplier
        .force("charge", d3.forceManyBody().strength(-400)) // Stronger repulsion to avoid clustering
        .force("collision", d3.forceCollide().radius(d => (d.radius || 7) + 30)); // Increased collision radius for more spacing
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
      
      // Calculate node positions for each level with increased spacing
      levelCounts.forEach((count, level) => {
        const positions = [];
        // Use 80% of the height for better vertical spacing
        const maxLevel = Math.max(...Array.from(levelCounts.keys()));
        const levelHeight = (height * 0.8) / (maxLevel + 1);
        // Add top padding (10% of height)
        const levelY = (height * 0.1) + (level * levelHeight);
        
        for (let i = 0; i < count; i++) {
          // Use 90% of the width for better horizontal spacing
          const levelWidth = (width * 0.9) / (count + 1);
          // Add left padding (5% of width)
          const levelX = (width * 0.05) + ((i + 1) * levelWidth);
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
          .distance(100) // Increased link distance
          .strength(0.3) // Slightly stronger links
        )
        .force("charge", d3.forceManyBody().strength(-60)) // Increased repulsion
        .force("collision", d3.forceCollide().radius(d => (d.radius || 7) + 15)); // Increased collision radius
    }
    
    // Create arrow marker for directed edges
    svg.select("defs").remove(); // Remove existing defs
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
            <div style="font-weight: bold;">${d.type.replace('-', ' ')}</div>
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
        event.stopPropagation();
        const edge: KnowledgeEdge = {
          source: typeof d.source === 'object' ? d.source.id : d.source,
          target: typeof d.target === 'object' ? d.target.id : d.target,
          type: d.type as any,
          strength: d.strength
        };
        
        setSelectedEdge(edge);
        
        if (onEdgeClick) {
          onEdgeClick(edge);
        }
      });
    
    // Create node groups
    const nodes = g.selectAll(".node")
      .data(simulationData.nodes)
      .enter().append("g")
      .attr("class", "node")
      .call(d3.drag<SVGGElement, SimulationNode>()
        .on("start", (event, d) => {
          if (!event.active && simulationForces) simulationForces.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active && simulationForces) simulationForces.alphaTarget(0);
          // Keep node fixed at drag position in hierarchical layout
          if (layout !== 'hierarchical') {
            d.fx = null;
            d.fy = null;
          }
        })
      );
    
    // Add node circles
    nodes.append("circle")
      .attr("r", d => d.radius || 7)
      .attr("fill", d => {
        if (graphData.categories && graphData.categories[d.category]) {
          return graphData.categories[d.category].color;
        }
        // Default colors if category not found
        const defaultColors: { [key: string]: string } = {
          systems: '#4f46e5',
          theory: '#0ea5e9',
          operational: '#10b981',
          safety: '#ef4444',
          default: '#9ca3af'
        };
        return defaultColors[d.category] || defaultColors.default;
      })
      .attr("stroke", d => d.highlighted ? theme.highlightStroke : theme.nodeStroke)
      .attr("stroke-width", d => d.highlighted ? 2 : 1)
      // Add status indication
      .attr("stroke-dasharray", d => {
        if (d.status === 'inProgress') return "3,3";
        return null;
      })
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("stroke-width", 2)
          .attr("stroke", theme.highlightStroke);
        
        // Show tooltip with node info
        tooltip.style("visibility", "visible")
          .html(`
            <div style="font-weight: bold;">${d.title}</div>
            <div style="font-style: italic; margin-bottom: 4px;">${graphData.categories?.[d.category]?.name || d.category}</div>
            ${d.description ? `<div style="margin-bottom: 4px;">${d.description}</div>` : ''}
            <div>Level: ${d.level}/5</div>
            <div>Importance: ${d.importance}/5</div>
            ${d.estimatedHours ? `<div>Est. Hours: ${d.estimatedHours}</div>` : ''}
            ${d.status ? `<div>Status: ${d.status.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>` : ''}
            ${d.score !== undefined ? `<div>Score: ${d.score}/100</div>` : ''}
            ${d.tags && d.tags.length > 0 ? 
              `<div style="margin-top: 4px;">Tags: ${d.tags.join(', ')}</div>` : ''}
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
          .attr("stroke", d.highlighted ? theme.highlightStroke : theme.nodeStroke);
        
        tooltip.style("visibility", "hidden");
      })
      .on("click", function(event, d) {
        event.stopPropagation();
        
        // Find the full node data
        const nodeData = graphData.nodes.find(n => n.id === d.id);
        if (nodeData) {
          setSelectedNode(nodeData);
          
          if (onNodeClick) {
            onNodeClick(nodeData);
          }
        }
      });
    
    // Add node labels
    if (showLabels) {
      nodes.append("text")
        .attr("dy", d => (d.radius || 7) + 12)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", theme.text)
        .text(d => d.title)
        .each(function(d) {
          // Truncate long labels
          const text = d3.select(this);
          const words = text.text().split(/\s+/);
          if (words.length > 2) {
            text.text(words.slice(0, 2).join(' ') + '...');
          }
        });
    }
    
    // Simulation tick function
    if (simulationForces) {
      simulationForces.on("tick", () => {
        links
          .attr("x1", d => typeof d.source === 'object' ? d.source.x || 0 : 0)
          .attr("y1", d => typeof d.source === 'object' ? d.source.y || 0 : 0)
          .attr("x2", d => typeof d.target === 'object' ? d.target.x || 0 : 0)
          .attr("y2", d => typeof d.target === 'object' ? d.target.y || 0 : 0);
        
        nodes
          .attr("transform", d => `translate(${d.x || 0},${d.y || 0})`);
      });
      
      // Save simulation for controls
      setSimulation(simulationForces);
    }
    
    // Cleanup when component unmounts
    return () => {
      if (simulationForces) simulationForces.stop();
    };
  }, [
    graphData, 
    filteredData, 
    simulationData, 
    layout, 
    showLabels, 
    theme, 
    width, 
    height, 
    onNodeClick, 
    onEdgeClick
  ]);
  
  // Handle zoom controls
  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 0.2, 3);
    setZoom(newZoom);
    if (graphRef.current) {
      d3.select(graphRef.current)
        .transition()
        .duration(300)
        .attr("transform", `scale(${newZoom})`);
    }
  };
  
  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.2, 0.5);
    setZoom(newZoom);
    if (graphRef.current) {
      d3.select(graphRef.current)
        .transition()
        .duration(300)
        .attr("transform", `scale(${newZoom})`);
    }
  };
  
  const handleZoomReset = () => {
    setZoom(1);
    if (graphRef.current) {
      d3.select(graphRef.current)
        .transition()
        .duration(300)
        .attr("transform", "scale(1)");
    }
  };
  
  // Reset graph positions
  const handleResetPositions = () => {
    if (simulation) {
      simulation.alpha(1).restart();
      
      // Clear any fixed positions
      simulation.nodes().forEach(node => {
        node.fx = null;
        node.fy = null;
      });
    }
  };
  
  // Export graph as image
  const handleExportGraph = () => {
    if (!svgRef.current) return;
    
    // Create a copy of the SVG with a white background for export
    const svgCopy = svgRef.current.cloneNode(true) as SVGSVGElement;
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("width", width.toString());
    bgRect.setAttribute("height", height.toString());
    bgRect.setAttribute("fill", "white");
    svgCopy.insertBefore(bgRect, svgCopy.firstChild);
    
    // Convert to data URL
    const svgData = new XMLSerializer().serializeToString(svgCopy);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement("a");
    link.href = url;
    link.download = "knowledge-graph.svg";
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  // If compact view, show simplified UI
  if (variant === 'compact') {
    return (
      <Card className="border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center">
            <Network className="w-4 h-4 mr-2 text-primary" />
            Knowledge Map
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="relative" style={{ height: "200px" }}>
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                style={{ background: theme.background }}
              >
                <g ref={graphRef} transform={`scale(${zoom})`} />
              </svg>
              <div className="absolute bottom-2 right-2 flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 rounded-full bg-background/80"
                  onClick={handleZoomIn}
                >
                  <ZoomIn className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-6 w-6 rounded-full bg-background/80"
                  onClick={handleZoomOut}
                >
                  <ZoomOut className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0 px-3 pb-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs"
            onClick={() => window.open('/knowledge-graph', '_blank')}
          >
            View Full Graph
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // If embedded view, show mid-size UI
  if (variant === 'embedded') {
    return (
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Network className="w-5 h-5 mr-2 text-primary" />
            Knowledge Graph Visualization
          </CardTitle>
          <CardDescription>
            Interactive map of syllabus topics and their relationships
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden">
          <div className="border-t">
            <div className="p-3 border-b bg-muted/30 flex flex-wrap gap-2 justify-between items-center">
              <div className="flex gap-2">
                <Select value={layout} onValueChange={(value) => setLayout(value as any)}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Select layout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="force">Force-directed</SelectItem>
                    <SelectItem value="radial">Radial</SelectItem>
                    <SelectItem value="hierarchical">Hierarchical</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleZoomIn}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleZoomOut}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleZoomReset}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="labels-switch"
                    checked={showLabels}
                    onCheckedChange={setShowLabels}
                  />
                  <Label htmlFor="labels-switch" className="text-sm">Labels</Label>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetPositions}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="relative" style={{ height: "500px" }}>
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                style={{ background: theme.background }}
              >
                <g ref={graphRef} transform={`scale(${zoom})`} />
              </svg>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
  
  // Full standard view
  return (
    <Card className={cn("border shadow-sm", className)}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Network className="w-6 h-6 mr-2 text-primary" />
          Knowledge Graph Visualizer
        </CardTitle>
        <CardDescription>
          Interactive visualization of syllabus topics and their relationships
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        <Tabs defaultValue="graph" className="w-full">
          <div className="border-b">
            <div className="px-4">
              <TabsList className="h-10">
                <TabsTrigger value="graph" className="flex items-center">
                  <Network className="w-4 h-4 mr-2" />
                  Graph
                </TabsTrigger>
                <TabsTrigger value="filters" className="flex items-center">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </TabsTrigger>
                <TabsTrigger value="info" className="flex items-center">
                  <Info className="w-4 h-4 mr-2" />
                  Info
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
          
          <TabsContent value="graph" className="m-0">
            <div className="border-b p-4 bg-muted/30 flex flex-wrap gap-4 justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Module</label>
                  <Select 
                    value={selectedModuleId}
                    onValueChange={setSelectedModuleId}
                    disabled={!modules || isLoading}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select module" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules?.map((module: any) => (
                        <SelectItem key={module.id} value={module.id}>
                          {module.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium block mb-1">Layout</label>
                  <Select value={layout} onValueChange={(value) => setLayout(value as any)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select layout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="force">Force-directed</SelectItem>
                      <SelectItem value="radial">Radial</SelectItem>
                      <SelectItem value="hierarchical">Hierarchical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium block mb-1">Node Size</label>
                  <Select value={nodeSize} onValueChange={(value) => setNodeSize(value as any)}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Node size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed</SelectItem>
                      <SelectItem value="byLevel">By Level</SelectItem>
                      <SelectItem value="byImportance">By Importance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-end gap-2">
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetPositions}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleZoomOut}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleZoomReset}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleZoomIn}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2 ml-2">
                  <Switch
                    id="labels-switch-full"
                    checked={showLabels}
                    onCheckedChange={setShowLabels}
                  />
                  <Label htmlFor="labels-switch-full">Show Labels</Label>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportGraph}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4">
              <div className="col-span-3 relative" style={{ height: "600px", minHeight: "600px" }}>
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : filteredData.nodes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <Search className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No nodes match the current filters</h3>
                    <p className="text-sm text-muted-foreground mt-1">Try adjusting your filter settings</p>
                  </div>
                ) : (
                  <svg
                    ref={svgRef}
                    width="100%"
                    height="100%"
                    style={{ background: theme.background }}
                  >
                    <g ref={graphRef} transform={`scale(${zoom})`} />
                  </svg>
                )}
              </div>
              
              <div className="border-l p-4">
                {selectedNode ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-lg">{selectedNode.title}</h3>
                      <Badge className="mt-1">
                        {graphData?.categories?.[selectedNode.category]?.name || selectedNode.category}
                      </Badge>
                    </div>
                    
                    {selectedNode.description && (
                      <p className="text-sm text-muted-foreground">{selectedNode.description}</p>
                    )}
                    
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-muted rounded p-2">
                          <div className="text-xs text-muted-foreground">Level</div>
                          <div className="font-medium">{selectedNode.level}/5</div>
                        </div>
                        <div className="bg-muted rounded p-2">
                          <div className="text-xs text-muted-foreground">Importance</div>
                          <div className="font-medium">{selectedNode.importance}/5</div>
                        </div>
                      </div>
                      
                      {selectedNode.estimatedHours && (
                        <div className="bg-muted rounded p-2">
                          <div className="text-xs text-muted-foreground">Estimated Hours</div>
                          <div className="font-medium">{selectedNode.estimatedHours}</div>
                        </div>
                      )}
                      
                      {selectedNode.status && (
                        <div className="bg-muted rounded p-2">
                          <div className="text-xs text-muted-foreground">Status</div>
                          <div className="font-medium capitalize">
                            {selectedNode.status.replace(/([A-Z])/g, ' $1')}
                            {selectedNode.score !== undefined && ` (${selectedNode.score}/100)`}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {selectedNode.tags && selectedNode.tags.length > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-2">Tags</div>
                        <div className="flex flex-wrap gap-1">
                          {selectedNode.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setSelectedNode(null)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                ) : selectedEdge ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-lg capitalize">{selectedEdge.type.replace('-', ' ')} Relationship</h3>
                      <div className="text-sm text-muted-foreground mt-1">
                        Links two topics together
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <div className="bg-primary/10 rounded-full p-1 mr-2">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                        </div>
                        <div>
                          {graphData?.nodes.find(n => n.id === selectedEdge.source)?.title || selectedEdge.source}
                        </div>
                      </div>
                      <div className="border-l-2 h-6 ml-[11px]"></div>
                      <div className="flex items-center">
                        <div className="bg-primary/10 rounded-full p-1 mr-2">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                        </div>
                        <div>
                          {graphData?.nodes.find(n => n.id === selectedEdge.target)?.title || selectedEdge.target}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="bg-muted rounded p-2">
                        <div className="text-xs text-muted-foreground">Relationship Strength</div>
                        <div className="font-medium">{selectedEdge.strength}/10</div>
                      </div>
                      
                      {selectedEdge.description && (
                        <div className="bg-muted rounded p-2">
                          <div className="text-xs text-muted-foreground">Description</div>
                          <div className="text-sm">{selectedEdge.description}</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setSelectedEdge(null)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Info className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Topic Details</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select a node or edge in the graph to view details
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="filters" className="m-0 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <Layers className="w-5 h-5 mr-2 text-primary" />
                  Categories
                </h3>
                <div className="space-y-3">
                  {graphData?.categories && Object.entries(graphData.categories).map(([key, category]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${key}`}
                        checked={filterCategories.length === 0 || filterCategories.includes(key)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilterCategories([...filterCategories, key]);
                          } else {
                            setFilterCategories(filterCategories.filter(c => c !== key));
                          }
                        }}
                      />
                      <div className="flex items-center">
                        <div 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: category.color }}
                        ></div>
                        <label 
                          htmlFor={`category-${key}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {category.name}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <AlignLeft className="w-5 h-5 mr-2 text-primary" />
                    Complexity Level
                  </h3>
                  <div className="space-y-5">
                    <div>
                      <div className="flex justify-between mb-2 text-sm">
                        <span>Minimum Level: {filterMinLevel}</span>
                        <span>Maximum Level: {filterMaxLevel}</span>
                      </div>
                      <Slider
                        value={[filterMinLevel, filterMaxLevel]}
                        min={1}
                        max={5}
                        step={1}
                        onValueChange={(value) => {
                          setFilterMinLevel(value[0]);
                          setFilterMaxLevel(value[1]);
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground px-2">
                      <span>Beginner</span>
                      <span>Advanced</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <Tag className="w-5 h-5 mr-2 text-primary" />
                  Tags
                </h3>
                <div className="space-y-3">
                  {/* Get all unique tags from the nodes */}
                  {graphData && (() => {
                    const allTags = new Set<string>();
                    graphData.nodes.forEach(node => {
                      if (node.tags) {
                        node.tags.forEach(tag => allTags.add(tag));
                      }
                    });
                    
                    return Array.from(allTags).map(tag => (
                      <div key={tag} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tag-${tag}`}
                          checked={filterTags.length === 0 || filterTags.includes(tag)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFilterTags([...filterTags, tag]);
                            } else {
                              setFilterTags(filterTags.filter(t => t !== tag));
                            }
                          }}
                        />
                        <label 
                          htmlFor={`tag-${tag}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {tag}
                        </label>
                      </div>
                    ));
                  })()}
                </div>
                
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <Lightbulb className="w-5 h-5 mr-2 text-primary" />
                    Filter Actions
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setFilterCategories([]);
                        setFilterTags([]);
                        setFilterMinLevel(1);
                        setFilterMaxLevel(5);
                      }}
                    >
                      Reset All Filters
                    </Button>
                    
                    {filterCategories.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setFilterCategories([])}
                      >
                        Clear Categories
                      </Button>
                    )}
                    
                    {filterTags.length > 0 && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setFilterTags([])}
                      >
                        Clear Tags
                      </Button>
                    )}
                    
                    {(filterMinLevel !== 1 || filterMaxLevel !== 5) && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setFilterMinLevel(1);
                          setFilterMaxLevel(5);
                        }}
                      >
                        Reset Levels
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="info" className="m-0 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Graph Statistics</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="text-sm text-muted-foreground">Total Topics</div>
                    <div className="text-2xl font-bold">{graphData?.nodes.length || 0}</div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="text-sm text-muted-foreground">Total Relationships</div>
                    <div className="text-2xl font-bold">{graphData?.edges.length || 0}</div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="text-sm text-muted-foreground">Categories</div>
                    <div className="text-2xl font-bold">{graphData?.categories ? Object.keys(graphData.categories).length : 0}</div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="text-sm text-muted-foreground">Average Level</div>
                    <div className="text-2xl font-bold">
                      {graphData?.nodes.length ? 
                        (graphData.nodes.reduce((sum, node) => sum + node.level, 0) / graphData.nodes.length).toFixed(1) 
                        : '-'}
                    </div>
                  </div>
                </div>
                
                <h3 className="text-lg font-medium mt-6 mb-4">About this Visualization</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  This knowledge graph visualizes the relationships between various topics in the 
                  syllabus. Nodes represent topics and edges represent relationships between them.
                </p>
                <p className="text-sm text-muted-foreground">
                  Node size indicates {nodeSize === 'byImportance' ? 'importance' : 
                  nodeSize === 'byLevel' ? 'complexity level' : 'equal weighting'} of each topic.
                  Colors represent different categories.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Relationship Types</h3>
                <div className="space-y-3">
                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="font-medium">Prerequisite</div>
                    <div className="flex items-center mt-2">
                      <div className="w-12 h-0.5 bg-gray-400 mr-2"></div>
                      <div className="text-sm text-muted-foreground">
                        Source topic must be learned before the target
                      </div>
                    </div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="font-medium">Builds On</div>
                    <div className="flex items-center mt-2">
                      <div className="w-12 h-0.5 bg-gray-400 mr-2"></div>
                      <div className="text-sm text-muted-foreground">
                        Target topic builds on knowledge in the source
                      </div>
                    </div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="font-medium">Related</div>
                    <div className="flex items-center mt-2">
                      <div className="w-12 h-0.5 border-dashed border-t-2 border-gray-400 mr-2"></div>
                      <div className="text-sm text-muted-foreground">
                        Topics are related but not dependent on each other
                      </div>
                    </div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="font-medium">Recommended Sequence</div>
                    <div className="flex items-center mt-2">
                      <div className="w-12 h-0.5 border-dotted border-t-2 border-gray-400 mr-2"></div>
                      <div className="text-sm text-muted-foreground">
                        Suggested learning order (not strictly required)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};