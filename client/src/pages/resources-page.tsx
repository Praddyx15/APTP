import { useState } from "react";
import { Helmet } from "react-helmet";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import DashboardContainer from "@/components/dashboard-container";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  Book,
  BookOpen,
  ChevronRight,
  CloudUpload,
  Download,
  FileText,
  Filter,
  LayoutGrid,
  List,
  MoreVertical,
  Plus,
  Search,
  Share2,
  Star,
  Tag,
  Trash2,
  Video,
} from "lucide-react";

// Mock resource data types
interface Resource {
  id: number;
  title: string;
  description: string;
  type: "document" | "video" | "reference" | "training";
  tags: string[];
  createdBy: {
    id: number;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  status: "draft" | "published" | "archived";
  downloadCount: number;
  averageRating: number;
  fileSize?: number;
  fileType?: string;
  thumbnailUrl?: string;
  url?: string;
}

const ResourcesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("my-resources");
  const [resourceType, setResourceType] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    type: "document",
    tags: "",
    file: null as File | null,
  });

  // Fetch resources
  const { data: resources = [], isLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources", activeTab, resourceType],
    queryFn: async () => {
      // Mock implementation
      const mockResources: Resource[] = [
        {
          id: 1,
          title: "B737 Systems Manual",
          description: "Comprehensive systems manual for Boeing 737 aircraft",
          type: "document",
          tags: ["B737", "systems", "technical"],
          createdBy: {
            id: 1,
            name: "John Doe"
          },
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          status: "published",
          downloadCount: 156,
          averageRating: 4.7,
          fileSize: 15400000,
          fileType: "pdf",
          url: "/resources/b737-systems-manual.pdf"
        },
        {
          id: 2,
          title: "Cockpit Procedures Training Video",
          description: "Video tutorial covering standard cockpit procedures",
          type: "video",
          tags: ["procedures", "cockpit", "training"],
          createdBy: {
            id: 2,
            name: "Sarah Johnson"
          },
          createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          status: "published",
          downloadCount: 89,
          averageRating: 4.2,
          thumbnailUrl: "/resources/cockpit-procedures-thumbnail.jpg",
          url: "/resources/cockpit-procedures.mp4"
        },
        {
          id: 3,
          title: "EASA FCL Regulations Reference",
          description: "Latest EASA Flight Crew Licensing regulations reference guide",
          type: "reference",
          tags: ["EASA", "regulations", "licensing"],
          createdBy: {
            id: 1,
            name: "John Doe"
          },
          createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          status: "published",
          downloadCount: 212,
          averageRating: 4.9,
          fileSize: 8200000,
          fileType: "pdf",
          url: "/resources/easa-fcl-reference.pdf"
        },
        {
          id: 4,
          title: "Emergency Procedures Checklist",
          description: "Quick reference emergency procedures for A320 aircraft",
          type: "document",
          tags: ["A320", "emergency", "procedures", "checklist"],
          createdBy: {
            id: 3,
            name: "Mike Smith"
          },
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: "published",
          downloadCount: 76,
          averageRating: 4.5,
          fileSize: 3100000,
          fileType: "pdf",
          url: "/resources/a320-emergency-checklist.pdf"
        },
        {
          id: 5,
          title: "Weather Radar Interpretation Training",
          description: "Comprehensive training module on interpreting weather radar data",
          type: "training",
          tags: ["weather", "radar", "meteorology", "training"],
          createdBy: {
            id: 4,
            name: "Emma Watson"
          },
          createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: "published",
          downloadCount: 134,
          averageRating: 4.8,
          url: "/resources/weather-radar-training/"
        }
      ];

      // Filter resources based on activeTab
      let filtered = [...mockResources];
      
      // Apply tab filters
      if (activeTab === 'my-resources') {
        filtered = filtered.filter(r => r.createdBy.id === user?.id);
      }
      
      // Apply type filter
      if (resourceType) {
        filtered = filtered.filter(r => r.type === resourceType);
      }
      
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(r => 
          r.title.toLowerCase().includes(query) || 
          r.description.toLowerCase().includes(query) ||
          r.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      return filtered;
    },
  });

  // Upload resource mutation
  const uploadResourceMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // In a real implementation, this would call the API
      // return apiRequest("POST", "/api/resources", formData);
      return { success: true, id: Math.floor(Math.random() * 1000) };
    },
    onSuccess: () => {
      toast({
        title: "Resource uploaded successfully",
        description: "Your resource has been uploaded and is now available.",
      });
      setIsUploadDialogOpen(false);
      setUploadForm({
        title: "",
        description: "",
        type: "document",
        tags: "",
        file: null,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to upload resource",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete resource mutation
  const deleteResourceMutation = useMutation({
    mutationFn: async (resourceId: number) => {
      // In a real implementation, this would call the API
      // return apiRequest("DELETE", `/api/resources/${resourceId}`);
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Resource deleted",
        description: "The resource has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete resource",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Share resource mutation
  const shareResourceMutation = useMutation({
    mutationFn: async ({ resourceId, emails, message, notifyUsers }: { 
      resourceId: number; 
      emails: string[]; 
      message?: string;
      notifyUsers?: boolean;
    }) => {
      return apiRequest("POST", `/api/resources/${resourceId}/share`, { 
        emails, 
        message, 
        notifyUsers 
      });
    },
    onSuccess: () => {
      toast({
        title: "Resource shared",
        description: "The resource has been shared successfully.",
      });
      setIsShareDialogOpen(false);
      // Refresh the resource list to show shared status
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to share resource",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle resource upload
  const handleUpload = () => {
    if (!uploadForm.title || !uploadForm.type) {
      toast({
        title: "Missing information",
        description: "Please provide a title and select a resource type.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("title", uploadForm.title);
    formData.append("description", uploadForm.description);
    formData.append("type", uploadForm.type);
    formData.append("tags", uploadForm.tags);
    if (uploadForm.file) {
      formData.append("file", uploadForm.file);
    }

    uploadResourceMutation.mutate(formData);
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadForm({
        ...uploadForm,
        file: e.target.files[0],
      });
    }
  };

  // Handle sharing resource
  const handleShareResource = (emails: string, message?: string, notifyUsers: boolean = true) => {
    if (!selectedResource) return;
    
    const emailList = emails.split(",").map(email => email.trim()).filter(email => email);
    
    if (emailList.length === 0) {
      toast({
        title: "Missing information",
        description: "Please provide at least one email address.",
        variant: "destructive",
      });
      return;
    }

    shareResourceMutation.mutate({
      resourceId: selectedResource.id,
      emails: emailList,
      message,
      notifyUsers
    });
  };

  // Get resource type icon
  const getResourceTypeIcon = (type: string) => {
    switch (type) {
      case "document":
        return <FileText className="h-5 w-5" />;
      case "video":
        return <Video className="h-5 w-5" />;
      case "reference":
        return <BookOpen className="h-5 w-5" />;
      case "training":
        return <Book className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <DashboardContainer>
      <Helmet>
        <title>Resource Management | Advanced Pilot Training Platform</title>
      </Helmet>
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Resource Management</h1>
              <p className="text-muted-foreground mt-1">
                Manage and share training resources for your organization
              </p>
            </div>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <CloudUpload className="h-4 w-4" />
                  Upload Resource
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Upload New Resource</DialogTitle>
                  <DialogDescription>
                    Add a new training resource to share with your team
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                      placeholder="Enter resource title"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                      placeholder="Briefly describe this resource"
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type">Resource Type</Label>
                    <Select
                      value={uploadForm.type}
                      onValueChange={(value) => setUploadForm({ ...uploadForm, type: value })}
                    >
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Select resource type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="reference">Reference</SelectItem>
                        <SelectItem value="training">Training Module</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      value={uploadForm.tags}
                      onChange={(e) => setUploadForm({ ...uploadForm, tags: e.target.value })}
                      placeholder="Comma-separated tags (e.g., B737, procedures, training)"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="file">File</Label>
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum file size: 50MB. Supported formats: PDF, DOCX, MP4, PPTX
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="submit" 
                    onClick={handleUpload} 
                    disabled={uploadResourceMutation.isPending}
                  >
                    {uploadResourceMutation.isPending ? "Uploading..." : "Upload Resource"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tabs and Filters */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full sm:w-auto"
            >
              <TabsList>
                <TabsTrigger value="all-resources">All Resources</TabsTrigger>
                <TabsTrigger value="my-resources">My Resources</TabsTrigger>
                <TabsTrigger value="shared-with-me">Shared With Me</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search resources..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select
                value={resourceType || ""}
                onValueChange={(value) => setResourceType(value || null)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="document">Documents</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                  <SelectItem value="reference">References</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === "grid" ? "ghost" : "ghost"}
                  size="icon"
                  className={viewMode === "grid" ? "bg-muted" : ""}
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "ghost" : "ghost"}
                  size="icon"
                  className={viewMode === "list" ? "bg-muted" : ""}
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Resources Display */}
          {isLoading ? (
            <div className="flex justify-center items-center h-60">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 border border-dashed rounded-lg">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No resources found</h3>
              <p className="text-muted-foreground mb-4 text-center max-w-md">
                {activeTab === "my-resources"
                  ? "You haven't uploaded any resources yet. Click the 'Upload Resource' button to get started."
                  : activeTab === "shared-with-me"
                  ? "No resources have been shared with you yet."
                  : "No resources match your current filter settings."}
              </p>
              {activeTab === "my-resources" && (
                <Button onClick={() => setIsUploadDialogOpen(true)}>
                  <CloudUpload className="h-4 w-4 mr-2" />
                  Upload your first resource
                </Button>
              )}
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col space-y-4"}>
              {resources.map((resource) => (
                viewMode === "grid" ? (
                  <Card key={resource.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-md 
                            ${resource.type === "document" ? "bg-blue-100 text-blue-700" : 
                              resource.type === "video" ? "bg-red-100 text-red-700" : 
                              resource.type === "reference" ? "bg-purple-100 text-purple-700" : 
                              "bg-green-100 text-green-700"}`}
                          >
                            {getResourceTypeIcon(resource.type)}
                          </div>
                          <div>
                            <Badge variant="outline" className="font-normal">
                              {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
                            </Badge>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedResource(resource);
                                setIsShareDialogOpen(true);
                              }}
                            >
                              <Share2 className="h-4 w-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            {resource.createdBy.id === user?.id && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    if (window.confirm("Are you sure you want to delete this resource?")) {
                                      deleteResourceMutation.mutate(resource.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardTitle className="text-lg mt-3">{resource.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {resource.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex flex-wrap gap-1 mb-2">
                        {resource.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0 flex justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        <span>{resource.averageRating.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Download className="h-3.5 w-3.5" />
                        <span>{resource.downloadCount}</span>
                      </div>
                      <div>{formatDate(resource.updatedAt)}</div>
                    </CardFooter>
                  </Card>
                ) : (
                  <div 
                    key={resource.id} 
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className={`p-2 rounded-md 
                      ${resource.type === "document" ? "bg-blue-100 text-blue-700" : 
                        resource.type === "video" ? "bg-red-100 text-red-700" : 
                        resource.type === "reference" ? "bg-purple-100 text-purple-700" : 
                        "bg-green-100 text-green-700"}`}
                    >
                      {getResourceTypeIcon(resource.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                        <h3 className="font-medium text-md truncate">{resource.title}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs font-normal">
                            {resource.type.charAt(0).toUpperCase() + resource.type.slice(1)}
                          </Badge>
                          {resource.fileSize && (
                            <span className="text-xs">({formatFileSize(resource.fileSize)})</span>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {resource.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {resource.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground min-w-[120px]">
                      <div>Updated {formatDate(resource.updatedAt)}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400 mr-1" />
                          {resource.averageRating.toFixed(1)}
                        </div>
                        <div className="flex items-center">
                          <Download className="h-3.5 w-3.5 mr-1" />
                          {resource.downloadCount}
                        </div>
                      </div>
                    </div>
                    <div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem 
                            onClick={() => {
                              setSelectedResource(resource);
                              setIsShareDialogOpen(true);
                            }}
                          >
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          {resource.createdBy.id === user?.id && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  if (window.confirm("Are you sure you want to delete this resource?")) {
                                    deleteResourceMutation.mutate(resource.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Share Resource</DialogTitle>
            <DialogDescription>
              Share "{selectedResource?.title}" with other users.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="emails">Email Addresses</Label>
              <Textarea
                id="emails"
                placeholder="Enter email addresses (comma-separated)"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Recipients will receive a link to access this resource.
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="shareMessage">Optional Message</Label>
              <Textarea
                id="shareMessage"
                placeholder="Add a personalized message..."
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                A personal message to include with the sharing notification.
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch id="notifyUsers" defaultChecked />
              <Label htmlFor="notifyUsers" className="text-sm">Send email notification to recipients</Label>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={() => {
                const emailInput = document.getElementById("emails") as HTMLTextAreaElement;
                const messageInput = document.getElementById("shareMessage") as HTMLTextAreaElement;
                const notifySwitch = document.getElementById("notifyUsers") as HTMLInputElement;
                
                handleShareResource(
                  emailInput.value,
                  messageInput.value,
                  notifySwitch.checked
                );
              }}
              disabled={shareResourceMutation.isPending}
            >
              {shareResourceMutation.isPending ? "Sharing..." : "Share Resource"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardContainer>
  );
};

export default ResourcesPage;