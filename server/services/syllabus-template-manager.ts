/**
 * Syllabus Template Manager
 * 
 * Manages syllabus templates for various program types:
 * - Type Rating templates
 * - JOC/MCC templates
 * - Recurrent training templates
 * - Initial training templates
 * - Custom templates
 */
import { 
  SyllabusTemplate, 
  ExtractedModule, 
  ExtractedLesson, 
  ExtractedCompetency,
  RegulatoryReference
} from '@shared/syllabus-types';
import { logger } from '../core/logger';
import { storage } from '../storage';

// Template types
export enum TemplateType {
  TYPE_RATING = 'type_rating',
  JOC_MCC = 'joc_mcc',
  RECURRENT = 'recurrent',
  INITIAL = 'initial',
  CUSTOM = 'custom'
}

// Template categories
export enum TemplateCategory {
  AIRLINE = 'airline',
  GENERAL_AVIATION = 'general_aviation',
  HELICOPTER = 'helicopter',
  MILITARY = 'military',
  CUSTOM = 'custom'
}

// Aircraft categories
export enum AircraftCategory {
  SINGLE_ENGINE_PISTON = 'single_engine_piston',
  MULTI_ENGINE_PISTON = 'multi_engine_piston',
  TURBOPROP = 'turboprop',
  JET = 'jet',
  HELICOPTER = 'helicopter',
  SPECIAL = 'special'
}

/**
 * Create a new syllabus template
 */
export async function createTemplate(
  name: string,
  description: string,
  type: string,
  category: string,
  modules: ExtractedModule[],
  lessons: ExtractedLesson[],
  createdById: number,
  aircraftType?: string
): Promise<SyllabusTemplate> {
  try {
    // Create the template
    const template: SyllabusTemplate = {
      name,
      description,
      type,
      category,
      aircraftType,
      modules,
      lessons,
      createdById,
      isPublic: false,
      isApproved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        modulesCount: modules.length,
        lessonsCount: lessons.length,
        estimatedDuration: calculateTotalDuration(modules)
      }
    };
    
    // Save to database
    const savedTemplate = await storage.createSyllabusTemplate(template);
    return savedTemplate;
  } catch (error) {
    logger.error('Error creating syllabus template', { error, name, type });
    throw error;
  }
}

/**
 * Update an existing syllabus template
 */
export async function updateTemplate(
  id: number,
  updates: Partial<SyllabusTemplate>
): Promise<SyllabusTemplate | undefined> {
  try {
    // Get existing template
    const existingTemplate = await storage.getSyllabusTemplate(id);
    if (!existingTemplate) {
      throw new Error(`Template with ID ${id} not found`);
    }
    
    // Update metadata if modules or lessons changed
    if (updates.modules || updates.lessons) {
      const modules = updates.modules || existingTemplate.modules;
      const lessons = updates.lessons || existingTemplate.lessons;
      
      updates.metadata = {
        ...existingTemplate.metadata,
        modulesCount: modules.length,
        lessonsCount: lessons.length,
        estimatedDuration: calculateTotalDuration(modules)
      };
      
      updates.updatedAt = new Date();
    }
    
    // Update in database
    const updatedTemplate = await storage.updateSyllabusTemplate(id, updates);
    return updatedTemplate;
  } catch (error) {
    logger.error('Error updating syllabus template', { error, id });
    throw error;
  }
}

/**
 * Clone an existing template
 */
export async function cloneTemplate(
  id: number,
  newName: string,
  createdById: number
): Promise<SyllabusTemplate | undefined> {
  try {
    // Get existing template
    const existingTemplate = await storage.getSyllabusTemplate(id);
    if (!existingTemplate) {
      throw new Error(`Template with ID ${id} not found`);
    }
    
    // Create new template based on existing one
    const newTemplate: SyllabusTemplate = {
      ...existingTemplate,
      name: newName,
      description: `Clone of: ${existingTemplate.name}`,
      createdById,
      isPublic: false,
      isApproved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        ...existingTemplate.metadata,
        clonedFrom: id
      }
    };
    
    // Remove id to create a new record
    delete (newTemplate as any).id;
    
    // Save to database
    const savedTemplate = await storage.createSyllabusTemplate(newTemplate);
    return savedTemplate;
  } catch (error) {
    logger.error('Error cloning syllabus template', { error, id, newName });
    throw error;
  }
}

/**
 * Create a Type Rating syllabus template
 */
export async function createTypeRatingTemplate(
  aircraftType: string,
  createdById: number
): Promise<SyllabusTemplate> {
  // Define modules for a Type Rating
  const modules: ExtractedModule[] = [
    {
      name: `${aircraftType} Aircraft Systems Ground Course`,
      description: `Comprehensive ground training covering all systems of the ${aircraftType} aircraft.`,
      type: 'ground',
      competencies: [
        {
          name: `Describe ${aircraftType} Aircraft General Systems`,
          description: `Describe the general systems of the ${aircraftType} aircraft including airframe, flight controls, and pneumatics.`,
          assessmentCriteria: [
            'Identify major airframe components and structural elements',
            'Explain the flight control system architecture',
            'Describe the pneumatic system operation and components'
          ]
        },
        {
          name: `Explain ${aircraftType} Powerplant and Fuel Systems`,
          description: `Explain the engine, APU, and fuel systems of the ${aircraftType} aircraft.`,
          assessmentCriteria: [
            'Describe engine components and operation',
            'Explain the APU system and operational limitations',
            'Detail fuel system architecture and management'
          ]
        },
        {
          name: `Describe ${aircraftType} Electrical and Avionics Systems`,
          description: `Describe the electrical generation, distribution, and avionics systems of the ${aircraftType} aircraft.`,
          assessmentCriteria: [
            'Explain electrical power generation and distribution',
            'Describe avionics architecture and integration',
            'Detail navigation and communication systems'
          ]
        },
        {
          name: `Understand ${aircraftType} Automation and Flight Management`,
          description: `Understand the automation philosophy and flight management systems of the ${aircraftType} aircraft.`,
          assessmentCriteria: [
            'Explain autopilot modes and operation',
            'Describe FMS programming and operation',
            'Detail automated flight path management'
          ]
        }
      ],
      recommendedDuration: 40
    },
    {
      name: `${aircraftType} Normal and Abnormal Procedures`,
      description: `Ground training covering normal, abnormal, and emergency procedures for the ${aircraftType} aircraft.`,
      type: 'ground',
      competencies: [
        {
          name: `Perform ${aircraftType} Normal Procedures`,
          description: `Perform all normal procedures for the ${aircraftType} aircraft according to the Operations Manual.`,
          assessmentCriteria: [
            'Demonstrate proper checklist usage',
            'Explain normal procedures for all phases of flight',
            'Describe standard callouts and crew coordination'
          ]
        },
        {
          name: `Manage ${aircraftType} Abnormal Procedures`,
          description: `Manage abnormal procedures for the ${aircraftType} aircraft according to the Quick Reference Handbook.`,
          assessmentCriteria: [
            'Identify abnormal conditions and system failures',
            'Apply appropriate non-normal checklists',
            'Explain decision-making process for system malfunctions'
          ]
        },
        {
          name: `Handle ${aircraftType} Emergency Procedures`,
          description: `Handle emergency procedures for the ${aircraftType} aircraft, focusing on crew coordination and workload management.`,
          assessmentCriteria: [
            'Demonstrate emergency procedures for critical situations',
            'Apply appropriate emergency checklists',
            'Explain crew coordination during emergencies'
          ]
        }
      ],
      recommendedDuration: 24
    },
    {
      name: `${aircraftType} Performance and Flight Planning`,
      description: `Ground training on performance calculations and flight planning specifics for the ${aircraftType} aircraft.`,
      type: 'ground',
      competencies: [
        {
          name: `Calculate ${aircraftType} Performance`,
          description: `Calculate takeoff, landing, and cruise performance for the ${aircraftType} aircraft.`,
          assessmentCriteria: [
            'Calculate takeoff performance and limitations',
            'Determine appropriate climb and cruise performance',
            'Calculate landing performance and limitations'
          ]
        },
        {
          name: `Create ${aircraftType} Flight Plans`,
          description: `Create accurate flight plans for the ${aircraftType} aircraft considering fuel requirements, alternates, and contingencies.`,
          assessmentCriteria: [
            'Determine fuel requirements for various flight phases',
            'Select appropriate routing and alternates',
            'Explain contingency planning and fuel policies'
          ]
        }
      ],
      recommendedDuration: 16
    },
    {
      name: `${aircraftType} Fixed Base Simulator Training`,
      description: `Initial simulator training on the ${aircraftType} simulator focusing on procedures and systems operation.`,
      type: 'simulator',
      competencies: [
        {
          name: `Operate ${aircraftType} Aircraft Systems`,
          description: `Operate all ${aircraftType} aircraft systems in normal and abnormal conditions.`,
          assessmentCriteria: [
            'Demonstrate proper system management',
            'Respond appropriately to system failures',
            'Explain system interdependencies'
          ]
        },
        {
          name: `Perform ${aircraftType} Standard Operating Procedures`,
          description: `Perform all standard operating procedures for the ${aircraftType} aircraft.`,
          assessmentCriteria: [
            'Execute normal checklists and procedures',
            'Demonstrate proper crew coordination',
            'Maintain appropriate documentation'
          ]
        }
      ],
      recommendedDuration: 12
    },
    {
      name: `${aircraftType} Full Flight Simulator - Basic Handling`,
      description: `Simulator training on the ${aircraftType} focusing on basic aircraft handling in normal and abnormal configurations.`,
      type: 'simulator',
      competencies: [
        {
          name: `Control ${aircraftType} in Normal Flight`,
          description: `Control the ${aircraftType} aircraft throughout the normal flight envelope.`,
          assessmentCriteria: [
            'Demonstrate proper handling techniques',
            'Maintain precise aircraft control',
            'Execute standard maneuvers within tolerances'
          ]
        },
        {
          name: `Control ${aircraftType} in Abnormal Configurations`,
          description: `Control the ${aircraftType} aircraft in abnormal configurations and degraded states.`,
          assessmentCriteria: [
            'Maintain aircraft control during system failures',
            'Demonstrate proper handling in alternate control laws',
            'Execute recovery from unusual attitudes'
          ]
        },
        {
          name: `Perform ${aircraftType} Stall Recognition and Recovery`,
          description: `Perform proper stall recognition and recovery techniques for the ${aircraftType} aircraft.`,
          assessmentCriteria: [
            'Identify approaching stall conditions',
            'Execute proper stall recovery techniques',
            'Explain stall characteristics in various configurations'
          ]
        }
      ],
      recommendedDuration: 12
    },
    {
      name: `${aircraftType} Full Flight Simulator - Advanced Procedures`,
      description: `Simulator training on the ${aircraftType} focusing on advanced and emergency procedures.`,
      type: 'simulator',
      competencies: [
        {
          name: `Handle ${aircraftType} Engine Failures`,
          description: `Handle engine failures during various phases of flight in the ${aircraftType} aircraft.`,
          assessmentCriteria: [
            'Identify and confirm engine failure',
            'Execute appropriate checklist actions',
            'Demonstrate proper aircraft control and profile management'
          ]
        },
        {
          name: `Manage ${aircraftType} Complex Emergencies`,
          description: `Manage complex emergency scenarios in the ${aircraftType} aircraft.`,
          assessmentCriteria: [
            'Prioritize actions during multiple failure scenarios',
            'Apply appropriate decision-making techniques',
            'Demonstrate effective workload management'
          ]
        },
        {
          name: `Perform ${aircraftType} Rejected Takeoffs and Landings`,
          description: `Perform rejected takeoffs and landings in the ${aircraftType} aircraft.`,
          assessmentCriteria: [
            'Execute proper RTO procedures',
            'Demonstrate go-around techniques from various stages',
            'Maintain proper profiles during rejected maneuvers'
          ]
        }
      ],
      recommendedDuration: 16
    },
    {
      name: `${aircraftType} Full Flight Simulator - LOFT Sessions`,
      description: `Line Oriented Flight Training for the ${aircraftType} aircraft, focusing on realistic line operations.`,
      type: 'simulator',
      competencies: [
        {
          name: `Demonstrate ${aircraftType} Line Operations`,
          description: `Demonstrate proficiency in normal line operations for the ${aircraftType} aircraft.`,
          assessmentCriteria: [
            'Execute normal flights with realistic scenarios',
            'Demonstrate proper decision-making in line environment',
            'Apply all SOPs in an integrated operation'
          ]
        },
        {
          name: `Apply CRM in ${aircraftType} Operations`,
          description: `Apply Crew Resource Management principles in ${aircraftType} operations.`,
          assessmentCriteria: [
            'Demonstrate effective communication',
            'Apply proper workload management techniques',
            'Demonstrate leadership and teamwork'
          ]
        }
      ],
      recommendedDuration: 8
    },
    {
      name: `${aircraftType} Type Rating Skill Test Preparation`,
      description: `Final preparation for the ${aircraftType} type rating skill test.`,
      type: 'simulator',
      competencies: [
        {
          name: `Perform ${aircraftType} Maneuvers to Skill Test Standards`,
          description: `Perform all required maneuvers to skill test standards for the ${aircraftType} type rating.`,
          assessmentCriteria: [
            'Execute all required test maneuvers within tolerance',
            'Demonstrate proper checklist usage and procedures',
            'Maintain proper CRM throughout all scenarios'
          ]
        }
      ],
      recommendedDuration: 4
    },
    {
      name: `${aircraftType} Base Training`,
      description: `Aircraft base training for the ${aircraftType}, including touch and go landings.`,
      type: 'aircraft',
      competencies: [
        {
          name: `Perform ${aircraftType} Takeoffs and Landings`,
          description: `Perform takeoffs and landings in the actual ${aircraftType} aircraft.`,
          assessmentCriteria: [
            'Execute proper takeoff techniques',
            'Maintain proper approach profiles',
            'Perform accurate landings within touchdown zone'
          ]
        },
        {
          name: `Apply ${aircraftType} Normal Procedures in Aircraft`,
          description: `Apply normal operating procedures in the actual ${aircraftType} aircraft.`,
          assessmentCriteria: [
            'Demonstrate proper checklist usage',
            'Execute standard operating procedures',
            'Maintain proper crew coordination'
          ]
        }
      ],
      recommendedDuration: 6
    }
  ];
  
  // Define lessons (placeholder - would need to generate actual lessons based on modules)
  const lessons: ExtractedLesson[] = [];
  
  for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
    const module = modules[moduleIndex];
    
    // Create an introduction lesson for each module
    lessons.push({
      name: `Introduction to ${module.name}`,
      description: `Introduction and overview of the ${module.name} module.`,
      content: `This lesson provides an introduction to the ${module.name} module, covering the learning objectives, schedule, and expectations.`,
      type: module.type === 'ground' ? 'document' : 'interactive',
      moduleIndex,
      duration: 60,
      learningObjectives: ['Understand the scope and objectives of the module', 'Overview of the key topics to be covered']
    });
    
    // Create lessons for each competency
    for (const competency of module.competencies) {
      lessons.push({
        name: competency.name,
        description: competency.description,
        content: `This lesson covers ${competency.description}. The assessment criteria include: ${competency.assessmentCriteria.join(', ')}.`,
        type: determineOptimalLessonType(module.type, competency),
        moduleIndex,
        duration: calculateOptimalLessonDuration(module.type, competency),
        learningObjectives: competency.assessmentCriteria
      });
    }
    
    // Add an assessment lesson at the end of each module
    lessons.push({
      name: `Assessment - ${module.name}`,
      description: `Assessment of competencies for the ${module.name} module.`,
      content: `This lesson assesses the trainee's knowledge and proficiency in the competencies covered in the ${module.name} module.`,
      type: 'assessment',
      moduleIndex,
      duration: 120,
      learningObjectives: ['Demonstrate proficiency in all module competencies']
    });
  }
  
  // Create the template
  return createTemplate(
    `${aircraftType} Type Rating`,
    `Standard Type Rating syllabus for the ${aircraftType} aircraft.`,
    TemplateType.TYPE_RATING,
    TemplateCategory.AIRLINE,
    modules,
    lessons,
    createdById,
    aircraftType
  );
}

/**
 * Create a JOC/MCC (Jet Orientation Course/Multi-Crew Cooperation) syllabus template
 */
export async function createJocMccTemplate(
  aircraftType: string,
  createdById: number
): Promise<SyllabusTemplate> {
  // Define modules for a JOC/MCC
  const modules: ExtractedModule[] = [
    {
      name: 'Multi-Crew Cooperation Theoretical Knowledge',
      description: 'Ground training covering Multi-Crew Cooperation principles, roles, and responsibilities.',
      type: 'ground',
      competencies: [
        {
          name: 'Understand Multi-Crew Operations',
          description: 'Understand the principles of multi-crew operations, including roles, responsibilities, and task management.',
          assessmentCriteria: [
            'Describe the roles of PF and PM',
            'Explain task sharing and workload management',
            'Identify barriers to effective crew coordination'
          ]
        },
        {
          name: 'Apply CRM Principles',
          description: 'Apply Crew Resource Management principles in multi-crew operations.',
          assessmentCriteria: [
            'Explain effective communication techniques',
            'Describe decision-making models in a multi-crew environment',
            'Outline leadership styles and their application'
          ]
        },
        {
          name: 'Understand Threat and Error Management',
          description: 'Understand Threat and Error Management concepts and application in multi-crew operations.',
          assessmentCriteria: [
            'Identify common threats in airline operations',
            'Describe error management strategies',
            'Explain the TEM model and its application'
          ]
        }
      ],
      recommendedDuration: 20
    },
    {
      name: `${aircraftType} Systems Overview for MCC`,
      description: `Basic ground training on ${aircraftType} aircraft systems relevant to multi-crew operations.`,
      type: 'ground',
      competencies: [
        {
          name: `Understand ${aircraftType} Cockpit Layout`,
          description: `Understand the cockpit layout and basic systems interfaces of the ${aircraftType} aircraft.`,
          assessmentCriteria: [
            'Identify main cockpit displays and controls',
            'Explain basic system interfaces',
            'Describe cockpit zones and areas of responsibility'
          ]
        },
        {
          name: `Explain ${aircraftType} Automation Philosophy`,
          description: `Explain the automation philosophy and levels of the ${aircraftType} aircraft.`,
          assessmentCriteria: [
            'Describe automation levels and modes',
            'Explain mode awareness and mode confusion',
            'Outline proper automation management'
          ]
        }
      ],
      recommendedDuration: 12
    },
    {
      name: 'Standard Operating Procedures',
      description: 'Ground training on Standard Operating Procedures in a multi-crew environment.',
      type: 'ground',
      competencies: [
        {
          name: 'Apply Standard Callouts',
          description: 'Apply standard callouts during all phases of flight.',
          assessmentCriteria: [
            'Demonstrate proper timing of callouts',
            'Use correct phraseology for standard calls',
            'Respond appropriately to callouts'
          ]
        },
        {
          name: 'Perform Checklist Procedures',
          description: 'Perform standard checklist procedures following proper challenge and response protocols.',
          assessmentCriteria: [
            'Demonstrate proper checklist discipline',
            'Apply challenge and response technique',
            'Maintain proper flow and timing'
          ]
        },
        {
          name: 'Apply Briefing Techniques',
          description: 'Apply structured briefing techniques for departure, approach, and special situations.',
          assessmentCriteria: [
            'Conduct comprehensive departure briefings',
            'Perform structured approach briefings',
            'Adapt briefings for special situations'
          ]
        }
      ],
      recommendedDuration: 8
    },
    {
      name: `${aircraftType} MCC FTD Sessions`,
      description: `Fixed Training Device sessions focusing on basic ${aircraftType} procedures and MCC principles.`,
      type: 'simulator',
      competencies: [
        {
          name: 'Perform MCC Cockpit Preparation',
          description: 'Perform cockpit preparation procedures in a multi-crew environment.',
          assessmentCriteria: [
            'Execute cockpit preparation with proper task sharing',
            'Perform system setup with cross-verification',
            'Demonstrate effective crew coordination'
          ]
        },
        {
          name: 'Apply Standard Procedures in Normal Operations',
          description: 'Apply standard operating procedures during normal flight operations.',
          assessmentCriteria: [
            'Demonstrate proper PF/PM task sharing',
            'Apply standard callouts during all phases',
            'Maintain proper checklist discipline'
          ]
        }
      ],
      recommendedDuration: 8
    },
    {
      name: `${aircraftType} MCC Full Flight Simulator - Normal Operations`,
      description: `Full Flight Simulator training focusing on normal operations in the ${aircraftType} aircraft.`,
      type: 'simulator',
      competencies: [
        {
          name: 'Perform Takeoffs and Departures',
          description: 'Perform takeoffs and departures in a multi-crew environment.',
          assessmentCriteria: [
            'Execute proper PF/PM task sharing during takeoff',
            'Demonstrate proper callouts and monitoring',
            'Manage automation during departure'
          ]
        },
        {
          name: 'Perform Approaches and Landings',
          description: 'Perform approaches and landings in a multi-crew environment.',
          assessmentCriteria: [
            'Execute proper approach briefing and preparation',
            'Demonstrate proper PF/PM roles during approach',
            'Maintain proper callouts and monitoring'
          ]
        },
        {
          name: 'Manage Automation',
          description: 'Manage automation levels and modes throughout the flight.',
          assessmentCriteria: [
            'Demonstrate proper mode selection',
            'Maintain mode awareness during all phases',
            'Apply appropriate automation strategies'
          ]
        }
      ],
      recommendedDuration: 12
    },
    {
      name: `${aircraftType} MCC Full Flight Simulator - Abnormal Operations`,
      description: `Full Flight Simulator training focusing on abnormal and emergency operations in the ${aircraftType} aircraft.`,
      type: 'simulator',
      competencies: [
        {
          name: 'Manage System Malfunctions',
          description: 'Manage system malfunctions in a multi-crew environment.',
          assessmentCriteria: [
            'Apply proper problem diagnosis',
            'Demonstrate appropriate task sharing',
            'Execute appropriate checklist procedures'
          ]
        },
        {
          name: 'Handle Engine Failures',
          description: 'Handle engine failures during various phases of flight.',
          assessmentCriteria: [
            'Maintain aircraft control during engine failure',
            'Apply proper task sharing and workload management',
            'Execute appropriate checklists and procedures'
          ]
        },
        {
          name: 'Manage Complex Emergencies',
          description: 'Manage complex emergency scenarios requiring crew coordination.',
          assessmentCriteria: [
            'Prioritize actions during complex situations',
            'Maintain effective communication',
            'Demonstrate proper decision-making'
          ]
        }
      ],
      recommendedDuration: 12
    },
    {
      name: `${aircraftType} MCC LOFT and Assessment`,
      description: 'Line Oriented Flight Training and final MCC assessment.',
      type: 'simulator',
      competencies: [
        {
          name: 'Perform Line Operations',
          description: 'Perform realistic line operations in a multi-crew environment.',
          assessmentCriteria: [
            'Apply MCC principles in integrated operations',
            'Demonstrate proper CRM techniques',
            'Handle realistic operational scenarios'
          ]
        },
        {
          name: 'Integrate Technical and Non-Technical Skills',
          description: 'Integrate technical and non-technical skills in a line environment.',
          assessmentCriteria: [
            'Balance technical requirements with CRM',
            'Demonstrate effective problem-solving',
            'Apply threat and error management'
          ]
        }
      ],
      recommendedDuration: 8
    }
  ];
  
  // Define lessons (placeholder - would need to generate actual lessons based on modules)
  const lessons: ExtractedLesson[] = [];
  
  for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
    const module = modules[moduleIndex];
    
    // Create an introduction lesson for each module
    lessons.push({
      name: `Introduction to ${module.name}`,
      description: `Introduction and overview of the ${module.name} module.`,
      content: `This lesson provides an introduction to the ${module.name} module, covering the learning objectives, schedule, and expectations.`,
      type: module.type === 'ground' ? 'document' : 'interactive',
      moduleIndex,
      duration: 60,
      learningObjectives: ['Understand the scope and objectives of the module', 'Overview of the key topics to be covered']
    });
    
    // Create lessons for each competency
    for (const competency of module.competencies) {
      lessons.push({
        name: competency.name,
        description: competency.description,
        content: `This lesson covers ${competency.description}. The assessment criteria include: ${competency.assessmentCriteria.join(', ')}.`,
        type: determineOptimalLessonType(module.type, competency),
        moduleIndex,
        duration: calculateOptimalLessonDuration(module.type, competency),
        learningObjectives: competency.assessmentCriteria
      });
    }
    
    // Add an assessment lesson at the end of each module
    lessons.push({
      name: `Assessment - ${module.name}`,
      description: `Assessment of competencies for the ${module.name} module.`,
      content: `This lesson assesses the trainee's knowledge and proficiency in the competencies covered in the ${module.name} module.`,
      type: 'assessment',
      moduleIndex,
      duration: 120,
      learningObjectives: ['Demonstrate proficiency in all module competencies']
    });
  }
  
  // Create the template
  return createTemplate(
    `${aircraftType} JOC/MCC Course`,
    `Jet Orientation Course and Multi-Crew Cooperation training syllabus for the ${aircraftType} aircraft.`,
    TemplateType.JOC_MCC,
    TemplateCategory.AIRLINE,
    modules,
    lessons,
    createdById,
    aircraftType
  );
}

/**
 * Create a Recurrent Training syllabus template
 */
export async function createRecurrentTemplate(
  aircraftType: string,
  createdById: number
): Promise<SyllabusTemplate> {
  // Define modules for Recurrent Training
  const modules: ExtractedModule[] = [
    {
      name: `${aircraftType} Recurrent Ground Training`,
      description: `Annual ground refresher training for ${aircraftType} pilots.`,
      type: 'ground',
      competencies: [
        {
          name: `Review ${aircraftType} Systems Changes`,
          description: `Review any recent systems changes, updates, or modifications to the ${aircraftType} aircraft.`,
          assessmentCriteria: [
            'Identify recent changes to aircraft systems',
            'Explain the operational impact of changes',
            'Demonstrate understanding of modified procedures'
          ]
        },
        {
          name: 'Review Regulatory Changes',
          description: 'Review recent regulatory changes and their impact on operations.',
          assessmentCriteria: [
            'Identify recent regulatory updates',
            'Explain how changes affect operations',
            'Demonstrate understanding of compliance requirements'
          ]
        },
        {
          name: 'Review Safety Issues and Incidents',
          description: 'Review recent safety issues, incidents, and lessons learned.',
          assessmentCriteria: [
            'Describe recent safety issues in the industry',
            'Explain contributing factors to significant incidents',
            'Apply lessons learned to current operations'
          ]
        },
        {
          name: 'Review Emergency Procedures',
          description: 'Review critical emergency procedures and memory items.',
          assessmentCriteria: [
            'Recall memory items for critical emergencies',
            'Demonstrate understanding of emergency procedure philosophy',
            'Explain proper task sharing during emergencies'
          ]
        }
      ],
      recommendedDuration: 16
    },
    {
      name: 'Human Factors and CRM Refresher',
      description: 'Annual refresher on Human Factors and Crew Resource Management.',
      type: 'ground',
      competencies: [
        {
          name: 'Apply CRM Principles',
          description: 'Apply updated Crew Resource Management principles in line operations.',
          assessmentCriteria: [
            'Demonstrate effective communication techniques',
            'Apply appropriate leadership and teamwork strategies',
            'Explain decision-making models and their application'
          ]
        },
        {
          name: 'Apply Threat and Error Management',
          description: 'Apply Threat and Error Management concepts to real operational scenarios.',
          assessmentCriteria: [
            'Identify common threats in current operations',
            'Describe effective error management strategies',
            'Apply TEM concepts to case studies'
          ]
        },
        {
          name: 'Manage Automation Complacency',
          description: 'Manage automation complacency and maintain vigilance.',
          assessmentCriteria: [
            'Identify signs of automation complacency',
            'Describe strategies to maintain vigilance',
            'Explain proper monitoring techniques'
          ]
        }
      ],
      recommendedDuration: 8
    },
    {
      name: `${aircraftType} Recurrent Simulator Session 1`,
      description: `First recurrent simulator session focusing on normal operations and non-normal procedures.`,
      type: 'simulator',
      competencies: [
        {
          name: 'Perform Normal Operations',
          description: 'Perform normal operations to proficiency standards.',
          assessmentCriteria: [
            'Execute standard operating procedures',
            'Demonstrate proper CRM techniques',
            'Maintain proper aircraft handling skills'
          ]
        },
        {
          name: 'Manage Non-Normal Procedures',
          description: 'Manage selected non-normal procedures effectively.',
          assessmentCriteria: [
            'Identify system malfunctions correctly',
            'Apply appropriate checklist procedures',
            'Maintain proper task sharing during abnormal situations'
          ]
        }
      ],
      recommendedDuration: 4
    },
    {
      name: `${aircraftType} Recurrent Simulator Session 2`,
      description: `Second recurrent simulator session focusing on emergency procedures and non-precision approaches.`,
      type: 'simulator',
      competencies: [
        {
          name: 'Manage Engine Failures',
          description: 'Manage engine failures during critical phases of flight.',
          assessmentCriteria: [
            'Maintain aircraft control during engine failure',
            'Execute appropriate emergency procedures',
            'Demonstrate proper decision-making and task sharing'
          ]
        },
        {
          name: 'Perform Non-Precision Approaches',
          description: 'Perform non-precision approaches in various conditions.',
          assessmentCriteria: [
            'Execute approach procedures within tolerances',
            'Maintain proper stabilization criteria',
            'Apply appropriate go-around decision making'
          ]
        },
        {
          name: 'Handle Rejected Takeoffs',
          description: 'Handle rejected takeoff scenarios at various speeds.',
          assessmentCriteria: [
            'Make timely rejection decisions',
            'Execute RTO procedures correctly',
            'Maintain proper directional control'
          ]
        }
      ],
      recommendedDuration: 4
    },
    {
      name: `${aircraftType} Recurrent LOFT/LOE Session`,
      description: `Line Oriented Flight Training or Line Operational Evaluation session.`,
      type: 'simulator',
      competencies: [
        {
          name: 'Perform Line Operations',
          description: 'Perform realistic line operations with embedded abnormal situations.',
          assessmentCriteria: [
            'Apply normal procedures in line environment',
            'Demonstrate proper threat and error management',
            'Maintain effective CRM throughout scenarios'
          ]
        },
        {
          name: 'Manage Unexpected Situations',
          description: 'Manage unexpected situations that develop during normal operations.',
          assessmentCriteria: [
            'Identify and respond to developing situations',
            'Apply appropriate decision-making',
            'Maintain operational safety margins'
          ]
        }
      ],
      recommendedDuration: 4
    }
  ];
  
  // Define lessons (placeholder - would need to generate actual lessons based on modules)
  const lessons: ExtractedLesson[] = [];
  
  for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
    const module = modules[moduleIndex];
    
    // Create an introduction lesson for each module
    lessons.push({
      name: `Introduction to ${module.name}`,
      description: `Introduction and overview of the ${module.name} module.`,
      content: `This lesson provides an introduction to the ${module.name} module, covering the learning objectives, schedule, and expectations.`,
      type: module.type === 'ground' ? 'document' : 'interactive',
      moduleIndex,
      duration: 30,
      learningObjectives: ['Understand the scope and objectives of the module', 'Overview of the key topics to be covered']
    });
    
    // Create lessons for each competency
    for (const competency of module.competencies) {
      lessons.push({
        name: competency.name,
        description: competency.description,
        content: `This lesson covers ${competency.description}. The assessment criteria include: ${competency.assessmentCriteria.join(', ')}.`,
        type: determineOptimalLessonType(module.type, competency),
        moduleIndex,
        duration: calculateOptimalLessonDuration(module.type, competency),
        learningObjectives: competency.assessmentCriteria
      });
    }
    
    // Add an assessment lesson at the end of each module
    lessons.push({
      name: `Assessment - ${module.name}`,
      description: `Assessment of competencies for the ${module.name} module.`,
      content: `This lesson assesses the trainee's knowledge and proficiency in the competencies covered in the ${module.name} module.`,
      type: 'assessment',
      moduleIndex,
      duration: 60,
      learningObjectives: ['Demonstrate proficiency in all module competencies']
    });
  }
  
  // Create the template
  return createTemplate(
    `${aircraftType} Recurrent Training`,
    `Annual recurrent training syllabus for ${aircraftType} pilots.`,
    TemplateType.RECURRENT,
    TemplateCategory.AIRLINE,
    modules,
    lessons,
    createdById,
    aircraftType
  );
}

/**
 * Create a custom template
 */
export async function createCustomTemplate(
  name: string,
  description: string,
  category: string,
  createdById: number,
  aircraftType?: string
): Promise<SyllabusTemplate> {
  // Define empty modules and lessons structures
  const modules: ExtractedModule[] = [
    {
      name: 'Ground Module',
      description: 'Ground training module for theoretical knowledge.',
      type: 'ground',
      competencies: [
        {
          name: 'Sample Competency 1',
          description: 'This is a sample competency for the ground module.',
          assessmentCriteria: [
            'Sample assessment criteria 1',
            'Sample assessment criteria 2'
          ]
        }
      ],
      recommendedDuration: 8
    },
    {
      name: 'Practical Module',
      description: 'Practical training module for hands-on skills.',
      type: 'simulator',
      competencies: [
        {
          name: 'Sample Competency 2',
          description: 'This is a sample competency for the practical module.',
          assessmentCriteria: [
            'Sample assessment criteria 1',
            'Sample assessment criteria 2'
          ]
        }
      ],
      recommendedDuration: 4
    }
  ];
  
  const lessons: ExtractedLesson[] = [
    {
      name: 'Introduction to Ground Module',
      description: 'Introduction and overview of the Ground Module.',
      content: 'This lesson provides an introduction to the Ground Module, covering the learning objectives, schedule, and expectations.',
      type: 'document',
      moduleIndex: 0,
      duration: 60,
      learningObjectives: ['Understand the scope and objectives of the module']
    },
    {
      name: 'Sample Competency 1 Lesson',
      description: 'Lesson covering Sample Competency 1.',
      content: 'This lesson covers the Sample Competency 1 for the Ground Module.',
      type: 'document',
      moduleIndex: 0,
      duration: 90,
      learningObjectives: ['Sample assessment criteria 1', 'Sample assessment criteria 2']
    },
    {
      name: 'Introduction to Practical Module',
      description: 'Introduction and overview of the Practical Module.',
      content: 'This lesson provides an introduction to the Practical Module, covering the learning objectives, schedule, and expectations.',
      type: 'interactive',
      moduleIndex: 1,
      duration: 60,
      learningObjectives: ['Understand the scope and objectives of the module']
    },
    {
      name: 'Sample Competency 2 Lesson',
      description: 'Lesson covering Sample Competency 2.',
      content: 'This lesson covers the Sample Competency 2 for the Practical Module.',
      type: 'interactive',
      moduleIndex: 1,
      duration: 120,
      learningObjectives: ['Sample assessment criteria 1', 'Sample assessment criteria 2']
    }
  ];
  
  // Create the template
  return createTemplate(
    name,
    description,
    TemplateType.CUSTOM,
    category,
    modules,
    lessons,
    createdById,
    aircraftType
  );
}

/**
 * Calculate total duration for a set of modules in hours
 */
function calculateTotalDuration(modules: ExtractedModule[]): number {
  let totalHours = 0;
  
  for (const module of modules) {
    totalHours += module.recommendedDuration;
  }
  
  return totalHours;
}

/**
 * Determine the optimal lesson type based on module type and competency
 */
function determineOptimalLessonType(moduleType: string, competency: ExtractedCompetency): string {
  // If it's a ground module, prioritize document or video
  if (moduleType === 'ground') {
    // If competency involves explanation or understanding, use document
    if (competency.description.toLowerCase().includes('explain') || 
        competency.description.toLowerCase().includes('understand') ||
        competency.description.toLowerCase().includes('describe')) {
      return 'document';
    }
    // If competency involves demonstration, use video
    else if (competency.description.toLowerCase().includes('demonstrate') ||
             competency.description.toLowerCase().includes('show')) {
      return 'video';
    }
    // Default for ground modules
    return 'document';
  }
  
  // If it's a simulator or aircraft module, prioritize interactive
  else if (moduleType === 'simulator' || moduleType === 'aircraft') {
    return 'interactive';
  }
  
  // Default case
  return 'document';
}

/**
 * Calculate the optimal lesson duration based on module type and competency
 */
function calculateOptimalLessonDuration(moduleType: string, competency: ExtractedCompetency): number {
  // Base duration in minutes
  let baseDuration = 60;
  
  // Adjust based on module type
  if (moduleType === 'ground') {
    baseDuration = 90; // Longer for ground lessons
  } else if (moduleType === 'simulator') {
    baseDuration = 120; // Longer for simulator sessions
  } else if (moduleType === 'aircraft') {
    baseDuration = 180; // Even longer for aircraft sessions
  }
  
  // Adjust based on complexity (estimated by length of description and number of criteria)
  const complexityFactor = Math.max(0.7, Math.min(1.3, 
    (competency.description.length / 100) * 0.5 + 
    (competency.assessmentCriteria.length / 3) * 0.5
  ));
  
  // Calculate final duration
  return Math.round(baseDuration * complexityFactor);
}