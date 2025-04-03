import React, { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import { InfoIcon, HelpCircle } from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from '@/components/ui/tooltip';

interface RiskFactor {
  id: string;
  value: number;
  label: string;
  position: {
    likelihood: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
  };
  description?: string;
  mitigation?: string;
}

interface RiskMatrixProps {
  title?: string;
  description?: string;
  factors: RiskFactor[];
  className?: string;
  colorScheme?: 'default' | 'dark';
}

const RiskAssessmentMatrix2D: React.FC<RiskMatrixProps> = ({
  title = 'Risk Assessment Matrix',
  description = 'Visual representation of risk likelihood and impact analysis',
  factors = [],
  className = '',
  colorScheme = 'default'
}) => {
  const [activeTab, setActiveTab] = useState<string>('matrix');
  const [selectedFactor, setSelectedFactor] = useState<RiskFactor | null>(null);

  // Cell background colors based on position and color scheme
  const getCellColor = (likelihood: 'low' | 'medium' | 'high', impact: 'low' | 'medium' | 'high') => {
    if (colorScheme === 'dark') {
      // Dark theme colors - consistent gradient scheme
      if (likelihood === 'high' && impact === 'high') return 'bg-gradient-to-br from-red-800 to-red-700';
      if (likelihood === 'high' && impact === 'medium') return 'bg-gradient-to-br from-orange-700 to-orange-600';
      if (likelihood === 'high' && impact === 'low') return 'bg-gradient-to-br from-amber-700 to-amber-600';
      if (likelihood === 'medium' && impact === 'high') return 'bg-gradient-to-br from-orange-700 to-orange-600';
      if (likelihood === 'medium' && impact === 'medium') return 'bg-gradient-to-br from-yellow-700 to-yellow-600';
      if (likelihood === 'medium' && impact === 'low') return 'bg-gradient-to-br from-lime-700 to-lime-600';
      if (likelihood === 'low' && impact === 'high') return 'bg-gradient-to-br from-amber-700 to-amber-600';
      if (likelihood === 'low' && impact === 'medium') return 'bg-gradient-to-br from-lime-700 to-lime-600';
      if (likelihood === 'low' && impact === 'low') return 'bg-gradient-to-br from-green-700 to-green-600';
    } else {
      // Default theme colors - consistent, pleasing gradients with clear risk levels
      if (likelihood === 'high' && impact === 'high') return 'bg-gradient-to-br from-red-500 to-red-400';
      if (likelihood === 'high' && impact === 'medium') return 'bg-gradient-to-br from-orange-500 to-orange-400';
      if (likelihood === 'high' && impact === 'low') return 'bg-gradient-to-br from-amber-500 to-amber-400';
      if (likelihood === 'medium' && impact === 'high') return 'bg-gradient-to-br from-orange-500 to-orange-400';
      if (likelihood === 'medium' && impact === 'medium') return 'bg-gradient-to-br from-yellow-500 to-yellow-400';
      if (likelihood === 'medium' && impact === 'low') return 'bg-gradient-to-br from-lime-500 to-lime-400';
      if (likelihood === 'low' && impact === 'high') return 'bg-gradient-to-br from-amber-500 to-amber-400';
      if (likelihood === 'low' && impact === 'medium') return 'bg-gradient-to-br from-lime-500 to-lime-400';
      if (likelihood === 'low' && impact === 'low') return 'bg-gradient-to-br from-green-500 to-green-400';
    }
  };

  // Determine text color based on background - consistent across all cells
  const getTextColor = (likelihood: 'low' | 'medium' | 'high', impact: 'low' | 'medium' | 'high') => {
    if (colorScheme === 'dark') {
      return 'text-white';
    } else {
      // High risk cells should have white text
      if ((likelihood === 'high' && impact === 'high') || 
          (likelihood === 'high' && impact === 'medium') ||
          (likelihood === 'medium' && impact === 'high')) {
        return 'text-white';
      }
      // All other cells have dark text for better contrast
      return 'text-slate-800';
    }
  };

  // Calculate fixed positions for risk factors to ensure consistency
  const getFactorPosition = (factorId: string, likelihood: string, impact: string): { left: string, top: string } => {
    // Use a deterministic approach based on the factor ID
    const idHash = factorId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Generate a position in the 20-80% range of the cell to avoid edges
    const left = `${20 + (idHash % 60)}%`;
    const top = `${20 + ((idHash * 31) % 60)}%`;
    
    return { left, top };
  };

  // Pre-calculate positions for performance
  const factorPositions = useMemo(() => {
    return factors.reduce((acc, factor) => {
      acc[factor.id] = getFactorPosition(
        factor.id, 
        factor.position.likelihood, 
        factor.position.impact
      );
      return acc;
    }, {} as Record<string, { left: string, top: string }>);
  }, [factors]);

  // Helper function to get risk level color for legend
  const getRiskLevelColor = (level: string) => {
    if (colorScheme === 'dark') {
      if (level === 'High') return 'bg-red-700';
      if (level === 'Medium') return 'bg-yellow-700';
      if (level === 'Low') return 'bg-green-700';
    } else {
      if (level === 'High') return 'bg-red-500';
      if (level === 'Medium') return 'bg-yellow-500';
      if (level === 'Low') return 'bg-green-500';
    }
  };

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="matrix">Matrix View</TabsTrigger>
            <TabsTrigger value="details">Risk Details</TabsTrigger>
          </TabsList>

          <TabsContent value="matrix" className="p-0">
            <div className="mt-4 grid grid-cols-[auto,1fr]">
              {/* Y-axis label (Likelihood) */}
              <div className="flex items-center justify-center">
                <div className="transform -rotate-90 whitespace-nowrap text-sm font-medium text-muted-foreground">
                  LIKELIHOOD
                </div>
              </div>

              <div className="flex flex-col">
                {/* X-axis labels (Impact) */}
                <div className="grid grid-cols-[auto,1fr,1fr,1fr] mb-2">
                  <div className="w-6"></div> {/* Spacer */}
                  <div className="text-center text-sm font-medium text-muted-foreground">LOW</div>
                  <div className="text-center text-sm font-medium text-muted-foreground">MEDIUM</div>
                  <div className="text-center text-sm font-medium text-muted-foreground">HIGH</div>
                </div>

                {/* Matrix grid */}
                <div className="grid grid-cols-[auto,1fr] gap-2">
                  {/* Row labels */}
                  <div className="flex flex-col justify-between py-1">
                    <div className="h-28 flex items-center text-sm font-medium text-muted-foreground">HIGH</div>
                    <div className="h-28 flex items-center text-sm font-medium text-muted-foreground">MEDIUM</div>
                    <div className="h-28 flex items-center text-sm font-medium text-muted-foreground">LOW</div>
                  </div>

                  {/* Matrix cells */}
                  <div className="grid grid-cols-3 grid-rows-3 gap-2">
                    {/* Generate all 9 cells */}
                    {(['high', 'medium', 'low'] as const).map(likelihood => 
                      (['low', 'medium', 'high'] as const).map(impact => {
                        const cellFactors = factors.filter(
                          factor => factor.position.likelihood === likelihood && factor.position.impact === impact
                        );
                        
                        // Risk level indicator for each cell
                        const riskLevel = 
                          (likelihood === 'high' && impact === 'high') ? 'Very High' :
                          (likelihood === 'high' && impact === 'medium') || 
                          (likelihood === 'medium' && impact === 'high') ? 'High' :
                          (likelihood === 'low' && impact === 'low') ? 'Very Low' :
                          'Medium';
                        
                        return (
                          <div 
                            key={`${likelihood}-${impact}`}
                            className={`${getCellColor(likelihood, impact)} h-28 rounded-md p-2 relative overflow-hidden`}
                          >
                            {/* Risk level indicator in corner */}
                            <div className="absolute bottom-1 right-1 text-xs font-semibold px-1 rounded bg-black/20 text-white">
                              {riskLevel}
                            </div>
                            
                            {cellFactors.map(factor => (
                              <div 
                                key={factor.id}
                                className={`
                                  absolute cursor-pointer transform transition-all duration-200 
                                  hover:scale-110 hover:z-10 shadow-lg
                                  ${selectedFactor?.id === factor.id ? 'ring-2 ring-white scale-110' : ''}
                                `}
                                style={{
                                  width: '60px',
                                  height: '60px',
                                  borderRadius: '100%',
                                  backgroundColor: colorScheme === 'dark' ? 'rgba(30, 30, 33, 0.9)' : 'rgba(30, 41, 59, 0.85)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  left: factorPositions[factor.id].left, 
                                  top: factorPositions[factor.id].top,
                                  transform: 'translate(-50%, -50%)',
                                  position: 'absolute'
                                }}
                                onClick={() => setSelectedFactor(factor)}
                              >
                                <div className="text-center text-white">
                                  <div className="text-lg font-bold">{factor.value}%</div>
                                  <div className="text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis w-full px-1">
                                    {factor.label}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Scale and Legend */}
            <div className="mt-4 flex flex-col space-y-2">
              <div className="grid grid-cols-1 text-center text-sm font-medium text-muted-foreground">
                IMPACT
              </div>
              
              <div className="flex justify-center items-center mt-2 gap-4 text-xs">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${getRiskLevelColor('Low')} mr-1`}></div>
                  <span>Low Risk</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${getRiskLevelColor('Medium')} mr-1`}></div>
                  <span>Medium Risk</span>
                </div>
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${getRiskLevelColor('High')} mr-1`}></div>
                  <span>High Risk</span>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div><HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" /></div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>The color in each cell indicates the risk level based on the combination of likelihood and impact.</p>
                      <p className="mt-1">The position of each factor in the cell is fixed and consistent.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {selectedFactor && (
              <div className="mt-4 p-4 bg-muted/30 rounded-md border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">{selectedFactor.label}</h3>
                  <div className="text-2xl font-bold">{selectedFactor.value}%</div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Description</h4>
                    <p className="text-sm mt-1">{selectedFactor.description || "No description available."}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Mitigation Strategy</h4>
                    <p className="text-sm mt-1">{selectedFactor.mitigation || "No mitigation strategy available."}</p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="details">
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/30 p-4 rounded-md border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-medium">Risk Description</h3>
                  <ul className="mt-2 space-y-2">
                    {factors.map(factor => (
                      <li key={factor.id} className="text-sm">
                        <div className="flex items-center">
                          <div className="w-10 text-right font-bold mr-2">{factor.value}% </div>
                          <span>{factor.label}</span>
                        </div>
                        <p className="ml-12 text-xs text-muted-foreground mt-1">
                          {factor.description || "No description available."}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-muted/30 p-4 rounded-md border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-medium">Risk Mitigation</h3>
                  <ul className="mt-2 space-y-2">
                    {factors.map(factor => (
                      <li key={factor.id} className="text-sm">
                        <div className="flex items-center">
                          <div className="w-10 text-right font-bold mr-2">{factor.value}% </div>
                          <span>{factor.label}</span>
                        </div>
                        <p className="ml-12 text-xs text-muted-foreground mt-1">
                          {factor.mitigation || "No mitigation strategy available."}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-3 flex items-start text-xs text-muted-foreground">
          <InfoIcon className="h-3.5 w-3.5 mr-1 flex-shrink-0 mt-0.5" />
          <span>
            Each point represents a specific risk factor based on its likelihood (vertical axis) and impact (horizontal axis). 
            Click on any factor for more details.
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default RiskAssessmentMatrix2D;