import React, { useState } from "react";
import { useOpenAI, type LLMPlace } from "@/hooks/useOpenAI";
import { useAnalytics } from "@/hooks/useAnalytics";
import { createClient } from "@supabase/supabase-js";
import WelcomeStep from "./steps/WelcomeStep";
import TimeStep from "./steps/TimeStep";
import GoalsStep from "./steps/GoalsStep";
import GPTStep from "./steps/GPTStep";
import RoutePreviewStep from "./steps/RoutePreviewStep";
import PurchaseStep from "./steps/PurchaseStep";
import RouteRating from "./RouteRating";

// HARDCODED SUPABASE CREDENTIALS FOR TESTING ONLY
const supabaseUrl = "https://gwwqfoplhhtyjkrhazbt.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3d3Fmb3BsaGh0eWprcmhhemJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwMDU5OTQsImV4cCI6MjA2NTU4MTk5NH0.fgFpmEdc3swzKw0xlGYt68a9vM9J2F3fKdT413UNoPk";

type Step =
  | "welcome"
  | "time"
  | "goals"
  | "generating"
  | "results"
  | "purchase";

export default function ChatFlow() {
  const [step, setStep] = useState<Step>("welcome");
  const [location, setLocation] = useState("");
  const [timeWindow, setTimeWindow] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [places, setPlaces] = useState<LLMPlace[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [routeRating, setRouteRating] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);
  const [purchaseRoute, setPurchaseRoute] = useState<{ origin: string; places: LLMPlace[] } | null>(null);

  const { getLLMPlaces } = useOpenAI();
  const { trackRouteGeneration, trackRoutePurchase, trackRouteRating } = useAnalytics();

  // Use hardcoded Supabase client for testing
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  async function fetchPlaces() {
    setError(null);
    setGenerating(true);
    setPlaces(null);
    
    // Track route generation attempt
    trackRouteGeneration(location, timeWindow || "", goals);
    
    try {
      const userPrompt = `You are a business travel assistant. User is at ${location}, has ${timeWindow}, wants to ${goals.join(", ")}. Suggest 1-2 realistic places nearby with walking times and reasons why they're perfect.`;
      const response: LLMPlace[] = await getLLMPlaces({
        location,
        goals,
        timeWindow: timeWindow || "",
        userPrompt,
      });
      setPlaces(response);
      setStep("results");
    } catch (e: any) {
      setError(e.message || "Could not generate route.");
      setStep("results");
    } finally {
      setGenerating(false);
    }
  }

  function regenerate() {
    setStep("generating");
    fetchPlaces();
  }

  function reset() {
    setLocation("");
    setTimeWindow(null);
    setGoals([]);
    setPlaces(null);
    setError(null);
    setPurchaseRoute(null);
    setRouteRating(null);
    setStep("welcome");
  }

  function handleBuyRoute() {
    if (!places || !location) return;
    
    // Track route purchase
    trackRoutePurchase(location, places.length);
    
    setPurchaseRoute({ origin: location, places });
    setStep("purchase");
  }

  function makeGoogleMapsRoute(origin: string, places: LLMPlace[] = []) {
    if (!places.length) return `https://maps.google.com`;

    const originEnc = encodeURIComponent(origin.trim());
    const waypointAddresses = places
      .slice(0, -1)
      .map(p => encodeURIComponent(p.address ? p.address : p.name));
    const destination =
      encodeURIComponent(
        (places[places.length - 1]?.address || places[places.length - 1]?.name || "")
      );

    let url = `https://www.google.com/maps/dir/?api=1&origin=${originEnc}&destination=${destination}&travelmode=walking`;
    if (waypointAddresses.length > 0) {
      url += `&waypoints=${waypointAddresses.join("|")}`;
    }
    return url;
  }

  function makeAppleMapsRoute(origin: string, places: LLMPlace[] = []) {
    if (!places.length) return `https://maps.apple.com`;

    const originStr = origin;
    const destinations = places.map(p => (p.address || p.name).replace(/\n/g, " ").trim());
    let url = `https://maps.apple.com/?saddr=${encodeURIComponent(originStr)}&daddr=${encodeURIComponent(destinations[0])}`;

    if (destinations.length > 1) {
      for (let i = 1; i < destinations.length; i++) {
        url += `%20to:${encodeURIComponent(destinations[i])}`;
      }
    }
    url += "&dirflg=w"; // walking
    return url;
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#F3FCF8] px-2 py-10">
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-md px-6 py-8 relative">
        {step === "welcome" && (
          <WelcomeStep
            onLocation={(loc) => {
              setLocation(loc);
              setStep("time");
            }}
            value={location}
          />
        )}

        {step === "time" && (
          <TimeStep
            onNext={(time) => {
              setTimeWindow(time);
              setStep("goals");
            }}
            value={timeWindow}
          />
        )}

        {step === "goals" && (
          <GoalsStep
            onNext={(selectedGoals) => {
              setGoals(selectedGoals);
              setStep("generating");
              fetchPlaces();
            }}
            value={goals}
          />
        )}

        {step === "generating" && (
          <GPTStep
            places={places || []}
            loading={generating}
            onDone={() => setStep("results")}
            error={error}
          />
        )}

        {step === "results" && (
          <RoutePreviewStep
            places={places || []}
            onRegenerate={regenerate}
            onBuy={handleBuyRoute}
            purchasing={paying}
          />
        )}

        {step === "purchase" && (
          <div className="chat-card text-center">
            <div className="text-3xl mb-5">✅</div>
            <div className="text-lg font-semibold mb-1">
              Thanks for your purchase!
            </div>
            
            {purchaseRoute && purchaseRoute.places && purchaseRoute.places.length > 0 && (
              <div className="mb-6 text-left">
                <div className="font-semibold mb-2 text-[#008457]">Your route stops:</div>
                <ul className="space-y-2">
                  {purchaseRoute.places.map((p, i) => (
                    <li key={i} className="p-2 rounded bg-[#F6FDF9] text-sm mb-1">
                      <div className="font-semibold">{`${i + 1}. ${p.name}`}</div>
                      <div className="text-gray-600">{p.address}</div>
                      <div className="text-xs text-gray-500">
                        🚶 {p.walkingTime} min walk
                        {p.type && ` | Type: ${p.type}`}
                      </div>
                      {p.reason && (
                        <div className="mt-1 text-[#008457]">{p.reason}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="mb-6 text-[#008457] font-medium">
              {"Here's your route link:"}
              {(purchaseRoute && purchaseRoute.places.length > 0) ? (
                <div className="flex flex-col gap-1 mt-2">
                  <a
                    href={makeGoogleMapsRoute(purchaseRoute.origin, purchaseRoute.places)}
                    className="underline text-[#00BC72]"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View in Google Maps
                  </a>
                  <a
                    href={makeAppleMapsRoute(purchaseRoute.origin, purchaseRoute.places)}
                    className="underline text-[#008457]"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View in Apple Maps
                  </a>
                </div>
              ) : (
                <span className="text-gray-400">No places</span>
              )}
            </div>

            {routeRating === null ? (
              <RouteRating
                disabled={false}
                onSubmit={(rating) => {
                  setRouteRating(rating);
                  trackRouteRating(rating);
                }}
              />
            ) : (
              <div className="my-5 text-green-700 font-semibold">
                Thank you for rating this route {routeRating} star{routeRating > 1 ? "s" : ""}! 🌟
              </div>
            )}
            <button
              onClick={reset}
              className="w-full rounded-xl shadow-md font-semibold px-4 py-4 text-lg my-2 transition focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95 bg-[#00BC72] hover:bg-[#00965c] text-white"
            >
              Start New Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
