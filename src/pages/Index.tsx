
import React from "react";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { User, LogOut } from "lucide-react";
import ChatFlow from "@/components/ChatFlow";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3FCF8] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3FCF8] flex flex-col">
      {/* Header with auth status */}
      <header className="w-full bg-white/80 backdrop-blur-sm border-b border-gray-200 p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 cursor-pointer" onClick={() => navigate('/')}>
            TurnRight.city
          </h1>
          <div className="flex items-center gap-4">
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => navigate('/route')}
            >
              Open Route
            </Button>
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 hidden sm:inline">
                  Welcome back, {user.email}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={signOut}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/auth')}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-0 md:py-12">
        <div className="w-full">
          <ChatFlow />
        </div>
      </div>
    </div>
  );
};

export default Index;
