import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/components/AuthProvider";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import turnrightLogo from "@/assets/turnright-logo.png";

/**
 * Start page with immediate chat access
 * 
 * This component provides a seamless experience where users can start chatting immediately
 * after entering their email address. The system creates an account for immediate access.
 * 
 * Features:
 * - Email input validation
 * - Immediate redirect to chat after email submission
 * - Account creation for immediate access
 * - Loading states and error handling
 * - Automatic redirect to chat if already authenticated
 */
const Start = () => {
  const navigate = useNavigate();
  const { user, signInWithGoogle } = useAuth();
  const [showInfo, setShowInfo] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message);
      }
      // Google OAuth will redirect automatically, so no need to navigate manually
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-navigate to chat when authenticated
  React.useEffect(() => {
    if (user && !isLoading) {
      navigate('/chat');
    }
  }, [user, isLoading, navigate]);

  const handleStartClick = () => {
    // Navigate to chat regardless of auth state - free access for all
    navigate('/chat');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <img 
            src={turnrightLogo} 
            alt="TurnRight Logo" 
            className="h-12 md:h-16 w-auto"
          />
        </div>

        {/* Hero image below the logo */}
        <div className="flex justify-center">
          <img 
            src="/png.png" 
            alt="TurnRight hero" 
            className="mt-4 w-full rounded-lg"
          />
        </div>

        {/* Tagline */}
        <h1 className="text-xl text-foreground font-medium leading-relaxed">
          Perfect city routes for your trip - cozy, safe, and full of local hidden gems. No endless planning.
        </h1>

        {/* Start Button */}
        <div className="space-y-4">
          <Button
            onClick={handleStartClick}
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Start Exploring'
            )}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center">
            Free access - no account needed
          </p>
        </div>
        
        {/* Info Section */}
        <div className="space-y-4">

          {/* Info Link */}
          <Dialog open={showInfo} onOpenChange={setShowInfo}>
            <DialogTrigger asChild>
              <button className="text-sm text-muted-foreground hover:text-foreground underline transition-colors">
                What is TurnRight?
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>What is TurnRight?</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm text-muted-foreground">
                <p>
                  TurnRight is your AI-powered city guide that creates personalized walking routes 
                  in seconds. Simply tell us what you're interested in, and we'll plan the perfect 
                  route for your exploration.
                </p>
                <p>
                  Whether you're a local looking for new discoveries or a traveler planning your 
                  next adventure, TurnRight makes city exploration effortless and exciting.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default Start;