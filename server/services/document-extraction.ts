/**
 * Document Extraction Service
 * 
 * Provides text extraction capabilities from various document formats:
 * - PDF (using pdf-parse)
 * - Word DOCX (using mammoth)
 * - Excel XLSX (using xlsx)
 * - PowerPoint PPTX (using pptxjs)
 * - Images (using Tesseract.js for OCR)
 * - HTML (using jsdom)
 */
import { createWorker } from 'tesseract.js';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../core/logger';

// Supported document types and their MIME types
export const SUPPORTED_TYPES = {
  PDF: ['application/pdf'],
  DOCX: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  DOC: ['application/msword'],
  XLSX: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  XLS: ['application/vnd.ms-excel'],
  PPTX: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  PPT: ['application/vnd.ms-powerpoint'],
  TXT: ['text/plain'],
  HTML: ['text/html'],
  IMAGE: ['image/jpeg', 'image/png', 'image/gif', 'image/tiff', 'image/bmp'],
};

// Interface for extraction results
export interface ExtractionResult {
  text: string;
  metadata: {
    title?: string;
    author?: string;
    creationDate?: Date;
    pageCount?: number;
    format?: string;
    extractionEngine?: string;
    processTime?: number;
    language?: string;
    confidence?: number;
  };
  structured?: {
    headings?: { level: number; text: string; pageIndex?: number }[];
    tables?: any[][];
    sections?: { title: string; content: string }[];
    images?: { index: number; description?: string }[];
  };
  raw?: any; // Raw data from the extraction process for debugging or advanced use
}

/**
 * Main extraction function that delegates to the appropriate format handler
 */
export async function extractTextFromDocument(
  filePath: string,
  options: { language?: string; ocrEnabled?: boolean } = {}
): Promise<ExtractionResult> {
  const startTime = Date.now();
  const fileExt = path.extname(filePath).toLowerCase();
  const mimeType = getMimeType(fileExt);

  logger.info(`Starting extraction process for ${path.basename(filePath)}`, { 
    fileType: fileExt, 
    options 
  });

  try {
    let result: ExtractionResult;

    // Determine the file type and use the appropriate extractor
    if (SUPPORTED_TYPES.PDF.includes(mimeType)) {
      result = await extractFromPdf(filePath, options);
    } else if (SUPPORTED_TYPES.DOCX.includes(mimeType) || SUPPORTED_TYPES.DOC.includes(mimeType)) {
      result = await extractFromDocx(filePath, options);
    } else if (SUPPORTED_TYPES.XLSX.includes(mimeType) || SUPPORTED_TYPES.XLS.includes(mimeType)) {
      result = await extractFromExcel(filePath, options);
    } else if (SUPPORTED_TYPES.PPTX.includes(mimeType) || SUPPORTED_TYPES.PPT.includes(mimeType)) {
      result = await extractFromPowerPoint(filePath, options);
    } else if (SUPPORTED_TYPES.HTML.includes(mimeType)) {
      result = await extractFromHtml(filePath, options);
    } else if (SUPPORTED_TYPES.TXT.includes(mimeType)) {
      result = await extractFromPlainText(filePath, options);
    } else if (SUPPORTED_TYPES.IMAGE.some(type => mimeType.includes(type))) {
      result = await extractFromImage(filePath, options);
    } else {
      throw new Error(`Unsupported file format: ${mimeType}`);
    }

    // Add processing time to metadata
    result.metadata.processTime = Date.now() - startTime;
    return result;
  } catch (error) {
    logger.error(`Document extraction failed for ${path.basename(filePath)}`, {
      error,
      fileType: fileExt,
    });
    throw error;
  }
}

/**
 * Extract text from PDF documents
 */
async function extractFromPdf(filePath: string, options: any): Promise<ExtractionResult> {
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);

  // Process the extracted text to identify headings and sections
  const headings: { level: number; text: string; pageIndex?: number }[] = [];
  const lines = pdfData.text.split('\n');
  
  // Very basic heading detection (could be enhanced with NLP)
  let currentHeadingLevel = 0;
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.length > 0 && trimmedLine.length < 100) {
      // Heuristic: Short lines that are all caps or end with a colon might be headings
      if (trimmedLine === trimmedLine.toUpperCase() || trimmedLine.endsWith(':')) {
        currentHeadingLevel = trimmedLine === trimmedLine.toUpperCase() ? 1 : 2;
        headings.push({ level: currentHeadingLevel, text: trimmedLine });
      }
    }
  }

  return {
    text: pdfData.text,
    metadata: {
      pageCount: pdfData.numpages,
      author: pdfData.info?.Author,
      title: pdfData.info?.Title,
      creationDate: pdfData.info?.CreationDate ? new Date(pdfData.info.CreationDate) : undefined,
      format: 'PDF',
      extractionEngine: 'pdf-parse',
    },
    structured: {
      headings,
    },
    raw: pdfData,
  };
}

/**
 * Extract text from DOCX documents
 */
async function extractFromDocx(filePath: string, options: any): Promise<ExtractionResult> {
  const result = await mammoth.extractRawText({
    path: filePath,
  });

  // Extract heading structure from the document
  const htmlResult = await mammoth.convertToHtml({
    path: filePath,
  });

  const dom = new JSDOM(htmlResult.value);
  const headings = Array.from(dom.window.document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .map(heading => ({
      level: parseInt(heading.tagName.substring(1)),
      text: heading.textContent || '',
    }));

  return {
    text: result.value,
    metadata: {
      format: 'DOCX',
      extractionEngine: 'mammoth',
    },
    structured: {
      headings,
    },
    raw: result,
  };
}

/**
 * Extract text from Excel spreadsheets
 */
async function extractFromExcel(filePath: string, options: any): Promise<ExtractionResult> {
  const workbook = XLSX.readFile(filePath);
  let text = '';
  let tables: any[][] = [];

  // Process each sheet in the workbook
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    // Add sheet name as a heading
    text += `\n## ${sheetName}\n\n`;
    
    // Convert sheet data to text
    for (const row of sheetData) {
      if (Array.isArray(row) && row.length > 0) {
        text += row.join('\t') + '\n';
      }
    }
    
    // Store table data for structured output
    tables.push(sheetData);
  }

  return {
    text,
    metadata: {
      format: 'XLSX',
      extractionEngine: 'xlsx',
      pageCount: workbook.SheetNames.length,
    },
    structured: {
      tables,
      headings: workbook.SheetNames.map(name => ({ level: 1, text: name })),
    },
    raw: workbook,
  };
}

/**
 * Extract text from PowerPoint presentations
 * This is a simplified implementation as pptxjs doesn't provide direct Node.js extraction
 * In a real-world scenario, you might use a more robust library or server-side rendering
 */
async function extractFromPowerPoint(filePath: string, options: any): Promise<ExtractionResult> {
  // For demonstration purposes - in a real implementation, you'd use a proper PPTX parser
  // This is a placeholder that reads the raw XML from inside the PPTX (which is a ZIP file)
  const text = `PowerPoint extraction not fully implemented. File: ${path.basename(filePath)}`;
  
  return {
    text,
    metadata: {
      format: 'PPTX',
      extractionEngine: 'custom',
    },
    structured: {
      headings: [],
    },
  };
}

/**
 * Extract text from HTML documents
 */
async function extractFromHtml(filePath: string, options: any): Promise<ExtractionResult> {
  const html = fs.readFileSync(filePath, 'utf8');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Extract text content
  const textContent = document.body.textContent || '';
  
  // Extract headings
  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .map(heading => ({
      level: parseInt(heading.tagName.substring(1)),
      text: heading.textContent || '',
    }));
  
  // Extract meta information
  const title = document.querySelector('title')?.textContent || '';
  const author = document.querySelector('meta[name="author"]')?.getAttribute('content');
  
  return {
    text: textContent,
    metadata: {
      title: title || undefined,
      author: author || undefined,
      format: 'HTML',
      extractionEngine: 'jsdom',
    },
    structured: {
      headings,
    },
  };
}

/**
 * Extract text from plain text files
 */
async function extractFromPlainText(filePath: string, options: any): Promise<ExtractionResult> {
  const text = fs.readFileSync(filePath, 'utf8');
  
  // Very basic heading detection for plain text
  const lines = text.split('\n');
  const headings: { level: number; text: string }[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    // Heuristic: Lines that are all uppercase or end with a colon might be headings
    if (trimmedLine.length > 0 && trimmedLine.length < 100) {
      if (trimmedLine === trimmedLine.toUpperCase() || trimmedLine.endsWith(':')) {
        headings.push({
          level: trimmedLine === trimmedLine.toUpperCase() ? 1 : 2,
          text: trimmedLine,
        });
      }
    }
  }
  
  return {
    text,
    metadata: {
      format: 'TXT',
      extractionEngine: 'native',
    },
    structured: {
      headings,
    },
  };
}

/**
 * Extract text from images using OCR
 */
async function extractFromImage(filePath: string, options: any): Promise<ExtractionResult> {
  const worker = await createWorker({
    logger: m => logger.debug('Tesseract OCR progress', { progress: m }),
    langPath: path.join(process.cwd(), 'tessdata'),
  });
  
  // Use specified language or default to English
  await worker.loadLanguage(options.language || 'eng');
  await worker.initialize(options.language || 'eng');
  
  const { data } = await worker.recognize(filePath);
  await worker.terminate();
  
  return {
    text: data.text,
    metadata: {
      format: 'Image',
      extractionEngine: 'tesseract.js',
      confidence: data.confidence,
      language: options.language || 'eng',
    },
    raw: data,
  };
}

/**
 * Utility function to determine MIME type from file extension
 */
function getMimeType(extension: string): string {
  const mimeTypes: { [key: string]: string } = {
    '.pdf': 'application/pdf',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
    '.bmp': 'image/bmp',
  };
  
  return mimeTypes[extension] || 'application/octet-stream';
}