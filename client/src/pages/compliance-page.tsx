import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, 
  ArrowLeft, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  AreaChart, 
  FileText,
  History 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import ComplianceStatus from '@/components/regulatory/compliance-status';
import RequirementsTable from '@/components/regulatory/requirements-table';
import { RegulatoryRequirement, TrainingProgram } from '@shared/schema';
import { queryClient, apiRequest } from '@/lib/queryClient';

export default function CompliancePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [currentTab, setCurrentTab] = useState('overview');
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState<RegulatoryRequirement | null>(null);
  const [complianceNote, setComplianceNote] = useState('');

  // Fetch training programs
  const { data: programs, isLoading: isLoadingPrograms } = useQuery({
    queryKey: ['/api/programs'],
    enabled: !!user,
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to load training programs',
        variant: 'destructive',
      });
    },
  });

  // Fetch regulatory requirements
  const { data: requirements, isLoading: isLoadingRequirements } = useQuery({
    queryKey: ['/api/regulatory-requirements'],
    enabled: !!user,
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to load regulatory requirements',
        variant: 'destructive',
      });
    },
  });

  // Fetch program compliance data
  const { data: programCompliance, isLoading: isLoadingCompliance } = useQuery({
    queryKey: ['/api/program-compliance', selectedProgramId],
    enabled: !!selectedProgramId,
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to load compliance data',
        variant: 'destructive',
      });
    },
  });

  // Fetch compliance history
  const { data: complianceHistory, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['/api/program-compliance/history', selectedProgramId],
    enabled: !!selectedProgramId && currentTab === 'history',
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to load compliance history',
        variant: 'destructive',
      });
    },
  });

  // Update compliance status mutation
  const { mutate: updateCompliance, isPending: isUpdating } = useMutation({
    mutationFn: async ({ 
      requirementId, 
      status 
    }: { 
      requirementId: number; 
      status: 'compliant' | 'partial' | 'non-compliant'; 
    }) => {
      if (!selectedProgramId) throw new Error('No program selected');
      
      const res = await apiRequest('POST', `/api/program-compliance/${selectedProgramId}/update`, {
        requirementId,
        status,
        note: complianceNote,
        updatedBy: user?.id
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Compliance Updated',
        description: 'The compliance status has been updated successfully',
      });
      setShowDetailDialog(false);
      setComplianceNote('');
      queryClient.invalidateQueries({ queryKey: ['/api/program-compliance', selectedProgramId] });
      queryClient.invalidateQueries({ queryKey: ['/api/program-compliance/history', selectedProgramId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update compliance: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleRequirementView = (requirement: RegulatoryRequirement) => {
    setSelectedRequirement(requirement);
    setShowDetailDialog(true);
  };

  const handleMarkCompliant = (requirement: RegulatoryRequirement) => {
    setSelectedRequirement(requirement);
    setShowDetailDialog(true);
  };

  const handleUpdateCompliance = (status: 'compliant' | 'partial' | 'non-compliant') => {
    if (!selectedRequirement) return;
    
    updateCompliance({
      requirementId: selectedRequirement.id,
      status
    });
  };

  const isLoading = isLoadingPrograms || isLoadingRequirements || isLoadingCompliance || isLoadingHistory;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Regulatory Compliance</h1>
          <p className="text-muted-foreground">
            Monitor and manage regulatory compliance for your training programs
          </p>
        </div>
        <div className="flex space-x-4">
          <Button variant="outline" onClick={() => setLocation('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <ShieldCheck className="mr-2 h-5 w-5 text-primary" />
              Compliance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
              <div className="w-full md:w-1/3">
                <Label htmlFor="program-select">Select Training Program</Label>
                {isLoadingPrograms ? (
                  <div className="flex items-center mt-2">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading programs...
                  </div>
                ) : (
                  <Select
                    value={selectedProgramId?.toString() || ''}
                    onValueChange={(value) => setSelectedProgramId(parseInt(value))}
                    disabled={!programs || programs.length === 0}
                  >
                    <SelectTrigger id="program-select" className="mt-2">
                      <SelectValue placeholder="Select a training program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs?.map((program: TrainingProgram) => (
                        <SelectItem key={program.id} value={program.id.toString()}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              
              {selectedProgramId && (
                <div className="w-full md:w-2/3 flex items-end justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentTab('requirements')}
                    className="flex-1 md:flex-initial"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View Requirements
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentTab('history')}
                    className="flex-1 md:flex-initial"
                  >
                    <History className="mr-2 h-4 w-4" />
                    View History
                  </Button>
                  <Button 
                    onClick={() => {
                      toast({
                        title: 'Generating Report',
                        description: 'Compliance report generation started...'
                      });
                    }}
                    className="flex-1 md:flex-initial"
                  >
                    <AreaChart className="mr-2 h-4 w-4" />
                    Generate Report
                  </Button>
                </div>
              )}
            </div>

            {!selectedProgramId ? (
              <div className="text-center py-12 border rounded-md bg-muted/10">
                <div className="flex justify-center mb-4">
                  <ShieldCheck className="h-16 w-16 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No Program Selected</h3>
                <p className="text-muted-foreground mb-4">
                  Select a training program to view and manage compliance
                </p>
              </div>
            ) : (
              <Tabs value={currentTab} onValueChange={setCurrentTab}>
                <TabsList className="grid grid-cols-3 mb-6">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="requirements">Requirements</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-0 space-y-6">
                  {isLoadingCompliance ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <>
                      <div className="grid md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                          <ComplianceStatus
                            programId={selectedProgramId}
                            programCompliance={programCompliance}
                            requirements={requirements}
                          />
                        </div>
                        <div>
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg">Audit Summary</CardTitle>
                            </CardHeader>
                            <CardContent>
                              {!programCompliance ? (
                                <div className="text-center py-6">
                                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                  <p className="text-muted-foreground">
                                    No audit data available
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm">Last Audit:</span>
                                    <span className="text-sm font-medium">
                                      {programCompliance.lastAuditDate 
                                        ? new Date(programCompliance.lastAuditDate).toLocaleDateString() 
                                        : 'Never'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm">Audited By:</span>
                                    <span className="text-sm font-medium">
                                      {programCompliance.lastAuditBy || 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm">Next Audit Due:</span>
                                    <span className="text-sm font-medium">
                                      {programCompliance.nextAuditDate 
                                        ? new Date(programCompliance.nextAuditDate).toLocaleDateString() 
                                        : 'Not scheduled'}
                                    </span>
                                  </div>
                                  <div className="pt-4 border-t">
                                    <Button 
                                      variant="outline" 
                                      className="w-full"
                                      onClick={() => {
                                        toast({
                                          title: 'Audit Initiated',
                                          description: 'A new compliance audit has been started',
                                        });
                                      }}
                                    >
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                      Start New Audit
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                      
                      {programCompliance && programCompliance.nonCompliantRequirementIds && 
                       programCompliance.nonCompliantRequirementIds.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-950/30 p-6 rounded-lg border border-red-200 dark:border-red-800">
                          <div className="flex items-center mb-4">
                            <AlertTriangle className="h-6 w-6 text-red-600 mr-2" />
                            <h3 className="text-lg font-medium text-red-700 dark:text-red-400">
                              Compliance Issues Requiring Attention
                            </h3>
                          </div>
                          <div className="space-y-4">
                            <p className="text-red-600 dark:text-red-400">
                              The following regulatory requirements need to be addressed to ensure compliance:
                            </p>
                            <div className="max-h-64 overflow-y-auto pr-2">
                              <ul className="space-y-2">
                                {programCompliance.nonCompliantRequirementIds.map(reqId => {
                                  const req = requirements?.find(r => r.id === reqId);
                                  return req ? (
                                    <li key={reqId} className="flex items-start p-3 bg-white dark:bg-red-950/50 rounded border border-red-100 dark:border-red-900">
                                      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                                      <div>
                                        <div className="font-medium">{req.code}: {req.description}</div>
                                        <div className="text-sm text-red-500 mt-1">
                                          Authority: {req.authority} | Version: {req.version}
                                        </div>
                                        <Button 
                                          variant="link" 
                                          className="text-red-600 p-0 h-auto mt-1"
                                          onClick={() => handleRequirementView(req)}
                                        >
                                          View Details
                                        </Button>
                                      </div>
                                    </li>
                                  ) : null;
                                })}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
                
                <TabsContent value="requirements" className="mt-0">
                  {isLoadingRequirements || isLoadingCompliance ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <RequirementsTable
                      requirements={requirements || []}
                      compliantIds={programCompliance?.compliantRequirementIds || []}
                      partialIds={programCompliance?.partiallyCompliantRequirementIds || []}
                      nonCompliantIds={programCompliance?.nonCompliantRequirementIds || []}
                      onViewRequirement={handleRequirementView}
                      onMarkCompliant={handleMarkCompliant}
                    />
                  )}
                </TabsContent>
                
                <TabsContent value="history" className="mt-0">
                  {isLoadingHistory ? (
                    <div className="flex justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : !complianceHistory || complianceHistory.length === 0 ? (
                    <div className="text-center py-12 border rounded-md bg-muted/10">
                      <div className="flex justify-center mb-4">
                        <History className="h-16 w-16 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium mb-2">No Compliance History</h3>
                      <p className="text-muted-foreground mb-4">
                        There is no recorded compliance history for this program
                      </p>
                    </div>
                  ) : (
                    <div className="border rounded-md divide-y">
                      {complianceHistory.map((historyItem: any) => (
                        <div key={historyItem.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">
                                {historyItem.action === 'update' ? 'Compliance Status Updated' : 
                                 historyItem.action === 'audit' ? 'Compliance Audit Performed' :
                                 'Compliance Change'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(historyItem.timestamp).toLocaleString()}
                              </div>
                            </div>
                            {historyItem.overallStatus && (
                              <div className="text-sm">
                                Overall Status: {historyItem.overallStatus}
                              </div>
                            )}
                          </div>
                          
                          {historyItem.changes && historyItem.changes.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <div className="text-sm font-medium">Changes:</div>
                              <ul className="space-y-1 text-sm">
                                {historyItem.changes.map((change: any, index: number) => {
                                  const req = requirements?.find(r => r.id === change.requirementId);
                                  return (
                                    <li key={index} className="flex items-start">
                                      <div className="mr-2">•</div>
                                      <div>
                                        {req ? `${req.code}: ${req.description}` : `Requirement #${change.requirementId}`} - 
                                        Status changed from {change.previousStatus || 'Unknown'} to {change.newStatus}
                                        {change.note && (
                                          <div className="text-xs text-muted-foreground mt-1">
                                            Note: {change.note}
                                          </div>
                                        )}
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                          
                          <div className="mt-3 text-xs text-muted-foreground">
                            By: {historyItem.userName || 'System'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Requirement Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Requirement Details</DialogTitle>
            <DialogDescription>
              View requirement details and update compliance status
            </DialogDescription>
          </DialogHeader>
          {selectedRequirement && (
            <div className="space-y-4 py-2">
              <div>
                <div className="text-sm font-medium">Code</div>
                <div className="font-mono">{selectedRequirement.code}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Authority</div>
                <div>{selectedRequirement.authority}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Description</div>
                <div>{selectedRequirement.description}</div>
              </div>
              {selectedRequirement.url && (
                <div>
                  <div className="text-sm font-medium">Reference</div>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto"
                    onClick={() => window.open(selectedRequirement.url, '_blank')}
                  >
                    <ExternalLink className="mr-1 h-4 w-4" />
                    View Original Document
                  </Button>
                </div>
              )}
              <div>
                <Label htmlFor="compliance-note">Compliance Note</Label>
                <Textarea
                  id="compliance-note"
                  placeholder="Enter compliance details or notes"
                  className="mt-1"
                  value={complianceNote}
                  onChange={(e) => setComplianceNote(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
            <div className="flex gap-2">
              <Button 
                variant="destructive" 
                onClick={() => handleUpdateCompliance('non-compliant')}
                disabled={isUpdating}
              >
                Non-Compliant
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleUpdateCompliance('partial')}
                className="border-amber-500 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950"
                disabled={isUpdating}
              >
                Partial
              </Button>
            </div>
            <Button 
              onClick={() => handleUpdateCompliance('compliant')}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>Mark as Compliant</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}