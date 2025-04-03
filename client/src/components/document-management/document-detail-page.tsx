import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { UploadedDocument } from './document-uploader';
import { DocumentExtractor } from './document-extractor';
import { DocumentFormGenerator } from './document-form-generator';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from 'wouter';
import {
  FileText,
  Download,
  Trash2,
  Pencil,
  History,
  Share2,
  ClipboardList,
  Star,
  StarOff,
  Eye,
  MessageSquare,
  Loader2,
  AlertCircle,
  Calendar,
  Tags,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Wand2,
  FileBarChart,
  FileSpreadsheet,
  FileSearch,
  ArrowUpRight,
  Hash,
  HelpCircle,
  ChevronLeft,
} from 'lucide-react';

interface DocumentDetailPageProps {
  documentId: number;
}

export function DocumentDetailPage({ documentId }: DocumentDetailPageProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  // Fetch document details
  const { data: document, isLoading, error } = useQuery<UploadedDocument>({
    queryKey: [`/api/documents/${documentId}`],
    // Use default fetcher
  });

  // Set document title
  useDocumentTitle(document?.title || 'Document Details');

  // Favorite document mutation
  const favoriteDocumentMutation = useMutation({
    mutationFn: async (isFavorite: boolean) => {
      const response = await apiRequest(
        'POST',
        `/api/documents/${documentId}/favorite`,
        { isFavorite }
      );
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}`] });
      toast({
        title: "Success",
        description: "Document favorite status updated.",
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update favorite status.",
        variant: "destructive",
      });
    }
  });

  // Delete document mutation
  const deleteDocumentMutation = useMutation({
    mutationFn: async () => {
      setIsDeleting(true);
      const response = await apiRequest(
        'DELETE',
        `/api/documents/${documentId}`
      );
      return await response.json();
    },
    onSuccess: () => {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Document deleted",
        description: "The document has been successfully deleted.",
        variant: "default",
      });
      // Redirect could be handled here
    },
    onError: (error: Error) => {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      toast({
        title: "Deletion failed",
        description: error.message || "There was an error deleting the document. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Handle delete document
  const handleDeleteDocument = () => {
    deleteDocumentMutation.mutate();
  };

  // Handle toggle favorite
  const handleToggleFavorite = () => {
    if (!document) return;
    favoriteDocumentMutation.mutate(!document.isFavorite);
  };

  // Handle download document
  const handleDownload = () => {
    if (!document) return;
    window.open(document.url, '_blank');
    toast({
      title: "Download started",
      description: "The document is being downloaded.",
      variant: "default",
    });
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get file icon based on file type
  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case 'application/pdf':
        return <FileText className="h-6 w-6 text-red-500" />;
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return <FileText className="h-6 w-6 text-blue-500" />;
      case 'application/vnd.ms-excel':
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        return <FileSpreadsheet className="h-6 w-6 text-green-500" />;
      case 'application/vnd.ms-powerpoint':
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        return <FileBarChart className="h-6 w-6 text-orange-500" />;
      default:
        return <FileText className="h-6 w-6 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h3 className="text-lg font-medium mb-2">Document Not Found</h3>
        <p className="text-muted-foreground mb-4">
          The document you're looking for couldn't be found or you don't have permission to access it.
        </p>
        <Button variant="outline">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-7xl mx-auto">
      <Link href="/documents" className="mb-4 block">
        <Button variant="outline" className="gap-2">
          <ChevronLeft className="h-4 w-4" />
          Back to Documents
        </Button>
      </Link>

      <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            {getFileIcon(document.fileType)}
            {document.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            {document.description || 'No description provided'}
          </p>
          
          <div className="flex flex-wrap gap-2 mt-4">
            {document.tags && document.tags.length > 0 ? (
              document.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="px-2 py-1">
                  <Hash className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="px-2 py-1 bg-muted/50">
                <HelpCircle className="h-3 w-3 mr-1" />
                No tags
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          
          <Button variant="outline" onClick={handleToggleFavorite}>
            {document.isFavorite ? (
              <>
                <StarOff className="mr-2 h-4 w-4" />
                Unfavorite
              </>
            ) : (
              <>
                <Star className="mr-2 h-4 w-4" />
                Favorite
              </>
            )}
          </Button>
          
          <Button variant="outline">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          
          <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Document</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete "{document.title}"? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteDocument}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Document
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col">
              <p className="text-sm font-medium text-muted-foreground mb-1">Uploaded By</p>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={document.uploadedByAvatar} alt={document.uploadedByName} />
                  <AvatarFallback>{document.uploadedByName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{document.uploadedByName || 'Unknown User'}</p>
                  <p className="text-xs text-muted-foreground">{document.uploadedByRole || 'User'}</p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col">
              <p className="text-sm font-medium text-muted-foreground mb-1">File Details</p>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <p className="text-sm">{document.fileName}</p>
                  <Badge variant="outline" className="ml-auto text-xs font-normal">
                    {document.fileType.split('/')[1]?.toUpperCase() || document.fileType}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{formatFileSize(document.fileSize)}</p>
              </div>
            </div>
            
            <div className="flex flex-col">
              <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
              <div className="flex items-center gap-2">
                {document.isProcessed ? (
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Processed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                    <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                    Processing
                  </Badge>
                )}
                <p className="text-xs text-muted-foreground ml-auto">
                  Uploaded: {new Date(document.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="extract">Extract</TabsTrigger>
          <TabsTrigger value="generate-form">Generate Form</TabsTrigger>
          <TabsTrigger value="versions" className="hidden lg:block">Versions</TabsTrigger>
          <TabsTrigger value="analyze" className="hidden lg:block">Analyze</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Document Overview</CardTitle>
              <CardDescription>
                View document details, metadata, and content preview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md p-4 flex flex-col items-center justify-center min-h-[400px]">
                <iframe 
                  title={document.title}
                  src={document.url}
                  className="w-full h-[600px] border rounded"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="extract">
          <DocumentExtractor documentId={documentId} />
        </TabsContent>
        
        <TabsContent value="generate-form">
          <DocumentFormGenerator documentId={documentId} />
        </TabsContent>
        
        <TabsContent value="versions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="mr-2 h-5 w-5" />
                Document Versions
              </CardTitle>
              <CardDescription>
                View and manage document versions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md p-6 text-center">
                <p className="text-muted-foreground">
                  Version history will be available in a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analyze">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileSearch className="mr-2 h-5 w-5" />
                Document Analysis
              </CardTitle>
              <CardDescription>
                Analyze document content and extract insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md p-6 text-center">
                <p className="text-muted-foreground">
                  Document analysis features will be available in a future update.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}