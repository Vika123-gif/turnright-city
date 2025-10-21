import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

interface InteractionData {
  actionType: 'button_click' | 'route_generate' | 'route_complete' | 'comment' | 'purchase' | 'page_view';
  actionName: string;
  routeId?: string;
  scenario?: 'onsite' | 'planning';
  location?: string;
  timeMinutes?: number;
  categories?: string[];
  days?: number;
  placesFound?: number;
  placesData?: any;
  generationSuccessful?: boolean;
  errorMessage?: string;
  userComment?: string;
  rating?: number;
  feedbackType?: 'positive' | 'negative' | 'suggestion';
  purchaseAmount?: number;
  creditsPurchased?: number;
  paymentMethod?: string;
  stripePaymentId?: string;
  sessionId?: string;
  pageUrl?: string;
  userAgent?: string;
}

export const useUserTracking = () => {
  const { user } = useAuth();

  const trackInteraction = async (data: InteractionData): Promise<string | null> => {
    if (!user?.id || !user?.email) {
      console.warn('Cannot track interaction: user not logged in');
      return null;
    }

    try {
      console.log('=== Tracking user interaction ===', data);

      const { data: interactionId, error } = await supabase
        .rpc('log_user_interaction', {
          p_user_id: user.id,
          p_user_email: user.email,
          p_action_type: data.actionType,
          p_action_name: data.actionName,
          p_route_id: data.routeId || null,
          p_scenario: data.scenario || null,
          p_location: data.location || null,
          p_time_minutes: data.timeMinutes || null,
          p_categories: data.categories || null,
          p_days: data.days || null,
          p_places_found: data.placesFound || null,
          p_places_data: data.placesData || null,
          p_generation_successful: data.generationSuccessful || null,
          p_error_message: data.errorMessage || null,
          p_user_comment: data.userComment || null,
          p_rating: data.rating || null,
          p_feedback_type: data.feedbackType || null,
          p_purchase_amount: data.purchaseAmount || null,
          p_credits_purchased: data.creditsPurchased || null,
          p_payment_method: data.paymentMethod || null,
          p_stripe_payment_id: data.stripePaymentId || null,
          p_session_id: data.sessionId || null,
          p_page_url: data.pageUrl || window.location.href,
          p_user_agent: data.userAgent || navigator.userAgent
        });

      if (error) {
        console.error('Error tracking interaction:', error);
        return null;
      }

      console.log('✅ Interaction tracked successfully:', interactionId);
      return interactionId;
    } catch (err) {
      console.error('Exception tracking interaction:', err);
      return null;
    }
  };

  // Convenience methods for common interactions
  const trackButtonClick = (buttonName: string, additionalData?: Partial<InteractionData>) => {
    return trackInteraction({
      actionType: 'button_click',
      actionName: buttonName,
      ...additionalData
    });
  };

  const trackRouteGeneration = (data: {
    scenario: 'onsite' | 'planning';
    location?: string;
    timeMinutes?: number;
    categories?: string[];
    days?: number;
  }) => {
    return trackInteraction({
      actionType: 'route_generate',
      actionName: 'generate_route',
      ...data
    });
  };

  const trackRouteComplete = (data: {
    routeId: string;
    placesFound: number;
    placesData: any;
    generationSuccessful: boolean;
    errorMessage?: string;
  }) => {
    return trackInteraction({
      actionType: 'route_complete',
      actionName: 'route_completed',
      ...data
    });
  };

  const trackComment = (data: {
    userComment: string;
    rating?: number;
    feedbackType?: 'positive' | 'negative' | 'suggestion';
  }) => {
    return trackInteraction({
      actionType: 'comment',
      actionName: 'user_feedback',
      ...data
    });
  };

  const trackPurchase = (data: {
    purchaseAmount: number;
    creditsPurchased: number;
    paymentMethod: string;
    stripePaymentId?: string;
  }) => {
    return trackInteraction({
      actionType: 'purchase',
      actionName: 'credits_purchased',
      ...data
    });
  };

  const trackPageView = (pageName: string) => {
    return trackInteraction({
      actionType: 'page_view',
      actionName: pageName
    });
  };

  return {
    trackInteraction,
    trackButtonClick,
    trackRouteGeneration,
    trackRouteComplete,
    trackComment,
    trackPurchase,
    trackPageView
  };
};
