/**
 * Database Schema for Aviation Training Platform
 * 
 * Key structures for documents and knowledge graph functionality:
 * - documents: Stores metadata about uploaded documents
 * - documentContent: Stores extracted text content from documents
 * - documentAnalysis: Stores analysis results for documents
 * - knowledgeGraphNodes: Stores nodes (concepts) in the knowledge graph
 * - knowledgeGraphEdges: Stores edges (relationships) between nodes
 */

import { pgTable, serial, text, timestamp, integer, boolean, json, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// =========================================================
// Document Management Tables
// =========================================================

// Document table for storing document metadata
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  fileType: text('file_type').notNull(),
  url: text('url').notNull(),
  filePath: text('file_path').notNull(),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(),
  uploadedById: integer('uploaded_by_id').notNull(),
  uploadedByRole: text('uploaded_by_role').notNull(),
  tags: text('tags').array(),
  metadata: json('metadata').$type<Record<string, any>>(),
  isProcessed: boolean('is_processed').default(false),
  createKnowledgeGraph: boolean('create_knowledge_graph').default(false),
  processingStatus: text('processing_status'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Document content table for storing extracted text
export const documentContent = pgTable('document_content', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  textContent: text('text_content').notNull(),
  confidenceScore: integer('confidence_score'),
  extractionTime: integer('extraction_time'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Document analysis table for storing analysis results
export const documentAnalysis = pgTable('document_analysis', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  analysisType: text('analysis_type').notNull(),
  status: text('status').notNull(),
  results: json('results').$type<Record<string, any>>(),
  confidence: integer('confidence'),
  processingTime: integer('processing_time'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  error: text('error')
});

// Document sharing table
export const documentShares = pgTable('document_shares', {
  id: serial('id').primaryKey(),
  documentId: integer('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  sharedById: integer('shared_by_id').notNull(),
  sharedWithId: integer('shared_with_id').notNull(),
  sharedAt: timestamp('shared_at').defaultNow().notNull(),
  accessLevel: text('access_level'),
  notificationSent: boolean('notification_sent'),
  isRead: boolean('is_read'),
  lastAccessed: timestamp('last_accessed')
});

// =========================================================
// Knowledge Graph Tables
// =========================================================

// Knowledge graph nodes table
export const knowledgeGraphNodes = pgTable('knowledge_graph_nodes', {
  id: text('id').primaryKey(),
  documentId: integer('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  category: text('category').notNull(),
  description: text('description'),
  importance: integer('importance').default(50),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Knowledge graph edges table
export const knowledgeGraphEdges = pgTable('knowledge_graph_edges', {
  id: serial('id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => knowledgeGraphNodes.id, { onDelete: 'cascade' }),
  targetId: text('target_id').notNull().references(() => knowledgeGraphNodes.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  strength: integer('strength').default(50),
  documentId: integer('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// =========================================================
// Relations
// =========================================================

// Set up document relations
export const documentsRelations = relations(documents, ({ many }) => ({
  content: many(documentContent),
  analysis: many(documentAnalysis),
  shares: many(documentShares),
  nodes: many(knowledgeGraphNodes),
  edges: many(knowledgeGraphEdges)
}));

// Set up document content relations
export const documentContentRelations = relations(documentContent, ({ one }) => ({
  document: one(documents, {
    fields: [documentContent.documentId],
    references: [documents.id]
  })
}));

// Set up document analysis relations
export const documentAnalysisRelations = relations(documentAnalysis, ({ one }) => ({
  document: one(documents, {
    fields: [documentAnalysis.documentId],
    references: [documents.id]
  })
}));

// Set up document shares relations
export const documentSharesRelations = relations(documentShares, ({ one }) => ({
  document: one(documents, {
    fields: [documentShares.documentId],
    references: [documents.id]
  })
}));

// Set up knowledge graph nodes relations
export const knowledgeGraphNodesRelations = relations(knowledgeGraphNodes, ({ one, many }) => ({
  document: one(documents, {
    fields: [knowledgeGraphNodes.documentId],
    references: [documents.id]
  }),
  outgoingEdges: many(knowledgeGraphEdges, { relationName: 'source' }),
  incomingEdges: many(knowledgeGraphEdges, { relationName: 'target' })
}));

// Set up knowledge graph edges relations
export const knowledgeGraphEdgesRelations = relations(knowledgeGraphEdges, ({ one }) => ({
  document: one(documents, {
    fields: [knowledgeGraphEdges.documentId],
    references: [documents.id]
  }),
  source: one(knowledgeGraphNodes, {
    fields: [knowledgeGraphEdges.sourceId],
    references: [knowledgeGraphNodes.id],
    relationName: 'source'
  }),
  target: one(knowledgeGraphNodes, {
    fields: [knowledgeGraphEdges.targetId],
    references: [knowledgeGraphNodes.id],
    relationName: 'target'
  })
}));

// =========================================================
// Insert/Select Types
// =========================================================

// Insert schemas
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true });
export const insertDocumentContentSchema = createInsertSchema(documentContent).omit({ id: true });
export const insertDocumentAnalysisSchema = createInsertSchema(documentAnalysis).omit({ id: true });
export const insertDocumentShareSchema = createInsertSchema(documentShares).omit({ id: true });
export const insertKnowledgeGraphNodeSchema = createInsertSchema(knowledgeGraphNodes);
export const insertKnowledgeGraphEdgeSchema = createInsertSchema(knowledgeGraphEdges).omit({ id: true });

// Insert types
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertDocumentContent = z.infer<typeof insertDocumentContentSchema>;
export type InsertDocumentAnalysis = z.infer<typeof insertDocumentAnalysisSchema>;
export type InsertDocumentShare = z.infer<typeof insertDocumentShareSchema>;
export type InsertKnowledgeGraphNode = z.infer<typeof insertKnowledgeGraphNodeSchema>;
export type InsertKnowledgeGraphEdge = z.infer<typeof insertKnowledgeGraphEdgeSchema>;

// Select types
export type Document = typeof documents.$inferSelect;
export type DocumentContent = typeof documentContent.$inferSelect;
export type DocumentAnalysis = typeof documentAnalysis.$inferSelect;
export type DocumentShare = typeof documentShares.$inferSelect;
export type KnowledgeGraphNode = typeof knowledgeGraphNodes.$inferSelect;
export type KnowledgeGraphEdge = typeof knowledgeGraphEdges.$inferSelect;