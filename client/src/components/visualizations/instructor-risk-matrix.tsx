import React, { useState, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { 
  OrbitControls, 
  Text, 
  Box, 
  Stars, 
  Html,
  PerspectiveCamera,
  Cylinder
} from "@react-three/drei";
import * as THREE from "three";
import { RiskMatrixData, RiskMatrixConfig } from "@shared/risk-assessment-types";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { CardDescription } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card";
import { CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { TabsContent } from "@/components/ui/tabs";
import { TabsList } from "@/components/ui/tabs";
import { TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { SelectContent } from "@/components/ui/select";
import { SelectItem } from "@/components/ui/select";
import { SelectTrigger } from "@/components/ui/select";
import { SelectValue } from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { AvatarFallback } from "@/components/ui/avatar";
import { AvatarImage } from "@/components/ui/avatar";
import { 
  AlertCircle, 
  BarChart4,
  PieChart,
  Lightbulb,
  Users,
  Calendar,
  CheckSquare,
  FileText,
  RefreshCw,
  CalendarPlus,
  BookOpen,
  Moon
} from "lucide-react";

// 3D Matrix Cube for the risk matrix
const MatrixCube: React.FC<{
  data: number[][][];
  size: number;
  colorMap: (value: number) => string;
  highlightPosition?: [number, number, number];
  onCellClick: (x: number, y: number, z: number, value: number) => void;
}> = ({ data, size, colorMap, highlightPosition, onCellClick }) => {
  const totalSize = size * data.length;
  const cellSize = size;
  const halfSize = totalSize / 2;
  
  // Generate cubes for each cell
  const cubes = [];
  for (let x = 0; x < data.length; x++) {
    for (let y = 0; y < data[x].length; y++) {
      for (let z = 0; z < data[x][y].length; z++) {
        const value = data[x][y][z];
        if (value > 0) { // Only render non-zero values
          const position = [
            (x * cellSize) - halfSize + cellSize / 2,
            (y * cellSize) - halfSize + cellSize / 2,
            (z * cellSize) - halfSize + cellSize / 2,
          ];
          
          const isHighlighted = 
            highlightPosition && 
            highlightPosition[0] === x && 
            highlightPosition[1] === y && 
            highlightPosition[2] === z;
          
          cubes.push(
            <Box 
              key={`cube-${x}-${y}-${z}`}
              args={[cellSize * 0.9, cellSize * 0.9, cellSize * 0.9]}
              position={position}
              onClick={() => onCellClick(x, y, z, value)}
            >
              <meshBasicMaterial 
                color={colorMap(value)}
                transparent
                opacity={isHighlighted ? 1 : 0.7}
              />
            </Box>
          );
        }
      }
    }
  }
  
  // Create a wireframe box to show the boundaries of the risk matrix
  const borderPosition = [0, 0, 0];
  const borderSize = [totalSize, totalSize, totalSize];
  
  return (
    <group>
      {cubes}
      <Box args={borderSize} position={borderPosition}>
        <meshBasicMaterial color="#333333" wireframe transparent opacity={0.3} />
      </Box>
    </group>
  );
};

// Label component for the 3D matrix axes
const AxisLabels: React.FC<{ size: number }> = ({ size }) => {
  const halfSize = size / 2;
  const offset = size / 2 + 0.3;
  
  return (
    <>
      {/* X-Axis - Severity */}
      <Text
        position={[0, -offset, 0]}
        rotation={[0, 0, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Severity
      </Text>
      
      {/* Y-Axis - Detection */}
      <Text
        position={[-offset, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Detection
      </Text>
      
      {/* Z-Axis - Occurrence */}
      <Text
        position={[0, 0, offset]}
        rotation={[Math.PI / 2, 0, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Occurrence
      </Text>
      
      {/* Add scale markers on each axis */}
      {[1, 2, 3, 4, 5].map((value) => {
        const position = (value - 3) * (size / 5);
        return (
          <React.Fragment key={`axis-marker-${value}`}>
            <Text
              position={[position, -halfSize - 0.2, -halfSize - 0.2]}
              fontSize={0.2}
              color="white"
              anchorX="center"
              anchorY="middle"
            >
              {value}
            </Text>
            <Text
              position={[-halfSize - 0.2, position, -halfSize - 0.2]}
              fontSize={0.2}
              color="white"
              anchorX="center"
              anchorY="middle"
            >
              {value}
            </Text>
            <Text
              position={[-halfSize - 0.2, -halfSize - 0.2, position]}
              fontSize={0.2}
              color="white"
              anchorX="center"
              anchorY="middle"
            >
              {value}
            </Text>
          </React.Fragment>
        );
      })}
    </>
  );
};

// Connection line between nodes
const NodeConnection = ({ 
  start, 
  end, 
  thickness = 0.05,
  color = "#888888"
}: { 
  start: [number, number, number]; 
  end: [number, number, number]; 
  thickness?: number;
  color?: string;
}) => {
  // Calculate the midpoint
  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;
  const midZ = (start[2] + end[2]) / 2;
  
  // Calculate the distance between points
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  
  // Calculate the rotation to align the cylinder with the line
  const rotX = Math.atan2(Math.sqrt(dx * dx + dz * dz), dy);
  const rotZ = Math.atan2(dz, dx);
  
  return (
    <mesh
      position={[midX, midY, midZ]}
      rotation={[rotX, 0, rotZ - Math.PI / 2]}
    >
      <cylinderGeometry args={[thickness, thickness, distance, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.7} />
    </mesh>
  );
};

// Session point for visualization
const SessionPoint: React.FC<{
  position: [number, number, number];
  color: string;
  size: number;
  label: string;
  completion: number;
  onClick?: () => void;
}> = ({ position, color, size, label, completion, onClick }) => {
  const ref = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (ref.current) {
      // Make the sphere pulsate based on completion percentage
      const pulse = 0.8 + Math.sin(state.clock.getElapsedTime() * 2) * 0.2 * (completion / 100);
      ref.current.scale.set(pulse, pulse, pulse);
    }
  });
  
  return (
    <group position={position} onClick={onClick}>
      <mesh ref={ref}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial 
          color={color}
          transparent
          opacity={0.8}
        />
      </mesh>
      <Html position={[0, size * 1.5, 0]} center>
        <div className="bg-background/80 backdrop-blur-sm p-1.5 rounded-md text-center whitespace-nowrap">
          <div className="text-xs font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{completion}% Complete</div>
        </div>
      </Html>
    </group>
  );
};

interface InstructorRiskMatrixProps {
  className?: string;
}

// Generate a 3D matrix data with realistic risk values
const generateMatrixData = () => {
  const matrixSize = 5;
  const data = Array(matrixSize)
    .fill(0)
    .map(() => 
      Array(matrixSize)
        .fill(0)
        .map(() => 
          Array(matrixSize).fill(0)
        )
    );
  
  // Fill with realistic risk values - higher risk in the center
  for (let x = 0; x < matrixSize; x++) {
    for (let y = 0; y < matrixSize; y++) {
      for (let z = 0; z < matrixSize; z++) {
        // Calculate distance from center (2,2,2)
        const distanceFromCenter = Math.sqrt(
          Math.pow(x - 2, 2) + 
          Math.pow(y - 2, 2) + 
          Math.pow(z - 2, 2)
        );
        
        // Higher values in the center (high severity, occurrence, low detection)
        // Scale to 0-100 range
        const centerValue = 100 - (distanceFromCenter / Math.sqrt(12)) * 100;
        
        // For educational risks, we want to have higher values for high severity, high occurrence, and low detection
        // So for severity and occurrence, higher index = higher risk
        // For detection, lower index = higher risk (harder to detect)
        const severityFactor = (x + 1) / matrixSize;
        const occurrenceFactor = (z + 1) / matrixSize;
        const detectionFactor = (matrixSize - y) / matrixSize;
        
        // Combine factors for final value
        let value = centerValue * severityFactor * occurrenceFactor * detectionFactor;
        
        // Add some randomness
        value += (Math.random() * 20) - 10;
        
        // Ensure value is in range 0-100
        value = Math.max(0, Math.min(100, value));
        
        // Round to integer
        data[x][y][z] = Math.round(value);
      }
    }
  }
  
  return data;
};

// Sample session data for visualization
const sessionData = [
  {
    id: 1,
    title: "Emergency Procedures Training",
    completion: 85,
    position: [1.8, 1.2, -1.5],
    color: "#10b981", // green
    traineeCount: 8
  },
  {
    id: 2,
    title: "Navigation & Flight Planning",
    completion: 65,
    position: [-1.5, 0.8, 1.2],
    color: "#3b82f6", // blue
    traineeCount: 12
  },
  {
    id: 3,
    title: "Aircraft Systems Overview",
    completion: 40,
    position: [0.5, -1.2, 2],
    color: "#f59e0b", // amber
    traineeCount: 15
  },
  {
    id: 4,
    title: "Advanced Weather Theory",
    completion: 20,
    position: [-0.8, -2, -0.5],
    color: "#ef4444", // red
    traineeCount: 6
  },
  {
    id: 5,
    title: "CRM & Human Factors",
    completion: 95,
    position: [2, -0.5, 0.7],
    color: "#8b5cf6", // violet
    traineeCount: 10
  }
];

// Sample trainee data
const trainees = [
  { id: 1, name: "Alex Johnson", progress: 78, avatar: "" },
  { id: 2, name: "Sam Wilson", progress: 62, avatar: "" },
  { id: 3, name: "Jamie Smith", progress: 91, avatar: "" },
  { id: 4, name: "Taylor Wang", progress: 45, avatar: "" },
  { id: 5, name: "Jordan Lee", progress: 83, avatar: "" }
];

export const InstructorRiskMatrix: React.FC<InstructorRiskMatrixProps> = ({
  className = "",
}) => {
  const { toast } = useToast();
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("matrix");
  const [selectedTrainee, setSelectedTrainee] = useState<number>(1);
  
  // Generated 3D risk assessment matrix data
  const [matrixData, setMatrixData] = useState(() => generateMatrixData());
  
  // State for selected cell in the matrix
  const [highlightPosition, setHighlightPosition] = useState<[number, number, number] | undefined>();
  const [selectedRisk, setSelectedRisk] = useState<{
    position: [number, number, number];
    value: number;
  } | null>(null);
  
  // State for selected session
  const [selectedSession, setSelectedSession] = useState<number | null>(null);
  
  const toggleRotation = () => {
    setIsRotating(!isRotating);
  };
  
  const handleCellClick = (x: number, y: number, z: number, value: number) => {
    setHighlightPosition([x, y, z]);
    setSelectedRisk({ position: [x, y, z], value });
    toast({
      title: "Risk Cell Selected",
      description: `Severity: ${x+1}, Detection: ${y+1}, Occurrence: ${z+1}, Risk Value: ${value}`,
      variant: "default"
    });
  };
  
  const handleSessionClick = (sessionId: number) => {
    setSelectedSession(sessionId);
    const session = sessionData.find(s => s.id === sessionId);
    if (session) {
      toast({
        title: session.title,
        description: `${session.completion}% complete with ${session.traineeCount} trainees assigned`,
        variant: "default"
      });
    }
  };
  
  // Color map function
  const getRiskColor = (value: number): string => {
    if (value < 20) return "#10b981"; // green - very low
    if (value < 40) return "#3b82f6"; // blue - low
    if (value < 60) return "#f59e0b"; // amber - medium
    if (value < 80) return "#ef4444"; // red - high
    return "#8b5cf6"; // violet - very high/special attention
  };
  
  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div>Instructor Dashboard - Risk & Assessment Visualization</div>
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="View Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="matrix">3D Risk Matrix</SelectItem>
              <SelectItem value="sessions">Session Planning</SelectItem>
              <SelectItem value="syllabus">Syllabus Coverage</SelectItem>
              <SelectItem value="evaluations">Student Evaluations</SelectItem>
            </SelectContent>
          </Select>
        </CardTitle>
        <CardDescription>
          Monitor training risks, session progress, syllabus coverage, and evaluation status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="matrix" className="m-0">
            <div className="mb-3 grid grid-cols-5 gap-3">
              <div className="p-2 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground mb-1">Total Risk Factors</div>
                <div className="text-xl font-bold">58</div>
              </div>
              <div className="p-2 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground mb-1">High Risk</div>
                <div className="text-xl font-bold text-destructive">14</div>
              </div>
              <div className="p-2 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground mb-1">Medium Risk</div>
                <div className="text-xl font-bold text-warning">22</div>
              </div>
              <div className="p-2 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground mb-1">Low Risk</div>
                <div className="text-xl font-bold text-info">16</div>
              </div>
              <div className="p-2 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground mb-1">Managed Risk</div>
                <div className="text-xl font-bold text-success">6</div>
              </div>
            </div>
            
            <div className="relative h-[450px] w-full rounded-lg border overflow-hidden">
              <Canvas camera={{ position: [8, 8, 8], fov: 50 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <OrbitControls 
                  autoRotate={isRotating}
                  autoRotateSpeed={0.5}
                  enableZoom={true}
                  enablePan={true}
                />
                
                {/* Stars background */}
                <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade />
                
                {/* Grid for reference */}
                <gridHelper args={[20, 20, "#333333", "#222222"]} />
                
                {/* The 3D risk matrix */}
                <MatrixCube 
                  data={matrixData}
                  size={1}
                  colorMap={getRiskColor}
                  highlightPosition={highlightPosition}
                  onCellClick={handleCellClick}
                />
                
                {/* Axis labels */}
                <AxisLabels size={5} />
              </Canvas>
              
              <div className="absolute left-4 bottom-4 bg-background/80 backdrop-blur-sm p-2 rounded-md border">
                <div className="text-xs font-medium mb-1">Visualization Controls</div>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 text-xs px-2"
                    onClick={toggleRotation}
                  >
                    {isRotating ? "Pause Rotation" : "Resume Rotation"}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 text-xs px-2"
                    onClick={() => {
                      // Reset matrix data with a new random generation
                      setMatrixData(generateMatrixData());
                      setHighlightPosition(undefined);
                      setSelectedRisk(null);
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh Data
                  </Button>
                </div>
              </div>
              
              {selectedRisk && (
                <div className="absolute right-4 top-4 bg-background/90 p-3 rounded-md border max-w-xs">
                  <h3 className="text-sm font-medium mb-2">
                    Risk Analysis
                  </h3>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Severity</div>
                      <div className="font-medium">{selectedRisk.position[0] + 1}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Detection</div>
                      <div className="font-medium">{selectedRisk.position[1] + 1}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">Occurrence</div>
                      <div className="font-medium">{selectedRisk.position[2] + 1}</div>
                    </div>
                  </div>
                  <div className="flex items-center mb-2">
                    <div className="text-xs text-muted-foreground mr-2">Risk Value:</div>
                    <div className="text-sm font-medium">{selectedRisk.value}</div>
                  </div>
                  <div className="text-xs mb-2">
                    This risk level requires {selectedRisk.value >= 60 ? "immediate" : "standard"} mitigation measures.
                  </div>
                  <Button size="sm" variant="default" className="w-full text-xs">
                    View Mitigation Plan
                  </Button>
                </div>
              )}
            </div>
            
            <div className="mt-3 text-xs text-muted-foreground">
              <AlertCircle className="inline h-3 w-3 mr-1" /> 
              The 3D risk matrix visualizes severity, detection difficulty, and occurrence frequency.
              Higher values (darker colors) represent areas requiring greater attention.
            </div>
          </TabsContent>
          
          <TabsContent value="sessions" className="m-0">
            <div className="mb-3 grid grid-cols-4 gap-3">
              <div className="p-2 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground mb-1">Total Sessions</div>
                <div className="text-xl font-bold">{sessionData.length}</div>
              </div>
              <div className="p-2 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground mb-1">Completed</div>
                <div className="text-xl font-bold text-success">1</div>
              </div>
              <div className="p-2 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground mb-1">In Progress</div>
                <div className="text-xl font-bold text-info">3</div>
              </div>
              <div className="p-2 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground mb-1">Not Started</div>
                <div className="text-xl font-bold text-muted-foreground">1</div>
              </div>
            </div>
            
            <div className="relative h-[450px] w-full rounded-lg border overflow-hidden">
              <Canvas camera={{ position: [0, 0, 10], fov: 60 }} dpr={[1, 2]}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <directionalLight position={[5, 5, 5]} intensity={0.5} />
                <OrbitControls 
                  autoRotate={isRotating}
                  autoRotateSpeed={0.5}
                  enableZoom={true}
                  enablePan={true}
                />
                
                {/* Stars background */}
                <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade />
                
                {/* Grid for reference */}
                <gridHelper args={[20, 20, "#333333", "#222222"]} />
                
                {/* Session nodes */}
                {sessionData.map((session) => (
                  <SessionPoint 
                    key={session.id}
                    position={session.position}
                    color={session.color}
                    size={0.3 + (session.traineeCount / 50)}
                    label={session.title}
                    completion={session.completion}
                    onClick={() => handleSessionClick(session.id)}
                  />
                ))}
                
                {/* Connection lines between related sessions */}
                <group>
                  <NodeConnection 
                    start={sessionData[0].position}
                    end={sessionData[4].position}
                    color="#6b7280"
                  />
                  <NodeConnection 
                    start={sessionData[1].position}
                    end={sessionData[2].position}
                    color="#6b7280"
                  />
                  <NodeConnection 
                    start={sessionData[2].position}
                    end={sessionData[3].position}
                    color="#6b7280"
                  />
                </group>
              </Canvas>
              
              {selectedSession && (
                <div className="absolute right-4 top-4 bg-background/90 p-3 rounded-md border max-w-xs">
                  {(() => {
                    const session = sessionData.find(s => s.id === selectedSession);
                    if (!session) return null;
                    
                    return (
                      <>
                        <h3 className="text-sm font-medium mb-2">
                          {session.title}
                        </h3>
                        <Progress 
                          value={session.completion} 
                          className="mb-2" 
                          style={{
                            '--progress-background': session.color
                          } as React.CSSProperties}
                        />
                        <div className="text-xs text-muted-foreground mb-2">
                          {session.completion}% Complete • {session.traineeCount} Trainees
                        </div>
                        <div className="flex flex-wrap gap-1 mb-3">
                          <Badge variant="outline">Flight Training</Badge>
                          <Badge variant="outline">Required</Badge>
                          <Badge variant="outline">Group Session</Badge>
                        </div>
                        <Button size="sm" variant="default" className="w-full text-xs">
                          View Session Details
                        </Button>
                      </>
                    );
                  })()}
                </div>
              )}
              
              <div className="absolute left-4 bottom-4 bg-background/80 backdrop-blur-sm p-2 rounded-md border">
                <div className="text-xs font-medium mb-1">Session Controls</div>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 text-xs px-2"
                    onClick={toggleRotation}
                  >
                    {isRotating ? "Pause Rotation" : "Resume Rotation"}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 text-xs px-2"
                  >
                    <Calendar className="h-3.5 w-3.5 mr-1" /> Schedule New
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="mt-3 text-xs text-muted-foreground">
              <Calendar className="inline h-3 w-3 mr-1" /> 
              Interactive session visualization. Node size represents number of trainees, 
              color indicates completion status.
            </div>
          </TabsContent>
          
          <TabsContent value="syllabus" className="m-0">
            <div className="flex space-x-4 mb-4">
              <Select value={selectedTrainee.toString()} onValueChange={v => setSelectedTrainee(Number(v))}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Trainee" />
                </SelectTrigger>
                <SelectContent>
                  {trainees.map(trainee => (
                    <SelectItem key={trainee.id} value={trainee.id.toString()}>
                      <div className="flex items-center">
                        <Avatar className="h-5 w-5 mr-2">
                          <AvatarFallback>{trainee.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {trainee.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex-1 p-2 rounded-lg border bg-card">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-xs text-muted-foreground">Overall Syllabus Progress</div>
                    <div className="text-xl font-bold">
                      {trainees.find(t => t.id === selectedTrainee)?.progress || 0}%
                    </div>
                  </div>
                  <Progress 
                    value={trainees.find(t => t.id === selectedTrainee)?.progress || 0} 
                    className="w-[120px]" 
                  />
                </div>
              </div>
              
              <div className="p-2 rounded-lg border bg-card flex items-center space-x-2">
                <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
                  <FileText className="h-4 w-4 text-blue-500 dark:text-blue-300" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Required Modules</div>
                  <div className="text-xl font-bold">7/9</div>
                </div>
              </div>
              
              <div className="p-2 rounded-lg border bg-card flex items-center space-x-2">
                <div className="bg-amber-100 dark:bg-amber-900 p-2 rounded-full">
                  <AlertCircle className="h-4 w-4 text-amber-500 dark:text-amber-300" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Risk Assessment</div>
                  <div className="text-xl font-bold">Medium</div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 h-[450px]">
              <div className="rounded-lg border overflow-hidden p-4">
                <h3 className="text-sm font-medium mb-3 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Syllabus Coverage & Competency Gap Analysis
                </h3>
                <div className="grid grid-cols-1 gap-3 overflow-y-auto max-h-[380px]">
                  {["Aircraft Systems", "Weather & Planning", "Navigation", "Flight Maneuvers", "Emergency Procedures", "Communications", "Human Factors", "Regulatory Knowledge", "Flight Planning"].map((module, idx) => {
                    // Generate a progress value that loosely correlates with the trainee's overall progress
                    const traineeProgress = trainees.find(t => t.id === selectedTrainee)?.progress || 0;
                    const moduleProgress = Math.max(0, Math.min(100, 
                      traineeProgress + (Math.random() * 30 - 15) // Add some variance
                    ));
                    
                    // Add completion status badges
                    let status = "In Progress";
                    let statusColor = "bg-blue-500";
                    
                    if (moduleProgress >= 100) {
                      status = "Complete";
                      statusColor = "bg-green-500";
                    } else if (moduleProgress < 25) {
                      status = "Not Started";
                      statusColor = "bg-gray-500";
                    } else if (moduleProgress >= 75) {
                      status = "Almost Complete";
                      statusColor = "bg-teal-500";
                    }
                    
                    return (
                      <div key={idx} className="rounded-md border p-3">
                        <div className="flex justify-between mb-2">
                          <div className="text-sm font-medium">{module}</div>
                          <Badge variant="outline" className={`text-xs ${moduleProgress >= 100 ? "border-green-500 text-green-500" : ""}`}>
                            {status}
                          </Badge>
                        </div>
                        <div className="flex justify-between mb-1">
                          <div className="text-xs text-muted-foreground">Progress</div>
                          <div className="text-xs">{Math.round(moduleProgress)}%</div>
                        </div>
                        <Progress value={moduleProgress} className="h-2 mb-2" />
                        
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {moduleProgress >= 100 ? "Completed" : "Due"}: {new Date(Date.now() + (idx * 7 * 24 * 60 * 60 * 1000)).toLocaleDateString()}
                          </div>
                          <div className="flex items-center">
                            <CheckSquare className="h-3 w-3 mr-1" />
                            {Math.round(moduleProgress / 10)}/10 Tasks
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex flex-col">
                <div className="rounded-lg border overflow-hidden p-4 mb-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center">
                    <BarChart4 className="h-4 w-4 mr-2" />
                    Regulatory Compliance Analytics
                  </h3>
                  
                  <div className="rounded-md border p-3 mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-medium">EASA Part-FCL Compliance</div>
                      <Badge variant="outline" className="border-green-500 text-green-500 bg-green-50">
                        Compliant
                      </Badge>
                    </div>
                    <Progress value={92} className="h-2 mb-2" 
                      style={{ '--progress-indicator-color': '#10b981' } as React.CSSProperties} />
                    <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                      <span>92% of required elements covered</span>
                      <span className="font-medium">35/38 requirements</span>
                    </div>
                  </div>
                  
                  <div className="rounded-md border p-3 mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-medium">Training Risk Assessment</div>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((_, i) => (
                          <div 
                            key={i} 
                            className={`h-2 w-2 rounded-full ${i < 3 ? "bg-green-500" : i === 3 ? "bg-amber-500" : "bg-gray-200"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      Medium risk - 3 high-risk activities identified in current modules
                    </div>
                    
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                        Night Operations
                      </Badge>
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                        Emergency Procedures
                      </Badge>
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                        Advanced Navigation
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="rounded-md border p-3">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-medium">Competency Gap Analysis</div>
                      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">3 Critical Areas</Badge>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <div className="text-xs">
                          <span className="font-medium">Adverse Weather Ops</span>
                          <Badge variant="outline" className="text-[10px] ml-1 border-red-200">EASA FCL.050</Badge>
                        </div>
                        <div className="text-xs font-medium text-destructive">Critical</div>
                      </div>
                      <Progress value={25} className="h-1.5"
                        style={{ '--progress-indicator-color': '#ef4444' } as React.CSSProperties} />
                      
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-xs">
                          <span className="font-medium">Abnormal Procedures</span>
                          <Badge variant="outline" className="text-[10px] ml-1 border-amber-200">EASA FCL.025</Badge>
                        </div>
                        <div className="text-xs font-medium text-amber-500">Medium</div>
                      </div>
                      <Progress value={65} className="h-1.5"
                        style={{ '--progress-indicator-color': '#f59e0b' } as React.CSSProperties} />
                      
                      <div className="flex justify-between items-center mt-2">
                        <div className="text-xs">
                          <span className="font-medium">Communication</span>
                          <Badge variant="outline" className="text-[10px] ml-1 border-green-200">EASA FCL.055</Badge>
                        </div>
                        <div className="text-xs font-medium text-green-500">Low</div>
                      </div>
                      <Progress value={85} className="h-1.5"
                        style={{ '--progress-indicator-color': '#10b981' } as React.CSSProperties} />
                    </div>
                  </div>
                </div>
                
                <div className="rounded-lg border overflow-hidden p-4">
                  <h3 className="text-sm font-medium mb-3 flex items-center">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Improvement Suggestions & Action Items
                  </h3>
                  
                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                      <div className="font-medium text-red-700 dark:text-red-300 flex justify-between">
                        <span>Critical: Schedule Emergency Procedures Training</span>
                        <Badge variant="outline" className="text-[10px] border-red-400">EASA FCL.025</Badge>
                      </div>
                      <div className="text-muted-foreground mt-1 mb-2">Current coverage is 35% below industry best practices and regulatory requirements</div>
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" className="h-6 text-xs bg-white border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800">
                          <CalendarPlus className="h-3 w-3 mr-1" />
                          Schedule Training
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
                      <div className="font-medium text-amber-700 dark:text-amber-300 flex justify-between">
                        <span>High Priority: Advanced Weather Training</span>
                        <Badge variant="outline" className="text-[10px] border-amber-400">EASA FCL.050</Badge>
                      </div>
                      <div className="text-muted-foreground mt-1 mb-2">Enhance training for METAR/TAF interpretation under rapidly changing conditions</div>
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" className="h-6 text-xs bg-white border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800">
                          <BookOpen className="h-3 w-3 mr-1" />
                          Review Materials
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-2 rounded-md bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                      <div className="font-medium text-blue-700 dark:text-blue-300 flex justify-between">
                        <span>Medium Priority: Night Operations</span>
                        <Badge variant="outline" className="text-[10px] border-blue-400">EASA FCL.810</Badge>
                      </div>
                      <div className="text-muted-foreground mt-1 mb-2">Additional training required to meet minimum night flying requirements</div>
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" className="h-6 text-xs bg-white border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800">
                          <Moon className="h-3 w-3 mr-1" />
                          Assign Night Flight
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-2 rounded-md bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                      <div className="font-medium text-green-700 dark:text-green-300 flex justify-between">
                        <span>Strength: Navigation Proficiency</span>
                        <Badge variant="outline" className="text-[10px] border-green-400">Excellent</Badge>
                      </div>
                      <div className="text-muted-foreground mt-1">VOR/NDB procedures show high proficiency - consider trainee as peer mentor</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border overflow-hidden">
                <Canvas camera={{ position: [0, 0, 3], fov: 60 }}>
                  <ambientLight intensity={0.5} />
                  <pointLight position={[10, 10, 10]} intensity={1} />
                  <OrbitControls 
                    autoRotate={isRotating}
                    autoRotateSpeed={0.3}
                    enableZoom={true}
                    enablePan={true}
                  />
                  
                  {/* A 3D representation of the syllabus coverage */}
                  {(() => {
                    const modules = [
                      { name: "Aircraft Systems", position: [-1, 1, 0], progress: 65 },
                      { name: "Weather & Planning", position: [1, 1, 0], progress: 82 },
                      { name: "Navigation", position: [0, 0, 1], progress: 75 },
                      { name: "Flight Maneuvers", position: [-1, -1, 0], progress: 90 },
                      { name: "Emergency Procedures", position: [1, -1, 0], progress: 40 },
                      { name: "Communications", position: [0, 0, -1], progress: 85 },
                      { name: "Human Factors", position: [0, 0, 0], progress: 60 }
                    ];
                    
                    // Apply the selected trainee's progress to modify these values
                    const traineeProgress = trainees.find(t => t.id === selectedTrainee)?.progress || 0;
                    const factor = traineeProgress / 75; // Scale based on a 75% "average" student
                    
                    return (
                      <>
                        {modules.map((module, idx) => {
                          // Adjust the progress based on the selected trainee
                          const adjustedProgress = Math.max(10, Math.min(100, module.progress * factor));
                          const size = 0.1 + (adjustedProgress / 100 * 0.2);
                          const color = getRiskColor(100 - adjustedProgress);
                          
                          return (
                            <group key={idx} position={module.position}>
                              <mesh>
                                <sphereGeometry args={[size, 16, 16]} />
                                <meshBasicMaterial 
                                  color={color}
                                  transparent
                                  opacity={0.8}
                                />
                              </mesh>
                              <Html position={[0, size * 1.5, 0]} center>
                                <div className="bg-background/80 backdrop-blur-sm p-1 rounded-md text-center whitespace-nowrap">
                                  <div className="text-xs font-medium">{module.name}</div>
                                  <div className="text-xs text-muted-foreground">{Math.round(adjustedProgress)}%</div>
                                </div>
                              </Html>
                            </group>
                          );
                        })}
                        
                        {/* Connecting lines between modules */}
                        <group>
                          <NodeConnection 
                            start={[-1, 1, 0]}
                            end={[0, 0, 0]}
                            color="#6b7280"
                            thickness={0.03}
                          />
                          <NodeConnection 
                            start={[1, 1, 0]}
                            end={[0, 0, 0]}
                            color="#6b7280"
                            thickness={0.03}
                          />
                          <NodeConnection 
                            start={[0, 0, 1]}
                            end={[0, 0, 0]}
                            color="#6b7280"
                            thickness={0.03}
                          />
                          <NodeConnection 
                            start={[-1, -1, 0]}
                            end={[0, 0, 0]}
                            color="#6b7280"
                            thickness={0.03}
                          />
                          <NodeConnection 
                            start={[1, -1, 0]}
                            end={[0, 0, 0]}
                            color="#6b7280"
                            thickness={0.03}
                          />
                          <NodeConnection 
                            start={[0, 0, -1]}
                            end={[0, 0, 0]}
                            color="#6b7280"
                            thickness={0.03}
                          />
                        </group>
                      </>
                    );
                  })()}
                </Canvas>
              </div>
            </div>
            
            <div className="mt-3 text-xs text-muted-foreground">
              <FileText className="inline h-3 w-3 mr-1" /> 
              Syllabus coverage visualization shows progress across training modules. 
              Larger spheres indicate higher completion rates.
            </div>
          </TabsContent>
          
          <TabsContent value="evaluations" className="m-0">
            <div className="mb-3 grid grid-cols-4 gap-3">
              <div className="p-2 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground mb-1">Pending Evaluations</div>
                <div className="text-xl font-bold text-warning">8</div>
              </div>
              <div className="p-2 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground mb-1">Completed</div>
                <div className="text-xl font-bold text-success">12</div>
              </div>
              <div className="p-2 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground mb-1">Trainees at Risk</div>
                <div className="text-xl font-bold text-destructive">3</div>
              </div>
              <div className="p-2 rounded-lg border bg-card">
                <div className="text-xs text-muted-foreground mb-1">Avg. Score</div>
                <div className="text-xl font-bold">78%</div>
              </div>
            </div>
            
            <div className="relative h-[450px] w-full rounded-lg border overflow-hidden">
              <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <OrbitControls 
                  autoRotate={isRotating}
                  autoRotateSpeed={0.5}
                  enableZoom={true}
                  enablePan={true}
                />
                
                {/* 3D Visualization of evaluation status across trainees */}
                {(() => {
                  // Generate evaluation data
                  const evaluationData = trainees.map((trainee, idx) => {
                    const x = Math.cos(idx * Math.PI * 0.4) * 2;
                    const z = Math.sin(idx * Math.PI * 0.4) * 2;
                    
                    return {
                      ...trainee,
                      position: [x, 0, z] as [number, number, number],
                      evaluations: [
                        { name: "Written Exam", score: Math.random() * 40 + 60, position: [x, 0.8, z] },
                        { name: "Practical Test", score: Math.random() * 40 + 60, position: [x, -0.8, z] },
                        { name: "Simulator Check", score: Math.random() * 40 + 60, position: [x + 0.6, 0, z + 0.3] },
                        { name: "Flight Check", score: Math.random() * 40 + 60, position: [x - 0.6, 0, z - 0.3] }
                      ]
                    };
                  });
                  
                  return (
                    <>
                      {evaluationData.map((data, idx) => (
                        <React.Fragment key={idx}>
                          {/* Trainee node */}
                          <group position={data.position}>
                            <mesh>
                              <sphereGeometry args={[0.3, 16, 16]} />
                              <meshBasicMaterial 
                                color={getRiskColor(Math.max(0, 100 - data.progress))}
                                transparent
                                opacity={0.8}
                              />
                            </mesh>
                            <Html position={[0, 0.5, 0]} center>
                              <div className="bg-background/80 backdrop-blur-sm p-1 rounded-md text-center whitespace-nowrap">
                                <div className="text-xs font-medium">{data.name}</div>
                              </div>
                            </Html>
                          </group>
                          
                          {/* Evaluation nodes */}
                          {data.evaluations.map((eval, evalIdx) => (
                            <React.Fragment key={`${idx}-${evalIdx}`}>
                              <group position={eval.position}>
                                <mesh>
                                  <sphereGeometry args={[0.15, 16, 16]} />
                                  <meshBasicMaterial 
                                    color={getRiskColor(Math.max(0, 100 - eval.score))}
                                    transparent
                                    opacity={0.8}
                                  />
                                </mesh>
                                <Html position={[0, 0.3, 0]} center>
                                  <div className="bg-background/80 backdrop-blur-sm p-0.5 rounded-md text-center">
                                    <div className="text-[10px]">{eval.name}</div>
                                    <div className="text-[10px] text-muted-foreground">{Math.round(eval.score)}%</div>
                                  </div>
                                </Html>
                              </group>
                              
                              {/* Connecting line */}
                              <NodeConnection 
                                start={data.position}
                                end={eval.position}
                                color="#6b7280"
                                thickness={0.03}
                              />
                            </React.Fragment>
                          ))}
                        </React.Fragment>
                      ))}
                    </>
                  );
                })()}
              </Canvas>
              
              <div className="absolute left-4 bottom-4 bg-background/80 backdrop-blur-sm p-2 rounded-md border">
                <div className="text-xs font-medium mb-1">Evaluation Controls</div>
                <div className="flex space-x-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 text-xs px-2"
                    onClick={toggleRotation}
                  >
                    {isRotating ? "Pause Rotation" : "Resume Rotation"}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 text-xs px-2"
                  >
                    <CheckSquare className="h-3.5 w-3.5 mr-1" /> Grade New Evaluation
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="mt-3 text-xs text-muted-foreground">
              <Users className="inline h-3 w-3 mr-1" /> 
              3D visualization of trainee evaluations. Larger nodes represent trainees, 
              with smaller connected nodes showing evaluation scores.
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default InstructorRiskMatrix;