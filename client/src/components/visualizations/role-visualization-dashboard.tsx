import React, { useEffect, useState } from "react";
import { RoleType } from "@shared/risk-assessment-types";
import RiskAssessmentMatrix3D from "./risk-assessment-matrix";
import TraineeRiskMatrix from "./trainee-risk-matrix";
import InstructorRiskMatrix from "./instructor-risk-matrix";
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { CardDescription } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card";
import { CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

// Sample data for testing visualizations
const sampleData = {
  riskMatrixData: [
    { severity: 4, occurrence: 3, detection: 2, value: 24, title: "Weather conditions", category: "Environmental" },
    { severity: 5, occurrence: 4, detection: 1, value: 20, title: "Mechanical failure", category: "Technical" },
    { severity: 3, occurrence: 5, detection: 3, value: 45, title: "Pilot fatigue", category: "Human Factors" },
    { severity: 5, occurrence: 2, detection: 2, value: 20, title: "Navigation error", category: "Operational" },
    { severity: 4, occurrence: 4, detection: 3, value: 48, title: "Communication breakdown", category: "Procedural" },
    { severity: 2, occurrence: 3, detection: 4, value: 24, title: "Inadequate briefing", category: "Training" },
    { severity: 3, occurrence: 2, detection: 5, value: 30, title: "Documentation error", category: "Administrative" }
  ]
};

interface RoleVisualizationDashboardProps {
  userRole: RoleType;
  className?: string;
}

export const RoleVisualizationDashboard: React.FC<RoleVisualizationDashboardProps> = ({
  userRole,
  className = ""
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={`w-full space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle>Role-Based Risk Assessment & Visualization</CardTitle>
          <CardDescription>
            Interactive 3D visualization of risk factors, training progress, and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userRole === RoleType.TRAINEE && (
            <TraineeRiskMatrix className="w-full" />
          )}
          
          {userRole === RoleType.INSTRUCTOR && (
            <InstructorRiskMatrix className="w-full" />
          )}
          
          {userRole !== RoleType.TRAINEE && userRole !== RoleType.INSTRUCTOR && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Risk Assessment Matrix</h3>
              <p className="text-sm text-muted-foreground mb-4">
                View and analyze risk factors across severity, occurrence, and detection dimensions
              </p>
              <RiskAssessmentMatrix3D 
                data={sampleData.riskMatrixData}
                config={{
                  minValue: 0,
                  maxValue: 100,
                  colors: {
                    veryLow: "#10b981",
                    low: "#3b82f6",
                    medium: "#f59e0b",
                    high: "#ef4444",
                    veryHigh: "#8b5cf6"
                  },
                  animate: true,
                  showLabels: true,
                  rotationSpeed: 0.5
                }}
              />
              
              <div className="mt-4 flex items-start space-x-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  This 3D risk matrix visualizes risk factors in three dimensions: severity (X-axis), 
                  detection difficulty (Y-axis), and occurrence frequency (Z-axis). 
                  Larger cubes represent higher risk values requiring more attention.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleVisualizationDashboard;