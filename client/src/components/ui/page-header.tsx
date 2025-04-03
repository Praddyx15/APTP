import React, { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm md:text-base text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex-shrink-0 flex items-center space-x-2">
          {actions}
        </div>
      )}
    </div>
  );
}