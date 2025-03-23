// src/frontend/components/syllabus/SyllabusCustomization.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Tabs, Tab } from '../ui/Tabs';
import { Modal } from '../ui/Modal';
import { Alert } from '../ui/Alert';
import { SyllabusBuilder, TrainingElement } from './SyllabusBuilder';
import { ElementEditor } from './SyllabusBuilder';

// Types
export interface Template {
  id: string;
  name: string;
  description: string;
  elements: TrainingElement[];
  lastModified: Date;
  author: string;
  regulatoryFramework?: string;
}

export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  regulationReference: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface ComplianceValidationResult {
  isCompliant: boolean;
  requirementsMet: string[];
  requirementsNotMet: string[];
  requirementsPartiallyMet: string[];
  details: {
    requirementId: string;
    requirementName: string;
    status: 'met' | 'notMet' | 'partiallyMet';
    details: string;
  }[];
  overallStatus: 'compliant' | 'nonCompliant' | 'warning' | 'unknown';
}

export interface Exercise {
  id: string;
  title: string;
  description: string;
  type: string;
  duration: number;
  objectives: string[];
  assessmentCriteria: string[];
  resources: string[];
  tags: string[];
}

interface SyllabusVersion {
  id: string;
  name: string;
  createdAt: Date;
  author: string;
  elements: TrainingElement[];
}

// Components
interface VersionComparisonProps {
  currentVersion: SyllabusVersion;
  previousVersion: SyllabusVersion;
  onClose: () => void;
}

const VersionComparison: React.FC<VersionComparisonProps> = ({
  currentVersion,
  previousVersion,
  onClose
}) => {
  // Flatten elements for easier comparison
  const flattenElements = (elements: TrainingElement[]): Record<string, TrainingElement> => {
    const result: Record<string, TrainingElement> = {};
    
    const traverse = (element: TrainingElement) => {
      result[element.id] = element;
      if (element.children) {
        element.children.forEach(traverse);
      }
    };
    
    elements.forEach(traverse);
    return result;
  };
  
  const currentElements = flattenElements(currentVersion.elements);
  const previousElements = flattenElements(previousVersion.elements);
  
  // Find added, removed, and modified elements
  const addedElements: TrainingElement[] = [];
  const removedElements: TrainingElement[] = [];
  const modifiedElements: { previous: TrainingElement; current: TrainingElement }[] = [];
  
  // Check for added and modified elements
  Object.values(currentElements).forEach(element => {
    if (!previousElements[element.id]) {
      addedElements.push(element);
    } else if (
      element.title !== previousElements[element.id].title ||
      element.description !== previousElements[element.id].description ||
      element.order !== previousElements[element.id].order ||
      element.parentId !== previousElements[element.id].parentId
    ) {
      modifiedElements.push({
        previous: previousElements[element.id],
        current: element
      });
    }
  });
  
  // Check for removed elements
  Object.values(previousElements).forEach(element => {
    if (!currentElements[element.id]) {
      removedElements.push(element);
    }
  });

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Version Comparison"
      size="xl"
    >
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Current Version</h3>
            <p>{currentVersion.name}</p>
            <p className="text-xs text-gray-500">
              Created by {currentVersion.author} on {new Date(currentVersion.createdAt).toLocaleString()}
            </p>
          </div>
          
          <div className="text-right">
            <h3 className="text-sm font-medium text-gray-500">Previous Version</h3>
            <p>{previousVersion.name}</p>
            <p className="text-xs text-gray-500">
              Created by {previousVersion.author} on {new Date(previousVersion.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Added Elements */}
        {addedElements.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-green-700 mb-2">Added Elements ({addedElements.length})</h3>
            <div className="border rounded-md overflow-hidden">
              <div className="bg-green-50 px-4 py-2">
                <p className="text-sm text-green-700">These elements have been added in the current version</p>
              </div>
              <div className="divide-y">
                {addedElements.map(element => (
                  <div key={element.id} className="px-4 py-3">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{element.title}</p>
                        <p className="text-sm text-gray-500">{element.description}</p>
                        <p className="text-xs text-gray-400 mt-1">Type: {element.type}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Modified Elements */}
        {modifiedElements.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-blue-700 mb-2">Modified Elements ({modifiedElements.length})</h3>
            <div className="border rounded-md overflow-hidden">
              <div className="bg-blue-50 px-4 py-2">
                <p className="text-sm text-blue-700">These elements have been modified in the current version</p>
              </div>
              <div className="divide-y">
                {modifiedElements.map(({ previous, current }) => (
                  <div key={current.id} className="px-4 py-3">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                      </div>
                      <div className="ml-3 w-full">
                        {previous.title !== current.title && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-500">Title</p>
                            <div className="flex justify-between">
                              <p className="text-sm line-through text-red-700">{previous.title}</p>
                              <p className="text-sm text-green-700">{current.title}</p>
                            </div>
                          </div>
                        )}
                        
                        {previous.description !== current.description && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-500">Description</p>
                            <div className="flex justify-between">
                              <p className="text-sm line-through text-red-700">{previous.description}</p>
                              <p className="text-sm text-green-700">{current.description}</p>
                            </div>
                          </div>
                        )}
                        
                        {previous.order !== current.order && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-500">Order</p>
                            <div className="flex justify-between">
                              <p className="text-sm line-through text-red-700">Order: {previous.order}</p>
                              <p className="text-sm text-green-700">Order: {current.order}</p>
                            </div>
                          </div>
                        )}
                        
                        {previous.parentId !== current.parentId && (
                          <div className="mb-2">
                            <p className="text-xs text-gray-500">Parent</p>
                            <div className="flex justify-between">
                              <p className="text-sm line-through text-red-700">Parent: {previous.parentId || 'None'}</p>
                              <p className="text-sm text-green-700">Parent: {current.parentId || 'None'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Removed Elements */}
        {removedElements.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-red-700 mb-2">Removed Elements ({removedElements.length})</h3>
            <div className="border rounded-md overflow-hidden">
              <div className="bg-red-50 px-4 py-2">
                <p className="text-sm text-red-700">These elements have been removed in the current version</p>
              </div>
              <div className="divide-y">
                {removedElements.map(element => (
                  <div key={element.id} className="px-4 py-3">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{element.title}</p>
                        <p className="text-sm text-gray-500">{element.description}</p>
                        <p className="text-xs text-gray-400 mt-1">Type: {element.type}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {addedElements.length === 0 && modifiedElements.length === 0 && removedElements.length === 0 && (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No differences</h3>
            <p className="mt-1 text-sm text-gray-500">
              The current version is identical to the previous version.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};

interface ExerciseLibraryProps {
  exercises: Exercise[];
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}

const ExerciseLibrary: React.FC<ExerciseLibraryProps> = ({
  exercises,
  onSelect,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  
  // Get unique exercise types
  const exerciseTypes = Array.from(new Set(exercises.map(ex => ex.type)));
  
  // Filter exercises
  const filteredExercises = exercises.filter(exercise => {
    // Filter by type
    if (selectedType && exercise.type !== selectedType) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm && !exercise.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !exercise.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Exercise Library"
      size="lg"
    >
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full">
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search exercises..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>
          
          <select
            className="block w-full sm:w-auto pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">All Types</option>
            {exerciseTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {filteredExercises.map(exercise => (
          <div key={exercise.id} className="py-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{exercise.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{exercise.description}</p>
                
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {exercise.type}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {exercise.duration} min
                  </span>
                </div>
                
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700">Objectives:</p>
                  <ul className="mt-1 text-sm text-gray-500 list-disc list-inside">
                    {exercise.objectives.map((obj, index) => (
                      <li key={index}>{obj}</li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <Button
                variant="primary"
                size="small"
                onClick={() => onSelect(exercise)}
              >
                Use Exercise
              </Button>
            </div>
          </div>
        ))}
        
        {filteredExercises.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-gray-500">No exercises found matching your criteria.</p>
          </div>
        )}
      </div>
    </Modal>
  );
};

interface ComplianceDetailProps {
  validationResult: ComplianceValidationResult;
  requirements: ComplianceRequirement[];
  onClose: () => void;
}

const ComplianceDetail: React.FC<ComplianceDetailProps> = ({
  validationResult,
  requirements,
  onClose
}) => {
  // Get requirement details by ID
  const getRequirement = (id: string) => {
    return requirements.find(req => req.id === id);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Compliance Details"
      size="lg"
    >
      <div className="mb-6">
        <div className="flex items-center">
          <div className={`p-2 rounded-full mr-3 ${
            validationResult.isCompliant ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {validationResult.isCompliant ? (
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            ) : (
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            )}
          </div>
          <div>
            <h3 className="text-lg font-medium">
              {validationResult.isCompliant ? 'Syllabus is Compliant' : 'Compliance Issues Detected'}
            </h3>
            <p className="text-sm text-gray-500">
              {validationResult.requirementsMet.length} requirements met, 
              {validationResult.requirementsNotMet.length} not met, 
              {validationResult.requirementsPartiallyMet.length} partially met
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* Requirements Met */}
        {validationResult.requirementsMet.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-green-700 mb-2">Requirements Met ({validationResult.requirementsMet.length})</h3>
            <div className="border rounded-md overflow-hidden">
              <div className="bg-green-50 px-4 py-2">
                <p className="text-sm text-green-700">These regulatory requirements are fully satisfied</p>
              </div>
              <div className="divide-y">
                {validationResult.requirementsMet.map(reqId => {
                  const req = getRequirement(reqId);
                  if (!req) return null;
                  
                  return (
                    <div key={reqId} className="px-4 py-3">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mt-1">
                          <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{req.name}</p>
                          <p className="text-sm text-gray-500">{req.description}</p>
                          <p className="text-xs text-gray-400 mt-1">Ref: {req.regulationReference}</p>
                        </div>
                        <div className="ml-auto">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            req.priority === 'critical' ? 'bg-red-100 text-red-800' :
                            req.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            req.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {req.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Requirements Partially Met */}
        {validationResult.requirementsPartiallyMet.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-yellow-700 mb-2">Requirements Partially Met ({validationResult.requirementsPartiallyMet.length})</h3>
            <div className="border rounded-md overflow-hidden">
              <div className="bg-yellow-50 px-4 py-2">
                <p className="text-sm text-yellow-700">These regulatory requirements are partially satisfied and need attention</p>
              </div>
              <div className="divide-y">
                {validationResult.details
                  .filter(detail => detail.status === 'partiallyMet')
                  .map(detail => {
                    const req = getRequirement(detail.requirementId);
                    if (!req) return null;
                    
                    return (
                      <div key={detail.requirementId} className="px-4 py-3">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 mt-1">
                            <svg className="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{req.name}</p>
                            <p className="text-sm text-gray-500">{req.description}</p>
                            <p className="text-sm text-yellow-600 mt-1">{detail.details}</p>
                            <p className="text-xs text-gray-400 mt-1">Ref: {req.regulationReference}</p>
                          </div>
                          <div className="ml-auto">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              req.priority === 'critical' ? 'bg-red-100 text-red-800' :
                              req.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                              req.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {req.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
        
        {/* Requirements Not Met */}
        {validationResult.requirementsNotMet.length > 0 && (
          <div>
            <h3 className="text-lg font-medium text-red-700 mb-2">Requirements Not Met ({validationResult.requirementsNotMet.length})</h3>
            <div className="border rounded-md overflow-hidden">
              <div className="bg-red-50 px-4 py-2">
                <p className="text-sm text-red-700">These regulatory requirements are not satisfied and require immediate attention</p>
              </div>
              <div className="divide-y">
                {validationResult.details
                  .filter(detail => detail.status === 'notMet')
                  .map(detail => {
                    const req = getRequirement(detail.requirementId);
                    if (!req) return null;
                    
                    return (
                      <div key={detail.requirementId} className="px-4 py-3">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 mt-1">
                            <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{req.name}</p>
                            <p className="text-sm text-gray-500">{req.description}</p>
                            <p className="text-sm text-red-600 mt-1">{detail.details}</p>
                            <p className="text-xs text-gray-400 mt-1">Ref: {req.regulationReference}</p>
                          </div>
                          <div className="ml-auto">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              req.priority === 'critical' ? 'bg-red-100 text-red-800' :
                              req.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                              req.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {req.priority}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

// Main Syllabus Customization Component
interface SyllabusCustomizationProps {
  elements: TrainingElement[];
  templates: Template[];
  complianceRequirements: ComplianceRequirement[];
  exercises: Exercise[];
  versions: SyllabusVersion[];
  onSave: (elements: TrainingElement[]) => Promise<void>;
  onApplyTemplate: (templateId: string) => Promise<TrainingElement[]>;
  onCheckCompliance: (elements: TrainingElement[]) => Promise<ComplianceValidationResult>;
  onCreateVersion: (name: string, elements: TrainingElement[]) => Promise<void>;
  onBulkEdit: (elementIds: string[], updates: Partial<TrainingElement>) => Promise<void>;
}

export const SyllabusCustomization: React.FC<SyllabusCustomizationProps> = ({
  elements: initialElements,
  templates,
  complianceRequirements,
  exercises,
  versions,
  onSave,
  onApplyTemplate,
  onCheckCompliance,
  onCreateVersion,
  onBulkEdit
}) => {
  const [elements, setElements] = useState<TrainingElement[]>(initialElements);
  const [selectedElement, setSelectedElement] = useState<TrainingElement | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceValidationResult | null>(null);
  const [showComplianceDetails, setShowComplianceDetails] = useState(false);
  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false);
  const [showVersionComparison, setShowVersionComparison] = useState(false);
  const [showCreateVersion, setShowCreateVersion] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [selectedVersions, setSelectedVersions] = useState<{current: string; previous: string}>({
    current: '',
    previous: ''
  });
  const [selectedElementsForBulk, setSelectedElementsForBulk] = useState<string[]>([]);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [bulkEditValues, setBulkEditValues] = useState<Partial<TrainingElement>>({});

  // Handle element edit
  const handleElementEdit = (elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (element) {
      setSelectedElement(element);
      setIsEditorOpen(true);
    }
  };

  // Handle element save
  const handleElementSave = (updatedElement: TrainingElement) => {
    setElements(prevElements => 
      prevElements.map(el => 
        el.id === updatedElement.id ? updatedElement : el
      )
    );
    setIsEditorOpen(false);
    setSelectedElement(null);
  };

  // Save all changes
  const handleSaveChanges = async () => {
    setIsSaving(true);
    
    try {
      await onSave(elements);
      
      setAlertMessage({
        type: 'success',
        message: 'Syllabus saved successfully.'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Error saving syllabus: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Apply template
  const handleApplyTemplate = async (templateId: string) => {
    try {
      const newElements = await onApplyTemplate(templateId);
      
      setElements(newElements);
      
      setAlertMessage({
        type: 'success',
        message: 'Template applied successfully.'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Error applying template: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Check compliance
  const handleCheckCompliance = async () => {
    try {
      const result = await onCheckCompliance(elements);
      
      setComplianceStatus(result);
      
      setAlertMessage({
        type: result.isCompliant ? 'success' : 'warning',
        message: result.isCompliant 
          ? 'Syllabus is compliant with all regulatory requirements.'
          : 'Compliance issues detected. Please review the compliance details.'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Error checking compliance: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Create version
  const handleCreateVersion = async () => {
    if (!versionName.trim()) {
      setAlertMessage({
        type: 'error',
        message: 'Please enter a version name.'
      });
      return;
    }
    
    try {
      await onCreateVersion(versionName, elements);
      
      setAlertMessage({
        type: 'success',
        message: 'Version created successfully.'
      });
      
      setShowCreateVersion(false);
      setVersionName('');
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Error creating version: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Compare versions
  const handleCompareVersions = () => {
    if (!selectedVersions.current || !selectedVersions.previous) {
      setAlertMessage({
        type: 'error',
        message: 'Please select both versions to compare.'
      });
      return;
    }
    
    setShowVersionComparison(true);
  };

  // Add exercise from library
  const handleSelectExercise = (exercise: Exercise) => {
    // Create a new training element from the exercise
    const newElement: TrainingElement = {
      id: `exercise-${Date.now()}`,
      type: 'exercise',
      title: exercise.title,
      description: exercise.description,
      order: 0, // Will need to be set based on where it's being added
      complianceStatus: 'unknown',
      // Additional properties specific to exercises could be added here
    };
    
    // Set the selected element for editing
    setSelectedElement(newElement);
    setIsEditorOpen(true);
    setShowExerciseLibrary(false);
  };

  // Handle bulk edit
  const handleBulkEdit = async () => {
    if (selectedElementsForBulk.length === 0 || Object.keys(bulkEditValues).length === 0) {
      setAlertMessage({
        type: 'error',
        message: 'Please select elements and specify changes.'
      });
      return;
    }
    
    try {
      await onBulkEdit(selectedElementsForBulk, bulkEditValues);
      
      // Update local state
      setElements(prevElements => 
        prevElements.map(el => 
          selectedElementsForBulk.includes(el.id) 
            ? { ...el, ...bulkEditValues } 
            : el
        )
      );
      
      setAlertMessage({
        type: 'success',
        message: `Updated ${selectedElementsForBulk.length} elements successfully.`
      });
      
      setBulkEditMode(false);
      setSelectedElementsForBulk([]);
      setBulkEditValues({});
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Error updating elements: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Toggle selection of an element for bulk edit
  const toggleElementSelection = (elementId: string) => {
    setSelectedElementsForBulk(prev => 
      prev.includes(elementId)
        ? prev.filter(id => id !== elementId)
        : [...prev, elementId]
    );
  };

  const tabs: Tab[] = [
    {
      id: 'visual-editor',
      label: 'Visual Editor',
      content: (
        <div>
          <SyllabusBuilder
            syllabusElements={elements}
            onSave={setElements}
            onElementEdit={handleElementEdit}
            onCheckCompliance={handleCheckCompliance}
            complianceStatus={complianceStatus ? {
              overallStatus: complianceStatus.overallStatus,
              message: complianceStatus.isCompliant
                ? 'Syllabus is compliant with all regulatory requirements.'
                : `Compliance issues detected: ${complianceStatus.requirementsNotMet.length} requirements not met, ${complianceStatus.requirementsPartiallyMet.length} partially met.`
            } : undefined}
            templates={templates.map(t => ({ id: t.id, name: t.name }))}
            onApplyTemplate={handleApplyTemplate}
          />
        </div>
      )
    },
    {
      id: 'compliance',
      label: 'Compliance Checking',
      content: (
        <div>
          <Card className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-medium mb-2 sm:mb-0">Regulatory Compliance Status</h3>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="primary"
                  onClick={handleCheckCompliance}
                >
                  Check Compliance
                </Button>
                
                {complianceStatus && (
                  <Button
                    variant="outline"
                    onClick={() => setShowComplianceDetails(true)}
                  >
                    View Details
                  </Button>
                )}
              </div>
            </div>
            
            {complianceStatus ? (
              <div className="mt-4">
                <div className={`p-4 rounded-md ${
                  complianceStatus.isCompliant ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {complianceStatus.isCompliant ? (
                        <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="ml-3">
                      <h3 className={`text-sm font-medium ${
                        complianceStatus.isCompliant ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {complianceStatus.isCompliant 
                          ? 'Syllabus is compliant with all regulatory requirements'
                          : 'Compliance issues detected'
                        }
                      </h3>
                      <div className="mt-2 text-sm">
                        <p>
                          Requirements met: <span className="font-medium">{complianceStatus.requirementsMet.length}</span><br/>
                          Requirements partially met: <span className="font-medium">{complianceStatus.requirementsPartiallyMet.length}</span><br/>
                          Requirements not met: <span className="font-medium">{complianceStatus.requirementsNotMet.length}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Requirements Summary */}
                <div className="mt-6">
                  <h4 className="text-base font-medium mb-2">Requirements Summary</h4>
                  <div className="overflow-hidden bg-white shadow sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                      {complianceRequirements.map(req => {
                        const status = complianceStatus.requirementsMet.includes(req.id)
                          ? 'met'
                          : complianceStatus.requirementsPartiallyMet.includes(req.id)
                            ? 'partiallyMet'
                            : 'notMet';
                            
                        return (
                          <li key={req.id}>
                            <div className="px-4 py-4 sm:px-6">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-blue-600 truncate">
                                  {req.name}
                                </p>
                                <div className="ml-2 flex-shrink-0 flex">
                                  <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    status === 'met' ? 'bg-green-100 text-green-800' :
                                    status === 'partiallyMet' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {status === 'met' ? 'Met' :
                                     status === 'partiallyMet' ? 'Partially Met' :
                                     'Not Met'}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2 sm:flex sm:justify-between">
                                <div className="sm:flex">
                                  <p className="flex items-center text-sm text-gray-500">
                                    {req.description}
                                  </p>
                                </div>
                                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                  <p>
                                    {req.regulationReference}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 bg-gray-50 rounded-md text-center">
                <p className="text-gray-500">
                  Click "Check Compliance" to validate your syllabus against regulatory requirements.
                </p>
              </div>
            )}
          </Card>
        </div>
      )
    },
    {
      id: 'content-management',
      label: 'Content Management',
      content: (
        <div className="space-y-6">
          {/* Exercise Library */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <h3 className="text-lg font-medium mb-2 sm:mb-0">Exercise Library</h3>
              
              <Button
                variant="primary"
                onClick={() => setShowExerciseLibrary(true)}
              >
                Browse Exercises
              </Button>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              The exercise library contains pre-configured exercises that you can add to your syllabus.
              Browse the library to find exercises matching your training needs.
            </p>
            
            {/* Exercise categories summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {Array.from(new Set(exercises.map(ex => ex.type))).map(type => {
                const count = exercises.filter(ex => ex.type === type).length;
                
                return (
                  <div key={type} className="bg-gray-50 rounded-md p-4">
                    <h4 className="font-medium text-gray-900">{type}</h4>
                    <p className="text-sm text-gray-500 mt-1">{count} exercises available</p>
                    <Button
                      variant="outline"
                      size="small"
                      className="mt-2"
                      onClick={() => {
                        setShowExerciseLibrary(true);
                        // In a real implementation, you would pre-filter by type
                      }}
                    >
                      View
                    </Button>
                  </div>
                );
              })}
            </div>
          </Card>
          
          {/* Version Management */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <h3 className="text-lg font-medium mb-2 sm:mb-0">Version Management</h3>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateVersion(true)}
                >
                  Create Version
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleCompareVersions}
                  disabled={versions.length < 2}
                >
                  Compare Versions
                </Button>
              </div>
            </div>
            
            {versions.length > 0 ? (
              <div className="overflow-hidden bg-white shadow sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {versions.map(version => (
                    <li key={version.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-blue-600 truncate">
                            {version.name}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              {new Date(version.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              Created by {version.author}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              checked={selectedVersions.current === version.id || selectedVersions.previous === version.id}
                              onChange={() => {
                                if (selectedVersions.current === version.id) {
                                  setSelectedVersions({...selectedVersions, current: ''});
                                } else if (selectedVersions.previous === version.id) {
                                  setSelectedVersions({...selectedVersions, previous: ''});
                                } else if (!selectedVersions.current) {
                                  setSelectedVersions({...selectedVersions, current: version.id});
                                } else if (!selectedVersions.previous) {
                                  setSelectedVersions({...selectedVersions, previous: version.id});
                                }
                              }}
                            />
                            <span className="ml-2">Select for comparison</span>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-md text-center">
                <p className="text-gray-500">
                  No versions available. Create a version to save the current state of your syllabus.
                </p>
              </div>
            )}
          </Card>
          
          {/* Bulk Edit */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <h3 className="text-lg font-medium mb-2 sm:mb-0">Bulk Edit</h3>
              
              <Button
                variant={bulkEditMode ? 'primary' : 'outline'}
                onClick={() => setBulkEditMode(!bulkEditMode)}
              >
                {bulkEditMode ? 'Exit Bulk Edit' : 'Start Bulk Edit'}
              </Button>
            </div>
            
            {bulkEditMode ? (
              <div>
                <p className="text-sm text-gray-500 mb-4">
                  Select elements from the list below and apply changes to all selected elements at once.
                </p>
                
                <div className="bg-blue-50 p-4 rounded-md mb-4">
                  <p className="text-sm text-blue-700">
                    <span className="font-medium">{selectedElementsForBulk.length}</span> elements selected
                  </p>
                </div>
                
                {/* Bulk edit form */}
                <div className="space-y-4 mb-6">
                  <div>
                    <label htmlFor="bulk-type" className="block text-sm font-medium text-gray-700 mb-1">
                      Update Type
                    </label>
                    <select
                      id="bulk-type"
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      value={bulkEditValues.type || ''}
                      onChange={(e) => setBulkEditValues({...bulkEditValues, type: e.target.value as 'module' | 'lesson' | 'exercise' || undefined})}
                    >
                      <option value="">No Change</option>
                      <option value="module">Module</option>
                      <option value="lesson">Lesson</option>
                      <option value="exercise">Exercise</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="bulk-complianceStatus" className="block text-sm font-medium text-gray-700 mb-1">
                      Update Compliance Status
                    </label>
                    <select
                      id="bulk-complianceStatus"
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                      value={bulkEditValues.complianceStatus || ''}
                      onChange={(e) => setBulkEditValues({...bulkEditValues, complianceStatus: e.target.value as 'compliant' | 'nonCompliant' | 'warning' | 'unknown' || undefined})}
                    >
                      <option value="">No Change</option>
                      <option value="compliant">Compliant</option>
                      <option value="nonCompliant">Non-Compliant</option>
                      <option value="warning">Warning</option>
                      <option value="unknown">Unknown</option>
                    </select>
                  </div>
                  
                  <Button
                    variant="primary"
                    onClick={handleBulkEdit}
                    disabled={selectedElementsForBulk.length === 0 || Object.keys(bulkEditValues).length === 0}
                  >
                    Apply Changes to Selected Elements
                  </Button>
                </div>
                
                {/* Elements selection list */}
                <div className="border rounded-md overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <p className="text-sm font-medium text-gray-700">
                      Select Elements to Edit
                    </p>
                  </div>
                  <div className="divide-y max-h-96 overflow-y-auto">
                    {elements.map(element => (
                      <div key={element.id} className="flex items-center px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          checked={selectedElementsForBulk.includes(element.id)}
                          onChange={() => toggleElementSelection(element.id)}
                        />
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{element.title}</p>
                          <p className="text-xs text-gray-500">Type: {element.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Use bulk edit to make the same changes to multiple elements at once.
                This is useful for updating attributes like compliance status or type for a group of elements.
              </p>
            )}
          </Card>
        </div>
      )
    }
  ];

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="syllabus-customization">
        {/* Alert message */}
        {alertMessage && (
          <Alert
            type={alertMessage.type}
            message={alertMessage.message}
            onClose={() => setAlertMessage(null)}
          />
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-wrap justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Customize Syllabus</h2>
          
          <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
            <Button
              variant="primary"
              onClick={handleSaveChanges}
              isLoading={isSaving}
              disabled={isSaving}
            >
              Save Changes
            </Button>
            
            <Button
              variant="outline"
              onClick={handleCheckCompliance}
            >
              Check Compliance
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowExerciseLibrary(true)}
            >
              Add from Library
            </Button>
          </div>
        </div>
        
        {/* Main Tabs */}
        <Tabs
          tabs={tabs}
          defaultTabId="visual-editor"
        />
        
        {/* Element Editor Modal */}
        {isEditorOpen && selectedElement && (
          <ElementEditor
            element={selectedElement}
            isOpen={isEditorOpen}
            onClose={() => {
              setIsEditorOpen(false);
              setSelectedElement(null);
            }}
            onSave={handleElementSave}
          />
        )}
        
        {/* Compliance Details Modal */}
        {showComplianceDetails && complianceStatus && (
          <ComplianceDetail
            validationResult={complianceStatus}
            requirements={complianceRequirements}
            onClose={() => setShowComplianceDetails(false)}
          />
        )}
        
        {/* Exercise Library Modal */}
        {showExerciseLibrary && (
          <ExerciseLibrary
            exercises={exercises}
            onSelect={handleSelectExercise}
            onClose={() => setShowExerciseLibrary(false)}
          />
        )}
        
        {/* Version Comparison Modal */}
        {showVersionComparison && (
          <VersionComparison
            currentVersion={versions.find(v => v.id === selectedVersions.current)!}
            previousVersion={versions.find(v => v.id === selectedVersions.previous)!}
            onClose={() => setShowVersionComparison(false)}
          />
        )}
        
        {/* Create Version Modal */}
        {showCreateVersion && (
          <Modal
            isOpen={true}
            onClose={() => setShowCreateVersion(false)}
            title="Create Version"
            size="md"
            footer={
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateVersion(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCreateVersion}
                >
                  Create
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="version-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Version Name
                </label>
                <input
                  type="text"
                  id="version-name"
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder="e.g. Initial Draft, Compliance Update, etc."
                />
              </div>
              
              <p className="text-sm text-gray-500">
                Creating a version saves the current state of your syllabus. 
                You can revert to this version later or compare it with other versions.
              </p>
            </div>
          </Modal>
        )}
      </div>
    </DndProvider>
  );
};