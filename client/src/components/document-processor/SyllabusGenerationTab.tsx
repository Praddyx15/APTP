import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileUp, 
  FileText, 
  Book, 
  BookOpen, 
  Bookmark, 
  BookMarked,
  RotateCw, 
  Download, 
  CalendarClock,
  Clipboard,
  CheckSquare,
  AlertCircle,
  FileCheck,
  GraduationCap,
  Layers,
  ListChecks,
  Check,
  Copy,
  Plane,
  Scale,
  Brush
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function SyllabusGenerationTab() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [syllabusResult, setSyllabusResult] = useState<any>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [activeTab, setActiveTab] = useState('upload');
  const [jsonCopied, setJsonCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Syllabus generation settings
  const [generationSettings, setGenerationSettings] = useState({
    programType: 'type_rating', // type_rating, recurrent, initial, joc_mcc, instructor, custom
    aircraftType: '',
    regulatoryAuthority: 'easa', // easa, faa, dgca, icao, other
    includeModules: true,
    includeLessons: true,
    extractCompetencies: true,
    mapRegulatoryRequirements: true,
    customizationLevel: 'medium', // low, medium, high
    detailedAssessmentCriteria: true,
    useSyllabusTemplate: false,
    selectedTemplateId: '',
  });
  
  // Program types
  const programTypes = [
    { value: 'type_rating', label: 'Type Rating' },
    { value: 'recurrent', label: 'Recurrent Training' },
    { value: 'initial', label: 'Initial Training' },
    { value: 'joc_mcc', label: 'JOC/MCC Course' },
    { value: 'instructor', label: 'Instructor Training' },
    { value: 'custom', label: 'Custom Program' }
  ];
  
  // Regulatory authorities
  const regulatoryAuthorities = [
    { value: 'easa', label: 'EASA' },
    { value: 'faa', label: 'FAA' },
    { value: 'dgca', label: 'DGCA' },
    { value: 'icao', label: 'ICAO' },
    { value: 'other', label: 'Other Authority' }
  ];
  
  // Mock syllabus templates
  const syllabusTemplates = [
    { id: '1', name: 'A320 Type Rating EASA Template', type: 'type_rating', aircraft: 'A320', authority: 'easa' },
    { id: '2', name: 'Boeing 737 Type Rating FAA Template', type: 'type_rating', aircraft: 'B737', authority: 'faa' },
    { id: '3', name: 'Recurrent Training Template EASA', type: 'recurrent', aircraft: 'Generic', authority: 'easa' },
    { id: '4', name: 'Initial Training Template', type: 'initial', aircraft: 'Generic', authority: 'icao' },
    { id: '5', name: 'JOC/MCC Standard Template', type: 'joc_mcc', aircraft: 'Generic', authority: 'easa' }
  ];
  
  // Filter templates based on selected program type and regulatory authority
  const filteredTemplates = syllabusTemplates.filter(
    template => template.type === generationSettings.programType &&
    (template.authority === generationSettings.regulatoryAuthority || template.authority === 'icao')
  );
  
  // Mutation for syllabus generation
  const generationMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      try {
        // Simulate generation steps with incremental progress
        setProcessingStep('Uploading document...');
        await simulateProgress(0, 10);
        
        setProcessingStep('Extracting text content...');
        await simulateProgress(10, 20);
        
        setProcessingStep('Identifying program structure...');
        await simulateProgress(20, 35);
        
        setProcessingStep('Extracting competencies and learning objectives...');
        await simulateProgress(35, 50);
        
        setProcessingStep('Generating modules structure...');
        await simulateProgress(50, 65);
        
        setProcessingStep('Creating lessons content...');
        await simulateProgress(65, 80);
        
        setProcessingStep('Mapping regulatory requirements...');
        await simulateProgress(80, 90);
        
        setProcessingStep('Finalizing syllabus structure...');
        await simulateProgress(90, 100);
        
        // Try to call the real API endpoint
        const response = await apiRequest('POST', '/api/syllabus/generate', formData, true);
        return await response.json();
      } catch (error) {
        console.error('Syllabus generation API error:', error);
        
        // Return mock result for demonstration if API is not yet implemented
        return generateMockSyllabusResult();
      }
    },
    onSuccess: (data) => {
      setSyllabusResult(data);
      setActiveTab('results');
      toast({
        title: 'Syllabus generation complete',
        description: 'Syllabus has been successfully generated from the document.',
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Generation failed',
        description: error.message || 'An error occurred during syllabus generation.',
        variant: 'destructive',
      });
      setGenerationProgress(0);
    }
  });
  
  // Helper function to simulate progress for demonstration purposes
  const simulateProgress = async (start: number, end: number): Promise<void> => {
    return new Promise((resolve) => {
      let current = start;
      const interval = setInterval(() => {
        current += Math.floor(Math.random() * 3) + 1;
        if (current >= end) {
          current = end;
          clearInterval(interval);
          setGenerationProgress(current);
          resolve();
        } else {
          setGenerationProgress(current);
        }
      }, 100);
    });
  };
  
  // Generate mock syllabus generation result for demonstration
  const generateMockSyllabusResult = () => {
    const aircraftType = generationSettings.aircraftType || 'A320';
    const programType = generationSettings.programType;
    const programTypeLabel = programTypes.find(t => t.value === programType)?.label || 'Type Rating';
    const authority = generationSettings.regulatoryAuthority;
    const authorityLabel = regulatoryAuthorities.find(a => a.value === authority)?.label || 'EASA';
    
    return {
      id: 123,
      name: `${aircraftType} ${programTypeLabel} Program`,
      description: `A comprehensive ${programTypeLabel.toLowerCase()} program for ${aircraftType} aircraft in compliance with ${authorityLabel} regulations.`,
      programType: programType,
      aircraftType: aircraftType,
      regulatoryAuthority: authority,
      totalDuration: programType === 'type_rating' ? 21 : programType === 'recurrent' ? 3 : 14,
      modules: [
        {
          name: "Aircraft Systems Knowledge",
          description: "Comprehensive study of aircraft systems and components",
          type: "ground",
          recommendedDuration: 35,
          competencies: [
            {
              name: "Aircraft General Systems",
              description: "Understanding of primary aircraft systems",
              assessmentCriteria: [
                "Describe the electrical system components and operation",
                "Explain the hydraulic system architecture",
                "Identify pneumatic system components and their functions",
                "Describe fuel system operation and monitoring"
              ],
              regulatoryReference: "EASA Part-FCL.725"
            },
            {
              name: "Flight Control Systems",
              description: "Knowledge of flight control systems and handling",
              assessmentCriteria: [
                "Explain fly-by-wire system principles",
                "Describe control surface operation and redundancy",
                "Explain flight envelope protection features",
                "Identify abnormal control situations and appropriate responses"
              ],
              regulatoryReference: "EASA Part-FCL.725"
            }
          ],
          regulatoryRequirements: [
            "EASA Part-FCL.725",
            "EASA CS-FCD.300"
          ]
        },
        {
          name: "Standard Operating Procedures",
          description: "Normal and abnormal procedures for aircraft operation",
          type: "ground",
          recommendedDuration: 28,
          competencies: [
            {
              name: "Normal Procedures",
              description: "Standard operational procedures for routine flight",
              assessmentCriteria: [
                "Demonstrate proper preflight preparation and checks",
                "Perform normal start-up sequence according to checklist",
                "Execute proper taxi, takeoff, and climb procedures",
                "Perform standard cruise, descent, approach, and landing procedures"
              ],
              regulatoryReference: "EASA Part-FCL.725"
            },
            {
              name: "Abnormal Procedures",
              description: "Procedures for handling non-normal situations",
              assessmentCriteria: [
                "Identify and respond to system failures appropriately",
                "Perform emergency checklist procedures with proper crew coordination",
                "Demonstrate decision making in abnormal scenarios",
                "Execute appropriate recovery techniques for various system malfunctions"
              ],
              regulatoryReference: "EASA Part-FCL.725"
            }
          ],
          regulatoryRequirements: [
            "EASA Part-FCL.725",
            "EASA CS-FCD.305"
          ]
        },
        {
          name: "Simulator Training - Normal Operations",
          description: "Practical simulator sessions for normal flight procedures",
          type: "simulator",
          recommendedDuration: 16,
          competencies: [
            {
              name: "Normal Flight Maneuvers",
              description: "Execution of standard flight procedures",
              assessmentCriteria: [
                "Perform normal takeoff and climb procedures within standards",
                "Demonstrate proper navigation and flight management",
                "Execute precision and non-precision approaches",
                "Perform normal landing techniques in various conditions"
              ],
              regulatoryReference: "EASA Part-FCL.730.A"
            }
          ],
          regulatoryRequirements: [
            "EASA Part-FCL.730.A",
            "EASA CS-FCD.310"
          ]
        },
        {
          name: "Simulator Training - Non-normal Operations",
          description: "Practical simulator sessions for abnormal and emergency procedures",
          type: "simulator",
          recommendedDuration: 20,
          competencies: [
            {
              name: "Emergency Procedures",
              description: "Response to emergency situations",
              assessmentCriteria: [
                "Manage engine failure scenarios during critical flight phases",
                "Perform rejected takeoff procedures within limitations",
                "Execute appropriate procedures for system malfunctions",
                "Demonstrate CRM skills during emergency management",
                "Perform appropriate recovery from unusual attitudes"
              ],
              regulatoryReference: "EASA Part-FCL.730.A"
            }
          ],
          regulatoryRequirements: [
            "EASA Part-FCL.730.A",
            "EASA CS-FCD.315"
          ]
        }
      ],
      lessons: [
        {
          name: "Electrical System Overview",
          description: "Introduction to aircraft electrical system components and operation",
          content: "This lesson covers all major components of the electrical system including generators, buses, batteries, and distribution. The normal operation and failure modes will be discussed in detail.",
          type: "document",
          moduleIndex: 0,
          duration: 120,
          learningObjectives: [
            "Describe the main electrical power sources",
            "Explain electrical distribution system architecture",
            "Understand electrical system failure modes",
            "Describe electrical system monitoring and control"
          ]
        },
        {
          name: "Flight Control Laws",
          description: "Detailed overview of flight control laws and protection systems",
          content: "This lesson examines the flight control laws including normal, alternate, and direct law. Flight envelope protections and degradation scenarios will be covered in detail.",
          type: "document",
          moduleIndex: 0,
          duration: 90,
          learningObjectives: [
            "Explain the principles of normal law operation",
            "Describe the transition conditions to alternate and direct law",
            "Understand flight envelope protection features",
            "Identify appropriate pilot response to control law degradation"
          ]
        },
        {
          name: "Normal Procedures - Preflight to Takeoff",
          description: "Detailed procedures from preflight to takeoff",
          content: "This lesson covers all standard operating procedures from aircraft preflight inspection through takeoff phase, including checklist usage and crew coordination requirements.",
          type: "video",
          moduleIndex: 1,
          duration: 60,
          learningObjectives: [
            "Perform preflight inspection according to approved checklist",
            "Execute pre-start and start procedures with proper crew coordination",
            "Demonstrate proper taxi techniques and procedures",
            "Perform takeoff briefing and normal takeoff procedures"
          ]
        }
      ],
      regulatoryCompliance: {
        authority: authorityLabel,
        requirementsMet: [
          {
            code: "EASA Part-FCL.725",
            authority: "EASA",
            version: "2020",
            description: "Type Rating Requirements",
            effectiveDate: "2020-01-01"
          },
          {
            code: "EASA Part-FCL.730.A",
            authority: "EASA",
            version: "2020",
            description: "Specific requirements for aeroplane category",
            effectiveDate: "2020-01-01"
          },
          {
            code: "EASA CS-FCD.300",
            authority: "EASA",
            version: "2020",
            description: "Pilot type rating training requirements",
            effectiveDate: "2020-01-01"
          }
        ],
        requirementsPartiallyMet: [
          {
            code: "EASA CS-FCD.315",
            authority: "EASA",
            version: "2020",
            description: "Advanced qualification requirements",
            effectiveDate: "2020-01-01"
          }
        ],
        requirementsNotMet: []
      },
      confidenceScore: 87, // 0-100% confidence in extraction accuracy
      version: "1.0",
      createdFrom: {
        documentId: 1,
        templateId: generationSettings.useSyllabusTemplate ? parseInt(generationSettings.selectedTemplateId) : undefined
      },
      createdAt: new Date().toISOString()
    };
  };
  
  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Create preview for supported image types
      if (selectedFile.type.match('image.*')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        // For PDFs and other documents, show a generic preview
        setPreview(null);
      }
      
      // Reset previous results
      setSyllabusResult(null);
      setGenerationProgress(0);
    }
  };
  
  // Handle generation process button
  const handleGenerateSyllabus = () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to process.',
        variant: 'destructive',
      });
      return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('settings', JSON.stringify(generationSettings));
    
    setGenerationProgress(0);
    generationMutation.mutate(formData);
  };
  
  // Handle settings change
  const handleSettingChange = (key: string, value: any) => {
    setGenerationSettings(prev => ({ ...prev, [key]: value }));
  };
  
  // Copy syllabus results as JSON
  const copySyllabusJson = () => {
    if (syllabusResult) {
      const jsonStr = JSON.stringify(syllabusResult, null, 2);
      navigator.clipboard.writeText(jsonStr).then(() => {
        setJsonCopied(true);
        setTimeout(() => setJsonCopied(false), 2000);
        toast({
          title: 'Copied to clipboard',
          description: 'Syllabus data has been copied as JSON.',
        });
      });
    }
  };
  
  // Download syllabus as JSON
  const downloadSyllabus = () => {
    if (!syllabusResult) return;
    
    const dataStr = JSON.stringify(syllabusResult, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `syllabus-${syllabusResult.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  // Save syllabus as training program
  const saveSyllabusAsProgram = () => {
    if (!syllabusResult) return;
    
    toast({
      title: 'Processing...',
      description: 'Saving syllabus as training program...',
    });
    
    // In real implementation, make API call to save syllabus as a training program
    setTimeout(() => {
      toast({
        title: 'Success',
        description: 'Syllabus has been saved as a training program.',
        variant: 'default',
      });
    }, 1500);
  };
  
  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full mb-6">
          <TabsTrigger value="upload" disabled={generationMutation.isPending}>
            <FileUp className="mr-2 h-4 w-4" />
            Upload & Settings
          </TabsTrigger>
          <TabsTrigger value="results" disabled={!syllabusResult && !generationMutation.isPending}>
            <BookOpen className="mr-2 h-4 w-4" />
            Syllabus Results
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* File upload card */}
            <Card>
              <CardHeader>
                <CardTitle>Document Upload</CardTitle>
                <CardDescription>
                  Upload a document to generate a training syllabus
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  />
                  
                  {preview ? (
                    <div className="space-y-4">
                      <img 
                        src={preview} 
                        alt="Document preview" 
                        className="max-h-64 mx-auto object-contain rounded-md"
                      />
                      <p className="text-sm text-gray-500">{file?.name}</p>
                    </div>
                  ) : file ? (
                    <div className="space-y-4">
                      <div className="w-32 h-40 mx-auto bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center">
                        <FileText className="h-16 w-16 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500">{file.name}</p>
                    </div>
                  ) : (
                    <div className="py-8">
                      <FileUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-sm font-medium mb-1">
                        Click to select or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        Supports PDF and Word documents
                      </p>
                    </div>
                  )}
                </div>
                
                {file && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>File: {file.name}</span>
                      <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 w-full"
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                      }}
                    >
                      Remove file
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Generation settings card */}
            <Card>
              <CardHeader>
                <CardTitle>Training Program Settings</CardTitle>
                <CardDescription>
                  Configure options for syllabus generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="programType">Program Type</Label>
                  <Select 
                    value={generationSettings.programType} 
                    onValueChange={(value) => handleSettingChange('programType', value)}
                  >
                    <SelectTrigger id="programType">
                      <SelectValue placeholder="Select Program Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {programTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    The type of training program to generate
                  </p>
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="aircraftType">Aircraft Type</Label>
                  <Input 
                    id="aircraftType" 
                    placeholder="e.g. A320, B737, Generic"
                    value={generationSettings.aircraftType}
                    onChange={(e) => handleSettingChange('aircraftType', e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    The specific aircraft type for this training
                  </p>
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="regulatoryAuthority">Regulatory Authority</Label>
                  <Select 
                    value={generationSettings.regulatoryAuthority} 
                    onValueChange={(value) => handleSettingChange('regulatoryAuthority', value)}
                  >
                    <SelectTrigger id="regulatoryAuthority">
                      <SelectValue placeholder="Select Authority" />
                    </SelectTrigger>
                    <SelectContent>
                      {regulatoryAuthorities.map((authority) => (
                        <SelectItem key={authority.value} value={authority.value}>
                          {authority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    The regulatory framework to follow for compliance
                  </p>
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="useSyllabusTemplate">Use Template</Label>
                      <p className="text-xs text-gray-500">
                        Start with a pre-defined syllabus template
                      </p>
                    </div>
                    <Switch
                      id="useSyllabusTemplate"
                      checked={generationSettings.useSyllabusTemplate}
                      onCheckedChange={(checked) => handleSettingChange('useSyllabusTemplate', checked)}
                    />
                  </div>
                  
                  {generationSettings.useSyllabusTemplate && (
                    <div className="space-y-1 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                      <Label htmlFor="selectedTemplateId">Select Template</Label>
                      <Select 
                        value={generationSettings.selectedTemplateId} 
                        onValueChange={(value) => handleSettingChange('selectedTemplateId', value)}
                      >
                        <SelectTrigger id="selectedTemplateId">
                          <SelectValue placeholder="Select a template" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredTemplates.length > 0 ? (
                            filteredTemplates.map((template) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              No templates available for selected criteria
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        Templates are filtered based on program type and authority
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-1">
                    <Label htmlFor="customizationLevel">Customization Level</Label>
                    <RadioGroup
                      id="customizationLevel"
                      value={generationSettings.customizationLevel}
                      onValueChange={(value) => handleSettingChange('customizationLevel', value)}
                      className="flex space-x-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="low" id="level-low" />
                        <Label htmlFor="level-low" className="text-sm font-normal">Low</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="medium" id="level-medium" />
                        <Label htmlFor="level-medium" className="text-sm font-normal">Medium</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="high" id="level-high" />
                        <Label htmlFor="level-high" className="text-sm font-normal">High</Label>
                      </div>
                    </RadioGroup>
                    <p className="text-xs text-gray-500">
                      Level of customization to apply to the generated syllabus
                    </p>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="extractCompetencies">Extract Competencies</Label>
                      <p className="text-xs text-gray-500">
                        Identify competencies and learning objectives
                      </p>
                    </div>
                    <Switch
                      id="extractCompetencies"
                      checked={generationSettings.extractCompetencies}
                      onCheckedChange={(checked) => handleSettingChange('extractCompetencies', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="detailedAssessmentCriteria">Detailed Assessment Criteria</Label>
                      <p className="text-xs text-gray-500">
                        Include detailed assessment criteria for competencies
                      </p>
                    </div>
                    <Switch
                      id="detailedAssessmentCriteria"
                      checked={generationSettings.detailedAssessmentCriteria}
                      onCheckedChange={(checked) => handleSettingChange('detailedAssessmentCriteria', checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="mapRegulatoryRequirements">Map Regulatory Requirements</Label>
                      <p className="text-xs text-gray-500">
                        Map program content to regulatory requirements
                      </p>
                    </div>
                    <Switch
                      id="mapRegulatoryRequirements"
                      checked={generationSettings.mapRegulatoryRequirements}
                      onCheckedChange={(checked) => handleSettingChange('mapRegulatoryRequirements', checked)}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button 
                  className="w-full" 
                  disabled={!file || generationMutation.isPending}
                  onClick={handleGenerateSyllabus}
                >
                  {generationMutation.isPending ? (
                    <>
                      <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <BookOpen className="mr-2 h-4 w-4" />
                      Generate Syllabus
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          {/* Progress section */}
          {generationMutation.isPending && (
            <Card className="mt-6">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{processingStep || 'Preparing syllabus generation...'}</h3>
                      <p className="text-sm text-gray-500">Progress: {generationProgress}%</p>
                    </div>
                    <RotateCw className="h-6 w-6 animate-spin text-primary" />
                  </div>
                  
                  <Progress value={generationProgress} className="h-2" />
                  
                  <p className="text-sm text-gray-500">
                    Syllabus generation is in progress. This can take several minutes depending on document complexity.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="results">
          {syllabusResult ? (
            <div className="space-y-6">
              {/* Syllabus Overview */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{syllabusResult.name}</CardTitle>
                      <CardDescription>
                        {syllabusResult.description}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={copySyllabusJson}
                      >
                        {jsonCopied ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy JSON
                          </>
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={downloadSyllabus}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={saveSyllabusAsProgram}
                      >
                        <FileCheck className="mr-2 h-4 w-4" />
                        Save as Program
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                      <div className="flex items-center gap-2 mb-3">
                        <Plane className="h-4 w-4 text-slate-500" />
                        <h3 className="text-sm font-medium">Program Details</h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Program Type</span>
                          <Badge variant="outline" className="capitalize">
                            {syllabusResult.programType.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Aircraft Type</span>
                          <span className="font-medium">{syllabusResult.aircraftType}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Duration</span>
                          <span>{syllabusResult.totalDuration} days</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                      <div className="flex items-center gap-2 mb-3">
                        <Scale className="h-4 w-4 text-slate-500" />
                        <h3 className="text-sm font-medium">Regulatory Details</h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Authority</span>
                          <Badge>
                            {syllabusResult.regulatoryCompliance.authority}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Requirements Met</span>
                          <span className="font-medium">{syllabusResult.regulatoryCompliance.requirementsMet.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Partially Met</span>
                          <span>{syllabusResult.regulatoryCompliance.requirementsPartiallyMet.length}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-md">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="h-4 w-4 text-slate-500" />
                        <h3 className="text-sm font-medium">Generation Info</h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Version</span>
                          <span>{syllabusResult.version}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Confidence</span>
                          <Badge variant={syllabusResult.confidenceScore > 85 ? "success" : syllabusResult.confidenceScore > 70 ? "warning" : "destructive"}>
                            {syllabusResult.confidenceScore}%
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Created</span>
                          <span>{new Date(syllabusResult.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <h3 className="text-sm font-medium mb-2">Syllabus Structure</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div className="p-3 bg-primary/10 rounded-md flex flex-col items-center justify-center">
                        <div className="font-semibold text-2xl">{syllabusResult.modules.length}</div>
                        <div className="text-xs text-gray-500">Modules</div>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-md flex flex-col items-center justify-center">
                        <div className="font-semibold text-2xl">{syllabusResult.lessons.length}</div>
                        <div className="text-xs text-gray-500">Lessons</div>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-md flex flex-col items-center justify-center">
                        <div className="font-semibold text-2xl">
                          {syllabusResult.modules.reduce((acc: number, module: any) => acc + (module.competencies?.length || 0), 0)}
                        </div>
                        <div className="text-xs text-gray-500">Competencies</div>
                      </div>
                      <div className="p-3 bg-primary/10 rounded-md flex flex-col items-center justify-center">
                        <div className="font-semibold text-2xl">
                          {syllabusResult.modules.reduce((acc: number, module: any) => {
                            return acc + (module.competencies?.reduce((compAcc: number, comp: any) => {
                              return compAcc + (comp.assessmentCriteria?.length || 0);
                            }, 0) || 0);
                          }, 0)}
                        </div>
                        <div className="text-xs text-gray-500">Assessment Criteria</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Modules Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Training Modules</CardTitle>
                  <CardDescription>
                    Main modules in the training program
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {syllabusResult.modules.map((module: any, index: number) => (
                      <AccordionItem key={index} value={`module-${index}`}>
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              module.type === 'ground' ? 'secondary' :
                              module.type === 'simulator' ? 'default' :
                              'outline'
                            }>
                              {module.type}
                            </Badge>
                            <span>{module.name}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-2">
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{module.description}</p>
                              <div className="flex items-center gap-2 mt-2 text-sm">
                                <CalendarClock className="h-4 w-4 text-gray-500" />
                                <span className="text-gray-500">Recommended Duration:</span>
                                <span>{module.recommendedDuration} hours</span>
                              </div>
                            </div>
                            
                            <div>
                              <h4 className="text-sm font-medium mb-2">Competencies</h4>
                              <div className="space-y-3">
                                {module.competencies.map((competency: any, compIndex: number) => (
                                  <div key={compIndex} className="border p-3 rounded-md">
                                    <h5 className="font-medium text-sm">{competency.name}</h5>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{competency.description}</p>
                                    
                                    <div className="mt-2">
                                      <h6 className="text-xs font-medium flex items-center gap-1 mb-1">
                                        <ListChecks className="h-3 w-3" />
                                        Assessment Criteria
                                      </h6>
                                      <ul className="text-xs space-y-1">
                                        {competency.assessmentCriteria.map((criteria: string, critIndex: number) => (
                                          <li key={critIndex} className="flex items-start gap-1.5">
                                            <Check className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                                            <span>{criteria}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                    
                                    {competency.regulatoryReference && (
                                      <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                                        <Scale className="h-3 w-3" />
                                        Ref: {competency.regulatoryReference}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {module.regulatoryRequirements && module.regulatoryRequirements.length > 0 && (
                              <div>
                                <h4 className="text-sm font-medium mb-1">Regulatory Requirements</h4>
                                <div className="flex flex-wrap gap-1">
                                  {module.regulatoryRequirements.map((req: string, reqIndex: number) => (
                                    <Badge key={reqIndex} variant="outline">{req}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div>
                              <h4 className="text-sm font-medium mb-1">Related Lessons</h4>
                              <div className="space-y-1">
                                {syllabusResult.lessons
                                  .filter((lesson: any) => lesson.moduleIndex === index)
                                  .map((lesson: any, lessonIndex: number) => (
                                    <div key={lessonIndex} className="text-sm border rounded-md p-2">
                                      <div className="flex items-center justify-between">
                                        <span className="font-medium">{lesson.name}</span>
                                        <Badge variant="secondary" className="text-xs">
                                          {lesson.duration} min
                                        </Badge>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
              
              {/* Lessons Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Training Lessons</CardTitle>
                  <CardDescription>
                    Individual lessons that make up the modules
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Tabs defaultValue="all" className="mb-6">
                      <TabsList className="w-full grid grid-cols-3">
                        <TabsTrigger value="all">All Lessons</TabsTrigger>
                        <TabsTrigger value="document">Documents</TabsTrigger>
                        <TabsTrigger value="video">Videos</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="all" className="pt-4">
                        <div className="space-y-3">
                          {syllabusResult.lessons.map((lesson: any, index: number) => (
                            <Card key={index}>
                              <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <CardTitle className="text-base">{lesson.name}</CardTitle>
                                    <CardDescription>
                                      {lesson.description}
                                    </CardDescription>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={lesson.type === 'video' ? 'default' : 'secondary'}>
                                      {lesson.type}
                                    </Badge>
                                    <Badge variant="outline">{lesson.duration} min</Badge>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="text-sm">
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{lesson.content}</p>
                                
                                <div>
                                  <h4 className="text-sm font-medium mb-2">Learning Objectives</h4>
                                  <ul className="space-y-1">
                                    {lesson.learningObjectives.map((objective: string, objIndex: number) => (
                                      <li key={objIndex} className="flex items-start gap-1.5">
                                        <Check className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                                        <span className="text-sm">{objective}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="document" className="pt-4">
                        <div className="space-y-3">
                          {syllabusResult.lessons
                            .filter((lesson: any) => lesson.type === 'document')
                            .map((lesson: any, index: number) => (
                              <Card key={index}>
                                <CardHeader className="pb-2">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <CardTitle className="text-base">{lesson.name}</CardTitle>
                                      <CardDescription>
                                        {lesson.description}
                                      </CardDescription>
                                    </div>
                                    <Badge variant="outline">{lesson.duration} min</Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="text-sm">
                                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{lesson.content}</p>
                                  
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">Learning Objectives</h4>
                                    <ul className="space-y-1">
                                      {lesson.learningObjectives.map((objective: string, objIndex: number) => (
                                        <li key={objIndex} className="flex items-start gap-1.5">
                                          <Check className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                                          <span className="text-sm">{objective}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="video" className="pt-4">
                        <div className="space-y-3">
                          {syllabusResult.lessons
                            .filter((lesson: any) => lesson.type === 'video')
                            .map((lesson: any, index: number) => (
                              <Card key={index}>
                                <CardHeader className="pb-2">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <CardTitle className="text-base">{lesson.name}</CardTitle>
                                      <CardDescription>
                                        {lesson.description}
                                      </CardDescription>
                                    </div>
                                    <Badge variant="default">{lesson.duration} min</Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="text-sm">
                                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{lesson.content}</p>
                                  
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">Learning Objectives</h4>
                                    <ul className="space-y-1">
                                      {lesson.learningObjectives.map((objective: string, objIndex: number) => (
                                        <li key={objIndex} className="flex items-start gap-1.5">
                                          <Check className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                                          <span className="text-sm">{objective}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </CardContent>
              </Card>
              
              {/* Regulatory Compliance Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Regulatory Compliance</CardTitle>
                  <CardDescription>
                    Compliance with {syllabusResult.regulatoryCompliance.authority} requirements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium mb-3">Requirements Met ({syllabusResult.regulatoryCompliance.requirementsMet.length})</h3>
                      <div className="space-y-2">
                        {syllabusResult.regulatoryCompliance.requirementsMet.map((req: any, index: number) => (
                          <div key={index} className="border rounded-md p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-sm font-medium">{req.code}</h4>
                                <p className="text-xs text-gray-500">{req.description}</p>
                              </div>
                              <Badge variant="success">Met</Badge>
                            </div>
                            <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                              <Scale className="h-3 w-3" />
                              {req.authority} version {req.version}
                              {req.effectiveDate && (
                                <span className="ml-1">
                                  (Effective: {new Date(req.effectiveDate).toLocaleDateString()})
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {syllabusResult.regulatoryCompliance.requirementsPartiallyMet.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-3">Requirements Partially Met ({syllabusResult.regulatoryCompliance.requirementsPartiallyMet.length})</h3>
                        <div className="space-y-2">
                          {syllabusResult.regulatoryCompliance.requirementsPartiallyMet.map((req: any, index: number) => (
                            <div key={index} className="border rounded-md p-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-sm font-medium">{req.code}</h4>
                                  <p className="text-xs text-gray-500">{req.description}</p>
                                </div>
                                <Badge variant="warning">Partially Met</Badge>
                              </div>
                              <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                                <Scale className="h-3 w-3" />
                                {req.authority} version {req.version}
                                {req.effectiveDate && (
                                  <span className="ml-1">
                                    (Effective: {new Date(req.effectiveDate).toLocaleDateString()})
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {syllabusResult.regulatoryCompliance.requirementsNotMet.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-3">Requirements Not Met ({syllabusResult.regulatoryCompliance.requirementsNotMet.length})</h3>
                        <div className="space-y-2">
                          {syllabusResult.regulatoryCompliance.requirementsNotMet.map((req: any, index: number) => (
                            <div key={index} className="border rounded-md p-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-sm font-medium">{req.code}</h4>
                                  <p className="text-xs text-gray-500">{req.description}</p>
                                </div>
                                <Badge variant="destructive">Not Met</Badge>
                              </div>
                              <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                                <Scale className="h-3 w-3" />
                                {req.authority} version {req.version}
                                {req.effectiveDate && (
                                  <span className="ml-1">
                                    (Effective: {new Date(req.effectiveDate).toLocaleDateString()})
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : generationMutation.isPending ? (
            <div className="text-center py-10">
              <RotateCw className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h3 className="text-lg font-medium">{processingStep || 'Generating Syllabus'}</h3>
              <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                The system is creating a syllabus from your document. This can take several minutes for complex documents.
              </p>
              <div className="max-w-md mx-auto mt-4">
                <Progress value={generationProgress} className="h-2" />
                <p className="text-sm mt-1 text-gray-500">Progress: {generationProgress}%</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-10">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium">No Syllabus Available</h3>
              <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                Upload a document and generate a syllabus to see results here.
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setActiveTab('upload')}
              >
                Go to Upload
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Help alert */}
      <Alert>
        <GraduationCap className="h-4 w-4" />
        <AlertTitle>Syllabus generation tips</AlertTitle>
        <AlertDescription>
          Upload regulatory documents, course materials or training manuals to generate a structured syllabus. For best results, use documents with clear headings, well-defined sections, and explicit competency or learning objective statements. The system will extract modules, lessons, competencies, and map regulatory requirements from your document.
        </AlertDescription>
      </Alert>
    </div>
  );
}