import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useLocalTracking } from './useLocalTracking';

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
  const { user } = useAuth();
  const localTracking = useLocalTracking();
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
        user_id: user?.id || null,
        user_email: user?.email || null,
        session_id: userSessionId,
        action_type: interaction.interactionType,
        action_name: interaction.interactionName,
        page_url: interaction.pagePath || window.location.pathname,
        user_agent: navigator.userAgent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
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
    // Use local tracking instead of database
    localTracking.trackButtonClick(buttonType, {
      buttonText,
      componentName,
      ...additionalData
    });

    console.log('📊 Button click tracked locally:', {
      buttonType,
      buttonText,
      componentName,
      additionalData
    });
  };

  // Track route generation details
  const trackRouteGeneration = async (details: RouteGenerationDetails) => {
    if (!isTrackingEnabled || !userSessionId) return;

    // Use local tracking instead of database
    localTracking.trackRouteGeneration({
      scenario: details.scenario,
      location: details.location,
      timeWindow: details.timeWindow,
      goals: details.goals,
      days: details.days,
      placesFound: details.placesFound || 0,
      generationDurationMs: details.generationDurationMs,
      apiCallsMade: details.apiCallsMade || 0,
      apiErrors: details.apiErrors || [],
      debugInfo: details.debugInfo || {}
    });

    console.log('📊 Route generation tracked locally:', details);
    return { id: 'local_' + Date.now() };
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
    // Use local tracking instead of database
    if (actionType === 'comment') {
      localTracking.trackComment({
        commentText: routeData?.commentText || routeData?.comment,
        rating: routeData?.rating,
        ...routeData
      });
    } else if (actionType === 'save') {
      localTracking.trackSaveRoute({
        format: routeData?.format || 'html',
        ...routeData
      });
    } else {
      localTracking.trackAction({
        actionType: 'route_action' as any, // Type will be fixed when Supabase types are regenerated
        actionName: actionType,
        data: {
          componentName,
          ...routeData
        }
      });
    }

    console.log('📊 Route action tracked locally:', {
      actionType,
      routeData,
      componentName
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
    setTrackingEnabled,
    // Export local tracking functions
    exportActions: localTracking.exportActions,
    clearActions: localTracking.clearActions,
    getActionsCount: localTracking.getActionsCount,
    getActionsByType: localTracking.getActionsByType
  };
};
