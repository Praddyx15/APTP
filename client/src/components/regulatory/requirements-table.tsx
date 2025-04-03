import React, { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  ColumnFiltersState,
  getFilteredRowModel,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Filter, 
  MoreVertical, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Eye, 
  ThumbsUp, 
  CalendarRange 
} from 'lucide-react';
import { RegulatoryRequirement } from '@shared/schema';

interface RequirementsTableProps {
  requirements: RegulatoryRequirement[];
  compliantIds?: number[];
  partialIds?: number[];
  nonCompliantIds?: number[];
  onViewRequirement?: (requirement: RegulatoryRequirement) => void;
  onMarkCompliant?: (requirement: RegulatoryRequirement) => void;
}

export default function RequirementsTable({
  requirements,
  compliantIds = [],
  partialIds = [],
  nonCompliantIds = [],
  onViewRequirement,
  onMarkCompliant,
}: RequirementsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [filterAuthority, setFilterAuthority] = useState<string>('all');

  const getComplianceStatus = (reqId: number) => {
    if (compliantIds.includes(reqId)) return 'compliant';
    if (partialIds.includes(reqId)) return 'partial';
    if (nonCompliantIds.includes(reqId)) return 'non-compliant';
    return 'unknown';
  };

  const renderComplianceStatus = (status: string) => {
    switch (status) {
      case 'compliant':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Compliant
          </Badge>
        );
      case 'partial':
        return (
          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
            <AlertCircle className="mr-1 h-3 w-3" />
            Partial
          </Badge>
        );
      case 'non-compliant':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
            <XCircle className="mr-1 h-3 w-3" />
            Non-Compliant
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            Not Evaluated
          </Badge>
        );
    }
  };

  // Define columns
  const columns: ColumnDef<RegulatoryRequirement>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => <div className="font-mono">{row.getValue('code')}</div>,
    },
    {
      accessorKey: 'authority',
      header: 'Authority',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.getValue('authority')}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        return value === 'all' || row.getValue(id) === value;
      },
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <div className="max-w-[400px] truncate" title={row.getValue('description')}>
          {row.getValue('description')}
        </div>
      ),
    },
    {
      accessorKey: 'effectiveDate',
      header: 'Effective Date',
      cell: ({ row }) => {
        const date = row.getValue('effectiveDate');
        return date ? new Date(date as string).toLocaleDateString() : 'N/A';
      },
    },
    {
      id: 'compliance',
      header: 'Compliance Status',
      cell: ({ row }) => renderComplianceStatus(getComplianceStatus(row.original.id)),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onViewRequirement && (
                <DropdownMenuItem onClick={() => onViewRequirement(row.original)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
              )}
              {row.original.url && (
                <DropdownMenuItem onClick={() => window.open(row.original.url, '_blank')}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Original
                </DropdownMenuItem>
              )}
              {onMarkCompliant && getComplianceStatus(row.original.id) !== 'compliant' && (
                <DropdownMenuItem onClick={() => onMarkCompliant(row.original)}>
                  <ThumbsUp className="mr-2 h-4 w-4" />
                  Mark as Compliant
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  // Get unique authorities for filtering
  const authorities = ['all', ...new Set(requirements.map(req => req.authority))];

  const table = useReactTable({
    data: requirements,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility: { effectiveDate: false },
      globalFilter: filterAuthority !== 'all' ? filterAuthority : undefined,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getSortedRowModel: getSortedRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filter requirements..."
            value={(table.getColumn('description')?.getFilterValue() as string) ?? ''}
            onChange={(e) => table.getColumn('description')?.setFilterValue(e.target.value)}
            className="max-w-md"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => table.getColumn('description')?.setFilterValue('')}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear filter</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {authorities.map(authority => (
            <Badge
              key={authority}
              variant={filterAuthority === authority ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilterAuthority(authority)}
            >
              {authority === 'all' ? 'All Authorities' : authority}
            </Badge>
          ))}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No requirements found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex items-center justify-between space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          Showing{" "}
          <strong>
            {table.getFilteredRowModel().rows.length} of {requirements.length}
          </strong>{" "}
          requirements
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}