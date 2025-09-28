import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface AnalyticsData {
  // Button clicks and interactions
  buttonClicks: {
    buyButtonClicks: number;
    totalClicks: number;
    conversionRate: number;
  };
  
  // Location analytics
  locations: {
    name: string;
    count: number;
    conversions: number;
    conversionRate: number;
  }[];
  
  // Goals/Categories analytics
  goals: {
    name: string;
    count: number;
    percentage: number;
  }[];
  
  // Time window preferences
  timeWindows: {
    window: string;
    count: number;
    percentage: number;
  }[];
  
  // User journey analytics
  userJourney: {
    totalSessions: number;
    routeGenerations: number;
    buyButtonClicks: number;
    purchases: number;
    feedbackSubmissions: number;
    exitPoints: any[];
  };
  
  // Temporal analytics
  temporal: {
    generationsByDay: { date: string; count: number }[];
    purchasesByDay: { date: string; count: number }[];
    clicksByDay: { date: string; count: number }[];
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C'];

const AdminAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [
        { data: routeGenerations },
        { data: buyButtonClicks },
        { data: purchases },
        { data: feedback },
        { data: visitorSessions },
        { data: locationExits }
      ] = await Promise.all([
        supabase.from('route_generations').select('*'),
        supabase.from('buy_button_clicks').select('*'),
        supabase.from('route_purchases').select('*'),
        supabase.from('user_feedback').select('*'),
        supabase.from('visitor_sessions').select('*'),
        supabase.from('location_exits').select('*')
      ]);

      // Process analytics data
      const analyticsData = processAnalyticsData({
        routeGenerations: routeGenerations || [],
        buyButtonClicks: buyButtonClicks || [],
        purchases: purchases || [],
        feedback: feedback || [],
        visitorSessions: visitorSessions || [],
        locationExits: locationExits || []
      });

      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (data: any): AnalyticsData => {
    const { routeGenerations, buyButtonClicks, purchases, feedback, visitorSessions, locationExits } = data;

    // Button clicks analytics
    const buttonClicks = {
      buyButtonClicks: buyButtonClicks.length,
      totalClicks: buyButtonClicks.length, // Can be extended with other button types
      conversionRate: buyButtonClicks.length > 0 ? (purchases.length / buyButtonClicks.length) * 100 : 0
    };

    // Location analytics
    const locationCounts: Record<string, number> = routeGenerations.reduce((acc: Record<string, number>, gen: any) => {
      const location = gen.location || 'Unknown';
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {});

    const locationPurchases: Record<string, number> = purchases.reduce((acc: Record<string, number>, purchase: any) => {
      const location = purchase.location || 'Unknown';
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {});

    const locations = Object.entries(locationCounts).map(([name, count]) => ({
      name,
      count,
      conversions: locationPurchases[name] || 0,
      conversionRate: count > 0 ? ((locationPurchases[name] || 0) / count) * 100 : 0
    })).sort((a, b) => b.count - a.count);

    // Goals analytics
    const goalCounts: Record<string, number> = routeGenerations.reduce((acc: Record<string, number>, gen: any) => {
      (gen.goals || []).forEach((goal: string) => {
        acc[goal] = (acc[goal] || 0) + 1;
      });
      return acc;
    }, {});

    const totalGoals = Object.values(goalCounts).reduce((sum, count) => sum + count, 0);
    const goals = Object.entries(goalCounts).map(([name, count]) => ({
      name,
      count,
      percentage: totalGoals > 0 ? (count / totalGoals) * 100 : 0
    })).sort((a, b) => b.count - a.count);

    // Time window analytics
    const timeWindowCounts: Record<string, number> = routeGenerations.reduce((acc: Record<string, number>, gen: any) => {
      const window = gen.time_window || 'Not specified';
      acc[window] = (acc[window] || 0) + 1;
      return acc;
    }, {});

    const totalTimeWindows = Object.values(timeWindowCounts).reduce((sum, count) => sum + count, 0);
    const timeWindows = Object.entries(timeWindowCounts).map(([window, count]) => ({
      window,
      count,
      percentage: totalTimeWindows > 0 ? (count / totalTimeWindows) * 100 : 0
    })).sort((a, b) => b.count - a.count);

    // User journey analytics
    const userJourney = {
      totalSessions: visitorSessions.length,
      routeGenerations: routeGenerations.length,
      buyButtonClicks: buyButtonClicks.length,
      purchases: purchases.length,
      feedbackSubmissions: feedback.length,
      exitPoints: locationExits
    };

    // Temporal analytics (last 30 days)
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const generationsByDay = last30Days.map(date => ({
      date,
      count: routeGenerations.filter((gen: any) => gen.generated_at.startsWith(date)).length
    }));

    const purchasesByDay = last30Days.map(date => ({
      date,
      count: purchases.filter((purchase: any) => purchase.purchased_at.startsWith(date)).length
    }));

    const clicksByDay = last30Days.map(date => ({
      date,
      count: buyButtonClicks.filter((click: any) => click.clicked_at.startsWith(date)).length
    }));

    return {
      buttonClicks,
      locations,
      goals,
      timeWindows,
      userJourney,
      temporal: {
        generationsByDay,
        purchasesByDay,
        clicksByDay
      }
    };
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">Загрузка аналитики...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6">
        <div className="text-center">Ошибка загрузки данных аналитики</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Всего сессий</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.userJourney.totalSessions}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Генераций маршрутов</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.userJourney.routeGenerations}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Клики по "Купить"</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.buttonClicks.buyButtonClicks}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Конверсия</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.buttonClicks.conversionRate.toFixed(1)}%</div>
            <div className="text-xs text-gray-500">
              {analytics.userJourney.purchases} покупок
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="locations" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="locations">Города</TabsTrigger>
          <TabsTrigger value="goals">Категории</TabsTrigger>
          <TabsTrigger value="timewindows">Время</TabsTrigger>
          <TabsTrigger value="journey">Воронка</TabsTrigger>
          <TabsTrigger value="temporal">Динамика</TabsTrigger>
        </TabsList>

        {/* Locations Analytics */}
        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Популярность городов</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analytics.locations.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" name="Запросы" />
                  <Bar dataKey="conversions" fill="#82ca9d" name="Покупки" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.locations.slice(0, 10).map((location) => (
              <Card key={location.name}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{location.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Запросов:</span>
                      <Badge variant="outline">{location.count}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Покупок:</span>
                      <Badge variant="outline">{location.conversions}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Конверсия:</span>
                      <Badge variant={location.conversionRate > 10 ? "default" : "secondary"}>
                        {location.conversionRate.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Goals Analytics */}
        <TabsContent value="goals" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Распределение интересов</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.goals.slice(0, 8)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analytics.goals.slice(0, 8).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Топ категорий</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.goals.slice(0, 10).map((goal, index) => (
                    <div key={goal.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span>{goal.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{goal.count}</Badge>
                        <Badge variant="secondary">{goal.percentage.toFixed(1)}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Time Windows Analytics */}
        <TabsContent value="timewindows" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Предпочтения по времени</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.timeWindows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="window" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analytics.timeWindows.map((timeWindow) => (
              <Card key={timeWindow.window}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{timeWindow.window}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Выборов:</span>
                      <Badge variant="outline">{timeWindow.count}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Процент:</span>
                      <Badge variant="secondary">{timeWindow.percentage.toFixed(1)}%</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* User Journey Funnel */}
        <TabsContent value="journey" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Воронка пользователей</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <span className="font-medium">Посетители</span>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {analytics.userJourney.totalSessions}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <span className="font-medium">Генерация маршрутов</span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {analytics.userJourney.routeGenerations}
                    </Badge>
                    <Badge variant="secondary">
                      {analytics.userJourney.totalSessions > 0 
                        ? ((analytics.userJourney.routeGenerations / analytics.userJourney.totalSessions) * 100).toFixed(1)
                        : 0}%
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                  <span className="font-medium">Клики "Купить"</span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {analytics.userJourney.buyButtonClicks}
                    </Badge>
                    <Badge variant="secondary">
                      {analytics.userJourney.routeGenerations > 0 
                        ? ((analytics.userJourney.buyButtonClicks / analytics.userJourney.routeGenerations) * 100).toFixed(1)
                        : 0}%
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                  <span className="font-medium">Покупки</span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {analytics.userJourney.purchases}
                    </Badge>
                    <Badge variant="secondary">
                      {analytics.userJourney.buyButtonClicks > 0 
                        ? ((analytics.userJourney.purchases / analytics.userJourney.buyButtonClicks) * 100).toFixed(1)
                        : 0}%
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="font-medium">Отзывы</span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {analytics.userJourney.feedbackSubmissions}
                    </Badge>
                    <Badge variant="secondary">
                      {analytics.userJourney.purchases > 0 
                        ? ((analytics.userJourney.feedbackSubmissions / analytics.userJourney.purchases) * 100).toFixed(1)
                        : 0}%
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Temporal Analytics */}
        <TabsContent value="temporal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Активность за последние 30 дней</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analytics.temporal.generationsByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString('ru-RU')}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    name="Генерации"
                    data={analytics.temporal.generationsByDay}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAnalytics;