// components/assessment/GradingForm.tsx
import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import assessmentService, {
  AssessmentItem,
  CompetencyAssessment,
  RatingScale,
  AssessmentStatus
} from '../../services/assessmentService';
import Button from '../ui/Button';

interface GradingFormProps {
  assessmentId: string;
  onComplete?: (assessment: AssessmentItem) => void;
  onCancel?: () => void;
}

const GradingForm: React.FC<GradingFormProps> = ({
  assessmentId,
  onComplete,
  onCancel,
}) => {
  // State
  const [assessment, setAssessment] = useState<AssessmentItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string>('');
  
  // Form setup
  const { control, handleSubmit, setValue, formState: { errors } } = useForm();
  
  // Load assessment data
  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await assessmentService.getAssessment(assessmentId);
        setAssessment(data);
        
        // Pre-fill form values
        if (data.competencies) {
          data.competencies.forEach((comp) => {
            setValue(`competency.${comp.id}.rating`, comp.rating);
            setValue(`competency.${comp.id}.comments`, comp.comments || '');
          });
        }
        setValue('notes', data.notes || '');
        setValue('overallRating', data.overallRating);
      } catch (err) {
        console.error('Error loading assessment:', err);
        setError('Failed to load assessment data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssessment();
  }, [assessmentId, setValue]);
  
  // Handle form submission
  const onSubmit = async (data: any) => {
    if (!assessment) return;
    
    try {
      setSaving(true);
      setError(null);
      
      // Format competencies data
      const competencies: CompetencyAssessment[] = assessment.competencies.map((comp) => ({
        id: comp.id,
        competencyId: comp.competencyId,
        competencyName: comp.competencyName,
        rating: data.competency[comp.id].rating as RatingScale,
        comments: data.competency[comp.id].comments,
      }));
      
      // Update assessment
      const updatedAssessment = await assessmentService.updateAssessment(assessmentId, {
        competencies,
        overallRating: data.overallRating,
        notes: data.notes,
        status: 'completed',
        completedAt: new Date().toISOString(),
      });
      
      setAssessment(updatedAssessment);
      
      if (onComplete) {
        onComplete(updatedAssessment);
      }
    } catch (err) {
      console.error('Error saving assessment:', err);
      setError('Failed to save assessment data. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle submission with signature
  const handleSubmitWithSignature = async () => {
    if (!assessment || !signature) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      const submittedAssessment = await assessmentService.submitAssessment(
        assessmentId,
        signature
      );
      
      setAssessment(submittedAssessment);
      
      if (onComplete) {
        onComplete(submittedAssessment);
      }
    } catch (err) {
      console.error('Error submitting assessment:', err);
      setError('Failed to submit assessment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-md">
        <h3 className="text-lg font-medium mb-2">Error</h3>
        <p>{error}</p>
        <div className="mt-4">
          <Button onClick={() => window.location.reload()}>Reload</Button>
        </div>
      </div>
    );
  }
  
  // Render no assessment state
  if (!assessment) {
    return (
      <div className="p-6 bg-gray-50 text-gray-700 rounded-md">
        <h3 className="text-lg font-medium mb-2">Assessment Not Found</h3>
        <p>The requested assessment could not be loaded.</p>
        <div className="mt-4">
          <Button onClick={onCancel}>Go Back</Button>
        </div>
      </div>
    );
  }
  
  // Check if assessment is already complete
  const isComplete = 
    assessment.status === 'completed' || 
    assessment.status === 'submitted' || 
    assessment.status === 'approved';
  
  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Assessment Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {assessment.exerciseName} Assessment
            </h1>
            <p className="text-gray-600 mt-1">
              {assessment.moduleName} &gt; {assessment.lessonName}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {assessment.type}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                assessment.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                assessment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                assessment.status === 'completed' ? 'bg-green-100 text-green-800' :
                assessment.status === 'submitted' ? 'bg-purple-100 text-purple-800' :
                assessment.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                'bg-red-100 text-red-800'
              }`}>
                {assessment.status.replace('_', ' ')}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <span className="text-sm text-gray-500">
              <strong>Trainee:</strong> {assessment.traineeName}
            </span>
            <span className="text-sm text-gray-500">
              <strong>Instructor:</strong> {assessment.instructorName}
            </span>
            <span className="text-sm text-gray-500">
              <strong>Date:</strong> {new Date(assessment.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Grading Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-6">
          {/* Competencies */}
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Competency Assessment</h2>
          
          <div className="space-y-6">
            {assessment.competencies.map((competency) => (
              <div key={competency.id} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-3">{competency.competencyName}</h3>
                
                {/* Rating buttons */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating (1-4)
                  </label>
                  <Controller
                    name={`competency.${competency.id}.rating`}
                    control={control}
                    rules={{ required: true }}
                    defaultValue={competency.rating}
                    render={({ field }) => (
                      <div className="flex space-x-2">
                        {[1, 2, 3, 4].map((rating) => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => field.onChange(rating)}
                            disabled={isComplete}
                            className={`w-14 h-14 rounded-full flex items-center justify-center focus:outline-none transition-colors ${
                              field.value === rating
                                ? getRatingColorClass(rating)
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            } ${isComplete ? 'opacity-70 cursor-not-allowed' : ''}`}
                          >
                            <span className="text-xl font-semibold">{rating}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  />
                  {errors?.competency?.[competency.id]?.rating && (
                    <p className="mt-1 text-sm text-red-600">Please select a rating</p>
                  )}
                </div>
                
                {/* Comments */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comments
                  </label>
                  <Controller
                    name={`competency.${competency.id}.comments`}
                    control={control}
                    defaultValue={competency.comments || ''}
                    render={({ field }) => (
                      <textarea
                        {...field}
                        rows={3}
                        disabled={isComplete}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                        placeholder="Add comments about this competency..."
                      />
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
          
          {/* Overall Rating */}
          <div className="mt-8">
            <h3 className="font-medium text-gray-800 mb-3">Overall Assessment</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Rating (1-4)
              </label>
              <Controller
                name="overallRating"
                control={control}
                rules={{ required: true }}
                defaultValue={assessment.overallRating}
                render={({ field }) => (
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => field.onChange(rating)}
                        disabled={isComplete}
                        className={`w-16 h-16 rounded-full flex items-center justify-center focus:outline-none transition-colors ${
                          field.value === rating
                            ? getRatingColorClass(rating)
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        } ${isComplete ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        <span className="text-2xl font-semibold">{rating}</span>
                      </button>
                    ))}
                  </div>
                )}
              />
              {errors.overallRating && (
                <p className="mt-1 text-sm text-red-600">Please select an overall rating</p>
              )}
            </div>
          </div>
          
          {/* Notes */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assessment Notes
            </label>
            <Controller
              name="notes"
              control={control}
              defaultValue={assessment.notes || ''}
              render={({ field }) => (
                <textarea
                  {...field}
                  rows={5}
                  disabled={isComplete}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  placeholder="Add general notes about the assessment..."
                />
              )}
            />
          </div>
          
          {/* Signature (for submission) */}
          {assessment.status === 'completed' && (
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h3 className="font-medium text-gray-800 mb-3">Digital Signature</h3>
              <p className="text-sm text-gray-600 mb-4">
                By signing this assessment, you certify that the evaluation is accurate and complete.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructor Signature
                </label>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Type your full name"
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Form Actions */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg border-t border-gray-200 flex justify-end space-x-3">
          <Button
            variant="light"
            onClick={onCancel}
            disabled={saving || submitting}
          >
            Cancel
          </Button>
          
          {assessment.status === 'draft' || assessment.status === 'in_progress' ? (
            <Button
              variant="primary"
              type="submit"
              isLoading={saving}
              disabled={isComplete}
            >
              Save Assessment
            </Button>
          ) : assessment.status === 'completed' ? (
            <Button
              variant="success"
              onClick={handleSubmitWithSignature}
              isLoading={submitting}
              disabled={!signature || isComplete}
            >
              Submit Assessment
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
};

// Helper function to get color classes based on rating
function getRatingColorClass(rating: number): string {
  switch (rating) {
    case 1:
      return 'bg-red-500 text-white';
    case 2:
      return 'bg-yellow-500 text-white';
    case 3:
      return 'bg-blue-500 text-white';
    case 4:
      return 'bg-green-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

export default GradingForm;
