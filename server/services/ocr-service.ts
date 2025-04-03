/**
 * OCR Service
 * 
 * This service provides OCR (Optical Character Recognition) capabilities using Tesseract.js.
 * It extracts text from images and scanned documents, supporting multiple languages and
 * optimized for aviation-related content.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createWorker, createScheduler } from 'tesseract.js';
import { logger } from '../core/logger';

export interface OCROptions {
  language?: string | string[];
  pageSegmentationMode?: number;
  engineMode?: number;
  oem?: number;
  psm?: number;
  tessedit_char_whitelist?: string;
  preserve_interword_spaces?: string;
  tessjs_create_pdf?: string;
  tessjs_pdf_name?: string;
  tessjs_pdf_title?: string;
  useScheduler?: boolean;
  workerCount?: number;
}

export interface OCRResult {
  text: string;
  confidence: number;
  words: { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }[];
  lines: { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }[];
  blocks: { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }[];
  hocr?: string;
  pdf?: Uint8Array;
  language?: string;
  orientation?: { angle: number; confidence: number };
  processingTimeMs: number;
}

const DEFAULT_OPTIONS: OCROptions = {
  language: 'eng',
  pageSegmentationMode: 3, // Auto page segmentation with OSD (Orientation and Script Detection)
  useScheduler: false,
  workerCount: 1,
};

// Aviation-specific word whitelist
const AVIATION_CHAR_WHITELIST = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-+.,°():/\\';

/**
 * Performs OCR on an image file
 * @param imagePath Path to the image file
 * @param options OCR options
 * @returns The OCR result
 */
export async function performOCR(imagePath: string, options: OCROptions = {}): Promise<OCRResult> {
  const startTime = Date.now();
  
  // Merge default options with provided options
  const mergedOptions: OCROptions = { ...DEFAULT_OPTIONS, ...options };
  
  // For aviation documents, add character whitelist if not specified
  if (!mergedOptions.tessedit_char_whitelist) {
    mergedOptions.tessedit_char_whitelist = AVIATION_CHAR_WHITELIST;
  }
  
  // Use scheduler for multi-core processing if specified
  if (mergedOptions.useScheduler && mergedOptions.workerCount && mergedOptions.workerCount > 1) {
    return await performScheduledOCR(imagePath, mergedOptions);
  }
  
  try {
    // Create worker
    const worker = await createWorker({
      logger: (m) => logger.debug('Tesseract log', { context: { message: m } }),
    });
    
    // Load language data
    const languages = Array.isArray(mergedOptions.language) 
      ? mergedOptions.language 
      : [mergedOptions.language || 'eng'];
    
    for (const lang of languages) {
      await worker.loadLanguage(lang);
    }
    
    // Initialize with primary language (first in the list)
    await worker.initialize(Array.isArray(mergedOptions.language) 
      ? mergedOptions.language[0] 
      : (mergedOptions.language || 'eng'));
    
    // Set additional parameters
    if (mergedOptions.psm !== undefined) {
      await worker.setParameters({
        tessedit_pageseg_mode: mergedOptions.psm,
      });
    }
    
    if (mergedOptions.oem !== undefined) {
      await worker.setParameters({
        tessedit_ocr_engine_mode: mergedOptions.oem,
      });
    }
    
    if (mergedOptions.tessedit_char_whitelist) {
      await worker.setParameters({
        tessedit_char_whitelist: mergedOptions.tessedit_char_whitelist,
      });
    }
    
    if (mergedOptions.preserve_interword_spaces) {
      await worker.setParameters({
        preserve_interword_spaces: mergedOptions.preserve_interword_spaces,
      });
    }
    
    // Read image file
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Recognize text
    const { data } = await worker.recognize(imageBuffer);
    
    // Terminate worker
    await worker.terminate();
    
    const endTime = Date.now();
    
    // Map the result to our OCRResult interface
    const result: OCRResult = {
      text: data.text,
      confidence: data.confidence,
      words: data.words,
      lines: Array.isArray(data.lines) ? data.lines : [],
      blocks: Array.isArray(data.blocks) ? data.blocks : [],
      orientation: data.orientation,
      language: Array.isArray(mergedOptions.language) ? mergedOptions.language[0] : mergedOptions.language,
      processingTimeMs: endTime - startTime,
    };
    
    return result;
  } catch (error) {
    logger.error('OCR processing error', { context: { error, imagePath } });
    throw new Error(`Failed to perform OCR on image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Performs OCR using the Tesseract scheduler for processing large documents or multiple images
 * @param imagePath Path to the image file
 * @param options OCR options
 * @returns The OCR result
 */
async function performScheduledOCR(imagePath: string, options: OCROptions): Promise<OCRResult> {
  const startTime = Date.now();
  
  try {
    // Create scheduler
    const scheduler = createScheduler();
    const workerCount = options.workerCount || 2;
    
    // Create workers
    const workers = [];
    for (let i = 0; i < workerCount; i++) {
      const worker = await createWorker({
        logger: (m) => logger.debug(`Tesseract worker ${i} log`, { context: { message: m } }),
      });
      
      // Load language data
      const languages = Array.isArray(options.language) 
        ? options.language 
        : [options.language || 'eng'];
      
      for (const lang of languages) {
        await worker.loadLanguage(lang);
      }
      
      // Initialize with primary language (first in the list)
      await worker.initialize(Array.isArray(options.language) 
        ? options.language[0] 
        : (options.language || 'eng'));
      
      // Set additional parameters
      if (options.psm !== undefined) {
        await worker.setParameters({
          tessedit_pageseg_mode: options.psm,
        });
      }
      
      if (options.oem !== undefined) {
        await worker.setParameters({
          tessedit_ocr_engine_mode: options.oem,
        });
      }
      
      if (options.tessedit_char_whitelist) {
        await worker.setParameters({
          tessedit_char_whitelist: options.tessedit_char_whitelist,
        });
      }
      
      if (options.preserve_interword_spaces) {
        await worker.setParameters({
          preserve_interword_spaces: options.preserve_interword_spaces,
        });
      }
      
      workers.push(worker);
      scheduler.addWorker(worker);
    }
    
    // Read image file
    const imageBuffer = fs.readFileSync(imagePath);
    
    // Recognize text
    const { data } = await scheduler.addJob('recognize', imageBuffer);
    
    // Terminate workers and scheduler
    await scheduler.terminate();
    
    const endTime = Date.now();
    
    // Map the result to our OCRResult interface
    const result: OCRResult = {
      text: data.text,
      confidence: data.confidence,
      words: data.words,
      lines: Array.isArray(data.lines) ? data.lines : [],
      blocks: Array.isArray(data.blocks) ? data.blocks : [],
      orientation: data.orientation,
      language: Array.isArray(options.language) ? options.language[0] : options.language,
      processingTimeMs: endTime - startTime,
    };
    
    return result;
  } catch (error) {
    logger.error('Scheduled OCR processing error', { context: { error, imagePath } });
    throw new Error(`Failed to perform scheduled OCR on image: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Performs OCR on a PDF file by extracting and processing all images
 * @param pdfPath Path to the PDF file
 * @param options OCR options
 * @returns Array of OCR results, one per page
 */
export async function performPdfOCR(pdfPath: string, options: OCROptions = {}): Promise<OCRResult[]> {
  // This would use pdf.js or similar to extract images from PDF pages
  // and then process each with the OCR engine
  // For now, we'll just throw an error indicating this isn't implemented yet
  throw new Error('PDF OCR extraction not implemented yet');
}

/**
 * Performs OCR on multiple images in a directory
 * @param directoryPath Path to directory containing images
 * @param options OCR options
 * @returns Array of OCR results, one per image
 */
export async function batchProcessImages(directoryPath: string, options: OCROptions = {}): Promise<Map<string, OCRResult>> {
  const results = new Map<string, OCRResult>();
  
  try {
    // Read all files in the directory
    const files = fs.readdirSync(directoryPath);
    
    // Filter image files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif', '.gif'];
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return imageExtensions.includes(ext);
    });
    
    // Process each image
    for (const imageFile of imageFiles) {
      const imagePath = path.join(directoryPath, imageFile);
      try {
        const result = await performOCR(imagePath, options);
        results.set(imageFile, result);
      } catch (error) {
        logger.error(`Failed to process image: ${imageFile}`, { context: { error } });
        results.set(imageFile, {
          text: '',
          confidence: 0,
          words: [],
          lines: [],
          blocks: [],
          processingTimeMs: 0,
        });
      }
    }
    
    return results;
  } catch (error) {
    logger.error('Batch image processing error', { context: { error, directoryPath } });
    throw new Error(`Failed to batch process images: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Performs post-processing on OCR results to improve accuracy for aviation documents
 * @param ocrResult The OCR result to post-process
 * @returns The post-processed OCR result
 */
export function postProcessAviationOCR(ocrResult: OCRResult): OCRResult {
  let processedText = ocrResult.text;
  
  // Replace common OCR errors in aviation documents
  const replacements: [RegExp, string][] = [
    [/(\d)O/g, '$10'], // Replace misrecognized "0" as "O" in numbers
    [/O(\d)/g, '0$1'], // Replace misrecognized "0" as "O" in numbers
    [/l(\d)/g, '1$1'], // Replace misrecognized "1" as "l" in numbers
    [/(\d)l/g, '$11'], // Replace misrecognized "1" as "l" in numbers
    [/\bFT\b/g, 'FL'], // Flight Level commonly misrecognized
    [/\bCL\b/g, 'CL'], // Centerline commonly misrecognized
    [/\bRWY\b/g, 'RWY'], // Runway commonly misrecognized
    [/\bTWY\b/g, 'TWY'], // Taxiway commonly misrecognized
    [/\bILS\b/g, 'ILS'], // ILS commonly misrecognized
    [/\bVOR\b/g, 'VOR'], // VOR commonly misrecognized
    [/\bDME\b/g, 'DME'], // DME commonly misrecognized
    [/\bNDB\b/g, 'NDB'], // NDB commonly misrecognized
    [/knols/g, 'knots'], // Knots commonly misrecognized
    [/\b(\d+)kt(s?)\b/g, '$1kt$2'], // Fix spacing in knots abbreviation
    [/\b(\d+)nm\b/g, '$1nm'], // Fix spacing in nautical miles abbreviation
    [/\b(\d+)ft\b/g, '$1ft'], // Fix spacing in feet abbreviation
  ];
  
  // Apply all replacements
  for (const [pattern, replacement] of replacements) {
    processedText = processedText.replace(pattern, replacement);
  }
  
  // Return the post-processed result
  return {
    ...ocrResult,
    text: processedText,
  };
}