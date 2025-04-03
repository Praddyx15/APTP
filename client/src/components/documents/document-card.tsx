import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Download, 
  File, 
  FileText, 
  FileSpreadsheet, 
  FileVideo, 
  FileImage, 
  FileCog, 
  ExternalLink, 
  Eye, 
  Trash2, 
  MoreHorizontal
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Document } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface DocumentCardProps {
  document: Document;
  onView?: (document: Document) => void;
  onDelete?: (document: Document) => void;
  onAnalyze?: (document: Document) => void;
}

export default function DocumentCard({ document, onView, onDelete, onAnalyze }: DocumentCardProps) {
  const { toast } = useToast();
  
  const getFileIcon = () => {
    const fileType = document.fileType || document.fileName.split('.').pop()?.toLowerCase();
    
    switch (fileType) {
      case 'pdf':
        return <FileText className="h-12 w-12 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-12 w-12 text-blue-500" />;
      case 'xls':
      case 'xlsx':
      case 'csv':
        return <FileSpreadsheet className="h-12 w-12 text-green-500" />;
      case 'mp4':
      case 'mov':
      case 'avi':
      case 'webm':
        return <FileVideo className="h-12 w-12 text-purple-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileImage className="h-12 w-12 text-orange-500" />;
      default:
        return <File className="h-12 w-12 text-gray-500" />;
    }
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
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  const handleDownload = () => {
    // In a real app, trigger actual download from document.fileUrl
    toast({
      title: "Download started",
      description: `Downloading ${document.fileName}...`
    });
  };
  
  return (
    <Card className="overflow-hidden h-full flex flex-col">
      <CardHeader className="p-4 pb-0">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base truncate max-w-[85%]" title={document.fileName}>
            {document.fileName}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-mt-1">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(document)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
              {onAnalyze && (
                <DropdownMenuItem onClick={() => onAnalyze(document)}>
                  <FileCog className="mr-2 h-4 w-4" />
                  Analyze
                </DropdownMenuItem>
              )}
              {document.externalUrl && (
                <DropdownMenuItem onClick={() => window.open(document.externalUrl, '_blank')}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Original
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(document)}
                  className="text-red-500 focus:text-red-500"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="p-4 pt-2 flex-1">
        <div className="flex justify-center py-6">
          {getFileIcon()}
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Type:</span>
            <Badge variant="outline">
              {document.fileType?.toUpperCase() || document.fileName.split('.').pop()?.toUpperCase() || 'Unknown'}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Size:</span>
            <span>{formatFileSize(document.fileSize || 0)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Uploaded:</span>
            <span>{formatDate(document.uploadedAt)}</span>
          </div>
          {document.tags && document.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {document.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 grid grid-cols-2 gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleDownload} className="w-full">
                <Download className="mr-1 h-4 w-4" />
                Download
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Download document</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {onView && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="secondary" size="sm" onClick={() => onView(document)} className="w-full">
                  <Eye className="mr-1 h-4 w-4" />
                  View
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View document</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardFooter>
    </Card>
  );
}