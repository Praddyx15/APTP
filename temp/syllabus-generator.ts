import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';
import { OpenAI } from 'openai';
import { 
  SyllabusGenerationRequest, 
  Syllabus, 
  SyllabusUnit, 
  SyllabusPhase 
} from '@shared/syllabus-types';
import { db } from '../db';
import { 
  syllabuses, 
  syllabusUnits, 
  syllabusPhases 
} from '@shared/schema';

/**
 * Service for generating training syllabuses
 */
export class SyllabusGeneratorService {
  private logger: Logger;
  private openai: OpenAI | null = null;
  
  constructor() {
    this.logger = new Logger('SyllabusGenerator');
    
    // Setup OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else if (process.env.XAI_API_KEY) {
      // If xAI key is available, use it with the compatible endpoint
      this.openai = new OpenAI({
        baseURL: "https://api.x.ai/v1",
        apiKey: process.env.XAI_API_KEY
      });
    } else {
      this.logger.warn('No OpenAI or xAI API key found. Syllabus generation will use templates.');
    }
  }
  
  /**
   * Generate a syllabus based on input parameters
   * @param request - The syllabus generation request
   * @returns Generated syllabus
   */
  public async generateSyllabus(request: SyllabusGenerationRequest): Promise<Syllabus> {
    try {
      this.logger.info(`Generating syllabus: ${request.title}`);
      
      // Create basic syllabus structure
      const syllabusData: Partial<Syllabus> = {
        title: request.title,
        description: request.description,
        courseType: request.courseType,
        regulationRef: request.regulationRef,
        totalHours: request.totalHours,
        createdById: request.userId
      };
      
      // Use AI for enhanced syllabus if available
      if (this.openai) {
        const enhancedSyllabus = await this.generateSyllabusWithAI(request);
        
        // Merge AI-generated content
        syllabusData.description = enhancedSyllabus.description || syllabusData.description;
        syllabusData.overview = enhancedSyllabus.overview;
        syllabusData.prerequisites = enhancedSyllabus.prerequisites;
        syllabusData.objectives = enhancedSyllabus.objectives;
        syllabusData.assessmentStrategy = enhancedSyllabus.assessmentStrategy;
      } else {
        // Use template-based approach
        syllabusData.overview = this.generateOverview(request);
        syllabusData.prerequisites = this.generatePrerequisites(request);
        syllabusData.objectives = this.generateObjectives(request);
        syllabusData.assessmentStrategy = this.generateAssessmentStrategy(request);
      }
      
      // Insert syllabus into database
      const [syllabus] = await db
        .insert(syllabuses)
        .values(syllabusData)
        .returning();
      
      // Generate phases based on training type
      const phases = await this.generatePhases(syllabus.id, request);
      
      // Generate units for each phase
      const units: SyllabusUnit[] = [];
      for (const phase of phases) {
        const phaseUnits = await this.generateUnits(phase.id, syllabus.id, request, phase.name);
        units.push(...phaseUnits);
      }
      
      // Return complete syllabus with relationships
      return {
        ...syllabus,
        phases,
        units
      };
    } catch (error) {
      this.logger.error(`Failed to generate syllabus: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Generate syllabus phases
   * @param syllabusId - Syllabus ID
   * @param request - Generation request
   * @returns List of syllabus phases
   */
  private async generatePhases(
    syllabusId: number, 
    request: SyllabusGenerationRequest
  ): Promise<SyllabusPhase[]> {
    try {
      const phases: Partial<SyllabusPhase>[] = [];
      
      // Define phases based on course type
      switch (request.courseType) {
        case 'ppl':
          phases.push(
            { syllabusId, name: 'Ground Theory', description: 'Theoretical knowledge instruction', sequence: 1 },
            { syllabusId, name: 'Flight Training', description: 'Practical flight instruction', sequence: 2 },
            { syllabusId, name: 'Skill Test Preparation', description: 'Preparation for license skill test', sequence: 3 }
          );
          break;
        case 'cpl':
          phases.push(
            { syllabusId, name: 'Advanced Theory', description: 'Commercial pilot theoretical knowledge', sequence: 1 },
            { syllabusId, name: 'Advanced Flight Training', description: 'Commercial flight operations training', sequence: 2 },
            { syllabusId, name: 'Instrument Rating', description: 'Instrument flight training', sequence: 3 },
            { syllabusId, name: 'Commercial Operations', description: 'Commercial operations procedures', sequence: 4 },
            { syllabusId, name: 'CPL Skill Test Preparation', description: 'Preparation for CPL skill test', sequence: 5 }
          );
          break;
        case 'type_rating':
          phases.push(
            { syllabusId, name: 'Aircraft Systems', description: 'Type-specific aircraft systems knowledge', sequence: 1 },
            { syllabusId, name: 'Normal Procedures', description: 'Normal operating procedures', sequence: 2 },
            { syllabusId, name: 'Abnormal & Emergency Procedures', description: 'Handling of abnormal and emergency situations', sequence: 3 },
            { syllabusId, name: 'Performance & Limitations', description: 'Aircraft performance and limitations', sequence: 4 },
            { syllabusId, name: 'Simulator Training', description: 'Full flight simulator sessions', sequence: 5 },
            { syllabusId, name: 'Base Training', description: 'Aircraft base training', sequence: 6 },
            { syllabusId, name: 'Skill Test', description: 'Type rating skill test', sequence: 7 }
          );
          break;
        case 'recurrent':
          phases.push(
            { syllabusId, name: 'Refresher Theory', description: 'Theoretical knowledge refresher', sequence: 1 },
            { syllabusId, name: 'Simulator Sessions', description: 'Simulator-based proficiency training', sequence: 2 },
            { syllabusId, name: 'Proficiency Check', description: 'Operator proficiency check', sequence: 3 }
          );
          break;
        default:
          // Generic phases for any course type
          phases.push(
            { syllabusId, name: 'Theory Phase', description: 'Theoretical knowledge instruction', sequence: 1 },
            { syllabusId, name: 'Practical Phase', description: 'Practical skills training', sequence: 2 },
            { syllabusId, name: 'Assessment Phase', description: 'Skills assessment and verification', sequence: 3 }
          );
      }
      
      // Insert phases into database
      const dbPhases = [];
      for (const phase of phases) {
        const [insertedPhase] = await db
          .insert(syllabusPhases)
          .values(phase)
          .returning();
        
        dbPhases.push(insertedPhase);
      }
      
      return dbPhases;
    } catch (error) {
      this.logger.error(`Failed to generate phases: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Generate syllabus units
   * @param phaseId - Phase ID
   * @param syllabusId - Syllabus ID
   * @param request - Generation request
   * @param phaseName - Name of the phase
   * @returns List of syllabus units
   */
  private async generateUnits(
    phaseId: number,
    syllabusId: number,
    request: SyllabusGenerationRequest,
    phaseName: string
  ): Promise<SyllabusUnit[]> {
    try {
      const units: Partial<SyllabusUnit>[] = [];
      
      // Generate units based on phase and course type
      if (phaseName.toLowerCase().includes('theory')) {
        // Theory phase units
        switch (request.courseType) {
          case 'ppl':
            units.push(
              { phaseId, syllabusId, title: 'Aviation Law', description: 'Air law and ATC procedures', hours: 10, sequence: 1 },
              { phaseId, syllabusId, title: 'Aircraft General Knowledge', description: 'Airframe, systems, and powerplant', hours: 12, sequence: 2 },
              { phaseId, syllabusId, title: 'Flight Performance & Planning', description: 'Mass, balance, and performance', hours: 15, sequence: 3 },
              { phaseId, syllabusId, title: 'Human Performance', description: 'Human factors and limitations', hours: 8, sequence: 4 },
              { phaseId, syllabusId, title: 'Meteorology', description: 'Weather and meteorological information', hours: 12, sequence: 5 },
              { phaseId, syllabusId, title: 'Navigation', description: 'General navigation and radio navigation', hours: 15, sequence: 6 },
              { phaseId, syllabusId, title: 'Operational Procedures', description: 'Standard operating procedures', hours: 10, sequence: 7 },
              { phaseId, syllabusId, title: 'Principles of Flight', description: 'Aerodynamics and flight principles', hours: 12, sequence: 8 },
              { phaseId, syllabusId, title: 'Communications', description: 'VFR communications', hours: 6, sequence: 9 }
            );
            break;
          case 'cpl':
            units.push(
              { phaseId, syllabusId, title: 'Advanced Air Law', description: 'Commercial operations regulations', hours: 15, sequence: 1 },
              { phaseId, syllabusId, title: 'Advanced Aircraft Knowledge', description: 'Complex aircraft systems', hours: 20, sequence: 2 },
              { phaseId, syllabusId, title: 'Commercial Flight Planning', description: 'Advanced performance and planning', hours: 25, sequence: 3 },
              { phaseId, syllabusId, title: 'Commercial Operations', description: 'Commercial SOP and procedures', hours: 15, sequence: 4 },
              { phaseId, syllabusId, title: 'Advanced Meteorology', description: 'Weather theory and forecasting', hours: 20, sequence: 5 },
              { phaseId, syllabusId, title: 'Advanced Navigation', description: 'IFR navigation procedures', hours: 25, sequence: 6 },
              { phaseId, syllabusId, title: 'Advanced Human Performance', description: 'CRM and human factors in commercial operations', hours: 10, sequence: 7 }
            );
            break;
          default:
            // Generic theory units
            units.push(
              { phaseId, syllabusId, title: 'Theoretical Module 1', description: 'Basic concepts and principles', hours: 15, sequence: 1 },
              { phaseId, syllabusId, title: 'Theoretical Module 2', description: 'Advanced concepts', hours: 15, sequence: 2 },
              { phaseId, syllabusId, title: 'Theoretical Module 3', description: 'Practical applications', hours: 15, sequence: 3 }
            );
        }
      } else if (phaseName.toLowerCase().includes('flight') || phaseName.toLowerCase().includes('practical')) {
        // Practical/flight phase units
        switch (request.courseType) {
          case 'ppl':
            units.push(
              { phaseId, syllabusId, title: 'Familiarization', description: 'Aircraft familiarization and basic maneuvers', hours: 5, sequence: 1 },
              { phaseId, syllabusId, title: 'Effects of Controls', description: 'Aircraft control and straight and level flight', hours: 5, sequence: 2 },
              { phaseId, syllabusId, title: 'Ground Reference Maneuvers', description: 'Ground reference maneuvers and patterns', hours: 8, sequence: 3 },
              { phaseId, syllabusId, title: 'Slow Flight and Stalls', description: 'Slow flight, stalls, and recovery', hours: 5, sequence: 4 },
              { phaseId, syllabusId, title: 'Basic Instrument Flying', description: 'Basic attitude instrument flying', hours: 5, sequence: 5 },
              { phaseId, syllabusId, title: 'Emergency Procedures', description: 'Emergency procedures and scenarios', hours: 5, sequence: 6 },
              { phaseId, syllabusId, title: 'Cross-Country Flying', description: 'Cross-country planning and navigation', hours: 10, sequence: 7 },
              { phaseId, syllabusId, title: 'Night Flying', description: 'Night operations and procedures', hours: 5, sequence: 8 },
              { phaseId, syllabusId, title: 'Solo Flight', description: 'Solo flight practice', hours: 10, sequence: 9 }
            );
            break;
          case 'type_rating':
            units.push(
              { phaseId, syllabusId, title: 'Cockpit Familiarization', description: 'Cockpit layout and systems', hours: 4, sequence: 1 },
              { phaseId, syllabusId, title: 'Normal Procedures', description: 'Standard operating procedures', hours: 8, sequence: 2 },
              { phaseId, syllabusId, title: 'Abnormal Procedures', description: 'Non-normal operations and troubleshooting', hours: 8, sequence: 3 },
              { phaseId, syllabusId, title: 'Emergency Procedures', description: 'Emergency response and management', hours: 8, sequence: 4 },
              { phaseId, syllabusId, title: 'LOFT Scenarios', description: 'Line-oriented flight training', hours: 8, sequence: 5 }
            );
            break;
          default:
            // Generic practical units
            units.push(
              { phaseId, syllabusId, title: 'Practical Module 1', description: 'Basic skills development', hours: 10, sequence: 1 },
              { phaseId, syllabusId, title: 'Practical Module 2', description: 'Advanced skills application', hours: 10, sequence: 2 },
              { phaseId, syllabusId, title: 'Practical Module 3', description: 'Practical assessment preparation', hours: 10, sequence: 3 }
            );
        }
      } else if (phaseName.toLowerCase().includes('simulator')) {
        // Simulator phase units
        units.push(
          { phaseId, syllabusId, title: 'Simulator Session 1', description: 'Normal operations practice', hours: 4, sequence: 1 },
          { phaseId, syllabusId, title: 'Simulator Session 2', description: 'Abnormal and emergency procedures', hours: 4, sequence: 2 },
          { phaseId, syllabusId, title: 'Simulator Session 3', description: 'Challenging weather scenarios', hours: 4, sequence: 3 },
          { phaseId, syllabusId, title: 'Simulator Session 4', description: 'System failures and management', hours: 4, sequence: 4 }
        );
      } else if (phaseName.toLowerCase().includes('test') || phaseName.toLowerCase().includes('check') || phaseName.toLowerCase().includes('assessment')) {
        // Assessment/test phase units
        units.push(
          { phaseId, syllabusId, title: 'Theoretical Knowledge Test', description: 'Written examination', hours: 4, sequence: 1 },
          { phaseId, syllabusId, title: 'Practical Skill Test', description: 'Practical examination', hours: 4, sequence: 2 }
        );
      } else {
        // Default units for any other phase
        units.push(
          { phaseId, syllabusId, title: `${phaseName} Unit 1`, description: 'First unit of this phase', hours: 8, sequence: 1 },
          { phaseId, syllabusId, title: `${phaseName} Unit 2`, description: 'Second unit of this phase', hours: 8, sequence: 2 }
        );
      }
      
      // Insert units into database
      const dbUnits = [];
      for (const unit of units) {
        const [insertedUnit] = await db
          .insert(syllabusUnits)
          .values(unit)
          .returning();
        
        dbUnits.push(insertedUnit);
      }
      
      return dbUnits;
    } catch (error) {
      this.logger.error(`Failed to generate units: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Generate syllabus using AI
   * @param request - Syllabus generation request
   * @returns Enhanced syllabus content
   */
  private async generateSyllabusWithAI(request: SyllabusGenerationRequest): Promise<Partial<Syllabus>> {
    try {
      if (!this.openai) {
        throw new Error('OpenAI client not initialized');
      }
      
      // Craft prompt for AI
      const prompt = `
        Generate a detailed aviation training syllabus for "${request.title}" with the following parameters:
        - Course type: ${request.courseType}
        - Regulation reference: ${request.regulationRef || 'Standard aviation regulations'}
        - Total training hours: ${request.totalHours}
        
        Include the following sections:
        1. A comprehensive overview of the training program (2-3 paragraphs)
        2. Prerequisites for trainees (list format)
        3. Learning objectives (list format)
        4. Assessment strategy (detailed paragraph)
        
        The syllabus should adhere to aviation industry standards and incorporate best practices in flight training.
      `;
      
      // Call AI API
      const completion = await this.openai.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are an aviation training expert specialized in creating educational syllabuses for pilot training programs. Use specific aviation terminology and follow industry best practices."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: process.env.XAI_API_KEY ? "grok-2-1212" : "gpt-4-turbo",
        temperature: 0.7,
        max_tokens: 1500
      });
      
      const response = completion.choices[0].message.content;
      if (!response) {
        throw new Error('Empty response from AI');
      }
      
      // Parse the response sections
      const sections = this.parseAIResponse(response);
      
      return {
        description: request.description,
        overview: sections.overview,
        prerequisites: sections.prerequisites,
        objectives: sections.objectives,
        assessmentStrategy: sections.assessmentStrategy
      };
    } catch (error) {
      this.logger.error(`AI generation failed: ${error instanceof Error ? error.message : String(error)}`);
      
      // Return basic template as fallback
      return {
        description: request.description,
        overview: this.generateOverview(request),
        prerequisites: this.generatePrerequisites(request),
        objectives: this.generateObjectives(request),
        assessmentStrategy: this.generateAssessmentStrategy(request)
      };
    }
  }
  
  /**
   * Parse AI response into structured sections
   * @param response - AI-generated text
   * @returns Structured sections
   */
  private parseAIResponse(response: string): {
    overview: string;
    prerequisites: string;
    objectives: string;
    assessmentStrategy: string;
  } {
    // Default values
    let overview = '';
    let prerequisites = '';
    let objectives = '';
    let assessmentStrategy = '';
    
    // Try to extract sections
    try {
      // Find Overview section
      const overviewMatch = response.match(/overview:?(.*?)(?=prerequisites:|prerequisites|prerequisite:|prerequisite|learning objectives:|learning objectives|objectives:|objectives|assessment strategy:|assessment strategy|assessment:|assessment|$)/is);
      if (overviewMatch && overviewMatch[1]) {
        overview = overviewMatch[1].trim();
      }
      
      // Find Prerequisites section
      const prereqMatch = response.match(/prerequisites:?(.*?)(?=learning objectives:|learning objectives|objectives:|objectives|assessment strategy:|assessment strategy|assessment:|assessment|$)/is);
      if (prereqMatch && prereqMatch[1]) {
        prerequisites = prereqMatch[1].trim();
      }
      
      // Find Objectives section
      const objMatch = response.match(/(?:learning objectives|objectives):?(.*?)(?=assessment strategy:|assessment strategy|assessment:|assessment|$)/is);
      if (objMatch && objMatch[1]) {
        objectives = objMatch[1].trim();
      }
      
      // Find Assessment Strategy section
      const assessMatch = response.match(/(?:assessment strategy|assessment):?(.*?)$/is);
      if (assessMatch && assessMatch[1]) {
        assessmentStrategy = assessMatch[1].trim();
      }
      
      // If no structured sections found, use basic parser
      if (!overview && !prerequisites && !objectives && !assessmentStrategy) {
        const paragraphs = response.split('\n\n');
        
        if (paragraphs.length >= 1) overview = paragraphs[0];
        if (paragraphs.length >= 2) prerequisites = paragraphs[1];
        if (paragraphs.length >= 3) objectives = paragraphs[2];
        if (paragraphs.length >= 4) assessmentStrategy = paragraphs[3];
      }
    } catch (error) {
      this.logger.error(`Error parsing AI response: ${error instanceof Error ? error.message : String(error)}`);
      // Use response as overview if parsing fails
      overview = response;
    }
    
    return {
      overview,
      prerequisites,
      objectives,
      assessmentStrategy
    };
  }
  
  /**
   * Generate syllabus overview based on course type
   * @param request - Generation request
   * @returns Syllabus overview
   */
  private generateOverview(request: SyllabusGenerationRequest): string {
    switch (request.courseType) {
      case 'ppl':
        return `This Private Pilot License (PPL) course provides comprehensive training in accordance with regulatory requirements. It covers all theoretical knowledge and practical flight skills needed to safely operate an aircraft as a private pilot. The course is structured in progressive phases to build competence from basic flying skills to advanced operations including navigation and emergency procedures.`;
      case 'cpl':
        return `The Commercial Pilot License (CPL) course builds upon the foundation of PPL training to develop advanced piloting skills required for commercial operations. This course emphasizes professional standards, complex aircraft handling, and commercial operations management. Students will develop the knowledge and skills needed to operate aircraft for compensation or hire.`;
      case 'type_rating':
        return `This Type Rating course provides comprehensive training specific to the designated aircraft type. It includes detailed systems knowledge, standard and non-standard operating procedures, and handling characteristics. The course is designed to meet regulatory requirements and prepares pilots for safe and efficient operation of the specific aircraft type in all conditions.`;
      case 'recurrent':
        return `This Recurrent Training program refreshes and updates pilots' knowledge and skills to ensure continued safe and efficient aircraft operation. The training reviews critical procedures, addresses any recent changes in regulations or operations, and provides practice in handling abnormal and emergency situations.`;
      default:
        return `This training program provides comprehensive instruction in aviation skills and knowledge. It is structured to progressively build competence through a combination of theoretical study and practical application. The program adheres to industry standards and regulatory requirements.`;
    }
  }
  
  /**
   * Generate prerequisites based on course type
   * @param request - Generation request
   * @returns Prerequisites text
   */
  private generatePrerequisites(request: SyllabusGenerationRequest): string {
    switch (request.courseType) {
      case 'ppl':
        return `- Minimum age: 17 years\n- Medical certificate: Class 2 or higher\n- Language proficiency: ICAO Level 4 or higher\n- Basic mathematics and physics knowledge\n- Ability to read, write, and communicate effectively`;
      case 'cpl':
        return `- Valid PPL license\n- Minimum flight experience: 150 hours total time\n- Medical certificate: Class 1\n- Theoretical knowledge: PPL level\n- Night rating or equivalent experience\n- Language proficiency: ICAO Level 4 or higher`;
      case 'type_rating':
        return `- Valid commercial or airline transport pilot license\n- Medical certificate appropriate to license\n- Minimum experience requirements as per regulations\n- Basic multi-crew cooperation training (if applicable)\n- Instrument rating (if applicable)\n- English language proficiency`;
      case 'recurrent':
        return `- Current pilot license with appropriate ratings\n- Valid medical certificate\n- Active flying status\n- Previous completion of initial type training`;
      default:
        return `- Appropriate pilot license (if applicable)\n- Required medical certification\n- Prerequisite experience as specified by regulations\n- Required knowledge base for the training level`;
    }
  }
  
  /**
   * Generate objectives based on course type
   * @param request - Generation request
   * @returns Objectives text
   */
  private generateObjectives(request: SyllabusGenerationRequest): string {
    switch (request.courseType) {
      case 'ppl':
        return `- Demonstrate the theoretical knowledge required for safe flight operations\n- Safely operate an aircraft in the traffic pattern\n- Navigate accurately using visual references and basic radio navigation\n- Recognize and respond appropriately to abnormal and emergency situations\n- Demonstrate sound decision-making and risk management\n- Operate the aircraft in accordance with regulations and procedures\n- Successfully complete the PPL skill test`;
      case 'cpl':
        return `- Demonstrate advanced theoretical knowledge of commercial operations\n- Operate complex aircraft safely and efficiently\n- Perform advanced navigation procedures including IFR operations\n- Execute commercial maneuvers to required standards of accuracy\n- Apply commercial regulations and procedures in practical operations\n- Demonstrate professional decision-making and crew resource management\n- Successfully complete the CPL skill test`;
      case 'type_rating':
        return `- Demonstrate comprehensive knowledge of aircraft systems\n- Operate the aircraft in normal, abnormal, and emergency conditions\n- Apply type-specific procedures accurately and consistently\n- Manage aircraft systems effectively in all phases of flight\n- Demonstrate effective crew coordination (if applicable)\n- Successfully complete the type rating skill test`;
      case 'recurrent':
        return `- Maintain proficiency in normal operating procedures\n- Demonstrate competence in handling abnormal and emergency situations\n- Update knowledge of current regulations and procedures\n- Review and practice critical emergency procedures\n- Successfully complete the required proficiency check`;
      default:
        return `- Achieve the required theoretical knowledge for the certificate or rating\n- Develop practical skills to the required standard\n- Operate the aircraft safely and efficiently\n- Comply with all relevant regulations and procedures\n- Successfully complete the required assessments`;
    }
  }
  
  /**
   * Generate assessment strategy based on course type
   * @param request - Generation request
   * @returns Assessment strategy text
   */
  private generateAssessmentStrategy(request: SyllabusGenerationRequest): string {
    switch (request.courseType) {
      case 'ppl':
        return `Assessment will be conducted through a combination of progress tests, stage checks, and final examinations. Theoretical knowledge will be evaluated through written or computer-based tests covering all required subjects. Practical skills will be assessed through regular flight evaluations culminating in a final skill test with an authorized examiner. Students must demonstrate both knowledge and skill to the standards specified in the applicable regulations.`;
      case 'cpl':
        return `This course employs a comprehensive assessment strategy including theoretical knowledge examinations covering all CPL subjects, and practical skill evaluations throughout the training. Progress is monitored through stage checks at key milestones. The final assessment consists of a theoretical knowledge examination administered by the authority and a practical skill test conducted by an authorized examiner. Both must be successfully completed to achieve the CPL.`;
      case 'type_rating':
        return `Assessment is conducted progressively throughout the course with particular emphasis on systems knowledge and handling skills. Theoretical knowledge is assessed through written or computer-based tests. Practical skills are evaluated in the simulator through line-oriented scenarios and specific maneuver validation. The final assessment includes a type rating skill test conducted by an authorized examiner, covering both normal and abnormal operations.`;
      case 'recurrent':
        return `Recurrent training assessment focuses on verifying continued proficiency in all aspects of aircraft operation. This includes evaluation of knowledge through oral examination and demonstration of skills through simulator sessions or flight checks. The assessment culminates in a proficiency check that validates the pilot's ability to operate the aircraft safely in normal, abnormal, and emergency situations.`;
      default:
        return `Assessment will be conducted through appropriate theoretical examinations and practical skill evaluations. Progress will be monitored throughout the training with remedial instruction provided as needed. Final assessment will adhere to regulatory requirements and industry standards to ensure competency in all required areas.`;
    }
  }
}

// Export singleton instance
export const syllabusGeneratorService = new SyllabusGeneratorService();
