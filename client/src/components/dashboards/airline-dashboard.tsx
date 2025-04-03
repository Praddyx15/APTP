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
  Loader2,
  CalendarClock,
  GraduationCap,
  Plane,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Users,
  BookOpen,
  Clipboard,
  FileText,
  BarChart3,
  PieChart,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export function AirlineDashboard() {
  const [activeView, setActiveView] = useState('overview');
  const [selectedProgram, setSelectedProgram] = useState('All Programs');
  const [dateRange, setDateRange] = useState("Q1 2025");

  // Fetch airline profile and data
  const { data: airlineData, isLoading: isAirlineLoading } = useQuery({
    queryKey: ['/api/airline/profile'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/airline/profile');
        return await response.json();
      } catch (error) {
        // Return sample data for development
        return {
          name: "SkyWings Airlines",
          logo: "/assets/skyways-logo.png",
          fleetSize: 54,
          aircraftTypes: ["A320", "B737", "B777", "E175"],
          operationalBases: ["LHR", "MAN", "EDI", "DUB"],
          activeTrainingPrograms: 12,
          totalTrainees: 264,
          activeTrainees: 128,
          completedTrainings: 1045,
          overallComplianceRate: 96.2,
          regulatoryAuthorities: ["EASA", "FAA", "UK CAA"],
          nextAuditDate: "2025-05-15",
          safetyScore: 92,
          operationalReadiness: 94,
          trainingEffectiveness: 88
        };
      }
    },
  });

  // Fetch compliance data
  const { data: complianceData, isLoading: isComplianceLoading } = useQuery({
    queryKey: ['/api/airline/compliance'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/airline/compliance');
        return await response.json();
      } catch (error) {
        // Return mock data for development
        return [
          {
            name: "Flight Crew Licensing",
            compliance: 98,
            target: 100,
            regulations: [
              { code: "FCL.001", status: "compliant" },
              { code: "FCL.010", status: "compliant" },
              { code: "FCL.015", status: "compliant" }
            ]
          },
          {
            name: "Flight Time Limitations",
            compliance: 100,
            target: 100,
            regulations: [
              { code: "FTL.100", status: "compliant" },
              { code: "FTL.105", status: "compliant" },
              { code: "FTL.110", status: "compliant" }
            ]
          },
          {
            name: "Training Requirements",
            compliance: 92,
            target: 100,
            regulations: [
              { code: "TRN.200", status: "compliant" },
              { code: "TRN.205", status: "non-compliant" },
              { code: "TRN.210", status: "compliant" }
            ]
          },
          {
            name: "Safety Management",
            compliance: 95,
            target: 100,
            regulations: [
              { code: "SMS.300", status: "compliant" },
              { code: "SMS.305", status: "compliant" },
              { code: "SMS.310", status: "partial" }
            ]
          },
          {
            name: "Aircraft Maintenance",
            compliance: 89,
            target: 100,
            regulations: [
              { code: "MNT.400", status: "compliant" },
              { code: "MNT.405", status: "non-compliant" },
              { code: "MNT.410", status: "partial" }
            ]
          }
        ];
      }
    }
  });

  // Fetch upcoming audit data
  const { data: auditData, isLoading: isAuditLoading } = useQuery({
    queryKey: ['/api/airline/audits'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/airline/audits');
        return await response.json();
      } catch (error) {
        // Return mock data for development
        const today = new Date();
        const nextMonth = new Date(today);
        nextMonth.setMonth(today.getMonth() + 1);
        
        const twoMonths = new Date(today);
        twoMonths.setMonth(today.getMonth() + 2);
        
        return [
          {
            id: 1,
            title: "EASA Operational Safety Audit",
            date: nextMonth.toISOString(),
            authority: "EASA",
            status: "scheduled",
            scope: "Full operational review",
            readiness: 78
          },
          {
            id: 2,
            title: "FAA Fleet Safety Inspection",
            date: twoMonths.toISOString(),
            authority: "FAA",
            status: "scheduled",
            scope: "Fleet safety systems",
            readiness: 65
          },
          {
            id: 3,
            title: "Internal Quality Assurance Audit",
            date: today.toISOString(),
            authority: "Internal",
            status: "in-progress",
            scope: "Training documentation review",
            readiness: 92
          }
        ];
      }
    }
  });

  // Fetch training programs data
  const { data: programsData, isLoading: isProgramsLoading } = useQuery({
    queryKey: ['/api/airline/training-programs'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/airline/training-programs');
        return await response.json();
      } catch (error) {
        // Return mock data for development
        return [
          {
            id: 1,
            name: "A320 Type Rating",
            activeTrainees: 23,
            completionRate: 68,
            startDate: "2025-01-10",
            endDate: "2025-06-15",
            status: "active"
          },
          {
            id: 2,
            name: "B737 Recurrent Training",
            activeTrainees: 31,
            completionRate: 42,
            startDate: "2025-02-05",
            endDate: "2025-05-20",
            status: "active"
          },
          {
            id: 3,
            name: "Crew Resource Management",
            activeTrainees: 48,
            completionRate: 85,
            startDate: "2025-01-15",
            endDate: "2025-04-05",
            status: "active"
          },
          {
            id: 4,
            name: "Emergency Procedures",
            activeTrainees: 64,
            completionRate: 76,
            startDate: "2025-02-10",
            endDate: "2025-04-25",
            status: "active"
          }
        ];
      }
    }
  });

  // Loading state
  if (isAirlineLoading || isComplianceLoading || isAuditLoading || isProgramsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format compliance color
  const getComplianceColor = (complianceRate) => {
    if (complianceRate >= 95) return "bg-green-500";
    if (complianceRate >= 85) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Format status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case "compliant":
        return <Badge className="bg-green-500">Compliant</Badge>;
      case "non-compliant":
        return <Badge className="bg-red-500">Non-Compliant</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500">Partial</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-500">Scheduled</Badge>;
      case "in-progress":
        return <Badge variant="outline" className="border-blue-500 text-blue-500">In Progress</Badge>;
      case "active":
        return <Badge className="bg-green-500">Active</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const chartColors = [
    "#4ade80", // Green
    "#facc15", // Yellow
    "#f87171", // Red
    "#60a5fa", // Blue
    "#a78bfa"  // Purple
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        {/* Welcome and summary */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {airlineData?.name}</h1>
            <p className="text-sm text-muted-foreground">
              Fleet Size: {airlineData?.fleetSize} • Active Programs: {airlineData?.activeTrainingPrograms}
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex-shrink-0">
            <div className="flex items-center space-x-1">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">
                Overall Compliance: {airlineData?.overallComplianceRate}%
              </span>
            </div>
            <Progress 
              value={airlineData?.overallComplianceRate} 
              className="h-2 w-40 mt-1" 
            />
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Active Trainees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{airlineData?.activeTrainees}</div>
              <div className="flex flex-col mt-2">
                <div className="flex justify-between text-xs">
                  <span>Total: {airlineData?.totalTrainees}</span>
                  <span>{Math.round((airlineData?.activeTrainees / airlineData?.totalTrainees) * 100)}% Active</span>
                </div>
                <div className="h-1.5 bg-white/20 rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full bg-white rounded-full" 
                    style={{ width: `${(airlineData?.activeTrainees / airlineData?.totalTrainees) * 100}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Completed Trainings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{airlineData?.completedTrainings}</div>
              <div className="text-sm text-blue-100 mt-1">
                Lifetime total
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Next Audit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-medium">{airlineData?.nextAuditDate}</div>
              <div className="mt-2 flex items-center text-xs text-blue-100">
                <AlertTriangle className="h-3 w-3 mr-1" />
                <span>Preparation required</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-100">Regulatory Bodies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-medium">{airlineData?.regulatoryAuthorities.join(", ")}</div>
              <div className="mt-2 flex items-center text-xs text-blue-100">
                <Shield className="h-3 w-3 mr-1" />
                <span>All certifications active</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Compliance Graph */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              Regulatory Compliance
            </CardTitle>
            <CardDescription>
              Compliance levels across key regulatory areas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={complianceData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Compliance']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Legend />
                  <Bar dataKey="compliance" name="Current Compliance" fill="#3b82f6">
                    {complianceData?.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.compliance >= 95 ? '#4ade80' : entry.compliance >= 85 ? '#facc15' : '#f87171'} 
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="target" name="Target" fill="#94a3b8" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Area</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Regulations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complianceData?.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={item.compliance} 
                            className={`h-2 w-16 ${
                              item.compliance >= 95 ? 'bg-green-200' : 
                              item.compliance >= 85 ? 'bg-yellow-200' : 
                              'bg-red-200'
                            }`}
                          />
                          <span className="text-sm">{item.compliance}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.regulations.map((reg, idx) => (
                            <div key={idx} className="flex items-center mr-2 text-xs">
                              <span className="mr-1">{reg.code}</span>
                              {reg.status === 'compliant' ? (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              ) : reg.status === 'non-compliant' ? (
                                <XCircle className="h-3 w-3 text-red-500" />
                              ) : (
                                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4 px-6">
            <Button variant="outline" className="w-full" asChild>
              <Link to="/compliance-manager">
                Open Compliance Manager
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Upcoming Audits */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <Clipboard className="h-5 w-5 mr-2 text-blue-600" />
                Upcoming Audits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditData?.map((audit, index) => (
                  <div key={index} className="pb-4 border-b last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium">{audit.title}</h3>
                      {getStatusBadge(audit.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {audit.authority} • {formatDate(audit.date)}
                    </p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Readiness</span>
                        <span>{audit.readiness}%</span>
                      </div>
                      <Progress 
                        value={audit.readiness} 
                        className={`h-2 ${
                          audit.readiness >= 80 ? 'bg-green-200' : 
                          audit.readiness >= 60 ? 'bg-yellow-200' : 
                          'bg-red-200'
                        }`}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">{audit.scope}</p>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 px-6">
              <Button variant="outline" className="w-full" asChild>
                <Link to="/audit-calendar">
                  View Audit Calendar
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          {/* Training Programs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
                Active Training Programs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {programsData?.map((program, index) => (
                  <div key={index} className="pb-4 border-b last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium">{program.name}</h3>
                      {getStatusBadge(program.status)}
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        <Users className="h-3 w-3 inline mr-1" />
                        {program.activeTrainees} trainees
                      </span>
                      <span>
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatDate(program.startDate)} - {formatDate(program.endDate)}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Completion</span>
                        <span>{program.completionRate}%</span>
                      </div>
                      <Progress value={program.completionRate} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 px-6">
              <Button variant="outline" className="w-full" asChild>
                <Link to="/training-programs">
                  Manage Training Programs
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        {/* Training Session Scheduler */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarClock className="h-5 w-5 mr-2 text-blue-600" />
                Flight Crew Training Scheduler
              </CardTitle>
              <CardDescription>
                Manage and schedule training sessions for flight crew members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SessionScheduler 
                variant="airline" 
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