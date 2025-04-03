import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DocumentUploader from '@/components/document-management/DocumentUploader';
import DocumentList from '@/components/document-management/DocumentList';
import { Button } from '@/components/ui/button';
import { PlusIcon, LibraryIcon, UploadIcon } from 'lucide-react';

const DocumentManagementPage = () => {
  const [activeTab, setActiveTab] = useState('library');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Management</h1>
          <p className="text-muted-foreground">
            Upload, analyze and manage aviation training documents
          </p>
        </div>
        {activeTab === 'library' && (
          <Button onClick={() => setActiveTab('upload')}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="library" className="flex items-center">
            <LibraryIcon className="mr-2 h-4 w-4" />
            Library
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center">
            <UploadIcon className="mr-2 h-4 w-4" />
            Upload
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="library" className="mt-6">
          <DocumentList />
        </TabsContent>
        
        <TabsContent value="upload" className="mt-6">
          <div className="max-w-2xl mx-auto">
            <DocumentUploader 
              onUploadComplete={() => setActiveTab('library')}
              createKnowledgeGraph={true}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DocumentManagementPage;