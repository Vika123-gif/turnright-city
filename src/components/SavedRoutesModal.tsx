import React, { useEffect, useState } from "react";
import { useDatabase } from "@/hooks/useDatabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Calendar, Loader2 } from "lucide-react";

interface Route {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  size: number;
}

interface SavedRoutesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectRoute: (routeData: any) => void;
  userSessionId: string;
}

const SavedRoutesModal: React.FC<SavedRoutesModalProps> = ({
  open,
  onOpenChange,
  onSelectRoute,
  userSessionId,
}) => {
  const { getRoutesFromStorage, loadRouteFromStorage } = useDatabase();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRoute, setLoadingRoute] = useState<string | null>(null);

  useEffect(() => {
    if (open && userSessionId) {
      console.log('Modal opened, loading routes...');
      loadRoutes();
    } else if (!open) {
      // Reset state when modal closes
      setRoutes([]);
      setLoadingRoute(null);
    }
  }, [open, userSessionId]);

  const loadRoutes = async () => {
    setLoading(true);
    try {
      console.log('=== SavedRoutesModal: Loading routes ===');
      console.log('User session ID:', userSessionId);
      const fetchedRoutes = await getRoutesFromStorage(userSessionId);
      console.log('Fetched routes:', fetchedRoutes);
      setRoutes(fetchedRoutes);
    } catch (error) {
      console.error("Error loading routes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRouteClick = async (route: Route) => {
    setLoadingRoute(route.id);
    try {
      console.log('Loading route from path:', route.path);
      const routeData = await loadRouteFromStorage(route.path);
      if (routeData) {
        console.log('Route data loaded successfully, calling onSelectRoute');
        onSelectRoute(routeData);
        // Close modal after a small delay to ensure route is loaded
        setTimeout(() => {
          onOpenChange(false);
        }, 100);
      } else {
        console.error('Route data is null or undefined');
        alert('Failed to load route. Please try again.');
      }
    } catch (error) {
      console.error("Error loading route:", error);
      alert('Failed to load route: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoadingRoute(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getRouteDisplayName = (route: Route) => {
    // Try to extract location from filename or use default
    const match = route.name.match(/^(.+?)_(.+?)\.json$/);
    if (match) {
      return formatDate(route.createdAt);
    }
    return formatDate(route.createdAt);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>My Routes</DialogTitle>
          <DialogDescription>
            Select a route to view it on the map
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading routes...</span>
            </div>
          ) : routes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No saved routes found</p>
              <p className="text-sm mt-2">Generate a route to see it here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {routes.map((route) => (
                <Button
                  key={route.id}
                  variant="outline"
                  className="w-full justify-start h-auto p-4 hover:bg-gray-50"
                  onClick={() => handleRouteClick(route)}
                  disabled={loadingRoute === route.id}
                >
                  <div className="flex items-start gap-3 w-full">
                    <MapPin className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-900">
                        {getRouteDisplayName(route)}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(route.createdAt)}
                        </span>
                        {route.size > 0 && (
                          <span className="text-xs">
                            {(route.size / 1024).toFixed(1)} KB
                          </span>
                        )}
                      </div>
                    </div>
                    {loadingRoute === route.id && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    )}
                  </div>
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SavedRoutesModal;

