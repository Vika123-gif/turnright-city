import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BackButtonProps {
  onClick: () => void;
  className?: string;
  label?: string;
}

const BackButton: React.FC<BackButtonProps> = ({ 
  onClick, 
  className = "", 
  label = "Back" 
}) => {
  return (
    <Button 
      variant="ghost" 
      size="sm"
      onClick={onClick}
      className={`flex items-center gap-2 text-muted-foreground hover:text-foreground p-2 ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="text-sm">{label}</span>
    </Button>
  );
};

export default BackButton;