import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Notification } from "@shared/schema";
import { format } from "date-fns";

export default function NotificationsPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: notifications = [], refetch } = useQuery<Notification[]>({
    queryKey: ["/api/protected/notifications"],
    enabled: !!user,
  });

  const unreadNotifications = notifications.filter(n => n.status === "sent");

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await apiRequest("PUT", `/api/protected/notifications/${notificationId}/read`);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const formatNotificationTime = (date: Date) => {
    // Convert string date to Date object if it's not already
    const dateObj = date instanceof Date ? date : new Date(date);
    return format(dateObj, "PPp");
  };

  const getNotificationTypeClasses = (type: string) => {
    switch (type) {
      case "info":
        return {
          bg: "bg-blue-100",
          text: "text-blue-600",
          label: "Info",
        };
      case "warning":
        return {
          bg: "bg-amber-100",
          text: "text-amber-600",
          label: "Warn",
        };
      case "error":
        return {
          bg: "bg-red-100",
          text: "text-red-600",
          label: "Error",
        };
      default:
        return {
          bg: "bg-blue-100",
          text: "text-blue-600",
          label: "Info",
        };
    }
  };

  return (
    <div className="relative">
      <button
        className="relative p-1 rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        onClick={handleToggle}
      >
        <span className="sr-only">View notifications</span>
        <div className="h-6 w-6 flex items-center justify-center">
          <Bell className="h-5 w-5" />
          {unreadNotifications.length > 0 && (
            <span className="absolute top-0 right-0 block h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
        </div>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-40 border border-slate-200">
          <div className="p-2 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => {
                const typeClasses = getNotificationTypeClasses(notification.type);
                return (
                  <div 
                    key={notification.id} 
                    className={cn(
                      "p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0",
                      notification.status === "read" ? "opacity-70" : ""
                    )}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0 pt-0.5">
                        <span className={cn("inline-flex items-center justify-center h-8 w-8 rounded-full", typeClasses.bg, typeClasses.text)}>
                          <span className="text-xs font-medium">{typeClasses.label}</span>
                        </span>
                      </div>
                      <div className="ml-3 w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800">{notification.content}</p>
                        <p className="text-xs text-slate-500 mt-1">{formatNotificationTime(notification.createdAt)}</p>
                        {notification.status === "sent" && (
                          <div className="mt-2 flex space-x-2">
                            <button 
                              className="text-xs font-medium text-blue-600 hover:text-blue-500"
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              Mark as read
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {notifications.length > 0 && (
            <div className="p-2 text-center border-t border-slate-200">
              <Button variant="link" size="sm" className="text-blue-600 hover:text-blue-800">
                View all notifications
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
