/**
 * Session Plan Utilities
 * 
 * Utility functions for working with session plans
 */

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
    const day = currentDate.getDay();
    if (day !== 0 && day !== 6) {
      days.push(currentDate.toISOString().split('T')[0]);
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return days;
}