import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { logger } from '../core/logger';

/**
 * Register flight record routes
 */
export function registerFlightRecordRoutes(app: Express) {
  /**
   * Get flight records for a user
   */
  app.get('/api/protected/flight-records', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get flight records
      const records = await storage.getUserFlightRecords(req.user.id);
      
      res.json(records);
    } catch (error) {
      logger.error('Error fetching flight records', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch flight records' });
    }
  });

  /**
   * Get flight record by ID
   */
  app.get('/api/protected/flight-records/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const recordId = parseInt(req.params.id);
      const record = await storage.getFlightRecord(recordId);
      
      if (!record) {
        return res.status(404).json({ error: 'Flight record not found' });
      }
      
      // Check if record belongs to user or user is instructor/examiner/admin
      if (record.pilotId !== req.user.id && 
          record.instructorId !== req.user.id &&
          req.user.role !== 'admin' &&
          req.user.role !== 'examiner') {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      res.json(record);
    } catch (error) {
      logger.error('Error fetching flight record', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch flight record' });
    }
  });

  /**
   * Create flight record
   */
  app.post('/api/protected/flight-records', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Validate flight record data
      const flightRecordSchema = z.object({
        date: z.string(), // ISO date string
        aircraftType: z.string(),
        aircraftRegistration: z.string(),
        departure: z.string(),
        destination: z.string(),
        blockTime: z.number(),
        flightTime: z.number(),
        pilotInCommand: z.boolean().optional(),
        dualTime: z.number().optional(),
        instructorId: z.number().optional(),
        picTime: z.number().optional(),
        nightTime: z.number().optional(),
        ifrTime: z.number().optional(),
        crossCountryTime: z.number().optional(),
        landings: z.number().optional(),
        remarks: z.string().optional(),
        sessionId: z.number().optional(),
        conditions: z.string().optional(),
        route: z.string().optional(),
        simulatorTime: z.number().optional(),
        isSimulator: z.boolean().optional(),
      });
      
      const flightRecordData = flightRecordSchema.parse({
        ...req.body,
        pilotId: req.user.id,
      });
      
      // Create flight record
      const record = await storage.createFlightRecord({
        ...flightRecordData,
        pilotId: req.user.id,
      });
      
      res.status(201).json(record);
    } catch (error) {
      logger.error('Error creating flight record', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid flight record data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to create flight record' });
    }
  });

  /**
   * Update flight record
   */
  app.put('/api/protected/flight-records/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const recordId = parseInt(req.params.id);
      const record = await storage.getFlightRecord(recordId);
      
      if (!record) {
        return res.status(404).json({ error: 'Flight record not found' });
      }
      
      // Check if record belongs to user or user is admin
      if (record.pilotId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      // Update flight record
      const updatedRecord = await storage.updateFlightRecord(recordId, req.body);
      
      res.json(updatedRecord);
    } catch (error) {
      logger.error('Error updating flight record', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid flight record data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to update flight record' });
    }
  });

  /**
   * Delete flight record
   */
  app.delete('/api/protected/flight-records/:id', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const recordId = parseInt(req.params.id);
      const record = await storage.getFlightRecord(recordId);
      
      if (!record) {
        return res.status(404).json({ error: 'Flight record not found' });
      }
      
      // Check if record belongs to user or user is admin
      if (record.pilotId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied' });
      }
      
      // Delete flight record
      await storage.deleteFlightRecord(recordId);
      
      res.status(204).send();
    } catch (error) {
      logger.error('Error deleting flight record', { context: { error } });
      res.status(500).json({ error: 'Failed to delete flight record' });
    }
  });

  /**
   * Get flight record totals for user
   */
  app.get('/api/protected/flight-record-totals', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get flight record totals
      const totals = await storage.getUserFlightRecordTotals(req.user.id);
      
      res.json(totals);
    } catch (error) {
      logger.error('Error fetching flight record totals', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch flight record totals' });
    }
  });

  /**
   * Get flight record statistics
   */
  app.get('/api/protected/flight-record-statistics', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Parse query parameters
      const period = req.query.period as string || 'all'; // all, month, year
      const groupBy = req.query.groupBy as string || 'month'; // day, week, month, year, aircraft
      
      // Get flight record statistics
      const statistics = await storage.getUserFlightRecordStatistics(req.user.id, period, groupBy);
      
      res.json(statistics);
    } catch (error) {
      logger.error('Error fetching flight record statistics', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch flight record statistics' });
    }
  });

  /**
   * Import flight records from CSV
   */
  app.post('/api/protected/flight-records/import', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Validate import data
      const importSchema = z.object({
        records: z.array(z.object({
          date: z.string(),
          aircraftType: z.string(),
          aircraftRegistration: z.string(),
          departure: z.string(),
          destination: z.string(),
          blockTime: z.number(),
          flightTime: z.number(),
          picTime: z.number().optional(),
          dualTime: z.number().optional(),
          nightTime: z.number().optional(),
          ifrTime: z.number().optional(),
          landings: z.number().optional(),
          remarks: z.string().optional(),
        })),
      });
      
      const { records } = importSchema.parse(req.body);
      
      // Import records
      const results = await Promise.all(
        records.map(async (record) => {
          try {
            const savedRecord = await storage.createFlightRecord({
              ...record,
              pilotId: req.user?.id,
            });
            return { success: true, record: savedRecord };
          } catch (error) {
            return { success: false, error: (error as Error).message, record };
          }
        })
      );
      
      res.json({
        success: true,
        totalCount: records.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
        failures: results.filter(r => !r.success),
      });
    } catch (error) {
      logger.error('Error importing flight records', { context: { error } });
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid import data', details: error.errors });
      }
      
      res.status(500).json({ error: 'Failed to import flight records' });
    }
  });

  /**
   * Export flight records to CSV
   */
  app.get('/api/protected/flight-records/export', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get flight records
      const records = await storage.getUserFlightRecords(req.user.id);
      
      // Format as CSV
      const header = 'Date,Aircraft Type,Registration,From,To,Block Time,Flight Time,PIC Time,Dual Time,Night Time,IFR Time,Landings,Remarks\n';
      const rows = records.map(record => {
        return [
          record.date,
          record.aircraftType,
          record.aircraftRegistration,
          record.departure,
          record.destination,
          record.blockTime,
          record.flightTime,
          record.picTime || 0,
          record.dualTime || 0,
          record.nightTime || 0,
          record.ifrTime || 0,
          record.landings || 0,
          `"${record.remarks || ''}"`
        ].join(',');
      }).join('\n');
      
      const csv = header + rows;
      
      // Set headers for file download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="flight_records_${req.user.id}.csv"`);
      
      res.send(csv);
    } catch (error) {
      logger.error('Error exporting flight records', { context: { error } });
      res.status(500).json({ error: 'Failed to export flight records' });
    }
  });

  /**
   * Verify flight record (by instructor or examiner)
   */
  app.put('/api/protected/flight-records/:id/verify', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Validate that user is an instructor or examiner
      if (req.user.role !== 'instructor' && req.user.role !== 'examiner' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied. Only instructors and examiners can verify flight records.' });
      }
      
      const recordId = parseInt(req.params.id);
      const record = await storage.getFlightRecord(recordId);
      
      if (!record) {
        return res.status(404).json({ error: 'Flight record not found' });
      }
      
      // Verify flight record
      const verifiedRecord = await storage.verifyFlightRecord(recordId, req.user.id);
      
      res.json(verifiedRecord);
    } catch (error) {
      logger.error('Error verifying flight record', { context: { error } });
      res.status(500).json({ error: 'Failed to verify flight record' });
    }
  });

  /**
   * Get a user's recent aircraft types
   */
  app.get('/api/protected/recent-aircraft-types', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get recent aircraft types
      const aircraftTypes = await storage.getUserRecentAircraftTypes(req.user.id);
      
      res.json(aircraftTypes);
    } catch (error) {
      logger.error('Error fetching recent aircraft types', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch recent aircraft types' });
    }
  });

  /**
   * Get a user's recent airports
   */
  app.get('/api/protected/recent-airports', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Get recent airports
      const airports = await storage.getUserRecentAirports(req.user.id);
      
      res.json(airports);
    } catch (error) {
      logger.error('Error fetching recent airports', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch recent airports' });
    }
  });

  /**
   * Get trainee flight records (for instructors/examiners)
   */
  app.get('/api/protected/trainees/:id/flight-records', async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Validate that user is an instructor or examiner
      if (req.user.role !== 'instructor' && req.user.role !== 'examiner' && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Permission denied. Only instructors and examiners can view trainee flight records.' });
      }
      
      const traineeId = parseInt(req.params.id);
      const trainee = await storage.getUser(traineeId);
      
      if (!trainee) {
        return res.status(404).json({ error: 'Trainee not found' });
      }
      
      // Get flight records
      const records = await storage.getUserFlightRecords(traineeId);
      
      res.json(records);
    } catch (error) {
      logger.error('Error fetching trainee flight records', { context: { error } });
      res.status(500).json({ error: 'Failed to fetch trainee flight records' });
    }
  });
}