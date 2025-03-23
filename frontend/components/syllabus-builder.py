// src/frontend/components/syllabus/SyllabusBuilder.tsx
import React, { useState, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';

// Type definitions
export interface TrainingElement {
  id: string;
  type: 'module' | 'lesson' | 'exercise';
  title: string;
  description?: string;
  children?: TrainingElement[];
  parentId?: string;
  order: number;
  complianceStatus?: 'compliant' | 'nonCompliant' | 'warning' | 'unknown';
  complianceInfo?: string;
}

interface DragItem {
  id: string;
  type: string;
  parentId: string | undefined;
  order: number;
}

// Drag and Drop Components
const ItemTypes = {
  SYLLABUS_ELEMENT: 'syllabusElement'
};

interface ElementItemProps {
  item: TrainingElement;
  depth: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, destinationParentId: string | undefined, newOrder: number) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isLastChild: boolean;
}

const ElementItem: React.FC<ElementItemProps> = ({
  item,
  depth,
  onEdit,
  onDelete,
  onMove,
  isExpanded,
  onToggleExpand,
  isLastChild
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.SYLLABUS_ELEMENT,
    item: { id: item.id, type: item.type, parentId: item.parentId, order: item.order } as DragItem,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    })
  }));

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.SYLLABUS_ELEMENT,
    canDrop: (dragItem: DragItem) => {
      // Prevent dropping on itself or its children
      if (dragItem.id === item.id) return false;
      
      // Prevent dropping a parent on its child
      let currentParent = item.parentId;
      while (currentParent) {
        if (currentParent === dragItem.id) return false;
        // Would need to lookup parent's parent here in a real implementation
        currentParent = undefined; 
      }
      
      return true;
    },
    drop: (dragItem: DragItem) => {
      // If this is a module or lesson, drop as child
      if (item.type === 'module' || item.type === 'lesson') {
        const childCount = item.children?.length || 0;
        onMove(dragItem.id, item.id, childCount);
      } else {
        // Otherwise drop after this item in the same parent
        onMove(dragItem.id, item.parentId, item.order + 1);
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop()
    })
  }));

  // Determine element icon
  const getElementIcon = () => {
    switch (item.type) {
      case 'module':
        return (
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"></path>
          </svg>
        );
      case 'lesson':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        );
      case 'exercise':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
          </svg>
        );
      default:
        return null;
    }
  };

  // Determine compliance status indicator
  const getComplianceIndicator = () => {
    switch (item.complianceStatus) {
      case 'compliant':
        return <span className="w-3 h-3 rounded-full bg-green-500" title="Compliant"></span>;
      case 'nonCompliant':
        return <span className="w-3 h-3 rounded-full bg-red-500" title={item.complianceInfo}></span>;
      case 'warning':
        return <span className="w-3 h-3 rounded-full bg-yellow-500" title={item.complianceInfo}></span>;
      case 'unknown':
      default:
        return <span className="w-3 h-3 rounded-full bg-gray-300" title="Compliance status unknown"></span>;
    }
  };

  const ref = useCallback((node) => {
    drag(drop(node));
  }, [drag, drop]);

  const hasChildren = item.children && item.children.length > 0;
  const opacity = isDragging ? 0.4 : 1;
  const backgroundColor = isOver && canDrop ? 'bg-blue-50' : '';

  return (
    <div ref={ref} style={{ opacity, marginLeft: `${depth * 20}px` }} className={`mb-1 ${backgroundColor}`}>
      <div className="flex items-center p-2 border rounded hover:bg-gray-50">
        <div className="flex-shrink-0 mr-2">
          {getElementIcon()}
        </div>
        
        {hasChildren && (
          <button 
            onClick={onToggleExpand}
            className="mr-2 text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            {isExpanded ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
              </svg>
            )}
          </button>
        )}
        
        <div className="flex-grow">
          <div className="font-medium">{item.title}</div>
          {item.description && <div className="text-sm text-gray-500">{item.description}</div>}
        </div>
        
        <div className="flex-shrink-0 flex items-center">
          {getComplianceIndicator()}
          
          <button 
            onClick={() => onEdit(item.id)}
            className="ml-2 text-gray-500 hover:text-blue-500 focus:outline-none"
            aria-label="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
            </svg>
          </button>
          
          <button 
            onClick={() => onDelete(item.id)}
            className="ml-2 text-gray-500 hover:text-red-500 focus:outline-none"
            aria-label="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// Recursive component to render the syllabus tree
interface SyllabusTreeProps {
  elements: TrainingElement[];
  parentId?: string;
  depth?: number;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, destinationParentId: string | undefined, newOrder: number) => void;
  expandedItems: Set<string>;
  toggleExpand: (id: string) => void;
}

const SyllabusTree: React.FC<SyllabusTreeProps> = ({
  elements,
  parentId,
  depth = 0,
  onEdit,
  onDelete,
  onMove,
  expandedItems,
  toggleExpand
}) => {
  // Filter elements by parentId and sort by order
  const childElements = elements
    .filter(el => el.parentId === parentId)
    .sort((a, b) => a.order - b.order);
  
  return (
    <>
      {childElements.map((element, index) => (
        <React.Fragment key={element.id}>
          <ElementItem
            item={element}
            depth={depth}
            onEdit={onEdit}
            onDelete={onDelete}
            onMove={onMove}
            isExpanded={expandedItems.has(element.id)}
            onToggleExpand={() => toggleExpand(element.id)}
            isLastChild={index === childElements.length - 1}
          />
          
          {expandedItems.has(element.id) && (
            <SyllabusTree
              elements={elements}
              parentId={element.id}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onMove={onMove}
              expandedItems={expandedItems}
              toggleExpand={toggleExpand}
            />
          )}
        </React.Fragment>
      ))}
    </>
  );
};

// Syllabus Builder component
interface SyllabusBuilderProps {
  syllabusElements: TrainingElement[];
  onSave: (elements: TrainingElement[]) => void;
  onElementEdit: (elementId: string) => void;
  onCheckCompliance: () => void;
  complianceStatus?: {
    overallStatus: 'compliant' | 'nonCompliant' | 'warning' | 'unknown';
    message?: string;
  };
  templates?: { id: string; name: string }[];
  onApplyTemplate?: (templateId: string) => void;
}

export const SyllabusBuilder: React.FC<SyllabusBuilderProps> = ({
  syllabusElements,
  onSave,
  onElementEdit,
  onCheckCompliance,
  complianceStatus,
  templates,
  onApplyTemplate
}) => {
  const [elements, setElements] = useState<TrainingElement[]>(syllabusElements);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Toggle expanded/collapsed state of an item
  const toggleExpand = (id: string) => {
    const newExpandedItems = new Set(expandedItems);
    if (newExpandedItems.has(id)) {
      newExpandedItems.delete(id);
    } else {
      newExpandedItems.add(id);
    }
    setExpandedItems(newExpandedItems);
  };

  // Handle element deletion
  const handleElementDelete = (id: string) => {
    // Ask for confirmation before deleting
    if (window.confirm('Are you sure you want to delete this element and all its children?')) {
      // Find all children recursively
      const childIds = new Set<string>();
      
      const findChildren = (parentId: string) => {
        elements.forEach(el => {
          if (el.parentId === parentId) {
            childIds.add(el.id);
            findChildren(el.id);
          }
        });
      };
      
      findChildren(id);
      
      // Filter out the element and all its children
      const filteredElements = elements.filter(el => el.id !== id && !childIds.has(el.id));
      
      setElements(filteredElements);
    }
  };

  // Handle element movement via drag and drop
  const handleElementMove = (id: string, destinationParentId: string | undefined, newOrder: number) => {
    // Get the element being moved
    const elementToMove = elements.find(el => el.id === id);
    if (!elementToMove) return;
    
    // Find all children recursively to prevent dropping onto a child
    const childIds = new Set<string>();
    
    const findChildren = (parentId: string) => {
      elements.forEach(el => {
        if (el.parentId === parentId) {
          childIds.add(el.id);
          findChildren(el.id);
        }
      });
    };
    
    findChildren(id);
    
    // If trying to drop onto a child, abort
    if (destinationParentId && childIds.has(destinationParentId)) return;
    
    // Create updated elements array
    const updatedElements = elements.map(el => {
      // This is the element being moved
      if (el.id === id) {
        return { ...el, parentId: destinationParentId, order: newOrder };
      }
      
      // Update order of elements in the source parent
      if (el.parentId === elementToMove.parentId && el.order > elementToMove.order) {
        return { ...el, order: el.order - 1 };
      }
      
      // Update order of elements in the destination parent
      if (el.parentId === destinationParentId && el.order >= newOrder) {
        return { ...el, order: el.order + 1 };
      }
      
      return el;
    });
    
    setElements(updatedElements);
  };

  // Handle save operation
  const handleSave = () => {
    onSave(elements);
  };

  // Handle template application
  const handleApplyTemplate = () => {
    if (selectedTemplateId && onApplyTemplate) {
      onApplyTemplate(selectedTemplateId);
      setShowTemplateSelector(false);
    }
  };

  // Add a new element (module, lesson, or exercise)
  const addNewElement = (type: 'module' | 'lesson' | 'exercise', parentId?: string) => {
    // Get the highest order value for the parent
    const highestOrder = elements
      .filter(el => el.parentId === parentId)
      .reduce((max, el) => Math.max(max, el.order), -1) + 1;
    
    // Create a new unique ID
    const newId = `new-${type}-${Date.now()}`;
    
    const newElement: TrainingElement = {
      id: newId,
      type,
      title: `New ${type}`,
      description: `Description for new ${type}`,
      parentId,
      order: highestOrder,
      complianceStatus: 'unknown'
    };
    
    setElements([...elements, newElement]);
    
    // Open the editor for the new element
    onElementEdit(newId);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="syllabus-builder">
        {/* Compliance Status */}
        {complianceStatus && (
          <div className="mb-4">
            <Alert
              type={
                complianceStatus.overallStatus === 'compliant' ? 'success' :
                complianceStatus.overallStatus === 'nonCompliant' ? 'error' :
                complianceStatus.overallStatus === 'warning' ? 'warning' : 'info'
              }
              title="Compliance Status"
              message={complianceStatus.message || 'Compliance status is being analyzed.'}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button 
            variant="primary"
            onClick={handleSave}
          >
            Save Syllabus
          </Button>
          
          <Button 
            variant="secondary"
            onClick={onCheckCompliance}
          >
            Check Compliance
          </Button>
          
          {templates && templates.length > 0 && (
            <Button 
              variant="outline"
              onClick={() => setShowTemplateSelector(!showTemplateSelector)}
            >
              Apply Template
            </Button>
          )}
          
          <Button 
            variant="outline"
            leftIcon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
            }
            onClick={() => addNewElement('module')}
          >
            Add Module
          </Button>
        </div>
        
        {/* Template Selector */}
        {showTemplateSelector && templates && (
          <Card className="mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="mb-2 sm:mb-0 sm:mr-4 flex-grow">
                <label htmlFor="template-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Select Template
                </label>
                <select
                  id="template-select"
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  <option value="">Select a template...</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="primary"
                  size="small"
                  onClick={handleApplyTemplate}
                  disabled={!selectedTemplateId}
                >
                  Apply
                </Button>
                <Button 
                  variant="outline"
                  size="small"
                  onClick={() => setShowTemplateSelector(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}
        
        {/* Syllabus Tree View */}
        <Card className="syllabus-tree">
          <div className="mb-4 border-b pb-2">
            <h3 className="text-lg font-medium">Syllabus Structure</h3>
          </div>
          
          {elements.length === 0 ? (
            <div className="text-center p-6">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No elements</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new module.</p>
              <div className="mt-6">
                <Button 
                  variant="primary"
                  onClick={() => addNewElement('module')}
                >
                  Add Module
                </Button>
              </div>
            </div>
          ) : (
            <div className="syllabus-elements">
              <SyllabusTree
                elements={elements}
                onEdit={onElementEdit}
                onDelete={handleElementDelete}
                onMove={handleElementMove}
                expandedItems={expandedItems}
                toggleExpand={toggleExpand}
              />
            </div>
          )}
        </Card>
        
        {/* Context menu for adding children */}
        {elements.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">Add elements to the syllabus:</p>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline"
                size="small"
                onClick={() => addNewElement('module')}
              >
                Add Module
              </Button>
              <Button 
                variant="outline"
                size="small"
                onClick={() => {
                  const moduleIds = elements
                    .filter(el => el.type === 'module')
                    .map(el => el.id);
                    
                  if (moduleIds.length === 0) {
                    alert('Please create a module first before adding a lesson.');
                    return;
                  }
                  
                  // If only one module, use that as parent
                  if (moduleIds.length === 1) {
                    addNewElement('lesson', moduleIds[0]);
                  } else {
                    // In a real app, you'd show a modal to select the parent module
                    const parentId = prompt('Enter parent module ID:');
                    if (parentId && moduleIds.includes(parentId)) {
                      addNewElement('lesson', parentId);
                    }
                  }
                }}
              >
                Add Lesson
              </Button>
              <Button 
                variant="outline"
                size="small"
                onClick={() => {
                  const lessonIds = elements
                    .filter(el => el.type === 'lesson')
                    .map(el => el.id);
                    
                  if (lessonIds.length === 0) {
                    alert('Please create a lesson first before adding an exercise.');
                    return;
                  }
                  
                  // If only one lesson, use that as parent
                  if (lessonIds.length === 1) {
                    addNewElement('exercise', lessonIds[0]);
                  } else {
                    // In a real app, you'd show a modal to select the parent lesson
                    const parentId = prompt('Enter parent lesson ID:');
                    if (parentId && lessonIds.includes(parentId)) {
                      addNewElement('exercise', parentId);
                    }
                  }
                }}
              >
                Add Exercise
              </Button>
            </div>
          </div>
        )}
      </div>
    </DndProvider>
  );
};

// src/frontend/components/syllabus/ElementEditor.tsx
import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Form } from '../ui/Form';
import { TrainingElement } from './SyllabusBuilder';

interface ElementEditorProps {
  element: TrainingElement | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedElement: TrainingElement) => void;
  validateElement?: (element: TrainingElement) => Promise<{ isValid: boolean; errors?: string[] }>;
}

export const ElementEditor: React.FC<ElementEditorProps> = ({
  element,
  isOpen,
  onClose,
  onSave,
  validateElement
}) => {
  const [formData, setFormData] = useState<Partial<TrainingElement>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (element) {
      setFormData({ ...element });
      setErrors({});
      setValidationErrors([]);
    }
  }, [element]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    // Check if we have a validation function
    if (validateElement && formData.id) {
      setIsValidating(true);
      try {
        const validationResult = await validateElement(formData as TrainingElement);
        
        if (!validationResult.isValid) {
          setValidationErrors(validationResult.errors || ['Validation failed']);
          setIsValidating(false);
          return;
        }
      } catch (error) {
        setValidationErrors(['An error occurred during validation']);
        setIsValidating(false);
        return;
      }
    }
    
    // Submit the form
    onSave(formData as TrainingElement);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${element ? 'Edit' : 'Add'} ${formData.type || 'Element'}`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            isLoading={isValidating}
            disabled={isValidating}
          >
            Save
          </Button>
        </>
      }
    >
      <Form onSubmit={handleSubmit} className="space-y-4">
        {validationErrors.length > 0 && (
          <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded">
            <h4 className="text-sm font-medium text-red-800 mb-1">Validation Errors:</h4>
            <ul className="list-disc pl-5 text-sm text-red-700">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      
        <Input
          label="Title"
          name="title"
          value={formData.title || ''}
          onChange={handleInputChange}
          error={errors.title}
          required
        />
        
        <div className="mb-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={formData.description || ''}
            onChange={handleInputChange}
          ></textarea>
        </div>
        
        {/* Additional fields would be added here based on element type */}
        {formData.type === 'exercise' && (
          <div className="mb-4">
            <label htmlFor="objectives" className="block text-sm font-medium text-gray-700 mb-1">
              Learning Objectives
            </label>
            <textarea
              id="objectives"
              name="objectives"
              rows={3}
              className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={(formData as any).objectives || ''}
              onChange={handleInputChange}
            ></textarea>
          </div>
        )}
        
        {formData.type === 'exercise' && (
          <div className="mb-4">
            <label htmlFor="assessmentCriteria" className="block text-sm font-medium text-gray-700 mb-1">
              Assessment Criteria
            </label>
            <textarea
              id="assessmentCriteria"
              name="assessmentCriteria"
              rows={3}
              className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={(formData as any).assessmentCriteria || ''}
              onChange={handleInputChange}
            ></textarea>
          </div>
        )}
      </Form>
    </Modal>
  );
};