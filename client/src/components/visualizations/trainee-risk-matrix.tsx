import React, { useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { 
  OrbitControls, 
  Text, 
  Box, 
  Stars, 
  Html,
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
import { 
  AlertCircle,
  BarChart4,
  PieChart,
  Lightbulb,
  Clock,
  Dices
} from "lucide-react";

// Progress node in the 3D visualization
const ProgressNode = ({ 
  position,
  progress, 
  label, 
  color
}: { 
  position: [number, number, number]; 
  progress: number; 
  label: string;
  color: string;
}) => {
  const baseSize = 0.3;
  const scaleFactor = 0.5 + progress / 100 * 0.5; // Scale from 0.5 to 1.0 based on progress
  const nodeRef = React.useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (nodeRef.current) {
      // Gentle pulsing animation based on progress
      const pulse = 0.95 + Math.sin(state.clock.elapsedTime * 2) * 0.05 * (progress / 100);
      nodeRef.current.scale.set(
        scaleFactor * pulse, 
        scaleFactor * pulse, 
        scaleFactor * pulse
      );
    }
  });
  
  return (
    <group position={[position[0], position[1], position[2]]}>
      <mesh ref={nodeRef}>
        <sphereGeometry args={[baseSize, 16, 16]} />
        <meshBasicMaterial 
          color={color}
          transparent
          opacity={0.8}
        />
      </mesh>
      <Html position-y={baseSize * 1.5} center>
        <div className="bg-background/80 backdrop-blur-sm p-1.5 rounded-md text-center whitespace-nowrap">
          <div className="text-xs font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{progress}%</div>
        </div>
      </Html>
    </group>
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

interface TraineeRiskMatrixProps {
  data?: TraineeRiskData;
  className?: string;
}

interface TraineeRiskData {
  performance: {
    label: string;
    value: number;
    color: string;
    position: [number, number, number];
  }[];
  sessions: {
    label: string;
    value: number;
    color: string;
    position: [number, number, number];
  }[];
  competencies: {
    label: string;
    value: number;
    color: string;
    position: [number, number, number];
  }[];
  connections: {
    from: [number, number, number];
    to: [number, number, number];
    color?: string;
  }[];
}

// Default trainee risk data for demonstration
const defaultTraineeData: TraineeRiskData = {
  performance: [
    { label: "Flight Skills", value: 78, color: "#3b82f6", position: [2, 1.5, 0] },
    { label: "Technical Knowledge", value: 65, color: "#8b5cf6", position: [-1, 2, 1] },
    { label: "Decision Making", value: 82, color: "#10b981", position: [0, -2, 1.5] },
    { label: "Emergency Procedures", value: 58, color: "#f59e0b", position: [1.5, 0, -2] },
    { label: "Communications", value: 90, color: "#6366f1", position: [-2, -1, -1.5] },
  ],
  sessions: [
    { label: "Ground School", value: 95, color: "#10b981", position: [2.5, -1, 1] },
    { label: "Simulator", value: 60, color: "#f59e0b", position: [-2, 0, 2] },
    { label: "Flight Hours", value: 42, color: "#ef4444", position: [0, 1, -2.5] },
  ],
  competencies: [
    { label: "Navigation", value: 70, color: "#0ea5e9", position: [-1.5, -1.5, 0] },
    { label: "Aircraft Handling", value: 85, color: "#10b981", position: [1, -0.5, 2] },
    { label: "Situational Awareness", value: 63, color: "#f59e0b", position: [0, 2.5, 0] },
    { label: "CRM", value: 76, color: "#8b5cf6", position: [-1, 0.5, -2] },
  ],
  connections: [
    { from: [2, 1.5, 0], to: [1, -0.5, 2], color: "#3b82f6" }, // Flight Skills to Aircraft Handling
    { from: [-1, 2, 1], to: [0, 2.5, 0], color: "#8b5cf6" }, // Technical Knowledge to Situational Awareness
    { from: [0, -2, 1.5], to: [-1.5, -1.5, 0], color: "#10b981" }, // Decision Making to Navigation
    { from: [1.5, 0, -2], to: [-1, 0.5, -2], color: "#f59e0b" }, // Emergency Procedures to CRM
    { from: [-2, -1, -1.5], to: [-1, 0.5, -2], color: "#6366f1" }, // Communications to CRM
    { from: [2.5, -1, 1], to: [1, -0.5, 2], color: "#10b981" }, // Ground School to Aircraft Handling
    { from: [-2, 0, 2], to: [0, 2.5, 0], color: "#f59e0b" }, // Simulator to Situational Awareness
    { from: [0, 1, -2.5], to: [-1, 0.5, -2], color: "#ef4444" }, // Flight Hours to CRM
  ]
};

const TraineeRiskMatrix: React.FC<TraineeRiskMatrixProps> = ({
  data = defaultTraineeData,
  className = "",
}) => {
  const { toast } = useToast();
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [showPerformance, setShowPerformance] = useState<boolean>(true);
  const [showSessions, setShowSessions] = useState<boolean>(true);
  const [showCompetencies, setShowCompetencies] = useState<boolean>(true);
  
  // Calculate overall statistics
  const calculateOverallProgress = () => {
    const performanceAvg = data.performance.reduce((acc, item) => acc + item.value, 0) / data.performance.length;
    const sessionsAvg = data.sessions.reduce((acc, item) => acc + item.value, 0) / data.sessions.length;
    const competenciesAvg = data.competencies.reduce((acc, item) => acc + item.value, 0) / data.competencies.length;
    
    return {
      overall: Math.round((performanceAvg + sessionsAvg + competenciesAvg) / 3),
      performance: Math.round(performanceAvg),
      sessions: Math.round(sessionsAvg),
      competencies: Math.round(competenciesAvg)
    };
  };
  
  const progress = calculateOverallProgress();
  
  const toggleRotation = () => {
    setIsRotating(!isRotating);
  };
  
  const getProgressColor = (value: number) => {
    if (value >= 85) return "bg-success";
    if (value >= 70) return "bg-info";
    if (value >= 50) return "bg-warning";
    return "bg-destructive";
  };
  
  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div>Progress & Risk Visualization</div>
          <div className="flex space-x-1">
            <Button 
              size="sm" 
              variant="outline" 
              className={`px-2.5 ${showPerformance ? "bg-primary/10" : ""}`}
              onClick={() => setShowPerformance(!showPerformance)}
            >
              <BarChart4 className="h-4 w-4 mr-1" /> 
              <span className="text-xs">Performance</span>
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className={`px-2.5 ${showSessions ? "bg-primary/10" : ""}`}
              onClick={() => setShowSessions(!showSessions)}
            >
              <Clock className="h-4 w-4 mr-1" /> 
              <span className="text-xs">Sessions</span>
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className={`px-2.5 ${showCompetencies ? "bg-primary/10" : ""}`}
              onClick={() => setShowCompetencies(!showCompetencies)}
            >
              <Dices className="h-4 w-4 mr-1" /> 
              <span className="text-xs">Competencies</span>
            </Button>
          </div>
        </CardTitle>
        <CardDescription>
          Interactive visualization of your training progress and risk factors in 3D
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-3 grid grid-cols-4 gap-4">
          <div className="p-3 rounded-lg border bg-card">
            <div className="text-xs text-muted-foreground mb-1">Overall Progress</div>
            <div className="text-2xl font-bold">{progress.overall}%</div>
            <Progress value={progress.overall} className={`h-2 mt-2 ${getProgressColor(progress.overall)}`} />
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="text-xs text-muted-foreground mb-1">Performance</div>
            <div className="text-2xl font-bold">{progress.performance}%</div>
            <Progress value={progress.performance} className={`h-2 mt-2 ${getProgressColor(progress.performance)}`} />
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="text-xs text-muted-foreground mb-1">Sessions</div>
            <div className="text-2xl font-bold">{progress.sessions}%</div>
            <Progress value={progress.sessions} className={`h-2 mt-2 ${getProgressColor(progress.sessions)}`} />
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="text-xs text-muted-foreground mb-1">Competencies</div>
            <div className="text-2xl font-bold">{progress.competencies}%</div>
            <Progress value={progress.competencies} className={`h-2 mt-2 ${getProgressColor(progress.competencies)}`} />
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
              minDistance={5}
              maxDistance={20}
            />
            
            {/* Background stars for depth */}
            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade />
            
            {/* Grid for reference */}
            <gridHelper args={[20, 20, "#333333", "#222222"]} />
            
            {/* Connections between nodes */}
            {data.connections.map((connection, idx) => (
              <NodeConnection 
                key={`connection-${idx}`}
                start={connection.from}
                end={connection.to}
                color={connection.color || "#555555"}
              />
            ))}
            
            {/* Performance nodes */}
            {showPerformance && data.performance.map((item, idx) => (
              <ProgressNode 
                key={`performance-${idx}`}
                position={item.position}
                progress={item.value}
                label={item.label}
                color={item.color}
              />
            ))}
            
            {/* Session nodes */}
            {showSessions && data.sessions.map((item, idx) => (
              <ProgressNode 
                key={`session-${idx}`}
                position={item.position}
                progress={item.value}
                label={item.label}
                color={item.color}
              />
            ))}
            
            {/* Competency nodes */}
            {showCompetencies && data.competencies.map((item, idx) => (
              <ProgressNode 
                key={`competency-${idx}`}
                position={item.position}
                progress={item.value}
                label={item.label}
                color={item.color}
              />
            ))}
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
                  toast({
                    title: "Training Recommendation",
                    description: "Focus on Emergency Procedures and Simulator sessions to improve your overall readiness.",
                    variant: "default"
                  });
                }}
              >
                <Lightbulb className="h-3.5 w-3.5 mr-1" /> Get Recommendations
              </Button>
            </div>
          </div>
        </div>
        
        <div className="mt-3 text-xs text-muted-foreground">
          <AlertCircle className="inline h-3 w-3 mr-1" /> 
          Low progress areas represent potential risk factors in your training. Focus on improving these areas to reduce overall risk.
        </div>
      </CardContent>
    </Card>
  );
};

export default TraineeRiskMatrix;