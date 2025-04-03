import { storage } from '../storage.js';
import { knowledgeGraphService } from './knowledge-graph-service.js';
import { Logger } from '../utils/logger.js';

/**
 * Syllabus Generator Service
 * Generates training syllabi based on document content and knowledge graphs
 */
export class SyllabusGeneratorService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('SyllabusGeneratorService');
  }

  /**
   * Generate a syllabus based on a document and settings
   * @param userId - User ID generating the syllabus
   * @param documentId - Document ID to base the syllabus on
   * @param settings - Syllabus generation settings
   * @returns Generated syllabus
   */
  public async generateSyllabus(
    userId: number,
    documentId: number,
    settings: {
      title: string;
      description?: string;
      templateId?: string;
      courseLength: 'short' | 'standard' | 'extended' | 'comprehensive';
      difficultyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
      includeCategories?: string[];
      additionalNotes?: string;
    }
  ) {
    try {
      this.logger.info(`Generating syllabus from document ${documentId}`);
      
      // Get document
      const document = await storage.getDocument(documentId);
      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }
      
      // Get document content
      const content = await storage.getDocumentContent(documentId);
      if (!content) {
        throw new Error(`Document content not found: ${documentId}`);
      }
      
      // Get knowledge graph if available
      let knowledgeGraph;
      try {
        knowledgeGraph = await knowledgeGraphService.getKnowledgeGraph(documentId);
      } catch (error) {
        this.logger.warn(`Could not get knowledge graph: ${error instanceof Error ? error.message : String(error)}`);
        // Continue without knowledge graph
      }
      
      // Extract units from content
      const extractedUnits = this.extractUnitsFromContent(content, settings, knowledgeGraph);
      
      // Generate syllabus structure
      const syllabus = {
        id: Date.now(), // Placeholder ID
        title: settings.title,
        description: settings.description || '',
        documentId,
        createdById: userId,
        templateId: settings.templateId,
        courseLength: settings.courseLength,
        difficultyLevel: settings.difficultyLevel,
        units: extractedUnits,
        assessments: this.generateAssessments(extractedUnits, settings.difficultyLevel),
        resources: this.generateResources(content, settings),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'draft'
      };
      
      return syllabus;
    } catch (error) {
      this.logger.error(`Error generating syllabus: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Extract units from document content
   * @param content - Document content
   * @param settings - Syllabus settings
   * @param knowledgeGraph - Knowledge graph if available
   * @returns Extracted units
   */
  private extractUnitsFromContent(
    content: any,
    settings: any,
    knowledgeGraph?: any
  ) {
    const units: any[] = [];
    
    try {
      // Use sections from document content if available
      if (content.sections && content.sections.length > 0) {
        // Map sections to units
        content.sections.forEach((section: any, index: number) => {
          if (!section.title) return;
          
          units.push({
            title: section.title,
            description: section.content?.substring(0, 200) || '',
            order: index,
            duration: this.estimateDuration(section.content || '', settings.courseLength),
            learningObjectives: this.extractLearningObjectives(section.content || '', settings.difficultyLevel),
            concepts: this.extractConcepts(section.content || '', knowledgeGraph),
          });
        });
      } else if (content.textContent) {
        // If no sections, try to extract units from full text
        // Split by potential headings
        const text = content.textContent;
        const potentialHeadings = text.match(/^[A-Z][^a-z\n]{0,50}$|^[0-9]+\.\s.+$|^[IVX]+\.\s.+$/mg) || [];
        
        // If we found potential headings, use them to split content
        if (potentialHeadings.length > 0) {
          let lastIndex = 0;
          potentialHeadings.forEach((heading: string, index: number) => {
            const headingIndex = text.indexOf(heading, lastIndex);
            if (headingIndex === -1) return;
            
            // Find the end of this section (next heading or end of text)
            let endIndex;
            if (index < potentialHeadings.length - 1) {
              const nextHeading = potentialHeadings[index + 1];
              endIndex = text.indexOf(nextHeading, headingIndex);
            } else {
              endIndex = text.length;
            }
            
            // Extract section content
            const sectionContent = text.substring(headingIndex + heading.length, endIndex).trim();
            
            units.push({
              title: heading.trim(),
              description: sectionContent.substring(0, 200) || '',
              order: index,
              duration: this.estimateDuration(sectionContent, settings.courseLength),
              learningObjectives: this.extractLearningObjectives(sectionContent, settings.difficultyLevel),
              concepts: this.extractConcepts(sectionContent, knowledgeGraph),
            });
            
            lastIndex = endIndex;
          });
        }
      }
      
      // If we still have no units, create a default structure
      if (units.length === 0) {
        // Default units based on course length
        const numUnits = {
          'short': 3,
          'standard': 5,
          'extended': 8,
          'comprehensive': 12
        }[settings.courseLength] || 5;
        
        // Create generic units
        for (let i = 0; i < numUnits; i++) {
          units.push({
            title: `Unit ${i + 1}`,
            description: `Default unit ${i + 1} description`,
            order: i,
            duration: this.estimateDuration('', settings.courseLength, numUnits),
            learningObjectives: [],
            concepts: [],
          });
        }
      }
      
      // Filter units based on includeCategories if provided
      if (settings.includeCategories && settings.includeCategories.length > 0 && knowledgeGraph) {
        // Keep only units that have concepts in the included categories
        return units.filter(unit => {
          // If unit has no concepts, keep it
          if (!unit.concepts || unit.concepts.length === 0) return true;
          
          // Check if any of the unit's concepts are in the included categories
          return unit.concepts.some((concept: any) => 
            settings.includeCategories.includes(concept.category)
          );
        });
      }
    } catch (error) {
      this.logger.error(`Error extracting units: ${error instanceof Error ? error.message : String(error)}`);
      // Return whatever units we've extracted so far
    }
    
    return units;
  }
  
  /**
   * Estimate unit duration based on content length and course settings
   * @param content - Section content
   * @param courseLength - Course length setting
   * @param numUnits - Number of units if no content
   * @returns Estimated duration in hours
   */
  private estimateDuration(content: string, courseLength: string, numUnits: number = 1): number {
    // Base durations in hours for each course length
    const totalHours = {
      'short': 8,
      'standard': 24,
      'extended': 40,
      'comprehensive': 80
    }[courseLength] || 24;
    
    if (!content) {
      // If no content, divide total hours by number of units
      return Math.round(totalHours / numUnits);
    }
    
    // Calculate based on content length
    const wordCount = content.split(/\s+/).length;
    
    // Assumption: Reading and comprehension speed is about 100 words per minute
    // Add extra time for exercises, practice, etc.
    const readingHours = wordCount / (100 * 60);
    const practiceMultiplier = {
      'short': 2,
      'standard': 3,
      'extended': 4,
      'comprehensive': 5
    }[courseLength] || 3;
    
    return Math.max(1, Math.round(readingHours * practiceMultiplier));
  }
  
  /**
   * Extract learning objectives from content
   * @param content - Section content
   * @param difficultyLevel - Difficulty level
   * @returns Extracted learning objectives
   */
  private extractLearningObjectives(content: string, difficultyLevel: string): any[] {
    const objectives: any[] = [];
    
    try {
      // Number of objectives to extract based on difficulty
      const numObjectives = {
        'beginner': 2,
        'intermediate': 3,
        'advanced': 4,
        'expert': 5
      }[difficultyLevel] || 3;
      
      // Look for sentences that might be learning objectives
      // Patterns: sentences starting with "students will", "learn to", etc.
      const potentialObjectives = content.match(/[^.!?]*\b(understand|learn|identify|explain|analyze|evaluate|create|apply|demonstrate|describe)\b[^.!?]*[.!?]/gi) || [];
      
      // Sort by length (prefer shorter, more focused objectives)
      potentialObjectives.sort((a, b) => a.length - b.length);
      
      // Take the top N potential objectives
      for (let i = 0; i < Math.min(numObjectives, potentialObjectives.length); i++) {
        objectives.push({
          text: potentialObjectives[i].trim(),
          type: this.getObjectiveType(potentialObjectives[i], difficultyLevel),
          assessmentMethod: this.getAssessmentMethod(difficultyLevel)
        });
      }
      
      // If we don't have enough objectives, generate generic ones
      while (objectives.length < numObjectives) {
        objectives.push({
          text: `Learning objective ${objectives.length + 1}`,
          type: this.getObjectiveType('', difficultyLevel),
          assessmentMethod: this.getAssessmentMethod(difficultyLevel)
        });
      }
    } catch (error) {
      this.logger.error(`Error extracting learning objectives: ${error instanceof Error ? error.message : String(error)}`);
      // Return whatever objectives we've extracted so far
    }
    
    return objectives;
  }
  
  /**
   * Get objective type based on content and difficulty
   * @param text - Objective text
   * @param difficultyLevel - Difficulty level
   * @returns Objective type
   */
  private getObjectiveType(text: string, difficultyLevel: string): string {
    // Bloom's Taxonomy levels mapped to difficulty levels
    const bloomsMap: Record<string, string[]> = {
      'beginner': ['knowledge', 'comprehension'],
      'intermediate': ['comprehension', 'application'],
      'advanced': ['application', 'analysis', 'synthesis'],
      'expert': ['analysis', 'synthesis', 'evaluation']
    };
    
    const levels = bloomsMap[difficultyLevel] || ['comprehension', 'application'];
    
    // Try to determine the level based on verbs in the text
    if (text) {
      if (/\b(recall|list|define|identify|describe|recognize)\b/i.test(text)) {
        return 'knowledge';
      } else if (/\b(explain|interpret|summarize|classify)\b/i.test(text)) {
        return 'comprehension';
      } else if (/\b(apply|implement|use|execute)\b/i.test(text)) {
        return 'application';
      } else if (/\b(analyze|differentiate|organize|attribute)\b/i.test(text)) {
        return 'analysis';
      } else if (/\b(design|construct|plan|produce|create)\b/i.test(text)) {
        return 'synthesis';
      } else if (/\b(evaluate|critique|judge|assess)\b/i.test(text)) {
        return 'evaluation';
      }
    }
    
    // Default to a random appropriate level for the difficulty
    return levels[Math.floor(Math.random() * levels.length)];
  }
  
  /**
   * Get assessment method based on difficulty
   * @param difficultyLevel - Difficulty level
   * @returns Assessment method
   */
  private getAssessmentMethod(difficultyLevel: string): string {
    const assessmentMethods: Record<string, string[]> = {
      'beginner': ['multiple_choice', 'true_false', 'matching'],
      'intermediate': ['short_answer', 'multiple_choice', 'simulation_basic'],
      'advanced': ['simulation_advanced', 'practical_exercise', 'case_study'],
      'expert': ['practical_assessment', 'project', 'oral_exam']
    };
    
    const methods = assessmentMethods[difficultyLevel] || ['multiple_choice', 'short_answer'];
    
    // Pick a random appropriate method for the difficulty
    return methods[Math.floor(Math.random() * methods.length)];
  }
  
  /**
   * Extract concepts from content, possibly using knowledge graph
   * @param content - Section content
   * @param knowledgeGraph - Knowledge graph if available
   * @returns Extracted concepts
   */
  private extractConcepts(content: string, knowledgeGraph?: any): any[] {
    const concepts: any[] = [];
    
    try {
      if (knowledgeGraph && knowledgeGraph.nodes) {
        // Use knowledge graph nodes
        // Check which nodes are likely relevant to this content
        knowledgeGraph.nodes.forEach((node: any) => {
          if (content.toLowerCase().includes(node.label.toLowerCase())) {
            concepts.push({
              name: node.label,
              category: node.category,
              description: node.description || '',
              importance: node.importance || 0.5
            });
          }
        });
      } else {
        // Basic keyword extraction
        const words = content.split(/\s+/);
        const wordFreq: Record<string, number> = {};
        
        // Count word frequencies
        words.forEach(word => {
          // Clean up word
          const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
          if (cleanWord.length < 4) return; // Skip short words
          
          wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
        });
        
        // Get top keywords
        const keywords = Object.entries(wordFreq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([word]) => word);
        
        // Create concept objects
        keywords.forEach(keyword => {
          concepts.push({
            name: keyword,
            category: 'concept',
            description: '',
            importance: 0.5
          });
        });
      }
    } catch (error) {
      this.logger.error(`Error extracting concepts: ${error instanceof Error ? error.message : String(error)}`);
      // Return whatever concepts we've extracted so far
    }
    
    return concepts;
  }
  
  /**
   * Generate assessments based on units and difficulty
   * @param units - Syllabus units
   * @param difficultyLevel - Difficulty level
   * @returns Generated assessments
   */
  private generateAssessments(units: any[], difficultyLevel: string): any[] {
    const assessments: any[] = [];
    
    try {
      // Create assessments based on difficulty level
      const assessmentConfig: Record<string, any> = {
        'beginner': {
          types: ['quiz', 'practical_basic'],
          count: 2
        },
        'intermediate': {
          types: ['quiz', 'practical_intermediate', 'written_test'],
          count: 3
        },
        'advanced': {
          types: ['written_test', 'practical_advanced', 'scenario_based'],
          count: 4
        },
        'expert': {
          types: ['comprehensive_exam', 'practical_advanced', 'scenario_based', 'oral_exam'],
          count: 5
        }
      };
      
      const config = assessmentConfig[difficultyLevel] || assessmentConfig['intermediate'];
      
      // Add a final comprehensive assessment
      assessments.push({
        title: 'Final Assessment',
        description: `Comprehensive assessment covering all course material`,
        type: 'comprehensive_exam',
        weight: 40,
        passingScore: difficultyLevel === 'beginner' ? 70 : difficultyLevel === 'intermediate' ? 75 : 80,
        duration: difficultyLevel === 'beginner' ? 60 : difficultyLevel === 'intermediate' ? 90 : 120, // minutes
        units: units.map(unit => unit.title)
      });
      
      // Add unit-specific assessments
      const unitGroups = this.groupUnits(units, config.count - 1);
      
      unitGroups.forEach((group, index) => {
        const type = config.types[index % config.types.length];
        
        assessments.push({
          title: `${this.capitalizeFirstLetter(type)} ${index + 1}`,
          description: `Assessment covering ${group.map(unit => unit.title).join(', ')}`,
          type,
          weight: 60 / unitGroups.length,
          passingScore: difficultyLevel === 'beginner' ? 70 : difficultyLevel === 'intermediate' ? 75 : 80,
          duration: type.includes('practical') ? 120 : 60, // minutes
          units: group.map(unit => unit.title)
        });
      });
    } catch (error) {
      this.logger.error(`Error generating assessments: ${error instanceof Error ? error.message : String(error)}`);
      // Return whatever assessments we've created so far
    }
    
    return assessments;
  }
  
  /**
   * Group units for assessments
   * @param units - Syllabus units
   * @param numGroups - Number of groups to create
   * @returns Grouped units
   */
  private groupUnits(units: any[], numGroups: number): any[][] {
    const groups: any[][] = [];
    
    // Ensure we have at least 1 group
    if (numGroups < 1) numGroups = 1;
    
    // Simple division of units into groups
    const unitsPerGroup = Math.ceil(units.length / numGroups);
    
    for (let i = 0; i < numGroups; i++) {
      const startIndex = i * unitsPerGroup;
      const endIndex = Math.min(startIndex + unitsPerGroup, units.length);
      
      if (startIndex < units.length) {
        groups.push(units.slice(startIndex, endIndex));
      }
    }
    
    return groups;
  }
  
  /**
   * Generate resources for syllabus
   * @param content - Document content
   * @param settings - Syllabus settings
   * @returns Generated resources
   */
  private generateResources(content: any, settings: any): any[] {
    const resources: any[] = [];
    
    try {
      // Add document itself as a resource
      resources.push({
        title: 'Source Document',
        type: 'document',
        description: 'Original source document for this syllabus',
        url: '',
        required: true
      });
      
      // Add resources based on keywords
      if (content.extractedKeywords && content.extractedKeywords.length > 0) {
        // Use some of the top keywords to suggest resources
        const selectedKeywords = content.extractedKeywords.slice(0, 5);
        
        selectedKeywords.forEach((keyword, index) => {
          resources.push({
            title: `${this.capitalizeFirstLetter(keyword)} Guide`,
            type: 'reference',
            description: `Reference material for ${keyword}`,
            url: '',
            required: index < 2 // First two are required
          });
        });
      }
      
      // Add resources based on difficulty
      const difficultyResources: Record<string, any[]> = {
        'beginner': [
          {
            title: 'Beginner Guide',
            type: 'textbook',
            description: 'Introductory textbook for beginners',
            url: '',
            required: true
          },
          {
            title: 'Practice Exercises',
            type: 'workbook',
            description: 'Basic exercises and practice problems',
            url: '',
            required: true
          }
        ],
        'intermediate': [
          {
            title: 'Comprehensive Manual',
            type: 'textbook',
            description: 'Comprehensive reference manual',
            url: '',
            required: true
          },
          {
            title: 'Simulation Software',
            type: 'software',
            description: 'Interactive simulation software for practice',
            url: '',
            required: true
          }
        ],
        'advanced': [
          {
            title: 'Advanced Techniques Handbook',
            type: 'textbook',
            description: 'Advanced techniques and procedures',
            url: '',
            required: true
          },
          {
            title: 'Case Studies Collection',
            type: 'case_studies',
            description: 'Collection of relevant case studies',
            url: '',
            required: true
          }
        ],
        'expert': [
          {
            title: 'Research Papers Collection',
            type: 'research',
            description: 'Curated collection of research papers',
            url: '',
            required: true
          },
          {
            title: 'Expert System Access',
            type: 'software',
            description: 'Access to expert system simulation',
            url: '',
            required: true
          }
        ]
      };
      
      // Add difficulty-specific resources
      const additionalResources = difficultyResources[settings.difficultyLevel] || [];
      resources.push(...additionalResources);
    } catch (error) {
      this.logger.error(`Error generating resources: ${error instanceof Error ? error.message : String(error)}`);
      // Return whatever resources we've created so far
    }
    
    return resources;
  }
  
  /**
   * Capitalize first letter of a string
   * @param str - Input string
   * @returns String with first letter capitalized
   */
  private capitalizeFirstLetter(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Export singleton instance
export const syllabusGeneratorService = new SyllabusGeneratorService();
