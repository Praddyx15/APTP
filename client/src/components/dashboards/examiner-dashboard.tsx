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
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Loader2,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
  Clock,
  PieChart,
  ChevronRight,
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
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export function ExaminerDashboard() {
  // Fetch examiner profile data
  const { data: examinerProfile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['/api/examiner/profile'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/examiner/profile');
        return await response.json();
      } catch (error) {
        // Return mock data for development
        return {
          name: "Robert Miller",
          qualifications: "TRE / SFE",
          aircraft: "A320/B737",
          authority: "EASA",
          authorityVisit: "Apr 15",
          upcomingTests: 6,
          pendingReports: 2,
          qualityCompliance: 100,
          activeAuthorizations: 2
        };
      }
    },
  });

  // Fetch upcoming examinations
  const { data: upcomingExams, isLoading: isExamsLoading } = useQuery({
    queryKey: ['/api/examiner/upcoming-exams'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/examiner/upcoming-exams');
        return await response.json();
      } catch (error) {
        // Return mock data for development
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        
        const twoDaysLater = new Date(today);
        twoDaysLater.setDate(today.getDate() + 2);
        
        const threeDaysLater = new Date(today);
        threeDaysLater.setDate(today.getDate() + 3);
        
        const fourDaysLater = new Date(today);
        fourDaysLater.setDate(today.getDate() + 4);
        
        const fiveDaysLater = new Date(today);
        fiveDaysLater.setDate(today.getDate() + 5);
        
        return [
          {
            id: 1,
            candidate: "James Davis",
            type: "A320 Skill Test",
            date: today.toISOString(),
            time: "14:00",
            status: "today"
          },
          {
            id: 2,
            candidate: "Emily Wilson",
            type: "A320 Skill Test",
            date: twoDaysLater.toISOString(),
            time: "09:00",
            status: "scheduled"
          },
          {
            id: 3,
            candidate: "Michael Johnson",
            type: "B737 OPC",
            date: threeDaysLater.toISOString(),
            time: "13:00",
            status: "scheduled"
          },
          {
            id: 4,
            candidate: "David Lee",
            type: "A320 Line Check",
            date: fourDaysLater.toISOString(),
            time: "08:00",
            status: "scheduled"
          },
          {
            id: 5,
            candidate: "Sandra Martinez",
            type: "B737 Skill Test",
            date: fiveDaysLater.toISOString(),
            time: "14:30",
            status: "scheduled"
          },
        ];
      }
    },
  });

  // Fetch recent examination results
  const { data: recentResults, isLoading: isResultsLoading } = useQuery({
    queryKey: ['/api/examiner/recent-results'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/examiner/recent-results');
        return await response.json();
      } catch (error) {
        // Return mock data for development
        const date18 = new Date();
        date18.setDate(date18.getDate() - 4);
        
        const date17 = new Date();
        date17.setDate(date17.getDate() - 5);
        
        const date16 = new Date();
        date16.setDate(date16.getDate() - 6);
        
        const date15 = new Date();
        date15.setDate(date15.getDate() - 7);
        
        const date12 = new Date();
        date12.setDate(date12.getDate() - 10);
        
        const date10 = new Date();
        date10.setDate(date10.getDate() - 12);
        
        return [
          {
            id: 1,
            candidate: "Sarah Phillips",
            type: "A320 OPC",
            date: date18.toISOString(),
            result: "PASS"
          },
          {
            id: 2,
            candidate: "Robert Chen",
            type: "B737 Skill Test",
            date: date17.toISOString(),
            result: "PASS"
          },
          {
            id: 3,
            candidate: "John Williams",
            type: "A320 Line Check",
            date: date16.toISOString(),
            result: "PASS"
          },
          {
            id: 4,
            candidate: "Lisa Johnson",
            type: "B737 OPC",
            date: date12.toISOString(),
            result: "PARTIAL PASS"
          },
          {
            id: 5,
            candidate: "Thomas Miller",
            type: "A320 Skill Test",
            date: date10.toISOString(),
            result: "PASS"
          },
        ];
      }
    },
  });

  // Fetch regulatory compliance
  const { data: compliance, isLoading: isComplianceLoading } = useQuery({
    queryKey: ['/api/examiner/compliance'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/examiner/compliance');
        return await response.json();
      } catch (error) {
        // Return mock data for development
        return [
          {
            id: 1,
            title: "EASA Part-FCL TRE Authorization",
            aircraft: "A320",
            validUntil: "Oct 25, 2025",
            status: "active"
          },
          {
            id: 2,
            title: "EASA Part-FCL SFE Authorization",
            aircraft: "B737",
            validUntil: "Oct 25, 2025",
            status: "active"
          },
        ];
      }
    },
  });

  // Fetch standardization statistics
  const { data: standardization, isLoading: isStandardizationLoading } = useQuery({
    queryKey: ['/api/examiner/standardization'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/examiner/standardization');
        return await response.json();
      } catch (error) {
        // Return mock data for development
        return {
          areas: ["FMS", "SOP", "T/O", "APP", "LDG", "NPA", "ABNM", "EMRG", "CRM"],
          atoStandard: [92, 95, 90, 94, 95, 89, 92, 95, 90],
          examinerRates: [95, 94, 88, 96, 93, 90, 95, 92, 88]
        };
      }
    },
  });

  // Loading state
  if (isProfileLoading || isExamsLoading || isResultsLoading || isComplianceLoading || isStandardizationLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Format functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Calculate days difference
  const getDaysDifference = (dateString: string) => {
    const today = new Date();
    const targetDate = new Date(dateString);
    
    // Reset hours to compare just the dates
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);
    
    // Calculate difference in days
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  return (
    <div className="container mx-auto py-6">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Examiner Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {examinerProfile?.qualifications} • {examinerProfile?.aircraft} • Authority: {examinerProfile?.authority}
            </p>
          </div>
          <div className="flex items-center mt-4 md:mt-0">
            <Badge variant="outline" className="flex gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              <span>Authority visit: Apr 15</span>
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Upcoming Tests */}
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">Upcoming Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{examinerProfile?.upcomingTests}</div>
                <div className="text-xs font-medium bg-white/20 px-2 py-1 rounded">
                  this week
                </div>
              </div>
              <Progress 
                value={100} 
                className="h-1.5 mt-3 bg-white/20" 
              />
              <div className="flex items-center mt-2 text-xs text-purple-100">
                <span>Next: A320/B737</span>
              </div>
            </CardContent>
          </Card>

          {/* Authority Reports */}
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">Authority Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{examinerProfile?.pendingReports}</div>
                <div className="text-xs font-medium bg-amber-300 text-amber-800 px-2 py-1 rounded">
                  Due in 5 days
                </div>
              </div>
              <Progress 
                value={40} 
                className="h-1.5 mt-3 bg-white/20" 
              />
              <div className="flex items-center mt-2 text-xs text-purple-100">
                <span>pending</span>
              </div>
            </CardContent>
          </Card>

          {/* Quality Monitoring */}
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">Quality Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{examinerProfile?.qualityCompliance}%</div>
                <div className="text-xs font-medium bg-white/20 px-2 py-1 rounded">
                  compliant
                </div>
              </div>
              <Progress 
                value={examinerProfile?.qualityCompliance} 
                className="h-1.5 mt-3 bg-white/20" 
              />
              <div className="flex items-center mt-2 text-xs text-purple-100">
                <span>Last audit: Feb 15</span>
              </div>
            </CardContent>
          </Card>

          {/* Authorizations */}
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-100">Authorizations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">{examinerProfile?.activeAuthorizations}</div>
                <div className="text-xs font-medium bg-white/20 px-2 py-1 rounded">
                  active
                </div>
              </div>
              <Progress 
                value={100} 
                className="h-1.5 mt-3 bg-white/20" 
              />
              <div className="flex items-center mt-2 text-xs text-purple-100">
                <span>Valid until Oct 25</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Upcoming Examinations */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Examinations</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingExams?.map((exam, index) => {
                    const daysDiff = getDaysDifference(exam.date);
                    let statusBadge;
                    
                    if (exam.status === 'today') {
                      statusBadge = <Badge className="bg-purple-500">Today</Badge>;
                    } else {
                      statusBadge = <Badge variant="outline" className="text-muted-foreground">{daysDiff} days</Badge>;
                    }
                    
                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{exam.candidate}</TableCell>
                        <TableCell>{exam.type}</TableCell>
                        <TableCell>
                          {formatDate(exam.date)}, {exam.time}
                        </TableCell>
                        <TableCell className="text-right">{statusBadge}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Recent Examination Results */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Examination Results</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Result</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentResults?.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{result.candidate}</TableCell>
                      <TableCell>{result.type}</TableCell>
                      <TableCell>{formatDate(result.date)}</TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          className={
                            result.result === 'PASS' ? 'bg-green-500' : 
                            result.result === 'PARTIAL PASS' ? 'bg-amber-500' : 
                            'bg-red-500'
                          }
                        >
                          {result.result}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Regulatory Compliance */}
          <Card>
            <CardHeader>
              <CardTitle>Regulatory Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {compliance?.map((item, index) => (
                  <div key={index} className="p-4 border border-purple-200 bg-purple-50/50 rounded-lg">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                      <div>
                        <h3 className="font-medium text-purple-900">{item.title}</h3>
                        <p className="text-sm text-purple-700">{item.aircraft} • Valid until {item.validUntil}</p>
                      </div>
                      <Badge className="bg-purple-500 self-start">Active</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Standardization Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-purple-600" />
                Standardization Statistics
              </CardTitle>
              <CardDescription>Pass Rate Distribution by Area</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={standardization?.areas.map((area, i) => ({
                        name: area,
                        value: standardization.examinerRates[i],
                        standard: standardization.atoStandard[i]
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      innerRadius={40}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {standardization?.areas.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={[
                            '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', 
                            '#ede9fe', '#7c3aed', '#6d28d9', '#5b21b6'
                          ][index % 8]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => {
                        return [`${value}% (Your Rate) / ${props.payload.standard}% (ATO)`, name];
                      }}
                    />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-4 px-6">
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link to="/standardization-details">
                  View Detailed Statistics
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}