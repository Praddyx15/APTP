/**
 * Session Management Service
 * Handles creating, updating, and retrieving training sessions
 * with real-time notifications to affected users
 */
import { storage } from '../storage';
import { TrainingSession, SessionCreateRequest, SessionUpdateRequest, SessionResponse, SessionsListResponse, SessionResource } from '@shared/session-types';
import { broadcastNotification } from '../notification-service';
import { v4 as uuidv4 } from 'uuid';
import { getPermissions } from '../auth-service';
import { GeneratedSyllabus } from '@shared/syllabus-types';

class SessionService {
  private sessions: TrainingSession[] = [];

  constructor() {
    // Populate with sample data in development
    this.initializeSampleSessions();
  }

  /**
   * Create a new training session
   */
  async createSession(sessionData: SessionCreateRequest, userId: string): Promise<SessionResponse> {
    try {
      // Check if user has permission
      const permissions = getPermissions(userId);
      if (!permissions.canCreate) {
        return {
          success: false,
          message: 'Unauthorized: You do not have permission to create sessions',
          error: 'permission_denied'
        };
      }

      const now = new Date().toISOString();
      
      // Create new session
      const newSession: TrainingSession = {
        id: uuidv4(),
        ...sessionData,
        status: 'scheduled',
        createdBy: userId,
        createdAt: now,
        updatedAt: now
      };
      
      this.sessions.push(newSession);
      
      // Notify all involved users
      this.notifySessionParticipants(newSession, 'created');
      
      return {
        success: true,
        message: 'Session created successfully',
        session: newSession
      };
    } catch (error) {
      console.error('Error creating session:', error);
      return {
        success: false,
        message: 'Failed to create session',
        error: error.message
      };
    }
  }

  /**
   * Update an existing training session
   */
  async updateSession(sessionData: SessionUpdateRequest, userId: string): Promise<SessionResponse> {
    try {
      // Check if user has permission
      const permissions = getPermissions(userId);
      if (!permissions.canUpdate) {
        return {
          success: false,
          message: 'Unauthorized: You do not have permission to update sessions',
          error: 'permission_denied'
        };
      }

      // Find existing session
      const sessionIndex = this.sessions.findIndex(s => s.id === sessionData.id);
      if (sessionIndex === -1) {
        return {
          success: false,
          message: 'Session not found',
          error: 'not_found'
        };
      }

      const existingSession = this.sessions[sessionIndex];
      
      // Update only provided fields
      const updatedSession: TrainingSession = {
        ...existingSession,
        ...sessionData,
        updatedAt: new Date().toISOString()
      };
      
      this.sessions[sessionIndex] = updatedSession;
      
      // Notify all involved users
      this.notifySessionParticipants(updatedSession, 'updated');
      
      return {
        success: true,
        message: 'Session updated successfully',
        session: updatedSession
      };
    } catch (error) {
      console.error('Error updating session:', error);
      return {
        success: false,
        message: 'Failed to update session',
        error: error.message
      };
    }
  }

  /**
   * Delete a session by ID
   */
  async deleteSession(sessionId: string, userId: string): Promise<SessionResponse> {
    try {
      // Check if user has permission
      const permissions = getPermissions(userId);
      if (!permissions.canDelete) {
        return {
          success: false,
          message: 'Unauthorized: You do not have permission to delete sessions',
          error: 'permission_denied'
        };
      }

      // Find existing session
      const sessionIndex = this.sessions.findIndex(s => s.id === sessionId);
      if (sessionIndex === -1) {
        return {
          success: false,
          message: 'Session not found',
          error: 'not_found'
        };
      }

      const sessionToDelete = this.sessions[sessionIndex];
      
      // Remove session
      this.sessions.splice(sessionIndex, 1);
      
      // Notify all involved users
      this.notifySessionParticipants(sessionToDelete, 'deleted');
      
      return {
        success: true,
        message: 'Session deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting session:', error);
      return {
        success: false,
        message: 'Failed to delete session',
        error: error.message
      };
    }
  }

  /**
   * Get session by ID
   */
  async getSessionById(sessionId: string): Promise<TrainingSession | null> {
    const session = this.sessions.find(s => s.id === sessionId);
    return session || null;
  }

  /**
   * Get sessions for a specific trainee
   */
  async getTraineeSessions(traineeId: string): Promise<TrainingSession[]> {
    return this.sessions.filter(session => 
      session.trainees.includes(traineeId)
    );
  }

  /**
   * Get sessions for a specific instructor
   */
  async getInstructorSessions(instructorId: string): Promise<TrainingSession[]> {
    return this.sessions.filter(session => 
      session.instructorId === instructorId
    );
  }

  /**
   * Get all sessions (for admin and ATO users)
   */
  async getAllSessions(filters?: {
    startDate?: string;
    endDate?: string;
    type?: string;
    status?: string;
  }): Promise<TrainingSession[]> {
    let filteredSessions = [...this.sessions];
    
    if (filters) {
      if (filters.startDate) {
        filteredSessions = filteredSessions.filter(s => s.date >= filters.startDate);
      }
      
      if (filters.endDate) {
        filteredSessions = filteredSessions.filter(s => s.date <= filters.endDate);
      }
      
      if (filters.type) {
        filteredSessions = filteredSessions.filter(s => s.type === filters.type);
      }
      
      if (filters.status) {
        filteredSessions = filteredSessions.filter(s => s.status === filters.status);
      }
    }
    
    return filteredSessions;
  }

  /**
   * Get upcoming sessions for a dashboard
   */
  async getUpcomingSessions(userId: string, role: string): Promise<TrainingSession[]> {
    const today = new Date().toISOString().split('T')[0];
    
    if (role === 'admin' || role === 'ato' || role === 'airline') {
      // Get all upcoming sessions
      return this.sessions.filter(s => 
        s.date >= today && 
        (s.status === 'scheduled' || s.status === 'confirmed')
      ).slice(0, 5); // Limit to 5 for dashboard
    } else if (role === 'instructor') {
      // Get instructor's upcoming sessions
      return this.sessions.filter(s => 
        s.instructorId === userId && 
        s.date >= today && 
        (s.status === 'scheduled' || s.status === 'confirmed')
      );
    } else if (role === 'trainee') {
      // Get trainee's upcoming sessions
      return this.sessions.filter(s => 
        s.trainees.includes(userId) && 
        s.date >= today && 
        (s.status === 'scheduled' || s.status === 'confirmed')
      );
    }
    
    return [];
  }

  /**
   * Check resource availability for scheduling
   */
  async checkResourceAvailability(
    resourceIds: string[], 
    date: string, 
    startTime: string, 
    endTime: string
  ): Promise<boolean> {
    // Implementation would check each resource for the specified time slot
    // This is a simplified version
    return true;
  }

  /**
   * Notify all participants of session changes via WebSocket
   */
  private notifySessionParticipants(session: TrainingSession, action: 'created' | 'updated' | 'deleted') {
    // Notify instructor
    broadcastNotification(`user:${session.instructorId}`, {
      type: 'session',
      action,
      data: session,
      timestamp: new Date().toISOString()
    });
    
    // Notify all trainees
    session.trainees.forEach(traineeId => {
      broadcastNotification(`user:${traineeId}`, {
        type: 'session',
        action,
        data: session,
        timestamp: new Date().toISOString()
      });
    });
    
    // Notify organization
    if (session.organizationId) {
      broadcastNotification(`org:${session.organizationId}`, {
        type: 'session',
        action,
        data: session,
        timestamp: new Date().toISOString()
      });
    }
    
    // For created/deleted sessions, also broadcast to admin role
    if (action === 'created' || action === 'deleted') {
      broadcastNotification('role:admin', {
        type: 'session',
        action,
        data: session,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Initialize with sample data (for development only)
   */
  private initializeSampleSessions() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Day after tomorrow
    const dayAfter = new Date();
    dayAfter.setDate(now.getDate() + 2);
    const dayAfterStr = dayAfter.toISOString().split('T')[0];
    
    // Next week
    const nextWeek = new Date();
    nextWeek.setDate(now.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];
    
    this.sessions = [
      {
        id: 'sess-001',
        title: 'B737 Simulator Training',
        description: 'Emergency procedures and systems failures handling',
        date: today,
        startTime: '14:00',
        endTime: '17:00',
        location: 'Simulator Bay 3',
        type: 'simulator',
        status: 'confirmed',
        trainees: ['ST1001', 'ST1002'],
        instructorId: 'INS1001',
        resourceIds: ['SIM003'],
        createdBy: 'INS1001',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: 'sess-002',
        title: 'Emergency Procedures Classroom',
        description: 'Review of emergency checklists and procedures',
        date: tomorrowStr,
        startTime: '09:00',
        endTime: '12:00',
        location: 'Room 201',
        type: 'classroom',
        status: 'confirmed',
        trainees: ['ST1001', 'ST1002', 'ST1003', 'ST1004'],
        instructorId: 'INS1001',
        createdBy: 'INS1001',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: 'sess-003',
        title: 'Cross-Country Flight Planning',
        description: 'Planning session for upcoming cross-country flight',
        date: dayAfterStr,
        startTime: '13:00',
        endTime: '15:00',
        location: 'Briefing Room 2',
        type: 'briefing',
        status: 'scheduled',
        trainees: ['ST1003'],
        instructorId: 'INS1001',
        createdBy: 'INS1001',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: 'sess-004',
        title: 'Cross-Country Flight',
        description: 'Practical cross-country flight training',
        date: nextWeekStr,
        startTime: '10:00',
        endTime: '16:00',
        location: 'C172 (N5078A)',
        type: 'flight',
        status: 'scheduled',
        trainees: ['ST1003'],
        instructorId: 'INS1002',
        resourceIds: ['AC5078A'],
        createdBy: 'INS1002',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      },
      {
        id: 'sess-005',
        title: 'CPL Checkride Examination',
        description: 'Commercial Pilot License practical examination',
        date: nextWeekStr,
        startTime: '09:00',
        endTime: '13:00',
        location: 'C172 (N5078A)',
        type: 'examination',
        status: 'scheduled',
        trainees: ['ST1005'],
        instructorId: 'INS1003',
        resourceIds: ['AC5078A'],
        createdBy: 'INS1003',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }
    ];
  }
}

export const sessionService = new SessionService();