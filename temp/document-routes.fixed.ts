import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { DocumentService } from '../services/document-service';
import { DocumentAnalysisService } from '../services/document-analysis-service';
import { isAuthenticated } from '../middleware/auth-middleware';
import { Logger } from '../utils/logger';

// Define authenticateUser as an alias to isAuthenticated for consistency in routes
const authenticateUser = isAuthenticated;

const router = Router();
const logger = new Logger('DocumentRoutes');

// Configure multer for file uploads with memory storage
const storage = multer.memoryStorage();

// Configure file filter to only allow specific document types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/plain',
    'text/markdown'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOCX, DOC, Excel, and text files are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  }
});

// Services
const documentService = new DocumentService();
const documentAnalysisService = new DocumentAnalysisService();

/**
 * @route POST /api/documents
 * @desc Upload a new document
 * @access Private
 */
router.post('/', authenticateUser, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    const { title, description, createKnowledgeGraph } = req.body;
    const createKnowledgeGraphBool = createKnowledgeGraph === 'true' || createKnowledgeGraph === true;
    
    // Determine file type
    const mimeTypeMap: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.ms-excel': 'xls',
      'text/plain': 'txt',
      'text/markdown': 'md'
    };
    
    // Create document record
    const document = await documentService.createDocument({
      title: title || req.file.originalname,
      description,
      fileType: mimeTypeMap[req.file.mimetype] || 'unknown',
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadedById: req.user!.id,
      uploadedByRole: req.user!.role,
      createKnowledgeGraph: createKnowledgeGraphBool,
      processingStatus: 'pending',
      url: '', // Will be updated after file is saved
      filePath: '', // Will be updated after file is saved
      isProcessed: false
    });

    // Save uploaded file
    const filePath = await documentService.saveUploadedFile(req.file, document.id);
    
    // Update document with file path
    await documentService.updateDocument(document.id, {
      filePath,
      url: `/api/documents/${document.id}/download`
    });

    // If knowledge graph creation is requested, queue the document for processing
    if (createKnowledgeGraphBool) {
      // Process the document asynchronously
      processDocumentAsync(document.id);
    }

    return res.status(201).json({
      success: true,
      document: {
        ...document,
        filePath, // Include updated file path
        url: `/api/documents/${document.id}/download`
      },
      message: 'Document uploaded successfully'
    });
  } catch (error) {
    logger.error(`Failed to upload document: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload document',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Process document asynchronously to generate knowledge graph
 * @param documentId - Document ID to process
 */
async function processDocumentAsync(documentId: number): Promise<void> {
  try {
    // Start processing in background
    documentAnalysisService.processDocument(documentId.toString())
      .then(success => {
        if (success) {
          logger.info(`Document ${documentId} processed successfully`);
        } else {
          logger.error(`Failed to process document ${documentId}`);
        }
      })
      .catch(error => {
        logger.error(`Error processing document ${documentId}: ${error instanceof Error ? error.message : String(error)}`);
      });
  } catch (error) {
    logger.error(`Failed to start document processing: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * @route GET /api/documents
 * @desc Get all documents
 * @access Private
 */
router.get('/', authenticateUser, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    
    const result = await documentService.getDocuments(req.user!.id, page, pageSize);
    
    return res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    logger.error(`Failed to retrieve documents: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve documents',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/documents/:id
 * @desc Get document by ID
 * @access Private
 */
router.get('/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const document = await documentService.getDocumentById(req.params.id, req.user!.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      document
    });
  } catch (error) {
    logger.error(`Failed to retrieve document: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve document',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/documents/:id/content
 * @desc Get document content and structure
 * @access Private
 */
router.get('/:id/content', authenticateUser, async (req: Request, res: Response) => {
  try {
    // First verify document ownership
    const document = await documentService.getDocumentById(req.params.id, req.user!.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Get content
    const content = await documentService.getDocumentContent(req.params.id);
    
    return res.status(200).json(content);
  } catch (error) {
    logger.error(`Failed to retrieve document content: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve document content',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/documents/:id/download
 * @desc Download original document
 * @access Private
 */
router.get('/:id/download', authenticateUser, async (req: Request, res: Response) => {
  try {
    const document = await documentService.getDocumentById(req.params.id, req.user!.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    const filePath = document.filePath;
    
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Document file not found'
      });
    }
    
    // Set content disposition header for download
    res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    logger.error(`Failed to download document: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to download document',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route DELETE /api/documents/:id
 * @desc Delete document by ID
 * @access Private
 */
router.delete('/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const success = await documentService.deleteDocument(req.params.id, req.user!.id);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Document not found or you do not have permission to delete it'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    logger.error(`Failed to delete document: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete document',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route POST /api/documents/:id/process
 * @desc Manually trigger knowledge graph processing for a document
 * @access Private
 */
router.post('/:id/process', authenticateUser, async (req: Request, res: Response) => {
  try {
    const document = await documentService.getDocumentById(req.params.id, req.user!.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    // Update document to indicate knowledge graph creation
    await documentService.updateDocument(document.id, {
      createKnowledgeGraph: true,
      processingStatus: 'pending'
    });
    
    // Process the document asynchronously
    processDocumentAsync(document.id);
    
    return res.status(200).json({
      success: true,
      message: 'Document processing started'
    });
  } catch (error) {
    logger.error(`Failed to process document: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to process document',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @route GET /api/documents/:id/status
 * @desc Get document processing status
 * @access Private
 */
router.get('/:id/status', authenticateUser, async (req: Request, res: Response) => {
  try {
    const document = await documentService.getDocumentById(req.params.id, req.user!.id);
    
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      documentId: document.id,
      status: document.processingStatus,
      createKnowledgeGraph: document.createKnowledgeGraph
    });
  } catch (error) {
    logger.error(`Failed to get document status: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get document status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
