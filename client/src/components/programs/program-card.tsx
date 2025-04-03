import { Book, Video, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TrainingProgram } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface ProgramCardProps {
  program: TrainingProgram;
  onSelect: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ProgramCard({ 
  program, 
  onSelect, 
  onEdit, 
  onDelete 
}: ProgramCardProps) {
  // Get modules for this program
  const { data: modules = [] } = useQuery({
    queryKey: ["/api/programs", program.id],
    select: (data) => data.modules || [],
  });

  // Count total lessons across all modules
  const totalLessons = modules.reduce(
    (sum, module) => sum + (module.lessons?.length || 0), 
    0
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-5">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">{program.name}</h3>
        <p className="text-sm text-slate-600 mb-4">{program.description}</p>
        <div className="flex flex-col gap-1.5 mb-4">
          <div className="flex items-center text-sm">
            <Book className="h-4 w-4 text-slate-400 mr-2" />
            <span className="text-slate-600">{modules.length} Modules</span>
          </div>
          <div className="flex items-center text-sm">
            <Video className="h-4 w-4 text-slate-400 mr-2" />
            <span className="text-slate-600">{totalLessons} Lessons</span>
          </div>
        </div>
        <div className="border-t border-slate-200 -mx-5 my-4"></div>
        <div className="flex justify-between items-center">
          <Button
            variant="secondary"
            className="text-sm bg-blue-50 hover:bg-blue-100 text-blue-600"
            onClick={onSelect}
          >
            View Details
          </Button>
          <div className="flex space-x-2">
            {onEdit && (
              <Button variant="ghost" size="icon" onClick={onEdit} className="text-slate-400 hover:text-blue-500">
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={onDelete} className="text-slate-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
