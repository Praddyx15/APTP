/**
 * PerformanceAnalytics Component
 * A comprehensive system for tracking and analyzing trainee performance metrics, identifying 
 * strengths and weaknesses, generating progress visualizations, predicting success likelihood
 * for upcoming modules, recommending focused improvement areas, and comparing performance 
 * against peer groups.
 */
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertCircle,
  BarChart3,
  ChevronRight,
  Clock,
  Flame,
  LineChart,
  LucideIcon,
  PieChart,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  LineChart as RechartsLineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip as RechartsTooltip,
  Cell,
} from 'recharts';

// Assessment result interface
export interface AssessmentResult {
  id: string;
  traineeId: number;
  moduleId: string;
  skillIds: string[];
  score: number; // 0-100
  passingScore: number;
  date: string;
  attemptNumber: number;
  questionResults?: QuestionResult[];
}

// Question result interface
export interface QuestionResult {
  questionId: string;
  skillId: string;
  correct: boolean;
  responseTime?: number; // in seconds
  difficulty: 'easy' | 'medium' | 'hard';
}

// Session performance interface
export interface SessionPerformance {
  sessionId: string;
  traineeId: number;
  moduleId: string;
  date: string;
  duration: number; // in minutes
  skillIds: string[];
  instructorId: number;
  objectives: string[];
  completionRate: number; // 0-1
  instructorRating?: number; // 1-5
  comments?: string;
  activities: {
    id: string;
    type: string;
    skillIds: string[];
    performanceRating: number; // 1-5
    notes?: string;
  }[];
}

// Skill definition interface
export interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  difficultyLevel: number; // 1-5
  importanceLevel: number; // 1-5
}

// Module definition interface
export interface Module {
  id: string;
  name: string;
  description: string;
  skillIds: string[];
  requiredHours: number;
  assessmentIds: string[];
  prerequisiteModuleIds: string[];
  successCriteria: {
    minimumScore: number;
    requiredActivities: string[];
  };
}

// Performance insights interface
export interface PerformanceInsights {
  traineeId: number;
  overview: {
    averageScore: number;
    trendDirection: 'improving' | 'stable' | 'declining';
    percentileRank: number; // 0-100, compared to peers
    progressRate: number; // 0-1, completion rate compared to expected timeline
    estimatedCompletionDate: string;
    onTrack: boolean;
  };
  skillPerformance: SkillPerformance[];
  strengths: string[]; // skill IDs
  weakAreas: SkillGap[];
  recentProgress: {
    period: string;
    moduleIds: string[];
    averageScoreChange: number;
    skillIdsImproved: string[];
    skillIdsDeclined: string[];
  };
  recommendedFocus: {
    skillIds: string[];
    reason: string;
    suggestedActivities: string[];
  }[];
  predictedSuccessRate: {
    upcomingModuleId: string;
    moduleName: string;
    predictedScore: number;
    confidenceLevel: number; // 0-1
    criticalSkillGaps: string[];
  }[];
}

// Skill performance interface
export interface SkillPerformance {
  skillId: string;
  name: string;
  category: string;
  score: number; // 0-100
  assessmentCount: number;
  lastAssessed: string;
  trend: number; // positive or negative change over time
  importance: number; // 1-5
  relativeStrength: boolean; // compared to other skills
}

// Skill gap interface
export interface SkillGap {
  skillId: string;
  name: string;
  category: string;
  currentScore: number;
  targetScore: number;
  gap: number; // target - current
  impact: 'critical' | 'high' | 'medium' | 'low';
  affectedModules: string[]; // module IDs affected by this gap
  recommendedActivities: string[];
}

// Peer comparison result interface
export interface PeerComparisonResult {
  traineeId: number;
  peerGroupSize: number;
  peerGroupCriteria: string;
  overallPerformance: {
    traineeScore: number;
    peerAverage: number;
    percentileRank: number;
    standardDeviations: number; // from the mean
  };
  byModule: {
    moduleId: string;
    name: string;
    traineeScore: number;
    peerAverage: number;
    percentileRank: number;
    performance: 'above' | 'average' | 'below';
  }[];
  bySkill: {
    skillId: string;
    name: string;
    category: string;
    traineeScore: number;
    peerAverage: number;
    percentileRank: number;
    performance: 'above' | 'average' | 'below';
  }[];
  progressRate: {
    traineeRate: number;
    peerAverage: number;
    percentileRank: number;
  };
}

// Performance prediction result
export interface PerformancePredictionResult {
  traineeId: number;
  moduleId: string;
  moduleName: string;
  predictedScore: number;
  confidenceInterval?: {
    min: number;
    max: number;
  };
  confidenceScore: number; // 0-1
  factors: {
    factor: string;
    impact: number; // -1 to 1, negative means negative impact
    description: string;
  }[];
  prerequisiteModules: {
    moduleId: string;
    name: string;
    performance: number;
    impact: number; // 0-1
  }[];
  criticalSkills: {
    skillId: string;
    name: string;
    currentLevel: number;
    requiredLevel: number;
    gap: number;
  }[];
}

// Component props
interface PerformanceAnalyticsProps {
  traineeId?: number;
  programId?: number;
  variant?: 'standard' | 'compact' | 'instructor';
}

export function PerformanceAnalytics({
  traineeId,
  programId,
  variant = 'standard'
}: PerformanceAnalyticsProps) {
  const [selectedTraineeId, setSelectedTraineeId] = useState<number | undefined>(traineeId);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeframe, setSelectedTimeframe] = useState('all');
  const [selectedPeerGroup, setSelectedPeerGroup] = useState('program');
  
  // Fetch performance insights
  const { data: insights, isLoading: isLoadingInsights } = useQuery({
    queryKey: ['/api/performance/insights', selectedTraineeId, selectedTimeframe],
    queryFn: async () => {
      try {
        if (!selectedTraineeId) throw new Error('No trainee selected');
        
        const url = `/api/performance/insights?traineeId=${selectedTraineeId}&timeframe=${selectedTimeframe}`;
        const response = await apiRequest('GET', url);
        return await response.json();
      } catch (error) {
        console.error('Error fetching performance insights:', error);
        
        // For development - return sample data
        return {
          traineeId: 101,
          overview: {
            averageScore: 78,
            trendDirection: 'improving',
            percentileRank: 65,
            progressRate: 0.82,
            estimatedCompletionDate: '2025-07-15',
            onTrack: true
          },
          skillPerformance: [
            {
              skillId: 'skill-001',
              name: 'Aircraft Systems Knowledge',
              category: 'technical',
              score: 85,
              assessmentCount: 3,
              lastAssessed: '2025-03-15',
              trend: 5,
              importance: 5,
              relativeStrength: true
            },
            {
              skillId: 'skill-002',
              name: 'Navigation Principles',
              category: 'technical',
              score: 73,
              assessmentCount: 2,
              lastAssessed: '2025-03-10',
              trend: 3,
              importance: 4,
              relativeStrength: false
            },
            {
              skillId: 'skill-003',
              name: 'Radio Communication',
              category: 'procedural',
              score: 92,
              assessmentCount: 2,
              lastAssessed: '2025-03-12',
              trend: 8,
              importance: 5,
              relativeStrength: true
            },
            {
              skillId: 'skill-004',
              name: 'Aircraft Performance Calculation',
              category: 'technical',
              score: 65,
              assessmentCount: 1,
              lastAssessed: '2025-03-01',
              trend: -2,
              importance: 4,
              relativeStrength: false
            },
            {
              skillId: 'skill-005',
              name: 'Meteorology',
              category: 'knowledge',
              score: 70,
              assessmentCount: 2,
              lastAssessed: '2025-02-28',
              trend: 2,
              importance: 3,
              relativeStrength: false
            },
            {
              skillId: 'skill-006',
              name: 'Emergency Procedures',
              category: 'procedural',
              score: 88,
              assessmentCount: 2,
              lastAssessed: '2025-03-18',
              trend: 6,
              importance: 5,
              relativeStrength: true
            }
          ],
          strengths: ['skill-001', 'skill-003', 'skill-006'],
          weakAreas: [
            {
              skillId: 'skill-004',
              name: 'Aircraft Performance Calculation',
              category: 'technical',
              currentScore: 65,
              targetScore: 80,
              gap: 15,
              impact: 'high',
              affectedModules: ['module-005', 'module-007'],
              recommendedActivities: [
                'Review weight and balance calculations',
                'Practice flight planning with various aircraft loads',
                'Complete additional simulator sessions focusing on performance scenarios'
              ]
            },
            {
              skillId: 'skill-005',
              name: 'Meteorology',
              category: 'knowledge',
              currentScore: 70,
              targetScore: 85,
              gap: 15,
              impact: 'medium',
              affectedModules: ['module-004', 'module-008'],
              recommendedActivities: [
                'Review meteorology textbook chapters 5-7',
                'Complete weather pattern recognition exercises',
                'Practice interpreting METARs and TAFs'
              ]
            }
          ],
          recentProgress: {
            period: 'Last 30 days',
            moduleIds: ['module-002', 'module-003'],
            averageScoreChange: 4.2,
            skillIdsImproved: ['skill-001', 'skill-003', 'skill-006'],
            skillIdsDeclined: ['skill-004']
          },
          recommendedFocus: [
            {
              skillIds: ['skill-004'],
              reason: 'Below target performance with high impact on upcoming modules',
              suggestedActivities: [
                'Schedule extra tutorial on performance calculations',
                'Complete practice exercises 6-10 in the workbook',
                'Arrange simulator session focusing on performance scenarios'
              ]
            },
            {
              skillIds: ['skill-005'],
              reason: 'Knowledge gap in critical area for flight planning',
              suggestedActivities: [
                'Review meteorology study materials',
                'Complete weather interpretation exercises',
                'Schedule review session with instructor'
              ]
            }
          ],
          predictedSuccessRate: [
            {
              upcomingModuleId: 'module-005',
              moduleName: 'Advanced Flight Planning',
              predictedScore: 72,
              confidenceLevel: 0.8,
              criticalSkillGaps: ['skill-004', 'skill-005']
            },
            {
              upcomingModuleId: 'module-006',
              moduleName: 'Advanced Navigation',
              predictedScore: 81,
              confidenceLevel: 0.75,
              criticalSkillGaps: []
            }
          ]
        };
      }
    },
    enabled: !!selectedTraineeId,
  });
  
  // Fetch peer comparison data
  const { data: peerComparison, isLoading: isLoadingPeerComparison } = useQuery({
    queryKey: ['/api/performance/peer-comparison', selectedTraineeId, selectedPeerGroup],
    queryFn: async () => {
      try {
        if (!selectedTraineeId) throw new Error('No trainee selected');
        
        const url = `/api/performance/peer-comparison?traineeId=${selectedTraineeId}&peerGroup=${selectedPeerGroup}`;
        const response = await apiRequest('GET', url);
        return await response.json();
      } catch (error) {
        console.error('Error fetching peer comparison:', error);
        
        // For development - return sample data
        return {
          traineeId: 101,
          peerGroupSize: 24,
          peerGroupCriteria: 'Same training program and start date ±30 days',
          overallPerformance: {
            traineeScore: 78,
            peerAverage: 72,
            percentileRank: 65,
            standardDeviations: 0.5
          },
          byModule: [
            {
              moduleId: 'module-001',
              name: 'Basic Aircraft Systems',
              traineeScore: 85,
              peerAverage: 78,
              percentileRank: 72,
              performance: 'above'
            },
            {
              moduleId: 'module-002',
              name: 'Flight Principles',
              traineeScore: 79,
              peerAverage: 75,
              percentileRank: 61,
              performance: 'above'
            },
            {
              moduleId: 'module-003',
              name: 'Aviation Regulations',
              traineeScore: 71,
              peerAverage: 74,
              percentileRank: 42,
              performance: 'below'
            }
          ],
          bySkill: [
            {
              skillId: 'skill-001',
              name: 'Aircraft Systems Knowledge',
              category: 'technical',
              traineeScore: 85,
              peerAverage: 76,
              percentileRank: 78,
              performance: 'above'
            },
            {
              skillId: 'skill-002',
              name: 'Navigation Principles',
              category: 'technical',
              traineeScore: 73,
              peerAverage: 72,
              percentileRank: 52,
              performance: 'average'
            },
            {
              skillId: 'skill-003',
              name: 'Radio Communication',
              category: 'procedural',
              traineeScore: 92,
              peerAverage: 81,
              percentileRank: 86,
              performance: 'above'
            },
            {
              skillId: 'skill-004',
              name: 'Aircraft Performance Calculation',
              category: 'technical',
              traineeScore: 65,
              peerAverage: 68,
              percentileRank: 38,
              performance: 'below'
            }
          ],
          progressRate: {
            traineeRate: 0.82,
            peerAverage: 0.78,
            percentileRank: 62
          }
        };
      }
    },
    enabled: !!selectedTraineeId,
  });
  
  // Fetch trainees if traineeId is not provided
  const { data: trainees, isLoading: isLoadingTrainees } = useQuery({
    queryKey: ['/api/trainees', programId],
    queryFn: async () => {
      try {
        const url = programId 
          ? `/api/trainees?programId=${programId}` 
          : '/api/trainees';
          
        const response = await apiRequest('GET', url);
        return await response.json();
      } catch (error) {
        console.error('Error fetching trainees:', error);
        
        // For development - return sample data
        return [
          { id: 101, firstName: 'John', lastName: 'Smith', programId: 1, programName: 'Commercial Pilot License' },
          { id: 102, firstName: 'Emma', lastName: 'Johnson', programId: 1, programName: 'Commercial Pilot License' },
          { id: 103, firstName: 'Michael', lastName: 'Williams', programId: 1, programName: 'Commercial Pilot License' },
          { id: 104, firstName: 'Sophia', lastName: 'Brown', programId: 2, programName: 'Private Pilot License' }
        ];
      }
    },
    enabled: !traineeId,
  });
  
  // Set initial trainee if trainees are loaded and no trainee is selected
  React.useEffect(() => {
    if (!selectedTraineeId && trainees && trainees.length > 0) {
      setSelectedTraineeId(trainees[0].id);
    }
  }, [selectedTraineeId, trainees]);
  
  // Get performance trend indicator
  const getTrendIndicator = (trend: number | string, size: 'sm' | 'md' = 'md') => {
    let numericTrend: number;
    
    if (typeof trend === 'string') {
      switch (trend) {
        case 'improving':
          numericTrend = 1;
          break;
        case 'declining':
          numericTrend = -1;
          break;
        default: // stable
          numericTrend = 0;
          break;
      }
    } else {
      numericTrend = trend;
    }
    
    if (numericTrend > 0) {
      return (
        <div className={`flex items-center text-green-500 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          <TrendingUp className={size === 'sm' ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-1'} />
          {typeof trend === 'number' && <span>+{trend}%</span>}
          {typeof trend === 'string' && <span>Improving</span>}
        </div>
      );
    } else if (numericTrend < 0) {
      return (
        <div className={`flex items-center text-red-500 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          <TrendingDown className={size === 'sm' ? 'h-3 w-3 mr-1' : 'h-4 w-4 mr-1'} />
          {typeof trend === 'number' && <span>{trend}%</span>}
          {typeof trend === 'string' && <span>Declining</span>}
        </div>
      );
    } else {
      return (
        <div className={`flex items-center text-yellow-500 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          <span className={size === 'sm' ? 'h-3 mr-1' : 'h-4 mr-1'}>→</span>
          <span>Stable</span>
        </div>
      );
    }
  };
  
  // Get performance status badge
  const getPerformanceBadge = (performance: 'above' | 'average' | 'below') => {
    switch (performance) {
      case 'above':
        return <Badge className="bg-green-500">Above Average</Badge>;
      case 'average':
        return <Badge className="bg-blue-500">Average</Badge>;
      case 'below':
        return <Badge className="bg-yellow-500">Below Average</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  // Get impact badge
  const getImpactBadge = (impact: 'critical' | 'high' | 'medium' | 'low') => {
    switch (impact) {
      case 'critical':
        return <Badge className="bg-red-500">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'low':
        return <Badge className="bg-blue-500">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };
  
  // Build radial data for skills radar
  const getSkillsRadarData = useMemo(() => {
    if (!insights) return [];
    
    return insights.skillPerformance.map(skill => ({
      skill: skill.name,
      score: skill.score,
      average: 75, // Mock peer average
    }));
  }, [insights]);
  
  // Build historical trends data
  const getHistoricalTrendsData = useMemo(() => {
    if (!insights) return [];
    
    // Mock historical data for visualization
    return [
      { month: 'Nov', score: 68, peerAverage: 70 },
      { month: 'Dec', score: 72, peerAverage: 71 },
      { month: 'Jan', score: 71, peerAverage: 72 },
      { month: 'Feb', score: 75, peerAverage: 73 },
      { month: 'Mar', score: 78, peerAverage: 74 }
    ];
  }, [insights]);
  
  // Get the predicted success data for visualization
  const getPredictedSuccessData = useMemo(() => {
    if (!insights?.predictedSuccessRate) return [];
    
    return insights.predictedSuccessRate.map(prediction => ({
      module: prediction.moduleName,
      predicted: prediction.predictedScore,
      minimum: 70 // Assuming passing score
    }));
  }, [insights]);
  
  // Get strengths and weaknesses data for visualization
  const getStrengthsWeaknessesData = useMemo(() => {
    if (!insights) return { strengths: [], weaknesses: [] };
    
    const strengths = insights.skillPerformance
      .filter(skill => insights.strengths.includes(skill.skillId))
      .map(skill => ({
        name: skill.name,
        score: skill.score,
        trend: skill.trend
      }));
    
    const weaknesses = insights.weakAreas.map(area => ({
      name: area.name,
      score: area.currentScore,
      gap: area.gap,
      impact: area.impact
    }));
    
    return { strengths, weaknesses };
  }, [insights]);
  
  // If compact view, show simplified UI
  if (variant === 'compact') {
    return (
      <Card className="border-2 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center">
            <BarChart3 className="w-4 h-4 mr-2 text-primary" />
            Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingInsights ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : insights ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{insights.overview.averageScore}%</div>
                {getTrendIndicator(insights.overview.trendDirection)}
              </div>
              
              <Progress
                value={insights.overview.averageScore}
                className="h-2"
                color={
                  insights.overview.averageScore >= 85 ? "bg-green-500" :
                  insights.overview.averageScore >= 70 ? "bg-blue-500" :
                  "bg-yellow-500"
                }
              />
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>Percentile: {insights.overview.percentileRank}</div>
                <div>Est. completion: {formatDate(insights.overview.estimatedCompletionDate)}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-4 text-center">
              No performance data available
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs"
            onClick={() => window.open('/performance', '_blank')}
          >
            View Full Analysis
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // If instructor view, show a slightly different UI focused on trainee selection
  if (variant === 'instructor') {
    return (
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2 text-primary" />
            Trainee Performance Analytics
          </CardTitle>
          <CardDescription>
            Analyze trainee performance, identify strengths and weaknesses
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-b p-4 bg-muted/30 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4 items-center">
              <div>
                <label className="text-sm font-medium block mb-1">Trainee</label>
                <Select 
                  value={selectedTraineeId?.toString()} 
                  onValueChange={(value) => setSelectedTraineeId(parseInt(value))}
                  disabled={isLoadingTrainees}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select trainee" />
                  </SelectTrigger>
                  <SelectContent>
                    {trainees?.map((trainee: any) => (
                      <SelectItem key={trainee.id} value={trainee.id.toString()}>
                        {trainee.firstName} {trainee.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-1">Timeframe</label>
                <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Select timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="recent">Last 90 Days</SelectItem>
                    <SelectItem value="month">Current Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {insights && (
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="text-muted-foreground">Overall Score:</span>{' '}
                  <span className="font-medium">{insights.overview.averageScore}%</span>
                  <span className="ml-2">
                    {getTrendIndicator(insights.overview.trendDirection, 'sm')}
                  </span>
                </div>
                
                <Badge className={insights.overview.onTrack ? 'bg-green-500' : 'bg-yellow-500'}>
                  {insights.overview.onTrack ? 'On Track' : 'Needs Attention'}
                </Badge>
              </div>
            )}
          </div>
          
          {isLoadingInsights ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : insights ? (
            <Tabs defaultValue="strengths" className="w-full">
              <div className="border-b">
                <div className="px-4">
                  <TabsList className="h-10">
                    <TabsTrigger value="strengths">Strengths</TabsTrigger>
                    <TabsTrigger value="weaknesses">Improvement Areas</TabsTrigger>
                    <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                    <TabsTrigger value="predictions">Predictions</TabsTrigger>
                  </TabsList>
                </div>
              </div>
              
              <TabsContent value="strengths" className="p-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Key Strengths</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getStrengthsWeaknessesData.strengths.map((strength, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardHeader className="p-4 pb-2 bg-gradient-to-r from-green-500/10 to-green-600/5">
                          <CardTitle className="text-base">{strength.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                          <div className="flex justify-between items-center">
                            <div className="text-2xl font-bold">{strength.score}%</div>
                            {getTrendIndicator(strength.trend)}
                          </div>
                          <Progress
                            value={strength.score}
                            className="h-1.5 mt-2"
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="weaknesses" className="p-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Areas Needing Improvement</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getStrengthsWeaknessesData.weaknesses.map((weakness, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardHeader className="p-4 pb-2 bg-gradient-to-r from-yellow-500/10 to-yellow-600/5">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-base">{weakness.name}</CardTitle>
                            {getImpactBadge(weakness.impact as any)}
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                          <div className="flex justify-between items-center">
                            <div className="text-sm">Current: <span className="font-bold">{weakness.score}%</span></div>
                            <div className="text-sm">Target: <span className="font-bold">{weakness.score + weakness.gap}%</span></div>
                          </div>
                          <div className="relative pt-4">
                            <Progress
                              value={(weakness.score / (weakness.score + weakness.gap)) * 100}
                              className="h-2"
                            />
                            <div className="absolute right-0 top-0 border-l border-dashed border-primary h-8"></div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Gap: {weakness.gap}% points to reach target
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="recommendations" className="p-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Recommended Focus Areas</h3>
                  
                  <div className="space-y-4">
                    {insights.recommendedFocus.map((recommendation, index) => (
                      <Card key={index}>
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-base flex items-center">
                            <Target className="w-4 h-4 mr-2 text-primary" />
                            {recommendation.skillIds.map(skillId => {
                              const skill = insights.skillPerformance.find(s => s.skillId === skillId);
                              return skill?.name || skillId;
                            }).join(', ')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                          <p className="text-sm text-muted-foreground mb-3">
                            {recommendation.reason}
                          </p>
                          <div className="bg-muted rounded-md p-3">
                            <h4 className="text-sm font-medium mb-2">Suggested Activities:</h4>
                            <ul className="text-sm space-y-1 list-disc list-inside">
                              {recommendation.suggestedActivities.map((activity, idx) => (
                                <li key={idx}>{activity}</li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="predictions" className="p-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Performance Predictions</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insights.predictedSuccessRate.map((prediction, index) => (
                      <Card key={index} className={
                        prediction.predictedScore >= 80 ? 'border-green-500/50' :
                        prediction.predictedScore >= 70 ? 'border-yellow-500/50' :
                        'border-red-500/50'
                      }>
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-base">{prediction.moduleName}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                          <div className="flex justify-between items-center">
                            <div className="text-2xl font-bold">{prediction.predictedScore}%</div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Confidence:</span>{' '}
                              <span>{Math.round(prediction.confidenceLevel * 100)}%</span>
                            </div>
                          </div>
                          <Progress
                            value={prediction.predictedScore}
                            className="h-2 mt-2"
                            color={
                              prediction.predictedScore >= 80 ? "bg-green-500" :
                              prediction.predictedScore >= 70 ? "bg-yellow-500" :
                              "bg-red-500"
                            }
                          />
                          
                          {prediction.criticalSkillGaps.length > 0 && (
                            <div className="mt-3">
                              <div className="text-xs text-muted-foreground mb-1">Critical skill gaps:</div>
                              <div className="flex flex-wrap gap-1">
                                {prediction.criticalSkillGaps.map(skillId => {
                                  const skill = insights.skillPerformance.find(s => s.skillId === skillId);
                                  return (
                                    <Badge key={skillId} variant="outline" className="text-xs">
                                      {skill?.name || skillId}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <h3 className="text-lg font-medium mb-2">No Trainee Selected</h3>
              <p className="text-sm text-muted-foreground max-w-md text-center">
                Select a trainee from the dropdown to view their performance analytics.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
  
  // Full standard view
  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center">
          <BarChart3 className="w-6 h-6 mr-2 text-primary" />
          Performance Analytics
        </CardTitle>
        <CardDescription>
          Comprehensive analysis of training performance, strengths, and areas for improvement
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="border-b p-4 bg-muted/30 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4 items-center">
            {!traineeId && (
              <div>
                <label className="text-sm font-medium block mb-1">Trainee</label>
                <Select 
                  value={selectedTraineeId?.toString()} 
                  onValueChange={(value) => setSelectedTraineeId(parseInt(value))}
                  disabled={isLoadingTrainees}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select trainee" />
                  </SelectTrigger>
                  <SelectContent>
                    {trainees?.map((trainee: any) => (
                      <SelectItem key={trainee.id} value={trainee.id.toString()}>
                        {trainee.firstName} {trainee.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium block mb-1">Timeframe</label>
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="recent">Last 90 Days</SelectItem>
                  <SelectItem value="month">Current Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium block mb-1">Peer Comparison</label>
              <Select value={selectedPeerGroup} onValueChange={setSelectedPeerGroup}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select peer group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="program">Same Program</SelectItem>
                  <SelectItem value="cohort">Same Cohort</SelectItem>
                  <SelectItem value="level">Same Experience Level</SelectItem>
                  <SelectItem value="all">All Trainees</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {isLoadingInsights || isLoadingPeerComparison ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading performance data...</p>
            </div>
          </div>
        ) : !insights ? (
          <div className="flex flex-col items-center justify-center py-16">
            <User className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-medium mb-2">No Performance Data</h3>
            <p className="text-sm text-muted-foreground max-w-md text-center mb-6">
              {selectedTraineeId 
                ? "No performance data is available for this trainee."
                : "Select a trainee to view performance analytics."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-0.5 border-b">
              {/* Performance Score */}
              <div className="p-6 border-r">
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-sm text-muted-foreground mb-2">Overall Performance</div>
                  <div className="text-4xl font-bold mb-2">{insights.overview.averageScore}%</div>
                  <div className="flex items-center mb-3">
                    {getTrendIndicator(insights.overview.trendDirection)}
                  </div>
                  <div className="w-full">
                    <Progress value={insights.overview.averageScore} className="h-2" />
                  </div>
                  <div className="flex items-center mt-4 text-sm">
                    <Users className="w-4 h-4 mr-1 text-muted-foreground" />
                    <span className="text-muted-foreground">Percentile Rank: </span>
                    <span className="ml-1 font-medium">{insights.overview.percentileRank}</span>
                  </div>
                </div>
              </div>
              
              {/* Progress Rate */}
              <div className="p-6 border-r">
                <div className="flex flex-col h-full">
                  <div className="text-sm text-muted-foreground mb-1">Progress Rate</div>
                  <div className="text-2xl font-bold mb-1">
                    {Math.round(insights.overview.progressRate * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    of expected progress
                  </div>
                  
                  <div className="mt-auto">
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Est. Completion:</span>
                        <span className="font-medium">{formatDate(insights.overview.estimatedCompletionDate)}</span>
                      </div>
                      <Badge className={insights.overview.onTrack ? 'bg-green-500 w-full justify-center' : 'bg-yellow-500 w-full justify-center'}>
                        {insights.overview.onTrack ? 'On Track' : 'Attention Needed'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Recent Progress */}
              <div className="p-6 border-r">
                <div className="flex flex-col h-full">
                  <div className="text-sm text-muted-foreground mb-1">Recent Progress</div>
                  <div className="flex items-center">
                    <div className="text-2xl font-bold">
                      {insights.recentProgress.averageScoreChange > 0 ? '+' : ''}
                      {insights.recentProgress.averageScoreChange.toFixed(1)}%
                    </div>
                    <div className="ml-2">
                      {insights.recentProgress.averageScoreChange > 0 
                        ? <Badge className="bg-green-500">Improving</Badge>
                        : <Badge className="bg-yellow-500">Needs Focus</Badge>
                      }
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    {insights.recentProgress.period}
                  </div>
                  
                  <div className="mt-auto space-y-2">
                    <div className="flex items-center text-sm">
                      <Flame className="w-4 h-4 mr-1 text-green-500" />
                      <span className="text-muted-foreground">Skills Improved: </span>
                      <span className="ml-1 font-medium">{insights.recentProgress.skillIdsImproved.length}</span>
                    </div>
                    {insights.recentProgress.skillIdsDeclined.length > 0 && (
                      <div className="flex items-center text-sm">
                        <AlertCircle className="w-4 h-4 mr-1 text-yellow-500" />
                        <span className="text-muted-foreground">Skills Declined: </span>
                        <span className="ml-1 font-medium">{insights.recentProgress.skillIdsDeclined.length}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Peer Comparison */}
              <div className="p-6">
                <div className="flex flex-col h-full">
                  <div className="text-sm text-muted-foreground mb-1">Peer Comparison</div>
                  <div className="flex items-center">
                    <div className="text-2xl font-bold mr-2">
                      {peerComparison?.overallPerformance.traineeScore || '--'}%
                    </div>
                    <div className="flex flex-col">
                      <div className="text-xs text-muted-foreground">
                        Peer avg: {peerComparison?.overallPerformance.peerAverage || '--'}%
                      </div>
                      <div className="text-xs">
                        {peerComparison && peerComparison.overallPerformance.traineeScore > peerComparison.overallPerformance.peerAverage
                          ? <span className="text-green-500">Above average</span>
                          : peerComparison && peerComparison.overallPerformance.traineeScore < peerComparison.overallPerformance.peerAverage
                            ? <span className="text-yellow-500">Below average</span>
                            : <span className="text-blue-500">At average</span>
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 border-t pt-2">
                    <div className="text-xs text-muted-foreground mb-2">
                      Percentile rank among peers
                    </div>
                    <Progress 
                      value={peerComparison?.overallPerformance.percentileRank || 50} 
                      className="h-2 mb-1"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    <div className="text-sm text-muted-foreground">
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <Button variant="link" className="h-auto p-0 text-xs">
                            Based on {peerComparison?.peerGroupSize || '--'} peers
                          </Button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold">Peer Group</h4>
                            <p className="text-sm text-muted-foreground">
                              {peerComparison?.peerGroupCriteria || 'Similar trainees based on program and progress'}
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b">
                <div className="px-4">
                  <TabsList className="h-12">
                    <TabsTrigger value="overview" className="gap-2">
                      <LineChart className="h-4 w-4" />
                      <span>Overview</span>
                    </TabsTrigger>
                    <TabsTrigger value="skills" className="gap-2">
                      <Zap className="h-4 w-4" />
                      <span>Skills</span>
                    </TabsTrigger>
                    <TabsTrigger value="recommendations" className="gap-2">
                      <Target className="h-4 w-4" />
                      <span>Recommendations</span>
                    </TabsTrigger>
                    <TabsTrigger value="predictions" className="gap-2">
                      <LineChart className="h-4 w-4" />
                      <span>Predictions</span>
                    </TabsTrigger>
                    <TabsTrigger value="comparison" className="gap-2">
                      <Users className="h-4 w-4" />
                      <span>Peer Comparison</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>
              
              <TabsContent value="overview" className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Historical Performance Trend */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Historical Performance Trend</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsLineChart
                            data={getHistoricalTrendsData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis domain={[0, 100]} />
                            <RechartsTooltip />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="score" 
                              name="Your Score" 
                              stroke="#3b82f6" 
                              activeDot={{ r: 8 }}
                              strokeWidth={2}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="peerAverage" 
                              name="Peer Average" 
                              stroke="#94a3b8" 
                              strokeWidth={2}
                              strokeDasharray="4 4"
                            />
                          </RechartsLineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Strengths & Weaknesses */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Strengths & Areas for Improvement</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Tabs defaultValue="strengths" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="strengths">Strengths</TabsTrigger>
                          <TabsTrigger value="weaknesses">Improvement Areas</TabsTrigger>
                        </TabsList>
                        <TabsContent value="strengths" className="pt-4">
                          {getStrengthsWeaknessesData.strengths.length === 0 ? (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                              No significant strengths identified yet
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {getStrengthsWeaknessesData.strengths.map((strength, index) => (
                                <div key={index} className="flex justify-between items-center">
                                  <div className="flex-1">
                                    <div className="font-medium">{strength.name}</div>
                                    <div className="flex items-center">
                                      <Progress 
                                        value={strength.score} 
                                        className="h-1.5 w-24 mr-2" 
                                      />
                                      <span className="text-sm">{strength.score}%</span>
                                    </div>
                                  </div>
                                  <div>
                                    {getTrendIndicator(strength.trend, 'sm')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                        <TabsContent value="weaknesses" className="pt-4">
                          {getStrengthsWeaknessesData.weaknesses.length === 0 ? (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                              No significant weaknesses identified
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {getStrengthsWeaknessesData.weaknesses.map((weakness, index) => (
                                <div key={index} className="flex items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center">
                                      <div className="font-medium">{weakness.name}</div>
                                      <div className="ml-2">
                                        {getImpactBadge(weakness.impact as any)}
                                      </div>
                                    </div>
                                    <div className="flex items-center mt-1">
                                      <Progress 
                                        value={weakness.score} 
                                        className="h-1.5 w-24 mr-2" 
                                      />
                                      <span className="text-sm">{weakness.score}% (gap: {weakness.gap}%)</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Upcoming Module Predictions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Predicted Performance for Upcoming Modules</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={getPredictedSuccessData}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="module" />
                          <YAxis domain={[0, 100]} />
                          <RechartsTooltip />
                          <Legend />
                          <Bar 
                            dataKey="predicted" 
                            name="Predicted Score" 
                            fill="#3b82f6"
                          >
                            {getPredictedSuccessData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.predicted >= 80 ? '#10b981' : entry.predicted >= 70 ? '#f59e0b' : '#ef4444'} 
                              />
                            ))}
                          </Bar>
                          <Bar 
                            dataKey="minimum" 
                            name="Passing Score" 
                            fill="#94a3b8" 
                            fillOpacity={0.3}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="skills" className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Skills Radar Chart */}
                  <Card className="md:col-span-1">
                    <CardHeader>
                      <CardTitle className="text-lg">Skills Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart 
                            outerRadius={90} 
                            data={getSkillsRadarData}
                          >
                            <PolarGrid />
                            <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10 }} />
                            <PolarRadiusAxis domain={[0, 100]} />
                            <Radar 
                              name="Your Score" 
                              dataKey="score" 
                              stroke="#3b82f6" 
                              fill="#3b82f6" 
                              fillOpacity={0.6}
                            />
                            <Radar 
                              name="Peer Average" 
                              dataKey="average" 
                              stroke="#94a3b8" 
                              fill="#94a3b8" 
                              fillOpacity={0.3}
                            />
                            <Legend />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Skills Table */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg">Detailed Skill Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Skill</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Score</TableHead>
                            <TableHead className="text-right">Trend</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {insights.skillPerformance.map((skill) => (
                            <TableRow key={skill.skillId}>
                              <TableCell className="font-medium">{skill.name}</TableCell>
                              <TableCell className="capitalize">{skill.category}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Progress 
                                    value={skill.score} 
                                    className="h-1.5 w-16" 
                                    color={
                                      skill.score >= 85 ? "bg-green-500" :
                                      skill.score >= 70 ? "bg-blue-500" :
                                      "bg-yellow-500"
                                    }
                                  />
                                  <span>{skill.score}%</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {getTrendIndicator(skill.trend, 'sm')}
                              </TableCell>
                              <TableCell className="text-right">
                                {skill.relativeStrength ? (
                                  <Badge className="bg-green-500">Strength</Badge>
                                ) : insights.weakAreas.some(w => w.skillId === skill.skillId) ? (
                                  <Badge className="bg-yellow-500">Needs Work</Badge>
                                ) : (
                                  <Badge variant="outline">Adequate</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Weak Areas Detail */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Areas Needing Improvement</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {insights.weakAreas.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
                        <h3 className="text-lg font-medium mb-1">No Critical Weak Areas</h3>
                        <p className="text-sm text-muted-foreground">
                          All skills are currently at or above the required levels
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {insights.weakAreas.map((area) => (
                          <Card key={area.skillId} className="overflow-hidden">
                            <CardHeader className="p-4 pb-2 bg-muted/50">
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-base">{area.name}</CardTitle>
                                  <CardDescription>
                                    Affects {area.affectedModules.length} module(s)
                                  </CardDescription>
                                </div>
                                {getImpactBadge(area.impact)}
                              </div>
                            </CardHeader>
                            <CardContent className="p-4">
                              <div className="flex justify-between mb-1 text-sm">
                                <span>Current: {area.currentScore}%</span>
                                <span>Target: {area.targetScore}%</span>
                              </div>
                              <div className="relative">
                                <Progress 
                                  value={(area.currentScore / area.targetScore) * 100} 
                                  className="h-2" 
                                />
                                <div className="absolute right-0 top-0 border-l border-dashed border-primary h-4"></div>
                              </div>
                              
                              <div className="mt-4">
                                <div className="text-sm font-medium mb-2">Recommended Activities:</div>
                                <ul className="text-sm space-y-1 list-disc list-inside">
                                  {area.recommendedActivities.map((activity, idx) => (
                                    <li key={idx}>{activity}</li>
                                  ))}
                                </ul>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="recommendations" className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Focus Areas */}
                  <div className="space-y-5">
                    <h3 className="text-lg font-medium">Recommended Focus Areas</h3>
                    {insights.recommendedFocus.map((focus, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardHeader className="p-4 pb-2 bg-gradient-to-r from-blue-500/10 to-blue-600/5">
                          <CardTitle className="text-base flex items-center">
                            <Target className="w-4 h-4 mr-2 text-blue-500" />
                            {focus.skillIds.map(skillId => {
                              const skill = insights.skillPerformance.find(s => s.skillId === skillId);
                              return skill?.name || skillId;
                            }).join(', ')}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <p className="text-sm text-muted-foreground mb-3">
                            {focus.reason}
                          </p>
                          <div className="space-y-2">
                            {focus.suggestedActivities.map((activity, idx) => (
                              <div key={idx} className="flex items-start">
                                <Plus className="w-4 h-4 mr-2 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-sm">{activity}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                        <CardFooter className="px-4 py-3 bg-muted/30 border-t">
                          <Button variant="outline" size="sm" className="w-full">
                            Schedule Activity
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                  
                  {/* Recent Progress */}
                  <div className="space-y-5">
                    <h3 className="text-lg font-medium">Recent Progress</h3>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Performance Changes</CardTitle>
                        <CardDescription>
                          {insights.recentProgress.period}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">Average score change:</div>
                            <div className="flex items-center font-medium">
                              {insights.recentProgress.averageScoreChange > 0 ? (
                                <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
                              ) : insights.recentProgress.averageScoreChange < 0 ? (
                                <TrendingDown className="w-4 h-4 mr-1 text-red-500" />
                              ) : (
                                <span className="mr-1">→</span>
                              )}
                              <span className={
                                insights.recentProgress.averageScoreChange > 0 ? "text-green-500" :
                                insights.recentProgress.averageScoreChange < 0 ? "text-red-500" :
                                "text-yellow-500"
                              }>
                                {insights.recentProgress.averageScoreChange > 0 ? '+' : ''}
                                {insights.recentProgress.averageScoreChange.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Improved skills:</span>
                              <span>{insights.recentProgress.skillIdsImproved.length}</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {insights.recentProgress.skillIdsImproved.map(skillId => {
                                const skill = insights.skillPerformance.find(s => s.skillId === skillId);
                                return (
                                  <Badge key={skillId} className="bg-green-500">
                                    {skill?.name || skillId}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                          
                          {insights.recentProgress.skillIdsDeclined.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Declined skills:</span>
                                <span>{insights.recentProgress.skillIdsDeclined.length}</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {insights.recentProgress.skillIdsDeclined.map(skillId => {
                                  const skill = insights.skillPerformance.find(s => s.skillId === skillId);
                                  return (
                                    <Badge key={skillId} className="bg-yellow-500">
                                      {skill?.name || skillId}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Completed Modules</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {insights.recentProgress.moduleIds.length === 0 ? (
                            <div className="text-sm text-muted-foreground text-center py-2">
                              No modules completed in this period
                            </div>
                          ) : (
                            insights.recentProgress.moduleIds.map((moduleId, index) => (
                              <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
                                  <span className="text-sm">Module {moduleId}</span>
                                </div>
                                <Button variant="ghost" size="sm" className="h-7 gap-1">
                                  <span className="text-xs">Details</span>
                                  <ChevronRight className="h-3 w-3" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
                
                {/* Progress Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Learning Path Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-muted-foreground">Progress Rate:</div>
                      <div className="text-sm font-medium">
                        {Math.round(insights.overview.progressRate * 100)}% of Expected Timeline
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-muted"></div>
                      </div>
                      <div className="relative flex justify-between">
                        <div className="text-center">
                          <div className="bg-background rounded-full h-6 w-6 flex items-center justify-center border">
                            <div className="h-3 w-3 rounded-full bg-green-500"></div>
                          </div>
                          <div className="mt-1 text-xs">Start</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="bg-background rounded-full h-6 w-6 flex items-center justify-center border">
                            {insights.overview.progressRate >= 0.33 ? (
                              <div className="h-3 w-3 rounded-full bg-green-500"></div>
                            ) : (
                              <div className="h-3 w-3 rounded-full bg-gray-200"></div>
                            )}
                          </div>
                          <div className="mt-1 text-xs">Basic</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="bg-background rounded-full h-6 w-6 flex items-center justify-center border">
                            {insights.overview.progressRate >= 0.66 ? (
                              <div className="h-3 w-3 rounded-full bg-green-500"></div>
                            ) : (
                              <div className="h-3 w-3 rounded-full bg-gray-200"></div>
                            )}
                          </div>
                          <div className="mt-1 text-xs">Intermediate</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="bg-background rounded-full h-6 w-6 flex items-center justify-center border">
                            {insights.overview.progressRate >= 1 ? (
                              <div className="h-3 w-3 rounded-full bg-green-500"></div>
                            ) : (
                              <div className="h-3 w-3 rounded-full bg-gray-200"></div>
                            )}
                          </div>
                          <div className="mt-1 text-xs">Advanced</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="bg-background rounded-full h-6 w-6 flex items-center justify-center border">
                            <div className="h-3 w-3 rounded-full bg-gray-200"></div>
                          </div>
                          <div className="mt-1 text-xs">Complete</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-6 text-sm">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                        <span className="text-muted-foreground">Estimated completion:</span>
                        <span className="ml-1 font-medium">{formatDate(insights.overview.estimatedCompletionDate)}</span>
                      </div>
                      <Badge className={insights.overview.onTrack ? 'bg-green-500' : 'bg-yellow-500'}>
                        {insights.overview.onTrack ? 'On Track' : 'Behind Schedule'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="predictions" className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Predicted Success Cards */}
                  {insights.predictedSuccessRate.map((prediction, index) => (
                    <Card key={index} className={
                      prediction.predictedScore >= 80 ? 'border-green-500/50' :
                      prediction.predictedScore >= 70 ? 'border-yellow-500/50' :
                      'border-red-500/50'
                    }>
                      <CardHeader>
                        <CardTitle className="text-lg">{prediction.moduleName}</CardTitle>
                        <CardDescription>
                          Module {prediction.upcomingModuleId}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="text-3xl font-bold">{prediction.predictedScore}%</div>
                              <div className="text-sm text-muted-foreground">Predicted Score</div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-medium">{Math.round(prediction.confidenceLevel * 100)}%</div>
                              <div className="text-sm text-muted-foreground">Confidence</div>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Status:</span>
                              <span className={
                                prediction.predictedScore >= 80 ? "text-green-500 font-medium" :
                                prediction.predictedScore >= 70 ? "text-yellow-500 font-medium" :
                                "text-red-500 font-medium"
                              }>
                                {prediction.predictedScore >= 80 ? "Strong Pass Expected" :
                                 prediction.predictedScore >= 70 ? "Pass Expected" :
                                 "At Risk - Needs Attention"}
                              </span>
                            </div>
                            <Progress 
                              value={prediction.predictedScore} 
                              className="h-2 mt-1"
                              color={
                                prediction.predictedScore >= 80 ? "bg-green-500" :
                                prediction.predictedScore >= 70 ? "bg-yellow-500" :
                                "bg-red-500"
                              }
                            />
                          </div>
                          
                          {prediction.criticalSkillGaps.length > 0 && (
                            <div className="pt-4 border-t">
                              <div className="text-sm font-medium mb-2">Critical Skill Gaps:</div>
                              <div className="space-y-2">
                                {prediction.criticalSkillGaps.map(skillId => {
                                  const skill = insights.skillPerformance.find(s => s.skillId === skillId);
                                  const weakArea = insights.weakAreas.find(w => w.skillId === skillId);
                                  return (
                                    <div key={skillId} className="flex justify-between items-center">
                                      <div className="text-sm">{skill?.name || skillId}</div>
                                      {weakArea && (
                                        <div className="text-xs">
                                          Gap: {weakArea.gap}% points
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="bg-muted/30 border-t">
                        <Button variant="outline" className="w-full">
                          View Success Plan
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
                
                {insights.predictedSuccessRate.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Prediction Factors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Mock data for visualization */}
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Previous assessment scores</span>
                              <span className="font-medium text-green-500">+15%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Practice session completion</span>
                              <span className="font-medium text-green-500">+12%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Theory test performance</span>
                              <span className="font-medium text-green-500">+8%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Instructor evaluations</span>
                              <span className="font-medium text-green-500">+5%</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Engagement level</span>
                              <span className="font-medium text-green-500">+6%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Attendance rate</span>
                              <span className="font-medium text-green-500">+3%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Simulator performance</span>
                              <span className="font-medium text-yellow-500">-2%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Skill gap: Performance calculations</span>
                              <span className="font-medium text-red-500">-8%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="comparison" className="p-6 space-y-6">
                {!peerComparison ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <h3 className="text-lg font-medium mb-2">No Peer Comparison Data</h3>
                    <p className="text-sm text-muted-foreground max-w-md text-center">
                      Peer comparison data is not available at this time.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Overall Performance Comparison</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="text-3xl font-bold">{peerComparison.overallPerformance.traineeScore}%</div>
                                <div className="text-sm text-muted-foreground">Your Score</div>
                              </div>
                              <div className="text-right">
                                <div className="text-3xl font-bold">{peerComparison.overallPerformance.peerAverage}%</div>
                                <div className="text-sm text-muted-foreground">Peer Average</div>
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Percentile Rank:</span>
                                <span className="font-medium">{peerComparison.overallPerformance.percentileRank}</span>
                              </div>
                              <Progress 
                                value={peerComparison.overallPerformance.percentileRank} 
                                className="h-2"
                              />
                            </div>
                            
                            <div className="pt-4 border-t text-sm">
                              <div className="flex justify-between mb-2">
                                <span className="text-muted-foreground">Standard deviations from mean:</span>
                                <span className="font-medium">{peerComparison.overallPerformance.standardDeviations.toFixed(1)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Comparison group:</span>
                                <span className="font-medium">{peerComparison.peerGroupSize} peers</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Progress Rate Comparison</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-4">
                            <div className="flex items-center justify-center h-44">
                              <div style={{ width: '100%', height: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                  <RechartsPieChart>
                                    <Pie
                                      data={[
                                        { name: 'Your Progress', value: peerComparison.progressRate.traineeRate * 100, fill: '#3b82f6' },
                                        { name: 'Peer Average', value: peerComparison.progressRate.peerAverage * 100, fill: '#94a3b8' }
                                      ]}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={60}
                                      outerRadius={80}
                                      paddingAngle={5}
                                      dataKey="value"
                                    />
                                    <RechartsTooltip />
                                    <Legend />
                                  </RechartsPieChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                            
                            <div className="border-t pt-4">
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="text-2xl font-bold">{Math.round(peerComparison.progressRate.traineeRate * 100)}%</div>
                                  <div className="text-sm text-muted-foreground">Your Progress Rate</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold">{Math.round(peerComparison.progressRate.peerAverage * 100)}%</div>
                                  <div className="text-sm text-muted-foreground">Peer Average Rate</div>
                                </div>
                              </div>
                              
                              <div className="mt-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Percentile rank:</span>
                                  <span className="font-medium">{peerComparison.progressRate.percentileRank}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Module Performance Comparison</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Module</TableHead>
                              <TableHead className="text-right">Your Score</TableHead>
                              <TableHead className="text-right">Peer Average</TableHead>
                              <TableHead className="text-right">Percentile</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {peerComparison.byModule.map((module) => (
                              <TableRow key={module.moduleId}>
                                <TableCell className="font-medium">{module.name}</TableCell>
                                <TableCell className="text-right">{module.traineeScore}%</TableCell>
                                <TableCell className="text-right">{module.peerAverage}%</TableCell>
                                <TableCell className="text-right">{module.percentileRank}</TableCell>
                                <TableCell>
                                  {getPerformanceBadge(module.performance)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Skill Performance Comparison</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={peerComparison.bySkill.map(skill => ({
                                name: skill.name,
                                yourScore: skill.traineeScore,
                                peerAverage: skill.peerAverage,
                                performance: skill.performance
                              }))}
                              margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="name" 
                                angle={-45} 
                                textAnchor="end"
                                height={70}
                                tick={{ fontSize: 12 }}
                              />
                              <YAxis domain={[0, 100]} />
                              <RechartsTooltip />
                              <Legend />
                              <Bar dataKey="yourScore" name="Your Score" fill="#3b82f6" />
                              <Bar dataKey="peerAverage" name="Peer Average" fill="#94a3b8" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        
                        <div className="mt-4">
                          <div className="flex justify-between">
                            <Button variant="outline" size="sm">
                              Export Comparison Data
                            </Button>
                            <Button variant="outline" size="sm">
                              View Detailed Report
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}