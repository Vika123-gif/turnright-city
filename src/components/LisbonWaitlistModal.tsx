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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LisbonWaitlistModalProps {
  open: boolean;
  onClose: () => void;
}

const LisbonWaitlistModal: React.FC<LisbonWaitlistModalProps> = ({ open, onClose }) => {
  const [desiredCity, setDesiredCity] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desiredCity || !email) return;

    setIsSubmitting(true);
    
    try {
      // TODO: Implement waitlist storage when table is created
      console.log('Waitlist submission:', { desiredCity, email });
      
      toast({
        title: "Success!",
        description: "You've been added to our waitlist. We'll notify you when we launch in your city!",
      });
      
      // Clear form and close modal
      setDesiredCity('');
      setEmail('');
      onClose();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-4 rounded-xl border-0 shadow-2xl bg-white">
        <div className="chat-card p-6">
          <DialogHeader className="text-left mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="text-2xl">🌍</div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Lisbon-only beta
              </DialogTitle>
            </div>
            <DialogDescription className="chatbot-bubble text-sm">
              We'll open new cities soon. Tell us your city and leave your email to get early access.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                placeholder="Your desired city"
                value={desiredCity}
                onChange={(e) => setDesiredCity(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#008457] focus:border-transparent"
                required
              />
            </div>
            <div>
              <Input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#008457] focus:border-transparent"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-[#008457] hover:bg-[#00BC72] text-white font-medium py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
              disabled={isSubmitting || !desiredCity || !email}
            >
              {isSubmitting ? 'Joining...' : 'Join waitlist'}
            </Button>
          </form>
          
          {/* Branding footer */}
          <div className="border-t pt-4 mt-6 text-center">
            <p className="text-sm text-gray-600 mb-2">
              Save for the next generations!
            </p>
            <a
              href="https://turnright.city/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#008457] underline font-medium text-sm hover:text-[#00BC72] transition-colors"
            >
              Visit TurnRight.city
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LisbonWaitlistModal;