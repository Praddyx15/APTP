import { useState } from "react";
import { useApp } from "@/contexts/app-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Assessment, Grade, Session } from "@shared/schema";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

export default function AssessmentForm() {
  const { editedAssessment, cancelAssessmentEdit } = useApp();
  const { toast } = useToast();

  // Get trainees
  const { data: trainees = [] } = useQuery<User[]>({
    queryKey: ["/api/protected/users/trainees"],
  });

  // Get sessions
  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  // Define form schema
  const assessmentSchema = z.object({
    traineeId: z.number({ required_error: "Trainee is required" }),
    sessionId: z.number({ required_error: "Session is required" }),
    moduleId: z.number({ required_error: "Module is required" }),
    grades: z.array(z.object({
      competencyAreaId: z.string(),
      score: z.number().min(1).max(5),
      comments: z.string().optional()
    })).min(1, "At least one grade is required")
  });

  type AssessmentFormValues = z.infer<typeof assessmentSchema>;

  // Predefined competency areas
  const competencyAreas = [
    { id: "technical_knowledge", name: "Technical Knowledge" },
    { id: "procedural_execution", name: "Procedural Execution" },
    { id: "situational_awareness", name: "Situational Awareness" },
    { id: "communication_skills", name: "Communication Skills" },
    { id: "decision_making", name: "Decision Making" }
  ];

  // Initialize form
  const form = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: editedAssessment ? {
      traineeId: editedAssessment.traineeId,
      sessionId: editedAssessment.sessionId,
      moduleId: editedAssessment.moduleId,
      grades: editedAssessment.grades || []
    } : {
      traineeId: 0,
      sessionId: 0,
      moduleId: 0,
      grades: competencyAreas.map(area => ({
        competencyAreaId: area.id,
        score: 3,
        comments: ""
      }))
    }
  });

  // Get modules based on selected session
  const [selectedSession, setSelectedSession] = useState<Session | null>(
    editedAssessment ? sessions.find(s => s.id === editedAssessment.sessionId) || null : null
  );

  // Update module when session changes
  const handleSessionChange = (sessionId: number) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setSelectedSession(session);
      form.setValue("sessionId", sessionId);
      form.setValue("moduleId", session.moduleId);
    }
  };

  // Save assessment mutation
  const saveAssessmentMutation = useMutation({
    mutationFn: async (data: AssessmentFormValues) => {
      // If editing, update existing assessment
      if (editedAssessment) {
        // Update assessment
        await apiRequest("PUT", `/api/instructor/assessments/${editedAssessment.id}`, {
          status: "graded"
        });
        
        // Update or create grades
        for (const grade of data.grades) {
          const existingGrade = editedAssessment.grades?.find(g => g.competencyAreaId === grade.competencyAreaId);
          if (existingGrade) {
            await apiRequest("PUT", `/api/instructor/grades/${existingGrade.id}`, grade);
          } else {
            await apiRequest("POST", `/api/instructor/assessments/${editedAssessment.id}/grades`, grade);
          }
        }
        
        return editedAssessment;
      } 
      // Otherwise create new assessment
      else {
        // Create assessment
        const res = await apiRequest("POST", "/api/instructor/assessments", {
          traineeId: data.traineeId,
          sessionId: data.sessionId,
          moduleId: data.moduleId,
          date: new Date(),
          status: "graded"
        });
        
        const newAssessment = await res.json();
        
        // Create grades
        for (const grade of data.grades) {
          await apiRequest("POST", `/api/instructor/assessments/${newAssessment.id}/grades`, grade);
        }
        
        return newAssessment;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/protected/assessments"] });
      toast({
        title: editedAssessment ? "Assessment updated" : "Assessment created",
        description: editedAssessment ? 
          "The assessment has been updated successfully." : 
          "The assessment has been created successfully."
      });
      cancelAssessmentEdit();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save assessment",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: AssessmentFormValues) => {
    saveAssessmentMutation.mutate(data);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          {editedAssessment ? "Edit Assessment" : "Create Assessment"}
        </h1>
        <Button variant="ghost" size="sm" onClick={cancelAssessmentEdit}>
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="traineeId">Trainee</Label>
            <Controller
              name="traineeId"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value.toString()}
                  onValueChange={(value) => field.onChange(parseInt(value))}
                  disabled={!!editedAssessment}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a trainee" />
                  </SelectTrigger>
                  <SelectContent>
                    {trainees.map((trainee) => (
                      <SelectItem key={trainee.id} value={trainee.id.toString()}>
                        {trainee.firstName} {trainee.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.traineeId && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.traineeId.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="sessionId">Training Session</Label>
            <Controller
              name="sessionId"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value.toString()}
                  onValueChange={(value) => handleSessionChange(parseInt(value))}
                  disabled={!!editedAssessment}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((session) => {
                      const formattedDate = new Date(session.startTime).toLocaleDateString();
                      return (
                        <SelectItem key={session.id} value={session.id.toString()}>
                          Session on {formattedDate}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.sessionId && (
              <p className="text-sm text-red-500 mt-1">{form.formState.errors.sessionId.message}</p>
            )}
          </div>
        </div>
        
        <div className="border-t border-slate-200 pt-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Competency Assessment</h2>
          
          <div className="space-y-6">
            {competencyAreas.map((area, index) => (
              <div key={area.id} className="border border-slate-200 rounded-md p-4">
                <h3 className="font-medium text-slate-800 mb-3">{area.name}</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor={`grades.${index}.score`}>Score (1-5)</Label>
                    <div className="flex space-x-4 mt-2">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <label key={score} className="flex items-center space-x-2 cursor-pointer">
                          <Controller
                            name={`grades.${index}.score`}
                            control={form.control}
                            render={({ field }) => (
                              <input
                                type="radio"
                                className="h-4 w-4 text-primary border-slate-300 focus:ring-primary"
                                value={score}
                                checked={field.value === score}
                                onChange={() => {
                                  field.onChange(score);
                                  // Also update the competencyAreaId
                                  form.setValue(`grades.${index}.competencyAreaId`, area.id);
                                }}
                              />
                            )}
                          />
                          <span>{score}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor={`grades.${index}.comments`}>Comments</Label>
                    <Controller
                      name={`grades.${index}.comments`}
                      control={form.control}
                      render={({ field }) => (
                        <Textarea
                          placeholder="Add comments about this competency area..."
                          className="mt-1"
                          {...field}
                        />
                      )}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={cancelAssessmentEdit}
            className="text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saveAssessmentMutation.isPending}
            className="text-sm bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Save className="h-4 w-4 mr-1.5" />
            {saveAssessmentMutation.isPending ? "Saving..." : "Save Assessment"}
          </Button>
        </div>
      </form>
    </div>
  );
}
