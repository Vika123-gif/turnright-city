import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';

interface GenerationOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: () => void;
}

const GenerationOptionsModal: React.FC<GenerationOptionsModalProps> = ({
  isOpen,
  onClose,
  onPurchase
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold">
            Get More Itineraries
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {/* TEMPORARILY HIDDEN: You've used your 2 free itinerary generations. Purchase more to continue exploring! */}
            Generating your perfect route...
          </p>

          <div className="space-y-3">
            {/* Purchase Option - TEMPORARILY HIDDEN */}
            {false && (
              <Button
                onClick={(e) => {
                  console.log("=== Purchase button clicked ===");
                  e.preventDefault();
                  e.stopPropagation();
                  onPurchase();
                }}
                className="w-full h-auto p-6 flex flex-col items-center gap-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="h-6 w-6 text-white" />
                  <span className="text-lg font-semibold text-white">Buy 3 Itineraries for €5</span>
                </div>
                <p className="text-sm text-green-100">
                  Continue planning your perfect trip
                </p>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GenerationOptionsModal;
