#!/usr/bin/env python3
"""
NLP Service for Advanced Pilot Training Platform
Provides document intelligence capabilities including classification,
knowledge extraction, language detection, and translation
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional

from flask import Flask, request, jsonify
import spacy
import networkx as nx
from transformers import AutoTokenizer, AutoModel, pipeline
from langdetect import detect_langs
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Load models
nlp = spacy.load("en_core_web_trf")
tokenizer = AutoTokenizer.from_pretrained("aviation-bert-base")
model = AutoModel.from_pretrained("aviation-bert-base")
translator = pipeline("translation", model="Helsinki-NLP/opus-mt-en-ROMANCE")

# Load regulatory requirements
def load_regulatory_requirements(regulation_type: str) -> Dict[str, Any]:
    """Load regulatory requirements from JSON files"""
    try:
        with open(f"./data/regulations/{regulation_type.lower()}_requirements.json", "r") as f:
            return json.load(f)
    except FileNotFoundError:
        logger.warning(f"Requirements for {regulation_type} not found")
        return {}

# Document classification model
class DocumentClassifier:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=5000)
        
        # Load training data
        self.training_data = pd.read_csv("./data/document_classes.csv")
        
        # Prepare model
        self.document_vectors = self.vectorizer.fit_transform(self.training_data["content"])
        self.document_classes = self.training_data["class"].tolist()
        
    def classify(self, text: str) -> Dict[str, Any]:
        """Classify document based on content"""
        # Vectorize the input text
        text_vector = self.vectorizer.transform([text])
        
        # Calculate similarity to each document in the training set
        similarities = cosine_similarity(text_vector, self.document_vectors).flatten()
        
        # Get top 3 most similar documents
        top_indices = similarities.argsort()[-3:][::-1]
        top_classes = [self.document_classes[i] for i in top_indices]
        top_scores = [float(similarities[i]) for i in top_indices]
        
        # Determine the most likely class
        class_votes = {}
        for cls, score in zip(top_classes, top_scores):
            class_votes[cls] = class_votes.get(cls, 0) + score
        
        best_class = max(class_votes.items(), key=lambda x: x[1])[0]
        
        return {
            "document_type": best_class,
            "confidence": float(class_votes[best_class] / sum(top_scores)),
            "alternative_classes": [
                {"class": cls, "score": float(score)} 
                for cls, score in zip(top_classes, top_scores) if cls != best_class
            ]
        }

# Knowledge Graph Builder
class KnowledgeGraphBuilder:
    def __init__(self):
        self.graph = nx.DiGraph()
        
    def extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """Extract entities from text using spaCy"""
        doc = nlp(text)
        entities = []
        
        for ent in doc.ents:
            entities.append({
                "text": ent.text,
                "label": ent.label_,
                "start": ent.start_char,
                "end": ent.end_char
            })
        
        # Add custom aviation-specific entity extraction
        # This would be expanded with domain-specific rules
        aviation_terms = [
            "approach", "takeoff", "landing", "altitude", "checklist",
            "procedure", "maneuver", "airspeed", "flap", "gear"
        ]
        
        for term in aviation_terms:
            if term in text.lower():
                entities.append({
                    "text": term,
                    "label": "AVIATION_TERM",
                    "start": text.lower().find(term),
                    "end": text.lower().find(term) + len(term)
                })
        
        return entities
    
    def build_graph_from_documents(self, documents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Build knowledge graph from multiple documents"""
        self.graph = nx.DiGraph()
        
        # Process each document
        for doc in documents:
            doc_id = doc.get("document_id", "unknown")
            doc_type = doc.get("document_type", "unknown")
            content = doc.get("content", "")
            
            # Create document node
            self.graph.add_node(doc_id, type="document", doc_type=doc_type)
            
            # Extract entities and relationships
            entities = self.extract_entities(content)
            
            # Add entities to graph
            for entity in entities:
                entity_id = f"{entity['text']}_{entity['label']}"
                
                # Add entity if not exists
                if not self.graph.has_node(entity_id):
                    self.graph.add_node(entity_id, 
                                        type="entity", 
                                        label=entity["label"],
                                        text=entity["text"])
                
                # Add relationship between document and entity
                self.graph.add_edge(doc_id, entity_id, type="contains")
            
            # Extract sections/headers using regex or other methods
            # (simplified for this example)
            sections = content.split("\n\n")
            for i, section in enumerate(sections):
                if len(section.strip()) > 0:
                    section_id = f"{doc_id}_section_{i}"
                    self.graph.add_node(section_id, type="section", content=section[:100])
                    self.graph.add_edge(doc_id, section_id, type="has_section")
        
        # Build cross-document relationships
        self._build_cross_document_relationships()
        
        # Convert graph to serializable format
        return self._serialize_graph()
    
    def _build_cross_document_relationships(self):
        """Find relationships between entities across documents"""
        # Get all entity nodes
        entity_nodes = [n for n, d in self.graph.nodes(data=True) if d.get("type") == "entity"]
        
        # Group entities by text
        entity_groups = {}
        for entity in entity_nodes:
            entity_data = self.graph.nodes[entity]
            text = entity_data.get("text", "").lower()
            
            if text not in entity_groups:
                entity_groups[text] = []
            
            entity_groups[text].append(entity)
        
        # Connect same entities across documents
        for text, entities in entity_groups.items():
            if len(entities) > 1:
                for i in range(len(entities)):
                    for j in range(i+1, len(entities)):
                        self.graph.add_edge(entities[i], entities[j], type="same_as")
        
        # Add more sophisticated relationship detection here
        # For example, connecting related procedures, detecting prerequisites, etc.
    
    def _serialize_graph(self) -> Dict[str, Any]:
        """Convert networkx graph to serializable format"""
        nodes = []
        for node_id, data in self.graph.nodes(data=True):
            node_data = data.copy()
            node_data["id"] = node_id
            nodes.append(node_data)
        
        edges = []
        for source, target, data in self.graph.edges(data=True):
            edge_data = data.copy()
            edge_data["source"] = source
            edge_data["target"] = target
            edges.append(edge_data)
        
        return {
            "nodes": nodes,
            "edges": edges
        }

# Initialize components
document_classifier = DocumentClassifier()
knowledge_graph_builder = KnowledgeGraphBuilder()

# API endpoints
@app.route("/classify", methods=["POST"])
def classify_document():
    """Classify document based on content"""
    data = request.json
    if not data or "content" not in data:
        return jsonify({"error": "Missing content field"}), 400
    
    result = document_classifier.classify(data["content"])
    return jsonify(result)

@app.route("/extract_structure", methods=["POST"])
def extract_structure():
    """Extract structured content from document"""
    data = request.json
    if not data or "content" not in data:
        return jsonify({"error": "Missing content field"}), 400
    
    config_path = data.get("config_path", "default.config")
    
    # Process document based on content and config
    # This would be expanded with specific parsing rules
    doc = nlp(data["content"])
    
    # Extract sections, headers, tables, etc.
    sections = []
    current_section = None
    
    for para in data["content"].split("\n\n"):
        if not para.strip():
            continue
            
        # Simple heuristic for header detection
        if len(para.strip()) < 100 and para.isupper() or para.endswith(":"):
            # Looks like a header
            current_section = {
                "title": para.strip(),
                "content": "",
                "subsections": []
            }
            sections.append(current_section)
        elif current_section:
            current_section["content"] += para + "\n\n"
        else:
            # Text before any header
            current_section = {
                "title": "Introduction",
                "content": para + "\n\n",
                "subsections": []
            }
            sections.append(current_section)
    
    # Extract key-value pairs
    key_value_pairs = {}
    for ent in doc.ents:
        if ent.label_ in ["DATE", "TIME", "CARDINAL", "QUANTITY", "PERCENT"]:
            # Look for patterns like "Key: Value" or "Key - Value"
            context = data["content"][max(0, ent.start_char - 50):ent.start_char]
            for delimiter in [":", "-", "="]:
                if delimiter in context:
                    key = context.split(delimiter)[-1].strip()
                    key_value_pairs[key] = ent.text
    
    return jsonify({
        "sections": sections,
        "key_value_pairs": key_value_pairs,
        "entity_count": len(doc.ents)
    })

@app.route("/detect_language", methods=["POST"])
def detect_language():
    """Detect document language"""
    data = request.json
    if not data or "content" not in data:
        return jsonify({"error": "Missing content field"}), 400
    
    try:
        langs = detect_langs(data["content"])
        languages = [{"lang": l.lang, "prob": l.prob} for l in langs]
        
        return jsonify({
            "languages": [l["lang"] for l in languages],
            "probabilities": languages
        })
    except Exception as e:
        logger.error(f"Language detection error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/translate", methods=["POST"])
def translate_content():
    """Translate content to target language"""
    data = request.json
    if not data or "content" not in data or "target_language" not in data:
        return jsonify({"error": "Missing required fields"}), 400
    
    try:
        # This is simplified - in practice, you'd need more sophisticated translation
        result = translator(data["content"], target_language=data["target_language"])
        
        return jsonify({
            "translated_text": result[0]["translation_text"],
            "source_language": "auto-detected",
            "target_language": data["target_language"]
        })
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/build_knowledge_graph", methods=["POST"])
def build_knowledge_graph():
    """Build knowledge graph from documents"""
    data = request.json
    if not data or "documents" not in data:
        return jsonify({"error": "Missing documents field"}), 400
    
    try:
        graph = knowledge_graph_builder.build_graph_from_documents(data["documents"])
        return jsonify(graph)
    except Exception as e:
        logger.error(f"Knowledge graph error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/validate_compliance", methods=["POST"])
def validate_compliance():
    """Validate document compliance against regulations"""
    data = request.json
    if not data or "document" not in data or "regulation_type" not in data:
        return jsonify({"error": "Missing required fields"}), 400
    
    try:
        # Load regulation requirements
        regulations = load_regulatory_requirements(data["regulation_type"])
        
        if not regulations:
            return jsonify({
                "is_compliant": False,
                "error": f"No regulations found for {data['regulation_type']}"
            }), 404
        
        # Check document against requirements
        document = data["document"]
        missing_items = []
        
        # This is a simplified check - real implementation would be more sophisticated
        for req in regulations.get("requirements", []):
            req_name = req.get("name", "")
            req_pattern = req.get("pattern", "").lower()
            
            # Check if requirement is met in the document
            content = document.get("content", "").lower()
            if req_pattern and req_pattern not in content:
                missing_items.append({
                    "requirement": req_name,
                    "description": req.get("description", ""),
                    "importance": req.get("importance", "medium")
                })
        
        is_compliant = len(missing_items) == 0
        
        return jsonify({
            "is_compliant": is_compliant,
            "regulation_type": data["regulation_type"],
            "missing_items": missing_items,
            "requirements_checked": len(regulations.get("requirements", []))
        })
    except Exception as e:
        logger.error(f"Compliance validation error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/identify_missing_items", methods=["POST"])
def identify_missing_items():
    """Identify missing items in document against regulations"""
    # Similar to validate_compliance but with more detail on missing items
    data = request.json
    if not data or "document" not in data or "regulation_type" not in data:
        return jsonify({"error": "Missing required fields"}), 400
    
    try:
        # Load regulation requirements
        regulations = load_regulatory_requirements(data["regulation_type"])
        
        if not regulations:
            return jsonify({
                "error": f"No regulations found for {data['regulation_type']}"
            }), 404
        
        # Check document against requirements
        document = data["document"]
        missing_items = []
        
        # This is a simplified check - real implementation would be more sophisticated
        for req in regulations.get("requirements", []):
            req_name = req.get("name", "")
            req_pattern = req.get("pattern", "").lower()
            
            # Check if requirement is met in the document
            content = document.get("content", "").lower()
            if req_pattern and req_pattern not in content:
                # Add suggested content for the missing item
                suggestion = req.get("suggestion", "")
                if not suggestion:
                    # Generate suggestion based on requirement
                    suggestion = f"Include information about {req_name}"
                
                missing_items.append({
                    "requirement": req_name,
                    "description": req.get("description", ""),
                    "importance": req.get("importance", "medium"),
                    "suggestion": suggestion,
                    "reference": req.get("reference", "")
                })
        
        return jsonify({
            "missing_items": missing_items,
            "requirements_checked": len(regulations.get("requirements", []))
        })
    except Exception as e:
        logger.error(f"Missing items identification error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/standardize_terminology", methods=["POST"])
def standardize_terminology():
    """Standardize terminology in document content"""
    data = request.json
    if not data or "content" not in data:
        return jsonify({"error": "Missing content field"}), 400
    
    try:
        # Load terminology glossary
        glossary_file = data.get("glossary", "aviation_glossary.json")
        with open(f"./data/glossaries/{glossary_file}", "r") as f:
            glossary = json.load(f)
        
        content = data["content"]
        replacements = []
        
        # Replace non-standard terms with standard ones
        for term, standard_term in glossary.get("terms", {}).items():
            if term.lower() in content.lower() and term.lower() != standard_term.lower():
                # Replace term with standard term
                # For simplicity, we're doing case-insensitive replacement
                # A more sophisticated implementation would preserve case
                new_content = content
                instances = []
                
                # Find all instances (case-insensitive)
                start_pos = 0
                while True:
                    pos = new_content.lower().find(term.lower(), start_pos)
                    if pos == -1:
                        break
                    
                    instances.append({
                        "position": pos,
                        "original": new_content[pos:pos+len(term)],
                        "replacement": standard_term
                    })
                    
                    start_pos = pos + len(term)
                
                # Replace instances with standard term
                for i, instance in enumerate(reversed(instances)):
                    pos = instance["position"]
                    original = instance["original"]
                    replacement = instance["replacement"]
                    
                    new_content = new_content[:pos] + replacement + new_content[pos+len(original):]
                    
                    replacements.append({
                        "original": original,
                        "standardized": replacement,
                        "position": pos
                    })
                
                content = new_content
        
        # Generate glossary of standardized terms used
        used_terms = {}
        for replacement in replacements:
            standard_term = replacement["standardized"]
            if standard_term not in used_terms:
                definition = glossary.get("definitions", {}).get(standard_term, "")
                used_terms[standard_term] = definition
        
        return jsonify({
            "standardized_content": content,
            "replacements": replacements,
            "term_count": len(replacements),
            "glossary": used_terms
        })
    except Exception as e:
        logger.error(f"Terminology standardization error: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Starting the Flask application
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
