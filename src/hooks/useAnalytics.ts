
import { useEffect } from 'react';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

const GA_MEASUREMENT_ID = 'G-M39MJ3SEWZ';

export const useAnalytics = () => {
  useEffect(() => {
    // Load Google Analytics script
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script1);

    const script2 = document.createElement('script');
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA_MEASUREMENT_ID}');
    `;
    document.head.appendChild(script2);

    return () => {
      document.head.removeChild(script1);
      document.head.removeChild(script2);
    };
  }, []);

  const trackEvent = (eventName: string, eventParams?: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, eventParams);
    }
  };

  const trackRouteGeneration = (location: string, timeWindow: string, goals: string[]) => {
    trackEvent('generate_route', {
      location,
      time_window: timeWindow,
      goals: goals.join(','),
    });
  };

  const trackBuyRouteClick = (location: string, placesCount: number) => {
    trackEvent('buy_route_click', {
      location,
      places_count: placesCount,
      event_category: 'engagement',
      event_label: 'buy_route_button',
    });
  };

  const trackRoutePurchase = (location: string, placesCount: number) => {
    trackEvent('purchase_route', {
      location,
      places_count: placesCount,
      value: 2, // Updated to match the €2.00 price
    });
  };

  const trackRouteRating = (rating: number) => {
    trackEvent('rate_route', {
      rating,
    });
  };

  const trackTextFeedback = (feedback: string, location: string, placesCount: number) => {
    trackEvent('text_feedback', {
      feedback_length: feedback.length,
      location,
      places_count: placesCount,
      event_category: 'engagement',
      event_label: 'route_feedback',
    });
  };

  return {
    trackEvent,
    trackRouteGeneration,
    trackBuyRouteClick,
    trackRoutePurchase,
    trackRouteRating,
    trackTextFeedback,
  };
};
