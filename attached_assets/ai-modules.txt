# backend/ai-modules/document-understanding/document_analyzer.py
import os
import sys
import logging
import json
import tempfile
from typing import List, Dict, Any, Optional, Tuple, Union
import numpy as np
import pandas as pd
from pathlib import Path
import torch
from transformers import (
    AutoTokenizer, 
    AutoModelForSequenceClassification,
    AutoModelForTokenClassification,
    AutoModelForQuestionAnswering,
    pipeline
)
from sklearn.metrics.pairwise import cosine_similarity
import pytesseract
from PIL import Image
import fitz  # PyMuPDF
import docx
import openpyxl
import re

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('document_analyzer.log')
    ]
)
logger = logging.getLogger(__name__)

class DocumentAnalyzer:
    """
    Main class for document understanding and analysis using transformer models.
    Handles document classification, entity extraction, summarization, and 
    relationship extraction.
    """
    
    def __init__(self, models_dir: str = 'models'):
        """
        Initialize the DocumentAnalyzer with models for various NLP tasks.
        
        Args:
            models_dir: Directory where models are stored or will be downloaded
        """
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(exist_ok=True, parents=True)
        
        # Initialize model paths
        self.model_paths = {
            'classification': self.models_dir / 'classification',
            'ner': self.models_dir / 'ner',
            'qa': self.models_dir / 'qa',
            'summarization': self.models_dir / 'summarization',
            'embeddings': self.models_dir / 'embeddings'
        }
        
        # Create model directories
        for path in self.model_paths.values():
            path.mkdir(exist_ok=True, parents=True)
        
        # Initialize tokenizers and models
        self._initialize_models()
        
        # Define entity types
        self.entity_types = {
            'PER': 'Person',
            'ORG': 'Organization',
            'LOC': 'Location',
            'DATE': 'Date',
            'REGULATION': 'Regulation',
            'COMPETENCY': 'Competency',
            'LEARNING_OBJECTIVE': 'LearningObjective',
            'EQUIPMENT': 'Equipment',
            'PROCEDURE': 'Procedure',
            'SAFETY': 'Safety'
        }
        
        # Regulatory mapping patterns
        self.regulatory_patterns = {
            'FAA': r'(?:14\s*CFR\s*Part\s*\d+|FAR\s*\d+)(?:[.-]\d+)*',
            'EASA': r'(?:EASA\s*Part[-\s](?:[\w]+))(?:[.-]\d+)*',
            'ICAO': r'(?:ICAO\s*Annex\s*\d+)(?:[.-]\d+)*',
            'TCCA': r'(?:CAR\s*\d+)(?:[.-]\d+)*',
            'CASA': r'(?:CASR\s*Part\s*\d+)(?:[.-]\d+)*'
        }
        
    def _initialize_models(self):
        """Initialize all required NLP models"""
        logger.info("Initializing models...")
        
        try:
            # Document classification model
            self.classification_tokenizer = AutoTokenizer.from_pretrained(
                'distilbert-base-uncased', 
                cache_dir=self.model_paths['classification']
            )
            
            # For actual implementation, use a fine-tuned model
            # In this example, we're using a generic model
            self.classification_model = AutoModelForSequenceClassification.from_pretrained(
                'distilbert-base-uncased',
                cache_dir=self.model_paths['classification'],
                num_labels=10  # Number of document categories
            )
            
            # Named Entity Recognition model
            self.ner_tokenizer = AutoTokenizer.from_pretrained(
                'dbmdz/bert-large-cased-finetuned-conll03-english',
                cache_dir=self.model_paths['ner']
            )
            
            self.ner_model = AutoModelForTokenClassification.from_pretrained(
                'dbmdz/bert-large-cased-finetuned-conll03-english',
                cache_dir=self.model_paths['ner']
            )
            
            # Question Answering model for relationship extraction
            self.qa_tokenizer = AutoTokenizer.from_pretrained(
                'deepset/roberta-base-squad2',
                cache_dir=self.model_paths['qa']
            )
            
            self.qa_model = AutoModelForQuestionAnswering.from_pretrained(
                'deepset/roberta-base-squad2',
                cache_dir=self.model_paths['qa']
            )
            
            # Create pipelines
            self.ner_pipeline = pipeline(
                'ner',
                model=self.ner_model,
                tokenizer=self.ner_tokenizer,
                aggregation_strategy="simple"
            )
            
            self.qa_pipeline = pipeline(
                'question-answering',
                model=self.qa_model,
                tokenizer=self.qa_tokenizer
            )
            
            self.summarization_pipeline = pipeline(
                'summarization',
                model='facebook/bart-large-cnn',
                tokenizer='facebook/bart-large-cnn',
                device=0 if torch.cuda.is_available() else -1
            )
            
            logger.info("Models initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing models: {str(e)}")
            raise
    
    def extract_text(self, file_path: Union[str, Path]) -> str:
        """
        Extract text content from various document formats
        
        Args:
            file_path: Path to the document file
            
        Returns:
            Extracted text content as a string
        """
        file_path = Path(file_path)
        file_extension = file_path.suffix.lower()
        
        try:
            # PDF extraction
            if file_extension == '.pdf':
                text = self._extract_from_pdf(file_path)
            
            # Word document extraction
            elif file_extension in ['.docx', '.doc']:
                text = self._extract_from_docx(file_path)
            
            # Excel spreadsheet extraction
            elif file_extension in ['.xlsx', '.xls']:
                text = self._extract_from_excel(file_path)
            
            # PowerPoint extraction
            elif file_extension in ['.pptx', '.ppt']:
                # For simplicity, we're not implementing PPT extraction in this example
                # In a real implementation, you would use a library like python-pptx
                text = "PowerPoint extraction not implemented in this example"
            
            # Plain text extraction
            elif file_extension in ['.txt', '.csv', '.json', '.md']:
                with open(file_path, 'r', encoding='utf-8', errors='replace') as file:
                    text = file.read()
            
            # Image extraction (using OCR)
            elif file_extension in ['.jpg', '.jpeg', '.png', '.tiff', '.bmp']:
                text = self._extract_from_image(file_path)
            
            else:
                logger.warning(f"Unsupported file format: {file_extension}")
                text = ""
                
            return text
            
        except Exception as e:
            logger.error(f"Error extracting text from {file_path}: {str(e)}")
            return ""
    
    def _extract_from_pdf(self, file_path: Path) -> str:
        """Extract text from PDF documents"""
        text_content = []
        
        try:
            # Open the PDF
            pdf_document = fitz.open(file_path)
            
            # Extract text from each page
            for page_num in range(pdf_document.page_count):
                page = pdf_document.load_page(page_num)
                text_content.append(page.get_text())
            
            return "\n\n".join(text_content)
            
        except Exception as e:
            logger.error(f"Error in PDF extraction: {str(e)}")
            return ""
    
    def _extract_from_docx(self, file_path: Path) -> str:
        """Extract text from Word documents"""
        try:
            doc = docx.Document(file_path)
            full_text = []
            
            # Extract text from paragraphs
            for para in doc.paragraphs:
                full_text.append(para.text)
            
            # Extract text from tables
            for table in doc.tables:
                for row in table.rows:
                    row_text = [cell.text for cell in row.cells]
                    full_text.append(" | ".join(row_text))
            
            return "\n".join(full_text)
            
        except Exception as e:
            logger.error(f"Error in DOCX extraction: {str(e)}")
            return ""
    
    def _extract_from_excel(self, file_path: Path) -> str:
        """Extract text from Excel spreadsheets"""
        try:
            workbook = openpyxl.load_workbook(file_path, data_only=True)
            texts = []
            
            # Process each worksheet
            for sheet_name in workbook.sheetnames:
                sheet = workbook[sheet_name]
                sheet_texts = []
                
                # Add sheet name as a header
                sheet_texts.append(f"Sheet: {sheet_name}")
                
                # Extract cell values
                for row in sheet.iter_rows():
                    row_values = [str(cell.value) if cell.value is not None else "" for cell in row]
                    if any(row_values):  # Skip empty rows
                        sheet_texts.append(" | ".join(row_values))
                
                texts.append("\n".join(sheet_texts))
            
            return "\n\n".join(texts)
            
        except Exception as e:
            logger.error(f"Error in Excel extraction: {str(e)}")
            return ""
    
    def _extract_from_image(self, file_path: Path) -> str:
        """Extract text from images using OCR"""
        try:
            image = Image.open(file_path)
            text = pytesseract.image_to_string(image)
            return text
            
        except Exception as e:
            logger.error(f"Error in image extraction: {str(e)}")
            return ""
    
    def classify_document(self, text: str) -> Dict[str, float]:
        """
        Classify the document into predefined categories
        
        Args:
            text: Document text content
            
        Returns:
            Dictionary of category labels and confidence scores
        """
        try:
            # Truncate text to fit model's maximum length
            max_length = self.classification_tokenizer.model_max_length
            tokens = self.classification_tokenizer(text, truncation=True, max_length=max_length, return_tensors="pt")
            
            # Get model predictions
            with torch.no_grad():
                outputs = self.classification_model(**tokens)
                predictions = outputs.logits.softmax(dim=1).squeeze().tolist()
            
            # Map to category labels (in real implementation, these would be your actual categories)
            categories = [
                "Regulations", "Training_Manual", "SOP", "Assessment_Form",
                "Syllabus", "Technical_Manual", "Research_Paper", "Checklist",
                "Flight_Manual", "Miscellaneous"
            ]
            
            # Create result dictionary
            results = {categories[i]: float(predictions[i]) for i in range(len(categories))}
            
            # Sort by confidence
            results = dict(sorted(results.items(), key=lambda x: x[1], reverse=True))
            
            return results
            
        except Exception as e:
            logger.error(f"Error in document classification: {str(e)}")
            return {"error": str(e)}
    
    def extract_entities(self, text: str, entity_types: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Extract named entities from document text
        
        Args:
            text: Document text content
            entity_types: Optional list of entity types to extract
            
        Returns:
            List of extracted entities with type, text, and position
        """
        try:
            # Process text in chunks to handle long documents
            chunk_size = 512
            overlap = 50
            chunks = self._split_text_into_chunks(text, chunk_size, overlap)
            
            all_entities = []
            offset = 0
            
            for chunk in chunks:
                # Run NER pipeline on chunk
                chunk_entities = self.ner_pipeline(chunk)
                
                # Process entities
                for entity in chunk_entities:
                    # Adjust start and end positions based on offset
                    entity_adjusted = {
                        'entity_type': entity['entity_group'],
                        'text': entity['word'],
                        'start': entity['start'] + offset,
                        'end': entity['end'] + offset,
                        'score': float(entity['score'])
                    }
                    
                    all_entities.append(entity_adjusted)
                
                # Update offset for next chunk
                offset += len(chunk) - overlap
            
            # Filter by entity types if specified
            if entity_types:
                all_entities = [e for e in all_entities if e['entity_type'] in entity_types]
            
            # Extract aviation-specific entities using regex patterns
            aviation_entities = self._extract_aviation_entities(text)
            all_entities.extend(aviation_entities)
            
            # Handle overlapping entities (keep highest confidence)
            all_entities = self._resolve_entity_overlaps(all_entities)
            
            return all_entities
            
        except Exception as e:
            logger.error(f"Error in entity extraction: {str(e)}")
            return []
    
    def _extract_aviation_entities(self, text: str) -> List[Dict[str, Any]]:
        """Extract aviation-specific entities using regex patterns"""
        entities = []
        
        # Extract regulatory references
        for reg_body, pattern in self.regulatory_patterns.items():
            for match in re.finditer(pattern, text):
                entities.append({
                    'entity_type': 'REGULATION',
                    'text': match.group(0),
                    'start': match.start(),
                    'end': match.end(),
                    'score': 0.95,  # High confidence for regex matches
                    'regulatory_body': reg_body
                })
        
        # Learning objectives patterns (simplified example)
        lo_pattern = r'(?:Learning Objective|LO)[\s:]+([A-Z0-9]+(?:\.[A-Z0-9]+)*)\s*[-–:]\s*(.*?)(?:\.|$)'
        for match in re.finditer(lo_pattern, text, re.DOTALL):
            entities.append({
                'entity_type': 'LEARNING_OBJECTIVE',
                'text': match.group(0),
                'id': match.group(1).strip(),
                'description': match.group(2).strip(),
                'start': match.start(),
                'end': match.end(),
                'score': 0.9
            })
        
        # Competency patterns (simplified example)
        comp_pattern = r'(?:Competency|Skill)[\s:]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[-–:]\s*(.*?)(?:\.|$)'
        for match in re.finditer(comp_pattern, text, re.DOTALL):
            entities.append({
                'entity_type': 'COMPETENCY',
                'text': match.group(0),
                'name': match.group(1).strip(),
                'description': match.group(2).strip(),
                'start': match.start(),
                'end': match.end(),
                'score': 0.9
            })
        
        return entities
    
    def _resolve_entity_overlaps(self, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Resolve overlapping entity spans by keeping highest confidence entity"""
        if not entities:
            return []
        
        # Sort entities by start position
        sorted_entities = sorted(entities, key=lambda e: (e['start'], -e['end']))
        
        resolved_entities = []
        current = sorted_entities[0]
        
        for next_entity in sorted_entities[1:]:
            # Check if entities overlap
            if next_entity['start'] < current['end']:
                # Keep entity with highest confidence score
                if next_entity['score'] > current['score']:
                    current = next_entity
            else:
                resolved_entities.append(current)
                current = next_entity
        
        resolved_entities.append(current)
        return resolved_entities
    
    def extract_relationships(self, text: str, entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extract relationships between entities
        
        Args:
            text: Document text content
            entities: List of extracted entities
            
        Returns:
            List of relationships between entities
        """
        try:
            relationships = []
            
            # Only process if we have multiple entities
            if len(entities) < 2:
                return relationships
            
            # Generate questions for entity pairs
            for i, entity1 in enumerate(entities):
                for entity2 in enumerate(entities[i+1:]):
                    # Skip if entities are of the same type
                    if entity1['entity_type'] == entity2['entity_type']:
                        continue
                    
                    # Extract context around the entities
                    context = self._extract_context(text, entity1, entity2)
                    
                    # Generate questions based on entity types
                    questions = self._generate_relationship_questions(entity1, entity2)
                    
                    for question in questions:
                        # Use QA model to extract relationship
                        qa_result = self.qa_pipeline(question=question, context=context)
                        
                        # If we have a good answer with reasonable confidence
                        if qa_result['score'] > 0.5:
                            relationships.append({
                                'source_entity': entity1['text'],
                                'source_type': entity1['entity_type'],
                                'target_entity': entity2['text'],
                                'target_type': entity2['entity_type'],
                                'relationship': qa_result['answer'],
                                'confidence': float(qa_result['score'])
                            })
            
            return relationships
            
        except Exception as e:
            logger.error(f"Error in relationship extraction: {str(e)}")
            return []
    
    def _extract_context(self, text: str, entity1: Dict[str, Any], entity2: Dict[str, Any]) -> str:
        """Extract text context surrounding two entities"""
        # Determine the span of text containing both entities
        start = min(entity1['start'], entity2['start'])
        end = max(entity1['end'], entity2['end'])
        
        # Add context window (200 characters before and after)
        context_start = max(0, start - 200)
        context_end = min(len(text), end + 200)
        
        return text[context_start:context_end]
    
    def _generate_relationship_questions(self, entity1: Dict[str, Any], entity2: Dict[str, Any]) -> List[str]:
        """Generate questions to discover relationships between entities"""
        questions = []
        
        # Base templates for different entity type combinations
        templates = {
            ('REGULATION', 'LEARNING_OBJECTIVE'): [
                f"What is the relationship between {entity1['text']} and {entity2['text']}?",
                f"How does {entity1['text']} regulate or apply to {entity2['text']}?"
            ],
            ('COMPETENCY', 'LEARNING_OBJECTIVE'): [
                f"How does {entity1['text']} relate to {entity2['text']}?",
                f"What skills from {entity1['text']} are needed for {entity2['text']}?"
            ],
            ('PERSON', 'ORGANIZATION'): [
                f"What is {entity1['text']}'s role in {entity2['text']}?",
                f"How is {entity1['text']} affiliated with {entity2['text']}?"
            ]
        }
        
        # Get questions based on entity type pair
        type_pair = (entity1['entity_type'], entity2['entity_type'])
        reverse_pair = (entity2['entity_type'], entity1['entity_type'])
        
        if type_pair in templates:
            questions.extend(templates[type_pair])
        elif reverse_pair in templates:
            # Reverse the questions if entity types are in opposite order
            for question in templates[reverse_pair]:
                # Swap entity mentions in the question
                modified = question.replace(entity2['text'], "ENTITY2_TMP")
                modified = modified.replace(entity1['text'], entity2['text'])
                modified = modified.replace("ENTITY2_TMP", entity1['text'])
                questions.append(modified)
        else:
            # Generic questions for other entity type combinations
            questions = [
                f"What is the relationship between {entity1['text']} and {entity2['text']}?",
                f"How do {entity1['text']} and {entity2['text']} relate to each other?"
            ]
        
        return questions
    
    def generate_summary(self, text: str, max_length: int = 150, min_length: int = 50) -> str:
        """
        Generate a concise summary of the document
        
        Args:
            text: Document text content
            max_length: Maximum length of summary in tokens
            min_length: Minimum length of summary in tokens
            
        Returns:
            Generated summary text
        """
        try:
            # Split long documents into chunks
            if len(text) > 10000:
                chunks = self._split_text_into_chunks(text, 4000, 200)
                summaries = []
                
                # Summarize each chunk
                for chunk in chunks:
                    chunk_summary = self.summarization_pipeline(
                        chunk,
                        max_length=max(30, max_length // len(chunks)),
                        min_length=min(20, min_length // len(chunks)),
                        do_sample=False
                    )[0]['summary_text']
                    
                    summaries.append(chunk_summary)
                
                # Combine chunk summaries and summarize again
                combined_summary = " ".join(summaries)
                final_summary = self.summarization_pipeline(
                    combined_summary,
                    max_length=max_length,
                    min_length=min_length,
                    do_sample=False
                )[0]['summary_text']
                
                return final_summary
            else:
                # For shorter documents, summarize directly
                summary = self.summarization_pipeline(
                    text,
                    max_length=max_length,
                    min_length=min_length,
                    do_sample=False
                )[0]['summary_text']
                
                return summary
                
        except Exception as e:
            logger.error(f"Error in document summarization: {str(e)}")
            return "Error generating summary."
    
    def map_to_regulations(self, text: str, regulatory_bodies: List[str] = None) -> List[Dict[str, Any]]:
        """
        Map document content to relevant regulatory standards
        
        Args:
            text: Document text content
            regulatory_bodies: Optional list of regulatory bodies to focus on
            
        Returns:
            List of regulatory mappings
        """
        try:
            # Default to all regulatory bodies if none specified
            if not regulatory_bodies:
                regulatory_bodies = list(self.regulatory_patterns.keys())
            
            mappings = []
            
            # Extract regulatory references using regex patterns
            for reg_body in regulatory_bodies:
                if reg_body in self.regulatory_patterns:
                    pattern = self.regulatory_patterns[reg_body]
                    
                    for match in re.finditer(pattern, text):
                        # Get context around the regulation reference
                        start_pos = max(0, match.start() - 200)
                        end_pos = min(len(text), match.end() + 200)
                        context = text[start_pos:end_pos]
                        
                        # Extract section and subsection information
                        full_reference = match.group(0)
                        
                        # Attempt to parse regulation ID and section
                        regulation_id = full_reference
                        section_id = ""
                        subsection_id = ""
                        
                        # Try to split into regulation and section parts
                        parts = re.split(r'[.-]', full_reference, 1)
                        if len(parts) > 1:
                            regulation_id = parts[0]
                            section_parts = parts[1].split('.', 1)
                            section_id = section_parts[0]
                            if len(section_parts) > 1:
                                subsection_id = section_parts[1]
                        
                        # Extract a brief description from the context
                        # In a real implementation, you would use NLP to get a better description
                        description = context.replace(full_reference, "").strip()
                        if len(description) > 150:
                            description = description[:150] + "..."
                        
                        mapping = {
                            'regulatory_body': reg_body,
                            'regulation_id': regulation_id.strip(),
                            'section_id': section_id.strip(),
                            'subsection_id': subsection_id.strip(),
                            'description': description,
                            'confidence_score': 0.95,  # High confidence for regex matches
                            'context': context
                        }
                        
                        mappings.append(mapping)
            
            # If no explicit references were found, try to infer relationships
            if len(mappings) == 0:
                # This would use more sophisticated NLP in a real implementation
                # For now, we'll add a placeholder for the concept
                for reg_body in regulatory_bodies:
                    if self._text_mentions_regulatory_concepts(text, reg_body):
                        mapping = {
                            'regulatory_body': reg_body,
                            'regulation_id': 'Inferred',
                            'section_id': '',
                            'subsection_id': '',
                            'description': f'Content appears related to {reg_body} regulations, but no specific reference found.',
                            'confidence_score': 0.6,  # Lower confidence for inferred relationships
                            'context': ''
                        }
                        mappings.append(mapping)
            
            return mappings
            
        except Exception as e:
            logger.error(f"Error in regulatory mapping: {str(e)}")
            return []
    
    def _text_mentions_regulatory_concepts(self, text: str, regulatory_body: str) -> bool:
        """Check if text mentions concepts related to a regulatory body"""
        # Simple keyword-based check (would be more sophisticated in real implementation)
        regulatory_keywords = {
            'FAA': ['federal aviation', 'faa', 'airman', 'airworthiness', 'certification'],
            'EASA': ['european aviation', 'easa', 'aircrew', 'air operations'],
            'ICAO': ['international civil aviation', 'icao', 'standards and recommended practices'],
            'TCCA': ['transport canada', 'tcca', 'canadian aviation regulations'],
            'CASA': ['civil aviation safety authority', 'casa', 'australian air regulations']
        }
        
        if regulatory_body in regulatory_keywords:
            text_lower = text.lower()
            return any(keyword in text_lower for keyword in regulatory_keywords[regulatory_body])
        
        return False
    
    def _split_text_into_chunks(self, text: str, chunk_size: int, overlap: int) -> List[str]:
        """Split text into overlapping chunks"""
        if not text:
            return []
            
        chunks = []
        start = 0
        
        while start < len(text):
            # Calculate end position for this chunk
            end = min(start + chunk_size, len(text))
            
            # If we're not at the end of the text, try to find a good break point
            if end < len(text):
                # Look for a period, question mark, or exclamation point followed by space or newline
                for i in range(end - 1, start + chunk_size // 2, -1):
                    if i < len(text) and text[i] in '.!?\n' and (i + 1 == len(text) or text[i + 1].isspace()):
                        end = i + 1
                        break
            
            # Extract the chunk
            chunks.append(text[start:end])
            
            # Move to next chunk with overlap
            start = end - overlap
        
        return chunks
    
    def process_document(self, file_path: str) -> Dict[str, Any]:
        """
        Process a document and extract all relevant information
        
        Args:
            file_path: Path to the document file
            
        Returns:
            Dictionary containing all extracted information
        """
        try:
            # Extract text from document
            logger.info(f"Processing document: {file_path}")
            text = self.extract_text(file_path)
            
            if not text:
                return {"error": "Failed to extract text from document"}
            
            # Process document
            result = {
                "file_path": file_path,
                "text_length": len(text),
                "processing_time": {}
            }
            
            # Document classification
            start_time = time.time()
            result["classification"] = self.classify_document(text)
            result["processing_time"]["classification"] = time.time() - start_time
            
            # Entity extraction
            start_time = time.time()
            result["entities"] = self.extract_entities(text)
            result["processing_time"]["entity_extraction"] = time.time() - start_time
            
            # Relationship extraction
            start_time = time.time()
            result["relationships"] = self.extract_relationships(text, result["entities"])
            result["processing_time"]["relationship_extraction"] = time.time() - start_time
            
            # Document summarization
            start_time = time.time()
            result["summary"] = self.generate_summary(text)
            result["processing_time"]["summarization"] = time.time() - start_time
            
            # Regulatory mapping
            start_time = time.time()
            result["regulatory_mappings"] = self.map_to_regulations(text)
            result["processing_time"]["regulatory_mapping"] = time.time() - start_time
            
            # Calculate total processing time
            result["total_processing_time"] = sum(result["processing_time"].values())
            
            logger.info(f"Document processing completed in {result['total_processing_time']:.2f} seconds")
            return result
            
        except Exception as e:
            logger.error(f"Error processing document: {str(e)}")
            return {"error": str(e)}

# Main function for testing
if __name__ == "__main__":
    import time
    
    # Initialize document analyzer
    analyzer = DocumentAnalyzer()
    
    # Process a sample document
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
        start_time = time.time()
        result = analyzer.process_document(file_path)
        
        # Print results
        print(f"Processing completed in {time.time() - start_time:.2f} seconds")
        print(f"Classification: {result.get('classification', {})}")
        print(f"Entity count: {len(result.get('entities', []))}")
        print(f"Relationship count: {len(result.get('relationships', []))}")
        print(f"Summary: {result.get('summary', '')}")
        print(f"Regulatory mappings: {len(result.get('regulatory_mappings', []))}")
    else:
        print("Please provide a file path")

# backend/ai-modules/performance-prediction/trainee_performance_predictor.py
import os
import sys
import logging
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import pickle
from typing import List, Dict, Any, Optional, Tuple, Union
from datetime import datetime, timedelta
from pathlib import Path
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, TensorDataset
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression
import xgboost as xgb
from prophet import Prophet

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('trainee_performance_predictor.log')
    ]
)
logger = logging.getLogger(__name__)

class TraineePerformancePredictor:
    """
    Predicts trainee performance based on historical assessment data
    and other relevant features. Supports multiple prediction models.
    """
    
    def __init__(self, models_dir: str = 'models'):
        """
        Initialize the performance predictor
        
        Args:
            models_dir: Directory to store trained models
        """
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(exist_ok=True, parents=True)
        
        # Available model types
        self.model_types = {
            'linear': LinearRegression,
            'random_forest': RandomForestRegressor,
            'gradient_boosting': GradientBoostingRegressor,
            'xgboost': xgb.XGBRegressor,
            'neural_network': self._create_neural_network,
            'prophet': Prophet
        }
        
        # Initialize dictionary for trained models
        self.models = {}
        
        # Feature preprocessing
        self.scalers = {}
        self.encoders = {}
        
        # Training history
        self.training_history = {}
        
        # Competency/skill areas
        self.competency_areas = [
            "technical_knowledge",
            "flight_planning",
            "aircraft_handling",
            "navigation",
            "communication",
            "decision_making",
            "situational_awareness",
            "crew_coordination",
            "emergency_procedures",
            "overall_performance"
        ]
    
    def prepare_data(self, data: pd.DataFrame, 
                    target_col: str, 
                    feature_cols: List[str] = None, 
                    categorical_cols: List[str] = None,
                    time_col: str = None,
                    trainee_id_col: str = 'trainee_id') -> Tuple[pd.DataFrame, pd.Series]:
        """
        Prepare data for model training by preprocessing features
        
        Args:
            data: DataFrame containing training data
            target_col: Name of the target column to predict
            feature_cols: List of feature column names (if None, use all except target)
            categorical_cols: List of categorical column names for one-hot encoding
            time_col: Name of timestamp column (for time-based features)
            trainee_id_col: Name of trainee ID column
            
        Returns:
            Tuple of (processed features DataFrame, target values Series)
        """
        # Make a copy to avoid modifying the original dataframe
        df = data.copy()
        
        # Convert target to numeric if needed
        if df[target_col].dtype == 'object':
            try:
                df[target_col] = pd.to_numeric(df[target_col])
            except ValueError:
                # Map string values to numeric (e.g., Unsatisfactory=1, Satisfactory=3)
                value_map = {
                    'unsatisfactory': 1,
                    'needs_improvement': 2,
                    'satisfactory': 3,
                    'exemplary': 4
                }
                df[target_col] = df[target_col].str.lower().map(value_map)
        
        # Set feature columns if not provided
        if feature_cols is None:
            feature_cols = [col for col in df.columns if col not in [target_col, trainee_id_col]]
        
        # Process time column if provided
        if time_col:
            # Ensure datetime format
            if df[time_col].dtype != 'datetime64[ns]':
                df[time_col] = pd.to_datetime(df[time_col])
            
            # Extract time-based features
            df['hour_of_day'] = df[time_col].dt.hour
            df['day_of_week'] = df[time_col].dt.dayofweek
            df['month'] = df[time_col].dt.month
            df['year'] = df[time_col].dt.year
            
            # Add training progression feature (days since first assessment)
            trainee_first_dates = df.groupby(trainee_id_col)[time_col].min()
            df['days_since_first_assessment'] = df.apply(
                lambda row: (row[time_col] - trainee_first_dates[row[trainee_id_col]]).days,
                axis=1
            )
            
            # Add to feature columns
            feature_cols.extend(['hour_of_day', 'day_of_week', 'month', 'year', 'days_since_first_assessment'])
        
        # Scale numeric features
        numeric_cols = [col for col in feature_cols if col not in (categorical_cols or [])]
        if numeric_cols:
            self.scalers['numeric'] = StandardScaler()
            df[numeric_cols] = self.scalers['numeric'].fit_transform(df[numeric_cols])
        
        # One-hot encode categorical features
        if categorical_cols:
            self.encoders['categorical'] = OneHotEncoder(sparse=False, handle_unknown='ignore')
            encoded_cats = self.encoders['categorical'].fit_transform(df[categorical_cols])
            
            # Create DataFrame with encoded categorical features
            cat_feature_names = []
            for i, col in enumerate(categorical_cols):
                cats = self.encoders['categorical'].categories_[i]
                cat_feature_names.extend([f"{col}_{cat}" for cat in cats])
            
            encoded_df = pd.DataFrame(encoded_cats, columns=cat_feature_names, index=df.index)
            
            # Concatenate with numeric features
            X = pd.concat([df[numeric_cols], encoded_df], axis=1)
        else:
            X = df[numeric_cols]
        
        # Return features and target
        y = df[target_col]
        
        return X, y
    
    def train_model(self, data: pd.DataFrame, 
                   target_col: str, 
                   model_type: str = 'gradient_boosting',
                   feature_cols: List[str] = None,
                   categorical_cols: List[str] = None, 
                   time_col: str = None,
                   trainee_id_col: str = 'trainee_id',
                   model_params: Dict[str, Any] = None,
                   test_size: float = 0.2,
                   model_name: str = None) -> Dict[str, Any]:
        """
        Train a model to predict trainee performance
        
        Args:
            data: DataFrame containing training data
            target_col: Name of the target column to predict
            model_type: Type of model to train ('linear', 'random_forest', etc.)
            feature_cols: List of feature column names
            categorical_cols: List of categorical column names
            time_col: Name of timestamp column
            trainee_id_col: Name of trainee ID column
            model_params: Dictionary of model parameters
            test_size: Proportion of data to use for testing
            model_name: Name to identify the model (if None, generate one)
            
        Returns:
            Dictionary with training results and metrics
        """
        try:
            # Generate model name if not provided
            if model_name is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                model_name = f"{model_type}_{target_col}_{timestamp}"
            
            logger.info(f"Training model '{model_name}' of type '{model_type}'")
            
            # Prepare data
            X, y = self.prepare_data(
                data, 
                target_col, 
                feature_cols, 
                categorical_cols, 
                time_col,
                trainee_id_col
            )
            
            # Split data into train and test sets
            # For time series data, a temporal split would be more appropriate
            if time_col:
                # Temporal split (sort by time and split)
                if data[time_col].dtype != 'datetime64[ns]':
                    data[time_col] = pd.to_datetime(data[time_col])
                
                # Sort by time
                sorted_indices = data[time_col].sort_values().index
                train_size = int((1 - test_size) * len(sorted_indices))
                train_indices = sorted_indices[:train_size]
                test_indices = sorted_indices[train_size:]
                
                X_train, X_test = X.loc[train_indices], X.loc[test_indices]
                y_train, y_test = y.loc[train_indices], y.loc[test_indices]
            else:
                # Random split
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=test_size, random_state=42
                )
            
            # Handle special case for Prophet
            if model_type == 'prophet':
                return self._train_prophet_model(
                    data, time_col, target_col, trainee_id_col, model_name, model_params
                )
            
            # Initialize model with parameters
            if model_params is None:
                model_params = {}
            
            if model_type == 'neural_network':
                # Neural network requires special handling
                input_dim = X_train.shape[1]
                model, model_info = self._train_neural_network(
                    X_train, y_train, X_test, y_test, input_dim, model_params, model_name
                )
            else:
                # Initialize and train standard ML model
                model_class = self.model_types.get(model_type)
                if model_class is None:
                    raise ValueError(f"Unknown model type: {model_type}")
                
                model = model_class(**model_params)
                model.fit(X_train, y_train)
                
                # Make predictions and calculate metrics
                y_pred_train = model.predict(X_train)
                y_pred_test = model.predict(X_test)
                
                # Calculate performance metrics
                metrics = {
                    'mse_train': mean_squared_error(y_train, y_pred_train),
                    'mse_test': mean_squared_error(y_test, y_pred_test),
                    'mae_train': mean_absolute_error(y_train, y_pred_train),
                    'mae_test': mean_absolute_error(y_test, y_pred_test),
                    'r2_train': r2_score(y_train, y_pred_train),
                    'r2_test': r2_score(y_test, y_pred_test)
                }
                
                # Feature importance if available
                feature_importance = None
                if hasattr(model, 'feature_importances_'):
                    feature_importance = dict(zip(X.columns, model.feature_importances_))
                
                model_info = {
                    'model_type': model_type,
                    'target_col': target_col,
                    'feature_cols': list(X.columns),
                    'metrics': metrics,
                    'feature_importance': feature_importance,
                    'train_samples': len(X_train),
                    'test_samples': len(X_test)
                }
            
            # Save model
            self.models[model_name] = {
                'model': model,
                'info': model_info,
                'scalers': self.scalers.copy(),
                'encoders': self.encoders.copy()
            }
            
            # Save model to disk
            self._save_model(model_name)
            
            logger.info(f"Model '{model_name}' trained successfully. "
                       f"Test MSE: {model_info['metrics']['mse_test']:.4f}, "
                       f"Test R²: {model_info['metrics']['r2_test']:.4f}")
            
            return model_info
            
        except Exception as e:
            logger.error(f"Error training model: {str(e)}")
            raise
    
    def _train_neural_network(self, X_train, y_train, X_test, y_test, 
                             input_dim, model_params, model_name):
        """Train a PyTorch neural network model"""
        # Default parameters
        default_params = {
            'hidden_layers': [64, 32],
            'dropout_rate': 0.2,
            'learning_rate': 0.001,
            'batch_size': 64,
            'epochs': 100,
            'patience': 10  # For early stopping
        }
        
        # Update with user-provided parameters
        params = {**default_params, **(model_params or {})}
        
        # Create model architecture
        model = self._create_neural_network(
            input_dim=input_dim,
            hidden_layers=params['hidden_layers'],
            dropout_rate=params['dropout_rate']
        )
        
        # Convert data to PyTorch tensors
        X_train_tensor = torch.FloatTensor(X_train.values)
        y_train_tensor = torch.FloatTensor(y_train.values).view(-1, 1)
        X_test_tensor = torch.FloatTensor(X_test.values)
        y_test_tensor = torch.FloatTensor(y_test.values).view(-1, 1)
        
        # Create data loaders
        train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
        train_loader = DataLoader(
            train_dataset,
            batch_size=params['batch_size'],
            shuffle=True
        )
        
        # Define loss function and optimizer
        criterion = nn.MSELoss()
        optimizer = optim.Adam(model.parameters(), lr=params['learning_rate'])
        
        # Training loop
        epochs = params['epochs']
        patience = params['patience']
        best_val_loss = float('inf')
        no_improve_count = 0
        training_losses = []
        validation_losses = []
        
        for epoch in range(epochs):
            # Training phase
            model.train()
            train_loss = 0.0
            
            for inputs, targets in train_loader:
                optimizer.zero_grad()
                outputs = model(inputs)
                loss = criterion(outputs, targets)
                loss.backward()
                optimizer.step()
                train_loss += loss.item()
            
            avg_train_loss = train_loss / len(train_loader)
            training_losses.append(avg_train_loss)
            
            # Validation phase
            model.eval()
            with torch.no_grad():
                val_outputs = model(X_test_tensor)
                val_loss = criterion(val_outputs, y_test_tensor).item()
                validation_losses.append(val_loss)
            
            # Early stopping
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                no_improve_count = 0
                # Save best model
                torch.save(model.state_dict(), 
                          self.models_dir / f"{model_name}_best.pt")
            else:
                no_improve_count += 1
                if no_improve_count >= patience:
                    logger.info(f"Early stopping at epoch {epoch+1}")
                    break
            
            if (epoch + 1) % 10 == 0:
                logger.info(f"Epoch {epoch+1}/{epochs} - "
                           f"Train Loss: {avg_train_loss:.4f}, "
                           f"Val Loss: {val_loss:.4f}")
        
        # Load best model
        model.load_state_dict(torch.load(self.models_dir / f"{model_name}_best.pt"))
        
        # Final evaluation
        model.eval()
        with torch.no_grad():
            y_pred_train = model(X_train_tensor).numpy().flatten()
            y_pred_test = model(X_test_tensor).numpy().flatten()
        
        # Calculate metrics
        metrics = {
            'mse_train': mean_squared_error(y_train, y_pred_train),
            'mse_test': mean_squared_error(y_test, y_pred_test),
            'mae_train': mean_absolute_error(y_train, y_pred_train),
            'mae_test': mean_absolute_error(y_test, y_pred_test),
            'r2_train': r2_score(y_train, y_pred_train),
            'r2_test': r2_score(y_test, y_pred_test)
        }
        
        model_info = {
            'model_type': 'neural_network',
            'target_col': y_train.name,
            'feature_cols': list(X_train.columns),
            'metrics': metrics,
            'feature_importance': None,  # Neural networks don't have direct feature importance
            'train_samples': len(X_train),
            'test_samples': len(X_test),
            'architecture': {
                'input_dim': input_dim,
                'hidden_layers': params['hidden_layers'],
                'dropout_rate': params['dropout_rate']
            },
            'training_history': {
                'training_losses': training_losses,
                'validation_losses': validation_losses,
                'epochs': epoch + 1  # Actual number of epochs trained
            }
        }
        
        return model, model_info
    
    def _create_neural_network(self, input_dim, hidden_layers=[64, 32], dropout_rate=0.2):
        """Create a PyTorch neural network model"""
        layers = []
        
        # Input layer
        layers.append(nn.Linear(input_dim, hidden_layers[0]))
        layers.append(nn.ReLU())
        layers.append(nn.Dropout(dropout_rate))
        
        # Hidden layers
        for i in range(len(hidden_layers) - 1):
            layers.append(nn.Linear(hidden_layers[i], hidden_layers[i+1]))
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(dropout_rate))
        
        # Output layer
        layers.append(nn.Linear(hidden_layers[-1], 1))
        
        return nn.Sequential(*layers)
    
    def _train_prophet_model(self, data, time_col, target_col, 
                            trainee_id_col, model_name, model_params):
        """Train a Prophet time series model for each trainee"""
        # Prophet requires specific column names
        if time_col is None:
            raise ValueError("Prophet models require a time column")
        
        # Default parameters
        default_params = {
            'changepoint_prior_scale': 0.05,
            'seasonality_prior_scale': 10.0,
            'holidays_prior_scale': 10.0,
            'seasonality_mode': 'additive',
            'yearly_seasonality': True,
            'weekly_seasonality': True,
            'daily_seasonality': False,
            'forecast_periods': 30  # Number of periods to forecast
        }
        
        # Update with user-provided parameters
        params = {**default_params, **(model_params or {})}
        
        # Prepare data for Prophet
        prophet_data = data.copy()
        
        # Convert time column
        if prophet_data[time_col].dtype != 'datetime64[ns]':
            prophet_data[time_col] = pd.to_datetime(prophet_data[time_col])
        
        # Train model for each trainee
        trainee_models = {}
        metrics = {}
        all_forecasts = []
        
        unique_trainees = prophet_data[trainee_id_col].unique()
        
        for trainee_id in unique_trainees:
            # Filter data for this trainee
            trainee_data = prophet_data[prophet_data[trainee_id_col] == trainee_id].copy()
            
            # Skip if not enough data
            if len(trainee_data) < 5:  # Need at least 5 data points
                logger.warning(f"Skipping trainee {trainee_id}: Not enough data points")
                continue
            
            # Prepare dataframe with Prophet's required columns
            prophet_df = pd.DataFrame({
                'ds': trainee_data[time_col],
                'y': trainee_data[target_col]
            })
            
            # Sort by date
            prophet_df = prophet_df.sort_values('ds')
            
            # Train-test split
            train_size = int(0.8 * len(prophet_df))
            train_df = prophet_df.iloc[:train_size]
            test_df = prophet_df.iloc[train_size:]
            
            # Initialize and train model
            model = Prophet(
                changepoint_prior_scale=params['changepoint_prior_scale'],
                seasonality_prior_scale=params['seasonality_prior_scale'],
                holidays_prior_scale=params['holidays_prior_scale'],
                seasonality_mode=params['seasonality_mode'],
                yearly_seasonality=params['yearly_seasonality'],
                weekly_seasonality=params['weekly_seasonality'],
                daily_seasonality=params['daily_seasonality']
            )
            
            # Add regressors if needed
            # (In a real implementation, you would add relevant features as regressors)
            
            # Fit model
            model.fit(train_df)
            
            # Make predictions for test set
            future = test_df[['ds']].copy()
            forecast = model.predict(future)
            
            # Calculate metrics
            y_true = test_df['y'].values
            y_pred = forecast['yhat'].values
            
            trainee_metrics = {
                'mse': mean_squared_error(y_true, y_pred),
                'mae': mean_absolute_error(y_true, y_pred),
                'r2': r2_score(y_true, y_pred) if len(y_true) > 1 else float('nan')
            }
            
            # Store model and metrics
            trainee_models[trainee_id] = model
            metrics[trainee_id] = trainee_metrics
            
            # Generate forecast for future periods
            future_periods = params['forecast_periods']
            last_date = prophet_df['ds'].max()
            future_dates = pd.date_range(
                start=last_date + timedelta(days=1),
                periods=future_periods,
                freq='D'
            )
            
            future_df = pd.DataFrame({'ds': future_dates})
            future_forecast = model.predict(future_df)
            
            # Add to combined forecasts
            forecast_data = {
                'trainee_id': trainee_id,
                'dates': future_forecast['ds'].values,
                'forecast': future_forecast['yhat'].values,
                'forecast_lower': future_forecast['yhat_lower'].values,
                'forecast_upper': future_forecast['yhat_upper'].values
            }
            all_forecasts.append(forecast_data)
        
        # Calculate overall metrics
        overall_metrics = {
            'mse_avg': np.mean([m['mse'] for m in metrics.values()]),
            'mae_avg': np.mean([m['mae'] for m in metrics.values()]),
            'r2_avg': np.mean([m['r2'] for m in metrics.values() if not np.isnan(m['r2'])])
        }
        
        model_info = {
            'model_type': 'prophet',
            'target_col': target_col,
            'time_col': time_col,
            'metrics': {
                'overall': overall_metrics,
                'per_trainee': metrics
            },
            'trainee_count': len(trainee_models),
            'parameters': params,
            'forecasts': all_forecasts
        }
        
        # Save models
        self.models[model_name] = {
            'model': trainee_models,
            'info': model_info
        }
        
        self._save_model(model_name)
        
        logger.info(f"Prophet model '{model_name}' trained for {len(trainee_models)} trainees. "
                   f"Average MSE: {overall_metrics['mse_avg']:.4f}")
        
        return model_info
    
    def predict(self, model_name: str, data: pd.DataFrame, 
               trainee_id_col: str = 'trainee_id',
               include_confidence_intervals: bool = False) -> pd.DataFrame:
        """
        Make predictions using a trained model
        
        Args:
            model_name: Name of the trained model to use
            data: DataFrame with features for prediction
            trainee_id_col: Name of trainee ID column
            include_confidence_intervals: Whether to include confidence intervals
            
        Returns:
            DataFrame with predictions
        """
        try:
            # Check if model exists
            if model_name not in self.models:
                # Try to load from disk
                if not self._load_model(model_name):
                    raise ValueError(f"Model '{model_name}' not found")
            
            model_info = self.models[model_name]['info']
            model = self.models[model_name]['model']
            
            # Special handling for Prophet models
            if model_info['model_type'] == 'prophet':
                return self._predict_with_prophet(
                    model, data, model_info, trainee_id_col, include_confidence_intervals
                )
            
            # For other models, prepare features
            scalers = self.models[model_name]['scalers']
            encoders = self.models[model_name]['encoders']
            
            # Get feature columns from model info
            feature_cols = model_info['feature_cols']
            
            # Prepare input features
            X = data.copy()
            
            # Apply transformations using saved scalers and encoders
            if 'numeric' in scalers:
                numeric_cols = [col for col in feature_cols if col in X.columns]
                X[numeric_cols] = scalers['numeric'].transform(X[numeric_cols])
            
            if 'categorical' in encoders:
                # Get categorical columns
                categorical_cols = []
                for col in X.columns:
                    if any(f.startswith(f"{col}_") for f in feature_cols):
                        categorical_cols.append(col)
                
                if categorical_cols:
                    encoded_cats = encoders['categorical'].transform(X[categorical_cols])
                    
                    # Create DataFrame with encoded categorical features
                    cat_feature_names = []
                    for i, col in enumerate(categorical_cols):
                        cats = encoders['categorical'].categories_[i]
                        cat_feature_names.extend([f"{col}_{cat}" for cat in cats])
                    
                    encoded_df = pd.DataFrame(encoded_cats, columns=cat_feature_names, index=X.index)
                    
                    # Select only columns that were in the training data
                    valid_cat_cols = [col for col in cat_feature_names if col in feature_cols]
                    
                    # Concatenate with numeric features
                    numeric_cols = [col for col in feature_cols if col in X.columns]
                    X = pd.concat([X[numeric_cols], encoded_df[valid_cat_cols]], axis=1)
            
            # Ensure all required features are present
            missing_features = [col for col in feature_cols if col not in X.columns]
            if missing_features:
                logger.warning(f"Missing features: {missing_features}")
                # Add missing features with zeros
                for col in missing_features:
                    X[col] = 0
            
            # Select only features used in training
            X = X[feature_cols]
            
            # Make predictions
            if model_info['model_type'] == 'neural_network':
                # Neural network needs tensor conversion
                X_tensor = torch.FloatTensor(X.values)
                model.eval()
                with torch.no_grad():
                    predictions = model(X_tensor).numpy().flatten()
            else:
                predictions = model.predict(X)
            
            # Create results dataframe
            results = pd.DataFrame(index=data.index)
            results['prediction'] = predictions
            
            # Add confidence intervals if requested and available
            if include_confidence_intervals:
                # Add placeholder intervals (real implementation would calculate these)
                # Different models would have different ways to calculate confidence intervals
                results['lower_bound'] = predictions - 0.5
                results['upper_bound'] = predictions + 0.5
            
            return results
            
        except Exception as e:
            logger.error(f"Error making predictions: {str(e)}")
            raise
    
    def _predict_with_prophet(self, model, data, model_info, trainee_id_col, include_confidence_intervals):
        """Make predictions using Prophet models"""
        # Check required columns
        time_col = model_info['time_col']
        if time_col not in data.columns:
            raise ValueError(f"Time column '{time_col}' not found in data")
        
        if trainee_id_col not in data.columns:
            raise ValueError(f"Trainee ID column '{trainee_id_col}' not found in data")
        
        # Convert time column
        if data[time_col].dtype != 'datetime64[ns]':
            data[time_col] = pd.to_datetime(data[time_col])
        
        # Make predictions for each trainee
        results = []
        
        for trainee_id, trainee_data in data.groupby(trainee_id_col):
            # Skip if model not available for this trainee
            if trainee_id not in model:
                logger.warning(f"No model available for trainee {trainee_id}")
                continue
            
            # Prepare dataframe with Prophet's required columns
            prophet_df = pd.DataFrame({
                'ds': trainee_data[time_col]
            })
            
            # Make predictions
            trainee_model = model[trainee_id]
            forecast = trainee_model.predict(prophet_df)
            
            # Create results dataframe
            trainee_results = trainee_data.copy()
            trainee_results['prediction'] = forecast['yhat'].values
            
            if include_confidence_intervals:
                trainee_results['lower_bound'] = forecast['yhat_lower'].values
                trainee_results['upper_bound'] = forecast['yhat_upper'].values
            
            results.append(trainee_results)
        
        # Combine results
        if results:
            return pd.concat(results)
        else:
            # Return empty dataframe with correct columns
            columns = list(data.columns) + ['