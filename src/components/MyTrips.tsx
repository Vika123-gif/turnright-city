import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Star, Calendar, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from './AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { type LLMPlace } from '@/hooks/useOpenAI';
import MapModal from './MapModal';

interface SavedRoute {
  id: string;
  location: string;
  time_window: string;
  goals: string[];
  places_generated: LLMPlace[];
  generated_at: string;
  places_count: number;
}

const MyTrips: React.FC = () => {
  const { user } = useAuth();
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<SavedRoute | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSavedRoutes();
    }
  }, [user]);

  const fetchSavedRoutes = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // TODO: Uncomment after database migration is applied
      // const { data, error } = await supabase
      //   .from('saved_routes')
      //   .select('*')
      //   .eq('user_id', user.id)
      //   .order('generated_at', { ascending: false });

      // if (error) throw error;
      // setSavedRoutes(data || []);
      setSavedRoutes([]); // Temporary empty array
    } catch (error) {
      console.error('Error fetching saved routes:', error);
    }
    setLoading(false);
  };

  const deleteRoute = async (routeId: string) => {
    if (!user) return;

    try {
      // TODO: Uncomment after database migration is applied
      // const { error } = await supabase
      //   .from('saved_routes')
      //   .delete()
      //   .eq('id', routeId)
      //   .eq('user_id', user.id);

      // if (error) throw error;
      
      setSavedRoutes(prev => prev.filter(route => route.id !== routeId));
    } catch (error) {
      console.error('Error deleting route:', error);
    }
  };

  const viewRouteOnMap = (route: SavedRoute) => {
    setSelectedRoute(route);
    setShowMapModal(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] flex items-center justify-center">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">My Trips</h1>
          <p className="text-gray-600 mb-6">
            Sign in to save and manage your personalized routes
          </p>
          <Button
            onClick={() => window.location.href = '/auth'}
            className="w-full py-3 px-6 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white font-semibold rounded-2xl transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            Sign in to view your trips
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">My Trips</h1>
          <p className="text-gray-600">Your saved routes and trip plans</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--primary))] mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading your trips...</p>
          </div>
        ) : savedRoutes.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No trips yet</h3>
            <p className="text-gray-600">
              Create your first route to see it here
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {savedRoutes.map((route) => (
              <div
                key={route.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">
                        {route.location}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        {route.time_window}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => viewRouteOnMap(route)}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                        title="View on map"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => deleteRoute(route.id)}
                        className="p-2 rounded-full hover:bg-red-50 transition-colors"
                        title="Delete route"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {route.goals.slice(0, 3).map((goal, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium"
                        >
                          {goal}
                        </span>
                      ))}
                      {route.goals.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                          +{route.goals.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {route.places_count} places
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(route.generated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedRoute && (
          <MapModal
            isOpen={showMapModal}
            onClose={() => setShowMapModal(false)}
            places={selectedRoute.places_generated}
            origin={selectedRoute.location}
          />
        )}
      </div>
    </div>
  );
};

export default MyTrips;