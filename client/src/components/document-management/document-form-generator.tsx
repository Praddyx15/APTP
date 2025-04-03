import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { UploadedDocument } from './document-uploader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Wand2,
  FileSpreadsheet,
  FileText,
  ClipboardCheck,
  LucideProps,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  RotateCcw,
  Eye,
  Pencil,
  Save,
  ChevronRight,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';

interface DocumentFormGeneratorProps {
  documentId: number;
  onGenerated?: (data: any) => void;
}

type FormTemplate = {
  id: string;
  name: string;
  description: string;
  type: string;
  icon: React.ComponentType<LucideProps>;
};

// Form templates
const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: 'training-form',
    name: 'Training Form',
    description: 'Generate a training form with competency assessment sections',
    type: 'training',
    icon: FileText
  },
  {
    id: 'compliance-procedure',
    name: 'Compliance Procedure',
    description: 'Create a structured compliance procedure document',
    type: 'compliance',
    icon: ClipboardCheck
  },
  {
    id: 'session-plan',
    name: 'Session Plan',
    description: 'Build a comprehensive session plan with activities and resources',
    type: 'session',
    icon: FileSpreadsheet
  }
];

export function DocumentFormGenerator({ documentId, onGenerated }: DocumentFormGeneratorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedForm, setGeneratedForm] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('template');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [options, setOptions] = useState({
    includeMetadata: true,
    extractCompetencies: true,
    mapToRegulations: true,
    generateInstructions: true,
    includeSignatures: true
  });
  const { toast } = useToast();

  // Fetch document details
  const { data: document, isLoading: isLoadingDocument } = useQuery<UploadedDocument>({
    queryKey: [`/api/documents/${documentId}`],
    // Use default fetcher
  });

  // Generate form mutation
  const generateFormMutation = useMutation({
    mutationFn: async (params: {
      documentId: number;
      templateId: string;
      formName: string;
      options: Record<string, boolean>;
    }) => {
      setIsGenerating(true);
      setProgress(0);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const increment = Math.random() * 10;
          const newProgress = Math.min(prev + increment, 95);
          return newProgress;
        });
      }, 800);
      
      // Make API request
      try {
        const response = await apiRequest(
          'POST',
          `/api/documents/${params.documentId}/generate-form`,
          {
            templateId: params.templateId,
            formName: params.formName,
            options: params.options
          }
        );
        
        clearInterval(progressInterval);
        setProgress(100);
        
        return await response.json();
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      }
    },
    onSuccess: (data) => {
      setIsGenerating(false);
      setGeneratedForm(data);
      setActiveTab('preview');
      
      toast({
        title: "Form generated",
        description: "The form has been successfully generated from the document.",
        variant: "default",
      });
      
      if (onGenerated) {
        onGenerated(data);
      }
    },
    onError: (error: Error) => {
      setIsGenerating(false);
      setProgress(0);
      
      toast({
        title: "Generation failed",
        description: error.message || "There was an error generating the form. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    
    // Set default form name based on template and document
    if (document) {
      const template = FORM_TEMPLATES.find(t => t.id === templateId);
      if (template) {
        setFormName(`${template.name} - ${document.title}`);
      }
    }
  };

  // Handle option change
  const handleOptionChange = (key: keyof typeof options, value: boolean) => {
    setOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Handle generate
  const handleGenerate = () => {
    if (!selectedTemplate) {
      toast({
        title: "No template selected",
        description: "Please select a template to generate a form.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formName.trim()) {
      toast({
        title: "Missing form name",
        description: "Please provide a name for the generated form.",
        variant: "destructive",
      });
      return;
    }
    
    generateFormMutation.mutate({
      documentId,
      templateId: selectedTemplate,
      formName,
      options
    });
  };

  // Handle download
  const handleDownload = () => {
    if (!generatedForm) return;
    
    toast({
      title: "Download started",
      description: "The generated form is being downloaded.",
      variant: "default",
    });
  };

  // Handle save
  const handleSave = () => {
    if (!generatedForm) return;
    
    toast({
      title: "Form saved",
      description: "The form has been saved to your documents.",
      variant: "default",
    });
  };

  if (isLoadingDocument) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generate Form</CardTitle>
          <CardDescription>Loading document information...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!document) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertCircle className="mr-2 h-5 w-5" />
            Document Not Found
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>The requested document could not be found or you don't have permission to access it.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Wand2 className="mr-2 h-5 w-5" />
          Generate Form
        </CardTitle>
        <CardDescription>
          Generate a form based on the content of "{document.title}"
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="template">Template</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="preview" disabled={!generatedForm}>Preview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="template">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Select a Form Template</h3>
                <RadioGroup 
                  value={selectedTemplate} 
                  onValueChange={handleTemplateSelect}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  {FORM_TEMPLATES.map(template => (
                    <div key={template.id} className="relative">
                      <RadioGroupItem
                        value={template.id}
                        id={template.id}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={template.id}
                        className="flex flex-col items-center gap-2 p-4 border rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                      >
                        <template.icon className="h-8 w-8 text-muted-foreground peer-data-[state=checked]:text-primary" />
                        <div className="font-medium">{template.name}</div>
                        <p className="text-xs text-center text-muted-foreground">{template.description}</p>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="form-name">Form Name</Label>
                  <Input
                    id="form-name"
                    placeholder="Enter form name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>
                
                <Button 
                  onClick={() => setActiveTab('settings')} 
                  className="w-full mt-4"
                  disabled={!selectedTemplate || !formName.trim() || isGenerating}
                >
                  Continue to Settings
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="settings">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Form Settings</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 text-xs"
                    onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  >
                    {showAdvancedOptions ? "Hide" : "Show"} Advanced Options
                    {showAdvancedOptions ? <ChevronDown className="ml-1 h-4 w-4" /> : <ChevronRight className="ml-1 h-4 w-4" />}
                  </Button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include-metadata" 
                      checked={options.includeMetadata}
                      onCheckedChange={(checked) => handleOptionChange('includeMetadata', !!checked)}
                    />
                    <label
                      htmlFor="include-metadata"
                      className="text-sm font-medium leading-none"
                    >
                      Include document metadata
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="extract-competencies" 
                      checked={options.extractCompetencies}
                      onCheckedChange={(checked) => handleOptionChange('extractCompetencies', !!checked)}
                    />
                    <label
                      htmlFor="extract-competencies"
                      className="text-sm font-medium leading-none"
                    >
                      Extract competencies
                    </label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="include-signatures" 
                      checked={options.includeSignatures}
                      onCheckedChange={(checked) => handleOptionChange('includeSignatures', !!checked)}
                    />
                    <label
                      htmlFor="include-signatures"
                      className="text-sm font-medium leading-none"
                    >
                      Include signature fields
                    </label>
                  </div>
                </div>
                
                {showAdvancedOptions && (
                  <div className="mt-4 space-y-4 border rounded-md p-4 bg-muted/20">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="map-regulations" 
                        checked={options.mapToRegulations}
                        onCheckedChange={(checked) => handleOptionChange('mapToRegulations', !!checked)}
                      />
                      <label
                        htmlFor="map-regulations"
                        className="text-sm font-medium leading-none"
                      >
                        Map to regulatory requirements
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="generate-instructions" 
                        checked={options.generateInstructions}
                        onCheckedChange={(checked) => handleOptionChange('generateInstructions', !!checked)}
                      />
                      <label
                        htmlFor="generate-instructions"
                        className="text-sm font-medium leading-none"
                      >
                        Generate instructions for each section
                      </label>
                    </div>
                    
                    <div className="space-y-2 pt-2">
                      <Label htmlFor="template-format">Template Format</Label>
                      <Select defaultValue="pdf">
                        <SelectTrigger id="template-format">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="docx">Word Document</SelectItem>
                          <SelectItem value="html">HTML</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
              
              <Separator />
              
              {isGenerating ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Generating form...</p>
                    <p className="text-sm text-muted-foreground">{Math.round(progress)}%</p>
                  </div>
                  <Progress value={progress} />
                  <div className="text-center text-sm text-muted-foreground">
                    {progress < 30 ? (
                      "Analyzing document content..."
                    ) : progress < 60 ? (
                      "Identifying form structure..."
                    ) : progress < 90 ? (
                      "Building form template..."
                    ) : (
                      "Finalizing form..."
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('template')}
                  >
                    Back to Templates
                  </Button>
                  
                  <Button 
                    onClick={handleGenerate}
                    disabled={!selectedTemplate || !formName.trim()}
                  >
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate Form
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="preview">
            {generatedForm ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Form Generated
                    </Badge>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleDownload}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        setGeneratedForm(null);
                        setProgress(0);
                        setActiveTab('template');
                      }}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Start Over
                    </Button>
                  </div>
                </div>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">
                      {formName}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-md p-4 bg-muted/10 min-h-[400px] flex flex-col items-center justify-center text-center">
                      <Wand2 className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-xl font-medium mb-2">Form Preview</h3>
                      <p className="text-muted-foreground mb-4">
                        Your form has been generated successfully.
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={handleDownload}>
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                        <Button onClick={handleSave}>
                          <Save className="mr-2 h-4 w-4" />
                          Save to Documents
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-2">Form Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Template:</p>
                      <p>{FORM_TEMPLATES.find(t => t.id === selectedTemplate)?.name || 'Custom'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created From:</p>
                      <p>{document.title}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date Generated:</p>
                      <p>{new Date().toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Format:</p>
                      <p>PDF</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Form Generated</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't generated a form yet. Select a template and configure settings to generate a form.
                </p>
                <Button onClick={() => setActiveTab('template')}>
                  Select Template
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between border-t pt-6">
        {activeTab !== 'preview' && !isGenerating && (
          <>
            <Button variant="outline" disabled={isGenerating}>
              Cancel
            </Button>
            
            {activeTab === 'template' ? (
              <Button 
                onClick={() => setActiveTab('settings')} 
                disabled={!selectedTemplate || !formName.trim() || isGenerating}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleGenerate}
                disabled={!selectedTemplate || !formName.trim()}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Form
              </Button>
            )}
          </>
        )}
        
        {generatedForm && activeTab === 'preview' && (
          <>
            <Button 
              variant="outline" 
              onClick={() => {
                setGeneratedForm(null);
                setProgress(0);
                setActiveTab('template');
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Start Over
            </Button>
            
            <Button onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save to Documents
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}