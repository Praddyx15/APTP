import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { X, FileText, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Session, User, TrainingProgram, Module, Lesson } from "@shared/schema";
import { format } from "date-fns";
import { useApp } from "@/contexts/app-context";

interface SessionDetailProps {
  sessionId: number;
}

export default function SessionDetail({ sessionId }: SessionDetailProps) {
  const { closeSessionDetail } = useApp();
  const { toast } = useToast();

  // Fetch session details
  const { data: session, isLoading: isLoadingSession } = useQuery<Session & { trainees: number[] }>({
    queryKey: ["/api/sessions", sessionId],
  });

  // Fetch users to display trainees
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/protected/users"],
  });

  // Fetch programs to get program and module names
  const { data: programs, isLoading: isLoadingPrograms } = useQuery<TrainingProgram[]>({
    queryKey: ["/api/programs"],
  });

  // Fetch lessons for this module
  const { data: moduleWithLessons } = useQuery<Module & { lessons: Lesson[] }>({
    queryKey: ["/api/programs", session?.programId, "modules", session?.moduleId],
    enabled: !!session?.moduleId && !!session?.programId,
    select: (data) => {
      const program = programs?.find(p => p.id === session?.programId);
      return program?.modules?.find(m => m.id === session?.moduleId);
    }
  });

  if (isLoadingSession || isLoadingUsers || isLoadingPrograms) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full">
          <div className="p-6">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full">
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline"> Failed to load session details.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Find program name and module name
  const program = programs?.find(p => p.id === session.programId);
  const module = program?.modules?.find(m => m.id === session.moduleId);
  
  // Format session times
  const formattedDate = format(new Date(session.startTime), 'MMM dd, yyyy');
  const formattedStartTime = format(new Date(session.startTime), 'h:mm a');
  const formattedEndTime = format(new Date(session.endTime), 'h:mm a');
  
  // Get session trainees
  const sessionTrainees = users?.filter(user => 
    session.trainees?.includes(user.id)
  ) || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold text-slate-800">Session Details</h2>
            <button
              className="text-slate-500 hover:text-slate-700"
              onClick={closeSessionDetail}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">Program & Module</h3>
              <p className="text-base text-slate-800">
                {program?.name || "Unknown Program"}: {module?.name || "Unknown Module"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">Status</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                ${session.status === 'scheduled' ? 'bg-amber-100 text-amber-800' : 
                  session.status === 'in progress' ? 'bg-blue-100 text-blue-800' : 
                  'bg-green-100 text-green-800'}`}
              >
                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">Date & Time</h3>
              <p className="text-base text-slate-800">{formattedDate} • {formattedStartTime} - {formattedEndTime}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">Instructor</h3>
              <div className="flex items-center">
                {users?.find(u => u.id === session.instructorId) ? (
                  <>
                    <div className="h-6 w-6 rounded-full bg-slate-300 flex items-center justify-center text-xs mr-2">
                      {users.find(u => u.id === session.instructorId)?.firstName.charAt(0)}
                      {users.find(u => u.id === session.instructorId)?.lastName.charAt(0)}
                    </div>
                    <p className="text-base text-slate-800">
                      {users.find(u => u.id === session.instructorId)?.firstName} {users.find(u => u.id === session.instructorId)?.lastName}
                    </p>
                  </>
                ) : (
                  <p className="text-base text-slate-800">Unknown Instructor</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-500 mb-3">Trainees</h3>
            <div className="space-y-2">
              {sessionTrainees.length > 0 ? (
                sessionTrainees.map(trainee => (
                  <div key={trainee.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-md">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center text-sm mr-3">
                        {trainee.firstName.charAt(0)}{trainee.lastName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{trainee.firstName} {trainee.lastName}</p>
                        <p className="text-xs text-slate-500">{trainee.email}</p>
                      </div>
                    </div>
                    <Button variant="secondary" size="sm" className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600">
                      Assessment
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 italic">No trainees assigned to this session.</p>
              )}
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-500 mb-3">Lessons</h3>
            <div className="space-y-2">
              {moduleWithLessons?.lessons && moduleWithLessons.lessons.length > 0 ? (
                moduleWithLessons.lessons.map(lesson => {
                  const lessonTypeDetails = {
                    'video': { icon: <Video className="h-4 w-4 text-blue-500 mr-2" />, bgColor: 'bg-green-100', textColor: 'text-green-800' },
                    'document': { icon: <FileText className="h-4 w-4 text-green-500 mr-2" />, bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
                    'interactive': { icon: (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="9" y1="21" x2="9" y2="9"></line>
                      </svg>
                    ), bgColor: 'bg-purple-100', textColor: 'text-purple-800' }
                  };

                  const typeDetails = lessonTypeDetails[lesson.type as keyof typeof lessonTypeDetails];
                  
                  return (
                    <div key={lesson.id} className="flex items-center p-2 bg-slate-50 rounded-md">
                      {typeDetails.icon}
                      <span className="text-sm text-slate-700 mr-2">{lesson.name}</span>
                      <span className={`ml-auto text-xs ${typeDetails.bgColor} ${typeDetails.textColor} px-1.5 py-0.5 rounded capitalize`}>
                        {lesson.type}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-slate-500 italic">No lessons available for this module.</p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              className="text-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700"
              onClick={closeSessionDetail}
            >
              Close
            </Button>
            <Button
              className="text-sm bg-blue-500 hover:bg-blue-600 text-white"
              onClick={() => {
                toast({
                  title: "Session started",
                  description: "The session has been started successfully.",
                });
                closeSessionDetail();
              }}
            >
              Start Session
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
