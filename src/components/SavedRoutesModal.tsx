import React, { useEffect, useMemo, useState } from "react";
import { useDatabase } from "@/hooks/useDatabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Loader2 } from "lucide-react";

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
  const [routeDetails, setRouteDetails] = useState<Record<string, { city: string; scenario?: string | null; days?: number | null }>>({});
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    if (open && userSessionId) {
      console.log('Modal opened, loading routes...');
      loadRoutes();
    } else if (!open) {
      // Reset state when modal closes
      setRoutes([]);
      setLoadingRoute(null);
      setRouteDetails({});
      setDetailsLoading(false);
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

  useEffect(() => {
    const fetchRouteDetails = async () => {
      if (!open || routes.length === 0) return;
      const routesWithoutDetails = routes.filter(route => !routeDetails[route.id]);
      if (routesWithoutDetails.length === 0) return;

      setDetailsLoading(true);
      try {
        const results = await Promise.all(routesWithoutDetails.map(async (route) => {
          try {
            const routeData = await loadRouteFromStorage(route.path);
            const city =
              routeData?.routeData?.location ||
              routeData?.location ||
              'Unknown city';
            const scenario =
              routeData?.routeData?.scenario ||
              routeData?.scenario ||
              null;
            const days =
              routeData?.routeData?.days ||
              routeData?.days ||
              null;
            return {
              routeId: route.id,
              details: { city, scenario, days },
            };
          } catch (error) {
            console.error('Error loading route details for grouping:', error);
            return {
              routeId: route.id,
              details: { city: 'Unknown city', scenario: null, days: null },
            };
          }
        }));

        setRouteDetails((prev) => {
          const updated = { ...prev };
          results.forEach(({ routeId, details }) => {
            updated[routeId] = details;
          });
          return updated;
        });
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchRouteDetails();
  }, [routes, open, loadRouteFromStorage, routeDetails]);

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

  const groupedRoutes = useMemo(() => {
    const groups = new Map<string, Route[]>();
    const pending: Route[] = [];

    routes.forEach(route => {
      const city = routeDetails[route.id]?.city;
      if (!city) {
        pending.push(route);
        return;
      }
      if (!groups.has(city)) {
        groups.set(city, []);
      }
      groups.get(city)?.push(route);
    });

    const sortedGroups = Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    ).map(([city, cityRoutes]) => ({
      city,
      routes: cityRoutes.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    }));

    return {
      groups: sortedGroups,
      pending,
    };
  }, [routes, routeDetails]);

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
            <div className="space-y-6">
              {groupedRoutes.pending.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-2">
                    Detecting city...
                  </h3>
                  <div className="space-y-2">
                    {groupedRoutes.pending.map(route => (
                      <Button
                        key={route.id}
                        variant="outline"
                        className="w-full justify-start h-auto p-4 bg-gray-50/60 cursor-not-allowed"
                        disabled
                      >
                        <div className="flex items-center gap-3">
                          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                          <span className="text-sm text-gray-500">
                            Loading route details...
                          </span>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {groupedRoutes.groups.map(({ city, routes: cityRoutes }) => (
                <div key={city}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-600">{city}</h3>
                    {detailsLoading && (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
                    )}
                  </div>
                  <div className="space-y-2">
                    {cityRoutes.map((route) => (
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
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(route.createdAt)}
                              </span>
                              {routeDetails[route.id]?.scenario && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                                  {routeDetails[route.id]?.scenario === 'planning' ? 'Planning' : 'On-site'}
                                </span>
                              )}
                              {routeDetails[route.id]?.days && routeDetails[route.id]?.days! > 1 && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">
                                  {routeDetails[route.id]?.days} days
                                </span>
                              )}
                              {route.size > 0 && (
                                <span className="text-xs text-gray-400">
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
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SavedRoutesModal;

