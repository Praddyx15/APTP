/**
 * Session Utilities
 * 
 * Helper functions for working with training sessions
 */

import { TrainingSession, SessionType } from '@shared/session-types';

/**
 * Calculate training days between start and end dates
 * @param startDate Start date (ISO string)
 * @param endDate End date (ISO string)
 * @returns Array of date strings (ISO)
 */
export function calculateTrainingDays(startDate: string, endDate: string): string[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const days: string[] = [];
  const currentDate = new Date(start);
  
  // Include all days between start and end (inclusive)
  while (currentDate <= end) {
    // Skip weekends (0 = Sunday, 6 = Saturday)
    // In a real implementation, you'd check against organization working days
    const day = currentDate.getDay();
    if (day !== 0 && day !== 6) {
      days.push(currentDate.toISOString().split('T')[0]);
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return days;
}

/**
 * Calculate daily session slots
 * @param startTime Day start time
 * @param endTime Day end time
 * @param maxSessions Maximum sessions per day
 * @param includeLunch Whether to include lunch break
 * @returns Array of slot objects
 */
export function calculateDailySlots(
  startTime: string,
  endTime: string,
  maxSessions: number,
  includeLunch: boolean
): Array<{ startTime: string, endTime: string, type: 'session' | 'break' }> {
  // Parse start and end times
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  // Calculate total minutes available
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  const totalMinutes = endMinutes - startMinutes;
  
  // Determine break details
  const hasLunch = includeLunch && totalMinutes >= 240; // Only include lunch if day is >= 4 hours
  const lunchDuration = 60; // 1 hour lunch
  const lunchStart = Math.floor((startMinutes + endMinutes) / 2) - lunchDuration / 2;
  
  // Calculate session duration
  let sessionDuration: number;
  if (hasLunch) {
    const availableMinutes = totalMinutes - lunchDuration;
    sessionDuration = Math.floor(availableMinutes / maxSessions);
  } else {
    sessionDuration = Math.floor(totalMinutes / maxSessions);
  }
  
  // Ensure session duration is reasonable (minimum 30 minutes, round to nearest 15)
  sessionDuration = Math.max(30, Math.round(sessionDuration / 15) * 15);
  
  // Create slots
  const slots: Array<{ startTime: string, endTime: string, type: 'session' | 'break' }> = [];
  let currentMinute = startMinutes;
  
  for (let i = 0; i < maxSessions; i++) {
    // Check if we need to insert lunch break
    if (hasLunch && currentMinute <= lunchStart && currentMinute + sessionDuration > lunchStart) {
      // Add lunch break
      slots.push({
        startTime: minutesToTimeString(lunchStart),
        endTime: minutesToTimeString(lunchStart + lunchDuration),
        type: 'break'
      });
      
      currentMinute = lunchStart + lunchDuration;
    }
    
    // Check if we have enough time for another session
    if (currentMinute + sessionDuration <= endMinutes) {
      slots.push({
        startTime: minutesToTimeString(currentMinute),
        endTime: minutesToTimeString(currentMinute + sessionDuration),
        type: 'session'
      });
      
      currentMinute += sessionDuration;
    }
  }
  
  return slots.filter(slot => slot.type === 'session');
}

/**
 * Convert minutes to time string (HH:MM)
 * @param minutes Minutes since midnight
 * @returns Time string in HH:MM format
 */
export function minutesToTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Determine session type based on day and slot
 * @param dayIndex Day index (0-based)
 * @param slotIndex Slot index (0-based)
 * @param totalDays Total number of training days
 * @returns Session type
 */
export function determineSessionType(dayIndex: number, slotIndex: number, totalDays: number): SessionType {
  // In a real implementation, this would follow a logical progression based on syllabus
  const dayProgress = dayIndex / totalDays; // 0-1 representing progress through course
  
  if (dayProgress < 0.3) {
    // Early days: classroom and briefing
    return slotIndex % 2 === 0 ? 'classroom' : 'briefing';
  } else if (dayProgress < 0.7) {
    // Middle days: simulator and debriefing
    return slotIndex % 2 === 0 ? 'simulator' : 'debriefing';
  } else if (dayProgress < 0.9) {
    // Later days: flight sessions
    return 'flight';
  } else {
    // Final days: assessments and examinations
    return dayProgress > 0.95 ? 'examination' : 'assessment';
  }
}