
import React, { useState } from "react";
import Button from "../Button";
import { Repeat } from "lucide-react";
import type { LLMPlace } from "@/hooks/useOpenAI";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  places: LLMPlace[];
  onRegenerate: () => void;
  onBuy: () => void;
  purchasing: boolean;
  error?: string | null;
  location?: string;
  onTrackBuyClick?: (location: string, placesCount: number) => void;
};

const RoutePreviewStep: React.FC<Props> = ({
  places,
  onRegenerate,
  onBuy,
  purchasing,
  error,
  location = '',
  onTrackBuyClick,
}) => {
  const [processing, setProcessing] = useState(false);

  async function handlePayment() {
    console.log("=== DEBUG: handlePayment called ===");
    console.log("Current places:", places);
    console.log("Current location:", location);
    
    // Track the buy button click
    if (onTrackBuyClick) {
      onTrackBuyClick(location, places.length);
    }
    
    setProcessing(true);
    try {
      console.log("Starting payment process...");
      console.log("Places to purchase:", places);
      
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: JSON.stringify({
          places: places,
        }),
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (error) {
        console.error("Payment error:", error);
        throw error;
      }

      if (data?.url) {
        console.log("Redirecting to Stripe checkout:", data.url);
        // Call onBuy first to set up the route data
        onBuy();
        // Then redirect to Stripe checkout in the same window
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err: any) {
      console.error("Payment failed:", err);
      alert("Payment failed: " + (err.message || "Unknown error"));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="chat-card text-left">
      <div className="font-semibold text-lg mb-3 flex items-center gap-2">
        📍 Here's what I found for you:
      </div>
      
      {error && (
        <div className="text-red-500 mb-3">{error}</div>
      )}
      
      {!error && (
        <div className="bg-[#F6FDF9] px-4 py-3 rounded-lg text-base mb-6">
          {places && places.length > 0 ? (
            <div className="space-y-4">
              {places.map((p, i) => (
                <div key={i} className="mb-3">
                  <div className="font-semibold text-base">{`${i + 1}. ${p.name}`}</div>
                  <div className="text-gray-600 text-sm">{p.address}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    🚶 {p.walkingTime} min walk
                    {p.type && ` | Type: ${p.type}`}
                  </div>
                  {p.reason && (
                    <div className="text-sm mt-1 text-[#008457]">{p.reason}</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div>No results found. Try different time or goals.</div>
          )}
        </div>
      )}
      
      <div className="flex flex-col gap-4">
        <Button variant="outline" onClick={onRegenerate} disabled={purchasing || processing}>
          <Repeat className="w-5 h-5 mr-2 -ml-1" /> Generate Again
        </Button>
        {!error && places.length > 0 && (
          <Button 
            variant="primary" 
            onClick={handlePayment} 
            disabled={purchasing || processing}
          >
            {processing ? "Opening Payment..." : "Buy Route"}
          </Button>
        )}

        {/* MVP Link */}
        <div className="border-t pt-4 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Save for the next generations!
          </p>
          <a
            href="https://turnright.city/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#008457] underline font-medium text-sm hover:text-[#00BC72] transition-colors"
          >
            Visit TurnRight.city
          </a>
        </div>
      </div>
    </div>
  );
};

export default RoutePreviewStep;
