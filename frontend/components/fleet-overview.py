// components/analytics/FleetOverview.tsx
import React from 'react';
import { FleetStatistics } from '../../services/analyticsService';

interface FleetOverviewProps {
  stats: FleetStatistics;
}

const FleetOverview: React.FC<FleetOverviewProps> = ({ stats }) => {
  // Format a number as a percentage
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Format a number as a currency value
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        {/* Total Trainees */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-medium text-gray-500 mb-1">Total Trainees</p>
          <p className="text-lg font-semibold text-gray-800">{stats.totalTrainees}</p>
        </div>
        
        {/* Active Trainees */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-medium text-gray-500 mb-1">Active</p>
          <p className="text-lg font-semibold text-gray-800">
            {stats.activeTrainees} 
            <span className="text-xs font-normal text-gray-500 ml-1">
              ({((stats.activeTrainees / stats.totalTrainees) * 100).toFixed(0)}%)
            </span>
          </p>
        </div>
        
        {/* Average Completion Rate */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-medium text-gray-500 mb-1">Avg. Completion</p>
          <p className="text-lg font-semibold text-gray-800">{formatPercent(stats.averageCompletionRate)}</p>
        </div>
        
        {/* Average Rating */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-medium text-gray-500 mb-1">Avg. Rating</p>
          <p className="text-lg font-semibold text-gray-800">{stats.averageRating.toFixed(1)}/4.0</p>
        </div>
      </div>
      
      {/* Training hours and cost metrics */}
      <div className="mt-4">
        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Total Training Hours</p>
            <p className="text-lg font-semibold text-gray-800">{stats.trainingHours.toLocaleString()} hrs</p>
          </div>
          
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">Cost Per Hour</p>
            <p className="text-lg font-semibold text-gray-800">{formatCurrency(stats.costPerHour)}</p>
          </div>
          
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-600">Total Cost</p>
              <p className="text-lg font-semibold text-blue-600">
                {formatCurrency(stats.trainingHours * stats.costPerHour)}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Efficiency ratio indicator */}
      <div className="mt-4">
        <p className="text-xs font-medium text-gray-500 mb-1">Training Efficiency</p>
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-blue-600 bg-blue-100">
                {calculateEfficiency(stats)}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
            <div 
              style={{ width: `${calculateEfficiency(stats)}%` }} 
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500"
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Low</span>
            <span>Average</span>
            <span>Optimal</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Calculate training efficiency metric based on completion rate and average rating
// This is an example calculation - adjust according to actual business logic
function calculateEfficiency(stats: FleetStatistics): number {
  // Example formula: (completion rate * average rating relative to max rating) * 100
  // Assumes max rating is 4.0
  const maxRating = 4.0;
  return Math.min(100, Math.round((stats.averageCompletionRate / 100) * (stats.averageRating / maxRating) * 100));
}

export default FleetOverview;
