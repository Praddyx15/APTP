// src/frontend/components/syllabus/SyllabusTemplateLibrary.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { Modal } from '../ui/Modal';
import { TrainingElement } from './SyllabusBuilder';

// Types
export interface SyllabusTemplate {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  category: string;
  regulatoryFramework?: string;
  elements: TrainingElement[];
  isDefault?: boolean;
  version: string;
  previewImageUrl?: string;
  usageCount: number;
}

export interface SyllabusTemplateCategory {
  id: string;
  name: string;
  description: string;
  count: number;
}

export interface RegulatoryFramework {
  id: string;
  name: string;
  description: string;
  authority: string;
  version: string;
}

// Template Card Component
interface TemplateCardProps {
  template: SyllabusTemplate;
  onView: (template: SyllabusTemplate) => void;
  onApply: (template: SyllabusTemplate) => void;
  onDuplicate: (template: SyllabusTemplate) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onView,
  onApply,
  onDuplicate
}) => {
  return (
    <Card className="h-full flex flex-col">
      <div className="flex-grow">
        {template.previewImageUrl ? (
          <div className="w-full h-40 bg-gray-100 rounded-t-lg overflow-hidden">
            <img
              src={template.previewImageUrl}
              alt={template.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-full h-40 bg-gray-100 rounded-t-lg flex items-center justify-center text-gray-400">
            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
        )}

        <div className="p-4">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
            {template.isDefault && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Default
              </span>
            )}
          </div>
          
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{template.description}</p>
          
          <div className="mt-2">
            <div className="flex items-center text-sm text-gray-500">
              <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
              <span>Updated {new Date(template.updatedAt).toLocaleDateString()}</span>
            </div>
            
            <div className="flex items-center mt-1 text-sm text-gray-500">
              <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
              </svg>
              <span>By {template.createdBy}</span>
            </div>
            
            {template.regulatoryFramework && (
              <div className="flex items-center mt-1 text-sm text-gray-500">
                <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
                <span>{template.regulatoryFramework}</span>
              </div>
            )}
          </div>
          
          <div className="mt-2 flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                {tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                +{template.tags.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="small"
            onClick={() => onView(template)}
          >
            View Details
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={() => onApply(template)}
          >
            Apply
          </Button>
          <Button
            variant="outline"
            size="small"
            onClick={() => onDuplicate(template)}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Template Details Modal
interface TemplateDetailsProps {
  template: SyllabusTemplate;
  isOpen: boolean;
  onClose: () => void;
  onApply: (template: SyllabusTemplate) => void;
  onDuplicate: (template: SyllabusTemplate) => void;
}

const TemplateDetails: React.FC<TemplateDetailsProps> = ({
  template,
  isOpen,
  onClose,
  onApply,
  onDuplicate
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'structure' | 'usage'>('overview');
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={template.name}
      size="lg"
    >
      <div className="mb-4 flex border-b">
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'overview' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'structure' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('structure')}
        >
          Structure
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'usage' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('usage')}
        >
          Usage
        </button>
      </div>
      
      {activeTab === 'overview' && (
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500">Description</h3>
            <p className="mt-1">{template.description}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Category</h3>
              <p className="mt-1">{template.category}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Regulatory Framework</h3>
              <p className="mt-1">{template.regulatoryFramework || 'None'}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Created By</h3>
              <p className="mt-1">{template.createdBy}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Version</h3>
              <p className="mt-1">{template.version}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Created At</h3>
              <p className="mt-1">{new Date(template.createdAt).toLocaleDateString()}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Updated At</h3>
              <p className="mt-1">{new Date(template.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500">Tags</h3>
            <div className="mt-1 flex flex-wrap gap-1">
              {template.tags.map((tag, index) => (
                <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'structure' && (
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500">Template Structure</h3>
            
            <div className="mt-2 border rounded-md">
              <div className="p-4">
                {/* Simplified template structure display */}
                <ul className="space-y-2">
                  {template.elements.filter(el => !el.parentId).map(module => (
                    <li key={module.id}>
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7"></path>
                        </svg>
                        <span className="font-medium">{module.title}</span>
                      </div>
                      
                      {/* Show lessons within this module */}
                      <ul className="ml-6 mt-1 space-y-1">
                        {template.elements
                          .filter(el => el.parentId === module.id)
                          .map(lesson => (
                            <li key={lesson.id}>
                              <div className="flex items-center">
                                <svg className="h-4 w-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                                </svg>
                                <span>{lesson.title}</span>
                              </div>
                              
                              {/* Show exercises within this lesson */}
                              <ul className="ml-6 mt-1 space-y-1">
                                {template.elements
                                  .filter(el => el.parentId === lesson.id)
                                  .map(exercise => (
                                    <li key={exercise.id} className="flex items-center">
                                      <svg className="h-3 w-3 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                      </svg>
                                      <span className="text-sm text-gray-600">{exercise.title}</span>
                                    </li>
                                  ))}
                              </ul>
                            </li>
                          ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500">Stats</h3>
            <div className="mt-2 grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-gray-50 rounded-md">
                <p className="text-2xl font-bold text-gray-900">
                  {template.elements.filter(el => !el.parentId).length}
                </p>
                <p className="text-sm text-gray-500">Modules</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-md">
                <p className="text-2xl font-bold text-gray-900">
                  {template.elements.filter(el => el.parentId && template.elements.find(parent => parent.id === el.parentId && !parent.parentId)).length}
                </p>
                <p className="text-sm text-gray-500">Lessons</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-md">
                <p className="text-2xl font-bold text-gray-900">
                  {template.elements.filter(el => el.parentId && template.elements.find(parent => parent.id === el.parentId && parent.parentId)).length}
                </p>
                <p className="text-sm text-gray-500">Exercises</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'usage' && (
        <div>
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500">Template Usage</h3>
            <div className="mt-2 p-4 bg-gray-50 rounded-md text-center">
              <p className="text-2xl font-bold text-gray-900">{template.usageCount}</p>
              <p className="text-sm text-gray-500">Times Applied</p>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500">Compatible With</h3>
            {template.regulatoryFramework ? (
              <p className="mt-1">This template is designed to be compliant with {template.regulatoryFramework} regulatory framework.</p>
            ) : (
              <p className="mt-1">This template is not associated with any specific regulatory framework.</p>
            )}
          </div>
        </div>
      )}
      
      <div className="mt-6 flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={onClose}
        >
          Close
        </Button>
        <Button
          variant="outline"
          onClick={() => onDuplicate(template)}
        >
          Duplicate
        </Button>
        <Button
          variant="primary"
          onClick={() => onApply(template)}
        >
          Apply Template
        </Button>
      </div>
    </Modal>
  );
};

// Main Syllabus Template Library Component
interface SyllabusTemplateLibraryProps {
  templates: SyllabusTemplate[];
  categories: SyllabusTemplateCategory[];
  regulatoryFrameworks: RegulatoryFramework[];
  onApplyTemplate: (templateId: string) => Promise<void>;
  onDuplicateTemplate: (templateId: string) => Promise<void>;
  onCreateTemplate: () => void;
}

export const SyllabusTemplateLibrary: React.FC<SyllabusTemplateLibraryProps> = ({
  templates,
  categories,
  regulatoryFrameworks,
  onApplyTemplate,
  onDuplicateTemplate,
  onCreateTemplate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFramework, setSelectedFramework] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'popularity'>('date');
  const [selectedTemplate, setSelectedTemplate] = useState<SyllabusTemplate | null>(null);
  const [filteredTemplates, setFilteredTemplates] = useState<SyllabusTemplate[]>(templates);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Apply filters when filter criteria change
  useEffect(() => {
    let filtered = [...templates];
    
    // Apply search query filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(query) || 
        template.description.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === selectedCategory);
    }
    
    // Apply framework filter
    if (selectedFramework !== 'all') {
      filtered = filtered.filter(template => template.regulatoryFramework === selectedFramework);
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'date') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      } else { // popularity
        return b.usageCount - a.usageCount;
      }
    });
    
    setFilteredTemplates(filtered);
  }, [templates, searchQuery, selectedCategory, selectedFramework, sortBy]);
  
  // Handle apply template
  const handleApplyTemplate = async (template: SyllabusTemplate) => {
    try {
      await onApplyTemplate(template.id);
      setAlertMessage({
        type: 'success',
        message: `Template "${template.name}" applied successfully.`
      });
      setSelectedTemplate(null);
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to apply template: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };
  
  // Handle duplicate template
  const handleDuplicateTemplate = async (template: SyllabusTemplate) => {
    try {
      await onDuplicateTemplate(template.id);
      setAlertMessage({
        type: 'success',
        message: `Template "${template.name}" duplicated successfully.`
      });
      setSelectedTemplate(null);
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to duplicate template: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };
  
  return (
    <div className="syllabus-template-library">
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Syllabus Templates</h1>
        <p className="text-gray-500">
          Browse and apply templates to quickly create new training syllabi.
        </p>
      </div>
      
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-grow">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <Input
                type="text"
                placeholder="Search templates..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.count})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={selectedFramework}
                onChange={(e) => setSelectedFramework(e.target.value)}
              >
                <option value="all">All Frameworks</option>
                {regulatoryFrameworks.map(framework => (
                  <option key={framework.id} value={framework.id}>
                    {framework.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'popularity')}
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="popularity">Sort by Popularity</option>
              </select>
            </div>
            
            <Button
              variant="primary"
              onClick={onCreateTemplate}
            >
              Create Template
            </Button>
          </div>
        </div>
      </Card>
      
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onView={() => setSelectedTemplate(template)}
              onApply={() => handleApplyTemplate(template)}
              onDuplicate={() => handleDuplicateTemplate(template)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white p-8 rounded-lg border text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No templates found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your search or filter criteria.
          </p>
          <div className="mt-6">
            <Button
              variant="primary"
              onClick={onCreateTemplate}
            >
              Create New Template
            </Button>
          </div>
        </div>
      )}
      
      {selectedTemplate && (
        <TemplateDetails
          template={selectedTemplate}
          isOpen={!!selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          onApply={handleApplyTemplate}
          onDuplicate={handleDuplicateTemplate}
        />
      )}
    </div>
  );
};
