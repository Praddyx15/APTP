import { useApp } from "@/contexts/app-context";
import { useQuery } from "@tanstack/react-query";
import { Loader2, PlusCircle, Clock, AlertTriangle, Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import StatsCard from "@/components/dashboard/stats-card";
import UpcomingSessions from "@/components/dashboard/upcoming-sessions";
import { Session, TrainingProgram, Notification, Resource } from "@shared/schema";

export default function Dashboard() {
  const { 
    programs, 
    sessions, 
    notifications, 
    resources, 
    handleCreateSession,
    handleSessionSelect
  } = useApp();

  // Calculate stats
  const activePrograms = programs ? programs.length : 0;
  const upcomingSessions = sessions ? sessions.filter(s => s.status === 'scheduled').length : 0;
  const pendingAssessments = 5; // This would come from an assessment query
  const availableResources = resources ? resources.length : 0;

  // Filter upcoming sessions for the dashboard
  const scheduledSessions = sessions ? 
    sessions
      .filter(s => s.status === 'scheduled')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 3) : 
    [];

  // Get latest notifications
  const latestNotifications = notifications ? 
    notifications
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 4) : 
    [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500">Overview of your training activities</p>
      </div>
      
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Active Programs"
          value={activePrograms.toString()}
          trend="+5%"
          trendUp={true}
        />
        
        <StatsCard
          title="Upcoming Sessions"
          value={upcomingSessions.toString()}
        />
        
        <StatsCard
          title="Pending Assessments"
          value={pendingAssessments.toString()}
          subtitle="2 due today"
          subtitleColor="amber"
        />
        
        <StatsCard
          title="Available Resources"
          value={availableResources.toString()}
          subtitle={`${resources?.filter(r => r.type === 'simulator').length || 0} simulators, ${resources?.filter(r => r.type === 'classroom').length || 0} rooms`}
        />
      </div>
      
      {/* Calendar section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Upcoming Sessions</h2>
            <Button
              variant="default"
              size="sm"
              className="text-sm bg-blue-500 hover:bg-blue-600 text-white"
              onClick={handleCreateSession}
            >
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Schedule Session
            </Button>
          </div>
          
          <UpcomingSessions 
            sessions={scheduledSessions}
            onSelectSession={handleSessionSelect}
          />
        </div>
        
        {/* Notifications panel */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Notifications</h2>
          <div className="space-y-3">
            {latestNotifications.length === 0 ? (
              <p className="text-slate-500 text-sm">No new notifications.</p>
            ) : (
              latestNotifications.map((notification) => {
                const notificationType = notification.type === 'info' 
                  ? { bgColor: 'bg-blue-50', iconBg: 'bg-blue-100', iconColor: 'text-blue-500', Icon: Bell }
                  : notification.type === 'warning'
                  ? { bgColor: 'bg-amber-50', iconBg: 'bg-amber-100', iconColor: 'text-amber-500', Icon: AlertTriangle }
                  : { bgColor: 'bg-red-50', iconBg: 'bg-red-100', iconColor: 'text-red-500', Icon: AlertTriangle };
                
                return (
                  <div key={notification.id} className={`flex items-start gap-3 p-2 ${notificationType.bgColor} rounded-md`}>
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${notificationType.iconBg} ${notificationType.iconColor}`}>
                        <span className="sr-only">{notification.type}</span>
                        <notificationType.Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-slate-800">{notification.content}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(notification.createdAt), 'PPp')}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {latestNotifications.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200">
              <Button variant="link" className="text-sm text-blue-600 hover:text-blue-800 p-0">
                View all notifications
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
