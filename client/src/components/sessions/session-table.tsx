import { useApp } from "@/contexts/app-context";
import { useQuery } from "@tanstack/react-query";
import { Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Session, TrainingProgram, User } from "@shared/schema";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SessionTableProps {
  sessions: (Session & { trainees: number[] })[];
  onSelectSession: (sessionId: number) => void;
}

export default function SessionTable({ sessions, onSelectSession }: SessionTableProps) {
  // Get programs data
  const { data: programs } = useQuery<TrainingProgram[]>({
    queryKey: ["/api/programs"],
  });

  // Get users for trainees display
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/protected/users"],
  });

  // Helper function to find trainees for a session
  const getSessionTrainees = (session: Session & { trainees: number[] }) => {
    if (!users) return [];
    return session.trainees
      .map((traineeId) => users.find((user) => user.id === traineeId))
      .filter(Boolean) as User[];
  };

  // Helper function to get program and module name
  const getProgramAndModule = (session: Session) => {
    if (!programs) return { program: "Unknown Program", module: "Unknown Module" };
    
    const program = programs.find((p) => p.id === session.programId);
    const module = program?.modules?.find((m) => m.id === session.moduleId);
    
    return {
      program: program?.name || "Unknown Program",
      module: module?.name || "Unknown Module",
    };
  };

  // Status badge styles
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-amber-100 text-amber-800';
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-500">No sessions found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 border-b border-slate-200">
            <TableHead className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Program & Module</TableHead>
            <TableHead className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date & Time</TableHead>
            <TableHead className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Trainees</TableHead>
            <TableHead className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</TableHead>
            <TableHead className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-slate-200">
          {sessions.map((session) => {
            const { program, module } = getProgramAndModule(session);
            const trainees = getSessionTrainees(session);
            const startTime = new Date(session.startTime);
            const endTime = new Date(session.endTime);
            
            return (
              <TableRow key={session.id} className="hover:bg-slate-50">
                <TableCell className="px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{program}</p>
                    <p className="text-xs text-slate-500">{module}</p>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div>
                    <p className="text-sm text-slate-800">{format(startTime, 'MMM dd, yyyy')}</p>
                    <p className="text-xs text-slate-500">
                      {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="flex -space-x-2">
                    {trainees.slice(0, 3).map((trainee, index) => (
                      <div
                        key={index}
                        className="h-7 w-7 rounded-full bg-sky-100 flex items-center justify-center text-xs border border-white"
                        title={`${trainee.firstName} ${trainee.lastName}`}
                      >
                        {trainee.firstName.charAt(0)}{trainee.lastName.charAt(0)}
                      </div>
                    ))}
                    {trainees.length > 3 && (
                      <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-xs border border-white">
                        +{trainees.length - 3}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(session.status)}`}>
                    {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                  </span>
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600"
                      onClick={() => onSelectSession(session.id)}
                    >
                      View
                    </Button>
                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-blue-500 p-0 h-8 w-8">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
