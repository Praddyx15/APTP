// src/frontend/components/assessment/AssessmentCreator.tsx
import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { Modal } from '../ui/Modal';

// Types
export interface AssessmentType {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface CompetencyArea {
  id: string;
  name: string;
  description: string;
}

export interface AssessmentQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'performance';
  text: string;
  points: number;
  options?: string[];
  correctAnswer?: string | string[];
  competencyId?: string;
  rubric?: {
    criteria: string;
    excellent: string;
    proficient: string;
    basic: string;
    unsatisfactory: string;
  }[];
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  type: string;
  timeLimit?: number; // in minutes
  passingScore: number;
  totalPoints: number;
  questions: AssessmentQuestion[];
  instructions?: string;
  competencyAreas: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'published' | 'archived';
}

// Question Type Selection Component
interface QuestionTypePickerProps {
  onSelectType: (type: AssessmentQuestion['type']) => void;
}

const QuestionTypePicker: React.FC<QuestionTypePickerProps> = ({ onSelectType }) => {
  const questionTypes = [
    {
      type: 'multiple_choice' as const,
      name: 'Multiple Choice',
      description: 'Select one or more correct answers from a list of options',
      icon: (
        <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      )
    },
    {
      type: 'true_false' as const,
      name: 'True / False',
      description: 'Simple true or false questions',
      icon: (
        <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7l4-4m0 0l4 4m-4-4v18"></path>
        </svg>
      )
    },
    {
      type: 'short_answer' as const,
      name: 'Short Answer',
      description: 'Brief text responses, typically a few words or sentences',
      icon: (
        <svg className="h-8 w-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
        </svg>
      )
    },
    {
      type: 'essay' as const,
      name: 'Essay',
      description: 'Extended written responses requiring detailed explanation',
      icon: (
        <svg className="h-8 w-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      )
    },
    {
      type: 'performance' as const,
      name: 'Performance Task',
      description: 'Hands-on demonstration of skills with a scoring rubric',
      icon: (
        <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
        </svg>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Select Question Type</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {questionTypes.map((questionType) => (
          <div
            key={questionType.type}
            className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
            onClick={() => onSelectType(questionType.type)}
          >
            <div className="flex items-center mb-2">
              <div className="flex-shrink-0 mr-3">
                {questionType.icon}
              </div>
              <h4 className="text-lg font-medium">{questionType.name}</h4>
            </div>
            <p className="text-sm text-gray-500">{questionType.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Question Editor Component
interface QuestionEditorProps {
  question: Partial<AssessmentQuestion>;
  onChange: (updatedQuestion: Partial<AssessmentQuestion>) => void;
  competencyAreas: CompetencyArea[];
  onSave: () => void;
  onCancel: () => void;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  onChange,
  competencyAreas,
  onSave,
  onCancel
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = () => {
    // Validate question
    if (!question.text) {
      setError('Question text is required');
      return;
    }

    if (question.points === undefined || question.points <= 0) {
      setError('Points must be greater than 0');
      return;
    }

    if (question.type === 'multiple_choice' && (!question.options || question.options.length < 2)) {
      setError('Multiple choice questions must have at least 2 options');
      return;
    }

    if ((question.type === 'multiple_choice' || question.type === 'true_false') && !question.correctAnswer) {
      setError('Please specify the correct answer');
      return;
    }

    if (question.type === 'performance' && (!question.rubric || question.rubric.length === 0)) {
      setError('Performance tasks must have at least one rubric criterion');
      return;
    }

    onSave();
  };

  const handleAddOption = () => {
    const options = [...(question.options || []), ''];
    onChange({ ...question, options });
  };

  const handleOptionChange = (index: number, value: string) => {
    const options = [...(question.options || [])];
    options[index] = value;
    onChange({ ...question, options });
  };

  const handleRemoveOption = (index: number) => {
    const options = [...(question.options || [])];
    options.splice(index, 1);
    onChange({ ...question, options });
  };

  const handleAddRubricCriterion = () => {
    const rubric = [
      ...(question.rubric || []),
      {
        criteria: '',
        excellent: '',
        proficient: '',
        basic: '',
        unsatisfactory: ''
      }
    ];
    onChange({ ...question, rubric });
  };

  const handleRubricChange = (index: number, field: string, value: string) => {
    const rubric = [...(question.rubric || [])];
    rubric[index] = { ...rubric[index], [field]: value };
    onChange({ ...question, rubric });
  };

  const handleRemoveRubricCriterion = (index: number) => {
    const rubric = [...(question.rubric || [])];
    rubric.splice(index, 1);
    onChange({ ...question, rubric });
  };

  return (
    <div className="space-y-6">
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <div>
        <label htmlFor="question-text" className="block text-sm font-medium text-gray-700 mb-1">
          Question Text
        </label>
        <textarea
          id="question-text"
          className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          rows={3}
          value={question.text || ''}
          onChange={(e) => onChange({ ...question, text: e.target.value })}
          placeholder="Enter your question here..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="question-points" className="block text-sm font-medium text-gray-700 mb-1">
            Points
          </label>
          <input
            type="number"
            id="question-points"
            className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={question.points || ''}
            onChange={(e) => onChange({ ...question, points: Number(e.target.value) })}
            min="1"
          />
        </div>

        <div>
          <label htmlFor="question-competency" className="block text-sm font-medium text-gray-700 mb-1">
            Competency Area
          </label>
          <select
            id="question-competency"
            className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={question.competencyId || ''}
            onChange={(e) => onChange({ ...question, competencyId: e.target.value })}
          >
            <option value="">None</option>
            {competencyAreas.map((competency) => (
              <option key={competency.id} value={competency.id}>
                {competency.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Question type specific fields */}
      {question.type === 'multiple_choice' && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">Answer Options</label>
            <Button
              variant="outline"
              size="small"
              onClick={handleAddOption}
            >
              Add Option
            </Button>
          </div>

          <div className="space-y-2">
            {(question.options || []).map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="radio"
                  id={`option-${index}`}
                  name="correct-answer"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  checked={question.correctAnswer === option}
                  onChange={() => onChange({ ...question, correctAnswer: option })}
                />
                <input
                  type="text"
                  className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                />
                <button
                  type="button"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => handleRemoveOption(index)}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {question.type === 'true_false' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
          <div className="flex space-x-4">
            <div className="flex items-center">
              <input
                type="radio"
                id="answer-true"
                name="correct-answer"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                checked={question.correctAnswer === 'true'}
                onChange={() => onChange({ ...question, correctAnswer: 'true' })}
              />
              <label htmlFor="answer-true" className="ml-2 block text-sm text-gray-900">
                True
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                id="answer-false"
                name="correct-answer"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                checked={question.correctAnswer === 'false'}
                onChange={() => onChange({ ...question, correctAnswer: 'false' })}
              />
              <label htmlFor="answer-false" className="ml-2 block text-sm text-gray-900">
                False
              </label>
            </div>
          </div>
        </div>
      )}

      {question.type === 'short_answer' && (
        <div>
          <label htmlFor="model-answer" className="block text-sm font-medium text-gray-700 mb-1">
            Model Answer (for grading reference)
          </label>
          <textarea
            id="model-answer"
            className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            rows={2}
            value={question.correctAnswer as string || ''}
            onChange={(e) => onChange({ ...question, correctAnswer: e.target.value })}
            placeholder="Enter a model answer..."
          />
        </div>
      )}

      {question.type === 'essay' && (
        <div>
          <label htmlFor="grading-guidelines" className="block text-sm font-medium text-gray-700 mb-1">
            Grading Guidelines
          </label>
          <textarea
            id="grading-guidelines"
            className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            rows={3}
            value={question.correctAnswer as string || ''}
            onChange={(e) => onChange({ ...question, correctAnswer: e.target.value })}
            placeholder="Enter guidelines for grading this essay question..."
          />
        </div>
      )}

      {question.type === 'performance' && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">Rubric Criteria</label>
            <Button
              variant="outline"
              size="small"
              onClick={handleAddRubricCriterion}
            >
              Add Criterion
            </Button>
          </div>

          <div className="space-y-4">
            {(question.rubric || []).map((criterion, index) => (
              <div key={index} className="border rounded-md p-4">
                <div className="flex justify-between items-start mb-2">
                  <input
                    type="text"
                    className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    value={criterion.criteria}
                    onChange={(e) => handleRubricChange(index, 'criteria', e.target.value)}
                    placeholder="Criterion name"
                  />
                  <button
                    type="button"
                    className="ml-2 text-red-500 hover:text-red-700"
                    onClick={() => handleRemoveRubricCriterion(index)}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2 mt-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Excellent</label>
                    <input
                      type="text"
                      className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-xs"
                      value={criterion.excellent}
                      onChange={(e) => handleRubricChange(index, 'excellent', e.target.value)}
                      placeholder="Description of excellent performance"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Proficient</label>
                    <input
                      type="text"
                      className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-xs"
                      value={criterion.proficient}
                      onChange={(e) => handleRubricChange(index, 'proficient', e.target.value)}
                      placeholder="Description of proficient performance"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Basic</label>
                    <input
                      type="text"
                      className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-xs"
                      value={criterion.basic}
                      onChange={(e) => handleRubricChange(index, 'basic', e.target.value)}
                      placeholder="Description of basic performance"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Unsatisfactory</label>
                    <input
                      type="text"
                      className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-xs"
                      value={criterion.unsatisfactory}
                      onChange={(e) => handleRubricChange(index, 'unsatisfactory', e.target.value)}
                      placeholder="Description of unsatisfactory performance"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
        >
          Save Question
        </Button>
      </div>
    </div>
  );
};

// Question Preview Component
interface QuestionPreviewProps {
  question: AssessmentQuestion;
  competencyAreas: CompetencyArea[];
  onEdit: () => void;
  onDelete: () => void;
}

const QuestionPreview: React.FC<QuestionPreviewProps> = ({
  question,
  competencyAreas,
  onEdit,
  onDelete
}) => {
  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'multiple_choice':
        return 'Multiple Choice';
      case 'true_false':
        return 'True/False';
      case 'short_answer':
        return 'Short Answer';
      case 'essay':
        return 'Essay';
      case 'performance':
        return 'Performance Task';
      default:
        return type;
    }
  };

  const competency = competencyAreas.find(c => c.id === question.competencyId);

  return (
    <div className="border rounded-lg p-4 mb-4 hover:bg-gray-50">
      <div className="flex justify-between">
        <div className="flex items-start">
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium mr-2">
            {question.points}
          </span>
          <div>
            <p className="font-medium">{question.text}</p>
            <p className="text-sm text-gray-500 mt-1">
              {getQuestionTypeLabel(question.type)}
              {competency && ` | ${competency.name}`}
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            className="text-blue-500 hover:text-blue-700"
            onClick={onEdit}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
          <button
            className="text-red-500 hover:text-red-700"
            onClick={onDelete}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-3">
        {question.type === 'multiple_choice' && question.options && (
          <ul className="space-y-1">
            {question.options.map((option, index) => (
              <li key={index} className="flex items-center">
                <input
                  type="radio"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  checked={question.correctAnswer === option}
                  readOnly
                />
                <span className="ml-2 text-sm">{option}</span>
                {question.correctAnswer === option && (
                  <span className="ml-2 text-xs text-green-600">✓ Correct</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {question.type === 'true_false' && (
          <div className="flex space-x-4">
            <div className="flex items-center">
              <input
                type="radio"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                checked={question.correctAnswer === 'true'}
                readOnly
              />
              <span className="ml-2 text-sm">True</span>
              {question.correctAnswer === 'true' && (
                <span className="ml-2 text-xs text-green-600">✓ Correct</span>
              )}
            </div>
            <div className="flex items-center">
              <input
                type="radio"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                checked={question.correctAnswer === 'false'}
                readOnly
              />
              <span className="ml-2 text-sm">False</span>
              {question.correctAnswer === 'false' && (
                <span className="ml-2 text-xs text-green-600">✓ Correct</span>
              )}
            </div>
          </div>
        )}

        {question.type === 'short_answer' && (
          <div className="mt-2">
            <p className="text-xs text-gray-500">Model Answer:</p>
            <p className="text-sm">{question.correctAnswer as string}</p>
          </div>
        )}

        {question.type === 'essay' && (
          <div className="mt-2">
            <p className="text-xs text-gray-500">Grading Guidelines:</p>
            <p className="text-sm">{question.correctAnswer as string}</p>
          </div>
        )}

        {question.type === 'performance' && question.rubric && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">Rubric Criteria:</p>
            <div className="space-y-2 text-sm">
              {question.rubric.map((criterion, index) => (
                <div key={index} className="border-l-2 border-blue-500 pl-2">
                  <p className="font-medium">{criterion.criteria}</p>
                  <p className="text-xs"><span className="font-medium">Excellent:</span> {criterion.excellent}</p>
                  <p className="text-xs"><span className="font-medium">Proficient:</span> {criterion.proficient}</p>
                  <p className="text-xs"><span className="font-medium">Basic:</span> {criterion.basic}</p>
                  <p className="text-xs"><span className="font-medium">Unsatisfactory:</span> {criterion.unsatisfactory}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Assessment Creator Component
interface AssessmentCreatorProps {
  assessmentTypes: AssessmentType[];
  competencyAreas: CompetencyArea[];
  initialAssessment?: Partial<Assessment>;
  onSave: (assessment: Assessment) => Promise<void>;
  onCancel: () => void;
}

export const AssessmentCreator: React.FC<AssessmentCreatorProps> = ({
  assessmentTypes,
  competencyAreas,
  initialAssessment,
  onSave,
  onCancel
}) => {
  const [assessment, setAssessment] = useState<Partial<Assessment>>(
    initialAssessment || {
      title: '',
      description: '',
      type: '',
      passingScore: 70,
      totalPoints: 0,
      questions: [],
      competencyAreas: [],
      status: 'draft'
    }
  );

  const [currentStep, setCurrentStep] = useState<'details' | 'questions' | 'preview'>(
    initialAssessment ? 'questions' : 'details'
  );
  
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<AssessmentQuestion> | null>(null);
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Calculate total points
  useEffect(() => {
    if (assessment.questions) {
      const totalPoints = assessment.questions.reduce((sum, q) => sum + q.points, 0);
      setAssessment(prev => ({ ...prev, totalPoints }));
    }
  }, [assessment.questions]);

  // Handle assessment details change
  const handleDetailsChange = (field: string, value: any) => {
    setAssessment(prev => ({ ...prev, [field]: value }));
  };

  // Handle competency areas change
  const handleCompetencyAreasChange = (competencyId: string, checked: boolean) => {
    let competencyAreasList = [...(assessment.competencyAreas || [])];
    
    if (checked) {
      competencyAreasList.push(competencyId);
    } else {
      competencyAreasList = competencyAreasList.filter(id => id !== competencyId);
    }
    
    setAssessment(prev => ({ ...prev, competencyAreas: competencyAreasList }));
  };

  // Handle question type selection
  const handleQuestionTypeSelect = (type: AssessmentQuestion['type']) => {
    setCurrentQuestion({
      type,
      text: '',
      points: 1,
      options: type === 'multiple_choice' ? ['', ''] : undefined,
      rubric: type === 'performance' ? [{ criteria: '', excellent: '', proficient: '', basic: '', unsatisfactory: '' }] : undefined
    });
    setShowAddQuestion(false);
  };

  // Handle question change
  const handleQuestionChange = (updatedQuestion: Partial<AssessmentQuestion>) => {
    setCurrentQuestion(updatedQuestion);
  };

  // Handle save question
  const handleSaveQuestion = () => {
    const questions = [...(assessment.questions || [])];
    
    if (editingQuestionIndex !== null) {
      questions[editingQuestionIndex] = {
        ...questions[editingQuestionIndex],
        ...currentQuestion,
        id: questions[editingQuestionIndex].id
      } as AssessmentQuestion;
    } else {
      questions.push({
        ...currentQuestion,
        id: `question-${Date.now()}`
      } as AssessmentQuestion);
    }
    
    setAssessment(prev => ({ ...prev, questions }));
    setCurrentQuestion(null);
    setEditingQuestionIndex(null);
  };

  // Handle edit question
  const handleEditQuestion = (index: number) => {
    setCurrentQuestion(assessment.questions?.[index]);
    setEditingQuestionIndex(index);
  };

  // Handle delete question
  const handleDeleteQuestion = (index: number) => {
    const questions = [...(assessment.questions || [])];
    questions.splice(index, 1);
    setAssessment(prev => ({ ...prev, questions }));
  };

  // Handle save assessment
  const handleSaveAssessment = async () => {
    // Validate assessment
    if (!assessment.title) {
      setAlertMessage({
        type: 'error',
        message: 'Assessment title is required'
      });
      return;
    }

    if (!assessment.type) {
      setAlertMessage({
        type: 'error',
        message: 'Assessment type is required'
      });
      return;
    }

    if (!assessment.questions || assessment.questions.length === 0) {
      setAlertMessage({
        type: 'error',
        message: 'Assessment must have at least one question'
      });
      return;
    }

    try {
      await onSave(assessment as Assessment);
      setAlertMessage({
        type: 'success',
        message: 'Assessment saved successfully'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to save assessment: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'details':
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="assessment-title" className="block text-sm font-medium text-gray-700 mb-1">
                Assessment Title
              </label>
              <input
                type="text"
                id="assessment-title"
                className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={assessment.title || ''}
                onChange={(e) => handleDetailsChange('title', e.target.value)}
                placeholder="Enter assessment title..."
              />
            </div>

            <div>
              <label htmlFor="assessment-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="assessment-description"
                className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                rows={3}
                value={assessment.description || ''}
                onChange={(e) => handleDetailsChange('description', e.target.value)}
                placeholder="Enter assessment description..."
              />
            </div>

            <div>
              <label htmlFor="assessment-type" className="block text-sm font-medium text-gray-700 mb-1">
                Assessment Type
              </label>
              <select
                id="assessment-type"
                className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={assessment.type || ''}
                onChange={(e) => handleDetailsChange('type', e.target.value)}
              >
                <option value="">Select assessment type</option>
                {assessmentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="assessment-time-limit" className="block text-sm font-medium text-gray-700 mb-1">
                  Time Limit (minutes, optional)
                </label>
                <input
                  type="number"
                  id="assessment-time-limit"
                  className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={assessment.timeLimit || ''}
                  onChange={(e) => handleDetailsChange('timeLimit', e.target.value ? Number(e.target.value) : undefined)}
                  min="1"
                />
              </div>

              <div>
                <label htmlFor="assessment-passing-score" className="block text-sm font-medium text-gray-700 mb-1">
                  Passing Score (%)
                </label>
                <input
                  type="number"
                  id="assessment-passing-score"
                  className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  value={assessment.passingScore || 70}
                  onChange={(e) => handleDetailsChange('passingScore', Number(e.target.value))}
                  min="1"
                  max="100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="assessment-instructions" className="block text-sm font-medium text-gray-700 mb-1">
                Instructions (optional)
              </label>
              <textarea
                id="assessment-instructions"
                className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                rows={3}
                value={assessment.instructions || ''}
                onChange={(e) => handleDetailsChange('instructions', e.target.value)}
                placeholder="Enter instructions for trainees..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Competency Areas Covered
              </label>
              <div className="max-h-60 overflow-y-auto border rounded-md p-2">
                {competencyAreas.map((competency) => (
                  <div key={competency.id} className="flex items-start p-2">
                    <input
                      type="checkbox"
                      id={`competency-${competency.id}`}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
                      checked={(assessment.competencyAreas || []).includes(competency.id)}
                      onChange={(e) => handleCompetencyAreasChange(competency.id, e.target.checked)}
                    />
                    <label htmlFor={`competency-${competency.id}`} className="ml-2 text-sm text-gray-900">
                      <div className="font-medium">{competency.name}</div>
                      <div className="text-xs text-gray-500">{competency.description}</div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 'questions':
        return (
          <div>
            {/* Question list */}
            <div className="mb-6">
              {assessment.questions && assessment.questions.length > 0 ? (
                <div>
                  <h3 className="text-lg font-medium mb-4">Assessment Questions</h3>
                  {assessment.questions.map((question, index) => (
                    <QuestionPreview
                      key={question.id}
                      question={question}
                      competencyAreas={competencyAreas}
                      onEdit={() => handleEditQuestion(index)}
                      onDelete={() => handleDeleteQuestion(index)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No questions added</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by adding your first question.
                  </p>
                </div>
              )}
            </div>

            {/* Add question button */}
            {!currentQuestion && (
              <div className="flex justify-center">
                <Button
                  variant="primary"
                  onClick={() => setShowAddQuestion(true)}
                >
                  Add Question
                </Button>
              </div>
            )}

            {/* Question type picker */}
            {showAddQuestion && (
              <Card>
                <QuestionTypePicker onSelectType={handleQuestionTypeSelect} />
              </Card>
            )}

            {/* Question editor */}
            {currentQuestion && (
              <Card>
                <QuestionEditor
                  question={currentQuestion}
                  onChange={handleQuestionChange}
                  competencyAreas={competencyAreas}
                  onSave={handleSaveQuestion}
                  onCancel={() => {
                    setCurrentQuestion(null);
                    setEditingQuestionIndex(null);
                  }}
                />
              </Card>
            )}
          </div>
        );
      
      case 'preview':
        return (
          <div className="space-y-6">
            <div className="border rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">{assessment.title}</h2>
                  <p className="text-gray-500">{assessment.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    Total Points: {assessment.totalPoints}
                  </p>
                  <p className="text-sm text-gray-500">
                    Passing Score: {assessment.passingScore}%
                  </p>
                  {assessment.timeLimit && (
                    <p className="text-sm text-gray-500">
                      Time Limit: {assessment.timeLimit} minutes
                    </p>
                  )}
                </div>
              </div>

              {assessment.instructions && (
                <div className="mb-6 bg-blue-50 p-4 rounded-md">
                  <h3 className="text-sm font-medium text-blue-800 mb-1">Instructions</h3>
                  <p className="text-sm text-blue-800">{assessment.instructions}</p>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-medium mb-2">Competency Areas Covered</h3>
                <div className="flex flex-wrap gap-2">
                  {assessment.competencyAreas?.map(areaId => {
                    const area = competencyAreas.find(c => c.id === areaId);
                    return area ? (
                      <span key={area.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {area.name}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Questions</h3>
                {assessment.questions?.map((question, index) => (
                  <div key={question.id} className="mb-6">
                    <div className="flex items-center mb-2">
                      <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-800 text-xs font-medium mr-2">
                        {index + 1}
                      </span>
                      <h4 className="text-base font-medium">{question.text}</h4>
                      <span className="ml-auto text-sm font-medium text-gray-500">
                        {question.points} points
                      </span>
                    </div>

                    <div className="ml-8">
                      {question.type === 'multiple_choice' && question.options && (
                        <ul className="space-y-2">
                          {question.options.map((option, optIndex) => (
                            <li key={optIndex} className="flex items-center">
                              <input
                                type="radio"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                disabled
                              />
                              <span className="ml-2 text-sm">{option}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {question.type === 'true_false' && (
                        <div className="flex space-x-4">
                          <div className="flex items-center">
                            <input
                              type="radio"
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              disabled
                            />
                            <span className="ml-2 text-sm">True</span>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="radio"
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              disabled
                            />
                            <span className="ml-2 text-sm">False</span>
                          </div>
                        </div>
                      )}

                      {question.type === 'short_answer' && (
                        <div className="border border-gray-300 rounded-md p-2 h-24 bg-gray-50"></div>
                      )}

                      {question.type === 'essay' && (
                        <div className="border border-gray-300 rounded-md p-2 h-36 bg-gray-50"></div>
                      )}

                      {question.type === 'performance' && (
                        <div className="border border-gray-300 rounded-md p-2 bg-gray-50">
                          <p className="text-sm text-gray-500">
                            Performance task evaluation will be conducted by an instructor using the defined rubric.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="assessment-creator">
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Assessment</h1>
        <p className="text-gray-500">
          {currentStep === 'details'
            ? 'Enter the basic details for this assessment'
            : currentStep === 'questions'
            ? 'Add questions to your assessment'
            : 'Review your assessment before saving'}
        </p>
      </div>

      {/* Step indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div
            className={`flex items-center ${
              currentStep === 'details' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <div
              className={`flex items-center justify-center h-8 w-8 rounded-full ${
                currentStep === 'details' ? 'bg-blue-100' : 'bg-gray-100'
              }`}
            >
              <span className="text-sm font-medium">1</span>
            </div>
            <span className="ml-2 text-sm font-medium">Details</span>
          </div>
          <div className="flex-1 mx-4 h-0.5 bg-gray-200"></div>
          <div
            className={`flex items-center ${
              currentStep === 'questions' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <div
              className={`flex items-center justify-center h-8 w-8 rounded-full ${
                currentStep === 'questions' ? 'bg-blue-100' : 'bg-gray-100'
              }`}
            >
              <span className="text-sm font-medium">2</span>
            </div>
            <span className="ml-2 text-sm font-medium">Questions</span>
          </div>
          <div className="flex-1 mx-4 h-0.5 bg-gray-200"></div>
          <div
            className={`flex items-center ${
              currentStep === 'preview' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <div
              className={`flex items-center justify-center h-8 w-8 rounded-full ${
                currentStep === 'preview' ? 'bg-blue-100' : 'bg-gray-100'
              }`}
            >
              <span className="text-sm font-medium">3</span>
            </div>
            <span className="ml-2 text-sm font-medium">Preview</span>
          </div>
        </div>
      </div>

      <Card className="mb-6">
        {renderStepContent()}
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <div>
          {currentStep !== 'details' && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep(currentStep === 'questions' ? 'details' : 'questions')}
            >
              Previous
            </Button>
          )}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          {currentStep !== 'preview' ? (
            <Button
              variant="primary"
              onClick={() => setCurrentStep(currentStep === 'details' ? 'questions' : 'preview')}
              disabled={
                (currentStep === 'details' && (!assessment.title || !assessment.type)) ||
                (currentStep === 'questions' && (!assessment.questions || assessment.questions.length === 0))
              }
            >
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSaveAssessment}
            >
              Save Assessment
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
