import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Medal, Trophy, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface LeaderboardProps {
  compact?: boolean;
}

export default function Leaderboard({ compact = false }: LeaderboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('overall');
  const [periodTab, setPeriodTab] = useState('allTime');
  
  // Fetch leaderboard data
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['/api/leaderboard', selectedCategory, periodTab],
    enabled: !!user,
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to fetch leaderboard data',
        variant: 'destructive',
      });
    },
  });
  
  const getUserRank = () => {
    if (!leaderboard || !user) return null;
    const userEntry = leaderboard.find((entry: any) => entry.userId === user.id);
    return userEntry ? leaderboard.indexOf(userEntry) + 1 : null;
  };
  
  const userRank = getUserRank();
  
  const getMedalColor = (position: number) => {
    switch (position) {
      case 1: return 'text-yellow-500';
      case 2: return 'text-gray-400';
      case 3: return 'text-amber-700';
      default: return 'text-muted-foreground';
    }
  };
  
  const getMedalIcon = (position: number) => {
    switch (position) {
      case 1: return <Trophy className={`h-5 w-5 ${getMedalColor(position)}`} />;
      case 2: return <Medal className={`h-5 w-5 ${getMedalColor(position)}`} />;
      case 3: return <Award className={`h-5 w-5 ${getMedalColor(position)}`} />;
      default: return <span className="h-5 w-5 flex items-center justify-center font-bold">{position}</span>;
    }
  };
  
  return (
    <Card className={compact ? "" : "h-full"}>
      <CardHeader className={compact ? "p-4" : ""}>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Leaderboard</CardTitle>
            <CardDescription>
              See how you rank among other trainees
            </CardDescription>
          </div>
          {!compact && userRank !== null && (
            <Badge variant="outline" className="px-3 py-1">
              Your Rank: #{userRank}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className={compact ? "p-4 pt-0" : ""}>
        {!compact && (
          <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0 sm:space-x-4 mb-6">
            <Tabs 
              value={periodTab} 
              onValueChange={setPeriodTab}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="allTime">All Time</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
              className="w-full sm:w-48"
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overall">Overall</SelectItem>
                <SelectItem value="achievements">Achievements</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
                <SelectItem value="attendance">Attendance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !leaderboard || leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No leaderboard data available</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard
              .slice(0, compact ? 5 : undefined)
              .map((entry: any, index: number) => (
                <div 
                  key={entry.id} 
                  className={`flex items-center p-3 rounded-md ${
                    entry.userId === user?.id ? 'bg-primary/10' : index % 2 === 0 ? 'bg-muted/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full mr-3">
                    {getMedalIcon(index + 1)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">
                      {entry.userName}
                      {entry.userId === user?.id && (
                        <span className="ml-2 text-xs text-muted-foreground">(You)</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.achievementCount} achievements
                    </div>
                  </div>
                  <div className="font-bold">{entry.points}</div>
                </div>
              ))}
            
            {compact && leaderboard.length > 5 && (
              <Button 
                variant="link" 
                className="w-full text-sm text-muted-foreground hover:text-primary"
                onClick={() => {}}
              >
                View Full Leaderboard
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}