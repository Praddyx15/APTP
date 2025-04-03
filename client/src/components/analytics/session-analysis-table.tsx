import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface SessionAnalysisData {
  id: number;
  date: string;
  trainees: string[];
  duration: number;
  completionRate: number;
  averageScore: number;
  performanceIssues: string[];
  criticalEvents: number;
}

export default function SessionAnalysisTable() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<string>('month');
  
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['/api/analytics/sessions', timeframe],
  });
  
  // Function to process data for display
  const processSessionData = (data: any): SessionAnalysisData[] => {
    if (!data || !data.sessions) return [];
    
    return data.sessions.map((session: any) => ({
      id: session.id,
      date: new Date(session.startTime).toLocaleDateString(),
      trainees: session.trainees.map((t: any) => t.username).join(', '),
      duration: Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000), // minutes
      completionRate: session.completionRate,
      averageScore: session.averageScore,
      performanceIssues: session.performanceIssues || [],
      criticalEvents: session.criticalEvents || 0
    }));
  };
  
  const timeframeOptions = [
    { value: 'week', label: 'Last Week' },
    { value: 'month', label: 'Last Month' },
    { value: 'quarter', label: 'Last Quarter' },
    { value: 'year', label: 'Last Year' }
  ];
  
  const getPerformanceBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-green-300';
    if (score >= 60) return 'bg-yellow-400';
    return 'bg-red-500';
  };
  
  const sessionData = sessions ? processSessionData(sessions) : [];
  
  return (
    <Card className="col-span-3">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Session Analysis</CardTitle>
        <Select
          value={timeframe}
          onValueChange={setTimeframe}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            {timeframeOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sessionData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            No session data available for the selected timeframe
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Trainees</TableHead>
                  <TableHead className="text-right">Duration (min)</TableHead>
                  <TableHead className="text-right">Completion</TableHead>
                  <TableHead className="text-right">Avg. Score</TableHead>
                  <TableHead>Performance Issues</TableHead>
                  <TableHead className="text-right">Critical Events</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionData.map(session => (
                  <TableRow key={session.id}>
                    <TableCell>{session.date}</TableCell>
                    <TableCell className="max-w-[150px] truncate" title={session.trainees}>
                      {session.trainees}
                    </TableCell>
                    <TableCell className="text-right">{session.duration}</TableCell>
                    <TableCell className="text-right">{session.completionRate}%</TableCell>
                    <TableCell className="text-right">
                      <Badge className={getPerformanceBadgeColor(session.averageScore)}>
                        {session.averageScore}%
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="flex flex-wrap gap-1">
                        {session.performanceIssues.slice(0, 2).map((issue: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {issue}
                          </Badge>
                        ))}
                        {session.performanceIssues.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{session.performanceIssues.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {session.criticalEvents > 0 ? (
                        <Badge variant="destructive">{session.criticalEvents}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}