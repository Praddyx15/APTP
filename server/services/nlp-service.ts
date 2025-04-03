import { Logger } from '../utils/logger';
import compromise from 'compromise';
import { removeStopwords } from 'stopword';
import { v4 as uuidv4 } from 'uuid';
import { DocumentContent } from '../../shared/document-types';

/**
 * Entity type enumeration
 */
export enum EntityType {
  PERSON = 'person',
  ORGANIZATION = 'organization',
  LOCATION = 'location',
  EQUIPMENT = 'equipment',
  REGULATION = 'regulation',
  PROCEDURE = 'procedure',
  TOPIC = 'topic',
  CONCEPT = 'concept',
  OTHER = 'other'
}

/**
 * Entity object representing a named entity extracted from text
 */
export interface Entity {
  id: string;
  name: string;
  type: EntityType;
  importance: number;
  mentions: number;
  synonyms: string[];
  definition?: string;
}

/**
 * Relationship between entities
 */
export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  confidence: number;
  context: string;
}

/**
 * Named entity recognition result
 */
interface NerResult {
  entities: Entity[];
  relationships: Relationship[];
}

/**
 * Service for natural language processing tasks
 */
export class NlpService {
  private logger: Logger;
  
  constructor() {
    this.logger = new Logger('NlpService');
  }
  
  /**
   * Extract entities and relationships from document content
   * @param documentContent - Document content
   * @returns Extracted entities and relationships
   */
  public async extractEntitiesAndRelationships(documentContent: DocumentContent): Promise<NerResult> {
    try {
      this.logger.info(`Extracting entities from document ${documentContent.documentId}`);
      
      // Extract named entities using compromise and custom rules
      const entities = await this.extractEntities(documentContent.rawText);
      
      // Extract relationships between entities
      const relationships = await this.extractRelationships(documentContent.rawText, entities);
      
      return {
        entities,
        relationships
      };
    } catch (error) {
      this.logger.error(`Error extracting entities: ${error instanceof Error ? error.message : String(error)}`);
      return {
        entities: [],
        relationships: []
      };
    }
  }
  
  /**
   * Extract named entities from text
   * @param text - Document text
   * @returns Array of entities
   */
  private async extractEntities(text: string): Promise<Entity[]> {
    try {
      const doc = compromise(text);
      
      // Extract various entity types
      const people = this.extractPeople(doc);
      const organizations = this.extractOrganizations(doc);
      const locations = this.extractLocations(doc);
      const equipment = this.extractEquipment(doc);
      const regulations = this.extractRegulations(doc);
      const procedures = this.extractProcedures(doc);
      const topics = this.extractTopics(doc);
      
      // Combine all entities and remove duplicates
      const allEntities = [
        ...people,
        ...organizations,
        ...locations,
        ...equipment,
        ...regulations,
        ...procedures,
        ...topics
      ];
      
      // Create a map to remove duplicates and merge mentions
      const entityMap = new Map<string, Entity>();
      
      for (const entity of allEntities) {
        const normalizedName = entity.name.toLowerCase();
        if (entityMap.has(normalizedName)) {
          const existing = entityMap.get(normalizedName)!;
          existing.mentions += entity.mentions;
          existing.importance = Math.max(existing.importance, entity.importance);
          
          // Add any new synonyms
          for (const synonym of entity.synonyms) {
            if (!existing.synonyms.includes(synonym)) {
              existing.synonyms.push(synonym);
            }
          }
        } else {
          entityMap.set(normalizedName, entity);
        }
      }
      
      // Convert back to array
      return Array.from(entityMap.values());
    } catch (error) {
      this.logger.error(`Error in entity extraction: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  /**
   * Extract relationships between entities
   * @param text - Document text
   * @param entities - Extracted entities
   * @returns Array of relationships
   */
  private async extractRelationships(text: string, entities: Entity[]): Promise<Relationship[]> {
    try {
      if (entities.length <= 1) {
        return [];
      }
      
      const relationships: Relationship[] = [];
      const doc = compromise(text);
      const sentences = doc.sentences().out('array');
      
      // Create a map of entity names for quick lookup
      const entityMap = new Map<string, Entity>();
      for (const entity of entities) {
        entityMap.set(entity.name.toLowerCase(), entity);
        for (const synonym of entity.synonyms) {
          entityMap.set(synonym.toLowerCase(), entity);
        }
      }
      
      // Process each sentence to find entity co-occurrences
      for (const sentence of sentences) {
        // Skip very short sentences
        if (sentence.length < 20) continue;
        
        const sentenceEntities: Entity[] = [];
        const lowerSentence = sentence.toLowerCase();
        
        // Find entities mentioned in this sentence
        for (const entity of entities) {
          const entityName = entity.name.toLowerCase();
          if (lowerSentence.includes(entityName)) {
            sentenceEntities.push(entity);
            continue;
          }
          
          // Check synonyms
          for (const synonym of entity.synonyms) {
            if (lowerSentence.includes(synonym.toLowerCase())) {
              sentenceEntities.push(entity);
              break;
            }
          }
        }
        
        // Create relationships between co-occurring entities
        if (sentenceEntities.length >= 2) {
          for (let i = 0; i < sentenceEntities.length - 1; i++) {
            for (let j = i + 1; j < sentenceEntities.length; j++) {
              const source = sentenceEntities[i];
              const target = sentenceEntities[j];
              
              // Skip self-relationships
              if (source.id === target.id) continue;
              
              // Determine relationship type and confidence
              const relationType = this.determineRelationshipType(source, target, sentence);
              
              relationships.push({
                id: uuidv4(),
                sourceId: source.id,
                targetId: target.id,
                type: relationType.type,
                confidence: relationType.confidence,
                context: sentence
              });
            }
          }
        }
      }
      
      return relationships;
    } catch (error) {
      this.logger.error(`Error extracting relationships: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  /**
   * Determine the type and confidence of a relationship between entities
   * @param source - Source entity
   * @param target - Target entity
   * @param context - Context sentence
   * @returns Relationship type and confidence
   */
  private determineRelationshipType(
    source: Entity,
    target: Entity,
    context: string
  ): { type: string; confidence: number } {
    // Default type and confidence
    let type = 'related_to';
    let confidence = 0.5;
    
    const lowerContext = context.toLowerCase();
    
    // Pattern matching for common relationship indicators
    const relationPatterns = [
      { pattern: 'part of', type: 'part_of', confidence: 0.8 },
      { pattern: 'contains', type: 'contains', confidence: 0.8 },
      { pattern: 'requires', type: 'requires', confidence: 0.9 },
      { pattern: 'is required by', type: 'required_by', confidence: 0.9 },
      { pattern: 'depends on', type: 'depends_on', confidence: 0.85 },
      { pattern: 'uses', type: 'uses', confidence: 0.8 },
      { pattern: 'is used by', type: 'used_by', confidence: 0.8 },
      { pattern: 'regulates', type: 'regulates', confidence: 0.9 },
      { pattern: 'is regulated by', type: 'regulated_by', confidence: 0.9 },
      { pattern: 'operates', type: 'operates', confidence: 0.8 },
      { pattern: 'is operated by', type: 'operated_by', confidence: 0.8 },
      { pattern: 'responsible for', type: 'responsible_for', confidence: 0.85 },
      { pattern: 'reports to', type: 'reports_to', confidence: 0.85 },
      { pattern: 'manages', type: 'manages', confidence: 0.85 },
      { pattern: 'is managed by', type: 'managed_by', confidence: 0.85 },
    ];
    
    // Check for pattern matches
    for (const pattern of relationPatterns) {
      if (lowerContext.includes(pattern.pattern)) {
        type = pattern.type;
        confidence = pattern.confidence;
        break;
      }
    }
    
    // Entity type specific relationships
    if (source.type === EntityType.PERSON && target.type === EntityType.ORGANIZATION) {
      type = 'affiliated_with';
      confidence = 0.75;
    } else if (source.type === EntityType.ORGANIZATION && target.type === EntityType.REGULATION) {
      type = 'complies_with';
      confidence = 0.8;
    } else if (source.type === EntityType.PROCEDURE && target.type === EntityType.EQUIPMENT) {
      type = 'performed_on';
      confidence = 0.85;
    }
    
    return { type, confidence };
  }
  
  /**
   * Extract people entities from document
   * @param doc - Compromise document
   * @returns Array of person entities
   */
  private extractPeople(doc: compromise.Three): Entity[] {
    try {
      const people: Entity[] = [];
      
      // Extract people using Compromise's built-in NER
      const personMatches = doc.people().dedupe();
      
      personMatches.forEach(match => {
        const name = match.text();
        if (name.length < 3) return; // Skip too short names
        
        people.push({
          id: uuidv4(),
          name,
          type: EntityType.PERSON,
          importance: 0.7,
          mentions: 1,
          synonyms: []
        });
      });
      
      return people;
    } catch (error) {
      this.logger.error(`Error extracting people: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  /**
   * Extract organization entities from document
   * @param doc - Compromise document
   * @returns Array of organization entities
   */
  private extractOrganizations(doc: compromise.Three): Entity[] {
    try {
      const organizations: Entity[] = [];
      
      // Extract organizations using Compromise's built-in NER
      const orgMatches = doc.organizations().dedupe();
      
      // Add custom aviation organizations pattern matching
      const customOrgRegex = /(([A-Z][a-z]+\s)?([A-Z][a-z]+\s)?[A-Z]{2,}(\s[A-Z]{2,})*(\s[A-Z][a-z]+)*)/g;
      const text = doc.text();
      const matches = text.match(customOrgRegex) || [];
      
      const customOrgs = matches.filter(match => {
        // Filter out obviously incorrect matches
        if (match.length < 4) return false;
        if (/^[A-Z]{2,4}$/.test(match)) return true; // Acronyms like FAA, EASA, etc.
        return true;
      });
      
      // Add standard organizations
      orgMatches.forEach(match => {
        const name = match.text();
        if (name.length < 3) return; // Skip too short names
        
        organizations.push({
          id: uuidv4(),
          name,
          type: EntityType.ORGANIZATION,
          importance: 0.8,
          mentions: 1,
          synonyms: []
        });
      });
      
      // Add custom matched organizations
      for (const org of customOrgs) {
        // Skip duplicates
        if (organizations.some(existing => existing.name === org)) continue;
        
        organizations.push({
          id: uuidv4(),
          name: org,
          type: EntityType.ORGANIZATION,
          importance: 0.75,
          mentions: 1,
          synonyms: []
        });
      }
      
      return organizations;
    } catch (error) {
      this.logger.error(`Error extracting organizations: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  /**
   * Extract location entities from document
   * @param doc - Compromise document
   * @returns Array of location entities
   */
  private extractLocations(doc: compromise.Three): Entity[] {
    try {
      const locations: Entity[] = [];
      
      // Extract locations using Compromise's built-in NER
      const placeMatches = doc.places().dedupe();
      
      placeMatches.forEach(match => {
        const name = match.text();
        if (name.length < 3) return; // Skip too short names
        
        locations.push({
          id: uuidv4(),
          name,
          type: EntityType.LOCATION,
          importance: 0.6,
          mentions: 1,
          synonyms: []
        });
      });
      
      return locations;
    } catch (error) {
      this.logger.error(`Error extracting locations: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  /**
   * Extract equipment entities from document
   * @param doc - Compromise document
   * @returns Array of equipment entities
   */
  private extractEquipment(doc: compromise.Three): Entity[] {
    try {
      const equipment: Entity[] = [];
      
      // Define aviation equipment patterns
      const equipmentPatterns = [
        // Aircraft models
        /Boeing\s+\d+(-\d+)?/g,
        /Airbus\s+A\d+(-\d+)?/g,
        /Cessna\s+\d+/g,
        /Piper\s+[A-Za-z]+/g,
        
        // Systems and components
        /[A-Z]?[a-z]+\s+[Ss]ystem/g,
        /[A-Z]?[a-z]+\s+[Ee]quipment/g,
        /[A-Z]?[a-z]+\s+[Cc]omponent/g,
        /[A-Z]?[a-z]+\s+[Aa]vionics/g,
        /[A-Z]?[a-z]+\s+[Nn]avigation/g,
        /[A-Z]?[a-z]+\s+[Cc]ontrol/g,
        
        // Common aviation equipment
        /[Rr]adar(\s+[Ss]ystem)?/g,
        /[Tt]ransponder/g,
        /[Aa]ltimeter/g,
        /[Aa]irspeed [Ii]ndicator/g,
        /[Aa]ttitude [Ii]ndicator/g,
        /[Aa]utopilot/g,
        /[Ff]light [Cc]omputer/g,
        /[Ff]light [Mm]anagement [Ss]ystem/g,
        /FMS/g,
        /GPS/g,
        /INS/g,
        /ILS/g,
        /VOR/g,
        /DME/g,
        /NDB/g
      ];
      
      // Extract equipment matches from text
      const text = doc.text();
      const equipmentMatches = new Set<string>();
      
      for (const pattern of equipmentPatterns) {
        const matches = text.match(pattern) || [];
        for (const match of matches) {
          if (match.length >= 3) {
            equipmentMatches.add(match);
          }
        }
      }
      
      // Create entities from matches
      for (const name of equipmentMatches) {
        equipment.push({
          id: uuidv4(),
          name,
          type: EntityType.EQUIPMENT,
          importance: 0.75,
          mentions: 1,
          synonyms: []
        });
      }
      
      return equipment;
    } catch (error) {
      this.logger.error(`Error extracting equipment: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  /**
   * Extract regulation entities from document
   * @param doc - Compromise document
   * @returns Array of regulation entities
   */
  private extractRegulations(doc: compromise.Three): Entity[] {
    try {
      const regulations: Entity[] = [];
      
      // Define regulation patterns
      const regulationPatterns = [
        // FAA regulations
        /14\s+CFR\s+Part\s+\d+/g,
        /Part\s+\d+/g,
        /FAR\s+\d+/g,
        /FAR\s+Part\s+\d+/g,
        
        // EASA regulations
        /CS-\d+/g,
        /EU\s+No\s+\d+\/\d+/g,
        /AMC\s+[A-Z0-9\.-]+/g,
        /GM\s+[A-Z0-9\.-]+/g,
        
        // ICAO regulations
        /Annex\s+\d+/g,
        /ICAO\s+Doc\s+\d+/g,
        /ICAO\s+Standard\s+[A-Z0-9\.-]+/g,
        
        // Other aviation regulations
        /ATA\s+\d+/g,
        /AC\s+\d+-\d+[A-Z]?/g,
        /Advisory\s+Circular\s+\d+-\d+[A-Z]?/g,
        /AD\s+\d+-\d+-\d+/g,
        /Airworthiness\s+Directive\s+\d+-\d+-\d+/g,
        /SB\s+[A-Z0-9\.-]+/g,
        /Service\s+Bulletin\s+[A-Z0-9\.-]+/g
      ];
      
      // Extract regulation matches from text
      const text = doc.text();
      const regulationMatches = new Set<string>();
      
      for (const pattern of regulationPatterns) {
        const matches = text.match(pattern) || [];
        for (const match of matches) {
          if (match.length >= 3) {
            regulationMatches.add(match);
          }
        }
      }
      
      // Create entities from matches
      for (const name of regulationMatches) {
        regulations.push({
          id: uuidv4(),
          name,
          type: EntityType.REGULATION,
          importance: 0.85,
          mentions: 1,
          synonyms: []
        });
      }
      
      return regulations;
    } catch (error) {
      this.logger.error(`Error extracting regulations: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  /**
   * Extract procedure entities from document
   * @param doc - Compromise document
   * @returns Array of procedure entities
   */
  private extractProcedures(doc: compromise.Three): Entity[] {
    try {
      const procedures: Entity[] = [];
      
      // Define procedure patterns
      const procedurePatterns = [
        /[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s+[Pp]rocedure/g,
        /[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s+[Pp]rotocol/g,
        /[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s+[Cc]hecklist/g,
        /[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s+[Mm]aneuver/g,
        /[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s+[Oo]peration/g,
        /Standard\s+Operating\s+Procedure/g,
        /SOP/g,
        /Emergency\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*/g,
        /[A-Z][a-z]+(\s+[A-Z][a-z]+)*\s+[Ee]mergency\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*/g
      ];
      
      // Extract procedure matches from text
      const text = doc.text();
      const procedureMatches = new Set<string>();
      
      for (const pattern of procedurePatterns) {
        const matches = text.match(pattern) || [];
        for (const match of matches) {
          if (match.length >= 5) { // Procedures usually have longer names
            procedureMatches.add(match);
          }
        }
      }
      
      // Create entities from matches
      for (const name of procedureMatches) {
        procedures.push({
          id: uuidv4(),
          name,
          type: EntityType.PROCEDURE,
          importance: 0.8,
          mentions: 1,
          synonyms: []
        });
      }
      
      return procedures;
    } catch (error) {
      this.logger.error(`Error extracting procedures: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  /**
   * Extract topic entities from document
   * @param doc - Compromise document
   * @returns Array of topic entities
   */
  private extractTopics(doc: compromise.Three): Entity[] {
    try {
      const topics: Entity[] = [];
      
      // Extract topics using noun phrases and TF-IDF like approach
      const nounPhrases = doc.match('#Noun+');
      const phrases = nounPhrases.out('array');
      
      // Count phrase frequencies
      const phraseCounts = new Map<string, number>();
      for (const phrase of phrases) {
        const normalized = phrase.toLowerCase().trim();
        if (normalized.length < 4) continue; // Skip very short phrases
        
        // Skip phrases that are likely not aviation topics
        if (this.isCommonPhrase(normalized)) continue;
        
        // Count occurrences
        phraseCounts.set(normalized, (phraseCounts.get(normalized) || 0) + 1);
      }
      
      // Sort phrases by frequency
      const sortedPhrases = Array.from(phraseCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30); // Take top 30 most frequent phrases
      
      // Create topic entities
      for (const [phrase, count] of sortedPhrases) {
        // Skip phrases that don't look like topics
        if (!this.isLikelyTopic(phrase, doc)) continue;
        
        // Add as topic
        topics.push({
          id: uuidv4(),
          name: phrase,
          type: count > 5 ? EntityType.TOPIC : EntityType.CONCEPT,
          importance: Math.min(0.3 + count * 0.05, 0.9), // Importance based on frequency
          mentions: count,
          synonyms: []
        });
      }
      
      return topics;
    } catch (error) {
      this.logger.error(`Error extracting topics: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
  
  /**
   * Check if a phrase is a common non-topic phrase
   * @param phrase - Normalized phrase
   * @returns Whether the phrase is a common non-topic
   */
  private isCommonPhrase(phrase: string): boolean {
    const commonPhrases = [
      'this', 'that', 'these', 'those', 'the', 'a', 'an',
      'he', 'she', 'it', 'they', 'we', 'you', 'i', 'me',
      'him', 'her', 'them', 'us', 'my', 'your', 'his', 'her',
      'their', 'our', 'its', 'thing', 'things', 'way', 'ways',
      'time', 'times', 'day', 'days', 'week', 'weeks',
      'month', 'months', 'year', 'years', 'today', 'tomorrow',
      'yesterday', 'now', 'then', 'here', 'there'
    ];
    
    return commonPhrases.includes(phrase);
  }
  
  /**
   * Check if a phrase is likely a topic
   * @param phrase - Normalized phrase
   * @param doc - Compromise document
   * @returns Whether the phrase is likely a topic
   */
  private isLikelyTopic(phrase: string, doc: compromise.Three): boolean {
    // Check if the phrase appears in specific contexts
    const contexts = [
      'regarding',
      'concerning',
      'about',
      'related to',
      'on the topic of',
      'discussing',
      'refers to',
      'defines',
      'explained',
      'training on',
      'knowledge of',
      'focuses on',
      'covers'
    ];
    
    // Check for context matches
    for (const context of contexts) {
      const matches = doc.match(`${context} .? ${phrase}`);
      if (matches.found) {
        return true;
      }
    }
    
    // Check if phrase appears in title-like contexts
    const titleMatches = doc.match(`#TitleCase ${phrase} #TitleCase?`);
    if (titleMatches.found && titleMatches.length > 1) {
      return true;
    }
    
    // Check for aviation-specific terms
    const aviationTerms = [
      'flight', 'pilot', 'aircraft', 'aviation', 'control', 
      'procedure', 'safety', 'training', 'operation', 'navigation',
      'landing', 'takeoff', 'approach', 'departure', 'arrival',
      'clearance', 'altitude', 'airspeed', 'heading', 'instrument'
    ];
    
    for (const term of aviationTerms) {
      if (phrase.includes(term)) {
        return true;
      }
    }
    
    // Default to true for phrases that occur multiple times
    return true;
  }
}

// Create and export singleton instance
const nlpService = new NlpService();
export default nlpService;