// src/frontend/components/AssessmentInterface/AssessmentInterface.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Save, 
  CheckCircle, 
  Clock, 
  User, 
  Calendar, 
  FileText,
  BarChart,
  Paperclip,
  X,
  ChevronDown,
  ChevronUp,
  Edit,
  Printer,
  MessageSquare
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Types
export interface Trainee {
  id: string;
  name: string;
  avatarUrl?: string;
  position?: string;
  department?: string;
  progress?: number; // Overall progress in the program (0-100)
  status?: 'active' | 'completed' | 'on-leave' | 'pending';
}

export interface Instructor {
  id: string;
  name: string;
  avatarUrl?: string;
  position?: string;
  digital_signature?: string;
}

export interface Competency {
  id: string;
  name: string;
  description?: string;
  standards?: string[];
  passingScore?: number; // Minimum score to pass (1-4 scale)
}

export interface AssessmentCriteria {
  id: string;
  competencyId: string;
  description: string;
  weightPercentage?: number; // Weight in the overall assessment
}

export interface PerformanceIndicator {
  id: string;
  criteriaId: string;
  description: string;
  score1Description?: string; // Description for score 1
  score2Description?: string; // Description for score 2
  score3Description?: string; // Description for score 3
  score4Description?: string; // Description for score 4
}

export interface AssessmentScore {
  indicatorId: string;
  score: number; // 1-4 scale
  notes?: string;
}

export interface Assessment {
  id: string;
  traineeId: string;
  moduleId?: string;
  moduleName?: string;
  lessonId?: string;
  lessonName?: string;
  exerciseId?: string;
  exerciseName?: string;
  instructorId: string;
  date: string;
  status: 'draft' | 'completed' | 'reviewed' | 'pending';
  scores: AssessmentScore[];
  overallNotes?: string;
  strengths?: string[];
  improvements?: string[];
  completedDate?: string;
  instructorSignature?: string;
  traineeSignature?: string;
  trainingEnvironment?: string; // e.g., "simulator", "aircraft", "classroom"
  conditions?: string; // e.g., "night", "IMC", "VMC"
  attachments?: {
    id: string;
    name: string;
    type: string;
    url: string;
  }[];
}

export interface HistoricalAssessment {
  id: string;
  date: string;
  instructorName: string;
  exerciseName?: string;
  scores: {
    competencyId: string;
    competencyName: string;
    averageScore: number;
  }[];
  overallScore: number;
}

export interface CompetencyStatistics {
  competencyId: string;
  competencyName: string;
  averageScore: number;
  trend: 'improving' | 'declining' | 'stable';
  trendValue: number; // Change percentage
  historicalScores: { date: string, score: number }[];
}

export interface AssessmentInterfaceProps {
  traineeId: string;
  instructorId: string;
  moduleId?: string;
  lessonId?: string;
  exerciseId?: string;
  existingAssessmentId?: string;
  competencies: Competency[];
  criteria: AssessmentCriteria[];
  indicators: PerformanceIndicator[];
  onSave?: (assessment: Assessment) => void;
  onSubmit?: (assessment: Assessment) => void;
  onPrint?: (assessmentId: string) => void;
  showHistory?: boolean;
  historicalAssessments?: HistoricalAssessment[];
  trainingEnvironments?: string[];
  environmentConditions?: string[];
  readOnly?: boolean;
}

// Constants
const SCORE_COLORS = {
  1: 'bg-red-500',
  2: 'bg-yellow-500',
  3: 'bg-blue-500',
  4: 'bg-green-500',
};

const SCORE_LABELS = {
  1: 'Unsatisfactory',
  2: 'Needs Improvement',
  3: 'Satisfactory',
  4: 'Excellent',
};

// Helper Components
interface ScoreButtonProps {
  score: number;
  selectedScore: number | null;
  onClick: (score: number) => void;
  disabled?: boolean;
}

const ScoreButton: React.FC<ScoreButtonProps> = ({ score, selectedScore, onClick, disabled = false }) => (
  <Button
    variant={selectedScore === score ? 'default' : 'outline'}
    className={`w-12 h-12 p-0 ${selectedScore === score ? SCORE_COLORS[score as keyof typeof SCORE_COLORS] : ''}`}
    onClick={() => onClick(score)}
    disabled={disabled}
  >
    {score}
  </Button>
);

interface IndicatorAssessmentProps {
  indicator: PerformanceIndicator;
  score: number | null;
  notes: string;
  onScoreChange: (score: number) => void;
  onNotesChange: (notes: string) => void;
  readOnly?: boolean;
}

const IndicatorAssessment: React.FC<IndicatorAssessmentProps> = ({
  indicator,
  score,
  notes,
  onScoreChange,
  onNotesChange,
  readOnly = false,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="border rounded-lg p-4 mb-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-medium">{indicator.description}</h4>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-gray-500 mt-1 p-0 h-auto"
          >
            {showDetails ? 'Hide details' : 'Show details'}
            {showDetails ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
          </Button>
        </div>
        <div className="flex space-x-2">
          <ScoreButton score={1} selectedScore={score || null} onClick={onScoreChange} disabled={readOnly} />
          <ScoreButton score={2} selectedScore={score || null} onClick={onScoreChange} disabled={readOnly} />
          <ScoreButton score={3} selectedScore={score || null} onClick={onScoreChange} disabled={readOnly} />
          <ScoreButton score={4} selectedScore={score || null} onClick={onScoreChange} disabled={readOnly} />
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 grid grid-cols-4 gap-2 text-sm">
          <div className="p-2 border rounded bg-gray-50">
            <span className="font-medium text-red-500 mb-1 block">Score 1:</span>
            <p>{indicator.score1Description || 'Unsatisfactory performance'}</p>
          </div>
          <div className="p-2 border rounded bg-gray-50">
            <span className="font-medium text-yellow-500 mb-1 block">Score 2:</span>
            <p>{indicator.score2Description || 'Needs improvement'}</p>
          </div>
          <div className="p-2 border rounded bg-gray-50">
            <span className="font-medium text-blue-500 mb-1 block">Score 3:</span>
            <p>{indicator.score3Description || 'Satisfactory performance'}</p>
          </div>
          <div className="p-2 border rounded bg-gray-50">
            <span className="font-medium text-green-500 mb-1 block">Score 4:</span>
            <p>{indicator.score4Description || 'Excellent performance'}</p>
          </div>
        </div>
      )}

      {(notes || !readOnly) && (
        <div className="mt-4">
          <Label htmlFor={`notes-${indicator.id}`} className="mb-2 block">Notes</Label>
          <Textarea
            id={`notes-${indicator.id}`}
            placeholder="Add notes about this performance indicator"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="min-h-[80px]"
            readOnly={readOnly}
          />
        </div>
      )}
    </div>
  );
};

// Main Component
const AssessmentInterface: React.FC<AssessmentInterfaceProps> = ({
  traineeId,
  instructorId,
  moduleId,
  lessonId,
  exerciseId,
  existingAssessmentId,
  competencies,
  criteria,
  indicators,
  onSave,
  onSubmit,
  onPrint,
  showHistory = true,
  historicalAssessments = [],
  trainingEnvironments = ['Simulator', 'Aircraft', 'Classroom', 'Online'],
  environmentConditions = ['VMC', 'IMC', 'Night', 'Day', 'Crosswind', 'Turbulence'],
  readOnly = false,
}) => {
  // State
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [trainee, setTrainee] = useState<Trainee | null>(null);
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assessment');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [competencyStatistics, setCompetencyStatistics] = useState<CompetencyStatistics[]>([]);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [signatureText, setSignatureText] = useState('');
  const [signatureType, setSignatureType] = useState<'instructor' | 'trainee'>('instructor');

  // Fetch trainee, instructor, and assessment data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch trainee data
        // In a real implementation, this would be an API call
        const traineeData: Trainee = {
          id: traineeId,
          name: 'John Smith',
          avatarUrl: '/avatars/john-smith.jpg',
          position: 'Pilot Trainee',
          department: 'Flight Operations',
          progress: 68,
          status: 'active',
        };
        setTrainee(traineeData);

        // Fetch instructor data
        const instructorData: Instructor = {
          id: instructorId,
          name: 'Emily Johnson',
          avatarUrl: '/avatars/emily-johnson.jpg',
          position: 'Senior Flight Instructor',
          digital_signature: 'Emily Johnson',
        };
        setInstructor(instructorData);

        if (existingAssessmentId) {
          // Fetch existing assessment
          // In a real implementation, this would be an API call
          const existingAssessment: Assessment = {
            id: existingAssessmentId,
            traineeId,
            instructorId,
            moduleId,
            moduleName: 'Basic Flight Maneuvers',
            lessonId,
            lessonName: 'Takeoff and Landing',
            exerciseId,
            exerciseName: 'Normal Takeoff',
            date: new Date().toISOString(),
            status: 'draft',
            scores: indicators.map(indicator => ({
              indicatorId: indicator.id,
              score: Math.floor(Math.random() * 4) + 1,
              notes: '',
            })),
            overallNotes: '',
            strengths: [],
            improvements: [],
            trainingEnvironment: 'Simulator',
            conditions: 'VMC',
          };
          setAssessment(existingAssessment);
        } else {
          // Create new assessment
          const newAssessment: Assessment = {
            id: `assessment-${Date.now()}`,
            traineeId,
            instructorId,
            moduleId,
            moduleName: 'Basic Flight Maneuvers',
            lessonId,
            lessonName: 'Takeoff and Landing',
            exerciseId,
            exerciseName: 'Normal Takeoff',
            date: new Date().toISOString(),
            status: 'draft',
            scores: indicators.map(indicator => ({
              indicatorId: indicator.id,
              score: 0,
              notes: '',
            })),
            overallNotes: '',
            strengths: [],
            improvements: [],
          };
          setAssessment(newAssessment);
        }

        // Generate competency statistics from historical assessments
        if (historicalAssessments.length > 0) {
          const stats: CompetencyStatistics[] = competencies.map(competency => {
            // Get historical scores for this competency
            const history = historicalAssessments
              .map(ha => ({
                date: ha.date,
                score: ha.scores.find(s => s.competencyId === competency.id)?.averageScore || 0
              }))
              .filter(hs => hs.score > 0)
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            // Calculate trend
            const trend = history.length >= 2 
              ? (history[history.length - 1].score > history[0].score ? 'improving' : 
                 history[history.length - 1].score < history[0].score ? 'declining' : 'stable')
              : 'stable';

            // Calculate trend value
            const trendValue = history.length >= 2
              ? ((history[history.length - 1].score - history[0].score) / history[0].score) * 100
              : 0;

            // Calculate average score
            const averageScore = history.length > 0
              ? history.reduce((acc, curr) => acc + curr.score, 0) / history.length
              : 0;

            return {
              competencyId: competency.id,
              competencyName: competency.name,
              averageScore,
              trend,
              trendValue,
              historicalScores: history
            };
          });

          setCompetencyStatistics(stats);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [traineeId, instructorId, moduleId, lessonId, exerciseId, existingAssessmentId, competencies, indicators, historicalAssessments]);

  // Handle score change
  const handleScoreChange = useCallback((indicatorId: string, score: number) => {
    if (!assessment || readOnly) return;

    setAssessment(prev => {
      if (!prev) return null;

      return {
        ...prev,
        scores: prev.scores.map(s => 
          s.indicatorId === indicatorId ? { ...s, score } : s
        )
      };
    });
  }, [assessment, readOnly]);

  // Handle notes change
  const handleNotesChange = useCallback((indicatorId: string, notes: string) => {
    if (!assessment || readOnly) return;

    setAssessment(prev => {
      if (!prev) return null;

      return {
        ...prev,
        scores: prev.scores.map(s => 
          s.indicatorId === indicatorId ? { ...s, notes } : s
        )
      };
    });
  }, [assessment, readOnly]);

  // Handle overall notes change
  const handleOverallNotesChange = useCallback((notes: string) => {
    if (!assessment || readOnly) return;

    setAssessment(prev => {
      if (!prev) return null;
      return { ...prev, overallNotes: notes };
    });
  }, [assessment, readOnly]);

  // Add strength
  const handleAddStrength = useCallback(() => {
    if (!assessment || readOnly) return;

    setAssessment(prev => {
      if (!prev) return null;
      return { 
        ...prev, 
        strengths: [...(prev.strengths || []), ''] 
      };
    });
  }, [assessment, readOnly]);

  // Update strength
  const handleUpdateStrength = useCallback((index: number, value: string) => {
    if (!assessment || readOnly) return;

    setAssessment(prev => {
      if (!prev || !prev.strengths) return prev;
      
      const strengths = [...prev.strengths];
      strengths[index] = value;
      
      return { ...prev, strengths };
    });
  }, [assessment, readOnly]);

  // Remove strength
  const handleRemoveStrength = useCallback((index: number) => {
    if (!assessment || readOnly) return;

    setAssessment(prev => {
      if (!prev || !prev.strengths) return prev;
      
      const strengths = [...prev.strengths];
      strengths.splice(index, 1);
      
      return { ...prev, strengths };
    });
  }, [assessment, readOnly]);

  // Add improvement
  const handleAddImprovement = useCallback(() => {
    if (!assessment || readOnly) return;

    setAssessment(prev => {
      if (!prev) return null;
      return { 
        ...prev, 
        improvements: [...(prev.improvements || []), ''] 
      };
    });
  }, [assessment, readOnly]);

  // Update improvement
  const handleUpdateImprovement = useCallback((index: number, value: string) => {
    if (!assessment || readOnly) return;

    setAssessment(prev => {
      if (!prev || !prev.improvements) return prev;
      
      const improvements = [...prev.improvements];
      improvements[index] = value;
      
      return { ...prev, improvements };
    });
  }, [assessment, readOnly]);

  // Remove improvement
  const handleRemoveImprovement = useCallback((index: number) => {
    if (!assessment || readOnly) return;

    setAssessment(prev => {
      if (!prev || !prev.improvements) return prev;
      
      const improvements = [...prev.improvements];
      improvements.splice(index, 1);
      
      return { ...prev, improvements };
    });
  }, [assessment, readOnly]);

  // Handle environment change
  const handleEnvironmentChange = useCallback((environment: string) => {
    if (!assessment || readOnly) return;

    setAssessment(prev => {
      if (!prev) return null;
      return { ...prev, trainingEnvironment: environment };
    });
  }, [assessment, readOnly]);

  // Handle conditions change
  const handleConditionsChange = useCallback((conditions: string) => {
    if (!assessment || readOnly) return;

    setAssessment(prev => {
      if (!prev) return null;
      return { ...prev, conditions };
    });
  }, [assessment, readOnly]);

  // Save assessment
  const handleSave = useCallback(() => {
    if (!assessment || readOnly) return;

    setSaveStatus('saving');
    
    // In a real implementation, this would be an API call
    setTimeout(() => {
      setSaveStatus('saved');
      if (onSave) {
        onSave(assessment);
      }
      
      // Reset status after a delay
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    }, 1000);
  }, [assessment, onSave, readOnly]);

  // Submit assessment
  const handleSubmit = useCallback(() => {
    if (!assessment || readOnly) return;

    // Update assessment status and add completion date
    const completedAssessment: Assessment = {
      ...assessment,
      status: 'completed',
      completedDate: new Date().toISOString(),
    };

    setAssessment(completedAssessment);
    
    // In a real implementation, this would be an API call
    if (onSubmit) {
      onSubmit(completedAssessment);
    }
  }, [assessment, onSubmit, readOnly]);

  // Print assessment
  const handlePrint = useCallback(() => {
    if (!assessment) return;
    
    if (onPrint) {
      onPrint(assessment.id);
    } else {
      // Fallback if no print handler is provided
      window.print();
    }
  }, [assessment, onPrint]);

  // Calculate overall score
  const calculateOverallScore = (scores: AssessmentScore[]): number => {
    if (scores.length === 0) return 0;
    
    const validScores = scores.filter(s => s.score > 0);
    if (validScores.length === 0) return 0;
    
    return validScores.reduce((sum, s) => sum + s.score, 0) / validScores.length;
  };

  // Check if assessment is complete (all indicators scored)
  const isAssessmentComplete = (): boolean => {
    if (!assessment) return false;
    return assessment.scores.every(s => s.score > 0);
  };

  // Handle signature submission
  const handleSignatureSubmit = () => {
    if (!assessment || !signatureText) return;

    if (signatureType === 'instructor') {
      setAssessment(prev => {
        if (!prev) return null;
        return {
          ...prev,
          instructorSignature: signatureText
        };
      });
    } else {
      setAssessment(prev => {
        if (!prev) return null;
        return {
          ...prev,
          traineeSignature: signatureText
        };
      });
    }

    setSignatureText('');
    setIsSignatureDialogOpen(false);
  };

  if (loading || !assessment || !trainee) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Clock className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
              <p className="mt-4 text-gray-500">Loading assessment...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group indicators by criteria
  const criteriaWithIndicators = criteria.map(c => ({
    ...c,
    indicators: indicators.filter(i => i.criteriaId === c.id)
  }));

  // Group criteria by competency
  const competenciesWithCriteria = competencies.map(comp => ({
    ...comp,
    criteria: criteriaWithIndicators.filter(c => c.competencyId === comp.id)
  }));

  const overallScore = calculateOverallScore(assessment.scores);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-xl">
              {assessment.exerciseName || 'Assessment'} - {trainee.name}
            </CardTitle>
            <CardDescription>
              {assessment.moduleName}{assessment.lessonName ? ` - ${assessment.lessonName}` : ''}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {!readOnly && (
              <>
                <Button 
                  variant="outline" 
                  onClick={handleSave}
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : saveStatus === 'saved' ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={handleSubmit}
                  disabled={!isAssessmentComplete()}
                >
                  Submit Assessment
                </Button>
              </>
            )}
            
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-8/12">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="assessment">Assessment</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                {showHistory && (
                  <TabsTrigger value="history">History</TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="assessment">
                <div className="border p-4 rounded-lg mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label htmlFor="training-environment" className="mb-2 block">Training Environment</Label>
                      <Select
                        value={assessment.trainingEnvironment || ''}
                        onValueChange={handleEnvironmentChange}
                        disabled={readOnly}
                      >
                        <SelectTrigger id="training-environment">
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>
                        <SelectContent>
                          {trainingEnvironments.map(env => (
                            <SelectItem key={env} value={env}>{env}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="conditions" className="mb-2 block">Conditions</Label>
                      <Select
                        value={assessment.conditions || ''}
                        onValueChange={handleConditionsChange}
                        disabled={readOnly}
                      >
                        <SelectTrigger id="conditions">
                          <SelectValue placeholder="Select conditions" />
                        </SelectTrigger>
                        <SelectContent>
                          {environmentConditions.map(cond => (
                            <SelectItem key={cond} value={cond}>{cond}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Date: {new Date(assessment.date).toLocaleDateString()}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-500">
                        Scoring: 1-Unsatisfactory, 2-Needs Improvement, 3-Satisfactory, 4-Excellent
                      </div>
                    </div>
                  </div>
                </div>
                
                {competenciesWithCriteria.map(competency => (
                  <div key={competency.id} className="mb-8">
                    <h3 className="text-lg font-medium mb-4">{competency.name}</h3>
                    {competency.description && (
                      <p className="text-gray-600 mb-4">{competency.description}</p>
                    )}
                    
                    {competency.criteria.map(criterion => (
                      <div key={criterion.id} className="mb-6">
                        <h4 className="font-medium text-gray-800 mb-3">{criterion.description}</h4>
                        
                        {criterion.indicators.map(indicator => {
                          const scoreData = assessment.scores.find(s => s.indicatorId === indicator.id);
                          const score = scoreData ? scoreData.score : null;
                          const notes = scoreData ? scoreData.notes || '' : '';
                          
                          return (
                            <IndicatorAssessment
                              key={indicator.id}
                              indicator={indicator}
                              score={score}
                              notes={notes}
                              onScoreChange={(newScore) => handleScoreChange(indicator.id, newScore)}
                              onNotesChange={(newNotes) => handleNotesChange(indicator.id, newNotes)}
                              readOnly={readOnly}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="summary">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Overall Performance</h3>
                    
                    <div className="flex items-end gap-4 mb-6">
                      <div>
                        <p className="text-5xl font-bold">
                          {overallScore.toFixed(1)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">Average Score</p>
                      </div>
                      
                      <div className="flex-1">
                        <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              overallScore >= 3.5 ? 'bg-green-500' :
                              overallScore >= 2.5 ? 'bg-blue-500' :
                              overallScore >= 1.5 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${(overallScore / 4) * 100}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>1</span>
                          <span>2</span>
                          <span>3</span>
                          <span>4</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      {competencies.map(competency => {
                        const relevantScores = assessment.scores.filter(score => {
                          const indicator = indicators.find(i => i.id === score.indicatorId);
                          if (!indicator) return false;
                          
                          const criterion = criteria.find(c => c.id === indicator.criteriaId);
                          return criterion && criterion.competencyId === competency.id;
                        });
                        
                        const competencyScore = calculateOverallScore(relevantScores);
                        
                        return (
                          <div key={competency.id} className="mb-4">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-medium">{competency.name}</span>
                              <span className="text-sm">{competencyScore.toFixed(1)}</span>
                            </div>
                            <Progress 
                              value={(competencyScore / 4) * 100}
                              className={`h-2 ${
                                competencyScore >= 3.5 ? 'bg-green-200' :
                                competencyScore >= 2.5 ? 'bg-blue-200' :
                                competencyScore >= 1.5 ? 'bg-yellow-200' :
                                'bg-red-200'
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Assessment Status</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <Badge 
                          variant={
                            assessment.status === 'completed' || assessment.status === 'reviewed' 
                              ? 'default' 
                              : 'outline'
                          }
                        >
                          {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                        </Badge>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Completion</p>
                        <div className="flex items-center mt-1">
                          <Progress 
                            value={(assessment.scores.filter(s => s.score > 0).length / assessment.scores.length) * 100}
                            className="h-2 w-24 mr-3"
                          />
                          <span className="text-sm">
                            {assessment.scores.filter(s => s.score > 0).length} of {assessment.scores.length} items scored
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500">Date Completed</p>
                        <p>{assessment.completedDate 
                          ? new Date(assessment.completedDate).toLocaleDateString() 
                          : 'Not completed'}</p>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Instructor Signature</p>
                        {assessment.instructorSignature ? (
                          <div className="border rounded p-3 bg-gray-50">
                            <p className="font-medium italic">{assessment.instructorSignature}</p>
                          </div>
                        ) : (
                          !readOnly && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSignatureType('instructor');
                                setIsSignatureDialogOpen(true);
                              }}
                            >
                              Add Signature
                            </Button>
                          )
                        )}
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Trainee Signature</p>
                        {assessment.traineeSignature ? (
                          <div className="border rounded p-3 bg-gray-50">
                            <p className="font-medium italic">{assessment.traineeSignature}</p>
                          </div>
                        ) : (
                          !readOnly && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSignatureType('trainee');
                                setIsSignatureDialogOpen(true);
                              }}
                            >
                              Add Signature
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-medium mb-4">Notes & Feedback</h3>
                  
                  <div className="mb-6">
                    <Label htmlFor="overall-notes" className="mb-2 block">Overall Notes</Label>
                    <Textarea
                      id="overall-notes"
                      placeholder="Add overall assessment notes here..."
                      className="min-h-[120px]"
                      value={assessment.overallNotes || ''}
                      onChange={(e) => handleOverallNotesChange(e.target.value)}
                      readOnly={readOnly}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label>Strengths</Label>
                        {!readOnly && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleAddStrength}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      {assessment.strengths && assessment.strengths.length > 0 ? (
                        <div className="space-y-2">
                          {assessment.strengths.map((strength, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Input
                                value={strength}
                                onChange={(e) => handleUpdateStrength(index, e.target.value)}
                                placeholder={`Strength ${index + 1}`}
                                readOnly={readOnly}
                              />
                              {!readOnly && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveStrength(index)}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No strengths recorded</p>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label>Areas for Improvement</Label>
                        {!readOnly && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleAddImprovement}
                            className="h-8 w-8 p-0"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      {assessment.improvements && assessment.improvements.length > 0 ? (
                        <div className="space-y-2">
                          {assessment.improvements.map((improvement, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <Input
                                value={improvement}
                                onChange={(e) => handleUpdateImprovement(index, e.target.value)}
                                placeholder={`Improvement ${index + 1}`}
                                readOnly={readOnly}
                              />
                              {!readOnly && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveImprovement(index)}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No areas for improvement recorded</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {assessment.attachments && assessment.attachments.length > 0 && (
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Attachments</h3>
                    
                    <div className="space-y-2">
                      {assessment.attachments.map(attachment => (
                        <div 
                          key={attachment.id}
                          className="flex items-center p-3 border rounded hover:bg-gray-50"
                        >
                          <Paperclip className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{attachment.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              {showHistory && (
                <TabsContent value="history">
                  <div className="border rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-medium mb-4">Performance Trends</h3>
                    
                    {competencyStatistics.length > 0 ? (
                      <div className="space-y-6">
                        {competencyStatistics.map(stat => (
                          <div key={stat.competencyId} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h4 className="font-medium">{stat.competencyName}</h4>
                                <div className="flex items-center mt-1">
                                  <span className="text-sm text-gray-500 mr-2">Average Score: {stat.averageScore.toFixed(1)}</span>
                                  {stat.trend !== 'stable' && (
                                    <Badge 
                                      variant={stat.trend === 'improving' ? 'default' : 'destructive'}
                                      className="text-xs"
                                    >
                                      {stat.trend === 'improving' ? '+' : ''}{Math.abs(stat.trendValue).toFixed(1)}%
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <div className={`text-sm font-medium ${
                                stat.trend === 'improving' ? 'text-green-500' :
                                stat.trend === 'declining' ? 'text-red-500' :
                                'text-gray-500'
                              }`}>
                                {stat.trend.charAt(0).toUpperCase() + stat.trend.slice(1)}
                              </div>
                            </div>
                            
                            <div className="h-[100px] flex items-end space-x-2">
                              {stat.historicalScores.map((hScore, index) => (
                                <TooltipProvider key={index}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex flex-col items-center">
                                        <div 
                                          className={`w-6 rounded-t ${
                                            hScore.score >= 3.5 ? 'bg-green-500' :
                                            hScore.score >= 2.5 ? 'bg-blue-500' :
                                            hScore.score >= 1.5 ? 'bg-yellow-500' :
                                            'bg-red-500'
                                          }`}
                                          style={{ height: `${(hScore.score / 4) * 80}px` }}
                                        ></div>
                                        <span className="text-xs text-gray-500 mt-1">
                                          {new Date(hScore.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Score: {hScore.score.toFixed(1)}</p>
                                      <p className="text-xs">
                                        {new Date(hScore.date).toLocaleDateString()}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No historical data available.</p>
                    )}
                  </div>
                  
                  <div className="border rounded-lg p-6">
                    <h3 className="text-lg font-medium mb-4">Previous Assessments</h3>
                    
                    {historicalAssessments.length > 0 ? (
                      <div className="space-y-4">
                        {historicalAssessments.map(assessment => (
                          <div key={assessment.id} className="border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium">
                                  {assessment.exerciseName || 'Assessment'}
                                </h4>
                                <div className="flex items-center text-sm text-gray-500 mt-1">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {new Date(assessment.date).toLocaleDateString()}
                                  <span className="mx-2">•</span>
                                  <User className="h-3 w-3 mr-1" />
                                  {assessment.instructorName}
                                </div>
                              </div>
                              
                              <div className="flex items-center">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-medium ${
                                  assessment.overallScore >= 3.5 ? 'bg-green-500' :
                                  assessment.overallScore >= 2.5 ? 'bg-blue-500' :
                                  assessment.overallScore >= 1.5 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}>
                                  {assessment.overallScore.toFixed(1)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-4">
                              {assessment.scores.map(score => (
                                <div key={score.competencyId} className="text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">{score.competencyName}</span>
                                    <span className="font-medium">{score.averageScore.toFixed(1)}</span>
                                  </div>
                                  <Progress 
                                    value={(score.averageScore / 4) * 100}
                                    className="h-1 mt-1"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">No previous assessments available.</p>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
          
          <div className="lg:w-4/12">
            <div className="border rounded-lg p-6 mb-6">
              <div className="flex items-center mb-4">
                <Avatar className="h-12 w-12 mr-4">
                  <AvatarImage src={trainee.avatarUrl} alt={trainee.name} />
                  <AvatarFallback>
                    {trainee.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <h3 className="font-medium">{trainee.name}</h3>
                  <p className="text-sm text-gray-500">{trainee.position}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {trainee.progress !== undefined && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Training Progress</span>
                      <span>{trainee.progress}%</span>
                    </div>
                    <Progress value={trainee.progress} className="h-2" />
                  </div>
                )}
                
                {trainee.status && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <Badge variant={
                      trainee.status === 'active' ? 'default' :
                      trainee.status === 'completed' ? 'success' :
                      'outline'
                    }>
                      {trainee.status}
                    </Badge>
                  </div>
                )}
                
                {trainee.department && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Department</span>
                    <span>{trainee.department}</span>
                  </div>
                )}
              </div>
            </div>
            
            {instructor && (
              <div className="border rounded-lg p-6 mb-6">
                <div className="flex items-center mb-4">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={instructor.avatarUrl} alt={instructor.name} />
                    <AvatarFallback>
                      {instructor.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div>
                    <h3 className="font-medium">Instructor</h3>
                    <p className="text-sm">{instructor.name}</p>
                  </div>
                </div>
                
                {instructor.position && (
                  <div className="text-sm text-gray-500">
                    {instructor.position}
                  </div>
                )}
              </div>
            )}
            
            <div className="border rounded-lg p-6">
              <h3 className="font-medium mb-4">Assessment Overview</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Total Items</span>
                  <span>{assessment.scores.length}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Items Scored</span>
                  <span>{assessment.scores.filter(s => s.score > 0).length}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Competencies</span>
                  <span>{competencies.length}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Average Score</span>
                  <div className="flex items-center">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-medium mr-2 ${
                      overallScore >= 3.5 ? 'bg-green-500' :
                      overallScore >= 2.5 ? 'bg-blue-500' :
                      overallScore >= 1.5 ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}>
                      {overallScore.toFixed(1)}
                    </div>
                    <span>{
                      overallScore >= 3.5 ? 'Excellent' :
                      overallScore >= 2.5 ? 'Satisfactory' :
                      overallScore >= 1.5 ? 'Needs Improvement' :
                      overallScore > 0 ? 'Unsatisfactory' : 'Not Scored'
                    }</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Status</span>
                  <Badge variant={
                    assessment.status === 'completed' || assessment.status === 'reviewed'
                      ? 'default' 
                      : 'outline'
                  }>
                    {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Date</span>
                  <span>{new Date(assessment.date).toLocaleDateString()}</span>
                </div>
                
                {assessment.completedDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Completed</span>
                    <span>{new Date(assessment.completedDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div className="text-sm text-gray-500">
          {assessment.status === 'draft' ? 'Draft - Not submitted' : 
           assessment.status === 'completed' ? 'Assessment completed' :
           assessment.status === 'reviewed' ? 'Assessment reviewed' :
           'Pending completion'}
        </div>
        
        {!readOnly && (
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleSave}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
            
            <Button 
              onClick={handleSubmit}
              disabled={!isAssessmentComplete()}
            >
              Submit Assessment
            </Button>
          </div>
        )}
      </CardFooter>
      
      {/* Signature Dialog */}
      <Dialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {signatureType === 'instructor' ? 'Instructor Signature' : 'Trainee Signature'}
            </DialogTitle>
            <DialogDescription>
              Please type your full name to sign this assessment.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="signature-input" className="mb-2 block">Signature</Label>
            <Input
              id="signature-input"
              value={signatureText}
              onChange={(e) => setSignatureText(e.target.value)}
              placeholder="Type your full name"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSignatureDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSignatureSubmit} disabled={!signatureText}>
              Sign Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AssessmentInterface;
