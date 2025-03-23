// src/frontend/components/visualization/DataVisualization.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

// Import visualization components from Recharts
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

// Types
export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

export interface MultiSeriesChartDataPoint {
  name: string;
  [key: string]: any;
}

export interface PieChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface RadarChartDataPoint {
  subject: string;
  value: number;
  fullMark?: number;
}

export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'radar' | 'stacked-bar' | 'composed';

// Color palette for charts
const COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#F97316'  // orange-500
];

// Helper function to get color for a series
const getColor = (index: number): string => {
  return COLORS[index % COLORS.length];
};

// Base Chart Component
interface BaseChartProps {
  title?: string;
  description?: string;
  height?: number;
  children: React.ReactNode;
  legend?: boolean;
  grid?: boolean;
}

export const BaseChart: React.FC<BaseChartProps> = ({
  title,
  description,
  height = 300,
  children,
  legend = true,
  grid = true
}) => {
  return (
    <Card>
      {(title || description) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-medium">{title}</h3>}
          {description && <p className="text-sm text-gray-500">{description}</p>}
        </div>
      )}
      <div style={{ width: '100%', height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// Line Chart Component
interface LineChartProps {
  data: MultiSeriesChartDataPoint[];
  series: string[];
  xAxisKey?: string;
  title?: string;
  description?: string;
  height?: number;
  grid?: boolean;
  legend?: boolean;
  tooltipFormatter?: (value: any, name: string) => [string, string];
  onClick?: (data: any) => void;
  colors?: string[];
}

export const LineChartComponent: React.FC<LineChartProps> = ({
  data,
  series,
  xAxisKey = 'name',
  title,
  description,
  height = 300,
  grid = true,
  legend = true,
  tooltipFormatter,
  onClick,
  colors
}) => {
  return (
    <BaseChart title={title} description={description} height={height} legend={legend} grid={grid}>
      <LineChart
        data={data}
        onClick={onClick}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        {grid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis dataKey={xAxisKey} />
        <YAxis />
        <Tooltip formatter={tooltipFormatter} />
        {legend && <Legend />}
        {series.map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors ? colors[index % colors.length] : getColor(index)}
            activeDot={{ r: 8 }}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </BaseChart>
  );
};

// Bar Chart Component
interface BarChartProps {
  data: MultiSeriesChartDataPoint[];
  series: string[];
  xAxisKey?: string;
  title?: string;
  description?: string;
  height?: number;
  grid?: boolean;
  legend?: boolean;
  stacked?: boolean;
  tooltipFormatter?: (value: any, name: string) => [string, string];
  onClick?: (data: any) => void;
  colors?: string[];
}

export const BarChartComponent: React.FC<BarChartProps> = ({
  data,
  series,
  xAxisKey = 'name',
  title,
  description,
  height = 300,
  grid = true,
  legend = true,
  stacked = false,
  tooltipFormatter,
  onClick,
  colors
}) => {
  return (
    <BaseChart title={title} description={description} height={height} legend={legend} grid={grid}>
      <BarChart
        data={data}
        onClick={onClick}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        {grid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis dataKey={xAxisKey} />
        <YAxis />
        <Tooltip formatter={tooltipFormatter} />
        {legend && <Legend />}
        {series.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={colors ? colors[index % colors.length] : getColor(index)}
            stackId={stacked ? 'stack' : undefined}
          />
        ))}
      </BarChart>
    </BaseChart>
  );
};

// Pie Chart Component
interface PieChartProps {
  data: PieChartDataPoint[];
  title?: string;
  description?: string;
  height?: number;
  legend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  tooltipFormatter?: (value: any, name: string) => [string, string];
  onClick?: (data: any) => void;
  colors?: string[];
}

export const PieChartComponent: React.FC<PieChartProps> = ({
  data,
  title,
  description,
  height = 300,
  legend = true,
  innerRadius = 0,
  outerRadius = 80,
  tooltipFormatter,
  onClick,
  colors
}) => {
  return (
    <BaseChart title={title} description={description} height={height} legend={legend}>
      <PieChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          fill="#8884d8"
          dataKey="value"
          onClick={onClick}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color || (colors ? colors[index % colors.length] : getColor(index))} 
            />
          ))}
        </Pie>
        <Tooltip formatter={tooltipFormatter} />
        {legend && <Legend />}
      </PieChart>
    </BaseChart>
  );
};

// Area Chart Component
interface AreaChartProps {
  data: MultiSeriesChartDataPoint[];
  series: string[];
  xAxisKey?: string;
  title?: string;
  description?: string;
  height?: number;
  grid?: boolean;
  legend?: boolean;
  stacked?: boolean;
  tooltipFormatter?: (value: any, name: string) => [string, string];
  onClick?: (data: any) => void;
  colors?: string[];
}

export const AreaChartComponent: React.FC<AreaChartProps> = ({
  data,
  series,
  xAxisKey = 'name',
  title,
  description,
  height = 300,
  grid = true,
  legend = true,
  stacked = true,
  tooltipFormatter,
  onClick,
  colors
}) => {
  return (
    <BaseChart title={title} description={description} height={height} legend={legend} grid={grid}>
      <AreaChart
        data={data}
        onClick={onClick}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        {grid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis dataKey={xAxisKey} />
        <YAxis />
        <Tooltip formatter={tooltipFormatter} />
        {legend && <Legend />}
        {series.map((key, index) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stackId={stacked ? "1" : `stack-${index}`}
            stroke={colors ? colors[index % colors.length] : getColor(index)}
            fill={colors ? colors[index % colors.length] : getColor(index)}
            fillOpacity={0.6}
          />
        ))}
      </AreaChart>
    </BaseChart>
  );
};

// Radar Chart Component
interface RadarChartProps {
  data: RadarChartDataPoint[];
  series: string[];
  title?: string;
  description?: string;
  height?: number;
  legend?: boolean;
  tooltipFormatter?: (value: any, name: string) => [string, string];
  onClick?: (data: any) => void;
  colors?: string[];
}

export const RadarChartComponent: React.FC<RadarChartProps> = ({
  data,
  series,
  title,
  description,
  height = 300,
  legend = true,
  tooltipFormatter,
  onClick,
  colors
}) => {
  return (
    <BaseChart title={title} description={description} height={height} legend={legend}>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data} onClick={onClick}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" />
        <PolarRadiusAxis />
        <Tooltip formatter={tooltipFormatter} />
        {legend && <Legend />}
        {series.map((key, index) => (
          <Radar
            key={key}
            name={key}
            dataKey={key}
            stroke={colors ? colors[index % colors.length] : getColor(index)}
            fill={colors ? colors[index % colors.length] : getColor(index)}
            fillOpacity={0.6}
          />
        ))}
      </RadarChart>
    </BaseChart>
  );
};

// Custom Tooltip Components
interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: any, name: string) => [string, string];
  valuePrefix?: string;
  valueSuffix?: string;
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  formatter,
  valuePrefix = '',
  valueSuffix = ''
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="bg-white shadow-md rounded-md p-3 border border-gray-200">
      <p className="font-medium text-gray-900">{label}</p>
      <div className="mt-2">
        {payload.map((entry, index) => {
          let displayValue = entry.value;
          let displayName = entry.name;
          
          if (formatter) {
            [displayValue, displayName] = formatter(entry.value, entry.name);
          }
          
          return (
            <div key={`item-${index}`} className="flex items-center mb-1">
              <div 
                className="w-3 h-3 mr-2 rounded-full" 
                style={{ backgroundColor: entry.color }}
              ></div>
              <span className="text-sm text-gray-600">
                {displayName}: {valuePrefix}{displayValue}{valueSuffix}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Performance Dashboard Components
interface PerformanceMetric {
  name: string;
  value: number;
  progress?: number;
  target?: number;
  trend?: 'up' | 'down' | 'neutral';
  previousValue?: number;
  unit?: string;
  color?: string;
}

interface PerformanceCardProps {
  metric: PerformanceMetric;
  onClick?: () => void;
}

export const PerformanceCard: React.FC<PerformanceCardProps> = ({ metric, onClick }) => {
  const getTrendIcon = () => {
    if (!metric.trend) return null;
    
    switch (metric.trend) {
      case 'up':
        return (
          <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12"></path>
          </svg>
        );
      case 'down':
        return (
          <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"></path>
          </svg>
        );
      case 'neutral':
        return (
          <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14"></path>
          </svg>
        );
      default:
        return null;
    }
  };
  
  const getProgressColor = () => {
    if (!metric.progress) return 'bg-blue-500';
    
    if (metric.progress >= 100) return 'bg-green-500';
    if (metric.progress >= 70) return 'bg-blue-500';
    if (metric.progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
      <div className="flex items-center">
        {metric.color && (
          <div className="w-2 h-16 rounded-full mr-4" style={{ backgroundColor: metric.color }}></div>
        )}
        <div className="flex-grow">
          <p className="text-sm text-gray-500">{metric.name}</p>
          <div className="flex items-center">
            <span className="text-2xl font-semibold">
              {metric.value}{metric.unit}
            </span>
            {metric.previousValue !== undefined && (
              <div className="flex items-center ml-2">
                {getTrendIcon()}
                <span className={`text-sm ${
                  metric.trend === 'up' ? 'text-green-500' :
                  metric.trend === 'down' ? 'text-red-500' :
                  'text-gray-500'
                }`}>
                  {Math.abs(metric.value - metric.previousValue).toFixed(1)}{metric.unit}
                </span>
              </div>
            )}
          </div>
          
          {metric.progress !== undefined && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{metric.progress}%</span>
                {metric.target && <span>Target: {metric.target}{metric.unit}</span>}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getProgressColor()}`}
                  style={{ width: `${Math.min(100, metric.progress)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

// Metrics Dashboard
interface MetricsDashboardProps {
  metrics: PerformanceMetric[];
  lineChartData?: MultiSeriesChartDataPoint[];
  lineChartSeries?: string[];
  barChartData?: MultiSeriesChartDataPoint[];
  barChartSeries?: string[];
  pieChartData?: PieChartDataPoint[];
  onMetricClick?: (metric: PerformanceMetric) => void;
  onExportPDF?: () => void;
  onExportCSV?: () => void;
  title?: string;
  description?: string;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({
  metrics,
  lineChartData,
  lineChartSeries,
  barChartData,
  barChartSeries,
  pieChartData,
  onMetricClick,
  onExportPDF,
  onExportCSV,
  title = 'Performance Metrics',
  description
}) => {
  return (
    <div className="metrics-dashboard">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {description && <p className="text-gray-500">{description}</p>}
        </div>
        
        <div className="flex space-x-2 mt-2 sm:mt-0">
          {onExportPDF && (
            <Button variant="outline" size="small" onClick={onExportPDF}>
              Export PDF
            </Button>
          )}
          {onExportCSV && (
            <Button variant="outline" size="small" onClick={onExportCSV}>
              Export CSV
            </Button>
          )}
        </div>
      </div>
      
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((metric, index) => (
          <PerformanceCard
            key={index}
            metric={metric}
            onClick={() => onMetricClick && onMetricClick(metric)}
          />
        ))}
      </div>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {lineChartData && lineChartSeries && (
          <LineChartComponent
            data={lineChartData}
            series={lineChartSeries}
            title="Trends Over Time"
            height={300}
          />
        )}
        
        {barChartData && barChartSeries && (
          <BarChartComponent
            data={barChartData}
            series={barChartSeries}
            title="Comparison"
            height={300}
          />
        )}
        
        {pieChartData && (
          <PieChartComponent
            data={pieChartData}
            title="Distribution"
            height={300}
          />
        )}
      </div>
    </div>
  );
};

// Performance Comparison Component
interface PerformanceComparisonProps {
  traineeData: {
    id: string;
    name: string;
    metrics: Record<string, number>;
    color?: string;
  }[];
  metricLabels: Record<string, string>;
  metricDescriptions?: Record<string, string>;
  benchmarkData?: Record<string, number>;
  title?: string;
  description?: string;
  onTraineeSelect?: (traineeId: string) => void;
}

export const PerformanceComparison: React.FC<PerformanceComparisonProps> = ({
  traineeData,
  metricLabels,
  metricDescriptions = {},
  benchmarkData,
  title = 'Performance Comparison',
  description,
  onTraineeSelect
}) => {
  const [selectedMetric, setSelectedMetric] = useState<string>(Object.keys(metricLabels)[0]);
  const [selectedTrainees, setSelectedTrainees] = useState<string[]>(traineeData.map(t => t.id));
  
  // Format data for bar chart
  const getBarChartData = () => {
    return [
      {
        name: metricLabels[selectedMetric],
        ...selectedTrainees.reduce((acc, traineeId) => {
          const trainee = traineeData.find(t => t.id === traineeId);
          if (trainee) {
            acc[trainee.name] = trainee.metrics[selectedMetric];
          }
          return acc;
        }, {} as Record<string, number>),
        ...(benchmarkData ? { Benchmark: benchmarkData[selectedMetric] } : {})
      }
    ];
  };
  
  // Format data for radar chart
  const getRadarChartData = () => {
    return Object.keys(metricLabels).map(metric => ({
      subject: metricLabels[metric],
      ...selectedTrainees.reduce((acc, traineeId) => {
        const trainee = traineeData.find(t => t.id === traineeId);
        if (trainee) {
          acc[trainee.name] = trainee.metrics[metric];
        }
        return acc;
      }, {} as Record<string, number>),
      ...(benchmarkData ? { Benchmark: benchmarkData[metric] } : {})
    }));
  };
  
  // Get series for bar chart
  const getBarChartSeries = () => {
    const series = selectedTrainees.map(traineeId => {
      const trainee = traineeData.find(t => t.id === traineeId);
      return trainee ? trainee.name : '';
    }).filter(Boolean);
    
    if (benchmarkData) {
      series.push('Benchmark');
    }
    
    return series;
  };
  
  // Get series for radar chart
  const getRadarChartSeries = () => {
    const series = selectedTrainees.map(traineeId => {
      const trainee = traineeData.find(t => t.id === traineeId);
      return trainee ? trainee.name : '';
    }).filter(Boolean);
    
    if (benchmarkData) {
      series.push('Benchmark');
    }
    
    return series;
  };
  
  // Get colors for charts
  const getChartColors = () => {
    const colors = selectedTrainees.map(traineeId => {
      const trainee = traineeData.find(t => t.id === traineeId);
      return trainee?.color || '';
    }).filter(Boolean);
    
    if (benchmarkData) {
      colors.push('#64748B'); // slate-500 for benchmark
    }
    
    return colors.length > 0 ? colors : undefined;
  };
  
  // Handle trainee selection
  const handleTraineeToggle = (traineeId: string) => {
    setSelectedTrainees(prev => {
      if (prev.includes(traineeId)) {
        return prev.filter(id => id !== traineeId);
      } else {
        return [...prev, traineeId];
      }
    });
  };
  
  return (
    <div className="performance-comparison">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {description && <p className="text-gray-500">{description}</p>}
        </div>
      </div>
      
      <Card className="mb-6">
        <div className="mb-4">
          <h3 className="text-lg font-medium">Select Trainees to Compare</h3>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {traineeData.map(trainee => (
            <div
              key={trainee.id}
              className={`
                px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors
                ${selectedTrainees.includes(trainee.id)
                  ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                  : 'bg-gray-100 text-gray-800 border-2 border-transparent hover:bg-gray-200'
                }
              `}
              onClick={() => handleTraineeToggle(trainee.id)}
            >
              {trainee.name}
            </div>
          ))}
        </div>
      </Card>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-medium">Metric Comparison</h3>
            <p className="text-sm text-gray-500">Compare performance on specific metrics</p>
          </div>
          
          <div className="mb-4">
            <label htmlFor="metric-select" className="block text-sm font-medium text-gray-700">
              Select Metric
            </label>
            <select
              id="metric-select"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
            >
              {Object.entries(metricLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            
            {metricDescriptions[selectedMetric] && (
              <p className="mt-1 text-sm text-gray-500">
                {metricDescriptions[selectedMetric]}
              </p>
            )}
          </div>
          
          {selectedTrainees.length > 0 ? (
            <BarChartComponent
              data={getBarChartData()}
              series={getBarChartSeries()}
              height={300}
              colors={getChartColors()}
            />
          ) : (
            <div className="p-8 text-center text-gray-500">
              Please select at least one trainee to compare.
            </div>
          )}
        </Card>
        
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-medium">Overall Comparison</h3>
            <p className="text-sm text-gray-500">Compare all metrics across trainees</p>
          </div>
          
          {selectedTrainees.length > 0 ? (
            <RadarChartComponent
              data={getRadarChartData()}
              series={getRadarChartSeries()}
              height={300}
              colors={getChartColors()}
            />
          ) : (
            <div className="p-8 text-center text-gray-500">
              Please select at least one trainee to compare.
            </div>
          )}
        </Card>
      </div>
      
      {/* Detail Tables */}
      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-medium">Detailed Metrics</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metric
                </th>
                {selectedTrainees.map(traineeId => {
                  const trainee = traineeData.find(t => t.id === traineeId);
                  return trainee ? (
                    <th key={trainee.id} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {trainee.name}
                    </th>
                  ) : null;
                })}
                {benchmarkData && (
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Benchmark
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(metricLabels).map(([metric, label]) => (
                <tr key={metric} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{label}</div>
                    {metricDescriptions[metric] && (
                      <div className="text-xs text-gray-500">{metricDescriptions[metric]}</div>
                    )}
                  </td>
                  {selectedTrainees.map(traineeId => {
                    const trainee = traineeData.find(t => t.id === traineeId);
                    return trainee ? (
                      <td key={trainee.id} className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{trainee.metrics[metric]}</div>
                      </td>
                    ) : null;
                  })}
                  {benchmarkData && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{benchmarkData[metric]}</div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// Time Series Visualization Component
interface TimeSeriesDataPoint {
  date: string | Date;
  [key: string]: any;
}

interface TimeSeriesVisualizationProps {
  data: TimeSeriesDataPoint[];
  series: string[];
  dateKey?: string;
  title?: string;
  description?: string;
  onTimeRangeChange?: (start: Date, end: Date) => void;
  onExportData?: () => void;
  timeRanges?: { label: string; start: Date; end: Date }[];
  annotations?: { date: string | Date; label: string; color?: string }[];
}

export const TimeSeriesVisualization: React.FC<TimeSeriesVisualizationProps> = ({
  data,
  series,
  dateKey = 'date',
  title = 'Time Series Analysis',
  description,
  onTimeRangeChange,
  onExportData,
  timeRanges = [
    { label: 'Last 7 Days', start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() },
    { label: 'Last 30 Days', start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date() },
    { label: 'Last 90 Days', start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), end: new Date() },
    { label: 'Year to Date', start: new Date(new Date().getFullYear(), 0, 1), end: new Date() }
  ],
  annotations
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>(timeRanges[0].label);
  const [filteredData, setFilteredData] = useState<TimeSeriesDataPoint[]>(data);
  const [selectedSeries, setSelectedSeries] = useState<string[]>(series);
  
  // Apply time range filter
  useEffect(() => {
    const range = timeRanges.find(r => r.label === selectedTimeRange);
    if (range) {
      const filtered = data.filter(item => {
        const itemDate = typeof item[dateKey] === 'string' ? new Date(item[dateKey]) : item[dateKey] as Date;
        return itemDate >= range.start && itemDate <= range.end;
      });
      setFilteredData(filtered);
      
      if (onTimeRangeChange) {
        onTimeRangeChange(range.start, range.end);
      }
    }
  }, [selectedTimeRange, data, dateKey, timeRanges, onTimeRangeChange]);
  
  // Handle series toggle
  const handleSeriesToggle = (seriesName: string) => {
    setSelectedSeries(prev => {
      if (prev.includes(seriesName)) {
        return prev.filter(name => name !== seriesName);
      } else {
        return [...prev, seriesName];
      }
    });
  };
  
  return (
    <div className="time-series-visualization">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          {description && <p className="text-gray-500">{description}</p>}
        </div>
        
        {onExportData && (
          <Button variant="outline" size="small" onClick={onExportData}>
            Export Data
          </Button>
        )}
      </div>
      
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium">Time Series Data</h3>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
            {timeRanges.map((range) => (
              <button
                key={range.label}
                className={`px-3 py-1 text-sm rounded-md ${
                  selectedTimeRange === range.label
                    ? 'bg-blue-100 text-blue-800 font-medium'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
                onClick={() => setSelectedTimeRange(range.label)}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {series.map(seriesName => (
              <div
                key={seriesName}
                className={`
                  flex items-center px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors
                  ${selectedSeries.includes(seriesName)
                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-800 border-2 border-transparent hover:bg-gray-200'
                  }
                `}
                onClick={() => handleSeriesToggle(seriesName)}
              >
                <div 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: getColor(series.indexOf(seriesName)) }}
                ></div>
                {seriesName}
              </div>
            ))}
          </div>
        </div>
        
        <LineChartComponent
          data={filteredData}
          series={selectedSeries}
          xAxisKey={dateKey}
          height={400}
        />
      </Card>
      
      {/* Detail Table */}
      <Card>
        <div className="mb-4">
          <h3 className="text-lg font-medium">Data Table</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                {selectedSeries.map(seriesName => (
                  <th key={seriesName} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {seriesName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {typeof item[dateKey] === 'string' 
                        ? item[dateKey] 
                        : (item[dateKey] as Date).toLocaleDateString()}
                    </div>
                  </td>
                  {selectedSeries.map(seriesName => (
                    <td key={seriesName} className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item[seriesName]}</div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
