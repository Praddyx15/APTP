import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/app-context';
import ProgramsList from '@/components/programs/programs-list';
import ProgramDetail from '@/components/programs/program-detail';
import { AppLayout } from '@/components/layouts/app-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, Search, BookOpen, Filter } from 'lucide-react';
import { TrainingProgram } from '@shared/schema';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TrainingProgramsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingProgram, setIsCreatingProgram] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [programType, setProgramType] = useState('all');
  const { selectedProgramId, handleProgramSelect, clearSelectedProgram } = useApp();
  const { toast } = useToast();

  // Program creation schema
  const programSchema = z.object({
    name: z.string().min(1, "Program name is required"),
    description: z.string().min(1, "Description is required"),
    programType: z.string().min(1, "Program type is required"),
    aircraftType: z.string().optional(),
    regulatoryAuthority: z.string().optional(),
    durationDays: z.number().min(1, "Duration must be at least 1 day").optional(),
  });

  // Form for creating a new program
  const programForm = useForm<z.infer<typeof programSchema>>({
    resolver: zodResolver(programSchema),
    defaultValues: {
      name: "",
      description: "",
      programType: "type_rating",
      aircraftType: "",
      regulatoryAuthority: "",
      durationDays: 30,
    }
  });

  // Fetch all training programs
  const { data: programs = [], isLoading, refetch } = useQuery<TrainingProgram[]>({
    queryKey: ['/api/programs'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/programs');
        return await response.json();
      } catch (error) {
        console.error('Error fetching programs:', error);
        return [];
      }
    },
  });

  // Add Program mutation
  const addProgramMutation = useMutation({
    mutationFn: async (data: z.infer<typeof programSchema>) => {
      const res = await apiRequest('POST', '/api/protected/programs', data);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs'] });
      setIsCreatingProgram(false);
      programForm.reset();
      toast({
        title: "Success",
        description: "Training program created successfully",
      });
      handleProgramSelect(data.id);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create program: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle program creation form submission
  const onCreateProgram = (data: z.infer<typeof programSchema>) => {
    addProgramMutation.mutate(data);
  };

  // Filter programs based on selected tab and search query
  const filteredPrograms = programs.filter(program => {
    const matchesSearch = program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (program.description && program.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = programType === 'all' || program.programType === programType;
    
    return matchesSearch && matchesType;
  });

  return (
    <>
      <Helmet>
        <title>Training Programs | Advanced Pilot Training Platform</title>
      </Helmet>
      <AppLayout>
        <div className="space-y-6">
          {selectedProgramId ? (
            <ProgramDetail programId={selectedProgramId} />
          ) : (
            <>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Training Programs</h1>
                  <p className="text-muted-foreground mt-1">
                    Create and manage aviation training curricula for various aircraft types and regulatory requirements
                  </p>
                </div>
                <Button
                  onClick={() => setIsCreatingProgram(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create Program
                </Button>
              </div>

              <div className="flex flex-col lg:flex-row gap-4 mb-6">
                <div className="w-full lg:w-2/3 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search training programs by name or description..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="pl-10"
                  />
                </div>
                <div className="w-full lg:w-1/3">
                  <Select value={programType} onValueChange={setProgramType}>
                    <SelectTrigger>
                      <div className="flex items-center">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filter by program type" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Programs</SelectItem>
                      <SelectItem value="type_rating">Type Rating</SelectItem>
                      <SelectItem value="recurrent">Recurrent Training</SelectItem>
                      <SelectItem value="initial">Initial Training</SelectItem>
                      <SelectItem value="conversion">Conversion Course</SelectItem>
                      <SelectItem value="instructor">Instructor Training</SelectItem>
                      <SelectItem value="examiner">Examiner Certification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-4 w-full md:w-1/2 mb-6">
                  <TabsTrigger value="all">All Programs</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="archive">Archived</TabsTrigger>
                  <TabsTrigger value="draft">Drafts</TabsTrigger>
                </TabsList>
                
                <TabsContent value={activeTab} className="mt-0">
                  <ProgramsList 
                    searchQuery={searchQuery} 
                  />
                </TabsContent>
              </Tabs>
              
              {/* Create Program Dialog */}
              <Dialog open={isCreatingProgram} onOpenChange={setIsCreatingProgram}>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Create New Training Program</DialogTitle>
                    <DialogDescription>
                      Define the basic structure for a new aviation training program
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={programForm.handleSubmit(onCreateProgram)} className="space-y-4 py-4">
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Program Name</Label>
                        <Controller
                          name="name"
                          control={programForm.control}
                          render={({ field }) => (
                            <Input
                              id="name"
                              placeholder="E.g., B737 Type Rating"
                              {...field}
                            />
                          )}
                        />
                        {programForm.formState.errors.name && (
                          <p className="text-sm text-red-500">{programForm.formState.errors.name.message}</p>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="programType">Program Type</Label>
                          <Controller
                            name="programType"
                            control={programForm.control}
                            render={({ field }) => (
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="type_rating">Type Rating</SelectItem>
                                  <SelectItem value="recurrent">Recurrent Training</SelectItem>
                                  <SelectItem value="initial">Initial Training</SelectItem>
                                  <SelectItem value="conversion">Conversion Course</SelectItem>
                                  <SelectItem value="instructor">Instructor Training</SelectItem>
                                  <SelectItem value="examiner">Examiner Certification</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>
                        
                        <div className="grid gap-2">
                          <Label htmlFor="aircraftType">Aircraft Type</Label>
                          <Controller
                            name="aircraftType"
                            control={programForm.control}
                            render={({ field }) => (
                              <Input
                                id="aircraftType"
                                placeholder="E.g., B737, A320"
                                {...field}
                              />
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="regulatoryAuthority">Regulatory Authority</Label>
                          <Controller
                            name="regulatoryAuthority"
                            control={programForm.control}
                            render={({ field }) => (
                              <Input
                                id="regulatoryAuthority"
                                placeholder="E.g., EASA, FAA"
                                {...field}
                              />
                            )}
                          />
                        </div>
                        
                        <div className="grid gap-2">
                          <Label htmlFor="durationDays">Duration (Days)</Label>
                          <Controller
                            name="durationDays"
                            control={programForm.control}
                            render={({ field }) => (
                              <Input
                                id="durationDays"
                                type="number"
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            )}
                          />
                        </div>
                      </div>
                      
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Controller
                          name="description"
                          control={programForm.control}
                          render={({ field }) => (
                            <Textarea
                              id="description"
                              placeholder="Provide a description of the training program..."
                              rows={3}
                              {...field}
                            />
                          )}
                        />
                        {programForm.formState.errors.description && (
                          <p className="text-sm text-red-500">{programForm.formState.errors.description.message}</p>
                        )}
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreatingProgram(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={addProgramMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {addProgramMutation.isPending ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                            Creating...
                          </>
                        ) : (
                          'Create Program'
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </AppLayout>
    </>
  );
}