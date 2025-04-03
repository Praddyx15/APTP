import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";

interface DocumentVersionUploadProps {
  documentId: number;
  documentTitle: string;
}

export function DocumentVersionUpload({ documentId, documentTitle }: DocumentVersionUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm({
    defaultValues: {
      versionNumber: "",
      changeDescription: "",
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await fetch(`/api/protected/documents/${documentId}/versions`, {
        method: "POST",
        body: data,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload version");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Version uploaded",
        description: "New document version has been successfully uploaded.",
      });
      form.reset();
      setFile(null);
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}/versions`] });
      queryClient.invalidateQueries({ queryKey: [`/api/documents/${documentId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/documents`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: any) => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to upload a version",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("versionNumber", values.versionNumber);
    formData.append("changeDescription", values.changeDescription);
    formData.append("changedById", user.id.toString());

    uploadMutation.mutate(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" />
          Upload New Version
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload New Version</DialogTitle>
          <DialogDescription>
            Upload a new version of "{documentTitle}". This will create a new version record and update the current version.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="versionNumber"
              rules={{ required: "Version number is required" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Version Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. v1.2.0" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter a version number for this document version
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="changeDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description of Changes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what changed in this version"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>File</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.xls,.pptx,.ppt"
                />
              </FormControl>
              {file && (
                <FormDescription>
                  Selected file: {file.name} ({Math.round(file.size / 1024)} KB)
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={uploadMutation.isPending || !file}
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload Version"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}