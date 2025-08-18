import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface LisbonWaitlistModalProps {
  open: boolean;
  onClose: () => void;
}

const LisbonWaitlistModal: React.FC<LisbonWaitlistModalProps> = ({ open, onClose }) => {
  const [desiredCity, setDesiredCity] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desiredCity || !email) return;

    setIsSubmitting(true);
    // TODO: Submit to waitlist API
    console.log('Waitlist submission:', { desiredCity, email });
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lisbon-only beta</DialogTitle>
          <DialogDescription>
            We'll open new cities soon. Tell us your city and leave your email to get early access.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Your desired city"
              value={desiredCity}
              onChange={(e) => setDesiredCity(e.target.value)}
              required
            />
          </div>
          <div>
            <Input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting || !desiredCity || !email}
          >
            {isSubmitting ? 'Joining...' : 'Join waitlist'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LisbonWaitlistModal;