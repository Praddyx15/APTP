import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/components/layouts/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2, Plus, PlusCircle, FileText, Check, X, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Define assessment status colors
const statusColors = {
  pending: "bg-yellow-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
  canceled: "bg-gray-500",
};

const AssessmentsPage: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Define queries based on user role
  const isInstructor = user?.role === "instructor" || user?.role === "examiner";
  const isTrainee = user?.role === "trainee";
  const isAdmin = user?.role === "admin";

  // Fetch assessments based on user role
  const { data: assessments, isLoading } = useQuery({
    queryKey: [isInstructor ? "/api/assessments/instructor" : isTrainee ? "/api/assessments/trainee" : "/api/assessments", user?.id],
    queryFn: async () => {
      const endpoint = isInstructor 
        ? `/api/assessments/instructor/${user?.id}` 
        : isTrainee 
          ? `/api/assessments/trainee/${user?.id}` 
          : "/api/assessments";
      
      const res = await fetch(endpoint);
      if (!res.ok) {
        throw new Error("Failed to fetch assessments");
      }
      return res.json();
    },
    enabled: !!user,
  });

  // Fetch training sessions for creating assessments (instructors only)
  const { data: sessions, isLoading: isLoadingSessions } = useQuery({
    queryKey: ["/api/sessions/instructor", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/sessions/instructor/${user?.id}`);
      if (!res.ok) {
        throw new Error("Failed to fetch sessions");
      }
      return res.json();
    },
    enabled: !!user && isInstructor,
  });

  // Fetch modules for creating assessments
  const { data: modules, isLoading: isLoadingModules } = useQuery({
    queryKey: ["/api/modules"],
    queryFn: async () => {
      const res = await fetch("/api/modules");
      if (!res.ok) {
        throw new Error("Failed to fetch modules");
      }
      return res.json();
    },
    enabled: !!user,
  });

  // Fetch trainees for creating assessments (instructors only)
  const { data: trainees, isLoading: isLoadingTrainees } = useQuery({
    queryKey: ["/api/users/trainees"],
    queryFn: async () => {
      const res = await fetch("/api/users?role=trainee");
      if (!res.ok) {
        throw new Error("Failed to fetch trainees");
      }
      return res.json();
    },
    enabled: !!user && isInstructor,
  });

  // Mutation for creating a new assessment
  const createAssessmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/assessments", data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create assessment");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Assessment created",
        description: "New assessment has been created successfully.",
      });
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments/instructor", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments/trainee", user?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create assessment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for updating an assessment
  const updateAssessmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/assessments/${id}`, data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update assessment");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Assessment updated",
        description: "The assessment has been updated successfully.",
      });
      setDetailsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments/instructor", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/assessments/trainee", user?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update assessment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Validation schema for creating an assessment
  const createAssessmentSchema = z.object({
    traineeId: z.number().positive("Trainee is required"),
    instructorId: z.number().default(user?.id || 0),
    moduleId: z.number().positive("Module is required"),
    sessionId: z.number().nullable().optional(),
    date: z.string().refine(val => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    }),
    competencyArea: z.string().min(1, "Competency area is required"),
    notes: z.string().optional(),
    status: z.string().default("pending"),
  });

  // Form for creating a new assessment
  const createForm = useForm<z.infer<typeof createAssessmentSchema>>({
    resolver: zodResolver(createAssessmentSchema),
    defaultValues: {
      instructorId: user?.id,
      status: "pending",
      sessionId: null,
      notes: "",
    },
  });

  // Handle form submission
  const onCreateSubmit = (values: z.infer<typeof createAssessmentSchema>) => {
    createAssessmentMutation.mutate(values);
  };

  // Filter assessments based on active tab
  const filteredAssessments = assessments ? 
    activeTab === "all" 
      ? assessments 
      : assessments.filter((assessment: any) => assessment.status === activeTab)
    : [];

  // Open assessment details
  const openAssessmentDetails = (assessment: any) => {
    setSelectedAssessment(assessment);
    setDetailsDialogOpen(true);
  };

  // Start grading an assessment
  const startGrading = (assessment: any) => {
    setLocation(`/assessments/${assessment.id}/grade`);
  };

  return (
    <AppLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Assessments</h1>
          {isInstructor && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Create Assessment
            </Button>
          )}
        </div>

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="failed">Failed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {isLoading ? (
              <div className="flex justify-center my-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredAssessments.length === 0 ? (
              <div className="text-center my-8">
                <p className="text-muted-foreground">No assessments found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAssessments.map((assessment: any) => (
                  <Card key={assessment.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{assessment.competencyArea || "Assessment"}</CardTitle>
                          <CardDescription>
                            {assessment.moduleId && modules ? 
                              modules.find((m: any) => m.id === assessment.moduleId)?.name : 
                              "Module"}
                          </CardDescription>
                        </div>
                        <Badge className={statusColors[assessment.status as keyof typeof statusColors] || "bg-gray-500"}>
                          {assessment.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date:</span>
                          <span>{format(new Date(assessment.date), "PPP")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Trainee:</span>
                          <span>{assessment.traineeName || "Unknown Trainee"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Instructor:</span>
                          <span>{assessment.instructorName || "Unknown Instructor"}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openAssessmentDetails(assessment)}>
                          Details
                        </Button>
                        {isInstructor && assessment.status !== "completed" && (
                          <Button size="sm" onClick={() => startGrading(assessment)}>
                            Grade
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Assessment Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Assessment</DialogTitle>
            <DialogDescription>
              Create a new assessment for a trainee. Fill in the required details below.
            </DialogDescription>
          </DialogHeader>

          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={createForm.control}
                name="traineeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trainee</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a trainee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {trainees?.map((trainee: any) => (
                          <SelectItem key={trainee.id} value={trainee.id.toString()}>
                            {trainee.firstName} {trainee.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="moduleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Module</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a module" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {modules?.map((module: any) => (
                          <SelectItem key={module.id} value={module.id.toString()}>
                            {module.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="sessionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Training Session (Optional)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a session" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {sessions?.map((session: any) => (
                          <SelectItem key={session.id} value={session.id.toString()}>
                            {session.title || format(new Date(session.startTime), "PPP")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Link this assessment to a specific training session.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="competencyArea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Competency Area</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Takeoff and Landing" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Add any additional notes about this assessment"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createAssessmentMutation.isPending}>
                  {createAssessmentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Assessment
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Assessment Details Dialog */}
      {selectedAssessment && (
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Assessment Details</DialogTitle>
              <DialogDescription>
                View and manage assessment details.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Competency Area</h3>
                  <p>{selectedAssessment.competencyArea}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <Badge className={statusColors[selectedAssessment.status as keyof typeof statusColors] || "bg-gray-500"}>
                    {selectedAssessment.status}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Date</h3>
                  <p>{format(new Date(selectedAssessment.date), "PPP")}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Module</h3>
                  <p>{modules?.find((m: any) => m.id === selectedAssessment.moduleId)?.name || "Unknown"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Trainee</h3>
                  <p>{selectedAssessment.traineeName || "Unknown"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Instructor</h3>
                  <p>{selectedAssessment.instructorName || "Unknown"}</p>
                </div>
              </div>

              {selectedAssessment.notes && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Notes</h3>
                  <p className="mt-1 whitespace-pre-wrap">{selectedAssessment.notes}</p>
                </div>
              )}

              {/* Add buttons for actions based on role and assessment status */}
              <div className="flex justify-end space-x-2 mt-4">
                {isInstructor && selectedAssessment.status !== "completed" && (
                  <Button onClick={() => startGrading(selectedAssessment)}>
                    {selectedAssessment.status === "pending" ? "Start Grading" : "Continue Grading"}
                  </Button>
                )}
                
                {isInstructor && selectedAssessment.status === "pending" && (
                  <Button 
                    variant="outline"
                    onClick={() => updateAssessmentMutation.mutate({
                      id: selectedAssessment.id,
                      data: { status: "in_progress" }
                    })}
                  >
                    Mark as In Progress
                  </Button>
                )}
                
                {isInstructor && selectedAssessment.status !== "completed" && (
                  <Button 
                    variant="destructive"
                    onClick={() => updateAssessmentMutation.mutate({
                      id: selectedAssessment.id,
                      data: { status: "canceled" }
                    })}
                  >
                    Cancel Assessment
                  </Button>
                )}
                
                <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
};

export default AssessmentsPage;