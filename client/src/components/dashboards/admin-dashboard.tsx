import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { SessionScheduler } from '@/components/scheduling/session-scheduler';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KnowledgeGraphVisualizer } from '@/components/knowledge-graph/knowledge-graph-visualizer';
import { ComplianceChecker } from '@/components/compliance/compliance-checker';
import AdminRiskMatrix2D from '@/components/visualizations/admin-risk-matrix-2d';
import { 
  Loader2,
  Users,
  BarChart3,
  Calendar,
  ArrowUp,
  Plane,
  BookOpen,
  CheckCircle2,
  Network,
  Shield,
  AlertTriangle,
  FileCheck,
  ChevronRight,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AdminDashboard() {
  const [dateRange, setDateRange] = useState("January 1, 2025 - March 22, 2025");
  const [activeTab, setActiveTab] = useState("overview");
  const [complianceView, setComplianceView] = useState("regulatory");
  const [knowledgeGraphTab, setKnowledgeGraphTab] = useState("syllabus");

  // Fetch admin dashboard overview data
  const { data: overviewData, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['/api/admin/training-overview', dateRange],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/admin/training-overview?dateRange=${encodeURIComponent(dateRange)}`);
        return await response.json();
      } catch (error) {
        // Return sample data for development
        return {
          activeStudents: {
            count: 328,
            change: 12,
            period: "%"
          },
          completionRate: {
            percentage: 86,
            change: 4,
            period: "%"
          },
          resourceUtilization: {
            percentage: 78,
            change: 7,
            period: "%"
          },
          complianceStatus: "Good"
        };
      }
    },
  });

  // Fetch training progress by program
  const { data: programsProgress, isLoading: isProgramsLoading } = useQuery({
    queryKey: ['/api/admin/programs-progress'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/admin/programs-progress');
        return await response.json();
      } catch (error) {
        // Return mock data for development
        return [
          { name: "PPL", progress: 42 },
          { name: "CPL", progress: 62 },
          { name: "IR", progress: 30 },
          { name: "ATPL", progress: 68 },
          { name: "Type", progress: 50 }
        ];
      }
    },
  });

  // Fetch instructor availability
  const { data: instructorAvailability, isLoading: isInstructorsLoading } = useQuery({
    queryKey: ['/api/admin/instructor-availability'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/admin/instructor-availability');
        return await response.json();
      } catch (error) {
        // Return mock data for development
        return [
          { day: "MON", slots: [
            { start: "08:00", end: "10:00" },
            { start: "13:00", end: "16:00" }
          ]},
          { day: "TUE", slots: [
            { start: "11:00", end: "13:00" }
          ]},
          { day: "WED", slots: [
            { start: "09:00", end: "12:00" },
            { start: "14:00", end: "16:00" }
          ]},
          { day: "THU", slots: [
            { start: "08:00", end: "14:00" }
          ]},
          { day: "FRI", slots: [
            { start: "13:00", end: "15:00" }
          ]},
          { day: "SAT", slots: [
            { start: "10:00", end: "12:00" }
          ]}
        ];
      }
    },
  });

  // Fetch upcoming training sessions
  const { data: upcomingSessions, isLoading: isSessionsLoading } = useQuery({
    queryKey: ['/api/admin/upcoming-sessions'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/admin/upcoming-sessions');
        return await response.json();
      } catch (error) {
        // Return mock data for development
        return [
          {
            id: 1,
            title: "CPL Flight Training - Cross Country",
            student: "Emma Wilson",
            studentId: "ST1039",
            instructor: "Robert Chen",
            time: "Today, 14:00-16:30",
            aircraft: "C172 (N5078A)"
          },
          {
            id: 2,
            title: "ATPL Simulator - Emergency Procedures",
            student: "Michael Johnson",
            studentId: "ST0972",
            instructor: "Sarah Phillips",
            time: "Tomorrow, 09:00-12:00",
            simulator: "B737 SIM-1"
          }
        ];
      }
    },
  });

  // Fetch resource utilization data
  const { data: resourceUtilization, isLoading: isResourcesLoading } = useQuery({
    queryKey: ['/api/admin/resource-utilization'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/admin/resource-utilization');
        return await response.json();
      } catch (error) {
        // Return mock data for development
        return [
          { type: "Aircraft", utilization: 80 },
          { type: "Simulators", utilization: 90 },
          { type: "Instructors", utilization: 75 },
          { type: "Classrooms", utilization: 65 },
          { type: "VR/AR Equipment", utilization: 70 }
        ];
      }
    },
  });

  // Loading state
  if (isOverviewLoading || isProgramsLoading || isInstructorsLoading || isSessionsLoading || isResourcesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Training Overview Dashboard</h1>
            <div className="flex items-center space-x-4 mt-2">
              <Button 
                variant={activeTab === 'overview' ? 'default' : 'outline'} 
                size="sm"
                className="text-xs"
                onClick={() => setActiveTab('overview')}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Training Overview
              </Button>
              <Button 
                variant={activeTab === 'compliance' ? 'default' : 'outline'} 
                size="sm"
                className="text-xs" 
                onClick={() => setActiveTab('compliance')}
              >
                <Shield className="w-4 h-4 mr-2" />
                Compliance
              </Button>
              <Button 
                variant={activeTab === 'knowledge' ? 'default' : 'outline'} 
                size="sm"
                className="text-xs" 
                onClick={() => setActiveTab('knowledge')}
              >
                <Network className="w-4 h-4 mr-2" />
                Knowledge Graph
              </Button>
              <Button 
                variant={activeTab === 'risk' ? 'default' : 'outline'} 
                size="sm"
                className="text-xs" 
                onClick={() => setActiveTab('risk')}
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Risk Assessment
              </Button>
            </div>
          </div>
          <div className="flex items-center mt-4 md:mt-0">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="January 1, 2025 - March 22, 2025">January 1, 2025 - March 22, 2025</SelectItem>
                <SelectItem value="October 1, 2024 - December 31, 2024">October 1, 2024 - December 31, 2024</SelectItem>
                <SelectItem value="July 1, 2024 - September 30, 2024">July 1, 2024 - September 30, 2024</SelectItem>
                <SelectItem value="April 1, 2024 - June 30, 2024">April 1, 2024 - June 30, 2024</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Active Students */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">{overviewData?.activeStudents.count}</div>
                    <Badge className="bg-teal-500">
                      <ArrowUp className="h-3 w-3 mr-1"/>
                      {overviewData?.activeStudents.change}%
                    </Badge>
                  </div>
                  <div className="h-1.5 mt-2 bg-teal-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-teal-500 rounded-full" 
                      style={{ width: '75%' }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              {/* Completion Rate */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">{overviewData?.completionRate.percentage}%</div>
                    <Badge className="bg-teal-500">
                      <ArrowUp className="h-3 w-3 mr-1"/>
                      {overviewData?.completionRate.change}%
                    </Badge>
                  </div>
                  <div className="h-1.5 mt-2 bg-teal-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-teal-500 rounded-full" 
                      style={{ width: `${overviewData?.completionRate.percentage}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              {/* Resource Utilization */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Resource Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-3xl font-bold">{overviewData?.resourceUtilization.percentage}%</div>
                    <Badge className="bg-teal-500">
                      <ArrowUp className="h-3 w-3 mr-1"/>
                      {overviewData?.resourceUtilization.change}%
                    </Badge>
                  </div>
                  <div className="h-1.5 mt-2 bg-teal-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-teal-500 rounded-full" 
                      style={{ width: `${overviewData?.resourceUtilization.percentage}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              {/* Compliance Status */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Compliance Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-teal-500">{overviewData?.complianceStatus}</div>
                  <div className="h-1.5 mt-2 bg-teal-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-teal-500 rounded-full" 
                      style={{ width: '85%' }}
                    ></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Training Progress by Program */}
              <Card>
                <CardHeader>
                  <CardTitle>Training Progress by Program</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 flex items-end space-x-6">
                    {programsProgress?.map((program: { name: string; progress: number }, i: number) => (
                      <div key={i} className="flex flex-col items-center flex-1">
                        <div 
                          className="w-full bg-teal-500 rounded-t-sm mt-auto"
                          style={{ height: `${program.progress * 0.6}%` }}
                        ></div>
                        <span className="text-xs font-medium mt-2">{program.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Instructor Availability */}
              <Card>
                <CardHeader>
                  <CardTitle>Instructor Availability</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-6 gap-2">
                    {instructorAvailability?.map((day: { day: string; slots: Array<{ start: string; end: string }> }, index: number) => (
                      <div key={index} className="flex flex-col">
                        <div className="text-xs font-medium text-center mb-1">{day.day}</div>
                        <div className="relative h-32 bg-gray-100 rounded">
                          {day.slots.map((slot: { start: string; end: string }, slotIndex: number) => {
                            const startHour = parseInt(slot.start.split(':')[0]);
                            const endHour = parseInt(slot.end.split(':')[0]);
                            const startPosition = ((startHour - 8) / 12) * 100;
                            const duration = (endHour - startHour) / 12 * 100;
                            
                            return (
                              <div 
                                key={slotIndex}
                                className="absolute left-0 right-0 bg-teal-300"
                                style={{
                                  top: `${startPosition}%`,
                                  height: `${duration}%`
                                }}
                              ></div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Training Sessions Scheduler */}
              <SessionScheduler variant="admin" />

              {/* Resource Utilization */}
              <Card>
                <CardHeader>
                  <CardTitle>Resource Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {resourceUtilization?.map((resource: { type: string; utilization: number }, index: number) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">{resource.type}</span>
                          <span className="text-sm">{resource.utilization}%</span>
                        </div>
                        <div className="h-2 bg-teal-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-teal-500 rounded-full" 
                            style={{ width: `${resource.utilization}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {activeTab === 'compliance' && (
          <div className="space-y-6">
            <ComplianceChecker viewMode={complianceView} />
          </div>
        )}

        {activeTab === 'knowledge' && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="border-b mb-4">
                <CardTitle>Knowledge Graph Visualizer</CardTitle>
                <CardDescription>
                  Explore training syllabus, skills, and regulatory relationships visually
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[600px]">
                  <KnowledgeGraphVisualizer initialView={knowledgeGraphTab} />
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4 flex justify-between">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setKnowledgeGraphTab('syllabus')}
                  className={knowledgeGraphTab === 'syllabus' ? 'bg-muted' : ''}
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Syllabus View
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setKnowledgeGraphTab('skills')}
                  className={knowledgeGraphTab === 'skills' ? 'bg-muted' : ''}
                >
                  <Network className="w-4 h-4 mr-2" />
                  Skills Network
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setKnowledgeGraphTab('regulatory')}
                  className={knowledgeGraphTab === 'regulatory' ? 'bg-muted' : ''}
                >
                  <FileCheck className="w-4 h-4 mr-2" />
                  Regulatory Mapping
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="space-y-6">
            <AdminRiskMatrix2D className="h-full" />
          </div>
        )}
      </div>
    </div>
  );
}