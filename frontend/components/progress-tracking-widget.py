// src/frontend/components/common/ProgressTrackingWidget.tsx
import React from 'react';
import { Card } from '../ui/Card';
import { Link } from 'react-router-dom';

// Types
export interface ModuleProgress {
  id: string;
  name: string;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed';
  estimatedTimeRemaining?: number; // in minutes
  dueDate?: Date;
}

export interface ProgramProgress {
  id: string;
  name: string;
  progress: number;
  modules: ModuleProgress[];
  startDate: Date;
  endDate?: Date;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  overallScore?: number;
}

// Progress Bar Component
interface ProgressBarProps {
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  showPercentage?: boolean;
  height?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  status,
  showPercentage = true,
  height = 'md'
}) => {
  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  }[height];
  
  const getColorClass = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-600';
      case 'in_progress':
        return 'bg-blue-600';
      case 'overdue':
        return 'bg-red-600';
      case 'not_started':
      default:
        return 'bg-gray-600';
    }
  };
  
  return (
    <div>
      {showPercentage && (
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${heightClass}`}>
        <div 
          className={`${heightClass} rounded-full ${getColorClass()}`} 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
};

// Status Badge Component
interface StatusBadgeProps {
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
        return {
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          label: 'Completed'
        };
      case 'in_progress':
        return {
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          label: 'In Progress'
        };
      case 'overdue':
        return {
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          label: 'Overdue'
        };
      case 'not_started':
      default:
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          label: 'Not Started'
        };
    }
  };
  
  const { bgColor, textColor, label } = getStatusConfig();
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
      {label}
    </span>
  );
};

// Time Formatter
const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

// Module Progress Item Component
interface ModuleProgressItemProps {
  module: ModuleProgress;
  onSelect?: (moduleId: string) => void;
}

export const ModuleProgressItem: React.FC<ModuleProgressItemProps> = ({
  module,
  onSelect
}) => {
  const handleClick = () => {
    if (onSelect) {
      onSelect(module.id);
    }
  };
  
  return (
    <div 
      className={`border rounded-md p-3 mb-2 ${onSelect ? 'cursor-pointer hover:bg-gray-50' : ''}`}
      onClick={handleClick}
    >
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium">{module.name}</h4>
        <StatusBadge status={module.status} />
      </div>
      
      <ProgressBar
        progress={module.progress}
        status={module.status}
        height="sm"
      />
      
      <div className="mt-2 flex justify-between text-xs text-gray-500">
        {module.estimatedTimeRemaining !== undefined && (
          <span>Est. time: {formatTime(module.estimatedTimeRemaining)}</span>
        )}
        {module.dueDate && (
          <span>Due: {new Date(module.dueDate).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
};

// Compact Progress Widget Component
interface CompactProgressWidgetProps {
  program: ProgramProgress;
  onSelectModule?: (moduleId: string) => void;
  showScore?: boolean;
}

export const CompactProgressWidget: React.FC<CompactProgressWidgetProps> = ({
  program,
  onSelectModule,
  showScore = true
}) => {
  return (
    <Card className="compact-progress-widget">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-base font-medium">{program.name}</h3>
        <StatusBadge status={program.status} />
      </div>
      
      <ProgressBar
        progress={program.progress}
        status={program.status}
      />
      
      <div className="mt-3 text-xs text-gray-500 flex justify-between">
        <span>Started: {new Date(program.startDate).toLocaleDateString()}</span>
        {program.endDate && (
          <span>Expected completion: {new Date(program.endDate).toLocaleDateString()}</span>
        )}
      </div>
      
      {showScore && program.overallScore !== undefined && (
        <div className="mt-2 text-sm">
          <span className="font-medium">Overall Score:</span> {program.overallScore}%
        </div>
      )}
      
      {program.modules.length > 0 && (
        <div className="mt-3">
          <div className="text-sm font-medium mb-2">Next Module:</div>
          <ModuleProgressItem
            module={program.modules.find(m => m.status === 'in_progress') || program.modules[0]}
            onSelect={onSelectModule}
          />
        </div>
      )}
    </Card>
  );
};

// Detailed Progress Widget Component
interface DetailedProgressWidgetProps {
  program: ProgramProgress;
  onSelectModule?: (moduleId: string) => void;
  showAllModules?: boolean;
  showViewAllLink?: boolean;
  viewAllUrl?: string;
}

export const DetailedProgressWidget: React.FC<DetailedProgressWidgetProps> = ({
  program,
  onSelectModule,
  showAllModules = false,
  showViewAllLink = true,
  viewAllUrl = `/programs/${program.id}`
}) => {
  // Determine which modules to show
  const displayModules = showAllModules 
    ? program.modules 
    : program.modules.filter(m => m.status !== 'completed').slice(0, 3);
  
  const hasMoreModules = !showAllModules && program.modules.length > displayModules.length;
  
  return (
    <Card className="detailed-progress-widget">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium">{program.name}</h3>
        <StatusBadge status={program.status} />
      </div>
      
      <div className="mb-4">
        <ProgressBar
          progress={program.progress}
          status={program.status}
          height="lg"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500">Start Date</p>
          <p className="font-medium">{new Date(program.startDate).toLocaleDateString()}</p>
        </div>
        
        {program.endDate && (
          <div>
            <p className="text-sm text-gray-500">Expected Completion</p>
            <p className="font-medium">{new Date(program.endDate).toLocaleDateString()}</p>
          </div>
        )}
        
        <div>
          <p className="text-sm text-gray-500">Modules</p>
          <p className="font-medium">
            {program.modules.filter(m => m.status === 'completed').length} of {program.modules.length} completed
          </p>
        </div>
        
        {program.overallScore !== undefined && (
          <div>
            <p className="text-sm text-gray-500">Overall Score</p>
            <p className="font-medium">{program.overallScore}%</p>
          </div>
        )}
      </div>
      
      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-base font-medium">
            {showAllModules ? 'All Modules' : 'Current Modules'}
          </h4>
        </div>
        
        <div className="space-y-3">
          {displayModules.map(module => (
            <ModuleProgressItem
              key={module.id}
              module={module}
              onSelect={onSelectModule}
            />
          ))}
          
          {hasMoreModules && showViewAllLink && (
            <div className="text-center mt-2">
              <Link to={viewAllUrl} className="text-sm text-blue-600 hover:text-blue-800">
                View all modules ({program.modules.length})
              </Link>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

// Progress Overview Component (for multiple programs)
interface ProgressOverviewProps {
  programs: ProgramProgress[];
  onSelectProgram?: (programId: string) => void;
  onSelectModule?: (programId: string, moduleId: string) => void;
  maxDisplay?: number;
  showViewAllLink?: boolean;
  viewAllUrl?: string;
}

export const ProgressOverview: React.FC<ProgressOverviewProps> = ({
  programs,
  onSelectProgram,
  onSelectModule,
  maxDisplay = 3,
  showViewAllLink = true,
  viewAllUrl = '/programs'
}) => {
  // Sort programs - in progress first, then not started, then completed
  const sortedPrograms = [...programs].sort((a, b) => {
    const statusOrder = {
      'in_progress': 0,
      'overdue': 1,
      'not_started': 2,
      'completed': 3
    };
    
    return statusOrder[a.status] - statusOrder[b.status];
  });
  
  const displayPrograms = sortedPrograms.slice(0, maxDisplay);
  const hasMorePrograms = programs.length > maxDisplay;
  
  const handleModuleSelect = (programId: string, moduleId: string) => {
    if (onSelectModule) {
      onSelectModule(programId, moduleId);
    }
  };
  
  return (
    <Card className="progress-overview">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Training Progress</h3>
        
        {hasMorePrograms && showViewAllLink && (
          <Link to={viewAllUrl} className="text-sm text-blue-600 hover:text-blue-800">
            View all programs ({programs.length})
          </Link>
        )}
      </div>
      
      {displayPrograms.length > 0 ? (
        <div className="space-y-6">
          {displayPrograms.map(program => (
            <div key={program.id} className="border-b pb-6 last:border-b-0 last:pb-0">
              <div 
                className={`mb-2 ${onSelectProgram ? 'cursor-pointer hover:text-blue-600' : ''}`}
                onClick={() => onSelectProgram && onSelectProgram(program.id)}
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-base font-medium">{program.name}</h4>
                  <StatusBadge status={program.status} />
                </div>
                
                <div className="mt-2">
                  <ProgressBar
                    progress={program.progress}
                    status={program.status}
                  />
                </div>
              </div>
              
              {program.modules.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm font-medium mb-2">Current Module:</div>
                  <ModuleProgressItem
                    module={program.modules.find(m => m.status === 'in_progress') || program.modules[0]}
                    onSelect={(moduleId) => handleModuleSelect(program.id, moduleId)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500">
          <p>No training programs available.</p>
        </div>
      )}
    </Card>
  );
};
