/**
 * Document Upload System
 * Handles document file uploads and storage
 */

import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { DocumentUploadRequest } from '../../shared/document-types';
import { documentService } from './document-service';
import { logger } from '../utils/logger';

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

// File filter to validate uploads
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // List of allowed file types
  const allowedFileTypes = [
    // Documents
    '.pdf', '.doc', '.docx', '.txt', '.md', '.rtf',
    // Spreadsheets
    '.xls', '.xlsx', '.csv',
    // Presentations
    '.ppt', '.pptx',
    // Images (if needed)
    '.jpg', '.jpeg', '.png',
    // Other formats
    '.xml', '.html', '.htm'
  ];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedFileTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed types: ${allowedFileTypes.join(', ')}`));
  }
};

// Create multer upload middleware
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  }
});

/**
 * Document upload handler
 * @param req - Express request object with user, file, and document metadata
 * @param res - Express response object
 */
export async function handleDocumentUpload(req: Request, res: Response) {
  const serviceLogger = logger.child('DocumentUploadHandler');
  
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Get current user
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Extract document metadata from request body
    const documentData = req.body as DocumentUploadRequest;
    
    // Validate required fields
    if (!documentData.title) {
      return res.status(400).json({ error: 'Document title is required' });
    }
    
    // Get file information
    const file = req.file;
    const fileExt = path.extname(file.originalname).substring(1);
    
    // Create document record
    const newDocument = {
      title: documentData.title,
      description: documentData.description || '',
      filePath: file.filename,
      fileName: file.originalname,
      fileType: fileExt,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      category: documentData.category || 'other',
      status: documentData.status || 'draft',
      tags: documentData.tags ? documentData.tags.map((tag, index) => ({ 
        id: -(index + 1), // Temporary negative ID, will be replaced by storage
        name: tag 
      })) : [],
      metadata: documentData.metadata || {},
      processingOptions: documentData.processingOptions || {
        extractText: true,
        analyzeContent: true,
        createKnowledgeGraph: false,
        extractEntities: true,
        generateSummary: true,
        identifyRegulations: false,
        performCompliance: false,
        ocrEnabled: true
      },
      createKnowledgeGraph: documentData.processingOptions?.createKnowledgeGraph || false,
      sharingStatus: documentData.sharingStatus || 'private'
    };
    
    // Save document to database
    const savedDocument = await documentService.createDocument(newDocument);
    
    // Start document processing
    documentService.processDocument(savedDocument.id).catch(err => {
      serviceLogger.error(`Background processing error for document ${savedDocument.id}: ${err instanceof Error ? err.message : String(err)}`);
    });
    
    // Return the saved document info
    res.status(201).json(savedDocument);
  } catch (error) {
    serviceLogger.error(`Document upload error: ${error instanceof Error ? error.message : String(error)}`);
    
    // Handle multer errors
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ 
        error: `Upload error: ${error.message}`,
        code: error.code
      });
    }
    
    // Handle other errors
    res.status(500).json({ 
      error: 'Document upload failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}