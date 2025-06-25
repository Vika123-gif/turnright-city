import { supabase } from "@/integrations/supabase/client";
import type { LLMPlace } from "@/hooks/useOpenAI";

export const useDatabase = () => {
  const generateSessionId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const testConnection = async () => {
    try {
      console.log('=== TESTING DATABASE CONNECTION ===');
      const { data, error } = await supabase.from('route_generations').select('count').limit(1);
      
      if (error) {
        console.error('Database connection test failed:', error);
        return false;
      }
      
      console.log('Database connection test successful:', data);
      return true;
    } catch (err) {
      console.error('Database connection test exception:', err);
      return false;
    }
  };

  const trackVisitorSession = async (userSessionId: string) => {
    try {
      console.log('=== TRACK VISITOR SESSION ===');
      
      // First check if this session already exists
      const { data: existingSession, error: selectError } = await supabase
        .from('visitor_sessions')
        .select('*')
        .eq('user_session_id', userSessionId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('Error checking existing session:', selectError);
        return null;
      }

      if (existingSession) {
        // Update existing session
        const { data, error } = await supabase
          .from('visitor_sessions')
          .update({
            last_visit_at: new Date().toISOString(),
            visit_count: existingSession.visit_count + 1
          })
          .eq('user_session_id', userSessionId)
          .select()
          .single();

        if (error) {
          console.error('Error updating visitor session:', error);
          return null;
        }

        console.log('Updated visitor session:', data);
        return data;
      } else {
        // Create new session
        const insertData = {
          user_session_id: userSessionId,
          user_agent: window.navigator.userAgent,
          referrer: document.referrer || null,
          first_visit_at: new Date().toISOString(),
          last_visit_at: new Date().toISOString(),
          visit_count: 1
        };

        const { data, error } = await supabase
          .from('visitor_sessions')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error('Error creating visitor session:', error);
          return null;
        }

        console.log('Created new visitor session:', data);
        return data;
      }
    } catch (err) {
      console.error('Exception in trackVisitorSession:', err);
      return null;
    }
  };

  const trackLocationExit = async (
    userSessionId: string,
    currentLocation: string | null,
    exitAction: 'detect_location' | 'manual_input'
  ) => {
    try {
      console.log('=== TRACK LOCATION EXIT ===');
      console.log('Exit action:', exitAction);
      console.log('Current location:', currentLocation);
      
      const insertData = {
        user_session_id: userSessionId,
        current_location: currentLocation,
        exit_action: exitAction,
        clicked_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('location_exits')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error tracking location exit:', error);
        return null;
      }

      console.log('Location exit tracked successfully:', data);
      return data;
    } catch (err) {
      console.error('Exception in trackLocationExit:', err);
      return null;
    }
  };

  const saveRouteGeneration = async (
    location: string,
    timeWindow: string | null,
    goals: string[],
    places: LLMPlace[],
    userSessionId: string
  ) => {
    try {
      console.log('=== SAVE ROUTE GENERATION ATTEMPT ===');
      console.log('Connection test before insert...');
      await testConnection();
      
      console.log('Attempting to save route generation with data:', {
        location,
        time_window: timeWindow,
        goals,
        places_generated: places,
        places_count: places.length,
        user_session_id: userSessionId
      });

      const insertData = {
        location,
        time_window: timeWindow,
        goals,
        places_generated: places,
        places_count: places.length,
        user_session_id: userSessionId,
      };

      console.log('Insert data prepared:', insertData);

      const { data, error } = await supabase
        .from('route_generations')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('=== ROUTE GENERATION INSERT ERROR ===');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('Full error object:', error);
        return null;
      }

      console.log('=== ROUTE GENERATION SAVED SUCCESSFULLY ===');
      console.log('Saved data:', data);
      return data;
    } catch (err) {
      console.error('=== ROUTE GENERATION SAVE EXCEPTION ===');
      console.error('Exception details:', err);
      return null;
    }
  };

  const saveBuyButtonClick = async (
    routeGenerationId: string | null,
    location: string,
    placesCount: number,
    userSessionId: string
  ) => {
    try {
      console.log('=== SAVE BUY BUTTON CLICK ATTEMPT ===');
      console.log('Connection test before insert...');
      await testConnection();
      
      const insertData = {
        route_generation_id: routeGenerationId,
        location,
        places_count: placesCount,
        user_session_id: userSessionId,
      };

      console.log('Buy button click insert data:', insertData);

      const { data, error } = await supabase
        .from('buy_button_clicks')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('=== BUY BUTTON CLICK INSERT ERROR ===');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('Full error object:', error);
        return null;
      }

      console.log('=== BUY BUTTON CLICK SAVED SUCCESSFULLY ===');
      console.log('Saved data:', data);
      return data;
    } catch (err) {
      console.error('=== BUY BUTTON CLICK SAVE EXCEPTION ===');
      console.error('Exception details:', err);
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
      console.log('=== SAVE ROUTE PURCHASE ATTEMPT ===');
      console.log('Connection test before insert...');
      await testConnection();
      
      const insertData = {
        route_generation_id: routeGenerationId,
        location,
        places_count: placesCount,
        user_session_id: userSessionId,
      };

      console.log('Purchase insert data:', insertData);

      const { data, error } = await supabase
        .from('route_purchases')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('=== ROUTE PURCHASE INSERT ERROR ===');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('Full error object:', error);
        return null;
      }

      console.log('=== ROUTE PURCHASE SAVED SUCCESSFULLY ===');
      console.log('Saved data:', data);
      return data;
    } catch (err) {
      console.error('=== ROUTE PURCHASE SAVE EXCEPTION ===');
      console.error('Exception details:', err);
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
      console.log('=== SAVE FEEDBACK ATTEMPT ===');
      console.log('Connection test before insert...');
      await testConnection();
      
      const insertData = {
        route_generation_id: routeGenerationId,
        rating,
        text_feedback: textFeedback,
        location,
        places_count: placesCount,
        user_session_id: userSessionId,
      };

      console.log('Feedback insert data:', insertData);

      const { data, error } = await supabase
        .from('user_feedback')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('=== FEEDBACK INSERT ERROR ===');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('Full error object:', error);
        return null;
      }

      console.log('=== FEEDBACK SAVED SUCCESSFULLY ===');
      console.log('Saved data:', data);
      return data;
    } catch (err) {
      console.error('=== FEEDBACK SAVE EXCEPTION ===');
      console.error('Exception details:', err);
      return null;
    }
  };

  return {
    generateSessionId,
    trackVisitorSession,
    trackLocationExit,
    saveRouteGeneration,
    saveBuyButtonClick,
    saveRoutePurchase,
    saveFeedback,
    testConnection,
  };
};
