// /frontend/components/visualization/KnowledgeMap3D.tsx
import React, { useRef, useEffect, useState } from 'react';
import { Box, CircularProgress, Typography, Button, Slider, Paper, IconButton, Tooltip } from '@mui/material';
import { ZoomIn, ZoomOut, Rotate3d, Home, Download, Share, Settings } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useKnowledgeMapService } from '../../hooks/useKnowledgeMapService';
import { KnowledgeMap, KnowledgeNode, KnowledgeLink } from '../../types/visualization';
import KnowledgeMapLegend from './KnowledgeMapLegend';
import KnowledgeMapSettings from './KnowledgeMapSettings';

interface KnowledgeMap3DProps {
  syllabusId: string;
  mapId?: string;
}

const KnowledgeMap3D: React.FC<KnowledgeMap3DProps> = ({ syllabusId, mapId }) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [knowledgeMap, setKnowledgeMap] = useState<KnowledgeMap | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  
  // Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameIdRef = useRef<number | null>(null);
  
  // Node references for interaction
  const nodeObjectsRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  
  const { getKnowledgeMap, createKnowledgeMap } = useKnowledgeMapService();
  
  useEffect(() => {
    const fetchMap = async () => {
      try {
        setLoading(true);
        let map: KnowledgeMap;
        
        if (mapId) {
          // Load existing map
          map = await getKnowledgeMap(mapId);
        } else {
          // Create new map from syllabus
          map = await createKnowledgeMap(syllabusId);
        }
        
        setKnowledgeMap(map);
        setLoading(false);
      } catch (err) {
        setError('Failed to load knowledge map');
        setLoading(false);
        console.error(err);
      }
    };
    
    fetchMap();
  }, [syllabusId, mapId, getKnowledgeMap, createKnowledgeMap]);
  
  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current || !knowledgeMap || loading) return;
    
    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;
    
    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75,
      canvasRef.current.clientWidth / canvasRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 30;
    cameraRef.current = camera;
    
    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    canvasRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Setup controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Create nodes and links
    createNodesAndLinks();
    
    // Animation loop
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    
    // Handle resize
    const handleResize = () => {
      if (!canvasRef.current || !camera || !renderer) return;
      
      camera.aspect = canvasRef.current.clientWidth / canvasRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
      
      if (rendererRef.current && canvasRef.current) {
        canvasRef.current.removeChild(rendererRef.current.domElement);
      }
      
      // Dispose resources
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            if (object.material instanceof THREE.Material) {
              object.material.dispose();
            } else if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            }
          }
        });
      }
    };
  }, [knowledgeMap, loading]);
  
  const createNodesAndLinks = () => {
    if (!sceneRef.current || !knowledgeMap) return;
    
    const scene = sceneRef.current;
    nodeObjectsRef.current.clear();
    
    // Create nodes
    knowledgeMap.nodes.forEach(node => {
      const nodeColor = new THREE.Color(node.color || getNodeColorByType(node.type));
      const geometry = new THREE.SphereGeometry(node.size || 1, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: nodeColor,
        roughness: 0.7,
        metalness: 0.3
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        node.position.x,
        node.position.y,
        node.position.z
      );
      mesh.userData = { nodeId: node.id, type: 'node' };
      scene.add(mesh);
      
      // Add node label
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = 256;
        canvas.height = 128;
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.font = '24px Arial';
        context.fillStyle = '#000000';
        context.textAlign = 'center';
        context.fillText(node.label, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(5, 2.5, 1);
        sprite.position.set(
          node.position.x,
          node.position.y + node.size + 1.5,
          node.position.z
        );
        scene.add(sprite);
      }
      
      // Store reference to mesh
      nodeObjectsRef.current.set(node.id, mesh);
    });
    
    // Create links
    knowledgeMap.links.forEach(link => {
      const sourceNode = knowledgeMap.nodes.find(n => n.id === link.sourceNodeId);
      const targetNode = knowledgeMap.nodes.find(n => n.id === link.targetNodeId);
      
      if (sourceNode && targetNode) {
        const start = new THREE.Vector3(
          sourceNode.position.x,
          sourceNode.position.y,
          sourceNode.position.z
        );
        
        const end = new THREE.Vector3(
          targetNode.position.x,
          targetNode.position.y,
          targetNode.position.z
        );
        
        // Create curve for link
        const curve = new THREE.QuadraticBezierCurve3(
          start,
          new THREE.Vector3(
            (start.x + end.x) / 2,
            (start.y + end.y) / 2 + 2,
            (start.z + end.z) / 2
          ),
          end
        );
        
        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        const linkColor = new THREE.Color(link.color || '#888888');
        const material = new THREE.LineBasicMaterial({
          color: linkColor,
          linewidth: link.strength || 1
        });
        
        const line = new THREE.Line(geometry, material);
        line.userData = { linkId: link.id, type: 'link' };
        scene.add(line);
      }
    });
    
    // Set up raycaster for interactions
    setupInteractions();
  };
  
  const setupInteractions = () => {
    if (!canvasRef.current || !rendererRef.current || !cameraRef.current) return;
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    const onMouseMove = (event: MouseEvent) => {
      // Calculate mouse position in normalized device coordinates
      const rect = rendererRef.current!.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Update the raycaster
      raycaster.setFromCamera(mouse, cameraRef.current!);
      
      // Find intersections with nodes
      const intersects = raycaster.intersectObjects(
        Array.from(nodeObjectsRef.current.values())
      );
      
      if (intersects.length > 0) {
        const intersectedObject = intersects[0].object as THREE.Mesh;
        document.body.style.cursor = 'pointer';
        
        // Highlight node
        if (intersectedObject.material instanceof THREE.MeshStandardMaterial) {
          intersectedObject.material.emissive.set(0x333333);
        }
      } else {
        document.body.style.cursor = 'auto';
        
        // Reset all node materials
        nodeObjectsRef.current.forEach(nodeMesh => {
          if (nodeMesh.material instanceof THREE.MeshStandardMaterial) {
            nodeMesh.material.emissive.set(0x000000);
          }
        });
      }
    };
    
    const onClick = (event: MouseEvent) => {
      // Calculate mouse position in normalized device coordinates
      const rect = rendererRef.current!.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // Update the raycaster
      raycaster.setFromCamera(mouse, cameraRef.current!);
      
      // Find intersections with nodes
      const intersects = raycaster.intersectObjects(
        Array.from(nodeObjectsRef.current.values())
      );
      
      if (intersects.length > 0) {
        const intersectedObject = intersects[0].object as THREE.Mesh;
        const nodeId = intersectedObject.userData.nodeId;
        
        if (nodeId) {
          const node = knowledgeMap?.nodes.find(n => n.id === nodeId) || null;
          setSelectedNode(node);
        }
      } else {
        setSelectedNode(null);
      }
    };
    
    rendererRef.current.domElement.addEventListener('mousemove', onMouseMove);
    rendererRef.current.domElement.addEventListener('click', onClick);
    
    return () => {
      rendererRef.current?.domElement.removeEventListener('mousemove', onMouseMove);
      rendererRef.current?.domElement.removeEventListener('click', onClick);
    };
  };
  
  const handleZoomChange = (event: Event, newValue: number | number[]) => {
    if (typeof newValue === 'number') {
      setZoomLevel(newValue);
      
      if (cameraRef.current) {
        // Scale camera position based on zoom level
        const direction = new THREE.Vector3().subVectors(
          cameraRef.current.position,
          new THREE.Vector3(0, 0, 0)
        ).normalize();
        
        const distance = 30 / newValue;
        cameraRef.current.position.copy(direction.multiplyScalar(distance));
        cameraRef.current.updateProjectionMatrix();
      }
    }
  };
  
  const handleResetView = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 0, 30);
      cameraRef.current.lookAt(0, 0, 0);
      controlsRef.current.reset();
      setZoomLevel(1);
    }
  };
  
  const handleExportMap = () => {
    if (!knowledgeMap) return;
    
    // Serialize the knowledge map to JSON
    const jsonStr = JSON.stringify(knowledgeMap, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a download link
    const a = document.createElement('a');
    a.href = url;
    a.download = `knowledge-map-${knowledgeMap.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Helper function to get color based on node type
  const getNodeColorByType = (type: number): string => {
    switch (type) {
      case 0: // OBJECTIVE
        return '#4285F4'; // Blue
      case 1: // COMPETENCY
        return '#EA4335'; // Red
      case 2: // TOPIC
        return '#34A853'; // Green
      case 3: // PROCEDURE
        return '#FBBC05'; // Yellow
      case 4: // REGULATION
        return '#9C27B0'; // Purple
      case 5: // AIRCRAFT_SYSTEM
        return '#FF9800'; // Orange
      default:
        return '#9E9E9E'; // Grey
    }
  };
  
  // Helper function to get type name
  const getNodeTypeName = (type: number): string => {
    switch (type) {
      case 0: return 'Objective';
      case 1: return 'Competency';
      case 2: return 'Topic';
      case 3: return 'Procedure';
      case 4: return 'Regulation';
      case 5: return 'Aircraft System';
      default: return 'Unknown';
    }
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="500px">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="500px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }
  
  return (
    <Box sx={{ position: 'relative', height: '700px', width: '100%' }}>
      {/* Controls Panel */}
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 10,
          p: 2,
          borderRadius: 2
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Tooltip title="Zoom In">
            <IconButton onClick={() => setZoomLevel(prev => Math.min(prev + 0.1, 2))}>
              <ZoomIn />
            </IconButton>
          </Tooltip>
          
          <Slider
            orientation="vertical"
            min={0.5}
            max={2}
            step={0.1}
            value={zoomLevel}
            onChange={handleZoomChange}
            sx={{ height: 100 }}
          />
          
          <Tooltip title="Zoom Out">
            <IconButton onClick={() => setZoomLevel(prev => Math.max(prev - 0.1, 0.5))}>
              <ZoomOut />
            </IconButton>
          </Tooltip>
          
          <Divider sx={{ my: 1 }} />
          
          <Tooltip title="Reset View">
            <IconButton onClick={handleResetView}>
              <Home />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Rotate Mode">
            <IconButton>
              <Rotate3d />
            </IconButton>
          </Tooltip>
          
          <Divider sx={{ my: 1 }} />
          
          <Tooltip title="Download Map">
            <IconButton onClick={handleExportMap}>
              <Download />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Share Map">
            <IconButton>
              <Share />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Map Settings">
            <IconButton onClick={() => setSettingsOpen(true)}>
              <Settings />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
      
      {/* Legend */}
      <Box 
        sx={{ 
          position: 'absolute', 
          top: 16, 
          right: 16, 
          zIndex: 10 
        }}
      >
        <KnowledgeMapLegend />
      </Box>
      
      {/* Node Info Panel */}
      {selectedNode && (
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            zIndex: 10,
            p: 2,
            borderRadius: 2,
            maxWidth: 300
          }}
        >
          <Typography variant="h6" gutterBottom>
            {selectedNode.label}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Type: {getNodeTypeName(selectedNode.type)}
          </Typography>
          
          <Typography variant="body2">
            {selectedNode.description || 'No description available.'}
          </Typography>
          
          <Box sx={{ mt: 2 }}>
            <Button variant="outlined" size="small">
              View Details
            </Button>
          </Box>
        </Paper>
      )}
      
      {/* 3D Canvas */}
      <Box 
        ref={canvasRef} 
        sx={{ 
          width: '100%', 
          height: '100%', 
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: '#f0f0f0'
        }}
      />
      
      {/* Settings Dialog */}
      <KnowledgeMapSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        knowledgeMap={knowledgeMap}
        onApplySettings={(updatedMap) => {
          setKnowledgeMap(updatedMap);
          // Re-create nodes and links with new settings
          if (sceneRef.current) {
            // Clear existing scene
            while (sceneRef.current.children.length > 0) {
              const object = sceneRef.current.children[0];
              sceneRef.current.remove(object);
            }
            
            // Add lights again
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            sceneRef.current.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(1, 1, 1);
            sceneRef.current.add(directionalLight);
            
            // Recreate nodes and links
            createNodesAndLinks();
          }
        }}
      />
    </Box>
  );
};

export default KnowledgeMap3D;

// /frontend/components/visualization/PerformanceDashboard.tsx
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  CircularProgress,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Tabs,
  Tab,
  IconButton,
  useTheme,
} from '@mui/material';
import { 
  BarChart,
  LineChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { 
  Download,
  Calendar,
  Users,
  Filter,
  Maximize2,
  Settings,
} from 'lucide-react';
import { usePerformanceData } from '../../hooks/usePerformanceData';
import { Performance, CompetencyScore } from '../../types/visualization';
import CompetencyRadarChart from './CompetencyRadarChart';
import PerformanceTrend from './PerformanceTrend';
import AssessmentBreakdown from './AssessmentBreakdown';

interface PerformanceDashboardProps {
  traineeId?: string;
  groupId?: string;
  courseId?: string;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ 
  traineeId,
  groupId,
  courseId 
}) => {
  const theme = useTheme();
  const [timeRange, setTimeRange] = useState<string>('month');
  const [selectedMetric, setSelectedMetric] = useState<string>('overall');
  const [tabValue, setTabValue] = useState<number>(0);
  
  const { 
    performanceData, 
    competencyScores,
    assessmentData,
    loading, 
    error,
    fetchPerformanceData,
    fetchCompetencyScores,
    fetchAssessmentData
  } = usePerformanceData();
  
  useEffect(() => {
    if (traineeId) {
      fetchPerformanceData(traineeId, timeRange);
      fetchCompetencyScores(traineeId);
      fetchAssessmentData(traineeId, timeRange);
    } else if (groupId) {
      // Fetch group performance data
    }
  }, [traineeId, groupId, timeRange, fetchPerformanceData, fetchCompetencyScores, fetchAssessmentData]);
  
  const handleTimeRangeChange = (event: SelectChangeEvent) => {
    setTimeRange(event.target.value);
  };
  
  const handleMetricChange = (event: SelectChangeEvent) => {
    setSelectedMetric(event.target.value);
  };
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="500px">
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="500px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }
  
  // Calculate summary metrics
  const calculateAverage = (data: Performance[]) => {
    if (data.length === 0) return 0;
    return data.reduce((sum, item) => sum + item.score, 0) / data.length;
  };
  
  const averageScore = calculateAverage(performanceData);
  const latestScore = performanceData.length > 0 ? performanceData[performanceData.length - 1].score : 0;
  const scoreChange = performanceData.length > 1 
    ? latestScore - performanceData[performanceData.length - 2].score
    : 0;
  
  const competencyNames = {
    technicalKnowledge: 'Technical Knowledge',
    procedureExecution: 'Procedure Execution',
    situationalAwareness: 'Situational Awareness',
    decisionMaking: 'Decision Making',
    communication: 'Communication',
    workload: 'Workload Management',
    teamwork: 'Teamwork'
  };
  
  // Transform competency data for radar chart
  const competencyRadarData = competencyScores.map(item => ({
    subject: competencyNames[item.competency as keyof typeof competencyNames] || item.competency,
    value: item.score,
    fullMark: 100
  }));
  
  // Prepare assessment breakdown data
  const assessmentCounts = assessmentData.reduce((acc: {[key: string]: number}, assessment) => {
    const result = assessment.result;
    acc[result] = (acc[result] || 0) + 1;
    return acc;
  }, {});
  
  const assessmentBreakdownData = [
    { name: 'Excellent', value: assessmentCounts['Excellent'] || 0, color: '#4CAF50' },
    { name: 'Good', value: assessmentCounts['Good'] || 0, color: '#2196F3' },
    { name: 'Satisfactory', value: assessmentCounts['Satisfactory'] || 0, color: '#FFC107' },
    { name: 'Needs Improvement', value: assessmentCounts['Needs Improvement'] || 0, color: '#FF5722' },
    { name: 'Unsatisfactory', value: assessmentCounts['Unsatisfactory'] || 0, color: '#F44336' }
  ];
  
  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5">Performance Dashboard</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              onChange={handleTimeRangeChange}
              label="Time Range"
            >
              <MenuItem value="week">Past Week</MenuItem>
              <MenuItem value="month">Past Month</MenuItem>
              <MenuItem value="quarter">Past Quarter</MenuItem>
              <MenuItem value="year">Past Year</MenuItem>
              <MenuItem value="all">All Time</MenuItem>
            </Select>
          </FormControl>
          
          <Button 
            variant="outlined" 
            startIcon={<Download />}
            onClick={() => {/* Export functionality */}}
          >
            Export
          </Button>
        </Box>
      </Box>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              borderRadius: 2,
              height: '100%',
              background: `linear-gradient(135deg, ${theme.palette.primary.light}, ${theme.palette.primary.main})`,
              color: 'white'
            }}
          >
            <Typography variant="h6" gutterBottom>Overall Performance</Typography>
            <Typography variant="h3" sx={{ mb: 1 }}>{averageScore.toFixed(1)}%</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2">
                {scoreChange >= 0 ? '+' : ''}{scoreChange.toFixed(1)}% from previous period
              </Typography>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              borderRadius: 2,
              height: '100%'
            }}
          >
            <Typography variant="h6" gutterBottom>Total Assessments</Typography>
            <Typography variant="h3" sx={{ mb: 1 }}>{assessmentData.length}</Typography>
            <Typography variant="body2" color="text.secondary">
              {assessmentData.filter(a => a.result === 'Excellent' || a.result === 'Good').length} passed ({
                assessmentData.length > 0 
                  ? Math.round(assessmentData.filter(a => a.result === 'Excellent' || a.result === 'Good').length / assessmentData.length * 100)
                  : 0
              }%)
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper
            elevation={2}
            sx={{
              p: 2,
              borderRadius: 2,
              height: '100%'
            }}
          >
            <Typography variant="h6" gutterBottom>Top Competency</Typography>
            {competencyScores.length > 0 ? (
              <>
                <Typography variant="h3" sx={{ mb: 1 }}>
                  {
                    competencyNames[
                      competencyScores.reduce((max, item) => 
                        item.score > max.score ? item : max
                      ).competency as keyof typeof competencyNames
                    ] || 'None'
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Score: {
                    competencyScores.reduce((max, item) => 
                      item.score > max.score ? item : max
                    ).score.toFixed(1)
                  }%
                </Typography>
              </>
            ) : (
              <Typography variant="body1">No competency data available</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
      
      {/* Tabs for different views */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
          <Tab label="Overview" />
          <Tab label="Competencies" />
          <Tab label="Assessments" />
          <Tab label="Trends" />
        </Tabs>
      </Box>
      
      {/* Tab Panels */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {/* Performance Trend */}
          <Grid item xs={12} md={8}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                borderRadius: 2,
                height: '100%'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Performance Trend</Typography>
                <IconButton size="small">
                  <Maximize2 size={16} />
                </IconButton>
              </Box>
              
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={theme.palette.primary.main}
                    activeDot={{ r: 8 }}
                    name="Overall Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          
          {/* Competency Radar */}
          <Grid item xs={12} md={4}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                borderRadius: 2,
                height: '100%'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Competency Breakdown</Typography>
                <IconButton size="small">
                  <Maximize2 size={16} />
                </IconButton>
              </Box>
              
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart outerRadius={90} data={competencyRadarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar
                    name="Competency Score"
                    dataKey="value"
                    stroke={theme.palette.primary.main}
                    fill={theme.palette.primary.main}
                    fillOpacity={0.6}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          
          {/* Assessment Results */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                borderRadius: 2,
                height: '100%'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Assessment Results</Typography>
                <IconButton size="small">
                  <Maximize2 size={16} />
                </IconButton>
              </Box>
              
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={assessmentBreakdownData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="value" name="Count">
                    {assessmentBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          
          {/* Recent Assessments */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                borderRadius: 2,
                height: '100%'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Recent Assessments</Typography>
                <Button size="small">View All</Button>
              </Box>
              
              {assessmentData.slice(0, 5).map((assessment, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="body1">{assessment.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {assessment.date} • {assessment.instructor}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: 
                          assessment.result === 'Excellent' ? 'success.light' :
                          assessment.result === 'Good' ? 'info.light' :
                          assessment.result === 'Satisfactory' ? 'warning.light' :
                          'error.light',
                        color: 
                          assessment.result === 'Excellent' ? 'success.dark' :
                          assessment.result === 'Good' ? 'info.dark' :
                          assessment.result === 'Satisfactory' ? 'warning.dark' :
                          'error.dark',
                      }}
                    >
                      {assessment.result}
                    </Typography>
                  </Box>
                  
                  {index < assessmentData.slice(0, 5).length - 1 && (
                    <Divider sx={{ mt: 2 }} />
                  )}
                </Box>
              ))}
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {tabValue === 1 && (
        <CompetencyRadarChart competencyScores={competencyScores} />
      )}
      
      {tabValue === 2 && (
        <AssessmentBreakdown assessmentData={assessmentData} />
      )}
      
      {tabValue === 3 && (
        <PerformanceTrend performanceData={performanceData} />
      )}
    </Box>
  );
};

export default PerformanceDashboard;

// /frontend/hooks/useKnowledgeMapService.ts
import { useState, useCallback } from 'react';
import api from '../services/api';
import { KnowledgeMap } from '../types/visualization';

export const useKnowledgeMapService = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const getKnowledgeMap = useCallback(async (mapId: string): Promise<KnowledgeMap> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/visualization/knowledge-maps/${mapId}`);
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError('Failed to fetch knowledge map');
      throw err;
    }
  }, []);
  
  const createKnowledgeMap = useCallback(async (syllabusId: string): Promise<KnowledgeMap> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/visualization/knowledge-maps', { syllabusId });
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError('Failed to create knowledge map');
      throw err;
    }
  }, []);
  
  const updateKnowledgeMap = useCallback(async (mapId: string, data: Partial<KnowledgeMap>): Promise<KnowledgeMap> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.put(`/visualization/knowledge-maps/${mapId}`, data);
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError('Failed to update knowledge map');
      throw err;
    }
  }, []);
  
  const deleteKnowledgeMap = useCallback(async (mapId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      await api.delete(`/visualization/knowledge-maps/${mapId}`);
      setLoading(false);
      return true;
    } catch (err) {
      setLoading(false);
      setError('Failed to delete knowledge map');
      throw err;
    }
  }, []);
  
  const exportKnowledgeMapToGltf = useCallback(async (mapId: string): Promise<Blob> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/visualization/knowledge-maps/${mapId}/export/gltf`, {
        responseType: 'blob',
      });
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError('Failed to export knowledge map');
      throw err;
    }
  }, []);
  
  const getUserKnowledgeMaps = useCallback(async (userId: string): Promise<KnowledgeMap[]> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/visualization/knowledge-maps/user/${userId}`);
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      setError('Failed to fetch user knowledge maps');
      throw err;
    }
  }, []);
  
  return {
    loading,
    error,
    getKnowledgeMap,
    createKnowledgeMap,
    updateKnowledgeMap,
    deleteKnowledgeMap,
    exportKnowledgeMapToGltf,
    getUserKnowledgeMaps,
  };
};

// /frontend/hooks/usePerformanceData.ts
import { useState, useCallback } from 'react';
import api from '../services/api';
import { Performance, CompetencyScore, Assessment } from '../types/visualization';

export const usePerformanceData = () => {
  const [performanceData, setPerformanceData] = useState<Performance[]>([]);
  const [competencyScores, setCompetencyScores] = useState<CompetencyScore[]>([]);
  const [assessmentData, setAssessmentData] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchPerformanceData = useCallback(async (traineeId: string, timeRange: string = 'month') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/analytics/performance/${traineeId}`, {
        params: { timeRange }
      });
      setPerformanceData(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch performance data');
      setLoading(false);
      console.error(err);
    }
  }, []);
  
  const fetchCompetencyScores = useCallback(async (traineeId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/analytics/competencies/${traineeId}`);
      setCompetencyScores(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch competency scores');
      setLoading(false);
      console.error(err);
    }
  }, []);
  
  const fetchAssessmentData = useCallback(async (traineeId: string, timeRange: string = 'month') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/assessment/trainee/${traineeId}`, {
        params: { timeRange }
      });
      setAssessmentData(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch assessment data');
      setLoading(false);
      console.error(err);
    }
  }, []);
  
  const fetchGroupPerformance = useCallback(async (groupId: string, timeRange: string = 'month') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/analytics/group-performance/${groupId}`, {
        params: { timeRange }
      });
      setPerformanceData(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch group performance data');
      setLoading(false);
      console.error(err);
    }
  }, []);
  
  const fetchGroupCompetencies = useCallback(async (groupId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/analytics/group-competencies/${groupId}`);
      setCompetencyScores(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch group competency data');
      setLoading(false);
      console.error(err);
    }
  }, []);
  
  return {
    performanceData,
    competencyScores,
    assessmentData,
    loading,
    error,
    fetchPerformanceData,
    fetchCompetencyScores,
    fetchAssessmentData,
    fetchGroupPerformance,
    fetchGroupCompetencies
  };
};

// /frontend/types/visualization.ts
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface KnowledgeNode {
  id: string;
  label: string;
  description?: string;
  type: number;
  position: Vector3;
  size: number;
  color: string;
  metadata?: Record<string, string>;
}

export interface KnowledgeLink {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
  strength: number;
  color: string;
}

export interface KnowledgeMap {
  id: string;
  name: string;
  description?: string;
  creatorId: string;
  syllabusId: string;
  createdAt: string;
  updatedAt: string;
  nodes: KnowledgeNode[];
  links: KnowledgeLink[];
}

export interface Performance {
  id: string;
  traineeId: string;
  date: string;
  score: number;
  assessmentId?: string;
  assessmentTitle?: string;
  metadata?: Record<string, any>;
}

export interface CompetencyScore {
  id: string;
  traineeId: string;
  competency: string;
  score: number;
  lastUpdated: string;
}

export interface Assessment {
  id: string;
  traineeId: string;
  title: string;
  date: string;
  instructor: string;
  score: number;
  result: string;
  competencyBreakdown?: Record<string, number>;
  notes?: string;
}

export interface SimulationScene {
  id: string;
  name: string;
  description?: string;
  aircraftType: string;
  weather: string;
  timeOfDay: string;
  airport?: string;
  runway?: string;
  scenarios?: string[];
}

export interface ARContent {
  id: string;
  name: string;
  type: string;
  modelUrl: string;
  texturesUrl?: string;
  annotations?: Record<string, string>;
}
