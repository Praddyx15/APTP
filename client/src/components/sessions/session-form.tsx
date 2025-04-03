import { useState, useEffect } from "react";
import { useApp } from "@/contexts/app-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { X, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrainingProgram, Module, User, Resource, ExtendedSession } from "@shared/schema";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { extendedSessionSchema } from "@shared/schema";

export default function SessionForm() {
  const { 
    cancelSessionCreation,
    programs,
    refreshSessions 
  } = useApp();
  const { toast } = useToast();
  const { user } = useAuth();

  // Get trainees and resources
  const { data: trainees = [] } = useQuery<User[]>({
    queryKey: ["/api/protected/users/trainees"],
  });

  const { data: resources = [] } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
  });

  // Form validation schema with more flexible validation
  const sessionFormSchema = extendedSessionSchema.extend({
    programId: z.coerce.number().min(1, "Please select a program"),
    moduleId: z.coerce.number().min(1, "Please select a module"),
    resourceId: z.number().optional().nullable(),
  });
  type SessionFormValues = z.infer<typeof sessionFormSchema>;

  // Form initialization
  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      programId: 0,
      moduleId: 0,
      status: "scheduled",
      startTime: new Date(),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
      resourceId: null, // Using null instead of undefined to prevent type issues
      instructorId: user?.id || 0, // Use current user ID if available
      trainees: [],
    },
  });

  // Get modules for selected program
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [availableModules, setAvailableModules] = useState<Module[]>([]);

  // Fetch modules for selected program
  const { data: modulesByProgram = [] } = useQuery<Module[]>({
    queryKey: ["/api/modules", selectedProgramId],
    enabled: !!selectedProgramId,
  });

  useEffect(() => {
    if (selectedProgramId && modulesByProgram.length > 0) {
      setAvailableModules(modulesByProgram);
    } else {
      setAvailableModules([]);
    }
  }, [selectedProgramId, modulesByProgram]);

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: SessionFormValues) => {
      const res = await apiRequest("POST", "/api/protected/sessions", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Session scheduled",
        description: "The training session has been scheduled successfully.",
      });
      refreshSessions();
      cancelSessionCreation();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to schedule session",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: SessionFormValues) => {
    // Make sure instructorId is set from current user if it's 0
    if (data.instructorId === 0 && user) {
      data.instructorId = user.id;
    }
    
    // Ensure data is properly formatted
    const formattedData = {
      ...data,
      programId: Number(data.programId),
      moduleId: Number(data.moduleId),
      resourceId: data.resourceId ? Number(data.resourceId) : null,
      startTime: data.startTime instanceof Date ? data.startTime : new Date(data.startTime),
      endTime: data.endTime instanceof Date ? data.endTime : new Date(data.endTime),
    };
    
    createSessionMutation.mutate(formattedData);
  };

  // Handle program change
  const handleProgramChange = (programId: number) => {
    setSelectedProgramId(programId);
    form.setValue("programId", programId);
    form.setValue("moduleId", 0); // Reset module when program changes
  };

  // Handle trainee selection
  const [selectedTrainees, setSelectedTrainees] = useState<number[]>([]);
  
  const addTrainee = (traineeId: number) => {
    if (!selectedTrainees.includes(traineeId)) {
      const newSelectedTrainees = [...selectedTrainees, traineeId];
      setSelectedTrainees(newSelectedTrainees);
      form.setValue("trainees", newSelectedTrainees);
    }
  };
  
  const removeTrainee = (traineeId: number) => {
    const newSelectedTrainees = selectedTrainees.filter(id => id !== traineeId);
    setSelectedTrainees(newSelectedTrainees);
    form.setValue("trainees", newSelectedTrainees);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-bold text-slate-800">Schedule New Session</h2>
            <button
              className="text-slate-500 hover:text-slate-700"
              onClick={cancelSessionCreation}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="programId">Training Program</Label>
              <Controller
                name="programId"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value.toString()}
                    onValueChange={(value) => handleProgramChange(parseInt(value))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs?.map((program) => (
                        <SelectItem key={program.id} value={program.id.toString()}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.programId && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.programId.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="moduleId">Module</Label>
              <Controller
                name="moduleId"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value.toString()}
                    onValueChange={(value) => form.setValue("moduleId", parseInt(value))}
                    disabled={availableModules.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a module" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModules.map((module) => (
                        <SelectItem key={module.id} value={module.id.toString()}>
                          {module.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.moduleId && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.moduleId.message}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Date & Time</Label>
                <Controller
                  name="startTime"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      type="datetime-local"
                      value={field.value instanceof Date ? field.value.toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)}
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                    />
                  )}
                />
                {form.formState.errors.startTime && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.startTime.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="endTime">End Date & Time</Label>
                <Controller
                  name="endTime"
                  control={form.control}
                  render={({ field }) => (
                    <Input
                      type="datetime-local"
                      value={field.value instanceof Date ? field.value.toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)}
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                    />
                  )}
                />
                {form.formState.errors.endTime && (
                  <p className="text-sm text-red-500 mt-1">{form.formState.errors.endTime.message}</p>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="trainees">Trainees</Label>
              <div className="border border-slate-300 rounded-md p-2 min-h-[100px]">
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedTrainees.length > 0 ? (
                    selectedTrainees.map(traineeId => {
                      const trainee = trainees.find(t => t.id === traineeId);
                      return trainee ? (
                        <div key={traineeId} className="inline-flex items-center bg-blue-100 text-blue-700 rounded-full px-3 py-0.5 text-sm font-medium">
                          <span>{trainee.firstName} {trainee.lastName}</span>
                          <button
                            type="button"
                            className="ml-1.5 text-blue-600 hover:text-blue-800"
                            onClick={() => removeTrainee(traineeId)}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : null;
                    })
                  ) : (
                    <p className="text-sm text-slate-500">No trainees selected</p>
                  )}
                </div>
                
                <Select onValueChange={(value) => addTrainee(parseInt(value))}>
                  <SelectTrigger className="w-full border-dashed border-slate-300 text-sm text-blue-600">
                    <div className="flex items-center">
                      <PlusCircle className="h-3.5 w-3.5 mr-1" />
                      Add Trainee
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {trainees
                      .filter(trainee => !selectedTrainees.includes(trainee.id))
                      .map((trainee) => (
                        <SelectItem key={trainee.id} value={trainee.id.toString()}>
                          {trainee.firstName} {trainee.lastName}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {form.formState.errors.trainees && (
                <p className="text-sm text-red-500 mt-1">{form.formState.errors.trainees.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="resourceId">Resource</Label>
              <Controller
                name="resourceId"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value?.toString() || "none"}
                    onValueChange={(value) => field.onChange(value && value !== "none" ? parseInt(value) : null)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a resource" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {resources.map((resource) => (
                        <SelectItem key={resource.id} value={resource.id.toString()}>
                          {resource.name} ({resource.type}, {resource.location})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={cancelSessionCreation}
                className="text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createSessionMutation.isPending}
                className="text-sm bg-blue-500 hover:bg-blue-600 text-white"
              >
                {createSessionMutation.isPending ? "Scheduling..." : "Schedule Session"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
