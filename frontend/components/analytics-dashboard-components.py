// components/analytics/PerformanceMetricsChart.tsx
import React, { useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  ToggleButtonGroup, 
  ToggleButton,
  CircularProgress,
  Tooltip 
} from '@mui/material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { Info } from '@mui/icons-material';

interface Metric {
  id: string;
  name: string;
  description: string;
  color: string;
  domain?: [number, number];
  format?: (value: number) => string;
}

interface PerformanceData {
  date: string;
  [key: string]: number | string;
}

interface PerformanceMetricsChartProps {
  data: PerformanceData[];
  metrics: Metric[];
  title: string;
  description?: string;
  isLoading?: boolean;
  error?: string;
}

type ChartType = 'line' | 'area' | 'bar';

export const PerformanceMetricsChart: React.FC<PerformanceMetricsChartProps> = ({
  data,
  metrics,
  title,
  description,
  isLoading = false,
  error,
}) => {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(
    metrics.slice(0, 3).map(m => m.id)
  );

  const handleChartTypeChange = (_: React.MouseEvent<HTMLElement>, newType: ChartType | null) => {
    if (newType !== null) {
      setChartType(newType);
    }
  };

  const handleMetricToggle = (metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId)
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  const formatYAxis = (value: number) => {
    // Determine if we need special formatting based on selected metrics
    const selectedMetricsDetails = metrics.filter(m => selectedMetrics.includes(m.id));
    
    // If only one metric is selected and it has a custom formatter, use it
    if (selectedMetricsDetails.length === 1 && selectedMetricsDetails[0].format) {
      return selectedMetricsDetails[0].format!(value);
    }
    
    // Default formatting
    return value.toFixed(1);
  };

  const renderChart = () => {
    if (isLoading) {
      return (
        <Box className="flex justify-center items-center" sx={{ height: 300 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box className="flex justify-center items-center" sx={{ height: 300 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      );
    }

    const filteredMetrics = metrics.filter(m => selectedMetrics.includes(m.id));

    const ChartComponent = 
      chartType === 'line' ? LineChart : 
      chartType === 'area' ? AreaChart : 
      BarChart;

    const DataComponent = 
      chartType === 'line' ? Line : 
      chartType === 'area' ? Area : 
      Bar;

    return (
      <ResponsiveContainer width="100%" height={300}>
        <ChartComponent data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis tickFormatter={formatYAxis} />
          <RechartsTooltip
            formatter={(value: number, name: string) => {
              const metric = metrics.find(m => m.id === name);
              if (metric?.format) {
                return [metric.format(value), metric.name];
              }
              return [value.toFixed(2), name];
            }}
          />
          <Legend />
          {filteredMetrics.map((metric) => (
            <DataComponent
              key={metric.id}
              type="monotone"
              dataKey={metric.id}
              name={metric.name}
              stroke={metric.color}
              fill={metric.color}
              fillOpacity={chartType === 'area' ? 0.3 : 1}
              activeDot={{ r: 8 }}
            />
          ))}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  return (
    <Paper elevation={2} className="overflow-hidden">
      <Box className="p-4 bg-gray-50 border-b flex justify-between items-center">
        <Box className="flex items-center">
          <Typography variant="h6">{title}</Typography>
          {description && (
            <Tooltip title={description}>
              <Info fontSize="small" className="ml-2 text-gray-500" />
            </Tooltip>
          )}
        </Box>
        <ToggleButtonGroup
          value={chartType}
          exclusive
          onChange={handleChartTypeChange}
          size="small"
        >
          <ToggleButton value="line">Line</ToggleButton>
          <ToggleButton value="area">Area</ToggleButton>
          <ToggleButton value="bar">Bar</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      <Box className="p-4">
        <Box className="mb-4 flex flex-wrap gap-2">
          {metrics.map((metric) => (
            <Tooltip key={metric.id} title={metric.description}>
              <Box
                component="span"
                className={`
                  px-3 py-1 rounded-full cursor-pointer border transition-colors
                  ${selectedMetrics.includes(metric.id) 
                    ? 'bg-blue-100 border-blue-300 text-blue-800' 
                    : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'}
                `}
                onClick={() => handleMetricToggle(metric.id)}
              >
                <Box
                  component="span"
                  className="inline-block w-3 h-3 rounded-full mr-2"
                  sx={{ backgroundColor: metric.color }}
                />
                {metric.name}
              </Box>
            </Tooltip>
          ))}
        </Box>
        
        {renderChart()}
      </Box>
    </Paper>
  );
};

// components/analytics/SkillDecayChart.tsx
import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Divider,
  FormControlLabel,
  Switch,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { Info, Warning } from '@mui/icons-material';

interface Skill {
  id: string;
  name: string;
  color: string;
  category: string;
  baseline: number;
  threshold: number;
}

interface SkillDecayData {
  date: string;
  actual: boolean;
  [key: string]: number | string | boolean;
}

interface SkillDecayChartProps {
  data: SkillDecayData[];
  skills: Skill[];
  isLoading?: boolean;
  error?: string;
}

export const SkillDecayChart: React.FC<SkillDecayChartProps> = ({
  data,
  skills,
  isLoading = false,
  error,
}) => {
  const [showPrediction, setShowPrediction] = React.useState(true);
  const [showThresholds, setShowThresholds] = React.useState(true);
  
  // Split data into actual and predicted
  const actualData = data.filter(d => d.actual);
  const allData = showPrediction ? data : actualData;
  
  const today = new Date().toISOString().split('T')[0];
  
  const renderChart = () => {
    if (isLoading) {
      return (
        <Box className="flex justify-center items-center" sx={{ height: 300 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box className="flex justify-center items-center" sx={{ height: 300 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={allData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
          <RechartsTooltip
            formatter={(value: number, name: string) => {
              const skill = skills.find(s => s.id === name);
              return [
                `${value.toFixed(1)}%`, 
                skill?.name || name
              ];
            }}
            labelFormatter={(label) => {
              const dateObj = new Date(label);
              return dateObj.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
            }}
          />
          <Legend />
          
          {/* Reference line for today */}
          <ReferenceLine 
            x={today} 
            stroke="#666" 
            strokeDasharray="3 3" 
            label={{ value: 'Today', position: 'insideTopRight' }} 
          />
          
          {skills.map((skill) => (
            <React.Fragment key={skill.id}>
              <Line
                type="monotone"
                dataKey={skill.id}
                name={skill.name}
                stroke={skill.color}
                strokeWidth={2}
                dot={{ stroke: skill.color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 8 }}
                connectNulls
              />
              
              {/* Prediction area */}
              {showPrediction && (
                <Area
                  type="monotone"
                  dataKey={`${skill.id}_range`}
                  stroke="none"
                  fill={skill.color}
                  fillOpacity={0.1}
                />
              )}
              
              {/* Threshold line */}
              {showThresholds && (
                <ReferenceLine 
                  y={skill.threshold} 
                  stroke={skill.color} 
                  strokeDasharray="3 3" 
                  strokeOpacity={0.5}
                  ifOverflow="extendDomain"
                />
              )}
            </React.Fragment>
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    );
  };
  
  // Find skills that are predicted to fall below threshold
  const atRiskSkills = skills.filter(skill => {
    const futureDataPoints = data.filter(d => !d.actual);
    return futureDataPoints.some(point => 
      (point[skill.id] as number) < skill.threshold
    );
  });

  return (
    <Paper elevation={2} className="overflow-hidden">
      <Box className="p-4 bg-gray-50 border-b">
        <Box className="flex items-center">
          <Typography variant="h6">Skill Decay Prediction</Typography>
          <Tooltip title="Predicts future skill proficiency based on recency, frequency, and assessment scores">
            <Info fontSize="small" className="ml-2 text-gray-500" />
          </Tooltip>
        </Box>
      </Box>
      
      <Box className="p-4">
        <Box className="mb-4 flex flex-wrap justify-between items-center">
          <Box className="flex items-center gap-4">
            <FormControlLabel
              control={
                <Switch
                  checked={showPrediction}
                  onChange={(e) => setShowPrediction(e.target.checked)}
                  color="primary"
                />
              }
              label="Show Prediction"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showThresholds}
                  onChange={(e) => setShowThresholds(e.target.checked)}
                  color="primary"
                />
              }
              label="Show Thresholds"
            />
          </Box>
          
          <Box>
            <Typography variant="caption" color="textSecondary">
              Solid lines show measured data, shaded areas show prediction range
            </Typography>
          </Box>
        </Box>
        
        {renderChart()}
        
        {atRiskSkills.length > 0 && (
          <Box className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded flex items-start">
            <Warning className="text-amber-500 mr-2 mt-0.5" />
            <Box>
              <Typography variant="subtitle2" className="text-amber-800">
                Skill Decay Warning
              </Typography>
              <Typography variant="body2" className="text-amber-700">
                The following skills are predicted to fall below required thresholds in the next 30 days:
                {atRiskSkills.map((skill, index) => (
                  <span key={skill.id} className="font-medium">
                    {index > 0 ? ', ' : ' '}
                    {skill.name}
                  </span>
                ))}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

// components/analytics/CognitiveWorkloadGauge.tsx
import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Divider,
  Grid,
  Tooltip
} from '@mui/material';
import { 
  PieChart, 
  Pie, 
  ResponsiveContainer, 
  Cell,
  Legend
} from 'recharts';
import { Info } from '@mui/icons-material';

interface WorkloadDimension {
  name: string;
  value: number;
  color: string;
  description: string;
}

interface CognitiveWorkloadGaugeProps {
  title: string;
  dimensions: WorkloadDimension[];
  overallWorkload: number; // 0-100
  timestamp: string;
}

export const CognitiveWorkloadGauge: React.FC<CognitiveWorkloadGaugeProps> = ({
  title,
  dimensions,
  overallWorkload,
  timestamp,
}) => {
  // NASA TLX dimensions typically include: Mental Demand, Physical Demand, Temporal Demand, 
  // Performance, Effort, and Frustration

  // Helper function to determine color of overall workload
  const getOverallWorkloadColor = (value: number) => {
    if (value < 33) return '#22c55e'; // Green
    if (value < 66) return '#f59e0b'; // Amber
    return '#ef4444';                 // Red
  };
  
  const formattedTime = new Date(timestamp).toLocaleTimeString();
  
  const overallColor = getOverallWorkloadColor(overallWorkload);
  
  // Data for the gauge chart
  const gaugeData = [
    { name: 'Value', value: overallWorkload },
    { name: 'Empty', value: 100 - overallWorkload }
  ];
  
  return (
    <Paper elevation={2} className="overflow-hidden">
      <Box className="p-4 bg-gray-50 border-b">
        <Box className="flex items-center">
          <Typography variant="h6">{title}</Typography>
          <Tooltip title="Based on NASA Task Load Index (TLX) methodology">
            <Info fontSize="small" className="ml-2 text-gray-500" />
          </Tooltip>
        </Box>
        <Typography variant="caption" color="textSecondary">
          Last updated: {formattedTime}
        </Typography>
      </Box>
      
      <Box className="p-4">
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Box className="flex flex-col items-center">
              <Typography variant="subtitle2" className="mb-2">
                Overall Workload
              </Typography>
              
              <Box className="relative" sx={{ height: 200, width: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gaugeData}
                      cx="50%"
                      cy="50%"
                      startAngle={180}
                      endAngle={0}
                      innerRadius="60%"
                      outerRadius="80%"
                      dataKey="value"
                      cornerRadius={6}
                      paddingAngle={2}
                    >
                      <Cell key="gauge-fill" fill={overallColor} />
                      <Cell key="gauge-empty" fill="#e5e7eb" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                
                <Box 
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 text-center"
                  sx={{ marginTop: '-20px' }}
                >
                  <Typography 
                    variant="h4" 
                    className="font-bold"
                    style={{ color: overallColor }}
                  >
                    {overallWorkload}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    OUT OF 100
                  </Typography>
                </Box>
              </Box>
              
              <Box className="mt-2 text-center">
                <Typography 
                  variant="subtitle1" 
                  className="font-medium"
                  style={{ color: overallColor }}
                >
                  {overallWorkload < 33 ? 'Low' : overallWorkload < 66 ? 'Moderate' : 'High'} Workload
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={7}>
            <Typography variant="subtitle2" className="mb-3">
              Workload Dimensions
            </Typography>
            
            <Box>
              {dimensions.map((dimension) => (
                <Box key={dimension.name} className="mb-3">
                  <Box className="flex justify-between items-center mb-1">
                    <Tooltip title={dimension.description}>
                      <Typography variant="body2">{dimension.name}</Typography>
                    </Tooltip>
                    <Typography variant="body2" fontWeight="medium">
                      {dimension.value}
                    </Typography>
                  </Box>
                  <Box className="w-full h-2 bg-gray-200 rounded-full">
                    <Box 
                      className="h-2 rounded-full" 
                      style={{ 
                        width: `${dimension.value}%`,
                        backgroundColor: dimension.color
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

// components/analytics/ProcedureComplianceHeatmap.tsx
import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip
} from '@mui/material';
import { Info } from '@mui/icons-material';

interface ProcedureStep {
  id: string;
  name: string;
  complianceRate: number; // 0-100
  issues?: string[];
}

interface Procedure {
  id: string;
  name: string;
  steps: ProcedureStep[];
}

interface ProcedureComplianceHeatmapProps {
  procedures: Procedure[];
  title: string;
}

export const ProcedureComplianceHeatmap: React.FC<ProcedureComplianceHeatmapProps> = ({
  procedures,
  title,
}) => {
  const [selectedProcedure, setSelectedProcedure] = React.useState<string>(
    procedures[0]?.id || ''
  );

  const handleProcedureChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSelectedProcedure(event.target.value as string);
  };

  const currentProcedure = procedures.find(p => p.id === selectedProcedure);

  // Helper function to get color based on compliance rate
  const getComplianceColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-100 border-green-300 text-green-800';
    if (rate >= 75) return 'bg-blue-100 border-blue-300 text-blue-800';
    if (rate >= 50) return 'bg-amber-100 border-amber-300 text-amber-800';
    return 'bg-red-100 border-red-300 text-red-800';
  };

  return (
    <Paper elevation={2} className="overflow-hidden">
      <Box className="p-4 bg-gray-50 border-b">
        <Box className="flex items-center">
          <Typography variant="h6">{title}</Typography>
          <Tooltip title="Shows adherence to Standard Operating Procedures (SOPs)">
            <Info fontSize="small" className="ml-2 text-gray-500" />
          </Tooltip>
        </Box>
      </Box>
      
      <Box className="p-4">
        <FormControl fullWidth variant="outlined" size="small" className="mb-4">
          <InputLabel>Select Procedure</InputLabel>
          <Select
            value={selectedProcedure}
            onChange={handleProcedureChange}
            label="Select Procedure"
          >
            {procedures.map((procedure) => (
              <MenuItem key={procedure.id} value={procedure.id}>
                {procedure.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {currentProcedure && (
          <Box>
            <Typography variant="subtitle2" className="mb-2">
              Compliance Heatmap for {currentProcedure.name}
            </Typography>
            
            <Box className="space-y-2">
              {currentProcedure.steps.map((step) => (
                <Tooltip
                  key={step.id}
                  title={
                    step.issues && step.issues.length > 0 
                      ? <Box>
                          <Typography variant="body2" className="font-medium mb-1">Issues:</Typography>
                          <ul className="pl-4 list-disc">
                            {step.issues.map((issue, i) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        </Box>
                      : "No issues detected"
                  }
                >
                  <Box 
                    className={`
                      p-3 rounded border 
                      ${getComplianceColor(step.complianceRate)}
                      cursor-help
                    `}
                  >
                    <Box className="flex justify-between items-center">
                      <Typography variant="body2" className="font-medium">
                        {step.name}
                      </Typography>
                      <Typography variant="body2">
                        {Math.round(step.complianceRate)}%
                      </Typography>
                    </Box>
                    
                    <Box className="w-full h-1.5 bg-gray-200 rounded-full mt-2">
                      <Box 
                        className="h-1.5 rounded-full" 
                        style={{ 
                          width: `${step.complianceRate}%`,
                          backgroundColor: 
                            step.complianceRate >= 90 ? '#22c55e' : 
                            step.complianceRate >= 75 ? '#3b82f6' : 
                            step.complianceRate >= 50 ? '#f59e0b' : 
                            '#ef4444'
                        }}
                      />
                    </Box>
                  </Box>
                </Tooltip>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

// components/analytics/TrainingEffectivenessCard.tsx
import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Divider, 
  Tooltip,
  Avatar,
  Grid,
  Button,
  Chip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Info,
  Person,
  CheckCircle,
  Error as ErrorIcon,
  ArrowForward
} from '@mui/icons-material';

interface EffectivenessMetric {
  name: string;
  value: number;
  change: number;
  target: number;
}

interface RecentIntervention {
  id: string;
  date: string;
  type: string;
  trainee: {
    id: string;
    name: string;
    avatar?: string;
  };
  description: string;
  status: 'completed' | 'pending' | 'in-progress';
}

interface TrainingEffectivenessCardProps {
  title: string;
  metrics: EffectivenessMetric[];
  recentInterventions: RecentIntervention[];
  onViewAllInterventions: () => void;
}

export const TrainingEffectivenessCard: React.FC<TrainingEffectivenessCardProps> = ({
  title,
  metrics,
  recentInterventions,
  onViewAllInterventions
}) => {
  // Helper function to format dates
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper function to get trend icon
  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="text-green-500" />;
    if (change < 0) return <TrendingDown className="text-red-500" />;
    return <TrendingFlat className="text-gray-500" />;
  };

  // Helper function to get metric status
  const getMetricStatus = (value: number, target: number) => {
    const percentage = (value / target) * 100;
    if (percentage >= 100) return 'success';
    if (percentage >= 80) return 'warning';
    return 'error';
  };

  // Helper function to get status chip for interventions
  const getStatusChip = (status: string) => {
    switch(status) {
      case 'completed':
        return <Chip size="small" label="Completed" color="success" />;
      case 'in-progress':
        return <Chip size="small" label="In Progress" color="primary" />;
      default:
        return <Chip size="small" label="Pending" color="default" />;
    }
  };

  return (
    <Paper elevation={2} className="overflow-hidden">
      <Box className="p-4 bg-gray-50 border-b">
        <Box className="flex items-center">
          <Typography variant="h6">{title}</Typography>
          <Tooltip title="Metrics showing the effectiveness of training interventions">
            <Info fontSize="small" className="ml-2 text-gray-500" />
          </Tooltip>
        </Box>
      </Box>
      
      <Box className="p-4">
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" className="mb-3">
              Key Metrics
            </Typography>
            
            <Box className="space-y-4">
              {metrics.map((metric) => {
                const status = getMetricStatus(metric.value, metric.target);
                
                return (
                  <Box key={metric.name} className="p-3 bg-gray-50 rounded-lg">
                    <Box className="flex justify-between items-center mb-1">
                      <Typography variant="body2" color="textSecondary">
                        {metric.name}
                      </Typography>
                      <Box className="flex items-center">
                        {getTrendIcon(metric.change)}
                        <Typography 
                          variant="caption" 
                          className={`ml-1 ${
                            metric.change > 0 ? 'text-green-600' : 
                            metric.change < 0 ? 'text-red-600' : 
                            'text-gray-600'
                          }`}
                        >
                          {metric.change > 0 ? '+' : ''}{metric.change}%
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box className="flex justify-between items-center">
                      <Typography variant="h6" className="font-medium">
                        {metric.value.toFixed(1)}%
                      </Typography>
                      <Box className="flex items-center">
                        <Typography variant="caption" color="textSecondary" className="mr-1">
                          Target: {metric.target}%
                        </Typography>
                        {status === 'success' && (
                          <CheckCircle className="text-green-500" fontSize="small" />
                        )}
                        {status === 'warning' && (
                          <ErrorIcon className="text-amber-500" fontSize="small" />
                        )}
                        {status === 'error' && (
                          <ErrorIcon className="text-red-500" fontSize="small" />
                        )}
                      </Box>
                    </Box>
                    
                    <Box className="w-full h-1.5 bg-gray-200 rounded-full mt-2">
                      <Box 
                        className={`h-1.5 rounded-full ${
                          status === 'success' ? 'bg-green-500' : 
                          status === 'warning' ? 'bg-amber-500' : 
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.min((metric.value / metric.target) * 100, 100)}%` }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Box className="flex justify-between items-center mb-3">
              <Typography variant="subtitle2">
                Recent Interventions
              </Typography>
              <Button 
                size="small" 
                endIcon={<ArrowForward />}
                onClick={onViewAllInterventions}
              >
                View All
              </Button>
            </Box>
            
            <Box className="space-y-3">
              {recentInterventions.map((intervention) => (
                <Paper key={intervention.id} variant="outlined" className="p-3">
                  <Box className="flex justify-between items-start">
                    <Box className="flex">
                      <Avatar 
                        src={intervention.trainee.avatar} 
                        className="mr-3"
                      >
                        {!intervention.trainee.avatar && (
                          <Person />
                        )}
                      </Avatar>
                      
                      <Box>
                        <Typography variant="subtitle2">
                          {intervention.trainee.name}
                        </Typography>
                        <Box className="flex items-center mt-1">
                          <Chip 
                            size="small" 
                            label={intervention.type} 
                            variant="outlined"
                            className="mr-2"
                          />
                          <Typography variant="caption" color="textSecondary">
                            {formatDate(intervention.date)}
                          </Typography>
                        </Box>
                        <Typography variant="body2" className="mt-2">
                          {intervention.description}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box>
                      {getStatusChip(intervention.status)}
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

// app/analytics/page.tsx
'use client';

import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Paper,
  Tabs,
  Tab,
  Button,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import {
  DateRange,
  FilterList,
  Download,
  Assessment
} from '@mui/icons-material';
import { PerformanceMetricsChart } from '@/components/analytics/PerformanceMetricsChart';
import { SkillDecayChart } from '@/components/analytics/SkillDecayChart';
import { CognitiveWorkloadGauge } from '@/components/analytics/CognitiveWorkloadGauge';
import { ProcedureComplianceHeatmap } from '@/components/analytics/ProcedureComplianceHeatmap';
import { TrainingEffectivenessCard } from '@/components/analytics/TrainingEffectivenessCard';

// Mock data
const performanceData = [
  { date: '2023-01', 'reaction-time': 2.3, 'cognitive-load': 65, 'procedure-adherence': 87 },
  { date: '2023-02', 'reaction-time': 2.1, 'cognitive-load': 68, 'procedure-adherence': 85 },
  { date: '2023-03', 'reaction-time': 1.9, 'cognitive-load': 72, 'procedure-adherence': 82 },
  { date: '2023-04', 'reaction-time': 1.7, 'cognitive-load': 75, 'procedure-adherence': 80 },
  { date: '2023-05', 'reaction-time': 1.6, 'cognitive-load': 71, 'procedure-adherence': 83 },
  { date: '2023-06', 'reaction-time': 1.5, 'cognitive-load': 68, 'procedure-adherence': 86 },
  { date: '2023-07', 'reaction-time': 1.4, 'cognitive-load': 65, 'procedure-adherence': 89 },
  { date: '2023-08', 'reaction-time': 1.3, 'cognitive-load': 61, 'procedure-adherence': 92 },
];

const performanceMetrics = [
  { 
    id: 'reaction-time', 
    name: 'Reaction Time',
    description: 'Average time to respond to critical events (seconds)',
    color: '#3b82f6',
    format: (value: number) => `${value.toFixed(1)}s`,
  },
  { 
    id: 'cognitive-load', 
    name: 'Cognitive Load',
    description: 'Average mental workload based on NASA TLX methodology (0-100)',
    color: '#f59e0b',
    format: (value: number) => `${value.toFixed(0)}%`,
  },
  { 
    id: 'procedure-adherence', 
    name: 'Procedure Adherence',
    description: 'Compliance with standard operating procedures (%)',
    color: '#10b981',
    format: (value: number) => `${value.toFixed(0)}%`,
  },
];

// Mock data for skill decay
const generateSkillDecayData = () => {
  const data = [];
  const today = new Date();
  
  // Generate past data (actual)
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i * 15);
    
    data.push({
      date: date.toISOString().split('T')[0],
      actual: true,
      'radio-comms': 85 - Math.random() * 5 + i * 0.5,
      'instrument-scan': 88 - Math.random() * 4 + i * 0.3,
      'situational-awareness': 90 - Math.random() * 6 + i * 0.4,
      'manual-flying': 82 - Math.random() * 7 + i * 0.6,
    });
  }
  
  // Generate future data (predicted)
  for (let i = 1; i <= 6; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i * 15);
    
    // More decay over time
    const decayFactor = i * 1.2;
    
    data.push({
      date: date.toISOString().split('T')[0],
      actual: false,
      'radio-comms': 85 - decayFactor - Math.random() * 2,
      'radio-comms_range': 10, // range for prediction uncertainty
      'instrument-scan': 88 - decayFactor * 0.8 - Math.random() * 2,
      'instrument-scan_range': 8,
      'situational-awareness': 90 - decayFactor * 1.1 - Math.random() * 3,
      'situational-awareness_range': 12,
      'manual-flying': 82 - decayFactor * 1.5 - Math.random() * 4,
      'manual-flying_range': 15,
    });
  }
  
  return data;
};

const skillDecayData = generateSkillDecayData();

const skillsData = [
  {
    id: 'radio-comms',
    name: 'Radio Communications',
    color: '#3b82f6', // Blue
    category: 'Communication',
    baseline: 85,
    threshold: 70,
  },
  {
    id: 'instrument-scan',
    name: 'Instrument Scan',
    color: '#8b5cf6', // Purple
    category: 'Technical',
    baseline: 88,
    threshold: 75,
  },
  {
    id: 'situational-awareness',
    name: 'Situational Awareness',
    color: '#10b981', // Green
    category: 'Non-Technical',
    baseline: 90,
    threshold: 80,
  },
  {
    id: 'manual-flying',
    name: 'Manual Flying',
    color: '#f59e0b', // Amber
    category: 'Technical',
    baseline: 82,
    threshold: 65,
  },
];

// Mock data for cognitive workload
const workloadDimensions = [
  {
    name: 'Mental Demand',
    value: 75,
    color: '#3b82f6',
    description: 'How much mental and perceptual activity was required',
  },
  {
    name: 'Physical Demand',
    value: 35,
    color: '#8b5cf6',
    description: 'How much physical activity was required',
  },
  {
    name: 'Temporal Demand',
    value: 65,
    color: '#f59e0b',
    description: 'How much time pressure was felt due to the pace of tasks',
  },
  {
    name: 'Performance',
    value: 55,
    color: '#10b981',
    description: 'How successful the pilot was in accomplishing the tasks',
  },
  {
    name: 'Effort',
    value: 70,
    color: '#ec4899',
    description: 'How hard the pilot had to work to accomplish the level of performance',
  },
  {
    name: 'Frustration',
    value: 45,
    color: '#ef4444',
    description: 'How insecure, discouraged, irritated, stressed, or annoyed the pilot felt',
  },
];

// Mock data for procedures
const proceduresData = [
  {
    id: 'proc-1',
    name: 'Normal Takeoff Procedure',
    steps: [
      {
        id: 'step-1-1',
        name: 'Pre-Takeoff Checklist',
        complianceRate: 95,
      },
      {
        id: 'step-1-2',
        name: 'Power Setting',
        complianceRate: 90,
      },
      {
        id: 'step-1-3',
        name: 'Rotation',
        complianceRate: 85,
      },
      {
        id: 'step-1-4',
        name: 'Initial Climb',
        complianceRate: 88,
      },
      {
        id: 'step-1-5',
        name: 'After Takeoff Checklist',
        complianceRate: 92,
      },
    ],
  },
  {
    id: 'proc-2',
    name: 'Engine Failure Procedure',
    steps: [
      {
        id: 'step-2-1',
        name: 'Identify Failure',
        complianceRate: 82,
        issues: ['Delayed recognition in 15% of cases'],
      },
      {
        id: 'step-2-2',
        name: 'Establish Pitch & Speed',
        complianceRate: 78,
        issues: ['Speed control issues in high workload scenarios'],
      },
      {
        id: 'step-2-3',
        name: 'Secure Engine',
        complianceRate: 65,
        issues: ['Steps performed out of sequence', 'Checklist not always used'],
      },
      {
        id: 'step-2-4',
        name: 'Declare Emergency',
        complianceRate: 88,
      },
      {
        id: 'step-2-5',
        name: 'Plan Landing',
        complianceRate: 72,
        issues: ['Situational awareness degradation observed'],
      },
    ],
  },
  {
    id: 'proc-3',
    name: 'ILS Approach Procedure',
    steps: [
      {
        id: 'step-3-1',
        name: 'Approach Briefing',
        complianceRate: 90,
      },
      {
        id: 'step-3-2',
        name: 'Initial Configuration',
        complianceRate: 84,
      },
      {
        id: 'step-3-3',
        name: 'Final Configuration',
        complianceRate: 88,
      },
      {
        id: 'step-3-4',
        name: 'Stabilized Approach Criteria',
        complianceRate: 75,
        issues: ['Approach not stabilized by 1000ft in 25% of cases'],
      },
      {
        id: 'step-3-5',
        name: 'Landing or Go-Around Decision',
        complianceRate: 80,
        issues: ['Continuation bias observed in marginal cases'],
      },
    ],
  },
];

// Mock data for training effectiveness
const effectivenessMetrics = [
  {
    name: 'Skill Retention',
    value: 85.6,
    change: 3.2,
    target: 80,
  },
  {
    name: 'First-Time Pass Rate',
    value: 73.4,
    change: -2.1,
    target: 75,
  },
  {
    name: 'Intervention Success',
    value: 91.2,
    change: 5.4,
    target: 85,
  },
];

const recentInterventions = [
  {
    id: 'int-1',
    date: '2023-08-15',
    type: 'Extra Simulator Session',
    trainee: {
      id: 'trainee-1',
      name: 'John Smith',
    },
    description: 'Additional practice on engine failure scenarios following below-average performance.',
    status: 'completed',
  },
  {
    id: 'int-2',
    date: '2023-08-12',
    type: 'Focused Briefing',
    trainee: {
      id: 'trainee-2',
      name: 'Sarah Johnson',
    },
    description: 'One-on-one briefing on approach stabilization criteria and decision making.',
    status: 'completed',
  },
  {
    id: 'int-3',
    date: '2023-08-20',
    type: 'Custom Practice Module',
    trainee: {
      id: 'trainee-3',
      name: 'Michael Chen',
    },
    description: 'Self-paced practice module focusing on radio communication procedures.',
    status: 'in-progress',
  },
];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [timeRangeAnchorEl, setTimeRangeAnchorEl] = useState<null | HTMLElement>(null);
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null);
  const [exportAnchorEl, setExportAnchorEl] = useState<null | HTMLElement>(null);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleTimeRangeClick = (event: React.MouseEvent<HTMLElement>) => {
    setTimeRangeAnchorEl(event.currentTarget);
  };

  const handleFilterClick = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleExportClick = (event: React.MouseEvent<HTMLElement>) => {
    setExportAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setTimeRangeAnchorEl(null);
    setFilterAnchorEl(null);
    setExportAnchorEl(null);
  };

  const handleViewAllInterventions = () => {
    console.log('View all interventions');
  };

  return (
    <Container maxWidth="xl">
      <Box className="py-6">
        <Box className="flex justify-between items-center mb-6">
          <Typography variant="h4">Analytics Dashboard</Typography>
          
          <Box className="flex space-x-2">
            <Button
              variant="outlined"
              startIcon={<DateRange />}
              onClick={handleTimeRangeClick}
            >
              Last 30 Days
            </Button>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={handleFilterClick}
            >
              Filters
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleExportClick}
            >
              Export
            </Button>
          </Box>
        </Box>
        
        <Paper elevation={1} className="mb-6">
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab label="Overview" />
            <Tab label="Performance Metrics" />
            <Tab label="Skill Tracking" />
            <Tab label="Training Effectiveness" />
            <Tab label="Compliance" />
          </Tabs>
        </Paper>
        
        {activeTab === 0 && (
          <Box>
            <Grid container spacing={4}>
              <Grid item xs={12} lg={8}>
                <PerformanceMetricsChart
                  data={performanceData}
                  metrics={performanceMetrics}
                  title="Performance Trends"
                  description="Key performance indicators over time"
                />
              </Grid>
              
              <Grid item xs={12} lg={4}>
                <CognitiveWorkloadGauge
                  title="Cognitive Workload Analysis"
                  dimensions={workloadDimensions}
                  overallWorkload={65}
                  timestamp={new Date().toISOString()}
                />
              </Grid>
              
              <Grid item xs={12}>
                <SkillDecayChart
                  data={skillDecayData}
                  skills={skillsData}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <ProcedureComplianceHeatmap
                  procedures={proceduresData}
                  title="SOP Compliance"
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TrainingEffectivenessCard
                  title="Training Effectiveness"
                  metrics={effectivenessMetrics}
                  recentInterventions={recentInterventions}
                  onViewAllInterventions={handleViewAllInterventions}
                />
              </Grid>
            </Grid>
          </Box>
        )}
        
        {activeTab === 1 && (
          <Typography variant="body1">Performance Metrics Tab Content</Typography>
        )}
        
        {activeTab === 2 && (
          <Typography variant="body1">Skill Tracking Tab Content</Typography>
        )}
        
        {activeTab === 3 && (
          <Typography variant="body1">Training Effectiveness Tab Content</Typography>
        )}
        
        {activeTab === 4 && (
          <Typography variant="body1">Compliance Tab Content</Typography>
        )}
      </Box>
      
      {/* Time Range Menu */}
      <Menu
        anchorEl={timeRangeAnchorEl}
        open={Boolean(timeRangeAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>Today</MenuItem>
        <MenuItem onClick={handleMenuClose}>Last 7 Days</MenuItem>
        <MenuItem onClick={handleMenuClose}>Last 30 Days</MenuItem>
        <MenuItem onClick={handleMenuClose}>Last 90 Days</MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose}>Custom Range...</MenuItem>
      </Menu>
      
      {/* Filters Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>All Trainees</MenuItem>
        <MenuItem onClick={handleMenuClose}>By Aircraft Type</MenuItem>
        <MenuItem onClick={handleMenuClose}>By Training Program</MenuItem>
        <MenuItem onClick={handleMenuClose}>By Instructor</MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose}>Advanced Filters...</MenuItem>
      </Menu>
      
      {/* Export Menu */}
      <Menu
        anchorEl={exportAnchorEl}
        open={Boolean(exportAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleMenuClose}>Export as PDF</MenuItem>
        <MenuItem onClick={handleMenuClose}>Export as Excel</MenuItem>
        <MenuItem onClick={handleMenuClose}>Export as CSV</MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose}>Schedule Reports</MenuItem>
      </Menu>
    </Container>
  );
}
