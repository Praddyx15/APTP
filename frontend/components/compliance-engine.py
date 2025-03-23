// src/frontend/components/compliance/ComplianceEngine.tsx
import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Tabs, Tab } from '../ui/Tabs';
import { DataTable, Column } from '../ui/DataTable';
import { Alert } from '../ui/Alert';
import { Modal } from '../ui/Modal';

// Types
export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  PARTIALLY_COMPLIANT = 'partiallyCompliant',
  NON_COMPLIANT = 'nonCompliant',
  UNKNOWN = 'unknown'
}

export interface RegulatoryFramework {
  id: string;
  name: string;
  version: string;
  authority: string;
  description: string;
  effectiveDate: Date;
  requirements: RegulatoryRequirement[];
}

export interface RegulatoryRequirement {
  id: string;
  frameworkId: string;
  code: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  applicability: {
    aircraftTypes?: string[];
    pilotTypes?: string[];
    trainingTypes?: string[];
  };
  references?: string[];
}

export interface ComplianceTrainingMapping {
  id: string;
  requirementId: string;
  syllabusElementId: string;
  status: ComplianceStatus;
  coveragePercent: number;
  notes?: string;
  lastChecked: Date;
  checkedBy: string;
}

export interface ComplianceReport {
  id: string;
  trainingProgramId: string;
  trainingProgramName: string;
  frameworkId: string;
  frameworkName: string;
  generatedDate: Date;
  generatedBy: string;
  overallStatus: ComplianceStatus;
  requirementStatuses: {
    requirementId: string;
    status: ComplianceStatus;
    details: string;
    mappings: string[];
  }[];
}

export interface TrainingProgram {
  id: string;
  name: string;
  version: string;
  description: string;
  appliedFrameworks: string[];
  lastCheckedDate?: Date;
  complianceStatus?: ComplianceStatus;
}

// Component
interface RequirementDetailProps {
  requirement: RegulatoryRequirement;
  mappings: ComplianceTrainingMapping[];
  onClose: () => void;
  onAddMapping?: () => void;
}

const RequirementDetail: React.FC<RequirementDetailProps> = ({
  requirement,
  mappings,
  onClose,
  onAddMapping
}) => {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Requirement: ${requirement.code}`}
      size="lg"
    >
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">{requirement.title}</h3>
          <p className="mt-1 text-sm text-gray-500">{requirement.description}</p>
          
          <div className="mt-3 flex items-center space-x-3">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              requirement.priority === 'critical' ? 'bg-red-100 text-red-800' :
              requirement.priority === 'high' ? 'bg-orange-100 text-orange-800' :
              requirement.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {requirement.priority}
            </span>
            
            {requirement.applicability.aircraftTypes && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {requirement.applicability.aircraftTypes.join(', ')}
              </span>
            )}
            
            {requirement.applicability.pilotTypes && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {requirement.applicability.pilotTypes.join(', ')}
              </span>
            )}
          </div>
        </div>
        
        <div>
          <h3 className="text-base font-medium mb-2">Training Mappings</h3>
          
          {mappings.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Syllabus Element
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Coverage
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Checked
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mappings.map(mapping => (
                    <tr key={mapping.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {mapping.syllabusElementId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          mapping.status === ComplianceStatus.COMPLIANT ? 'bg-green-100 text-green-800' :
                          mapping.status === ComplianceStatus.PARTIALLY_COMPLIANT ? 'bg-yellow-100 text-yellow-800' :
                          mapping.status === ComplianceStatus.NON_COMPLIANT ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {mapping.status === ComplianceStatus.COMPLIANT ? 'Compliant' :
                           mapping.status === ComplianceStatus.PARTIALLY_COMPLIANT ? 'Partially Compliant' :
                           mapping.status === ComplianceStatus.NON_COMPLIANT ? 'Non-Compliant' :
                           'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {mapping.coveragePercent}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(mapping.lastChecked).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-md text-center">
              <p className="text-sm text-gray-500">
                No training elements mapped to this requirement.
              </p>
            </div>
          )}
          
          {onAddMapping && (
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={onAddMapping}
              >
                Add Mapping
              </Button>
            </div>
          )}
        </div>
        
        {requirement.references && requirement.references.length > 0 && (
          <div>
            <h3 className="text-base font-medium mb-2">References</h3>
            <ul className="list-disc list-inside text-sm text-gray-500">
              {requirement.references.map((ref, index) => (
                <li key={index}>{ref}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
};

interface ReportDetailProps {
  report: ComplianceReport;
  requirements: RegulatoryRequirement[];
  onClose: () => void;
  onExportPdf?: () => void;
}

const ReportDetail: React.FC<ReportDetailProps> = ({
  report,
  requirements,
  onClose,
  onExportPdf
}) => {
  // Count statuses
  const compliantCount = report.requirementStatuses.filter(s => s.status === ComplianceStatus.COMPLIANT).length;
  const partiallyCompliantCount = report.requirementStatuses.filter(s => s.status === ComplianceStatus.PARTIALLY_COMPLIANT).length;
  const nonCompliantCount = report.requirementStatuses.filter(s => s.status === ComplianceStatus.NON_COMPLIANT).length;
  
  // Calculate compliance percentage
  const totalRequirements = report.requirementStatuses.length;
  const compliancePercentage = Math.round(
    ((compliantCount + (partiallyCompliantCount * 0.5)) / totalRequirements) * 100
  );
  
  // Group requirements by priority
  const requirementsByPriority = {
    critical: report.requirementStatuses.filter(
      s => requirements.find(r => r.id === s.requirementId)?.priority === 'critical'
    ),
    high: report.requirementStatuses.filter(
      s => requirements.find(r => r.id === s.requirementId)?.priority === 'high'
    ),
    medium: report.requirementStatuses.filter(
      s => requirements.find(r => r.id === s.requirementId)?.priority === 'medium'
    ),
    low: report.requirementStatuses.filter(
      s => requirements.find(r => r.id === s.requirementId)?.priority === 'low'
    )
  };
  
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Compliance Report: ${report.trainingProgramName}`}
      size="xl"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-500">Framework</p>
            <p className="text-lg font-medium">{report.frameworkName}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-500">Report Date</p>
            <p className="text-lg font-medium">{new Date(report.generatedDate).toLocaleDateString()}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-500">Generated By</p>
            <p className="text-lg font-medium">{report.generatedBy}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex items-center mb-4 md:mb-0">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                report.overallStatus === ComplianceStatus.COMPLIANT ? 'bg-green-100' :
                report.overallStatus === ComplianceStatus.PARTIALLY_COMPLIANT ? 'bg-yellow-100' :
                'bg-red-100'
              }`}>
                {report.overallStatus === ComplianceStatus.COMPLIANT ? (
                  <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                ) : report.overallStatus === ComplianceStatus.PARTIALLY_COMPLIANT ? (
                  <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                  </svg>
                ) : (
                  <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                )}
              </div>
              
              <div className="ml-4">
                <h3 className="text-xl font-bold">Overall Status</h3>
                <p className="text-lg">
                  {report.overallStatus === ComplianceStatus.COMPLIANT ? 'Compliant' :
                   report.overallStatus === ComplianceStatus.PARTIALLY_COMPLIANT ? 'Partially Compliant' :
                   'Non-Compliant'}
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold">{compliancePercentage}%</div>
              <p className="text-sm text-gray-500">Compliance Rate</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 p-4 rounded-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">Compliant</p>
                  <p className="text-xl font-bold text-green-900">{compliantCount}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                    <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-yellow-800">Partially Compliant</p>
                  <p className="text-xl font-bold text-yellow-900">{partiallyCompliantCount}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                    <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">Non-Compliant</p>
                  <p className="text-xl font-bold text-red-900">{nonCompliantCount}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            {requirementsByPriority.critical.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3">Critical Requirements</h3>
                <div className="bg-gray-50 rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Requirement
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {requirementsByPriority.critical.map(status => {
                        const requirement = requirements.find(r => r.id === status.requirementId);
                        return (
                          <tr key={status.requirementId}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {requirement?.code}
                              </div>
                              <div className="text-sm text-gray-500">
                                {requirement?.title}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                status.status === ComplianceStatus.COMPLIANT ? 'bg-green-100 text-green-800' :
                                status.status === ComplianceStatus.PARTIALLY_COMPLIANT ? 'bg-yellow-100 text-yellow-800' :
                                status.status === ComplianceStatus.NON_COMPLIANT ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {status.status === ComplianceStatus.COMPLIANT ? 'Compliant' :
                                 status.status === ComplianceStatus.PARTIALLY_COMPLIANT ? 'Partially Compliant' :
                                 status.status === ComplianceStatus.NON_COMPLIANT ? 'Non-Compliant' :
                                 'Unknown'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {status.details}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {requirementsByPriority.high.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-3">High Priority Requirements</h3>
                <div className="bg-gray-50 rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Requirement
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {requirementsByPriority.high.map(status => {
                        const requirement = requirements.find(r => r.id === status.requirementId);
                        return (
                          <tr key={status.requirementId}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {requirement?.code}
                              </div>
                              <div className="text-sm text-gray-500">
                                {requirement?.title}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                status.status === ComplianceStatus.COMPLIANT ? 'bg-green-100 text-green-800' :
                                status.status === ComplianceStatus.PARTIALLY_COMPLIANT ? 'bg-yellow-100 text-yellow-800' :
                                status.status === ComplianceStatus.NON_COMPLIANT ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {status.status === ComplianceStatus.COMPLIANT ? 'Compliant' :
                                 status.status === ComplianceStatus.PARTIALLY_COMPLIANT ? 'Partially Compliant' :
                                 status.status === ComplianceStatus.NON_COMPLIANT ? 'Non-Compliant' :
                                 'Unknown'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {status.details}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {onExportPdf && (
          <div className="flex justify-end">
            <Button
              variant="primary"
              onClick={onExportPdf}
            >
              Export Report as PDF
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

// Main Component
interface ComplianceEngineProps {
  frameworks: RegulatoryFramework[];
  trainingPrograms: TrainingProgram[];
  mappings: ComplianceTrainingMapping[];
  reports: ComplianceReport[];
  onCheckCompliance: (programId: string, frameworkId: string) => Promise<ComplianceReport>;
  onGenerateReport: (programId: string, frameworkId: string) => Promise<string>;
  onAddMapping: (requirementId: string, syllabusElementId: string, status: ComplianceStatus) => Promise<void>;
  onUpdateMapping: (mappingId: string, updates: Partial<ComplianceTrainingMapping>) => Promise<void>;
  onExportReport: (reportId: string, format: 'pdf' | 'csv') => Promise<void>;
}

export const ComplianceEngine: React.FC<ComplianceEngineProps> = ({
  frameworks,
  trainingPrograms,
  mappings,
  reports,
  onCheckCompliance,
  onGenerateReport,
  onAddMapping,
  onUpdateMapping,
  onExportReport
}) => {
  const [activeTab, setActiveTab] = useState<'frameworks' | 'training' | 'reports'>('frameworks');
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [selectedRequirement, setSelectedRequirement] = useState<RegulatoryRequirement | null>(null);
  const [selectedReport, setSelectedReport] = useState<ComplianceReport | null>(null);
  const [isCheckingCompliance, setIsCheckingCompliance] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);
  
  // Flatten all requirements from all frameworks
  const allRequirements = frameworks.flatMap(framework => framework.requirements);
  
  // Get framework details by ID
  const getFramework = (id: string) => {
    return frameworks.find(framework => framework.id === id);
  };
  
  // Get training program details by ID
  const getTrainingProgram = (id: string) => {
    return trainingPrograms.find(program => program.id === id);
  };
  
  // Get requirement mappings
  const getRequirementMappings = (requirementId: string) => {
    return mappings.filter(mapping => mapping.requirementId === requirementId);
  };
  
  // Check compliance for a training program
  const handleCheckCompliance = async () => {
    if (!selectedProgram || !selectedFramework) {
      setAlertMessage({
        type: 'error',
        message: 'Please select both a training program and a framework.'
      });
      return;
    }
    
    setIsCheckingCompliance(true);
    
    try {
      const report = await onCheckCompliance(selectedProgram, selectedFramework);
      
      setSelectedReport(report);
      
      setAlertMessage({
        type: 'success',
        message: 'Compliance check completed successfully.'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to check compliance: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsCheckingCompliance(false);
    }
  };
  
  // Generate compliance report
  const handleGenerateReport = async () => {
    if (!selectedProgram || !selectedFramework) {
      setAlertMessage({
        type: 'error',
        message: 'Please select both a training program and a framework.'
      });
      return;
    }
    
    setIsGeneratingReport(true);
    
    try {
      const reportId = await onGenerateReport(selectedProgram, selectedFramework);
      
      const generatedReport = reports.find(report => report.id === reportId);
      if (generatedReport) {
        setSelectedReport(generatedReport);
      }
      
      setAlertMessage({
        type: 'success',
        message: 'Compliance report generated successfully.'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };
  
  // Export report as PDF
  const handleExportReportPdf = async (reportId: string) => {
    try {
      await onExportReport(reportId, 'pdf');
      
      setAlertMessage({
        type: 'success',
        message: 'Report exported successfully.'
      });
    } catch (error) {
      setAlertMessage({
        type: 'error',
        message: `Failed to export report: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };
  
  // Define columns for framework requirements table
  const requirementColumns: Column<RegulatoryRequirement>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (req) => (
        <div className="font-medium text-blue-600 hover:text-blue-900 cursor-pointer">
          {req.code}
        </div>
      ),
      sortable: true
    },
    {
      key: 'title',
      header: 'Title',
      render: (req) => req.title,
      sortable: true
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (req) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          req.priority === 'critical' ? 'bg-red-100 text-red-800' :
          req.priority === 'high' ? 'bg-orange-100 text-orange-800' :
          req.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
        }`}>
          {req.priority}
        </span>
      ),
      sortable: true
    },
    {
      key: 'mappings',
      header: 'Mappings',
      render: (req) => {
        const reqMappings = mappings.filter(m => m.requirementId === req.id);
        const compliantCount = reqMappings.filter(m => m.status === ComplianceStatus.COMPLIANT).length;
        const partialCount = reqMappings.filter(m => m.status === ComplianceStatus.PARTIALLY_COMPLIANT).length;
        const nonCompliantCount = reqMappings.filter(m => m.status === ComplianceStatus.NON_COMPLIANT).length;
        
        return (
          <div className="flex space-x-1">
            {compliantCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                {compliantCount}
              </span>
            )}
            {partialCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                {partialCount}
              </span>
            )}
            {nonCompliantCount > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                {nonCompliantCount}
              </span>
            )}
            {reqMappings.length === 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                0
              </span>
            )}
          </div>
        );
      }
    }
  ];
  
  // Define columns for training programs table
  const programColumns: Column<TrainingProgram>[] = [
    {
      key: 'name',
      header: 'Program Name',
      render: (program) => (
        <div className="font-medium text-blue-600 hover:text-blue-900 cursor-pointer">
          {program.name}
        </div>
      ),
      sortable: true
    },
    {
      key: 'version',
      header: 'Version',
      render: (program) => program.version,
      sortable: true
    },
    {
      key: 'frameworks',
      header: 'Frameworks',
      render: (program) => {
        return (
          <div className="flex flex-wrap gap-1">
            {program.appliedFrameworks.map(frameworkId => {
              const framework = frameworks.find(f => f.id === frameworkId);
              return framework ? (
                <span key={frameworkId} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {framework.name}
                </span>
              ) : null;
            })}
          </div>
        );
      }
    },
    {
      key: 'compliance',
      header: 'Compliance Status',
      render: (program) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          program.complianceStatus === ComplianceStatus.COMPLIANT ? 'bg-green-100 text-green-800' :
          program.complianceStatus === ComplianceStatus.PARTIALLY_COMPLIANT ? 'bg-yellow-100 text-yellow-800' :
          program.complianceStatus === ComplianceStatus.NON_COMPLIANT ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {program.complianceStatus === ComplianceStatus.COMPLIANT ? 'Compliant' :
           program.complianceStatus === ComplianceStatus.PARTIALLY_COMPLIANT ? 'Partially Compliant' :
           program.complianceStatus === ComplianceStatus.NON_COMPLIANT ? 'Non-Compliant' :
           'Not Checked'}
        </span>
      ),
      sortable: true
    },
    {
      key: 'lastChecked',
      header: 'Last Checked',
      render: (program) => program.lastCheckedDate ? new Date(program.lastCheckedDate).toLocaleDateString() : 'Never',
      sortable: true
    }
  ];
  
  // Define columns for reports table
  const reportColumns: Column<ComplianceReport>[] = [
    {
      key: 'trainingProgramName',
      header: 'Program',
      render: (report) => (
        <div className="font-medium text-blue-600 hover:text-blue-900 cursor-pointer">
          {report.trainingProgramName}
        </div>
      ),
      sortable: true
    },
    {
      key: 'frameworkName',
      header: 'Framework',
      render: (report) => report.frameworkName,
      sortable: true
    },
    {
      key: 'generatedDate',
      header: 'Date',
      render: (report) => new Date(report.generatedDate).toLocaleDateString(),
      sortable: true
    },
    {
      key: 'overallStatus',
      header: 'Status',
      render: (report) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          report.overallStatus === ComplianceStatus.COMPLIANT ? 'bg-green-100 text-green-800' :
          report.overallStatus === ComplianceStatus.PARTIALLY_COMPLIANT ? 'bg-yellow-100 text-yellow-800' :
          report.overallStatus === ComplianceStatus.NON_COMPLIANT ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {report.overallStatus === ComplianceStatus.COMPLIANT ? 'Compliant' :
           report.overallStatus === ComplianceStatus.PARTIALLY_COMPLIANT ? 'Partially Compliant' :
           report.overallStatus === ComplianceStatus.NON_COMPLIANT ? 'Non-Compliant' :
           'Unknown'}
        </span>
      ),
      sortable: true
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (report) => (
        <div className="flex space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExportReportPdf(report.id);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="Export as PDF"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
            </svg>
          </button>
        </div>
      )
    }
  ];
  
  const tabs: Tab[] = [
    {
      id: 'frameworks',
      label: 'Regulatory Frameworks',
      content: (
        <div className="space-y-6">
          {/* Framework selector */}
          <Card>
            <div className="mb-4">
              <label htmlFor="framework-select" className="block text-sm font-medium text-gray-700">
                Select Regulatory Framework
              </label>
              <select
                id="framework-select"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={selectedFramework || ''}
                onChange={(e) => setSelectedFramework(e.target.value || null)}
              >
                <option value="">-- Select Framework --</option>
                {frameworks.map(framework => (
                  <option key={framework.id} value={framework.id}>
                    {framework.name} (v{framework.version})
                  </option>
                ))}
              </select>
            </div>
            
            {selectedFramework && (
              <div>
                {frameworks
                  .filter(framework => framework.id === selectedFramework)
                  .map(framework => (
                    <div key={framework.id}>
                      <h3 className="text-lg font-medium mb-2">{framework.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">{framework.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500">Authority</p>
                          <p className="font-medium">{framework.authority}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Version</p>
                          <p className="font-medium">{framework.version}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Effective Date</p>
                          <p className="font-medium">{new Date(framework.effectiveDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </Card>
          
          {/* Requirements table */}
          {selectedFramework && (
            <Card>
              <div className="mb-4">
                <h3 className="text-lg font-medium">Requirements</h3>
              </div>
              
              <DataTable
                columns={requirementColumns}
                data={frameworks
                  .filter(framework => framework.id === selectedFramework)
                  .flatMap(framework => framework.requirements)}
                keyExtractor={(req) => req.id}
                onRowClick={(req) => setSelectedRequirement(req)}
              />
            </Card>
          )}
        </div>
      )
    },
    {
      id: 'training',
      label: 'Training Programs',
      content: (
        <div className="space-y-6">
          {/* Compliance check card */}
          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-medium">Check Compliance</h3>
              <p className="text-sm text-gray-500">Select a training program and regulatory framework to check compliance.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="program-select" className="block text-sm font-medium text-gray-700">
                  Select Training Program
                </label>
                <select
                  id="program-select"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={selectedProgram || ''}
                  onChange={(e) => setSelectedProgram(e.target.value || null)}
                >
                  <option value="">-- Select Program --</option>
                  {trainingPrograms.map(program => (
                    <option key={program.id} value={program.id}>
                      {program.name} (v{program.version})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="framework-select-check" className="block text-sm font-medium text-gray-700">
                  Select Regulatory Framework
                </label>
                <select
                  id="framework-select-check"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={selectedFramework || ''}
                  onChange={(e) => setSelectedFramework(e.target.value || null)}
                >
                  <option value="">-- Select Framework --</option>
                  {frameworks.map(framework => (
                    <option key={framework.id} value={framework.id}>
                      {framework.name} (v{framework.version})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="primary"
                onClick={handleCheckCompliance}
                isLoading={isCheckingCompliance}
                disabled={isCheckingCompliance || !selectedProgram || !selectedFramework}
              >
                Check Compliance
              </Button>
              
              <Button
                variant="outline"
                onClick={handleGenerateReport}
                isLoading={isGeneratingReport}
                disabled={isGeneratingReport || !selectedProgram || !selectedFramework}
              >
                Generate Report
              </Button>
            </div>
          </Card>
          
          {/* Training programs table */}
          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-medium">Training Programs</h3>
            </div>
            
            <DataTable
              columns={programColumns}
              data={trainingPrograms}
              keyExtractor={(program) => program.id}
              onRowClick={(program) => setSelectedProgram(program.id)}
            />
          </Card>
        </div>
      )
    },
    {
      id: 'reports',
      label: 'Compliance Reports',
      content: (
        <div className="space-y-6">
          {/* Reports table */}
          <Card>
            <div className="mb-4">
              <h3 className="text-lg font-medium">Generated Reports</h3>
            </div>
            
            {reports.length > 0 ? (
              <DataTable
                columns={reportColumns}
                data={reports}
                keyExtractor={(report) => report.id}
                onRowClick={(report) => setSelectedReport(report)}
              />
            ) : (
              <div className="p-8 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path>
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No reports</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Generate a compliance report to see it here.
                </p>
                <div className="mt-6">
                  <Button
                    variant="primary"
                    onClick={() => setActiveTab('training')}
                  >
                    Generate Report
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )
    }
  ];

  return (
    <div className="compliance-engine">
      {/* Alert message */}
      {alertMessage && (
        <Alert
          type={alertMessage.type}
          message={alertMessage.message}
          onClose={() => setAlertMessage(null)}
        />
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Regulatory Compliance Engine</h2>
      </div>
      
      {/* Main tabs */}
      <Tabs
        tabs={tabs}
        defaultTabId="frameworks"
        onChange={(tabId) => setActiveTab(tabId as any)}
      />
      
      {/* Requirement Detail Modal */}
      {selectedRequirement && (
        <RequirementDetail
          requirement={selectedRequirement}
          mappings={getRequirementMappings(selectedRequirement.id)}
          onClose={() => setSelectedRequirement(null)}
          onAddMapping={() => {
            // In a real implementation, this would open a modal to add a new mapping
            console.log('Add mapping for', selectedRequirement.id);
          }}
        />
      )}
      
      {/* Report Detail Modal */}
      {selectedReport && (
        <ReportDetail
          report={selectedReport}
          requirements={allRequirements}
          onClose={() => setSelectedReport(null)}
          onExportPdf={() => handleExportReportPdf(selectedReport.id)}
        />
      )}
    </div>
  );
};