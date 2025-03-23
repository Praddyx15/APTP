// src/frontend/components/AnalyticsDashboard/AnalyticsDashboard.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { 
  Download, 
  Calendar, 
  Filter, 
  RefreshCw, 
  Users, 
  UserCheck,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  User,
  ArrowUp,
  ArrowDown,
  BarChart2,
  PieChart as PieChartIcon
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

// Types
export interface Trainee {
  id: string;
  name: string;
  avatarUrl?: string;
  position?: string;
  department?: string;
  status: 'active' | 'completed' | 'on-leave' | 'pending';
  completionPercentage: number;
  performance: number; // Overall performance score (0-100)
  riskStatus: 'low' | 'medium' | 'high';
  startDate: string;
  estimatedCompletionDate?: string;
}

export interface Instructor {
  id: string;
  name: string;
  avatarUrl?: string;
  department?: string;
  activeTrainees: number;
  completedTrainees: number;
  averageTraineePerformance: number;
}

export interface Module {
  id: string;
  name: string;
  category: string;
  averageScore: number;
  completionRate: number;
  failureRate: number;
  averageCompletionTime: number; // in days
}

export interface CompetencyData {
  id: string;
  name: string;
  category?: string;
  averageScore: number;
  passRate: number;
  trainingGap: number; // Percentage gap between current and target
}

export interface PerformanceTrend {
  date: string;
  averageScore: number;
  completionRate: number;
  failureRate: number;
  activeTrainees: number;
}

export interface ComplianceData {
  regulatoryArea: string;
  complianceRate: number;
  violations: number;
  trend: 'improving' | 'stable' | 'declining';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface TrainingProgram {
  id: string;
  name: string;
  totalTrainees: number;
  activeTrainees: number;
  completedTrainees: number;
  averageCompletionTime: number; // in days
  averagePerformance: number;
  status: 'active' | 'completed' | 'planned';
}

export interface AnalyticsDashboardProps {
  organizationId: string;
  programId?: string;
  trainees?: Trainee[];
  instructors?: Instructor[];
  modules?: Module[];
  competencies?: CompetencyData[];
  trends?: PerformanceTrend[];
  complianceData?: ComplianceData[];
  trainingPrograms?: TrainingProgram[];
  onExportData?: (dataType: string, format: string) => void;
  onFilterChange?: (filters: any) => void;
  onDateRangeChange?: (startDate: string, endDate: string) => void;
  onProgramChange?: (programId: string) => void;
  showComplianceData?: boolean;
  refreshData?: () => void;
}

// Colors
const COLORS = {
  blue: ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'],
  green: ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0'],
  red: ['#dc2626', '#ef4444', '#f87171', '#fca5a5', '#fee2e2'],
  yellow: ['#ca8a04', '#eab308', '#facc15', '#fde047', '#fef08a'],
  purple: ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'],
  gray: ['#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb'],
  primary: '#3b82f6',
  background: '#f9fafb',
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
  info: '#06b6d4',
};

// Helper Components
interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string | number;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  description, 
  icon, 
  trend, 
  trendValue,
  color = COLORS.primary
}) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
            
            {trend && trendValue && (
              <div className="flex items-center mt-2">
                {trend === 'up' ? (
                  <ArrowUp className="h-4 w-4 text-green-500 mr-1" />
                ) : trend === 'down' ? (
                  <ArrowDown className="h-4 w-4 text-red-500 mr-1" />
                ) : null}
                <span className={`text-sm font-medium ${
                  trend === 'up' ? 'text-green-500' : 
                  trend === 'down' ? 'text-red-500' : 
                  'text-gray-500'
                }`}>
                  {trendValue}
                </span>
              </div>
            )}
            
            {description && (
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            )}
          </div>
          
          {icon && (
            <div className="p-2 rounded-full bg-gray-100">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, description, children, action }) => {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-medium">{title}</CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};

// Custom tooltip for charts
const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded-md shadow-md">
        <p className="text-sm font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={`item-${index}`} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }

  return null;
};

// Main Component
const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  organizationId,
  programId,
  trainees = [],
  instructors = [],
  modules = [],
  competencies = [],
  trends = [],
  complianceData = [],
  trainingPrograms = [],
  onExportData,
  onFilterChange,
  onDateRangeChange,
  onProgramChange,
  showComplianceData = true,
  refreshData,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDateRange, setSelectedDateRange] = useState('30d');
  const [selectedProgram, setSelectedProgram] = useState(programId || 'all');
  const [filters, setFilters] = useState({
    status: 'all',
    department: 'all',
    performance: 'all',
  });
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState('all');
  const [exportFormat, setExportFormat] = useState('csv');

  // Calculate statistics
  const stats = useMemo(() => {
    const activeTraineeCount = trainees.filter(t => t.status === 'active').length;
    const completedTraineeCount = trainees.filter(t => t.status === 'completed').length;
    const averageCompletion = trainees.reduce((sum, t) => sum + t.completionPercentage, 0) / (trainees.length || 1);
    const averagePerformance = trainees.reduce((sum, t) => sum + t.performance, 0) / (trainees.length || 1);
    const atRiskCount = trainees.filter(t => t.riskStatus === 'high').length;
    
    return {
      activeTrainees: activeTraineeCount,
      completedTrainees: completedTraineeCount,
      averageCompletion,
      averagePerformance,
      atRiskTrainees: atRiskCount,
      activeTraineePercentage: (activeTraineeCount / (trainees.length || 1)) * 100,
    };
  }, [trainees]);

  // Calculate competency statistics
  const competencyStats = useMemo(() => {
    const categories = [...new Set(competencies.map(c => c.category || 'Uncategorized'))];
    const categoryStats = categories.map(category => {
      const categoryCompetencies = competencies.filter(c => (c.category || 'Uncategorized') === category);
      const averageScore = categoryCompetencies.reduce((sum, c) => sum + c.averageScore, 0) / (categoryCompetencies.length || 1);
      const passRate = categoryCompetencies.reduce((sum, c) => sum + c.passRate, 0) / (categoryCompetencies.length || 1);
      
      return {
        category,
        averageScore,
        passRate,
        count: categoryCompetencies.length,
      };
    });
    
    return categoryStats;
  }, [competencies]);

  // Prepare performance trend data
  const performanceTrendData = useMemo(() => {
    return trends.map(trend => ({
      date: new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: trend.averageScore,
      completion: trend.completionRate * 100,
      failure: trend.failureRate * 100,
      trainees: trend.activeTrainees,
    }));
  }, [trends]);

  // Calculate module performance data
  const modulePerformanceData = useMemo(() => {
    return modules.slice(0, 10).map(module => ({
      name: module.name,
      score: module.averageScore,
      completion: module.completionRate * 100,
      failure: module.failureRate * 100,
    }));
  }, [modules]);

  // Prepare trainee risk distribution data
  const traineeRiskData = useMemo(() => {
    const lowRisk = trainees.filter(t => t.riskStatus === 'low').length;
    const mediumRisk = trainees.filter(t => t.riskStatus === 'medium').length;
    const highRisk = trainees.filter(t => t.riskStatus === 'high').length;
    
    return [
      { name: 'Low Risk', value: lowRisk, color: COLORS.green[0] },
      { name: 'Medium Risk', value: mediumRisk, color: COLORS.yellow[0] },
      { name: 'High Risk', value: highRisk, color: COLORS.red[0] },
    ];
  }, [trainees]);

  // Prepare competency radar data
  const competencyRadarData = useMemo(() => {
    return competencies.slice(0, 8).map(comp => ({
      subject: comp.name,
      score: comp.averageScore,
      gap: comp.trainingGap,
    }));
  }, [competencies]);

  // Prepare top performing trainees
  const topPerformers = useMemo(() => {
    return trainees
      .filter(t => t.status === 'active')
      .sort((a, b) => b.performance - a.performance)
      .slice(0, 5);
  }, [trainees]);

  // Prepare at-risk trainees
  const atRiskTrainees = useMemo(() => {
    return trainees
      .filter(t => t.riskStatus === 'high' && t.status === 'active')
      .slice(0, 5);
  }, [trainees]);

  // Prepare instructor performance data
  const instructorPerformance = useMemo(() => {
    return instructors
      .sort((a, b) => b.averageTraineePerformance - a.averageTraineePerformance)
      .slice(0, 5);
  }, [instructors]);

  // Handle date range change
  const handleDateRangeChange = (range: string) => {
    setSelectedDateRange(range);
    
    // Calculate dates based on range
    const endDate = new Date();
    let startDate = new Date();
    
    switch (range) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }
    
    if (onDateRangeChange) {
      onDateRangeChange(startDate.toISOString(), endDate.toISOString());
    }
  };

  // Handle program change
  const handleProgramChange = (program: string) => {
    setSelectedProgram(program);
    
    if (onProgramChange) {
      onProgramChange(program);
    }
  };

  // Handle filter change
  const handleFilterChange = (filterType: string, value: string) => {
    const newFilters = { ...filters, [filterType]: value };
    setFilters(newFilters);
    
    if (onFilterChange) {
      onFilterChange(newFilters);
    }
  };

  // Handle export data
  const handleExportData = () => {
    if (onExportData) {
      onExportData(exportType, exportFormat);
    }
    setIsExportDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-500">
            Training performance metrics and insights
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={selectedDateRange} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-36">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          
          {trainingPrograms.length > 0 && (
            <Select value={selectedProgram} onValueChange={handleProgramChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {trainingPrograms.map(program => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter Data</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <div className="p-2">
                <Label className="text-xs mb-1 block">Status</Label>
                <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on-leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="p-2">
                <Label className="text-xs mb-1 block">Department</Label>
                <Select value={filters.department} onValueChange={(v) => handleFilterChange('department', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="flight-ops">Flight Operations</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="cabin-crew">Cabin Crew</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="p-2">
                <Label className="text-xs mb-1 block">Performance</Label>
                <Select value={filters.performance} onValueChange={(v) => handleFilterChange('performance', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Performance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Performance</SelectItem>
                    <SelectItem value="high">High (80%+)</SelectItem>
                    <SelectItem value="medium">Medium (60-80%)</SelectItem>
                    <SelectItem value="low">Low (Below 60%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="outline" onClick={() => setIsExportDialogOpen(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          {refreshData && (
            <Button variant="ghost" size="icon" onClick={refreshData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trainees">Trainees</TabsTrigger>
          <TabsTrigger value="competencies">Competencies</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          {showComplianceData && (
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              title="Active Trainees"
              value={stats.activeTrainees}
              description={`${stats.activeTraineePercentage.toFixed(1)}% of total`}
              icon={<Users className="h-5 w-5 text-blue-500" />}
              color={COLORS.blue[0]}
            />
            
            <StatCard
              title="Completed Training"
              value={stats.completedTrainees}
              icon={<UserCheck className="h-5 w-5 text-green-500" />}
              color={COLORS.green[0]}
            />
            
            <StatCard
              title="Average Score"
              value={`${stats.averagePerformance.toFixed(1)}%`}
              trend={stats.averagePerformance > 75 ? 'up' : 'down'}
              trendValue="5.2% vs. last period"
              icon={<BarChart2 className="h-5 w-5 text-blue-500" />}
              color={COLORS.primary}
            />
            
            <StatCard
              title="At-Risk Trainees"
              value={stats.atRiskTrainees}
              description="Requiring intervention"
              icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
              color={COLORS.red[0]}
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <ChartCard 
              title="Performance Trends" 
              description="Score and completion rates over time"
            >
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceTrendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="score" 
                      name="Avg. Score" 
                      stroke={COLORS.blue[0]} 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="completion" 
                      name="Completion Rate" 
                      stroke={COLORS.green[0]} 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="trainees" 
                      name="Active Trainees" 
                      stroke={COLORS.purple[0]} 
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            
            <ChartCard 
              title="Top Module Performance" 
              description="Average scores and completion rates by module"
            >
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modulePerformanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" width={150} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="score" name="Avg. Score" fill={COLORS.blue[0]} barSize={10} />
                    <Bar dataKey="completion" name="Completion %" fill={COLORS.green[0]} barSize={10} />
                    <Bar dataKey="failure" name="Failure %" fill={COLORS.red[0]} barSize={10} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartCard title="Trainee Risk Distribution">
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={traineeRiskData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {traineeRiskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            
            <ChartCard title="Competency Coverage">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={competencyRadarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar 
                      name="Score" 
                      dataKey="score" 
                      stroke={COLORS.blue[0]} 
                      fill={COLORS.blue[0]} 
                      fillOpacity={0.5} 
                    />
                    <Tooltip />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Top Performers</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {topPerformers.map((trainee) => (
                      <TableRow key={trainee.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={trainee.avatarUrl} alt={trainee.name} />
                              <AvatarFallback>{trainee.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{trainee.name}</p>
                              <p className="text-xs text-gray-500">{trainee.position}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end">
                            <Badge className="bg-green-500">{trainee.performance}%</Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="trainees">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <ChartCard title="Trainee Status Distribution">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active', value: stats.activeTrainees, color: COLORS.blue[0] },
                        { name: 'Completed', value: stats.completedTrainees, color: COLORS.green[0] },
                        { name: 'On Leave', value: trainees.filter(t => t.status === 'on-leave').length, color: COLORS.yellow[0] },
                        { name: 'Pending', value: trainees.filter(t => t.status === 'pending').length, color: COLORS.gray[0] },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {['blue', 'green', 'yellow', 'gray'].map((color, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[color as keyof typeof COLORS][0]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            
            <ChartCard title="Progress Distribution">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={[
                      { range: '0-25%', count: trainees.filter(t => t.completionPercentage <= 25).length },
                      { range: '26-50%', count: trainees.filter(t => t.completionPercentage > 25 && t.completionPercentage <= 50).length },
                      { range: '51-75%', count: trainees.filter(t => t.completionPercentage > 50 && t.completionPercentage <= 75).length },
                      { range: '76-99%', count: trainees.filter(t => t.completionPercentage > 75 && t.completionPercentage < 100).length },
                      { range: '100%', count: trainees.filter(t => t.completionPercentage === 100).length },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" name="Trainees" fill={COLORS.blue[0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            
            <ChartCard title="At-Risk Trainees">
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableBody>
                    {atRiskTrainees.length > 0 ? atRiskTrainees.map((trainee) => (
                      <TableRow key={trainee.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={trainee.avatarUrl} alt={trainee.name} />
                              <AvatarFallback>{trainee.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{trainee.name}</p>
                              <p className="text-xs text-gray-500">{trainee.position}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive">{trainee.performance}%</Badge>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-gray-500">
                          No at-risk trainees found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </ChartCard>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Trainee List</CardTitle>
              <div className="flex gap-2">
                <Input placeholder="Search trainees..." className="w-64" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on-leave">On Leave</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trainee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Start Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainees.slice(0, 10).map((trainee) => (
                    <TableRow key={trainee.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={trainee.avatarUrl} alt={trainee.name} />
                            <AvatarFallback>{trainee.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{trainee.name}</p>
                            <p className="text-xs text-gray-500">{trainee.position}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{trainee.department || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          trainee.status === 'active' ? 'default' :
                          trainee.status === 'completed' ? 'success' :
                          trainee.status === 'on-leave' ? 'warning' :
                          'outline'
                        }>
                          {trainee.status.charAt(0).toUpperCase() + trainee.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={trainee.completionPercentage} className="h-2 w-24" />
                          <span className="text-sm">{trainee.completionPercentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${
                          trainee.performance >= 80 ? 'bg-green-500' :
                          trainee.performance >= 60 ? 'bg-blue-500' :
                          'bg-red-500'
                        }`}>
                          {trainee.performance}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          trainee.riskStatus === 'low' ? 'success' :
                          trainee.riskStatus === 'medium' ? 'warning' :
                          'destructive'
                        }>
                          {trainee.riskStatus.charAt(0).toUpperCase() + trainee.riskStatus.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(trainee.startDate).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-between py-4">
              <div className="text-sm text-gray-500">
                Showing 1-10 of {trainees.length} trainees
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="competencies">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <ChartCard title="Competency Performance" description="Average scores by competency category">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={competencyStats}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="category" width={120} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="averageScore" name="Avg. Score" fill={COLORS.blue[0]} barSize={10} />
                    <Bar dataKey="passRate" name="Pass Rate" fill={COLORS.green[0]} barSize={10} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            
            <ChartCard title="Competency Radar" description="Performance across key competencies">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={competencyRadarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar 
                      name="Score" 
                      dataKey="score" 
                      stroke={COLORS.blue[0]} 
                      fill={COLORS.blue[0]} 
                      fillOpacity={0.5} 
                    />
                    <Radar 
                      name="Gap" 
                      dataKey="gap" 
                      stroke={COLORS.red[0]} 
                      fill={COLORS.red[0]} 
                      fillOpacity={0.3} 
                    />
                    <Tooltip />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Competency List</CardTitle>
              <div className="flex gap-2">
                <Input placeholder="Search competencies..." className="w-64" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {competencyStats.map(stat => (
                      <SelectItem key={stat.category} value={stat.category}>
                        {stat.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competency</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Average Score</TableHead>
                    <TableHead>Pass Rate</TableHead>
                    <TableHead>Training Gap</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competencies.slice(0, 10).map((comp) => (
                    <TableRow key={comp.id}>
                      <TableCell>
                        <div className="font-medium">{comp.name}</div>
                      </TableCell>
                      <TableCell>{comp.category || 'Uncategorized'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={comp.averageScore} 
                            className="h-2 w-24"
                            style={{
                              backgroundColor: comp.averageScore >= 80 ? COLORS.green[4] : 
                                              comp.averageScore >= 60 ? COLORS.blue[4] : 
                                              COLORS.red[4],
                              color: comp.averageScore >= 80 ? COLORS.green[0] : 
                                    comp.averageScore >= 60 ? COLORS.blue[0] : 
                                    COLORS.red[0],
                            }}
                          />
                          <span className="text-sm">{comp.averageScore.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${
                          comp.passRate >= 90 ? 'bg-green-500' :
                          comp.passRate >= 70 ? 'bg-blue-500' :
                          'bg-red-500'
                        }`}>
                          {comp.passRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          comp.trainingGap <= 10 ? 'success' :
                          comp.trainingGap <= 20 ? 'warning' :
                          'destructive'
                        }>
                          {comp.trainingGap.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-between py-4">
              <div className="text-sm text-gray-500">
                Showing 1-10 of {competencies.length} competencies
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="modules">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <ChartCard title="Module Performance" description="Average scores and completion rates">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modulePerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="score" name="Avg. Score" fill={COLORS.blue[0]} />
                    <Bar dataKey="completion" name="Completion %" fill={COLORS.green[0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            
            <ChartCard title="Module Completion Time" description="Average days to complete">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={modules.slice(0, 8).map(module => ({
                      name: module.name,
                      days: module.averageCompletionTime
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="days" name="Avg. Days" fill={COLORS.purple[0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Module List</CardTitle>
              <div className="flex gap-2">
                <Input placeholder="Search modules..." className="w-64" />
                <Select defaultValue="all">
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {[...new Set(modules.map(m => m.category))].map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Average Score</TableHead>
                    <TableHead>Completion Rate</TableHead>
                    <TableHead>Failure Rate</TableHead>
                    <TableHead>Avg. Time (days)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modules.slice(0, 10).map((module) => (
                    <TableRow key={module.id}>
                      <TableCell>
                        <div className="font-medium">{module.name}</div>
                      </TableCell>
                      <TableCell>{module.category}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress 
                            value={module.averageScore} 
                            className="h-2 w-24"
                            style={{
                              backgroundColor: module.averageScore >= 80 ? COLORS.green[4] : 
                                              module.averageScore >= 60 ? COLORS.blue[4] : 
                                              COLORS.red[4],
                              color: module.averageScore >= 80 ? COLORS.green[0] : 
                                    module.averageScore >= 60 ? COLORS.blue[0] : 
                                    COLORS.red[0],
                            }}
                          />
                          <span className="text-sm">{module.averageScore.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-500">
                          {(module.completionRate * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          {(module.failureRate * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {module.averageCompletionTime.toFixed(1)} days
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-between py-4">
              <div className="text-sm text-gray-500">
                Showing 1-10 of {modules.length} modules
              </div>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {showComplianceData && (
          <TabsContent value="compliance">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <StatCard
                title="Overall Compliance"
                value={`${complianceData.reduce((sum, item) => sum + item.complianceRate, 0) / (complianceData.length || 1)}%`}
                trend="up"
                trendValue="3.2% vs. last period"
                color={COLORS.green[0]}
                icon={<CheckCircle className="h-5 w-5 text-green-500" />}
              />
              
              <StatCard
                title="Compliance Violations"
                value={complianceData.reduce((sum, item) => sum + item.violations, 0)}
                trend="down"
                trendValue="12.5% vs. last period"
                color={COLORS.red[0]}
                icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
              />
              
              <StatCard
                title="High Risk Areas"
                value={complianceData.filter(item => item.riskLevel === 'high').length}
                description="Requiring immediate attention"
                color={COLORS.yellow[0]}
                icon={<AlertTriangle className="h-5 w-5 text-yellow-500" />}
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <ChartCard title="Compliance by Regulatory Area">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={complianceData}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="regulatoryArea" width={150} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar 
                        dataKey="complianceRate" 
                        name="Compliance Rate" 
                        fill={COLORS.green[0]} 
                        barSize={16}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
              
              <ChartCard title="Compliance Risk Assessment">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={complianceData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="regulatoryArea" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Bar dataKey="violations" name="Violations" fill={COLORS.red[0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Regulatory Compliance Details</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Regulatory Area</TableHead>
                      <TableHead>Compliance Rate</TableHead>
                      <TableHead>Violations</TableHead>
                      <TableHead>Trend</TableHead>
                      <TableHead>Risk Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complianceData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="font-medium">{item.regulatoryArea}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={item.complianceRate} 
                              className="h-2 w-24"
                              style={{
                                backgroundColor: item.complianceRate >= 90 ? COLORS.green[4] : 
                                                item.complianceRate >= 70 ? COLORS.yellow[4] : 
                                                COLORS.red[4],
                                color: item.complianceRate >= 90 ? COLORS.green[0] : 
                                      item.complianceRate >= 70 ? COLORS.yellow[0] : 
                                      COLORS.red[0],
                              }}
                            />
                            <span className="text-sm">{item.complianceRate.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {item.violations}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            item.trend === 'improving' ? 'success' :
                            item.trend === 'stable' ? 'outline' :
                            'destructive'
                          }>
                            {item.trend.charAt(0).toUpperCase() + item.trend.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            item.riskLevel === 'low' ? 'success' :
                            item.riskLevel === 'medium' ? 'warning' :
                            'destructive'
                          }>
                            {item.riskLevel.charAt(0).toUpperCase() + item.riskLevel.slice(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      
      {/* Export Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Analytics Data</DialogTitle>
            <DialogDescription>
              Select the data you want to export and the format
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="export-type" className="mb-2 block">Data to Export</Label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger id="export-type">
                  <SelectValue placeholder="Select data to export" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Data</SelectItem>
                  <SelectItem value="trainees">Trainee Data</SelectItem>
                  <SelectItem value="modules">Module Performance</SelectItem>
                  <SelectItem value="competencies">Competency Data</SelectItem>
                  <SelectItem value="compliance">Compliance Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="export-format" className="mb-2 block">Export Format</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger id="export-format">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="pdf">PDF Report</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExportData}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AnalyticsDashboard;
