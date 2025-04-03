'avg_sentence_length': avg_sentence_length,
                'top_words': dict(top_words),
                'summary': summary,
                'key_sentences': key_sentences
            }
            
            return result
            
        except Exception as e:
            logger.warning(f"Error analyzing text: {str(e)}")
            return {
                'error': str(e),
                'word_count': 0,
                'sentence_count': 0,
                'summary': ''
            }
    
    def _extract_key_sentences(self, sentences: List[str], tokens: List[str], 
                              top_words: List[Tuple[str, int]], count: int) -> List[str]:
        """Extract key sentences from text based on important words"""
        # Calculate sentence scores based on word importance
        sentence_scores = []
        
        for sentence in sentences:
            score = 0
            # Tokenize sentence
            sentence_tokens = [word.lower() for word in word_tokenize(sentence) 
                               if word.isalpha() and word.lower() not in self.stop_words]
            
            # Score based on top words
            for word in sentence_tokens:
                word = self.lemmatizer.lemmatize(word)
                for top_word, freq in top_words:
                    if word == top_word:
                        score += freq
            
            # Normalize by sentence length (avoid bias towards longer sentences)
            if len(sentence_tokens) > 0:
                score /= len(sentence_tokens)
            
            sentence_scores.append((sentence, score))
        
        # Sort by score and select top sentences
        sentence_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Get top sentences but maintain original order
        top_sentences = [s[0] for s in sentence_scores[:count]]
        ordered_top_sentences = [s for s in sentences if s in top_sentences]
        
        return ordered_top_sentences
    
    def extract_citations(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract citations from text
        
        Args:
            text: Text to analyze
            
        Returns:
            List of extracted citations
        """
        citations = []
        
        try:
            # Common citation patterns (simplified)
            patterns = [
                # APA style
                r'\(([A-Za-z-]+(?:\s+et\s+al\.)?),\s+(\d{4}[a-z]?)\)',
                # IEEE style
                r'\[(\d+)\]',
                # Chicago style
                r'(?<!\w)(\d+)\.',
                # Author-year in text
                r'([A-Za-z-]+(?:\s+et\s+al\.)?)(?:\s+\((\d{4}[a-z]?)\))',
                # FAA/EASA document references
                r'(?:AC|AMC|GM)\s+(\d+(?:-\d+)*)'
            ]
            
            # Extract citations using patterns
            for pattern in patterns:
                matches = re.finditer(pattern, text)
                for match in matches:
                    citation = {
                        'text': match.group(0),
                        'position': match.span(),
                        'type': self._determine_citation_type(match.group(0))
                    }
                    
                    # Add author and year if available
                    if len(match.groups()) >= 2:
                        citation['author'] = match.group(1)
                        if match.group(2):
                            citation['year'] = match.group(2)
                    
                    citations.append(citation)
            
            # Extract reference list items (simplified)
            reference_section = self._extract_reference_section(text)
            if reference_section:
                reference_items = re.split(r'\n+', reference_section)
                for i, ref in enumerate(reference_items):
                    if len(ref.strip()) > 10:  # Avoid short lines
                        citations.append({
                            'text': ref.strip(),
                            'position': (text.find(ref), text.find(ref) + len(ref)),
                            'type': 'reference_list_item',
                            'reference_index': i + 1
                        })
            
            return citations
            
        except Exception as e:
            logger.warning(f"Error extracting citations: {str(e)}")
            return []
    
    def _determine_citation_type(self, citation_text: str) -> str:
        """Determine the type of citation"""
        if re.match(r'\([A-Za-z-]+(?:\s+et\s+al\.)?),\s+\d{4}[a-z]?\)', citation_text):
            return 'apa_parenthetical'
        elif re.match(r'\[\d+\]', citation_text):
            return 'ieee_numeric'
        elif re.match(r'(?<!\w)\d+\.', citation_text):
            return 'chicago_numeric'
        elif re.match(r'[A-Za-z-]+(?:\s+et\s+al\.)?(?:\s+\(\d{4}[a-z]?\))', citation_text):
            return 'author_year_inline'
        elif re.match(r'(?:AC|AMC|GM)\s+\d+(?:-\d+)*', citation_text):
            return 'regulatory_reference'
        else:
            return 'unknown'
    
    def _extract_reference_section(self, text: str) -> str:
        """Extract reference section from text"""
        # Look for common reference section headers
        section_patterns = [
            r'(?:\n|\r\n)References(?:\n|\r\n)',
            r'(?:\n|\r\n)Bibliography(?:\n|\r\n)',
            r'(?:\n|\r\n)Works Cited(?:\n|\r\n)',
            r'(?:\n|\r\n)Sources(?:\n|\r\n)'
        ]
        
        for pattern in section_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                section_start = match.end()
                
                # Find end of section (next section heading or end of text)
                next_section = re.search(r'(?:\n|\r\n)[A-Z][A-Za-z\s]+(?:\n|\r\n)', text[section_start:])
                if next_section:
                    section_end = section_start + next_section.start()
                else:
                    section_end = len(text)
                
                return text[section_start:section_end].strip()
        
        return ""
    
    def check_plagiarism(self, text: str, reference_texts: List[str], 
                        threshold: float = 0.8) -> Dict[str, Any]:
        """
        Check for potential plagiarism by comparing text against reference texts
        
        Args:
            text: Text to check
            reference_texts: List of reference texts to compare against
            threshold: Similarity threshold for flagging potential plagiarism
            
        Returns:
            Dictionary with plagiarism check results
        """
        try:
            # Preprocess text
            text_sentences = sent_tokenize(text)
            
            # Preprocess reference texts
            all_reference_sentences = []
            reference_sentence_sources = []
            
            for i, ref_text in enumerate(reference_texts):
                ref_sentences = sent_tokenize(ref_text)
                all_reference_sentences.extend(ref_sentences)
                reference_sentence_sources.extend([i] * len(ref_sentences))
            
            # If no reference sentences, return early
            if not all_reference_sentences:
                return {
                    'plagiarism_detected': False,
                    'similarity_score': 0.0,
                    'matched_segments': []
                }
            
            # Create TF-IDF vectorizer
            vectorizer = TfidfVectorizer(stop_words='english')
            
            # Create document matrix
            try:
                all_sentences = text_sentences + all_reference_sentences
                tfidf_matrix = vectorizer.fit_transform(all_sentences)
                
                # Calculate similarity between each text sentence and reference sentences
                matches = []
                
                for i, text_sentence in enumerate(text_sentences):
                    text_vector = tfidf_matrix[i]
                    
                    # Calculate similarity with each reference sentence
                    for j, ref_sentence in enumerate(all_reference_sentences):
                        ref_vector = tfidf_matrix[len(text_sentences) + j]
                        
                        # Calculate cosine similarity
                        similarity = cosine_similarity(text_vector, ref_vector)[0][0]
                        
                        # Check if above threshold
                        if similarity > threshold:
                            matches.append({
                                'text_sentence': text_sentence,
                                'reference_sentence': ref_sentence,
                                'similarity': similarity,
                                'reference_index': reference_sentence_sources[j]
                            })
                
                # Calculate overall similarity score
                if matches:
                    overall_similarity = sum(m['similarity'] for m in matches) / len(matches)
                else:
                    overall_similarity = 0.0
                
                # Create result
                result = {
                    'plagiarism_detected': len(matches) > 0,
                    'similarity_score': overall_similarity,
                    'matched_segments': matches,
                    'match_count': len(matches)
                }
                
                return result
                
            except ValueError as e:
                # Handle case where vectorizer fails (e.g., empty documents)
                logger.warning(f"Vectorizer error in plagiarism check: {str(e)}")
                return {
                    'plagiarism_detected': False,
                    'similarity_score': 0.0,
                    'matched_segments': [],
                    'error': str(e)
                }
            
        except Exception as e:
            logger.warning(f"Error checking plagiarism: {str(e)}")
            return {
                'plagiarism_detected': False,
                'similarity_score': 0.0,
                'matched_segments': [],
                'error': str(e)
            }
    
    def generate_summary(self, text: str, max_length: int = 500, 
                        format_type: str = 'text') -> str:
        """
        Generate a summary of the given text
        
        Args:
            text: Text to summarize
            max_length: Maximum length of summary in characters
            format_type: Output format ('text' or 'html')
            
        Returns:
            Summary text in the specified format
        """
        try:
            # Analyze text to get key sentences
            analysis = self.analyze_text(text)
            
            if 'error' in analysis:
                return f"Error generating summary: {analysis['error']}"
            
            # Get key sentences
            key_sentences = analysis.get('key_sentences', [])
            
            # Create summary from key sentences
            if key_sentences:
                summary = " ".join(key_sentences)
            else:
                # Fallback to simple truncation
                sentences = sent_tokenize(text)
                summary = " ".join(sentences[:3])
            
            # Truncate if needed
            if len(summary) > max_length:
                # Truncate to the last complete sentence within max_length
                sentences = sent_tokenize(summary[:max_length])
                summary = " ".join(sentences[:-1]) if len(sentences) > 1 else sentences[0]
                summary += "..."
            
            # Format output
            if format_type == 'html':
                # Create HTML summary
                html_summary = f"<h3>Summary</h3><p>{summary}</p>"
                
                # Add key words
                if 'top_words' in analysis:
                    top_words = list(analysis['top_words'].items())[:10]
                    words_html = ", ".join([f"{word} ({count})" for word, count in top_words])
                    html_summary += f"<h4>Key Terms</h4><p>{words_html}</p>"
                
                # Add statistics
                html_summary += f"<h4>Statistics</h4><ul>"
                html_summary += f"<li>Word count: {analysis['word_count']}</li>"
                html_summary += f"<li>Sentence count: {analysis['sentence_count']}</li>"
                html_summary += f"<li>Average sentence length: {analysis['avg_sentence_length']:.1f} words</li>"
                html_summary += f"</ul>"
                
                return html_summary
            else:
                # Plain text summary
                text_summary = f"SUMMARY:\n{summary}\n\n"
                
                # Add key words
                if 'top_words' in analysis:
                    top_words = list(analysis['top_words'].items())[:10]
                    words_text = ", ".join([f"{word} ({count})" for word, count in top_words])
                    text_summary += f"KEY TERMS: {words_text}\n\n"
                
                # Add statistics
                text_summary += f"STATISTICS:\n"
                text_summary += f"- Word count: {analysis['word_count']}\n"
                text_summary += f"- Sentence count: {analysis['sentence_count']}\n"
                text_summary += f"- Average sentence length: {analysis['avg_sentence_length']:.1f} words\n"
                
                return text_summary
                
        except Exception as e:
            logger.warning(f"Error generating summary: {str(e)}")
            return f"Error generating summary: {str(e)}"
    
    def export_research_findings(self, research_data: Dict[str, Any], 
                                format_type: str = 'markdown',
                                output_file: Optional[str] = None) -> str:
        """
        Export research findings in specified format
        
        Args:
            research_data: Research data dictionary
            format_type: Output format ('markdown', 'html', 'json')
            output_file: Optional file path to save the output
            
        Returns:
            Formatted research findings
        """
        try:
            if format_type == 'json':
                # Export as JSON
                output = json.dumps(research_data, indent=2)
                
            elif format_type == 'html':
                # Export as HTML
                html_output = []
                html_output.append("<!DOCTYPE html><html><head>")
                html_output.append("<meta charset='utf-8'>")
                html_output.append(f"<title>{research_data.get('title', 'Research Findings')}</title>")
                html_output.append("<style>")
                html_output.append("body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }")
                html_output.append("h1 { color: #2c3e50; }")
                html_output.append("h2 { color: #3498db; margin-top: 30px; }")
                html_output.append("h3 { color: #2980b9; }")
                html_output.append(".source { color: #7f8c8d; font-size: 0.9em; }")
                html_output.append(".summary { background-color: #f8f9fa; padding: 15px; border-left: 4px solid #3498db; }")
                html_output.append(".citation { background-color: #f8f9fa; padding: 10px; margin: 10px 0; }")
                html_output.append("</style>")
                html_output.append("</head><body>")
                
                # Title and overview
                html_output.append(f"<h1>{research_data.get('title', 'Research Findings')}</h1>")
                
                if 'date' in research_data:
                    html_output.append(f"<p>Date: {research_data['date']}</p>")
                
                if 'overview' in research_data:
                    html_output.append(f"<div class='summary'><p>{research_data['overview']}</p></div>")
                
                # Key findings
                if 'key_findings' in research_data:
                    html_output.append("<h2>Key Findings</h2>")
                    html_output.append("<ul>")
                    for finding in research_data['key_findings']:
                        html_output.append(f"<li>{finding}</li>")
                    html_output.append("</ul>")
                
                # Sources
                if 'sources' in research_data:
                    html_output.append("<h2>Sources</h2>")
                    for i, source in enumerate(research_data['sources']):
                        html_output.append(f"<h3>{i+1}. {source.get('title', 'Untitled Source')}</h3>")
                        if 'url' in source:
                            html_output.append(f"<p><a href='{source['url']}'>{source['url']}</a></p>")
                        if 'summary' in source:
                            html_output.append(f"<div class='summary'><p>{source['summary']}</p></div>")
                        if 'key_points' in source:
                            html_output.append("<ul>")
                            for point in source['key_points']:
                                html_output.append(f"<li>{point}</li>")
                            html_output.append("</ul>")
                
                # Citations
                if 'citations' in research_data:
                    html_output.append("<h2>Citations</h2>")
                    for citation in research_data['citations']:
                        html_output.append(f"<div class='citation'>{citation}</div>")
                
                html_output.append("</body></html>")
                output = "\n".join(html_output)
                
            else:  # Default to markdown
                # Export as Markdown
                md_output = []
                md_output.append(f"# {research_data.get('title', 'Research Findings')}")
                md_output.append("")
                
                if 'date' in research_data:
                    md_output.append(f"Date: {research_data['date']}")
                    md_output.append("")
                
                if 'overview' in research_data:
                    md_output.append("## Overview")
                    md_output.append("")
                    md_output.append(research_data['overview'])
                    md_output.append("")
                
                # Key findings
                if 'key_findings' in research_data:
                    md_output.append("## Key Findings")
                    md_output.append("")
                    for finding in research_data['key_findings']:
                        md_output.append(f"- {finding}")
                    md_output.append("")
                
                # Sources
                if 'sources' in research_data:
                    md_output.append("## Sources")
                    md_output.append("")
                    for i, source in enumerate(research_data['sources']):
                        md_output.append(f"### {i+1}. {source.get('title', 'Untitled Source')}")
                        md_output.append("")
                        if 'url' in source:
                            md_output.append(f"[{source['url']}]({source['url']})")
                            md_output.append("")
                        if 'summary' in source:
                            md_output.append(f"**Summary**: {source['summary']}")
                            md_output.append("")
                        if 'key_points' in source:
                            for point in source['key_points']:
                                md_output.append(f"- {point}")
                            md_output.append("")
                
                # Citations
                if 'citations' in research_data:
                    md_output.append("## Citations")
                    md_output.append("")
                    for citation in research_data['citations']:
                        md_output.append(f"- {citation}")
                    md_output.append("")
                
                output = "\n".join(md_output)
            
            # Save to file if output_file is specified
            if output_file:
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(output)
                logger.info(f"Research findings saved to: {output_file}")
            
            return output
            
        except Exception as e:
            logger.warning(f"Error exporting research findings: {str(e)}")
            return f"Error exporting research findings: {str(e)}"
    
    def create_research_project(self, topic: str, sources: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Create a new research project on the given topic
        
        Args:
            topic: Research topic
            sources: Optional list of initial sources
            
        Returns:
            Research project dictionary
        """
        # Generate a project ID
        project_id = f"research_{int(time.time())}_{hashlib.md5(topic.encode()).hexdigest()[:8]}"
        
        # Create project structure
        project = {
            'id': project_id,
            'topic': topic,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'sources': sources or [],
            'notes': [],
            'key_findings': [],
            'outline': {
                'title': f"Research on {topic}",
                'sections': [
                    {'title': 'Introduction', 'content': ''},
                    {'title': 'Background', 'content': ''},
                    {'title': 'Key Findings', 'content': ''},
                    {'title': 'Analysis', 'content': ''},
                    {'title': 'Conclusions', 'content': ''},
                    {'title': 'References', 'content': ''}
                ]
            }
        }
        
        # Save project to cache
        self.document_cache[project_id] = project
        self._save_cache(self.document_cache, 'document_cache.pkl')
        
        return project
    
    def add_source_to_project(self, project_id: str, source: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add a source to a research project
        
        Args:
            project_id: Project ID
            source: Source information dictionary
            
        Returns:
            Updated project dictionary
        """
        # Check if project exists
        if project_id not in self.document_cache:
            raise ValueError(f"Project not found: {project_id}")
        
        # Get project
        project = self.document_cache[project_id]
        
        # Add source if not already present
        source_exists = any(s.get('url') == source.get('url') for s in project['sources'])
        if not source_exists:
            # Add timestamp
            source['added_at'] = datetime.now().isoformat()
            
            # Add to sources
            project['sources'].append(source)
            
            # Update project
            project['updated_at'] = datetime.now().isoformat()
            self.document_cache[project_id] = project
            self._save_cache(self.document_cache, 'document_cache.pkl')
        
        return project
    
    def add_note_to_project(self, project_id: str, note: str, source_id: str = None) -> Dict[str, Any]:
        """
        Add a note to a research project
        
        Args:
            project_id: Project ID
            note: Note text
            source_id: Optional source ID the note is related to
            
        Returns:
            Updated project dictionary
        """
        # Check if project exists
        if project_id not in self.document_cache:
            raise ValueError(f"Project not found: {project_id}")
        
        # Get project
        project = self.document_cache[project_id]
        
        # Create note object
        note_obj = {
            'id': f"note_{int(time.time())}_{len(project['notes'])}",
            'text': note,
            'created_at': datetime.now().isoformat(),
            'source_id': source_id
        }
        
        # Add to notes
        project['notes'].append(note_obj)
        
        # Update project
        project['updated_at'] = datetime.now().isoformat()
        self.document_cache[project_id] = project
        self._save_cache(self.document_cache, 'document_cache.pkl')
        
        return project
    
    def generate_citations(self, sources: List[Dict[str, Any]], 
                          style: str = 'apa') -> List[str]:
        """
        Generate citations for sources in specified style
        
        Args:
            sources: List of source dictionaries
            style: Citation style ('apa', 'mla', 'chicago', 'ieee')
            
        Returns:
            List of formatted citations
        """
        citations = []
        
        for source in sources:
            try:
                # Extract source information
                title = source.get('title', 'Untitled')
                authors = source.get('authors', [])
                year = source.get('year', '')
                url = source.get('url', '')
                publisher = source.get('publisher', '')
                journal = source.get('journal', '')
                volume = source.get('volume', '')
                issue = source.get('issue', '')
                pages = source.get('pages', '')
                
                # If no year but has date, extract year
                if not year and 'date' in source:
                    date_match = re.search(r'\b(19|20)\d{2}\b', source['date'])
                    if date_match:
                        year = date_match.group(0)
                
                # Format author string
                if isinstance(authors, list):
                    author_str = ', '.join(authors)
                else:
                    author_str = str(authors)
                
                # Generate citation based on style
                if style == 'apa':
                    if journal:  # Journal article
                        citation = f"{author_str}. ({year}). {title}. "
                        if journal:
                            citation += f"{journal}"
                            if volume:
                                citation += f", {volume}"
                                if issue:
                                    citation += f"({issue})"
                            if pages:
                                citation += f", {pages}"
                        citation += "."
                    else:  # Web page or other
                        citation = f"{author_str}. ({year}). {title}. "
                        if publisher:
                            citation += f"{publisher}. "
                        if url:
                            citation += f"Retrieved from {url}"
                
                elif style == 'mla':
                    citation = f"{author_str}. \"{title}\"."
                    if journal:
                        citation += f" {journal}"
                        if volume:
                            citation += f", vol. {volume}"
                            if issue:
                                citation += f", no. {issue}"
                        if year:
                            citation += f", {year}"
                        if pages:
                            citation += f", pp. {pages}"
                    else:
                        if publisher:
                            citation += f" {publisher}"
                        if year:
                            citation += f", {year}"
                    citation += "."
                
                elif style == 'chicago':
                    citation = f"{author_str}. \"{title}\"."
                    if journal:
                        citation += f" {journal}"
                        if volume:
                            citation += f" {volume}"
                            if issue:
                                citation += f", no. {issue}"
                        if year:
                            citation += f" ({year})"
                        if pages:
                            citation += f": {pages}"
                    else:
                        if publisher:
                            citation += f" {publisher}"
                        if year:
                            citation += f", {year}"
                    citation += "."
                
                elif style == 'ieee':
                    citation = f"[{len(citations) + 1}] {author_str}, \"{title}\"."
                    if journal:
                        citation += f" {journal}"
                        if volume:
                            citation += f", vol. {volume}"
                            if issue:
                                citation += f", no. {issue}"
                        if pages:
                            citation += f", pp. {pages}"
                    if year:
                        citation += f", {year}."
                
                else:
                    # Generic citation
                    citation = f"{author_str}. {title}. {year}."
                    if url:
                        citation += f" URL: {url}"
                
                citations.append(citation)
                
            except Exception as e:
                logger.warning(f"Error generating citation: {str(e)}")
                # Add basic citation as fallback
                citations.append(f"{source.get('title', 'Unknown Source')}. {source.get('url', '')}")
        
        return citations

# Example usage
if __name__ == "__main__":
    # Create research assistant
    assistant = ResearchAssistant()
    
    # Perform a search
    search_query = "pilot training simulation effectiveness"
    print(f"Searching for: {search_query}")
    
    # Set to False to avoid actual web requests during testing
    use_real_search = False
    
    if use_real_search:
        results = assistant.search(search_query, max_results=5)
        print(f"Found {len(results)} results")
        
        # Print top results
        for i, result in enumerate(results[:3]):
            print(f"\n{i+1}. {result['title']}")
            print(f"   Source: {result['source']}")
            print(f"   URL: {result['url']}")
            print(f"   Relevance: {result['relevance_score']:.2f}")
            print(f"   Snippet: {result['snippet'][:100]}...")
        
        # Fetch page content for first result
        if results:
            page_content = assistant.fetch_page_content(results[0]['url'])
            
            if page_content['status'] == 'success':
                # Analyze text
                print("\nAnalyzing page content...")
                analysis = assistant.analyze_text(page_content['content_text'])
                
                # Print summary
                print("\nSummary:")
                print(assistant.generate_summary(page_content['content_text'], max_length=300))
                
                # Extract citations
                citations = assistant.extract_citations(page_content['content_text'])
                print(f"\nFound {len(citations)} citations")
                for i, citation in enumerate(citations[:3]):
                    print(f"  - {citation['text']}")
    else:
        # Use dummy data for demonstration
        print("\nUsing dummy data for demonstration")
        
        dummy_text = """
        Aviation training has evolved significantly over the past decades. According to Smith et al. (2019), 
        simulation-based training provides numerous advantages over traditional methods. 
        The Federal Aviation Administration (FAA) has published Advisory Circular AC 120-45A outlining 
        the requirements for simulation training devices.
        
        Recent studies by Johnson (2020) have shown that transfer of training from simulators to 
        real aircraft is highly effective when the simulation has high fidelity. However, Patel and Wilson (2018) 
        argue that procedural training can be effective even with lower fidelity devices.
        
        The European Union Aviation Safety Agency (EASA) has similar requirements outlined in CS-FSTD(A) 
        for airplane flight simulation training devices [1].
        
        References:
        
        1. Smith, J., Brown, R., & Davis, K. (2019). Effectiveness of simulation in pilot training. 
           Journal of Aviation Training, 25(3), 45-62.
        
        2. Johnson, M. (2020). Transfer of training in aviation: A meta-analysis. 
           International Journal of Aviation Psychology, 12(1), 15-30.
        
        3. Patel, S., & Wilson, F. (2018). Low-cost simulation for procedural training. 
           Aviation Training Technology, 10(2), 78-93.
        
        4. European Union Aviation Safety Agency. (2021). Certification Specifications for Airplane 
           Flight Simulation Training Devices (CS-FSTD(A)). EASA.
        """
        
        # Analyze text
        print("\nAnalyzing text...")
        analysis = assistant.analyze_text(dummy_text)
        
        # Print key sentences
        print("\nKey sentences:")
        for sentence in analysis['key_sentences']:
            print(f"  - {sentence}")
        
        # Print top words
        print("\nTop words:")
        for word, count in list(analysis['top_words'].items())[:5]:
            print(f"  - {word}: {count}")
        
        # Generate summary
        print("\nSummary:")
        print(assistant.generate_summary(dummy_text, max_length=300))
        
        # Extract citations
        citations = assistant.extract_citations(dummy_text)
        print(f"\nFound {len(citations)} citations:")
        for citation in citations:
            print(f"  - {citation['text']} (Type: {citation['type']})")
        
        # Generate citations for sources
        dummy_sources = [
            {
                'title': 'Effectiveness of simulation in pilot training',
                'authors': ['Smith, J.', 'Brown, R.', 'Davis, K.'],
                'year': '2019',
                'journal': 'Journal of Aviation Training',
                'volume': '25',
                'issue': '3',
                'pages': '45-62'
            },
            {
                'title': 'Transfer of training in aviation: A meta-analysis',
                'authors': ['Johnson, M.'],
                'year': '2020',
                'journal': 'International Journal of Aviation Psychology',
                'volume': '12',
                'issue': '1',
                'pages': '15-30'
            }
        ]
        
        print("\nFormatted citations (APA style):")
        apa_citations = assistant.generate_citations(dummy_sources, style='apa')
        for citation in apa_citations:
            print(f"  - {citation}")
        
        # Check for plagiarism with synthetic example
        print("\nPlagiarism check example:")
        original_text = "Simulation-based training provides numerous advantages over traditional methods."
        check_text = "Experts agree that simulation-based training provides numerous advantages over traditional flight training methods."
        
        plagiarism_result = assistant.check_plagiarism(check_text, [original_text])
        print(f"  Similarity score: {plagiarism_result['similarity_score']:.2f}")
        print(f"  Plagiarism detected: {plagiarism_result['plagiarism_detected']}")
        
        # Create a research project
        print("\nCreating research project:")
        project = assistant.create_research_project("Effectiveness of Flight Simulation Training")
        print(f"  Project ID: {project['id']}")
        print(f"  Topic: {project['topic']}")
        
        # Add sources to project
        for source in dummy_sources:
            assistant.add_source_to_project(project['id'], source)
        
        # Add a note
        assistant.add_note_to_project(
            project['id'], 
            "The studies consistently show positive transfer of training from simulators to aircraft."
        )
        
        # Export research findings
        research_data = {
            'title': 'Effectiveness of Flight Simulation Training',
            'date': datetime.now().strftime('%Y-%m-%d'),
            'overview': 'This research examines the effectiveness of flight simulation training compared to traditional methods.',
            'key_findings': [
                'Simulation-based training provides cost-effective alternatives to in-aircraft training.',
                'Transfer of training is highly effective when simulation has high fidelity.',
                'Procedural training can be effective even with lower fidelity devices.'
            ],
            'sources': [
                {
                    'title': 'Effectiveness of simulation in pilot training',
                    'authors': ['Smith, J.', 'Brown, R.', 'Davis, K.'],
                    'year': '2019',
                    'url': 'https://example.com/simulation-effectiveness',
                    'summary': 'This study examines the effectiveness of simulation in pilot training across various training scenarios.'
                },
                {
                    'title': 'Transfer of training in aviation: A meta-analysis',
                    'authors': ['Johnson, M.'],
                    'year': '2020',
                    'url': 'https://example.com/transfer-of-training',
                    'summary': 'A meta-analysis of studies on transfer of training from simulators to aircraft.'
                }
            ],
            'citations': apa_citations
        }
        
        print("\nExporting research findings (markdown):")
        markdown_output = assistant.export_research_findings(research_data, format_type='markdown')
        print(markdown_output[:500] + "...\n")
        
        print("Research Assistant demo completed!")
