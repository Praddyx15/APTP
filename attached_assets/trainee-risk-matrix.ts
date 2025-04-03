import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

// Risk assessment data interface
export interface RiskPoint {
  id: string;
  label: string;
  probability: number; // 0-1
  severity: number; // 0-1
  category: string;
  details?: string;
}

export interface RiskAssessmentData {
  points: RiskPoint[];
  categories: {
    [key: string]: {
      name: string;
      color: string;
    };
  };
}

interface RiskMatrixProps {
  data: RiskAssessmentData;
  width?: number;
  height?: number;
  onPointSelect?: (point: RiskPoint | null) => void;
}

// Helper component for axes
const Axes: React.FC<{ size: number }> = ({ size }) => {
  const xAxis = useRef<THREE.LineSegments>(null);
  const yAxis = useRef<THREE.LineSegments>(null);
  const zAxis = useRef<THREE.LineSegments>(null);

  return (
    <group>
      {/* X-axis */}
      <lineSegments ref={xAxis}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array([0, 0, 0, size, 0, 0])}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="red" />
      </lineSegments>
      
      {/* Y-axis */}
      <lineSegments ref={yAxis}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array([0, 0, 0, 0, size, 0])}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="green" />
      </lineSegments>
      
      {/* Z-axis */}
      <lineSegments ref={zAxis}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array([0, 0, 0, 0, 0, size])}
            count={2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="blue" />
      </lineSegments>
      
      {/* Labels */}
      <Text position={[size + 0.1, 0, 0]} fontSize={0.2} color="red">
        Probability
      </Text>
      <Text position={[0, size + 0.1, 0]} fontSize={0.2} color="green">
        Severity
      </Text>
      <Text position={[0, 0, size + 0.1]} fontSize={0.2} color="blue">
        Risk Value
      </Text>
    </group>
  );
};

// Grid component
const Grid: React.FC<{ size: number; divisions: number }> = ({ size, divisions }) => {
  const gridHelper = new THREE.GridHelper(size, divisions);
  return (
    <primitive 
      object={gridHelper} 
      position={[size/2, 0, size/2]} 
      rotation={[Math.PI / 2, 0, 0]} 
    />
  );
};

// Risk Point component
interface RiskPointComponentProps {
  point: RiskPoint;
  color: string;
  isSelected: boolean;
  onClick: () => void;
}

const RiskPointComponent: React.FC<RiskPointComponentProps> = ({ 
  point, 
  color, 
  isSelected,
  onClick 
}) => {
  const mesh = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Calculate position and risk value
  const x = point.probability;
  const y = point.severity;
  const z = x * y; // Risk value is probability × severity
  
  // Animation
  useFrame(() => {
    if (!mesh.current) return;
    
    if (isSelected) {
      mesh.current.scale.set(1.2, 1.2, 1.2);
    } else if (hovered) {
      mesh.current.scale.set(1.1, 1.1, 1.1);
    } else {
      mesh.current.scale.set(1, 1, 1);
    }
  });
  
  return (
    <group position={[x, y, z]}>
      <mesh
        ref={mesh}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
      >
        <sphereGeometry args={[0.03, 32, 32]} />
        <meshBasicMaterial 
          color={color} 
          opacity={isSelected || hovered ? 1 : 0.75} 
          transparent 
        />
      </mesh>
      
      {/* Label only shown when hovered or selected */}
      {(hovered || isSelected) && (
        <Text
          position={[0, 0.07, 0]}
          fontSize={0.04}
          color="white"
          anchorX="center"
          anchorY="bottom"
        >
          {point.label}
        </Text>
      )}
      
      {/* Projection lines to axes */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={new Float32Array([
              x, y, z, x, 0, 0, // Point to X axis
              x, y, z, 0, y, 0, // Point to Y axis
              x, y, z, 0, 0, z  // Point to Z axis
            ])}
            count={6}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial 
          color={color} 
          opacity={isSelected || hovered ? 0.8 : 0.3} 
          transparent 
        />
      </lineSegments>
    </group>
  );
};

// Risk Area (heatmap) component
const RiskArea: React.FC = () => {
  // Create a gradient heatmap as a texture
  const textureSize = 256;
  const data = new Uint8Array(4 * textureSize * textureSize);
  
  for (let i = 0; i < textureSize; i++) {
    for (let j = 0; j < textureSize; j++) {
      const x = i / textureSize;
      const y = j / textureSize;
      const risk = x * y;
      
      // RGBA values based on risk
      const r = Math.min(255, risk * 510); // Red increases with risk
      const g = Math.max(0, 255 - risk * 510); // Green decreases with risk
      const b = 0;
      const a = 128; // 50% transparent
      
      const pos = 4 * (i + j * textureSize);
      data[pos] = r;
      data[pos + 1] = g;
      data[pos + 2] = b;
      data[pos + 3] = a;
    }
  }
  
  const texture = new THREE.DataTexture(data, textureSize, textureSize, THREE.RGBAFormat);
  texture.needsUpdate = true;
  
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.5, 0, 0.5]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent={true}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// Main Scene component
interface SceneProps {
  data: RiskAssessmentData;
  onPointSelect: (point: RiskPoint | null) => void;
  selectedPointId: string | null;
}

const Scene: React.FC<SceneProps> = ({ data, onPointSelect, selectedPointId }) => {
  const { camera } = useThree();
  
  // Set initial camera position
  useEffect(() => {
    camera.position.set(1.5, 1.5, 1.5);
    camera.lookAt(0.5, 0.5, 0.25);
  }, [camera]);
  
  // Handle background click to deselect
  const handleBackgroundClick = () => {
    onPointSelect(null);
  };
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      {/* Scene container with background click handler */}
      <mesh 
        position={[0.5, 0.5, 0.5]} 
        scale={[2, 2, 2]} 
        visible={false}
        onClick={handleBackgroundClick}
      >
        <boxGeometry />
        <meshBasicMaterial />
      </mesh>
      
      <RiskArea />
      <Axes size={1} />
      <Grid size={1} divisions={10} />
      
      {/* Map risk points */}
      {data.points.map((point) => {
        const category = data.categories[point.category] || { 
          name: point.category, 
          color: '#ffffff' 
        };
        
        return (
          <RiskPointComponent
            key={point.id}
            point={point}
            color={category.color}
            isSelected={selectedPointId === point.id}
            onClick={() => onPointSelect(point)}
          />
        );
      })}
      
      {/* Add orbit controls */}
      <OrbitControls 
        target={[0.5, 0.5, 0.25]} 
        enableDamping 
        dampingFactor={0.05}
        minDistance={0.5}
        maxDistance={4}
      />
    </>
  );
};

// Memory management helper hook
const useCleanup = () => {
  // Store disposable objects
  const disposables = useRef<Set<THREE.Object3D | THREE.Material | THREE.Texture | THREE.BufferGeometry>>(new Set());

  // Add object to be disposed later
  const registerDisposable = (obj: THREE.Object3D | THREE.Material | THREE.Texture | THREE.BufferGeometry) => {
    disposables.current.add(obj);
  };

  // Cleanup function
  const cleanup = () => {
    disposables.current.forEach(obj => {
      if ('dispose' in obj && typeof obj.dispose === 'function') {
        obj.dispose();
      }
    });
    disposables.current.clear();
  };

  // Run cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return { registerDisposable, cleanup };
};

// Main Risk Matrix component
export const TraineeRiskMatrix: React.FC<RiskMatrixProps> = ({ 
  data, 
  width = 800, 
  height = 600,
  onPointSelect 
}) => {
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<RiskPoint | null>(null);
  
  // Handler for point selection
  const handlePointSelect = (point: RiskPoint | null) => {
    setSelectedPointId(point?.id || null);
    setSelectedPoint(point);
    
    if (onPointSelect) {
      onPointSelect(point);
    }
  };
  
  // Filter and sort data for performance
  const processedData = useMemo(() => {
    // Create a copy to avoid modifying the original data
    return {
      ...data,
      points: [...data.points].sort((a, b) => {
        // Sort by risk value (probability × severity) for better rendering order
        const riskA = a.probability * a.severity;
        const riskB = b.probability * b.severity;
        return riskA - riskB;
      })
    };
  }, [data]);
  
  return (
    <div style={{ position: 'relative', width, height }}>
      <Canvas
        camera={{ position: [1.5, 1.5, 1.5], fov: 50 }}
        style={{ background: '#1a1a2e' }}
      >
        <Scene 
          data={processedData} 
          onPointSelect={handlePointSelect}
          selectedPointId={selectedPointId}
        />
      </Canvas>
      
      {/* Point details overlay */}
      {selectedPoint && (
        <div 
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: 10,
            borderRadius: 5,
            maxWidth: 300
          }}
        >
          <h3>{selectedPoint.label}</h3>
          <p>Category: {data.categories[selectedPoint.category]?.name || selectedPoint.category}</p>
          <p>Probability: {(selectedPoint.probability * 100).toFixed(1)}%</p>
          <p>Severity: {(selectedPoint.severity * 100).toFixed(1)}%</p>
          <p>Risk Value: {(selectedPoint.probability * selectedPoint.severity * 100).toFixed(1)}%</p>
          {selectedPoint.details && <p>{selectedPoint.details}</p>}
          <button 
            onClick={() => handlePointSelect(null)}
            style={{
              background: '#333',
              border: 'none',
              color: 'white',
              padding: '5px 10px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      )}
      
      {/* Legend */}
      <div 
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: 10,
          borderRadius: 5
        }}
      >
        <h4 style={{ margin: '0 0 10px 0' }}>Risk Categories</h4>
        {Object.entries(data.categories).map(([key, category]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
            <div 
              style={{ 
                width: 12, 
                height: 12, 
                backgroundColor: category.color, 
                marginRight: 8 
              }} 
            />
            <span>{category.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Example usage:
/*
import { TraineeRiskMatrix, RiskAssessmentData } from './TraineeRiskMatrix';

const riskData: RiskAssessmentData = {
  points: [
    {
      id: '1',
      label: 'Engine Failure',
      probability: 0.2,
      severity: 0.9,
      category: 'technical',
      details: 'Complete loss of engine power during flight'
    },
    {
      id: '2',
      label: 'Weather Deviation',
      probability: 0.7,
      severity: 0.4,
      category: 'environmental',
      details: 'Unexpected weather requiring course change'
    },
    // Add more points...
  ],
  categories: {
    technical: { name: 'Technical Failures', color: '#FF5252' },
    environmental: { name: 'Environmental Hazards', color: '#4CAF50' },
    operational: { name: 'Operational Errors', color: '#2196F3' },
    human: { name: 'Human Factors', color: '#FFC107' }
  }
};

function RiskMatrixPage() {
  const handlePointSelect = (point) => {
    console.log('Selected point:', point);
    // Further handling...
  };

  return (
    <div className="risk-matrix-container">
      <h1>Trainee Risk Assessment</h1>
      <TraineeRiskMatrix
        data={riskData}
        width={800}
        height={600}
        onPointSelect={handlePointSelect}
      />
    </div>
  );
}
*/
