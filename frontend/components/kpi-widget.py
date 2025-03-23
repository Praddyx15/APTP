// components/analytics/KPIWidget.tsx
import React from 'react';
import { KpiMetric } from '../../services/analyticsService';

interface KPIWidgetProps {
  kpi: KpiMetric;
}

const KPIWidget: React.FC<KPIWidgetProps> = ({ kpi }) => {
  // Calculate change percentage and determine if it's positive or negative
  const changePercent = kpi.previousValue 
    ? ((kpi.value - kpi.previousValue) / kpi.previousValue) * 100 
    : 0;
  
  const isPositive = kpi.trend === 'up' || changePercent > 0;
  const isNegative = kpi.trend === 'down' || changePercent < 0;
  const isNeutral = kpi.trend === 'stable' || changePercent === 0;
  
  // Determine which icon to show based on trend
  const renderTrendIcon = () => {
    if (isPositive) {
      return (
        <span className="text-green-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
          </svg>
        </span>
      );
    } else if (isNegative) {
      return (
        <span className="text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1v-5a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586l-4.293-4.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
          </svg>
        </span>
      );
    } else {
      return (
        <span className="text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        </span>
      );
    }
  };

  // Format the value based on unit
  const formatValue = (value: number, unit?: string) => {
    if (unit === '%') {
      return `${value.toFixed(1)}%`;
    } else if (unit === 'hours') {
      return `${value.toFixed(0)}h`;
    } else if (unit === 'currency') {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return value.toLocaleString(undefined, { 
        minimumFractionDigits: value % 1 === 0 ? 0 : 1,
        maximumFractionDigits: 1
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 transition-all hover:shadow-lg">
      <div className="flex justify-between items-start">
        <h3 className="text-sm font-medium text-gray-500">{kpi.name}</h3>
        {renderTrendIcon()}
      </div>
      
      <div className="mt-2 flex items-baseline">
        <p className="text-2xl font-semibold text-gray-900">
          {formatValue(kpi.value, kpi.unit)}
        </p>
        
        {kpi.previousValue !== undefined && (
          <p className={`ml-2 text-sm font-medium ${
            isPositive ? 'text-green-600' : 
            isNegative ? 'text-red-600' : 
            'text-gray-500'
          }`}>
            {isPositive && '+'}
            {changePercent.toFixed(1)}%
          </p>
        )}
      </div>
      
      {kpi.target !== undefined && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Progress</span>
            <span>{Math.min(100, (kpi.value / kpi.target) * 100).toFixed(0)}%</span>
          </div>
          <div className="mt-1 relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="absolute h-full bg-blue-500 rounded-full"
              style={{ width: `${Math.min(100, (kpi.value / kpi.target) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default KPIWidget;
