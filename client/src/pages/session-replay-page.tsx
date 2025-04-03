import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Calendar, Clock, User, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import SessionReplayViewer from '@/components/session-replay/replay-viewer';

export default function SessionReplayPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  // Fetch available sessions that have replays
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['/api/sessions/with-replays'],
    enabled: !!user,
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to fetch sessions with replay data',
        variant: 'destructive',
      });
    },
  });

  const handleSessionChange = (value: string) => {
    setSelectedSessionId(parseInt(value));
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Session Replay</h1>
          <p className="text-muted-foreground">
            Review and analyze recorded training sessions
          </p>
        </div>
        <div className="flex space-x-4">
          <Button variant="outline" onClick={() => setLocation('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Session Selection</CardTitle>
          <CardDescription>
            Select a recorded training session to review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <div className="text-center py-4">
              <p>No recorded sessions available for replay</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setLocation('/sessions')}
              >
                View All Sessions
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Select Session
                </label>
                <Select
                  value={selectedSessionId?.toString() || ''}
                  onValueChange={handleSessionChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a session..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((session: any) => (
                      <SelectItem key={session.id} value={session.id.toString()}>
                        {session.title || `Session #${session.id}`} - {new Date(session.startTime).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedSessionId && sessions && (
                <div className="space-y-2">
                  {sessions.map((session: any) => 
                    session.id === selectedSessionId ? (
                      <React.Fragment key={session.id}>
                        <div className="flex items-center text-sm">
                          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>Date: {new Date(session.startTime).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>
                            Duration: {Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000)} minutes
                          </span>
                        </div>
                        <div className="flex items-center text-sm">
                          <User className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>Instructor: {session.instructorName || 'Unknown'}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>Trainees: {session.traineesCount || '0'}</span>
                        </div>
                      </React.Fragment>
                    ) : null
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSessionId && (
        <SessionReplayViewer sessionId={selectedSessionId} />
      )}
    </div>
  );
}