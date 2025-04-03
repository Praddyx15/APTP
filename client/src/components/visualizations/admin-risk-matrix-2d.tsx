import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import RiskAssessmentMatrix2D from './risk-assessment-matrix-2d';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiRequest } from '@/lib/queryClient';

// Define the risk factors specifically for admin operations
const defaultAdminRiskFactors = [
  {
    id: 'admin-risk-1',
    label: 'Regulatory Changes',
    value: 85,
    position: {
      likelihood: 'high' as const,
      impact: 'high' as const
    },
    description: 'Changes to aviation regulations requiring significant program updates',
    mitigation: 'Regular monitoring of regulatory bodies and proactive compliance reviews'
  },
  {
    id: 'admin-risk-2',
    label: 'Resource Shortage',
    value: 72,
    position: {
      likelihood: 'medium' as const,
      impact: 'high' as const
    },
    description: 'Insufficient training resources (aircraft, simulators, instructors) to meet demand',
    mitigation: 'Implement resource forecasting system and maintain alternative provider relationships'
  },
  {
    id: 'admin-risk-3',
    label: 'Data Security',
    value: 68,
    position: {
      likelihood: 'medium' as const,
      impact: 'high' as const
    },
    description: 'Unauthorized access to sensitive training and certification data',
    mitigation: 'Regular security audits, encryption, and access controls'
  },
  {
    id: 'admin-risk-4',
    label: 'Documentation Issues',
    value: 62,
    position: {
      likelihood: 'high' as const,
      impact: 'medium' as const
    },
    description: 'Incomplete or inaccurate training records affecting compliance',
    mitigation: 'Automated record validation system and periodic documentation reviews'
  },
  {
    id: 'admin-risk-5',
    label: 'Equipment Failure',
    value: 54,
    position: {
      likelihood: 'medium' as const,
      impact: 'medium' as const
    },
    description: 'Critical training equipment failure causing program disruption',
    mitigation: 'Regular maintenance, redundant systems, and contingency planning'
  },
  {
    id: 'admin-risk-6',
    label: 'Scheduling Conflicts',
    value: 48,
    position: {
      likelihood: 'high' as const,
      impact: 'low' as const
    },
    description: 'Overlapping resource needs causing schedule disruptions',
    mitigation: 'Advanced scheduling system with conflict detection'
  },
  {
    id: 'admin-risk-7',
    label: 'Instructor Turnover',
    value: 35,
    position: {
      likelihood: 'medium' as const,
      impact: 'low' as const
    },
    description: 'Loss of qualified instructors affecting program continuity',
    mitigation: 'Instructor retention programs and qualification tracking'
  },
  {
    id: 'admin-risk-8',
    label: 'Budget Overruns',
    value: 32,
    position: {
      likelihood: 'low' as const,
      impact: 'medium' as const
    },
    description: 'Training costs exceeding allocated budgets',
    mitigation: 'Regular financial reviews and cost containment measures'
  },
  {
    id: 'admin-risk-9',
    label: 'Facility Issues',
    value: 18,
    position: {
      likelihood: 'low' as const,
      impact: 'low' as const
    },
    description: 'Training facility limitations or disruptions',
    mitigation: 'Facility audits and alternative location arrangements'
  }
];

interface AdminRiskMatrix2DProps {
  className?: string;
}

const AdminRiskMatrix2D: React.FC<AdminRiskMatrix2DProps> = ({ className = '' }) => {
  const [riskFactors, setRiskFactors] = useState(defaultAdminRiskFactors);
  
  // Fetch risk assessment data from the API
  const { data, isLoading, error } = useQuery<any>({
    queryKey: ['/api/admin/risk-assessment'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/admin/risk-assessment');
        if (!res.ok) {
          throw new Error('Failed to fetch risk assessment data');
        }
        return await res.json();
      } catch (err) {
        console.error('Error fetching admin risk assessment:', err);
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
      console.log('Using default admin risk factor data');
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

  // Display loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle><Skeleton className="h-6 w-48" /></CardTitle>
          <CardDescription><Skeleton className="h-4 w-72" /></CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-80 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <RiskAssessmentMatrix2D
      title="Administrative Risk Assessment"
      description="Analysis of operational risks affecting training programs and administration"
      factors={riskFactors}
      className={className}
    />
  );
};

export default AdminRiskMatrix2D;