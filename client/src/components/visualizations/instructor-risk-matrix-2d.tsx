import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import RiskAssessmentMatrix2D from './risk-assessment-matrix-2d';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';

// Define the risk factors specifically for instructors
const defaultInstructorRiskFactors = [
  {
    id: 'syllabus-coverage',
    label: 'Syllabus Coverage',
    value: 78,
    position: { likelihood: 'medium' as const, impact: 'high' as const },
    description: 'Percentage of the required syllabus covered in the training program.',
    mitigation: 'Review teaching plan weekly and adjust to cover any lagging areas of the curriculum.'
  },
  {
    id: 'sessions-completed',
    value: 65,
    label: 'Sessions Completed',
    position: { likelihood: 'high' as const, impact: 'medium' as const },
    description: 'Ratio of completed vs. scheduled training sessions.',
    mitigation: 'Monitor session schedules closely and reschedule cancelled sessions promptly.'
  },
  {
    id: 'sessions-planned',
    value: 92,
    label: 'Sessions Planned',
    position: { likelihood: 'low' as const, impact: 'medium' as const },
    description: 'Adequacy of future session planning for complete curriculum coverage.',
    mitigation: 'Maintain a forward-looking schedule at least 4 weeks in advance.'
  },
  {
    id: 'assignment-evaluation',
    value: 60,
    label: 'Assignment Evaluation',
    position: { likelihood: 'high' as const, impact: 'high' as const },
    description: 'Timeliness and thoroughness of trainee assignment evaluations.',
    mitigation: 'Implement a structured review process with deadline tracking.'
  },
  {
    id: 'student-performance',
    value: 72,
    label: 'Student Performance',
    position: { likelihood: 'medium' as const, impact: 'low' as const },
    description: 'Overall performance metrics of students under supervision.',
    mitigation: 'Provide targeted interventions for students falling below performance benchmarks.'
  }
];

interface InstructorRiskMatrix2DProps {
  className?: string;
}

const InstructorRiskMatrix2D: React.FC<InstructorRiskMatrix2DProps> = ({ className = '' }) => {
  const [riskFactors, setRiskFactors] = useState(defaultInstructorRiskFactors);
  
  // Fetch risk assessment data from the API
  const { data, isLoading, error } = useQuery<any>({
    queryKey: ['/api/instructor/risk-assessment'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/instructor/risk-assessment');
        if (!res.ok) {
          throw new Error('Failed to fetch risk assessment data');
        }
        return await res.json();
      } catch (err) {
        console.error('Error fetching instructor risk assessment:', err);
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
      console.log('Using default instructor risk factor data');
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
      title="Instructor Risk Assessment"
      description="Analyze teaching effectiveness and program delivery risk factors"
      factors={riskFactors}
      className={className}
      colorScheme="dark"
    />
  );
};

export default InstructorRiskMatrix2D;