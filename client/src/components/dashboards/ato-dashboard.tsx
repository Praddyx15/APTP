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
import {
  BarChart2,
  Layers,
  Users,
  ArrowUp,
  CheckCircle2,
  Loader2,
  ArrowUpRight,
  Info,
  PieChart,
  ChevronRight,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export function ATODashboard() {
  const [selectedProgram, setSelectedProgram] = useState("All Programs");
  const [selectedCycle, setSelectedCycle] = useState("Jan - Mar 2025");

  // Certification status data for pie chart
  const certificationStatusData = [
    { name: "Active", count: 56, color: "#2dd4bf" },  // Teal
    { name: "Pending Renewal", count: 12, color: "#f59e0b" },  // Amber
    { name: "Expiring Soon", count: 8, color: "#f43f5e" },  // Rose
    { name: "Recently Issued", count: 24, color: "#3b82f6" }  // Blue
  ];

  // Fetch ATO dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['/api/ato/dashboard', selectedProgram, selectedCycle],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/ato/dashboard?program=${selectedProgram}&cycle=${selectedCycle}`);
        return await response.json();
      } catch (error) {
        // Return mock data for development
        return {
          activeStudents: {
            count: 187,
            change: 12,
            period: "this month"
          },
          trainingCompletion: {
            percentage: 79,
            status: "On Target"
          },
          resourceUtilization: {
            percentage: 82,
            change: 5,
            period: "vs last cycle"
          },
          complianceScore: {
            percentage: 98,
            status: "EASA Compliant"
          },
          trainingProgress: {
            programs: [
              { name: "PPL", complete: 65, inProgress: 40 },
              { name: "CPL", complete: 70, inProgress: 30 },
              { name: "IR", complete: 45, inProgress: 25 },
              { name: "ATPL", complete: 35, inProgress: 22 },
            ]
          },
          instructorAllocation: {
            segments: [
              { name: "PPL Ground", percentage: 25 },
              { name: "PPL Flight", percentage: 15 },
              { name: "CPL Ground", percentage: 15 },
              { name: "CPL Flight", percentage: 10 },
              { name: "IR", percentage: 15 },
              { name: "ATPL Ground", percentage: 10 },
              { name: "ATPL Sim", percentage: 5 },
              { name: "Other", percentage: 5 },
            ]
          },
          resourceAvailability: [
            { resource: "C172 (G-ABCD)", status: "Active", availability: 85 },
            { resource: "PA-28 (G-EFGH)", status: "Active", availability: 78 },
            { resource: "FNPT II Sim", status: "Maintenance", availability: 0, maintenance: "until 25/3" },
          ],
          upcomingCertifications: [
            { type: "PPL Certification Tests", students: 12 },
            { type: "CPL Certification Tests", students: 8 },
            { type: "IR Certification Tests", students: 6 },
            { type: "ATPL Certification Tests", students: 3 },
          ],
          certificationStatusData: certificationStatusData
        };
      }
    },
  });

  // Loading state
  if (isDashboardLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-2">
          <div>
            <h1 className="text-2xl font-bold">ATO Operations Dashboard</h1>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Programs">All Programs</SelectItem>
                <SelectItem value="PPL">Private Pilot License</SelectItem>
                <SelectItem value="CPL">Commercial Pilot License</SelectItem>
                <SelectItem value="IR">Instrument Rating</SelectItem>
                <SelectItem value="ATPL">Airline Transport Pilot License</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedCycle} onValueChange={setSelectedCycle}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Cycle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Jan - Mar 2025">Current Cycle: Jan - Mar 2025</SelectItem>
                <SelectItem value="Oct - Dec 2024">Oct - Dec 2024</SelectItem>
                <SelectItem value="Jul - Sep 2024">Jul - Sep 2024</SelectItem>
                <SelectItem value="Apr - Jun 2024">Apr - Jun 2024</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Active Students */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboardData?.activeStudents.count}</div>
              <div className="text-sm text-muted-foreground">
                total
              </div>
              <div className="h-1 mt-3 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-3/4 rounded-full"></div>
              </div>
              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                <ArrowUp className="w-3 h-3 mr-1 text-green-500" />
                <span className="text-green-500">+{dashboardData?.activeStudents.change}</span>
                <span className="ml-1">{dashboardData?.activeStudents.period}</span>
              </div>
            </CardContent>
          </Card>

          {/* Training Completion */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Training Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboardData?.trainingCompletion.percentage}%</div>
              <div className="text-sm text-muted-foreground">
                &nbsp;
              </div>
              <div className="h-1 mt-3 bg-green-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full" 
                  style={{ width: `${dashboardData?.trainingCompletion.percentage}%` }}
                ></div>
              </div>
              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
                <span>{dashboardData?.trainingCompletion.status}</span>
              </div>
            </CardContent>
          </Card>

          {/* Resource Utilization */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Resource Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboardData?.resourceUtilization.percentage}%</div>
              <div className="text-sm text-muted-foreground">
                &nbsp;
              </div>
              <div className="h-1 mt-3 bg-blue-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full" 
                  style={{ width: `${dashboardData?.resourceUtilization.percentage}%` }}
                ></div>
              </div>
              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                <ArrowUpRight className="w-3 h-3 mr-1 text-green-500" />
                <span className="text-green-500">+{dashboardData?.resourceUtilization.change}%</span>
                <span className="ml-1">{dashboardData?.resourceUtilization.period}</span>
              </div>
            </CardContent>
          </Card>

          {/* Compliance Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{dashboardData?.complianceScore.percentage}%</div>
              <div className="text-sm text-muted-foreground">
                &nbsp;
              </div>
              <div className="h-1 mt-3 bg-green-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full" 
                  style={{ width: `${dashboardData?.complianceScore.percentage}%` }}
                ></div>
              </div>
              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                <CheckCircle2 className="w-3 h-3 mr-1 text-green-500" />
                <span>✓ {dashboardData?.complianceScore.status}</span>
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
              <div className="h-64">
                {dashboardData?.trainingProgress.programs.map((program, index) => (
                  <div key={index} className="flex flex-col mb-4">
                    <div className="text-sm font-medium mb-1">{program.name}</div>
                    <div className="flex items-end gap-1 h-12">
                      <div 
                        className="bg-blue-500 w-12 rounded-sm" 
                        style={{ height: `${(program.complete / 75) * 100}%` }}
                      ></div>
                      <div 
                        className="bg-amber-500 w-12 rounded-sm" 
                        style={{ height: `${(program.inProgress / 75) * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex text-xs text-muted-foreground mt-1">
                      <div className="flex items-center mr-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                        Completed
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-amber-500 rounded-full mr-1"></div>
                        In Progress
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Certification Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Certification Status Distribution</CardTitle>
              <CardDescription>Current certification status across all programs</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={dashboardData?.certificationStatusData || certificationStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {(dashboardData?.certificationStatusData || certificationStatusData).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value} certifications`, name]}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '0.5rem',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button variant="outline" className="w-full md:w-auto">
                <PieChart className="mr-2 h-4 w-4" />
                View Detailed Certification Report
              </Button>
            </CardFooter>
          </Card>

          {/* Instructor Allocation */}
          <Card>
            <CardHeader>
              <CardTitle>Instructor Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative h-64 flex items-center justify-center">
                {/* This is a placeholder for a pie chart */}
                <div className="size-48 rounded-full border-8 border-blue-500 relative">
                  {dashboardData?.instructorAllocation.segments.map((segment, index) => (
                    <div 
                      key={index}
                      className="absolute text-xs"
                      style={{
                        // Place labels around the circle
                        left: `${50 + 30 * Math.cos(2 * Math.PI * index / dashboardData.instructorAllocation.segments.length)}%`,
                        top: `${50 + 30 * Math.sin(2 * Math.PI * index / dashboardData.instructorAllocation.segments.length)}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <div 
                          className="size-3 rounded-full mb-1"
                          style={{
                            backgroundColor: index % 2 === 0 ? '#3b82f6' : '#06b6d4'
                          }}
                        ></div>
                        <div className="whitespace-nowrap font-medium">{segment.name}</div>
                        <div className="text-muted-foreground">{segment.percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resource Availability */}
          <Card>
            <CardHeader>
              <CardTitle>Resource Availability</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b">
                      <th className="pb-2 font-medium">Resource</th>
                      <th className="pb-2 font-medium text-center">Status</th>
                      <th className="pb-2 font-medium text-right">Availability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData?.resourceAvailability.map((resource, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3 text-sm font-medium">{resource.resource}</td>
                        <td className="py-3 text-center">
                          <Badge 
                            className={`
                              ${resource.status === 'Active' ? 'bg-green-500' : ''}
                              ${resource.status === 'Maintenance' ? 'bg-amber-500' : ''}
                            `}
                          >
                            {resource.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          {resource.status === 'Maintenance' ? (
                            <span className="text-sm text-muted-foreground">0% (until {resource.maintenance})</span>
                          ) : (
                            <span className="text-sm">{resource.availability}%</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Certifications */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Certifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData?.upcomingCertifications.map((cert, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{cert.type}</span>
                      <span className="text-sm font-medium">{cert.students} students</span>
                    </div>
                    <Progress 
                      value={(cert.students / 15) * 100}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Session Scheduler Component */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Training Session Scheduler</CardTitle>
              <CardDescription>Manage and schedule training sessions for all programs</CardDescription>
            </CardHeader>
            <CardContent>
              <SessionScheduler 
                variant="ato" 
                initialTab="upcoming" 
                onSuccess={() => {
                  // Optionally refresh dashboard data when sessions are updated
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}