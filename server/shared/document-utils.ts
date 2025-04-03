/**
 * Utility functions for document management and processing
 */

import { DocumentCategory, DocumentStatus, Document } from './document-types';

/**
 * Validate that a string is a valid DocumentCategory
 */
export function isValidDocumentCategory(category: string): category is DocumentCategory {
  const validCategories: DocumentCategory[] = [
    'regulation', 
    'syllabus', 
    'training', 
    'manual', 
    'aircraft', 
    'procedure',
    'form',
    'report',
    'certificate',
    'guidance',
    'other'
  ];
  
  return validCategories.includes(category as DocumentCategory);
}

/**
 * Validate that a string is a valid DocumentStatus
 */
export function isValidDocumentStatus(status: string): status is DocumentStatus {
  const validStatuses: DocumentStatus[] = [
    'draft',
    'review',
    'approved',
    'published',
    'archived',
    'deprecated'
  ];
  
  return validStatuses.includes(status as DocumentStatus);
}

/**
 * Get file extension from file name
 */
export function getFileExtension(fileName: string): string {
  return fileName.slice((fileName.lastIndexOf(".") - 1 >>> 0) + 2).toLowerCase();
}

/**
 * Check if a file type is supported for content extraction
 */
export function isSupportedForContentExtraction(fileType: string): boolean {
  const supportedTypes = ['pdf', 'docx', 'doc', 'txt', 'md', 'html', 'xml', 'pptx', 'xlsx', 'csv'];
  return supportedTypes.includes(fileType.toLowerCase());
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(extension: string): string {
  const mimeMap: {[key: string]: string} = {
    'pdf': 'application/pdf',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'doc': 'application/msword',
    'txt': 'text/plain',
    'md': 'text/markdown',
    'html': 'text/html',
    'htm': 'text/html',
    'xml': 'application/xml',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'ppt': 'application/vnd.ms-powerpoint',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'csv': 'text/csv',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'mp4': 'video/mp4',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip'
  };
  
  return mimeMap[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate a unique file name to avoid collisions
 */
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const ext = getFileExtension(originalName);
  const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
  
  return `${baseName}-${timestamp}-${randomStr}.${ext}`;
}

/**
 * Extract keywords from document text
 */
export function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  if (!text) return [];
  
  // Split text into words
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  // Count word occurrences
  const wordCount: {[key: string]: number} = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  // Filter out common stop words
  const stopWords = new Set([
    'this', 'that', 'these', 'those', 'with', 'from', 'have', 'will',
    'would', 'could', 'should', 'their', 'there', 'which', 'about',
    'when', 'what', 'where', 'here', 'some', 'such'
  ]);
  
  // Sort by frequency and return top keywords
  return Object.entries(wordCount)
    .filter(([word]) => !stopWords.has(word))
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Create a simple content summary for a document
 */
export function createSimpleSummary(text: string, maxLength: number = 200): string {
  if (!text) return '';
  
  // Get the first few sentences up to maxLength
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  let summary = '';
  
  for (const sentence of sentences) {
    if ((summary + sentence).length <= maxLength) {
      summary += sentence + '. ';
    } else {
      break;
    }
  }
  
  return summary.trim();
}

/**
 * Calculate a readability score for text (simplified Flesch-Kincaid)
 */
export function calculateReadabilityScore(text: string): number {
  if (!text) return 0;
  
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.trim().length > 0);
  const syllables = words.reduce((count, word) => count + countSyllables(word), 0);
  
  if (sentences.length === 0 || words.length === 0) return 0;
  
  // Simplified Flesch-Kincaid grade level
  const score = 0.39 * (words.length / sentences.length) + 11.8 * (syllables / words.length) - 15.59;
  
  // Return a score between 0 and 100
  return Math.max(0, Math.min(100, 100 - Math.round(score)));
}

/**
 * Count syllables in a word (simplified)
 */
function countSyllables(word: string): number {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  
  // Remove endings
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  
  // Count vowel groups
  const syllables = word.match(/[aeiouy]{1,2}/g);
  return syllables ? syllables.length : 1;
}

/**
 * Compare two documents for changes
 */
export function getDocumentDiff(oldDoc: Document, newDoc: Document): string[] {
  const changes: string[] = [];
  
  // Check title
  if (oldDoc.title !== newDoc.title) {
    changes.push(`Title changed from "${oldDoc.title}" to "${newDoc.title}"`);
  }
  
  // Check description
  if (oldDoc.description !== newDoc.description) {
    changes.push('Description modified');
  }
  
  // Check category
  if (oldDoc.category !== newDoc.category) {
    changes.push(`Category changed from "${oldDoc.category}" to "${newDoc.category}"`);
  }
  
  // Check status
  if (oldDoc.status !== newDoc.status) {
    changes.push(`Status changed from "${oldDoc.status}" to "${newDoc.status}"`);
  }
  
  // Check metadata
  if (JSON.stringify(oldDoc.metadata) !== JSON.stringify(newDoc.metadata)) {
    changes.push('Metadata updated');
  }
  
  // Check permissions
  if (JSON.stringify(oldDoc.permissions) !== JSON.stringify(newDoc.permissions)) {
    changes.push('Permissions modified');
  }
  
  // Check tags
  const oldTags = oldDoc.tags?.map(t => t.name).sort().join(',') || '';
  const newTags = newDoc.tags?.map(t => t.name).sort().join(',') || '';
  if (oldTags !== newTags) {
    changes.push('Tags updated');
  }
  
  return changes;
}

/**
 * Redact sensitive information
 */
export function redactSensitiveInfo(text: string): string {
  if (!text) return '';
  
  // Redact potential personal data
  return text
    // Email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL REDACTED]')
    // Phone numbers (various formats)
    .replace(/(\+\d{1,3}[-\s]?)?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{4}/g, '[PHONE REDACTED]')
    // SSN/SIN/other ID numbers
    .replace(/\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, '[ID REDACTED]')
    // Credit card numbers
    .replace(/\b(?:\d{4}[-\s]?){3}\d{4}\b/g, '[PAYMENT INFO REDACTED]')
    // Passport numbers (simplified)
    .replace(/\b[A-Z]{1,2}\d{6,9}\b/g, '[PASSPORT REDACTED]');
}

/**
 * Get default processing options
 */
export function getDefaultProcessingOptions() {
  return {
    extractText: true,
    analyzeContent: true,
    createKnowledgeGraph: false,
    extractEntities: true,
    generateSummary: true,
    identifyRegulations: false,
    performCompliance: false,
    ocrEnabled: true
  };
}

/**
 * Calculate relevance score between documents
 */
export function calculateDocumentRelevance(sourceDoc: Document, targetDoc: Document): number {
  let score = 0;
  const maxScore = 10;
  
  // Same category
  if (sourceDoc.category && targetDoc.category && sourceDoc.category === targetDoc.category) {
    score += 3;
  }
  
  // Matching tags
  const sourceTags = new Set(sourceDoc.tags?.map(t => t.name) || []);
  const targetTags = targetDoc.tags?.map(t => t.name) || [];
  const matchingTags = targetTags.filter(tag => sourceTags.has(tag));
  score += Math.min(3, matchingTags.length);
  
  // Keywords in title or description
  const sourceTitle = sourceDoc.title.toLowerCase();
  if (targetDoc.title.toLowerCase().includes(sourceTitle) || 
      (targetDoc.description || '').toLowerCase().includes(sourceTitle)) {
    score += 2;
  }
  
  // Same organization
  if (sourceDoc.organizationId && 
      targetDoc.organizationId && 
      sourceDoc.organizationId === targetDoc.organizationId) {
    score += 1;
  }
  
  // Related documents
  if (sourceDoc.relatedDocumentIds && sourceDoc.relatedDocumentIds.includes(targetDoc.id)) {
    score += 1;
  }
  
  return Math.min(maxScore, score) / maxScore;
}
