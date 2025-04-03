import { db } from './db.js';
import { 
  users, 
  User, 
  InsertUser, 
  documents, 
  documentContent, 
  documentVersions, 
  documentShares, 
  knowledgeGraphNodes, 
  knowledgeGraphEdges 
} from '@shared/schema';
import { eq, and, desc, asc, sql, like, ilike } from 'drizzle-orm';
import { IStorage } from './storage-types.js';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { pool } from './db.js';
import { Document, DocumentProcessingStatus, DocumentContent } from '@shared/document-types';
import { KnowledgeGraph, KnowledgeGraphNode, KnowledgeGraphEdge } from '@shared/knowledge-graph-types';

const PostgresSessionStore = connectPg(session);

/**
 * Implementation of storage interface that uses the database
 */
export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Create a PostgreSQL session store
    this.sessionStore = new PostgresSessionStore({
      pool,
      tableName: 'session', // Table name for sessions
      createTableIfMissing: true
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id));
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error('Database error in getUser:', error);
      throw error;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.username, username));
      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error('Database error in getUserByUsername:', error);
      throw error;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const result = await db.insert(users).values(user).returning();
      return result[0];
    } catch (error) {
      console.error('Database error in createUser:', error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return await db.select().from(users);
    } catch (error) {
      console.error('Database error in getAllUsers:', error);
      throw error;
    }
  }

  async getUsersByRole(role: string): Promise<User[]> {
    try {
      return await db.select().from(users).where(eq(users.role, role));
    } catch (error) {
      console.error('Database error in getUsersByRole:', error);
      throw error;
    }
  }

  // Document methods
  async getDocument(id: number): Promise<Document | undefined> {
    try {
      const result = await db.select().from(documents).where(eq(documents.id, id));
      return result.length > 0 ? result[0] as unknown as Document : undefined;
    } catch (error) {
      console.error('Database error in getDocument:', error);
      throw error;
    }
  }

  async getDocumentByTitle(title: string): Promise<Document | undefined> {
    try {
      const result = await db.select().from(documents).where(eq(documents.title, title));
      return result.length > 0 ? result[0] as unknown as Document : undefined;
    } catch (error) {
      console.error('Database error in getDocumentByTitle:', error);
      throw error;
    }
  }

  async getAllDocuments(options?: { 
    limit?: number; 
    offset?: number; 
    sortBy?: string; 
    sortOrder?: 'asc'|'desc';
    filterByType?: string;
    filterByUploadedBy?: number;
  }): Promise<Document[]> {
    try {
      let query = db.select().from(documents);

      // Apply filters
      if (options?.filterByType) {
        query = query.where(eq(documents.fileType, options.filterByType));
      }

      if (options?.filterByUploadedBy) {
        query = query.where(eq(documents.uploadedById, options.filterByUploadedBy));
      }

      // Apply sorting
      if (options?.sortBy) {
        const column = documents[options.sortBy as keyof typeof documents];
        if (column) {
          if (options.sortOrder === 'asc') {
            query = query.orderBy(asc(column));
          } else {
            query = query.orderBy(desc(column));
          }
        }
      } else {
        // Default sort by createdAt desc
        query = query.orderBy(desc(documents.createdAt));
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.offset(options.offset);
      }

      const result = await query;
      return result as unknown as Document[];
    } catch (error) {
      console.error('Database error in getAllDocuments:', error);
      throw error;
    }
  }

  async createDocument(document: any): Promise<Document> {
    try {
      const now = new Date();
      const documentWithTimestamps = {
        ...document,
        createdAt: now,
        updatedAt: now
      };

      const result = await db.insert(documents).values(documentWithTimestamps).returning();
      return result[0] as unknown as Document;
    } catch (error) {
      console.error('Database error in createDocument:', error);
      throw error;
    }
  }

  async updateDocument(id: number, document: any): Promise<Document | undefined> {
    try {
      const documentWithTimestamp = {
        ...document,
        updatedAt: new Date()
      };

      const result = await db
        .update(documents)
        .set(documentWithTimestamp)
        .where(eq(documents.id, id))
        .returning();

      return result.length > 0 ? result[0] as unknown as Document : undefined;
    } catch (error) {
      console.error('Database error in updateDocument:', error);
      throw error;
    }
  }

  async deleteDocument(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(documents)
        .where(eq(documents.id, id))
        .returning({ id: documents.id });

      return result.length > 0;
    } catch (error) {
      console.error('Database error in deleteDocument:', error);
      throw error;
    }
  }

  async updateDocumentProcessingStatus(id: number, status: DocumentProcessingStatus): Promise<boolean> {
    try {
      const result = await db
        .update(documents)
        .set({
          processingStatus: status,
          updatedAt: new Date()
        })
        .where(eq(documents.id, id))
        .returning({ id: documents.id });

      return result.length > 0;
    } catch (error) {
      console.error('Database error in updateDocumentProcessingStatus:', error);
      throw error;
    }
  }

  // Document content methods
  async getDocumentContent(documentId: number): Promise<DocumentContent | undefined> {
    try {
      const result = await db
        .select()
        .from(documentContent)
        .where(eq(documentContent.documentId, documentId));

      return result.length > 0 ? result[0] as unknown as DocumentContent : undefined;
    } catch (error) {
      console.error('Database error in getDocumentContent:', error);
      throw error;
    }
  }

  async createDocumentContent(content: any): Promise<DocumentContent> {
    try {
      const now = new Date();
      const contentWithTimestamps = {
        ...content,
        createdAt: now,
        updatedAt: now
      };

      const result = await db.insert(documentContent).values(contentWithTimestamps).returning();
      return result[0] as unknown as DocumentContent;
    } catch (error) {
      console.error('Database error in createDocumentContent:', error);
      throw error;
    }
  }

  async updateDocumentContent(documentId: number, content: any): Promise<DocumentContent | undefined> {
    try {
      const contentWithTimestamp = {
        ...content,
        updatedAt: new Date()
      };

      const result = await db
        .update(documentContent)
        .set(contentWithTimestamp)
        .where(eq(documentContent.documentId, documentId))
        .returning();

      return result.length > 0 ? result[0] as unknown as DocumentContent : undefined;
    } catch (error) {
      console.error('Database error in updateDocumentContent:', error);
      throw error;
    }
  }

  // Document version methods
  async getDocumentVersions(documentId: number): Promise<any[]> {
    try {
      return await db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId))
        .orderBy(desc(documentVersions.changeDate));
    } catch (error) {
      console.error('Database error in getDocumentVersions:', error);
      throw error;
    }
  }

  async getDocumentVersion(versionId: number): Promise<any | undefined> {
    try {
      const result = await db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.id, versionId));

      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error('Database error in getDocumentVersion:', error);
      throw error;
    }
  }

  async createDocumentVersion(version: any): Promise<any> {
    try {
      const result = await db.insert(documentVersions).values(version).returning();
      return result[0];
    } catch (error) {
      console.error('Database error in createDocumentVersion:', error);
      throw error;
    }
  }

  // Document sharing methods
  async getDocumentShares(documentId: number): Promise<any[]> {
    try {
      return await db
        .select()
        .from(documentShares)
        .where(eq(documentShares.documentId, documentId));
    } catch (error) {
      console.error('Database error in getDocumentShares:', error);
      throw error;
    }
  }

  async createDocumentShare(share: any): Promise<any> {
    try {
      const result = await db.insert(documentShares).values(share).returning();
      return result[0];
    } catch (error) {
      console.error('Database error in createDocumentShare:', error);
      throw error;
    }
  }

  async deleteDocumentShare(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(documentShares)
        .where(eq(documentShares.id, id))
        .returning({ id: documentShares.id });

      return result.length > 0;
    } catch (error) {
      console.error('Database error in deleteDocumentShare:', error);
      throw error;
    }
  }

  async updateDocumentShareAccess(id: number, accessLevel: string): Promise<any | undefined> {
    try {
      const result = await db
        .update(documentShares)
        .set({ accessLevel })
        .where(eq(documentShares.id, id))
        .returning();

      return result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error('Database error in updateDocumentShareAccess:', error);
      throw error;
    }
  }

  // Knowledge graph methods
  async getKnowledgeGraphForDocument(documentId: number): Promise<KnowledgeGraph> {
    try {
      const nodes = await db
        .select()
        .from(knowledgeGraphNodes)
        .where(eq(knowledgeGraphNodes.documentId, documentId));

      const edges = await db
        .select()
        .from(knowledgeGraphEdges)
        .where(eq(knowledgeGraphEdges.documentId, documentId));

      return {
        nodes: nodes as unknown as KnowledgeGraphNode[],
        edges: edges as unknown as KnowledgeGraphEdge[]
      };
    } catch (error) {
      console.error('Database error in getKnowledgeGraphForDocument:', error);
      throw error;
    }
  }

  async createKnowledgeGraphNode(node: any): Promise<KnowledgeGraphNode> {
    try {
      const result = await db.insert(knowledgeGraphNodes).values(node).returning();
      return result[0] as unknown as KnowledgeGraphNode;
    } catch (error) {
      console.error('Database error in createKnowledgeGraphNode:', error);
      throw error;
    }
  }

  async createKnowledgeGraphEdge(edge: any): Promise<KnowledgeGraphEdge> {
    try {
      const result = await db.insert(knowledgeGraphEdges).values(edge).returning();
      return result[0] as unknown as KnowledgeGraphEdge;
    } catch (error) {
      console.error('Database error in createKnowledgeGraphEdge:', error);
      throw error;
    }
  }

  async deleteKnowledgeGraphForDocument(documentId: number): Promise<boolean> {
    try {
      await db
        .delete(knowledgeGraphEdges)
        .where(eq(knowledgeGraphEdges.documentId, documentId));

      await db
        .delete(knowledgeGraphNodes)
        .where(eq(knowledgeGraphNodes.documentId, documentId));

      return true;
    } catch (error) {
      console.error('Database error in deleteKnowledgeGraphForDocument:', error);
      throw error;
    }
  }

  // Stubs for remaining methods that we haven't implemented yet
  async getTraineePrograms(traineeId: number) {
    return [];
  }

  async getTraineeSessionsByDateRange(traineeId: number, startDate: Date, endDate: Date) {
    return [];
  }

  async getTraineePerformanceMetrics(traineeId: number) {
    return [];
  }

  async getRecommendedResourcesForUser(userId: number) {
    return [];
  }

  async getRecentAssessments(traineeId: number, limit?: number) {
    return [];
  }

  async getTrainingGoalsForUser(userId: number) {
    return [];
  }

  async getTraineeRiskData(traineeId: number) {
    return {};
  }

  // Risk Assessment methods
  async getRiskAssessment(id: number) {
    return undefined;
  }

  async getAllRiskAssessments(filters?: { userId?: number, category?: string, status?: string }) {
    return [];
  }

  async createRiskAssessment(assessment: any) {
    return assessment;
  }

  async updateRiskAssessment(id: number, assessment: any) {
    return undefined;
  }

  async deleteRiskAssessment(id: number) {
    return false;
  }
}
