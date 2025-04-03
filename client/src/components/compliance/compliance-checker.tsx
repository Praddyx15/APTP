/**
 * ComplianceChecker Component
 * A utility for validating training plans against regulatory requirements,
 * tracking required hours by category, generating compliance reports, and 
 * recommending remediation for compliance gaps.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle, Clock, FilePlus, FileText, Info, Lightbulb, Shield, X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useToast } from '@/hooks/use-toast';

// Compliance types
export interface RegulationType {
  id: string;
  name: string;
  authority: string;
  version: string;
  effectiveDate: string;
  categoryHours: Record<string, number>;
  totalRequiredHours: number;
}

export interface TrainingPlan {
  id: string;
  traineeId: number;
  programId: number;
  programName: string;
  regulationTypeId: string;
  startDate: string;
  endDate: string;
  status: 'draft' | 'approved' | 'in-progress' | 'completed';
  totalPlannedHours: number;
}

export interface ComplianceResult {
  compliant: boolean;
  requirementsMet: RequirementStatus[];
  requirementsNotMet: RequirementStatus[];
  hoursRequirements: {
    totalRequired: number;
    totalPlanned: number;
    totalCompleted: number;
    compliant: boolean;
    byCategory: {
      category: string;
      required: number;
      planned: number;
      completed: number;
      compliant: boolean;
    }[];
  };
  assessmentRequirements: {
    compliant: boolean;
    details: {
      requirementId: string;
      title: string;
      met: boolean;
      details: string;
    }[];
  };
  recommendations: ComplianceRecommendation[];
  complianceScore: number;
  status: 'fully-compliant' | 'partially-compliant' | 'non-compliant';
  timestamp: string;
}

export interface RequirementStatus {
  requirementId: string;
  code: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  met: boolean;
  details: string;
}

export interface ComplianceRecommendation {
  requirementId: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  actionItems: string[];
  deadline?: string;
}

// Component props
interface ComplianceCheckerProps {
  trainingPlanId?: string;
  programId?: number;
  regulationTypeId?: string;
  variant?: 'standard' | 'compact' | 'detailed';
  onComplianceResultsGenerated?: (results: ComplianceResult) => void;
}

export const ComplianceChecker: React.FC<ComplianceCheckerProps> = ({
  trainingPlanId,
  programId,
  regulationTypeId,
  variant = 'standard',
  onComplianceResultsGenerated
}) => {
  const { toast } = useToast();
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(trainingPlanId);
  const [selectedRegulationId, setSelectedRegulationId] = useState<string | undefined>(regulationTypeId);
  const [activeTab, setActiveTab] = useState<string>('overview');

  // Fetch available training plans
  const { data: trainingPlans, isLoading: isLoadingPlans } = useQuery({
    queryKey: ['/api/training-plans', programId],
    queryFn: async () => {
      try {
        const url = programId 
          ? `/api/training-plans?programId=${programId}` 
          : '/api/training-plans';
        const response = await apiRequest('GET', url);
        return await response.json();
      } catch (error) {
        console.error('Error fetching training plans:', error);
        // For development - return sample data
        return [
          {
            id: 'plan-001',
            traineeId: 101,
            programId: 1,
            programName: 'Commercial Pilot License',
            regulationTypeId: 'reg-easa-cpl',
            startDate: '2025-01-15',
            endDate: '2025-07-15',
            status: 'in-progress',
            totalPlannedHours: 230
          },
          {
            id: 'plan-002',
            traineeId: 102,
            programId: 1,
            programName: 'Commercial Pilot License',
            regulationTypeId: 'reg-easa-cpl',
            startDate: '2025-02-01',
            endDate: '2025-08-01',
            status: 'in-progress',
            totalPlannedHours: 225
          }
        ];
      }
    },
    enabled: !trainingPlanId,
  });

  // Fetch regulation types
  const { data: regulations, isLoading: isLoadingRegulations } = useQuery({
    queryKey: ['/api/regulation-types'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/regulation-types');
        return await response.json();
      } catch (error) {
        console.error('Error fetching regulation types:', error);
        // For development - return sample data
        return [
          {
            id: 'reg-easa-cpl',
            name: 'EASA CPL Training Requirements',
            authority: 'EASA',
            version: '2023-01',
            effectiveDate: '2023-01-15',
            categoryHours: {
              'ground-theory': 100,
              'flight-training': 100,
              'simulator': 40,
              'examinations': 15
            },
            totalRequiredHours: 255
          },
          {
            id: 'reg-faa-cpl',
            name: 'FAA CPL Requirements',
            authority: 'FAA',
            version: '2022-11',
            effectiveDate: '2022-11-01',
            categoryHours: {
              'ground-theory': 90,
              'flight-training': 110,
              'simulator': 30,
              'examinations': 10
            },
            totalRequiredHours: 240
          }
        ];
      }
    },
  });

  // Fetch compliance results
  const { data: complianceResult, isLoading: isLoadingCompliance } = useQuery({
    queryKey: ['/api/compliance/validate', selectedPlanId, selectedRegulationId],
    queryFn: async () => {
      try {
        if (!selectedPlanId) throw new Error('No training plan selected');
        
        const url = selectedRegulationId
          ? `/api/compliance/validate?planId=${selectedPlanId}&regulationId=${selectedRegulationId}`
          : `/api/compliance/validate?planId=${selectedPlanId}`;
          
        const response = await apiRequest('GET', url);
        return await response.json();
      } catch (error) {
        console.error('Error fetching compliance results:', error);
        // For development - return sample data
        return {
          compliant: false,
          requirementsMet: [
            {
              requirementId: 'req-001',
              code: 'FCL.310',
              title: 'Theoretical knowledge examination',
              priority: 'critical',
              met: true,
              details: 'All required theory examinations are scheduled'
            },
            {
              requirementId: 'req-002',
              code: 'FCL.315.A',
              title: 'Flight training requirements',
              priority: 'critical',
              met: true,
              details: 'Planned flight hours meet minimum requirements'
            }
          ],
          requirementsNotMet: [
            {
              requirementId: 'req-003',
              code: 'FCL.320',
              title: 'Skill test requirements',
              priority: 'critical',
              met: false,
              details: 'Skill test not yet scheduled'
            },
            {
              requirementId: 'req-004',
              code: 'FCL.325.A',
              title: 'Night rating requirements',
              priority: 'high',
              met: false,
              details: 'Night training hours insufficient (5 planned, 10 required)'
            }
          ],
          hoursRequirements: {
            totalRequired: 255,
            totalPlanned: 230,
            totalCompleted: 120,
            compliant: false,
            byCategory: [
              {
                category: 'ground-theory',
                required: 100,
                planned: 100,
                completed: 80,
                compliant: true
              },
              {
                category: 'flight-training',
                required: 100,
                planned: 90,
                completed: 30,
                compliant: false
              },
              {
                category: 'simulator',
                required: 40,
                planned: 30,
                completed: 10,
                compliant: false
              },
              {
                category: 'examinations',
                required: 15,
                planned: 10,
                completed: 0,
                compliant: false
              }
            ]
          },
          assessmentRequirements: {
            compliant: false,
            details: [
              {
                requirementId: 'assess-001',
                title: 'Theory assessment coverage',
                met: true,
                details: 'All required subjects are covered'
              },
              {
                requirementId: 'assess-002',
                title: 'Practical skill assessment',
                met: false,
                details: 'Crosswind landing assessment not included'
              }
            ]
          },
          recommendations: [
            {
              requirementId: 'req-003',
              title: 'Schedule skill test',
              description: 'A skill test must be scheduled with an authorized examiner',
              priority: 'critical',
              actionItems: [
                'Contact examination office to request a test date',
                'Ensure all prerequisites are completed before test date'
              ],
              deadline: '2025-06-15'
            },
            {
              requirementId: 'req-004',
              title: 'Increase night flying hours',
              description: 'Additional night flying training is required',
              priority: 'high',
              actionItems: [
                'Schedule 5 additional hours of night flying',
                'Ensure night flying includes required maneuvers'
              ],
              deadline: '2025-05-01'
            }
          ],
          complianceScore: 78,
          status: 'partially-compliant',
          timestamp: new Date().toISOString()
        };
      }
    },
    enabled: !!selectedPlanId
  });

  // Handle successful results with useEffect
  useEffect(() => {
    if (complianceResult && onComplianceResultsGenerated) {
      onComplianceResultsGenerated(complianceResult);
    }
  }, [complianceResult, onComplianceResultsGenerated]);

  // Generate compliance report mutation
  const generateReport = useMutation({
    mutationFn: async () => {
      try {
        if (!selectedPlanId) throw new Error('No training plan selected');
        
        const response = await apiRequest(
          'POST',
          '/api/compliance/generate-report',
          { planId: selectedPlanId, regulationId: selectedRegulationId }
        );
        
        return await response.json();
      } catch (error) {
        console.error('Error generating compliance report:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Report Generated",
        description: "Compliance report has been generated and saved.",
        duration: 3000,
      });
      
      // Invalidate reports query to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/compliance/reports'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Generate Report",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
        duration: 5000,
      });
    }
  });

  // Set initial plan if provided as prop
  useEffect(() => {
    if (trainingPlanId) {
      setSelectedPlanId(trainingPlanId);
    } else if (trainingPlans && trainingPlans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(trainingPlans[0].id);
    }
  }, [trainingPlanId, trainingPlans]);

  // Set initial regulation if provided as prop
  useEffect(() => {
    if (regulationTypeId) {
      setSelectedRegulationId(regulationTypeId);
    } else if (selectedPlanId && trainingPlans) {
      const plan = trainingPlans.find(p => p.id === selectedPlanId);
      if (plan) {
        setSelectedRegulationId(plan.regulationTypeId);
      }
    }
  }, [regulationTypeId, selectedPlanId, trainingPlans]);

  // Selected training plan
  const selectedPlan = useMemo(() => {
    if (!trainingPlans || !selectedPlanId) return null;
    return trainingPlans.find(plan => plan.id === selectedPlanId) || null;
  }, [trainingPlans, selectedPlanId]);

  // Selected regulation
  const selectedRegulation = useMemo(() => {
    if (!regulations || !selectedRegulationId) return null;
    return regulations.find(reg => reg.id === selectedRegulationId) || null;
  }, [regulations, selectedRegulationId]);

  // Loading state
  const isLoading = isLoadingPlans || isLoadingRegulations || isLoadingCompliance;

  // Get compliance status for display
  const getComplianceStatusDisplay = (status: string) => {
    switch (status) {
      case 'fully-compliant':
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Fully Compliant
          </Badge>
        );
      case 'partially-compliant':
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600">
            <AlertCircle className="w-3 h-3 mr-1" />
            Partially Compliant
          </Badge>
        );
      case 'non-compliant':
        return (
          <Badge className="bg-red-500 hover:bg-red-600">
            <X className="w-3 h-3 mr-1" />
            Non-Compliant
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Info className="w-3 h-3 mr-1" />
            Unknown
          </Badge>
        );
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <Badge className="bg-red-500">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">High</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Medium</Badge>;
      case 'low':
        return <Badge className="bg-blue-500">Low</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // If compact view, show simplified UI
  if (variant === 'compact') {
    return (
      <Card className="border-2 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center">
            <Shield className="w-4 h-4 mr-2 text-primary" />
            Compliance Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : complianceResult ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  {getComplianceStatusDisplay(complianceResult.status)}
                </div>
                <div className="text-sm font-medium">
                  Score: {complianceResult.complianceScore}/100
                </div>
              </div>
              
              <Progress
                value={complianceResult.complianceScore}
                className="h-2"
                color={
                  complianceResult.complianceScore >= 90 ? "bg-green-500" :
                  complianceResult.complianceScore >= 75 ? "bg-yellow-500" :
                  "bg-red-500"
                }
              />
              
              <div className="text-xs text-muted-foreground">
                <div className="flex items-center justify-between mt-2">
                  <span>{complianceResult.requirementsNotMet.length} issues found</span>
                  <span>{complianceResult.recommendations.length} recommendations</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-4 text-center">
              No compliance data available
            </div>
          )}
        </CardContent>
        <CardFooter className="pt-0">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs"
            onClick={() => window.open('/compliance-checker', '_blank')}
          >
            View Full Report
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="w-5 h-5 mr-2 text-primary" />
          Regulatory Compliance Checker
        </CardTitle>
        <CardDescription>
          Validate training plans against regulatory requirements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Selection controls */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Training Plan</label>
              <Select
                value={selectedPlanId}
                onValueChange={setSelectedPlanId}
                disabled={isLoadingPlans || !!trainingPlanId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select training plan" />
                </SelectTrigger>
                <SelectContent>
                  {trainingPlans && trainingPlans.map((plan: TrainingPlan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.programName} ({plan.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block">Regulation</label>
              <Select
                value={selectedRegulationId}
                onValueChange={setSelectedRegulationId}
                disabled={isLoadingRegulations || !!regulationTypeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select regulation" />
                </SelectTrigger>
                <SelectContent>
                  {regulations && regulations.map((reg: RegulationType) => (
                    <SelectItem key={reg.id} value={reg.id}>
                      {reg.name} ({reg.authority})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Info box */}
          {selectedPlan && selectedRegulation && (
            <div className="bg-muted/50 p-4 rounded-md text-sm">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <p className="font-medium">Training Plan: {selectedPlan.programName}</p>
                  <p className="text-muted-foreground">
                    Period: {new Date(selectedPlan.startDate).toLocaleDateString()} - {new Date(selectedPlan.endDate).toLocaleDateString()}
                  </p>
                  <p className="text-muted-foreground">Status: {selectedPlan.status}</p>
                </div>
                <div>
                  <p className="font-medium">Regulation: {selectedRegulation.name}</p>
                  <p className="text-muted-foreground">Authority: {selectedRegulation.authority}</p>
                  <p className="text-muted-foreground">Version: {selectedRegulation.version}</p>
                </div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-2"></div>
                <p className="text-sm text-muted-foreground">Analyzing compliance...</p>
              </div>
            </div>
          )}

          {/* Results tabs */}
          {!isLoading && complianceResult && (
            <>
              <div className="flex justify-between items-center border-b pb-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium">Compliance Score: {complianceResult.complianceScore}/100</h3>
                  {getComplianceStatusDisplay(complianceResult.status)}
                </div>
                <div>
                  <Button
                    size="sm"
                    onClick={() => generateReport.mutate()}
                    disabled={generateReport.isPending}
                  >
                    {generateReport.isPending ? (
                      <>Generating...</>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Generate Report
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="requirements">Requirements</TabsTrigger>
                  <TabsTrigger value="hours">Hours</TabsTrigger>
                  <TabsTrigger value="assessments">Assessments</TabsTrigger>
                  <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="py-2 px-4">
                        <CardTitle className="text-sm">Requirements</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2 px-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-2xl font-bold">
                              {complianceResult.requirementsMet.length}/{complianceResult.requirementsMet.length + complianceResult.requirementsNotMet.length}
                            </p>
                            <p className="text-xs text-muted-foreground">Requirements Met</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center text-green-500">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              <span className="text-xs">{complianceResult.requirementsMet.length} Met</span>
                            </div>
                            <div className="flex items-center text-red-500">
                              <X className="w-3 h-3 mr-1" />
                              <span className="text-xs">{complianceResult.requirementsNotMet.length} Not Met</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="py-2 px-4">
                        <CardTitle className="text-sm">Hours</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2 px-4">
                        <div className="flex flex-col">
                          <div className="flex justify-between">
                            <p className="text-2xl font-bold">
                              {complianceResult.hoursRequirements.totalCompleted}/{complianceResult.hoursRequirements.totalRequired}
                            </p>
                            <p className="text-sm font-medium">
                              {Math.round((complianceResult.hoursRequirements.totalCompleted / complianceResult.hoursRequirements.totalRequired) * 100)}%
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">Completed Hours</p>
                          <Progress 
                            value={(complianceResult.hoursRequirements.totalCompleted / complianceResult.hoursRequirements.totalRequired) * 100}
                            className="h-1 mt-2"
                          />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="py-2 px-4">
                        <CardTitle className="text-sm">Recommendations</CardTitle>
                      </CardHeader>
                      <CardContent className="py-2 px-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-2xl font-bold">{complianceResult.recommendations.length}</p>
                            <p className="text-xs text-muted-foreground">Actions Needed</p>
                          </div>
                          <div className="flex flex-col text-right text-xs gap-1">
                            <div className="flex items-center justify-end text-red-500">
                              <span>
                                {complianceResult.recommendations.filter(r => r.priority === 'critical').length} Critical
                              </span>
                            </div>
                            <div className="flex items-center justify-end text-orange-500">
                              <span>
                                {complianceResult.recommendations.filter(r => r.priority === 'high').length} High
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Critical Issues</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {complianceResult.requirementsNotMet
                        .filter(req => req.priority === 'critical')
                        .length === 0 ? (
                        <div className="text-sm text-center py-4 text-muted-foreground">
                          No critical issues found
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Code</TableHead>
                              <TableHead>Title</TableHead>
                              <TableHead>Details</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {complianceResult.requirementsNotMet
                              .filter(req => req.priority === 'critical')
                              .map((req) => (
                                <TableRow key={req.requirementId}>
                                  <TableCell className="font-mono">{req.code}</TableCell>
                                  <TableCell>{req.title}</TableCell>
                                  <TableCell>{req.details}</TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="requirements" className="space-y-4 pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium">All Requirements</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                        <span className="text-sm">{complianceResult.requirementsMet.length} Met</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                        <span className="text-sm">{complianceResult.requirementsNotMet.length} Not Met</span>
                      </div>
                    </div>
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Unmet Requirements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {complianceResult.requirementsNotMet.map((req) => (
                            <TableRow key={req.requirementId}>
                              <TableCell className="font-mono">{req.code}</TableCell>
                              <TableCell>{req.title}</TableCell>
                              <TableCell>{getPriorityBadge(req.priority)}</TableCell>
                              <TableCell>{req.details}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Met Requirements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {complianceResult.requirementsMet.map((req) => (
                            <TableRow key={req.requirementId}>
                              <TableCell className="font-mono">{req.code}</TableCell>
                              <TableCell>{req.title}</TableCell>
                              <TableCell>{getPriorityBadge(req.priority)}</TableCell>
                              <TableCell>{req.details}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="hours" className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <Card className="bg-muted/30">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-3xl font-bold">{complianceResult.hoursRequirements.totalRequired}</p>
                            <p className="text-xs text-muted-foreground">Total Required Hours</p>
                          </div>
                          <Clock className="h-8 w-8 text-muted-foreground/70" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-muted/30">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-3xl font-bold">{complianceResult.hoursRequirements.totalPlanned}</p>
                            <p className="text-xs text-muted-foreground">Total Planned Hours</p>
                          </div>
                          <FilePlus className="h-8 w-8 text-muted-foreground/70" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-muted/30">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-3xl font-bold">{complianceResult.hoursRequirements.totalCompleted}</p>
                            <p className="text-xs text-muted-foreground">Total Completed Hours</p>
                          </div>
                          <CheckCircle className="h-8 w-8 text-muted-foreground/70" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Hours by Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Required</TableHead>
                            <TableHead className="text-right">Planned</TableHead>
                            <TableHead className="text-right">Completed</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                            <TableHead>Progress</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {complianceResult.hoursRequirements.byCategory.map((category) => (
                            <TableRow key={category.category}>
                              <TableCell className="font-medium capitalize">
                                {category.category.replace(/-/g, ' ')}
                              </TableCell>
                              <TableCell className="text-right">{category.required}h</TableCell>
                              <TableCell className="text-right">{category.planned}h</TableCell>
                              <TableCell className="text-right">{category.completed}h</TableCell>
                              <TableCell className="text-right">
                                {category.compliant ? (
                                  <Badge className="bg-green-500">Compliant</Badge>
                                ) : (
                                  <Badge className="bg-yellow-500">Needs Attention</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress 
                                    value={(category.completed / category.required) * 100}
                                    className="h-2"
                                  />
                                  <span className="text-xs text-muted-foreground w-9 text-right">
                                    {Math.round((category.completed / category.required) * 100)}%
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="assessments" className="space-y-4 pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium">Assessment Requirements</h3>
                    <Badge className={complianceResult.assessmentRequirements.compliant ? "bg-green-500" : "bg-red-500"}>
                      {complianceResult.assessmentRequirements.compliant ? "All Requirements Met" : "Requirements Not Met"}
                    </Badge>
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Assessment Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {complianceResult.assessmentRequirements.details.map((detail) => (
                            <TableRow key={detail.requirementId}>
                              <TableCell>{detail.title}</TableCell>
                              <TableCell>
                                {detail.met ? (
                                  <Badge className="bg-green-500">Met</Badge>
                                ) : (
                                  <Badge className="bg-red-500">Not Met</Badge>
                                )}
                              </TableCell>
                              <TableCell>{detail.details}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="recommendations" className="space-y-4 pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium">Recommendations</h3>
                    <span className="text-sm text-muted-foreground">
                      {complianceResult.recommendations.length} action{complianceResult.recommendations.length !== 1 ? 's' : ''} required
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {complianceResult.recommendations.map((rec) => (
                      <Card key={rec.requirementId} className={
                        rec.priority === 'critical' ? 'border-red-500/50' :
                        rec.priority === 'high' ? 'border-orange-500/50' :
                        rec.priority === 'medium' ? 'border-yellow-500/50' :
                        'border-blue-500/50'
                      }>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-base">{rec.title}</CardTitle>
                            {getPriorityBadge(rec.priority)}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm mb-3">{rec.description}</p>
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Required Actions:</h4>
                            <ul className="text-sm space-y-1 list-disc list-inside ml-2">
                              {rec.actionItems.map((action, idx) => (
                                <li key={idx}>{action}</li>
                              ))}
                            </ul>
                          </div>
                          {rec.deadline && (
                            <div className="flex items-center mt-4 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4 mr-1" />
                              Deadline: {new Date(rec.deadline).toLocaleDateString()}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
          
          {/* No results state */}
          {!isLoading && !complianceResult && (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <h3 className="text-lg font-medium mb-2">No Compliance Data</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Select a training plan and regulation to start checking compliance.
              </p>
              <Button 
                variant="outline" 
                disabled={!selectedPlanId || !selectedRegulationId}
                onClick={() => {
                  if (selectedPlanId && selectedRegulationId) {
                    queryClient.invalidateQueries({
                      queryKey: ['/api/compliance/validate', selectedPlanId, selectedRegulationId]
                    });
                  }
                }}
              >
                Start Compliance Check
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};