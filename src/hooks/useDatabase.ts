
import { supabase } from "@/integrations/supabase/client";
import type { LLMPlace } from "@/hooks/useOpenAI";

export const useDatabase = () => {
  const generateSessionId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const saveRouteGeneration = async (
    location: string,
    timeWindow: string | null,
    goals: string[],
    places: LLMPlace[],
    userSessionId: string
  ) => {
    try {
      console.log('Attempting to save route generation:', {
        location,
        timeWindow,
        goals,
        placesCount: places.length,
        userSessionId
      });

      const { data, error } = await supabase
        .from('route_generations')
        .insert({
          location,
          time_window: timeWindow,
          goals,
          places_generated: places,
          places_count: places.length,
          user_session_id: userSessionId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving route generation:', error);
        return null;
      }

      console.log('Route generation saved successfully:', data);
      return data;
    } catch (err) {
      console.error('Exception saving route generation:', err);
      return null;
    }
  };

  const saveRoutePurchase = async (
    routeGenerationId: string | null,
    location: string,
    placesCount: number,
    userSessionId: string
  ) => {
    try {
      console.log('Attempting to save route purchase:', {
        routeGenerationId,
        location,
        placesCount,
        userSessionId
      });

      const { data, error } = await supabase
        .from('route_purchases')
        .insert({
          route_generation_id: routeGenerationId,
          location,
          places_count: placesCount,
          user_session_id: userSessionId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving route purchase:', error);
        return null;
      }

      console.log('Route purchase saved successfully:', data);
      return data;
    } catch (err) {
      console.error('Exception saving route purchase:', err);
      return null;
    }
  };

  const saveFeedback = async (
    routeGenerationId: string | null,
    rating: number | null,
    textFeedback: string | null,
    location: string,
    placesCount: number,
    userSessionId: string
  ) => {
    try {
      console.log('Attempting to save feedback:', {
        routeGenerationId,
        rating,
        textFeedback,
        location,
        placesCount,
        userSessionId
      });

      const { data, error } = await supabase
        .from('user_feedback')
        .insert({
          route_generation_id: routeGenerationId,
          rating,
          text_feedback: textFeedback,
          location,
          places_count: placesCount,
          user_session_id: userSessionId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving feedback:', error);
        return null;
      }

      console.log('Feedback saved successfully:', data);
      return data;
    } catch (err) {
      console.error('Exception saving feedback:', err);
      return null;
    }
  };

  return {
    generateSessionId,
    saveRouteGeneration,
    saveRoutePurchase,
    saveFeedback,
  };
};
