import React from 'react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  description,
  icon,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        
        {actions && (
          <div className="flex items-center gap-2 ml-auto">
            {actions}
          </div>
        )}
      </div>
      
      <Separator />
    </div>
  );
}