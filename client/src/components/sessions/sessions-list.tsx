import { useMemo } from "react";
import { useApp } from "@/contexts/app-context";
import { useQuery } from "@tanstack/react-query";
import { PlusCircle, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Session, TrainingProgram, User } from "@shared/schema";
import { format } from "date-fns";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

interface SessionsListProps {
  searchQuery: string;
}

export default function SessionsList({ searchQuery }: SessionsListProps) {
  const { 
    handleCreateSession, 
    handleSessionSelect, 
    sessions, 
    programs
  } = useApp();

  // Get users for trainees display
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/protected/users"],
  });

  // Build columns for the data table
  const columns = useMemo<ColumnDef<Session & { trainees: number[] }, any>[]>(() => [
    {
      accessorKey: "program",
      header: "Program & Module",
      cell: ({ row }) => {
        const session = row.original;
        const program = programs?.find(p => p.id === session.programId);
        const moduleName = programs
          ?.find(p => p.id === session.programId)?.modules
          ?.find(m => m.id === session.moduleId)?.name;
        
        return (
          <div>
            <p className="text-sm font-medium text-slate-800">{program?.name || "Unknown Program"}</p>
            <p className="text-xs text-slate-500">{moduleName || "Unknown Module"}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "date",
      header: "Date & Time",
      cell: ({ row }) => {
        const session = row.original;
        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);
        
        return (
          <div>
            <p className="text-sm text-slate-800">{format(startTime, 'MMM dd, yyyy')}</p>
            <p className="text-xs text-slate-500">
              {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "trainees",
      header: "Trainees",
      cell: ({ row }) => {
        const session = row.original;
        const trainees = session.trainees || [];
        
        return (
          <div className="flex -space-x-2">
            {trainees.slice(0, 3).map((traineeId, index) => {
              const trainee = users?.find(u => u.id === traineeId);
              const initials = trainee 
                ? `${trainee.firstName.charAt(0)}${trainee.lastName.charAt(0)}`
                : "?";
              
              return (
                <div 
                  key={index} 
                  className="h-7 w-7 rounded-full bg-sky-100 flex items-center justify-center text-xs border border-white"
                  title={trainee ? `${trainee.firstName} ${trainee.lastName}` : "Unknown Trainee"}
                >
                  {initials}
                </div>
              );
            })}
            
            {trainees.length > 3 && (
              <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-xs border border-white">
                +{trainees.length - 3}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const session = row.original;
        const statusColors = {
          'scheduled': 'bg-amber-100 text-amber-800',
          'in progress': 'bg-blue-100 text-blue-800',
          'completed': 'bg-green-100 text-green-800',
        };
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[session.status as keyof typeof statusColors]}`}>
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
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
              variant="secondary"
              size="sm"
              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600"
              onClick={() => handleSessionSelect(row.original.id)}
            >
              View
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-blue-500 p-0 h-8 w-8">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ], [programs, users, handleSessionSelect]);

  // Filter sessions based on search query
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    
    return sessions.filter(session => {
      const program = programs?.find(p => p.id === session.programId);
      const programName = program?.name.toLowerCase() || "";
      
      return programName.includes(searchQuery.toLowerCase());
    });
  }, [sessions, programs, searchQuery]);

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Training Sessions</h1>
          <p className="text-slate-500">Schedule and manage training activities</p>
        </div>
        <Button
          className="text-sm bg-blue-500 hover:bg-blue-600 text-white"
          onClick={handleCreateSession}
        >
          <PlusCircle className="h-4 w-4 mr-1.5" />
          Schedule Session
        </Button>
      </div>
      
      {/* Tabs for session status filtering */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="-mb-px flex space-x-6">
          <button className="py-2 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600">
            All Sessions
          </button>
          <button className="py-2 px-1 border-b-2 border-transparent font-medium text-sm text-slate-500 hover:text-slate-700 hover:border-slate-300">
            Scheduled
          </button>
          <button className="py-2 px-1 border-b-2 border-transparent font-medium text-sm text-slate-500 hover:text-slate-700 hover:border-slate-300">
            In Progress
          </button>
          <button className="py-2 px-1 border-b-2 border-transparent font-medium text-sm text-slate-500 hover:text-slate-700 hover:border-slate-300">
            Completed
          </button>
        </nav>
      </div>
      
      {/* Sessions table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredSessions}
          pageSize={10}
        />
      </div>
    </div>
  );
}
