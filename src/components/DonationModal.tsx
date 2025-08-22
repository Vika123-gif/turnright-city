import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const handleDonateClick = () => {
    window.open('https://buymeacoffee.com/TurnRight', '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">
            Thank You for Using TurnRight!
          </DialogTitle>
          <DialogDescription className="text-center text-base leading-relaxed mt-4">
            Your support helps us maintain and improve this service with new features and better maps. 
            Consider donating to unlock more generations!
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button 
            onClick={handleDonateClick}
            className="flex-1 bg-[#FFDD00] hover:bg-[#FFDD00]/90 text-black font-medium"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Donate Now
          </Button>
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}