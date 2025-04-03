import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileText, Search, PlusCircle, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Document, User } from "@shared/schema";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DocumentsListProps {
  searchQuery: string;
}

export default function DocumentsList({ searchQuery }: DocumentsListProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [newDocument, setNewDocument] = useState<{
    title: string;
    description: string;
    fileType: string;
    url: string;
  }>({
    title: "",
    description: "",
    fileType: "pdf",
    url: "",
  });

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  // Fetch users for document uploaders
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/protected/users"],
  });

  // Filter documents based on search query
  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    
    return documents.filter(doc => 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [documents, searchQuery]);

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: typeof newDocument) => {
      const res = await apiRequest("POST", "/api/protected/documents", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setIsUploading(false);
      setNewDocument({
        title: "",
        description: "",
        fileType: "pdf",
        url: "",
      });
      toast({
        title: "Document uploaded",
        description: "The document has been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to upload document",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/protected/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Document deleted",
        description: "The document has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete document",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle document upload
  const handleUpload = () => {
    if (!newDocument.title || !newDocument.url) {
      toast({
        title: "Missing information",
        description: "Please provide a title and URL for the document.",
        variant: "destructive",
      });
      return;
    }
    
    uploadMutation.mutate(newDocument);
  };

  // Handle document delete
  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Documents</h1>
          <p className="text-slate-500">Manage and access training materials and resources</p>
        </div>
        <Button
          className="text-sm bg-blue-500 hover:bg-blue-600 text-white"
          onClick={() => setIsUploading(true)}
        >
          <PlusCircle className="h-4 w-4 mr-1.5" />
          Upload Document
        </Button>
      </div>
      
      {/* Search bar - This is already handled by the parent component */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            type="text"
            className="py-2 pl-10 pr-4 block w-full rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Search documents..."
            value={searchQuery}
            readOnly
          />
        </div>
      </div>
      
      {/* Documents grid */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredDocuments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map(document => {
            const uploader = users?.find(user => user.id === document.uploadedById);
            const fileTypeColors = {
              'pdf': 'text-red-500',
              'doc': 'text-blue-500',
              'ppt': 'text-orange-500',
              'xls': 'text-green-500',
              'default': 'text-slate-500'
            };
            
            const colorClass = document.fileType in fileTypeColors 
              ? fileTypeColors[document.fileType as keyof typeof fileTypeColors]
              : fileTypeColors.default;
            
            return (
              <div key={document.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start mb-4">
                    <div className={`p-3 rounded-md bg-slate-100 ${colorClass}`}>
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-slate-800">{document.title}</h3>
                      <p className="text-xs text-slate-500 uppercase">{document.fileType.toUpperCase()}</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-4">{document.description || "No description available."}</p>
                  
                  <div className="text-xs text-slate-500 mb-4">
                    {uploader && (
                      <p>Uploaded by: {uploader.firstName} {uploader.lastName}</p>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600"
                      onClick={() => window.open(document.url, '_blank')}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-slate-400 hover:text-red-500"
                      onClick={() => handleDelete(document.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
          <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">No documents found</h3>
          <p className="text-slate-500 mb-4">
            {searchQuery 
              ? "No documents match your search criteria. Try different keywords."
              : "There are no documents available. Upload your first document."}
          </p>
          <Button
            className="text-sm bg-blue-500 hover:bg-blue-600 text-white"
            onClick={() => setIsUploading(true)}
          >
            <PlusCircle className="h-4 w-4 mr-1.5" />
            Upload Document
          </Button>
        </div>
      )}
      
      {/* Upload Document Dialog */}
      <Dialog open={isUploading} onOpenChange={setIsUploading}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload New Document</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Document Title</Label>
              <Input
                id="title"
                value={newDocument.title}
                onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                placeholder="Enter document title"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newDocument.description}
                onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                placeholder="Enter document description"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="fileType">File Type</Label>
              <Select
                value={newDocument.fileType}
                onValueChange={(value) => setNewDocument({ ...newDocument, fileType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="doc">DOC</SelectItem>
                  <SelectItem value="ppt">PPT</SelectItem>
                  <SelectItem value="xls">XLS</SelectItem>
                  <SelectItem value="txt">TXT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="url">Document URL</Label>
              <Input
                id="url"
                value={newDocument.url}
                onChange={(e) => setNewDocument({ ...newDocument, url: e.target.value })}
                placeholder="Enter document URL"
              />
              <p className="text-xs text-slate-500">
                Enter a valid URL to the document. This could be a URL to a shared drive, cloud storage, etc.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUploading(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploadMutation.isPending || !newDocument.title || !newDocument.url}
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
