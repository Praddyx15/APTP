/**
 * Session Scheduler Component
 * Allows users to create, view, and manage training sessions
 */
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Calendar, Clock, Users, User, MapPin, Bookmark, FileText, CheckSquare } from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { SessionType, SessionStatus, SessionCreateRequest, TrainingSession } from '@shared/session-types';
import { useCreateSession, useUpdateSession, useDeleteSession, useUpcomingSessions } from '@/hooks/use-session-api';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// Form schema for creating/editing sessions
const sessionFormSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().optional(),
  date: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid date'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)')
    .refine((endTime) => {
      // Simple validation first - full validation will be in form submission
      return true;
    }, 'End time must be after start time'),
  location: z.string().min(2, 'Location is required'),
  type: z.enum(['flight', 'simulator', 'classroom', 'briefing', 'debriefing', 'assessment', 'examination', 'meeting'], 
    { required_error: 'Session type is required' }),
  trainees: z.array(z.string()).min(1, 'At least one trainee must be selected'),
  instructorId: z.string({ required_error: 'Instructor is required' }),
  resourceIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

// Session type display configuration
const sessionTypeConfig = {
  flight: { 
    label: 'Flight Training', 
    icon: <span className="bg-blue-500/20 p-2 rounded-full text-blue-500"><Clock className="h-4 w-4" /></span>,
    color: 'bg-blue-100 text-blue-800' 
  },
  simulator: { 
    label: 'Simulator', 
    icon: <span className="bg-indigo-500/20 p-2 rounded-full text-indigo-500"><Calendar className="h-4 w-4" /></span>,
    color: 'bg-indigo-100 text-indigo-800' 
  },
  classroom: { 
    label: 'Classroom', 
    icon: <span className="bg-emerald-500/20 p-2 rounded-full text-emerald-500"><Users className="h-4 w-4" /></span>,
    color: 'bg-emerald-100 text-emerald-800' 
  },
  briefing: { 
    label: 'Briefing', 
    icon: <span className="bg-amber-500/20 p-2 rounded-full text-amber-500"><FileText className="h-4 w-4" /></span>,
    color: 'bg-amber-100 text-amber-800' 
  },
  debriefing: { 
    label: 'Debriefing', 
    icon: <span className="bg-teal-500/20 p-2 rounded-full text-teal-500"><CheckSquare className="h-4 w-4" /></span>,
    color: 'bg-teal-100 text-teal-800' 
  },
  assessment: { 
    label: 'Assessment', 
    icon: <span className="bg-rose-500/20 p-2 rounded-full text-rose-500"><Bookmark className="h-4 w-4" /></span>,
    color: 'bg-rose-100 text-rose-800' 
  },
  examination: { 
    label: 'Examination', 
    icon: <span className="bg-red-500/20 p-2 rounded-full text-red-500"><Bookmark className="h-4 w-4" /></span>,
    color: 'bg-red-100 text-red-800' 
  },
  meeting: { 
    label: 'Meeting', 
    icon: <span className="bg-purple-500/20 p-2 rounded-full text-purple-500"><Users className="h-4 w-4" /></span>,
    color: 'bg-purple-100 text-purple-800' 
  }
};

// Status badges
const statusBadges = {
  'scheduled': { color: 'bg-blue-100 text-blue-800' },
  'confirmed': { color: 'bg-green-100 text-green-800' },
  'in-progress': { color: 'bg-indigo-100 text-indigo-800' },
  'completed': { color: 'bg-slate-100 text-slate-800' },
  'cancelled': { color: 'bg-red-100 text-red-800' },
  'rescheduled': { color: 'bg-amber-100 text-amber-800' },
  'pending-approval': { color: 'bg-orange-100 text-orange-800' },
};

// Sample data for trainees - replace with actual API data
const SAMPLE_TRAINEES = [
  { id: 'ST1001', name: 'John Smith', email: 'john@example.com' },
  { id: 'ST1002', name: 'Maria Garcia', email: 'maria@example.com' },
  { id: 'ST1003', name: 'Ahmed Hassan', email: 'ahmed@example.com' },
  { id: 'ST1004', name: 'Sarah Johnson', email: 'sarah@example.com' },
  { id: 'ST1005', name: 'Li Wei', email: 'liwei@example.com' },
];

// Sample data for instructors - replace with actual API data
const SAMPLE_INSTRUCTORS = [
  { id: 'INS1001', name: 'Captain Alex Miller', email: 'alex@example.com' },
  { id: 'INS1002', name: 'Captain Olivia Chen', email: 'olivia@example.com' },
  { id: 'INS1003', name: 'Captain David Kim', email: 'david@example.com' },
];

// Sample data for resources - replace with actual API data
const SAMPLE_RESOURCES = [
  { id: 'SIM001', name: 'B737 Simulator A', type: 'simulator' },
  { id: 'SIM002', name: 'B737 Simulator B', type: 'simulator' },
  { id: 'SIM003', name: 'A320 Simulator', type: 'simulator' },
  { id: 'AC5078A', name: 'Cessna 172 (N5078A)', type: 'aircraft' },
  { id: 'AC5079B', name: 'Cessna 172 (N5079B)', type: 'aircraft' },
  { id: 'ROOM201', name: 'Classroom 201', type: 'classroom' },
  { id: 'ROOM202', name: 'Classroom 202', type: 'classroom' },
  { id: 'BR001', name: 'Briefing Room 1', type: 'briefing-room' },
  { id: 'BR002', name: 'Briefing Room 2', type: 'briefing-room' },
];

type SessionTab = 'upcoming' | 'create';

interface SessionSchedulerProps {
  variant?: 'instructor' | 'trainee' | 'admin' | 'ato' | 'airline';
  initialTab?: SessionTab;
  onSuccess?: () => void;
}

export function SessionScheduler({ 
  variant = 'instructor', 
  initialTab = 'upcoming',
  onSuccess
}: SessionSchedulerProps) {
  const { user } = useAuth();
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const { data: upcomingSessionsData, isLoading: isLoadingSessions } = useUpcomingSessions();
  const createSessionMutation = useCreateSession();
  const updateSessionMutation = useUpdateSession();
  const deleteSessionMutation = useDeleteSession();
  
  const form = useForm<z.infer<typeof sessionFormSchema>>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      title: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: '09:00',
      endTime: '12:00',
      location: '',
      type: 'classroom',
      trainees: [],
      instructorId: variant === 'instructor' ? String(user?.id || '') : '',
      resourceIds: [],
      notes: '',
    },
  });
  
  // Reset form when tab changes to create
  React.useEffect(() => {
    if (activeTab === 'create') {
      form.reset({
        title: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '12:00',
        location: '',
        type: 'classroom',
        trainees: [],
        instructorId: variant === 'instructor' ? String(user?.id || '') : '',
        resourceIds: [],
        notes: '',
      });
      setSelectedSession(null);
    }
  }, [activeTab, form, user?.id, variant]);
  
  const handleEditSession = (session: TrainingSession) => {
    setSelectedSession(session);
    form.reset({
      title: session.title,
      description: session.description || '',
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      location: session.location,
      type: session.type,
      trainees: session.trainees,
      instructorId: session.instructorId,
      resourceIds: session.resourceIds || [],
      notes: session.notes || '',
    });
    setActiveTab('create');
  };
  
  const handleCancelEdit = () => {
    setSelectedSession(null);
    form.reset();
    setActiveTab('upcoming');
  };
  
  const handleDeleteSession = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        await deleteSessionMutation.mutateAsync(id);
        toast({
          title: "Session deleted",
          description: "The session has been successfully deleted.",
        });
        if (onSuccess) onSuccess();
      } catch (error) {
        toast({
          title: "Error",
          description: `Failed to delete session: ${error.message}`,
          variant: "destructive"
        });
      }
    }
  };
  
  const onSubmit = async (data: z.infer<typeof sessionFormSchema>) => {
    try {
      // Validate endTime is after startTime
      if (data.startTime >= data.endTime) {
        toast({
          title: "Validation Error",
          description: "End time must be after start time",
          variant: "destructive"
        });
        return;
      }
      
      // Ensure all required fields are present
      const sessionData = {
        ...data,
        endTime: data.endTime || '17:00',  // Provide default if missing
        startTime: data.startTime || '09:00', // Provide default if missing
      };
      
      if (selectedSession) {
        // Update existing session
        await updateSessionMutation.mutateAsync({
          id: selectedSession.id,
          ...sessionData
        });
        toast({
          title: "Session updated",
          description: "The session has been successfully updated.",
        });
      } else {
        // Create new session
        await createSessionMutation.mutateAsync(sessionData);
        toast({
          title: "Session created",
          description: "The new session has been successfully created.",
        });
      }
      
      // Reset form and switch to upcoming tab
      form.reset();
      setSelectedSession(null);
      setActiveTab('upcoming');
      if (onSuccess) onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${selectedSession ? 'update' : 'create'} session: ${error.message}`,
        variant: "destructive"
      });
    }
  };
  
  const getSessionTypeLabel = (type: SessionType) => sessionTypeConfig[type]?.label || type;
  
  const isReadOnly = variant === 'trainee';
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Training Sessions</CardTitle>
        <CardDescription>
          View upcoming sessions and {!isReadOnly && 'schedule new training activities'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value: SessionTab) => setActiveTab(value)}>
          <TabsList className="mb-4">
            <TabsTrigger value="upcoming">Upcoming Sessions</TabsTrigger>
            {!isReadOnly && <TabsTrigger value="create">{selectedSession ? 'Edit Session' : 'Create Session'}</TabsTrigger>}
          </TabsList>
          <TabsContent value="upcoming">
            <div className="space-y-4">
              {isLoadingSessions ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : upcomingSessionsData?.sessions && upcomingSessionsData.sessions.length > 0 ? (
                <ScrollArea className="h-96">
                  {upcomingSessionsData.sessions.map((session) => (
                    <div key={session.id} className="mb-4 p-4 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          {sessionTypeConfig[session.type].icon}
                          <div>
                            <h3 className="font-semibold text-lg">{session.title}</h3>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>{format(new Date(session.date), 'MMM d, yyyy')}</span>
                              <span>•</span>
                              <Clock className="h-3.5 w-3.5" />
                              <span>{session.startTime} - {session.endTime}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{session.location}</span>
                            </div>
                            {session.description && (
                              <p className="text-sm mt-2">{session.description}</p>
                            )}
                            <div className="flex gap-2 mt-2">
                              <Badge className={cn(sessionTypeConfig[session.type].color)}>
                                {getSessionTypeLabel(session.type)}
                              </Badge>
                              <Badge className={cn(statusBadges[session.status]?.color)}>
                                {session.status.replace('-', ' ')}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {!isReadOnly && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditSession(session)}
                            >
                              Edit
                            </Button>
                            {['admin', 'ato', 'airline'].includes(variant) && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteSession(session.id)}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="mt-4 pt-3 border-t">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">Instructor</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback>
                                  {SAMPLE_INSTRUCTORS.find(i => i.id === session.instructorId)?.name.charAt(0) || 'I'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {SAMPLE_INSTRUCTORS.find(i => i.id === session.instructorId)?.name || 'Unknown Instructor'}
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Trainees ({session.trainees.length})</p>
                            <div className="flex -space-x-2 mt-1">
                              {session.trainees.slice(0, 3).map((traineeId, index) => (
                                <Avatar key={index} className="h-6 w-6 border-2 border-background">
                                  <AvatarFallback>
                                    {SAMPLE_TRAINEES.find(t => t.id === traineeId)?.name.charAt(0) || 'T'}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                              {session.trainees.length > 3 && (
                                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs">
                                  +{session.trainees.length - 3}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No upcoming sessions found.</p>
                </div>
              )}
            </div>
          </TabsContent>
          {!isReadOnly && (
            <TabsContent value="create">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Session Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Session Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(sessionTypeConfig).map(([value, config]) => (
                                <SelectItem key={value} value={value}>
                                  <div className="flex items-center gap-2">
                                    {React.cloneElement(config.icon as React.ReactElement, { className: 'h-4 w-4' })}
                                    <span>{config.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Description of the session"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Provide a brief description of the session content
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
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
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
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
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Location" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {variant !== 'instructor' && (
                    <FormField
                      control={form.control}
                      name="instructorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instructor</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select instructor" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {SAMPLE_INSTRUCTORS.map((instructor) => (
                                <SelectItem key={instructor.id} value={instructor.id}>
                                  {instructor.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <FormField
                    control={form.control}
                    name="trainees"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trainees</FormLabel>
                        <div className="space-y-2">
                          {SAMPLE_TRAINEES.map((trainee) => (
                            <div key={trainee.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`trainee-${trainee.id}`}
                                checked={field.value.includes(trainee.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    field.onChange([...field.value, trainee.id]);
                                  } else {
                                    field.onChange(field.value.filter((id) => id !== trainee.id));
                                  }
                                }}
                              />
                              <label 
                                htmlFor={`trainee-${trainee.id}`}
                                className="text-sm cursor-pointer flex items-center gap-2"
                              >
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback>{trainee.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                {trainee.name}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="resourceIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Resources (Optional)</FormLabel>
                        <div className="space-y-2">
                          {SAMPLE_RESOURCES.map((resource) => (
                            <div key={resource.id} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`resource-${resource.id}`}
                                checked={field.value?.includes(resource.id)}
                                onChange={(e) => {
                                  const currentValues = field.value || [];
                                  if (e.target.checked) {
                                    field.onChange([...currentValues, resource.id]);
                                  } else {
                                    field.onChange(currentValues.filter((id) => id !== resource.id));
                                  }
                                }}
                              />
                              <label 
                                htmlFor={`resource-${resource.id}`}
                                className="text-sm cursor-pointer"
                              >
                                {resource.name} ({resource.type})
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Additional Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any additional notes"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createSessionMutation.isPending || updateSessionMutation.isPending}
                    >
                      {createSessionMutation.isPending || updateSessionMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Saving...</span>
                        </div>
                      ) : (
                        <span>{selectedSession ? 'Update Session' : 'Create Session'}</span>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}