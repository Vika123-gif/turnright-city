import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import turnrightLogo from "@/assets/turnright-logo.png";

const Start = () => {
  const navigate = useNavigate();
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <img 
            src={turnrightLogo} 
            alt="TurnRight Logo" 
            className="h-16 w-auto"
          />
        </div>

        {/* Tagline */}
        <h1 className="text-xl text-foreground font-medium leading-relaxed">
          Your AI city guide: smart walking routes in seconds.
        </h1>

        {/* Action Buttons */}
        <div className="space-y-4">
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/')} 
              size="lg" 
              className="w-full"
            >
              I'm already in the city
            </Button>
            <Button 
              onClick={() => navigate('/')} 
              variant="outline" 
              size="lg" 
              className="w-full"
            >
              I'm planning a trip
            </Button>
          </div>

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