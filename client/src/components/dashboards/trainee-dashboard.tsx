import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { ComingSoon } from '@/components/shared/coming-soon';
import { CPLTraineeDashboard } from './cpl-trainee-dashboard';

// Define types for our data structures
interface TraineeProfile {
  firstName: string;
  lastName: string;
  id: string;
  program: string;
  programCompletion: number;
  totalFlightHours: number;
  soloHours: number;
  instructorHours: number;
  nextMilestone: string;
  licenseProgress: {
    groundTheory: number;
    flightTraining: number;
    skillTest: number;
  };
}

interface UpcomingSession {
  id: number;
  title: string;
  type: string;
  date: string;
  time: string;
  instructor: string;
  aircraft?: string;
  location?: string;
  status: string;
}

interface LearningResource {
  id: number;
  title: string;
  type: string;
  progress: number;
  dueDate?: string;
  completedOn?: string;
  priority: string;
  requiredFor?: string;
}

interface PerformanceGoal {
  id: number;
  title: string;
  current: number;
  target: number;
  deadline: string;
}

interface Achievement {
  id: number;
  title: string;
  date: string;
  description: string;
  badge: string;
}

export function TraineeDashboard() {
  const [location] = useLocation();
  const [hasError, setHasError] = useState(false);
  
  // Check if we're at a specific feature page  
  if (location.startsWith('/flight-records')) {
    return <ComingSoon title="Flight Records" description="Access to your digital logbook and flight records is coming soon." />;
  }
  
  if (location.startsWith('/risk-assessment')) {
    return <ComingSoon title="3D Risk Assessment" description="Advanced 3D risk assessment visualization tools are coming soon." />;
  }
  
  if (location.startsWith('/ar-visualization')) {
    return <ComingSoon title="AR/VR Visualization" description="Augmented and Virtual Reality training visualization is coming soon." />;
  }
  
  if (location.startsWith('/biometric-assessment')) {
    return <ComingSoon title="Biometric Assessment" description="Advanced biometric data integration for performance assessment is coming soon." />;
  }
  
  if (location.startsWith('/maintenance-tracking')) {
    return <ComingSoon title="Maintenance Tracking" description="Aircraft maintenance and inspection tracking tools are coming soon." />;
  }
  
  if (location.startsWith('/video-conferencing')) {
    return <ComingSoon title="Video Conferencing" description="Integrated video conferencing with AI transcription is coming soon." />;
  }
  
  if (location.startsWith('/collaborative-editing')) {
    return <ComingSoon title="Collaborative Editing" description="Real-time collaborative document and syllabus editing is coming soon." />;
  }
  
  if (location.startsWith('/blockchain-audit')) {
    return <ComingSoon title="Blockchain Audit Trails" description="Secure blockchain-backed audit trails for training records are coming soon." />;
  }
  
  // If there was an error rendering the 3D components, show a simplified dashboard
  if (hasError) {
    return (
      <div className="container py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">My Training Dashboard</h1>
          <p className="text-muted-foreground">Welcome to your trainee dashboard</p>
        </div>
        
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                We're experiencing issues with the 3D visualization component. Please try refreshing the page or using a different browser.
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border rounded-lg p-4 bg-card">
            <h2 className="text-lg font-medium mb-4">Quick Links</h2>
            <ul className="space-y-3">
              <li><a href="/flight-records" className="text-blue-600 hover:underline">Flight Records</a></li>
              <li><a href="/training-modules" className="text-blue-600 hover:underline">Training Modules</a></li>
              <li><a href="/assessments" className="text-blue-600 hover:underline">Assessments</a></li>
              <li><a href="/documents" className="text-blue-600 hover:underline">Documents</a></li>
            </ul>
          </div>
        </div>
      </div>
    );
  }
  
  // Render the CPL trainee dashboard as the default view with error handling
  try {
    return <CPLTraineeDashboard />;
  } catch (error) {
    console.error("Error rendering CPL trainee dashboard:", error);
    setHasError(true);
    return <div className="p-4">Loading dashboard...</div>;
  }
}