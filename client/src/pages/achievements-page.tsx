import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Search, Trophy, Medal } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import AchievementCard from '@/components/gamification/achievement-card';
import { Achievement, UserAchievement } from '@shared/schema';

export default function AchievementsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [tab, setTab] = useState('all');

  // Fetch all achievements
  const { data: achievements, isLoading: isLoadingAchievements } = useQuery({
    queryKey: ['/api/achievements'],
    enabled: !!user,
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to load achievements',
        variant: 'destructive',
      });
    },
  });

  // Fetch user's achievements
  const { data: userAchievements, isLoading: isLoadingUserAchievements } = useQuery({
    queryKey: ['/api/user-achievements', user?.id],
    enabled: !!user,
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to load your achievements',
        variant: 'destructive',
      });
    },
  });

  // Fetch leaderboard data
  const { data: leaderboard, isLoading: isLoadingLeaderboard } = useQuery({
    queryKey: ['/api/leaderboard'],
    enabled: !!user,
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to load leaderboard data',
        variant: 'destructive',
      });
    },
  });

  const isLoading = isLoadingAchievements || isLoadingUserAchievements || isLoadingLeaderboard;

  const filteredAchievements = achievements
    ? achievements
        .filter((achievement: Achievement) => 
          (selectedCategory === 'all' || achievement.category === selectedCategory) &&
          (tab === 'all' || 
           (tab === 'unlocked' && userAchievements?.some((ua: UserAchievement) => ua.achievementId === achievement.id)) ||
           (tab === 'locked' && !userAchievements?.some((ua: UserAchievement) => ua.achievementId === achievement.id))
          ) &&
          (searchQuery === '' || 
           achievement.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           achievement.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
    : [];

  const getUserProgress = () => {
    if (!achievements || !userAchievements) return { total: 0, unlocked: 0, percentage: 0 };
    
    const total = achievements.length;
    const unlocked = userAchievements.length;
    const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;
    
    return { total, unlocked, percentage };
  };

  const progress = getUserProgress();

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Achievements & Leaderboards</h1>
          <p className="text-muted-foreground">
            Track your progress and celebrate your success
          </p>
        </div>
        <div className="flex space-x-4">
          <Button variant="outline" onClick={() => setLocation('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <div className="col-span-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Your Achievements</h2>
              <Badge className="text-lg px-3 py-1">
                <Trophy className="mr-1 h-4 w-4" />
                {progress.unlocked} / {progress.total}
                <span className="ml-2 text-xs">({progress.percentage}%)</span>
              </Badge>
            </div>

            <div className="flex space-x-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search achievements..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="w-48">
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="mastery">Mastery</SelectItem>
                    <SelectItem value="completion">Completion</SelectItem>
                    <SelectItem value="time">Time</SelectItem>
                    <SelectItem value="consistency">Consistency</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="excellence">Excellence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unlocked">Unlocked</TabsTrigger>
                <TabsTrigger value="locked">Locked</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredAchievements.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No achievements match your filters</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredAchievements.map((achievement: Achievement) => (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        userAchievement={userAchievements?.find(
                          (ua: UserAchievement) => ua.achievementId === achievement.id
                        )}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="unlocked" className="mt-4">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredAchievements.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No unlocked achievements match your filters</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredAchievements.map((achievement: Achievement) => (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        userAchievement={userAchievements?.find(
                          (ua: UserAchievement) => ua.achievementId === achievement.id
                        )}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="locked" className="mt-4">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredAchievements.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No locked achievements match your filters</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredAchievements.map((achievement: Achievement) => (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        userAchievement={userAchievements?.find(
                          (ua: UserAchievement) => ua.achievementId === achievement.id
                        )}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div>
          <div className="bg-card border rounded-lg p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center">
                <Medal className="mr-2 h-5 w-5 text-primary" />
                Leaderboard
              </h2>
            </div>

            {isLoadingLeaderboard ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : !leaderboard || leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No leaderboard data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {leaderboard.map((entry: any, index: number) => (
                  <div 
                    key={entry.id} 
                    className={`flex items-center p-3 rounded-md ${
                      entry.userId === user?.id ? 'bg-primary/10' : index % 2 === 0 ? 'bg-muted/50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full mr-3 font-bold bg-primary/20">
                      {index + 1}
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
                    <div className="font-bold text-xl">{entry.points}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}