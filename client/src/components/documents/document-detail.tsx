import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Download, 
  ExternalLink, 
  FilesIcon, 
  Calendar,
  User,
  Tag,
  FileCog
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DocumentVersions } from "./document-versions";
import { DocumentVersionUpload } from "./document-version-upload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Document, DocumentVersion } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface DocumentDetailDialogProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload?: (document: Document) => void;
  onAnalyze?: (document: Document) => void;
}

export function DocumentDetailDialog({ 
  document, 
  open, 
  onOpenChange, 
  onDownload, 
  onAnalyze 
}: DocumentDetailDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: documentVersions = [] } = useQuery<DocumentVersion[]>({
    queryKey: [`/api/documents/${document?.id}/versions`],
    enabled: !!document && open,
  });

  if (!document) return null;

  const handleDownload = () => {
    if (onDownload) {
      onDownload(document);
    } else {
      // Default download behavior
      toast({
        title: "Download started",
        description: `Downloading ${document.fileName}...`
      });
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'Unknown';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getFileIcon = () => {
    const fileType = document.fileType || document.fileName?.split('.').pop()?.toLowerCase();
    
    switch (fileType) {
      case 'pdf':
        return <FileText className="h-16 w-16 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-16 w-16 text-blue-500" />;
      case 'xls':
      case 'xlsx':
      case 'csv':
        return <FileText className="h-16 w-16 text-green-500" />;
      case 'mp4':
      case 'mov':
      case 'avi':
      case 'webm':
        return <FileText className="h-16 w-16 text-purple-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileText className="h-16 w-16 text-orange-500" />;
      default:
        return <FileText className="h-16 w-16 text-gray-500" />;
    }
  };

  const getTimeAgo = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getFileIcon()}
            <div>
              <DialogTitle className="text-xl">{document.fileName}</DialogTitle>
              <DialogDescription>
                {document.description || "No description provided"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="versions">Versions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Document Information
                  </h3>
                  <div className="bg-muted/40 rounded-md p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">File Type:</span>
                      <span className="text-sm font-medium">
                        {document.fileType?.toUpperCase() || document.fileName?.split('.').pop()?.toUpperCase() || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">File Size:</span>
                      <span className="text-sm font-medium">{formatFileSize(document.fileSize || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Uploaded:</span>
                      <span className="text-sm font-medium" title={formatDate(document.createdAt)}>
                        {getTimeAgo(document.createdAt)}
                      </span>
                    </div>
                    {document.updatedAt && document.updatedAt.getTime() !== document.createdAt.getTime() && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Last Modified:</span>
                        <span className="text-sm font-medium" title={formatDate(document.updatedAt)}>
                          {getTimeAgo(document.updatedAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <User className="h-4 w-4" /> Ownership
                  </h3>
                  <div className="bg-muted/40 rounded-md p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Uploaded By:</span>
                      <span className="text-sm font-medium">User ID: {document.uploadedById}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <Tag className="h-4 w-4" /> Metadata
                  </h3>
                  <div className="bg-muted/40 rounded-md p-4">
                    {document.tags && document.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {document.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No tags available</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    <FileCog className="h-4 w-4" /> Analysis
                  </h3>
                  <div className="bg-muted/40 rounded-md p-4">
                    {document.documentAnalysisId ? (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Analysis ID:</span>
                          <span className="text-sm font-medium">{document.documentAnalysisId}</span>
                        </div>
                        <Button variant="outline" size="sm" className="w-full" onClick={() => onAnalyze && onAnalyze(document)}>
                          View Analysis
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground italic">No analysis performed</p>
                        {onAnalyze && (
                          <Button variant="outline" size="sm" className="w-full" onClick={() => onAnalyze(document)}>
                            Analyze Document
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <div className="space-x-2">
                {document.url && (
                  <Button variant="outline" onClick={() => window.open(document.url, '_blank')}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Original
                  </Button>
                )}
                <Button onClick={handleDownload}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="versions" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <FilesIcon className="h-5 w-5" />
                Document Versions
              </h3>
              <DocumentVersionUpload documentId={document.id} documentTitle={document.fileName || 'document'} />
            </div>

            <DocumentVersions 
              documentId={document.id}
              currentVersionId={document.currentVersionId || null}
            />

            <Separator />

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button variant="outline" onClick={() => setActiveTab("overview")}>
                Back to Overview
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}