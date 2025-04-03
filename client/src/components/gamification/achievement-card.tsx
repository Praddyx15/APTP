import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Shield, Clock, Award, Zap, Star, Medal } from 'lucide-react';
import { Achievement, UserAchievement } from '@shared/schema';
import { cn } from '@/lib/utils';

interface AchievementCardProps {
  achievement: Achievement;
  userAchievement?: UserAchievement;
}

export default function AchievementCard({ achievement, userAchievement }: AchievementCardProps) {
  const isUnlocked = !!userAchievement;
  const progress = userAchievement?.progress || 0;
  
  const getIcon = () => {
    switch (achievement.category) {
      case 'mastery':
        return <Trophy className="h-6 w-6" />;
      case 'completion':
        return <Shield className="h-6 w-6" />;
      case 'time':
        return <Clock className="h-6 w-6" />;
      case 'consistency':
        return <Award className="h-6 w-6" />;
      case 'performance':
        return <Zap className="h-6 w-6" />;
      case 'excellence':
        return <Star className="h-6 w-6" />;
      default:
        return <Medal className="h-6 w-6" />;
    }
  };
  
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'mastery':
        return 'Mastery';
      case 'completion':
        return 'Completion';
      case 'time':
        return 'Time';
      case 'consistency':
        return 'Consistency';
      case 'performance':
        return 'Performance';
      case 'excellence':
        return 'Excellence';
      default:
        return category;
    }
  };
  
  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300",
      isUnlocked 
        ? "border-primary/50 bg-card" 
        : "border-muted bg-muted/50 opacity-75"
    )}>
      <div className={cn(
        "absolute right-0 top-0 h-16 w-16 -translate-y-4 translate-x-4 rotate-45 bg-gradient-to-br",
        isUnlocked 
          ? "from-primary/50 to-primary" 
          : "from-muted/30 to-muted/50"
      )} />
      
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between">
          <Badge variant={isUnlocked ? "default" : "outline"} className="mb-2">
            {getCategoryLabel(achievement.category)}
          </Badge>
          {achievement.points && (
            <Badge variant="outline" className="mb-2">
              {achievement.points} Points
            </Badge>
          )}
        </div>
        <CardTitle className="flex items-center text-lg">
          <div className={cn(
            "mr-2 rounded-full p-1",
            isUnlocked ? "text-primary" : "text-muted-foreground"
          )}>
            {getIcon()}
          </div>
          {achievement.name}
        </CardTitle>
        <CardDescription>{achievement.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        {isUnlocked ? (
          <p className="text-sm text-primary font-medium">Achievement Unlocked!</p>
        ) : progress > 0 ? (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Complete the requirements to unlock</p>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between p-4 pt-0 text-xs text-muted-foreground">
        {userAchievement && userAchievement.awardedAt ? (
          <span>Awarded on {new Date(userAchievement.awardedAt).toLocaleDateString()}</span>
        ) : (
          <span>Not yet achieved</span>
        )}
      </CardFooter>
    </Card>
  );
}