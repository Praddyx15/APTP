import { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { AppLayout } from '@/components/layouts/app-layout';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  BookOpen,
  FileText,
  Upload,
  Sparkles,
  Save,
  Clock,
  CheckCircle2,
  Loader2,
  List,
  PlusCircle,
  Trash2,
  AlertTriangle,
  Download,
  Search,
  Copy,
  FileUp,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// Syllabus generation form schema
const syllabusFormSchema = z.object({
  programType: z.enum(['custom', 'initial_type_rating', 'recurrent', 'joc_mcc', 'type_conversion', 'instructor']),
  includeSimulatorExercises: z.boolean().default(true),
  includeClassroomModules: z.boolean().default(true),
  includeAircraftSessions: z.boolean().default(true),
  includeAssessments: z.boolean().default(true),
  regulatoryAuthority: z.enum(['faa', 'easa', 'caac', 'tcca', 'other']),
  customAuthority: z.string().optional(),
  aircraftType: z.string().min(2, 'Aircraft type is required'),
  regulationVersion: z.string().optional(),
  trainingGoals: z.string().optional(),
  customRequirements: z.string().optional(),
  documentId: z.number().optional(),
  templateId: z.number().optional(),
  multiLanguageSupport: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof syllabusFormSchema>;

// Default values for the form
const defaultValues: Partial<FormValues> = {
  programType: 'initial_type_rating',
  includeSimulatorExercises: true,
  includeClassroomModules: true,
  includeAircraftSessions: true,
  includeAssessments: true,
  regulatoryAuthority: 'faa',
  aircraftType: '',
  trainingGoals: '',
  customRequirements: '',
  multiLanguageSupport: [],
};

// Mock progress states for syllabus generation
enum GenerationStatus {
  IDLE = 'idle',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export default function SyllabusGeneratorPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('fromScratch');
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [generatedSyllabusId, setGeneratedSyllabusId] = useState<number | null>(null);

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(syllabusFormSchema),
    defaultValues,
  });

  // Fetch documents for the document upload tab
  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ['/api/documents'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/documents');
      return await response.json();
    },
  });

  // Fetch templates for the template tab
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/syllabus-templates'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/syllabus-templates');
      return await response.json();
    },
  });

  // Fetch generated syllabus
  const { data: generatedSyllabus, isLoading: syllabusLoading } = useQuery({
    queryKey: ['/api/syllabus', generatedSyllabusId],
    queryFn: async () => {
      if (!generatedSyllabusId) return null;
      const response = await apiRequest('GET', `/api/syllabus/${generatedSyllabusId}`);
      return await response.json();
    },
    enabled: !!generatedSyllabusId,
  });

  // Function to poll generation progress
  const pollGenerationProgress = useCallback((generationId: string) => {
    // Set generation status to processing
    setGenerationStatus(GenerationStatus.PROCESSING);
    
    // Create the polling interval
    const pollInterval = setInterval(async () => {
      try {
        // Fetch progress
        const response = await apiRequest('GET', `/api/syllabus/generation/${generationId}/progress`);
        const progressData = await response.json();
        
        // Update UI with progress
        setGenerationProgress(progressData.progress);
        
        // Check if processing is complete
        if (progressData.status === 'completed' && progressData.syllabusId) {
          // Clear interval
          clearInterval(pollInterval);
          
          // Set the syllabusId to trigger loading of the generated syllabus
          setGeneratedSyllabusId(progressData.syllabusId);
          
          // Update generation status
          setGenerationStatus(GenerationStatus.COMPLETED);
          
          // Show success toast
          toast({
            title: "Syllabus Generated Successfully",
            description: "Your training syllabus has been created.",
          });
        } else if (progressData.status === 'failed') {
          // Clear interval
          clearInterval(pollInterval);
          
          // Update generation status
          setGenerationStatus(GenerationStatus.ERROR);
          
          // Show error toast
          toast({
            title: "Generation Failed",
            description: progressData.error || "There was a problem generating the syllabus.",
            variant: "destructive",
          });
        }
      } catch (error) {
        // Log error but continue polling
        console.error("Error polling generation progress:", error);
      }
    }, 2000); // Poll every 2 seconds
    
    // Cleanup function
    return () => clearInterval(pollInterval);
  }, [toast, setGenerationProgress, setGenerationStatus, setGeneratedSyllabusId]);

  // Generate syllabus mutation
  const generateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Add document or template ID based on the active tab
      if (activeTab === 'fromDocument' && selectedDocument) {
        data.documentId = selectedDocument;
      } else if (activeTab === 'fromTemplate' && selectedTemplate) {
        data.templateId = selectedTemplate;
      }
      
      // Send the API request to generate the syllabus
      const response = await apiRequest('POST', '/api/syllabus/generate', {
        documentId: data.documentId,
        options: {
          programType: data.programType,
          aircraftType: data.aircraftType,
          regulatoryAuthority: data.regulatoryAuthority,
          includeSimulatorExercises: data.includeSimulatorExercises,
          includeClassroomModules: data.includeClassroomModules,
          includeAircraftSessions: data.includeAircraftSessions,
          includeAssessments: data.includeAssessments,
          customRequirements: data.customRequirements,
          trainingGoals: data.trainingGoals,
        }
      });
      
      const result = await response.json();
      return result;
    },
    onSuccess: (data) => {
      // Use the generationId to poll for progress
      if (data.generationId) {
        // Start polling for progress
        pollGenerationProgress(data.generationId);
      } else if (data.id) {
        setGeneratedSyllabusId(data.id);
        toast({
          title: "Syllabus Generated Successfully",
          description: "Your training syllabus has been created.",
        });
        setGenerationStatus(GenerationStatus.COMPLETED);
      }
    },
    onError: (error) => {
      toast({
        title: "Error Generating Syllabus",
        description: "There was a problem generating your syllabus.",
        variant: "destructive",
      });
      setGenerationStatus(GenerationStatus.ERROR);
    }
  });



  // Submit handler for the form
  const onSubmit = (data: FormValues) => {
    setGenerationStatus(GenerationStatus.PROCESSING);
    setGenerationProgress(0);
    
    // Generate the syllabus
    generateMutation.mutate(data);
  };

  // Handle document selection
  const handleDocumentSelect = (documentId: number) => {
    setSelectedDocument(documentId);
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: number) => {
    setSelectedTemplate(templateId);
    
    // If we have templates data, find the selected template and update form values
    if (templates) {
      const template = templates.find((t: any) => t.id === templateId);
      if (template) {
        form.setValue('programType', template.programType);
        form.setValue('regulatoryAuthority', template.regulatoryAuthority);
        if (template.aircraftType) {
          form.setValue('aircraftType', template.aircraftType);
        }
      }
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedDocument(data.id);
        toast({
          title: "Document Uploaded",
          description: "Your document has been uploaded successfully.",
        });
        
        // Refresh documents list
        queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      } else {
        toast({
          title: "Upload Failed",
          description: "There was a problem uploading your document.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "There was a problem uploading your document.",
        variant: "destructive",
      });
    }
  };

  // Save generated syllabus as a training program
  const saveSyllabusMutation = useMutation({
    mutationFn: async () => {
      if (!generatedSyllabusId) return null;
      
      // Use the API endpoint for syllabus import
      const response = await apiRequest('POST', `/api/protected/syllabus/import`, {
        syllabus: generatedSyllabus
      });
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Saved as Training Program",
        description: "The syllabus has been saved as a training program.",
      });
      
      // Redirect to the training programs page
      setTimeout(() => {
        window.location.href = '/training-programs';
      }, 1500);
    },
    onError: (error) => {
      toast({
        title: "Error Saving Program",
        description: "There was a problem saving the syllabus as a program.",
        variant: "destructive",
      });
    },
  });

  // Progress indicator component
  const ProgressIndicator = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Generating Syllabus</span>
        <span className="text-sm text-muted-foreground">{generationProgress}%</span>
      </div>
      <Progress value={generationProgress} className="h-2" />
      <div className="space-y-2">
        {generationProgress >= 10 && (
          <div className="flex items-center text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
            <span>Analyzing training requirements</span>
          </div>
        )}
        {generationProgress >= 30 && (
          <div className="flex items-center text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
            <span>Generating module structure</span>
          </div>
        )}
        {generationProgress >= 50 && (
          <div className="flex items-center text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
            <span>Creating lesson plans</span>
          </div>
        )}
        {generationProgress >= 70 && (
          <div className="flex items-center text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
            <span>Aligning with regulatory requirements</span>
          </div>
        )}
        {generationProgress >= 90 && (
          <div className="flex items-center text-sm">
            {generationStatus === GenerationStatus.COMPLETED ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
            ) : (
              <Clock className="h-4 w-4 text-amber-500 mr-2 animate-pulse" />
            )}
            <span>Finalizing syllabus</span>
          </div>
        )}
      </div>
    </div>
  );

  // Render generated syllabus preview
  const renderSyllabusPreview = () => {
    if (!generatedSyllabus) return null;

    return (
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{generatedSyllabus.name}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => saveSyllabusMutation.mutate()}>
                <Save className="h-4 w-4 mr-2" />
                Save as Program
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
          <CardDescription>
            {generatedSyllabus.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium">Program Type</h3>
                <p className="text-sm text-muted-foreground">
                  {generatedSyllabus.programType?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium">Aircraft Type</h3>
                <p className="text-sm text-muted-foreground">{generatedSyllabus.aircraftType}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium">Regulatory Authority</h3>
                <p className="text-sm text-muted-foreground">
                  {generatedSyllabus.regulatoryAuthority?.toUpperCase()}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium">Total Duration</h3>
                <p className="text-sm text-muted-foreground">{generatedSyllabus.totalDuration} days</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-base font-medium mb-2">Modules</h3>
              <div className="space-y-3">
                {generatedSyllabus.modules?.map((module: any, index: number) => (
                  <Card key={index}>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">{module.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <p className="text-xs text-muted-foreground mb-2">{module.description}</p>
                      <div className="flex flex-wrap gap-1">
                        <div className="text-xs bg-primary/10 text-primary py-1 px-2 rounded-full">
                          Type: {module.type}
                        </div>
                        <div className="text-xs bg-primary/10 text-primary py-1 px-2 rounded-full">
                          Duration: {module.recommendedDuration}h
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-base font-medium mb-2">Regulatory Compliance</h3>
              <div className="space-y-2">
                <div>
                  <h4 className="text-sm font-medium">Requirements Met</h4>
                  <ul className="list-disc list-inside text-xs text-muted-foreground">
                    {generatedSyllabus.regulatoryCompliance?.requirementsMet?.map((req: any, index: number) => (
                      <li key={index}>{req.code}: {req.description}</li>
                    ))}
                  </ul>
                </div>
                {generatedSyllabus.regulatoryCompliance?.requirementsPartiallyMet?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium">Requirements Partially Met</h4>
                    <ul className="list-disc list-inside text-xs text-amber-600">
                      {generatedSyllabus.regulatoryCompliance?.requirementsPartiallyMet?.map((req: any, index: number) => (
                        <li key={index}>{req.code}: {req.description}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {generatedSyllabus.regulatoryCompliance?.requirementsNotMet?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium">Requirements Not Met</h4>
                    <ul className="list-disc list-inside text-xs text-red-600">
                      {generatedSyllabus.regulatoryCompliance?.requirementsNotMet?.map((req: any, index: number) => (
                        <li key={index}>{req.code}: {req.description}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <div className="flex items-center">
            <div className="text-xs text-muted-foreground">
              Generated on {new Date(generatedSyllabus.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div className="flex items-center">
            <div className="text-xs text-muted-foreground flex items-center">
              <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" />
              Confidence Score: {generatedSyllabus.confidenceScore}%
            </div>
          </div>
        </CardFooter>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="container py-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-1">Syllabus Generator</h1>
            <p className="text-muted-foreground">
              Generate customized training syllabi with AI-powered regulatory compliance
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Create a New Syllabus</CardTitle>
                <CardDescription>
                  Choose how you want to create your training syllabus
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="fromScratch">
                      <BookOpen className="h-4 w-4 mr-2" />
                      From Scratch
                    </TabsTrigger>
                    <TabsTrigger value="fromTemplate">
                      <Copy className="h-4 w-4 mr-2" />
                      From Template
                    </TabsTrigger>
                    <TabsTrigger value="fromDocument">
                      <FileUp className="h-4 w-4 mr-2" />
                      From Document
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="fromScratch">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="programType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Program Type</FormLabel>
                                <FormControl>
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select program type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="initial_type_rating">Initial Type Rating</SelectItem>
                                      <SelectItem value="recurrent">Recurrent Training</SelectItem>
                                      <SelectItem value="joc_mcc">JOC/MCC</SelectItem>
                                      <SelectItem value="type_conversion">Type Conversion</SelectItem>
                                      <SelectItem value="instructor">Instructor Training</SelectItem>
                                      <SelectItem value="custom">Custom Program</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormDescription>
                                  The type of training program you want to create
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="aircraftType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Aircraft Type</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g. B737, A320" {...field} />
                                </FormControl>
                                <FormDescription>
                                  The type of aircraft this program is for
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="regulatoryAuthority"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Regulatory Authority</FormLabel>
                                <FormControl>
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select authority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="faa">FAA</SelectItem>
                                      <SelectItem value="easa">EASA</SelectItem>
                                      <SelectItem value="caac">CAAC</SelectItem>
                                      <SelectItem value="tcca">TCCA</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormDescription>
                                  The regulatory authority to comply with
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {form.watch('regulatoryAuthority') === 'other' && (
                            <FormField
                              control={form.control}
                              name="customAuthority"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Custom Authority</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g. CASA, DGCA" {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    Specify the custom regulatory authority
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>

                        <div className="space-y-3">
                          <h3 className="text-base font-medium">Program Components</h3>
                          <div className="grid md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="includeClassroomModules"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel>Classroom Modules</FormLabel>
                                    <FormDescription>
                                      Ground school and theory lessons
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="includeSimulatorExercises"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel>Simulator Exercises</FormLabel>
                                    <FormDescription>
                                      Flight simulator training sessions
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="includeAircraftSessions"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel>Aircraft Sessions</FormLabel>
                                    <FormDescription>
                                      Real aircraft training flights
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="includeAssessments"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                  <div className="space-y-0.5">
                                    <FormLabel>Assessments</FormLabel>
                                    <FormDescription>
                                      Tests, checks, and evaluations
                                    </FormDescription>
                                  </div>
                                  <FormControl>
                                    <Switch
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <div>
                          <FormField
                            control={form.control}
                            name="trainingGoals"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Training Goals</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Describe the main goals and learning objectives for this training program"
                                    className="min-h-[100px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  What trainees should accomplish by the end of this program
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div>
                          <FormField
                            control={form.control}
                            name="customRequirements"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Custom Requirements</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Add any custom requirements or organization-specific policies"
                                    className="min-h-[100px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Any special requirements or policies to incorporate
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end">
                          <Button
                            type="submit"
                            disabled={form.formState.isSubmitting || generationStatus === GenerationStatus.PROCESSING}
                          >
                            {form.formState.isSubmitting || generationStatus === GenerationStatus.PROCESSING ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate Syllabus
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </TabsContent>

                  <TabsContent value="fromTemplate">
                    <div className="space-y-4">
                      {templatesLoading ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : templates?.length > 0 ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {templates.map((template: any) => (
                              <Card 
                                key={template.id} 
                                className={`cursor-pointer hover:border-primary transition-colors ${
                                  selectedTemplate === template.id ? 'border-primary bg-primary/5' : ''
                                }`}
                                onClick={() => handleTemplateSelect(template.id)}
                              >
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-lg">{template.name}</CardTitle>
                                  <CardDescription>{template.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-sm space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Program Type:</span>
                                      <span className="font-medium">
                                        {template.programType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Regulatory:</span>
                                      <span className="font-medium">{template.regulatoryAuthority.toUpperCase()}</span>
                                    </div>
                                    {template.aircraftType && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">Aircraft:</span>
                                        <span className="font-medium">{template.aircraftType}</span>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                                <CardFooter className="pt-0">
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="ml-auto"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTemplate(template.id);
                                      form.reset({
                                        ...form.getValues(),
                                        programType: template.programType,
                                        regulatoryAuthority: template.regulatoryAuthority,
                                        aircraftType: template.aircraftType || '',
                                      });
                                      setActiveTab('fromScratch');
                                    }}
                                  >
                                    Use Template
                                  </Button>
                                </CardFooter>
                              </Card>
                            ))}
                          </div>

                          {selectedTemplate && (
                            <div className="mt-6 flex justify-end">
                              <Button 
                                onClick={() => {
                                  // Get the selected template data and use it
                                  const template = templates.find((t: any) => t.id === selectedTemplate);
                                  form.reset({
                                    ...form.getValues(),
                                    programType: template.programType,
                                    regulatoryAuthority: template.regulatoryAuthority,
                                    aircraftType: template.aircraftType || '',
                                  });
                                  onSubmit(form.getValues());
                                }}
                                disabled={generationStatus === GenerationStatus.PROCESSING}
                              >
                                {generationStatus === GenerationStatus.PROCESSING ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Generate from Template
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                            <List className="h-6 w-6 text-primary" />
                          </div>
                          <h3 className="text-lg font-semibold mb-2">No Templates Available</h3>
                          <p className="text-muted-foreground mb-4">
                            You don't have any syllabus templates yet.
                          </p>
                          <Button asChild>
                            <span onClick={() => setActiveTab('fromScratch')}>
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Create From Scratch
                            </span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="fromDocument">
                    <div className="space-y-6">
                      <div className="grid gap-4">
                        <Label htmlFor="file-upload">Upload Document</Label>
                        <div className="border border-dashed rounded-lg p-8 text-center">
                          <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                          <h3 className="text-lg font-medium mb-2">Upload Training Document</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Upload PDF, DOCX, or other training materials to extract a syllabus
                          </p>
                          <div className="flex justify-center">
                            <Label
                              htmlFor="file-upload"
                              className="cursor-pointer py-2 px-4 border rounded-md hover:bg-muted transition-colors"
                            >
                              Select File
                            </Label>
                            <Input
                              id="file-upload"
                              type="file"
                              className="hidden"
                              onChange={handleFileUpload}
                              accept=".pdf,.docx,.doc,.txt,.xlsx,.pptx"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label>Select Existing Document</Label>
                        {documentsLoading ? (
                          <div className="flex justify-center py-6">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          </div>
                        ) : documents?.length > 0 ? (
                          <ScrollArea className="h-72 border rounded-md">
                            <div className="p-4 space-y-2">
                              {documents.map((doc: any) => (
                                <div
                                  key={doc.id}
                                  className={`flex items-center p-2 rounded-md cursor-pointer hover:bg-muted ${
                                    selectedDocument === doc.id ? 'bg-primary/5 border-primary' : 'border'
                                  }`}
                                  onClick={() => handleDocumentSelect(doc.id)}
                                >
                                  <div className="mr-3">
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="text-sm font-medium">{doc.title}</h4>
                                    <p className="text-xs text-muted-foreground">{doc.fileType} • {new Date(doc.createdAt).toLocaleDateString()}</p>
                                  </div>
                                  {selectedDocument === doc.id && (
                                    <div>
                                      <CheckCircle2 className="h-4 w-4 text-primary" />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        ) : (
                          <div className="border rounded-md p-6 text-center">
                            <p className="text-muted-foreground">No documents available</p>
                          </div>
                        )}
                      </div>

                      {selectedDocument && (
                        <div className="mt-6 flex justify-end">
                          <Button
                            onClick={() => {
                              form.setValue('documentId', selectedDocument);
                              onSubmit(form.getValues());
                            }}
                            disabled={generationStatus === GenerationStatus.PROCESSING}
                          >
                            {generationStatus === GenerationStatus.PROCESSING ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Generate from Document
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {generationStatus === GenerationStatus.COMPLETED && renderSyllabusPreview()}
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Generation Status</CardTitle>
                <CardDescription>
                  Track the progress of your syllabus generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {generationStatus === GenerationStatus.IDLE && (
                  <div className="flex flex-col items-center justify-center text-center py-6">
                    <BookOpen className="h-10 w-10 text-muted-foreground mb-4" />
                    <h3 className="font-medium mb-1">Ready to Generate</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Configure your syllabus options and click Generate to start
                    </p>
                  </div>
                )}

                {generationStatus === GenerationStatus.PROCESSING && <ProgressIndicator />}

                {generationStatus === GenerationStatus.COMPLETED && (
                  <div className="space-y-4">
                    <div className="flex items-center text-green-600">
                      <CheckCircle2 className="h-5 w-5 mr-2" />
                      <span className="font-medium">Syllabus Generated Successfully</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Your syllabus has been generated and is ready for review. You can save it as a training program or export it.
                    </p>
                    <div className="text-sm mt-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Modules:</span>
                        <span className="font-medium">{generatedSyllabus?.modules?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Lessons:</span>
                        <span className="font-medium">{generatedSyllabus?.lessons?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Compliance Score:</span>
                        <span className="font-medium">{generatedSyllabus?.confidenceScore || 0}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {generationStatus === GenerationStatus.ERROR && (
                  <div className="space-y-4">
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Generation Error</AlertTitle>
                      <AlertDescription>
                        There was a problem generating your syllabus. Please try again or adjust your parameters.
                      </AlertDescription>
                    </Alert>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setGenerationStatus(GenerationStatus.IDLE)}
                    >
                      Try Again
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Help & Tips</CardTitle>
                <CardDescription>
                  Guidance for creating effective syllabi
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-4">
                <div>
                  <h3 className="font-medium mb-1">Select the Right Program Type</h3>
                  <p className="text-muted-foreground">
                    Choose a program type that matches your training needs. Initial Type Ratings are comprehensive, while Recurrent programs focus on refreshing skills.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Regulatory Compliance</h3>
                  <p className="text-muted-foreground">
                    Ensure you select the correct regulatory authority to comply with required standards and regulations.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Using Templates</h3>
                  <p className="text-muted-foreground">
                    Templates provide a starting point based on industry standards. Customize them for your specific needs.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Document Extraction</h3>
                  <p className="text-muted-foreground">
                    When using document extraction, provide well-structured training materials for best results.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}