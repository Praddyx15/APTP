import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Card,
  Button,
  Input,
  Badge,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui';
import { Search, FileText, Trash2, Eye, SortAsc, SortDesc, ArrowDownUp } from 'lucide-react';
import DocumentService from '@/services/document-service';
import { useToast } from '@/hooks/use-toast';
import { DocumentProcessingStatus } from '@shared/document-types';

export interface DocumentListProps {
  onViewDocument?: (documentId: number) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({ onViewDocument }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<number | null>(null);
  
  const { toast } = useToast();

  // Fetch documents
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['/api/documents', { page, pageSize, searchTerm, sortBy, sortOrder }],
    queryFn: () => DocumentService.getAllDocuments({
      page,
      limit: pageSize,
      search: searchTerm,
      sortBy,
      sortOrder
    })
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => DocumentService.deleteDocument(id),
    onSuccess: () => {
      toast({
        title: 'Document deleted',
        description: 'The document has been successfully deleted.',
        variant: 'default',
      });
      setDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
      setDeleteDialogOpen(false);
    }
  });

  // Handle column sorting
  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Get sort icon
  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowDownUp className="ml-1 h-4 w-4" />;
    }
    return sortOrder === 'asc' ? 
      <SortAsc className="ml-1 h-4 w-4" /> : 
      <SortDesc className="ml-1 h-4 w-4" />;
  };

  // Handle document deletion
  const confirmDelete = (id: number) => {
    setDocumentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (documentToDelete) {
      deleteMutation.mutate(documentToDelete);
    }
  };

  // Get status badge
  const getStatusBadge = (status: DocumentProcessingStatus) => {
    switch (status) {
      case DocumentProcessingStatus.pending:
        return <Badge variant="outline">Pending</Badge>;
      case DocumentProcessingStatus.processing:
        return <Badge variant="secondary">Processing</Badge>;
      case DocumentProcessingStatus.complete:
        return <Badge variant="default">Complete</Badge>;
      case DocumentProcessingStatus.error:
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Documents</h3>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card>
        {isLoading ? (
          <div className="p-8 text-center">Loading documents...</div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500">
            Error loading documents: {error.message}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%] cursor-pointer" onClick={() => toggleSort('title')}>
                  <div className="flex items-center">
                    Document {getSortIcon('title')}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('fileSize')}>
                  <div className="flex items-center">
                    Size {getSortIcon('fileSize')}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('createdAt')}>
                  <div className="flex items-center">
                    Uploaded {getSortIcon('createdAt')}
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    No documents found. Upload a document to get started.
                  </TableCell>
                </TableRow>
              ) : (
                data?.documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="font-medium">{doc.title}</div>
                        {doc.description && (
                          <div className="text-sm text-muted-foreground truncate max-w-md">
                            {doc.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB
                    </TableCell>
                    <TableCell>
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(doc.processingStatus)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewDocument && onViewDocument(doc.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => confirmDelete(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {data && data.total > pageSize && (
          <div className="flex items-center justify-between px-4 py-2 border-t">
            <div>
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, data.total)} of {data.total} documents
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page * pageSize >= data.total}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DocumentList;
