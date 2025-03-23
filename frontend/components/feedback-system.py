// src/frontend/components/feedback/FeedbackSystem.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { DataTable, Column } from '../ui/DataTable';

// Types
export enum FeedbackType {
  PERFORMANCE = 'performance',
  ASSESSMENT = 'assessment',
  EXERCISE = 'exercise',
  GENERAL = 'general'
}

export enum FeedbackSeverity {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEEDS_IMPROVEMENT = 'needs_improvement',
  CRITICAL = 'critical'
}

export interface FeedbackItem {
  id: string;
  traineeId: string;
  traineeName: string;
  instructorId: string;
  instructorName: string;
  type: FeedbackType;
  title: string;
  content: string;
  severity: FeedbackSeverity;
  createdAt: Date;
  updatedAt?: Date;
  readAt?: Date;
  responseId?: string;
  responseContent?: string;
  responsedAt?: Date;
  relatedItemId?: string;
  relatedItemType?: string;
  tags?: string[];
  attachments?: {
    id: string;
    name: string;
    type: string;
    url: string;
  }[];
}

// Feedback Form Component
interface FeedbackFormProps {
  traineeId?: string;
  traineeName?: string;
  instructorId: string;
  instructorName: string;
  relatedItemId?: string;
  relatedItemType?: string;
  onSubmit: (feedback: Omit<FeedbackItem, 'id' | 'createdAt' | 'updatedAt' | 'readAt'>) => Promise<void>;
  onCancel?: () => void;
}

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  traineeId,
  traineeName,
  instructorId,
  instructorName,
  relatedItemId,
  relatedItemType,
  onSubmit,
  onCancel
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<FeedbackType>(FeedbackType.GENERAL);
  const [severity, setSeverity] = useState<FeedbackSeverity>(FeedbackSeverity.NEUTRAL);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      return;
    }
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      // In a real app, you would upload attachments here and get URLs back
      const attachmentUrls = attachments.map(file => ({
        id: `attachment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file) // This is just for demo purposes
      }));
      
      await onSubmit({
        traineeId: traineeId || '',
        traineeName: traineeName || '',
        instructorId,
        instructorName,
        type,
        title,
        content,
        severity,
        relatedItemId,
        relatedItemType,
        tags,
        attachments: attachmentUrls
      });
      
      // Reset form after successful submission
      setTitle('');
      setContent('');
      setType(FeedbackType.GENERAL);
      setSeverity(FeedbackSeverity.NEUTRAL);
      setTags([]);
      setTagInput('');
      setAttachments([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle tag input
  const handleTagAdd = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };
  
  // Handle tag removal
  const handleTagRemove = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  // Handle Enter key in tag input
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTagAdd();
    }
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setAttachments([...attachments, ...filesArray]);
    }
  };
  
  // Handle file removal
  const handleFileRemove = (fileName: string) => {
    setAttachments(attachments.filter(file => file.name !== fileName));
  };
  
  // Get severity badge color
  const getSeverityColor = (severity: FeedbackSeverity) => {
    switch (severity) {
      case FeedbackSeverity.POSITIVE:
        return 'bg-green-100 text-green-800';
      case FeedbackSeverity.NEUTRAL:
        return 'bg-blue-100 text-blue-800';
      case FeedbackSeverity.NEEDS_IMPROVEMENT:
        return 'bg-yellow-100 text-yellow-800';
      case FeedbackSeverity.CRITICAL:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}
      
      <div className="space-y-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        
        <div>
          <label htmlFor="feedback-type" className="block text-sm font-medium text-gray-700 mb-1">
            Feedback Type
          </label>
          <select
            id="feedback-type"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={type}
            onChange={(e) => setType(e.target.value as FeedbackType)}
          >
            <option value={FeedbackType.GENERAL}>General Feedback</option>
            <option value={FeedbackType.PERFORMANCE}>Performance Feedback</option>
            <option value={FeedbackType.ASSESSMENT}>Assessment Feedback</option>
            <option value={FeedbackType.EXERCISE}>Exercise Feedback</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="feedback-severity" className="block text-sm font-medium text-gray-700 mb-1">
            Feedback Severity
          </label>
          <div className="flex flex-wrap gap-2">
            {Object.values(FeedbackSeverity).map(sev => (
              <button
                key={sev}
                type="button"
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  severity === sev ? getSeverityColor(sev) : 'bg-gray-100 text-gray-800'
                }`}
                onClick={() => setSeverity(sev)}
              >
                {sev.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label htmlFor="feedback-content" className="block text-sm font-medium text-gray-700 mb-1">
            Feedback Content
          </label>
          <textarea
            id="feedback-content"
            rows={6}
            className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label htmlFor="feedback-tags" className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <div className="flex gap-2 mb-2">
            <input
              id="feedback-tags"
              type="text"
              className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add tags..."
            />
            <Button
              type="button"
              variant="outline"
              size="small"
              onClick={handleTagAdd}
            >
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span 
                  key={tag} 
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                  <button
                    type="button"
                    className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-blue-400 hover:text-blue-500 focus:outline-none focus:text-blue-500"
                    onClick={() => handleTagRemove(tag)}
                  >
                    <span className="sr-only">Remove tag</span>
                    <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                      <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Attachments
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none">
                  <span>Upload files</span>
                  <input 
                    id="file-upload" 
                    name="file-upload" 
                    type="file" 
                    multiple
                    className="sr-only" 
                    onChange={handleFileChange}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, PDF, DOCX up to 10MB</p>
            </div>
          </div>
          
          {attachments.length > 0 && (
            <ul className="mt-3 divide-y divide-gray-200 border rounded-md">
              {attachments.map(file => (
                <li key={file.name} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <svg className="flex-shrink-0 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-2 flex-1 truncate">{file.name}</span>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button
                      type="button"
                      className="font-medium text-red-600 hover:text-red-500"
                      onClick={() => handleFileRemove(file.name)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Submit Feedback
          </Button>
        </div>
      </div>
    </form>
  );
};

// Feedback Detail Component
interface FeedbackDetailProps {
  feedback: FeedbackItem;
  onRespond?: (responseContent: string) => Promise<void>;
  onMarkAsRead?: () => Promise<void>;
  onClose?: () => void;
}

export const FeedbackDetail: React.FC<FeedbackDetailProps> = ({
  feedback,
  onRespond,
  onMarkAsRead,
  onClose
}) => {
  const [isResponding, setIsResponding] = useState(false);
  const [responseContent, setResponseContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Mark as read on mount if not already read
  useEffect(() => {
    if (!feedback.readAt && onMarkAsRead) {
      onMarkAsRead();
    }
  }, [feedback.readAt, onMarkAsRead]);
  
  // Handle response submission
  const handleSubmitResponse = async () => {
    if (!responseContent.trim()) {
      setError('Response content is required.');
      return;
    }
    
    if (!onRespond) return;
    
    setError(null);
    setIsSubmitting(true);
    
    try {
      await onRespond(responseContent);
      setIsResponding(false);
      setResponseContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit response.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Get severity badge
  const getSeverityBadge = () => {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-800';
    
    switch (feedback.severity) {
      case FeedbackSeverity.POSITIVE:
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case FeedbackSeverity.NEUTRAL:
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        break;
      case FeedbackSeverity.NEEDS_IMPROVEMENT:
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        break;
      case FeedbackSeverity.CRITICAL:
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        break;
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {feedback.severity.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
      </span>
    );
  };
  
  // Get type badge
  const getTypeBadge = () => {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        {feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1)} Feedback
      </span>
    );
  };
  
  return (
    <div className="feedback-detail">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}
      
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-bold">{feedback.title}</h2>
        {onClose && (
          <Button
            variant="outline"
            size="small"
            onClick={onClose}
          >
            Close
          </Button>
        )}
      </div>
      
      <div className="mb-4 flex flex-wrap gap-2">
        {getSeverityBadge()}
        {getTypeBadge()}
        {feedback.tags?.map(tag => (
          <span 
            key={tag} 
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            {tag}
          </span>
        ))}
      </div>
      
      <div className="flex justify-between mb-4 text-sm text-gray-500">
        <div>
          <span>From: {feedback.instructorName}</span>
        </div>
        <div>
          <span>{new Date(feedback.createdAt).toLocaleString()}</span>
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg mb-6 whitespace-pre-wrap">
        {feedback.content}
      </div>
      
      {feedback.attachments && feedback.attachments.length > 0 && (
        <div className="mb-6">
          <h3 className="text-base font-medium mb-2">Attachments</h3>
          <ul className="divide-y divide-gray-200 border rounded-md">
            {feedback.attachments.map(file => (
              <li key={file.id} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-2 flex-1 truncate">{file.name}</span>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <a 
                    href={file.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Download
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {feedback.responseContent && (
        <div className="mb-6">
          <h3 className="text-base font-medium mb-2">Response</h3>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500 mb-2">
              <span>{new Date(feedback.responsedAt!).toLocaleString()}</span>
            </div>
            <div className="whitespace-pre-wrap">
              {feedback.responseContent}
            </div>
          </div>
        </div>
      )}
      
      {onRespond && !feedback.responseContent && (
        <div>
          {isResponding ? (
            <div>
              <h3 className="text-base font-medium mb-2">Your Response</h3>
              <textarea
                rows={4}
                className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm mb-2"
                value={responseContent}
                onChange={(e) => setResponseContent(e.target.value)}
                placeholder="Enter your response..."
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => setIsResponding(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleSubmitResponse}
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Submit Response
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button
                variant="primary"
                onClick={() => setIsResponding(true)}
              >
                Respond
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Feedback List Component
interface FeedbackListProps {
  feedbackItems: FeedbackItem[];
  onViewFeedback: (feedback: FeedbackItem) => void;
  onFilterChange?: (filter: { type?: FeedbackType; severity?: FeedbackSeverity; readStatus?: string }) => void;
}

export const FeedbackList: React.FC<FeedbackListProps> = ({
  feedbackItems,
  onViewFeedback,
  onFilterChange
}) => {
  const [activeFilter, setActiveFilter] = useState<{
    type?: FeedbackType;
    severity?: FeedbackSeverity;
    readStatus?: string;
  }>({});
  
  // Apply filter
  const handleFilterChange = (newFilter: { type?: FeedbackType; severity?: FeedbackSeverity; readStatus?: string }) => {
    const updatedFilter = { ...activeFilter, ...newFilter };
    setActiveFilter(updatedFilter);
    if (onFilterChange) {
      onFilterChange(updatedFilter);
    }
  };
  
  // Get severity badge
  const getSeverityBadge = (severity: FeedbackSeverity) => {
    let bgColor = 'bg-gray-100';
    let textColor = 'text-gray-800';
    
    switch (severity) {
      case FeedbackSeverity.POSITIVE:
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case FeedbackSeverity.NEUTRAL:
        bgColor = 'bg-blue-100';
        textColor = 'text-blue-800';
        break;
      case FeedbackSeverity.NEEDS_IMPROVEMENT:
        bgColor = 'bg-yellow-100';
        textColor = 'text-yellow-800';
        break;
      case FeedbackSeverity.CRITICAL:
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        break;
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
        {severity.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')}
      </span>
    );
  };
  
  // Define table columns
  const columns: Column<FeedbackItem>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (feedback) => (
        <div className="cursor-pointer hover:text-blue-600">
          <div className="font-medium">
            {feedback.title}
            {!feedback.readAt && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                New
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">{new Date(feedback.createdAt).toLocaleString()}</div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'traineeName',
      header: 'Trainee',
      render: (feedback) => feedback.traineeName,
      sortable: true
    },
    {
      key: 'instructorName',
      header: 'Instructor',
      render: (feedback) => feedback.instructorName,
      sortable: true
    },
    {
      key: 'type',
      header: 'Type',
      render: (feedback) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
          {feedback.type.charAt(0).toUpperCase() + feedback.type.slice(1)}
        </span>
      ),
      sortable: true
    },
    {
      key: 'severity',
      header: 'Severity',
      render: (feedback) => getSeverityBadge(feedback.severity),
      sortable: true
    },
    {
      key: 'status',
      header: 'Status',
      render: (feedback) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          feedback.responseContent 
            ? 'bg-green-100 text-green-800'
            : feedback.readAt
              ? 'bg-blue-100 text-blue-800'
              : 'bg-yellow-100 text-yellow-800'
        }`}>
          {feedback.responseContent 
            ? 'Responded'
            : feedback.readAt
              ? 'Read'
              : 'Unread'
          }
        </span>
      ),
      sortable: true
    }
  ];
  
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          variant={activeFilter.type === undefined ? 'primary' : 'outline'}
          size="small"
          onClick={() => handleFilterChange({ type: undefined })}
        >
          All Types
        </Button>
        <Button
          variant={activeFilter.type === FeedbackType.GENERAL ? 'primary' : 'outline'}
          size="small"
          onClick={() => handleFilterChange({ type: FeedbackType.GENERAL })}
        >
          General
        </Button>
        <Button
          variant={activeFilter.type === FeedbackType.PERFORMANCE ? 'primary' : 'outline'}
          size="small"
          onClick={() => handleFilterChange({ type: FeedbackType.PERFORMANCE })}
        >
          Performance
        </Button>
        <Button
          variant={activeFilter.type === FeedbackType.ASSESSMENT ? 'primary' : 'outline'}
          size="small"
          onClick={() => handleFilterChange({ type: FeedbackType.ASSESSMENT })}
        >
          Assessment
        </Button>
        <Button
          variant={activeFilter.type === FeedbackType.EXERCISE ? 'primary' : 'outline'}
          size="small"
          onClick={() => handleFilterChange({ type: FeedbackType.EXERCISE })}
        >
          Exercise
        </Button>
        
        <div className="ml-auto"></div>
        
        <Button
          variant={activeFilter.readStatus === undefined ? 'primary' : 'outline'}
          size="small"
          onClick={() => handleFilterChange({ readStatus: undefined })}
        >
          All Status
        </Button>
        <Button
          variant={activeFilter.readStatus === 'unread' ? 'primary' : 'outline'}
          size="small"
          onClick={() => handleFilterChange({ readStatus: 'unread' })}
        >
          Unread
        </Button>
        <Button
          variant={activeFilter.readStatus === 'read' ? 'primary' : 'outline'}
          size="small"
          onClick={() => handleFilterChange({ readStatus: 'read' })}
        >
          Read
        </Button>
        <Button
          variant={activeFilter.readStatus === 'responded' ? 'primary' : 'outline'}
          size="small"
          onClick={() => handleFilterChange({ readStatus: 'responded' })}
        >
          Responded
        </Button>
      </div>
      
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          variant={activeFilter.severity === undefined ? 'primary' : 'outline'}
          size="small"
          onClick={() => handleFilterChange({ severity: undefined })}
        >
          All Severity
        </Button>
        <Button
          variant={activeFilter.severity === FeedbackSeverity.POSITIVE ? 'primary' : 'outline'}
          size="small"
          onClick={() => handleFilterChange({ severity: FeedbackSeverity.POSITIVE })}
        >
          Positive
        </Button>
        <Button
          variant={activeFilter.severity === FeedbackSeverity.NEUTRAL ? 'primary' : 'outline'}
          size="small"
          onClick={() => handleFilterChange({ severity: FeedbackSeverity.NEUTRAL })}
        >
          Neutral
        </Button>
        <Button
          variant={activeFilter.severity === FeedbackSeverity.NEEDS_IMPROVEMENT ? 'primary' : 'outline'}
          size="small"
          onClick={() => handleFilterChange({ severity: FeedbackSeverity.NEEDS_IMPROVEMENT })}
        >
          Needs Improvement
        </Button>
        <Button
          variant={activeFilter.severity === FeedbackSeverity.CRITICAL ? 'primary' : 'outline'}
          size="small"
          onClick={() => handleFilterChange({ severity: FeedbackSeverity.CRITICAL })}
        >
          Critical
        </Button>
      </div>
      
      <DataTable
        columns={columns}
        data={feedbackItems}
        keyExtractor={(item) => item.id}
        onRowClick={onViewFeedback}
        emptyMessage="No feedback items found."
        pagination={{
          pageSize: 10,
          totalItems: feedbackItems.length,
          currentPage: 1,
          onPageChange: () => {}
        }}
      />
    </div>
  );
};

// Main Feedback System Component
interface FeedbackSystemProps {
  role: 'instructor' | 'trainee';
  userId: string;
  userName: string;
  traineeId?: string;
  traineeName?: string;
  feedbackItems: FeedbackItem[];
  onCreateFeedback: (feedback: Omit<FeedbackItem, 'id' | 'createdAt' | 'updatedAt' | 'readAt'>) => Promise<void>;
  onRespondToFeedback: (feedbackId: string, responseContent: string) => Promise<void>;
  onMarkAsRead: (feedbackId: string) => Promise<void>;
  onFilterChange?: (filter: { type?: FeedbackType; severity?: FeedbackSeverity; readStatus?: string }) => void;
}

export const FeedbackSystem: React.FC<FeedbackSystemProps> = ({
  role,
  userId,
  userName,
  traineeId,
  traineeName,
  feedbackItems,
  onCreateFeedback,
  onRespondToFeedback,
  onMarkAsRead,
  onFilterChange
}) => {
  const [isCreatingFeedback, setIsCreatingFeedback] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Handle feedback creation
  const handleCreateFeedback = async (feedbackData: Omit<FeedbackItem, 'id' | 'createdAt' | 'updatedAt' | 'readAt'>) => {
    try {
      await onCreateFeedback(feedbackData);
      setIsCreatingFeedback(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create feedback.');
    }
  };
  
  // Handle feedback response
  const handleRespondToFeedback = async (responseContent: string) => {
    if (!selectedFeedback) return;
    
    try {
      await onRespondToFeedback(selectedFeedback.id, responseContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to respond to feedback.');
    }
  };
  
  // Handle mark as read
  const handleMarkAsRead = async () => {
    if (!selectedFeedback) return;
    
    try {
      await onMarkAsRead(selectedFeedback.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark feedback as read.');
    }
  };
  
  // Handle view feedback
  const handleViewFeedback = (feedback: FeedbackItem) => {
    setSelectedFeedback(feedback);
  };
  
  return (
    <div className="feedback-system">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} className="mb-4" />}
      
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Feedback System</h1>
          
          {role === 'instructor' && (
            <Button
              variant="primary"
              onClick={() => setIsCreatingFeedback(true)}
            >
              Create Feedback
            </Button>
          )}
        </div>
        <p className="text-gray-500">
          {role === 'instructor'
            ? 'Create and manage feedback for trainees.'
            : 'View and respond to feedback from instructors.'
          }
        </p>
      </div>
      
      {selectedFeedback ? (
        <Card>
          <FeedbackDetail
            feedback={selectedFeedback}
            onRespond={role === 'trainee' ? handleRespondToFeedback : undefined}
            onMarkAsRead={!selectedFeedback.readAt ? handleMarkAsRead : undefined}
            onClose={() => setSelectedFeedback(null)}
          />
        </Card>
      ) : isCreatingFeedback ? (
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-bold">Create Feedback</h2>
          </div>
          
          <FeedbackForm
            traineeId={traineeId}
            traineeName={traineeName}
            instructorId={userId}
            instructorName={userName}
            onSubmit={handleCreateFeedback}
            onCancel={() => setIsCreatingFeedback(false)}
          />
        </Card>
      ) : (
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-bold">Feedback List</h2>
          </div>
          
          <FeedbackList
            feedbackItems={feedbackItems}
            onViewFeedback={handleViewFeedback}
            onFilterChange={onFilterChange}
          />
        </Card>
      )}
    </div>
  );
};
