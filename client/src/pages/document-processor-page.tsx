import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, FileSearch, PenTool, BrainCircuit, Book, FileUp } from 'lucide-react';
import { AppLayout } from '@/components/layouts/app-layout';
import KnowledgeGraphTab from '@/components/document-processor/KnowledgeGraphTab';
import OCRProcessingTab from '@/components/document-processor/OCRProcessingTab';
import DocumentAnalysisTab from '@/components/document-processor/DocumentAnalysisTab';
import SyllabusGenerationTab from '@/components/document-processor/SyllabusGenerationTab';

export default function DocumentProcessorPage() {
  const [activeTab, setActiveTab] = useState('knowledge');
  
  return (
    <AppLayout>
      <Helmet>
        <title>Document Processor | Aviation Training Platform</title>
      </Helmet>
      
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Processor</h1>
          <p className="text-muted-foreground">
            Process, analyze and extract value from your aviation training documents
          </p>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full mb-6">
                <TabsTrigger value="ocr" className="flex items-center gap-2">
                  <FileSearch className="h-4 w-4" />
                  <span className="hidden sm:inline">OCR Processing</span>
                  <span className="sm:hidden">OCR</span>
                </TabsTrigger>
                <TabsTrigger value="analysis" className="flex items-center gap-2">
                  <PenTool className="h-4 w-4" />
                  <span className="hidden sm:inline">Document Analysis</span>
                  <span className="sm:hidden">Analysis</span>
                </TabsTrigger>
                <TabsTrigger value="knowledge" className="flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4" />
                  <span className="hidden sm:inline">Knowledge Graph</span>
                  <span className="sm:hidden">Graph</span>
                </TabsTrigger>
                <TabsTrigger value="syllabus" className="flex items-center gap-2">
                  <Book className="h-4 w-4" />
                  <span className="hidden sm:inline">Syllabus Generation</span>
                  <span className="sm:hidden">Syllabus</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="ocr" className="mt-0">
                <div className="p-1">
                  <OCRProcessingTab />
                </div>
              </TabsContent>
              
              <TabsContent value="analysis" className="mt-0">
                <div className="p-1">
                  <DocumentAnalysisTab />
                </div>
              </TabsContent>
              
              <TabsContent value="knowledge" className="mt-0">
                <div className="p-1">
                  <KnowledgeGraphTab />
                </div>
              </TabsContent>
              
              <TabsContent value="syllabus" className="mt-0">
                <div className="p-1">
                  <SyllabusGenerationTab />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-md">
                  <FileSearch className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
                <CardTitle>OCR Processing</CardTitle>
              </div>
              <CardDescription>
                Extract text from images and documents using OCR technology
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Upload PDF, JPEG, PNG, and TIFF documents</li>
                <li>Process scanned documents and images</li>
                <li>Extract structured text with high accuracy</li>
                <li>Supports multiple languages detection</li>
                <li>Table and form detection</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-md">
                  <PenTool className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                </div>
                <CardTitle>Document Analysis</CardTitle>
              </div>
              <CardDescription>
                Analyze document content, structure, and extract key information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Determine document category and context</li>
                <li>Identify key entities and concepts</li>
                <li>Extract references to regulations</li>
                <li>Generate document insights and summaries</li>
                <li>Find related documents in your repository</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-md">
                  <Book className="h-5 w-5 text-purple-600 dark:text-purple-300" />
                </div>
                <CardTitle>Syllabus Generation</CardTitle>
              </div>
              <CardDescription>
                Generate training syllabi based on document content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Create structured training programs</li>
                <li>Extract modules, lessons and competencies</li>
                <li>Map content to regulatory requirements</li>
                <li>Generate learning objectives automatically</li>
                <li>Customize for different regulatory frameworks</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}