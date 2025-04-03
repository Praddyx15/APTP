import React from 'react';
import { useWebSocket } from '@/providers/websocket-provider';
import { ConnectionStatus } from '@/lib/websocket';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig = {
  [ConnectionStatus.OPEN]: {
    icon: Wifi,
    color: 'text-green-500',
    label: 'Connected',
    description: 'Real-time connection is active'
  },
  [ConnectionStatus.CONNECTING]: {
    icon: Loader2,
    color: 'text-blue-500 animate-spin',
    label: 'Connecting',
    description: 'Establishing real-time connection...'
  },
  [ConnectionStatus.CLOSED]: {
    icon: WifiOff,
    color: 'text-orange-500',
    label: 'Disconnected',
    description: 'Real-time connection is inactive'
  },
  [ConnectionStatus.CLOSING]: {
    icon: Loader2,
    color: 'text-amber-500 animate-spin',
    label: 'Closing',
    description: 'Closing WebSocket connection...'
  },
  [ConnectionStatus.ERROR]: {
    icon: AlertTriangle,
    color: 'text-red-500',
    label: 'Connection Error',
    description: 'Unable to establish real-time connection'
  }
};

interface WebSocketStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
  size?: number;
}

export function WebSocketStatusIndicator({
  className,
  showLabel = false,
  size = 16
}: WebSocketStatusIndicatorProps) {
  const { connectionStatus } = useWebSocket();
  const config = statusConfig[connectionStatus];
  const IconComponent = config.icon;
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-2", className)}>
            <IconComponent className={cn(config.color)} size={size} />
            {showLabel && <span className="text-sm">{config.label}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="flex flex-col">
            <span className="font-semibold">{config.label}</span>
            <span className="text-xs text-muted-foreground">{config.description}</span>
            {connectionStatus === ConnectionStatus.ERROR && (
              <span className="text-xs mt-1">
                Try refreshing the page
              </span>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default WebSocketStatusIndicator;