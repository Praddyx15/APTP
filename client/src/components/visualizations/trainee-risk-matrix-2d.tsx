import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import RiskAssessmentMatrix2D from './risk-assessment-matrix-2d';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';

// Define the risk factors specifically for trainees
const defaultTraineeRiskFactors = [
  {
    id: 'course-progress',
    label: 'Course Progress',
    value: 72,
    position: { likelihood: 'medium' as const, impact: 'low' as const },
    description: 'Overall completion rate of the training curriculum.',
    mitigation: 'Follow the personalized study plan and complete recommended resources.'
  },
  {
    id: 'assignment-completion',
    value: 60,
    label: 'Assignment Completion',
    position: { likelihood: 'high' as const, impact: 'high' as const },
    description: 'Rate of timely submission of required assignments.',
    mitigation: 'Set calendar reminders for assignment deadlines and allocate sufficient time.'
  },
  {
    id: 'session-attendance',
    value: 85,
    label: 'Session Attendance',
    position: { likelihood: 'low' as const, impact: 'medium' as const },
    description: 'Participation in scheduled classroom and simulator sessions.',
    mitigation: 'Prioritize attendance for critical training sessions and simulator time.'
  },
  {
    id: 'flight-skills',
    value: 65,
    label: 'Flight Skills',
    position: { likelihood: 'medium' as const, impact: 'high' as const },
    description: 'Practical application of flight techniques and procedures.',
    mitigation: 'Request additional simulator time and practice sessions with instructors.'
  },
  {
    id: 'emergency-procedures',
    value: 58,
    label: 'Emergency Procedures',
    position: { likelihood: 'high' as const, impact: 'medium' as const },
    description: 'Knowledge and execution of emergency protocols.',
    mitigation: 'Review emergency checklists daily and schedule focused practice sessions.'
  }
];

interface TraineeRiskMatrix2DProps {
  className?: string;
}

const TraineeRiskMatrix2D: React.FC<TraineeRiskMatrix2DProps> = ({ className = '' }) => {
  const [riskFactors, setRiskFactors] = useState(defaultTraineeRiskFactors);
  
  // Fetch risk assessment data from the API
  const { data, isLoading, error } = useQuery<any>({
    queryKey: ['/api/trainee/risk-assessment'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/trainee/risk-assessment');
        if (!res.ok) {
          throw new Error('Failed to fetch risk assessment data');
        }
        return await res.json();
      } catch (err) {
        console.error('Error fetching trainee risk assessment:', err);
        // Return null so we use default data
        return null;
      }
    },
    retry: 1,
    // No actual onError functionality needed
  });
  
  // Log errors and use default data if needed
  useEffect(() => {
    if (error) {
      console.log('Using default trainee risk factor data');
    }
  }, [error]);
  
  // Update risk factors when data is fetched
  useEffect(() => {
    if (data) {
      // Transform API data to match our component's format
      const apiFactors = data.map((item: any) => ({
        id: item.id,
        label: item.label,
        value: item.value,
        position: {
          likelihood: item.likelihood,
          impact: item.impact
        },
        description: item.description,
        mitigation: item.mitigation
      }));
      
      setRiskFactors(apiFactors);
    }
  }, [data]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[450px] w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }

  return (
    <RiskAssessmentMatrix2D
      title="Training Risk Assessment"
      description="Analyze your training progress risk factors by likelihood and impact"
      factors={riskFactors}
      className={className}
      colorScheme="default"
    />
  );
};

export default TraineeRiskMatrix2D;