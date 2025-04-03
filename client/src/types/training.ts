export interface TrainingSession {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  type: string;
  description?: string;
  trainees: string[];
  instructorId: string;
  resourceIds?: string[];
  status: string;
  notes?: string;
}

export type SessionType = 'classroom' | 'simulator' | 'flight' | 'briefing';
export type SessionStatus = 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
export type SessionTab = 'upcoming' | 'create';