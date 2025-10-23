import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UserInteraction {
  id: string;
  user_session_id: string;
  interaction_type: string;
  interaction_name: string;
  page_path: string;
  component_name: string;
  interaction_data: any;
  timestamp: string;
  user_agent: string;
  referrer: string;
}

interface RouteGenerationDetail {
  id: string;
  user_session_id: string;
  route_generation_id: string;
  scenario: string;
  location: string;
  time_window: number;
  goals: string[];
  additional_settings: string[];
  destination_type: string;
  destination: string;
  days: number;
  generation_started_at: string;
  generation_completed_at: string;
  generation_duration_ms: number;
  api_calls_made: number;
  api_errors: string[];
  places_found: number;
  places_returned: number;
  total_walking_time: number;
  total_visit_time: number;
  route_optimization_applied: boolean;
  debug_info: any;
  created_at: string;
}

interface ButtonClick {
  id: string;
  user_session_id: string;
  button_type: string;
  button_text: string;
  component_name: string;
  page_path: string;
  clicked_at: string;
  additional_data: any;
}

const DataAnalyticsDashboard: React.FC = () => {
  const [userInteractions, setUserInteractions] = useState<UserInteraction[]>([]);
  const [routeGenerations, setRouteGenerations] = useState<RouteGenerationDetail[]>([]);
  const [buttonClicks, setButtonClicks] = useState<ButtonClick[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'interactions' | 'routes' | 'buttons'>('interactions');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch user interactions
      const { data: interactions, error: interactionsError } = await supabase
        .from('user_interactions')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (interactionsError) {
        console.error('Error fetching interactions:', interactionsError);
      } else {
        setUserInteractions(interactions as any || []); // Type will be fixed when Supabase types are regenerated
      }

      // Fetch route generation details
      const { data: routes, error: routesError } = await supabase
        .from('route_generation_details' as any) // Type will be fixed when Supabase types are regenerated
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (routesError) {
        console.error('Error fetching routes:', routesError);
      } else {
        setRouteGenerations(routes as any || []); // Type will be fixed when Supabase types are regenerated
      }

      // Fetch button clicks
      const { data: clicks, error: clicksError } = await supabase
        .from('button_clicks')
        .select('*')
        .order('clicked_at', { ascending: false })
        .limit(100);

      if (clicksError) {
        console.error('Error fetching clicks:', clicksError);
      } else {
        setButtonClicks(clicks as any || []); // Type will be fixed when Supabase types are regenerated
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getInteractionTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'button_click': 'bg-blue-100 text-blue-800',
      'form_submit': 'bg-green-100 text-green-800',
      'page_view': 'bg-purple-100 text-purple-800',
      'route_action': 'bg-orange-100 text-orange-800',
      'navigation': 'bg-indigo-100 text-indigo-800',
      'error': 'bg-red-100 text-red-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">TurnRight Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive user interaction and route generation tracking</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">User Interactions</h3>
            <p className="text-3xl font-bold text-blue-600">{userInteractions.length}</p>
            <p className="text-sm text-gray-500">Total tracked interactions</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Route Generations</h3>
            <p className="text-3xl font-bold text-green-600">{routeGenerations.length}</p>
            <p className="text-sm text-gray-500">Routes created</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Button Clicks</h3>
            <p className="text-3xl font-bold text-purple-600">{buttonClicks.length}</p>
            <p className="text-sm text-gray-500">Button interactions</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('interactions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'interactions'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                User Interactions ({userInteractions.length})
              </button>
              <button
                onClick={() => setActiveTab('routes')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'routes'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Route Generations ({routeGenerations.length})
              </button>
              <button
                onClick={() => setActiveTab('buttons')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'buttons'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Button Clicks ({buttonClicks.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'interactions' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent User Interactions</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Component</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {userInteractions.map((interaction) => (
                        <tr key={interaction.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTimestamp(interaction.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getInteractionTypeColor(interaction.interaction_type)}`}>
                              {interaction.interaction_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {interaction.interaction_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {interaction.page_path}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {interaction.component_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                            {interaction.user_session_id.substring(0, 8)}...
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'routes' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Route Generation Details</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scenario</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Goals</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Places</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {routeGenerations.map((route) => (
                        <tr key={route.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTimestamp(route.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              route.scenario === 'planning' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {route.scenario}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {route.location}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {route.goals.join(', ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {route.places_returned}/{route.places_found}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {route.generation_duration_ms ? `${route.generation_duration_ms}ms` : 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                            {route.user_session_id.substring(0, 8)}...
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'buttons' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Button Click Tracking</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Button Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Button Text</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Component</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {buttonClicks.map((click) => (
                        <tr key={click.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatTimestamp(click.clicked_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {click.button_type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {click.button_text}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {click.component_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {click.page_path}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                            {click.user_session_id.substring(0, 8)}...
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-6 text-center">
          <button
            onClick={fetchAllData}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataAnalyticsDashboard;
