import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Loader2 } from 'lucide-react';
import { SkillDecayPrediction } from '@shared/schema';

interface CompetencyData {
  name: string;
  initialProficiency: number;
  currentPrediction: number;
  decayRate: number;
}

function processDecayData(predictions: SkillDecayPrediction[]): CompetencyData[] {
  const competencyMap = new Map<string, SkillDecayPrediction>();
  
  // Get the most recent prediction for each competency
  predictions.forEach(prediction => {
    const existingPrediction = competencyMap.get(prediction.competencyId);
    if (!existingPrediction || 
        new Date(prediction.createdAt) > new Date(existingPrediction.createdAt)) {
      competencyMap.set(prediction.competencyId, prediction);
    }
  });
  
  return Array.from(competencyMap.values()).map(prediction => ({
    name: prediction.competencyId,
    initialProficiency: prediction.initialProficiency,
    currentPrediction: prediction.currentPrediction,
    decayRate: prediction.predictedDecayRate * 100 // Convert to percentage
  }));
}

export default function SkillDecayPredictionChart() {
  const { user } = useAuth();
  const [selectedTrainee, setSelectedTrainee] = useState<number | null>(null);
  
  const { data: trainees, isLoading: isLoadingTrainees } = useQuery({
    queryKey: ['/api/users/trainees'],
    enabled: user?.role === 'instructor' || user?.role === 'admin',
  });
  
  const { data: predictions, isLoading: isLoadingPredictions } = useQuery({
    queryKey: ['/api/analytics/skill-decay', selectedTrainee],
    enabled: !!selectedTrainee,
  });
  
  React.useEffect(() => {
    if (!selectedTrainee && user && user.role === 'trainee') {
      setSelectedTrainee(user.id);
    } else if (!selectedTrainee && trainees && trainees.length > 0) {
      setSelectedTrainee(trainees[0].id);
    }
  }, [user, trainees, selectedTrainee]);
  
  const chartData = predictions ? processDecayData(predictions) : [];
  const isLoading = isLoadingTrainees || isLoadingPredictions || !chartData.length;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Skill Decay Prediction</CardTitle>
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
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'decayRate') return [`${value.toFixed(2)}%`, 'Decay Rate'];
                  if (name === 'initialProficiency') return [value.toFixed(2), 'Initial Proficiency'];
                  if (name === 'currentPrediction') return [value.toFixed(2), 'Current Prediction'];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar dataKey="initialProficiency" name="Initial Proficiency" fill="#8884d8" />
              <Bar dataKey="currentPrediction" name="Current Prediction" fill="#82ca9d" />
              <Bar dataKey="decayRate" name="Decay Rate (%)" fill="#ff8042" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}