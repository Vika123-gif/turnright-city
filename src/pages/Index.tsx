
import React, { useEffect } from "react";
import ChatFlow from "@/components/ChatFlow";
import { useAuth } from "@/components/AuthProvider";
import { useGenerationLimit } from "@/hooks/useGenerationLimit";
import { Zap, User, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import turnrightLogo from "@/assets/turnright-logo.png";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const { getRemainingGenerations, getTotalGenerations, refreshCredits } = useGenerationLimit();
  const navigate = useNavigate();

  // Redirect to start page if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  // Reload credits when component mounts to ensure fresh data
  useEffect(() => {
    if (user) {
      refreshCredits();
    }
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Header with user info and credits - Fixed at top */}
      <header className="w-full bg-white/90 backdrop-blur-sm border-b border-gray-200 p-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src={turnrightLogo} 
              alt="TurnRight Logo" 
              className="h-8 w-auto"
            />
          </div>
          
          {/* User info and credits */}
          <div className="flex items-center gap-4">
            {/* Credits display */}
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                {getRemainingGenerations()}/{getTotalGenerations()} credits
              </span>
              <Button
                onClick={refreshCredits}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-blue-100"
                title="Refresh credits"
              >
                <RefreshCw className="h-3 w-3 text-blue-600" />
              </Button>
            </div>
            
            {/* User email */}
            {user && (
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-full">
                <User className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {user.email}
                </span>
              </div>
            )}
            
            {/* Sign out button */}
            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-gray-800"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main content - Fills remaining space */}
      <div className="flex-1 overflow-hidden w-full">
        <ChatFlow />
      </div>
    </div>
  );
};

export default Index;
