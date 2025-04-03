import React, { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame, ThreeElements } from "@react-three/fiber";
import { 
  OrbitControls, 
  Text, 
  Box, 
  Stars, 
  Grid, 
  Html, 
  QuadraticBezierLine,
  Cylinder,
  Sphere,
  useHelper,
  Line
} from "@react-three/drei";
import { Vector3, Group, Mesh, Box3, Color, DirectionalLight, DirectionalLightHelper, Raycaster } from "three";
import { RiskMatrixData, RiskMatrixConfig, RoleType } from "@shared/risk-assessment-types";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge
} from "@/components/ui";
import { 
  AlertCircle, 
  ArrowUpDown, 
  Info, 
  RefreshCcw, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  PanelLeftClose, 
  PanelLeftOpen,
  BarChart4,
  Layers3,
  PieChart,
  Lightbulb
} from "lucide-react";

const DEFAULT_CONFIG: RiskMatrixConfig = {
  minValue: 1,
  maxValue: 125, // 5 * 5 * 5 (severity * occurrence * detection)
  colors: {
    veryLow: "#10b981", // green
    low: "#3b82f6", // blue
    medium: "#f59e0b", // amber
    high: "#ef4444", // red
    veryHigh: "#7c3aed" // purple
  },
  animate: true,
  showLabels: true,
  rotationSpeed: 0.001
};

interface DataCubeProps {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  label?: string;
  showLabels: boolean;
  value: number;
}

// Individual data cube in the 3D matrix
const DataCube: React.FC<DataCubeProps> = ({ 
  position, size, color, label, showLabels, value 
}) => {
  const cubeRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (cubeRef.current) {
      cubeRef.current.rotation.x += 0.005;
      cubeRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group position={position}>
      <Box ref={cubeRef} args={size}>
        <meshStandardMaterial 
          color={color} 
          transparent={true} 
          opacity={0.8}
          roughness={0.3}
          metalness={0.5}
        />
      </Box>
      {showLabels && label && (
        <Text
          position={[0, size[1] / 2 + 0.2, 0]}
          fontSize={0.15}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {`${label}\n(${value})`}
        </Text>
      )}
    </group>
  );
};

// Axis labels for the 3D matrix
const AxisLabels: React.FC = () => {
  return (
    <>
      {/* X-Axis - Severity */}
      <Text
        position={[2.5, -1.2, 0]}
        rotation={[0, 0, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Severity
      </Text>
      
      {/* Y-Axis - Detection */}
      <Text
        position={[-1.2, 2.5, 0]}
        rotation={[0, 0, Math.PI / 2]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Detection
      </Text>
      
      {/* Z-Axis - Occurrence */}
      <Text
        position={[0, -1.2, 2.5]}
        rotation={[Math.PI / 2, 0, 0]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        Occurrence
      </Text>
    </>
  );
};

interface RiskAssessmentMatrix3DProps {
  data: RiskMatrixData[];
  config?: Partial<RiskMatrixConfig>;
  className?: string;
  onSelectRisk?: (risk: RiskMatrixData) => void;
}

export const RiskAssessmentMatrix3D: React.FC<RiskAssessmentMatrix3DProps> = ({
  data = [],
  config = {},
  className = "",
  onSelectRisk
}) => {
  const { toast } = useToast();
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [selectedRisk, setSelectedRisk] = useState<RiskMatrixData | null>(null);
  
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Function to determine color based on risk value
  const getColorForRisk = (risk: number): string => {
    const { minValue, maxValue, colors } = mergedConfig;
    const range = maxValue - minValue;
    const percentage = (risk - minValue) / range;
    
    if (percentage < 0.2) return colors.veryLow;
    if (percentage < 0.4) return colors.low;
    if (percentage < 0.6) return colors.medium;
    if (percentage < 0.8) return colors.high;
    return colors.veryHigh;
  };
  
  const handleRiskSelect = (risk: RiskMatrixData) => {
    setSelectedRisk(risk);
    setShowDetails(true);
    if (onSelectRisk) {
      onSelectRisk(risk);
    }
  };
  
  const toggleRotation = () => {
    setIsRotating(!isRotating);
  };
  
  useEffect(() => {
    if (data.length === 0) {
      toast({
        title: "No risk data available",
        description: "Please add risk assessments to view the matrix",
        variant: "destructive"
      });
    }
  }, [data, toast]);

  return (
    <div className={`relative w-full h-[600px] ${className}`}>
      <div className="absolute top-2 right-2 z-10 flex space-x-2">
        <button 
          onClick={toggleRotation}
          className="bg-primary/10 hover:bg-primary/20 text-primary rounded-md px-3 py-1 text-sm font-medium"
        >
          {isRotating ? "Pause Rotation" : "Resume Rotation"}
        </button>
      </div>
      
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <OrbitControls 
          autoRotate={isRotating && mergedConfig.animate}
          autoRotateSpeed={1}
          enableZoom={true}
          enablePan={true}
          minDistance={3}
          maxDistance={20}
        />
        
        {/* Background stars */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
        
        {/* Axis grid */}
        <gridHelper args={[10, 10, "#444444", "#222222"]} />
        
        {/* Axis labels */}
        <AxisLabels />
        
        {/* Risk data cubes */}
        {data.map((item, index) => {
          const value = item.value || item.severity * item.occurrence * item.detection;
          const size = Math.max(0.2, Math.min(1, value / mergedConfig.maxValue * 1.5));
          
          return (
            <DataCube
              key={`risk-cube-${index}`}
              position={[
                (item.severity - 3) * 0.6, 
                (item.detection - 3) * 0.6, 
                (item.occurrence - 3) * 0.6
              ]}
              size={[size, size, size]}
              color={getColorForRisk(value)}
              label={item.title || `Risk ${index + 1}`}
              showLabels={mergedConfig.showLabels}
              value={value}
            />
          );
        })}
      </Canvas>
      
      {showDetails && selectedRisk && (
        <div className="absolute left-4 bottom-4 bg-background/90 p-4 rounded-md border border-border max-w-xs">
          <h3 className="text-lg font-bold">{selectedRisk.title || "Risk Details"}</h3>
          <p className="text-sm text-muted-foreground">Category: {selectedRisk.category || "Uncategorized"}</p>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="text-center">
              <div className="text-sm font-medium">Severity</div>
              <div className="text-lg">{selectedRisk.severity}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium">Occurrence</div>
              <div className="text-lg">{selectedRisk.occurrence}</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium">Detection</div>
              <div className="text-lg">{selectedRisk.detection}</div>
            </div>
          </div>
          <div className="mt-2">
            <div className="text-sm font-medium">Risk Value</div>
            <div className="text-lg">{selectedRisk.value || (selectedRisk.severity * selectedRisk.occurrence * selectedRisk.detection)}</div>
          </div>
          <button
            onClick={() => setShowDetails(false)}
            className="mt-3 w-full bg-primary/80 hover:bg-primary rounded-md px-3 py-1 text-primary-foreground text-sm"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default RiskAssessmentMatrix3D;