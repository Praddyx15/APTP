import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ShieldCheck, 
  FileWarning, 
  AlertTriangle, 
  Info
} from 'lucide-react';
import { ProgramCompliance, RegulatoryRequirement } from '@shared/schema';

interface ComplianceStatusProps {
  programId: number;
  programCompliance?: ProgramCompliance;
  requirements?: RegulatoryRequirement[];
}

export default function ComplianceStatus({ 
  programId, 
  programCompliance, 
  requirements 
}: ComplianceStatusProps) {
  // Calculate compliance metrics
  const calculateMetrics = () => {
    if (!programCompliance || !requirements || requirements.length === 0) {
      return {
        compliantCount: 0,
        partialCount: 0,
        nonCompliantCount: 0,
        overallPercentage: 0,
        status: 'unknown'
      };
    }

    const compliantIds = programCompliance.compliantRequirementIds || [];
    const partialIds = programCompliance.partiallyCompliantRequirementIds || [];
    const nonCompliantIds = programCompliance.nonCompliantRequirementIds || [];
    
    const compliantCount = compliantIds.length;
    const partialCount = partialIds.length;
    const nonCompliantCount = nonCompliantIds.length;
    const totalCount = compliantCount + partialCount + nonCompliantCount;
    
    // Calculate percentage: full compliance = 100%, partial = 50%, none = 0%
    const overallPercentage = Math.round(
      ((compliantCount * 100) + (partialCount * 50)) / (totalCount * 100) * 100
    );
    
    // Determine overall status
    let status = 'compliant';
    if (nonCompliantCount > 0) {
      status = 'non-compliant';
    } else if (partialCount > 0) {
      status = 'partially-compliant';
    }
    
    return {
      compliantCount,
      partialCount,
      nonCompliantCount,
      overallPercentage,
      status
    };
  };
  
  const metrics = calculateMetrics();
  
  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'partially-compliant':
        return <AlertCircle className="h-5 w-5 text-amber-500" />;
      case 'non-compliant':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'Compliant';
      case 'partially-compliant':
        return 'Partially Compliant';
      case 'non-compliant':
        return 'Non-Compliant';
      default:
        return 'Unknown';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'text-green-500 bg-green-50 dark:bg-green-950/50';
      case 'partially-compliant':
        return 'text-amber-500 bg-amber-50 dark:bg-amber-950/50';
      case 'non-compliant':
        return 'text-red-500 bg-red-50 dark:bg-red-950/50';
      default:
        return 'text-blue-500 bg-blue-50 dark:bg-blue-950/50';
    }
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-lg">
          <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
          Regulatory Compliance Status
        </CardTitle>
        <CardDescription>
          Overview of program compliance with regulatory requirements
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {!programCompliance ? (
          <div className="text-center py-6">
            <FileWarning className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No compliance data available for this program
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Overall Compliance:</span>
              <Badge 
                className={`px-3 py-1 flex items-center ${getStatusColor(metrics.status)}`}
              >
                {renderStatusIcon(metrics.status)}
                <span className="ml-1">{getStatusText(metrics.status)}</span>
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Compliance Score</span>
                <span>{metrics.overallPercentage}%</span>
              </div>
              <div className="relative pt-1">
                <Progress value={metrics.overallPercentage} className="h-2" />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-1">
                      <div className="text-xl font-bold text-green-500">
                        {metrics.compliantCount}
                      </div>
                      <p className="text-xs text-muted-foreground">Compliant</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Requirements fully satisfied</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-1">
                      <div className="text-xl font-bold text-amber-500">
                        {metrics.partialCount}
                      </div>
                      <p className="text-xs text-muted-foreground">Partial</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Requirements partially satisfied</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-1">
                      <div className="text-xl font-bold text-red-500">
                        {metrics.nonCompliantCount}
                      </div>
                      <p className="text-xs text-muted-foreground">Non-Compliant</p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Requirements not satisfied</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {programCompliance.lastUpdated && (
              <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                Last updated: {new Date(programCompliance.lastUpdated).toLocaleString()}
              </div>
            )}
            
            {programCompliance.nonCompliantRequirementIds && 
             programCompliance.nonCompliantRequirementIds.length > 0 && (
              <div className="mt-4 p-3 border rounded-md bg-red-50 dark:bg-red-950/30">
                <div className="flex items-center text-red-600 mb-2">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <span className="font-medium">Critical Issues</span>
                </div>
                <ul className="text-sm space-y-1 text-red-600">
                  {programCompliance.nonCompliantRequirementIds.map(reqId => {
                    const req = requirements?.find(r => r.id === reqId);
                    return (
                      <li key={reqId} className="flex items-start">
                        <XCircle className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                        <span>{req?.description || `Requirement #${reqId}`}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}