import fs from 'fs';
import { promisify } from 'util';
import path from 'path';
import { parse as parseHtml } from 'node-html-parser';
import * as pdfjs from 'pdfjs-dist';
import { TextItem } from 'pdfjs-dist/types/src/display/api';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import cheerio from 'cheerio';
import { Logger, logger as defaultLogger } from './logger';
import { DocumentType } from '../../shared/document-types';

/**
 * Utility functions for document handling
 */
class DocumentUtils {
  private logger: Logger;

  constructor() {
    this.logger = defaultLogger;
  }
}

export const documentUtils = new DocumentUtils();
