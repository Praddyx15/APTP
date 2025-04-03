import React from "react";
import { 
  ResponsiveContainer, 
  Tooltip, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  CartesianGrid, 
  Cell
} from "recharts";
import { PerformanceData } from "@shared/risk-assessment-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ExaminerPerformanceHeatmapProps {
  data: PerformanceData[];
  title?: string;
  description?: string;
  averageLabel?: string;
  valueLabel?: string;
  colors?: {
    gradient: string[];
  };
}

export const ExaminerPerformanceHeatmap: React.FC<ExaminerPerformanceHeatmapProps> = ({
  data,
  title = "Competency Performance Analysis",
  description = "Heatmap of trainee performance across all competency areas",
  averageLabel = "Average Performance",
  valueLabel = "Trainee Performance",
  colors = {
    gradient: ["#f64e60", "#ffa800", "#1bc5bd"] // red -> orange -> teal
  }
}) => {
  // Prepare heatmap data
  const heatmapData = data.map(item => ({
    x: item.average,
    y: item.value,
    z: 20, // size of dots
    name: item.competency
  }));

  // Function to get color based on performance value
  const getColorForValue = (value: number) => {
    const colorIndex = Math.min(
      Math.floor((value / 100) * (colors.gradient.length - 1)),
      colors.gradient.length - 1
    );
    return colors.gradient[colorIndex];
  };

  return (
    <Card className="shadow-md w-full h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-primary">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{
              top: 20,
              right: 20,
              bottom: 20,
              left: 20
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name={averageLabel} 
              domain={[0, 100]}
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              label={{ 
                value: averageLabel, 
                position: 'bottom',
                fill: "hsl(var(--foreground))",
                fontSize: 12
              }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name={valueLabel}
              domain={[0, 100]}
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              label={{ 
                value: valueLabel, 
                angle: -90, 
                position: 'insideLeft',
                fill: "hsl(var(--foreground))",
                fontSize: 12
              }}
            />
            <ZAxis type="number" dataKey="z" range={[60, 400]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                borderColor: "hsl(var(--border))",
                borderRadius: "0.5rem",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
              }}
              formatter={(value) => [`${value}%`, ""]}
              labelFormatter={(_, payload) => {
                if (payload && payload.length > 0) {
                  return `${payload[0].payload.name}`;
                }
                return "";
              }}
            />
            <Scatter name="Performance Comparison" data={heatmapData}>
              {heatmapData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getColorForValue(entry.y)} 
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default ExaminerPerformanceHeatmap;