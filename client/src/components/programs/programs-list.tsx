import { useApp } from "@/contexts/app-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Book, Video, PlusCircle, Edit, Trash2, Calendar, BarChart, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrainingProgram } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ProgramCard from "@/components/programs/program-card";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface ProgramsListProps {
  searchQuery: string;
}

export default function ProgramsList({ searchQuery }: ProgramsListProps) {
  const { handleProgramSelect, handleCreateProgram, programs } = useApp();
  const { toast } = useToast();
  const [deletingProgramId, setDeletingProgramId] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Find the program being deleted
  const programToDelete = programs.find(p => p.id === deletingProgramId);

  // Filter programs based on search query
  const filteredPrograms = programs
    ? programs.filter(
        (program) =>
          program.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (program.description &&
            program.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  // Delete program mutation
  const deleteProgramMutation = useMutation({
    mutationFn: async (programId: number) => {
      const res = await apiRequest("DELETE", `/api/protected/programs/${programId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/programs'] });
      toast({
        title: "Program deleted",
        description: "The training program has been deleted successfully",
      });
      setShowDeleteDialog(false);
      setDeletingProgramId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete program",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle deleting a program
  const handleDeleteProgram = () => {
    if (deletingProgramId) {
      deleteProgramMutation.mutate(deletingProgramId);
    }
  };

  // Handle confirming delete
  const confirmDelete = (programId: number) => {
    setDeletingProgramId(programId);
    setShowDeleteDialog(true);
  };

  // Program type badges
  const getProgramTypeBadge = (type: string) => {
    switch (type) {
      case 'type_rating':
        return <Badge className="bg-blue-500">Type Rating</Badge>;
      case 'recurrent':
        return <Badge className="bg-green-500">Recurrent</Badge>;
      case 'initial':
        return <Badge className="bg-purple-500">Initial</Badge>;
      case 'conversion':
        return <Badge className="bg-amber-500">Conversion</Badge>;
      case 'instructor':
        return <Badge className="bg-red-500">Instructor</Badge>;
      case 'examiner':
        return <Badge className="bg-slate-800">Examiner</Badge>;
      default:
        return <Badge className="bg-slate-500">{type}</Badge>;
    }
  };

  // Get program completion percentage (mock data for demonstration)
  const getProgramCompletion = (programId: number) => {
    // This would ideally come from the API
    return Math.floor(Math.random() * 100);
  };

  return (
    <div>
      {/* Program cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPrograms.length === 0 ? (
          <div className="col-span-full py-12 flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-lg bg-gray-50">
            <div className="rounded-full bg-gray-100 p-3 mb-4">
              <Book className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium text-center">No training programs found</p>
            <p className="text-sm text-gray-400 mt-1 text-center max-w-md">
              {searchQuery
                ? "Try adjusting your search query or clearing filters."
                : "Get started by creating your first training program."}
            </p>
            <Button
              onClick={handleCreateProgram}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create New Program
            </Button>
          </div>
        ) : (
          filteredPrograms.map((program) => (
            <div 
              key={program.id} 
              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  {getProgramTypeBadge(program.programType || 'other')}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <span className="sr-only">Open menu</span>
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                          <path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[160px]">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleProgramSelect(program.id)}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Edit Program</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Schedule Sessions</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <BarChart className="mr-2 h-4 w-4" />
                        <span>View Reports</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600 focus:text-red-600" 
                        onClick={() => confirmDelete(program.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">{program.name}</h3>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{program.description}</p>
                
                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="bg-gray-100 rounded-full p-1">
                      <Book className="h-3.5 w-3.5 text-gray-500" />
                    </div>
                    <span className="text-gray-600">
                      {program.aircraftType ? program.aircraftType : 'No aircraft type specified'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="bg-gray-100 rounded-full p-1">
                      <Calendar className="h-3.5 w-3.5 text-gray-500" />
                    </div>
                    <span className="text-gray-600">
                      {program.durationDays ? `${program.durationDays} days` : 'Duration not specified'}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Completion</span>
                    <span className="font-medium">{getProgramCompletion(program.id)}%</span>
                  </div>
                  <Progress value={getProgramCompletion(program.id)} className="h-2" />
                </div>
                
                <div className="flex justify-between items-center mt-5 pt-4 border-t border-gray-100">
                  <Avatar className="h-7 w-7 mr-2">
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                      {program.createdById ? `U${program.createdById}` : 'NA'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <Button
                    onClick={() => handleProgramSelect(program.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the training program 
              <span className="font-semibold"> {programToDelete?.name}</span>. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProgram}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteProgramMutation.isPending ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Deleting...
                </>
              ) : (
                'Delete Program'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
