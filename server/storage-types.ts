import { Store as SessionStore } from 'express-session';
import { 
  User, 
  InsertUser, 
  TrainingProgram,
  Session,
  Assessment,
  Resource,
  documents,
  documentContent,
  knowledgeGraphNodes,
  knowledgeGraphEdges,
  documentVersions,
  documentShares
} from '@shared/schema';
import { Document, DocumentProcessingStatus, DocumentContent } from '@shared/document-types';
import { KnowledgeGraphNode, KnowledgeGraphEdge, KnowledgeGraph } from '@shared/knowledge-graph-types';

/**
 * Storage interface for abstraction
 */
export interface IStorage {
  sessionStore: SessionStore;

  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  
  // Trainee specific methods
  getTraineePrograms(traineeId: number): Promise<TrainingProgram[]>;
  getTraineeSessionsByDateRange(traineeId: number, startDate: Date, endDate: Date): Promise<Session[]>;
  getTraineePerformanceMetrics(traineeId: number): Promise<any[]>;
  getRecommendedResourcesForUser(userId: number): Promise<Resource[]>;
  getRecentAssessments(traineeId: number, limit?: number): Promise<Assessment[]>;
  getTrainingGoalsForUser(userId: number): Promise<{id: number, name: string, progress: number}[]>;
  getTraineeRiskData(traineeId: number): Promise<any>;
  
  // Risk Assessment methods
  getRiskAssessment(id: number): Promise<any | undefined>;
  getAllRiskAssessments(filters?: { userId?: number, category?: string, status?: string }): Promise<any[]>;
  createRiskAssessment(assessment: any): Promise<any>;
  updateRiskAssessment(id: number, assessment: any): Promise<any | undefined>;
  deleteRiskAssessment(id: number): Promise<boolean>;
  
  // Document methods
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentByTitle(title: string): Promise<Document | undefined>;
  getAllDocuments(options?: { 
    limit?: number; 
    offset?: number; 
    sortBy?: string; 
    sortOrder?: 'asc'|'desc';
    filterByType?: string;
    filterByUploadedBy?: number;
  }): Promise<Document[]>;
  createDocument(document: any): Promise<Document>;
  updateDocument(id: number, document: any): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;
  updateDocumentProcessingStatus(id: number, status: DocumentProcessingStatus): Promise<boolean>;
  
  // Document content methods
  getDocumentContent(documentId: number): Promise<DocumentContent | undefined>;
  createDocumentContent(content: any): Promise<DocumentContent>;
  updateDocumentContent(documentId: number, content: any): Promise<DocumentContent | undefined>;
  
  // Document version methods
  getDocumentVersions(documentId: number): Promise<any[]>;
  getDocumentVersion(versionId: number): Promise<any | undefined>;
  createDocumentVersion(version: any): Promise<any>;
  
  // Document sharing methods
  getDocumentShares(documentId: number): Promise<any[]>;
  createDocumentShare(share: any): Promise<any>;
  deleteDocumentShare(id: number): Promise<boolean>;
  updateDocumentShareAccess(id: number, accessLevel: string): Promise<any | undefined>;
  
  // Knowledge graph methods
  getKnowledgeGraphForDocument(documentId: number): Promise<KnowledgeGraph>;
  createKnowledgeGraphNode(node: any): Promise<KnowledgeGraphNode>;
  createKnowledgeGraphEdge(edge: any): Promise<KnowledgeGraphEdge>;
  deleteKnowledgeGraphForDocument(documentId: number): Promise<boolean>;
}
