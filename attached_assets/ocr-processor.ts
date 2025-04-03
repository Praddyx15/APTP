/**
 * OCRProcessor - A wrapper for Tesseract.js providing advanced OCR functionality
 * with preprocessing, structure detection, and robust error handling.
 */

import { createWorker, createScheduler, RecognizeResult, OEM, PSM } from 'tesseract.js';
import { EventEmitter } from 'events';

// Import for browser environment
import cv from '@techstark/opencv-js';

// Interfaces
export interface OCROptions {
  language?: string | string[];
  pageSegmentationMode?: PSM;
  engineMode?: OEM;
  workerCount?: number;
  preprocessImage?: boolean;
  detectStructure?: boolean;
  logger?: (message: string, level: 'info' | 'warn' | 'error') => void;
  progressCallback?: (progress: OCRProgressInfo) => void;
  timeout?: number; // in milliseconds
  skipPDFHeader?: boolean;
  enhanceImage?: boolean;
  abortSignal?: AbortSignal;
}

export interface OCRProgressInfo {
  status: 'initializing' | 'loading' | 'processing' | 'recognizing' | 'complete' | 'error';
  progress: number; // 0-100
  page?: number;
  totalPages?: number;
  currentOperation?: string;
  timeElapsed?: number;
  timeRemaining?: number;
  error?: Error;
}

export interface OCRResult {
  text: string;
  confidence: number;
  blocks: TextBlock[];
  pages: PageInfo[];
  rawResult: any; // Original Tesseract result
  processTime: number; // milliseconds
}

export interface TextBlock {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
  paragraphs: TextParagraph[];
  type?: 'text' | 'table' | 'list' | 'heading' | 'image' | 'unknown';
}

export interface TextParagraph {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
  lines: TextLine[];
}

export interface TextLine {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
  words: TextWord[];
}

export interface TextWord {
  text: string;
  confidence: number;
  boundingBox: BoundingBox;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageInfo {
  pageNumber: number;
  width: number;
  height: number;
  dpi?: number;
  rotation?: number;
  orientation?: 'portrait' | 'landscape';
}

export interface StructuredDocument {
  title?: string;
  sections: DocumentSection[];
  metadata: Record<string, string>;
  tableOfContents?: TableOfContentsEntry[];
}

export interface DocumentSection {
  title: string;
  level: number;
  content: string;
  boundingBox?: BoundingBox;
  subsections: DocumentSection[];
}

export interface TableOfContentsEntry {
  title: string;
  level: number;
  pageNumber?: number;
}

/**
 * OCR Processor class for extracting text from images with preprocessing and structure detection
 */
export class OCRProcessor extends EventEmitter {
  private scheduler: Tesseract.Scheduler | null = null;
  private workers: Tesseract.Worker[] = [];
  private options: OCROptions;
  private isInitialized: boolean = false;
  private startTime: number = 0;
  private aborted: boolean = false;

  /**
   * Create a new OCRProcessor
   * @param options Configuration options for OCR processing
   */
  constructor(options: OCROptions = {}) {
    super();
    
    this.options = {
      language: 'eng',
      pageSegmentationMode: PSM.AUTO,
      engineMode: OEM.LSTM_ONLY,
      workerCount: Math.max(1, navigator.hardwareConcurrency - 1) || 2,
      preprocessImage: true,
      detectStructure: true,
      enhanceImage: true,
      skipPDFHeader: true,
      timeout: 300000, // 5 minutes
      ...options
    };
  }

  /**
   * Initialize OCR workers
   */
  private async initializeWorkers(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Create scheduler
      this.scheduler = createScheduler();
      const workerCount = this.options.workerCount || 2;
      
      // Initialize progress tracker
      this.emitProgress('initializing', 0, 'Initializing OCR processor');
      
      // Create workers
      const languages = Array.isArray(this.options.language) 
        ? this.options.language.join('+') 
        : this.options.language || 'eng';
      
      for (let i = 0; i < workerCount; i++) {
        this.emitProgress('initializing', (i / workerCount) * 50, 
          `Creating worker ${i + 1} of ${workerCount}`);
        
        const worker = createWorker({
          logger: progress => {
            if (this.options.logger) {
              this.options.logger(`Worker ${i + 1}: ${progress.status}`, 'info');
            }
            
            // Map Tesseract progress to our progress format
            if (progress.status === 'recognizing text') {
              this.emitProgress('recognizing', 50 + (progress.progress * 40), 
                `Recognizing text: ${Math.floor(progress.progress * 100)}%`);
            }
          },
          errorHandler: error => {
            if (this.options.logger) {
              this.options.logger(`Worker ${i + 1} error: ${error.message}`, 'error');
            }
          }
        });
        
        await worker.load();
        await worker.loadLanguage(languages);
        await worker.initialize(languages);
        
        // Set PSM and OEM if provided
        if (this.options.pageSegmentationMode !== undefined) {
          await worker.setParameters({
            tessedit_pageseg_mode: this.options.pageSegmentationMode,
          });
        }
        
        if (this.options.engineMode !== undefined) {
          await worker.setParameters({
            tessedit_ocr_engine_mode: this.options.engineMode,
          });
        }
        
        // Add worker to scheduler
        this.scheduler.addWorker(worker);
        this.workers.push(worker);
      }
      
      this.isInitialized = true;
      this.emitProgress('initializing', 50, 'OCR processor initialized');
    } catch (error) {
      this.log(`Error initializing OCR processor: ${error instanceof Error ? error.message : String(error)}`, 'error');
      this.emitProgress('error', 0, 'Failed to initialize OCR processor', error as Error);
      throw error;
    }
  }

  /**
   * Process a single image and extract text
   * @param imageData Image data as Buffer or Blob
   * @returns Extracted text and structured data
   */
  public async processImage(imageData: Buffer | Blob): Promise<OCRResult> {
    this.startTime = Date.now();
    this.aborted = false;
    
    try {
      // Check if aborted
      this.checkAbort();
      
      // Initialize workers if not already done
      if (!this.isInitialized) {
        await this.initializeWorkers();
      }
      
      this.emitProgress('loading', 50, 'Processing image');
      
      // Preprocess image if enabled
      let processedImage = imageData;
      if (this.options.preprocessImage) {
        this.emitProgress('processing', 60, 'Preprocessing image for better recognition');
        processedImage = await this.preprocessImageData(imageData);
      }
      
      // Check if aborted
      this.checkAbort();
      
      // Process with Tesseract
      this.emitProgress('recognizing', 70, 'Recognizing text');
      const result = await this.scheduler!.addJob('recognize', processedImage);
      
      // Format results
      this.emitProgress('processing', 90, 'Structuring results');
      const formattedResult = this.formatResults(result);
      
      // Calculate processing time
      const processTime = Date.now() - this.startTime;
      formattedResult.processTime = processTime;
      
      this.emitProgress('complete', 100, 'OCR processing complete');
      
      return formattedResult;
    } catch (error) {
      const err = error as Error;
      
      // If aborted, throw a specific error
      if (this.aborted) {
        throw new Error('OCR processing was aborted');
      }
      
      this.log(`Error processing image: ${err.message}`, 'error');
      this.emitProgress('error', 0, `OCR processing failed: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Process multiple images and combine results
   * @param images Array of image data as Buffer or Blob
   * @returns Array of OCR results, one per image
   */
  public async processMultipleImages(images: Array<Buffer | Blob>): Promise<string[]> {
    this.startTime = Date.now();
    this.aborted = false;
    
    try {
      // Check if aborted
      this.checkAbort();
      
      // Initialize workers if not already done
      if (!this.isInitialized) {
        await this.initializeWorkers();
      }
      
      const totalImages = images.length;
      this.emitProgress('loading', 10, `Processing ${totalImages} images`);
      
      // Process each image
      const results: string[] = [];
      
      for (let i = 0; i < totalImages; i++) {
        // Check if aborted
        this.checkAbort();
        
        this.emitProgress('processing', 10 + (i / totalImages) * 80,
          `Processing image ${i + 1} of ${totalImages}`);
        
        // Process image
        const result = await this.processImage(images[i]);
        results.push(result.text);
        
        // Report progress
        this.emitProgress('processing', 10 + ((i + 1) / totalImages) * 80,
          `Completed image ${i + 1} of ${totalImages}`);
      }
      
      this.emitProgress('complete', 100, 'All images processed');
      
      return results;
    } catch (error) {
      const err = error as Error;
      
      // If aborted, throw a specific error
      if (this.aborted) {
        throw new Error('OCR processing was aborted');
      }
      
      this.log(`Error processing multiple images: ${err.message}`, 'error');
      this.emitProgress('error', 0, `Multiple image processing failed: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Extract structured content from OCR results
   * @param textResults Array of OCR text results
   * @returns Structured document with sections and metadata
   */
  public async extractStructuredContent(textResults: string[]): Promise<StructuredDocument> {
    try {
      this.emitProgress('processing', 0, 'Analyzing document structure');
      
      // Join all text results
      const fullText = textResults.join('\n\n');
      
      // Extract potential title
      const title = this.extractDocumentTitle(fullText);
      
      // Extract metadata (date, author, etc.)
      const metadata = this.extractMetadata(fullText);
      
      // Extract table of contents
      const toc = this.extractTableOfContents(fullText);
      
      // Extract sections
      const sections = this.extractSections(fullText, toc);
      
      this.emitProgress('complete', 100, 'Document structure analysis complete');
      
      return {
        title,
        sections,
        metadata,
        tableOfContents: toc
      };
    } catch (error) {
      const err = error as Error;
      this.log(`Error extracting structured content: ${err.message}`, 'error');
      this.emitProgress('error', 0, `Structure extraction failed: ${err.message}`, err);
      throw err;
    }
  }

  /**
   * Terminate all workers and free resources
   */
  public async terminate(): Promise<void> {
    // Terminate all workers
    if (this.scheduler) {
      await this.scheduler.terminate();
      this.scheduler = null;
    }
    
    // Terminate individual workers
    for (const worker of this.workers) {
      try {
        await worker.terminate();
      } catch (error) {
        this.log(`Error terminating worker: ${error instanceof Error ? error.message : String(error)}`, 'warn');
      }
    }
    
    this.workers = [];
    this.isInitialized = false;
    
    this.log('OCR processor terminated', 'info');
  }

  /**
   * Abort current processing
   */
  public abort(): void {
    this.aborted = true;
    this.emit('abort');
  }

  /**
   * Configure OCR processor options
   * @param options New options to apply
   */
  public configure(options: Partial<OCROptions>): void {
    this.options = {
      ...this.options,
      ...options
    };
    
    // If already initialized and language changes, must reinitialize
    if (this.isInitialized && options.language) {
      this.isInitialized = false;
      // Terminate workers in the background
      this.terminate().catch(error => {
        this.log(`Error terminating workers during reconfiguration: ${error instanceof Error ? error.message : String(error)}`, 'error');
      });
    }
  }

  /**
   * Enhance an image for better OCR recognition
   * @param imageData Image data as Buffer or Blob
   * @returns Enhanced image data
   */
  public async enhanceImage(imageData: Buffer | Blob): Promise<Blob> {
    try {
      return await this.preprocessImageData(imageData);
    } catch (error) {
      const err = error as Error;
      this.log(`Error enhancing image: ${err.message}`, 'error');
      throw err;
    }
  }

  /**
   * Detect and extract tables from an image
   * @param imageData Image data as Buffer or Blob
   * @returns Table data with rows and columns
   */
  public async extractTables(imageData: Buffer | Blob): Promise<any[]> {
    try {
      // Process the image with OCR
      const result = await this.processImage(imageData);
      
      // Detect tables in the result
      return this.detectTables(result);
    } catch (error) {
      const err = error as Error;
      this.log(`Error extracting tables: ${err.message}`, 'error');
      throw err;
    }
  }

  // PRIVATE METHODS

  /**
   * Format Tesseract results into structured OCR result
   */
  private formatResults(tesseractResult: RecognizeResult): OCRResult {
    const { data } = tesseractResult;
    
    // Format blocks, paragraphs, lines, and words
    const blocks: TextBlock[] = data.blocks.map(block => {
      return {
        text: block.text,
        confidence: block.confidence,
        boundingBox: {
          x: block.bbox.x0,
          y: block.bbox.y0,
          width: block.bbox.x1 - block.bbox.x0,
          height: block.bbox.y1 - block.bbox.y0
        },
        type: this.detectBlockType(block),
        paragraphs: block.paragraphs.map(paragraph => {
          return {
            text: paragraph.text,
            confidence: paragraph.confidence,
            boundingBox: {
              x: paragraph.bbox.x0,
              y: paragraph.bbox.y0,
              width: paragraph.bbox.x1 - paragraph.bbox.x0,
              height: paragraph.bbox.y1 - paragraph.bbox.y0
            },
            lines: paragraph.lines.map(line => {
              return {
                text: line.text,
                confidence: line.confidence,
                boundingBox: {
                  x: line.bbox.x0,
                  y: line.bbox.y0,
                  width: line.bbox.x1 - line.bbox.x0,
                  height: line.bbox.y1 - line.bbox.y0
                },
                words: line.words.map(word => {
                  return {
                    text: word.text,
                    confidence: word.confidence,
                    boundingBox: {
                      x: word.bbox.x0,
                      y: word.bbox.y0,
                      width: word.bbox.x1 - word.bbox.x0,
                      height: word.bbox.y1 - word.bbox.y0
                    }
                  };
                })
              };
            })
          };
        })
      };
    });
    
    // Create page info
    const pages: PageInfo[] = [{
      pageNumber: 1,
      width: data.width,
      height: data.height,
      orientation: data.width > data.height ? 'landscape' : 'portrait'
    }];
    
    // Create final result
    return {
      text: data.text,
      confidence: data.confidence,
      blocks,
      pages,
      rawResult: tesseractResult,
      processTime: 0 // Will be filled by the calling method
    };
  }

  /**
   * Detect the type of a text block based on content and formatting
   */
  private detectBlockType(block: any): 'text' | 'table' | 'list' | 'heading' | 'image' | 'unknown' {
    // Check if it's a heading
    if (block.paragraphs.length === 1 && 
        block.paragraphs[0].lines.length === 1 &&
        block.paragraphs[0].lines[0].words.length <= 10) {
      return 'heading';
    }
    
    // Check if it's a list
    const listPatterns = [/^\s*[\u2022\u2023\u25E6\u2043\u2219\u21D2]\s+/i, /^\s*\d+\.\s+/i, /^\s*[a-z]\.\s+/i];
    if (block.paragraphs.length > 0 &&
        block.paragraphs.every(p => 
          p.lines.length === 1 && 
          listPatterns.some(pattern => pattern.test(p.lines[0].text))
        )) {
      return 'list';
    }
    
    // Check if it's a table
    if (this.isLikelyTable(block)) {
      return 'table';
    }
    
    // Default to regular text
    return 'text';
  }

  /**
   * Check if a block is likely to be a table
   */
  private isLikelyTable(block: any): boolean {
    // Tables typically have:
    // 1. Multiple lines with similar y-coordinates
    // 2. Words at similar x-coordinates across lines
    // 3. Often have horizontal and vertical lines of space
    
    if (block.paragraphs.length <= 1) return false;
    
    // Extract word positions
    const lines = block.paragraphs.flatMap((p: any) => p.lines);
    if (lines.length < 3) return false; // Need at least 3 lines for a table
    
    // Check for words aligned in columns
    const xPositions: number[][] = lines.map((line: any) => 
      line.words.map((w: any) => w.bbox.x0)
    );
    
    // Count how many lines have words at similar x-positions
    let alignmentCount = 0;
    
    for (let i = 0; i < xPositions.length - 1; i++) {
      for (let j = i + 1; j < xPositions.length; j++) {
        // Check for column alignment
        const alignedColumns = xPositions[i].filter(x1 => 
          xPositions[j].some(x2 => Math.abs(x1 - x2) < 10)
        );
        
        if (alignedColumns.length >= 2) {
          alignmentCount++;
        }
      }
    }
    
    // If there's significant alignment, it's likely a table
    return alignmentCount >= (lines.length / 2);
  }

  /**
   * Detect tables in OCR results
   */
  private detectTables(result: OCRResult): any[] {
    const tableBlocks = result.blocks.filter(block => block.type === 'table');
    
    // If no table blocks found, try to detect tables from text patterns
    if (tableBlocks.length === 0) {
      // Implement text-based table detection here if needed
      return [];
    }
    
    // Process each table block to extract rows and columns
    return tableBlocks.map(block => {
      // Collect all lines in the table
      const lines = block.paragraphs.flatMap(p => p.lines);
      
      // Sort lines by y-coordinate (top to bottom)
      lines.sort((a, b) => a.boundingBox.y - b.boundingBox.y);
      
      // Group lines into rows based on y-coordinate proximity
      const rows: TextLine[][] = [];
      let currentRow: TextLine[] = [];
      let lastY = -1;
      
      for (const line of lines) {
        if (lastY === -1 || Math.abs(line.boundingBox.y - lastY) < 10) {
          // Same row
          currentRow.push(line);
        } else {
          // New row
          if (currentRow.length > 0) {
            rows.push([...currentRow]);
          }
          currentRow = [line];
        }
        
        lastY = line.boundingBox.y;
      }
      
      // Add the last row
      if (currentRow.length > 0) {
        rows.push(currentRow);
      }
      
      // Process rows to detect columns
      const table: string[][] = [];
      
      for (const row of rows) {
        // Sort the lines in this row by x-coordinate (left to right)
        row.sort((a, b) => a.boundingBox.x - b.boundingBox.x);
        
        // Extract text from each line as a cell
        const cells = row.map(line => line.text.trim());
        table.push(cells);
      }
      
      // Return structured table
      return {
        boundingBox: block.boundingBox,
        rows: table
      };
    });
  }

  /**
   * Preprocess an image for better OCR accuracy
   */
  private async preprocessImageData(imageData: Buffer | Blob): Promise<Blob> {
    try {
      // Convert Buffer to Blob if needed
      const blob = imageData instanceof Buffer 
        ? new Blob([imageData]) 
        : imageData;
      
      // Create image element
      const img = await this.createImageFromBlob(blob);
      
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to create canvas context');
      }
      
      // Draw image on canvas
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Process with OpenCV.js if available
      if (typeof cv !== 'undefined' && this.options.enhanceImage) {
        return this.enhanceWithOpenCV(imageData, canvas);
      }
      
      // Basic preprocessing if OpenCV is not available
      return this.basicImageEnhancement(imageData, canvas);
    } catch (error) {
      this.log(`Image preprocessing failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
      // Return original image if preprocessing fails
      return imageData instanceof Buffer ? new Blob([imageData]) : imageData;
    }
  }

  /**
   * Create an Image element from a Blob
   */
  private createImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  /**
   * Enhance image using OpenCV.js
   */
  private enhanceWithOpenCV(imageData: ImageData, canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        // Convert ImageData to OpenCV Mat
        const src = cv.matFromImageData(imageData);
        const dst = new cv.Mat();
        
        // Convert to grayscale
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
        
        // Apply adaptive threshold
        const thresholded = new cv.Mat();
        cv.adaptiveThreshold(dst, thresholded, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);
        
        // Denoise
        const denoised = new cv.Mat();
        cv.medianBlur(thresholded, denoised, 3);
        
        // Check if image is too dark and needs inversion
        const mean = cv.mean(denoised);
        if (mean[0] < 127) {
          cv.bitwise_not(denoised, denoised);
        }
        
        // Convert back to RGBA for canvas
        const rgba = new cv.Mat();
        cv.cvtColor(denoised, rgba, cv.COLOR_GRAY2RGBA);
        
        // Put result back on canvas
        cv.imshow(canvas, rgba);
        
        // Clean up
        src.delete();
        dst.delete();
        thresholded.delete();
        denoised.delete();
        rgba.delete();
        
        // Convert canvas to blob
        canvas.toBlob(blob => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Basic image enhancement without OpenCV
   */
  private basicImageEnhancement(imageData: ImageData, canvas: HTMLCanvasElement): Promise<Blob> {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return Promise.reject(new Error('Failed to get canvas context'));
    }
    
    // Increase contrast and convert to grayscale
    const data = imageData.data;
    
    // Calculate histogram
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      histogram[gray]++;
    }
    
    // Find histogram bounds for contrast enhancement
    let low = 0;
    let high = 255;
    let histSum = 0;
    const totalPixels = imageData.width * imageData.height;
    
    // Find low bound (skip 1% of darkest pixels)
    for (let i = 0; i < 256; i++) {
      histSum += histogram[i];
      if (histSum >= totalPixels * 0.01) {
        low = i;
        break;
      }
    }
    
    // Find high bound (skip 1% of lightest pixels)
    histSum = 0;
    for (let i = 255; i >= 0; i--) {
      histSum += histogram[i];
      if (histSum >= totalPixels * 0.01) {
        high = i;
        break;
      }
    }
    
    // Prevent division by zero
    if (high <= low) {
      high = low + 1;
    }
    
    // Apply contrast stretch and grayscale
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Convert to grayscale
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      
      // Apply contrast stretch
      const newValue = Math.max(0, Math.min(255, Math.round(
        255 * (gray - low) / (high - low)
      )));
      
      data[i] = data[i + 1] = data[i + 2] = newValue;
    }
    
    // Put processed image back on canvas
    ctx.putImageData(imageData, 0, 0);
    
    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      });
    });
  }

  /**
   * Extract document title from text
   */
  private extractDocumentTitle(text: string): string | undefined {
    // Look for title patterns
    
    // 1. First line if it's capitalized and not too long
    const lines = text.split('\n');
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine.length > 0 && 
          firstLine.length < 100 && 
          firstLine === firstLine.toUpperCase()) {
        return firstLine;
      }
    }
    
    // 2. Check for common title indicators
    const titlePatterns = [
      /TITLE:\s*([^\n]+)/i,
      /SUBJECT:\s*([^\n]+)/i,
      /DOCUMENT NAME:\s*([^\n]+)/i,
      /^([^\n]{5,100})(?:\n{2}|\r\n{2})/m
    ];
    
    for (const pattern of titlePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    // No clear title found
    return undefined;
  }

  /**
   * Extract metadata from text
   */
  private extractMetadata(text: string): Record<string, string> {
    const metadata: Record<string, string> = {};
    
    // Define patterns for common metadata
    const patterns = [
      { key: 'author', pattern: /(?:Author|By|Prepared by|Created by):\s*([^\n]+)/i },
      { key: 'date', pattern: /(?:Date|Created|Generated|Published):\s*([^\n]+)/i },
      { key: 'version', pattern: /(?:Version|Revision|Release):\s*([^\n]+)/i },
      { key: 'organization', pattern: /(?:Organization|Company|Institution|Agency):\s*([^\n]+)/i },
      { key: 'classification', pattern: /(?:Classification|Security Level|Confidentiality):\s*([^\n]+)/i }
    ];
    
    // Apply each pattern
    for (const { key, pattern } of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        metadata[key] = match[1].trim();
      }
    }
    
    return metadata;
  }

  /**
   * Extract table of contents
   */
  private extractTableOfContents(text: string): TableOfContentsEntry[] {
    // Look for table of contents section
    const tocPatterns = [
      /(?:Table of Contents|CONTENTS|TABLE OF CONTENTS)(.+?)(?:(?:\n{2,})|$)/is,
      /(?:Index|Contents|TOC)(.+?)(?:(?:\n{2,})|$)/is
    ];
    
    let tocText = '';
    for (const pattern of tocPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        tocText = match[1];
        break;
      }
    }
    
    if (!tocText) {
      return [];
    }
    
    // Parse TOC entries
    const tocEntries: TableOfContentsEntry[] = [];
    const lines = tocText.split('\n');
    
    // TOC entry patterns:
    // - May have numbering (1, 1.1, Chapter 1, etc.)
    // - May have page numbers at the end
    // - May have dot leaders (......)
    const entryPattern = /^(?:(?:Chapter|Section)\s+)?(\d+(?:\.\d+)*)?\s*(?:[-:.]\s*)?([^\.0-9][^\n]*?)(?:(?:\.{2,}|\s{2,})(\d+))?$/i;
    
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;
      
      const match = line.match(entryPattern);
      if (match) {
        const [, numbering, title, pageNumStr] = match;
        
        // Determine level from numbering (e.g., "1.2.3" is level 3)
        let level = 1;
        if (numbering) {
          level = numbering.split('.').length;
        } else {
          // Use indentation as fallback for level detection
          const leadingSpaces = line.search(/\S/);
          level = Math.max(1, Math.ceil(leadingSpaces / 2));
        }
        
        // Parse page number
        const pageNumber = pageNumStr ? parseInt(pageNumStr, 10) : undefined;
        
        tocEntries.push({
          title: title.trim(),
          level,
          pageNumber
        });
      }
    }
    
    return tocEntries;
  }

  /**
   * Extract sections from text
   */
  private extractSections(text: string, toc: TableOfContentsEntry[]): DocumentSection[] {
    // Define section heading patterns
    const headingPatterns = [
      /^(?:Chapter|Section)\s+(\d+(?:\.\d+)*)\.?\s+([^\n]+)$/im, // Chapter/Section with numbering
      /^(\d+(?:\.\d+)*)\.?\s+([^\n]+)$/im, // Just numbering
      /^([A-Z][A-Z\s]+)$/m, // ALL CAPS heading
      /^([^\n]{5,100})\n(?:[=-]{3,})$/m // Heading with underline
    ];
    
    // Try to use TOC to guide section extraction
    if (toc.length > 0) {
      return this.extractSectionsUsingTOC(text, toc);
    }
    
    // Extract sections based on heading patterns
    const sections: DocumentSection[] = [];
    const lines = text.split('\n');
    
    let currentSection: DocumentSection | null = null;
    let sectionLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        if (sectionLines.length > 0) {
          sectionLines.push('');
        }
        continue;
      }
      
      // Check if line is a heading
      let isHeading = false;
      let headingLevel = 1;
      let headingTitle = '';
      
      for (const pattern of headingPatterns) {
        const match = line.match(pattern);
        if (match) {
          isHeading = true;
          
          if (match[1] && match[2]) {
            // Numbered heading (pattern captures number and title)
            headingTitle = match[2].trim();
            headingLevel = match[1].split('.').length;
          } else {
            // Non-numbered heading
            headingTitle = match[1] ? match[1].trim() : line.trim();
            
            // Determine level by subsequent line if it's an underlined heading
            if (i < lines.length - 1 && /^[=-]+$/.test(lines[i + 1].trim())) {
              headingLevel = lines[i + 1].trim()[0] === '=' ? 1 : 2;
              i++; // Skip the underline
            }
          }
          
          break;
        }
      }
      
      if (isHeading) {
        // Complete the previous section
        if (currentSection) {
          currentSection.content = sectionLines.join('\n').trim();
          sectionLines = [];
        }
        
        // Create new section
        const newSection: DocumentSection = {
          title: headingTitle,
          level: headingLevel,
          content: '',
          subsections: []
        };
        
        // Add to sections or as subsection
        if (headingLevel === 1 || !currentSection) {
          sections.push(newSection);
          currentSection = newSection;
        } else if (currentSection) {
          // Find appropriate parent for this subsection
          let parent = currentSection;
          
          // Move up hierarchy to find the right parent
          while (parent.subsections.length > 0 && 
                 parent.subsections[parent.subsections.length - 1].level < headingLevel - 1) {
            parent = parent.subsections[parent.subsections.length - 1];
          }
          
          parent.subsections.push(newSection);
          currentSection = newSection;
        }
      } else {
        // Add line to current section content
        sectionLines.push(line);
      }
    }
    
    // Complete the last section
    if (currentSection) {
      currentSection.content = sectionLines.join('\n').trim();
    }
    
    // If no sections were detected, create a single section from the entire text
    if (sections.length === 0 && text.trim().length > 0) {
      sections.push({
        title: 'Document',
        level: 1,
        content: text.trim(),
        subsections: []
      });
    }
    
    return sections;
  }

  /**
   * Extract sections using table of contents
   */
  private extractSectionsUsingTOC(text: string, toc: TableOfContentsEntry[]): DocumentSection[] {
    const sections: DocumentSection[] = [];
    
    // Sort TOC entries by level, then by their appearance in the TOC
    toc.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return toc.indexOf(a) - toc.indexOf(b);
    });
    
    // Group TOC entries into a hierarchy
    const rootEntries = toc.filter(entry => entry.level === 1);
    
    for (const rootEntry of rootEntries) {
      // Find its subsections (entries with level+1 that appear after it but before the next same-level entry)
      const startIndex = toc.indexOf(rootEntry);
      let endIndex = toc.length;
      
      for (let i = startIndex + 1; i < toc.length; i++) {
        if (toc[i].level === rootEntry.level) {
          endIndex = i;
          break;
        }
      }
      
      // Extract section content
      const sectionTitle = rootEntry.title;
      let sectionContent = this.extractSectionContent(text, sectionTitle);
      
      // Create section
      const section: DocumentSection = {
        title: sectionTitle,
        level: 1,
        content: sectionContent,
        subsections: this.buildSubsections(toc, startIndex + 1, endIndex, 2)
      };
      
      sections.push(section);
    }
    
    return sections;
  }

  /**
   * Recursively build subsections
   */
  private buildSubsections(
    toc: TableOfContentsEntry[], 
    startIndex: number, 
    endIndex: number, 
    level: number
  ): DocumentSection[] {
    const subsections: DocumentSection[] = [];
    
    for (let i = startIndex; i < endIndex; i++) {
      if (toc[i].level === level) {
        // Find the end of this section
        let subEndIndex = endIndex;
        for (let j = i + 1; j < endIndex; j++) {
          if (toc[j].level <= level) {
            subEndIndex = j;
            break;
          }
        }
        
        // Create subsection
        subsections.push({
          title: toc[i].title,
          level,
          content: '',
          subsections: this.buildSubsections(toc, i + 1, subEndIndex, level + 1)
        });
        
        // Move to next section at this level
        i = subEndIndex - 1;
      }
    }
    
    return subsections;
  }

  /**
   * Extract section content based on section title
   */
  private extractSectionContent(text: string, sectionTitle: string): string {
    // Try to find the section title in the text
    const escapedTitle = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(^|\\n)\\s*${escapedTitle}\\s*(?:\\n|$)`, 'i');
    
    const match = text.match(pattern);
    if (!match) {
      return '';
    }
    
    const startIndex = match.index! + match[0].length;
    
    // Find the end of this section (next heading or end of text)
    let endIndex = text.length;
    
    // Common heading patterns to detect the next section
    const headingPatterns = [
      /\n(?:Chapter|Section)\s+\d+/i,
      /\n\d+\.\d+\s+[A-Z]/i,
      /\n[A-Z][A-Z\s]{2,}\n/,
      /\n[^\n]{5,100}\n[=-]{3,}/
    ];
    
    for (const pattern of headingPatterns) {
      const nextHeading = text.slice(startIndex).search(pattern);
      if (nextHeading !== -1 && startIndex + nextHeading < endIndex) {
        endIndex = startIndex + nextHeading;
      }
    }
    
    return text.slice(startIndex, endIndex).trim();
  }

  /**
   * Emit progress event
   */
  private emitProgress(
    status: OCRProgressInfo['status'],
    progress: number,
    message: string,
    error?: Error
  ): void {
    const progressInfo: OCRProgressInfo = {
      status,
      progress,
      currentOperation: message,
      timeElapsed: this.startTime ? Date.now() - this.startTime : undefined,
      error
    };
    
    // Emit progress event
    this.emit('progress', progressInfo);
    
    // Call progress callback if provided
    if (this.options.progressCallback) {
      this.options.progressCallback(progressInfo);
    }
  }

  /**
   * Log message to console or custom logger
   */
  private log(message: string, level: 'info' | 'warn' | 'error'): void {
    if (this.options.logger) {
      this.options.logger(message, level);
    } else {
      switch (level) {
        case 'info':
          console.log(`[OCRProcessor] ${message}`);
          break;
        case 'warn':
          console.warn(`[OCRProcessor] ${message}`);
          break;
        case 'error':
          console.error(`[OCRProcessor] ${message}`);
          break;
      }
    }
  }

  /**
   * Check if processing should be aborted
   */
  private checkAbort(): void {
    if (this.aborted) {
      throw new Error('OCR processing was aborted');
    }
    
    if (this.options.abortSignal && this.options.abortSignal.aborted) {
      this.aborted = true;
      throw new Error('OCR processing was aborted');
    }
  }
}

// Example usage:
/*
import { OCRProcessor, OCRProgressInfo } from './OCRProcessor';

// Initialize OCR processor
const processor = new OCRProcessor({
  language: 'eng',
  preprocessImage: true,
  detectStructure: true,
  workerCount: 2,
  progressCallback: (progress: OCRProgressInfo) => {
    console.log(`Status: ${progress.status}, Progress: ${progress.progress}%, Message: ${progress.currentOperation}`);
  }
});

// Process a form
async function processForm(imageFile: File) {
  try {
    // Process image
    const result = await processor.processImage(imageFile);
    
    console.log(`Extracted text: ${result.text}`);
    console.log(`Confidence: ${result.confidence}%`);
    console.log(`Processing time: ${result.processTime}ms`);
    
    // Extract structured content
    const structured = await processor.extractStructuredContent([result.text]);
    
    console.log('Document title:', structured.title);
    console.log('Document sections:', structured.sections.length);
    
    // Extract tables
    const tables = await processor.extractTables(imageFile);
    console.log('Detected tables:', tables.length);
    
    // Clean up
    await processor.terminate();
  } catch (error) {
    console.error('OCR processing failed:', error);
  }
}

// Process an uploaded file
const fileInput = document.getElementById('file-input') as HTMLInputElement;
fileInput.addEventListener('change', (event) => {
  const file = fileInput.files?.[0];
  if (file) {
    processForm(file);
  }
});

// Abort processing
const abortButton = document.getElementById('abort-button');
abortButton?.addEventListener('click', () => {
  processor.abort();
});
*/
