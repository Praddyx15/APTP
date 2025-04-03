import React, { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { KnowledgeGraphNode, KnowledgeGraphEdge } from "@shared/schema";
import { 
  Loader2,
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  Filter, 
  X,
  Info
} from "lucide-react";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Define node types and their colors
const NODE_TYPES = {
  concept: "#3b82f6", // blue
  competency: "#10b981", // green
  regulation: "#f97316", // orange
  lesson: "#8b5cf6", // purple
  module: "#ec4899", // pink
  resource: "#64748b", // slate
  assessment: "#eab308", // yellow
  term: "#6b7280", // gray
};

// Define relationship types and their colors
const RELATIONSHIP_TYPES = {
  prerequisite: "#ef4444", // red
  builds_on: "#84cc16", // lime
  references: "#0ea5e9", // sky
  includes: "#8b5cf6", // purple
  requires: "#f97316", // orange
  similar_to: "#64748b", // slate
  part_of: "#a855f7", // violet
};

// Force-directed graph simulation
class ForceGraph {
  nodes: any[];
  edges: any[];
  simulation: any;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  nodeRadius: number;
  ctx: CanvasRenderingContext2D | null;
  highlightedNode: any | null;
  selectedNode: any | null;
  isDragging: boolean;
  draggedNode: any | null;
  zoomLevel: number;
  minZoom: number;
  maxZoom: number;
  nodeIdToIndex: Map<number, number>;
  mouseX: number;
  mouseY: number;
  offsetX: number;
  offsetY: number;
  
  constructor(canvas: HTMLCanvasElement) {
    this.nodes = [];
    this.edges = [];
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    this.nodeRadius = 20;
    this.highlightedNode = null;
    this.selectedNode = null;
    this.isDragging = false;
    this.draggedNode = null;
    this.zoomLevel = 1;
    this.minZoom = 0.5;
    this.maxZoom = 2;
    this.nodeIdToIndex = new Map();
    this.mouseX = 0;
    this.mouseY = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    
    // Initialize simulation
    this.simulation = {
      alpha: 1,
      alphaDecay: 0.0228,
      alphaMin: 0.001,
      velocityDecay: 0.4,
      positions: new Map(),
      velocities: new Map(),
      forces: {
        center: (node: any, i: number) => {
          const strength = 0.05;
          return {
            x: (this.centerX - node.x) * strength,
            y: (this.centerY - node.y) * strength
          };
        },
        charge: (node: any, i: number) => {
          const strength = -150;
          let fx = 0, fy = 0;
          
          for (let j = 0; j < this.nodes.length; j++) {
            if (i === j) continue;
            
            const otherNode = this.nodes[j];
            const dx = node.x - otherNode.x;
            const dy = node.y - otherNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = strength / (distance * distance);
            
            fx += (dx / distance) * force;
            fy += (dy / distance) * force;
          }
          
          return { x: fx, y: fy };
        },
        link: (node: any, i: number) => {
          const strength = 0.2;
          let fx = 0, fy = 0;
          
          for (const edge of this.edges) {
            let sourceNode, targetNode;
            
            if (edge.source === node.id) {
              sourceNode = node;
              targetNode = this.nodes[this.nodeIdToIndex.get(edge.target) || 0];
            } else if (edge.target === node.id) {
              sourceNode = node;
              targetNode = this.nodes[this.nodeIdToIndex.get(edge.source) || 0];
            } else {
              continue;
            }
            
            if (!targetNode) continue;
            
            const dx = sourceNode.x - targetNode.x;
            const dy = sourceNode.y - targetNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const displayDistance = Math.max(80, Math.min(200, distance));
            const force = strength * (displayDistance - distance) / distance;
            
            fx -= dx * force;
            fy -= dy * force;
          }
          
          return { x: fx, y: fy };
        }
      }
    };
  }
  
  setData(nodes: KnowledgeGraphNode[], edges: KnowledgeGraphEdge[]) {
    this.nodes = nodes.map(node => ({
      ...node,
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      radius: this.nodeRadius,
      color: NODE_TYPES[node.nodeType as keyof typeof NODE_TYPES] || "#6b7280"
    }));
    
    this.nodeIdToIndex.clear();
    this.nodes.forEach((node, index) => {
      this.nodeIdToIndex.set(node.id, index);
    });
    
    this.edges = edges.map(edge => ({
      ...edge,
      source: edge.sourceNodeId,
      target: edge.targetNodeId,
      color: RELATIONSHIP_TYPES[edge.relationship as keyof typeof RELATIONSHIP_TYPES] || "#64748b"
    }));
    
    // Initialize positions and velocities
    this.nodes.forEach((node, i) => {
      this.simulation.positions.set(i, { x: node.x, y: node.y });
      this.simulation.velocities.set(i, { x: 0, y: 0 });
    });
    
    // Reset view state
    this.zoomLevel = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.selectedNode = null;
    this.highlightedNode = null;
    
    // Start simulation
    this.startSimulation();
  }
  
  startSimulation() {
    this.simulation.alpha = 1;
    this.tick();
  }
  
  tick() {
    if (this.simulation.alpha < this.simulation.alphaMin) return;
    
    // Apply forces and update positions
    this.nodes.forEach((node, i) => {
      if (node === this.draggedNode) return;
      
      const position = this.simulation.positions.get(i);
      const velocity = this.simulation.velocities.get(i);
      
      if (!position || !velocity) return;
      
      // Apply forces
      const forces = {
        x: 0, 
        y: 0
      };
      
      for (const forceName in this.simulation.forces) {
        const force = this.simulation.forces[forceName](node, i);
        forces.x += force.x;
        forces.y += force.y;
      }
      
      // Update velocity
      velocity.x = (velocity.x + forces.x) * (1 - this.simulation.velocityDecay);
      velocity.y = (velocity.y + forces.y) * (1 - this.simulation.velocityDecay);
      
      // Update position
      position.x += velocity.x;
      position.y += velocity.y;
      
      // Update node position
      node.x = position.x;
      node.y = position.y;
    });
    
    // Update simulation alpha
    this.simulation.alpha *= (1 - this.simulation.alphaDecay);
    
    // Draw
    this.draw();
    
    // Continue simulation
    if (this.simulation.alpha >= this.simulation.alphaMin) {
      requestAnimationFrame(() => this.tick());
    }
  }
  
  draw() {
    if (!this.ctx) return;
    
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    
    // Apply zoom and pan transformations
    ctx.save();
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.zoomLevel, this.zoomLevel);
    
    // Draw edges
    this.edges.forEach(edge => {
      const sourceNode = this.nodes[this.nodeIdToIndex.get(edge.source) || 0];
      const targetNode = this.nodes[this.nodeIdToIndex.get(edge.target) || 0];
      
      if (!sourceNode || !targetNode) return;
      
      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y);
      ctx.lineTo(targetNode.x, targetNode.y);
      ctx.strokeStyle = edge.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw arrow
      const angle = Math.atan2(targetNode.y - sourceNode.y, targetNode.x - sourceNode.x);
      const arrowSize = 10;
      const arrowX = targetNode.x - Math.cos(angle) * targetNode.radius;
      const arrowY = targetNode.y - Math.sin(angle) * targetNode.radius;
      
      ctx.beginPath();
      ctx.moveTo(arrowX, arrowY);
      ctx.lineTo(
        arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
        arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
        arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = edge.color;
      ctx.fill();
    });
    
    // Draw nodes
    this.nodes.forEach((node, i) => {
      const isHighlighted = node === this.highlightedNode;
      const isSelected = node === this.selectedNode;
      
      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
      
      if (isHighlighted || isSelected) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      
      // Node label
      ctx.fillStyle = "#ffffff";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      
      // Truncate text if too long
      let label = node.content;
      if (label.length > 15) {
        label = label.substring(0, 12) + "...";
      }
      
      ctx.fillText(label, node.x, node.y);
    });
    
    ctx.restore();
  }
  
  zoom(direction: number) {
    const prevZoom = this.zoomLevel;
    this.zoomLevel = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoomLevel + direction * 0.1));
    
    // Adjust offset to zoom centered on mouse position
    const zoomRatio = this.zoomLevel / prevZoom;
    this.offsetX = this.mouseX - (this.mouseX - this.offsetX) * zoomRatio;
    this.offsetY = this.mouseY - (this.mouseY - this.offsetY) * zoomRatio;
    
    this.draw();
  }
  
  getNodeAt(x: number, y: number): any | null {
    // Convert screen coordinates to graph coordinates
    const graphX = (x - this.offsetX) / this.zoomLevel;
    const graphY = (y - this.offsetY) / this.zoomLevel;
    
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      const dx = graphX - node.x;
      const dy = graphY - node.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= node.radius) {
        return node;
      }
    }
    
    return null;
  }
  
  handleMouseMove(x: number, y: number) {
    this.mouseX = x;
    this.mouseY = y;
    
    const node = this.getNodeAt(x, y);
    
    if (node !== this.highlightedNode) {
      this.highlightedNode = node;
      this.draw();
    }
    
    if (this.isDragging && this.draggedNode) {
      // Convert screen coordinates to graph coordinates
      const graphX = (x - this.offsetX) / this.zoomLevel;
      const graphY = (y - this.offsetY) / this.zoomLevel;
      
      // Update node position
      this.draggedNode.x = graphX;
      this.draggedNode.y = graphY;
      
      // Update simulation position
      const index = this.nodes.indexOf(this.draggedNode);
      if (index !== -1) {
        this.simulation.positions.set(index, { x: graphX, y: graphY });
      }
      
      this.draw();
    }
  }
  
  handleMouseDown(x: number, y: number) {
    const node = this.getNodeAt(x, y);
    
    if (node) {
      this.isDragging = true;
      this.draggedNode = node;
      this.selectedNode = node;
    } else {
      this.selectedNode = null;
    }
    
    this.draw();
  }
  
  handleMouseUp() {
    this.isDragging = false;
    this.draggedNode = null;
    
    // Restart simulation with low alpha
    if (this.simulation.alpha < this.simulation.alphaMin) {
      this.simulation.alpha = 0.1;
      this.tick();
    }
  }
  
  handleMouseLeave() {
    this.isDragging = false;
    this.draggedNode = null;
    this.highlightedNode = null;
    this.draw();
  }
  
  handleCanvasDrag(dx: number, dy: number) {
    if (!this.isDragging || this.draggedNode) return;
    
    this.offsetX += dx;
    this.offsetY += dy;
    this.draw();
  }
  
  resetView() {
    this.zoomLevel = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.selectedNode = null;
    this.highlightedNode = null;
    this.draw();
  }
  
  getSelectedNode() {
    return this.selectedNode;
  }
}

interface KnowledgeGraphViewerProps {
  documentId?: number;
  initialNodeType?: string;
}

export default function KnowledgeGraphViewer({ 
  documentId, 
  initialNodeType
}: KnowledgeGraphViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graphRef = useRef<ForceGraph | null>(null);
  const [selectedNodeTypes, setSelectedNodeTypes] = useState<string[]>(
    initialNodeType ? [initialNodeType] : Object.keys(NODE_TYPES)
  );
  const [selectedRelationships, setSelectedRelationships] = useState<string[]>(
    Object.keys(RELATIONSHIP_TYPES)
  );
  const [selectedNode, setSelectedNode] = useState<KnowledgeGraphNode | null>(null);
  const [prevMouse, setPrevMouse] = useState({ x: 0, y: 0 });
  const [isCanvasDragging, setIsCanvasDragging] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Fetch knowledge graph nodes and edges
  const { data: nodes, isLoading: nodesLoading } = useQuery<KnowledgeGraphNode[]>({
    queryKey: ['/api/knowledge-graph/nodes', documentId, selectedNodeTypes],
    queryFn: async () => {
      let url = '/api/knowledge-graph/nodes';
      const params = new URLSearchParams();
      
      if (documentId) {
        params.append('documentId', documentId.toString());
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch knowledge graph nodes');
      return response.json();
    }
  });
  
  const { data: edges, isLoading: edgesLoading } = useQuery<KnowledgeGraphEdge[]>({
    queryKey: ['/api/knowledge-graph/edges', selectedNodeTypes, selectedRelationships],
    queryFn: async () => {
      const response = await fetch('/api/knowledge-graph/edges');
      if (!response.ok) throw new Error('Failed to fetch knowledge graph edges');
      return response.json();
    }
  });
  
  // Filter data based on selections
  const filteredNodes = React.useMemo(() => {
    if (!nodes) return [];
    
    return nodes.filter(node => {
      // Filter by node type
      if (!selectedNodeTypes.includes(node.nodeType)) return false;
      
      // Filter by search term
      if (searchTerm && !node.content.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [nodes, selectedNodeTypes, searchTerm]);
  
  const filteredEdges = React.useMemo(() => {
    if (!edges || !filteredNodes) return [];
    
    const nodeIds = new Set(filteredNodes.map(node => node.id));
    
    return edges.filter(edge => {
      // Filter by relationship type
      if (!selectedRelationships.includes(edge.relationship)) return false;
      
      // Only include edges where both nodes are in the filtered set
      return nodeIds.has(edge.sourceNodeId) && nodeIds.has(edge.targetNodeId);
    });
  }, [edges, filteredNodes, selectedRelationships]);
  
  // Set up canvas and graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Set canvas size to match container
    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      if (graphRef.current) {
        graphRef.current.width = canvas.width;
        graphRef.current.height = canvas.height;
        graphRef.current.centerX = canvas.width / 2;
        graphRef.current.centerY = canvas.height / 2;
        graphRef.current.draw();
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Initialize force graph
    if (!graphRef.current) {
      graphRef.current = new ForceGraph(canvas);
    }
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);
  
  // Update graph data when nodes or edges change
  useEffect(() => {
    if (!graphRef.current || !filteredNodes || !filteredEdges) return;
    
    graphRef.current.setData(filteredNodes, filteredEdges);
  }, [filteredNodes, filteredEdges]);
  
  // Mouse event handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!graphRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    graphRef.current.handleMouseMove(x, y);
    
    if (isCanvasDragging) {
      graphRef.current.handleCanvasDrag(x - prevMouse.x, y - prevMouse.y);
    }
    
    setPrevMouse({ x, y });
  }, [isCanvasDragging, prevMouse]);
  
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!graphRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setPrevMouse({ x, y });
    
    graphRef.current.handleMouseDown(x, y);
    setSelectedNode(graphRef.current.getSelectedNode());
    
    if (!graphRef.current.draggedNode) {
      setIsCanvasDragging(true);
    }
  }, []);
  
  const handleMouseUp = useCallback(() => {
    if (!graphRef.current) return;
    
    graphRef.current.handleMouseUp();
    setIsCanvasDragging(false);
  }, []);
  
  const handleMouseLeave = useCallback(() => {
    if (!graphRef.current) return;
    
    graphRef.current.handleMouseLeave();
    setIsCanvasDragging(false);
  }, []);
  
  const handleZoom = useCallback((direction: number) => {
    if (!graphRef.current) return;
    graphRef.current.zoom(direction);
  }, []);
  
  const resetView = useCallback(() => {
    if (!graphRef.current) return;
    graphRef.current.resetView();
    setSelectedNode(null);
  }, []);
  
  // Toggle node type selection
  const toggleNodeType = useCallback((type: string) => {
    setSelectedNodeTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  }, []);
  
  // Toggle relationship selection
  const toggleRelationship = useCallback((relationship: string) => {
    setSelectedRelationships(prev => 
      prev.includes(relationship) 
        ? prev.filter(r => r !== relationship)
        : [...prev, relationship]
    );
  }, []);
  
  const isLoading = nodesLoading || edgesLoading;
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-2 mb-4 p-4 bg-muted/40 rounded-md">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleZoom(1)}
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleZoom(-1)}
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={resetView}
            title="Reset View"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 max-w-xs">
          <Input
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Node Types
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              {Object.entries(NODE_TYPES).map(([type, color]) => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={selectedNodeTypes.includes(type)}
                  onCheckedChange={() => toggleNodeType(type)}
                >
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: color }}
                    />
                    <span className="capitalize">{type}</span>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Relationships
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              {Object.entries(RELATIONSHIP_TYPES).map(([type, color]) => (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={selectedRelationships.includes(type)}
                  onCheckedChange={() => toggleRelationship(type)}
                >
                  <div className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: color }}
                    />
                    <span className="capitalize">{type.replace('_', ' ')}</span>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="flex flex-1 gap-4 min-h-0">
        <div className="relative flex-1 h-full border rounded-md overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          {(!filteredNodes || filteredNodes.length === 0) && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Info className="h-12 w-12 text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium">No nodes to display</h3>
              <p className="text-sm text-muted-foreground">
                Try changing your filters or adding knowledge graph data.
              </p>
            </div>
          )}
          
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-grab"
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          />
        </div>
        
        {selectedNode && (
          <Card className="w-80 shrink-0">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <Badge 
                    className="mb-2"
                    style={{ 
                      backgroundColor: NODE_TYPES[selectedNode.nodeType as keyof typeof NODE_TYPES] || "#6b7280"
                    }}
                  >
                    {selectedNode.nodeType}
                  </Badge>
                  <CardTitle className="text-base">{selectedNode.content}</CardTitle>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0" 
                  onClick={() => setSelectedNode(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {selectedNode.metadata && (
                <div className="space-y-3">
                  {Object.entries(selectedNode.metadata as Record<string, any>).map(([key, value]) => (
                    <div key={key}>
                      <Label className="text-xs text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </Label>
                      <p className="text-sm">{typeof value === 'string' ? value : JSON.stringify(value)}</p>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Connected Nodes</h4>
                <div className="space-y-1">
                  {filteredEdges
                    .filter(edge => 
                      edge.sourceNodeId === selectedNode.id || 
                      edge.targetNodeId === selectedNode.id
                    )
                    .map(edge => {
                      const isSource = edge.sourceNodeId === selectedNode.id;
                      const connectedNodeId = isSource ? edge.targetNodeId : edge.sourceNodeId;
                      const connectedNode = filteredNodes.find(n => n.id === connectedNodeId);
                      
                      if (!connectedNode) return null;
                      
                      return (
                        <div 
                          key={edge.id} 
                          className="flex items-center p-2 rounded-md hover:bg-muted cursor-pointer"
                          onClick={() => {
                            setSelectedNode(connectedNode);
                            if (graphRef.current) {
                              const node = graphRef.current.nodes.find(n => n.id === connectedNode.id);
                              if (node) {
                                graphRef.current.selectedNode = node;
                                graphRef.current.draw();
                              }
                            }
                          }}
                        >
                          <div 
                            className="w-2 h-2 rounded-full mr-2" 
                            style={{ 
                              backgroundColor: NODE_TYPES[connectedNode.nodeType as keyof typeof NODE_TYPES] || "#6b7280" 
                            }}
                          />
                          <div className="flex-1 overflow-hidden">
                            <p className="text-xs truncate">{connectedNode.content}</p>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <div 
                                  className="px-1.5 py-0.5 text-[10px] rounded"
                                  style={{ 
                                    backgroundColor: RELATIONSHIP_TYPES[edge.relationship as keyof typeof RELATIONSHIP_TYPES] || "#64748b",
                                    color: "white"
                                  }}
                                >
                                  {isSource ? '→' : '←'}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                <p className="capitalize">
                                  {isSource ? 'To: ' : 'From: '}
                                  {edge.relationship.replace(/_/g, ' ')}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      );
                    })}
                  
                  {filteredEdges.filter(edge => 
                    edge.sourceNodeId === selectedNode.id || 
                    edge.targetNodeId === selectedNode.id
                  ).length === 0 && (
                    <p className="text-xs text-muted-foreground">No connected nodes in current view</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}