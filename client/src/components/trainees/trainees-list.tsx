import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Mail, Phone, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { User } from "@shared/schema";
import { format } from "date-fns";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

interface TraineesListProps {
  searchQuery: string;
}

export default function TraineesList({ searchQuery }: TraineesListProps) {
  // Fetch trainees
  const { data: trainees = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/protected/users/trainees"],
  });

  // Filter trainees based on search query
  const filteredTrainees = useMemo(() => {
    if (!trainees) return [];
    
    return trainees.filter(trainee => 
      trainee.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trainee.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trainee.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [trainees, searchQuery]);

  // Define columns for trainees table
  const columns: ColumnDef<User, any>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const trainee = row.original;
        
        return (
          <div className="flex items-center">
            <div className="h-9 w-9 rounded-full bg-sky-100 flex items-center justify-center text-sm mr-3">
              {trainee.firstName.charAt(0)}{trainee.lastName.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800">{trainee.firstName} {trainee.lastName}</p>
              <p className="text-xs text-slate-500">{trainee.username}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => {
        return (
          <div className="flex items-center">
            <Mail className="h-4 w-4 text-slate-400 mr-2" />
            <span className="text-sm text-slate-800">{row.original.email}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "progress",
      header: "Progress",
      cell: () => {
        // This would be calculated from the trainee's completed sessions and assessments
        const progress = Math.floor(Math.random() * 100); // Mock data for UI demonstration
        return (
          <div className="w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-200">
            <div 
              className="bg-blue-500 h-2.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: () => {
        // Mock statuses for UI demonstration
        const statuses = ['Active', 'On Leave', 'Complete'];
        const statusColors = {
          'Active': 'bg-green-100 text-green-800',
          'On Leave': 'bg-amber-100 text-amber-800',
          'Complete': 'bg-blue-100 text-blue-800'
        };
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors]}`}>
            {status}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: () => {
        return (
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600"
            >
              View Profile
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Trainees</h1>
        <p className="text-slate-500">Manage and view trainee profiles and progress</p>
      </div>
      
      {/* Trainees stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-md">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Total Trainees</p>
              <p className="text-2xl font-semibold text-slate-800">{trainees.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="bg-green-100 p-3 rounded-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Completed Training</p>
              <p className="text-2xl font-semibold text-slate-800">{Math.floor(trainees.length * 0.3)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <div className="flex items-center">
            <div className="bg-amber-100 p-3 rounded-md">
              <Calendar className="h-6 w-6 text-amber-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-500">Active Sessions</p>
              <p className="text-2xl font-semibold text-slate-800">{Math.floor(trainees.length * 0.5)}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Trainees table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredTrainees}
            pageSize={10}
          />
        )}
      </div>
    </div>
  );
}
