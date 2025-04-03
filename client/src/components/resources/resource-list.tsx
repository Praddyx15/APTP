import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Airplay, Search, PlusCircle, Edit, Trash2, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Resource } from "@shared/schema";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

interface ResourcesListProps {
  searchQuery: string;
}

export default function ResourcesList({ searchQuery }: ResourcesListProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);

  // Fetch resources
  const { data: resources = [], isLoading } = useQuery<Resource[]>({
    queryKey: ["/api/resources"],
  });

  // Filter resources based on search query
  const filteredResources = useMemo(() => {
    if (!resources) return [];
    
    return resources.filter(resource => 
      resource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [resources, searchQuery]);

  // Resource form schema
  const resourceSchema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(["simulator", "classroom"]),
    location: z.string().min(1, "Location is required"),
    capacity: z.number().min(1, "Capacity must be at least 1"),
  });

  type ResourceFormValues = z.infer<typeof resourceSchema>;

  // Form initialization
  const form = useForm<ResourceFormValues>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      name: "",
      type: "simulator",
      location: "",
      capacity: 1,
    },
  });

  // Create resource mutation
  const createResourceMutation = useMutation({
    mutationFn: async (data: ResourceFormValues) => {
      const res = await apiRequest("POST", "/api/protected/resources", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Resource created",
        description: "The resource has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create resource",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update resource mutation
  const updateResourceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ResourceFormValues }) => {
      const res = await apiRequest("PUT", `/api/protected/resources/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      setIsDialogOpen(false);
      setEditingResource(null);
      form.reset();
      toast({
        title: "Resource updated",
        description: "The resource has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update resource",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete resource mutation
  const deleteResourceMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/protected/resources/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/resources"] });
      toast({
        title: "Resource deleted",
        description: "The resource has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete resource",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: ResourceFormValues) => {
    if (editingResource) {
      updateResourceMutation.mutate({ id: editingResource.id, data });
    } else {
      createResourceMutation.mutate(data);
    }
  };

  // Handle edit resource
  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    form.reset({
      name: resource.name,
      type: resource.type,
      location: resource.location,
      capacity: resource.capacity,
    });
    setIsDialogOpen(true);
  };

  // Handle delete resource
  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this resource?")) {
      deleteResourceMutation.mutate(id);
    }
  };

  // Define columns for resources table
  const columns: ColumnDef<Resource, any>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const resource = row.original;
        const isSimulator = resource.type === "simulator";
        
        return (
          <div className="flex items-center">
            <div className={`p-2 rounded-md ${isSimulator ? "bg-purple-100" : "bg-blue-100"} mr-3`}>
              {isSimulator ? (
                <Airplay className={`h-5 w-5 ${isSimulator ? "text-purple-600" : "text-blue-600"}`} />
              ) : (
                <Users className={`h-5 w-5 ${isSimulator ? "text-purple-600" : "text-blue-600"}`} />
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{resource.name}</p>
              <p className="text-xs text-slate-500 capitalize">{resource.type}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => (
        <div className="flex items-center">
          <MapPin className="h-4 w-4 text-slate-400 mr-2" />
          <span className="text-sm text-slate-800">{row.original.location}</span>
        </div>
      ),
    },
    {
      accessorKey: "capacity",
      header: "Capacity",
      cell: ({ row }) => (
        <div className="flex items-center">
          <Users className="h-4 w-4 text-slate-400 mr-2" />
          <span className="text-sm text-slate-800">{row.original.capacity} {row.original.capacity === 1 ? "person" : "people"}</span>
        </div>
      ),
    },
    {
      accessorKey: "availability",
      header: "Availability",
      cell: () => {
        // This would be calculated from booked sessions
        const isAvailable = Math.random() > 0.3; // Mock data for UI demonstration
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isAvailable ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {isAvailable ? "Available" : "In Use"}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        return (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-blue-500 p-0 h-8 w-8"
              onClick={() => handleEdit(row.original)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-red-500 p-0 h-8 w-8"
              onClick={() => handleDelete(row.original.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Resources</h1>
          <p className="text-slate-500">Manage simulators, classrooms, and other training resources</p>
        </div>
        <Button
          className="text-sm bg-blue-500 hover:bg-blue-600 text-white"
          onClick={() => {
            setEditingResource(null);
            form.reset({
              name: "",
              type: "simulator",
              location: "",
              capacity: 1,
            });
            setIsDialogOpen(true);
          }}
        >
          <PlusCircle className="h-4 w-4 mr-1.5" />
          Add Resource
        </Button>
      </div>
      
      {/* Resource stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="bg-purple-100 p-3 rounded-md">
              <Airplay className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Simulators</p>
              <p className="text-2xl font-semibold text-slate-800">
                {resources.filter(r => r.type === "simulator").length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-md">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Classrooms</p>
              <p className="text-2xl font-semibold text-slate-800">
                {resources.filter(r => r.type === "classroom").length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Total Capacity</p>
              <p className="text-2xl font-semibold text-slate-800">
                {resources.reduce((sum, resource) => sum + resource.capacity, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Resources table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          filteredResources.length > 0 ? (
            <DataTable
              columns={columns}
              data={filteredResources}
              pageSize={10}
            />
          ) : (
            <div className="p-8 text-center">
              <Airplay className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">No resources found</h3>
              <p className="text-slate-500 mb-4">
                {searchQuery 
                  ? "No resources match your search criteria. Try different keywords."
                  : "There are no resources available. Add your first resource."}
              </p>
              <Button
                className="text-sm bg-blue-500 hover:bg-blue-600 text-white"
                onClick={() => {
                  setEditingResource(null);
                  form.reset();
                  setIsDialogOpen(true);
                }}
              >
                <PlusCircle className="h-4 w-4 mr-1.5" />
                Add Resource
              </Button>
            </div>
          )
        )}
      </div>
      
      {/* Create/Edit Resource Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingResource ? "Edit Resource" : "Add New Resource"}</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Resource Name</Label>
              <Controller
                name="name"
                control={form.control}
                render={({ field }) => (
                  <Input
                    id="name"
                    placeholder="Enter resource name"
                    {...field}
                  />
                )}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="type">Resource Type</Label>
              <Controller
                name="type"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simulator">Simulator</SelectItem>
                      <SelectItem value="classroom">Classroom</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.type && (
                <p className="text-sm text-red-500">{form.formState.errors.type.message}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Controller
                name="location"
                control={form.control}
                render={({ field }) => (
                  <Input
                    id="location"
                    placeholder="Enter resource location"
                    {...field}
                  />
                )}
              />
              {form.formState.errors.location && (
                <p className="text-sm text-red-500">{form.formState.errors.location.message}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Controller
                name="capacity"
                control={form.control}
                render={({ field }) => (
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    placeholder="Enter capacity"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                )}
              />
              {form.formState.errors.capacity && (
                <p className="text-sm text-red-500">{form.formState.errors.capacity.message}</p>
              )}
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingResource(null);
                  form.reset();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createResourceMutation.isPending || updateResourceMutation.isPending}
              >
                {createResourceMutation.isPending || updateResourceMutation.isPending
                  ? "Saving..."
                  : editingResource
                  ? "Update Resource"
                  : "Add Resource"
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
