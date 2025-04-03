import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { format, addDays, startOfWeek, isSameDay, parse, isValid } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Calendar as CalendarIcon, User, Users, Clock, MapPin, Pencil, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layouts/app-layout';

// Define the form schema using zod
const sessionFormSchema = z.object({
  programId: z.coerce.number({
    required_error: "Program is required",
  }),
  moduleId: z.coerce.number({
    required_error: "Module is required",
  }),
  status: z.string().default('scheduled'),
  startTime: z.string().refine(val => {
    return isValid(parse(val, "yyyy-MM-dd'T'HH:mm", new Date()));
  }, {
    message: "Start time is required and must be valid",
  }),
  endTime: z.string().refine(val => {
    return isValid(parse(val, "yyyy-MM-dd'T'HH:mm", new Date()));
  }, {
    message: "End time is required and must be valid",
  }),
  trainees: z.array(z.coerce.number()).optional(),
  resourceId: z.coerce.number().optional(),
  notes: z.string().optional(),
  location: z.string().optional(),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

export default function SchedulePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'month'>('week');
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [isViewingSession, setIsViewingSession] = useState(false);

  // Fetch sessions
  const { data: sessions, isLoading: isLoadingSessions } = useQuery({
    queryKey: ['/api/sessions'],
  });

  // Fetch programs for the form
  const { data: programs } = useQuery({
    queryKey: ['/api/programs'],
  });

  // Fetch modules based on selected program
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const { data: modules } = useQuery({
    queryKey: ['/api/programs', selectedProgramId, 'modules'],
    enabled: !!selectedProgramId,
    queryFn: async () => {
      if (!selectedProgramId) return [];
      const res = await apiRequest('GET', `/api/programs/${selectedProgramId}`);
      const program = await res.json();
      return program.modules || [];
    }
  });

  // Fetch users for the form (trainees)
  const { data: trainees } = useQuery({
    queryKey: ['/api/protected/users/trainees'],
  });

  // Fetch resources for the form
  const { data: resources } = useQuery({
    queryKey: ['/api/resources'],
  });

  // States for editing
  const [isEditingSession, setIsEditingSession] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Create session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (sessionData: SessionFormValues) => {
      const res = await apiRequest('POST', '/api/protected/sessions', sessionData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Session scheduled successfully.",
      });
      form.reset();
      setIsCreatingSession(false);
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule session.",
        variant: "destructive",
      });
    }
  });
  
  // Update session mutation
  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<SessionFormValues> }) => {
      const res = await apiRequest('PUT', `/api/protected/sessions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Session updated successfully.",
      });
      form.reset();
      setIsEditingSession(false);
      setIsViewingSession(false);
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update session.",
        variant: "destructive",
      });
    }
  });

  // Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/protected/sessions/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Session deleted successfully.",
      });
      setIsConfirmingDelete(false);
      setIsViewingSession(false);
      queryClient.invalidateQueries({ queryKey: ['/api/sessions'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete session.",
        variant: "destructive",
      });
    }
  });

  // Define the form
  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      status: 'scheduled',
      trainees: [],
    },
  });

  // Handle form submission
  const onSubmit = (data: SessionFormValues) => {
    if (isEditingSession && selectedSession) {
      updateSessionMutation.mutate({ 
        id: selectedSession.id, 
        data: data
      });
    } else {
      createSessionMutation.mutate(data);
    }
  };
  
  // Start editing session
  const handleEditSession = () => {
    if (!selectedSession) return;
    
    // Set form values from selected session
    form.reset({
      programId: selectedSession.programId,
      moduleId: selectedSession.moduleId,
      status: selectedSession.status,
      startTime: format(new Date(selectedSession.startTime), "yyyy-MM-dd'T'HH:mm"),
      endTime: format(new Date(selectedSession.endTime), "yyyy-MM-dd'T'HH:mm"),
      trainees: selectedSession.trainees || [],
      resourceId: selectedSession.resourceId || undefined,
      notes: selectedSession.notes || '',
      location: selectedSession.location || '',
    });
    
    // Set selected program ID for modules loading
    setSelectedProgramId(selectedSession.programId);
    
    // Close view dialog and open edit dialog
    setIsViewingSession(false);
    setIsEditingSession(true);
  };

  // Handle program change in the form
  const handleProgramChange = (programId: string) => {
    setSelectedProgramId(parseInt(programId));
    // Reset module selection when program changes
    form.setValue('moduleId', 0);
  };

  // Get sessions for the selected date
  const getSessionsForDate = (date: Date) => {
    if (!sessions || !Array.isArray(sessions)) return [];
    
    return sessions.filter((session: any) => {
      const sessionDate = new Date(session.startTime);
      return isSameDay(sessionDate, date);
    });
  };

  // Get sessions for the selected week
  const getSessionsForWeek = (date: Date) => {
    if (!sessions || !Array.isArray(sessions)) return [];
    
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday as week start
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    
    return weekDays.map(day => ({
      date: day,
      sessions: sessions.filter((session: any) => {
        const sessionDate = new Date(session.startTime);
        return isSameDay(sessionDate, day);
      }),
    }));
  };

  // Handle session click
  const handleSessionClick = (session: any) => {
    setSelectedSession(session);
    setIsViewingSession(true);
  };

  // Filter sessions for the current user by role
  const filterSessionsByRole = () => {
    if (!sessions || !Array.isArray(sessions)) return [];
    
    switch(user?.role) {
      case 'instructor':
      case 'examiner':
        return sessions.filter((session: any) => session.instructorId === user?.id);
      case 'trainee':
        return sessions.filter((session: any) => 
          session.trainees && session.trainees.includes(user?.id)
        );
      case 'admin':
      case 'ato_admin':
        return sessions;
      default:
        return [];
    }
  };

  const filteredSessions = filterSessionsByRole();

  // Render day view
  const renderDayView = () => {
    if (!selectedDate) return null;
    
    const sessionsForDay = getSessionsForDate(selectedDate);
    
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</h2>
        
        {sessionsForDay.length === 0 ? (
          <p className="text-gray-500">No sessions scheduled for this day.</p>
        ) : (
          <div className="space-y-2">
            {sessionsForDay.map((session: any, index: number) => (
              <SessionCard 
                key={index} 
                session={session} 
                onClick={() => handleSessionClick(session)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    if (!selectedDate) return null;
    
    const weekData = getSessionsForWeek(selectedDate);
    
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Week of {format(weekData[0].date, 'MMMM d, yyyy')}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          {weekData.map((day, index) => (
            <div 
              key={index} 
              className={`p-2 border rounded-lg ${
                isSameDay(day.date, new Date()) ? 'bg-primary/5 border-primary/20' : ''
              }`}
            >
              <h3 className={`text-sm font-medium ${
                isSameDay(day.date, new Date()) ? 'text-primary' : ''
              }`}>
                {format(day.date, 'EEE, MMM d')}
              </h3>
              
              <div className="mt-2 space-y-1">
                {day.sessions.length === 0 ? (
                  <p className="text-xs text-gray-400">No sessions</p>
                ) : (
                  day.sessions.map((session: any, i: number) => (
                    <div 
                      key={i} 
                      className="p-1 text-xs bg-primary/10 rounded cursor-pointer hover:bg-primary/20"
                      onClick={() => handleSessionClick(session)}
                    >
                      <div className="font-medium truncate">
                        {format(new Date(session.startTime), 'h:mm a')}
                      </div>
                      {programs && programs.find((p: any) => p.id === session.programId)?.name}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render month view with calendar
  const renderMonthView = () => {
    // Create a map of dates with sessions for highlighting in calendar
    const sessionDates = new Map();
    
    if (sessions) {
      sessions.forEach((session: any) => {
        const date = new Date(session.startTime).toDateString();
        const count = sessionDates.get(date) || 0;
        sessionDates.set(date, count + 1);
      });
    }
    
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Calendar</h2>
        
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
          <div className="md:w-1/2">
            <Calendar 
              mode="single" 
              selected={selectedDate} 
              onSelect={setSelectedDate} 
              className="rounded-md border"
              modifiers={{
                hasSession: (date) => {
                  return sessionDates.has(date.toDateString());
                }
              }}
              modifiersClassNames={{
                hasSession: "bg-primary/20 font-medium text-primary"
              }}
            />
          </div>
          
          <div className="md:w-1/2">
            {selectedDate && (
              <div className="border rounded-md p-4">
                <h3 className="font-medium mb-2">{format(selectedDate, 'MMMM d, yyyy')}</h3>
                {renderDayView()}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="container py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
          
          <div className="flex items-center space-x-2">
            <Tabs 
              defaultValue="week" 
              value={viewMode} 
              onValueChange={(v) => setViewMode(v as 'week' | 'day' | 'month')}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
            
            {(user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'ato_admin') && (
              <Button onClick={() => setIsCreatingSession(true)}>
                Schedule Session
              </Button>
            )}
          </div>
        </div>
        
        {isLoadingSessions ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary/70" />
          </div>
        ) : (
          <div>
            {viewMode === 'day' && renderDayView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'month' && renderMonthView()}
          </div>
        )}
      </div>
      
      {/* Create Session Dialog */}
      <Dialog open={isCreatingSession} onOpenChange={setIsCreatingSession}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Schedule a new session</DialogTitle>
            <DialogDescription>
              Create a new training session. Fill out the details below.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="programId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Training Program</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleProgramChange(value);
                        }}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select program" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {programs?.map((program: any) => (
                            <SelectItem key={program.id} value={program.id.toString()}>
                              {program.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="moduleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Module</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        defaultValue={field.value?.toString()}
                        disabled={!selectedProgramId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select module" />
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
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="trainees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trainees</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        const currentValues = field.value || [];
                        const valueNum = parseInt(value);
                        
                        // Toggle selection
                        if (currentValues.includes(valueNum)) {
                          field.onChange(currentValues.filter(v => v !== valueNum));
                        } else {
                          field.onChange([...currentValues, valueNum]);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select trainees" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {trainees?.map((trainee: any) => (
                          <SelectItem 
                            key={trainee.id} 
                            value={trainee.id.toString()}
                            className={field.value?.includes(trainee.id) ? "bg-primary/20" : ""}
                          >
                            {trainee.firstName} {trainee.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Selected: {field.value?.length || 0} trainees
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="resourceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resource (Optional)</FormLabel>
                    <Select 
                      onValueChange={field.onChange}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select resource (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">None</SelectItem>
                        {resources?.map((resource: any) => (
                          <SelectItem key={resource.id} value={resource.id.toString()}>
                            {resource.name} ({resource.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any notes or instructions for this session"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreatingSession(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSessionMutation.isPending}
                >
                  {createSessionMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    'Schedule Session'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* View Session Dialog */}
      <Dialog open={isViewingSession} onOpenChange={setIsViewingSession}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedSession && (
            <>
              <DialogHeader>
                <DialogTitle>Session Details</DialogTitle>
                <div className="flex justify-between items-center">
                  <div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      selectedSession.status === 'completed' 
                        ? 'bg-green-100 text-green-800' 
                        : selectedSession.status === 'cancelled' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-primary/20 text-primary'
                    }`}>
                      {selectedSession.status}
                    </span>
                  </div>
                  <DialogDescription>
                    ID: {selectedSession.id}
                  </DialogDescription>
                </div>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-lg">
                    {programs?.find((p: any) => p.id === selectedSession.programId)?.name}
                  </h3>
                  <p className="text-muted-foreground">
                    {modules?.find((m: any) => m.id === selectedSession.moduleId)?.name}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(selectedSession.startTime), 'MMMM d, yyyy')}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {format(new Date(selectedSession.startTime), 'h:mm a')} - 
                      {format(new Date(selectedSession.endTime), 'h:mm a')}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-start space-x-2">
                  <User className="h-4 w-4 text-muted-foreground mt-1" />
                  <div>
                    <p className="font-medium">Instructor</p>
                    {user?.id === selectedSession.instructorId ? (
                      <p>You</p>
                    ) : (
                      <p>
                        {trainees?.find((t: any) => t.id === selectedSession.instructorId)?.firstName || 'Unknown'}{' '}
                        {trainees?.find((t: any) => t.id === selectedSession.instructorId)?.lastName || 'Instructor'}
                      </p>
                    )}
                  </div>
                </div>
                
                {selectedSession.trainees && selectedSession.trainees.length > 0 && (
                  <div className="flex items-start space-x-2">
                    <Users className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="font-medium">Trainees ({selectedSession.trainees.length})</p>
                      <ul className="list-disc list-inside">
                        {selectedSession.trainees.map((traineeId: number) => {
                          const trainee = trainees?.find((t: any) => t.id === traineeId);
                          return (
                            <li key={traineeId}>
                              {trainee ? `${trainee.firstName} ${trainee.lastName}` : `Trainee #${traineeId}`}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                )}
                
                {selectedSession.resourceId && selectedSession.resourceId !== 0 && (
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="font-medium">Resource</p>
                      <p>
                        {resources?.find((r: any) => r.id === selectedSession.resourceId)?.name || 'Unknown Resource'}
                      </p>
                    </div>
                  </div>
                )}
                
                {selectedSession.location && (
                  <div className="flex items-start space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p>{selectedSession.location}</p>
                    </div>
                  </div>
                )}
                
                {selectedSession.notes && (
                  <div className="border-t pt-2">
                    <p className="font-medium">Notes</p>
                    <p className="text-sm">{selectedSession.notes}</p>
                  </div>
                )}
              </div>
              
              <DialogFooter className="flex justify-between">
                <div>
                  {(user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'ato_admin') && (
                    <AlertDialog open={isConfirmingDelete} onOpenChange={setIsConfirmingDelete}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this training session and cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteSessionMutation.mutate(selectedSession.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleteSessionMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-1" />
                            ) : (
                              <Trash2 className="h-4 w-4 mr-1" />
                            )}
                            Delete Session
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsViewingSession(false)}
                  >
                    Close
                  </Button>
                  
                  {(user?.role === 'instructor' || user?.role === 'admin' || user?.role === 'ato_admin') && (
                    <Button onClick={handleEditSession}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit Session
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

// Session card component
function SessionCard({ session, onClick }: { session: any, onClick: () => void }) {
  return (
    <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium">
              {format(new Date(session.startTime), 'h:mm a')} - {format(new Date(session.endTime), 'h:mm a')}
            </h3>
            <p className="text-sm text-muted-foreground flex items-center mt-1">
              <Clock className="w-3 h-3 mr-1" />
              {format(new Date(session.startTime), 'EEE, MMM d, yyyy')}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="flex items-center">
                <User className="w-3 h-3 mr-1" />
                Instructor: {session.instructorId}
              </span>
            </p>
          </div>
          
          <div className="text-right">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
              {session.status}
            </span>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-end">
              <Users className="w-3 h-3 mr-1" />
              {session.trainees?.length || 0} trainees
            </p>
            {session.location && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center justify-end">
                <MapPin className="w-3 h-3 mr-1" />
                {session.location}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}