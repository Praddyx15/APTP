// src/frontend/components/assessment/AssessmentInterface.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Tabs, Tab } from '../ui/Tabs';
import { Alert } from '../ui/Alert';

// Types
export enum CompetencyLevel {
  UNSATISFACTORY = 1,
  BASIC = 2,
  PROFICIENT = 3,
  EXEMPLARY = 4
}

export interface Competency {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface TraineePerformance {
  traineeId: string;
  traineeName: string;
  assessmentId: string;
  date: Date;
  competencyScores: {
    competencyId: string;
    score: CompetencyLevel;
    notes?: string;
  }[];
  overallScore?: number;
  instructorId: string;
  instructorName: string;
  signatureData?: string;
  isSynced: boolean;
}

export interface AssessmentForm {
  id: string;
  name: string;
  description: string;
  competencies: Competency[];
  categories: string[];
}

// Helper components
interface CompetencyRatingProps {
  competency: Competency;
  currentScore?: CompetencyLevel;
  onChange: (competencyId: string, score: CompetencyLevel) => void;
  onNotesChange: (competencyId: string, notes: string) => void;
  notes?: string;
}

const CompetencyRating: React.FC<CompetencyRatingProps> = ({
  competency,
  currentScore,
  onChange,
  onNotesChange,
  notes = ''
}) => {
  const handleScoreChange = (score: CompetencyLevel) => {
    onChange(competency.id, score);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onNotesChange(competency.id, e.target.value);
  };

  // Define level descriptions
  const levelDescriptions = {
    [CompetencyLevel.UNSATISFACTORY]: 'Unsatisfactory - Below standards, requires significant improvement',
    [CompetencyLevel.BASIC]: 'Basic - Meets minimum standards, but needs improvement',
    [CompetencyLevel.PROFICIENT]: 'Proficient - Consistently meets standards with occasional guidance',
    [CompetencyLevel.EXEMPLARY]: 'Exemplary - Exceeds standards, demonstrates mastery'
  };

  // Get color for each level
  const getLevelColor = (level: CompetencyLevel, isSelected: boolean) => {
    const baseClasses = 'px-3 py-2 text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors';
    
    if (!isSelected) {
      return `${baseClasses} bg-gray-100 text-gray-700 hover:bg-gray-200`;
    }
    
    switch (level) {
      case CompetencyLevel.UNSATISFACTORY:
        return `${baseClasses} bg-red-600 text-white`;
      case CompetencyLevel.BASIC:
        return `${baseClasses} bg-yellow-500 text-white`;
      case CompetencyLevel.PROFICIENT:
        return `${baseClasses} bg-green-500 text-white`;
      case CompetencyLevel.EXEMPLARY:
        return `${baseClasses} bg-blue-600 text-white`;
    }
  };

  return (
    <div className="mb-6 p-4 border rounded-lg">
      <div className="mb-2">
        <h3 className="text-lg font-medium">{competency.name}</h3>
        <p className="text-sm text-gray-500 mb-1">Category: {competency.category}</p>
        <p className="text-sm">{competency.description}</p>
      </div>

      <div className="my-4">
        <p className="text-sm font-medium mb-2">Rating:</p>
        <div className="flex flex-wrap gap-2">
          {Object.values(CompetencyLevel)
            .filter(v => !isNaN(Number(v)))
            .map(level => (
              <button
                key={level}
                className={getLevelColor(level as CompetencyLevel, currentScore === level)}
                onClick={() => handleScoreChange(level as CompetencyLevel)}
                title={levelDescriptions[level as CompetencyLevel]}
              >
                {level}
              </button>
            ))}
        </div>
      </div>

      <div>
        <label htmlFor={`notes-${competency.id}`} className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id={`notes-${competency.id}`}
          rows={2}
          className="block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Add specific observations or feedback..."
          value={notes}
          onChange={handleNotesChange}
        />
      </div>
    </div>
  );
};

// Signature Pad component
interface SignaturePadProps {
  onChange: (signatureData: string) => void;
  existingSignature?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onChange, existingSignature }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!existingSignature);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Clear canvas
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw existing signature if provided
    if (existingSignature) {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0);
      };
      img.src = existingSignature;
      setHasSignature(true);
    }

  }, [existingSignature]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    context.lineWidth = 2;
    context.lineCap = 'round';
    context.strokeStyle = 'black';

    context.lineTo(x, y);
    context.stroke();
  };

  const endDrawing = () => {
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Save canvas data
    const signatureData = canvas.toDataURL('image/png');
    onChange(signatureData);
    setHasSignature(true);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    onChange('');
    setHasSignature(false);
  };

  return (
    <div className="signature-pad">
      <p className="text-sm text-gray-500 mb-2">Sign below to certify this assessment:</p>
      
      <div className="border rounded-md overflow-hidden mb-2">
        <canvas
          ref={canvasRef}
          width={600}
          height={150}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          className="bg-white cursor-crosshair w-full"
        />
      </div>
      
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="small"
          onClick={clearSignature}
          disabled={!hasSignature}
        >
          Clear Signature
        </Button>
      </div>
    </div>
  );
};

// Performance Trends Chart (placeholder)
interface PerformanceTrendsProps {
  traineeId: string;
  competencyId?: string;
}

const PerformanceTrends: React.FC<PerformanceTrendsProps> = ({ traineeId, competencyId }) => {
  // In a real implementation, this would fetch historical data and render a chart
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-medium mb-4">Performance Trends</h3>
      <div className="h-64 bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">
          Performance trend chart would be displayed here.
          {competencyId ? ` Showing data for competency ${competencyId}.` : ' Showing average across all competencies.'}
        </p>
      </div>
    </div>
  );
};

// Main Assessment Interface Component
interface AssessmentInterfaceProps {
  trainee: {
    id: string;
    name: string;
    photo?: string;
  };
  assessmentForm: AssessmentForm;
  existingPerformance?: TraineePerformance;
  onSave: (performance: TraineePerformance) => Promise<void>;
  onCompare: (traineeId: string) => void;
  instructor: {
    id: string;
    name: string;
  };
  isOfflineMode?: boolean;
}

export const AssessmentInterface: React.FC<AssessmentInterfaceProps> = ({
  trainee,
  assessmentForm,
  existingPerformance,
  onSave,
  onCompare,
  instructor,
  isOfflineMode = false
}) => {
  const [activeCategory, setActiveCategory] = useState<string | 'all'>('all');
  const [scores, setScores] = useState<Record<string, CompetencyLevel>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [signature, setSignature] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showTrends, setShowTrends] = useState(false);
  const [selectedCompetencyId, setSelectedCompetencyId] = useState<string | undefined>(undefined);

  // Initialize state from existing performance data if available
  useEffect(() => {
    if (existingPerformance) {
      const initialScores: Record<string, CompetencyLevel> = {};
      const initialNotes: Record<string, string> = {};
      
      existingPerformance.competencyScores.forEach(score => {
        initialScores[score.competencyId] = score.score;
        if (score.notes) {
          initialNotes[score.competencyId] = score.notes;
        }
      });
      
      setScores(initialScores);
      setNotes(initialNotes);
      
      if (existingPerformance.signatureData) {
        setSignature(existingPerformance.signatureData);
      }
    }
  }, [existingPerformance]);

  // Handle competency score change
  const handleScoreChange = (competencyId: string, score: CompetencyLevel) => {
    setScores(prev => ({
      ...prev,
      [competencyId]: score
    }));
  };

  // Handle notes change
  const handleNotesChange = (competencyId: string, note: string) => {
    setNotes(prev => ({
      ...prev,
      [competencyId]: note
    }));
  };

  // Calculate overall score
  const calculateOverallScore = (): number | undefined => {
    const scoredCompetencies = Object.keys(scores).length;
    if (scoredCompetencies === 0) return undefined;
    
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    return Math.round((totalScore / scoredCompetencies) * 100) / 100;
  };

  // Check if assessment is complete
  const isAssessmentComplete = (): boolean => {
    // Check if all competencies have been scored
    return assessmentForm.competencies.every(comp => scores[comp.id] !== undefined);
  };

  // Save assessment
  const handleSave = async () => {
    if (!isAssessmentComplete() && !window.confirm('Not all competencies have been rated. Do you want to save anyway?')) {
      return;
    }
    
    setIsSaving(true);
    
    try {
      const performance: TraineePerformance = {
        traineeId: trainee.id,
        traineeName: trainee.name,
        assessmentId: assessmentForm.id,
        date: new Date(),
        competencyScores: assessmentForm.competencies.map(comp => ({
          competencyId: comp.id,
          score: scores[comp.id] || CompetencyLevel.UNSATISFACTORY,
          notes: notes[comp.id]
        })),
        overallScore: calculateOverallScore(),
        instructorId: instructor.id,
        instructorName: instructor.name,
        signatureData: signature,
        isSynced: !isOfflineMode
      };
      
      await onSave(performance);
      
      setAlertMessage({
        type: 'success',
        message: 'Assessment saved successfully.'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Error saving assessment: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter competencies by category
  const filteredCompetencies = activeCategory === 'all' 
    ? assessmentForm.competencies
    : assessmentForm.competencies.filter(comp => comp.category === activeCategory);

  // Create tabs for categories
  const categoryTabs: Tab[] = [
    {
      id: 'all',
      label: 'All Categories',
      content: <></>
    },
    ...assessmentForm.categories.map(category => ({
      id: category,
      label: category,
      content: <></>
    }))
  ];

  // Calculate completion percentage
  const completionPercentage = Math.round(
    (Object.keys(scores).length / assessmentForm.competencies.length) * 100
  );

  // Time remaining warning (for demo purposes)
  const showTimeWarning = completionPercentage < 50;

  return (
    <div className="assessment-interface">
      {/* Alert message */}
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}
      
      {/* Header with trainee info */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row">
          <div className="flex-shrink-0 mb-4 sm:mb-0 sm:mr-6">
            {trainee.photo ? (
              <img 
                src={trainee.photo} 
                alt={trainee.name} 
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                <svg className="h-12 w-12" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          
          <div className="flex-grow">
            <h2 className="text-2xl font-bold">{trainee.name}</h2>
            <p className="text-gray-500">Assessment: {assessmentForm.name}</p>
            <p className="text-gray-500">Instructor: {instructor.name}</p>
            <p className="text-gray-500">Date: {new Date().toLocaleDateString()}</p>
            
            {/* Completion status */}
            <div className="mt-2">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-700 mr-2">Completion: {completionPercentage}%</span>
                <div className="w-48 bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${
                      completionPercentage >= 100 ? 'bg-green-600' :
                      completionPercentage >= 50 ? 'bg-yellow-400' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${completionPercentage}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Time warning */}
              {showTimeWarning && (
                <p className="text-sm text-yellow-600 mt-1">
                  <svg className="inline-block w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Assessment is less than 50% complete. Please complete all competencies.
                </p>
              )}
            </div>
          </div>
          
          <div className="flex-shrink-0 mt-4 sm:mt-0">
            <Button
              variant="outline"
              onClick={() => onCompare(trainee.id)}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                </svg>
              }
            >
              Compare Performance
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Toggle between assessment and trends */}
      <div className="mb-6 flex">
        <Button
          variant={!showTrends ? 'primary' : 'outline'}
          onClick={() => setShowTrends(false)}
          className="mr-2"
        >
          Assessment Form
        </Button>
        <Button
          variant={showTrends ? 'primary' : 'outline'}
          onClick={() => setShowTrends(true)}
        >
          Performance Trends
        </Button>
      </div>
      
      {showTrends ? (
        <div>
          <Card className="mb-6">
            <div className="mb-4">
              <label htmlFor="competency-select" className="block text-sm font-medium text-gray-700 mb-1">
                Select Competency
              </label>
              <select
                id="competency-select"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={selectedCompetencyId || ''}
                onChange={(e) => setSelectedCompetencyId(e.target.value || undefined)}
              >
                <option value="">All Competencies (Average)</option>
                {assessmentForm.competencies.map(comp => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </select>
            </div>
            
            <PerformanceTrends 
              traineeId={trainee.id} 
              competencyId={selectedCompetencyId}
            />
          </Card>
        </div>
      ) : (
        <div>
          {/* Category tabs */}
          <div className="mb-6">
            <Tabs
              tabs={categoryTabs}
              defaultTabId="all"
              onChange={(tabId) => setActiveCategory(tabId)}
            />
          </div>
          
          {/* Competency rating forms */}
          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-medium">Competency Ratings</h3>
              <p className="text-sm text-gray-500">
                Rate each competency on a scale of 1-4, with 1 being unsatisfactory and 4 being exemplary.
              </p>
            </div>
            
            {filteredCompetencies.length > 0 ? (
              <div>
                {filteredCompetencies.map(competency => (
                  <CompetencyRating
                    key={competency.id}
                    competency={competency}
                    currentScore={scores[competency.id]}
                    onChange={handleScoreChange}
                    onNotesChange={handleNotesChange}
                    notes={notes[competency.id] || ''}
                  />
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No competencies found for this category.</p>
            )}
            
            {/* Signature pad */}
            <div className="mt-6 pt-6 border-t">
              <SignaturePad
                onChange={setSignature}
                existingSignature={signature}
              />
            </div>
            
            {/* Save button */}
            <div className="mt-6 flex justify-end">
              <Button
                variant="primary"
                onClick={handleSave}
                isLoading={isSaving}
                disabled={isSaving}
              >
                {isOfflineMode ? 'Save for Later Sync' : 'Save Assessment'}
              </Button>
            </div>
            
            {/* Offline mode indicator */}
            {isOfflineMode && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Offline Mode Active</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        You're currently working offline. This assessment will be saved locally and synced when you reconnect to the internet.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};