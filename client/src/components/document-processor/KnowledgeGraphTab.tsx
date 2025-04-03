import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DocumentUploader } from '@/components/document/document-uploader';
import { DocumentViewer } from '@/components/document/document-viewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Upload, Network } from 'lucide-react';
import { SyllabusStructure } from '@/lib/document-processor';

export default function KnowledgeGraphTab() {
  const [processedDocument, setProcessedDocument] = useState<SyllabusStructure | null>(null);
  const [activeView, setActiveView] = useState('upload');
  
  const handleProcessingComplete = (result: SyllabusStructure) => {
    setProcessedDocument(result);
    setActiveView('view');
  };
  
  const handleEditDocument = (document: SyllabusStructure) => {
    // Implementation for editing will be added in future iterations
    console.log('Edit document:', document);
  };
  
  return (
    <div className="space-y-4">
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span>Upload Document</span>
          </TabsTrigger>
          <TabsTrigger 
            value="view" 
            className="flex items-center gap-2"
            disabled={!processedDocument}
          >
            <FileText className="h-4 w-4" />
            <span>View Document</span>
          </TabsTrigger>
          <TabsTrigger 
            value="graph" 
            className="flex items-center gap-2"
            disabled={!processedDocument}
          >
            <Network className="h-4 w-4" />
            <span>Knowledge Graph</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="mt-0 space-y-4">
          <Card>
            <CardContent className="pt-6">
              <DocumentUploader 
                onProcessingComplete={handleProcessingComplete}
                maxSize={20}
                acceptedFileTypes={[
                  'application/pdf',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                ]}
                allowMultiple={false}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="view" className="mt-0 space-y-4">
          {processedDocument && (
            <Card>
              <CardContent className="pt-6">
                <DocumentViewer 
                  document={processedDocument} 
                  onEdit={handleEditDocument}
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="graph" className="mt-0 space-y-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="p-12 border-2 border-dashed rounded-lg">
                <h3 className="text-xl font-medium mb-2">Knowledge Graph Visualization</h3>
                <p className="text-muted-foreground mb-4">
                  Interactive knowledge graph visualization will be implemented in a future update.
                </p>
                <Button>Generate Knowledge Graph</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}