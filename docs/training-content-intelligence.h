// /document/controllers/DocumentIntelligenceController.h
#pragma once

#include <drogon/HttpController.h>
#include "../services/DocumentProcessingService.h"
#include "../services/KnowledgeGraphService.h"
#include "../services/MultiLanguageService.h"
#include "../services/TerminologyService.h"

namespace document {

class DocumentIntelligenceController : public drogon::HttpController<DocumentIntelligenceController> {
public:
    DocumentIntelligenceController();
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(DocumentIntelligenceController::processDocument, "/api/document/process", drogon::Post);
    ADD_METHOD_TO(DocumentIntelligenceController::extractKnowledgeGraph, "/api/document/knowledge-graph", drogon::Post);
    ADD_METHOD_TO(DocumentIntelligenceController::crossReferenceDocuments, "/api/document/cross-reference", drogon::Post);
    ADD_METHOD_TO(DocumentIntelligenceController::translateDocument, "/api/document/translate", drogon::Post);
    ADD_METHOD_TO(DocumentIntelligenceController::standardizeTerminology, "/api/document/standardize-terms", drogon::Post);
    ADD_METHOD_TO(DocumentIntelligenceController::generateGlossary, "/api/document/generate-glossary", drogon::Post);
    METHOD_LIST_END

private:
    void processDocument(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void extractKnowledgeGraph(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void crossReferenceDocuments(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void translateDocument(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void standardizeTerminology(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void generateGlossary(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);

    std::shared_ptr<DocumentProcessingService> docService_;
    std::shared_ptr<KnowledgeGraphService> knowledgeGraphService_;
    std::shared_ptr<MultiLanguageService> languageService_;
    std::shared_ptr<TerminologyService> terminologyService_;
};

} // namespace document

// /document/controllers/DocumentIntelligenceController.cc
#include "DocumentIntelligenceController.h"
#include <drogon/HttpResponse.h>
#include <json/json.h>

using namespace document;

DocumentIntelligenceController::DocumentIntelligenceController()
    : docService_(std::make_shared<DocumentProcessingService>()),
      knowledgeGraphService_(std::make_shared<KnowledgeGraphService>()),
      languageService_(std::make_shared<MultiLanguageService>()),
      terminologyService_(std::make_shared<TerminologyService>()) {}

void DocumentIntelligenceController::processDocument(const drogon::HttpRequestPtr& req, 
                                                     std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::HttpStatusCode::k400BadRequest);
        resp->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
        Json::Value error;
        error["error"] = "Invalid JSON";
        resp->setBody(error.toStyledString());
        callback(resp);
        return;
    }

    try {
        std::string documentId = (*json)["documentId"].asString();
        std::string documentType = (*json)["documentType"].asString();
        
        // Process document with context-aware parsing
        auto result = docService_->processDocumentWithContext(documentId, documentType);
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::HttpStatusCode::k200OK);
        resp->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
        resp->setBody(result.toStyledString());
        callback(resp);
    } catch (const std::exception& e) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::HttpStatusCode::k500InternalServerError);
        resp->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
        Json::Value error;
        error["error"] = e.what();
        resp->setBody(error.toStyledString());
        callback(resp);
    }
}

void DocumentIntelligenceController::extractKnowledgeGraph(const drogon::HttpRequestPtr& req, 
                                                          std::function<void(const drogon::HttpResponsePtr&)>&& callback) {
    auto json = req->getJsonObject();
    if (!json) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::HttpStatusCode::k400BadRequest);
        resp->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
        Json::Value error;
        error["error"] = "Invalid JSON";
        resp->setBody(error.toStyledString());
        callback(resp);
        return;
    }

    try {
        std::string documentId = (*json)["documentId"].asString();
        
        // Extract knowledge graph from document
        auto result = knowledgeGraphService_->extractKnowledgeGraph(documentId);
        
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::HttpStatusCode::k200OK);
        resp->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
        resp->setBody(result.toStyledString());
        callback(resp);
    } catch (const std::exception& e) {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::HttpStatusCode::k500InternalServerError);
        resp->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
        Json::Value error;
        error["error"] = e.what();
        resp->setBody(error.toStyledString());
        callback(resp);
    }
}

// Implementation of other controller methods omitted for brevity...

// /document/services/DocumentProcessingService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/Document.h"
#include "../models/DocumentSection.h"
#include "../models/TrainingRequirement.h"
#include "../models/ParsedContent.h"

namespace document {

class DocumentProcessingService {
public:
    DocumentProcessingService();
    ~DocumentProcessingService();

    // Context-aware document parsing
    Json::Value processDocumentWithContext(const std::string& documentId, const std::string& documentType);
    
    // Extract training requirements and learning objectives
    std::vector<TrainingRequirement> extractTrainingRequirements(const std::string& documentId);
    
    // Extract time allocations for training activities
    Json::Value extractTimeAllocations(const std::string& documentId);
    
    // Extract prerequisites and dependencies
    Json::Value extractPrerequisites(const std::string& documentId);
    
    // Extract assessment criteria
    Json::Value extractAssessmentCriteria(const std::string& documentId);
    
    // Extract resource requirements
    Json::Value extractResourceRequirements(const std::string& documentId);
    
    // Classify document content (ground school vs. simulator, knowledge vs. skill)
    Json::Value classifyDocumentContent(const std::string& documentId);

private:
    // Helper methods for content extraction
    Document loadDocument(const std::string& documentId);
    std::vector<DocumentSection> parseDocumentSections(const Document& doc);
    ParsedContent contextualParsing(const Document& doc, const std::string& documentType);
    
    // ML model for document classification
    void initializeMLModels();
    
    // Document storage and retrieval
    std::string getDocumentContent(const std::string& documentId);
};

} // namespace document

// /document/services/KnowledgeGraphService.h
#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <memory>
#include <json/json.h>
#include "../models/KnowledgeGraph.h"
#include "../models/DocumentEntity.h"
#include "../models/Relationship.h"

namespace document {

class KnowledgeGraphService {
public:
    KnowledgeGraphService();
    ~KnowledgeGraphService();

    // Extract knowledge graph from document
    Json::Value extractKnowledgeGraph(const std::string& documentId);
    
    // Merge knowledge graphs from multiple documents
    KnowledgeGraph mergeKnowledgeGraphs(const std::vector<std::string>& documentIds);
    
    // Find relationships between entities across documents
    std::vector<Relationship> findCrossDocumentRelationships(const std::string& documentId1, const std::string& documentId2);
    
    // Query the knowledge graph
    Json::Value queryKnowledgeGraph(const std::string& query, const std::string& documentId);
    
    // Export knowledge graph to various formats
    std::string exportKnowledgeGraph(const std::string& documentId, const std::string& format);

private:
    // Helper methods for graph construction
    std::vector<DocumentEntity> extractEntities(const std::string& documentId);
    std::vector<Relationship> extractRelationships(const std::string& documentId, const std::vector<DocumentEntity>& entities);
    void constructGraph(KnowledgeGraph& graph, const std::vector<DocumentEntity>& entities, const std::vector<Relationship>& relationships);
    
    // Storage for knowledge graphs
    std::unordered_map<std::string, KnowledgeGraph> documentGraphs_;
};

} // namespace document

// /syllabus/controllers/SyllabusController.h
#pragma once

#include <drogon/HttpController.h>
#include "../services/SyllabusGenerationService.h"
#include "../services/SyllabusTemplateService.h"
#include "../services/ComplianceAnalysisService.h"

namespace syllabus {

class SyllabusController : public drogon::HttpController<SyllabusController> {
public:
    SyllabusController();
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(SyllabusController::generateSyllabus, "/api/syllabus/generate", drogon::Post);
    ADD_METHOD_TO(SyllabusController::applySyllabusTemplate, "/api/syllabus/apply-template", drogon::Post);
    ADD_METHOD_TO(SyllabusController::analyzeSyllabusCompliance, "/api/syllabus/analyze-compliance", drogon::Post);
    ADD_METHOD_TO(SyllabusController::saveSyllabusVersion, "/api/syllabus/version", drogon::Post);
    ADD_METHOD_TO(SyllabusController::getSyllabusVersions, "/api/syllabus/versions/{id}", drogon::Get);
    ADD_METHOD_TO(SyllabusController::compareSyllabusVersions, "/api/syllabus/compare-versions", drogon::Post);
    ADD_METHOD_TO(SyllabusController::getSyllabusTemplates, "/api/syllabus/templates", drogon::Get);
    ADD_METHOD_TO(SyllabusController::getSyllabusTemplatesByType, "/api/syllabus/templates/{type}", drogon::Get);
    METHOD_LIST_END

private:
    void generateSyllabus(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void applySyllabusTemplate(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void analyzeSyllabusCompliance(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void saveSyllabusVersion(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getSyllabusVersions(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, const std::string& id);
    void compareSyllabusVersions(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getSyllabusTemplates(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void getSyllabusTemplatesByType(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback, const std::string& type);

    std::shared_ptr<SyllabusGenerationService> syllabusService_;
    std::shared_ptr<SyllabusTemplateService> templateService_;
    std::shared_ptr<ComplianceAnalysisService> complianceService_;
};

} // namespace syllabus

// /syllabus/services/SyllabusTemplateService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/SyllabusTemplate.h"
#include "../models/SyllabusSection.h"
#include "../models/SyllabusVersion.h"

namespace syllabus {

class SyllabusTemplateService {
public:
    SyllabusTemplateService();
    ~SyllabusTemplateService();

    // Get all templates
    std::vector<SyllabusTemplate> getAllTemplates();
    
    // Get templates by type (JOC/MCC, Type Rating, CCQ, etc.)
    std::vector<SyllabusTemplate> getTemplatesByType(const std::string& type);
    
    // Get template by ID
    SyllabusTemplate getTemplateById(const std::string& id);
    
    // Create a new template
    std::string createTemplate(const SyllabusTemplate& template_);
    
    // Update a template
    void updateTemplate(const SyllabusTemplate& template_);
    
    // Delete a template
    void deleteTemplate(const std::string& id);
    
    // Apply a template to a syllabus
    Json::Value applyTemplate(const std::string& templateId, const std::string& syllabusId, bool preserveCustomizations = true);

private:
    // Helper methods for template management
    void loadTemplates();
    void saveTemplates();
    
    // Template storage
    std::vector<SyllabusTemplate> templates_;
    
    // Template versioning
    std::unordered_map<std::string, std::vector<SyllabusVersion>> templateVersions_;
};

} // namespace syllabus

// /syllabus/services/ComplianceAnalysisService.h
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <json/json.h>
#include "../models/Syllabus.h"
#include "../models/ComplianceResult.h"
#include "../models/RegulatoryRequirement.h"

namespace syllabus {

class ComplianceAnalysisService {
public:
    ComplianceAnalysisService();
    ~ComplianceAnalysisService();

    // Analyze syllabus compliance with regulations
    ComplianceResult analyzeSyllabusCompliance(const std::string& syllabusId, const std::string& regulatoryFramework);
    
    // Compare compliance between syllabus versions
    Json::Value compareComplianceVersions(const std::string& syllabusId, const std::string& versionId1, const std::string& versionId2);
    
    // Generate compliance visualization
    Json::Value generateComplianceVisualization(const ComplianceResult& result);
    
    // Generate compliance report
    std::string generateComplianceReport(const ComplianceResult& result, const std::string& format);
    
    // Identify compliance gaps
    std::vector<std::string> identifyComplianceGaps(const ComplianceResult& result);
    
    // Suggest remediation for compliance gaps
    Json::Value suggestRemediation(const std::vector<std::string>& gaps, const std::string& syllabusId);

private:
    // Helper methods for compliance analysis
    std::vector<RegulatoryRequirement> loadRegulatoryRequirements(const std::string& framework);
    void mapSyllabusToRequirements(const Syllabus& syllabus, const std::vector<RegulatoryRequirement>& requirements, ComplianceResult& result);
    
    // Regulatory frameworks storage
    std::unordered_map<std::string, std::vector<RegulatoryRequirement>> regulatoryFrameworks_;
};

} // namespace syllabus

// Python ML component for document intelligence
// /document/ml/document_processor.py
import os
import json
import numpy as np
import pandas as pd
import spacy
import torch
from transformers import AutoTokenizer, AutoModel
from sklearn.metrics.pairwise import cosine_similarity
from typing import Dict, List, Tuple, Any

class DocumentIntelligenceProcessor:
    def __init__(self, model_path: str = "aviation_nlp_model"):
        # Load NLP models
        self.nlp = spacy.load("en_core_web_lg")
        
        # Load domain-specific model if available
        if os.path.exists(model_path):
            self.tokenizer = AutoTokenizer.from_pretrained(model_path)
            self.model = AutoModel.from_pretrained(model_path)
        else:
            # Fall back to general model
            self.tokenizer = AutoTokenizer.from_pretrained("distilbert-base-uncased")
            self.model = AutoModel.from_pretrained("distilbert-base-uncased")
        
        # Aviation-specific entity recognizer
        self.aviation_ner = self._load_aviation_ner()
        
        # Document type classifiers
        self.doc_classifier = self._load_document_classifier()
        
        # Terminology standardization
        self.terminology_db = self._load_terminology_database()
    
    def _load_aviation_ner(self):
        # Load custom aviation NER model
        # This would be a trained model specific to aviation terminology
        return spacy.load("aviation_ner_model") if os.path.exists("aviation_ner_model") else self.nlp
    
    def _load_document_classifier(self):
        # Load document type classifier model
        # Returns a function that can classify document types
        return lambda x: "regulatory" # Placeholder
    
    def _load_terminology_database(self):
        # Load standardized terminology database
        try:
            with open("terminology_db.json", "r") as f:
                return json.load(f)
        except FileNotFoundError:
            return {}
    
    def process_document(self, document_text: str, document_type: str = None) -> Dict[str, Any]:
        """
        Process document with context-aware parsing
        """
        # Determine document type if not provided
        if not document_type:
            document_type = self.doc_classifier(document_text)
        
        # Process document based on type
        if document_type == "regulatory":
            return self._process_regulatory_document(document_text)
        elif document_type == "training_manual":
            return self._process_training_manual(document_text)
        elif document_type == "syllabus":
            return self._process_syllabus(document_text)
        else:
            return self._process_generic_document(document_text)
    
    def _process_regulatory_document(self, text: str) -> Dict[str, Any]:
        # Process regulatory documents (FAA, EASA, etc.)
        doc = self.aviation_ner(text)
        
        # Extract requirements and regulations
        requirements = []
        for sent in doc.sents:
            if any(token.text.lower() in ["shall", "must", "required", "requirement"] for token in sent):
                requirements.append(str(sent))
        
        # Extract references to other documents
        references = []
        for ent in doc.ents:
            if ent.label_ in ["DOC", "REGULATION", "STANDARD"]:
                references.append(ent.text)
        
        return {
            "document_type": "regulatory",
            "requirements": requirements,
            "references": references,
            "entities": [{"text": ent.text, "label": ent.label_} for ent in doc.ents]
        }
    
    def _process_training_manual(self, text: str) -> Dict[str, Any]:
        # Process training manuals
        doc = self.aviation_ner(text)
        
        # Extract procedures
        procedures = []
        current_procedure = {"title": "", "steps": []}
        for sent in doc.sents:
            if sent.text.isupper() and len(sent.text.split()) <= 10:
                if current_procedure["title"]:
                    procedures.append(current_procedure)
                current_procedure = {"title": sent.text, "steps": []}
            elif current_procedure["title"]:
                current_procedure["steps"].append(str(sent))
        
        if current_procedure["title"]:
            procedures.append(current_procedure)
        
        # Extract learning objectives
        learning_objectives = []
        for sent in doc.sents:
            if "objective" in sent.text.lower() or "learn" in sent.text.lower():
                learning_objectives.append(str(sent))
        
        return {
            "document_type": "training_manual",
            "procedures": procedures,
            "learning_objectives": learning_objectives,
            "entities": [{"text": ent.text, "label": ent.label_} for ent in doc.ents]
        }
    
    def _process_syllabus(self, text: str) -> Dict[str, Any]:
        # Process syllabus documents
        doc = self.aviation_ner(text)
        
        # Extract modules and lessons
        modules = []
        current_module = {"title": "", "lessons": []}
        current_lesson = {"title": "", "content": ""}
        
        for sent in doc.sents:
            if sent.text.isupper() and "MODULE" in sent.text:
                if current_module["title"]:
                    if current_lesson["title"]:
                        current_module["lessons"].append(current_lesson)
                        current_lesson = {"title": "", "content": ""}
                    modules.append(current_module)
                current_module = {"title": sent.text, "lessons": []}
            elif sent.text.isupper() and "LESSON" in sent.text and current_module["title"]:
                if current_lesson["title"]:
                    current_module["lessons"].append(current_lesson)
                current_lesson = {"title": sent.text, "content": ""}
            elif current_lesson["title"]:
                current_lesson["content"] += str(sent) + " "
        
        if current_lesson["title"]:
            current_module["lessons"].append(current_lesson)
        if current_module["title"]:
            modules.append(current_module)
        
        # Extract time allocations
        time_allocations = []
        for sent in doc.sents:
            if any(unit in sent.text.lower() for unit in ["hour", "minute", "day", "session"]):
                time_allocations.append(str(sent))
        
        return {
            "document_type": "syllabus",
            "modules": modules,
            "time_allocations": time_allocations,
            "entities": [{"text": ent.text, "label": ent.label_} for ent in doc.ents]
        }
    
    def _process_generic_document(self, text: str) -> Dict[str, Any]:
        # Process generic documents
        doc = self.nlp(text)
        
        # Basic document structure
        paragraphs = text.split("\n\n")
        sentences = [str(sent) for sent in doc.sents]
        
        return {
            "document_type": "generic",
            "paragraphs": paragraphs,
            "sentences": sentences,
            "entities": [{"text": ent.text, "label": ent.label_} for ent in doc.ents]
        }
    
    def extract_knowledge_graph(self, document_text: str) -> Dict[str, Any]:
        """
        Extract knowledge graph from document
        """
        doc = self.aviation_ner(document_text)
        
        # Extract entities
        entities = []
        for ent in doc.ents:
            entities.append({
                "id": f"ent_{len(entities)}",
                "text": ent.text,
                "type": ent.label_,
                "start": ent.start_char,
                "end": ent.end_char
            })
        
        # Extract relationships
        relationships = []
        for sent in doc.sents:
            # Simple SVO (Subject-Verb-Object) extraction
            subject = None
            verb = None
            obj = None
            
            for token in sent:
                if token.dep_ == "nsubj":
                    subject = token.text
                    subject_id = next((e["id"] for e in entities if e["text"] == subject), None)
                elif token.dep_ == "ROOT" and token.pos_ == "VERB":
                    verb = token.text
                elif token.dep_ in ["dobj", "pobj"] and subject and verb:
                    obj = token.text
                    object_id = next((e["id"] for e in entities if e["text"] == obj), None)
                    
                    if subject_id and object_id:
                        relationships.append({
                            "source": subject_id,
                            "type": verb,
                            "target": object_id,
                            "sentence": str(sent)
                        })
        
        return {
            "entities": entities,
            "relationships": relationships
        }
    
    def standardize_terminology(self, document_text: str) -> str:
        """
        Standardize terminology in document
        """
        doc = self.nlp(document_text)
        standardized_text = document_text
        
        # Find and replace non-standard terms
        for term, standard_term in self.terminology_db.items():
            # Simple string replacement for now
            # In a production system, would need more sophisticated matching
            standardized_text = standardized_text.replace(term, standard_term)
        
        return standardized_text
    
    def translate_document(self, document_text: str, target_language: str) -> str:
        """
        Translate document to target language
        """
        # This would integrate with a translation service like Google Translate
        # or a specialized aviation translation model
        # Placeholder implementation
        return f"Translated to {target_language}: {document_text[:100]}..."
    
    def generate_glossary(self, document_text: str) -> Dict[str, str]:
        """
        Generate glossary from document
        """
        doc = self.aviation_ner(document_text)
        glossary = {}
        
        # Extract technical terms and acronyms
        for ent in doc.ents:
            if ent.label_ in ["TERM", "ACRONYM", "TECHNICAL"]:
                # Find definitions in nearby text
                # Simple approach: look for patterns like "X is", "X means"
                for sent in doc.sents:
                    if ent.text in sent.text:
                        if " is " in sent.text or " means " in sent.text or " refers to " in sent.text:
                            definition = str(sent)
                            glossary[ent.text] = definition
                            break
        
        # Add acronyms with their expansions
        for token in doc:
            if token.is_upper and len(token.text) > 1:
                # Look for pattern like "XXX (Expanded XX X)"
                for sent in doc.sents:
                    if token.text in sent.text and "(" in sent.text and ")" in sent.text:
                        start_idx = sent.text.find("(", sent.text.find(token.text))
                        if start_idx > -1:
                            end_idx = sent.text.find(")", start_idx)
                            if end_idx > -1:
                                expansion = sent.text[start_idx+1:end_idx]
                                glossary[token.text] = expansion
        
        return glossary
    
    def cross_reference_documents(self, doc1_text: str, doc2_text: str) -> List[Dict[str, Any]]:
        """
        Find cross-references between documents
        """
        doc1 = self.aviation_ner(doc1_text)
        doc2 = self.aviation_ner(doc2_text)
        
        # Extract entities from both documents
        entities1 = [ent.text for ent in doc1.ents]
        entities2 = [ent.text for ent in doc2.ents]
        
        # Find common entities
        common_entities = set(entities1).intersection(set(entities2))
        
        cross_references = []
        for entity in common_entities:
            # Find sentences containing the entity in both documents
            sentences1 = [str(sent) for sent in doc1.sents if entity in sent.text]
            sentences2 = [str(sent) for sent in doc2.sents if entity in sent.text]
            
            cross_references.append({
                "entity": entity,
                "doc1_sentences": sentences1,
                "doc2_sentences": sentences2
            })
        
        return cross_references

# Python ML component for syllabus generation
# /syllabus/ml/syllabus_generator.py
import os
import json
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class SyllabusGenerator:
    def __init__(self, templates_path: str = "syllabus_templates"):
        self.templates_path = templates_path
        self.templates = self._load_templates()
        self.regulatory_requirements = self._load_regulatory_requirements()
        
        # Initialize TF-IDF vectorizer for content matching
        self.vectorizer = TfidfVectorizer(max_features=5000)
        self._fit_vectorizer()
    
    def _load_templates(self) -> Dict[str, Any]:
        """
        Load syllabus templates
        """
        templates = {}
        
        # Load each template type
        template_types = ["joc_mcc", "type_rating", "ccq", "recurrent"]
        for template_type in template_types:
            template_path = os.path.join(self.templates_path, f"{template_type}.json")
            if os.path.exists(template_path):
                with open(template_path, "r") as f:
                    templates[template_type] = json.load(f)
        
        return templates
    
    def _load_regulatory_requirements(self) -> Dict[str, Any]:
        """
        Load regulatory requirements for compliance mapping
        """
        requirements = {}
        
        # Load requirements for different regulatory frameworks
        frameworks = ["faa", "easa", "dgca"]
        for framework in frameworks:
            req_path = os.path.join("regulatory_requirements", f"{framework}.json")
            if os.path.exists(req_path):
                with open(req_path, "r") as f:
                    requirements[framework] = json.load(f)
        
        return requirements
    
    def _fit_vectorizer(self):
        """
        Fit TF-IDF vectorizer on template content
        """
        all_content = []
        
        # Collect all content from templates
        for template_type, template in self.templates.items():
            if "modules" in template:
                for module in template["modules"]:
                    if "description" in module:
                        all_content.append(module["description"])
                    
                    if "lessons" in module:
                        for lesson in module["lessons"]:
                            if "description" in lesson:
                                all_content.append(lesson["description"])
        
        if all_content:
            self.vectorizer.fit(all_content)
    
    def generate_syllabus(self, 
                          document_content: Dict[str, Any], 
                          template_type: str, 
                          regulatory_framework: str = "easa") -> Dict[str, Any]:
        """
        Generate a syllabus based on document content and template
        """
        # Check if template exists
        if template_type not in self.templates:
            raise ValueError(f"Template type '{template_type}' not found")
        
        # Start with the template
        syllabus = self.templates[template_type].copy()
        
        # Extract information from document content
        learning_objectives = document_content.get("learning_objectives", [])
        procedures = document_content.get("procedures", [])
        requirements = document_content.get("requirements", [])
        time_allocations = document_content.get("time_allocations", [])
        
        # Enhance template with extracted content
        syllabus = self._enhance_template_with_content(syllabus, 
                                                      learning_objectives,
                                                      procedures,
                                                      requirements)
        
        # Map regulatory requirements
        if regulatory_framework in self.regulatory_requirements:
            syllabus = self._map_regulatory_requirements(syllabus, 
                                                        self.regulatory_requirements[regulatory_framework])
        
        # Set metadata
        syllabus["metadata"] = {
            "generated_from_template": template_type,
            "regulatory_framework": regulatory_framework,
            "generation_timestamp": pd.Timestamp.now().isoformat(),
            "version": "1.0"
        }
        
        return syllabus
    
    def _enhance_template_with_content(self, 
                                      syllabus: Dict[str, Any],
                                      learning_objectives: List[str],
                                      procedures: List[Dict[str, Any]],
                                      requirements: List[str]) -> Dict[str, Any]:
        """
        Enhance template with extracted content
        """
        # Vector representations of learning objectives and procedures
        if learning_objectives:
            objective_vectors = self.vectorizer.transform(learning_objectives)
        
        procedure_texts = [p["title"] + ": " + " ".join(p["steps"]) for p in procedures]
        if procedure_texts:
            procedure_vectors = self.vectorizer.transform(procedure_texts)
        
        # For each module and lesson, find relevant content
        for i, module in enumerate(syllabus.get("modules", [])):
            module_desc = module.get("description", "")
            if module_desc:
                module_vector = self.vectorizer.transform([module_desc])
                
                # Find relevant learning objectives
                if learning_objectives:
                    similarities = cosine_similarity(module_vector, objective_vectors)[0]
                    relevant_indices = np.where(similarities > 0.3)[0]
                    relevant_objectives = [learning_objectives[idx] for idx in relevant_indices]
                    syllabus["modules"][i]["learning_objectives"] = relevant_objectives
                
                # Find relevant procedures
                if procedure_texts:
                    similarities = cosine_similarity(module_vector, procedure_vectors)[0]
                    relevant_indices = np.where(similarities > 0.3)[0]
                    relevant_procedures = [procedures[idx] for idx in relevant_indices]
                    syllabus["modules"][i]["procedures"] = relevant_procedures
            
            # Process lessons within module
            for j, lesson in enumerate(module.get("lessons", [])):
                lesson_desc = lesson.get("description", "")
                if lesson_desc:
                    lesson_vector = self.vectorizer.transform([lesson_desc])
                    
                    # Find relevant learning objectives
                    if learning_objectives:
                        similarities = cosine_similarity(lesson_vector, objective_vectors)[0]
                        relevant_indices = np.where(similarities > 0.4)[0]
                        relevant_objectives = [learning_objectives[idx] for idx in relevant_indices]
                        syllabus["modules"][i]["lessons"][j]["learning_objectives"] = relevant_objectives
                    
                    # Find relevant procedures
                    if procedure_texts:
                        similarities = cosine_similarity(lesson_vector, procedure_vectors)[0]
                        relevant_indices = np.where(similarities > 0.4)[0]
                        relevant_procedures = [procedures[idx] for idx in relevant_indices]
                        syllabus["modules"][i]["lessons"][j]["procedures"] = relevant_procedures
        
        return syllabus
    
    def _map_regulatory_requirements(self, 
                                    syllabus: Dict[str, Any],
                                    requirements: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map regulatory requirements to syllabus elements
        """
        # Extract requirement texts
        requirement_texts = []
        requirement_ids = []
        
        for req_id, req_data in requirements.items():
            req_text = req_data.get("text", "")
            if req_text:
                requirement_texts.append(req_text)
                requirement_ids.append(req_id)
        
        if not requirement_texts:
            return syllabus
        
        # Vector representations of requirements
        requirement_vectors = self.vectorizer.transform(requirement_texts)
        
        # For each module and lesson, find relevant requirements
        for i, module in enumerate(syllabus.get("modules", [])):
            module_desc = module.get("description", "")
            if module_desc:
                module_vector = self.vectorizer.transform([module_desc])
                
                # Find relevant requirements
                similarities = cosine_similarity(module_vector, requirement_vectors)[0]
                relevant_indices = np.where(similarities > 0.3)[0]
                relevant_reqs = [{"id": requirement_ids[idx], "text": requirement_texts[idx]} 
                               for idx in relevant_indices]
                syllabus["modules"][i]["regulatory_requirements"] = relevant_reqs
            
            # Process lessons within module
            for j, lesson in enumerate(module.get("lessons", [])):
                lesson_desc = lesson.get("description", "")
                if lesson_desc:
                    lesson_vector = self.vectorizer.transform([lesson_desc])
                    
                    # Find relevant requirements
                    similarities = cosine_similarity(lesson_vector, requirement_vectors)[0]
                    relevant_indices = np.where(similarities > 0.4)[0]
                    relevant_reqs = [{"id": requirement_ids[idx], "text": requirement_texts[idx]} 
                                   for idx in relevant_indices]
                    syllabus["modules"][i]["lessons"][j]["regulatory_requirements"] = relevant_reqs
        
        return syllabus
    
    def analyze_compliance(self, syllabus: Dict[str, Any], regulatory_framework: str = "easa") -> Dict[str, Any]:
        """
        Analyze syllabus compliance with regulatory requirements
        """
        if regulatory_framework not in self.regulatory_requirements:
            raise ValueError(f"Regulatory framework '{regulatory_framework}' not found")
        
        requirements = self.regulatory_requirements[regulatory_framework]
        
        # Initialize compliance results
        compliance_results = {
            "framework": regulatory_framework,
            "total_requirements": len(requirements),
            "met_requirements": 0,
            "partially_met_requirements": 0,
            "unmet_requirements": 0,
            "requirement_details": []
        }
        
        # Check each requirement against syllabus
        for req_id, req_data in requirements.items():
            req_text = req_data.get("text", "")
            if not req_text:
                continue
            
            # Initialize requirement compliance
            req_compliance = {
                "id": req_id,
                "text": req_text,
                "status": "unmet",
                "coverage": 0.0,
                "mapped_elements": []
            }
            
            # Look for requirement in modules and lessons
            for module in syllabus.get("modules", []):
                # Check module requirements
                module_reqs = module.get("regulatory_requirements", [])
                for module_req in module_reqs:
                    if module_req["id"] == req_id:
                        req_compliance["mapped_elements"].append({
                            "type": "module",
                            "id": module.get("id", ""),
                            "title": module.get("title", "")
                        })
                
                # Check lesson requirements
                for lesson in module.get("lessons", []):
                    lesson_reqs = lesson.get("regulatory_requirements", [])
                    for lesson_req in lesson_reqs:
                        if lesson_req["id"] == req_id:
                            req_compliance["mapped_elements"].append({
                                "type": "lesson",
                                "id": lesson.get("id", ""),
                                "title": lesson.get("title", ""),
                                "module_id": module.get("id", "")
                            })
            
            # Determine compliance status
            if len(req_compliance["mapped_elements"]) > 0:
                coverage = min(1.0, len(req_compliance["mapped_elements"]) / 2.0)
                req_compliance["coverage"] = coverage
                
                if coverage >= 0.8:
                    req_compliance["status"] = "met"
                    compliance_results["met_requirements"] += 1
                else:
                    req_compliance["status"] = "partially_met"
                    compliance_results["partially_met_requirements"] += 1
            else:
                compliance_results["unmet_requirements"] += 1
            
            compliance_results["requirement_details"].append(req_compliance)
        
        return compliance_results
    
    def compare_syllabus_versions(self, 
                                 syllabus_v1: Dict[str, Any], 
                                 syllabus_v2: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compare two versions of a syllabus
        """
        comparison = {
            "added_modules": [],
            "removed_modules": [],
            "modified_modules": [],
            "added_lessons": [],
            "removed_lessons": [],
            "modified_lessons": [],
            "compliance_impact": {
                "improved": [],
                "reduced": [],
                "unchanged": []
            }
        }
        
        # Extract module IDs from both versions
        v1_module_ids = [m.get("id", "") for m in syllabus_v1.get("modules", [])]
        v2_module_ids = [m.get("id", "") for m in syllabus_v2.get("modules", [])]
        
        # Find added and removed modules
        for module_id in v2_module_ids:
            if module_id not in v1_module_ids:
                module = next((m for m in syllabus_v2.get("modules", []) if m.get("id", "") == module_id), None)
                if module:
                    comparison["added_modules"].append({
                        "id": module_id,
                        "title": module.get("title", "")
                    })
        
        for module_id in v1_module_ids:
            if module_id not in v2_module_ids:
                module = next((m for m in syllabus_v1.get("modules", []) if m.get("id", "") == module_id), None)
                if module:
                    comparison["removed_modules"].append({
                        "id": module_id,
                        "title": module.get("title", "")
                    })
        
        # Compare modules that exist in both versions
        for module_id in set(v1_module_ids) & set(v2_module_ids):
            v1_module = next((m for m in syllabus_v1.get("modules", []) if m.get("id", "") == module_id), None)
            v2_module = next((m for m in syllabus_v2.get("modules", []) if m.get("id", "") == module_id), None)
            
            if v1_module and v2_module:
                # Check for changes in module
                changes = []
                if v1_module.get("title", "") != v2_module.get("title", ""):
                    changes.append("title")
                if v1_module.get("description", "") != v2_module.get("description", ""):
                    changes.append("description")
                
                # Check regulatory requirements
                v1_reqs = {r.get("id", ""): r for r in v1_module.get("regulatory_requirements", [])}
                v2_reqs = {r.get("id", ""): r for r in v2_module.get("regulatory_requirements", [])}
                
                added_reqs = [req_id for req_id in v2_reqs if req_id not in v1_reqs]
                removed_reqs = [req_id for req_id in v1_reqs if req_id not in v2_reqs]
                
                if added_reqs:
                    changes.append("added_requirements")
                    # Add to compliance impact
                    for req_id in added_reqs:
                        comparison["compliance_impact"]["improved"].append({
                            "req_id": req_id,
                            "module_id": module_id
                        })
                
                if removed_reqs:
                    changes.append("removed_requirements")
                    # Add to compliance impact
                    for req_id in removed_reqs:
                        comparison["compliance_impact"]["reduced"].append({
                            "req_id": req_id,
                            "module_id": module_id
                        })
                
                if changes:
                    comparison["modified_modules"].append({
                        "id": module_id,
                        "title": v2_module.get("title", ""),
                        "changes": changes
                    })
                
                # Compare lessons
                v1_lesson_ids = [l.get("id", "") for l in v1_module.get("lessons", [])]
                v2_lesson_ids = [l.get("id", "") for l in v2_module.get("lessons", [])]
                
                # Find added and removed lessons
                for lesson_id in v2_lesson_ids:
                    if lesson_id not in v1_lesson_ids:
                        lesson = next((l for l in v2_module.get("lessons", []) if l.get("id", "") == lesson_id), None)
                        if lesson:
                            comparison["added_lessons"].append({
                                "id": lesson_id,
                                "title": lesson.get("title", ""),
                                "module_id": module_id
                            })
                
                for lesson_id in v1_lesson_ids:
                    if lesson_id not in v2_lesson_ids:
                        lesson = next((l for l in v1_module.get("lessons", []) if l.get("id", "") == lesson_id), None)
                        if lesson:
                            comparison["removed_lessons"].append({
                                "id": lesson_id,
                                "title": lesson.get("title", ""),
                                "module_id": module_id
                            })
                
                # Compare lessons that exist in both versions
                for lesson_id in set(v1_lesson_ids) & set(v2_lesson_ids):
                    v1_lesson = next((l for l in v1_module.get("lessons", []) if l.get("id", "") == lesson_id), None)
                    v2_lesson = next((l for l in v2_module.get("lessons", []) if l.get("id", "") == lesson_id), None)
                    
                    if v1_lesson and v2_lesson:
                        # Check for changes in lesson
                        lesson_changes = []
                        if v1_lesson.get("title", "") != v2_lesson.get("title", ""):
                            lesson_changes.append("title")
                        if v1_lesson.get("description", "") != v2_lesson.get("description", ""):
                            lesson_changes.append("description")
                        if v1_lesson.get("duration", 0) != v2_lesson.get("duration", 0):
                            lesson_changes.append("duration")
                        
                        # Check regulatory requirements
                        v1_lesson_reqs = {r.get("id", ""): r for r in v1_lesson.get("regulatory_requirements", [])}
                        v2_lesson_reqs = {r.get("id", ""): r for r in v2_lesson.get("regulatory_requirements", [])}
                        
                        lesson_added_reqs = [req_id for req_id in v2_lesson_reqs if req_id not in v1_lesson_reqs]
                        lesson_removed_reqs = [req_id for req_id in v1_lesson_reqs if req_id not in v2_lesson_reqs]
                        
                        if lesson_added_reqs:
                            lesson_changes.append("added_requirements")
                            # Add to compliance impact
                            for req_id in lesson_added_reqs:
                                comparison["compliance_impact"]["improved"].append({
                                    "req_id": req_id,
                                    "module_id": module_id,
                                    "lesson_id": lesson_id
                                })
                        
                        if lesson_removed_reqs:
                            lesson_changes.append("removed_requirements")
                            # Add to compliance impact
                            for req_id in lesson_removed_reqs:
                                comparison["compliance_impact"]["reduced"].append({
                                    "req_id": req_id,
                                    "module_id": module_id,
                                    "lesson_id": lesson_id
                                })
                        
                        if lesson_changes:
                            comparison["modified_lessons"].append({
                                "id": lesson_id,
                                "title": v2_lesson.get("title", ""),
                                "module_id": module_id,
                                "changes": lesson_changes
                            })
        
        # Add summary statistics
        comparison["summary"] = {
            "added_modules_count": len(comparison["added_modules"]),
            "removed_modules_count": len(comparison["removed_modules"]),
            "modified_modules_count": len(comparison["modified_modules"]),
            "added_lessons_count": len(comparison["added_lessons"]),
            "removed_lessons_count": len(comparison["removed_lessons"]),
            "modified_lessons_count": len(comparison["modified_lessons"]),
            "compliance_improved_count": len(comparison["compliance_impact"]["improved"]),
            "compliance_reduced_count": len(comparison["compliance_impact"]["reduced"])
        }
        
        return comparison
    
    def visualize_compliance_impact(self, compliance_comparison: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate visualization data for compliance impact
        """
        visualization = {
            "improved": {
                "count": len(compliance_comparison["compliance_impact"]["improved"]),
                "details": compliance_comparison["compliance_impact"]["improved"]
            },
            "reduced": {
                "count": len(compliance_comparison["compliance_impact"]["reduced"]),
                "details": compliance_comparison["compliance_impact"]["reduced"]
            },
            "net_impact": len(compliance_comparison["compliance_impact"]["improved"]) - 
                        len(compliance_comparison["compliance_impact"]["reduced"])
        }
        
        # Add severity assessment
        if visualization["net_impact"] < -3:
            visualization["impact_severity"] = "high_negative"
        elif visualization["net_impact"] < 0:
            visualization["impact_severity"] = "low_negative"
        elif visualization["net_impact"] == 0:
            visualization["impact_severity"] = "neutral"
        elif visualization["net_impact"] > 3:
            visualization["impact_severity"] = "high_positive"
        else:
            visualization["impact_severity"] = "low_positive"
        
        return visualization

# Unit tests for DocumentIntelligenceController
// /document/tests/DocumentIntelligenceControllerTest.cc
#include <gtest/gtest.h>
#include <drogon/drogon.h>
#include <drogon/HttpClient.h>
#include "../controllers/DocumentIntelligenceController.h"
#include "../services/DocumentProcessingService.h"
#include "../services/KnowledgeGraphService.h"
#include <memory>

using namespace document;

class DocumentIntelligenceControllerTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Mock services
        docService_ = std::make_shared<DocumentProcessingService>();
        knowledgeGraphService_ = std::make_shared<KnowledgeGraphService>();
        
        // Create controller with mocked services
        controller_ = std::make_shared<DocumentIntelligenceController>();
        // Inject mocked services (would need dependency injection framework or setter methods)
    }

    std::shared_ptr<DocumentIntelligenceController> controller_;
    std::shared_ptr<DocumentProcessingService> docService_;
    std::shared_ptr<KnowledgeGraphService> knowledgeGraphService_;
};

TEST_F(DocumentIntelligenceControllerTest, ProcessDocumentSuccess) {
    // Create request with valid JSON
    drogon::HttpRequestPtr req = drogon::HttpRequest::newHttpRequest();
    req->setMethod(drogon::HttpMethod::Post);
    req->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
    
    Json::Value requestBody;
    requestBody["documentId"] = "test-doc-123";
    requestBody["documentType"] = "regulatory";
    req->setBody(requestBody.toStyledString());
    
    bool callbackCalled = false;
    
    // Call the endpoint
    controller_->processDocument(req, [&callbackCalled](const drogon::HttpResponsePtr& resp) {
        callbackCalled = true;
        EXPECT_EQ(resp->getStatusCode(), drogon::HttpStatusCode::k200OK);
        
        // Parse response JSON
        Json::Value responseJson;
        Json::Reader reader;
        reader.parse(resp->getBody(), responseJson);
        
        // Validate response
        EXPECT_TRUE(responseJson.isObject());
    });
    
    EXPECT_TRUE(callbackCalled);
}

TEST_F(DocumentIntelligenceControllerTest, ProcessDocumentInvalidJson) {
    // Create request with invalid JSON
    drogon::HttpRequestPtr req = drogon::HttpRequest::newHttpRequest();
    req->setMethod(drogon::HttpMethod::Post);
    req->setContentTypeCode(drogon::ContentType::CT_APPLICATION_JSON);
    req->setBody("invalid json data");
    
    bool callbackCalled = false;
    
    // Call the endpoint
    controller_->processDocument(req, [&callbackCalled](const drogon::HttpResponsePtr& resp) {
        callbackCalled = true;
        EXPECT_EQ(resp->getStatusCode(), drogon::HttpStatusCode::k400BadRequest);
    });
    
    EXPECT_TRUE(callbackCalled);
}

// Additional tests would be included here...

// Unit tests for SyllabusTemplateService
// /syllabus/tests/SyllabusTemplateServiceTest.cc
#include <gtest/gtest.h>
#include "../services/SyllabusTemplateService.h"

using namespace syllabus;

class SyllabusTemplateServiceTest : public ::testing::Test {
protected:
    void SetUp() override {
        service_ = std::make_shared<SyllabusTemplateService>();
    }

    std::shared_ptr<SyllabusTemplateService> service_;
};

TEST_F(SyllabusTemplateServiceTest, GetAllTemplates) {
    auto templates = service_->getAllTemplates();
    EXPECT_FALSE(templates.empty());
}

TEST_F(SyllabusTemplateServiceTest, GetTemplatesByType) {
    auto templates = service_->getTemplatesByType("JOC_MCC");
    
    // Check that we got the right type of templates
    for (const auto& templ : templates) {
        EXPECT_EQ(templ.getType(), "JOC_MCC");
    }
}

TEST_F(SyllabusTemplateServiceTest, ApplyTemplate) {
    // Create a test syllabus
    std::string syllabusId = "test-syllabus-123";
    
    // Apply a template
    Json::Value result = service_->applyTemplate("joc_mcc_template_1", syllabusId, true);
    
    // Validate result
    EXPECT_TRUE(result.isObject());
    EXPECT_TRUE(result.isMember("success"));
    EXPECT_TRUE(result["success"].asBool());
    EXPECT_TRUE(result.isMember("syllabusId"));
    EXPECT_EQ(result["syllabusId"].asString(), syllabusId);
}

// Python tests for document_processor.py
# /document/ml/tests/test_document_processor.py
import unittest
import json
from document.ml.document_processor import DocumentIntelligenceProcessor

class TestDocumentIntelligenceProcessor(unittest.TestCase):
    def setUp(self):
        self.processor = DocumentIntelligenceProcessor()
        
        # Sample document for testing
        self.sample_regulatory_doc = """
        CHAPTER 1: PILOT TRAINING REQUIREMENTS
        
        1.1 General Requirements
        
        All pilots must complete the required training modules as specified in this document.
        Training shall include both ground school and simulator sessions.
        
        1.2 Recurrent Training
        
        Pilots shall complete recurrent training every 6 months to maintain proficiency.
        """
    
    def test_process_document(self):
        # Test processing a regulatory document
        result = self.processor.process_document(self.sample_regulatory_doc, "regulatory")
        
        # Verify structure of result
        self.assertEqual(result["document_type"], "regulatory")
        self.assertIn("requirements", result)
        self.assertTrue(len(result["requirements"]) > 0)
        
        # Verify requirements extraction
        requirements = result["requirements"]
        self.assertIn("All pilots must complete the required training modules", requirements[0])
    
    def test_extract_knowledge_graph(self):
        # Test knowledge graph extraction
        graph = self.processor.extract_knowledge_graph(self.sample_regulatory_doc)
        
        # Verify structure of result
        self.assertIn("entities", graph)
        self.assertIn("relationships", graph)
        
        # Check if entities were extracted
        entities = graph["entities"]
        self.assertTrue(len(entities) > 0)
        
        # Check if at least one entity has the expected structure
        if len(entities) > 0:
            entity = entities[0]
            self.assertIn("id", entity)
            self.assertIn("text", entity)
            self.assertIn("type", entity)
    
    def test_standardize_terminology(self):
        # Test terminology standardization
        non_standard_text = "Pilots need to finish sim training and attend CRM workshops."
        standardized = self.processor.standardize_terminology(non_standard_text)
        
        # In a real test, we would check if specific terms were standardized
        self.assertIsInstance(standardized, str)
        self.assertGreater(len(standardized), 0)
    
    def test_generate_glossary(self):
        # Test glossary generation
        glossary = self.processor.generate_glossary(self.sample_regulatory_doc + "\nCRM (Crew Resource Management) is a set of training procedures.")
        
        # Verify structure of result
        self.assertIsInstance(glossary, dict)
        
        # Check if the acronym was extracted with its definition
        if "CRM" in glossary:
            self.assertIn("Crew Resource Management", glossary["CRM"])

# Python tests for syllabus_generator.py
# /syllabus/ml/tests/test_syllabus_generator.py
import unittest
import json
from syllabus.ml.syllabus_generator import SyllabusGenerator

class TestSyllabusGenerator(unittest.TestCase):
    def setUp(self):
        self.generator = SyllabusGenerator()
        
        # Sample document content for testing
        self.sample_doc_content = {
            "learning_objectives": [
                "Understand the principles of aircraft systems",
                "Demonstrate proficiency in normal and abnormal procedures",
                "Apply Crew Resource Management principles effectively"
            ],
            "procedures": [
                {"title": "Engine Start", "steps": ["Set parking brake", "Verify fuel quantity", "Start engines according to checklist"]},
                {"title": "Takeoff Procedure", "steps": ["Complete before takeoff checklist", "Align aircraft with runway", "Apply takeoff power"]}
            ],
            "requirements": [
                "Pilots must demonstrate proficiency in all normal procedures",
                "Training shall include both normal and abnormal scenarios",
                "Assessments must be completed after each training module"
            ],
            "time_allocations": [
                "Engine systems training: 4 hours",
                "Simulator session: 2 hours per day"
            ]
        }
    
    def test_generate_syllabus(self):
        # Test syllabus generation
        syllabus = self.generator.generate_syllabus(self.sample_doc_content, "joc_mcc", "easa")
        
        # Verify structure of result
        self.assertIn("modules", syllabus)
        self.assertIn("metadata", syllabus)
        
        # Check metadata
        metadata = syllabus["metadata"]
        self.assertEqual(metadata["generated_from_template"], "joc_mcc")
        self.assertEqual(metadata["regulatory_framework"], "easa")
        
        # Check if modules exist
        modules = syllabus["modules"]
        self.assertGreater(len(modules), 0)
        
        # Check if any learning objectives were mapped
        learning_objectives_mapped = False
        for module in modules:
            if "learning_objectives" in module and len(module["learning_objectives"]) > 0:
                learning_objectives_mapped = True
                break
                
        self.assertTrue(learning_objectives_mapped)
    
    def test_analyze_compliance(self):
        # First generate a syllabus
        syllabus = self.generator.generate_syllabus(self.sample_doc_content, "joc_mcc", "easa")
        
        # Then analyze compliance
        compliance = self.generator.analyze_compliance(syllabus, "easa")
        
        # Verify structure of result
        self.assertIn("framework", compliance)
        self.assertEqual(compliance["framework"], "easa")
        self.assertIn("total_requirements", compliance)
        self.assertIn("met_requirements", compliance)
        self.assertIn("requirement_details", compliance)
        
        # Verify requirement details
        details = compliance["requirement_details"]
        self.assertGreater(len(details), 0)
        
        # Check structure of a requirement detail
        if len(details) > 0:
            detail = details[0]
            self.assertIn("id", detail)
            self.assertIn("text", detail)
            self.assertIn("status", detail)
            self.assertIn("coverage", detail)
    
    def test_compare_syllabus_versions(self):
        # Generate two versions of the syllabus
        syllabus_v1 = self.generator.generate_syllabus(self.sample_doc_content, "joc_mcc", "easa")
        
        # For v2, let's modify the document content slightly
        modified_content = self.sample_doc_content.copy()
        modified_content["learning_objectives"].append("Demonstrate knowledge of aviation meteorology")
        
        syllabus_v2 = self.generator.generate_syllabus(modified_content, "joc_mcc", "easa")
        
        # Compare versions
        comparison = self.generator.compare_syllabus_versions(syllabus_v1, syllabus_v2)
        
        # Verify structure of result
        self.assertIn("added_modules", comparison)
        self.assertIn("modified_modules", comparison)
        self.assertIn("added_lessons", comparison)
        self.assertIn("compliance_impact", comparison)
        self.assertIn("summary", comparison)
