
import React, { useEffect, useState, useRef } from "react";
import ChatFlow from "@/components/ChatFlow";
import { useAuth } from "@/components/AuthProvider";
import { useGenerationLimit } from "@/hooks/useGenerationLimit";
import { useDatabase } from "@/hooks/useDatabase";
import { Zap, User, LogOut, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import turnrightLogo from "@/assets/turnright-logo.png";
import { useNavigate } from "react-router-dom";
import SavedRoutesModal from "@/components/SavedRoutesModal";

const Index = () => {
  const { user, signOut, loading } = useAuth();
  const { getRemainingGenerations, getTotalGenerations } = useGenerationLimit();
  const { generateSessionId } = useDatabase();
  const navigate = useNavigate();
  const [headerVisible, setHeaderVisible] = useState(true);
  const [currentStep, setCurrentStep] = useState<"chat" | "summary" | "route_preview" | "detailed-map" | "generating" | "purchase">("chat");
  const [routesModalOpen, setRoutesModalOpen] = useState(false);
  const [userSessionId, setUserSessionId] = useState<string>("");
  const loadRouteRef = useRef<((routeData: any) => void) | null>(null);

  // Initialize user session ID
  useEffect(() => {
    const sessionId = generateSessionId();
    console.log('=== Index.tsx: Initializing userSessionId ===');
    console.log('Session ID:', sessionId);
    setUserSessionId(sessionId);
  }, [generateSessionId]);

  const handleSignOut = async () => {
    try {
      // Clear all chat and route state when exiting
      localStorage.removeItem('savedRouteState');
      localStorage.removeItem('chatBotState');
      localStorage.removeItem('pendingRouteData');
      localStorage.removeItem('pendingRouteGenerationId');
      localStorage.removeItem('pendingUserSessionId');
      
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleLoadRoute = (routeData: any) => {
    if (loadRouteRef.current) {
      loadRouteRef.current(routeData);
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

  return (
    <div className={`h-[100dvh] bg-background flex flex-col ${currentStep !== 'summary' ? 'overflow-hidden' : ''}`}>
      {/* Header with user info and credits - Always fixed at top */}
      <header className="w-full bg-white/90 backdrop-blur-sm border-b border-gray-200 p-4 flex-shrink-0 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          {/* Logo - Hidden on mobile */}
          <div className="flex items-center">
            <img 
              src={turnrightLogo} 
              alt="TurnRight Logo" 
              className="h-8 w-auto hidden md:block"
            />
          </div>
          
          {/* User info and credits */}
          <div className="flex items-center gap-4">
            {/* Credits display - TEMPORARILY HIDDEN */}
            {false && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
                <Zap className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  {getRemainingGenerations()}/{getTotalGenerations()} credits
                </span>
              </div>
            )}
            
            {/* My Routes button */}
            <Button
              onClick={() => {
                console.log('=== My Routes button clicked ===');
                console.log('Current userSessionId:', userSessionId);
                setRoutesModalOpen(true);
              }}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
            >
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">My Routes</span>
            </Button>
            
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
      <div className={`flex-1 w-full relative ${currentStep !== 'summary' ? 'overflow-hidden' : ''}`}>
        <ChatFlow 
          key={currentStep === "summary" ? "summary" : "chat"}
          onHeaderVisibilityChange={setHeaderVisible}
          onStepChange={setCurrentStep}
          onLoadRoute={(loadFn) => {
            loadRouteRef.current = loadFn;
          }}
        />
      </div>

      {/* Saved Routes Modal */}
      <SavedRoutesModal
        open={routesModalOpen}
        onOpenChange={setRoutesModalOpen}
        onSelectRoute={handleLoadRoute}
        userSessionId={userSessionId}
      />
    </div>
  );
};

export default Index;
