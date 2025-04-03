/**
 * Language Translation Service
 * 
 * Provides language detection and translation capabilities for multi-language documents:
 * - Automatic language detection
 * - Text translation between languages
 * - Terminology standardization across languages
 * - Support for aviation-specific vocabulary
 */

import { logger } from '../core/logger';

// Supported languages with their ISO 639-1 codes
export enum SupportedLanguage {
  ENGLISH = 'en',
  SPANISH = 'es',
  FRENCH = 'fr',
  GERMAN = 'de',
  ITALIAN = 'it',
  PORTUGUESE = 'pt',
  RUSSIAN = 'ru',
  CHINESE = 'zh',
  JAPANESE = 'ja',
  KOREAN = 'ko',
  ARABIC = 'ar'
}

// Language names mapping for user-friendly display
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  [SupportedLanguage.ENGLISH]: 'English',
  [SupportedLanguage.SPANISH]: 'Spanish',
  [SupportedLanguage.FRENCH]: 'French',
  [SupportedLanguage.GERMAN]: 'German',
  [SupportedLanguage.ITALIAN]: 'Italian',
  [SupportedLanguage.PORTUGUESE]: 'Portuguese',
  [SupportedLanguage.RUSSIAN]: 'Russian',
  [SupportedLanguage.CHINESE]: 'Chinese',
  [SupportedLanguage.JAPANESE]: 'Japanese',
  [SupportedLanguage.KOREAN]: 'Korean',
  [SupportedLanguage.ARABIC]: 'Arabic'
};

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
  confidence: number;
  processingTimeMs: number;
  characterCount: number;
}

export interface LanguageDetectionResult {
  detectedLanguage: SupportedLanguage;
  confidence: number;
  possibleLanguages?: Array<{
    language: SupportedLanguage;
    confidence: number;
  }>;
  processingTimeMs: number;
}

export interface TranslationOptions {
  preserveFormatting?: boolean;
  glossary?: Record<string, string>; // source term -> target term
  preserveTerminology?: boolean;
  highQuality?: boolean;
}

const DEFAULT_OPTIONS: TranslationOptions = {
  preserveFormatting: true,
  preserveTerminology: true,
  highQuality: true
};

// Aviation-specific terminology glossary (English base)
const AVIATION_TERMINOLOGY: Record<string, Record<SupportedLanguage, string>> = {
  'approach': {
    [SupportedLanguage.ENGLISH]: 'approach',
    [SupportedLanguage.SPANISH]: 'aproximación',
    [SupportedLanguage.FRENCH]: 'approche',
    [SupportedLanguage.GERMAN]: 'Anflug',
    [SupportedLanguage.ITALIAN]: 'avvicinamento',
    [SupportedLanguage.PORTUGUESE]: 'aproximação',
    [SupportedLanguage.RUSSIAN]: 'заход на посадку',
    [SupportedLanguage.CHINESE]: '进场',
    [SupportedLanguage.JAPANESE]: '進入',
    [SupportedLanguage.KOREAN]: '접근',
    [SupportedLanguage.ARABIC]: 'اقتراب'
  },
  'takeoff': {
    [SupportedLanguage.ENGLISH]: 'takeoff',
    [SupportedLanguage.SPANISH]: 'despegue',
    [SupportedLanguage.FRENCH]: 'décollage',
    [SupportedLanguage.GERMAN]: 'Start',
    [SupportedLanguage.ITALIAN]: 'decollo',
    [SupportedLanguage.PORTUGUESE]: 'decolagem',
    [SupportedLanguage.RUSSIAN]: 'взлёт',
    [SupportedLanguage.CHINESE]: '起飞',
    [SupportedLanguage.JAPANESE]: '離陸',
    [SupportedLanguage.KOREAN]: '이륙',
    [SupportedLanguage.ARABIC]: 'إقلاع'
  },
  'landing': {
    [SupportedLanguage.ENGLISH]: 'landing',
    [SupportedLanguage.SPANISH]: 'aterrizaje',
    [SupportedLanguage.FRENCH]: 'atterrissage',
    [SupportedLanguage.GERMAN]: 'Landung',
    [SupportedLanguage.ITALIAN]: 'atterraggio',
    [SupportedLanguage.PORTUGUESE]: 'pouso',
    [SupportedLanguage.RUSSIAN]: 'посадка',
    [SupportedLanguage.CHINESE]: '着陆',
    [SupportedLanguage.JAPANESE]: '着陸',
    [SupportedLanguage.KOREAN]: '착륙',
    [SupportedLanguage.ARABIC]: 'هبوط'
  },
  'runway': {
    [SupportedLanguage.ENGLISH]: 'runway',
    [SupportedLanguage.SPANISH]: 'pista',
    [SupportedLanguage.FRENCH]: 'piste',
    [SupportedLanguage.GERMAN]: 'Landebahn',
    [SupportedLanguage.ITALIAN]: 'pista',
    [SupportedLanguage.PORTUGUESE]: 'pista',
    [SupportedLanguage.RUSSIAN]: 'взлётно-посадочная полоса',
    [SupportedLanguage.CHINESE]: '跑道',
    [SupportedLanguage.JAPANESE]: '滑走路',
    [SupportedLanguage.KOREAN]: '활주로',
    [SupportedLanguage.ARABIC]: 'مدرج'
  },
  'flight level': {
    [SupportedLanguage.ENGLISH]: 'flight level',
    [SupportedLanguage.SPANISH]: 'nivel de vuelo',
    [SupportedLanguage.FRENCH]: 'niveau de vol',
    [SupportedLanguage.GERMAN]: 'Flugfläche',
    [SupportedLanguage.ITALIAN]: 'livello di volo',
    [SupportedLanguage.PORTUGUESE]: 'nível de voo',
    [SupportedLanguage.RUSSIAN]: 'эшелон полёта',
    [SupportedLanguage.CHINESE]: '飞行高度层',
    [SupportedLanguage.JAPANESE]: '飛行レベル',
    [SupportedLanguage.KOREAN]: '비행고도',
    [SupportedLanguage.ARABIC]: 'مستوى الطيران'
  }
};

/**
 * Detect the language of a text
 * @param text The text to analyze
 * @returns The detected language and confidence score
 */
export async function detectLanguage(text: string): Promise<LanguageDetectionResult> {
  const startTime = Date.now();
  
  try {
    // In a real implementation, this would call a language detection API
    // For now, we'll use a simple language detection based on character frequencies
    
    // Create a language detector based on character n-grams
    const detectionResult = detectLanguageInternal(text);
    
    return {
      ...detectionResult,
      processingTimeMs: Date.now() - startTime
    };
  } catch (error) {
    logger.error('Language detection error', { context: { error } });
    // Default to English if detection fails
    return {
      detectedLanguage: SupportedLanguage.ENGLISH,
      confidence: 0.5,
      processingTimeMs: Date.now() - startTime
    };
  }
}

/**
 * Translate text from source to target language
 * @param text The text to translate
 * @param sourceLanguage Source language (or auto for detection)
 * @param targetLanguage Target language
 * @param options Translation options
 * @returns The translated text
 */
export async function translateText(
  text: string, 
  sourceLanguage: SupportedLanguage | 'auto', 
  targetLanguage: SupportedLanguage,
  options: TranslationOptions = DEFAULT_OPTIONS
): Promise<TranslationResult> {
  const startTime = Date.now();
  
  try {
    // If source language is 'auto', detect it
    let detectedSourceLanguage = sourceLanguage;
    let confidence = 1.0;
    
    if (sourceLanguage === 'auto') {
      const detectionResult = await detectLanguage(text);
      detectedSourceLanguage = detectionResult.detectedLanguage;
      confidence = detectionResult.confidence;
    }
    
    // If source and target are the same, return the original text
    if (detectedSourceLanguage === targetLanguage) {
      return {
        translatedText: text,
        sourceLanguage: detectedSourceLanguage as SupportedLanguage,
        targetLanguage,
        confidence: 1.0,
        processingTimeMs: Date.now() - startTime,
        characterCount: text.length
      };
    }
    
    // In a real implementation, this would call a translation API
    // For demonstration purposes, we'll implement a mock translation
    
    // Apply aviation terminology glossary if preserveTerminology is enabled
    let translatedText = text;
    if (options.preserveTerminology) {
      translatedText = applyAviationTerminology(
        text, 
        detectedSourceLanguage as SupportedLanguage, 
        targetLanguage
      );
    } else {
      // Mock translation
      translatedText = mockTranslate(text, targetLanguage);
    }
    
    // Custom glossary handling
    if (options.glossary && Object.keys(options.glossary).length > 0) {
      translatedText = applyCustomGlossary(translatedText, options.glossary);
    }
    
    return {
      translatedText,
      sourceLanguage: detectedSourceLanguage as SupportedLanguage,
      targetLanguage,
      confidence,
      processingTimeMs: Date.now() - startTime,
      characterCount: text.length
    };
  } catch (error) {
    logger.error('Translation error', { 
      context: { 
        error, 
        sourceLanguage, 
        targetLanguage 
      }
    });
    throw new Error(`Translation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Standardize terminology across documents in different languages
 * @param texts Map of texts by language code
 * @param referenceLanguage The reference language for standardization
 * @returns Map of standardized texts by language code
 */
export async function standardizeTerminology(
  texts: Record<SupportedLanguage, string>,
  referenceLanguage: SupportedLanguage = SupportedLanguage.ENGLISH
): Promise<Record<SupportedLanguage, string>> {
  const standardizedTexts: Record<SupportedLanguage, string> = {};
  
  // For each language, apply aviation terminology based on the reference language
  for (const [languageCode, text] of Object.entries(texts) as [SupportedLanguage, string][]) {
    if (languageCode === referenceLanguage) {
      standardizedTexts[languageCode] = text;
      continue;
    }
    
    standardizedTexts[languageCode] = applyAviationTerminology(
      text,
      languageCode,
      referenceLanguage
    );
  }
  
  return standardizedTexts;
}

/**
 * Internal language detection based on character frequencies
 * This is a simplified implementation for demonstration
 */
function detectLanguageInternal(text: string): {
  detectedLanguage: SupportedLanguage;
  confidence: number;
  possibleLanguages: Array<{
    language: SupportedLanguage;
    confidence: number;
  }>;
} {
  // Character frequency analysis
  // For production use, this would be replaced with a proper language detection library
  
  // Simplified character set detection
  const hasLatin = /[a-zA-Z]/.test(text);
  const hasCyrillic = /[а-яА-Я]/.test(text);
  const hasChinese = /[\u4E00-\u9FFF]/.test(text);
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
  const hasKorean = /[\uAC00-\uD7AF\u1100-\u11FF]/.test(text);
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  
  // Calculate language scores
  const possibleLanguages: Array<{
    language: SupportedLanguage;
    confidence: number;
  }> = [];
  
  if (hasChinese) {
    possibleLanguages.push({ language: SupportedLanguage.CHINESE, confidence: 0.9 });
  }
  
  if (hasJapanese) {
    possibleLanguages.push({ language: SupportedLanguage.JAPANESE, confidence: 0.9 });
  }
  
  if (hasKorean) {
    possibleLanguages.push({ language: SupportedLanguage.KOREAN, confidence: 0.9 });
  }
  
  if (hasCyrillic) {
    possibleLanguages.push({ language: SupportedLanguage.RUSSIAN, confidence: 0.9 });
  }
  
  if (hasArabic) {
    possibleLanguages.push({ language: SupportedLanguage.ARABIC, confidence: 0.9 });
  }
  
  if (hasLatin) {
    // For Latin-based languages, we need more sophisticated analysis
    // Here's a simplified approach based on common character frequencies
    
    // Count word-initial frequencies of two-letter combinations
    const wordInitials: Record<string, number> = {};
    const words = text.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      if (word.length >= 2) {
        const initial = word.substring(0, 2);
        wordInitials[initial] = (wordInitials[initial] || 0) + 1;
      }
    }
    
    // Language signatures based on common two-letter word beginnings
    const signatures: Record<SupportedLanguage, string[]> = {
      [SupportedLanguage.ENGLISH]: ['th', 'an', 'to', 'in', 'is', 'it', 'be', 'as', 'at', 'so', 'we', 'he', 'by', 'or', 'on', 'do'],
      [SupportedLanguage.SPANISH]: ['de', 'la', 'el', 'en', 'qu', 'es', 'un', 'co', 'se', 'lo', 'pa', 'po', 'ha', 'su', 'al'],
      [SupportedLanguage.FRENCH]: ['le', 'la', 'de', 'un', 'et', 'en', 'il', 'qu', 'je', 'ce', 'pa', 'da', 'au', 'po', 'vo'],
      [SupportedLanguage.GERMAN]: ['de', 'di', 'da', 'ei', 'zu', 'mi', 'au', 'un', 'vo', 'be', 'si', 'wi', 'ge', 'an', 'we'],
      [SupportedLanguage.ITALIAN]: ['di', 'il', 'la', 'ch', 'un', 'pe', 'no', 'so', 'co', 'qu', 'ha', 'si', 'mi', 'tu', 'se'],
      [SupportedLanguage.PORTUGUESE]: ['de', 'a ', 'qu', 'co', 'se', 'pa', 'es', 'pr', 'po', 'do', 'um', 'as', 'ma', 'te']
    };
    
    // Calculate scores based on signature matches
    for (const [language, signature] of Object.entries(signatures) as [SupportedLanguage, string[]][]) {
      let matchCount = 0;
      let totalSignatures = signature.length;
      
      for (const initial of signature) {
        if (wordInitials[initial]) {
          matchCount++;
        }
      }
      
      const score = matchCount / totalSignatures;
      if (score > 0.1) { // Only include if there's a significant match
        possibleLanguages.push({ language, confidence: score });
      }
    }
    
    // If no specific Latin language was detected with high confidence, default to English
    if (!possibleLanguages.some(lang => 
      lang.language !== SupportedLanguage.RUSSIAN && 
      lang.language !== SupportedLanguage.CHINESE &&
      lang.language !== SupportedLanguage.JAPANESE &&
      lang.language !== SupportedLanguage.KOREAN &&
      lang.language !== SupportedLanguage.ARABIC &&
      lang.confidence > 0.3
    )) {
      possibleLanguages.push({ language: SupportedLanguage.ENGLISH, confidence: 0.5 });
    }
  }
  
  // If no language was detected, default to English
  if (possibleLanguages.length === 0) {
    possibleLanguages.push({ language: SupportedLanguage.ENGLISH, confidence: 0.5 });
  }
  
  // Sort by confidence
  possibleLanguages.sort((a, b) => b.confidence - a.confidence);
  
  return {
    detectedLanguage: possibleLanguages[0].language,
    confidence: possibleLanguages[0].confidence,
    possibleLanguages
  };
}

/**
 * Apply aviation terminology glossary to a text
 */
function applyAviationTerminology(
  text: string,
  sourceLanguage: SupportedLanguage,
  targetLanguage: SupportedLanguage
): string {
  let translatedText = text;
  
  // For each term in the glossary, replace occurrences
  for (const [englishTerm, translations] of Object.entries(AVIATION_TERMINOLOGY)) {
    const sourceTerm = translations[sourceLanguage];
    const targetTerm = translations[targetLanguage];
    
    // Skip if source or target term is not available
    if (!sourceTerm || !targetTerm) continue;
    
    // Replace all occurrences (case-insensitive)
    const regex = new RegExp(escapeRegExp(sourceTerm), 'gi');
    translatedText = translatedText.replace(regex, match => {
      // Preserve case pattern from original
      if (match === match.toLowerCase()) return targetTerm.toLowerCase();
      if (match === match.toUpperCase()) return targetTerm.toUpperCase();
      if (match.charAt(0) === match.charAt(0).toUpperCase()) {
        return targetTerm.charAt(0).toUpperCase() + targetTerm.slice(1);
      }
      return targetTerm;
    });
  }
  
  return translatedText;
}

/**
 * Apply custom glossary to a text
 */
function applyCustomGlossary(text: string, glossary: Record<string, string>): string {
  let translatedText = text;
  
  // For each term in the glossary, replace occurrences
  for (const [sourceTerm, targetTerm] of Object.entries(glossary)) {
    // Skip if source or target term is not available
    if (!sourceTerm || !targetTerm) continue;
    
    // Replace all occurrences (case-insensitive)
    const regex = new RegExp(escapeRegExp(sourceTerm), 'gi');
    translatedText = translatedText.replace(regex, match => {
      // Preserve case pattern from original
      if (match === match.toLowerCase()) return targetTerm.toLowerCase();
      if (match === match.toUpperCase()) return targetTerm.toUpperCase();
      if (match.charAt(0) === match.charAt(0).toUpperCase()) {
        return targetTerm.charAt(0).toUpperCase() + targetTerm.slice(1);
      }
      return targetTerm;
    });
  }
  
  return translatedText;
}

/**
 * Mock translation function (for demonstration only)
 * In a real implementation, this would call an external translation API
 */
function mockTranslate(text: string, targetLanguage: SupportedLanguage): string {
  // Mock translation by appending an indicator
  return `[${LANGUAGE_NAMES[targetLanguage]}] ${text}`;
}

/**
 * Utility to escape special characters in regular expressions
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}