import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  FileIcon,
  FileTextIcon,
  FilePdfIcon,
  FileSpreadsheetIcon,
  MoreVerticalIcon,
  SearchIcon,
  TrashIcon,
  EyeIcon,
  DownloadIcon,
  FilterIcon,
  GraphIcon,
} from 'lucide-react';
import DocumentViewer from './DocumentViewer';

// Document status badge component
const DocumentStatusBadge = ({ status }: { status: string }) => {
  const statusMap: Record<string, { variant: 'default' | 'outline' | 'secondary' | 'destructive', label: string }> = {
    'pending': { variant: 'outline', label: 'Pending' },
    'processing': { variant: 'secondary', label: 'Processing' },
    'complete': { variant: 'default', label: 'Complete' },
    'error': { variant: 'destructive', label: 'Error' }
  };

  const { variant, label } = statusMap[status] || { variant: 'outline', label: status };
  
  return (
    <Badge variant={variant}>
      {label}
    </Badge>
  );
};

// Get file icon based on file type
const getFileIcon = (fileType: string) => {
  if (fileType.includes('pdf')) return <FilePdfIcon className="h-4 w-4 text-red-500" />;
  if (fileType.includes('word') || fileType.includes('text')) return <FileTextIcon className="h-4 w-4 text-blue-500" />;
  if (fileType.includes('excel') || fileType.includes('sheet')) return <FileSpreadsheetIcon className="h-4 w-4 text-green-500" />;
  return <FileIcon className="h-4 w-4 text-gray-500" />;
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

// Format date
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

interface Document {
  id: string;
  title: string;
  fileType: string;
  fileSize: number;
  uploadedById: number;
  createdAt: string;
  processingStatus: string;
  createKnowledgeGraph: boolean;
}

const DocumentList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch documents
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/documents'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/documents');
      const data = await response.json();
      return data.documents as Document[];
    },
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      await apiRequest('DELETE', `/api/documents/${documentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Document Deleted",
        description: "The document has been successfully deleted.",
      });
      setDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Process document mutation
  const processMutation = useMutation({
    mutationFn: async (documentId: string) => {
      await apiRequest('POST', `/api/documents/${documentId}/process`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Processing Started",
        description: "Document processing has been initiated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle document deletion
  const handleDeleteDocument = (document: Document) => {
    setSelectedDocument(document);
    setDeleteDialogOpen(true);
  };

  // Confirm document deletion
  const confirmDeleteDocument = () => {
    if (selectedDocument) {
      deleteMutation.mutate(selectedDocument.id);
    }
  };

  // Handle document view
  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setViewerOpen(true);
  };

  // Handle document processing
  const handleProcessDocument = (document: Document) => {
    processMutation.mutate(document.id);
  };

  // Filter documents based on search query
  const filteredDocuments = data?.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Document Library</CardTitle>
          <CardDescription>
            Manage your uploaded aviation training documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="relative w-full max-w-sm">
              <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="gap-1">
              <FilterIcon className="h-4 w-4" />
              Filter
            </Button>
          </div>

          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-muted-foreground">Loading documents...</p>
            </div>
          ) : error ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-destructive">Error loading documents</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-muted-foreground">No documents found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Knowledge Graph</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(document.fileType)}
                          <span className="font-medium">{document.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatFileSize(document.fileSize)}</TableCell>
                      <TableCell>{formatDate(document.createdAt)}</TableCell>
                      <TableCell>
                        <DocumentStatusBadge status={document.processingStatus} />
                      </TableCell>
                      <TableCell>
                        {document.createKnowledgeGraph ? (
                          <Badge variant="outline" className="bg-blue-50">
                            <GraphIcon className="h-3 w-3 mr-1" />
                            Enabled
                          </Badge>
                        ) : (
                          <Badge variant="outline">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreVerticalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleViewDocument(document)}>
                              <EyeIcon className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleProcessDocument(document)}>
                              <GraphIcon className="h-4 w-4 mr-2" />
                              Process
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteDocument(document)}
                              className="text-destructive focus:text-destructive"
                            >
                              <TrashIcon className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Viewer Dialog */}
      {selectedDocument && (
        <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedDocument.title}</DialogTitle>
              <DialogDescription>
                Uploaded on {formatDate(selectedDocument.createdAt)}
              </DialogDescription>
            </DialogHeader>
            <div className="h-[60vh] overflow-auto">
              <DocumentViewer documentId={selectedDocument.id} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteDocument}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentList;