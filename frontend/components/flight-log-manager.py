// src/frontend/components/flightlog/FlightLogManager.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Form } from '../ui/Form';
import { Alert } from '../ui/Alert';
import { DataTable, Column } from '../ui/DataTable';
import { Modal } from '../ui/Modal';
import { Tabs, Tab } from '../ui/Tabs';

// Types
export enum AircraftCategory {
  AIRPLANE_SINGLE_ENGINE = 'airplane_single_engine',
  AIRPLANE_MULTI_ENGINE = 'airplane_multi_engine',
  HELICOPTER = 'helicopter',
  GLIDER = 'glider',
  SIMULATOR = 'simulator'
}

export enum FlightCondition {
  VFR = 'vfr',
  IFR = 'ifr',
  NIGHT = 'night',
  DUAL = 'dual',
  PIC = 'pic',
  SIC = 'sic',
  SOLO = 'solo',
  CROSS_COUNTRY = 'cross_country',
  INSTRUCTION_GIVEN = 'instruction_given'
}

export enum ManeuverType {
  TAKEOFF = 'takeoff',
  LANDING = 'landing',
  STALL = 'stall',
  STEEP_TURN = 'steep_turn',
  SLOW_FLIGHT = 'slow_flight',
  EMERGENCY_PROCEDURES = 'emergency_procedures',
  INSTRUMENT_APPROACH = 'instrument_approach',
  HOLDING = 'holding',
  NAVIGATION = 'navigation',
  TRAFFIC_PATTERN = 'traffic_pattern',
  OTHER = 'other'
}

export interface FlightManeuver {
  type: ManeuverType;
  count: number;
  performance?: 'satisfactory' | 'needs_improvement' | 'unsatisfactory';
  notes?: string;
}

export interface FlightLogEntry {
  id: string;
  date: Date;
  aircraftType: string;
  aircraftRegistration: string;
  aircraftCategory: AircraftCategory;
  departureAirport: string;
  arrivalAirport: string;
  route?: string;
  totalFlightTime: number; // in decimal hours
  conditions: FlightCondition[];
  maneuvers: FlightManeuver[];
  picName?: string;
  sicName?: string;
  instructorName?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  isEndorsed?: boolean;
  endorsedBy?: string;
  endorsedAt?: Date;
}

export interface HoursBreakdown {
  total: number;
  pic: number;
  sic: number;
  solo: number;
  dual: number;
  instructionGiven: number;
  night: number;
  ifr: number;
  crossCountry: number;
  byCategory: Record<AircraftCategory, number>;
}

export interface ManeuverBreakdown {
  type: ManeuverType;
  total: number;
  byPerformance: {
    satisfactory: number;
    needsImprovement: number;
    unsatisfactory: number;
  };
}

// Flight Log Entry Form
interface FlightLogEntryFormProps {
  entry?: FlightLogEntry;
  onSave: (entry: Partial<FlightLogEntry>) => Promise<void>;
  onCancel: () => void;
  aircraftTypes: string[];
  isLoading: boolean;
}

const FlightLogEntryForm: React.FC<FlightLogEntryFormProps> = ({
  entry,
  onSave,
  onCancel,
  aircraftTypes,
  isLoading
}) => {
  const isEditing = !!entry;
  
  const initialFormState: Partial<FlightLogEntry> = entry ? {
    ...entry,
    date: entry.date instanceof Date ? entry.date : new Date(entry.date)
  } : {
    date: new Date(),
    aircraftType: '',
    aircraftRegistration: '',
    aircraftCategory: AircraftCategory.AIRPLANE_SINGLE_ENGINE,
    departureAirport: '',
    arrivalAirport: '',
    totalFlightTime: 0,
    conditions: [],
    maneuvers: []
  };

  const [formData, setFormData] = useState<Partial<FlightLogEntry>>(initialFormState);
  const [newManeuver, setNewManeuver] = useState<Partial<FlightManeuver>>({
    type: ManeuverType.TAKEOFF,
    count: 1
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData({ ...formData, [name]: parseFloat(value) || 0 });
    } else if (type === 'date') {
      setFormData({ ...formData, [name]: new Date(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
    
    // Clear error for this field
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
  };

  // Handle condition toggle
  const handleConditionToggle = (condition: FlightCondition) => {
    const currentConditions = formData.conditions || [];
    
    if (currentConditions.includes(condition)) {
      setFormData({
        ...formData,
        conditions: currentConditions.filter(c => c !== condition)
      });
    } else {
      setFormData({
        ...formData,
        conditions: [...currentConditions, condition]
      });
    }
  };

  // Handle add maneuver
  const handleAddManeuver = () => {
    if (!newManeuver.type || !newManeuver.count) return;
    
    const maneuverToAdd: FlightManeuver = {
      type: newManeuver.type as ManeuverType,
      count: newManeuver.count || 1,
      performance: newManeuver.performance as 'satisfactory' | 'needs_improvement' | 'unsatisfactory',
      notes: newManeuver.notes
    };
    
    const currentManeuvers = formData.maneuvers || [];
    
    // Check if this maneuver type already exists
    const existingIndex = currentManeuvers.findIndex(m => m.type === maneuverToAdd.type);
    
    if (existingIndex >= 0) {
      // Update existing maneuver
      const updatedManeuvers = [...currentManeuvers];
      updatedManeuvers[existingIndex] = {
        ...updatedManeuvers[existingIndex],
        count: (updatedManeuvers[existingIndex].count || 0) + maneuverToAdd.count,
        performance: maneuverToAdd.performance || updatedManeuvers[existingIndex].performance,
        notes: maneuverToAdd.notes || updatedManeuvers[existingIndex].notes
      };
      
      setFormData({
        ...formData,
        maneuvers: updatedManeuvers
      });
    } else {
      // Add new maneuver
      setFormData({
        ...formData,
        maneuvers: [...currentManeuvers, maneuverToAdd]
      });
    }
    
    // Reset form
    setNewManeuver({
      type: ManeuverType.TAKEOFF,
      count: 1
    });
  };

  // Handle remove maneuver
  const handleRemoveManeuver = (type: ManeuverType) => {
    const currentManeuvers = formData.maneuvers || [];
    
    setFormData({
      ...formData,
      maneuvers: currentManeuvers.filter(m => m.type !== type)
    });
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    
    if (!formData.aircraftType) {
      newErrors.aircraftType = 'Aircraft type is required';
    }
    
    if (!formData.aircraftRegistration) {
      newErrors.aircraftRegistration = 'Aircraft registration is required';
    }
    
    if (!formData.departureAirport) {
      newErrors.departureAirport = 'Departure airport is required';
    }
    
    if (!formData.arrivalAirport) {
      newErrors.arrivalAirport = 'Arrival airport is required';
    }
    
    if (!formData.totalFlightTime) {
      newErrors.totalFlightTime = 'Total flight time is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving flight log entry:', error);
    }
  };

  // Format label from enum
  const formatLabel = (value: string): string => {
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Date"
            name="date"
            type="date"
            value={formData.date ? new Date(formData.date).toISOString().split('T')[0] : ''}
            onChange={handleInputChange}
            error={errors.date}
            required
          />
          
          <div>
            <label htmlFor="aircraftType" className="block text-sm font-medium text-gray-700 mb-1">
              Aircraft Type
            </label>
            <div className="relative">
              <input
                list="aircraftTypesList"
                id="aircraftType"
                name="aircraftType"
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={formData.aircraftType || ''}
                onChange={handleInputChange}
                required
              />
              <datalist id="aircraftTypesList">
                {aircraftTypes.map(type => (
                  <option key={type} value={type} />
                ))}
              </datalist>
            </div>
            {errors.aircraftType && (
              <p className="mt-1 text-sm text-red-600">{errors.aircraftType}</p>
            )}
          </div>
          
          <Input
            label="Aircraft Registration"
            name="aircraftRegistration"
            value={formData.aircraftRegistration || ''}
            onChange={handleInputChange}
            error={errors.aircraftRegistration}
            required
          />
        </div>
        
        <div>
          <label htmlFor="aircraftCategory" className="block text-sm font-medium text-gray-700 mb-1">
            Aircraft Category
          </label>
          <select
            id="aircraftCategory"
            name="aircraftCategory"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={formData.aircraftCategory || AircraftCategory.AIRPLANE_SINGLE_ENGINE}
            onChange={handleInputChange}
          >
            {Object.values(AircraftCategory).map(category => (
              <option key={category} value={category}>
                {formatLabel(category)}
              </option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Departure Airport"
            name="departureAirport"
            value={formData.departureAirport || ''}
            onChange={handleInputChange}
            error={errors.departureAirport}
            required
          />
          
          <Input
            label="Arrival Airport"
            name="arrivalAirport"
            value={formData.arrivalAirport || ''}
            onChange={handleInputChange}
            error={errors.arrivalAirport}
            required
          />
        </div>
        
        <Input
          label="Route"
          name="route"
          value={formData.route || ''}
          onChange={handleInputChange}
          helpText="Optional: Enter route of flight"
        />
        
        <Input
          label="Total Flight Time (hours)"
          name="totalFlightTime"
          type="number"
          step="0.1"
          min="0"
          value={formData.totalFlightTime || ''}
          onChange={handleInputChange}
          error={errors.totalFlightTime}
          required
        />
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Flight Conditions
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {Object.values(FlightCondition).map(condition => (
              <div key={condition} className="flex items-center">
                <input
                  type="checkbox"
                  id={`condition-${condition}`}
                  checked={(formData.conditions || []).includes(condition)}
                  onChange={() => handleConditionToggle(condition)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`condition-${condition}`} className="ml-2 text-sm text-gray-700">
                  {formatLabel(condition)}
                </label>
              </div>
            ))}
          </div>
        </div>
        
        <div className="border-t border-gray-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maneuvers
          </label>
          
          {/* List current maneuvers */}
          {(formData.maneuvers || []).length > 0 && (
            <div className="mb-4 space-y-2">
              {(formData.maneuvers || []).map(maneuver => (
                <div key={maneuver.type} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <div>
                    <span className="font-medium">{formatLabel(maneuver.type)}</span>
                    <span className="ml-2 text-gray-500">({maneuver.count})</span>
                    {maneuver.performance && (
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                        maneuver.performance === 'satisfactory' ? 'bg-green-100 text-green-800' :
                        maneuver.performance === 'needs_improvement' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {formatLabel(maneuver.performance)}
                      </span>
                    )}
                    {maneuver.notes && (
                      <p className="text-xs text-gray-500 mt-1">{maneuver.notes}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveManeuver(maneuver.type)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Add maneuver form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
            <div>
              <label htmlFor="maneuverType" className="block text-xs font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                id="maneuverType"
                value={newManeuver.type || ManeuverType.TAKEOFF}
                onChange={(e) => setNewManeuver({ ...newManeuver, type: e.target.value as ManeuverType })}
                className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
              >
                {Object.values(ManeuverType).map(type => (
                  <option key={type} value={type}>
                    {formatLabel(type)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="maneuverCount" className="block text-xs font-medium text-gray-700 mb-1">
                Count
              </label>
              <input
                type="number"
                id="maneuverCount"
                min="1"
                value={newManeuver.count || 1}
                onChange={(e) => setNewManeuver({ ...newManeuver, count: parseInt(e.target.value) || 1 })}
                className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
              />
            </div>
            
            <div>
              <label htmlFor="maneuverPerformance" className="block text-xs font-medium text-gray-700 mb-1">
                Performance
              </label>
              <select
                id="maneuverPerformance"
                value={newManeuver.performance || ''}
                onChange={(e) => setNewManeuver({ ...newManeuver, performance: e.target.value as 'satisfactory' | 'needs_improvement' | 'unsatisfactory' })}
                className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
              >
                <option value="">Select Performance</option>
                <option value="satisfactory">Satisfactory</option>
                <option value="needs_improvement">Needs Improvement</option>
                <option value="unsatisfactory">Unsatisfactory</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                size="small"
                onClick={handleAddManeuver}
                className="w-full"
              >
                Add Maneuver
              </Button>
            </div>
          </div>
          
          <div>
            <label htmlFor="maneuverNotes" className="block text-xs font-medium text-gray-700 mb-1">
              Maneuver Notes
            </label>
            <textarea
              id="maneuverNotes"
              value={newManeuver.notes || ''}
              onChange={(e) => setNewManeuver({ ...newManeuver, notes: e.target.value })}
              rows={2}
              className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
              placeholder="Optional notes about the maneuver"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="PIC Name"
            name="picName"
            value={formData.picName || ''}
            onChange={handleInputChange}
            helpText="Pilot in Command"
          />
          
          <Input
            label="SIC Name"
            name="sicName"
            value={formData.sicName || ''}
            onChange={handleInputChange}
            helpText="Second in Command"
          />
          
          <Input
            label="Instructor Name"
            name="instructorName"
            value={formData.instructorName || ''}
            onChange={handleInputChange}
          />
        </div>
        
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            value={formData.notes || ''}
            onChange={handleInputChange}
            placeholder="Additional notes about the flight"
          />
        </div>
        
        <div className="flex justify-end space-x-3">
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
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isEditing ? 'Update Flight Log' : 'Save Flight Log'}
          </Button>
        </div>
      </div>
    </Form>
  );
};

// Flight Log Entry Detail Component
interface FlightLogEntryDetailProps {
  entry: FlightLogEntry;
  onEdit: () => void;
  onClose: () => void;
  onDelete: () => void;
  onEndorse?: (instructorName: string) => Promise<void>;
  isInstructor: boolean;
}

const FlightLogEntryDetail: React.FC<FlightLogEntryDetailProps> = ({
  entry,
  onEdit,
  onClose,
  onDelete,
  onEndorse,
  isInstructor
}) => {
  const [isEndorsing, setIsEndorsing] = useState(false);
  const [instructorName, setInstructorName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Format date
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString();
  };
  
  // Format label from enum
  const formatLabel = (value: string): string => {
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  // Handle endorse
  const handleEndorse = async () => {
    if (!instructorName) return;
    
    setIsLoading(true);
    
    try {
      if (onEndorse) {
        await onEndorse(instructorName);
      }
      setIsEndorsing(false);
    } catch (error) {
      console.error('Error endorsing flight log:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flight-log-entry-detail">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-xl font-bold">
            Flight Log: {entry.departureAirport} to {entry.arrivalAirport}
          </h2>
          <p className="text-gray-500">{formatDate(entry.date)}</p>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="small"
            onClick={onEdit}
          >
            Edit
          </Button>
          
          <Button
            variant="outline"
            size="small"
            onClick={onDelete}
          >
            Delete
          </Button>
          
          {isInstructor && !entry.isEndorsed && onEndorse && (
            <Button
              variant="primary"
              size="small"
              onClick={() => setIsEndorsing(true)}
            >
              Endorse
            </Button>
          )}
        </div>
      </div>
      
      {entry.isEndorsed && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
            </svg>
            <span className="font-medium text-green-800">
              Endorsed by {entry.endorsedBy} on {entry.endorsedAt ? formatDate(entry.endorsedAt) : 'Unknown'}
            </span>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-lg font-medium mb-3">Flight Details</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Aircraft Type</p>
              <p>{entry.aircraftType}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Registration</p>
              <p>{entry.aircraftRegistration}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Category</p>
              <p>{formatLabel(entry.aircraftCategory)}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Flight Time</p>
              <p>{entry.totalFlightTime} hours</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Departure</p>
              <p>{entry.departureAirport}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Arrival</p>
              <p>{entry.arrivalAirport}</p>
            </div>
          </div>
          
          {entry.route && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500">Route</p>
              <p>{entry.route}</p>
            </div>
          )}
          
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Conditions</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {entry.conditions.map(condition => (
                <span 
                  key={condition}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {formatLabel(condition)}
                </span>
              ))}
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-500">Crew</p>
            <div className="grid grid-cols-2 gap-4 mt-1">
              {entry.picName && (
                <div>
                  <p className="text-xs text-gray-500">PIC</p>
                  <p className="text-sm">{entry.picName}</p>
                </div>
              )}
              
              {entry.sicName && (
                <div>
                  <p className="text-xs text-gray-500">SIC</p>
                  <p className="text-sm">{entry.sicName}</p>
                </div>
              )}
              
              {entry.instructorName && (
                <div>
                  <p className="text-xs text-gray-500">Instructor</p>
                  <p className="text-sm">{entry.instructorName}</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-3">Maneuvers</h3>
          
          {entry.maneuvers.length > 0 ? (
            <div className="space-y-2">
              {entry.maneuvers.map(maneuver => (
                <div key={maneuver.type} className="p-3 bg-gray-50 rounded-md">
                  <div className="flex justify-between">
                    <p className="font-medium">{formatLabel(maneuver.type)}</p>
                    <p className="text-gray-500">{maneuver.count} {maneuver.count > 1 ? 'times' : 'time'}</p>
                  </div>
                  
                  {maneuver.performance && (
                    <p className="mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        maneuver.performance === 'satisfactory' ? 'bg-green-100 text-green-800' :
                        maneuver.performance === 'needs_improvement' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {formatLabel(maneuver.performance)}
                      </span>
                    </p>
                  )}
                  
                  {maneuver.notes && (
                    <p className="mt-2 text-sm text-gray-600">{maneuver.notes}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No maneuvers recorded for this flight.</p>
          )}
          
          {entry.notes && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500">Notes</p>
              <p className="mt-1 text-sm">{entry.notes}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Endorse modal */}
      {isEndorsing && (
        <Modal
          isOpen={isEndorsing}
          onClose={() => setIsEndorsing(false)}
          title="Endorse Flight Log Entry"
          size="md"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              By endorsing this flight log entry, you certify that the information provided is accurate and the flight was conducted according to applicable regulations.
            </p>
            
            <Input
              label="Instructor Name"
              value={instructorName}
              onChange={(e) => setInstructorName(e.target.value)}
              required
            />
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsEndorsing(false)}
              >
                Cancel
              </Button>
              
              <Button
                variant="primary"
                onClick={handleEndorse}
                isLoading={isLoading}
                disabled={isLoading || !instructorName}
              >
                Endorse Flight
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

// Flight Log Summary Component
interface FlightLogSummaryProps {
  entries: FlightLogEntry[];
  startDate?: Date;
  endDate?: Date;
}

const FlightLogSummary: React.FC<FlightLogSummaryProps> = ({
  entries,
  startDate,
  endDate
}) => {
  // Filter entries by date range if provided
  const filteredEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    
    if (startDate && entryDate < startDate) {
      return false;
    }
    
    if (endDate && entryDate > endDate) {
      return false;
    }
    
    return true;
  });
  
  // Calculate hours breakdown
  const calculateHoursBreakdown = (): HoursBreakdown => {
    const breakdown: HoursBreakdown = {
      total: 0,
      pic: 0,
      sic: 0,
      solo: 0,
      dual: 0,
      instructionGiven: 0,
      night: 0,
      ifr: 0,
      crossCountry: 0,
      byCategory: {
        [AircraftCategory.AIRPLANE_SINGLE_ENGINE]: 0,
        [AircraftCategory.AIRPLANE_MULTI_ENGINE]: 0,
        [AircraftCategory.HELICOPTER]: 0,
        [AircraftCategory.GLIDER]: 0,
        [AircraftCategory.SIMULATOR]: 0
      }
    };
    
    filteredEntries.forEach(entry => {
      const flightTime = entry.totalFlightTime || 0;
      
      // Total time
      breakdown.total += flightTime;
      
      // Time by aircraft category
      breakdown.byCategory[entry.aircraftCategory] += flightTime;
      
      // Time by conditions
      if (entry.conditions.includes(FlightCondition.PIC)) {
        breakdown.pic += flightTime;
      }
      
      if (entry.conditions.includes(FlightCondition.SIC)) {
        breakdown.sic += flightTime;
      }
      
      if (entry.conditions.includes(FlightCondition.SOLO)) {
        breakdown.solo += flightTime;
      }
      
      if (entry.conditions.includes(FlightCondition.DUAL)) {
        breakdown.dual += flightTime;
      }
      
      if (entry.conditions.includes(FlightCondition.INSTRUCTION_GIVEN)) {
        breakdown.instructionGiven += flightTime;
      }
      
      if (entry.conditions.includes(FlightCondition.NIGHT)) {
        breakdown.night += flightTime;
      }
      
      if (entry.conditions.includes(FlightCondition.IFR)) {
        breakdown.ifr += flightTime;
      }
      
      if (entry.conditions.includes(FlightCondition.CROSS_COUNTRY)) {
        breakdown.crossCountry += flightTime;
      }
    });
    
    return breakdown;
  };
  
  // Calculate maneuver breakdown
  const calculateManeuverBreakdown = (): ManeuverBreakdown[] => {
    const maneuverMap: Record<string, ManeuverBreakdown> = {};
    
    // Initialize for all maneuver types
    Object.values(ManeuverType).forEach(type => {
      maneuverMap[type] = {
        type: type as ManeuverType,
        total: 0,
        byPerformance: {
          satisfactory: 0,
          needsImprovement: 0,
          unsatisfactory: 0
        }
      };
    });
    
    // Count maneuvers
    filteredEntries.forEach(entry => {
      entry.maneuvers.forEach(maneuver => {
        maneuverMap[maneuver.type].total += maneuver.count || 0;
        
        if (maneuver.performance) {
          const performanceKey = maneuver.performance === 'needs_improvement' 
            ? 'needsImprovement' 
            : maneuver.performance as 'satisfactory' | 'unsatisfactory';
          
          maneuverMap[maneuver.type].byPerformance[performanceKey] += maneuver.count || 0;
        }
      });
    });
    
    // Convert to array and sort by total
    return Object.values(maneuverMap)
      .filter(m => m.total > 0)
      .sort((a, b) => b.total - a.total);
  };
  
  const hoursBreakdown = calculateHoursBreakdown();
  const maneuverBreakdown = calculateManeuverBreakdown();
  
  // Format label from enum
  const formatLabel = (value: string): string => {
    return value
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  // Format number with 1 decimal place
  const formatNumber = (value: number): string => {
    return value.toFixed(1);
  };

  return (
    <div className="flight-log-summary">
      <div className="mb-4">
        <h3 className="text-lg font-medium">Flight Time Summary</h3>
        <p className="text-sm text-gray-500">
          Based on {filteredEntries.length} flight{filteredEntries.length !== 1 ? 's' : ''}
          {startDate && endDate && ` from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`}
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card>
          <h4 className="text-base font-medium mb-3">Flight Hours</h4>
          
          <div className="space-y-2">
            <div className="flex justify-between p-2 bg-blue-50 rounded">
              <span className="font-medium">Total Flight Time</span>
              <span className="font-bold">{formatNumber(hoursBreakdown.total)} hours</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span>PIC Time</span>
                <span>{formatNumber(hoursBreakdown.pic)}</span>
              </div>
              
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span>SIC Time</span>
                <span>{formatNumber(hoursBreakdown.sic)}</span>
              </div>
              
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span>Solo Time</span>
                <span>{formatNumber(hoursBreakdown.solo)}</span>
              </div>
              
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span>Dual Received</span>
                <span>{formatNumber(hoursBreakdown.dual)}</span>
              </div>
              
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span>Instruction Given</span>
                <span>{formatNumber(hoursBreakdown.instructionGiven)}</span>
              </div>
              
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span>Night</span>
                <span>{formatNumber(hoursBreakdown.night)}</span>
              </div>
              
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span>IFR</span>
                <span>{formatNumber(hoursBreakdown.ifr)}</span>
              </div>
              
              <div className="flex justify-between p-2 bg-gray-50 rounded">
                <span>Cross Country</span>
                <span>{formatNumber(hoursBreakdown.crossCountry)}</span>
              </div>
            </div>
          </div>
        </Card>
        
        <Card>
          <h4 className="text-base font-medium mb-3">Aircraft Categories</h4>
          
          <div className="space-y-2">
            {Object.entries(hoursBreakdown.byCategory)
              .filter(([_, hours]) => hours > 0)
              .sort(([_, hoursA], [__, hoursB]) => hoursB - hoursA)
              .map(([category, hours]) => (
                <div key={category} className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>{formatLabel(category)}</span>
                  <span>{formatNumber(hours)}</span>
                </div>
              ))
            }
            
            {Object.values(hoursBreakdown.byCategory).every(hours => hours === 0) && (
              <p className="text-gray-500">No category data available.</p>
            )}
          </div>
        </Card>
      </div>
      
      <div className="mb-6">
        <Card>
          <h4 className="text-base font-medium mb-3">Maneuvers</h4>
          
          {maneuverBreakdown.length > 0 ? (
            <div className="space-y-3">
              {maneuverBreakdown.map(maneuver => (
                <div key={maneuver.type} className="p-3 bg-gray-50 rounded-md">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{formatLabel(maneuver.type)}</span>
                    <span className="text-lg font-bold">{maneuver.total}</span>
                  </div>
                  
                  <div className="mt-2 grid grid-cols-3 gap-1 text-sm">
                    {maneuver.byPerformance.satisfactory > 0 && (
                      <div className="flex justify-between items-center px-2 py-1 bg-green-100 rounded">
                        <span>Satisfactory</span>
                        <span>{maneuver.byPerformance.satisfactory}</span>
                      </div>
                    )}
                    
                    {maneuver.byPerformance.needsImprovement > 0 && (
                      <div className="flex justify-between items-center px-2 py-1 bg-yellow-100 rounded">
                        <span>Needs Improvement</span>
                        <span>{maneuver.byPerformance.needsImprovement}</span>
                      </div>
                    )}
                    
                    {maneuver.byPerformance.unsatisfactory > 0 && (
                      <div className="flex justify-between items-center px-2 py-1 bg-red-100 rounded">
                        <span>Unsatisfactory</span>
                        <span>{maneuver.byPerformance.unsatisfactory}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No maneuver data available.</p>
          )}
        </Card>
      </div>
    </div>
  );
};

// Main Flight Log Manager Component
interface FlightLogManagerProps {
  entries: FlightLogEntry[];
  aircraftTypes: string[];
  isInstructor: boolean;
  userId: string;
  onCreateEntry: (entry: Partial<FlightLogEntry>) => Promise<void>;
  onUpdateEntry: (id: string, entry: Partial<FlightLogEntry>) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
  onEndorseEntry?: (id: string, instructorName: string) => Promise<void>;
  onExportLogs: (format: 'pdf' | 'csv', dateRange?: { start: Date; end: Date }) => Promise<void>;
}

export const FlightLogManager: React.FC<FlightLogManagerProps> = ({
  entries,
  aircraftTypes,
  isInstructor,
  userId,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
  onEndorseEntry,
  onExportLogs
}) => {
  const [activeTab, setActiveTab] = useState<'entries' | 'summary' | 'add'>('entries');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isEditingEntry, setIsEditingEntry] = useState(false);
  const [isCreatingEntry, setIsCreatingEntry] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    end: new Date()
  });
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  
  // Get selected entry
  const selectedEntry = selectedEntryId ? entries.find(e => e.id === selectedEntryId) : null;
  
  // Handle save entry
  const handleSaveEntry = async (entryData: Partial<FlightLogEntry>) => {
    setIsLoading(true);
    
    try {
      if (isEditingEntry && selectedEntryId) {
        await onUpdateEntry(selectedEntryId, entryData);
        setAlertMessage({
          type: 'success',
          message: 'Flight log entry updated successfully.'
        });
        setIsEditingEntry(false);
      } else {
        await onCreateEntry(entryData);
        setAlertMessage({
          type: 'success',
          message: 'Flight log entry created successfully.'
        });
        setIsCreatingEntry(false);
      }
      setActiveTab('entries');
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Error saving flight log entry: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle delete entry
  const handleDeleteEntry = async (id: string) => {
    setIsLoading(true);
    
    try {
      await onDeleteEntry(id);
      setAlertMessage({
        type: 'success',
        message: 'Flight log entry deleted successfully.'
      });
      setSelectedEntryId(null);
      setDeleteConfirmationId(null);
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Error deleting flight log entry: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle endorse entry
  const handleEndorseEntry = async (instructorName: string) => {
    if (!selectedEntryId || !onEndorseEntry) return;
    
    setIsLoading(true);
    
    try {
      await onEndorseEntry(selectedEntryId, instructorName);
      setAlertMessage({
        type: 'success',
        message: 'Flight log entry endorsed successfully.'
      });
      
      // Refresh the selected entry
      const updatedEntry = entries.find(e => e.id === selectedEntryId);
      if (updatedEntry) {
        setSelectedEntryId(updatedEntry.id);
      }
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Error endorsing flight log entry: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle export logs
  const handleExportLogs = async (format: 'pdf' | 'csv') => {
    try {
      await onExportLogs(format, dateRange);
      setAlertMessage({
        type: 'success',
        message: `Flight logs exported as ${format.toUpperCase()} successfully.`
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Error exporting flight logs: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };
  
  // Define table columns
  const columns: Column<FlightLogEntry>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (entry) => new Date(entry.date).toLocaleDateString(),
      sortable: true
    },
    {
      key: 'route',
      header: 'Route',
      render: (entry) => (
        <div>
          <div className="font-medium">{entry.departureAirport} → {entry.arrivalAirport}</div>
          {entry.route && <div className="text-xs text-gray-500">{entry.route}</div>}
        </div>
      ),
      sortable: true
    },
    {
      key: 'aircraft',
      header: 'Aircraft',
      render: (entry) => (
        <div>
          <div>{entry.aircraftType}</div>
          <div className="text-xs text-gray-500">{entry.aircraftRegistration}</div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'time',
      header: 'Time',
      render: (entry) => `${entry.totalFlightTime.toFixed(1)} hrs`,
      sortable: true
    },
    {
      key: 'conditions',
      header: 'Conditions',
      render: (entry) => (
        <div className="flex flex-wrap gap-1">
          {entry.conditions.slice(0, 3).map((condition) => (
            <span 
              key={condition}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {condition.toUpperCase()}
            </span>
          ))}
          {entry.conditions.length > 3 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              +{entry.conditions.length - 3}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'endorsement',
      header: 'Status',
      render: (entry) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          entry.isEndorsed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {entry.isEndorsed ? 'Endorsed' : 'Pending'}
        </span>
      ),
      sortable: true
    }
  ];
  
  // Define tabs
  const tabs: Tab[] = [
    {
      id: 'entries',
      label: 'Flight Entries',
      content: (
        <div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
            <div className="flex space-x-2">
              <Button
                variant="primary"
                onClick={() => {
                  setIsCreatingEntry(true);
                  setActiveTab('add');
                }}
              >
                Add Flight
              </Button>
              
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => {/* Toggle dropdown */}}
                >
                  Export
                </Button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10">
                  <button
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    onClick={() => handleExportLogs('pdf')}
                  >
                    Export as PDF
                  </button>
                  <button
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                    onClick={() => handleExportLogs('csv')}
                  >
                    Export as CSV
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <div>
                <label htmlFor="startDate" className="block text-xs font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  value={dateRange.start.toISOString().split('T')[0]}
                  onChange={(e) => setDateRange({ ...dateRange, start: new Date(e.target.value) })}
                />
              </div>
              
              <div>
                <label htmlFor="endDate" className="block text-xs font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  value={dateRange.end.toISOString().split('T')[0]}
                  onChange={(e) => setDateRange({ ...dateRange, end: new Date(e.target.value) })}
                />
              </div>
            </div>
          </div>
          
          {entries.length > 0 ? (
            <DataTable
              columns={columns}
              data={entries.filter(entry => {
                const entryDate = new Date(entry.date);
                return entryDate >= dateRange.start && entryDate <= dateRange.end;
              })}
              keyExtractor={(entry) => entry.id}
              onRowClick={(entry) => setSelectedEntryId(entry.id)}
              pagination={{
                pageSize: 10,
                totalItems: entries.length,
                currentPage: 1,
                onPageChange: () => {}
              }}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No flight log entries found.</p>
              <Button
                variant="primary"
                className="mt-4"
                onClick={() => {
                  setIsCreatingEntry(true);
                  setActiveTab('add');
                }}
              >
                Add Your First Flight
              </Button>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'summary',
      label: 'Flight Summary',
      content: (
        <FlightLogSummary 
          entries={entries}
          startDate={dateRange.start}
          endDate={dateRange.end}
        />
      )
    },
    {
      id: 'add',
      label: isEditingEntry ? 'Edit Flight' : 'Add Flight',
      content: (
        <FlightLogEntryForm
          entry={isEditingEntry && selectedEntry ? selectedEntry : undefined}
          onSave={handleSaveEntry}
          onCancel={() => {
            setIsCreatingEntry(false);
            setIsEditingEntry(false);
            setActiveTab('entries');
          }}
          aircraftTypes={aircraftTypes}
          isLoading={isLoading}
        />
      )
    }
  ];

  return (
    <div className="flight-log-manager">
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}
      
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Flight Logbook</h1>
        <p className="text-gray-500">Track and manage your flight hours and training progress</p>
      </div>
      
      {selectedEntry && !isEditingEntry ? (
        <Card className="mb-6">
          <FlightLogEntryDetail
            entry={selectedEntry}
            onEdit={() => {
              setIsEditingEntry(true);
              setActiveTab('add');
            }}
            onClose={() => setSelectedEntryId(null)}
            onDelete={() => setDeleteConfirmationId(selectedEntry.id)}
            onEndorse={onEndorseEntry ? handleEndorseEntry : undefined}
            isInstructor={isInstructor}
          />
        </Card>
      ) : (
        <Tabs
          tabs={tabs}
          defaultTabId="entries"
          onChange={(id) => {
            if (id === 'add' && !isCreatingEntry && !isEditingEntry) {
              setIsCreatingEntry(true);
            }
            setActiveTab(id as 'entries' | 'summary' | 'add');
          }}
        />
      )}
      
      {/* Delete confirmation modal */}
      {deleteConfirmationId && (
        <Modal
          isOpen={!!deleteConfirmationId}
          onClose={() => setDeleteConfirmationId(null)}
          title="Confirm Delete"
          size="sm"
        >
          <div className="space-y-4">
            <p>Are you sure you want to delete this flight log entry? This action cannot be undone.</p>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmationId(null)}
              >
                Cancel
              </Button>
              
              <Button
                variant="danger"
                onClick={() => handleDeleteEntry(deleteConfirmationId)}
                isLoading={isLoading}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
