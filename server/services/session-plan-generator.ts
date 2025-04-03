import { storage } from '../storage.js';
import { documentService } from './document-service.js';
import { Logger } from '../utils/logger.js';

/**
 * Session Plan Generator Service
 * Generates training session plans based on syllabus content and user preferences
 */
export class SessionPlanGeneratorService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('SessionPlanGeneratorService');
  }

  /**
   * Generate a session plan based on a syllabus and settings
   * @param userId - User ID generating the plan
   * @param syllabusId - Syllabus ID to base the plan on
   * @param settings - Session plan generation settings
   * @returns The generated session plan
   */
  public async generateSessionPlan(
    userId: number,
    syllabusId: number,
    settings: {
      title: string;
      description?: string;
      templateId?: string;
      startDate: Date;
      endDate: Date;
      dailyStartTime: string;
      dailyEndTime: string;
      maxSessionsPerDay: number;
      includeLunchBreaks: boolean;
      includeRecapSessions: boolean;
      resourceAllocation: {
        instructors: string[];
        rooms: string[];
        equipment: string[];
      };
      additionalNotes?: string;
    }
  ) {
    try {
      this.logger.info(`Generating session plan for syllabus ${syllabusId}`);

      // For now this is a basic implementation
      // In real application, this would do more sophisticated planning based on
      // the knowledge graph and syllabus units

      // Calculate training days (excluding weekends)
      const trainingDays = this.calculateTrainingDays(
        settings.startDate,
        settings.endDate
      );

      const sessionPlan = {
        id: Date.now(), // Placeholder ID
        title: settings.title,
        description: settings.description || '',
        syllabusId,
        createdById: userId,
        startDate: settings.startDate,
        endDate: settings.endDate,
        dailyStartTime: settings.dailyStartTime,
        dailyEndTime: settings.dailyEndTime,
        resourceAllocation: settings.resourceAllocation,
        sessions: this.generateSessions(
          trainingDays,
          settings.dailyStartTime,
          settings.dailyEndTime,
          settings.maxSessionsPerDay,
          settings.includeLunchBreaks,
          settings.includeRecapSessions,
          settings.resourceAllocation
        ),
        createdAt: new Date(),
        status: 'draft',
      };

      return sessionPlan;
    } catch (error) {
      this.logger.error(`Error generating session plan: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Calculate training days between two dates, excluding weekends
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of training days
   */
  private calculateTrainingDays(startDate: Date, endDate: Date): Date[] {
    const days: Date[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days.push(new Date(currentDate));
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  }

  /**
   * Generate training sessions
   * @param days - Training days
   * @param startTime - Daily start time
   * @param endTime - Daily end time
   * @param maxSessionsPerDay - Maximum sessions per day
   * @param includeLunchBreaks - Whether to include lunch breaks
   * @param includeRecapSessions - Whether to include recap sessions
   * @param resourceAllocation - Resource allocation settings
   * @returns Generated sessions
   */
  private generateSessions(
    days: Date[],
    startTime: string,
    endTime: string,
    maxSessionsPerDay: number,
    includeLunchBreaks: boolean,
    includeRecapSessions: boolean,
    resourceAllocation: {
      instructors: string[];
      rooms: string[];
      equipment: string[];
    }
  ) {
    const sessions: any[] = [];

    // Parse time strings to get hours and minutes
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    // Calculate total minutes in a day
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    const totalMinutes = endTotalMinutes - startTotalMinutes;

    // Standard session and break durations
    const sessionDuration = 90; // minutes
    const breakDuration = 15; // minutes
    const lunchDuration = 60; // minutes

    // Calculate how many sessions we can fit in a day
    let availableSessions = maxSessionsPerDay;
    let totalSessionsAndBreaksTime = (sessionDuration * availableSessions) +
      (breakDuration * (availableSessions - 1));
    
    if (includeLunchBreaks) {
      totalSessionsAndBreaksTime += lunchDuration;
    }

    // Adjust if we're trying to fit too much
    while (totalSessionsAndBreaksTime > totalMinutes && availableSessions > 1) {
      availableSessions--;
      totalSessionsAndBreaksTime = (sessionDuration * availableSessions) +
        (breakDuration * (availableSessions - 1));
      
      if (includeLunchBreaks) {
        totalSessionsAndBreaksTime += lunchDuration;
      }
    }

    // Generate sessions for each day
    let sessionId = 1;
    for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
      const day = days[dayIndex];
      const isFirstDay = dayIndex === 0;
      const isLastDay = dayIndex === days.length - 1;
      
      // Calculate sessions for this day
      let currentMinutes = startTotalMinutes;
      let sessionsForDay = availableSessions;
      
      // Add introduction session on first day
      if (isFirstDay) {
        const sessionStart = new Date(day);
        sessionStart.setHours(Math.floor(currentMinutes / 60));
        sessionStart.setMinutes(currentMinutes % 60);
        
        const sessionEnd = new Date(day);
        sessionEnd.setHours(Math.floor((currentMinutes + sessionDuration) / 60));
        sessionEnd.setMinutes((currentMinutes + sessionDuration) % 60);
        
        sessions.push({
          id: sessionId++,
          title: 'Course Introduction',
          type: 'introduction',
          startTime: sessionStart,
          endTime: sessionEnd,
          instructorId: this.getInstructor(resourceAllocation.instructors, 0),
          location: this.getRoom(resourceAllocation.rooms, 0),
          equipment: this.getEquipment(resourceAllocation.equipment, 0),
          status: 'scheduled'
        });
        
        currentMinutes += sessionDuration + breakDuration;
        sessionsForDay--;
      }
      
      // Add regular sessions
      let sessionCount = 0;
      while (sessionCount < sessionsForDay) {
        // Add lunch break if needed
        if (includeLunchBreaks && sessionCount === Math.floor(sessionsForDay / 2)) {
          currentMinutes += lunchDuration;
        }
        
        const sessionStart = new Date(day);
        sessionStart.setHours(Math.floor(currentMinutes / 60));
        sessionStart.setMinutes(currentMinutes % 60);
        
        const sessionEnd = new Date(day);
        sessionEnd.setHours(Math.floor((currentMinutes + sessionDuration) / 60));
        sessionEnd.setMinutes((currentMinutes + sessionDuration) % 60);
        
        // Determine session type
        let sessionType = 'standard';
        let sessionTitle = `Training Session ${sessionId - 1}`;
        
        if (includeRecapSessions && sessionCount === 0 && !isFirstDay) {
          sessionType = 'recap';
          sessionTitle = 'Daily Recap and Review';
        } else if (isLastDay && sessionCount === sessionsForDay - 1) {
          sessionType = 'assessment';
          sessionTitle = 'Final Assessment';
        }
        
        sessions.push({
          id: sessionId++,
          title: sessionTitle,
          type: sessionType,
          startTime: sessionStart,
          endTime: sessionEnd,
          instructorId: this.getInstructor(resourceAllocation.instructors, sessionCount),
          location: this.getRoom(resourceAllocation.rooms, sessionCount),
          equipment: this.getEquipment(resourceAllocation.equipment, sessionCount % resourceAllocation.equipment.length),
          status: 'scheduled'
        });
        
        currentMinutes += sessionDuration;
        if (sessionCount < sessionsForDay - 1) {
          currentMinutes += breakDuration;
        }
        
        sessionCount++;
      }
    }

    return sessions;
  }

  /**
   * Get instructor from resource pool with rotation
   * @param instructors - List of instructors
   * @param index - Current index
   * @returns Instructor name
   */
  private getInstructor(instructors: string[], index: number): string {
    if (!instructors || instructors.length === 0) return 'Unassigned';
    return instructors[index % instructors.length];
  }

  /**
   * Get room from resource pool with rotation
   * @param rooms - List of rooms
   * @param index - Current index
   * @returns Room name
   */
  private getRoom(rooms: string[], index: number): string {
    if (!rooms || rooms.length === 0) return 'Unassigned';
    return rooms[index % rooms.length];
  }

  /**
   * Get equipment from resource pool
   * @param equipment - List of equipment
   * @param index - Current index
   * @returns Equipment list
   */
  private getEquipment(equipment: string[], index: number): string[] {
    if (!equipment || equipment.length === 0) return [];
    
    // Return a subset of equipment based on index
    const count = Math.min(3, equipment.length);
    const startIndex = index % equipment.length;
    
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      const equipIndex = (startIndex + i) % equipment.length;
      result.push(equipment[equipIndex]);
    }
    
    return result;
  }
}

// Export singleton instance
export const sessionPlanGeneratorService = new SessionPlanGeneratorService();
