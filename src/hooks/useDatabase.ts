
import { supabase } from "@/integrations/supabase/client";
import type { LLMPlace } from "@/hooks/useOpenAI";

export const useDatabase = () => {
  const generateSessionId = () => {
    // Try to get existing session ID from localStorage first
    const existingSessionId = localStorage.getItem('userSessionId');
    if (existingSessionId) {
      console.log('Found existing session ID in localStorage:', existingSessionId);
      return existingSessionId;
    }
    
    // Generate new session ID and store it
    const newSessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('userSessionId', newSessionId);
    console.log('Generated new session ID:', newSessionId);
    return newSessionId;
  };

  const saveRouteSessionToStorage = async (
    userSessionId: string,
    payload: Record<string, any>
  ) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const path = `${userSessionId}/${timestamp}.json`;
      const jsonString = JSON.stringify(payload, null, 2);
      const { error } = await supabase
        .storage
        .from('routes')
        .upload(path, new Blob([jsonString], { type: 'application/json' }), { upsert: true });
      if (error) {
        console.warn('Failed to upload route session JSON to storage:', error);
        return null;
      }
      return { path };
    } catch (err) {
      console.warn('Exception uploading route session JSON:', err);
      return null;
    }
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
      console.log('=== TRACK VISITOR SESSION DEBUG ===');
      console.log('Session ID to track:', userSessionId);
      
      // Check if we've already tracked this session in this browser session
      const sessionTrackedKey = `session_tracked_${userSessionId}`;
      const alreadyTracked = sessionStorage.getItem(sessionTrackedKey);
      console.log('Already tracked in this browser session?', !!alreadyTracked);
      
      if (alreadyTracked) {
        console.log('Session already tracked in this browser session, skipping');
        return null;
      }
      
      // First check if this session already exists in the database
      console.log('Checking database for existing session...');
      const { data: existingSession, error: selectError } = await supabase
        .from('visitor_sessions')
        .select('*')
        .eq('user_session_id', userSessionId)
        .maybeSingle();

      if (selectError) {
        console.error('Error checking existing session:', selectError);
        return null;
      }

      console.log('Database query result - existing session:', existingSession);

      if (existingSession) {
        // Update existing session - this makes them a returning visitor
        console.log('RETURNING VISITOR - Updating existing session');
        console.log('Current visit count:', existingSession.visit_count);
        
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

        console.log('SUCCESS - Updated visitor session (returning visitor):', data);
        console.log('New visit count:', data.visit_count);
        
        // Mark this session as tracked in browser session
        sessionStorage.setItem(sessionTrackedKey, 'true');
        return data;
      } else {
        // Create new session - this is a new visitor
        console.log('NEW VISITOR - Creating new session');
        const insertData = {
          user_session_id: userSessionId,
          user_agent: window.navigator.userAgent,
          referrer: document.referrer || null,
          first_visit_at: new Date().toISOString(),
          last_visit_at: new Date().toISOString(),
          visit_count: 1
        };

        console.log('Insert data for new visitor:', insertData);

        const { data, error } = await supabase
          .from('visitor_sessions')
          .insert(insertData)
          .select()
          .single();

        if (error) {
          console.error('Error creating visitor session:', error);
          return null;
        }

        console.log('SUCCESS - Created new visitor session (new visitor):', data);
        
        // Mark this session as tracked in browser session
        sessionStorage.setItem(sessionTrackedKey, 'true');
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
      console.log('User session ID:', userSessionId);
      
      const insertData = {
        user_session_id: userSessionId,
        current_location: currentLocation,
        exit_action: exitAction,
        clicked_at: new Date().toISOString()
      };

      console.log('Inserting location exit data:', insertData);

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
    userSessionId: string,
    scenario?: 'onsite' | 'planning',
    days?: number,
    additionalSettings?: string[]
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

      // Also log to user_interactions with full details for analytics
      try {
        const { error: uiError } = await supabase
          .from('user_interactions')
          .insert({
            user_id: null,
            user_email: null,
            user_session_id: userSessionId,
            action_type: 'route_generate',
            action_name: 'generate_route',
            scenario: scenario ?? null,
            location,
            time_minutes: timeWindow ? parseInt(timeWindow as string, 10) : null,
            categories: goals,
            days: days ?? null,
            additional_settings: additionalSettings ?? null,
            places_found: places.length,
            places_data: places,
            generation_successful: true,
            error_message: null,
            page_url: typeof window !== 'undefined' ? window.location.pathname : null,
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          });

        if (uiError) {
          console.warn('Non-fatal: failed to insert into user_interactions:', uiError);
        }
      } catch (uiEx) {
        console.warn('Non-fatal: exception inserting into user_interactions:', uiEx);
      }

      // Save full session JSON to Storage (best-effort)
      void saveRouteSessionToStorage(userSessionId, {
        sessionId: userSessionId,
        createdAt: new Date().toISOString(),
        scenario: scenario ?? null,
        location,
        time_minutes: timeWindow ? (typeof timeWindow === 'string' ? parseInt(timeWindow, 10) : timeWindow) : null,
        categories: goals,
        days: days ?? null,
        additional_settings: additionalSettings ?? [],
        generation_successful: true,
        error_message: null,
        places,
        page_url: typeof window !== 'undefined' ? window.location.pathname : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      });
      return data;
    } catch (err) {
      console.error('=== ROUTE GENERATION SAVE EXCEPTION ===');
      console.error('Exception details:', err);
      // Best-effort log failure into user_interactions
      try {
        const { error: uiError } = await supabase
          .from('user_interactions')
          .insert({
            user_id: null,
            user_email: null,
            user_session_id: userSessionId,
            action_type: 'route_generate',
            action_name: 'generate_route',
            scenario: scenario ?? null,
            location,
            time_minutes: timeWindow ? (typeof timeWindow === 'string' ? parseInt(timeWindow, 10) : timeWindow) : null,
            categories: goals,
            days: days ?? null,
            additional_settings: additionalSettings ?? null,
            places_found: 0,
            places_data: null,
            generation_successful: false,
            error_message: err instanceof Error ? err.message : String(err),
            page_url: typeof window !== 'undefined' ? window.location.pathname : null,
            user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          });
        if (uiError) {
          console.warn('Non-fatal: failed to insert error into user_interactions:', uiError);
        }
      } catch (uiEx) {
        console.warn('Non-fatal: exception inserting error into user_interactions:', uiEx);
      }

      // Save failure session JSON to Storage (best-effort)
      void saveRouteSessionToStorage(userSessionId, {
        sessionId: userSessionId,
        createdAt: new Date().toISOString(),
        scenario: scenario ?? null,
        location,
        time_minutes: timeWindow ? (typeof timeWindow === 'string' ? parseInt(timeWindow, 10) : timeWindow) : null,
        categories: goals,
        days: days ?? null,
        additional_settings: additionalSettings ?? [],
        generation_successful: false,
        error_message: err instanceof Error ? err.message : String(err),
        places: null,
        page_url: typeof window !== 'undefined' ? window.location.pathname : null,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      });
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
      console.log('Exception details:', err);
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

  const saveUserRoute = async (
    routeName: string,
    location: string,
    scenario: string,
    days: number,
    goals: string[],
    places: LLMPlace[],
    totalWalkingTime: number,
    mapUrl: string | null,
    userId: string | null = null  // Now accepts user_id
  ) => {
    try {
      console.log('=== SAVE USER ROUTE ATTEMPT ===');
      console.log('Connection test before insert...');
      await testConnection();
      
      // Require authentication for saved routes
      if (!userId) {
        throw new Error('Authentication required to save routes');
      }
      
      const insertData = {
        user_id: userId,  // Now properly set from authenticated user
        user_session_id: generateSessionId(), // Keep for backward compatibility
        route_name: routeName,
        location,
        scenario,
        days,
        goals,
        places: places,
        total_places: places.length,
        total_walking_time: totalWalkingTime,
        map_url: mapUrl,
      };

      console.log('Insert data for saved route:', insertData);

      const { data, error } = await supabase
        .from('saved_routes')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('Route saved successfully:', data);
      return data;
    } catch (err) {
      console.error('=== ROUTE SAVE EXCEPTION ===');
      console.error('Exception details:', err);
      return null;
    }
  };

  const getSavedRoutes = async (userSessionId: string) => {
    try {
      console.log('=== GET SAVED ROUTES ATTEMPT ===');
      
      const { data, error } = await supabase
        .from('saved_routes')
        .select('*')
        .eq('user_session_id', userSessionId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase select error:', error);
        throw error;
      }

      console.log('Retrieved saved routes:', data);
      return data;
    } catch (err) {
      console.error('=== GET SAVED ROUTES EXCEPTION ===');
      console.error('Exception details:', err);
      return null;
    }
  };

  const saveRouteToStorage = async (
    userSessionId: string,
    routeData: {
      scenario: 'onsite' | 'planning';
      location: string;
      timeWindow?: number;
      goals: string[];
      places: LLMPlace[];
      days?: number;
      additionalSettings?: string[];
      travelType?: string;
      destinationType?: string;
      destination?: string;
      totalWalkingTime?: number;
      totalExploringTime?: number;
    }
  ) => {
    try {
      console.log('=== SAVE ROUTE TO STORAGE ATTEMPT ===');
      
      // Create JSON data with all route information
      const jsonData = {
        userSessionId,
        timestamp: new Date().toISOString(),
        routeData: {
          scenario: routeData.scenario,
          location: routeData.location,
          timeWindow: routeData.timeWindow,
          goals: routeData.goals,
          places: routeData.places,
          days: routeData.days,
          additionalSettings: routeData.additionalSettings,
          travelType: routeData.travelType,
          destinationType: routeData.destinationType,
          destination: routeData.destination,
          totalWalkingTime: routeData.totalWalkingTime,
          totalExploringTime: routeData.totalExploringTime,
          placesCount: routeData.places.length
        }
      };

      // Create filename with timestamp and session ID
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${userSessionId}_${timestamp}.json`;
      const filePath = `routes/${filename}`;

      console.log('Saving route JSON to storage:', filePath);
      console.log('JSON data:', JSON.stringify(jsonData, null, 2));

      // Convert to blob
      const jsonBlob = new Blob([JSON.stringify(jsonData, null, 2)], {
        type: 'application/json'
      });

      // Upload to storage
      const { data, error } = await supabase.storage
        .from('routes')
        .upload(filePath, jsonBlob, {
          contentType: 'application/json',
          upsert: false
        });

      if (error) {
        console.error('=== STORAGE UPLOAD ERROR ===');
        console.error('Error code:', error.message);
        console.error('Full error:', error);
        return null;
      }

      console.log('=== ROUTE JSON SAVED TO STORAGE SUCCESSFULLY ===');
      console.log('Storage path:', data.path);
      return data;
    } catch (err) {
      console.error('=== SAVE ROUTE TO STORAGE EXCEPTION ===');
      console.error('Exception details:', err);
      return null;
    }
  };

  return {
    generateSessionId,
    trackVisitorSession,
    trackLocationExit,
    saveRouteGeneration,
    saveRouteSessionToStorage,
    saveBuyButtonClick,
    saveRoutePurchase,
    saveFeedback,
    saveUserRoute,
    getSavedRoutes,
    saveRouteToStorage,
    testConnection,
  };
};
