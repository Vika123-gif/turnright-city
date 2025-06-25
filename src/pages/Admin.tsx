
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';

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

const Admin = () => {
  const [routeGenerations, setRouteGenerations] = useState<RouteGeneration[]>([]);
  const [feedback, setFeedback] = useState<UserFeedback[]>([]);
  const [purchases, setPurchases] = useState<RoutePurchase[]>([]);
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

      setRouteGenerations(generations || []);
      setFeedback(feedbackData || []);
      setPurchases(purchaseData || []);
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

  const stats = {
    totalGenerations: routeGenerations.length,
    totalPurchases: purchases.length,
    totalFeedback: feedback.length,
    averageRating: feedback.filter(f => f.rating).length > 0 
      ? (feedback.filter(f => f.rating).reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.filter(f => f.rating).length).toFixed(1)
      : 'N/A',
    conversionRate: routeGenerations.length > 0 
      ? ((purchases.length / routeGenerations.length) * 100).toFixed(1) + '%'
      : 'N/A'
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button onClick={testDatabaseInsert} variant="outline">
          Test Database Insert
        </Button>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPurchases}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFeedback}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="generations" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generations">Route Generations</TabsTrigger>
          <TabsTrigger value="feedback">User Feedback</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
        </TabsList>
        
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
                    <strong>Goals:</strong>{' '}
                    {generation.goals?.map((goal) => (
                      <Badge key={goal} variant="secondary" className="mr-1">
                        {goal}
                      </Badge>
                    ))}
                  </div>
                  <div>
                    <strong>Places Count:</strong> {generation.places_count}
                  </div>
                  <div>
                    <strong>Session ID:</strong> {generation.user_session_id}
                  </div>
                  {generation.places_generated && (
                    <details className="mt-2">
                      <summary className="cursor-pointer font-medium">View Generated Places</summary>
                      <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(generation.places_generated, null, 2)}
                      </pre>
                    </details>
                  )}
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
