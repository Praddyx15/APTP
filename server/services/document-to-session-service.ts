/**
 * Document to Session Planning Service
 * 
 * This service integrates document analysis with session planning:
 * - Extracts relevant training content from uploaded documents
 * - Generates training forms from document content
 * - Creates compliance procedures from regulatory documents
 * - Organizes extracted content into session plans
 * - Tracks progression through document-based training materials
 */
import * as fs from 'fs';
import * as path from 'path';
import { documents, documentContent, sessionPlans, trainingSessions } from '@shared/schema';
import { db } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { logger } from '../core/logger';
import { DocumentAIEngine } from './document-ai-engine';
import { analyzeDocumentStructure } from './document-structure';
import { classifyDocument } from './document-classification';
import { parseDocumentContext } from './context-aware-parser';
import { buildKnowledgeGraph } from './knowledge-graph';
import { storage } from '../storage';
import { SyllabusGenerationOptions, GeneratedSyllabus, ExtractedModule, ExtractedLesson } from '@shared/syllabus-types';

// Create AI engine instance
const aiEngine = new DocumentAIEngine();

interface SessionPlanGenerationOptions {
  documentIds: number[];
  previousSessionId?: number;
  sessionId: number;
  analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
}

interface TrainingFormGenerationOptions {
  documentId: number;
  formType: string;
  extractionDepth?: 'basic' | 'detailed' | 'comprehensive';
}

interface ComplianceProcedureGenerationOptions {
  documentId: number;
  procedureType: string;
  regulatoryContext?: string;
}

/**
 * Generate a session plan from document content and previous session data
 */
export async function generateSessionPlanFromDocuments(options: SessionPlanGenerationOptions): Promise<any> {
  const { documentIds, previousSessionId, sessionId, analysisDepth = 'detailed' } = options;
  
  try {
    // Get the current session
    const session = await storage.getSession(sessionId);
    if (!session) {
      throw new Error(`Session with ID ${sessionId} not found`);
    }
    
    // Get previous session plan if provided
    let previousSessionPlan = null;
    let previousTopicsCovered: any[] = [];
    
    if (previousSessionId) {
      previousSessionPlan = await storage.getSessionPlan(previousSessionId);
      if (previousSessionPlan) {
        previousTopicsCovered = previousSessionPlan.currentTopics || [];
      }
    }
    
    // Analyze each document to extract relevant content
    const analyzedDocuments = await Promise.all(documentIds.map(async (docId) => {
      const document = await storage.getDocument(docId);
      if (!document) {
        logger.warn(`Document with ID ${docId} not found`, { context: { sessionId } });
        return null;
      }
      
      // Get document content
      const content = await storage.getDocumentContent(docId);
      if (!content?.content) {
        logger.warn(`No content found for document ${docId}`, { context: { sessionId } });
        return null;
      }
      
      // Analyze document based on configured depth
      let analysis: any = {};
      
      // Start with text content
      analysis.text = content.content;
      
      // Get document structure
      try {
        analysis.structure = await analyzeDocumentStructure(content.content);
      } catch (error) {
        logger.error('Error analyzing document structure', { context: { error, documentId: docId } });
      }
      
      // Get document classification
      try {
        analysis.classification = await classifyDocument(content.content);
      } catch (error) {
        logger.error('Error classifying document', { context: { error, documentId: docId } });
      }
      
      // For more detailed analysis, get context and knowledge graph
      if (analysisDepth === 'detailed' || analysisDepth === 'comprehensive') {
        try {
          analysis.context = await parseDocumentContext(docId, content.content);
        } catch (error) {
          logger.error('Error parsing document context', { context: { error, documentId: docId } });
        }
      }
      
      // For comprehensive analysis, extract knowledge graph
      if (analysisDepth === 'comprehensive') {
        try {
          analysis.knowledgeGraph = await buildKnowledgeGraph(content.content);
        } catch (error) {
          logger.error('Error building knowledge graph', { context: { error, documentId: docId } });
        }
      }
      
      return {
        document,
        content: content.content,
        analysis
      };
    }));
    
    // Remove null values (documents that weren't found)
    const validDocuments = analyzedDocuments.filter(doc => doc !== null);
    
    // If no valid documents, return a simple plan
    if (validDocuments.length === 0) {
      return {
        sessionId,
        previousSessionId,
        previousTopicsCovered,
        currentTopics: [],
        nextTopics: [],
        notes: 'No valid documents were found to generate a session plan.',
        resources: [],
        progressIndicators: {}
      };
    }
    
    // Extract topics from documents
    const extractedTopics = extractTopicsFromDocuments(validDocuments, analysisDepth);
    
    // Organize topics into current and next topics
    // Prioritize topics that weren't covered in the previous session
    const allTopics = extractedTopics.filter(topic => 
      !previousTopicsCovered.some(prevTopic => 
        prevTopic.title === topic.title || 
        prevTopic.description === topic.description
      )
    );
    
    // Split into current and next topics
    // For simplicity, we'll put half in current and half in next
    const midpoint = Math.ceil(allTopics.length / 2);
    const currentTopics = allTopics.slice(0, midpoint);
    const nextTopics = allTopics.slice(midpoint);
    
    // Generate resources list from documents
    const resources = validDocuments.map(doc => ({
      id: doc.document.id,
      title: doc.document.title,
      type: doc.document.type,
      url: doc.document.filePath,
      description: doc.document.description || 'Document resource'
    }));
    
    // Create the session plan
    const sessionPlan = {
      sessionId,
      previousSessionId,
      previousTopicsCovered,
      currentTopics,
      nextTopics,
      notes: generateNotesFromDocuments(validDocuments),
      resources,
      progressIndicators: {
        estimatedCompletion: calculateEstimatedCompletion(currentTopics, allTopics),
        difficultyLevel: estimateDifficultyLevel(currentTopics),
        preparationRequired: estimatePreparationRequired(currentTopics)
      }
    };
    
    return sessionPlan;
  } catch (error) {
    logger.error('Error generating session plan from documents', { 
      context: { error, sessionId, documentIds } 
    });
    throw error;
  }
}

/**
 * Extract topics from analyzed documents
 */
function extractTopicsFromDocuments(documents: any[], analysisDepth: string = 'detailed'): any[] {
  const topics: any[] = [];
  
  for (const doc of documents) {
    // Extract from headings in document structure
    if (doc.analysis.structure?.elements) {
      const headings = doc.analysis.structure.elements.filter(
        (el: any) => el.type === 'HEADING' && el.level <= 3
      );
      
      for (const heading of headings) {
        topics.push({
          title: heading.text,
          description: extractDescriptionForHeading(doc.analysis.structure.elements, heading),
          source: doc.document.title,
          documentId: doc.document.id,
          importance: calculateTopicImportance(heading, doc.analysis)
        });
      }
    }
    
    // Extract from document context if available
    if (analysisDepth !== 'basic' && doc.analysis.context?.sections) {
      for (const section of doc.analysis.context.sections) {
        if (section.title && !topics.some(t => t.title === section.title)) {
          topics.push({
            title: section.title,
            description: extractDescriptionFromContextSection(section),
            source: doc.document.title,
            documentId: doc.document.id,
            importance: section.contextualImportance / 100,
            entities: section.entities.slice(0, 5).map((e: any) => e.value)
          });
        }
      }
    }
    
    // Extract from knowledge graph for comprehensive analysis
    if (analysisDepth === 'comprehensive' && doc.analysis.knowledgeGraph?.nodes) {
      const conceptNodes = doc.analysis.knowledgeGraph.nodes
        .filter((node: any) => node.type === 'CONCEPT' || node.type === 'TOPIC')
        .slice(0, 10);
      
      for (const node of conceptNodes) {
        if (!topics.some(t => t.title === node.content)) {
          // Find connected nodes to build description
          const connectedNodes = findConnectedNodes(node.id, doc.analysis.knowledgeGraph);
          
          topics.push({
            title: node.content,
            description: connectedNodes.map((n: any) => n.content).join('. '),
            source: doc.document.title,
            documentId: doc.document.id,
            importance: calculateNodeImportance(node, doc.analysis.knowledgeGraph),
            relatedConcepts: connectedNodes.slice(0, 3).map((n: any) => n.content)
          });
        }
      }
    }
  }
  
  // Remove duplicates and sort by importance
  const uniqueTopics = removeDuplicateTopics(topics);
  return uniqueTopics.sort((a, b) => (b.importance || 0) - (a.importance || 0));
}

/**
 * Extract description for a heading from document elements
 */
function extractDescriptionForHeading(elements: any[], heading: any): string {
  // Find elements that come after this heading but before the next heading
  const headingIndex = elements.findIndex(el => el === heading);
  if (headingIndex === -1) return '';
  
  const nextHeadingIndex = elements.findIndex(
    (el, idx) => idx > headingIndex && el.type === 'HEADING' && el.level <= heading.level
  );
  
  const endIndex = nextHeadingIndex !== -1 ? nextHeadingIndex : elements.length;
  const relevantElements = elements.slice(headingIndex + 1, endIndex);
  
  // Extract text from paragraphs
  const paragraphs = relevantElements
    .filter(el => el.type === 'PARAGRAPH')
    .map(el => el.text)
    .join(' ');
  
  // Return first 200 characters as description
  return paragraphs.length > 200 ? paragraphs.substring(0, 197) + '...' : paragraphs;
}

/**
 * Extract description from a context section
 */
function extractDescriptionFromContextSection(section: any): string {
  if (section.entities && section.entities.length > 0) {
    // Create description from entities
    return section.entities
      .slice(0, 5)
      .map((e: any) => e.value)
      .join(', ');
  }
  
  return '';
}

/**
 * Find connected nodes in a knowledge graph
 */
function findConnectedNodes(nodeId: string, graph: any): any[] {
  if (!graph.edges) return [];
  
  const connectedEdges = graph.edges.filter(
    (edge: any) => edge.source === nodeId || edge.target === nodeId
  );
  
  const connectedNodeIds = new Set<string>();
  
  for (const edge of connectedEdges) {
    if (edge.source !== nodeId) connectedNodeIds.add(edge.source);
    if (edge.target !== nodeId) connectedNodeIds.add(edge.target);
  }
  
  return Array.from(connectedNodeIds)
    .map(id => graph.nodes.find((n: any) => n.id === id))
    .filter(Boolean);
}

/**
 * Calculate importance of a topic based on heading level
 */
function calculateTopicImportance(heading: any, analysis: any): number {
  // Base importance on heading level (1-3)
  const levelImportance = 1 - ((heading.level - 1) / 4); // Level 1 = 1.0, Level 2 = 0.75, Level 3 = 0.5
  
  // If context analysis is available, consider entity count and mentions
  if (analysis.context) {
    const contextSection = analysis.context.sections.find(
      (s: any) => s.title === heading.text
    );
    
    if (contextSection) {
      const entityFactor = Math.min(1, contextSection.entities.length / 10);
      return (levelImportance * 0.7) + (entityFactor * 0.3);
    }
  }
  
  return levelImportance;
}

/**
 * Calculate importance of a knowledge graph node
 */
function calculateNodeImportance(node: any, graph: any): number {
  if (!graph.edges) return 0.5;
  
  // Count connections to this node
  const connections = graph.edges.filter(
    (edge: any) => edge.source === node.id || edge.target === node.id
  ).length;
  
  // More connections = more important
  return Math.min(1, connections / 10);
}

/**
 * Remove duplicate topics
 */
function removeDuplicateTopics(topics: any[]): any[] {
  const uniqueTopics: any[] = [];
  const titleSet = new Set<string>();
  
  for (const topic of topics) {
    // Skip if we've already seen this title
    if (titleSet.has(topic.title.toLowerCase())) continue;
    
    titleSet.add(topic.title.toLowerCase());
    uniqueTopics.push(topic);
  }
  
  return uniqueTopics;
}

/**
 * Generate notes from analyzed documents
 */
function generateNotesFromDocuments(documents: any[]): string {
  // Extract document titles and key insights
  const docInfos = documents.map(doc => {
    // Get key insights if available
    let insights: string[] = [];
    
    if (doc.analysis.context?.keyInsights) {
      insights = doc.analysis.context.keyInsights.slice(0, 3);
    } else if (doc.analysis.classification?.metadata?.keyTerms) {
      insights = Object.keys(doc.analysis.classification.metadata.keyTerms).slice(0, 5);
    }
    
    return {
      title: doc.document.title,
      insights
    };
  });
  
  // Compose notes
  let notes = 'Session plan generated from the following documents:\n\n';
  
  docInfos.forEach((info, idx) => {
    notes += `${idx + 1}. ${info.title}\n`;
    
    if (info.insights.length > 0) {
      notes += '   Key insights: ' + info.insights.join(', ') + '\n';
    }
    
    notes += '\n';
  });
  
  return notes;
}

/**
 * Calculate estimated completion percentage
 */
function calculateEstimatedCompletion(currentTopics: any[], allTopics: any[]): number {
  if (allTopics.length === 0) return 100;
  return Math.round((currentTopics.length / allTopics.length) * 100);
}

/**
 * Estimate difficulty level based on topics
 */
function estimateDifficultyLevel(topics: any[]): string {
  if (topics.length === 0) return 'medium';
  
  // Calculate average importance (higher importance = more difficult)
  const avgImportance = topics.reduce((sum, topic) => sum + (topic.importance || 0.5), 0) / topics.length;
  
  if (avgImportance >= 0.8) return 'high';
  if (avgImportance >= 0.5) return 'medium';
  return 'low';
}

/**
 * Estimate preparation required based on topics
 */
function estimatePreparationRequired(topics: any[]): string {
  if (topics.length === 0) return 'minimal';
  
  if (topics.length > 10) return 'extensive';
  if (topics.length > 5) return 'moderate';
  return 'minimal';
}

/**
 * Generate training form from document content
 */
export async function generateTrainingFormFromDocument(options: TrainingFormGenerationOptions): Promise<any> {
  const { documentId, formType, extractionDepth = 'detailed' } = options;
  
  try {
    // Get document and content
    const document = await storage.getDocument(documentId);
    if (!document) {
      throw new Error(`Document with ID ${documentId} not found`);
    }
    
    const content = await storage.getDocumentContent(documentId);
    if (!content?.content) {
      throw new Error(`No content found for document ${documentId}`);
    }
    
    // Analyze document structure and context
    const structure = await analyzeDocumentStructure(content.content);
    let context = null;
    
    if (extractionDepth !== 'basic') {
      context = await parseDocumentContext(documentId, content.content);
    }
    
    // Generate form based on type
    let formData: any = {
      title: `${document.title} - ${formType} Form`,
      description: document.description || '',
      documentId: document.id,
      generatedDate: new Date().toISOString(),
      formType,
      sections: []
    };
    
    // Generate form sections based on document structure
    switch (formType.toLowerCase()) {
      case 'checklist':
        formData = generateChecklistForm(document, structure, context);
        break;
      case 'assessment':
        formData = generateAssessmentForm(document, structure, context);
        break;
      case 'training':
        formData = generateTrainingForm(document, structure, context);
        break;
      case 'compliance':
        formData = generateComplianceForm(document, structure, context);
        break;
      default:
        formData = generateGenericForm(document, structure, context);
    }
    
    return formData;
  } catch (error) {
    logger.error('Error generating training form', { context: { error, documentId, formType } });
    throw error;
  }
}

/**
 * Generate a checklist form from document content
 */
function generateChecklistForm(document: any, structure: any, context: any): any {
  const form = {
    title: `${document.title} - Checklist`,
    description: document.description || 'Checklist generated from document content',
    documentId: document.id,
    generatedDate: new Date().toISOString(),
    formType: 'checklist',
    sections: [] as any[]
  };
  
  // Extract headings as checklist sections
  if (structure?.elements) {
    let currentSection: any = null;
    
    for (const element of structure.elements) {
      if (element.type === 'HEADING' && element.level <= 2) {
        // Create a new section
        currentSection = {
          title: element.text,
          items: []
        };
        form.sections.push(currentSection);
      } else if (element.type === 'LIST_ITEM' && currentSection) {
        // Add as a checklist item
        currentSection.items.push({
          text: element.text,
          required: true,
          notes: ''
        });
      } else if (element.type === 'PARAGRAPH' && currentSection && element.text.length < 100) {
        // Short paragraphs might be checklist items too
        currentSection.items.push({
          text: element.text,
          required: false,
          notes: ''
        });
      }
    }
  }
  
  // If form is empty or has very few sections, try using context
  if (form.sections.length < 2 && context?.sections) {
    for (const section of context.sections) {
      if (section.title) {
        const items = section.entities
          .filter((entity: any) => 
            entity.type === 'action' || 
            entity.type === 'procedure' || 
            entity.type === 'requirement'
          )
          .map((entity: any) => ({
            text: entity.value,
            required: true,
            notes: ''
          }));
        
        if (items.length > 0) {
          form.sections.push({
            title: section.title,
            items
          });
        }
      }
    }
  }
  
  return form;
}

/**
 * Generate an assessment form from document content
 */
function generateAssessmentForm(document: any, structure: any, context: any): any {
  const form = {
    title: `${document.title} - Assessment`,
    description: document.description || 'Assessment generated from document content',
    documentId: document.id,
    generatedDate: new Date().toISOString(),
    formType: 'assessment',
    sections: [] as any[],
    maxScore: 0,
    passingScore: 0
  };
  
  // Extract headings as assessment sections
  if (structure?.elements) {
    let currentSection: any = null;
    let questionCount = 0;
    
    for (const element of structure.elements) {
      if (element.type === 'HEADING' && element.level <= 2) {
        // Create a new section
        currentSection = {
          title: element.text,
          questions: []
        };
        form.sections.push(currentSection);
      } else if (element.type === 'PARAGRAPH' && currentSection && element.text.endsWith('?')) {
        // Paragraph ending with ? might be a question
        questionCount++;
        currentSection.questions.push({
          id: `q${questionCount}`,
          text: element.text,
          type: 'rating',
          options: ['1', '2', '3', '4', '5'],
          required: true,
          notes: ''
        });
      }
    }
    
    // Set max score based on question count
    form.maxScore = questionCount * 5;
    form.passingScore = Math.ceil(form.maxScore * 0.7);
  }
  
  // If form is empty or has very few questions, try using context
  if (form.sections.length === 0 || form.maxScore < 5) {
    form.sections = [];
    let questionCount = 0;
    
    if (context?.sections) {
      for (const section of context.sections) {
        if (section.title) {
          const questions = section.entities
            .filter((entity: any) => entity.type === 'SECTION_TITLE' || entity.context.includes('key'))
            .map((entity: any) => {
              questionCount++;
              return {
                id: `q${questionCount}`,
                text: `Demonstrate knowledge and understanding of ${entity.value}?`,
                type: 'rating',
                options: ['1', '2', '3', '4', '5'],
                required: true,
                notes: ''
              };
            });
          
          if (questions.length > 0) {
            form.sections.push({
              title: section.title,
              questions
            });
          }
        }
      }
      
      // Update max score
      form.maxScore = questionCount * 5;
      form.passingScore = Math.ceil(form.maxScore * 0.7);
    }
  }
  
  return form;
}

/**
 * Generate a training form from document content
 */
function generateTrainingForm(document: any, structure: any, context: any): any {
  const form = {
    title: `${document.title} - Training Form`,
    description: document.description || 'Training form generated from document content',
    documentId: document.id,
    generatedDate: new Date().toISOString(),
    formType: 'training',
    sections: [] as any[],
    learningObjectives: [] as string[]
  };
  
  // Extract learning objectives
  const objectives: string[] = [];
  
  if (structure?.elements) {
    // Look for a section that might contain learning objectives
    const objectivesHeadingIndex = structure.elements.findIndex((element: any) => 
      element.type === 'HEADING' && 
      (element.text.toLowerCase().includes('objective') || 
       element.text.toLowerCase().includes('goal') ||
       element.text.toLowerCase().includes('learning'))
    );
    
    if (objectivesHeadingIndex !== -1) {
      // Extract paragraphs until next heading
      const nextHeadingIndex = structure.elements.findIndex(
        (element: any, idx: number) => 
          idx > objectivesHeadingIndex && 
          element.type === 'HEADING'
      );
      
      const endIndex = nextHeadingIndex !== -1 ? nextHeadingIndex : structure.elements.length;
      const objectivesSection = structure.elements.slice(objectivesHeadingIndex + 1, endIndex);
      
      // Extract list items or paragraphs as objectives
      for (const element of objectivesSection) {
        if (element.type === 'LIST_ITEM' || element.type === 'PARAGRAPH') {
          objectives.push(element.text);
        }
      }
    }
    
    // Create sections based on headings
    let currentSection: any = null;
    
    for (const element of structure.elements) {
      if (element.type === 'HEADING' && element.level <= 2) {
        // Don't include the objectives section again
        if (element.text.toLowerCase().includes('objective') || 
            element.text.toLowerCase().includes('goal') ||
            element.text.toLowerCase().includes('learning')) {
          continue;
        }
        
        // Create a new section
        currentSection = {
          title: element.text,
          content: '',
          exercises: []
        };
        form.sections.push(currentSection);
      } else if (currentSection) {
        if (element.type === 'PARAGRAPH') {
          // Add to section content
          currentSection.content += element.text + '\n\n';
        } else if (element.type === 'LIST_ITEM') {
          // Might be an exercise or activity
          currentSection.exercises.push({
            instruction: element.text,
            completed: false,
            feedback: ''
          });
        }
      }
    }
  }
  
  // If no objectives were found, try extracting from context
  if (objectives.length === 0 && context?.entities) {
    const relevantEntities = context.entities.filter(
      (entity: any) => 
        entity.type === 'SKILL' || 
        entity.type === 'COMPETENCY' || 
        entity.type === 'KNOWLEDGE_AREA'
    );
    
    for (const entity of relevantEntities.slice(0, 5)) {
      objectives.push(`Understand and demonstrate knowledge of ${entity.value}`);
    }
  }
  
  form.learningObjectives = objectives;
  
  return form;
}

/**
 * Generate a compliance form from document content
 */
function generateComplianceForm(document: any, structure: any, context: any): any {
  const form = {
    title: `${document.title} - Compliance Form`,
    description: document.description || 'Compliance form generated from document content',
    documentId: document.id,
    generatedDate: new Date().toISOString(),
    formType: 'compliance',
    sections: [] as any[],
    regulatoryReferences: [] as any[]
  };
  
  // Extract regulatory references
  if (context?.entities) {
    const regulatoryEntities = context.entities.filter(
      (entity: any) => entity.type === 'REGULATORY_REFERENCE'
    );
    
    form.regulatoryReferences = regulatoryEntities.map((entity: any) => ({
      code: entity.value,
      description: entity.context || '',
      authority: extractAuthorityFromReference(entity.value)
    }));
  }
  
  // Create compliance sections based on headings
  if (structure?.elements) {
    let currentSection: any = null;
    
    for (const element of structure.elements) {
      if (element.type === 'HEADING' && element.level <= 2) {
        // Create a new section
        currentSection = {
          title: element.text,
          requirements: [],
          complianceNotes: ''
        };
        form.sections.push(currentSection);
      } else if (currentSection) {
        if (element.type === 'LIST_ITEM') {
          // Likely a compliance requirement
          currentSection.requirements.push({
            text: element.text,
            compliant: false,
            evidence: '',
            notes: ''
          });
        }
      }
    }
  }
  
  // If form is empty or has very few requirements, try using context
  let totalRequirements = form.sections.reduce(
    (sum, section) => sum + section.requirements.length, 0
  );
  
  if (totalRequirements < 5 && context?.sections) {
    form.sections = [];
    
    for (const section of context.sections) {
      if (section.title) {
        const requirements = section.entities
          .filter((entity: any) => 
            entity.type === 'requirement' || 
            entity.type === 'regulation' || 
            entity.type === 'procedure'
          )
          .map((entity: any) => ({
            text: entity.value,
            compliant: false,
            evidence: '',
            notes: ''
          }));
        
        if (requirements.length > 0) {
          form.sections.push({
            title: section.title,
            requirements,
            complianceNotes: ''
          });
        }
      }
    }
  }
  
  return form;
}

/**
 * Generate a generic form from document content
 */
function generateGenericForm(document: any, structure: any, context: any): any {
  const form = {
    title: `${document.title} - Form`,
    description: document.description || 'Form generated from document content',
    documentId: document.id,
    generatedDate: new Date().toISOString(),
    formType: 'generic',
    sections: [] as any[]
  };
  
  // Create generic sections based on headings
  if (structure?.elements) {
    let currentSection: any = null;
    
    for (const element of structure.elements) {
      if (element.type === 'HEADING' && element.level <= 2) {
        // Create a new section
        currentSection = {
          title: element.text,
          fields: []
        };
        form.sections.push(currentSection);
      } else if (element.type === 'KEY_VALUE' && currentSection) {
        // Add as a form field
        currentSection.fields.push({
          label: element.key,
          type: 'text',
          value: '',
          required: false
        });
      } else if (element.type === 'LIST_ITEM' && currentSection) {
        // Add as a form field
        currentSection.fields.push({
          label: element.text,
          type: 'text',
          value: '',
          required: false
        });
      }
    }
  }
  
  // If form is empty, create a basic structure
  if (form.sections.length === 0) {
    form.sections = [
      {
        title: 'General Information',
        fields: [
          { label: 'Name', type: 'text', value: '', required: true },
          { label: 'Date', type: 'date', value: '', required: true },
          { label: 'Comments', type: 'textarea', value: '', required: false }
        ]
      }
    ];
  }
  
  return form;
}

/**
 * Extract authority from regulatory reference code
 */
function extractAuthorityFromReference(reference: string): string {
  // Common aviation regulatory authorities
  if (reference.startsWith('FAR') || reference.startsWith('14 CFR')) return 'FAA';
  if (reference.startsWith('EU') || reference.startsWith('EASA')) return 'EASA';
  if (reference.startsWith('CAR') || reference.startsWith('CASR')) return 'CASA';
  if (reference.startsWith('CAP')) return 'CAA UK';
  if (reference.startsWith('ICAO')) return 'ICAO';
  
  return 'Unknown';
}

/**
 * Generate compliance procedures from a regulatory document
 */
export async function generateComplianceProcedures(options: ComplianceProcedureGenerationOptions): Promise<any> {
  const { documentId, procedureType, regulatoryContext } = options;
  
  try {
    // Get document and content
    const document = await storage.getDocument(documentId);
    if (!document) {
      throw new Error(`Document with ID ${documentId} not found`);
    }
    
    const content = await storage.getDocumentContent(documentId);
    if (!content?.content) {
      throw new Error(`No content found for document ${documentId}`);
    }
    
    // Analyze document
    const structure = await analyzeDocumentStructure(content.content);
    const context = await parseDocumentContext(documentId, content.content);
    
    // Generate compliance procedures based on document content
    const procedureData = {
      title: `${document.title} - Compliance Procedures`,
      description: document.description || 'Compliance procedures generated from regulatory document',
      documentId: document.id,
      generatedDate: new Date().toISOString(),
      procedureType,
      regulatoryContext: regulatoryContext || 'General Aviation',
      procedures: [] as any[],
      regulatoryReferences: [] as any[]
    };
    
    // Extract regulatory references
    if (context?.entities) {
      const regulatoryEntities = context.entities.filter(
        (entity: any) => entity.type === 'REGULATORY_REFERENCE'
      );
      
      procedureData.regulatoryReferences = regulatoryEntities.map((entity: any) => ({
        code: entity.value,
        description: entity.context || '',
        authority: extractAuthorityFromReference(entity.value)
      }));
    }
    
    // Extract procedures from document structure
    if (structure?.elements) {
      let currentProcedure: any = null;
      
      for (const element of structure.elements) {
        if (element.type === 'HEADING' && element.level <= 2) {
          // Create a new procedure
          currentProcedure = {
            title: element.text,
            description: '',
            steps: [],
            references: [],
            required: true
          };
          procedureData.procedures.push(currentProcedure);
        } else if (currentProcedure) {
          if (element.type === 'PARAGRAPH' && !currentProcedure.description) {
            // First paragraph after heading becomes the description
            currentProcedure.description = element.text;
          } else if (element.type === 'LIST_ITEM') {
            // Add as a procedure step
            currentProcedure.steps.push({
              instruction: element.text,
              verified: false,
              notes: ''
            });
          }
        }
      }
    }
    
    // If few procedures were extracted, try using context
    if (procedureData.procedures.length < 2 && context?.sections) {
      procedureData.procedures = [];
      
      for (const section of context.sections) {
        if (section.title) {
          const steps = section.entities
            .filter((entity: any) => 
              entity.type === 'procedure' || 
              entity.type === 'requirement' || 
              entity.type === 'action'
            )
            .map((entity: any) => ({
              instruction: entity.value,
              verified: false,
              notes: ''
            }));
          
          if (steps.length > 0) {
            procedureData.procedures.push({
              title: section.title,
              description: '',
              steps,
              references: [],
              required: true
            });
          }
        }
      }
    }
    
    return procedureData;
  } catch (error) {
    logger.error('Error generating compliance procedures', { 
      context: { error, documentId, procedureType } 
    });
    throw error;
  }
}