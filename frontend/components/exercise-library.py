// src/frontend/components/exercises/ExerciseLibrary.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DataTable, Column } from '../ui/DataTable';
import { Alert } from '../ui/Alert';
import { Modal } from '../ui/Modal';

// Types
export interface Exercise {
  id: string;
  title: string;
  description: string;
  type: 'knowledge_check' | 'simulation' | 'practical' | 'assessment';
  duration: number; // in minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  objectives: string[];
  assessmentCriteria: string[];
  resources: string[];
  tags: string[];
  author: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'published' | 'archived';
  complianceStatus?: 'compliant' | 'non_compliant' | 'pending_review';
  relatedRegulations?: string[];
}

export interface ExerciseFilter {
  type?: string;
  difficulty?: string;
  status?: string;
  searchTerm?: string;
  tags?: string[];
}

interface ExerciseFormData {
  title: string;
  description: string;
  type: string;
  duration: number;
  difficulty: string;
  objectives: string[];
  assessmentCriteria: string[];
  resources: string[];
  tags: string[];
  status: string;
  relatedRegulations?: string[];
}

// Exercise Library Component
interface ExerciseLibraryProps {
  exercises: Exercise[];
  tags: string[];
  regulations: { id: string; code: string; title: string }[];
  onCreateExercise: (exercise: Omit<Exercise, 'id' | 'author' | 'createdAt' | 'updatedAt'>) => Promise<Exercise>;
  onUpdateExercise: (id: string, updates: Partial<Exercise>) => Promise<Exercise>;
  onDeleteExercise: (id: string) => Promise<void>;
  onDuplicateExercise: (id: string) => Promise<Exercise>;
  onImportExercises: (file: File) => Promise<{ success: number; failed: number }>;
  onExportExercises: (ids: string[]) => Promise<void>;
}

export const ExerciseLibrary: React.FC<ExerciseLibraryProps> = ({
  exercises,
  tags,
  regulations,
  onCreateExercise,
  onUpdateExercise,
  onDeleteExercise,
  onDuplicateExercise,
  onImportExercises,
  onExportExercises
}) => {
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>(exercises);
  const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<ExerciseFilter>({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [formData, setFormData] = useState<ExerciseFormData>({
    title: '',
    description: '',
    type: 'knowledge_check',
    duration: 30,
    difficulty: 'intermediate',
    objectives: [''],
    assessmentCriteria: [''],
    resources: [''],
    tags: [],
    status: 'draft'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Update filtered exercises when exercises or filters change
  useEffect(() => {
    let filtered = [...exercises];
    
    if (filter.type) {
      filtered = filtered.filter(ex => ex.type === filter.type);
    }
    
    if (filter.difficulty) {
      filtered = filtered.filter(ex => ex.difficulty === filter.difficulty);
    }
    
    if (filter.status) {
      filtered = filtered.filter(ex => ex.status === filter.status);
    }
    
    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      filtered = filtered.filter(ex => 
        ex.title.toLowerCase().includes(term) || 
        ex.description.toLowerCase().includes(term) ||
        ex.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }
    
    if (filter.tags && filter.tags.length > 0) {
      filtered = filtered.filter(ex => 
        filter.tags?.some(tag => ex.tags.includes(tag))
      );
    }
    
    setFilteredExercises(filtered);
  }, [exercises, filter]);

  // Reset form data
  const resetFormData = () => {
    setFormData({
      title: '',
      description: '',
      type: 'knowledge_check',
      duration: 30,
      difficulty: 'intermediate',
      objectives: [''],
      assessmentCriteria: [''],
      resources: [''],
      tags: [],
      status: 'draft'
    });
  };

  // Set form data from exercise
  const setFormDataFromExercise = (exercise: Exercise) => {
    setFormData({
      title: exercise.title,
      description: exercise.description,
      type: exercise.type,
      duration: exercise.duration,
      difficulty: exercise.difficulty,
      objectives: [...exercise.objectives],
      assessmentCriteria: [...exercise.assessmentCriteria],
      resources: [...exercise.resources],
      tags: [...exercise.tags],
      status: exercise.status,
      relatedRegulations: exercise.relatedRegulations
    });
  };

  // Handle creating new exercise
  const handleCreateExercise = async () => {
    setIsSubmitting(true);
    
    try {
      // Validate non-empty arrays
      const objectives = formData.objectives.filter(item => item.trim() !== '');
      const assessmentCriteria = formData.assessmentCriteria.filter(item => item.trim() !== '');
      const resources = formData.resources.filter(item => item.trim() !== '');
      
      if (objectives.length === 0) {
        throw new Error('Please add at least one learning objective');
      }
      
      if (assessmentCriteria.length === 0) {
        throw new Error('Please add at least one assessment criterion');
      }
      
      const newExercise = await onCreateExercise({
        title: formData.title,
        description: formData.description,
        type: formData.type as any,
        duration: formData.duration,
        difficulty: formData.difficulty as any,
        objectives,
        assessmentCriteria,
        resources,
        tags: formData.tags,
        status: formData.status as any,
        relatedRegulations: formData.relatedRegulations
      });
      
      setAlertMessage({
        type: 'success',
        message: 'Exercise created successfully'
      });
      
      setIsCreateModalOpen(false);
      resetFormData();
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to create exercise: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle updating exercise
  const handleUpdateExercise = async () => {
    if (!selectedExercise) return;
    
    setIsSubmitting(true);
    
    try {
      // Validate non-empty arrays
      const objectives = formData.objectives.filter(item => item.trim() !== '');
      const assessmentCriteria = formData.assessmentCriteria.filter(item => item.trim() !== '');
      const resources = formData.resources.filter(item => item.trim() !== '');
      
      if (objectives.length === 0) {
        throw new Error('Please add at least one learning objective');
      }
      
      if (assessmentCriteria.length === 0) {
        throw new Error('Please add at least one assessment criterion');
      }
      
      await onUpdateExercise(selectedExercise.id, {
        title: formData.title,
        description: formData.description,
        type: formData.type as any,
        duration: formData.duration,
        difficulty: formData.difficulty as any,
        objectives,
        assessmentCriteria,
        resources,
        tags: formData.tags,
        status: formData.status as any,
        relatedRegulations: formData.relatedRegulations
      });
      
      setAlertMessage({
        type: 'success',
        message: 'Exercise updated successfully'
      });
      
      setIsEditModalOpen(false);
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to update exercise: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle deleting exercise
  const handleDeleteExercise = async () => {
    if (!selectedExercise) return;
    
    setIsSubmitting(true);
    
    try {
      await onDeleteExercise(selectedExercise.id);
      
      setAlertMessage({
        type: 'success',
        message: 'Exercise deleted successfully'
      });
      
      setIsDeleteModalOpen(false);
      setSelectedExercise(null);
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to delete exercise: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle duplicating exercise
  const handleDuplicateExercise = async (id: string) => {
    try {
      const duplicatedExercise = await onDuplicateExercise(id);
      
      setAlertMessage({
        type: 'success',
        message: 'Exercise duplicated successfully'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to duplicate exercise: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Handle importing exercises
  const handleImportExercises = async () => {
    if (!importFile) return;
    
    setIsSubmitting(true);
    
    try {
      const result = await onImportExercises(importFile);
      
      setAlertMessage({
        type: 'success',
        message: `Imported ${result.success} exercises successfully. ${result.failed > 0 ? `Failed to import ${result.failed} exercises.` : ''}`
      });
      
      setIsImportModalOpen(false);
      setImportFile(null);
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to import exercises: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle exporting selected exercises
  const handleExportSelectedExercises = async () => {
    if (selectedExercises.size === 0) {
      setAlertMessage({
        type: 'error',
        message: 'Please select at least one exercise to export'
      });
      return;
    }
    
    try {
      await onExportExercises(Array.from(selectedExercises));
      
      setAlertMessage({
        type: 'success',
        message: `Exported ${selectedExercises.size} exercises successfully`
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to export exercises: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle multi-field input change (objectives, criteria, resources)
  const handleArrayItemChange = (field: 'objectives' | 'assessmentCriteria' | 'resources', index: number, value: string) => {
    setFormData(prev => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return { ...prev, [field]: newArray };
    });
  };

  // Add new item to array field
  const handleAddArrayItem = (field: 'objectives' | 'assessmentCriteria' | 'resources') => {
    setFormData(prev => {
      return { ...prev, [field]: [...prev[field], ''] };
    });
  };

  // Remove item from array field
  const handleRemoveArrayItem = (field: 'objectives' | 'assessmentCriteria' | 'resources', index: number) => {
    setFormData(prev => {
      const newArray = [...prev[field]];
      newArray.splice(index, 1);
      return { ...prev, [field]: newArray };
    });
  };

  // Handle tag selection change
  const handleTagChange = (tag: string) => {
    setFormData(prev => {
      if (prev.tags.includes(tag)) {
        return { ...prev, tags: prev.tags.filter(t => t !== tag) };
      } else {
        return { ...prev, tags: [...prev.tags, tag] };
      }
    });
  };

  // Handle regulation selection change
  const handleRegulationChange = (regulationId: string) => {
    setFormData(prev => {
      const currentRegs = prev.relatedRegulations || [];
      if (currentRegs.includes(regulationId)) {
        return { ...prev, relatedRegulations: currentRegs.filter(r => r !== regulationId) };
      } else {
        return { ...prev, relatedRegulations: [...currentRegs, regulationId] };
      }
    });
  };

  // Handle row selection
  const handleRowSelect = (id: string, selected: boolean) => {
    setSelectedExercises(prev => {
      const newSelected = new Set(prev);
      if (selected) {
        newSelected.add(id);
      } else {
        newSelected.delete(id);
      }
      return newSelected;
    });
  };

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedExercises(new Set(filteredExercises.map(ex => ex.id)));
    } else {
      setSelectedExercises(new Set());
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-800';
    
    switch (status) {
      case 'draft':
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        break;
      case 'published':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'archived':
        bgColor = 'bg-gray-100';
        textColor = 'text-gray-800';
        break;
      case 'compliant':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'non_compliant':
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        break;
      case 'pending_review':
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        break;
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
      </span>
    );
  };

  // Get difficulty badge
  const getDifficultyBadge = (difficulty: string) => {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-800';
    
    switch (difficulty) {
      case 'beginner':
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'intermediate':
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        break;
      case 'advanced':
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        break;
      case 'expert':
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        break;
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
      </span>
    );
  };

  // Table columns
  const columns: Column<Exercise>[] = [
    {
      key: 'selection',
      header: <input 
        type="checkbox" 
        checked={selectedExercises.size === filteredExercises.length && filteredExercises.length > 0}
        onChange={(e) => handleSelectAll(e.target.checked)}
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
      />,
      render: (exercise) => (
        <input 
          type="checkbox" 
          checked={selectedExercises.has(exercise.id)}
          onChange={(e) => handleRowSelect(exercise.id, e.target.checked)}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      )
    },
    {
      key: 'title',
      header: 'Title',
      render: (exercise) => (
        <div>
          <div className="font-medium text-gray-900">{exercise.title}</div>
          <div className="text-sm text-gray-500 truncate max-w-xs">{exercise.description}</div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'type',
      header: 'Type',
      render: (exercise) => (
        <span className="capitalize">{exercise.type.replace('_', ' ')}</span>
      ),
      sortable: true
    },
    {
      key: 'difficulty',
      header: 'Difficulty',
      render: (exercise) => getDifficultyBadge(exercise.difficulty),
      sortable: true
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (exercise) => `${exercise.duration} min`,
      sortable: true
    },
    {
      key: 'status',
      header: 'Status',
      render: (exercise) => getStatusBadge(exercise.status),
      sortable: true
    },
    {
      key: 'tags',
      header: 'Tags',
      render: (exercise) => (
        <div className="flex flex-wrap gap-1">
          {exercise.tags.slice(0, 3).map((tag, index) => (
            <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
              {tag}
            </span>
          ))}
          {exercise.tags.length > 3 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
              +{exercise.tags.length - 3}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (exercise) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedExercise(exercise);
              setFormDataFromExercise(exercise);
              setIsEditModalOpen(true);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="Edit"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDuplicateExercise(exercise.id);
            }}
            className="text-green-600 hover:text-green-900"
            title="Duplicate"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedExercise(exercise);
              setIsDeleteModalOpen(true);
            }}
            className="text-red-600 hover:text-red-900"
            title="Delete"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="exercise-library">
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exercise Library</h1>
        <p className="text-gray-500">Manage and browse training exercises</p>
      </div>
      
      {/* Filters and Actions */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-medium">Filters</h2>
          
          <div className="flex space-x-2 mt-2 sm:mt-0">
            <Button
              variant="primary"
              onClick={() => {
                resetFormData();
                setIsCreateModalOpen(true);
              }}
            >
              Create Exercise
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setIsImportModalOpen(true)}
            >
              Import
            </Button>
            
            <Button
              variant="outline"
              onClick={handleExportSelectedExercises}
              disabled={selectedExercises.size === 0}
            >
              Export Selected
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Input
              label="Search"
              type="text"
              value={filter.searchTerm || ''}
              onChange={(e) => setFilter({ ...filter, searchTerm: e.target.value })}
              placeholder="Search by title, description, or tags"
            />
          </div>
          
          <div>
            <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              id="type-filter"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={filter.type || ''}
              onChange={(e) => setFilter({ ...filter, type: e.target.value || undefined })}
            >
              <option value="">All Types</option>
              <option value="knowledge_check">Knowledge Check</option>
              <option value="simulation">Simulation</option>
              <option value="practical">Practical</option>
              <option value="assessment">Assessment</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="difficulty-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty
            </label>
            <select
              id="difficulty-filter"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={filter.difficulty || ''}
              onChange={(e) => setFilter({ ...filter, difficulty: e.target.value || undefined })}
            >
              <option value="">All Difficulties</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={filter.status || ''}
              onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        
        {tags.length > 0 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <button
                  key={index}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    filter.tags?.includes(tag) 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                  onClick={() => {
                    const currentTags = filter.tags || [];
                    if (currentTags.includes(tag)) {
                      setFilter({ 
                        ...filter, 
                        tags: currentTags.filter(t => t !== tag)
                      });
                    } else {
                      setFilter({ 
                        ...filter, 
                        tags: [...currentTags, tag]
                      });
                    }
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>
      
      {/* Exercises Table */}
      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-medium">Exercises</h2>
          <p className="text-sm text-gray-500">
            {filteredExercises.length} exercise{filteredExercises.length !== 1 ? 's' : ''} found
          </p>
        </div>
        
        <DataTable
          columns={columns}
          data={filteredExercises}
          keyExtractor={(exercise) => exercise.id}
          onRowClick={(exercise) => {
            setSelectedExercise(exercise);
            setFormDataFromExercise(exercise);
            setIsEditModalOpen(true);
          }}
          pagination={{
            pageSize: 10,
            totalItems: filteredExercises.length,
            currentPage: 1,
            onPageChange: () => {}
          }}
          emptyMessage="No exercises found matching your filters"
        />
      </Card>
      
      {/* Create Exercise Modal */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Exercise"
          size="xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title*
              </label>
              <input
                type="text"
                id="title"
                name="title"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Type*
              </label>
              <select
                id="type"
                name="type"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={formData.type}
                onChange={handleInputChange}
                required
              >
                <option value="knowledge_check">Knowledge Check</option>
                <option value="simulation">Simulation</option>
                <option value="practical">Practical</option>
                <option value="assessment">Assessment</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty*
              </label>
              <select
                id="difficulty"
                name="difficulty"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={formData.difficulty}
                onChange={handleInputChange}
                required
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)*
              </label>
              <input
                type="number"
                id="duration"
                name="duration"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={formData.duration}
                onChange={handleInputChange}
                min="1"
                required
              />
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description*
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={formData.description}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Learning Objectives*
              </label>
              {formData.objectives.map((objective, index) => (
                <div key={index} className="flex mb-2">
                  <input
                    type="text"
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    value={objective}
                    onChange={(e) => handleArrayItemChange('objectives', index, e.target.value)}
                    placeholder={`Objective ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="ml-2 text-red-600 hover:text-red-900"
                    onClick={() => handleRemoveArrayItem('objectives', index)}
                    disabled={formData.objectives.length <= 1}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="mt-1 text-sm text-blue-600 hover:text-blue-500"
                onClick={() => handleAddArrayItem('objectives')}
              >
                + Add Objective
              </button>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assessment Criteria*
              </label>
              {formData.assessmentCriteria.map((criterion, index) => (
                <div key={index} className="flex mb-2">
                  <input
                    type="text"
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    value={criterion}
                    onChange={(e) => handleArrayItemChange('assessmentCriteria', index, e.target.value)}
                    placeholder={`Criterion ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="ml-2 text-red-600 hover:text-red-900"
                    onClick={() => handleRemoveArrayItem('assessmentCriteria', index)}
                    disabled={formData.assessmentCriteria.length <= 1}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="mt-1 text-sm text-blue-600 hover:text-blue-500"
                onClick={() => handleAddArrayItem('assessmentCriteria')}
              >
                + Add Criterion
              </button>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resources
              </label>
              {formData.resources.map((resource, index) => (
                <div key={index} className="flex mb-2">
                  <input
                    type="text"
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    value={resource}
                    onChange={(e) => handleArrayItemChange('resources', index, e.target.value)}
                    placeholder={`Resource ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="ml-2 text-red-600 hover:text-red-900"
                    onClick={() => handleRemoveArrayItem('resources', index)}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="mt-1 text-sm text-blue-600 hover:text-blue-500"
                onClick={() => handleAddArrayItem('resources')}
              >
                + Add Resource
              </button>
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status*
              </label>
              <select
                id="status"
                name="status"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={formData.status}
                onChange={handleInputChange}
                required
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md min-h-[100px] max-h-[200px] overflow-y-auto">
                {tags.map((tag, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      formData.tags.includes(tag) 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                    onClick={() => handleTagChange(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            
            {regulations.length > 0 && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Related Regulations
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 border border-gray-300 rounded-md min-h-[100px] max-h-[200px] overflow-y-auto">
                  {regulations.map((reg) => (
                    <div key={reg.id} className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        id={`reg-${reg.id}`}
                        checked={formData.relatedRegulations?.includes(reg.id) || false}
                        onChange={() => handleRegulationChange(reg.id)}
                      />
                      <label htmlFor={`reg-${reg.id}`} className="ml-2 text-sm text-gray-700">
                        {reg.code}: {reg.title}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateExercise}
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Create Exercise
            </Button>
          </div>
        </Modal>
      )}
      
      {/* Edit Exercise Modal */}
      {isEditModalOpen && selectedExercise && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Exercise"
          size="xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">
                Title*
              </label>
              <input
                type="text"
                id="edit-title"
                name="title"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div>
              <label htmlFor="edit-type" className="block text-sm font-medium text-gray-700 mb-1">
                Type*
              </label>
              <select
                id="edit-type"
                name="type"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={formData.type}
                onChange={handleInputChange}
                required
              >
                <option value="knowledge_check">Knowledge Check</option>
                <option value="simulation">Simulation</option>
                <option value="practical">Practical</option>
                <option value="assessment">Assessment</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="edit-difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty*
              </label>
              <select
                id="edit-difficulty"
                name="difficulty"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={formData.difficulty}
                onChange={handleInputChange}
                required
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="edit-duration" className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)*
              </label>
              <input
                type="number"
                id="edit-duration"
                name="duration"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={formData.duration}
                onChange={handleInputChange}
                min="1"
                required
              />
            </div>
            
            <div className="md:col-span-2">
              <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description*
              </label>
              <textarea
                id="edit-description"
                name="description"
                rows={3}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={formData.description}
                onChange={handleInputChange}
                required
              />
            </div>
            
            {/* Other form fields remain the same as in Create modal */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Learning Objectives*
              </label>
              {formData.objectives.map((objective, index) => (
                <div key={index} className="flex mb-2">
                  <input
                    type="text"
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    value={objective}
                    onChange={(e) => handleArrayItemChange('objectives', index, e.target.value)}
                    placeholder={`Objective ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="ml-2 text-red-600 hover:text-red-900"
                    onClick={() => handleRemoveArrayItem('objectives', index)}
                    disabled={formData.objectives.length <= 1}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="mt-1 text-sm text-blue-600 hover:text-blue-500"
                onClick={() => handleAddArrayItem('objectives')}
              >
                + Add Objective
              </button>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assessment Criteria*
              </label>
              {formData.assessmentCriteria.map((criterion, index) => (
                <div key={index} className="flex mb-2">
                  <input
                    type="text"
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    value={criterion}
                    onChange={(e) => handleArrayItemChange('assessmentCriteria', index, e.target.value)}
                    placeholder={`Criterion ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="ml-2 text-red-600 hover:text-red-900"
                    onClick={() => handleRemoveArrayItem('assessmentCriteria', index)}
                    disabled={formData.assessmentCriteria.length <= 1}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="mt-1 text-sm text-blue-600 hover:text-blue-500"
                onClick={() => handleAddArrayItem('assessmentCriteria')}
              >
                + Add Criterion
              </button>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resources
              </label>
              {formData.resources.map((resource, index) => (
                <div key={index} className="flex mb-2">
                  <input
                    type="text"
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    value={resource}
                    onChange={(e) => handleArrayItemChange('resources', index, e.target.value)}
                    placeholder={`Resource ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="ml-2 text-red-600 hover:text-red-900"
                    onClick={() => handleRemoveArrayItem('resources', index)}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="mt-1 text-sm text-blue-600 hover:text-blue-500"
                onClick={() => handleAddArrayItem('resources')}
              >
                + Add Resource
              </button>
            </div>
            
            <div>
              <label htmlFor="edit-status" className="block text-sm font-medium text-gray-700 mb-1">
                Status*
              </label>
              <select
                id="edit-status"
                name="status"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={formData.status}
                onChange={handleInputChange}
                required
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md min-h-[100px] max-h-[200px] overflow-y-auto">
                {tags.map((tag, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      formData.tags.includes(tag) 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                    onClick={() => handleTagChange(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            
            {regulations.length > 0 && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Related Regulations
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 border border-gray-300 rounded-md min-h-[100px] max-h-[200px] overflow-y-auto">
                  {regulations.map((reg) => (
                    <div key={reg.id} className="flex items-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        id={`edit-reg-${reg.id}`}
                        checked={formData.relatedRegulations?.includes(reg.id) || false}
                        onChange={() => handleRegulationChange(reg.id)}
                      />
                      <label htmlFor={`edit-reg-${reg.id}`} className="ml-2 text-sm text-gray-700">
                        {reg.code}: {reg.title}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateExercise}
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Update Exercise
            </Button>
          </div>
        </Modal>
      )}
      
      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedExercise && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Delete Exercise"
          size="md"
        >
          <p className="mb-4">
            Are you sure you want to delete the exercise <strong>{selectedExercise.title}</strong>? This action cannot be undone.
          </p>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteExercise}
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Delete Exercise
            </Button>
          </div>
        </Modal>
      )}
      
      {/* Import Modal */}
      {isImportModalOpen && (
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          title="Import Exercises"
          size="md"
        >
          <p className="mb-4">
            Upload a CSV or JSON file containing exercises to import. The file must include required fields: title, description, type, duration, difficulty, objectives, assessmentCriteria, and status.
          </p>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File
            </label>
            <input
              type="file"
              accept=".csv,.json"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setIsImportModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleImportExercises}
              isLoading={isSubmitting}
              disabled={isSubmitting || !importFile}
            >
              Import
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
