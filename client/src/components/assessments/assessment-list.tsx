import { useApp } from "@/contexts/app-context";
import { useQuery } from "@tanstack/react-query";
import { FileText, Edit, PlusCircle, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Assessment, User, Session } from "@shared/schema";
import { format } from "date-fns";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

export default function AssessmentsList() {
  const { 
    assessments, 
    handleCreateAssessment, 
    handleEditAssessment 
  } = useApp();

  // Fetch trainees
  const { data: trainees } = useQuery<User[]>({
    queryKey: ["/api/protected/users/trainees"],
  });

  // Fetch sessions
  const { data: sessions } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  // Build columns for the data table
  const columns: ColumnDef<Assessment, any>[] = [
    {
      accessorKey: "trainee",
      header: "Trainee",
      cell: ({ row }) => {
        const assessment = row.original;
        const trainee = trainees?.find(t => t.id === assessment.traineeId);
        
        return trainee ? (
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-sky-100 flex items-center justify-center text-sm mr-3">
              {trainee.firstName.charAt(0)}{trainee.lastName.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{trainee.firstName} {trainee.lastName}</p>
              <p className="text-xs text-slate-500">{trainee.email}</p>
            </div>
          </div>
        ) : (
          <span className="text-sm text-slate-500">Unknown trainee</span>
        );
      },
    },
    {
      accessorKey: "session",
      header: "Session",
      cell: ({ row }) => {
        const assessment = row.original;
        const session = sessions?.find(s => s.id === assessment.sessionId);
        
        return session ? (
          <div>
            <p className="text-sm text-slate-800">
              {format(new Date(session.startTime), 'MMM dd, yyyy')}
            </p>
            <p className="text-xs text-slate-500">
              {format(new Date(session.startTime), 'h:mm a')} - {format(new Date(session.endTime), 'h:mm a')}
            </p>
          </div>
        ) : (
          <span className="text-sm text-slate-500">Unknown session</span>
        );
      },
    },
    {
      accessorKey: "date",
      header: "Assessment Date",
      cell: ({ row }) => {
        return (
          <span className="text-sm text-slate-800">
            {format(new Date(row.original.date), 'MMM dd, yyyy')}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const assessment = row.original;
        
        return (
          <div className="flex items-center">
            {assessment.status === 'graded' ? (
              <span className="inline-flex items-center text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full text-xs font-medium">
                <Check className="h-3.5 w-3.5 mr-1" />
                Graded
              </span>
            ) : (
              <span className="inline-flex items-center text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full text-xs font-medium">
                <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                Pending
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        return (
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600"
              onClick={() => handleEditAssessment(row.original.id)}
            >
              {row.original.status === 'pending' ? 'Grade' : 'View'}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Assessments</h1>
          <p className="text-slate-500">Evaluate trainee performance and provide feedback</p>
        </div>
        <Button
          className="text-sm bg-blue-500 hover:bg-blue-600 text-white"
          onClick={handleCreateAssessment}
        >
          <PlusCircle className="h-4 w-4 mr-1.5" />
          Create Assessment
        </Button>
      </div>
      
      {/* Tabs for assessment status filtering */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="-mb-px flex space-x-6">
          <button className="py-2 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600">
            All Assessments
          </button>
          <button className="py-2 px-1 border-b-2 border-transparent font-medium text-sm text-slate-500 hover:text-slate-700 hover:border-slate-300">
            Pending
          </button>
          <button className="py-2 px-1 border-b-2 border-transparent font-medium text-sm text-slate-500 hover:text-slate-700 hover:border-slate-300">
            Graded
          </button>
        </nav>
      </div>
      
      {/* Assessments table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {assessments && assessments.length > 0 ? (
          <DataTable
            columns={columns}
            data={assessments}
            pageSize={10}
          />
        ) : (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-800 mb-2">No assessments found</h3>
            <p className="text-slate-500 mb-4">
              There are no assessments available at the moment.
            </p>
            <Button
              className="text-sm bg-blue-500 hover:bg-blue-600 text-white"
              onClick={handleCreateAssessment}
            >
              <PlusCircle className="h-4 w-4 mr-1.5" />
              Create Assessment
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
