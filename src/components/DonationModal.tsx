import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExternalLink } from 'lucide-react';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
}

export function DonationModal({ isOpen, onClose, onReset }: DonationModalProps) {
  const handleDonateClick = () => {
    window.open('https://buymeacoffee.com/TurnRight', '_blank');
  };

  const handleDonatedClick = () => {
    onReset();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="chat-card sm:max-w-lg border-0 shadow-elegant">
        <DialogHeader className="text-center space-y-4">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Thank You for Using TurnRight!
          </DialogTitle>
          <DialogDescription className="text-lg leading-relaxed text-muted-foreground">
            Your support helps us maintain and improve this service with new features and better maps. 
            Consider donating to unlock more generations!
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-8">
          <button 
            onClick={handleDonateClick}
            className="primary-btn w-full"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            Donate Now
          </button>
          <button 
            onClick={handleDonatedClick}
            className="secondary-btn w-full"
          >
            I've Donated - Reset Counter
          </button>
          <button 
            onClick={onClose}
            className="outline-btn w-full"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}