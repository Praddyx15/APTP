import { useQuery } from "@tanstack/react-query";
import { Clock, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Session, User, TrainingProgram } from "@shared/schema";

interface UpcomingSessionsProps {
  sessions: (Session & { trainees?: number[] })[];
  onSelectSession: (sessionId: number) => void;
}

export default function UpcomingSessions({ sessions, onSelectSession }: UpcomingSessionsProps) {
  const formatSessionTime = (startTime: Date, endTime: Date) => {
    // Convert string dates to Date objects if they're not already
    const startDate = startTime instanceof Date ? startTime : new Date(startTime);
    const endDate = endTime instanceof Date ? endTime : new Date(endTime);
    
    return `${format(startDate, 'MMM d, yyyy')} • ${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`;
  };

  // Loading state for trainees
  const { data: trainees } = useQuery<User[]>({
    queryKey: ["/api/protected/users/trainees"],
  });

  // Fetch program data
  const { data: programs } = useQuery<TrainingProgram[]>({
    queryKey: ["/api/programs"],
  });

  if (sessions.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-slate-500">No upcoming sessions scheduled.</p>
        <p className="text-sm text-slate-400 mt-1">Click 'Schedule Session' to create a new session.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-200">
      {sessions.map((session) => {
        // Find program name
        const program = programs?.find(p => p.id === session.programId);
        
        // Find trainees for this session
        const sessionTrainees = session.trainees?.map(traineeId => 
          trainees?.find(t => t.id === traineeId)
        ).filter(Boolean) as User[] | undefined;

        return (
          <div key={session.id} className="py-3 flex flex-col sm:flex-row justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-blue-500" />
                <h3 className="font-medium text-slate-800">
                  {program?.name || 'Training Program'}
                </h3>
              </div>
              <div className="flex items-center text-sm text-slate-500 mt-1">
                <Clock className="h-3.5 w-3.5 mr-1" />
                <span>{formatSessionTime(session.startTime, session.endTime)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {sessionTrainees && sessionTrainees.length > 0 ? (
                  sessionTrainees.slice(0, 3).map((trainee, index) => (
                    trainee && (
                      <div 
                        key={index} 
                        className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center text-xs border border-white"
                        title={`${trainee.firstName} ${trainee.lastName}`}
                      >
                        {trainee.firstName.charAt(0)}{trainee.lastName.charAt(0)}
                      </div>
                    )
                  ))
                ) : (
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-xs border border-white">
                    --
                  </div>
                )}
                {sessionTrainees && sessionTrainees.length > 3 && (
                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs border border-white">
                    +{sessionTrainees.length - 3}
                  </div>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700"
                onClick={() => onSelectSession(session.id)}
              >
                View Details
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
