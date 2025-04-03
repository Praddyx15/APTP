import React from "react";
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";
import { SkillRadarData } from "@shared/risk-assessment-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TraineeSkillRadarProps {
  data: SkillRadarData[];
  title?: string;
  description?: string;
  colors?: {
    primary: string;
    secondary: string;
  };
}

export const TraineeSkillRadar: React.FC<TraineeSkillRadarProps> = ({
  data,
  title = "Competency Assessment",
  description = "Detailed view of your aviation skills and competencies",
  colors = {
    primary: "#3699ff",
    secondary: "#1bc5bd"
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
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke="#e0e0e0" />
            <PolarAngleAxis 
              dataKey="skill" 
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]} 
              tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }}
            />
            <Radar
              name="Current Skill"
              dataKey="value"
              stroke={colors.primary}
              fill={colors.primary}
              fillOpacity={0.5}
            />
            <Radar
              name="Target"
              dataKey="fullMark"
              stroke={colors.secondary}
              fill={colors.secondary}
              fillOpacity={0.15}
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
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default TraineeSkillRadar;