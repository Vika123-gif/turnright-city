import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserInteraction {
  interactionType: 'button_click' | 'form_submit' | 'page_view' | 'route_action' | 'navigation' | 'error';
  interactionName: string;
  pagePath?: string;
  componentName?: string;
  interactionData?: Record<string, any>;
  userAgent?: string;
  referrer?: string;
}

export interface RouteGenerationDetails {
  scenario: 'onsite' | 'planning';
  location: string;
  timeWindow?: number;
  goals: string[];
  additionalSettings?: string[];
  destinationType?: 'none' | 'circle' | 'specific';
  destination?: string;
  days?: number;
  generationStartedAt: Date;
  generationCompletedAt?: Date;
  generationDurationMs?: number;
  apiCallsMade?: number;
  apiErrors?: string[];
  placesFound?: number;
  placesReturned?: number;
  totalWalkingTime?: number;
  totalVisitTime?: number;
  routeOptimizationApplied?: boolean;
  debugInfo?: Record<string, any>;
}

export const useComprehensiveTracking = () => {
  const [userSessionId, setUserSessionId] = useState<string>('');
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(true);

  // Generate or retrieve session ID
  useEffect(() => {
    const generateSessionId = () => {
      const timestamp = Date.now().toString(36);
      const randomPart = Math.random().toString(36).substring(2, 15);
      return `${timestamp}_${randomPart}`;
    };

    let sessionId = localStorage.getItem('user_session_id');
    if (!sessionId) {
      sessionId = generateSessionId();
      localStorage.setItem('user_session_id', sessionId);
    }
    setUserSessionId(sessionId);
  }, []);

  // Track user interaction
  const trackInteraction = async (interaction: UserInteraction) => {
    if (!isTrackingEnabled || !userSessionId) return;

    try {
      const interactionData = {
        user_session_id: userSessionId,
        interaction_type: interaction.interactionType,
        interaction_name: interaction.interactionName,
        page_path: interaction.pagePath || window.location.pathname,
        component_name: interaction.componentName,
        interaction_data: interaction.interactionData || {},
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        timestamp: new Date().toISOString()
      };

      const { error } = await supabase
        .from('user_interactions')
        .insert(interactionData);

      if (error) {
        console.error('Error tracking interaction:', error);
      } else {
        console.log('Interaction tracked:', interaction.interactionName);
      }
    } catch (error) {
      console.error('Exception tracking interaction:', error);
    }
  };

  // Track button click
  const trackButtonClick = async (
    buttonType: string,
    buttonText?: string,
    componentName?: string,
    additionalData?: Record<string, any>
  ) => {
    await trackInteraction({
      interactionType: 'button_click',
      interactionName: buttonType,
      componentName,
      interactionData: {
        buttonText,
        ...additionalData
      }
    });

    // Also save to button_clicks table for backward compatibility
    try {
      const { error } = await supabase
        .from('button_clicks')
        .insert({
          user_session_id: userSessionId,
          button_type: buttonType,
          button_text: buttonText,
          component_name: componentName,
          page_path: window.location.pathname,
          additional_data: additionalData || {},
          clicked_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error tracking button click:', error);
      }
    } catch (error) {
      console.error('Exception tracking button click:', error);
    }
  };

  // Track route generation details
  const trackRouteGeneration = async (details: RouteGenerationDetails) => {
    if (!isTrackingEnabled || !userSessionId) return;

    try {
      const routeData = {
        user_session_id: userSessionId,
        scenario: details.scenario,
        location: details.location,
        time_window: details.timeWindow,
        goals: details.goals,
        additional_settings: details.additionalSettings || [],
        destination_type: details.destinationType,
        destination: details.destination,
        days: details.days,
        generation_started_at: details.generationStartedAt.toISOString(),
        generation_completed_at: details.generationCompletedAt?.toISOString(),
        generation_duration_ms: details.generationDurationMs,
        api_calls_made: details.apiCallsMade || 0,
        api_errors: details.apiErrors || [],
        places_found: details.placesFound || 0,
        places_returned: details.placesReturned || 0,
        total_walking_time: details.totalWalkingTime || 0,
        total_visit_time: details.totalVisitTime || 0,
        route_optimization_applied: details.routeOptimizationApplied || false,
        debug_info: details.debugInfo || {}
      };

      const { data, error } = await supabase
        .from('route_generation_details')
        .insert(routeData)
        .select()
        .single();

      if (error) {
        console.error('Error tracking route generation:', error);
        return null;
      } else {
        console.log('Route generation tracked:', data.id);
        return data;
      }
    } catch (error) {
      console.error('Exception tracking route generation:', error);
      return null;
    }
  };

  // Track page view
  const trackPageView = async (pagePath?: string, additionalData?: Record<string, any>) => {
    await trackInteraction({
      interactionType: 'page_view',
      interactionName: 'page_view',
      pagePath: pagePath || window.location.pathname,
      interactionData: additionalData
    });
  };

  // Track navigation
  const trackNavigation = async (
    fromPage: string,
    toPage: string,
    navigationMethod: string,
    additionalData?: Record<string, any>
  ) => {
    await trackInteraction({
      interactionType: 'navigation',
      interactionName: 'navigation',
      interactionData: {
        fromPage,
        toPage,
        navigationMethod,
        ...additionalData
      }
    });
  };

  // Track error
  const trackError = async (
    errorType: string,
    errorMessage: string,
    componentName?: string,
    additionalData?: Record<string, any>
  ) => {
    await trackInteraction({
      interactionType: 'error',
      interactionName: errorType,
      componentName,
      interactionData: {
        errorMessage,
        ...additionalData
      }
    });
  };

  // Track form submission
  const trackFormSubmit = async (
    formName: string,
    formData: Record<string, any>,
    componentName?: string
  ) => {
    await trackInteraction({
      interactionType: 'form_submit',
      interactionName: formName,
      componentName,
      interactionData: formData
    });
  };

  // Track route action (save, share, etc.)
  const trackRouteAction = async (
    actionType: 'save' | 'share' | 'comment' | 'regenerate' | 'download',
    routeData?: Record<string, any>,
    componentName?: string
  ) => {
    await trackInteraction({
      interactionType: 'route_action',
      interactionName: actionType,
      componentName,
      interactionData: routeData
    });
  };

  // Enable/disable tracking
  const setTrackingEnabled = (enabled: boolean) => {
    setIsTrackingEnabled(enabled);
    localStorage.setItem('tracking_enabled', enabled.toString());
  };

  // Load tracking preference
  useEffect(() => {
    const savedPreference = localStorage.getItem('tracking_enabled');
    if (savedPreference !== null) {
      setIsTrackingEnabled(savedPreference === 'true');
    }
  }, []);

  return {
    userSessionId,
    isTrackingEnabled,
    trackInteraction,
    trackButtonClick,
    trackRouteGeneration,
    trackPageView,
    trackNavigation,
    trackError,
    trackFormSubmit,
    trackRouteAction,
    setTrackingEnabled
  };
};
