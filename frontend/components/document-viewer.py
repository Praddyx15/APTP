// src/frontend/components/document/DocumentViewer.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Tabs, Tab } from '../ui/Tabs';

// Types
export interface DocumentPage {
  pageNumber: number;
  content: string;
  annotations?: Annotation[];
}

export interface Annotation {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  type: 'highlight' | 'note' | 'requirement' | 'competency';
  color?: string;
  metadata?: Record<string, any>;
}

export interface DocumentMetadata {
  title: string;
  author?: string;
  createdDate?: Date;
  modifiedDate?: Date;
  totalPages: number;
  fileType: string;
  fileSize: number;
  tags?: string[];
}

export interface ExtractedStructure {
  headings: {
    level: number;
    text: string;
    pageNumber: number;
  }[];
  sections: {
    title: string;
    pageRange: [number, number];
  }[];
  tables: {
    pageNumber: number;
    title?: string;
    headers?: string[];
    rowCount: number;
  }[];
}

export interface ExtractedRegulation {
  id: string;
  text: string;
  reference: string;
  pageNumber: number;
  confidence: number;
}

export interface ExtractedTrainingRequirement {
  id: string;
  text: string;
  type: string;
  pageNumber: number;
  relatedRegulations?: string[];
  confidence: number;
}

interface DocumentViewerProps {
  documentId: string;
  metadata: DocumentMetadata;
  pages: DocumentPage[];
  structure?: ExtractedStructure;
  regulations?: ExtractedRegulation[];
  trainingRequirements?: ExtractedTrainingRequirement[];
  onAnnotationCreate: (annotation: Omit<Annotation, 'id'>) => Promise<Annotation>;
  onAnnotationUpdate: (annotation: Annotation) => Promise<void>;
  onAnnotationDelete: (annotationId: string) => Promise<void>;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentId,
  metadata,
  pages,
  structure,
  regulations,
  trainingRequirements,
  onAnnotationCreate,
  onAnnotationUpdate,
  onAnnotationDelete
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
  const [newAnnotation, setNewAnnotation] = useState<Partial<Annotation> | null>(null);
  const [showExtractedData, setShowExtractedData] = useState(false);
  const [activeTab, setActiveTab] = useState<'structure' | 'regulations' | 'requirements'>('structure');

  // Handle zoom in
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 200));
  };

  // Handle zoom out
  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  // Handle page navigation
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= metadata.totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Get current page content
  const currentPageContent = pages.find(page => page.pageNumber === currentPage);
  
  // Get annotations for current page
  const currentAnnotations = currentPageContent?.annotations || [];

  // Create a new annotation
  const handleCreateAnnotation = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isAddingAnnotation) return;
    
    const containerRect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    const y = ((e.clientY - containerRect.top) / containerRect.height) * 100;
    
    const newAnnotationData: Omit<Annotation, 'id'> = {
      pageNumber: currentPage,
      x,
      y,
      width: 10,
      height: 5,
      text: '',
      type: 'note'
    };
    
    try {
      const annotation = await onAnnotationCreate(newAnnotationData);
      setSelectedAnnotation(annotation);
      setIsAddingAnnotation(false);
    } catch (error) {
      console.error('Failed to create annotation:', error);
    }
  };

  // Update annotation
  const handleUpdateAnnotation = async (text: string) => {
    if (!selectedAnnotation) return;
    
    try {
      const updatedAnnotation = { ...selectedAnnotation, text };
      await onAnnotationUpdate(updatedAnnotation);
      setSelectedAnnotation(null);
    } catch (error) {
      console.error('Failed to update annotation:', error);
    }
  };

  // Delete annotation
  const handleDeleteAnnotation = async () => {
    if (!selectedAnnotation) return;
    
    try {
      await onAnnotationDelete(selectedAnnotation.id);
      setSelectedAnnotation(null);
    } catch (error) {
      console.error('Failed to delete annotation:', error);
    }
  };

  // Render annotations
  const renderAnnotations = () => {
    return currentAnnotations.map(annotation => (
      <div
        key={annotation.id}
        className={`absolute cursor-pointer border-2 ${
          annotation.type === 'highlight' ? 'border-yellow-400 bg-yellow-100 bg-opacity-50' :
          annotation.type === 'note' ? 'border-blue-400 bg-blue-100 bg-opacity-50' :
          annotation.type === 'requirement' ? 'border-purple-400 bg-purple-100 bg-opacity-50' :
          'border-green-400 bg-green-100 bg-opacity-50'
        }`}
        style={{
          left: `${annotation.x}%`,
          top: `${annotation.y}%`,
          width: `${annotation.width}%`,
          height: `${annotation.height}%`
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedAnnotation(annotation);
        }}
      />
    ));
  };

  // Structure tabs for extracted data
  const extractedDataTabs: Tab[] = [
    {
      id: 'structure',
      label: 'Document Structure',
      content: (
        <div className="overflow-y-auto max-h-[600px]">
          {structure ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium mb-2">Headings</h3>
                <ul className="space-y-1">
                  {structure.headings.map((heading, index) => (
                    <li
                      key={index}
                      className="flex items-center py-1 hover:bg-gray-50 cursor-pointer"
                      style={{ paddingLeft: `${heading.level * 0.5}rem` }}
                      onClick={() => handlePageChange(heading.pageNumber)}
                    >
                      <span className="text-blue-600 text-xs mr-2">P{heading.pageNumber}</span>
                      <span>{heading.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="text-base font-medium mb-2">Sections</h3>
                <ul className="space-y-1">
                  {structure.sections.map((section, index) => (
                    <li
                      key={index}
                      className="flex items-center py-1 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handlePageChange(section.pageRange[0])}
                    >
                      <span className="text-blue-600 text-xs mr-2">
                        P{section.pageRange[0]}-{section.pageRange[1]}
                      </span>
                      <span>{section.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="text-base font-medium mb-2">Tables</h3>
                <ul className="space-y-1">
                  {structure.tables.map((table, index) => (
                    <li
                      key={index}
                      className="flex items-center py-1 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handlePageChange(table.pageNumber)}
                    >
                      <span className="text-blue-600 text-xs mr-2">P{table.pageNumber}</span>
                      <span>
                        {table.title || `Table ${index + 1}`} ({table.rowCount} rows)
                        {table.headers && ` - Headers: ${table.headers.join(', ')}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              No structure data available for this document.
            </div>
          )}
        </div>
      )
    },
    {
      id: 'regulations',
      label: 'Regulations',
      content: (
        <div className="overflow-y-auto max-h-[600px]">
          {regulations && regulations.length > 0 ? (
            <ul className="divide-y">
              {regulations.map(regulation => (
                <li
                  key={regulation.id}
                  className="py-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handlePageChange(regulation.pageNumber)}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {Math.round(regulation.confidence * 100)}%
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">{regulation.reference}</p>
                      <p className="text-sm text-gray-500 mt-1">{regulation.text}</p>
                      <p className="text-xs text-gray-400 mt-1">Page {regulation.pageNumber}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-500">
              No regulations extracted from this document.
            </div>
          )}
        </div>
      )
    },
    {
      id: 'requirements',
      label: 'Training Requirements',
      content: (
        <div className="overflow-y-auto max-h-[600px]">
          {trainingRequirements && trainingRequirements.length > 0 ? (
            <ul className="divide-y">
              {trainingRequirements.map(requirement => (
                <li
                  key={requirement.id}
                  className="py-3 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handlePageChange(requirement.pageNumber)}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {requirement.type}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-gray-500">{requirement.text}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {requirement.relatedRegulations?.map(ref => (
                          <span key={ref} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {ref}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Page {requirement.pageNumber} | Confidence: {Math.round(requirement.confidence * 100)}%
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-gray-500">
              No training requirements extracted from this document.
            </div>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="document-viewer">
      {/* Document info and controls */}
      <div className="flex flex-col md:flex-row justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold">{metadata.title}</h2>
          <p className="text-sm text-gray-500">
            {metadata.fileType.toUpperCase()} | {(metadata.fileSize / 1024 / 1024).toFixed(2)} MB | {metadata.totalPages} pages
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
          <Button
            variant="outline"
            size="small"
            onClick={() => setIsAddingAnnotation(!isAddingAnnotation)}
          >
            {isAddingAnnotation ? 'Cancel' : 'Add Annotation'}
          </Button>
          
          <Button
            variant="outline"
            size="small"
            onClick={() => setShowExtractedData(!showExtractedData)}
          >
            {showExtractedData ? 'Hide Extracted Data' : 'Show Extracted Data'}
          </Button>
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Main document view */}
        <div className={`flex-grow ${showExtractedData ? 'lg:w-2/3' : 'w-full'}`}>
          <div className="bg-white border rounded-lg shadow overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                </Button>
                
                <span className="text-sm">
                  Page {currentPage} of {metadata.totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= metadata.totalPages}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </Button>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="small"
                  onClick={handleZoomOut}
                  disabled={zoom <= 50}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path>
                  </svg>
                </Button>
                
                <span className="text-sm">{zoom}%</span>
                
                <Button
                  variant="outline"
                  size="small"
                  onClick={handleZoomIn}
                  disabled={zoom >= 200}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                  </svg>
                </Button>
              </div>
            </div>
            
            {/* Document content */}
            <div
              className="relative bg-gray-100 p-4 overflow-auto"
              style={{ height: '600px' }}
              onClick={handleCreateAnnotation}
            >
              {currentPageContent ? (
                <div
                  className="mx-auto bg-white shadow-lg relative"
                  style={{
                    width: `${zoom}%`,
                    maxWidth: '1000px',
                    minHeight: '500px'
                  }}
                >
                  {/* Render the page content */}
                  <div 
                    className="p-4"
                    dangerouslySetInnerHTML={{ __html: currentPageContent.content }}
                  />
                  
                  {/* Render annotations */}
                  {renderAnnotations()}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">Loading page content...</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Annotation editor */}
          {selectedAnnotation && (
            <Card className="mt-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="annotation-text" className="block text-sm font-medium text-gray-700 mb-1">
                    Annotation
                  </label>
                  <textarea
                    id="annotation-text"
                    className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    rows={3}
                    value={selectedAnnotation.text}
                    onChange={(e) => setSelectedAnnotation({
                      ...selectedAnnotation,
                      text: e.target.value
                    })}
                  />
                </div>
                
                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setSelectedAnnotation(null)}
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="small"
                    onClick={handleDeleteAnnotation}
                  >
                    Delete
                  </Button>
                  
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => handleUpdateAnnotation(selectedAnnotation.text)}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
        
        {/* Extracted data sidebar */}
        {showExtractedData && (
          <div className="lg:w-1/3">
            <Card>
              <h3 className="text-lg font-medium mb-4">Extracted Data</h3>
              
              <Tabs
                tabs={extractedDataTabs}
                defaultTabId="structure"
                onChange={(tabId) => setActiveTab(tabId as any)}
              />
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};