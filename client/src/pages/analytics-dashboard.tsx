import { useState } from "react";
import { Activity, TrendingUp, PercentCircle, Layers, Clock, Brain, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import PerformanceMetricsChart from "@/components/analytics/performance-metrics-chart";
import SkillDecayPrediction from "@/components/analytics/skill-decay-prediction";
import TraineeComparisonChart from "@/components/analytics/trainee-comparison-chart";
import SessionAnalysisTable from "@/components/analytics/session-analysis-table";

interface TraineeData {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
}

export default function AnalyticsDashboardPage() {
  const { user } = useAuth();
  const [selectedView, setSelectedView] = useState("overview");
  const [dateRange, setDateRange] = useState<string>("30");

  // Mock analytics data for overview section until API endpoints are ready
  const overviewData = {
    totalSessions: 248,
    completionRate: 94,
    avgPerformance: 3.7,
    interventions: 12,
    skillGrowth: 8.2,
    consistencyScore: 85,
    sessionTime: "382h",
    learningEfficiency: 92,
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights, performance trends, and predictive analytics
          </p>
        </div>
        <div className="flex space-x-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={selectedView} onValueChange={setSelectedView} className="space-y-4">
        <TabsList className="grid grid-cols-4 gap-4 w-full max-w-lg">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewData.totalSessions}</div>
                <p className="text-xs text-muted-foreground">
                  +12% from previous period
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewData.avgPerformance}</div>
                <p className="text-xs text-muted-foreground">
                  Scale: 1-4 (Excellent)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Skill Growth</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+{overviewData.skillGrowth}%</div>
                <p className="text-xs text-muted-foreground">
                  Average across all competencies
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <PercentCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overviewData.completionRate}%</div>
                <p className="text-xs text-muted-foreground">
                  Target achievements completed
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>
                  Performance metrics over time across key competency areas
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <PerformanceMetricsChart />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
                <CardDescription>
                  Summary of key training indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">Total Session Time</span>
                    </div>
                    <span className="font-medium">{overviewData.sessionTime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Brain className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">Learning Efficiency</span>
                    </div>
                    <span className="font-medium">{overviewData.learningEfficiency}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <Activity className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">Consistency Score</span>
                    </div>
                    <span className="font-medium">{overviewData.consistencyScore}/100</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">Early Interventions</span>
                    </div>
                    <span className="font-medium">{overviewData.interventions}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Trainee Comparison</CardTitle>
              <CardDescription>
                Performance comparison across all trainees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TraineeComparisonChart />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Detailed performance analysis by competency area
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <PerformanceMetricsChart />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Consistency Analysis</CardTitle>
                <CardDescription>
                  Performance variance and consistency trends
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Consistency data visualization will appear here
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Skill Decay Prediction</CardTitle>
                <CardDescription>
                  Projected skill degradation if no refresher training
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <SkillDecayPrediction />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Training Effectiveness Forecast</CardTitle>
                <CardDescription>
                  Projected outcomes based on current progress
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Training effectiveness forecast will appear here
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Session Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of recent training sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SessionAnalysisTable />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}