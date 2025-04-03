import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Edit, Trash2, PlusCircle, ChevronDown, ChevronUp, Video, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrainingProgram, Module, Lesson } from "@shared/schema";
import { useApp } from "@/contexts/app-context";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

interface ProgramDetailProps {
  programId: number;
}

export default function ProgramDetail({ programId }: ProgramDetailProps) {
  const { clearSelectedProgram } = useApp();
  const { toast } = useToast();
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [isAddingLesson, setIsAddingLesson] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);

  // Fetch program with modules and lessons
  const { data: program, isLoading, error, refetch } = useQuery<TrainingProgram & { modules: (Module & { lessons: Lesson[] })[] }>({
    queryKey: ["/api/programs", programId],
  });

  // Module form schema
  const moduleSchema = z.object({
    name: z.string().min(1, "Module name is required"),
    programId: z.number()
  });

  // Lesson form schema
  const lessonSchema = z.object({
    name: z.string().min(1, "Lesson name is required"),
    moduleId: z.number(),
    type: z.enum(["video", "document", "interactive"]),
    content: z.string().min(1, "Content URL is required")
  });

  // Forms
  const moduleForm = useForm<z.infer<typeof moduleSchema>>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      name: "",
      programId: programId
    }
  });

  const lessonForm = useForm<z.infer<typeof lessonSchema>>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      name: "",
      moduleId: 0,
      type: "video",
      content: ""
    }
  });

  // Expand all modules by default when data is loaded
  useEffect(() => {
    if (program && program.modules) {
      const moduleIds = new Set(program.modules.map(module => module.id));
      setExpandedModules(moduleIds);
    }
  }, [program]);

  const toggleModule = (moduleId: number) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  // Add Module mutation
  const addModuleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof moduleSchema>) => {
      const res = await apiRequest("POST", "/api/protected/modules", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs", programId] });
      setIsAddingModule(false);
      moduleForm.reset({ name: "", programId: programId });
      toast({
        title: "Module added",
        description: "The module has been added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add module",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add Lesson mutation
  const addLessonMutation = useMutation({
    mutationFn: async (data: z.infer<typeof lessonSchema>) => {
      const res = await apiRequest("POST", "/api/protected/lessons", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs", programId] });
      setIsAddingLesson(false);
      setSelectedModuleId(null);
      lessonForm.reset({ name: "", moduleId: 0, type: "video", content: "" });
      toast({
        title: "Lesson added",
        description: "The lesson has been added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add lesson",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle add module form submission
  const onAddModule = (data: z.infer<typeof moduleSchema>) => {
    addModuleMutation.mutate(data);
  };

  // Handle add lesson form submission
  const onAddLesson = (data: z.infer<typeof lessonSchema>) => {
    addLessonMutation.mutate(data);
  };

  // Handle opening lesson form
  const handleAddLesson = (moduleId: number) => {
    setSelectedModuleId(moduleId);
    lessonForm.reset({ name: "", moduleId: moduleId, type: "video", content: "" });
    setIsAddingLesson(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> Failed to load program details.</span>
      </div>
    );
  }

  return (
    <div className="mt-2 bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-2">
            <button
              className="text-slate-500 hover:text-slate-700"
              onClick={clearSelectedProgram}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-800">{program.name}</h2>
          </div>
          <p className="text-slate-500 mt-1">{program.description}</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" className="text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700">
            <Edit className="h-4 w-4 mr-1.5" />
            Edit Program
          </Button>
          <Button 
            className="text-sm bg-blue-500 hover:bg-blue-600 text-white"
            onClick={() => setIsAddingModule(true)}
          >
            <PlusCircle className="h-4 w-4 mr-1.5" />
            Add Module
          </Button>
        </div>
      </div>
      
      {/* Modules accordion */}
      <div className="space-y-4">
        {program.modules && program.modules.length > 0 ? (
          program.modules.map(module => (
            <div key={module.id} className="border border-slate-200 rounded-md overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 flex justify-between items-center">
                <h3 className="font-medium text-slate-800">{module.name}</h3>
                <div className="flex items-center gap-2">
                  <button className="text-slate-500 hover:text-blue-500">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="text-slate-500 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button 
                    className="text-slate-500 hover:text-slate-700"
                    onClick={() => toggleModule(module.id)}
                  >
                    {expandedModules.has(module.id) ? 
                      <ChevronUp className="h-5 w-5" /> : 
                      <ChevronDown className="h-5 w-5" />
                    }
                  </button>
                </div>
              </div>
              
              {expandedModules.has(module.id) && (
                <div className="px-4 py-3">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-slate-700">Lessons</h4>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600"
                      onClick={() => handleAddLesson(module.id)}
                    >
                      <PlusCircle className="h-3 w-3 mr-1" />
                      Add Lesson
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {module.lessons && module.lessons.length > 0 ? (
                      module.lessons.map(lesson => {
                        // Determine icon based on lesson type
                        let Icon: any;
                        let iconColor: string;
                        if (lesson.type === 'video') {
                          Icon = Video;
                          iconColor = "text-blue-500";
                        } else if (lesson.type === 'document') {
                          Icon = FileText;
                          iconColor = "text-green-500";
                        } else {
                          Icon = () => (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                              <line x1="3" y1="9" x2="21" y2="9"></line>
                              <line x1="9" y1="21" x2="9" y2="9"></line>
                            </svg>
                          );
                          iconColor = "text-purple-500";
                        }
                        
                        return (
                          <div key={lesson.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-md">
                            <div className="flex items-center">
                              {Icon && typeof Icon === 'function' ? (
                                <Icon className={`h-4 w-4 ${iconColor} mr-2`} />
                              ) : (
                                <Icon />
                              )}
                              <span className="text-sm text-slate-700">{lesson.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-2 py-0.5 h-6"
                                onClick={() => window.open(lesson.content, '_blank')}
                              >
                                View
                              </Button>
                              <button className="text-slate-500 hover:text-blue-500">
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-slate-500 italic">No lessons available for this module.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-slate-50 rounded-md border border-dashed border-slate-200">
            <p className="text-slate-500 mb-2">No modules available for this program.</p>
            <Button 
              className="text-sm bg-blue-500 hover:bg-blue-600 text-white"
              onClick={() => setIsAddingModule(true)}
            >
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Add First Module
            </Button>
          </div>
        )}
      </div>

      {/* Add Module Dialog */}
      <Dialog open={isAddingModule} onOpenChange={setIsAddingModule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Module</DialogTitle>
          </DialogHeader>
          <form onSubmit={moduleForm.handleSubmit(onAddModule)} className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Module Name</Label>
              <Controller
                name="name"
                control={moduleForm.control}
                render={({ field }) => (
                  <Input
                    id="name"
                    placeholder="Enter module name"
                    {...field}
                  />
                )}
              />
              {moduleForm.formState.errors.name && (
                <p className="text-sm text-red-500">{moduleForm.formState.errors.name.message}</p>
              )}
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddingModule(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addModuleMutation.isPending}
              >
                {addModuleMutation.isPending ? "Adding..." : "Add Module"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Lesson Dialog */}
      <Dialog open={isAddingLesson} onOpenChange={setIsAddingLesson}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Lesson</DialogTitle>
          </DialogHeader>
          <form onSubmit={lessonForm.handleSubmit(onAddLesson)} className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="lessonName">Lesson Name</Label>
              <Controller
                name="name"
                control={lessonForm.control}
                render={({ field }) => (
                  <Input
                    id="lessonName"
                    placeholder="Enter lesson name"
                    {...field}
                  />
                )}
              />
              {lessonForm.formState.errors.name && (
                <p className="text-sm text-red-500">{lessonForm.formState.errors.name.message}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="lessonType">Lesson Type</Label>
              <Controller
                name="type"
                control={lessonForm.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="interactive">Interactive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {lessonForm.formState.errors.type && (
                <p className="text-sm text-red-500">{lessonForm.formState.errors.type.message}</p>
              )}
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="lessonContent">Content URL</Label>
              <Controller
                name="content"
                control={lessonForm.control}
                render={({ field }) => (
                  <Input
                    id="lessonContent"
                    placeholder="Enter content URL"
                    {...field}
                  />
                )}
              />
              <p className="text-xs text-slate-500">
                Enter a valid URL to the lesson content (video link, document URL, etc.)
              </p>
              {lessonForm.formState.errors.content && (
                <p className="text-sm text-red-500">{lessonForm.formState.errors.content.message}</p>
              )}
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddingLesson(false);
                  setSelectedModuleId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addLessonMutation.isPending}
              >
                {addLessonMutation.isPending ? "Adding..." : "Add Lesson"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
