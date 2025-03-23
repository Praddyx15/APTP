// src/frontend/components/SyllabusBuilder/SyllabusBuilder.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Edit,
  Trash,
  Copy,
  AlertCircle,
  CheckCircle,
  Save,
  FileText,
  List,
  Clock
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';

// Types
export interface SyllabusElement {
  id: string;
  type: 'module' | 'lesson' | 'exercise';
  title: string;
  description?: string;
  children?: SyllabusElement[];
  duration?: number; // in minutes
  status?: 'draft' | 'review' | 'approved';
  completionCriteria?: string;
  learningObjectives?: string[];
  assessmentMethod?: string;
  regulatoryReferences?: string[];
  complianceStatus?: {
    status: 'compliant' | 'partial' | 'non-compliant';
    issues?: string[];
  };
  lastModified?: string;
  lastModifiedBy?: string;
  version?: number;
  parentId?: string;
  dragDisabled?: boolean;
}

export interface SyllabusData {
  id: string;
  title: string;
  description?: string;
  version: number;
  status: 'draft' | 'review' | 'approved';
  author: string;
  createdAt: string;
  lastModified: string;
  organization: string;
  regulatoryFramework?: string;
  totalDuration?: number;
  complianceScore?: number;
  elements: SyllabusElement[];
}

export interface SyllabusTemplate {
  id: string;
  name: string;
  description: string;
  elements: SyllabusElement[];
  regulatoryFramework?: string;
  organization: string;
}

export interface SyllabusBuilderProps {
  initialData?: SyllabusData;
  templates?: SyllabusTemplate[];
  readOnly?: boolean;
  onSave?: (data: SyllabusData) => void;
  onPublish?: (data: SyllabusData) => void;
  onTemplateApply?: (templateId: string, syllabusId: string) => void;
  showAdvancedFeatures?: boolean;
}

// Constants
const ITEM_TYPES = {
  SYLLABUS_ELEMENT: 'syllabusElement',
};

// Drag and Drop Elements
interface DragItem {
  type: string;
  id: string;
  elementType: 'module' | 'lesson' | 'exercise';
  parentId: string | null;
  index: number;
}

interface SyllabusElementItemProps {
  element: SyllabusElement;
  index: number;
  parentId: string | null;
  onEdit: (element: SyllabusElement) => void;
  onDelete: (id: string) => void;
  onDuplicate: (element: SyllabusElement) => void;
  onMove: (dragIndex: number, hoverIndex: number, dragId: string, hoverId: string, parentId: string | null) => void;
  onAddChild: (parentId: string, type: 'module' | 'lesson' | 'exercise') => void;
  level: number;
  isLast: boolean;
  showAdvancedFeatures?: boolean;
}

const SyllabusElementItem: React.FC<SyllabusElementItemProps> = ({
  element,
  index,
  parentId,
  onEdit,
  onDelete,
  onDuplicate,
  onMove,
  onAddChild,
  level,
  isLast,
  showAdvancedFeatures = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const canHaveChildren = element.type === 'module' || element.type === 'lesson';
  
  // Configure drag and drop
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPES.SYLLABUS_ELEMENT,
    item: {
      type: ITEM_TYPES.SYLLABUS_ELEMENT,
      id: element.id,
      elementType: element.type,
      parentId: parentId,
      index,
    },
    canDrag: !element.dragDisabled,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  
  const [{ isOver }, drop] = useDrop({
    accept: ITEM_TYPES.SYLLABUS_ELEMENT,
    hover(item: DragItem, monitor) {
      if (!item) {
        return;
      }
      
      // Don't replace items with themselves
      if (item.id === element.id) {
        return;
      }
      
      // Time to actually perform the action
      if (item.parentId === parentId) {
        onMove(item.index, index, item.id, element.id, parentId);
        // Update the index for the source item
        item.index = index;
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });
  
  // Toggle expansion
  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);
  
  // Format duration for display
  const formatDuration = (minutes?: number): string => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };
  
  // Get compliance status color
  const getComplianceColor = (): string => {
    if (!element.complianceStatus) return 'gray';
    switch (element.complianceStatus.status) {
      case 'compliant':
        return 'green';
      case 'partial':
        return 'yellow';
      case 'non-compliant':
        return 'red';
      default:
        return 'gray';
    }
  };
  
  const getElementTypeIcon = () => {
    switch (element.type) {
      case 'module':
        return <List className="h-4 w-4 mr-2" />;
      case 'lesson':
        return <FileText className="h-4 w-4 mr-2" />;
      case 'exercise':
        return <Clock className="h-4 w-4 mr-2" />;
      default:
        return null;
    }
  };
  
  const renderComplianceStatus = () => {
    if (!element.complianceStatus) return null;
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center ml-2">
              {element.complianceStatus.status === 'compliant' ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : element.complianceStatus.status === 'partial' ? (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Compliance: {element.complianceStatus.status}</p>
            {element.complianceStatus.issues && element.complianceStatus.issues.length > 0 && (
              <ul className="list-disc list-inside mt-1">
                {element.complianceStatus.issues.map((issue, i) => (
                  <li key={i} className="text-xs">{issue}</li>
                ))}
              </ul>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };
  
  return (
    <div ref={(node) => drag(drop(node))} className={`mb-1 ${isDragging ? 'opacity-50' : ''}`}>
      <div 
        className={`
          flex items-center p-2 rounded-md border 
          ${isOver ? 'border-primary bg-primary/10' : 'border-gray-200'} 
          ${element.type === 'module' ? 'bg-gray-50' : element.type === 'lesson' ? 'bg-white' : 'bg-white'}
          hover:border-gray-300 transition-colors
        `}
        style={{ paddingLeft: `${(level + 1) * 8}px` }}
      >
        {canHaveChildren && (
          <button 
            onClick={toggleExpand} 
            className="flex items-center justify-center h-6 w-6 rounded-md hover:bg-gray-200"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
        
        {!canHaveChildren && <div className="w-6" />}
        
        <div className="flex-1 flex items-center ml-2">
          {getElementTypeIcon()}
          <span className="font-medium">{element.title}</span>
          
          {element.status && (
            <Badge 
              variant="outline" 
              className="ml-2"
            >
              {element.status}
            </Badge>
          )}
          
          {element.duration !== undefined && (
            <span className="text-xs text-gray-500 ml-2">
              {formatDuration(element.duration)}
            </span>
          )}
          
          {renderComplianceStatus()}
        </div>
        
        <div className="flex items-center space-x-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(element)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {canHaveChildren && (
                <>
                  <DropdownMenuItem onClick={() => onAddChild(element.id, element.type === 'module' ? 'lesson' : 'exercise')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add {element.type === 'module' ? 'Lesson' : 'Exercise'}
                  </DropdownMenuItem>
                  {element.type === 'module' && (
                    <DropdownMenuItem onClick={() => onAddChild(element.id, 'module')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Sub-Module
                    </DropdownMenuItem>
                  )}
                </>
              )}
              <DropdownMenuItem onClick={() => onDuplicate(element)}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(element.id)}
                className="text-red-500 focus:text-red-500"
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* Render children if expanded */}
      {isExpanded && element.children && element.children.length > 0 && (
        <div className="ml-4">
          {element.children.map((child, childIndex) => (
            <SyllabusElementItem
              key={child.id}
              element={child}
              index={childIndex}
              parentId={element.id}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onMove={onMove}
              onAddChild={onAddChild}
              level={level + 1}
              isLast={childIndex === element.children!.length - 1}
              showAdvancedFeatures={showAdvancedFeatures}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Element Editor Dialog
interface ElementEditorProps {
  element: SyllabusElement | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (element: SyllabusElement) => void;
  showAdvancedFeatures?: boolean;
}

const ElementEditor: React.FC<ElementEditorProps> = ({
  element,
  isOpen,
  onClose,
  onSave,
  showAdvancedFeatures = true,
}) => {
  const [formData, setFormData] = useState<SyllabusElement | null>(null);
  
  // Initialize form data when element changes
  useEffect(() => {
    if (element) {
      setFormData({ ...element });
    } else {
      setFormData(null);
    }
  }, [element, isOpen]);
  
  // Update form data
  const handleChange = (field: keyof SyllabusElement, value: any) => {
    if (!formData) return;
    
    setFormData({
      ...formData,
      [field]: value,
    });
  };
  
  // Update learning objectives
  const handleObjectiveChange = (index: number, value: string) => {
    if (!formData || !formData.learningObjectives) return;
    
    const updatedObjectives = [...formData.learningObjectives];
    updatedObjectives[index] = value;
    
    setFormData({
      ...formData,
      learningObjectives: updatedObjectives,
    });
  };
  
  // Add new learning objective
  const addObjective = () => {
    if (!formData) return;
    
    const updatedObjectives = formData.learningObjectives ? [...formData.learningObjectives] : [];
    updatedObjectives.push('');
    
    setFormData({
      ...formData,
      learningObjectives: updatedObjectives,
    });
  };
  
  // Remove learning objective
  const removeObjective = (index: number) => {
    if (!formData || !formData.learningObjectives) return;
    
    const updatedObjectives = [...formData.learningObjectives];
    updatedObjectives.splice(index, 1);
    
    setFormData({
      ...formData,
      learningObjectives: updatedObjectives,
    });
  };
  
  // Update regulatory references
  const handleReferenceChange = (index: number, value: string) => {
    if (!formData || !formData.regulatoryReferences) return;
    
    const updatedReferences = [...formData.regulatoryReferences];
    updatedReferences[index] = value;
    
    setFormData({
      ...formData,
      regulatoryReferences: updatedReferences,
    });
  };
  
  // Add new regulatory reference
  const addReference = () => {
    if (!formData) return;
    
    const updatedReferences = formData.regulatoryReferences ? [...formData.regulatoryReferences] : [];
    updatedReferences.push('');
    
    setFormData({
      ...formData,
      regulatoryReferences: updatedReferences,
    });
  };
  
  // Remove regulatory reference
  const removeReference = (index: number) => {
    if (!formData || !formData.regulatoryReferences) return;
    
    const updatedReferences = [...formData.regulatoryReferences];
    updatedReferences.splice(index, 1);
    
    setFormData({
      ...formData,
      regulatoryReferences: updatedReferences,
    });
  };
  
  // Save changes
  const handleSave = () => {
    if (!formData) return;
    
    // Update version and last modified
    const updatedElement: SyllabusElement = {
      ...formData,
      version: (formData.version || 0) + 1,
      lastModified: new Date().toISOString(),
    };
    
    onSave(updatedElement);
    onClose();
  };
  
  if (!formData) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {formData.id ? `Edit ${formData.type.charAt(0).toUpperCase() + formData.type.slice(1)}` : 'Create New Element'}
          </DialogTitle>
          <DialogDescription>
            Update the details of this syllabus element.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => handleChange('type', value)}
              disabled={!!formData.id} // Can't change type of existing elements
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="module">Module</SelectItem>
                <SelectItem value="lesson">Lesson</SelectItem>
                <SelectItem value="exercise">Exercise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="description" className="text-right pt-2">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className="col-span-3"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="duration" className="text-right">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={formData.duration || ''}
              onChange={(e) => handleChange('duration', parseInt(e.target.value) || 0)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">Status</Label>
            <Select
              value={formData.status || 'draft'}
              onValueChange={(value) => handleChange('status', value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Advanced options */}
          {showAdvancedFeatures && (
            <>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Learning Objectives</Label>
                <div className="col-span-3 space-y-2">
                  {formData.learningObjectives?.map((objective, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={objective}
                        onChange={(e) => handleObjectiveChange(index, e.target.value)}
                        placeholder={`Objective ${index + 1}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeObjective(index)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addObjective} className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Objective
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="completionCriteria" className="text-right pt-2">Completion Criteria</Label>
                <Textarea
                  id="completionCriteria"
                  value={formData.completionCriteria || ''}
                  onChange={(e) => handleChange('completionCriteria', e.target.value)}
                  className="col-span-3"
                  rows={2}
                />
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="assessmentMethod" className="text-right">Assessment Method</Label>
                <Select
                  value={formData.assessmentMethod || ''}
                  onValueChange={(value) => handleChange('assessmentMethod', value)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select assessment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="written-test">Written Test</SelectItem>
                    <SelectItem value="practical-exam">Practical Exam</SelectItem>
                    <SelectItem value="simulation">Simulation</SelectItem>
                    <SelectItem value="observation">Instructor Observation</SelectItem>
                    <SelectItem value="self-assessment">Self-Assessment</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Regulatory References</Label>
                <div className="col-span-3 space-y-2">
                  {formData.regulatoryReferences?.map((reference, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={reference}
                        onChange={(e) => handleReferenceChange(index, e.target.value)}
                        placeholder={`Reference ${index + 1}`}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeReference(index)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addReference} className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Reference
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Template Selection Dialog
interface TemplateSelectionProps {
  templates: SyllabusTemplate[];
  isOpen: boolean;
  onClose: () => void;
  onApply: (templateId: string) => void;
}

const TemplateSelection: React.FC<TemplateSelectionProps> = ({
  templates,
  isOpen,
  onClose,
  onApply,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply Template</DialogTitle>
          <DialogDescription>
            Select a template to apply to your syllabus. This will add new elements to your existing structure.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors ${
                  selectedTemplate === template.id ? 'border-primary bg-primary/10' : ''
                }`}
                onClick={() => setSelectedTemplate(template.id)}
              >
                <div className="font-medium">{template.name}</div>
                <div className="text-sm text-gray-500 mt-1">{template.description}</div>
                <div className="flex mt-2">
                  <Badge variant="outline" className="mr-2">
                    {template.elements.length} elements
                  </Badge>
                  {template.regulatoryFramework && (
                    <Badge variant="outline">
                      {template.regulatoryFramework}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={() => selectedTemplate && onApply(selectedTemplate)} 
            disabled={!selectedTemplate}
          >
            Apply Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Main SyllabusBuilder Component
const SyllabusBuilder: React.FC<SyllabusBuilderProps> = ({
  initialData,
  templates = [],
  readOnly = false,
  onSave,
  onPublish,
  onTemplateApply,
  showAdvancedFeatures = true,
}) => {
  const [syllabus, setSyllabus] = useState<SyllabusData | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [editingElement, setEditingElement] = useState<SyllabusElement | null>(null);
  const [activeTab, setActiveTab] = useState('structure');
  
  // Initialize syllabus data
  useEffect(() => {
    if (initialData) {
      setSyllabus({ ...initialData });
    } else {
      // Create a new empty syllabus
      const newSyllabus: SyllabusData = {
        id: `syllabus-${Date.now()}`,
        title: 'New Syllabus',
        description: '',
        version: 1,
        status: 'draft',
        author: 'Current User',
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        organization: 'Your Organization',
        elements: [],
      };
      setSyllabus(newSyllabus);
    }
  }, [initialData]);
  
  // Calculate total duration and compliance score
  useEffect(() => {
    if (!syllabus) return;
    
    const calculateTotalDuration = (elements: SyllabusElement[]): number => {
      return elements.reduce((total, element) => {
        let duration = element.duration || 0;
        if (element.children && element.children.length > 0) {
          duration += calculateTotalDuration(element.children);
        }
        return total + duration;
      }, 0);
    };
    
    const calculateComplianceScore = (elements: SyllabusElement[]): number => {
      let totalElements = 0;
      let compliantElements = 0;
      let partialElements = 0;
      
      const countElements = (elements: SyllabusElement[]) => {
        for (const element of elements) {
          totalElements++;
          
          if (element.complianceStatus) {
            if (element.complianceStatus.status === 'compliant') {
              compliantElements++;
            } else if (element.complianceStatus.status === 'partial') {
              partialElements++;
            }
          }
          
          if (element.children && element.children.length > 0) {
            countElements(element.children);
          }
        }
      };
      
      countElements(elements);
      
      if (totalElements === 0) return 0;
      
      return ((compliantElements + (partialElements * 0.5)) / totalElements) * 100;
    };
    
    const totalDuration = calculateTotalDuration(syllabus.elements);
    const complianceScore = calculateComplianceScore(syllabus.elements);
    
    setSyllabus((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        totalDuration,
        complianceScore,
      };
    });
  }, [syllabus?.elements]);
  
  // Save syllabus
  const handleSave = useCallback(() => {
    if (!syllabus || !onSave) return;
    
    const updatedSyllabus: SyllabusData = {
      ...syllabus,
      lastModified: new Date().toISOString(),
      version: syllabus.version + 1,
    };
    
    setSyllabus(updatedSyllabus);
    onSave(updatedSyllabus);
  }, [syllabus, onSave]);
  
  // Publish syllabus
  const handlePublish = useCallback(() => {
    if (!syllabus || !onPublish) return;
    
    const updatedSyllabus: SyllabusData = {
      ...syllabus,
      status: 'review',
      lastModified: new Date().toISOString(),
      version: syllabus.version + 1,
    };
    
    setSyllabus(updatedSyllabus);
    onPublish(updatedSyllabus);
  }, [syllabus, onPublish]);
  
  // Apply template
  const handleApplyTemplate = useCallback((templateId: string) => {
    if (!syllabus || !onTemplateApply) return;
    
    onTemplateApply(templateId, syllabus.id);
    setIsTemplateDialogOpen(false);
  }, [syllabus, onTemplateApply]);
  
  // Helper function to clone elements and all their children
  const cloneElement = (element: SyllabusElement, newParentId?: string): SyllabusElement => {
    const newElement: SyllabusElement = { 
      ...element,
      id: `${element.type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      parentId: newParentId,
      version: 1,
      lastModified: new Date().toISOString(),
    };
    
    if (element.children && element.children.length > 0) {
      newElement.children = element.children.map(child => cloneElement(child, newElement.id));
    }
    
    return newElement;
  };
  
  // Add a new element to the syllabus
  const handleAddElement = useCallback((type: 'module' | 'lesson' | 'exercise', parentId?: string) => {
    if (!syllabus) return;
    
    const newElement: SyllabusElement = {
      id: `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      description: '',
      status: 'draft',
      version: 1,
      lastModified: new Date().toISOString(),
      parentId,
      children: type !== 'exercise' ? [] : undefined,
    };
    
    if (parentId) {
      // Add as child of existing element
      setSyllabus((prev) => {
        if (!prev) return null;
        
        // Helper function to recursively find and update parent
        const updateParent = (elements: SyllabusElement[]): SyllabusElement[] => {
          return elements.map((element) => {
            if (element.id === parentId) {
              return {
                ...element,
                children: [...(element.children || []), newElement],
              };
            } else if (element.children && element.children.length > 0) {
              return {
                ...element,
                children: updateParent(element.children),
              };
            } else {
              return element;
            }
          });
        };
        
        return {
          ...prev,
          elements: updateParent(prev.elements),
        };
      });
    } else {
      // Add as top-level element
      setSyllabus((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          elements: [...prev.elements, newElement],
        };
      });
    }
    
    // Edit the new element
    setEditingElement(newElement);
  }, [syllabus]);
  
  // Edit an existing element
  const handleEditElement = useCallback((element: SyllabusElement) => {
    setEditingElement(element);
  }, []);
  
  // Save edited element
  const handleSaveElement = useCallback((updatedElement: SyllabusElement) => {
    if (!syllabus) return;
    
    // Helper function to recursively update element
    const updateElement = (elements: SyllabusElement[]): SyllabusElement[] => {
      return elements.map((element) => {
        if (element.id === updatedElement.id) {
          return updatedElement;
        } else if (element.children && element.children.length > 0) {
          return {
            ...element,
            children: updateElement(element.children),
          };
        } else {
          return element;
        }
      });
    };
    
    // Update the syllabus
    setSyllabus((prev) => {
      if (!prev) return null;
      
      if (updatedElement.parentId) {
        // Update child element
        return {
          ...prev,
          elements: updateElement(prev.elements),
        };
      } else {
        // Update top-level element
        return {
          ...prev,
          elements: updateElement(prev.elements),
        };
      }
    });
  }, [syllabus]);
  
  // Delete an element
  const handleDeleteElement = useCallback((elementId: string) => {
    if (!syllabus) return;
    
    // Helper function to recursively filter elements
    const filterElements = (elements: SyllabusElement[]): SyllabusElement[] => {
      return elements
        .filter((element) => element.id !== elementId)
        .map((element) => {
          if (element.children && element.children.length > 0) {
            return {
              ...element,
              children: filterElements(element.children),
            };
          } else {
            return element;
          }
        });
    };
    
    // Update the syllabus
    setSyllabus((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        elements: filterElements(prev.elements),
      };
    });
  }, [syllabus]);
  
  // Duplicate an element
  const handleDuplicateElement = useCallback((element: SyllabusElement) => {
    if (!syllabus) return;
    
    const duplicatedElement = cloneElement(element, element.parentId);
    
    // Find where to insert the duplicate
    if (element.parentId) {
      // Duplicate a child element
      setSyllabus((prev) => {
        if (!prev) return null;
        
        // Helper function to recursively find and update parent
        const updateParent = (elements: SyllabusElement[]): SyllabusElement[] => {
          return elements.map((el) => {
            if (el.id === element.parentId) {
              return {
                ...el,
                children: [...(el.children || []), duplicatedElement],
              };
            } else if (el.children && el.children.length > 0) {
              return {
                ...el,
                children: updateParent(el.children),
              };
            } else {
              return el;
            }
          });
        };
        
        return {
          ...prev,
          elements: updateParent(prev.elements),
        };
      });
    } else {
      // Duplicate a top-level element
      setSyllabus((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          elements: [...prev.elements, duplicatedElement],
        };
      });
    }
  }, [syllabus]);
  
  // Move an element
  const handleMoveElement = useCallback(
    (dragIndex: number, hoverIndex: number, dragId: string, hoverId: string, parentId: string | null) => {
      if (!syllabus) return;
      
      setSyllabus((prev) => {
        if (!prev) return null;
        
        // Helper function to move elements within the same parent
        const moveElementsInParent = (elements: SyllabusElement[], parentId: string | null): SyllabusElement[] => {
          // If this is the parent containing the elements to reorder
          if (elements.some(e => e.id === dragId && e.parentId === parentId) && 
              elements.some(e => e.id === hoverId && e.parentId === parentId)) {
            
            const result = [...elements];
            
            // Find the actual indices (they might not match dragIndex/hoverIndex if the arrays were filtered)
            const actualDragIndex = result.findIndex(e => e.id === dragId);
            const actualHoverIndex = result.findIndex(e => e.id === hoverId);
            
            if (actualDragIndex !== -1 && actualHoverIndex !== -1) {
              // Remove the drag element
              const [draggedItem] = result.splice(actualDragIndex, 1);
              
              // Insert at the new position
              result.splice(actualHoverIndex, 0, draggedItem);
            }
            
            return result;
          }
          
          // Otherwise, recursively search in children
          return elements.map(element => {
            if (element.children && element.children.length > 0) {
              return {
                ...element,
                children: moveElementsInParent(element.children, element.id),
              };
            }
            return element;
          });
        };
        
        return {
          ...prev,
          elements: moveElementsInParent(prev.elements, parentId),
        };
      });
    },
    [syllabus]
  );
  
  // Format time for display
  const formatTime = (minutes?: number): string => {
    if (!minutes) return '0m';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins}m`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}m`;
    }
  };
  
  if (!syllabus) {
    return <div>Loading...</div>;
  }
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-full">
        <Card className="flex-1">
          <CardHeader className="flex flex-row items-center justify-between p-6">
            <div>
              <CardTitle className="text-xl">{syllabus.title}</CardTitle>
              {syllabus.description && (
                <p className="text-sm text-gray-500 mt-1">{syllabus.description}</p>
              )}
            </div>
            {!readOnly && (
              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={() => setIsTemplateDialogOpen(true)}>
                  Apply Template
                </Button>
                <Button variant="outline" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button onClick={handlePublish}>
                  Submit for Review
                </Button>
              </div>
            )}
          </CardHeader>
          
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="lg:w-9/12">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="structure">Structure</TabsTrigger>
                    {showAdvancedFeatures && (
                      <>
                        <TabsTrigger value="compliance">Compliance</TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                      </>
                    )}
                  </TabsList>
                  
                  <TabsContent value="structure" className="mt-4">
                    {/* Toolbar */}
                    {!readOnly && (
                      <div className="flex mb-4 space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddElement('module')}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Module
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddElement('lesson')}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Lesson
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddElement('exercise')}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Exercise
                        </Button>
                      </div>
                    )}
                    
                    {/* Syllabus elements */}
                    <div className="border rounded-md p-4 min-h-[400px]">
                      {syllabus.elements.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-gray-500">
                          <p className="mb-4">No elements in syllabus yet.</p>
                          {!readOnly && (
                            <Button
                              variant="outline"
                              onClick={() => handleAddElement('module')}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Module
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {syllabus.elements.map((element, index) => (
                            <SyllabusElementItem
                              key={element.id}
                              element={element}
                              index={index}
                              parentId={null}
                              onEdit={handleEditElement}
                              onDelete={handleDeleteElement}
                              onDuplicate={handleDuplicateElement}
                              onMove={handleMoveElement}
                              onAddChild={handleAddElement}
                              level={0}
                              isLast={index === syllabus.elements.length - 1}
                              showAdvancedFeatures={showAdvancedFeatures}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>
                  
                  {showAdvancedFeatures && (
                    <>
                      <TabsContent value="compliance" className="mt-4">
                        <div className="border rounded-md p-6">
                          <h3 className="text-lg font-medium mb-4">Regulatory Compliance</h3>
                          
                          <div className="mb-6">
                            <div className="flex justify-between mb-2">
                              <p>Overall Compliance Score</p>
                              <p className="font-medium">{Math.round(syllabus.complianceScore || 0)}%</p>
                            </div>
                            <Progress value={syllabus.complianceScore || 0} className="h-2" />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border rounded-md p-4">
                              <h4 className="font-medium mb-2">Regulatory Framework</h4>
                              <p className="text-sm text-gray-600">
                                {syllabus.regulatoryFramework || 'No framework specified'}
                              </p>
                            </div>
                            
                            <div className="border rounded-md p-4">
                              <h4 className="font-medium mb-2">Compliance Gaps</h4>
                              <ul className="text-sm text-gray-600 list-disc list-inside">
                                {syllabus.elements.some(e => 
                                  e.complianceStatus?.status === 'non-compliant' || 
                                  e.complianceStatus?.status === 'partial'
                                ) ? (
                                  syllabus.elements
                                    .filter(e => 
                                      e.complianceStatus?.status === 'non-compliant' || 
                                      e.complianceStatus?.status === 'partial'
                                    )
                                    .map(e => (
                                      <li key={e.id}>
                                        {e.title}: {e.complianceStatus?.issues?.join(', ') || 'Unspecified issues'}
                                      </li>
                                    ))
                                ) : (
                                  <li>No compliance gaps detected</li>
                                )}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="analytics" className="mt-4">
                        <div className="border rounded-md p-6">
                          <h3 className="text-lg font-medium mb-4">Syllabus Analytics</h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="border rounded-md p-4">
                              <h4 className="text-sm text-gray-500">Total Duration</h4>
                              <p className="text-2xl font-semibold mt-1">
                                {formatTime(syllabus.totalDuration)}
                              </p>
                            </div>
                            
                            <div className="border rounded-md p-4">
                              <h4 className="text-sm text-gray-500">Elements</h4>
                              <p className="text-2xl font-semibold mt-1">
                                {syllabus.elements.length}
                              </p>
                            </div>
                            
                            <div className="border rounded-md p-4">
                              <h4 className="text-sm text-gray-500">Last Updated</h4>
                              <p className="text-2xl font-semibold mt-1">
                                {new Date(syllabus.lastModified).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border rounded-md p-4">
                              <h4 className="font-medium mb-2">Element Distribution</h4>
                              <div className="h-40 flex items-end space-x-4">
                                {/* This would be replaced with a real chart in a full implementation */}
                                <div className="flex flex-col items-center">
                                  <div className="w-16 bg-blue-500 rounded-t-md" style={{ height: '60%' }}></div>
                                  <p className="text-xs mt-1">Modules</p>
                                </div>
                                <div className="flex flex-col items-center">
                                  <div className="w-16 bg-green-500 rounded-t-md" style={{ height: '100%' }}></div>
                                  <p className="text-xs mt-1">Lessons</p>
                                </div>
                                <div className="flex flex-col items-center">
                                  <div className="w-16 bg-purple-500 rounded-t-md" style={{ height: '80%' }}></div>
                                  <p className="text-xs mt-1">Exercises</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="border rounded-md p-4">
                              <h4 className="font-medium mb-2">Completion Status</h4>
                              <div className="h-40 flex items-center justify-center">
                                {/* This would be replaced with a real chart in a full implementation */}
                                <div className="w-32 h-32 rounded-full border-8 border-blue-500 flex items-center justify-center">
                                  <p className="text-xl font-semibold">75%</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </TabsContent>
                    </>
                  )}
                </Tabs>
              </div>
              
              <div className="lg:w-3/12">
                <div className="border rounded-md p-4 mb-4">
                  <h3 className="font-medium mb-3">Syllabus Details</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <Badge variant={
                        syllabus.status === 'approved' ? 'default' : 
                        syllabus.status === 'review' ? 'secondary' : 'outline'
                      }>
                        {syllabus.status.charAt(0).toUpperCase() + syllabus.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Version</p>
                      <p>{syllabus.version}.0</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Created by</p>
                      <p>{syllabus.author}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Organization</p>
                      <p>{syllabus.organization}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Created on</p>
                      <p>{new Date(syllabus.createdAt).toLocaleDateString()}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Last modified</p>
                      <p>{new Date(syllabus.lastModified).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                
                {showAdvancedFeatures && (
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-3">Actions</h3>
                    
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start" disabled={readOnly}>
                        <FileText className="h-4 w-4 mr-2" />
                        Export as PDF
                      </Button>
                      
                      <Button variant="outline" className="w-full justify-start" disabled={readOnly}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate Syllabus
                      </Button>
                      
                      <Button variant="outline" className="w-full justify-start text-red-500 hover:text-red-500" disabled={readOnly}>
                        <Trash className="h-4 w-4 mr-2" />
                        Delete Syllabus
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Element Editor Dialog */}
        <ElementEditor
          element={editingElement}
          isOpen={!!editingElement}
          onClose={() => setEditingElement(null)}
          onSave={handleSaveElement}
          showAdvancedFeatures={showAdvancedFeatures}
        />
        
        {/* Template Selection Dialog */}
        <TemplateSelection
          templates={templates}
          isOpen={isTemplateDialogOpen}
          onClose={() => setIsTemplateDialogOpen(false)}
          onApply={handleApplyTemplate}
        />
      </div>
    </DndProvider>
  );
};

export default SyllabusBuilder;
