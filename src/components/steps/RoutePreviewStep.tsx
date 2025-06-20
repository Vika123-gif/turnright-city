
import React, { useState } from "react";
import Button from "../Button";
import { Repeat } from "lucide-react";
import type { LLMPlace } from "@/hooks/useOpenAI";
import { createClient } from "@supabase/supabase-js";

// Use the same hardcoded Supabase credentials as in ChatFlow
const supabaseUrl = "https://gwwqfoplhhtyjkrhazbt.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3d3Fmb3BsaGh0eWprcmhhemJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwMDU5OTQsImV4cCI6MjA2NTU4MTk5NH0.fgFpmEdc3swzKw0xlGYt68a9vM9J2F3fKdT413UNoPk";

type Props = {
  places: LLMPlace[];
  onRegenerate: () => void;
  onBuy: () => void;
  purchasing: boolean;
  error?: string | null;
};

const RoutePreviewStep: React.FC<Props> = ({
  places,
  onRegenerate,
  onBuy,
  purchasing,
  error,
}) => {
  const [processing, setProcessing] = useState(false);
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  async function handlePayment() {
    setProcessing(true);
    try {
      console.log("Starting payment process...");
      
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          places: places,
        }
      });

      if (error) {
        console.error("Payment error:", error);
        throw error;
      }

      if (data?.url) {
        console.log("Redirecting to Stripe checkout:", data.url);
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
        // Call the original onBuy to update the UI state
        onBuy();
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
            {processing ? "Processing..." : purchasing ? "Processing..." : "Buy Route"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default RoutePreviewStep;
