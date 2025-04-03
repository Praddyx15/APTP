import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  className,
  actions
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col md:flex-row md:items-center md:justify-between gap-4', className)}>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">{title}</h1>
        {description && (
          <p className="mt-1 text-muted-foreground max-w-3xl">
            {description}
          </p>
        )}
      </div>
      
      {actions && (
        <div className="flex items-center gap-3 mt-2 md:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;