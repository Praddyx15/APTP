import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Loader2 } from 'lucide-react';

interface TraineeComparisonData {
  area: string;
  [key: string]: string | number;
}

export default function TraineeComparisonChart() {
  const { user } = useAuth();
  const [selectedMetric, setSelectedMetric] = useState<string>('reactionTime');
  const [selectedTrainees, setSelectedTrainees] = useState<number[]>([]);
  const [chartData, setChartData] = useState<TraineeComparisonData[]>([]);
  
  const { data: trainees, isLoading: isLoadingTrainees } = useQuery({
    queryKey: ['/api/users/trainees'],
    enabled: user?.role === 'instructor' || user?.role === 'admin',
  });
  
  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['/api/analytics/comparison', selectedTrainees, selectedMetric],
    enabled: selectedTrainees.length > 0,
  });
  
  useEffect(() => {
    if (trainees && trainees.length > 0 && selectedTrainees.length === 0) {
      // Initially select the first two trainees if available
      setSelectedTrainees(trainees.slice(0, Math.min(2, trainees.length)).map(t => t.id));
    }
  }, [trainees, selectedTrainees]);
  
  useEffect(() => {
    if (metrics) {
      setChartData(processComparisonData(metrics, selectedTrainees));
    }
  }, [metrics, selectedTrainees]);
  
  const processComparisonData = (metricsData: any, traineeIds: number[]): TraineeComparisonData[] => {
    // If we don't have metrics yet, return empty array
    if (!metricsData || !metricsData.trainees) return [];
    
    // Get unique skill areas from the metrics
    const areas = [...new Set(metricsData.metrics.map((m: any) => m.area))];
    
    // Create a data structure for the radar chart
    return areas.map(area => {
      const areaData: TraineeComparisonData = { area: area as string };
      
      // Add a data point for each trainee
      traineeIds.forEach(traineeId => {
        const traineeData = metricsData.trainees.find((t: any) => t.id === traineeId);
        if (traineeData) {
          // Find the metric for this area
          const metric = metricsData.metrics.find((m: any) => 
            m.area === area && m.traineeId === traineeId && m.metricType === selectedMetric
          );
          
          areaData[traineeData.username] = metric ? metric.value : 0;
        }
      });
      
      return areaData;
    });
  };
  
  const isLoading = isLoadingTrainees || isLoadingMetrics || chartData.length === 0;
  
  const metricOptions = [
    { value: 'reactionTime', label: 'Reaction Time' },
    { value: 'cognitiveWorkload', label: 'Cognitive Workload' },
    { value: 'proceduralCompliance', label: 'Procedural Compliance' },
    { value: 'overallPerformance', label: 'Overall Performance' }
  ];
  
  const toggleTrainee = (traineeId: number) => {
    if (selectedTrainees.includes(traineeId)) {
      // Only remove if we have more than one trainee selected
      if (selectedTrainees.length > 1) {
        setSelectedTrainees(prev => prev.filter(id => id !== traineeId));
      }
    } else {
      // Add trainee to selection (limit to 3)
      if (selectedTrainees.length < 3) {
        setSelectedTrainees(prev => [...prev, traineeId]);
      }
    }
  };
  
  // Generate colors for each trainee
  const colors = ['#8884d8', '#82ca9d', '#ffc658'];
  
  const getTraineeName = (id: number) => {
    if (!trainees) return '';
    const trainee = trainees.find((t: any) => t.id === id);
    return trainee ? trainee.username : '';
  };
  
  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Trainee Comparison</CardTitle>
        <div className="flex space-x-2">
          <Select
            value={selectedMetric}
            onValueChange={setSelectedMetric}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              {metricOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {trainees && trainees.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {trainees.map((trainee: any, index: number) => (
              <button
                key={trainee.id}
                className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                  selectedTrainees.includes(trainee.id)
                    ? `bg-[${colors[selectedTrainees.indexOf(trainee.id) % colors.length]}] text-white`
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
                onClick={() => toggleTrainee(trainee.id)}
                style={
                  selectedTrainees.includes(trainee.id)
                    ? { backgroundColor: colors[selectedTrainees.indexOf(trainee.id) % colors.length] }
                    : {}
                }
              >
                {trainee.username}
              </button>
            ))}
          </div>
        )}
        <div className="h-[300px]">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="area" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Tooltip />
                <Legend />
                {selectedTrainees.map((traineeId, index) => (
                  <Radar
                    key={traineeId}
                    name={getTraineeName(traineeId)}
                    dataKey={getTraineeName(traineeId)}
                    stroke={colors[index % colors.length]}
                    fill={colors[index % colors.length]}
                    fillOpacity={0.2}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}