import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/layouts/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, ChevronRight, BarChart3, LineChart, PieChart, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

const PerformanceCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  color?: string;
}> = ({ title, value, icon, description, color = "bg-primary" }) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-2xl font-bold">{value}</h3>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        <div className={`${color} p-2 rounded-md text-white`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

const CompetencyBadge: React.FC<{ level: string }> = ({ level }) => {
  let color = "";
  
  switch (level) {
    case "Expert":
      color = "bg-purple-500";
      break;
    case "Proficient":
      color = "bg-blue-500";
      break;
    case "Competent":
      color = "bg-green-500";
      break;
    case "Basic":
      color = "bg-yellow-500";
      break;
    case "Novice":
      color = "bg-red-500";
      break;
    default:
      color = "bg-gray-500";
  }
  
  return <Badge className={color}>{level}</Badge>;
};

const TraineePerformancePage: React.FC = () => {
  const { user } = useAuth();
  const [location] = useLocation();
  const [, setLocation] = useLocation();
  const [selectedCompetency, setSelectedCompetency] = useState<string | null>(null);
  
  // Extract trainee ID from URL or use current user ID if the user is a trainee
  let traineeId: number | undefined;
  const urlTraineeId = location.split("/")[2];
  
  if (urlTraineeId) {
    traineeId = parseInt(urlTraineeId);
  } else if (user?.role === "trainee") {
    traineeId = user.id;
  }
  
  // Fetch trainee details if not the current user
  const { data: trainee, isLoading: isLoadingTrainee } = useQuery({
    queryKey: ["/api/users", traineeId],
    queryFn: async () => {
      if (user?.id === traineeId) return user;
      
      const res = await fetch(`/api/users/${traineeId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch trainee details");
      }
      return res.json();
    },
    enabled: !!traineeId,
  });
  
  // Fetch trainee performance metrics
  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ["/api/trainees", traineeId, "performance"],
    queryFn: async () => {
      const res = await fetch(`/api/trainees/${traineeId}/performance`);
      if (!res.ok) {
        throw new Error("Failed to fetch performance metrics");
      }
      return res.json();
    },
    enabled: !!traineeId,
  });
  
  // Fetch assessments for this trainee
  const { data: assessments, isLoading: isLoadingAssessments } = useQuery({
    queryKey: ["/api/assessments/trainee", traineeId],
    queryFn: async () => {
      const res = await fetch(`/api/assessments/trainee/${traineeId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch assessments");
      }
      return res.json();
    },
    enabled: !!traineeId,
  });
  
  // Check if user can view these metrics
  const canViewMetrics = 
    user?.role === "admin" || 
    user?.role === "instructor" || 
    user?.role === "examiner" ||
    (user?.role === "trainee" && user.id === traineeId);
    
  if (!canViewMetrics) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              You don't have permission to view these performance metrics.
            </p>
            <Button onClick={() => setLocation("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }
  
  if (isLoadingTrainee || isLoadingMetrics || isLoadingAssessments) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6 flex justify-center items-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }
  
  if (!metrics || !trainee) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <h1 className="text-2xl font-bold mb-2">Performance Data Not Found</h1>
            <p className="text-muted-foreground mb-4">
              There are no performance metrics available for this trainee yet.
            </p>
            <Button onClick={() => setLocation("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Get recent assessments, sort by date
  const recentAssessments = assessments ? 
    [...assessments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5) : 
    [];
  
  return (
    <AppLayout>
      <div className="container mx-auto py-6">
        <Button variant="outline" className="mb-6" onClick={() => setLocation("/dashboard")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        
        <div className="flex items-center mb-6">
          <Avatar className="h-16 w-16 mr-4">
            <AvatarImage src={trainee.profilePicture || ""} alt={trainee.firstName} />
            <AvatarFallback className="text-xl">
              {trainee.firstName?.[0]}{trainee.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{trainee.firstName} {trainee.lastName}</h1>
            <p className="text-muted-foreground">
              Trainee Performance Dashboard
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <PerformanceCard
            title="Overall Score"
            value={`${Math.round(metrics.overallScore)}%`}
            icon={<BarChart3 className="h-6 w-6" />}
            description={`Competency Level: ${metrics.competencyLevel}`}
            color="bg-primary"
          />
          
          <PerformanceCard
            title="Completed Assessments"
            value={metrics.completedAssessments}
            icon={<Trophy className="h-6 w-6" />}
            description={`Total: ${metrics.totalAssessments}`}
            color="bg-green-500"
          />
          
          <PerformanceCard
            title="Pending Assessments"
            value={metrics.pendingAssessments}
            icon={<LineChart className="h-6 w-6" />}
            color="bg-yellow-500"
          />
          
          <PerformanceCard
            title="Failed Assessments"
            value={metrics.failedAssessments}
            icon={<PieChart className="h-6 w-6" />}
            color={metrics.failedAssessments > 0 ? "bg-red-500" : "bg-gray-500"}
          />
        </div>
        
        <Tabs defaultValue="competency">
          <TabsList className="mb-4">
            <TabsTrigger value="competency">Competency Breakdown</TabsTrigger>
            <TabsTrigger value="history">Assessment History</TabsTrigger>
            <TabsTrigger value="progress">Progress Over Time</TabsTrigger>
          </TabsList>
          
          <TabsContent value="competency">
            <Card>
              <CardHeader>
                <CardTitle>Competency Area Breakdown</CardTitle>
                <CardDescription>
                  Performance analysis across different competency areas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.competencyBreakdown && metrics.competencyBreakdown.length > 0 ? (
                    metrics.competencyBreakdown.map((competency: any, index: number) => (
                      <div key={competency.area || index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{competency.area}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              ({competency.assessmentCount} assessments)
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="mr-2 font-medium">{Math.round(competency.averageScore)}%</span>
                            <CompetencyBadge level={competency.competencyLevel} />
                          </div>
                        </div>
                        <Progress value={competency.averageScore} className="h-2" />
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">No competency data available yet.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Assessment History</CardTitle>
                <CardDescription>
                  Recent assessment results and details
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentAssessments.length > 0 ? (
                  <div className="space-y-4">
                    {recentAssessments.map((assessment: any) => (
                      <div key={assessment.id} 
                        className="p-4 border rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setLocation(`/assessments/${assessment.id}`)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-medium">{assessment.competencyArea || "Assessment"}</h3>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(assessment.date), "PPP")}
                            </p>
                          </div>
                          <Badge className={
                            assessment.status === "completed" ? "bg-green-500" :
                            assessment.status === "pending" ? "bg-yellow-500" :
                            assessment.status === "in_progress" ? "bg-blue-500" :
                            assessment.status === "failed" ? "bg-red-500" :
                            "bg-gray-500"
                          }>
                            {assessment.status}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-2 text-sm">
                          <span className="text-muted-foreground">
                            Instructor: {assessment.instructorId}
                          </span>
                          <Button variant="ghost" size="sm" className="h-6 gap-1">
                            View Details <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground">No assessment history available yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="progress">
            <Card>
              <CardHeader>
                <CardTitle>Progress Over Time</CardTitle>
                <CardDescription>
                  Performance tracking across assessments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics.progressOverTime && metrics.progressOverTime.length > 0 ? (
                  <div className="h-64">
                    {/* In a real implementation, we would use a chart library here */}
                    <div className="flex flex-col h-full justify-center items-center">
                      <p className="text-muted-foreground mb-4">
                        Performance trend visualization would be displayed here using a chart library.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Most recent score: {Math.round(metrics.progressOverTime[metrics.progressOverTime.length - 1]?.score || 0)}%
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground">No progress data available yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default TraineePerformancePage;