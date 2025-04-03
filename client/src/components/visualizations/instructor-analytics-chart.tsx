import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { PerformanceData } from "@shared/risk-assessment-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface InstructorAnalyticsChartProps {
  data: PerformanceData[];
  title?: string;
  description?: string;
  targetValue?: number;
  colors?: {
    primary: string;
    average: string;
    target: string;
  };
}

export const InstructorAnalyticsChart: React.FC<InstructorAnalyticsChartProps> = ({
  data,
  title = "Trainee Performance Trends",
  description = "Real-time analysis of trainee performance across competencies",
  targetValue = 80,
  colors = {
    primary: "#3699ff", // blue
    average: "#8950fc", // purple
    target: "#1bc5bd"   // teal
  }
}) => {
  return (
    <Card className="shadow-md w-full h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-primary">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 10,
              right: 30,
              left: 20,
              bottom: 20
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="competency" 
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              label={{ 
                value: 'Performance Score', 
                angle: -90, 
                position: 'insideLeft',
                fill: "hsl(var(--foreground))"
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                borderColor: "hsl(var(--border))",
                borderRadius: "0.5rem",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)"
              }}
              formatter={(value) => [`${value}%`, ""]}
            />
            <Legend />
            <ReferenceLine 
              y={targetValue} 
              stroke={colors.target} 
              strokeDasharray="3 3"
              label={{ 
                value: 'Target', 
                position: 'right', 
                fill: colors.target
              }}
            />
            <Line
              type="monotone"
              name="Current Performance"
              dataKey="value"
              stroke={colors.primary}
              strokeWidth={2}
              dot={{
                r: 6,
                fill: colors.primary,
                strokeWidth: 0
              }}
              activeDot={{
                r: 8,
                stroke: colors.primary,
                strokeWidth: 2,
                fill: "white"
              }}
            />
            <Line
              type="monotone"
              name="Average Performance"
              dataKey="average"
              stroke={colors.average}
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{
                r: 4,
                fill: colors.average,
                strokeWidth: 0
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default InstructorAnalyticsChart;