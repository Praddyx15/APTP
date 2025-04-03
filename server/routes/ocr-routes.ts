import { Express, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../core/logger';
import { performOCR, OCROptions, postProcessAviationOCR } from '../services/ocr-service';

// Set up multer storage for OCR uploads
const ocrStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'ocr');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const originalExtension = path.extname(file.originalname);
    cb(null, `ocr-${uniqueSuffix}${originalExtension}`);
  }
});

// Configure upload middleware
const ocrUpload = multer({
  storage: ocrStorage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check allowed extensions for OCR
    const allowedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tif', '.tiff', '.pdf'
    ];
    
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(null, false);
      // We'll handle the error response in the route handler
    }
  }
});

/**
 * Register OCR-related routes
 */
export function registerOcrRoutes(app: Express) {
  /**
   * Process a file with OCR
   */
  app.post('/api/ocr/process', ocrUpload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Get file information
      const filePath = req.file.path;
      
      // Parse settings from request body
      const settingsSchema = z.object({
        language: z.string().optional().default('eng'),
        detectTables: z.boolean().optional().default(true),
        detectForms: z.boolean().optional().default(false),
        enhanceImage: z.boolean().optional().default(true),
        pageSegmentationMode: z.string().optional().default('auto'),
        confidenceThreshold: z.number().optional().default(60),
      });
      
      // Parse settings from the request
      let settings;
      try {
        settings = settingsSchema.parse(
          req.body.settings ? JSON.parse(req.body.settings) : {}
        );
      } catch (error) {
        logger.warn('Invalid OCR settings', { context: { error, body: req.body } });
        settings = settingsSchema.parse({});
      }
      
      // Map page segmentation mode string to numeric value
      const psmMap: Record<string, number> = {
        'auto': 3,
        'single_column': 4,
        'single_block': 6,
        'single_line': 7,
        'single_word': 8,
        'sparse_text': 11,
        'sparse_text_osd': 12
      };
      
      // Configure OCR options
      const ocrOptions: OCROptions = {
        language: settings.language,
        psm: psmMap[settings.pageSegmentationMode] || 3,
        useScheduler: true,
        workerCount: 2,
      };
      
      // For PDFs, we would need special handling
      const isPdf = req.file.mimetype === 'application/pdf' || path.extname(req.file.originalname).toLowerCase() === '.pdf';
      
      if (isPdf) {
        return res.status(400).json({ 
          error: 'PDF processing is not implemented yet',
          message: 'PDF processing is coming soon. Please upload an image file instead.'
        });
      }
      
      // Perform OCR
      let result = await performOCR(filePath, ocrOptions);
      
      // Apply post-processing for aviation documents
      if (settings.enhanceImage) {
        result = postProcessAviationOCR(result);
      }
      
      // Return results
      res.json({
        text: result.text,
        confidence: result.confidence,
        pageCount: 1, // For images, it's always 1 page
        detectedLanguage: result.language,
        processingTime: result.processingTimeMs / 1000, // Convert to seconds
        words: result.words,
        lines: result.lines,
        // Include tables if detected and requested
        ...(settings.detectTables && result.words.length > 0 ? {
          tables: detectTablesFromLayout(result)
        } : {}),
        // Include forms if detected and requested
        ...(settings.detectForms && result.words.length > 0 ? {
          forms: detectFormsFromLayout(result)
        } : {})
      });
      
      // Clean up file after processing if needed
      // This is optional, you might want to keep files for debugging or for a limited time
      // fs.unlinkSync(filePath);
      
    } catch (error) {
      logger.error('OCR processing error', { context: { error } });
      
      // Clean up file if it was uploaded
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          logger.error('Error deleting file after failed OCR', { context: { error: unlinkError } });
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during OCR processing';
      res.status(500).json({ 
        error: 'OCR processing failed',
        message: errorMessage
      });
    }
  });
  
  /**
   * Get available OCR languages
   */
  app.get('/api/ocr/languages', (req: Request, res: Response) => {
    // Return available OCR languages
    const languages = [
      { value: 'eng', label: 'English' },
      { value: 'fra', label: 'French' },
      { value: 'deu', label: 'German' },
      { value: 'spa', label: 'Spanish' },
      { value: 'ita', label: 'Italian' },
      { value: 'por', label: 'Portuguese' },
      { value: 'rus', label: 'Russian' },
      { value: 'ara', label: 'Arabic' },
      { value: 'chi_sim', label: 'Chinese (Simplified)' },
      { value: 'chi_tra', label: 'Chinese (Traditional)' },
      { value: 'jpn', label: 'Japanese' },
      { value: 'kor', label: 'Korean' }
    ];
    
    res.json(languages);
  });
}

/**
 * Attempt to detect tables from the OCR result layout
 * This is a simplified implementation - in a production environment, 
 * you would use a more sophisticated algorithm
 */
function detectTablesFromLayout(ocrResult: any): any[] {
  // Simple mock implementation for demo purposes
  // In a real application, you would analyze word positions and determine table structures
  
  // If there are fewer than 10 words, probably no tables
  if (!ocrResult.words || ocrResult.words.length < 10) {
    return [];
  }
  
  // Check for table-like structures (grid alignments)
  // This would normally be a complex algorithm analyzing spatial layout
  const wordsByLine = groupWordsByLine(ocrResult.words);
  
  // Look for lines with similar word counts and spacing patterns
  const potentialTableLines = findPotentialTableLines(wordsByLine);
  
  if (potentialTableLines.length >= 3) {
    // We found what looks like a table with at least 3 rows
    const bounds = calculateTableBounds(potentialTableLines);
    
    // Create a simple table representation
    return [{
      boundingBox: [bounds.x0, bounds.y0, bounds.x1, bounds.y1],
      cells: extractTableCells(potentialTableLines)
    }];
  }
  
  return [];
}

/**
 * Group words by their vertical position (line)
 */
function groupWordsByLine(words: any[]): any[][] {
  // Sort words by y-position
  const sortedWords = [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0);
  
  const lines: any[][] = [];
  let currentLine: any[] = [];
  let currentY = sortedWords[0]?.bbox.y0 || 0;
  
  sortedWords.forEach(word => {
    // If this word is on a new line (threshold of 10px)
    if (Math.abs(word.bbox.y0 - currentY) > 10) {
      if (currentLine.length > 0) {
        lines.push([...currentLine].sort((a, b) => a.bbox.x0 - b.bbox.x0));
        currentLine = [];
      }
      currentY = word.bbox.y0;
    }
    
    currentLine.push(word);
  });
  
  // Add the last line
  if (currentLine.length > 0) {
    lines.push([...currentLine].sort((a, b) => a.bbox.x0 - b.bbox.x0));
  }
  
  return lines;
}

/**
 * Find potential table lines by analyzing word positions
 */
function findPotentialTableLines(wordsByLine: any[][]): any[][] {
  // In a real implementation, this would do sophisticated analysis
  // For demo, we'll just look for lines with similar word counts
  
  // Count words per line
  const lineCounts = wordsByLine.map(line => line.length);
  
  // Find the most frequent word count that's at least 2 (potential table columns)
  const countFrequency: Record<number, number> = {};
  lineCounts.forEach(count => {
    if (count >= 2) {
      countFrequency[count] = (countFrequency[count] || 0) + 1;
    }
  });
  
  let mostFrequentCount = 0;
  let highestFrequency = 0;
  
  Object.entries(countFrequency).forEach(([count, frequency]) => {
    if (frequency > highestFrequency) {
      mostFrequentCount = parseInt(count);
      highestFrequency = frequency;
    }
  });
  
  // If we have at least 3 lines with the same number of words, it might be a table
  if (highestFrequency >= 3 && mostFrequentCount >= 2) {
    // Return lines that match the most frequent word count
    return wordsByLine.filter(line => line.length === mostFrequentCount);
  }
  
  return [];
}

/**
 * Calculate the bounding box of a table
 */
function calculateTableBounds(tableLines: any[][]): {x0: number, y0: number, x1: number, y1: number} {
  let x0 = Number.MAX_VALUE;
  let y0 = Number.MAX_VALUE;
  let x1 = Number.MIN_VALUE;
  let y1 = Number.MIN_VALUE;
  
  tableLines.forEach(line => {
    line.forEach(word => {
      x0 = Math.min(x0, word.bbox.x0);
      y0 = Math.min(y0, word.bbox.y0);
      x1 = Math.max(x1, word.bbox.x1);
      y1 = Math.max(y1, word.bbox.y1);
    });
  });
  
  return { x0, y0, x1, y1 };
}

/**
 * Extract cells from table lines
 */
function extractTableCells(tableLines: any[][]): any[][] {
  // This is a simplification - in real implementation, you'd analyze column alignments
  return tableLines.map(line => {
    return line.map(word => ({
      text: word.text,
      confidence: word.confidence
    }));
  });
}

/**
 * Attempt to detect forms from the OCR result layout
 * This is a simplified implementation - in a production environment, 
 * you would use a more sophisticated algorithm
 */
function detectFormsFromLayout(ocrResult: any): any[] {
  // This would normally be a complex algorithm to identify form fields
  // For demo purposes, we'll just look for potential label:value pairs
  
  if (!ocrResult.lines || ocrResult.lines.length < 2) {
    return [];
  }
  
  // Look for lines that might be form field labels
  const potentialFormFields = [];
  
  for (let i = 0; i < ocrResult.lines.length; i++) {
    const line = ocrResult.lines[i];
    const text = line.text.trim();
    
    // If line ends with a colon, it might be a form field label
    if (text.endsWith(':')) {
      const fieldName = text.substring(0, text.length - 1).trim();
      
      // Check if next line could be the value
      const valueText = (i + 1 < ocrResult.lines.length) ? ocrResult.lines[i + 1].text.trim() : '';
      
      potentialFormFields.push({
        name: fieldName,
        value: valueText,
        boundingBox: [
          line.bbox.x0, 
          line.bbox.y0, 
          Math.max(line.bbox.x1, ocrResult.lines[i + 1]?.bbox.x1 || line.bbox.x1),
          (ocrResult.lines[i + 1]?.bbox.y1 || line.bbox.y1)
        ]
      });
    }
  }
  
  if (potentialFormFields.length > 0) {
    return [{
      boundingBox: calculateFormBounds(potentialFormFields),
      fields: potentialFormFields
    }];
  }
  
  return [];
}

/**
 * Calculate the bounding box for a form
 */
function calculateFormBounds(fields: any[]): number[] {
  let x0 = Number.MAX_VALUE;
  let y0 = Number.MAX_VALUE;
  let x1 = Number.MIN_VALUE;
  let y1 = Number.MIN_VALUE;
  
  fields.forEach(field => {
    x0 = Math.min(x0, field.boundingBox[0]);
    y0 = Math.min(y0, field.boundingBox[1]);
    x1 = Math.max(x1, field.boundingBox[2]);
    y1 = Math.max(y1, field.boundingBox[3]);
  });
  
  return [x0, y0, x1, y1];
}