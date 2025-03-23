// src/frontend/components/competency/CompetencyManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Form } from '../ui/Form';
import { DataTable, Column } from '../ui/DataTable';

// Types
export enum CompetencyLevel {
  UNSATISFACTORY = 1,
  BASIC = 2,
  PROFICIENT = 3,
  EXEMPLARY = 4
}

export interface CompetencyCategory {
  id: string;
  name: string;
  description: string;
  order: number;
}

export interface Competency {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  indicators: CompetencyIndicator[];
  regulatoryReferences?: string[];
  trainingObjectives?: string[];
  minimumLevel: CompetencyLevel;
}

export interface CompetencyIndicator {
  id: string;
  competencyId: string;
  level: CompetencyLevel;
  description: string;
  criteria: string[];
}

export interface TraineeCompetency {
  id: string;
  traineeId: string;
  traineeName: string;
  competencyId: string;
  competencyName: string;
  categoryId: string;
  categoryName: string;
  assessmentDate: Date;
  level: CompetencyLevel;
  notes?: string;
  assessorId: string;
  assessorName: string;
  evidenceReferences?: string[];
  history: {
    date: Date;
    level: CompetencyLevel;
    assessorName: string;
  }[];
}

// Competency Form Component
interface CompetencyFormProps {
  competency: Partial<Competency>;
  categories: CompetencyCategory[];
  onSave: (competency: Partial<Competency>) => Promise<void>;
  onCancel: () => void;
  isEditing: boolean;
}

const CompetencyForm: React.FC<CompetencyFormProps> = ({
  competency,
  categories,
  onSave,
  onCancel,
  isEditing
}) => {
  const [formData, setFormData] = useState<Partial<Competency>>(competency);
  const [indicators, setIndicators] = useState<Partial<CompetencyIndicator>[]>(
    competency.indicators || [
      { level: CompetencyLevel.UNSATISFACTORY, description: '', criteria: [''] },
      { level: CompetencyLevel.BASIC, description: '', criteria: [''] },
      { level: CompetencyLevel.PROFICIENT, description: '', criteria: [''] },
      { level: CompetencyLevel.EXEMPLARY, description: '', criteria: [''] }
    ]
  );
  const [regulatoryRefs, setRegulatoryRefs] = useState<string[]>(
    competency.regulatoryReferences || ['']
  );
  const [objectives, setObjectives] = useState<string[]>(
    competency.trainingObjectives || ['']
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleIndicatorChange = (index: number, field: string, value: any) => {
    const newIndicators = [...indicators];
    (newIndicators[index] as any)[field] = value;
    setIndicators(newIndicators);
  };

  const handleCriteriaChange = (indicatorIndex: number, criteriaIndex: number, value: string) => {
    const newIndicators = [...indicators];
    if (!newIndicators[indicatorIndex].criteria) {
      newIndicators[indicatorIndex].criteria = [''];
    }
    newIndicators[indicatorIndex].criteria![criteriaIndex] = value;
    setIndicators(newIndicators);
  };

  const addCriteria = (indicatorIndex: number) => {
    const newIndicators = [...indicators];
    if (!newIndicators[indicatorIndex].criteria) {
      newIndicators[indicatorIndex].criteria = [''];
    } else {
      newIndicators[indicatorIndex].criteria!.push('');
    }
    setIndicators(newIndicators);
  };

  const removeCriteria = (indicatorIndex: number, criteriaIndex: number) => {
    const newIndicators = [...indicators];
    newIndicators[indicatorIndex].criteria!.splice(criteriaIndex, 1);
    setIndicators(newIndicators);
  };

  const handleRegulatoryRefChange = (index: number, value: string) => {
    const newRefs = [...regulatoryRefs];
    newRefs[index] = value;
    setRegulatoryRefs(newRefs);
  };

  const addRegulatoryRef = () => {
    setRegulatoryRefs([...regulatoryRefs, '']);
  };

  const removeRegulatoryRef = (index: number) => {
    const newRefs = [...regulatoryRefs];
    newRefs.splice(index, 1);
    setRegulatoryRefs(newRefs);
  };

  const handleObjectiveChange = (index: number, value: string) => {
    const newObjectives = [...objectives];
    newObjectives[index] = value;
    setObjectives(newObjectives);
  };

  const addObjective = () => {
    setObjectives([...objectives, '']);
  };

  const removeObjective = (index: number) => {
    const newObjectives = [...objectives];
    newObjectives.splice(index, 1);
    setObjectives(newObjectives);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.categoryId) {
      newErrors.categoryId = 'Category is required';
    }
    
    if (!formData.minimumLevel) {
      newErrors.minimumLevel = 'Minimum level is required';
    }
    
    // Check if at least the minimum level indicator has criteria
    const minLevel = formData.minimumLevel || CompetencyLevel.PROFICIENT;
    const minLevelIndicator = indicators.find(i => i.level === minLevel);
    
    if (!minLevelIndicator || !minLevelIndicator.description?.trim()) {
      newErrors.indicatorDescription = `Description for the minimum level (${minLevel}) is required`;
    }
    
    if (!minLevelIndicator || !minLevelIndicator.criteria || minLevelIndicator.criteria.every(c => !c.trim())) {
      newErrors.indicatorCriteria = `At least one criterion for the minimum level (${minLevel}) is required`;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    
    // Filter out empty criteria and references
    const filteredIndicators = indicators.map(indicator => ({
      ...indicator,
      criteria: indicator.criteria?.filter(c => c.trim()) || []
    }));
    
    const filteredRefs = regulatoryRefs.filter(ref => ref.trim());
    const filteredObjectives = objectives.filter(obj => obj.trim());
    
    const competencyData: Partial<Competency> = {
      ...formData,
      indicators: filteredIndicators as CompetencyIndicator[],
      regulatoryReferences: filteredRefs.length > 0 ? filteredRefs : undefined,
      trainingObjectives: filteredObjectives.length > 0 ? filteredObjectives : undefined
    };
    
    try {
      await onSave(competencyData);
    } catch (error) {
      // Handle error
      console.error('Error saving competency:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <Input
          label="Name"
          name="name"
          value={formData.name || ''}
          onChange={handleInputChange}
          error={errors.name}
          required
        />
        
        <div>
          <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            className={`block w-full pl-3 pr-10 py-2 text-base border-gray-300 ${errors.categoryId ? 'border-red-300' : ''} focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md`}
            value={formData.categoryId || ''}
            onChange={handleInputChange}
            required
          >
            <option value="">Select Category</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="mt-1 text-sm text-red-600">{errors.categoryId}</p>
          )}
        </div>
      </div>
      
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
        />
      </div>
      
      <div className="mb-4">
        <label htmlFor="minimumLevel" className="block text-sm font-medium text-gray-700 mb-1">
          Minimum Required Level
        </label>
        <select
          id="minimumLevel"
          name="minimumLevel"
          className={`block w-full pl-3 pr-10 py-2 text-base border-gray-300 ${errors.minimumLevel ? 'border-red-300' : ''} focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md`}
          value={formData.minimumLevel || CompetencyLevel.PROFICIENT}
          onChange={handleInputChange}
          required
        >
          <option value={CompetencyLevel.UNSATISFACTORY}>1 - Unsatisfactory</option>
          <option value={CompetencyLevel.BASIC}>2 - Basic</option>
          <option value={CompetencyLevel.PROFICIENT}>3 - Proficient</option>
          <option value={CompetencyLevel.EXEMPLARY}>4 - Exemplary</option>
        </select>
        {errors.minimumLevel && (
          <p className="mt-1 text-sm text-red-600">{errors.minimumLevel}</p>
        )}
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Performance Indicators</h3>
        <div className="space-y-4">
          {indicators.map((indicator, index) => (
            <div key={index} className="border rounded-md p-4">
              <div className="flex items-center mb-2">
                <h4 className="text-base font-medium">
                  Level {indicator.level}: {
                    indicator.level === CompetencyLevel.UNSATISFACTORY ? 'Unsatisfactory' :
                    indicator.level === CompetencyLevel.BASIC ? 'Basic' :
                    indicator.level === CompetencyLevel.PROFICIENT ? 'Proficient' :
                    'Exemplary'
                  }
                </h4>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  className={`block w-full rounded-md shadow-sm border-gray-300 ${indicator.level === formData.minimumLevel && errors.indicatorDescription ? 'border-red-300' : ''} focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  value={indicator.description || ''}
                  onChange={(e) => handleIndicatorChange(index, 'description', e.target.value)}
                />
                {indicator.level === formData.minimumLevel && errors.indicatorDescription && (
                  <p className="mt-1 text-sm text-red-600">{errors.indicatorDescription}</p>
                )}
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    Performance Criteria
                  </label>
                  <button
                    type="button"
                    className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => addCriteria(index)}
                  >
                    Add Criterion
                  </button>
                </div>
                
                {indicator.criteria && indicator.criteria.map((criterion, criteriaIndex) => (
                  <div key={criteriaIndex} className="flex items-center mb-2">
                    <input
                      type="text"
                      className={`block w-full rounded-md shadow-sm border-gray-300 ${indicator.level === formData.minimumLevel && errors.indicatorCriteria && !criterion.trim() ? 'border-red-300' : ''} focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                      value={criterion}
                      onChange={(e) => handleCriteriaChange(index, criteriaIndex, e.target.value)}
                      placeholder="Enter performance criterion"
                    />
                    {indicator.criteria!.length > 1 && (
                      <button
                        type="button"
                        className="ml-2 text-red-600 hover:text-red-800"
                        onClick={() => removeCriteria(index, criteriaIndex)}
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                
                {indicator.level === formData.minimumLevel && errors.indicatorCriteria && (
                  <p className="mt-1 text-sm text-red-600">{errors.indicatorCriteria}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Regulatory References</h3>
          <button
            type="button"
            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={addRegulatoryRef}
          >
            Add Reference
          </button>
        </div>
        
        {regulatoryRefs.map((ref, index) => (
          <div key={index} className="flex items-center mb-2">
            <input
              type="text"
              className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={ref}
              onChange={(e) => handleRegulatoryRefChange(index, e.target.value)}
              placeholder="Enter regulatory reference"
            />
            {regulatoryRefs.length > 1 && (
              <button
                type="button"
                className="ml-2 text-red-600 hover:text-red-800"
                onClick={() => removeRegulatoryRef(index)}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Training Objectives</h3>
          <button
            type="button"
            className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={addObjective}
          >
            Add Objective
          </button>
        </div>
        
        {objectives.map((objective, index) => (
          <div key={index} className="flex items-center mb-2">
            <input
              type="text"
              className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={objective}
              onChange={(e) => handleObjectiveChange(index, e.target.value)}
              placeholder="Enter training objective"
            />
            {objectives.length > 1 && (
              <button
                type="button"
                className="ml-2 text-red-600 hover:text-red-800"
                onClick={() => removeObjective(index)}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
      
      <div className="flex justify-end space-x-3">
        <Button
          variant="outline"
          type="button"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          isLoading={isSubmitting}
          disabled={isSubmitting}
        >
          {isEditing ? 'Update' : 'Create'} Competency
        </Button>
      </div>
    </Form>
  );
};

// Category Management Component
interface CategoryManagementProps {
  categories: CompetencyCategory[];
  onCreateCategory: (category: Partial<CompetencyCategory>) => Promise<void>;
  onUpdateCategory: (category: CompetencyCategory) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
}

const CategoryManagement: React.FC<CategoryManagementProps> = ({
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory
}) => {
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CompetencyCategory | null>(null);
  const [categoryFormData, setCategoryFormData] = useState<Partial<CompetencyCategory>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (editingCategory) {
      setCategoryFormData(editingCategory);
    } else {
      setCategoryFormData({
        name: '',
        description: '',
        order: categories.length
      });
    }
  }, [editingCategory, categories.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCategoryFormData(prev => ({
      ...prev,
      [name]: name === 'order' ? parseInt(value) : value
    }));
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoryFormData.name?.trim()) {
      setAlertMessage({ type: 'error', message: 'Category name is required' });
      return;
    }
    
    setIsSaving(true);
    
    try {
      if (editingCategory) {
        await onUpdateCategory({ ...editingCategory, ...categoryFormData } as CompetencyCategory);
        setAlertMessage({ type: 'success', message: 'Category updated successfully' });
      } else {
        await onCreateCategory(categoryFormData);
        setAlertMessage({ type: 'success', message: 'Category created successfully' });
      }
      
      setShowCategoryForm(false);
      setEditingCategory(null);
    } catch (error) {
      setAlertMessage({ 
        type: 'error', 
        message: `Failed to ${editingCategory ? 'update' : 'create'} category: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (category: CompetencyCategory) => {
    if (!window.confirm(`Are you sure you want to delete the category "${category.name}"? This may affect competencies assigned to this category.`)) {
      return;
    }
    
    try {
      await onDeleteCategory(category.id);
      setAlertMessage({ type: 'success', message: 'Category deleted successfully' });
    } catch (error) {
      setAlertMessage({ 
        type: 'error', 
        message: `Failed to delete category: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  };

  return (
    <div>
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">Categories</h2>
        <Button
          variant="primary"
          onClick={() => {
            setEditingCategory(null);
            setShowCategoryForm(true);
          }}
        >
          Add Category
        </Button>
      </div>
      
      {showCategoryForm && (
        <Card className="mb-4 p-4">
          <h3 className="text-lg font-medium mb-4">{editingCategory ? 'Edit' : 'Add'} Category</h3>
          <Form onSubmit={handleSaveCategory}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Input
                label="Name"
                name="name"
                value={categoryFormData.name || ''}
                onChange={handleInputChange}
                required
              />
              
              <Input
                label="Order"
                name="order"
                type="number"
                value={categoryFormData.order?.toString() || '0'}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={categoryFormData.description || ''}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowCategoryForm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                isLoading={isSaving}
                disabled={isSaving}
              >
                {editingCategory ? 'Update' : 'Create'} Category
              </Button>
            </div>
          </Form>
        </Card>
      )}
      
      <div className="bg-white shadow rounded-md overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {categories.sort((a, b) => a.order - b.order).map((category) => (
            <li key={category.id} className="px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium">{category.name}</h3>
                  <p className="text-sm text-gray-500">{category.description}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => {
                      setEditingCategory(category);
                      setShowCategoryForm(true);
                    }}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                    </svg>
                  </button>
                  <button
                    className="text-red-600 hover:text-red-800"
                    onClick={() => handleDeleteCategory(category)}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </li>
          ))}
          {categories.length === 0 && (
            <li className="px-4 py-6 text-center text-gray-500">
              No categories found. Create a category to get started.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

// Trainee Assessment Component
interface TraineeAssessmentProps {
  trainee: {
    id: string;
    name: string;
  };
  competency: Competency;
  category: CompetencyCategory;
  existingAssessment?: TraineeCompetency;
  onSave: (assessment: Partial<TraineeCompetency>) => Promise<void>;
  onCancel: () => void;
}

const TraineeAssessment: React.FC<TraineeAssessmentProps> = ({
  trainee,
  competency,
  category,
  existingAssessment,
  onSave,
  onCancel
}) => {
  const [level, setLevel] = useState<CompetencyLevel>(
    existingAssessment?.level || competency.minimumLevel
  );
  const [notes, setNotes] = useState(existingAssessment?.notes || '');
  const [evidence, setEvidence] = useState<string[]>(
    existingAssessment?.evidenceReferences || ['']
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEvidenceChange = (index: number, value: string) => {
    const newEvidence = [...evidence];
    newEvidence[index] = value;
    setEvidence(newEvidence);
  };

  const addEvidence = () => {
    setEvidence([...evidence, '']);
  };

  const removeEvidence = (index: number) => {
    const newEvidence = [...evidence];
    newEvidence.splice(index, 1);
    setEvidence(newEvidence);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const filteredEvidence = evidence.filter(e => e.trim());
      
      const assessmentData: Partial<TraineeCompetency> = {
        traineeId: trainee.id,
        traineeName: trainee.name,
        competencyId: competency.id,
        competencyName: competency.name,
        categoryId: category.id,
        categoryName: category.name,
        level,
        notes: notes.trim() || undefined,
        evidenceReferences: filteredEvidence.length > 0 ? filteredEvidence : undefined,
        ...(existingAssessment?.id ? { id: existingAssessment.id } : {})
      };
      
      await onSave(assessmentData);
    } catch (error) {
      console.error('Error saving assessment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current level indicator
  const currentLevelIndicator = competency.indicators.find(i => i.level === level);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-medium">{competency.name}</h2>
        <p className="text-gray-500">{competency.description}</p>
        <div className="mt-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {category.name}
          </span>
        </div>
      </div>
      
      <Form onSubmit={handleSubmit}>
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-2">Assessment Level</h3>
          <div className="space-y-4">
            {competency.indicators.map((indicator) => (
              <div 
                key={indicator.level}
                className={`border rounded-md p-4 ${level === indicator.level ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
              >
                <div className="flex items-center mb-2">
                  <input
                    type="radio"
                    id={`level-${indicator.level}`}
                    name="level"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    checked={level === indicator.level}
                    onChange={() => setLevel(indicator.level)}
                  />
                  <label htmlFor={`level-${indicator.level}`} className="ml-2 text-base font-medium">
                    Level {indicator.level}: {
                      indicator.level === CompetencyLevel.UNSATISFACTORY ? 'Unsatisfactory' :
                      indicator.level === CompetencyLevel.BASIC ? 'Basic' :
                      indicator.level === CompetencyLevel.PROFICIENT ? 'Proficient' :
                      'Exemplary'
                    }
                  </label>
                </div>
                
                <div className="ml-6">
                  <p className="text-sm mb-2">{indicator.description}</p>
                  
                  {indicator.criteria.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Criteria:</p>
                      <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                        {indicator.criteria.map((criterion, index) => (
                          <li key={index}>{criterion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {level < competency.minimumLevel && (
            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <span className="font-medium">Note:</span> The selected level is below the minimum required level ({competency.minimumLevel}) for this competency.
              </p>
            </div>
          )}
        </div>
        
        <div className="mb-6">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Assessment Notes
          </label>
          <textarea
            id="notes"
            rows={4}
            className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter assessment notes and observations"
          />
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-base font-medium">Evidence References</h3>
            <button
              type="button"
              className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={addEvidence}
            >
              Add Evidence
            </button>
          </div>
          
          {evidence.map((item, index) => (
            <div key={index} className="flex items-center mb-2">
              <input
                type="text"
                className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={item}
                onChange={(e) => handleEvidenceChange(index, e.target.value)}
                placeholder="Enter evidence reference (e.g., training record, simulator session)"
              />
              {evidence.length > 1 && (
                <button
                  type="button"
                  className="ml-2 text-red-600 hover:text-red-800"
                  onClick={() => removeEvidence(index)}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button
            variant="outline"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Save Assessment
          </Button>
        </div>
      </Form>
    </div>
  );
};

// Main Competency Management Component
interface CompetencyManagementProps {
  competencies: Competency[];
  categories: CompetencyCategory[];
  traineeCompetencies: TraineeCompetency[];
  onCreateCompetency: (competency: Partial<Competency>) => Promise<void>;
  onUpdateCompetency: (competency: Competency) => Promise<void>;
  onDeleteCompetency: (competencyId: string) => Promise<void>;
  onCreateCategory: (category: Partial<CompetencyCategory>) => Promise<void>;
  onUpdateCategory: (category: CompetencyCategory) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onSaveAssessment: (assessment: Partial<TraineeCompetency>) => Promise<void>;
  onExportCompetencies: () => Promise<void>;
  onImportCompetencies: (file: File) => Promise<void>;
}

export const CompetencyManagement: React.FC<CompetencyManagementProps> = ({
  competencies,
  categories,
  traineeCompetencies,
  onCreateCompetency,
  onUpdateCompetency,
  onDeleteCompetency,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onSaveAssessment,
  onExportCompetencies,
  onImportCompetencies
}) => {
  const [activeTab, setActiveTab] = useState<'competencies' | 'categories' | 'traineeView'>('competencies');
  const [showCompetencyForm, setShowCompetencyForm] = useState(false);
  const [editingCompetency, setEditingCompetency] = useState<Competency | null>(null);
  const [showTraineeAssessment, setShowTraineeAssessment] = useState(false);
  const [selectedCompetency, setSelectedCompetency] = useState<Competency | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedTrainee, setSelectedTrainee] = useState<{id: string; name: string} | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedCompetency, setExpandedCompetency] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Define competency table columns
  const competencyColumns: Column<Competency>[] = [
    {
      key: 'name',
      header: 'Competency',
      render: (competency) => (
        <div>
          <div className="font-medium">{competency.name}</div>
          <div className="text-xs text-gray-500">
            {categories.find(cat => cat.id === competency.categoryId)?.name}
          </div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'minimumLevel',
      header: 'Min Level',
      render: (competency) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          competency.minimumLevel === CompetencyLevel.UNSATISFACTORY ? 'bg-red-100 text-red-800' :
          competency.minimumLevel === CompetencyLevel.BASIC ? 'bg-yellow-100 text-yellow-800' :
          competency.minimumLevel === CompetencyLevel.PROFICIENT ? 'bg-green-100 text-green-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {competency.minimumLevel}
        </span>
      ),
      sortable: true
    },
    {
      key: 'indicators',
      header: 'Indicators',
      render: (competency) => competency.indicators.length,
      sortable: true
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (competency) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditCompetency(competency);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="Edit"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteCompetency(competency.id);
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

  // Filter competencies based on search and category
  const filteredCompetencies = competencies.filter(competency => {
    const matchesSearch = 
      searchTerm === '' || 
      competency.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      competency.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
      selectedCategory === 'all' || 
      competency.categoryId === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Handle create or update competency
  const handleSaveCompetency = async (competencyData: Partial<Competency>) => {
    try {
      if (editingCompetency) {
        await onUpdateCompetency({ ...editingCompetency, ...competencyData } as Competency);
        setAlertMessage({ type: 'success', message: 'Competency updated successfully' });
      } else {
        await onCreateCompetency(competencyData);
        setAlertMessage({ type: 'success', message: 'Competency created successfully' });
      }
      
      setShowCompetencyForm(false);
      setEditingCompetency(null);
    } catch (error) {
      setAlertMessage({ 
        type: 'error', 
        message: `Failed to ${editingCompetency ? 'update' : 'create'} competency: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      // Keep form open on error
      return Promise.reject(error);
    }
  };

  // Handle edit competency
  const handleEditCompetency = (competency: Competency) => {
    setEditingCompetency(competency);
    setShowCompetencyForm(true);
  };

  // Handle delete competency
  const handleDeleteCompetency = async (competencyId: string) => {
    if (!window.confirm('Are you sure you want to delete this competency? This action cannot be undone.')) {
      return;
    }
    
    try {
      await onDeleteCompetency(competencyId);
      setAlertMessage({ type: 'success', message: 'Competency deleted successfully' });
    } catch (error) {
      setAlertMessage({ 
        type: 'error', 
        message: `Failed to delete competency: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Handle trainee assessment
  const handleTraineeAssessment = (competency: Competency, trainee: {id: string; name: string}) => {
    setSelectedCompetency(competency);
    setSelectedTrainee(trainee);
    setShowTraineeAssessment(true);
  };

  // Handle save assessment
  const handleSaveAssessment = async (assessmentData: Partial<TraineeCompetency>) => {
    try {
      await onSaveAssessment(assessmentData);
      setAlertMessage({ type: 'success', message: 'Assessment saved successfully' });
      setShowTraineeAssessment(false);
    } catch (error) {
      setAlertMessage({ 
        type: 'error', 
        message: `Failed to save assessment: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      return Promise.reject(error);
    }
  };

  // Handle export competencies
  const handleExportCompetencies = async () => {
    try {
      await onExportCompetencies();
      setAlertMessage({ type: 'success', message: 'Competencies exported successfully' });
    } catch (error) {
      setAlertMessage({ 
        type: 'error', 
        message: `Failed to export competencies: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Handle import competencies
  const handleImportCompetencies = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      await onImportCompetencies(file);
      setAlertMessage({ type: 'success', message: 'Competencies imported successfully' });
    } catch (error) {
      setAlertMessage({ 
        type: 'error', 
        message: `Failed to import competencies: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Toggle expanded competency
  const toggleCompetencyExpand = (competencyId: string) => {
    setExpandedCompetency(expandedCompetency === competencyId ? null : competencyId);
  };

  // Get existing assessment for a competency and trainee
  const getExistingAssessment = (competencyId: string, traineeId: string) => {
    return traineeCompetencies.find(
      tc => tc.competencyId === competencyId && tc.traineeId === traineeId
    );
  };

  // Format assessment level
  const formatAssessmentLevel = (level: CompetencyLevel) => {
    switch (level) {
      case CompetencyLevel.UNSATISFACTORY:
        return { text: 'Unsatisfactory', color: 'bg-red-100 text-red-800' };
      case CompetencyLevel.BASIC:
        return { text: 'Basic', color: 'bg-yellow-100 text-yellow-800' };
      case CompetencyLevel.PROFICIENT:
        return { text: 'Proficient', color: 'bg-green-100 text-green-800' };
      case CompetencyLevel.EXEMPLARY:
        return { text: 'Exemplary', color: 'bg-blue-100 text-blue-800' };
      default:
        return { text: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const tabs: Tab[] = [
    {
      id: 'competencies',
      label: 'Competencies',
      content: (
        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
            <div className="mb-4 sm:mb-0">
              <h2 className="text-lg font-medium">Competency Management</h2>
              <p className="text-gray-500">Manage pilot competencies, categories, and assessment criteria</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  setEditingCompetency(null);
                  setShowCompetencyForm(true);
                }}
              >
                Add Competency
              </Button>
              
              <Button
                variant="outline"
                onClick={handleExportCompetencies}
              >
                Export
              </Button>
              
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Import
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".json,.csv"
                onChange={handleImportCompetencies}
              />
            </div>
          </div>
          
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Competencies
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
                <input
                  type="text"
                  id="search"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search by name or description"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Category
              </label>
              <select
                id="category-filter"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {filteredCompetencies.length > 0 ? (
            <div className="space-y-4">
              {filteredCompetencies.map(competency => {
                const category = categories.find(cat => cat.id === competency.categoryId);
                const isExpanded = expandedCompetency === competency.id;
                
                return (
                  <Card key={competency.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <div 
                      className="p-4"
                      onClick={() => toggleCompetencyExpand(competency.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                            <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                          </div>
                          <div className="ml-2">
                            <h3 className="text-lg font-medium">{competency.name}</h3>
                            <div className="flex items-center mt-1 space-x-2">
                              {category && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {category.name}
                                </span>
                              )}
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                competency.minimumLevel === CompetencyLevel.UNSATISFACTORY ? 'bg-red-100 text-red-800' :
                                competency.minimumLevel === CompetencyLevel.BASIC ? 'bg-yellow-100 text-yellow-800' :
                                competency.minimumLevel === CompetencyLevel.PROFICIENT ? 'bg-green-100 text-green-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                Min Level: {competency.minimumLevel}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCompetency(competency);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCompetency(competency.id);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                      {competency.description && (
                        <p className="mt-2 text-sm text-gray-500">{competency.description}</p>
                      )}
                    </div>
                    
                    {isExpanded && (
                      <div className="border-t px-4 py-3">
                        <h4 className="text-base font-medium mb-2">Performance Indicators</h4>
                        <div className="space-y-3">
                          {competency.indicators.map((indicator) => {
                            const level = formatAssessmentLevel(indicator.level);
                            return (
                              <div key={indicator.level} className="bg-gray-50 p-3 rounded-md">
                                <div className="flex items-center mb-1">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${level.color}`}>
                                    Level {indicator.level}: {level.text}
                                  </span>
                                </div>
                                <p className="text-sm">{indicator.description}</p>
                                {indicator.criteria.length > 0 && (
                                  <div className="mt-1">
                                    <p className="text-xs font-medium text-gray-500">Criteria:</p>
                                    <ul className="list-disc list-inside text-xs text-gray-500 mt-1">
                                      {indicator.criteria.map((criterion, idx) => (
                                        <li key={idx}>{criterion}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        {(competency.regulatoryReferences?.length || competency.trainingObjectives?.length) && (
                          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            {competency.regulatoryReferences?.length && (
                              <div>
                                <h4 className="text-sm font-medium mb-1">Regulatory References</h4>
                                <ul className="list-disc list-inside text-sm text-gray-500">
                                  {competency.regulatoryReferences.map((ref, index) => (
                                    <li key={index}>{ref}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {competency.trainingObjectives?.length && (
                              <div>
                                <h4 className="text-sm font-medium mb-1">Training Objectives</h4>
                                <ul className="list-disc list-inside text-sm text-gray-500">
                                  {competency.trainingObjectives.map((obj, index) => (
                                    <li key={index}>{obj}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 rounded-md">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No competencies found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedCategory !== 'all' ? 
                  'Try adjusting your search or filter criteria.' : 
                  'Get started by creating a new competency.'}
              </p>
              <div className="mt-6">
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditingCompetency(null);
                    setShowCompetencyForm(true);
                  }}
                >
                  Add Competency
                </Button>
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'categories',
      label: 'Categories',
      content: (
        <CategoryManagement
          categories={categories}
          onCreateCategory={onCreateCategory}
          onUpdateCategory={onUpdateCategory}
          onDeleteCategory={onDeleteCategory}
        />
      )
    },
    {
      id: 'traineeView',
      label: 'Trainee View',
      content: (
        <div>
          <div className="mb-6">
            <h2 className="text-lg font-medium">Trainee Competency View</h2>
            <p className="text-gray-500">View and assess trainee competencies</p>
          </div>
          
          <div className="mb-6">
            {/* Trainee selection and view would go here */}
            <p className="text-gray-500">Select a trainee to view and assess their competencies.</p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="competency-management">
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}
      
      <Tabs
        tabs={tabs}
        defaultTabId="competencies"
        onChange={(tabId) => setActiveTab(tabId as any)}
      />
      
      {/* Competency Form Modal */}
      {showCompetencyForm && (
        <Modal
          isOpen={showCompetencyForm}
          onClose={() => setShowCompetencyForm(false)}
          title={`${editingCompetency ? 'Edit' : 'Create'} Competency`}
          size="xl"
        >
          <CompetencyForm
            competency={editingCompetency || {}}
            categories={categories}
            onSave={handleSaveCompetency}
            onCancel={() => setShowCompetencyForm(false)}
            isEditing={!!editingCompetency}
          />
        </Modal>
      )}
      
      {/* Trainee Assessment Modal */}
      {showTraineeAssessment && selectedCompetency && selectedTrainee && (
        <Modal
          isOpen={showTraineeAssessment}
          onClose={() => setShowTraineeAssessment(false)}
          title={`Assess Competency: ${selectedCompetency.name}`}
          size="lg"
        >
          <TraineeAssessment
            trainee={selectedTrainee}
            competency={selectedCompetency}
            category={categories.find(cat => cat.id === selectedCompetency.categoryId)!}
            existingAssessment={getExistingAssessment(selectedCompetency.id, selectedTrainee.id)}
            onSave={handleSaveAssessment}
            onCancel={() => setShowTraineeAssessment(false)}
          />
        </Modal>
      )}
    </div>
  );
};
