import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Pause, SkipBack, SkipForward, AlertCircle, MessageSquare } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

interface SessionReplayViewerProps {
  sessionId: number;
}

export default function SessionReplayViewer({ sessionId }: SessionReplayViewerProps) {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [selectedReplayId, setSelectedReplayId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('telemetry');

  // Get session replays for this session
  const { data: replays, isLoading: isLoadingReplays } = useQuery({
    queryKey: ['/api/replays/session', sessionId],
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to load session replays',
        variant: 'destructive',
      });
    },
  });

  // Get events for the selected replay
  const { data: events, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['/api/replays', selectedReplayId, 'events'],
    enabled: !!selectedReplayId,
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to load replay events',
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (replays && replays.length > 0 && !selectedReplayId) {
      setSelectedReplayId(replays[0].id);
    }
  }, [replays, selectedReplayId]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prevTime => {
          const maxTime = 100; // Placeholder for max time, would be based on actual replay duration
          const newTime = prevTime + (playbackRate * 0.5);
          if (newTime >= maxTime) {
            setIsPlaying(false);
            return maxTime;
          }
          return newTime;
        });
      }, 100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackRate]);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleRestart = () => {
    setCurrentTime(0);
    setIsPlaying(true);
  };
  
  const handleTimeChange = (values: number[]) => {
    setCurrentTime(values[0]);
    if (isPlaying) setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Placeholder for actual visualization 
  const renderVisualization = () => {
    if (activeTab === 'telemetry') {
      return (
        <div className="h-[400px] flex items-center justify-center bg-muted/20 rounded-md border">
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">Aircraft Telemetry Visualization</div>
            <p className="text-muted-foreground">
              {isPlaying 
                ? 'Playing simulation at ' + playbackRate + 'x speed...'
                : 'Press play to start the replay visualization'}
            </p>
          </div>
        </div>
      );
    } else if (activeTab === 'cockpit') {
      return (
        <div className="h-[400px] flex items-center justify-center bg-muted/20 rounded-md border">
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">Cockpit View</div>
            <p className="text-muted-foreground">
              Cockpit instrument panels and controls would appear here
            </p>
          </div>
        </div>
      );
    } else {
      return (
        <div className="h-[400px] flex items-center justify-center bg-muted/20 rounded-md border">
          <div className="text-center">
            <div className="text-3xl font-bold mb-2">Performance Analysis</div>
            <p className="text-muted-foreground">
              Performance metrics and analysis would appear here
            </p>
          </div>
        </div>
      );
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoadingReplays) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!replays || replays.length === 0) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold mb-2">No Replays Available</div>
          <p className="text-muted-foreground">
            There are no recorded sessions available for replay
          </p>
        </div>
      </div>
    );
  }

  const selectedReplay = replays.find(r => r.id === selectedReplayId);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Session Replay</CardTitle>
            <CardDescription>
              {selectedReplay ? 
                `${selectedReplay.dataType} data from ${new Date(selectedReplay.startTime).toLocaleString()}` : 
                'Select a replay to view'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="grid grid-cols-3">
                <TabsTrigger value="telemetry">Telemetry</TabsTrigger>
                <TabsTrigger value="cockpit">Cockpit View</TabsTrigger>
                <TabsTrigger value="analysis">Performance Analysis</TabsTrigger>
              </TabsList>
            </Tabs>
            
            {renderVisualization()}
            
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{formatTime(currentTime)}</div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="icon" onClick={() => setPlaybackRate(0.5)}>
                    0.5x
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setPlaybackRate(1)} 
                    className={playbackRate === 1 ? "bg-primary text-primary-foreground" : ""}>
                    1x
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setPlaybackRate(2)}>
                    2x
                  </Button>
                </div>
                <div className="text-sm font-medium">Total: {formatTime(100)}</div>
              </div>
              
              <Slider
                value={[currentTime]}
                max={100}
                step={0.1}
                onValueChange={handleTimeChange}
                className="my-4"
              />
              
              <div className="flex justify-center space-x-2">
                <Button variant="outline" size="icon" onClick={handleRestart}>
                  <SkipBack className="h-4 w-4" />
                </Button>
                {isPlaying ? (
                  <Button variant="outline" size="icon" onClick={handlePause}>
                    <Pause className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button variant="outline" size="icon" onClick={handlePlay}>
                    <Play className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="outline" size="icon" disabled>
                  <SkipForward className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Events Timeline</CardTitle>
            <CardDescription>
              Critical events and annotations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingEvents ? (
              <div className="flex h-[400px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !events || events.length === 0 ? (
              <div className="flex h-[400px] items-center justify-center text-center">
                <p className="text-muted-foreground">No events recorded for this session</p>
              </div>
            ) : (
              <div className="space-y-4 h-[400px] overflow-y-auto pr-2">
                {events.map((event: any) => (
                  <TooltipProvider key={event.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className="flex items-start space-x-3 p-3 hover:bg-muted/50 rounded-md cursor-pointer"
                          onClick={() => {
                            // In a real implementation, set current time to event timestamp
                            toast({
                              title: "Event Selected",
                              description: `Jumping to ${event.eventType} at ${new Date(event.timestamp).toLocaleTimeString()}`
                            });
                          }}
                        >
                          {event.eventType === 'critical_deviation' ? (
                            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                          ) : event.eventType === 'instructor_comment' ? (
                            <MessageSquare className="h-5 w-5 text-blue-500 mt-0.5" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div className="font-medium">{event.eventType.replace('_', ' ')}</div>
                              <Badge className={getSeverityColor(event.severity)}>
                                {event.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {event.description}
                            </p>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Click to jump to this event</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}