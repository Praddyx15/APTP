import React from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
}

export const BackButton: React.FC<BackButtonProps> = ({ 
  to, 
  label = 'Back', 
  className = '' 
}) => {
  const [location, navigate] = useLocation();
  
  const handleBack = () => {
    if (to) {
      navigate(to);
    } else {
      // If no specific location is provided, try to go back in history
      // or navigate to a sensible default
      window.history.length > 2 
        ? window.history.back() 
        : navigate('/');
    }
  };
  
  return (
    <Button
      variant="outline"
      size="sm"
      className={`flex items-center space-x-1 mb-4 ${className}`}
      onClick={handleBack}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{label}</span>
    </Button>
  );
};

export default BackButton;