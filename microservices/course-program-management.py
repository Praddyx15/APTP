// src/frontend/components/courses/CourseManagement.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { DataTable, Column } from '../ui/DataTable';
import { Alert } from '../ui/Alert';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Form } from '../ui/Form';

// Types
export interface Course {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  modules: CourseModule[];
  startDate?: Date;
  endDate?: Date;
  instructors: string[];
  enrolledTrainees: number;
  tags: string[];
  lastModified: Date;
  createdBy: string;
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  order: number;
  lessons: CourseLesson[];
  duration: number; // in minutes
  status: 'draft' | 'active' | 'locked';
}

export interface CourseLesson {
  id: string;
  title: string;
  description: string;
  order: number;
  content: string;
  exercises: string[];
  duration: number; // in minutes
  status: 'draft' | 'active' | 'locked';
}

export interface CourseFilter {
  status?: 'draft' | 'active' | 'archived';
  instructor?: string;
  tag?: string;
  searchTerm?: string;
}

// Course List Component
interface CourseListProps {
  courses: Course[];
  onViewCourse: (id: string) => void;
  onEditCourse: (id: string) => void;
  onDeleteCourse: (id: string) => Promise<void>;
  onCreateCourse: () => void;
  onDuplicateCourse: (id: string) => Promise<void>;
  onFilterChange: (filters: CourseFilter) => void;
  availableTags: string[];
  instructors: { id: string; name: string }[];
}

export const CourseList: React.FC<CourseListProps> = ({
  courses,
  onViewCourse,
  onEditCourse,
  onDeleteCourse,
  onCreateCourse,
  onDuplicateCourse,
  onFilterChange,
  availableTags,
  instructors
}) => {
  const [filter, setFilter] = useState<CourseFilter>({});
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  // Update filter
  const updateFilter = (newFilter: Partial<CourseFilter>) => {
    const updatedFilter = { ...filter, ...newFilter };
    setFilter(updatedFilter);
    onFilterChange(updatedFilter);
  };
  
  // Reset filter
  const resetFilter = () => {
    setFilter({});
    onFilterChange({});
  };
  
  // Handle delete course
  const handleDeleteCourse = async (id: string) => {
    try {
      await onDeleteCourse(id);
      setAlertMessage({
        type: 'success',
        message: 'Course deleted successfully'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to delete course: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setShowDeleteConfirm(null);
    }
  };
  
  // Handle duplicate course
  const handleDuplicateCourse = async (id: string) => {
    try {
      await onDuplicateCourse(id);
      setAlertMessage({
        type: 'success',
        message: 'Course duplicated successfully'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to duplicate course: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };
  
  // Define table columns
  const columns: Column<Course>[] = [
    {
      key: 'title',
      header: 'Course',
      render: (course) => (
        <div>
          <div className="font-medium text-blue-600 hover:text-blue-900">{course.title}</div>
          <div className="text-sm text-gray-500 truncate">{course.description}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {course.tags.map((tag, index) => (
              <span 
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'status',
      header: 'Status',
      render: (course) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          course.status === 'active' ? 'bg-green-100 text-green-800' : 
          course.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 
          'bg-gray-100 text-gray-800'
        }`}>
          {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
        </span>
      ),
      sortable: true
    },
    {
      key: 'modules',
      header: 'Modules',
      render: (course) => (
        <div className="text-center">
          {course.modules.length}
        </div>
      ),
      sortable: true
    },
    {
      key: 'trainees',
      header: 'Trainees',
      render: (course) => (
        <div className="text-center">
          {course.enrolledTrainees}
        </div>
      ),
      sortable: true
    },
    {
      key: 'dates',
      header: 'Dates',
      render: (course) => (
        <div>
          {course.startDate && course.endDate ? (
            <span className="text-sm">
              {new Date(course.startDate).toLocaleDateString()} - {new Date(course.endDate).toLocaleDateString()}
            </span>
          ) : (
            <span className="text-sm text-gray-500">No dates set</span>
          )}
        </div>
      ),
      sortable: true
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (course) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewCourse(course.id);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="View"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditCourse(course.id);
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
              handleDuplicateCourse(course.id);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="Duplicate"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(course.id);
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
    <div className="course-list">
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}
      
      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-medium">Course Filters</h2>
          <div className="mt-2 sm:mt-0">
            <Button
              variant="outline"
              size="small"
              onClick={resetFilter}
            >
              Reset Filters
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status-filter"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={filter.status || ''}
              onChange={(e) => updateFilter({ status: e.target.value as any || undefined })}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="instructor-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Instructor
            </label>
            <select
              id="instructor-filter"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={filter.instructor || ''}
              onChange={(e) => updateFilter({ instructor: e.target.value || undefined })}
            >
              <option value="">All Instructors</option>
              {instructors.map(instructor => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="tag-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Tag
            </label>
            <select
              id="tag-filter"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={filter.tag || ''}
              onChange={(e) => updateFilter({ tag: e.target.value || undefined })}
            >
              <option value="">All Tags</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="search-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search-filter"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              placeholder="Search course title..."
              value={filter.searchTerm || ''}
              onChange={(e) => updateFilter({ searchTerm: e.target.value || undefined })}
            />
          </div>
        </div>
      </Card>
      
      {/* Course List */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-lg font-medium">Courses</h2>
          <Button
            variant="primary"
            onClick={onCreateCourse}
          >
            Create New Course
          </Button>
        </div>
        
        <DataTable
          columns={columns}
          data={courses}
          keyExtractor={(course) => course.id}
          onRowClick={(course) => onViewCourse(course.id)}
          pagination={{
            pageSize: 10,
            totalItems: courses.length,
            currentPage: 1,
            onPageChange: () => {}
          }}
          emptyMessage="No courses found. Adjust your filters or create a new course."
        />
      </Card>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setShowDeleteConfirm(null)}
          title="Delete Course"
          size="md"
        >
          <div className="mb-6">
            <p className="text-gray-700">
              Are you sure you want to delete this course? This action cannot be undone.
            </p>
            {courses.find(c => c.id === showDeleteConfirm)?.enrolledTrainees > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
                <p className="font-medium">Warning:</p>
                <p>
                  This course has enrolled trainees. Deleting it will remove their access to the course content.
                </p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDeleteCourse(showDeleteConfirm)}
            >
              Delete Course
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Course Form Component
interface CourseFormProps {
  course?: Course;
  instructors: { id: string; name: string }[];
  availableTags: string[];
  onSave: (course: Partial<Course>) => Promise<void>;
  onCancel: () => void;
}

export const CourseForm: React.FC<CourseFormProps> = ({
  course,
  instructors,
  availableTags,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<Partial<Course>>(course || {
    title: '',
    description: '',
    status: 'draft',
    modules: [],
    instructors: [],
    tags: [],
  });
  const [selectedTag, setSelectedTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  // Handle multi-select (instructors)
  const handleInstructorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, option => option.value);
    setFormData({ ...formData, instructors: selected });
  };
  
  // Handle tag add
  const handleAddTag = () => {
    if (selectedTag && !formData.tags?.includes(selectedTag)) {
      setFormData({ ...formData, tags: [...(formData.tags || []), selectedTag] });
      setSelectedTag('');
    }
  };
  
  // Handle tag remove
  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags?.filter(t => t !== tag) });
  };
  
  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSave(formData);
      setAlertMessage({
        type: 'success',
        message: `Course ${course ? 'updated' : 'created'} successfully`
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to ${course ? 'update' : 'create'} course: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="course-form">
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}
      
      <Card>
        <div className="mb-6">
          <h2 className="text-lg font-medium">{course ? 'Edit Course' : 'Create New Course'}</h2>
        </div>
        
        <Form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <Input
              label="Course Title"
              name="title"
              value={formData.title || ''}
              onChange={handleInputChange}
              required
            />
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={formData.description || ''}
                onChange={handleInputChange}
                required
              ></textarea>
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={formData.status || 'draft'}
                onChange={handleInputChange}
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={formData.startDate ? new Date(formData.startDate).toISOString().slice(0, 10) : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setFormData({ ...formData, startDate: new Date(e.target.value) });
                    } else {
                      const newFormData = { ...formData };
                      delete newFormData.startDate;
                      setFormData(newFormData);
                    }
                  }}
                />
              </div>
              
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={formData.endDate ? new Date(formData.endDate).toISOString().slice(0, 10) : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setFormData({ ...formData, endDate: new Date(e.target.value) });
                    } else {
                      const newFormData = { ...formData };
                      delete newFormData.endDate;
                      setFormData(newFormData);
                    }
                  }}
                  min={formData.startDate ? new Date(formData.startDate).toISOString().slice(0, 10) : ''}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="instructors" className="block text-sm font-medium text-gray-700 mb-1">
                Instructors
              </label>
              <select
                id="instructors"
                name="instructors"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                multiple
                value={formData.instructors || []}
                onChange={handleInstructorChange}
              >
                {instructors.map(instructor => (
                  <option key={instructor.id} value={instructor.id}>
                    {instructor.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple instructors</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex space-x-2">
                <select
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                >
                  <option value="">Select a tag</option>
                  {availableTags
                    .filter(tag => !formData.tags?.includes(tag))
                    .map(tag => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={!selectedTag}
                >
                  Add
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.tags?.map(tag => (
                  <div 
                    key={tag} 
                    className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      type="button"
                      className="ml-1.5 inline-flex text-blue-400 hover:text-blue-600 focus:outline-none"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                {course ? 'Update Course' : 'Create Course'}
              </Button>
            </div>
          </div>
        </Form>
      </Card>
    </div>
  );
};

// Course Detail Component
interface CourseDetailProps {
  course: Course;
  onEditCourse: () => void;
  onViewTrainees: () => void;
  onAddModule: () => void;
  onEditModule: (moduleId: string) => void;
  onDeleteModule: (moduleId: string) => Promise<void>;
  onAddLesson: (moduleId: string) => void;
  onEditLesson: (moduleId: string, lessonId: string) => void;
  onDeleteLesson: (moduleId: string, lessonId: string) => Promise<void>;
  onReorderModule: (moduleId: string, newOrder: number) => Promise<void>;
  onReorderLesson: (moduleId: string, lessonId: string, newOrder: number) => Promise<void>;
}

export const CourseDetail: React.FC<CourseDetailProps> = ({
  course,
  onEditCourse,
  onViewTrainees,
  onAddModule,
  onEditModule,
  onDeleteModule,
  onAddLesson,
  onEditLesson,
  onDeleteLesson,
  onReorderModule,
  onReorderLesson
}) => {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmDeleteModule, setConfirmDeleteModule] = useState<string | null>(null);
  const [confirmDeleteLesson, setConfirmDeleteLesson] = useState<{ moduleId: string; lessonId: string } | null>(null);
  
  // Toggle module expanded state
  const toggleModule = (moduleId: string) => {
    const newExpandedModules = new Set(expandedModules);
    if (newExpandedModules.has(moduleId)) {
      newExpandedModules.delete(moduleId);
    } else {
      newExpandedModules.add(moduleId);
    }
    setExpandedModules(newExpandedModules);
  };
  
  // Handle module deletion
  const handleDeleteModule = async (moduleId: string) => {
    try {
      await onDeleteModule(moduleId);
      setAlertMessage({
        type: 'success',
        message: 'Module deleted successfully'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to delete module: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setConfirmDeleteModule(null);
    }
  };
  
  // Handle lesson deletion
  const handleDeleteLesson = async (moduleId: string, lessonId: string) => {
    try {
      await onDeleteLesson(moduleId, lessonId);
      setAlertMessage({
        type: 'success',
        message: 'Lesson deleted successfully'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to delete lesson: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setConfirmDeleteLesson(null);
    }
  };
  
  // Calculate total duration
  const calculateTotalDuration = () => {
    let total = 0;
    course.modules.forEach(module => {
      total += module.duration;
    });
    return total;
  };
  
  // Format duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins} min`;
    } else if (mins === 0) {
      return `${hours} hr`;
    } else {
      return `${hours} hr ${mins} min`;
    }
  };
  
  // Handle module reordering
  const handleMoveModule = async (moduleId: string, direction: 'up' | 'down') => {
    const moduleIndex = course.modules.findIndex(m => m.id === moduleId);
    if (moduleIndex === -1) return;
    
    let newOrder;
    if (direction === 'up' && moduleIndex > 0) {
      newOrder = course.modules[moduleIndex - 1].order;
    } else if (direction === 'down' && moduleIndex < course.modules.length - 1) {
      newOrder = course.modules[moduleIndex + 1].order;
    } else {
      return;
    }
    
    try {
      await onReorderModule(moduleId, newOrder);
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to reorder module: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };
  
  // Handle lesson reordering
  const handleMoveLesson = async (moduleId: string, lessonId: string, direction: 'up' | 'down') => {
    const module = course.modules.find(m => m.id === moduleId);
    if (!module) return;
    
    const lessonIndex = module.lessons.findIndex(l => l.id === lessonId);
    if (lessonIndex === -1) return;
    
    let newOrder;
    if (direction === 'up' && lessonIndex > 0) {
      newOrder = module.lessons[lessonIndex - 1].order;
    } else if (direction === 'down' && lessonIndex < module.lessons.length - 1) {
      newOrder = module.lessons[lessonIndex + 1].order;
    } else {
      return;
    }
    
    try {
      await onReorderLesson(moduleId, lessonId, newOrder);
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to reorder lesson: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };
  
  // Sort modules by order
  const sortedModules = [...course.modules].sort((a, b) => a.order - b.order);
  
  return (
    <div className="course-detail">
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}
      
      {/* Course Header */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{course.title}</h1>
            <p className="text-gray-500">{course.description}</p>
            
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    course.status === 'active' ? 'bg-green-100 text-green-800' : 
                    course.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                  </span>
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Trainees</p>
                <p className="font-medium">{course.enrolledTrainees}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Modules</p>
                <p className="font-medium">{course.modules.length}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-medium">{formatDuration(calculateTotalDuration())}</p>
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-sm text-gray-500">Scheduled</p>
              <p className="font-medium">
                {course.startDate && course.endDate ? (
                  `${new Date(course.startDate).toLocaleDateString()} - ${new Date(course.endDate).toLocaleDateString()}`
                ) : (
                  'Not scheduled'
                )}
              </p>
            </div>
            
            <div className="mt-4">
              <p className="text-sm text-gray-500">Tags</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {course.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-4 md:mt-0 flex flex-col space-y-2">
            <Button
              variant="primary"
              onClick={onEditCourse}
            >
              Edit Course
            </Button>
            <Button
              variant="outline"
              onClick={onViewTrainees}
            >
              View Trainees
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Modules & Lessons */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-lg font-medium">Course Content</h2>
          <Button
            variant="primary"
            onClick={onAddModule}
          >
            Add Module
          </Button>
        </div>
        
        {sortedModules.length > 0 ? (
          <div className="space-y-6">
            {sortedModules.map((module, moduleIndex) => (
              <div key={module.id} className="border rounded-lg overflow-hidden">
                <div 
                  className={`px-4 py-3 cursor-pointer ${
                    expandedModules.has(module.id) ? 'bg-gray-100' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => toggleModule(module.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`mr-2 transform ${expandedModules.has(module.id) ? 'rotate-90' : ''} transition-transform`}>
                        <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium">{module.title}</div>
                        <div className="text-sm text-gray-500">
                          {module.lessons.length} lesson{module.lessons.length !== 1 ? 's' : ''} • {formatDuration(module.duration)}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveModule(module.id, 'up');
                          }}
                          className="text-gray-400 hover:text-gray-600"
                          disabled={moduleIndex === 0}
                          title="Move Up"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path>
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveModule(module.id, 'down');
                          }}
                          className="text-gray-400 hover:text-gray-600"
                          disabled={moduleIndex === sortedModules.length - 1}
                          title="Move Down"
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                          </svg>
                        </button>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddLesson(module.id);
                        }}
                        className="text-green-600 hover:text-green-800"
                        title="Add Lesson"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditModule(module.id);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit Module"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteModule(module.id);
                        }}
                        className="text-red-600 hover:text-red-800"
                        title="Delete Module"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {module.description && (
                    <p className="mt-1 text-sm text-gray-500">{module.description}</p>
                  )}
                </div>
                
                {expandedModules.has(module.id) && (
                  <div className="p-4 border-t">
                    {module.lessons.length > 0 ? (
                      <div className="space-y-3">
                        {[...module.lessons].sort((a, b) => a.order - b.order).map((lesson, lessonIndex) => (
                          <div key={lesson.id} className="flex items-center justify-between p-3 border rounded-md bg-white">
                            <div>
                              <div className="font-medium">{lesson.title}</div>
                              <div className="text-sm text-gray-500">
                                {formatDuration(lesson.duration)} • {lesson.exercises.length} exercise{lesson.exercises.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => handleMoveLesson(module.id, lesson.id, 'up')}
                                  className="text-gray-400 hover:text-gray-600"
                                  disabled={lessonIndex === 0}
                                  title="Move Up"
                                >
                                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path>
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleMoveLesson(module.id, lesson.id, 'down')}
                                  className="text-gray-400 hover:text-gray-600"
                                  disabled={lessonIndex === module.lessons.length - 1}
                                  title="Move Down"
                                >
                                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                                  </svg>
                                </button>
                              </div>
                              <button
                                onClick={() => onEditLesson(module.id, lesson.id)}
                                className="text-blue-600 hover:text-blue-800"
                                title="Edit Lesson"
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                                </svg>
                              </button>
                              <button
                                onClick={() => setConfirmDeleteLesson({ moduleId: module.id, lessonId: lesson.id })}
                                className="text-red-600 hover:text-red-800"
                                title="Delete Lesson"
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <p>No lessons in this module yet.</p>
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => onAddLesson(module.id)}
                          className="mt-2"
                        >
                          Add Lesson
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No modules in this course yet.</p>
            <Button
              variant="outline"
              onClick={onAddModule}
              className="mt-2"
            >
              Add First Module
            </Button>
          </div>
        )}
      </Card>
      
      {/* Delete Module Confirmation Modal */}
      {confirmDeleteModule && (
        <Modal
          isOpen={true}
          onClose={() => setConfirmDeleteModule(null)}
          title="Delete Module"
          size="md"
        >
          <div className="mb-6">
            <p className="text-gray-700">
              Are you sure you want to delete this module? This action cannot be undone.
            </p>
            <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
              <p className="font-medium">Warning:</p>
              <p>
                Deleting this module will also delete all its lessons and content.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteModule(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDeleteModule(confirmDeleteModule)}
            >
              Delete Module
            </Button>
          </div>
        </Modal>
      )}
      
      {/* Delete Lesson Confirmation Modal */}
      {confirmDeleteLesson && (
        <Modal
          isOpen={true}
          onClose={() => setConfirmDeleteLesson(null)}
          title="Delete Lesson"
          size="md"
        >
          <div className="mb-6">
            <p className="text-gray-700">
              Are you sure you want to delete this lesson? This action cannot be undone.
            </p>
            <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700">
              <p className="font-medium">Warning:</p>
              <p>
                Deleting this lesson will also delete all its content and exercises.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteLesson(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => handleDeleteLesson(confirmDeleteLesson.moduleId, confirmDeleteLesson.lessonId)}
            >
              Delete Lesson
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};