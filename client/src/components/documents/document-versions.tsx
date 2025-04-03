import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { DocumentVersion } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileDiff, History, CheckCircle } from "lucide-react";

interface DocumentVersionsProps {
  documentId: number;
  currentVersionId: number | null;
}

export function DocumentVersions({ documentId, currentVersionId }: DocumentVersionsProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: [`/api/documents/${documentId}/versions`],
    enabled: !!documentId,
  });

  const setCurrentVersionMutation = useMutation({
    mutationFn: async (versionId: number) => {
      const res = await apiRequest(
        "PATCH", 
        `/api/protected/documents/${documentId}/current-version/${versionId}`
      );
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Version updated",
        description: "The document has been updated to the selected version.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/documents`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update version",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatDate = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileDiff className="h-5 w-5 text-muted-foreground" />
            Document Versions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-24 flex items-center justify-center">
            <div className="animate-pulse flex space-x-4">
              <div className="w-16 h-6 bg-gray-200 rounded"></div>
              <div className="flex-1 space-y-3">
                <div className="h-2 bg-gray-200 rounded"></div>
                <div className="h-2 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileDiff className="h-5 w-5 text-muted-foreground" />
            Document Versions
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Collapse" : "Expand"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {versions.length === 0 ? (
          <div className="text-center text-muted-foreground py-6">
            <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No previous versions found</p>
          </div>
        ) : isExpanded ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {versions.map((version: DocumentVersion) => (
                <TableRow key={version.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {version.id === currentVersionId && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {version.versionNumber}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDate(version.changeDate)}
                  </TableCell>
                  <TableCell>
                    {version.changeDescription || "No description"}
                  </TableCell>
                  <TableCell>
                    {version.fileSize ? `${Math.round(version.fileSize / 1024)} KB` : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    {version.id !== currentVersionId ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentVersionMutation.mutate(version.id)}
                        disabled={setCurrentVersionMutation.isPending}
                      >
                        Set as Current
                      </Button>
                    ) : (
                      <Badge variant="outline">Current</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Latest version:</span>
              <span className="font-medium">
                {versions.length > 0
                  ? versions.find((v: DocumentVersion) => v.id === currentVersionId)?.versionNumber || versions[0].versionNumber
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total versions:</span>
              <span className="font-medium">{versions.length}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Last updated:</span>
              <span className="font-medium">
                {versions.length > 0
                  ? formatDate(versions[0].changeDate)
                  : "N/A"}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}