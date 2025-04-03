/**
 * V1 Document API Routes
 * 
 * This module provides the v1 API routes for document management
 * with OpenAPI documentation.
 */

import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import { storage } from '../../storage';
import { asyncHandler } from '../../core';
import { z } from 'zod';
import { insertDocumentSchema } from '@shared/schema';
import { extractTextFromDocument } from '../../services/document-extraction';
import { analyzeDocumentStructure } from '../../services/document-structure';
import { parseDocumentContext } from '../../services/context-aware-parser';
import { identifyCrossReferences } from '../../services/cross-reference-resolver';
import { standardizeTerminology } from '../../services/terminology-standardization';
import { detectLanguage, translateText, SupportedLanguage } from '../../services/language-translation';

// Configure multer storage
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Accept common document formats
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/html',
      'image/jpeg',
      'image/png',
      'image/tiff'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  }
});

const router = Router();

/**
 * @swagger
 * /documents:
 *   get:
 *     tags:
 *       - Documents
 *     summary: Get all documents
 *     description: Retrieves a list of all documents. Requires authentication.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: limit
 *         in: query
 *         schema:
 *           type: integer
 *           default: 100
 *         description: Maximum number of documents to return
 *       - name: offset
 *         in: query
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of documents to skip
 *       - name: sort
 *         in: query
 *         schema:
 *           type: string
 *           enum: [newest, oldest, title]
 *           default: newest
 *         description: Sort order
 *     responses:
 *       200:
 *         description: A list of documents
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Document'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/documents', asyncHandler(async (req, res) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Parse query parameters
  const limit = parseInt(req.query.limit as string) || 100;
  const offset = parseInt(req.query.offset as string) || 0;
  const sort = (req.query.sort as string) || 'newest';
  
  const documents = await storage.getAllDocuments();
  
  // Apply sorting
  let sortedDocs = [...documents];
  if (sort === 'newest') {
    sortedDocs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } else if (sort === 'oldest') {
    sortedDocs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  } else if (sort === 'title') {
    sortedDocs.sort((a, b) => a.title.localeCompare(b.title));
  }
  
  // Apply pagination
  const paginatedDocs = sortedDocs.slice(offset, offset + limit);
  
  res.json(paginatedDocs);
}));

/**
 * @swagger
 * /documents/{id}:
 *   get:
 *     tags:
 *       - Documents
 *     summary: Get document by ID
 *     description: Retrieves a specific document by ID. Requires authentication.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Document ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Document data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/documents/:id', asyncHandler(async (req, res) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const documentId = parseInt(req.params.id);
  const document = await storage.getDocument(documentId);
  
  if (!document) {
    return res.status(404).json({ message: 'Document not found' });
  }
  
  res.json(document);
}));

/**
 * @swagger
 * /documents/upload:
 *   post:
 *     tags:
 *       - Documents
 *     summary: Upload a document
 *     description: Uploads a new document. Requires authentication.
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Document file
 *               title:
 *                 type: string
 *                 description: Document title
 *               description:
 *                 type: string
 *                 description: Document description
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Document tags
 *             required:
 *               - file
 *               - title
 *     responses:
 *       201:
 *         description: Document uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/documents/upload', upload.single('file'), asyncHandler(async (req, res) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  if (!req.file) {
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: [{ field: 'file', message: 'File is required' }]
    });
  }
  
  try {
    // Validate request body
    const documentSchema = z.object({
      title: z.string().min(1, 'Title is required'),
      description: z.string().optional(),
      tags: z.array(z.string()).optional()
    });
    
    const documentData = documentSchema.parse(req.body);
    
    // Prepare document data
    const fileType = req.file.mimetype;
    const fileName = path.basename(req.file.originalname);
    const fileSize = req.file.size;
    const filePath = req.file.path;
    const url = `/uploads/${path.basename(filePath)}`;
    
    // Create document record
    const newDocument = await storage.createDocument({
      title: documentData.title,
      description: documentData.description || null,
      fileType,
      url,
      uploadedById: req.user.id,
      fileName,
      fileSize,
      tags: documentData.tags || null
    });
    
    // Create initial document version
    if (newDocument) {
      const documentVersion = await storage.createDocumentVersion({
        documentId: newDocument.id,
        versionNumber: '1.0',
        uploadedById: req.user.id,
        fileType,
        filePath,
        size: fileSize,
        changeDescription: 'Initial version'
      });
      
      // Update the document with the current version ID
      if (documentVersion) {
        await storage.updateDocumentCurrentVersion(newDocument.id, documentVersion.id);
      }
    }
    
    res.status(201).json(newDocument);
  } catch (error) {
    // Clean up uploaded file if there's an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    if (error instanceof z.ZodError) {
      // Handle validation errors
      const fieldErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      return res.status(400).json({
        message: 'Validation failed',
        errors: fieldErrors
      });
    }
    
    throw error;
  }
}));

/**
 * @swagger
 * /documents/{id}/extract:
 *   post:
 *     tags:
 *       - Documents
 *     summary: Extract text from document
 *     description: Extracts text content from a document. Requires authentication.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Document ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Extracted text
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 text:
 *                   type: string
 *                   description: Extracted text content
 *                 metadata:
 *                   type: object
 *                   description: Extraction metadata
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Extraction error
 */
router.post('/documents/:id/extract', asyncHandler(async (req, res) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const documentId = parseInt(req.params.id);
  const document = await storage.getDocument(documentId);
  
  if (!document) {
    return res.status(404).json({ message: 'Document not found' });
  }
  
  // Get document version
  if (!document.currentVersionId) {
    return res.status(404).json({ message: 'No document version found' });
  }
  
  const version = await storage.getDocumentVersion(document.currentVersionId);
  if (!version || !version.filePath) {
    return res.status(404).json({ message: 'Document file not found' });
  }
  
  try {
    // Extract text from the document
    const result = await extractTextFromDocument(version.filePath, {
      documentId
    });
    
    // Store the extraction result if it has a storage method
    if (storage.saveDocumentExtraction) {
      await storage.saveDocumentExtraction(documentId, result);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to extract text from document',
      error: (error as Error).message
    });
  }
}));

/**
 * @swagger
 * /documents/{id}/structure:
 *   post:
 *     tags:
 *       - Documents
 *     summary: Analyze document structure
 *     description: Analyzes the structure of a document. Requires authentication.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Document ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Document structure analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 elements:
 *                   type: array
 *                   description: Document structure elements
 *                 hierarchy:
 *                   type: object
 *                   description: Hierarchical document structure
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Analysis error
 */
router.post('/documents/:id/structure', asyncHandler(async (req, res) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const documentId = parseInt(req.params.id);
  
  // First, check if we have an extraction result
  let extractionResult: any = null;
  
  if (storage.getDocumentExtraction) {
    extractionResult = await storage.getDocumentExtraction(documentId);
  }
  
  if (!extractionResult) {
    // If no extraction result, get the document and extract text
    const document = await storage.getDocument(documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Get document version
    if (!document.currentVersionId) {
      return res.status(404).json({ message: 'No document version found' });
    }
    
    const version = await storage.getDocumentVersion(document.currentVersionId);
    if (!version || !version.filePath) {
      return res.status(404).json({ message: 'Document file not found' });
    }
    
    try {
      // Extract text first
      extractionResult = await extractTextFromDocument(version.filePath, {
        documentId
      });
      
      // Store the extraction result if it has a storage method
      if (storage.saveDocumentExtraction) {
        await storage.saveDocumentExtraction(documentId, extractionResult);
      }
    } catch (error) {
      return res.status(500).json({ 
        message: 'Failed to extract text from document',
        error: (error as Error).message
      });
    }
  }
  
  try {
    // Analyze document structure
    const structureResult = await analyzeDocumentStructure(extractionResult);
    
    // Store the structure result if it has a storage method
    if (storage.saveDocumentStructure) {
      await storage.saveDocumentStructure(documentId, structureResult);
    }
    
    res.json(structureResult);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to analyze document structure',
      error: (error as Error).message
    });
  }
}));

/**
 * @swagger
 * /documents/{id}/context:
 *   post:
 *     tags:
 *       - Documents
 *     summary: Analyze document context
 *     description: Performs context-aware parsing of a document. Requires authentication.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Document ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Document context analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 primaryContext:
 *                   type: string
 *                   description: Primary document context
 *                 sections:
 *                   type: array
 *                   description: Document sections with context
 *                 entities:
 *                   type: array
 *                   description: Contextual entities found in the document
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Analysis error
 */
router.post('/documents/:id/context', asyncHandler(async (req, res) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const documentId = parseInt(req.params.id);
  
  // First, check if we have a structure result
  let structureResult: any = null;
  
  if (storage.getDocumentStructure) {
    structureResult = await storage.getDocumentStructure(documentId);
  }
  
  if (!structureResult) {
    // If no structure result, get the document extraction and analyze structure
    let extractionResult: any = null;
    
    if (storage.getDocumentExtraction) {
      extractionResult = await storage.getDocumentExtraction(documentId);
    }
    
    if (!extractionResult) {
      // If no extraction result, get the document and extract text
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Get document version
      if (!document.currentVersionId) {
        return res.status(404).json({ message: 'No document version found' });
      }
      
      const version = await storage.getDocumentVersion(document.currentVersionId);
      if (!version || !version.filePath) {
        return res.status(404).json({ message: 'Document file not found' });
      }
      
      try {
        // Extract text first
        extractionResult = await extractTextFromDocument(version.filePath, {
          documentId
        });
        
        // Store the extraction result if it has a storage method
        if (storage.saveDocumentExtraction) {
          await storage.saveDocumentExtraction(documentId, extractionResult);
        }
      } catch (error) {
        return res.status(500).json({ 
          message: 'Failed to extract text from document',
          error: (error as Error).message
        });
      }
    }
    
    try {
      // Analyze document structure
      structureResult = await analyzeDocumentStructure(extractionResult);
      
      // Store the structure result if it has a storage method
      if (storage.saveDocumentStructure) {
        await storage.saveDocumentStructure(documentId, structureResult);
      }
    } catch (error) {
      return res.status(500).json({ 
        message: 'Failed to analyze document structure',
        error: (error as Error).message
      });
    }
  }
  
  try {
    // Perform context-aware parsing
    const contextResult = await parseDocumentContext(structureResult);
    
    // Store the context result if it has a storage method
    if (storage.saveDocumentContext) {
      await storage.saveDocumentContext(documentId, contextResult);
    }
    
    res.json(contextResult);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to analyze document context',
      error: (error as Error).message
    });
  }
}));

/**
 * @swagger
 * /documents/{id}/references:
 *   post:
 *     tags:
 *       - Documents
 *     summary: Identify document references
 *     description: Identifies cross-references to other documents. Requires authentication.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Document ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Document references analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 references:
 *                   type: array
 *                   description: References to other documents
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Analysis error
 */
router.post('/documents/:id/references', asyncHandler(async (req, res) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const documentId = parseInt(req.params.id);
  const document = await storage.getDocument(documentId);
  
  if (!document) {
    return res.status(404).json({ message: 'Document not found' });
  }
  
  try {
    // Identify cross-references
    const references = await identifyCrossReferences(documentId);
    
    // Store the references if it has a storage method
    if (storage.saveDocumentReferences) {
      await storage.saveDocumentReferences(documentId, references);
    }
    
    res.json({ references });
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to identify document references',
      error: (error as Error).message
    });
  }
}));

/**
 * @swagger
 * /documents/{id}/standardize:
 *   post:
 *     tags:
 *       - Documents
 *     summary: Standardize document terminology
 *     description: Standardizes aviation terminology in the document. Requires authentication.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Document ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               language:
 *                 type: string
 *                 description: Language code (en, es, fr, etc.)
 *               preserveCase:
 *                 type: boolean
 *                 description: Whether to preserve case in replacements
 *     responses:
 *       200:
 *         description: Standardized terminology result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 originalText:
 *                   type: string
 *                   description: Original text
 *                 standardizedText:
 *                   type: string
 *                   description: Text with standardized terminology
 *                 replacements:
 *                   type: array
 *                   description: Terminology replacements made
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Standardization error
 */
router.post('/documents/:id/standardize', asyncHandler(async (req, res) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const documentId = parseInt(req.params.id);
  
  // First, check if we have an extraction result
  let extractionResult: any = null;
  
  if (storage.getDocumentExtraction) {
    extractionResult = await storage.getDocumentExtraction(documentId);
  }
  
  if (!extractionResult) {
    // If no extraction result, get the document and extract text
    const document = await storage.getDocument(documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Get document version
    if (!document.currentVersionId) {
      return res.status(404).json({ message: 'No document version found' });
    }
    
    const version = await storage.getDocumentVersion(document.currentVersionId);
    if (!version || !version.filePath) {
      return res.status(404).json({ message: 'Document file not found' });
    }
    
    try {
      // Extract text first
      extractionResult = await extractTextFromDocument(version.filePath, {
        documentId
      });
      
      // Store the extraction result if it has a storage method
      if (storage.saveDocumentExtraction) {
        await storage.saveDocumentExtraction(documentId, extractionResult);
      }
    } catch (error) {
      return res.status(500).json({ 
        message: 'Failed to extract text from document',
        error: (error as Error).message
      });
    }
  }
  
  try {
    // Parse options from request body
    const options = {
      language: req.body.language as SupportedLanguage,
      preserveCase: req.body.preserveCase as boolean,
      onlyFullTerms: req.body.onlyFullTerms as boolean,
      markReplacements: req.body.markReplacements as boolean
    };
    
    // Standardize terminology
    const result = standardizeTerminology(extractionResult.text, options);
    
    // Store the standardization result if it has a storage method
    if (storage.saveDocumentStandardization) {
      await storage.saveDocumentStandardization(documentId, result);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to standardize document terminology',
      error: (error as Error).message
    });
  }
}));

/**
 * @swagger
 * /documents/{id}/detect-language:
 *   post:
 *     tags:
 *       - Documents
 *     summary: Detect document language
 *     description: Detects the language of a document. Requires authentication.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Document ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Language detection result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 detectedLanguage:
 *                   type: string
 *                   description: Detected language code
 *                 confidence:
 *                   type: number
 *                   description: Detection confidence score
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Detection error
 */
router.post('/documents/:id/detect-language', asyncHandler(async (req, res) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const documentId = parseInt(req.params.id);
  
  // First, check if we have an extraction result
  let extractionResult: any = null;
  
  if (storage.getDocumentExtraction) {
    extractionResult = await storage.getDocumentExtraction(documentId);
  }
  
  if (!extractionResult) {
    // If no extraction result, get the document and extract text
    const document = await storage.getDocument(documentId);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Get document version
    if (!document.currentVersionId) {
      return res.status(404).json({ message: 'No document version found' });
    }
    
    const version = await storage.getDocumentVersion(document.currentVersionId);
    if (!version || !version.filePath) {
      return res.status(404).json({ message: 'Document file not found' });
    }
    
    try {
      // Extract text first
      extractionResult = await extractTextFromDocument(version.filePath, {
        documentId
      });
      
      // Store the extraction result if it has a storage method
      if (storage.saveDocumentExtraction) {
        await storage.saveDocumentExtraction(documentId, extractionResult);
      }
    } catch (error) {
      return res.status(500).json({ 
        message: 'Failed to extract text from document',
        error: (error as Error).message
      });
    }
  }
  
  try {
    // Detect language
    const result = await detectLanguage(extractionResult.text);
    
    // Store the language detection result if it has a storage method
    if (storage.saveDocumentLanguageDetection) {
      await storage.saveDocumentLanguageDetection(documentId, result);
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      message: 'Failed to detect document language',
      error: (error as Error).message
    });
  }
}));

/**
 * @swagger
 * /documents/{id}/translate:
 *   post:
 *     tags:
 *       - Documents
 *     summary: Translate document
 *     description: Translates a document to another language. Requires authentication.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Document ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               targetLanguage:
 *                 type: string
 *                 description: Target language code (en, es, fr, etc.)
 *               sourceLanguage:
 *                 type: string
 *                 description: Source language code (leave empty for auto-detection)
 *             required:
 *               - targetLanguage
 *     responses:
 *       200:
 *         description: Translation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 translatedText:
 *                   type: string
 *                   description: Translated text
 *                 sourceLanguage:
 *                   type: string
 *                   description: Source language code
 *                 targetLanguage:
 *                   type: string
 *                   description: Target language code
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Translation error
 */
router.post('/documents/:id/translate', asyncHandler(async (req, res) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  // Validate request body
  const translateSchema = z.object({
    targetLanguage: z.string().min(2, 'Target language is required'),
    sourceLanguage: z.string().optional()
  });
  
  try {
    const { targetLanguage, sourceLanguage } = translateSchema.parse(req.body);
    
    const documentId = parseInt(req.params.id);
    
    // First, check if we have an extraction result
    let extractionResult: any = null;
    
    if (storage.getDocumentExtraction) {
      extractionResult = await storage.getDocumentExtraction(documentId);
    }
    
    if (!extractionResult) {
      // If no extraction result, get the document and extract text
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }
      
      // Get document version
      if (!document.currentVersionId) {
        return res.status(404).json({ message: 'No document version found' });
      }
      
      const version = await storage.getDocumentVersion(document.currentVersionId);
      if (!version || !version.filePath) {
        return res.status(404).json({ message: 'Document file not found' });
      }
      
      try {
        // Extract text first
        extractionResult = await extractTextFromDocument(version.filePath, {
          documentId
        });
        
        // Store the extraction result if it has a storage method
        if (storage.saveDocumentExtraction) {
          await storage.saveDocumentExtraction(documentId, extractionResult);
        }
      } catch (error) {
        return res.status(500).json({ 
          message: 'Failed to extract text from document',
          error: (error as Error).message
        });
      }
    }
    
    try {
      // Detect language if not provided
      let srcLang = sourceLanguage || 'auto';
      if (srcLang === 'auto') {
        const languageResult = await detectLanguage(extractionResult.text);
        srcLang = languageResult.detectedLanguage;
      }
      
      // Translate the text
      const result = await translateText(
        extractionResult.text,
        srcLang as any,
        targetLanguage as any
      );
      
      // Store the translation result if it has a storage method
      if (storage.saveDocumentTranslation) {
        await storage.saveDocumentTranslation(documentId, result);
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ 
        message: 'Failed to translate document',
        error: (error as Error).message
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Handle validation errors
      const fieldErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      return res.status(400).json({
        message: 'Validation failed',
        errors: fieldErrors
      });
    }
    
    throw error;
  }
}));

/**
 * @swagger
 * /documents/{id}:
 *   delete:
 *     tags:
 *       - Documents
 *     summary: Delete document
 *     description: Deletes a document. Users can only delete their own documents unless they are an admin.
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Document ID
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Document deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/documents/:id', asyncHandler(async (req, res) => {
  // Check authentication
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  const documentId = parseInt(req.params.id);
  const document = await storage.getDocument(documentId);
  
  if (!document) {
    return res.status(404).json({ message: 'Document not found' });
  }
  
  // Check authorization (users can only delete their own documents unless they're admin)
  if (document.uploadedById !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  // Delete document versions if they exist
  if (document.currentVersionId) {
    try {
      const version = await storage.getDocumentVersion(document.currentVersionId);
      if (version && version.filePath && fs.existsSync(version.filePath)) {
        fs.unlinkSync(version.filePath);
      }
      
      // Delete all versions of the document
      if (storage.getDocumentVersionsByDocument && storage.deleteDocumentVersion) {
        const versions = await storage.getDocumentVersionsByDocument(documentId);
        for (const ver of versions) {
          await storage.deleteDocumentVersion(ver.id);
        }
      }
    } catch (error) {
      console.error(`Error deleting document versions: ${(error as Error).message}`);
    }
  }
  
  // Delete the document
  await storage.deleteDocument(documentId);
  
  res.status(204).send();
}));

export default router;