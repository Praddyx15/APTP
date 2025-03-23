// components/visualizations/SimulatorTelemetry.tsx
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import analyticsService from '../../services/analyticsService';

interface SimulatorTelemetryProps {
  sessionId: string;
  metrics?: string[];
  startTime?: string;
  endTime?: string;
  resolution?: 'high' | 'medium' | 'low';
  width?: number;
  height?: number;
}

const SimulatorTelemetry: React.FC<SimulatorTelemetryProps> = ({
  sessionId,
  metrics = ['altitude', 'speed', 'heading', 'roll', 'pitch', 'yaw'],
  startTime,
  endTime,
  resolution = 'medium',
  width = 800,
  height = 600
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const aircraftRef = useRef<THREE.Group | null>(null);
  const pathRef = useRef<THREE.Line | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    timestamp: string;
    values: Record<string, number>;
  }[]>([]);
  const [playing, setPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const animationRef = useRef<number | null>(null);
  
  // Load telemetry data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const telemetryData = await analyticsService.getSimulatorTelemetry(
          sessionId,
          metrics,
          startTime,
          endTime,
          resolution
        );
        
        setData(telemetryData);
      } catch (err) {
        console.error('Error loading telemetry data:', err);
        setError('Failed to load simulator telemetry data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [sessionId, metrics, startTime, endTime, resolution]);
  
  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 15);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // Add grid
    const gridHelper = new THREE.GridHelper(100, 100, 0x888888, 0xcccccc);
    scene.add(gridHelper);
    
    // Create aircraft model (simple shape for now)
    const aircraft = createAircraftModel();
    scene.add(aircraft);
    aircraftRef.current = aircraft;
    
    // Create flight path line
    const pathGeometry = new THREE.BufferGeometry();
    const pathMaterial = new THREE.LineBasicMaterial({ color: 0x0088ff, linewidth: 2 });
    const pathLine = new THREE.Line(pathGeometry, pathMaterial);
    scene.add(pathLine);
    pathRef.current = pathLine;
    
    // Animation loop
    const animate = () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      requestAnimationFrame(animate);
    };
    
    animate();
    
    // Cleanup
    return () => {
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height]);
  
  // Update flight path when data changes
  useEffect(() => {
    if (!data.length || !pathRef.current) return;
    
    // Extract position data for the path
    const positions: number[] = [];
    
    data.forEach((point) => {
      // Convert telemetry data to 3D coordinates
      // This mapping depends on your specific telemetry format
      const x = point.values.x || 0;
      const y = point.values.altitude || point.values.y || 0;
      const z = point.values.z || 0;
      
      positions.push(x, y, z);
    });
    
    // Update path geometry
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    pathRef.current.geometry.dispose();
    pathRef.current.geometry = geometry;
  }, [data]);
  
  // Playback animation
  useEffect(() => {
    if (!playing || !data.length || !aircraftRef.current) return;
    
    const updateAircraftPosition = () => {
      if (currentIndex >= data.length) {
        setPlaying(false);
        setCurrentIndex(0);
        return;
      }
      
      const telemetry = data[currentIndex];
      
      // Update aircraft position and rotation
      if (aircraftRef.current) {
        // Convert telemetry to position and rotation
        // This mapping depends on your specific telemetry format
        const x = telemetry.values.x || 0;
        const y = telemetry.values.altitude || telemetry.values.y || 0;
        const z = telemetry.values.z || 0;
        
        const roll = (telemetry.values.roll || 0) * (Math.PI / 180);
        const pitch = (telemetry.values.pitch || 0) * (Math.PI / 180);
        const yaw = (telemetry.values.heading || telemetry.values.yaw || 0) * (Math.PI / 180);
        
        // Set position
        aircraftRef.current.position.set(x, y, z);
        
        // Set rotation (order matters)
        aircraftRef.current.rotation.set(0, 0, 0); // Reset
        aircraftRef.current.rotateZ(roll);
        aircraftRef.current.rotateX(pitch);
        aircraftRef.current.rotateY(yaw);
      }
      
      // Move to next telemetry point
      setCurrentIndex(prevIndex => prevIndex + 1);
      
      // Schedule next frame
      animationRef.current = requestAnimationFrame(updateAircraftPosition);
    };
    
    animationRef.current = requestAnimationFrame(updateAircraftPosition);
    
    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [playing, currentIndex, data]);
  
  // Handle play/pause
  const togglePlayback = () => {
    setPlaying(!playing);
  };
  
  // Handle reset
  const resetPlayback = () => {
    setPlaying(false);
    setCurrentIndex(0);
    
    // Reset aircraft position
    if (aircraftRef.current && data.length > 0) {
      aircraftRef.current.position.set(0, 0, 0);
      aircraftRef.current.rotation.set(0, 0, 0);
    }
  };
  
  // Create a simple aircraft model
  const createAircraftModel = () => {
    const aircraft = new THREE.Group();
    
    // Fuselage
    const fuselageGeometry = new THREE.CylinderGeometry(0.5, 0.5, 4, 8);
    const fuselageMaterial = new THREE.MeshPhongMaterial({ color: 0x909090 });
    const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
    fuselage.rotation.x = Math.PI / 2;
    aircraft.add(fuselage);
    
    // Wings
    const wingGeometry = new THREE.BoxGeometry(7, 0.1, 1);
    const wingMaterial = new THREE.MeshPhongMaterial({ color: 0x505050 });
    const wing = new THREE.Mesh(wingGeometry, wingMaterial);
    wing.position.y = 0;
    aircraft.add(wing);
    
    // Tail
    const tailGeometry = new THREE.BoxGeometry(2, 0.1, 0.8);
    const tailMaterial = new THREE.MeshPhongMaterial({ color: 0x505050 });
    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
    tail.position.z = -2;
    tail.position.y = 0.4;
    aircraft.add(tail);
    
    // Vertical stabilizer
    const vstabGeometry = new THREE.BoxGeometry(0.1, 1, 1);
    const vstabMaterial = new THREE.MeshPhongMaterial({ color: 0x505050 });
    const vstab = new THREE.Mesh(vstabGeometry, vstabMaterial);
    vstab.position.z = -2;
    vstab.position.y = 0.8;
    aircraft.add(vstab);
    
    return aircraft;
  };
  
  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-md">
        <h3 className="text-lg font-medium mb-2">Error</h3>
        <p>{error}</p>
      </div>
    );
  }
  
  // Show no data state
  if (data.length === 0) {
    return (
      <div className="p-6 bg-gray-50 text-gray-700 rounded-md">
        <h3 className="text-lg font-medium mb-2">No Data Available</h3>
        <p>No telemetry data available for this session.</p>
      </div>
    );
  }
  
  // Calculate current telemetry values for display
  const currentTelemetry = data[currentIndex] || data[0];
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Flight Telemetry Visualization</h2>
        <p className="text-sm text-gray-500">Session ID: {sessionId}</p>
      </div>
      
      {/* 3D Visualization */}
      <div className="relative" style={{ width, height }}>
        <div ref={containerRef} className="w-full h-full"></div>
        
        {/* Telemetry info overlay */}
        <div className="absolute top-4 left-4 bg-white bg-opacity-75 rounded-md p-3 shadow-md text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="font-medium">Altitude:</div>
            <div>{(currentTelemetry.values.altitude || 0).toFixed(0)} ft</div>
            
            <div className="font-medium">Speed:</div>
            <div>{(currentTelemetry.values.speed || 0).toFixed(0)} kts</div>
            
            <div className="font-medium">Heading:</div>
            <div>{(currentTelemetry.values.heading || 0).toFixed(0)}°</div>
            
            <div className="font-medium">Roll:</div>
            <div>{(currentTelemetry.values.roll || 0).toFixed(1)}°</div>
            
            <div className="font-medium">Pitch:</div>
            <div>{(currentTelemetry.values.pitch || 0).toFixed(1)}°</div>
            
            <div className="font-medium">Time:</div>
            <div>{new Date(currentTelemetry.timestamp).toLocaleTimeString()}</div>
          </div>
        </div>
      </div>
      
      {/* Controls */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={togglePlayback}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={resetPlayback}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Reset
          </button>
        </div>
        
        {/* Playback progress */}
        <div className="flex-1 mx-4">
          <input
            type="range"
            min={0}
            max={data.length - 1}
            value={currentIndex}
            onChange={(e) => {
              setCurrentIndex(parseInt(e.target.value));
              if (playing) setPlaying(false);
            }}
            className="w-full"
          />
        </div>
        
        <div className="text-sm text-gray-600">
          {currentIndex + 1} / {data.length}
        </div>
      </div>
    </div>
  );
};

export default SimulatorTelemetry;
