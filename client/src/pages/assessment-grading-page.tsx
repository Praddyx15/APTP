import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layouts/app-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, Plus, Trash, Save, Check, AlertTriangle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

const competencyAreas = [
  "General Aircraft Knowledge",
  "Pre-Flight Preparation",
  "Takeoff and Climb",
  "Cruise",
  "Approach and Landing",
  "Emergency Procedures",
  "Aircraft Systems",
  "Navigation",
  "Communication",
  "Crew Resource Management",
  "Decision Making",
  "Situational Awareness",
  "Automation Management",
];

const AssessmentGradingPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [location] = useLocation();
  const assessmentId = parseInt(location.split("/")[2]);
  const [grades, setGrades] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Fetch assessment details
  const { data: assessment, isLoading: isLoadingAssessment, error: assessmentError } = useQuery({
    queryKey: ["/api/assessments", assessmentId],
    queryFn: async () => {
      const res = await fetch(`/api/assessments/${assessmentId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch assessment");
      }
      return res.json();
    },
    enabled: !!assessmentId && !isNaN(assessmentId),
  });

  // Fetch existing grades for this assessment
  const { data: existingGrades, isLoading: isLoadingGrades } = useQuery({
    queryKey: ["/api/assessments", assessmentId, "grades"],
    queryFn: async () => {
      const res = await fetch(`/api/assessments/${assessmentId}/grades`);
      if (!res.ok) {
        throw new Error("Failed to fetch grades");
      }
      return res.json();
    },
    enabled: !!assessmentId && !isNaN(assessmentId),
  });

  // Fetch trainee details
  const { data: trainee, isLoading: isLoadingTrainee } = useQuery({
    queryKey: ["/api/users", assessment?.traineeId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${assessment?.traineeId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch trainee details");
      }
      return res.json();
    },
    enabled: !!assessment?.traineeId,
  });

  // Initialize grades from existing data or create default ones
  useEffect(() => {
    if (existingGrades && existingGrades.length > 0) {
      setGrades(existingGrades);
    } else if (assessment) {
      // Create default grades if none exist
      const defaultGrades = competencyAreas.map((area, index) => ({
        tempId: index,
        assessmentId: assessment.id,
        competencyAreaId: area,
        score: 0,
        maximumScore: 5,
        comments: "",
      }));
      setGrades(defaultGrades);
    }
  }, [assessment, existingGrades]);

  // Update a grade in the local state
  const updateGrade = (index: number, field: string, value: any) => {
    const updatedGrades = [...grades];
    updatedGrades[index] = { ...updatedGrades[index], [field]: value };
    setGrades(updatedGrades);
  };

  // Add a new grade
  const addGrade = () => {
    if (!assessment) return;
    
    const newGrade = {
      tempId: Date.now(), // Temporary ID for tracking in the UI
      assessmentId: assessment.id,
      competencyAreaId: "", // Empty initially
      score: 0,
      maximumScore: 5,
      comments: "",
    };
    
    setGrades([...grades, newGrade]);
  };

  // Remove a grade
  const removeGrade = (index: number) => {
    const updatedGrades = [...grades];
    updatedGrades.splice(index, 1);
    setGrades(updatedGrades);
  };

  // Calculate overall score
  const calculateOverallScore = () => {
    if (grades.length === 0) return 0;
    
    const totalScore = grades.reduce((sum, grade) => sum + grade.score, 0);
    const totalMaximumScore = grades.reduce((sum, grade) => sum + grade.maximumScore, 0);
    
    return totalMaximumScore > 0 ? (totalScore / totalMaximumScore) * 100 : 0;
  };

  // Determine competency level based on score
  const getCompetencyLevel = (scorePercentage: number) => {
    if (scorePercentage >= 90) return "Expert";
    if (scorePercentage >= 80) return "Proficient";
    if (scorePercentage >= 70) return "Competent";
    if (scorePercentage >= 60) return "Basic";
    return "Novice";
  };

  // Mutation for saving grades
  const saveGradesMutation = useMutation({
    mutationFn: async () => {
      // Filter out grades with empty competency areas
      const validGrades = grades.filter(g => g.competencyAreaId !== "");
      
      if (validGrades.length === 0) {
        throw new Error("Please add at least one valid grade");
      }
      
      const res = await apiRequest(
        "POST", 
        `/api/assessments/${assessmentId}/grades/bulk`, 
        validGrades.map(grade => ({
          assessmentId: grade.assessmentId,
          competencyAreaId: grade.competencyAreaId,
          score: grade.score,
          maximumScore: grade.maximumScore,
          comments: grade.comments || null
        }))
      );
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save grades");
      }
      
      return res.json();
    },
    onSuccess: () => {
      // Update assessment status to completed
      completeAssessmentMutation.mutate();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save grades",
        description: error.message,
        variant: "destructive",
      });
      setSubmitting(false);
    },
  });

  // Mutation for marking the assessment as completed
  const completeAssessmentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/assessments/${assessmentId}`, {
        status: "completed",
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update assessment status");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Assessment completed",
        description: "The assessment has been graded and marked as completed.",
      });
      setSubmitting(false);
      // Navigate back to assessments page
      setLocation("/assessments");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to complete assessment",
        description: error.message,
        variant: "destructive",
      });
      setSubmitting(false);
    },
  });

  // Handle submission of grades
  const handleSubmit = () => {
    setConfirmDialogOpen(true);
  };

  // Confirm submission and save grades
  const confirmSubmit = () => {
    setSubmitting(true);
    setConfirmDialogOpen(false);
    saveGradesMutation.mutate();
  };

  // Check if user has permission to grade this assessment
  const canGrade = user?.role === "instructor" || user?.role === "examiner" || user?.role === "admin";
  
  // Handle loading and error states
  if (isLoadingAssessment || isLoadingGrades || isLoadingTrainee) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6 flex justify-center items-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (assessmentError || !assessment) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Assessment Not Found</h1>
            <p className="text-muted-foreground mb-4">
              The assessment you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => setLocation("/assessments")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Assessments
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!canGrade) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              You don't have permission to grade assessments.
            </p>
            <Button onClick={() => setLocation("/assessments")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Assessments
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Get overall score and competency level
  const overallScore = calculateOverallScore();
  const competencyLevel = getCompetencyLevel(overallScore);
  const passingThreshold = 70;
  const isPassing = overallScore >= passingThreshold;

  return (
    <AppLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Button variant="outline" className="mr-4" onClick={() => setLocation("/assessments")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-3xl font-bold">Assessment Grading</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assessment Info Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Assessment Details</CardTitle>
              <CardDescription>
                {assessment.competencyArea || "General Assessment"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Trainee</h3>
                <p className="text-lg font-medium">
                  {trainee ? `${trainee.firstName} ${trainee.lastName}` : assessment.traineeId}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Date</h3>
                <p>{format(new Date(assessment.date), "PPP")}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                <Badge className={
                  assessment.status === "completed" ? "bg-green-500" :
                  assessment.status === "pending" ? "bg-yellow-500" :
                  assessment.status === "in_progress" ? "bg-blue-500" :
                  "bg-gray-500"
                }>
                  {assessment.status}
                </Badge>
              </div>
              {assessment.notes && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Notes</h3>
                  <p className="whitespace-pre-wrap">{assessment.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grading Form Card */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Competency Grading</CardTitle>
                <CardDescription>
                  Evaluate the trainee's performance across different competency areas.
                </CardDescription>
              </div>
              <Button onClick={addGrade} size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Area
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {grades.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No grades added yet. Click "Add Area" to begin.</p>
                </div>
              ) : (
                grades.map((grade, index) => (
                  <div key={grade.id || grade.tempId} className="border rounded-md p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-full mr-4">
                        <Label htmlFor={`competencyArea-${index}`}>Competency Area</Label>
                        <Select
                          value={grade.competencyAreaId}
                          onValueChange={(value) => updateGrade(index, "competencyAreaId", value)}
                        >
                          <SelectTrigger id={`competencyArea-${index}`}>
                            <SelectValue placeholder="Select a competency area" />
                          </SelectTrigger>
                          <SelectContent>
                            {competencyAreas.map((area) => (
                              <SelectItem key={area} value={area}>
                                {area}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeGrade(index)}
                        className="text-destructive"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <Label htmlFor={`score-${index}`}>Score: {grade.score} / {grade.maximumScore}</Label>
                        <span className="text-sm text-muted-foreground">
                          {Math.round((grade.score / grade.maximumScore) * 100)}%
                        </span>
                      </div>
                      <Slider
                        id={`score-${index}`}
                        min={0}
                        max={grade.maximumScore}
                        step={1}
                        value={[grade.score]}
                        onValueChange={(value) => updateGrade(index, "score", value[0])}
                      />
                    </div>

                    <div>
                      <Label htmlFor={`comments-${index}`}>Comments</Label>
                      <Textarea
                        id={`comments-${index}`}
                        value={grade.comments || ""}
                        onChange={(e) => updateGrade(index, "comments", e.target.value)}
                        placeholder="Add comments about this competency area"
                        rows={2}
                      />
                    </div>
                  </div>
                ))
              )}

              {grades.length > 0 && (
                <div className="border rounded-md p-4 bg-muted/20">
                  <h3 className="font-medium mb-2">Overall Assessment</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span>Overall Score:</span>
                        <span className="font-medium">{Math.round(overallScore)}%</span>
                      </div>
                      <Progress value={overallScore} className="h-2" />
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Competency Level:</span>
                      <Badge className={
                        competencyLevel === "Expert" ? "bg-purple-500" :
                        competencyLevel === "Proficient" ? "bg-blue-500" :
                        competencyLevel === "Competent" ? "bg-green-500" :
                        competencyLevel === "Basic" ? "bg-yellow-500" :
                        "bg-red-500"
                      }>
                        {competencyLevel}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Assessment Result:</span>
                      <Badge className={isPassing ? "bg-green-500" : "bg-red-500"}>
                        {isPassing ? "PASS" : "FAIL"}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={submitting || grades.length === 0}
                className="ml-auto"
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Assessment
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Assessment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit these grades and complete the assessment?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Assessment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default AssessmentGradingPage;