import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, CreditCard, X } from 'lucide-react';

interface GenerationOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGiveFeedback: (feedback: string) => void;
  onPurchase: () => void;
}

const GenerationOptionsModal: React.FC<GenerationOptionsModalProps> = ({
  isOpen,
  onClose,
  onGiveFeedback,
  onPurchase
}) => {
  const [feedback, setFeedback] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  const handleFeedbackSubmit = () => {
    if (feedback.trim()) {
      onGiveFeedback(feedback);
      setFeedback('');
      setShowFeedbackForm(false);
    }
  };

  const handleClose = () => {
    setFeedback('');
    setShowFeedbackForm(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-semibold">
            Get Another Itinerary
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            You've used your free itinerary generation. Choose how you'd like to continue:
          </p>

          {!showFeedbackForm ? (
            <div className="space-y-3">
              {/* Option 1: Leave Feedback */}
              <Button
                onClick={() => setShowFeedbackForm(true)}
                variant="outline"
                className="w-full h-auto p-4 flex flex-col items-start gap-2"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold">Leave Feedback</span>
                </div>
                <p className="text-sm text-muted-foreground text-left">
                  Share what you missed and get another free itinerary generation
                </p>
              </Button>

              {/* Option 2: Purchase */}
              <Button
                onClick={onPurchase}
                className="w-full h-auto p-4 flex flex-col items-start gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-white" />
                  <span className="font-semibold text-white">Buy 3 Itineraries</span>
                </div>
                <p className="text-sm text-green-100 text-left">
                  Get 3 more itinerary generations for €5
                </p>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Share what you missed or what could be improved:
                </label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="For example: 'It's very important to us to make the product useful. Share what you missed.'"
                  className="min-h-[100px]"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleFeedbackSubmit}
                  disabled={!feedback.trim()}
                  className="flex-1"
                >
                  Submit Feedback
                </Button>
                <Button
                  onClick={() => setShowFeedbackForm(false)}
                  variant="outline"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GenerationOptionsModal;
