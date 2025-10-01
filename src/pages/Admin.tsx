import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import BackButton from '@/components/BackButton';
import AdminAnalytics from '@/components/AdminAnalytics';

interface RouteGeneration {
  id: string;
  location: string;
  time_window: string | null;
  goals: string[];
  places_generated: any;
  places_count: number;
  generated_at: string;
  user_session_id: string;
}

interface UserFeedback {
  id: string;
  route_generation_id: string | null;
  rating: number | null;
  text_feedback: string | null;
  location: string | null;
  places_count: number | null;
  submitted_at: string;
  user_session_id: string;
}

interface RoutePurchase {
  id: string;
  route_generation_id: string | null;
  location: string | null;
  places_count: number | null;
  purchased_at: string;
  user_session_id: string;
}

interface BuyButtonClick {
  id: string;
  route_generation_id: string | null;
  location: string | null;
  places_count: number | null;
  clicked_at: string;
  user_session_id: string;
}

interface VisitorSession {
  id: string;
  user_session_id: string;
  first_visit_at: string;
  last_visit_at: string;
  visit_count: number;
  user_agent: string | null;
  ip_address: string | null;
  referrer: string | null;
}

interface SavedRoute {
  id: string;
  route_name: string;
  location: string;
  scenario: string;
  goals: string[];
  days: number;
  total_places: number;
  total_walking_time: number;
  places: any;
  map_url: string | null;
  created_at: string;
  user_session_id: string;
  user_id: string | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const [routeGenerations, setRouteGenerations] = useState<RouteGeneration[]>([]);
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [purchases, setPurchases] = useState<RoutePurchase[]>([]);
  const [buyButtonClicks, setBuyButtonClicks] = useState<BuyButtonClick[]>([]);
  const [visitorSessions, setVisitorSessions] = useState<VisitorSession[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log('=== ADMIN: Fetching data ===');
      
      // Fetch route generations
      const { data: generations, error: genError } = await supabase
        .from('route_generations')
        .select('*')
        .order('generated_at', { ascending: false });

      if (genError) {
        console.error('Error fetching generations:', genError);
        throw genError;
      }
      console.log('Fetched generations:', generations);

      // Fetch feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('user_feedback')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (feedbackError) {
        console.error('Error fetching feedback:', feedbackError);
        throw feedbackError;
      }
      console.log('Fetched feedback:', feedbackData);

      // Fetch purchases
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('route_purchases')
        .select('*')
        .order('purchased_at', { ascending: false });

      if (purchaseError) {
        console.error('Error fetching purchases:', purchaseError);
        throw purchaseError;
      }
      console.log('Fetched purchases:', purchaseData);

      // Fetch buy button clicks
      const { data: buyClickData, error: buyClickError } = await supabase
        .from('buy_button_clicks')
        .select('*')
        .order('clicked_at', { ascending: false });

      if (buyClickError) {
        console.error('Error fetching buy button clicks:', buyClickError);
        throw buyClickError;
      }
      console.log('Fetched buy button clicks:', buyClickData);

      // Fetch visitor sessions
      const { data: visitorData, error: visitorError } = await supabase
        .from('visitor_sessions')
        .select('*')
        .order('first_visit_at', { ascending: false });

      if (visitorError) {
        console.error('Error fetching visitor sessions:', visitorError);
        throw visitorError;
      }
      console.log('Fetched visitor sessions:', visitorData);

      // Fetch saved routes
      const { data: savedRoutesData, error: savedRoutesError } = await supabase
        .from('saved_routes')
        .select('*')
        .order('created_at', { ascending: false });

      if (savedRoutesError) {
        console.error('Error fetching saved routes:', savedRoutesError);
        throw savedRoutesError;
      }
      console.log('Fetched saved routes:', savedRoutesData);

      setRouteGenerations(generations || []);
      setFeedback(feedbackData || []);
      setPurchases(purchaseData || []);
      setBuyButtonClicks(buyClickData || []);
      setVisitorSessions(visitorData || []);
      setSavedRoutes(savedRoutesData || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const testDatabaseInsert = async () => {
    try {
      console.log('=== TESTING DATABASE INSERT ===');
      
      // Test route generation insert
      const testGeneration = {
        location: 'Test Location',
        time_window: '2 hours',
        goals: ['eat', 'coffee'],
        places_generated: [{ name: 'Test Place', address: 'Test Address' }],
        places_count: 1,
        user_session_id: 'test-session-' + Date.now()
      };

      const { data: genData, error: genError } = await supabase
        .from('route_generations')
        .insert(testGeneration)
        .select()
        .single();

      if (genError) {
        console.error('Test generation insert error:', genError);
        alert('Generation insert failed: ' + genError.message);
        return;
      }

      console.log('Test generation inserted:', genData);

      // Test feedback insert
      const testFeedback = {
        route_generation_id: genData.id,
        rating: 5,
        text_feedback: 'Test feedback',
        location: 'Test Location',
        places_count: 1,
        user_session_id: testGeneration.user_session_id
      };

      const { data: feedbackData, error: feedbackError } = await supabase
        .from('user_feedback')
        .insert(testFeedback)
        .select()
        .single();

      if (feedbackError) {
        console.error('Test feedback insert error:', feedbackError);
        alert('Feedback insert failed: ' + feedbackError.message);
        return;
      }

      console.log('Test feedback inserted:', feedbackData);

      // Test purchase insert
      const testPurchase = {
        route_generation_id: genData.id,
        location: 'Test Location',
        places_count: 1,
        user_session_id: testGeneration.user_session_id
      };

      const { data: purchaseData, error: purchaseError } = await supabase
        .from('route_purchases')
        .insert(testPurchase)
        .select()
        .single();

      if (purchaseError) {
        console.error('Test purchase insert error:', purchaseError);
        alert('Purchase insert failed: ' + purchaseError.message);
        return;
      }

      console.log('Test purchase inserted:', purchaseData);
      
      alert('All test inserts successful! Check the console for details.');
      
      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Test insert failed:', error);
      alert('Test failed: ' + (error as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading admin data...</div>
      </div>
    );
  }

  const uniqueVisitors = visitorSessions.filter(session => session.visit_count === 1).length;
  const returningVisitors = visitorSessions.filter(session => session.visit_count > 1).length;
  const totalVisitors = visitorSessions.length;

  const stats = {
    totalGenerations: routeGenerations.length,
    totalPurchases: purchases.length,
    totalBuyClicks: buyButtonClicks.length,
    totalFeedback: feedback.length,
    averageRating: feedback.filter(f => f.rating).length > 0 
      ? (feedback.filter(f => f.rating).reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.filter(f => f.rating).length).toFixed(1)
      : 'N/A',
    conversionRate: buyButtonClicks.length > 0 
      ? ((purchases.length / buyButtonClicks.length) * 100).toFixed(1) + '%'
      : 'N/A',
    uniqueVisitors,
    returningVisitors,
    totalVisitors
  };

  return (
    <div className="container mx-auto p-6">
      <div className="absolute top-4 left-4">
        <BackButton onClick={() => navigate('/')} label="Back to Home" />
      </div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button onClick={testDatabaseInsert} variant="outline">
          Test Database Insert
        </Button>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisitors}</div>
            <div className="text-xs text-gray-500">
              {stats.uniqueVisitors} new, {stats.returningVisitors} returning
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Generations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalGenerations}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}</div>
            <div className="text-xs text-gray-500">
              {stats.totalBuyClicks} clicks → {stats.totalPurchases} purchases
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="analytics">Аналитика</TabsTrigger>
          <TabsTrigger value="savedRoutes">Saved Routes</TabsTrigger>
          <TabsTrigger value="visitors">Visitors</TabsTrigger>
          <TabsTrigger value="generations">Generations</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
        </TabsList>
        
        <TabsContent value="analytics">
          <AdminAnalytics />
        </TabsContent>
        
        <TabsContent value="savedRoutes" className="space-y-4">
          <h2 className="text-xl font-semibold">Saved Routes</h2>
          {savedRoutes.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <p className="text-gray-500">No saved routes yet.</p>
              </CardContent>
            </Card>
          ) : (
            savedRoutes.map((route) => (
              <Card key={route.id}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    {route.route_name}
                    <Badge variant="outline">{route.scenario}</Badge>
                  </CardTitle>
                  <div className="text-sm text-gray-500">
                    Created: {new Date(route.created_at).toLocaleString()}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong>Location:</strong> {route.location}
                      </div>
                      <div>
                        <strong>Scenario:</strong> {route.scenario === 'circle' ? 'Circle Route' : 'Planning'}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong>Days:</strong> {route.days}
                      </div>
                      <div>
                        <strong>Total Places:</strong> {route.total_places}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong>Total Walking Time:</strong> {route.total_walking_time} min
                      </div>
                      <div>
                        <strong>User ID:</strong> {route.user_id || 'Anonymous'}
                      </div>
                    </div>
                    
                    <div>
                      <strong>Goals Selected:</strong>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {route.goals?.map((goal, idx) => (
                          <Badge key={idx} variant="secondary">{goal}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <strong>Session ID:</strong> {route.user_session_id}
                    </div>
                    
                    {route.places && (
                      <div>
                        <strong>Places Details:</strong>
                        <div className="mt-2 max-h-40 overflow-y-auto bg-gray-50 p-3 rounded">
                          <pre className="text-xs">
                            {JSON.stringify(route.places, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                    
                    {route.map_url && (
                      <div>
                        <a
                          href={route.map_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View Route on Map →
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        
        <TabsContent value="visitors" className="space-y-4">
          <h2 className="text-xl font-semibold">Visitor Sessions</h2>
          {visitorSessions.map((visitor) => (
            <Card key={visitor.id}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Session: {visitor.user_session_id}
                  <Badge variant={visitor.visit_count === 1 ? "default" : "secondary"}>
                    {visitor.visit_count === 1 ? "New" : `${visitor.visit_count} visits`}
                  </Badge>
                </CardTitle>
                <div className="text-sm text-gray-500">
                  First visit: {new Date(visitor.first_visit_at).toLocaleString()}
                  {visitor.visit_count > 1 && (
                    <> • Last visit: {new Date(visitor.last_visit_at).toLocaleString()}</>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <strong>User Agent:</strong> {visitor.user_agent || 'Unknown'}
                  </div>
                  {visitor.referrer && (
                    <div>
                      <strong>Referrer:</strong> {visitor.referrer}
                    </div>
                  )}
                  <div>
                    <strong>Visit Count:</strong> {visitor.visit_count}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="generations" className="space-y-4">
          <h2 className="text-xl font-semibold">Route Generations</h2>
          {routeGenerations.map((generation) => (
            <Card key={generation.id}>
              <CardHeader>
                <CardTitle className="text-lg">{generation.location}</CardTitle>
                <div className="text-sm text-gray-500">
                  {new Date(generation.generated_at).toLocaleString()}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <strong>Time Window:</strong> {generation.time_window || 'Not specified'}
                  </div>
                  <div>
                    <strong>Goals:</strong> {generation.goals?.join(', ') || 'None'}
                  </div>
                  <div>
                    <strong>Places Count:</strong> {generation.places_count}
                  </div>
                  <div>
                    <strong>Session ID:</strong> {generation.user_session_id}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="feedback" className="space-y-4">
          <h2 className="text-xl font-semibold">User Feedback</h2>
          {feedback.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {item.location || 'Unknown Location'}
                  {item.rating && (
                    <div className="flex items-center">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="ml-1">{item.rating}/5</span>
                    </div>
                  )}
                </CardTitle>
                <div className="text-sm text-gray-500">
                  {new Date(item.submitted_at).toLocaleString()}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {item.text_feedback && (
                    <div>
                      <strong>Feedback:</strong>
                      <p className="mt-1 p-2 bg-gray-50 rounded">{item.text_feedback}</p>
                    </div>
                  )}
                  <div>
                    <strong>Places Count:</strong> {item.places_count}
                  </div>
                  <div>
                    <strong>Session ID:</strong> {item.user_session_id}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
        
        <TabsContent value="purchases" className="space-y-4">
          <h2 className="text-xl font-semibold">Route Purchases</h2>
          {purchases.map((purchase) => (
            <Card key={purchase.id}>
              <CardHeader>
                <CardTitle className="text-lg">{purchase.location || 'Unknown Location'}</CardTitle>
                <div className="text-sm text-gray-500">
                  {new Date(purchase.purchased_at).toLocaleString()}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <strong>Places Count:</strong> {purchase.places_count}
                  </div>
                  <div>
                    <strong>Session ID:</strong> {purchase.user_session_id}
                  </div>
                  {purchase.route_generation_id && (
                    <div>
                      <strong>Generation ID:</strong> {purchase.route_generation_id}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
