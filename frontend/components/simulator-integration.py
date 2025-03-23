// src/frontend/components/simulator/SimulatorIntegration.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Tabs, Tab } from '../ui/Tabs';
import { Alert } from '../ui/Alert';

// Types
export enum SimulatorConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

export interface SimulatorParameter {
  id: string;
  name: string;
  value: number | boolean | string;
  unit?: string;
  min?: number;
  max?: number;
  category: string;
  isEditable: boolean;
}

export interface SimulatorEvent {
  id: string;
  timestamp: Date;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  parameters?: Record<string, any>;
}

export interface FlightData {
  timestamp: number;
  altitude: number;
  speed: number;
  heading: number;
  pitch: number;
  roll: number;
  verticalSpeed: number;
  latitude: number;
  longitude: number;
  fuelRemaining: number;
  engineStatus: string[];
  systemsStatus: Record<string, boolean>;
}

export interface ExerciseScenario {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  duration: number;
  objectives: string[];
  initialConditions: Record<string, any>;
  events?: {
    triggerTime: number;
    type: string;
    parameters: Record<string, any>;
  }[];
}

export interface SimulatorScore {
  totalScore: number;
  breakdown: {
    category: string;
    score: number;
    maxScore: number;
    details: {
      parameter: string;
      score: number;
      maxScore: number;
      reason?: string;
    }[];
  }[];
  criticalErrors: {
    timestamp: number;
    description: string;
    impact: number;
  }[];
  recommendations: string[];
}

// Components
interface ParameterGroupProps {
  category: string;
  parameters: SimulatorParameter[];
  onParameterChange: (id: string, value: number | boolean | string) => void;
}

const ParameterGroup: React.FC<ParameterGroupProps> = ({
  category,
  parameters,
  onParameterChange
}) => {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-medium mb-2">{category}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {parameters.map(param => (
          <div key={param.id} className="bg-gray-50 rounded-md p-3">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor={param.id} className="block text-sm font-medium text-gray-700">
                {param.name}
              </label>
              {param.unit && (
                <span className="text-xs text-gray-500">
                  {param.unit}
                </span>
              )}
            </div>
            
            {typeof param.value === 'boolean' ? (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id={param.id}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  checked={param.value}
                  onChange={(e) => onParameterChange(param.id, e.target.checked)}
                  disabled={!param.isEditable}
                />
                <label htmlFor={param.id} className="ml-2 block text-sm text-gray-900">
                  {param.value ? 'Enabled' : 'Disabled'}
                </label>
              </div>
            ) : typeof param.value === 'number' ? (
              <div>
                <input
                  type="range"
                  id={param.id}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  min={param.min || 0}
                  max={param.max || 100}
                  value={param.value}
                  onChange={(e) => onParameterChange(param.id, Number(e.target.value))}
                  disabled={!param.isEditable}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{param.min || 0}</span>
                  <span className="font-medium">{param.value}</span>
                  <span>{param.max || 100}</span>
                </div>
              </div>
            ) : (
              <input
                type="text"
                id={param.id}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={param.value}
                onChange={(e) => onParameterChange(param.id, e.target.value)}
                disabled={!param.isEditable}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

interface FlightDataDisplayProps {
  flightData: FlightData;
}

const FlightDataDisplay: React.FC<FlightDataDisplayProps> = ({
  flightData
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div className="bg-gray-50 rounded-md p-3">
        <p className="text-xs font-medium text-gray-500">Altitude</p>
        <p className="text-lg font-semibold">{Math.round(flightData.altitude)} ft</p>
      </div>
      
      <div className="bg-gray-50 rounded-md p-3">
        <p className="text-xs font-medium text-gray-500">Speed</p>
        <p className="text-lg font-semibold">{Math.round(flightData.speed)} kts</p>
      </div>
      
      <div className="bg-gray-50 rounded-md p-3">
        <p className="text-xs font-medium text-gray-500">Heading</p>
        <p className="text-lg font-semibold">{Math.round(flightData.heading)}°</p>
      </div>
      
      <div className="bg-gray-50 rounded-md p-3">
        <p className="text-xs font-medium text-gray-500">Vertical Speed</p>
        <p className="text-lg font-semibold">{Math.round(flightData.verticalSpeed)} ft/min</p>
      </div>
      
      <div className="bg-gray-50 rounded-md p-3">
        <p className="text-xs font-medium text-gray-500">Pitch</p>
        <p className="text-lg font-semibold">{flightData.pitch.toFixed(1)}°</p>
      </div>
      
      <div className="bg-gray-50 rounded-md p-3">
        <p className="text-xs font-medium text-gray-500">Roll</p>
        <p className="text-lg font-semibold">{flightData.roll.toFixed(1)}°</p>
      </div>
      
      <div className="bg-gray-50 rounded-md p-3">
        <p className="text-xs font-medium text-gray-500">Fuel Remaining</p>
        <p className="text-lg font-semibold">{Math.round(flightData.fuelRemaining)} lbs</p>
      </div>
      
      <div className="bg-gray-50 rounded-md p-3">
        <p className="text-xs font-medium text-gray-500">Position</p>
        <p className="text-sm font-semibold">
          {flightData.latitude.toFixed(4)}, {flightData.longitude.toFixed(4)}
        </p>
      </div>
    </div>
  );
};

interface EventLogProps {
  events: SimulatorEvent[];
}

const EventLog: React.FC<EventLogProps> = ({
  events
}) => {
  return (
    <div className="bg-gray-50 rounded-md overflow-hidden">
      <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
        <h3 className="text-sm font-medium">Event Log</h3>
      </div>
      
      <div className="overflow-y-auto max-h-80">
        {events.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {events.map(event => (
              <div key={event.id} className="p-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    {event.severity === 'critical' ? (
                      <div className="h-4 w-4 rounded-full bg-red-500"></div>
                    ) : event.severity === 'warning' ? (
                      <div className="h-4 w-4 rounded-full bg-yellow-500"></div>
                    ) : (
                      <div className="h-4 w-4 rounded-full bg-blue-500"></div>
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium">{event.type}</p>
                    <p className="text-sm text-gray-500">{event.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500">
            No events recorded.
          </div>
        )}
      </div>
    </div>
  );
};

interface ScenarioSelectorProps {
  scenarios: ExerciseScenario[];
  onSelectScenario: (scenarioId: string) => void;
}

const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  scenarios,
  onSelectScenario
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
  
  const handleSelectScenario = () => {
    if (selectedScenarioId) {
      onSelectScenario(selectedScenarioId);
    }
  };
  
  return (
    <div>
      <div className="mb-4">
        <label htmlFor="scenario-select" className="block text-sm font-medium text-gray-700">
          Select Training Scenario
        </label>
        <select
          id="scenario-select"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          value={selectedScenarioId}
          onChange={(e) => setSelectedScenarioId(e.target.value)}
        >
          <option value="">-- Select Scenario --</option>
          {scenarios.map(scenario => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.name} ({scenario.difficulty})
            </option>
          ))}
        </select>
      </div>
      
      {selectedScenarioId && (
        <div className="bg-gray-50 rounded-md p-4 mb-4">
          {scenarios
            .filter(scenario => scenario.id === selectedScenarioId)
            .map(scenario => (
              <div key={scenario.id}>
                <h3 className="text-lg font-medium mb-2">{scenario.name}</h3>
                <p className="text-sm text-gray-500 mb-2">{scenario.description}</p>
                
                <div className="mb-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                    {scenario.difficulty}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    {scenario.duration} min
                  </span>
                </div>
                
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-1">Objectives:</h4>
                  <ul className="list-disc list-inside text-sm">
                    {scenario.objectives.map((objective, index) => (
                      <li key={index}>{objective}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
        </div>
      )}
      
      <Button
        variant="primary"
        onClick={handleSelectScenario}
        disabled={!selectedScenarioId}
      >
        Load Scenario
      </Button>
    </div>
  );
};

interface ScoreDisplayProps {
  score: SimulatorScore;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  score
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold">
          Total Score: {score.totalScore}%
        </h3>
        <div className="w-full bg-gray-200 rounded-full h-4 mt-2">
          <div
            className={`h-4 rounded-full ${
              score.totalScore >= 80 ? 'bg-green-600' :
              score.totalScore >= 60 ? 'bg-yellow-500' :
              'bg-red-600'
            }`}
            style={{ width: `${score.totalScore}%` }}
          ></div>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-3">Score Breakdown</h3>
        <div className="space-y-4">
          {score.breakdown.map(category => (
            <div key={category.category} className="bg-gray-50 p-4 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">{category.category}</h4>
                <span className="text-sm">
                  {category.score} / {category.maxScore} ({Math.round((category.score / category.maxScore) * 100)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    (category.score / category.maxScore) >= 0.8 ? 'bg-green-600' :
                    (category.score / category.maxScore) >= 0.6 ? 'bg-yellow-500' :
                    'bg-red-600'
                  }`}
                  style={{ width: `${(category.score / category.maxScore) * 100}%` }}
                ></div>
              </div>
              
              <div className="mt-3 pl-4 border-l-2 border-gray-300 space-y-2">
                {category.details.map((detail, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{detail.parameter}</span>
                    <span>
                      {detail.score} / {detail.maxScore}
                      {detail.reason && (
                        <span className="ml-2 text-xs text-gray-500">({detail.reason})</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {score.criticalErrors.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3 text-red-600">Critical Errors</h3>
          <div className="bg-red-50 p-4 rounded-md">
            <ul className="space-y-2">
              {score.criticalErrors.map((error, index) => (
                <li key={index} className="flex justify-between">
                  <span className="text-sm text-red-800">{error.description}</span>
                  <span className="text-sm font-medium text-red-800">
                    -{error.impact} points
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {score.recommendations.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3">Recommendations</h3>
          <div className="bg-blue-50 p-4 rounded-md">
            <ul className="list-disc list-inside space-y-2">
              {score.recommendations.map((recommendation, index) => (
                <li key={index} className="text-sm text-blue-800">{recommendation}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Component
interface SimulatorIntegrationProps {
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onStart: (scenarioId: string) => Promise<void>;
  onStop: () => Promise<void>;
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onReset: () => Promise<void>;
  onParameterChange: (id: string, value: number | boolean | string) => Promise<void>;
  connectionStatus: SimulatorConnectionStatus;
  parameters: SimulatorParameter[];
  flightData?: FlightData;
  events: SimulatorEvent[];
  scenarios: ExerciseScenario[];
  isRunning: boolean;
  isPaused: boolean;
  score?: SimulatorScore;
}

export const SimulatorIntegration: React.FC<SimulatorIntegrationProps> = ({
  onConnect,
  onDisconnect,
  onStart,
  onStop,
  onPause,
  onResume,
  onReset,
  onParameterChange,
  connectionStatus,
  parameters,
  flightData,
  events,
  scenarios,
  isRunning,
  isPaused,
  score
}) => {
  const [activeTab, setActiveTab] = useState<'control' | 'monitor' | 'results'>('control');
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  
  // Group parameters by category
  const parameterGroups = parameters.reduce<Record<string, SimulatorParameter[]>>((acc, param) => {
    if (!acc[param.category]) {
      acc[param.category] = [];
    }
    acc[param.category].push(param);
    return acc;
  }, {});
  
  // Handle connection
  const handleConnect = async () => {
    try {
      await onConnect();
      setAlertMessage({
        type: 'success',
        message: 'Connected to simulator successfully.'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to connect to simulator: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };
  
  // Handle disconnection
  const handleDisconnect = async () => {
    try {
      await onDisconnect();
      setAlertMessage({
        type: 'success',
        message: 'Disconnected from simulator successfully.'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to disconnect from simulator: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };
  
  // Handle start simulation
  const handleStart = async (scenarioId: string) => {
    try {
      await onStart(scenarioId);
      setAlertMessage({
        type: 'success',
        message: 'Simulation started successfully.'
      });
      setActiveTab('monitor');
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to start simulation: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };
  
  // Handle stop simulation
  const handleStop = async () => {
    try {
      await onStop();
      setAlertMessage({
        type: 'success',
        message: 'Simulation stopped successfully.'
      });
      if (score) {
        setShowScoreModal(true);
      }
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to stop simulation: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };
  
  // Handle parameter change
  const handleParameterChange = async (id: string, value: number | boolean | string) => {
    try {
      await onParameterChange(id, value);
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to update parameter: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };
  
  const tabs: Tab[] = [
    {
      id: 'control',
      label: 'Control',
      content: (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <h3 className="text-lg font-medium mb-2 sm:mb-0">Simulator Connection</h3>
              
              <div className="flex gap-2">
                {connectionStatus === SimulatorConnectionStatus.DISCONNECTED && (
                  <Button
                    variant="primary"
                    onClick={handleConnect}
                  >
                    Connect
                  </Button>
                )}
                
                {connectionStatus === SimulatorConnectionStatus.CONNECTED && (
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </Button>
                )}
                
                {connectionStatus === SimulatorConnectionStatus.CONNECTING && (
                  <Button
                    variant="primary"
                    isLoading
                    disabled
                  >
                    Connecting...
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex items-center">
              <div className={`h-3 w-3 rounded-full mr-2 ${
                connectionStatus === SimulatorConnectionStatus.CONNECTED ? 'bg-green-500' :
                connectionStatus === SimulatorConnectionStatus.CONNECTING ? 'bg-yellow-500' :
                connectionStatus === SimulatorConnectionStatus.ERROR ? 'bg-red-500' :
                'bg-gray-500'
              }`}></div>
              
              <span className="text-sm">
                {connectionStatus === SimulatorConnectionStatus.CONNECTED ? 'Connected' :
                 connectionStatus === SimulatorConnectionStatus.CONNECTING ? 'Connecting' :
                 connectionStatus === SimulatorConnectionStatus.ERROR ? 'Connection Error' :
                 'Disconnected'}
              </span>
            </div>
          </Card>
          
          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-medium">Scenario Selection</h3>
            </div>
            
            <ScenarioSelector
              scenarios={scenarios}
              onSelectScenario={handleStart}
            />
          </Card>
          
          {connectionStatus === SimulatorConnectionStatus.CONNECTED && (
            <Card>
              <div className="mb-4">
                <h3 className="text-lg font-medium">Simulator Parameters</h3>
                <p className="text-sm text-gray-500">Adjust simulator parameters before starting a scenario.</p>
              </div>
              
              {Object.entries(parameterGroups).map(([category, params]) => (
                <ParameterGroup
                  key={category}
                  category={category}
                  parameters={params}
                  onParameterChange={handleParameterChange}
                />
              ))}
            </Card>
          )}
        </div>
      )
    },
    {
      id: 'monitor',
      label: 'Monitor',
      content: (
        <div className="space-y-6">
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <h3 className="text-lg font-medium mb-2 sm:mb-0">Simulation Controls</h3>
              
              <div className="flex gap-2">
                {isRunning && !isPaused && (
                  <Button
                    variant="outline"
                    onClick={onPause}
                  >
                    Pause
                  </Button>
                )}
                
                {isRunning && isPaused && (
                  <Button
                    variant="outline"
                    onClick={onResume}
                  >
                    Resume
                  </Button>
                )}
                
                {isRunning && (
                  <Button
                    variant="outline"
                    onClick={onReset}
                  >
                    Reset
                  </Button>
                )}
                
                <Button
                  variant={isRunning ? 'danger' : 'primary'}
                  onClick={isRunning ? handleStop : () => setActiveTab('control')}
                >
                  {isRunning ? 'Stop Simulation' : 'New Simulation'}
                </Button>
              </div>
            </div>
            
            <div className="flex items-center mb-4">
              <div className={`h-3 w-3 rounded-full mr-2 ${
                isRunning && !isPaused ? 'bg-green-500' :
                isRunning && isPaused ? 'bg-yellow-500' :
                'bg-gray-500'
              }`}></div>
              
              <span className="text-sm">
                {isRunning && !isPaused ? 'Running' :
                 isRunning && isPaused ? 'Paused' :
                 'Stopped'}
              </span>
            </div>
            
            {isPaused && (
              <div className="bg-yellow-50 p-3 rounded-md mb-4">
                <p className="text-sm text-yellow-800">
                  Simulation is paused. Click Resume to continue or Reset to restart from initial conditions.
                </p>
              </div>
            )}
          </Card>
          
          {flightData && (
            <Card>
              <div className="mb-4">
                <h3 className="text-lg font-medium">Flight Data</h3>
              </div>
              
              <FlightDataDisplay flightData={flightData} />
            </Card>
          )}
          
          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-medium">Event Log</h3>
            </div>
            
            <EventLog events={events} />
          </Card>
        </div>
      )
    },
    {
      id: 'results',
      label: 'Results',
      content: (
        <div className="space-y-6">
          {score ? (
            <Card>
              <div className="mb-4">
                <h3 className="text-lg font-medium">Performance Results</h3>
              </div>
              
              <ScoreDisplay score={score} />
            </Card>
          ) : (
            <Card>
              <div className="p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No results available</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Complete a simulation to view performance results.
                </p>
                <div className="mt-6">
                  <Button
                    variant="primary"
                    onClick={() => setActiveTab('control')}
                  >
                    Start New Simulation
                  </Button>
                </div>
              </div>
            </Card>
          )}
          
          {/* Events timeline (placeholder) */}
          {score && events.length > 0 && (
            <Card>
              <div className="mb-4">
                <h3 className="text-lg font-medium">Event Timeline</h3>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md h-64 flex items-center justify-center">
                <p className="text-gray-500">Event timeline visualization would be displayed here</p>
              </div>
            </Card>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="simulator-integration">
      {/* Alert message */}
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Simulator Integration</h2>
        
        <div className="flex items-center mt-2 sm:mt-0">
          <div className={`h-3 w-3 rounded-full mr-2 ${
            connectionStatus === SimulatorConnectionStatus.CONNECTED ? 'bg-green-500' :
            connectionStatus === SimulatorConnectionStatus.CONNECTING ? 'bg-yellow-500' :
            connectionStatus === SimulatorConnectionStatus.ERROR ? 'bg-red-500' :
            'bg-gray-500'
          }`}></div>
          
          <span className="text-sm mr-4">
            {connectionStatus === SimulatorConnectionStatus.CONNECTED ? 'Connected' :
             connectionStatus === SimulatorConnectionStatus.CONNECTING ? 'Connecting' :
             connectionStatus === SimulatorConnectionStatus.ERROR ? 'Connection Error' :
             'Disconnected'}
          </span>
          
          {isRunning && (
            <>
              <div className={`h-3 w-3 rounded-full mr-2 ${
                !isPaused ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              
              <span className="text-sm">
                {!isPaused ? 'Running' : 'Paused'}
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* Main tabs */}
      <Tabs
        tabs={tabs}
        defaultTabId="control"
        onChange={(tabId) => setActiveTab(tabId as any)}
      />
      
      {/* Score Modal */}
      {showScoreModal && score && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Simulation Complete
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        The simulation has ended. Your performance score is:
                      </p>
                      <p className="text-3xl font-bold text-center my-4">
                        {score.totalScore}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setShowScoreModal(false);
                    setActiveTab('results');
                  }}
                >
                  View Detailed Results
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => {
                    setShowScoreModal(false);
                    setActiveTab('control');
                  }}
                >
                  Start New Simulation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};