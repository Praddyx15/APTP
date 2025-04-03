import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { TrainingSession } from '../../types/training';

interface CalendarViewProps {
  sessions: TrainingSession[];
  onSelectSession?: (session: TrainingSession) => void;
  className?: string;
}

export function CalendarView({ sessions = [], onSelectSession, className }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  
  // Get all days in the current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get sessions for the selected day
  const selectedDaySessions = selectedDay 
    ? sessions.filter(session => {
        const sessionDate = new Date(session.date);
        return isSameDay(sessionDate, selectedDay);
      })
    : [];
  
  const getDayStyle = (day: Date) => {
    const isCurrentMonth = isSameMonth(day, currentDate);
    const isSelected = selectedDay && isSameDay(day, selectedDay);
    const hasSession = sessions.some(session => isSameDay(new Date(session.date), day));
    
    return cn(
      "h-9 w-9 p-0 font-normal rounded-full flex items-center justify-center relative",
      !isCurrentMonth && "text-muted-foreground opacity-50",
      hasSession && !isSelected && "border-2 border-primary text-primary font-medium",
      isSelected && "bg-primary text-primary-foreground",
      !isSelected && !hasSession && "hover:bg-accent hover:text-accent-foreground"
    );
  };
  
  const getSessionsForDate = (date: Date) => {
    return sessions.filter(session => {
      const sessionDate = new Date(session.date);
      return isSameDay(sessionDate, date);
    });
  };
  
  const dayHasSessions = (day: Date) => {
    return getSessionsForDate(day).length > 0;
  };
  
  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
  };
  
  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
    setSelectedDay(null);
  };
  
  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
    setSelectedDay(null);
  };
  
  const getSessionTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'classroom':
        return 'bg-blue-500';
      case 'simulator':
        return 'bg-purple-500';
      case 'flight':
        return 'bg-green-500';
      case 'briefing':
        return 'bg-amber-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  return (
    <Card className={cn("min-h-[550px]", className)}>
      <CardHeader className="px-2 pt-3 pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">
            Training Calendar
          </CardTitle>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePreviousMonth}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="font-medium">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextMonth}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <div className="grid grid-cols-7 mt-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center text-sm text-muted-foreground h-9 flex items-center justify-center"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 mt-1 gap-1">
          {monthDays.map((day, i) => (
            <div key={i} className="p-0 text-center h-9 flex justify-center items-center">
              <Button
                variant="ghost"
                className={getDayStyle(day)}
                onClick={() => handleDayClick(day)}
                disabled={!isSameMonth(day, currentDate)}
              >
                {format(day, 'd')}
                {dayHasSessions(day) && (
                  <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-primary"></span>
                )}
              </Button>
            </div>
          ))}
        </div>
        
        <div className="mt-5">
          <h4 className="text-sm font-medium mb-2">
            {selectedDay ? (
              <span>Sessions for {format(selectedDay, 'MMMM d, yyyy')}</span>
            ) : (
              <span>Select a day to view sessions</span>
            )}
          </h4>
          
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {selectedDaySessions.length > 0 ? (
              selectedDaySessions.map((session) => (
                <div 
                  key={session.id}
                  className="p-2 border rounded-md cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => onSelectSession && onSelectSession(session)}
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={cn("w-2 h-2 p-0 rounded-full", getSessionTypeColor(session.type))} />
                    <span className="font-medium">{session.title}</span>
                    <Badge variant="secondary" className="ml-auto">{session.type}</Badge>
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    <span>{session.startTime} - {session.endTime}</span>
                    <span className="ml-auto">{session.location}</span>
                  </div>
                </div>
              ))
            ) : selectedDay ? (
              <div className="text-center p-4 text-sm text-muted-foreground">
                No sessions scheduled for this day
              </div>
            ) : (
              <div className="text-center p-4 text-sm text-muted-foreground">
                Select a day to view scheduled sessions
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}