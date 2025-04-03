/**
 * Document management API routes
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { documentService } from '../services/document-service.js';
import { knowledgeGraphService } from '../services/knowledge-graph-service.js';
import { DocumentUploadRequest, DocumentUpdateRequest } from '../shared/document-types.js';
import { logger } from '../utils/logger.js';

// Create router
const router = Router();
const serviceLogger = logger.child('DocumentRoutes');

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
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  }
});

// Authentication middleware
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// GET /api/documents - Get all documents
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const sortBy = req.query.sortBy as string || 'uploadedAt';
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';
    const filterByType = req.query.filterByType as string;
    const filterByUploadedBy = req.user?.id;
    
    const documents = await documentService.getAllDocuments({
      limit,
      offset,
      sortBy,
      sortOrder,
      filterByType,
      filterByUploadedBy
    });
    
    const total = await documentService.countDocuments({
      filterByType,
      filterByUploadedBy
    });
    
    res.json({
      documents,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + documents.length < total
      }
    });
  } catch (error) {
    serviceLogger.error(`Error in GET /documents: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/documents/:id - Get document by ID
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }
    
    const document = await documentService.getDocument(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    res.json(document);
  } catch (error) {
    serviceLogger.error(`Error in GET /documents/:id: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/documents - Upload a new document
router.post('/', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
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
    serviceLogger.error(`Error in POST /documents: ${error instanceof Error ? error.message : String(error)}`);
    
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
});

// PUT /api/documents/:id - Update document metadata
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }
    
    // Get current document
    const existingDocument = await documentService.getDocument(id);
    if (!existingDocument) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check ownership or permissions
    if (existingDocument.uploadedBy !== req.user?.id) {
      // In a real app, we would check if user has edit permissions
      return res.status(403).json({ error: 'Not authorized to update this document' });
    }
    
    // Extract update data
    const updateData = req.body as DocumentUpdateRequest;
    
    // Update document
    const updatedDocument = await documentService.updateDocument(id, updateData);
    
    res.json(updatedDocument);
  } catch (error) {
    serviceLogger.error(`Error in PUT /documents/:id: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/documents/:id - Delete document
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }
    
    // Get current document
    const existingDocument = await documentService.getDocument(id);
    if (!existingDocument) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check ownership or permissions
    if (existingDocument.uploadedBy !== req.user?.id) {
      // In a real app, we would check if user has delete permissions
      return res.status(403).json({ error: 'Not authorized to delete this document' });
    }
    
    // Delete document
    const success = await documentService.deleteDocument(id);
    
    if (success) {
      res.status(204).end();
    } else {
      res.status(500).json({ error: 'Failed to delete document' });
    }
  } catch (error) {
    serviceLogger.error(`Error in DELETE /documents/:id: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/documents/:id/process - Process document
router.post('/:id/process', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }
    
    // Get current document
    const existingDocument = await documentService.getDocument(id);
    if (!existingDocument) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check ownership or permissions
    if (existingDocument.uploadedBy !== req.user?.id) {
      // In a real app, we would check if user has process permissions
      return res.status(403).json({ error: 'Not authorized to process this document' });
    }
    
    // Process document
    const success = await documentService.processDocument(id);
    
    if (success) {
      res.json({ status: 'processing' });
    } else {
      res.status(500).json({ error: 'Failed to start document processing' });
    }
  } catch (error) {
    serviceLogger.error(`Error in POST /documents/:id/process: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/documents/:id/download - Download document file
router.get('/:id/download', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }
    
    // Get document download info
    const downloadInfo = await documentService.downloadDocument(id);
    if (!downloadInfo) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', downloadInfo.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadInfo.fileName}"`);
    
    // Send file
    res.sendFile(downloadInfo.filePath);
  } catch (error) {
    serviceLogger.error(`Error in GET /documents/:id/download: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/documents/:id/content - Get document extracted content
router.get('/:id/content', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }
    
    // Get document
    const document = await documentService.getDocument(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Get document content
    const content = await documentService.getDocumentContent(id);
    if (!content) {
      return res.status(404).json({ error: 'Document content not found' });
    }
    
    res.json(content);
  } catch (error) {
    serviceLogger.error(`Error in GET /documents/:id/content: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/documents/:id/knowledge-graph - Generate knowledge graph
router.post('/:id/knowledge-graph', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }
    
    // Get document
    const document = await documentService.getDocument(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Get document content
    const content = await documentService.getDocumentContent(id);
    if (!content || !content.extractedText) {
      return res.status(400).json({ error: 'Document has not been processed yet' });
    }
    
    // Generate knowledge graph
    const graph = await knowledgeGraphService.createFromDocument(id, content.extractedText);
    
    // Update document with knowledge graph ID
    await documentService.updateDocument(id, {
      knowledgeGraphGenerated: true,
      knowledgeGraphId: graph.id
    });
    
    res.json({
      graphId: graph.id,
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length
    });
  } catch (error) {
    serviceLogger.error(`Error in POST /documents/:id/knowledge-graph: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/documents/:id/knowledge-graph - Get document knowledge graph
router.get('/:id/knowledge-graph', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }
    
    // Get document
    const document = await documentService.getDocument(id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check if knowledge graph exists
    if (!document.knowledgeGraphId) {
      return res.status(404).json({ error: 'Knowledge graph not found for this document' });
    }
    
    // Get knowledge graph
    const graph = await knowledgeGraphService.getKnowledgeGraph(document.knowledgeGraphId);
    if (!graph) {
      return res.status(404).json({ error: 'Knowledge graph not found' });
    }
    
    res.json(graph);
  } catch (error) {
    serviceLogger.error(`Error in GET /documents/:id/knowledge-graph: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
