import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/providers/websocket-provider';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications();
  const [open, setOpen] = useState(false);
  
  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
  };
  
  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };
  
  const handleClearNotifications = () => {
    clearNotifications();
    setOpen(false);
  };
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="relative" size="icon">
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] p-0"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h4 className="font-semibold">Notifications</h4>
          <div className="flex gap-2">
            {notifications.length > 0 && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={unreadCount === 0}
                  className="h-8 text-xs"
                >
                  Mark all read
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearNotifications}
                  className="h-8 text-xs"
                >
                  Clear all
                </Button>
              </>
            )}
          </div>
        </div>
        <ScrollArea className="h-[350px]">
          {notifications.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="flex flex-col gap-1 p-2">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`p-3 ${
                    notification.read ? 'bg-muted/30' : 'bg-accent/10'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-medium">{notification.title}</div>
                    {!notification.read && (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        New
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm mb-2">{notification.message}</div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <div>
                      {new Date(notification.timestamp).toLocaleString()}
                    </div>
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs font-normal"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        Mark as read
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}