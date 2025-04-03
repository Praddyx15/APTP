import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth, UserRole } from '@/contexts/auth-context';
import { TabsContent, Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/shared/page-header';
import TraineeRiskMatrix from '@/components/risk-assessment/TraineeRiskMatrix';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  ChevronRight, 
  FileLineChart, 
  FileText, 
  SquarePen,
  Users
} from 'lucide-react';

// Sample trainee data
const trainees = [
  { id: '1', name: 'John Smith', course: 'CPL', progress: 65, riskLevel: 'Medium' },
  { id: '2', name: 'Sarah Johnson', course: 'ATPL', progress: 42, riskLevel: 'High' },
  { id: '3', name: 'Michael Brown', course: 'PPL', progress: 87, riskLevel: 'Low' },
  { id: '4', name: 'Emma Wilson', course: 'CPL', progress: 23, riskLevel: 'Critical' },
  { id: '5', name: 'Robert Garcia', course: 'ATPL', progress: 58, riskLevel: 'Medium' },
  { id: '6', name: 'David Lee', course: 'IR', progress: 72, riskLevel: 'Low' },
];

// Sample test data for multiple matrices
const exampleMatrixData = [
  {
    id: '1',
    title: 'Technical Skills',
    data: [
      {
        id: 't1',
        x: 6,
        y: 3,
        z: 18,
        category: 'Low',
        label: 'Aircraft Systems',
        description: 'Understanding of aircraft systems and operations is adequate, with some minor gaps in knowledge.'
      },
      {
        id: 't2',
        x: 8,
        y: 7,
        z: 56,
        category: 'Critical',
        label: 'Precision Approaches',
        description: 'Significant difficulty maintaining precision during instrument approaches.'
      },
      {
        id: 't3',
        x: 4,
        y: 5,
        z: 20,
        category: 'Medium',
        label: 'Radio Navigation',
        description: 'Occasionally makes errors in radio navigation procedures.'
      }
    ]
  },
  {
    id: '2',
    title: 'Non-Technical Skills',
    data: [
      {
        id: 'nt1',
        x: 3,
        y: 9,
        z: 27,
        category: 'High',
        label: 'Decision Making',
        description: 'Shows poor judgment when handling non-standard situations.'
      },
      {
        id: 'nt2',
        x: 5,
        y: 2,
        z: 10,
        category: 'Low',
        label: 'Communication',
        description: 'Communication with ATC and crew is generally effective with minor issues.'
      },
      {
        id: 'nt3',
        x: 7,
        y: 6,
        z: 42,
        category: 'Critical',
        label: 'Workload Management',
        description: 'Frequently overwhelmed when handling multiple tasks simultaneously.'
      }
    ]
  }
];

// Map risk levels to colors for visual indicators
const getRiskColor = (risk: string) => {
  switch (risk.toLowerCase()) {
    case 'low': return 'bg-green-500';
    case 'medium': return 'bg-amber-500';
    case 'high': return 'bg-red-500';
    case 'critical': return 'bg-red-800';
    default: return 'bg-gray-500';
  }
};

export default function RiskAssessmentPage() {
  const [selectedTrainee, setSelectedTrainee] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [, navigate] = useLocation();
  const { user, hasRole } = useAuth();
  
  // Determine if user can add/edit assessments based on role
  const canEditAssessments = hasRole([UserRole.INSTRUCTOR, UserRole.EXAMINER, UserRole.ADMIN]);
  
  // Handle trainee selection
  const handleTraineeSelect = (id: string) => {
    setSelectedTrainee(id);
    setActiveTab('individual');
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Risk Assessment Matrix"
        description="Visualize and analyze risk factors for trainees based on performance metrics."
        actions={<AlertTriangle className="h-6 w-6" />}
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="individual" disabled={!selectedTrainee}>
              Individual Assessment
            </TabsTrigger>
            {canEditAssessments && (
              <TabsTrigger value="manage">Manage Assessments</TabsTrigger>
            )}
          </TabsList>
          
          {canEditAssessments && (
            <Button 
              size="sm" 
              className="gap-1"
              onClick={() => navigate('/risk-assessment/new')}
            >
              <SquarePen className="h-4 w-4" />
              New Assessment
            </Button>
          )}
        </div>
        
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Trainee Risk Overview</CardTitle>
              <CardDescription>
                Select a trainee to view their detailed risk assessment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="py-3 px-4 text-left">Trainee</th>
                      <th className="py-3 px-4 text-left">Course</th>
                      <th className="py-3 px-4 text-left">Progress</th>
                      <th className="py-3 px-4 text-left">Risk Level</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainees.map((trainee) => (
                      <tr 
                        key={trainee.id} 
                        className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="py-3 px-4">{trainee.name}</td>
                        <td className="py-3 px-4">{trainee.course}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary" 
                                style={{ width: `${trainee.progress}%` }}
                              />
                            </div>
                            <span className="text-sm">{trainee.progress}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getRiskColor(trainee.riskLevel)}`} />
                            {trainee.riskLevel}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => handleTraineeSelect(trainee.id)}
                          >
                            View <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid md:grid-cols-2 gap-6">
            <TraineeRiskMatrix 
              title="Overall Risk Distribution"
              description="Aggregated risk assessment for all trainees in the program."
              height={350}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>Risk Categories</CardTitle>
                <CardDescription>
                  Distribution of trainees across risk categories.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 py-2">
                  {['Low', 'Medium', 'High', 'Critical'].map((level) => {
                    const count = trainees.filter(t => t.riskLevel === level).length;
                    const percentage = Math.round((count / trainees.length) * 100);
                    
                    return (
                      <div key={level} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getRiskColor(level)}`} />
                            {level}
                          </span>
                          <span>{count} trainees ({percentage}%)</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getRiskColor(level)}`} 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="individual" className="space-y-6">
          {selectedTrainee && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {trainees.find(t => t.id === selectedTrainee)?.name}'s Risk Assessment
                </h2>
                
                <div className="flex gap-3">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/trainee-performance/${selectedTrainee}`)}>
                    <FileLineChart className="h-4 w-4 mr-2" />
                    Performance Data
                  </Button>
                  
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Assessment Report
                  </Button>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {exampleMatrixData.map(matrix => (
                  <TraineeRiskMatrix
                    key={matrix.id}
                    title={matrix.title}
                    initialData={matrix.data}
                    height={350}
                  />
                ))}
              </div>
              
              <Card>
                <CardHeader>
                  <CardTitle>Historical Risk Trends</CardTitle>
                  <CardDescription>
                    Changes in risk assessment over the past 6 months.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <p>Historical trend visualization would appear here.</p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
        
        {canEditAssessments && (
          <TabsContent value="manage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Manage Risk Assessments</CardTitle>
                <CardDescription>
                  Create, edit, and review risk assessments for trainees.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 flex-col md:flex-row">
                  <Button className="flex flex-col items-center gap-2 p-6 h-auto">
                    <Users className="h-10 w-10 mb-2" />
                    <span className="font-medium">Batch Assessment</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Assess multiple trainees
                    </span>
                  </Button>
                  
                  <Button className="flex flex-col items-center gap-2 p-6 h-auto" variant="outline">
                    <FileText className="h-10 w-10 mb-2" />
                    <span className="font-medium">Assessment Templates</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Manage reusable templates
                    </span>
                  </Button>
                  
                  <Button className="flex flex-col items-center gap-2 p-6 h-auto" variant="outline">
                    <AlertTriangle className="h-10 w-10 mb-2" />
                    <span className="font-medium">Risk Thresholds</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Configure risk parameters
                    </span>
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Assessments</CardTitle>
                <CardDescription>
                  Assessments created or modified in the last 30 days.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <p>Recent assessments list would appear here.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}