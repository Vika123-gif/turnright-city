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

  // If user is already authenticated, redirect to chat
  React.useEffect(() => {
    if (user) {
      navigate('/chat');
    }
  }, [user, navigate]);

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
          Your AI city guide - discover new places in seconds, share and save your adventures!
        </h1>

        {/* Google Sign In */}
        <div className="space-y-4">
          <Button
            onClick={handleGoogleSignIn}
            variant="outline"
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </Button>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <p className="text-xs text-muted-foreground text-center">
            We'll create your account for immediate access
          </p>

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