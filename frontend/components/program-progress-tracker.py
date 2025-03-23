// src/frontend/components/program/ProgramProgressTracker.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

// Types
export interface TrainingModule {
  id: string;
  name: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'locked';
  progress: number;
  startDate?: Date;
  completionDate?: Date;
  dependencies: string[];
  isOptional: boolean;
  estimatedDuration: number; // in minutes
  lessons: TrainingLesson[];
}

export interface TrainingLesson {
  id: string;
  name: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'locked';
  progress: number;
  startDate?: Date;
  completionDate?: Date;
  estimatedDuration: number; // in minutes
  exercises: TrainingExercise[];
}

export interface TrainingExercise {
  id: string;
  name: string;
  type: 'reading' | 'quiz' | 'simulation' | 'assessment';
  status: 'not_started' | 'in_progress' | 'completed' | 'locked';
  score?: number;
  attempts: number;
  maxAttempts?: number;
  completionDate?: Date;
  duration?: number; // actual time spent in minutes
}

export interface ProgramProgress {
  programId: string;
  programName: string;
  programDescription: string;
  overallProgress: number;
  startDate: Date;
  estimatedCompletionDate?: Date;
  actualCompletionDate?: Date;
  status: 'not_started' | 'in_progress' | 'completed';
  modules: TrainingModule[];
}

// Component
interface ProgramProgressTrackerProps {
  progress: ProgramProgress;
  onModuleSelect: (moduleId: string) => void;
  onLessonSelect: (moduleId: string, lessonId: string) => void;
  onExerciseSelect: (moduleId: string, lessonId: string, exerciseId: string) => void;
}

export const ProgramProgressTracker: React.FC<ProgramProgressTrackerProps> = ({
  progress,
  onModuleSelect,
  onLessonSelect,
  onExerciseSelect
}) => {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  
  // Toggle module expansion
  const toggleModule = (moduleId: string) => {
    const newExpandedModules = new Set(expandedModules);
    if (newExpandedModules.has(moduleId)) {
      newExpandedModules.delete(moduleId);
    } else {
      newExpandedModules.add(moduleId);
    }
    setExpandedModules(newExpandedModules);
  };
  
  // Toggle lesson expansion
  const toggleLesson = (lessonId: string) => {
    const newExpandedLessons = new Set(expandedLessons);
    if (newExpandedLessons.has(lessonId)) {
      newExpandedLessons.delete(lessonId);
    } else {
      newExpandedLessons.add(lessonId);
    }
    setExpandedLessons(newExpandedLessons);
  };
  
  // Format duration in hours and minutes
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins} min`;
    }
    
    return `${hours}h ${mins}m`;
  };
  
  // Get status indicator
  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
            <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        );
      case 'in_progress':
        return <div className="h-5 w-5 rounded-full bg-blue-500"></div>;
      case 'not_started':
        return <div className="h-5 w-5 rounded-full bg-gray-300"></div>;
      case 'locked':
        return (
          <div className="h-5 w-5 rounded-full bg-gray-300 flex items-center justify-center">
            <svg className="h-3 w-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
        );
      default:
        return <div className="h-5 w-5 rounded-full bg-gray-300"></div>;
    }
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            In Progress
          </span>
        );
      case 'not_started':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Not Started
          </span>
        );
      case 'locked':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Locked
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  };
  
  // Get exercise type badge
  const getExerciseTypeBadge = (type: string) => {
    switch (type) {
      case 'reading':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Reading
          </span>
        );
      case 'quiz':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            Quiz
          </span>
        );
      case 'simulation':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Simulation
          </span>
        );
      case 'assessment':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Assessment
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
        );
    }
  };
  
  return (
    <div className="program-progress-tracker">
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{progress.programName}</h1>
            <p className="text-sm text-gray-500">{progress.programDescription}</p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center">
            {getStatusBadge(progress.status)}
            <div className="ml-4">
              <div className="text-sm text-gray-500">Overall Progress</div>
              <div className="text-lg font-medium">{progress.overallProgress}%</div>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full ${
                progress.status === 'completed' ? 'bg-green-600' : 'bg-blue-600'
              }`}
              style={{ width: `${progress.overallProgress}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <div>Start: {new Date(progress.startDate).toLocaleDateString()}</div>
            {progress.estimatedCompletionDate && (
              <div>Estimated completion: {new Date(progress.estimatedCompletionDate).toLocaleDateString()}</div>
            )}
            {progress.actualCompletionDate && (
              <div>Completed: {new Date(progress.actualCompletionDate).toLocaleDateString()}</div>
            )}
          </div>
        </div>
      </Card>
      
      <div className="mb-6">
        <h2 className="text-lg font-medium mb-4">Program Modules</h2>
        
        <div className="space-y-4">
          {progress.modules.map((module) => (
            <div key={module.id} className="border rounded-lg overflow-hidden">
              <div
                className={`flex items-center justify-between p-4 cursor-pointer ${
                  module.status === 'locked' ? 'bg-gray-100' : 'bg-white hover:bg-gray-50'
                }`}
                onClick={() => {
                  if (module.status !== 'locked') {
                    toggleModule(module.id);
                    onModuleSelect(module.id);
                  }
                }}
              >
                <div className="flex items-center">
                  <div className="mr-3">
                    {getStatusIndicator(module.status)}
                  </div>
                  <div>
                    <div className="font-medium">{module.name}</div>
                    <div className="text-sm text-gray-500">{module.description}</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="mr-4 text-right">
                    <div className="text-sm font-medium">
                      {module.status !== 'not_started' ? `${module.progress}%` : ''}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDuration(module.estimatedDuration)}
                    </div>
                  </div>
                  
                  {module.status !== 'locked' && (
                    <svg
                      className={`h-5 w-5 text-gray-500 transform transition-transform ${
                        expandedModules.has(module.id) ? 'rotate-90' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                  )}
                </div>
              </div>
              
              {expandedModules.has(module.id) && (
                <div className="border-t">
                  <div className="p-4 bg-gray-50">
                    <div className="text-sm font-medium mb-2">Lessons</div>
                    
                    <div className="space-y-2">
                      {module.lessons.map((lesson) => (
                        <div key={lesson.id}>
                          <div
                            className={`flex items-center justify-between p-3 rounded-md cursor-pointer ${
                              lesson.status === 'locked' ? 'bg-gray-100' : 'bg-white hover:bg-gray-100'
                            }`}
                            onClick={() => {
                              if (lesson.status !== 'locked') {
                                toggleLesson(lesson.id);
                                onLessonSelect(module.id, lesson.id);
                              }
                            }}
                          >
                            <div className="flex items-center">
                              <div className="mr-3">
                                {getStatusIndicator(lesson.status)}
                              </div>
                              <div>
                                <div className="font-medium">{lesson.name}</div>
                                <div className="text-xs text-gray-500">{formatDuration(lesson.estimatedDuration)}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center">
                              <div className="mr-2 text-sm font-medium">
                                {lesson.status !== 'not_started' ? `${lesson.progress}%` : ''}
                              </div>
                              
                              {lesson.status !== 'locked' && (
                                <svg
                                  className={`h-5 w-5 text-gray-500 transform transition-transform ${
                                    expandedLessons.has(lesson.id) ? 'rotate-90' : ''
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                                </svg>
                              )}
                            </div>
                          </div>
                          
                          {expandedLessons.has(lesson.id) && (
                            <div className="mt-2 ml-8 space-y-2">
                              {lesson.exercises.map((exercise) => (
                                <div
                                  key={exercise.id}
                                  className={`flex items-center justify-between p-3 rounded-md cursor-pointer ${
                                    exercise.status === 'locked' ? 'bg-gray-100' : 'bg-white hover:bg-gray-100'
                                  }`}
                                  onClick={() => {
                                    if (exercise.status !== 'locked') {
                                      onExerciseSelect(module.id, lesson.id, exercise.id);
                                    }
                                  }}
                                >
                                  <div className="flex items-center">
                                    <div className="mr-3">
                                      {getStatusIndicator(exercise.status)}
                                    </div>
                                    <div>
                                      <div className="font-medium">{exercise.name}</div>
                                      <div className="flex items-center mt-1">
                                        {getExerciseTypeBadge(exercise.type)}
                                        {exercise.duration && (
                                          <span className="ml-2 text-xs text-gray-500">
                                            {formatDuration(exercise.duration)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    {exercise.score !== undefined && (
                                      <div className="text-sm font-medium">
                                        Score: {exercise.score}%
                                      </div>
                                    )}
                                    {exercise.attempts > 0 && (
                                      <div className="text-xs text-gray-500">
                                        Attempts: {exercise.attempts}{exercise.maxAttempts ? `/${exercise.maxAttempts}` : ''}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
