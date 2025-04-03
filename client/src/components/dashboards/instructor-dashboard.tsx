import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { TrainingSession } from '../../types/training';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { SessionScheduler } from '@/components/scheduling/session-scheduler';
import { CalendarView } from '@/components/scheduling/calendar-view';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  PieChart,
  Users,
  CalendarClock,
  Clock,
  BookOpen,
  FileCheck,
  UserCheck,
  BookMarked,
  CheckCircle2,
  XCircle,
  CalendarDays,
  FileText,
  Clipboard,
  Award,
  Plane,
  Calendar,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import InstructorRiskMatrix2D from '@/components/visualizations/instructor-risk-matrix-2d';
import { PerformanceAnalytics } from '@/components/analytics/performance-analytics';
import { ComplianceChecker } from '@/components/compliance/compliance-checker';
import { KnowledgeGraphVisualizer } from '@/components/knowledge-graph/knowledge-graph-visualizer';

// Type definitions for data
interface InstructorProfile {
  firstName: string;
  lastName: string;
  id: string;
  department: string;
  role: string;
  trainees: number;
  coursesAssigned: number;
  sessionsCompleted: number;
  assessmentsGraded: number;
  upcomingSessions: number;
}

interface TraineeItem {
  id: string;
  name: string;
  program: string;
  progress: number;
  status: string;
  lastSession: string;
  nextSession: string | null;
}

interface UpcomingSession {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  trainees: string[];
  location: string;
  status: string;
}

interface PendingTask {
  id: string;
  task: string;
  type: string;
  dueDate: string;
  priority: string;
  traineeId?: string;
  traineeName?: string;
}

export function InstructorDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Fetch instructor profile data 
  const { data: instructorData, isLoading: isInstructorLoading } = useQuery({
    queryKey: ['/api/instructor/profile'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/instructor/profile');
        return await response.json();
      } catch (error) {
        console.error('Error fetching instructor profile:', error);
        return {
          firstName: "Sarah",
          lastName: "Martinez",
          id: "INS1234",
          department: "Flight Training",
          role: "Senior Flight Instructor",
          trainees: 16,
          coursesAssigned: 5,
          sessionsCompleted: 83,
          assessmentsGraded: 57,
          upcomingSessions: 8,
          certifications: ["CPL", "ATPL", "Flight Instructor Rating", "Multi-Engine Rating"],
          specializations: ["Commercial Pilot Training", "Emergency Procedures"]
        };
      }
    },
  });

  // Fetch trainee list
  const { data: trainees, isLoading: isTraineesLoading } = useQuery({
    queryKey: ['/api/instructor/trainees'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/instructor/trainees');
        return await response.json();
      } catch (error) {
        console.error('Error fetching trainees:', error);
        return [
          {
            id: "ST1001",
            name: "Emma Johnson",
            program: "ATPL",
            progress: 78,
            status: "on-track",
            lastSession: "Mar 28, 2025",
            nextSession: "Apr 1, 2025"
          },
          {
            id: "ST1002",
            name: "Michael Wilson",
            program: "ATPL",
            progress: 68,
            status: "at-risk",
            lastSession: "Mar 27, 2025",
            nextSession: "Mar 31, 2025"
          },
          {
            id: "ST1003",
            name: "Sarah Lee",
            program: "CPL",
            progress: 92,
            status: "excellent",
            lastSession: "Mar 29, 2025",
            nextSession: "Apr 3, 2025"
          },
          {
            id: "ST1004",
            name: "Robert Chen",
            program: "PPL",
            progress: 45,
            status: "needs-attention",
            lastSession: "Mar 25, 2025",
            nextSession: "Mar 30, 2025"
          }
        ];
      }
    },
  });

  // Fetch upcoming sessions
  const { data: upcomingSessions, isLoading: isSessionsLoading } = useQuery({
    queryKey: ['/api/instructor/upcoming-sessions'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/instructor/upcoming-sessions');
        return await response.json();
      } catch (error) {
        console.error('Error fetching upcoming sessions:', error);
        return [
          {
            id: "SES1001",
            title: "B737 Simulator Training",
            date: "Today",
            time: "14:00-17:00",
            type: "simulator",
            trainees: ["ST1001", "ST1002"],
            location: "Simulator Bay 3",
            status: "confirmed"
          },
          {
            id: "SES1002",
            title: "Emergency Procedures",
            date: "Tomorrow",
            time: "09:00-12:00",
            type: "classroom",
            trainees: ["ST1001", "ST1002", "ST1003", "ST1004"],
            location: "Room 201",
            status: "confirmed"
          },
          {
            id: "SES1003",
            title: "Cross-Country Planning",
            date: "Apr 2",
            time: "13:00-15:00",
            type: "briefing",
            trainees: ["ST1003"],
            location: "Briefing Room 2",
            status: "pending"
          }
        ];
      }
    },
  });

  // Fetch pending tasks
  const { data: pendingTasks, isLoading: isTasksLoading } = useQuery({
    queryKey: ['/api/instructor/pending-tasks'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/instructor/pending-tasks');
        return await response.json();
      } catch (error) {
        console.error('Error fetching pending tasks:', error);
        return [
          {
            id: "TASK1001",
            task: "Grade Navigation Test",
            type: "assessment",
            dueDate: "Today",
            priority: "high",
            traineeId: "ST1002",
            traineeName: "Michael Wilson"
          },
          {
            id: "TASK1002",
            task: "Review Flight Plan",
            type: "review",
            dueDate: "Today",
            priority: "medium",
            traineeId: "ST1003",
            traineeName: "Sarah Lee"
          },
          {
            id: "TASK1003",
            task: "Prepare Lesson Plan",
            type: "preparation",
            dueDate: "Tomorrow",
            priority: "medium",
            traineeId: null,
            traineeName: null
          },
          {
            id: "TASK1004",
            task: "Complete Progress Report",
            type: "administrative",
            dueDate: "Apr 3",
            priority: "low",
            traineeId: "ST1004",
            traineeName: "Robert Chen"
          }
        ];
      }
    },
  });

  // Loading state
  if (isInstructorLoading || isTraineesLoading || isSessionsLoading || isTasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Status badge color helper
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'on-track': return 'bg-blue-600';
      case 'excellent': return 'bg-green-600';
      case 'at-risk': return 'bg-amber-500';
      case 'needs-attention': return 'bg-red-500';
      case 'confirmed': return 'bg-green-600';
      case 'pending': return 'bg-blue-600';
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-blue-600';
      default: return 'bg-gray-500';
    }
  };

  // Get icon for session type
  const getSessionTypeIcon = (type: string) => {
    switch(type) {
      case 'simulator': return <PieChart className="h-4 w-4" />;
      case 'classroom': return <Users className="h-4 w-4" />;
      case 'briefing': return <FileText className="h-4 w-4" />;
      case 'flight': return <Plane className="h-4 w-4" />;
      default: return <Calendar className="h-4 w-4" />;
    }
  };

  // Get icon for task type
  const getTaskTypeIcon = (type: string) => {
    switch(type) {
      case 'assessment': return <FileCheck className="h-4 w-4" />;
      case 'review': return <BookOpen className="h-4 w-4" />;
      case 'preparation': return <Clipboard className="h-4 w-4" />;
      case 'administrative': return <FileText className="h-4 w-4" />;
      default: return <BookMarked className="h-4 w-4" />;
    }
  };

  return (
    <div className="container py-6">
      {/* Header with instructor info */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Instructor Dashboard</h1>
        <p className="text-muted-foreground">
          {instructorData.department} • {instructorData.role} • ID: {instructorData.id}
        </p>
      </div>
      
      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Assigned Trainees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <UserCheck className="h-5 w-5 text-primary mr-2" />
              <div className="text-3xl font-bold">{instructorData.trainees}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BookOpen className="h-5 w-5 text-primary mr-2" />
              <div className="text-3xl font-bold">{instructorData.coursesAssigned}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Sessions Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CheckCircle2 className="h-5 w-5 text-primary mr-2" />
              <div className="text-3xl font-bold">{instructorData.sessionsCompleted}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Assessments Graded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Award className="h-5 w-5 text-primary mr-2" />
              <div className="text-3xl font-bold">{instructorData.assessmentsGraded}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Upcoming Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CalendarDays className="h-5 w-5 text-primary mr-2" />
              <div className="text-3xl font-bold">{instructorData.upcomingSessions}</div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Trainees Status and Pending Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Trainees Status */}
        <Card>
          <CardHeader>
            <CardTitle>Trainee Status</CardTitle>
            <CardDescription>Overview of your assigned trainees</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainees.map((trainee: TraineeItem) => (
                  <TableRow key={trainee.id}>
                    <TableCell className="font-medium">{trainee.name}</TableCell>
                    <TableCell>{trainee.program}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={trainee.progress} className="w-20 h-2" />
                        <span className="text-xs">{trainee.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(trainee.status)}>
                        {trainee.status.split('-').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* Pending Tasks */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Tasks</CardTitle>
            <CardDescription>Tasks requiring your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingTasks.map((task: PendingTask) => (
                <div key={task.id} className="flex items-start gap-4 p-3 rounded-lg border bg-card">
                  <div className={`flex items-center justify-center size-8 rounded-full ${
                    task.priority === 'high' ? 'bg-red-100 text-red-600' :
                    task.priority === 'medium' ? 'bg-amber-100 text-amber-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {getTaskTypeIcon(task.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{task.task}</h3>
                      <Badge className={getStatusColor(task.priority)}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {task.traineeName && <>Trainee: {task.traineeName} • </>}
                      Due: {task.dueDate}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 2D Risk Assessment Matrix */}
      <div className="mb-6">
        <InstructorRiskMatrix2D className="w-full" />
      </div>
      
      {/* Upcoming Sessions and Scheduling */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Session Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CalendarView 
            sessions={upcomingSessions || []} 
            onSelectSession={(session: TrainingSession) => {
              // Logic to handle session selection
              console.log("Selected session:", session);
            }}
          />
          <SessionScheduler variant="instructor" />
        </div>
      </div>
      
      {/* Performance Analytics */}
      <div className="mb-6">
        <PerformanceAnalytics variant="instructor" />
      </div>
      
      {/* Knowledge Graph */}
      <div className="mb-6">
        <KnowledgeGraphVisualizer variant="compact" defaultLayout="radial" />
      </div>
      
      {/* Compliance Checker */}
      <div className="mb-6">
        <ComplianceChecker variant="compact" />
      </div>
    </div>
  );
}