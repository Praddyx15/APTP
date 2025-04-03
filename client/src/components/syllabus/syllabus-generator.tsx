import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { SyllabusGenerationOptions } from '@shared/syllabus-types';

export default function SyllabusGenerator() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [options, setOptions] = useState<SyllabusGenerationOptions>({
    programType: 'initial_type_rating',
    includeSimulatorExercises: true,
    includeClassroomModules: true,
    includeAssessments: true,
    customizationLevel: 'moderate',
    defaultDuration: 14
  });
  const [generatedSyllabus, setGeneratedSyllabus] = useState<any>(null);

  // Fetch available documents
  const { data: documents, isLoading: isLoadingDocuments } = useQuery({
    queryKey: ['/api/documents'],
    queryFn: async () => {
      const res = await fetch('/api/documents');
      if (!res.ok) throw new Error('Failed to fetch documents');
      return res.json();
    }
  });

  // Mutation for generating syllabus
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDocumentId) throw new Error('Please select a document');
      
      const res = await apiRequest('POST', '/api/protected/syllabus/generate', {
        documentId: selectedDocumentId,
        options
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to generate syllabus');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      setGeneratedSyllabus(data);
      toast({
        title: 'Syllabus Generated',
        description: 'The syllabus has been successfully generated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Generation Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Mutation for importing syllabus as a program
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!generatedSyllabus) throw new Error('No syllabus to import');
      
      const res = await apiRequest('POST', '/api/protected/syllabus/import', {
        syllabus: generatedSyllabus
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to import syllabus');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Syllabus Imported',
        description: 'The syllabus has been successfully imported as a training program.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/programs'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const handleOptionChange = (key: keyof SyllabusGenerationOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">AI Syllabus Generator</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Options Card */}
        <Card>
          <CardHeader>
            <CardTitle>Generation Options</CardTitle>
            <CardDescription>
              Configure the options for syllabus generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Document Selection */}
            <div className="space-y-2">
              <Label htmlFor="document">Training Document</Label>
              <Select 
                value={selectedDocumentId?.toString() || ''} 
                onValueChange={(value) => setSelectedDocumentId(parseInt(value))}
              >
                <SelectTrigger id="document">
                  <SelectValue placeholder="Select a document" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingDocuments ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : documents?.length ? (
                    documents.map((doc: any) => (
                      <SelectItem key={doc.id} value={doc.id.toString()}>
                        {doc.title}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">
                      No documents available. Please upload a document first.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            
            {/* Program Type */}
            <div className="space-y-2">
              <Label htmlFor="programType">Program Type</Label>
              <Select 
                value={options.programType} 
                onValueChange={(value) => handleOptionChange('programType', value)}
              >
                <SelectTrigger id="programType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial_type_rating">Initial Type Rating</SelectItem>
                  <SelectItem value="recurrent">Recurrent Training</SelectItem>
                  <SelectItem value="joc_mcc">JOC/MCC</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Aircraft Type */}
            <div className="space-y-2">
              <Label htmlFor="aircraftType">Aircraft Type (Optional)</Label>
              <Input 
                id="aircraftType" 
                placeholder="e.g., A320, B737"
                value={options.aircraftType || ''}
                onChange={(e) => handleOptionChange('aircraftType', e.target.value)}
              />
            </div>
            
            {/* Regulatory Authority */}
            <div className="space-y-2">
              <Label htmlFor="regulatoryAuthority">Regulatory Authority</Label>
              <Select 
                value={options.regulatoryAuthority || 'easa'} 
                onValueChange={(value) => handleOptionChange('regulatoryAuthority', value)}
              >
                <SelectTrigger id="regulatoryAuthority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easa">EASA</SelectItem>
                  <SelectItem value="faa">FAA</SelectItem>
                  <SelectItem value="icao">ICAO</SelectItem>
                  <SelectItem value="dgca">DGCA</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Default Duration */}
            <div className="space-y-2">
              <Label htmlFor="defaultDuration">Default Duration (days)</Label>
              <Input 
                id="defaultDuration" 
                type="number" 
                min={1}
                value={options.defaultDuration}
                onChange={(e) => handleOptionChange('defaultDuration', parseInt(e.target.value))}
              />
            </div>
            
            {/* Customization Level */}
            <div className="space-y-2">
              <Label htmlFor="customizationLevel">Customization Level</Label>
              <Select 
                value={options.customizationLevel} 
                onValueChange={(value) => handleOptionChange('customizationLevel', value)}
              >
                <SelectTrigger id="customizationLevel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="extensive">Extensive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Toggle options */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="simulatorExercises">Include Simulator Exercises</Label>
                <Switch 
                  id="simulatorExercises" 
                  checked={options.includeSimulatorExercises}
                  onCheckedChange={(checked) => handleOptionChange('includeSimulatorExercises', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="classroomModules">Include Classroom Modules</Label>
                <Switch 
                  id="classroomModules" 
                  checked={options.includeClassroomModules}
                  onCheckedChange={(checked) => handleOptionChange('includeClassroomModules', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="assessments">Include Assessments</Label>
                <Switch 
                  id="assessments" 
                  checked={options.includeAssessments}
                  onCheckedChange={(checked) => handleOptionChange('includeAssessments', checked)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => generateMutation.mutate()} 
              disabled={!selectedDocumentId || generateMutation.isPending}
              className="w-full"
            >
              {generateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Generate Syllabus
            </Button>
          </CardFooter>
        </Card>
        
        {/* Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Generated Syllabus</CardTitle>
            <CardDescription>
              Preview the generated syllabus before importing
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[60vh] overflow-auto">
            {generateMutation.isPending ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : generatedSyllabus ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold">{generatedSyllabus.name}</h3>
                  <p className="text-muted-foreground">{generatedSyllabus.description}</p>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold mb-2">Program Details</h4>
                  <div className="space-y-1">
                    <p><span className="font-medium">Type:</span> {generatedSyllabus.programType}</p>
                    {generatedSyllabus.aircraftType && <p><span className="font-medium">Aircraft:</span> {generatedSyllabus.aircraftType}</p>}
                    <p><span className="font-medium">Duration:</span> {generatedSyllabus.totalDuration} days</p>
                    <p><span className="font-medium">Authority:</span> {generatedSyllabus.regulatoryAuthority || 'Not specified'}</p>
                    <p><span className="font-medium">Confidence Score:</span> {generatedSyllabus.confidenceScore}%</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold mb-2">Modules ({generatedSyllabus.modules.length})</h4>
                  <div className="space-y-3">
                    {generatedSyllabus.modules.map((module: any, index: number) => (
                      <div key={index} className="p-3 border rounded-md">
                        <h5 className="font-medium">{module.name}</h5>
                        <p className="text-sm text-muted-foreground">{module.description}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">{module.type}</span>
                          <span>{module.recommendedDuration} hours</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-semibold mb-2">Lessons ({generatedSyllabus.lessons.length})</h4>
                  <div className="space-y-3">
                    {generatedSyllabus.lessons.map((lesson: any, index: number) => (
                      <div key={index} className="p-3 border rounded-md">
                        <h5 className="font-medium">{lesson.name}</h5>
                        <p className="text-sm text-muted-foreground">{lesson.description}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded-full bg-secondary/10 text-secondary">{lesson.type}</span>
                          <span>{lesson.duration} minutes</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <p className="text-muted-foreground mb-2">
                  No syllabus generated yet. Configure the options and click "Generate Syllabus".
                </p>
              </div>
            )}
          </CardContent>
          {generatedSyllabus && (
            <CardFooter>
              <Button 
                onClick={() => importMutation.mutate()} 
                disabled={importMutation.isPending}
                className="w-full"
              >
                {importMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Import as Training Program
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}