import React, { useState } from 'react';
import { DocumentUploader } from '@/components/document/document-uploader';
import { DocumentViewer } from '@/components/document/document-viewer';
import { SyllabusStructure } from '@/lib/document-processor';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { FilePlus2, FileSearch, Settings } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export default function DocumentPage() {
  const { toast } = useToast();
  const [processedDocument, setProcessedDocument] = useState<SyllabusStructure | null>(null);
  const [activeTab, setActiveTab] = useState('upload');

  // Query for list of documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ['/api/documents'],
    enabled: activeTab === 'library',
  });

  const handleProcessingComplete = (result: SyllabusStructure) => {
    setProcessedDocument(result);
    setActiveTab('viewer');
    toast({
      title: 'Document processed successfully',
      description: `"${result.title}" is ready to view`,
      variant: 'default',
    });
  };

  const handleEditDocument = (document: SyllabusStructure) => {
    toast({
      title: 'Edit document',
      description: 'Document editing is not yet implemented',
      variant: 'default',
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Document Processing</h1>
        <p className="text-muted-foreground mt-2">
          Upload training syllabi, manuals, and regulatory documents for intelligent analysis and extraction
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="upload" className="flex items-center space-x-2">
              <FilePlus2 className="h-4 w-4" />
              <span>Upload</span>
            </TabsTrigger>
            
            <TabsTrigger value="viewer" disabled={!processedDocument} className="flex items-center space-x-2">
              <FileSearch className="h-4 w-4" />
              <span>Current Document</span>
            </TabsTrigger>
            
            <TabsTrigger value="library" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Document Library</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="upload" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Upload Document</CardTitle>
              <CardDescription>
                Upload syllabus files to extract structure, learning objectives, and content maps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUploader 
                onProcessingComplete={handleProcessingComplete}
                acceptedFileTypes={['.pdf', '.docx', '.xlsx', '.xls']}
                maxSize={20}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="viewer" className="mt-0">
          {processedDocument ? (
            <DocumentViewer 
              document={processedDocument} 
              onEdit={handleEditDocument}
            />
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No document currently processed.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setActiveTab('upload')}
                >
                  Upload a document
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="library" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Document Library</CardTitle>
              <CardDescription>
                Browse and manage your processed documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading documents...</p>
                </div>
              ) : documents && documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Document cards would go here */}
                  <p className="col-span-full text-center text-muted-foreground">
                    Document library feature coming soon...
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No documents found in your library.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setActiveTab('upload')}
                  >
                    Upload your first document
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}