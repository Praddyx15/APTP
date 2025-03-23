// src/frontend/components/calendar/TrainingCalendar.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Modal } from '../ui/Modal';

// Types
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  location?: string;
  description?: string;
  type: 'training' | 'assessment' | 'simulator' | 'meeting' | 'other';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  trainees?: string[];
  traineeCount?: number;
  instructorId?: string;
  instructorName?: string;
  allDay?: boolean;
  recurring?: boolean;
  recurrencePattern?: string;
  color?: string;
}

export interface Instructor {
  id: string;
  name: string;
  color?: string;
}

export interface CalendarViewOptions {
  view: 'month' | 'week' | 'day' | 'agenda';
  date: Date;
  filters: {
    eventTypes: string[];
    instructors: string[];
  };
}

// Calendar Components
interface CalendarHeaderProps {
  currentDate: Date;
  view: 'month' | 'week' | 'day' | 'agenda';
  onViewChange: (view: 'month' | 'week' | 'day' | 'agenda') => void;
  onDateChange: (date: Date) => void;
  onCreateEvent: () => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  view,
  onViewChange,
  onDateChange,
  onCreateEvent
}) => {
  // Format date for display
  const formatHeaderDate = () => {
    const options: Intl.DateTimeFormatOptions = {};
    
    switch (view) {
      case 'month':
        options.month = 'long';
        options.year = 'numeric';
        break;
      case 'week':
        const startOfWeek = new Date(currentDate);
        const day = currentDate.getDay();
        const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
        startOfWeek.setDate(diff);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
          return `${startOfWeek.toLocaleDateString(undefined, { month: 'long' })} ${startOfWeek.getDate()} - ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
        } else if (startOfWeek.getFullYear() === endOfWeek.getFullYear()) {
          return `${startOfWeek.toLocaleDateString(undefined, { month: 'short' })} ${startOfWeek.getDate()} - ${endOfWeek.toLocaleDateString(undefined, { month: 'short' })} ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
        } else {
          return `${startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} - ${endOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
      case 'day':
        options.weekday = 'long';
        options.month = 'long';
        options.day = 'numeric';
        options.year = 'numeric';
        break;
      case 'agenda':
        options.month = 'long';
        options.year = 'numeric';
        break;
    }
    
    return currentDate.toLocaleDateString(undefined, options);
  };

  // Navigate to previous period
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    
    switch (view) {
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'agenda':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
    }
    
    onDateChange(newDate);
  };

  // Navigate to next period
  const goToNext = () => {
    const newDate = new Date(currentDate);
    
    switch (view) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'agenda':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }
    
    onDateChange(newDate);
  };

  // Go to today
  const goToToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
      <div className="flex items-center mb-4 sm:mb-0">
        <h2 className="text-xl font-bold mr-4">{formatHeaderDate()}</h2>
        <div className="flex space-x-2">
          <button
            type="button"
            className="p-1 rounded-full text-gray-500 hover:text-gray-700 focus:outline-none"
            onClick={goToPrevious}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </button>
          <button
            type="button"
            className="p-1 rounded-full text-gray-500 hover:text-gray-700 focus:outline-none"
            onClick={goToNext}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </button>
          <button
            type="button"
            className="ml-2 px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none"
            onClick={goToToday}
          >
            Today
          </button>
        </div>
      </div>
      
      <div className="flex items-center">
        <div className="flex border rounded-md overflow-hidden mr-2">
          <button
            type="button"
            className={`px-3 py-1 text-sm ${view === 'month' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            onClick={() => onViewChange('month')}
          >
            Month
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-sm ${view === 'week' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            onClick={() => onViewChange('week')}
          >
            Week
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-sm ${view === 'day' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            onClick={() => onViewChange('day')}
          >
            Day
          </button>
          <button
            type="button"
            className={`px-3 py-1 text-sm ${view === 'agenda' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            onClick={() => onViewChange('agenda')}
          >
            Agenda
          </button>
        </div>
        
        <Button
          variant="primary"
          size="small"
          onClick={onCreateEvent}
        >
          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Add Event
        </Button>
      </div>
    </div>
  );
};

interface DayHeaderProps {
  day: Date;
  isToday: boolean;
}

const DayHeader: React.FC<DayHeaderProps> = ({ day, isToday }) => {
  const dayOfWeek = day.toLocaleDateString(undefined, { weekday: 'short' });
  const dayOfMonth = day.getDate();
  
  return (
    <div className="text-center py-2">
      <div className="text-xs text-gray-500">{dayOfWeek}</div>
      <div className={`text-sm ${isToday ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto' : ''}`}>
        {dayOfMonth}
      </div>
    </div>
  );
};

interface MonthGridProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDayCellClick: (date: Date) => void;
}

const MonthGrid: React.FC<MonthGridProps> = ({
  currentDate,
  events,
  onEventClick,
  onDayCellClick
}) => {
  // Get days for month grid (includes days from prev/next month to fill grid)
  const getDaysForMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDayOfMonth = new Date(year, month, 1);
    
    // Last day of the month
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Day of the week for the first day (0 = Sunday, 1 = Monday, etc.)
    let firstDayOfWeek = firstDayOfMonth.getDay();
    // Adjust for Sunday being 0
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    // Number of days in the month
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Days from previous month to include
    const daysFromPrevMonth = firstDayOfWeek;
    
    // Calculate days from next month to include (to make grid complete)
    const totalCells = Math.ceil((daysInMonth + daysFromPrevMonth) / 7) * 7;
    const daysFromNextMonth = totalCells - daysInMonth - daysFromPrevMonth;
    
    // Create days array
    const days: Date[] = [];
    
    // Add days from previous month
    for (let i = 0; i < daysFromPrevMonth; i++) {
      const day = new Date(year, month, 0 - (daysFromPrevMonth - i - 1));
      days.push(day);
    }
    
    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      const day = new Date(year, month, i);
      days.push(day);
    }
    
    // Add days from next month
    for (let i = 1; i <= daysFromNextMonth; i++) {
      const day = new Date(year, month + 1, i);
      days.push(day);
    }
    
    return days;
  };

  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  // Check if a date is in the current month
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  // Get events for a specific day
  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      // Check if the date falls between event start and end dates
      return (
        date.getFullYear() === eventStart.getFullYear() &&
        date.getMonth() === eventStart.getMonth() &&
        date.getDate() === eventStart.getDate()
      ) || (
        event.allDay &&
        date >= eventStart &&
        date <= eventEnd
      );
    });
  };

  // Get background color for event
  const getEventColor = (event: CalendarEvent) => {
    if (event.color) return event.color;
    
    switch (event.type) {
      case 'training':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assessment':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'simulator':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'meeting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get event status indicator
  const getEventStatusIndicator = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-400';
      case 'in_progress':
        return 'bg-yellow-400';
      case 'completed':
        return 'bg-green-400';
      case 'cancelled':
        return 'bg-red-400';
      default:
        return 'bg-gray-400';
    }
  };

  // Format event time
  const formatEventTime = (event: CalendarEvent) => {
    if (event.allDay) return 'All day';
    
    const start = new Date(event.start);
    return start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const days = getDaysForMonthGrid();
  
  return (
    <div className="grid grid-cols-7 border rounded-lg overflow-hidden">
      {/* Day headers (Mon, Tue, etc.) */}
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
        <div key={index} className="text-center py-2 bg-gray-50 border-b">
          <span className="text-sm font-medium text-gray-700">{day}</span>
        </div>
      ))}
      
      {/* Calendar cells */}
      {days.map((day, index) => {
        const dayEvents = getEventsForDay(day);
        
        return (
          <div
            key={index}
            className={`min-h-[120px] p-1 border-t border-l ${
              index % 7 === 6 ? 'border-r' : ''
            } ${
              Math.floor(index / 7) === Math.floor(days.length / 7) - 1 ? 'border-b' : ''
            } ${
              isCurrentMonth(day) ? 'bg-white' : 'bg-gray-50'
            } ${
              isToday(day) ? 'ring-2 ring-inset ring-blue-500' : ''
            }`}
            onClick={() => onDayCellClick(day)}
          >
            <div className="mb-1">
              <span className={`text-sm ${
                isCurrentMonth(day) ? 'text-gray-700' : 'text-gray-400'
              } ${
                isToday(day) ? 'font-bold' : ''
              }`}>
                {day.getDate()}
              </span>
            </div>
            
            <div className="space-y-1 overflow-y-auto max-h-[80px]">
              {dayEvents.slice(0, 3).map(event => (
                <div
                  key={event.id}
                  className={`px-2 py-1 rounded text-xs truncate cursor-pointer border-l-2 ${getEventColor(event)}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                >
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-1 ${getEventStatusIndicator(event.status)}`}></div>
                    <span className="truncate">
                      {formatEventTime(event)} {event.title}
                    </span>
                  </div>
                </div>
              ))}
              
              {dayEvents.length > 3 && (
                <div className="text-xs text-gray-500 pl-2">
                  +{dayEvents.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date) => void;
}

const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onTimeSlotClick
}) => {
  // Get days for the week
  const getWeekDays = () => {
    const days: Date[] = [];
    const startOfWeek = new Date(currentDate);
    const day = currentDate.getDay();
    const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    startOfWeek.setDate(diff);
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  };

  // Get time slots
  const getTimeSlots = () => {
    const slots: string[] = [];
    for (let i = 0; i < 24; i++) {
      slots.push(`${i.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  // Get events for a specific day and hour
  const getEventsForHour = (day: Date, hour: number) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      // Check if the event falls within this day and hour
      return (
        eventStart.getFullYear() === day.getFullYear() &&
        eventStart.getMonth() === day.getMonth() &&
        eventStart.getDate() === day.getDate() &&
        eventStart.getHours() === hour
      ) || (
        eventEnd.getFullYear() === day.getFullYear() &&
        eventEnd.getMonth() === day.getMonth() &&
        eventEnd.getDate() === day.getDate() &&
        eventEnd.getHours() === hour
      ) || (
        eventStart < day && eventEnd > day &&
        event.allDay
      );
    });
  };

  // Get background color for event
  const getEventColor = (event: CalendarEvent) => {
    if (event.color) return event.color;
    
    switch (event.type) {
      case 'training':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assessment':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'simulator':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'meeting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const weekDays = getWeekDays();
  const timeSlots = getTimeSlots();
  
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px] border rounded-lg overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-8 border-b">
          <div className="py-2 border-r bg-gray-50"></div>
          {weekDays.map((day, index) => (
            <div key={index} className="text-center py-2 bg-gray-50 border-r last:border-r-0">
              <DayHeader day={day} isToday={isToday(day)} />
            </div>
          ))}
        </div>
        
        {/* Time slots and events */}
        {timeSlots.map((timeSlot, hourIndex) => (
          <div key={timeSlot} className="grid grid-cols-8 border-b last:border-b-0">
            {/* Time column */}
            <div className="py-2 px-2 text-right text-xs text-gray-500 border-r">
              {timeSlot}
            </div>
            
            {/* Day columns */}
            {weekDays.map((day, dayIndex) => {
              const hourEvents = getEventsForHour(day, hourIndex);
              
              return (
                <div
                  key={dayIndex}
                  className={`py-2 px-1 border-r last:border-r-0 min-h-[60px] ${
                    isToday(day) ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => {
                    const date = new Date(day);
                    date.setHours(hourIndex);
                    onTimeSlotClick(date);
                  }}
                >
                  {hourEvents.map(event => (
                    <div
                      key={event.id}
                      className={`px-2 py-1 rounded text-xs mb-1 cursor-pointer border-l-2 ${getEventColor(event)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                    >
                      <div className="font-medium truncate">{event.title}</div>
                      {event.location && (
                        <div className="truncate text-xs opacity-75">{event.location}</div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (date: Date) => void;
}

const DayView: React.FC<DayViewProps> = ({
  currentDate,
  events,
  onEventClick,
  onTimeSlotClick
}) => {
  // Get time slots
  const getTimeSlots = () => {
    const slots: string[] = [];
    for (let i = 0; i < 24; i++) {
      slots.push(`${i.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  // Get events for a specific hour
  const getEventsForHour = (hour: number) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      
      // Check if the event falls within this day and hour
      return (
        eventStart.getFullYear() === currentDate.getFullYear() &&
        eventStart.getMonth() === currentDate.getMonth() &&
        eventStart.getDate() === currentDate.getDate() &&
        eventStart.getHours() === hour
      ) || (
        eventEnd.getFullYear() === currentDate.getFullYear() &&
        eventEnd.getMonth() === currentDate.getMonth() &&
        eventEnd.getDate() === currentDate.getDate() &&
        eventEnd.getHours() === hour
      ) || (
        eventStart.getFullYear() === currentDate.getFullYear() &&
        eventStart.getMonth() === currentDate.getMonth() &&
        eventStart.getDate() === currentDate.getDate() &&
        event.allDay
      );
    });
  };

  // Get background color for event
  const getEventColor = (event: CalendarEvent) => {
    if (event.color) return event.color;
    
    switch (event.type) {
      case 'training':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assessment':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'simulator':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'meeting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Check if the date is today
  const isToday = () => {
    const today = new Date();
    return currentDate.getDate() === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear();
  };

  const timeSlots = getTimeSlots();
  
  // Get all-day events
  const allDayEvents = events.filter(event => 
    event.allDay &&
    new Date(event.start).getFullYear() === currentDate.getFullYear() &&
    new Date(event.start).getMonth() === currentDate.getMonth() &&
    new Date(event.start).getDate() === currentDate.getDate()
  );
  
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* All-day events section */}
      {allDayEvents.length > 0 && (
        <div className="border-b bg-gray-50 p-2">
          <div className="text-xs font-medium text-gray-500 mb-1">All day</div>
          <div className="space-y-1">
            {allDayEvents.map(event => (
              <div
                key={event.id}
                className={`px-2 py-1 rounded text-xs cursor-pointer border-l-2 ${getEventColor(event)}`}
                onClick={() => onEventClick(event)}
              >
                <div className="font-medium">{event.title}</div>
                {event.location && (
                  <div className="text-xs opacity-75">{event.location}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Hourly time slots */}
      <div className="grid grid-cols-[100px_1fr]">
        {timeSlots.map((timeSlot, hourIndex) => {
          const hourEvents = getEventsForHour(hourIndex);
          
          return (
            <React.Fragment key={timeSlot}>
              {/* Time column */}
              <div className="py-2 px-2 text-right text-xs text-gray-500 border-r border-b">
                {timeSlot}
              </div>
              
              {/* Events column */}
              <div
                className={`py-2 px-2 border-b min-h-[60px] ${
                  isToday() && hourIndex === new Date().getHours() ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  const date = new Date(currentDate);
                  date.setHours(hourIndex);
                  onTimeSlotClick(date);
                }}
              >
                {hourEvents.map(event => (
                  <div
                    key={event.id}
                    className={`px-2 py-1 rounded text-xs mb-1 cursor-pointer border-l-2 ${getEventColor(event)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                  >
                    <div className="font-medium">{event.title}</div>
                    {event.location && (
                      <div className="text-xs opacity-75">{event.location}</div>
                    )}
                    {event.traineeCount && (
                      <div className="text-xs opacity-75">{event.traineeCount} trainees</div>
                    )}
                  </div>
                ))}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

interface AgendaViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

const AgendaView: React.FC<AgendaViewProps> = ({
  currentDate,
  events,
  onEventClick
}) => {
  // Group events by date
  const groupEventsByDate = () => {
    const grouped: Record<string, CalendarEvent[]> = {};
    
    // Get start and end of month
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    
    // Filter events in the current month
    const monthEvents = events.filter(event => {
      const eventStart = new Date(event.start);
      return eventStart >= startOfMonth && eventStart <= endOfMonth;
    });
    
    // Sort events by date
    monthEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    
    // Group by date
    monthEvents.forEach(event => {
      const dateKey = new Date(event.start).toLocaleDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    
    return grouped;
  };

  // Format event time
  const formatEventTime = (event: CalendarEvent) => {
    if (event.allDay) return 'All day';
    
    const start = new Date(event.start);
    const end = new Date(event.end);
    
    return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Get background color for event
  const getEventColor = (event: CalendarEvent) => {
    if (event.color) return event.color;
    
    switch (event.type) {
      case 'training':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'assessment':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'simulator':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'meeting':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Check if a date is today
  const isToday = (dateStr: string) => {
    const today = new Date().toLocaleDateString();
    return dateStr === today;
  };

  const groupedEvents = groupEventsByDate();
  
  return (
    <div className="space-y-4">
      {Object.keys(groupedEvents).length > 0 ? (
        Object.entries(groupedEvents).map(([dateStr, dayEvents]) => (
          <div key={dateStr} className="border rounded-lg overflow-hidden">
            <div className={`py-2 px-4 ${isToday(dateStr) ? 'bg-blue-50' : 'bg-gray-50'} border-b`}>
              <div className="font-medium">
                {new Date(dateStr).toLocaleDateString(undefined, { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric'
                })}
              </div>
            </div>
            
            <div className="divide-y">
              {dayEvents.map(event => (
                <div
                  key={event.id}
                  className="p-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onEventClick(event)}
                >
                  <div className="flex items-start">
                    <div className="min-w-[120px] text-sm text-gray-500">
                      {formatEventTime(event)}
                    </div>
                    <div>
                      <div className={`inline-block px-2 py-1 rounded-full text-xs mb-1 ${
                        event.type === 'training' ? 'bg-blue-100 text-blue-800' :
                        event.type === 'assessment' ? 'bg-green-100 text-green-800' :
                        event.type === 'simulator' ? 'bg-purple-100 text-purple-800' :
                        event.type === 'meeting' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                      </div>
                      <div className="font-medium">{event.title}</div>
                      {event.location && (
                        <div className="text-sm text-gray-500">{event.location}</div>
                      )}
                      {event.description && (
                        <div className="text-sm text-gray-500 mt-1">{event.description}</div>
                      )}
                      {event.traineeCount && (
                        <div className="text-sm text-gray-500 mt-1">{event.traineeCount} trainees</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8 text-gray-500">
          No events scheduled for this month.
        </div>
      )}
    </div>
  );
};

interface CalendarFiltersProps {
  filters: {
    eventTypes: string[];
    instructors: string[];
  };
  availableInstructors: Instructor[];
  onFiltersChange: (filters: { eventTypes: string[]; instructors: string[] }) => void;
}

const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  filters,
  availableInstructors,
  onFiltersChange
}) => {
  const eventTypes = ['training', 'assessment', 'simulator', 'meeting', 'other'];
  
  // Toggle event type filter
  const toggleEventType = (type: string) => {
    const newEventTypes = filters.eventTypes.includes(type)
      ? filters.eventTypes.filter(t => t !== type)
      : [...filters.eventTypes, type];
    
    onFiltersChange({
      ...filters,
      eventTypes: newEventTypes
    });
  };
  
  // Toggle instructor filter
  const toggleInstructor = (instructorId: string) => {
    const newInstructors = filters.instructors.includes(instructorId)
      ? filters.instructors.filter(id => id !== instructorId)
      : [...filters.instructors, instructorId];
    
    onFiltersChange({
      ...filters,
      instructors: newInstructors
    });
  };
  
  return (
    <div className="bg-white border rounded-lg p-4 mb-4">
      <div className="mb-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Event Types</h3>
        <div className="flex flex-wrap gap-2">
          {eventTypes.map(type => (
            <button
              key={type}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                filters.eventTypes.includes(type)
                  ? type === 'training' ? 'bg-blue-100 text-blue-800' :
                    type === 'assessment' ? 'bg-green-100 text-green-800' :
                    type === 'simulator' ? 'bg-purple-100 text-purple-800' :
                    type === 'meeting' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  : 'bg-gray-100 text-gray-500'
              }`}
              onClick={() => toggleEventType(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {availableInstructors.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Instructors</h3>
          <div className="flex flex-wrap gap-2">
            {availableInstructors.map(instructor => (
              <button
                key={instructor.id}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  filters.instructors.includes(instructor.id)
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-500'
                }`}
                onClick={() => toggleInstructor(instructor.id)}
              >
                {instructor.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface EventFormProps {
  event?: CalendarEvent;
  instructors: Instructor[];
  onSave: (event: Omit<CalendarEvent, 'id'> & { id?: string }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onCancel: () => void;
  isEditing: boolean;
}

const EventForm: React.FC<EventFormProps> = ({
  event,
  instructors,
  onSave,
  onDelete,
  onCancel,
  isEditing
}) => {
  const [formData, setFormData] = useState<Omit<CalendarEvent, 'id'> & { id?: string }>({
    title: '',
    start: new Date(),
    end: new Date(new Date().setHours(new Date().getHours() + 1)),
    type: 'training',
    status: 'scheduled',
    location: '',
    description: '',
    allDay: false,
    recurring: false,
    instructorId: '',
    traineeCount: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data from event if editing
  useEffect(() => {
    if (event) {
      setFormData({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end)
      });
    }
  }, [event]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked
      });
    } else if (name === 'traineeCount') {
      setFormData({
        ...formData,
        [name]: parseInt(value) || 0
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  // Handle date changes
  const handleDateChange = (name: 'start' | 'end', value: string) => {
    setFormData({
      ...formData,
      [name]: new Date(value)
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Basic validation
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }
      
      if (formData.end < formData.start) {
        throw new Error('End time cannot be before start time');
      }
      
      await onSave(formData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle event deletion
  const handleDelete = async () => {
    if (!event?.id || !onDelete) return;
    
    if (window.confirm('Are you sure you want to delete this event?')) {
      setIsSubmitting(true);
      
      try {
        await onDelete(event.id);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred during deletion');
        setIsSubmitting(false);
      }
    }
  };

  // Format date for datetime-local input
  const formatDateForInput = (date: Date) => {
    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
      .toISOString()
      .slice(0, 16);
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title*
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            required
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="start" className="block text-sm font-medium text-gray-700 mb-1">
              Start*
            </label>
            <input
              type="datetime-local"
              id="start"
              name="start"
              value={formatDateForInput(formData.start)}
              onChange={(e) => handleDateChange('start', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>
          
          <div>
            <label htmlFor="end" className="block text-sm font-medium text-gray-700 mb-1">
              End*
            </label>
            <input
              type="datetime-local"
              id="end"
              name="end"
              value={formatDateForInput(formData.end)}
              onChange={(e) => handleDateChange('end', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Event Type*
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            >
              <option value="training">Training</option>
              <option value="assessment">Assessment</option>
              <option value="simulator">Simulator</option>
              <option value="meeting">Meeting</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status*
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location || ''}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        
        <div>
          <label htmlFor="instructorId" className="block text-sm font-medium text-gray-700 mb-1">
            Instructor
          </label>
          <select
            id="instructorId"
            name="instructorId"
            value={formData.instructorId || ''}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">No Instructor</option>
            {instructors.map(instructor => (
              <option key={instructor.id} value={instructor.id}>
                {instructor.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="traineeCount" className="block text-sm font-medium text-gray-700 mb-1">
            Number of Trainees
          </label>
          <input
            type="number"
            id="traineeCount"
            name="traineeCount"
            value={formData.traineeCount || ''}
            onChange={handleInputChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            min="0"
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleInputChange}
            rows={3}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="allDay"
            name="allDay"
            checked={formData.allDay || false}
            onChange={handleInputChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="allDay" className="ml-2 block text-sm text-gray-700">
            All Day Event
          </label>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="recurring"
            name="recurring"
            checked={formData.recurring || false}
            onChange={handleInputChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="recurring" className="ml-2 block text-sm text-gray-700">
            Recurring Event
          </label>
        </div>
        
        {formData.recurring && (
          <div>
            <label htmlFor="recurrencePattern" className="block text-sm font-medium text-gray-700 mb-1">
              Recurrence Pattern
            </label>
            <select
              id="recurrencePattern"
              name="recurrencePattern"
              value={formData.recurrencePattern || ''}
              onChange={handleInputChange}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        )}
      </div>
      
      <div className="mt-6 flex justify-end space-x-3">
        {isEditing && onDelete && (
          <Button
            variant="danger"
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting}
          >
            Delete
          </Button>
        )}
        <Button
          variant="outline"
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {isEditing ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
};

// Main Calendar Component
interface TrainingCalendarProps {
  events: CalendarEvent[];
  instructors: Instructor[];
  onCreateEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  onUpdateEvent: (event: CalendarEvent) => Promise<void>;
  onDeleteEvent: (id: string) => Promise<void>;
}

export const TrainingCalendar: React.FC<TrainingCalendarProps> = ({
  events,
  instructors,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent
}) => {
  const [view, setView] = useState<'month' | 'week' | 'day' | 'agenda'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState<{ eventTypes: string[]; instructors: string[] }>({
    eventTypes: ['training', 'assessment', 'simulator', 'meeting', 'other'],
    instructors: instructors.map(instructor => instructor.id)
  });
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalStartDate, setModalStartDate] = useState<Date | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filter events based on selected filters
  const filteredEvents = events.filter(event => {
    // Check event type filter
    if (!filters.eventTypes.includes(event.type)) {
      return false;
    }
    
    // Check instructor filter
    if (event.instructorId && !filters.instructors.includes(event.instructorId)) {
      return false;
    }
    
    return true;
  });

  // Handle view change
  const handleViewChange = (newView: 'month' | 'week' | 'day' | 'agenda') => {
    setView(newView);
  };

  // Handle date change
  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  // Handle event click
  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  // Handle day cell click in month view
  const handleDayCellClick = (date: Date) => {
    setModalStartDate(date);
    setShowCreateModal(true);
  };

  // Handle time slot click in week/day view
  const handleTimeSlotClick = (date: Date) => {
    setModalStartDate(date);
    setShowCreateModal(true);
  };

  // Handle create event
  const handleCreateEvent = () => {
    setModalStartDate(null);
    setShowCreateModal(true);
  };

  // Handle save event
  const handleSaveEvent = async (eventData: Omit<CalendarEvent, 'id'> & { id?: string }) => {
    try {
      if (eventData.id) {
        // Update existing event
        await onUpdateEvent(eventData as CalendarEvent);
        setAlertMessage({
          type: 'success',
          message: 'Event updated successfully'
        });
      } else {
        // Create new event
        await onCreateEvent(eventData);
        setAlertMessage({
          type: 'success',
          message: 'Event created successfully'
        });
      }
      
      setShowEventModal(false);
      setShowCreateModal(false);
      setSelectedEvent(null);
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to save event: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Handle delete event
  const handleDeleteEvent = async (id: string) => {
    try {
      await onDeleteEvent(id);
      
      setAlertMessage({
        type: 'success',
        message: 'Event deleted successfully'
      });
      
      setShowEventModal(false);
      setSelectedEvent(null);
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  return (
    <div className="training-calendar">
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}
      
      <Card className="mb-6">
        <CalendarHeader
          currentDate={currentDate}
          view={view}
          onViewChange={handleViewChange}
          onDateChange={handleDateChange}
          onCreateEvent={handleCreateEvent}
        />
        
        <CalendarFilters
          filters={filters}
          availableInstructors={instructors}
          onFiltersChange={setFilters}
        />
        
        {view === 'month' && (
          <MonthGrid
            currentDate={currentDate}
            events={filteredEvents}
            onEventClick={handleEventClick}
            onDayCellClick={handleDayCellClick}
          />
        )}
        
        {view === 'week' && (
          <WeekView
            currentDate={currentDate}
            events={filteredEvents}
            onEventClick={handleEventClick}
            onTimeSlotClick={handleTimeSlotClick}
          />
        )}
        
        {view === 'day' && (
          <DayView
            currentDate={currentDate}
            events={filteredEvents}
            onEventClick={handleEventClick}
            onTimeSlotClick={handleTimeSlotClick}
          />
        )}
        
        {view === 'agenda' && (
          <AgendaView
            currentDate={currentDate}
            events={filteredEvents}
            onEventClick={handleEventClick}
          />
        )}
      </Card>
      
      {/* Event Detail Modal */}
      <Modal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        title="Event Details"
        size="lg"
      >
        {selectedEvent && (
          <EventForm
            event={selectedEvent}
            instructors={instructors}
            onSave={handleSaveEvent}
            onDelete={handleDeleteEvent}
            onCancel={() => setShowEventModal(false)}
            isEditing={true}
          />
        )}
      </Modal>
      
      {/* Create Event Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Event"
        size="lg"
      >
        <EventForm
          instructors={instructors}
          onSave={handleSaveEvent}
          onCancel={() => setShowCreateModal(false)}
          isEditing={false}
          event={
            modalStartDate
              ? {
                  id: '',
                  title: '',
                  start: modalStartDate,
                  end: new Date(new Date(modalStartDate).setHours(modalStartDate.getHours() + 1)),
                  type: 'training',
                  status: 'scheduled'
                }
              : undefined
          }
        />
      </Modal>
    </div>
  );
};
