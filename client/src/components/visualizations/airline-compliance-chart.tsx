import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { ComplianceData } from "@shared/risk-assessment-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface AirlineComplianceChartProps {
  data: ComplianceData[];
  title?: string;
  description?: string;
  complianceThreshold?: number;
  colors?: {
    compliant: string;
    partial: string;
    nonCompliant: string;
  };
}

export const AirlineComplianceChart: React.FC<AirlineComplianceChartProps> = ({
  data,
  title = "Regulatory Compliance",
  description = "Status of regulatory compliance across all requirements",
  complianceThreshold = 80,
  colors = {
    compliant: "#1bc5bd",    // teal
    partial: "#ffa800",      // orange
    nonCompliant: "#f64e60"  // red
  }
}) => {
  const getStatusBadge = (status: 'compliant' | 'partial' | 'non-compliant') => {
    switch (status) {
      case 'compliant':
        return <Badge className="bg-emerald-500">Compliant</Badge>;
      case 'partial':
        return <Badge className="bg-amber-500">Partial</Badge>;
      case 'non-compliant':
        return <Badge className="bg-red-500">Non-Compliant</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="shadow-md w-full h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold text-primary">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 10,
              right: 30,
              left: 20,
              bottom: 70
            }}
            barGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="regulation" 
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={70}
            />
            <YAxis 
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              domain={[0, 100]}
              label={{ 
                value: 'Compliance Level (%)', 
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
              formatter={(value, name, { payload }) => {
                let content = [
                  `${value}%`,
                  "Compliance Level"
                ];
                
                if (payload.dueDate) {
                  content.push(`Due: ${format(new Date(payload.dueDate), "MMM d, yyyy")}`);
                }
                
                return content;
              }}
              labelFormatter={(label) => `${label} Regulation`}
            />
            <Legend />
            <ReferenceLine 
              y={complianceThreshold} 
              stroke="hsl(var(--primary))" 
              strokeDasharray="3 3"
              label={{ 
                value: 'Required', 
                position: 'right', 
                fill: "hsl(var(--primary))"
              }}
            />
            <Bar
              dataKey="value"
              name="Compliance Level"
              radius={[4, 4, 0, 0]}
              fill={(entry) => {
                const data = entry as ComplianceData;
                switch (data.status) {
                  case 'compliant':
                    return colors.compliant;
                  case 'partial':
                    return colors.partial;
                  case 'non-compliant':
                    return colors.nonCompliant;
                  default:
                    return colors.partial;
                }
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default AirlineComplianceChart;