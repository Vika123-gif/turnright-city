import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExternalLink } from 'lucide-react';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  const handleDonateClick = () => {
    window.open('https://www.buymeacoffee.com/TurnRight?redirect_url=https%3A%2F%2Fturnright.city%2Funlock%3Ftoken%3Dcoffee-2025', '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="chat-card sm:max-w-lg border-0 shadow-elegant">
        <DialogHeader className="text-center space-y-4">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Free Generations Used Up
          </DialogTitle>
          <DialogDescription className="text-lg leading-relaxed text-muted-foreground">
            You've used all 3 free route generations. Support TurnRight by buying us a coffee to unlock unlimited generations!
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-8">
          <button 
            onClick={handleDonateClick}
            className="primary-btn w-full"
          >
            <ExternalLink className="w-5 h-5 mr-2" />
            Buy Me a Coffee - Unlock Unlimited
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