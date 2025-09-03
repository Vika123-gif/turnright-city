import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RouteFeedbackProps {
  onSubmitFeedback: (feedback: string) => void;
  isSubmitting?: boolean;
}

const RouteFeedback: React.FC<RouteFeedbackProps> = ({ 
  onSubmitFeedback, 
  isSubmitting = false 
}) => {
  const [feedback, setFeedback] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!feedback.trim()) {
      toast({
        title: "Please enter your feedback",
        description: "Your thoughts help us improve the route recommendations.",
        variant: "destructive",
      });
      return;
    }

    onSubmitFeedback(feedback.trim());
    setHasSubmitted(true);
    setFeedback('');
    
    toast({
      title: "Thank you for your feedback!",
      description: "Your suggestions help us create better routes for everyone.",
    });
  };

  if (hasSubmitted) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <MessageSquare className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-green-700 font-medium">Thank you for your feedback!</p>
            <p className="text-green-600 text-sm mt-1">
              Your suggestions help us improve our route recommendations.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-orange-800">
          <MessageSquare className="w-5 h-5" />
          Help us improve your route
        </CardTitle>
        <p className="text-orange-700 text-sm">
          What would you add or change to make this route better?
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder="Tell us what places you'd add, remove, or change about this route..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 min-h-[100px]"
          disabled={isSubmitting}
        />
        <div className="flex gap-2">
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !feedback.trim()}
            className="bg-orange-600 hover:bg-orange-700 text-white flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Submitting...' : 'Send Feedback'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RouteFeedback;