import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Check, 
  AlertTriangle, 
  Skull, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  RotateCw
} from 'lucide-react';

// Example risk category colors
const RISK_COLORS = {
  'Low': '#10b981', // Green
  'Medium': '#f59e0b', // Amber
  'High': '#ef4444', // Red
  'Critical': '#7f1d1d', // Dark red
};

interface RiskPoint {
  id: string;
  x: number; // Probability (0-10)
  y: number; // Severity (0-10)
  z: number; // Risk value (auto-calculated)
  category: string;
  label: string;
  description?: string;
}

interface TraineeRiskMatrixProps {
  traineeId?: string;
  title?: string;
  description?: string;
  initialData?: RiskPoint[];
  isInteractive?: boolean;
  height?: number;
}

/**
 * TraineeRiskMatrix - A 3D visualization component for risk assessment
 * 
 * This is a simplified implementation using CSS 3D transforms instead of a full WebGL library
 * For production use, this would be better implemented with Three.js or React Three Fiber
 */
export default function TraineeRiskMatrix({
  traineeId,
  title = 'Risk Assessment Matrix',
  description = 'Visualize risk assessment using a 3D matrix to evaluate probability and severity.',
  initialData,
  isInteractive = true,
  height = 400
}: TraineeRiskMatrixProps) {
  // State for risk data points
  const [riskPoints, setRiskPoints] = useState<RiskPoint[]>(initialData || []);
  const [loading, setLoading] = useState(!initialData);
  const [selectedPoint, setSelectedPoint] = useState<RiskPoint | null>(null);
  
  // 3D rotation and view state
  const [rotation, setRotation] = useState({ x: 35, y: 45, z: 0 });
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  
  // Fetch risk data if not provided
  useEffect(() => {
    if (!initialData && traineeId) {
      setLoading(true);
      
      // Simulate API call for sample data
      setTimeout(() => {
        const sampleData: RiskPoint[] = [
          {
            id: '1',
            x: 8,
            y: 2,
            z: 16,
            category: 'Low',
            label: 'Crosswind Landing',
            description: 'Trainee shows difficulty adapting to crosswind landing techniques.'
          },
          {
            id: '2',
            x: 5,
            y: 6,
            z: 30,
            category: 'Medium',
            label: 'Night Navigation',
            description: 'Challenges with maintaining spatial awareness during night flights.'
          },
          {
            id: '3',
            x: 3,
            y: 9, 
            z: 27, 
            category: 'High',
            label: 'Emergency Procedures',
            description: 'Poor recall of critical emergency checklists during simulated engine failure.'
          },
          {
            id: '4',
            x: 7,
            y: 7,
            z: 49,
            category: 'Critical',
            label: 'Decision Making',
            description: 'Demonstrated consistently poor judgment in complex meteorological conditions.'
          }
        ];
        
        setRiskPoints(sampleData);
        setLoading(false);
      }, 1000);
    }
  }, [initialData, traineeId]);
  
  // Reset view to default position
  const resetView = () => {
    setRotation({ x: 35, y: 45, z: 0 });
    setZoom(1);
  };
  
  // Zoom in/out functions
  const zoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  
  // Handle mouse events for 3D rotation
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isInteractive) {
      isDragging.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, [isInteractive]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging.current && isInteractive) {
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      
      setRotation(prev => ({
        x: prev.x - deltaY * 0.5,
        y: prev.y + deltaX * 0.5,
        z: prev.z
      }));
      
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, [isInteractive]);
  
  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);
  
  // Add event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      const handleMouseLeave = () => {
        isDragging.current = false;
      };
      
      window.addEventListener('mouseup', handleMouseUp);
      container.addEventListener('mouseleave', handleMouseLeave);
      
      return () => {
        window.removeEventListener('mouseup', handleMouseUp);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [handleMouseUp]);
  
  // Classification function for risk level
  const classifyRisk = (point: RiskPoint): string => {
    const riskValue = point.x * point.y; // Simple calculation
    
    if (riskValue < 20) return 'Low';
    if (riskValue < 35) return 'Medium';
    if (riskValue < 45) return 'High';
    return 'Critical';
  };
  
  // Color mapper function
  const getRiskColor = (category: string): string => {
    return RISK_COLORS[category as keyof typeof RISK_COLORS] || '#6b7280';
  };
  
  // Risk icon mapper
  const getRiskIcon = (category: string) => {
    switch(category) {
      case 'Low':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'Medium':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'High':
      case 'Critical':
        return <Skull className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
            <div className="animate-spin h-10 w-10 border-4 border-t-primary rounded-full" />
          </div>
        ) : (
          <div className="space-y-4">
            <div 
              ref={containerRef}
              className="w-full rounded-md bg-gray-50 dark:bg-gray-800 overflow-hidden"
              style={{ 
                height: `${height}px`,
                perspective: '1000px',
                cursor: isInteractive ? 'grab' : 'default'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
            >
              {/* 3D space container */}
              <div
                className="relative w-full h-full transition-transform"
                style={{
                  transformStyle: 'preserve-3d',
                  transformOrigin: 'center center',
                  transform: `scale3d(${zoom}, ${zoom}, ${zoom}) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) rotateZ(${rotation.z}deg)`
                }}
              >
                {/* Background grid */}
                <div className="absolute inset-0 grid grid-cols-11 grid-rows-11">
                  {/* Grid lines */}
                  {Array.from({ length: 11 }).map((_, i) => (
                    <React.Fragment key={`gridline-${i}`}>
                      {/* Horizontal lines */}
                      <div 
                        className="absolute w-full h-px bg-gray-200 dark:bg-gray-700"
                        style={{ 
                          top: `${(i * 10)}%`,
                          transform: 'translateZ(0)'
                        }}
                      />
                      {/* Vertical lines */}
                      <div 
                        className="absolute h-full w-px bg-gray-200 dark:bg-gray-700"
                        style={{ 
                          left: `${(i * 10)}%`,
                          transform: 'translateZ(0)'
                        }}
                      />
                    </React.Fragment>
                  ))}
                </div>
                
                {/* Axis labels */}
                <div 
                  className="absolute left-2 bottom-2 text-gray-500 dark:text-gray-400 text-sm font-medium"
                  style={{ transform: 'translateZ(10px)' }}
                >
                  Probability
                </div>
                
                <div 
                  className="absolute right-2 bottom-2 text-gray-500 dark:text-gray-400 text-sm font-medium"
                  style={{ transform: 'translateZ(10px)' }}
                >
                  Severity
                </div>
                
                {/* Risk points */}
                {riskPoints.map((point) => {
                  const category = point.category || classifyRisk(point);
                  const color = getRiskColor(category);
                  return (
                    <div
                      key={point.id}
                      className="absolute cursor-pointer transition-transform duration-200 hover:scale-110"
                      style={{
                        left: `${point.x * 10}%`,
                        bottom: `${point.z / 5}%`, 
                        transform: `translate(-50%, 50%) translateZ(${point.y * 5}px)`,
                        transformStyle: 'preserve-3d'
                      }}
                      onClick={() => setSelectedPoint(point)}
                    >
                      {/* Data point sphere */}
                      <div
                        className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-800 shadow-md flex items-center justify-center text-white"
                        style={{ backgroundColor: color }}
                      >
                        {getRiskIcon(category)}
                      </div>
                      
                      {/* Connecting line to base */}
                      <div 
                        className="absolute bottom-1/2 left-1/2 w-0.5 bg-gray-300 dark:bg-gray-600 origin-bottom"
                        style={{ 
                          height: `${point.y * 5}px`,
                          transform: 'translateX(-50%) rotateX(90deg)',
                          opacity: 0.5
                        }}
                      />
                      
                      {/* Label (visible on hover) */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 whitespace-nowrap bg-white dark:bg-gray-700 px-2 py-0.5 rounded text-xs font-medium shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                        {point.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Controls */}
            {isInteractive && (
              <div className="flex flex-wrap gap-2 justify-center">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={resetView}
                >
                  <RotateCcw className="h-4 w-4 mr-1" /> Reset
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={zoomIn}
                >
                  <ZoomIn className="h-4 w-4 mr-1" /> Zoom In
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={zoomOut}
                >
                  <ZoomOut className="h-4 w-4 mr-1" /> Zoom Out
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setRotation(prev => ({ ...prev, y: prev.y + 45 }))}
                >
                  <RotateCw className="h-4 w-4 mr-1" /> Rotate
                </Button>
                
                <Select 
                  value={selectedPoint?.id || ''} 
                  onValueChange={(value) => {
                    const point = riskPoints.find(p => p.id === value);
                    setSelectedPoint(point || null);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[200px]" >
                    <SelectValue placeholder="Select risk point" />
                  </SelectTrigger>
                  <SelectContent>
                    {riskPoints.map(point => (
                      <SelectItem key={point.id} value={point.id}>
                        {point.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Selected point details */}
            {selectedPoint && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                <div className="flex gap-2 items-center">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: getRiskColor(selectedPoint.category || classifyRisk(selectedPoint)) }}
                  />
                  <h4 className="font-medium">{selectedPoint.label}</h4>
                  <div className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 ml-auto">
                    {selectedPoint.category || classifyRisk(selectedPoint)}
                  </div>
                </div>
                
                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">Probability:</span>
                    <div className="font-medium">{selectedPoint.x}/10</div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">Severity:</span>
                    <div className="font-medium">{selectedPoint.y}/10</div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">Risk Value:</span>
                    <div className="font-medium">{selectedPoint.x * selectedPoint.y}</div>
                  </div>
                </div>
                
                {selectedPoint.description && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    {selectedPoint.description}
                  </p>
                )}
              </div>
            )}
            
            {/* Legend */}
            <div className="mt-2 flex flex-wrap justify-center gap-4">
              {Object.entries(RISK_COLORS).map(([category, color]) => (
                <div key={category} className="flex items-center gap-1.5">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    {category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}