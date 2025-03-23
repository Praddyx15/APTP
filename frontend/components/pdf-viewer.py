// src/frontend/components/document/PDFViewer.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

// Types
interface PDFViewerProps {
  documentUrl: string;
  documentName?: string;
  initialPage?: number;
  onClose?: () => void;
  onAnnotate?: (page: number, annotation: PDFAnnotation) => Promise<void>;
  onPageChange?: (page: number) => void;
  annotations?: PDFAnnotation[];
  enableAnnotations?: boolean;
}

export interface PDFAnnotation {
  id: string;
  page: number;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  content: string;
  color: string;
  author?: string;
  createdAt: Date;
  type: 'highlight' | 'note' | 'underline' | 'strikethrough' | 'link';
}

// PDF Viewer Component
export const PDFViewer: React.FC<PDFViewerProps> = ({
  documentUrl,
  documentName = 'Document',
  initialPage = 1,
  onClose,
  onAnnotate,
  onPageChange,
  annotations = [],
  enableAnnotations = false
}) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageRendered, setPageRendered] = useState(false);
  const [selectedText, setSelectedText] = useState<{
    text: string;
    rect: { x: number; y: number; width: number; height: number };
  } | null>(null);
  const [showAnnotationPopup, setShowAnnotationPopup] = useState(false);
  const [annotationContent, setAnnotationContent] = useState('');
  const [annotationColor, setAnnotationColor] = useState('#FFEB3B'); // yellow default
  const [annotationType, setAnnotationType] = useState<'highlight' | 'note' | 'underline' | 'strikethrough' | 'link'>(
    'highlight'
  );
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocumentRef = useRef<any>(null);
  const pdfPageRef = useRef<any>(null);
  
  // Initialize PDF.js on component mount
  useEffect(() => {
    // Here we would typically load PDF.js library
    // For the purpose of this example, we'll simulate PDF loading
    setIsLoading(true);
    
    // Simulate loading the PDF document
    const loadPDF = async () => {
      try {
        // In a real implementation, this would be:
        // const loadingTask = pdfjs.getDocument(documentUrl);
        // const pdf = await loadingTask.promise;
        
        // Simulate PDF loading with a timeout
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate PDF document with 10 pages
        pdfDocumentRef.current = {
          numPages: 10,
          getPage: async (pageNum: number) => {
            // Simulate page loading
            await new Promise(resolve => setTimeout(resolve, 300));
            return {
              getViewport: ({ scale }: { scale: number }) => ({
                width: 595.28 * scale,
                height: 841.89 * scale, // A4 size
                transform: [scale, 0, 0, scale, 0, 0],
              }),
              render: ({ canvasContext, viewport }: any) => {
                // Simulate rendering by drawing a rectangle
                canvasContext.fillStyle = '#FFFFFF';
                canvasContext.fillRect(0, 0, viewport.width, viewport.height);
                
                // Draw page border
                canvasContext.strokeStyle = '#000000';
                canvasContext.lineWidth = 1;
                canvasContext.strokeRect(5, 5, viewport.width - 10, viewport.height - 10);
                
                // Draw page number
                canvasContext.fillStyle = '#000000';
                canvasContext.font = '20px Arial';
                canvasContext.fillText(`Page ${pageNum} of 10`, viewport.width / 2 - 50, viewport.height / 2);
                
                // Simulate rendering time
                return {
                  promise: new Promise(resolve => setTimeout(resolve, 100))
                };
              }
            };
          }
        };
        
        setTotalPages(pdfDocumentRef.current.numPages);
        setIsLoading(false);
        renderPage(currentPage);
      } catch (err) {
        setError(`Failed to load PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    };
    
    loadPDF();
    
    // Cleanup function
    return () => {
      pdfDocumentRef.current = null;
      pdfPageRef.current = null;
    };
  }, [documentUrl]);
  
  // Render page when current page or scale changes
  useEffect(() => {
    if (!isLoading && pdfDocumentRef.current) {
      renderPage(currentPage);
    }
  }, [currentPage, scale]);
  
  // Function to render a page
  const renderPage = async (pageNumber: number) => {
    if (!pdfDocumentRef.current) return;
    
    try {
      setPageRendered(false);
      pdfPageRef.current = await pdfDocumentRef.current.getPage(pageNumber);
      
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const context = canvas.getContext('2d');
      if (!context) return;
      
      const viewport = pdfPageRef.current.getViewport({ scale });
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      const renderTask = pdfPageRef.current.render({
        canvasContext: context,
        viewport,
      });
      
      await renderTask.promise;
      
      // Render any annotations for this page
      renderAnnotations(pageNumber, context, viewport);
      
      setPageRendered(true);
      
      if (onPageChange) {
        onPageChange(pageNumber);
      }
    } catch (err) {
      setError(`Failed to render page: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  // Function to render annotations on canvas
  const renderAnnotations = (page: number, context: CanvasRenderingContext2D, viewport: any) => {
    const pageAnnotations = annotations.filter(a => a.page === page);
    
    pageAnnotations.forEach(annotation => {
      const { rect, type, color } = annotation;
      
      // Scale annotation rectangle to match current viewport
      const scaledRect = {
        x: rect.x * viewport.width,
        y: rect.y * viewport.height,
        width: rect.width * viewport.width,
        height: rect.height * viewport.height,
      };
      
      context.save();
      
      if (type === 'highlight') {
        context.fillStyle = `${color}80`; // Add transparency
        context.fillRect(scaledRect.x, scaledRect.y, scaledRect.width, scaledRect.height);
      } else if (type === 'underline') {
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(scaledRect.x, scaledRect.y + scaledRect.height);
        context.lineTo(scaledRect.x + scaledRect.width, scaledRect.y + scaledRect.height);
        context.stroke();
      } else if (type === 'strikethrough') {
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(scaledRect.x, scaledRect.y + scaledRect.height / 2);
        context.lineTo(scaledRect.x + scaledRect.width, scaledRect.y + scaledRect.height / 2);
        context.stroke();
      } else if (type === 'note') {
        // Draw note icon
        context.fillStyle = color;
        context.fillRect(scaledRect.x, scaledRect.y, 20, 20);
        context.fillStyle = '#FFFFFF';
        context.font = '15px Arial';
        context.fillText('N', scaledRect.x + 5, scaledRect.y + 15);
      }
      
      context.restore();
    });
  };
  
  // Handler for text selection to create annotation
  const handleTextSelection = () => {
    if (!enableAnnotations) return;
    
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !canvasRef.current) return;
    
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const canvasRect = canvasRef.current.getBoundingClientRect();
    
    // Calculate relative position
    const relativeRect = {
      x: (rect.x - canvasRect.x) / canvasRect.width,
      y: (rect.y - canvasRect.y) / canvasRect.height,
      width: rect.width / canvasRect.width,
      height: rect.height / canvasRect.height,
    };
    
    setSelectedText({
      text: selection.toString(),
      rect: relativeRect,
    });
    
    setShowAnnotationPopup(true);
  };
  
  // Handler for creating annotation
  const handleCreateAnnotation = async () => {
    if (!selectedText || !onAnnotate) return;
    
    const annotation: PDFAnnotation = {
      id: `annotation-${Date.now()}`,
      page: currentPage,
      rect: selectedText.rect,
      content: annotationContent || selectedText.text,
      color: annotationColor,
      type: annotationType,
      createdAt: new Date(),
    };
    
    try {
      await onAnnotate(currentPage, annotation);
      setShowAnnotationPopup(false);
      setSelectedText(null);
      setAnnotationContent('');
      
      // Re-render the page to show the new annotation
      renderPage(currentPage);
    } catch (err) {
      setError(`Failed to create annotation: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };
  
  // Navigate to the next page
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  // Navigate to the previous page
  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  // Zoom in
  const zoomIn = () => {
    setScale(scale => Math.min(scale + 0.25, 3.0));
  };
  
  // Zoom out
  const zoomOut = () => {
    setScale(scale => Math.max(scale - 0.25, 0.5));
  };
  
  // Reset zoom
  const resetZoom = () => {
    setScale(1.0);
  };
  
  return (
    <div className="pdf-viewer relative">
      <Card className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">{documentName}</h2>
          
          <div className="flex items-center space-x-2 mt-2 sm:mt-0">
            <Button
              variant="outline"
              size="small"
              onClick={zoomOut}
              disabled={scale <= 0.5}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path>
              </svg>
            </Button>
            
            <span className="text-sm">{Math.round(scale * 100)}%</span>
            
            <Button
              variant="outline"
              size="small"
              onClick={zoomIn}
              disabled={scale >= 3.0}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
              </svg>
            </Button>
            
            <Button
              variant="outline"
              size="small"
              onClick={resetZoom}
              disabled={scale === 1.0}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"></path>
              </svg>
            </Button>
          </div>
        </div>
        
        <div className="flex justify-between items-center px-4 py-2 bg-gray-100 rounded-md mb-4">
          <Button
            variant="outline"
            size="small"
            onClick={goToPrevPage}
            disabled={currentPage <= 1 || isLoading}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
            </svg>
          </Button>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm">Page</span>
            <input
              type="number"
              className="w-12 text-center border rounded px-1 py-0"
              value={currentPage}
              min={1}
              max={totalPages}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) {
                  setCurrentPage(page);
                }
              }}
            />
            <span className="text-sm">of {totalPages}</span>
          </div>
          
          <Button
            variant="outline"
            size="small"
            onClick={goToNextPage}
            disabled={currentPage >= totalPages || isLoading}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
            </svg>
          </Button>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error:</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}
        
        <div
          ref={containerRef}
          className="overflow-auto bg-gray-200 rounded-md"
          style={{ height: '600px', display: 'flex', justifyContent: 'center' }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-2 text-gray-700">Loading document...</span>
            </div>
          ) : (
            <div className="p-4">
              <canvas
                ref={canvasRef}
                className="shadow-lg cursor-text"
                onMouseUp={handleTextSelection}
              ></canvas>
            </div>
          )}
        </div>
        
        {enableAnnotations && (
          <div className="mt-4 px-4 py-2 bg-gray-100 rounded-md flex items-center justify-between">
            <div className="text-sm font-medium">Annotations</div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="small"
                onClick={() => {
                  // This would typically show a list of annotations
                  alert('Annotation list would be shown here');
                }}
              >
                <svg className="h-5 w-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
                Show All
              </Button>
            </div>
          </div>
        )}
      </Card>
      
      {/* Annotation popup */}
      {showAnnotationPopup && selectedText && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-medium mb-4">Create Annotation</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">Selected text:</p>
              <div className="p-2 bg-gray-100 rounded text-sm">
                {selectedText.text}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Annotation Type
              </label>
              <select
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={annotationType}
                onChange={(e) => setAnnotationType(e.target.value as any)}
              >
                <option value="highlight">Highlight</option>
                <option value="underline">Underline</option>
                <option value="strikethrough">Strikethrough</option>
                <option value="note">Note</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex space-x-2">
                {['#FFEB3B', '#4CAF50', '#2196F3', '#FF5722', '#9C27B0'].map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      color === annotationColor ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setAnnotationColor(color)}
                  ></button>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note (optional)
              </label>
              <textarea
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                rows={3}
                value={annotationContent}
                onChange={(e) => setAnnotationContent(e.target.value)}
                placeholder="Add a note to this annotation..."
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAnnotationPopup(false);
                  setSelectedText(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreateAnnotation}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
