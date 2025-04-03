import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { PerformanceMetric } from '@shared/schema';
import { Loader2 } from 'lucide-react';

interface PerformanceData {
  date: string;
  reactionTime?: number;
  cognitiveWorkload?: number;
  proceduralCompliance?: number;
  [key: string]: string | number | undefined;
}

function processMetricsData(metrics: PerformanceMetric[]): PerformanceData[] {
  // Group data by day
  const dataByDay = metrics.reduce((acc, metric) => {
    const date = new Date(metric.timestamp).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = {
        date,
        metrics: {}
      };
    }
    
    if (!acc[date].metrics[metric.metricType]) {
      acc[date].metrics[metric.metricType] = [];
    }
    
    acc[date].metrics[metric.metricType].push(metric.value);
    return acc;
  }, {} as Record<string, { date: string; metrics: Record<string, number[]> }>);
  
  // Calculate average for each metric type by day
  return Object.values(dataByDay).map(day => {
    const result: PerformanceData = { date: day.date };
    
    Object.entries(day.metrics).forEach(([metricType, values]) => {
      const average = values.reduce((sum, val) => sum + val, 0) / values.length;
      result[metricType] = parseFloat(average.toFixed(2));
    });
    
    return result;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export default function PerformanceMetricsChart() {
  const { user } = useAuth();
  const [selectedTrainee, setSelectedTrainee] = useState<number | null>(null);
  const [chartData, setChartData] = useState<PerformanceData[]>([]);
  
  const { data: trainees, isLoading: isLoadingTrainees } = useQuery({
    queryKey: ['/api/users/trainees'],
    enabled: user?.role === 'instructor' || user?.role === 'admin',
  });
  
  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['/api/analytics/performance/trainee', selectedTrainee],
    enabled: !!selectedTrainee,
  });
  
  useEffect(() => {
    if (!selectedTrainee && user && user.role === 'trainee') {
      setSelectedTrainee(user.id);
    } else if (!selectedTrainee && trainees && trainees.length > 0) {
      setSelectedTrainee(trainees[0].id);
    }
  }, [user, trainees, selectedTrainee]);
  
  useEffect(() => {
    if (metrics) {
      setChartData(processMetricsData(metrics));
    }
  }, [metrics]);
  
  const isLoading = isLoadingTrainees || isLoadingMetrics || !chartData.length;
  
  const getMetricColor = (metric: string) => {
    switch (metric) {
      case 'reactionTime': return '#8884d8';
      case 'cognitiveWorkload': return '#82ca9d';
      case 'proceduralCompliance': return '#ffc658';
      default: return '#ff8042';
    }
  };
  
  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Performance Metrics</CardTitle>
        {user && (user.role === 'instructor' || user.role === 'admin') && (
          <Select
            value={selectedTrainee?.toString()}
            onValueChange={(value) => setSelectedTrainee(parseInt(value))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select trainee" />
            </SelectTrigger>
            <SelectContent>
              {trainees?.map((trainee) => (
                <SelectItem key={trainee.id} value={trainee.id.toString()}>
                  {trainee.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardHeader>
      <CardContent className="h-[300px]">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {Object.keys(chartData[0])
                .filter(key => key !== 'date')
                .map(metric => (
                  <Line 
                    key={metric}
                    type="monotone"
                    dataKey={metric}
                    name={metric.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    stroke={getMetricColor(metric)}
                    activeDot={{ r: 8 }}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}