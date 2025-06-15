import React, { useRef, useState, useEffect } from "react";
import { useOpenAI, type LLMPlace } from "@/hooks/useOpenAI";
import { createClient } from "@supabase/supabase-js";

// HARDCODED SUPABASE CREDENTIALS FOR TESTING ONLY
const supabaseUrl = "https://gwwqfoplhhtyjkrhazbt.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3d3Fmb3BsaGh0eWprcmhhemJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAwMDU5OTQsImV4cCI6MjA2NTU4MTk5NH0.fgFpmEdc3swzKw0xlGYt68a9vM9J2F3fKdT413UNoPk";

const BRAND_COLOR = "#00BC72";

type Step =
  | "welcome"
  | "time"
  | "goals"
  | "generating"
  | "results"
  | "purchase";

const TIME_OPTIONS = [
  "30 minutes",
  "1 hour",
  "1.5 hours",
  "2+ hours",
];

const GOAL_OPTIONS = [
  { label: "Explore something new", value: "explore" },
  { label: "Eat", value: "eat" },
  { label: "Drink coffee", value: "coffee" },
  { label: "Work", value: "work" },
];

const BUTTON =
  "w-full rounded-xl shadow-md font-semibold px-4 py-4 text-lg my-2 transition focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95";

function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      style={{ background: BRAND_COLOR, color: "white" }}
      className={`${BUTTON} bg-[#00BC72] hover:bg-[#00965c] active:bg-[#008457]`}
      {...props}
    >
      {children}
    </button>
  );
}

function OutlineButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      style={{ border: `2px solid ${BRAND_COLOR}`, color: BRAND_COLOR, background: "white" }}
      className={`${BUTTON} outline-btn`}
      {...props}
    >
      {children}
    </button>
  );
}

import RouteRating from "./RouteRating";

export default function ChatFlow() {
  const [step, setStep] = useState<Step | "purchase">("welcome");
  const [location, setLocation] = useState("");
  const [timeWindow, setTimeWindow] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [places, setPlaces] = useState<LLMPlace[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [routeRating, setRouteRating] = useState<number | null>(null);
  const [paying, setPaying] = useState(false);

  // Add purchaseRoute state to store purchase data after buying route
  const [purchaseRoute, setPurchaseRoute] = useState<{ origin: string; places: LLMPlace[] } | null>(null);

  const { getLLMPlaces } = useOpenAI();

  // Use hardcoded Supabase client for testing
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  function handleDetectLocation() {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation(`${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`),
        () => setError("Failed to detect location; please enter it manually.")
      );
    } else {
      setError("Geolocation not supported; please enter location.");
    }
  }
  function handleManualLocation(loc: string) {
    setLocation(loc);
    setStep("time");
  }

  function handleSelectTime(t: string) {
    setTimeWindow(t);
    setStep("goals");
  }

  function handleToggleGoal(goal: string) {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  }
  function handleGoalsNext() {
    setStep("generating");
    fetchPlaces();
  }

  async function fetchPlaces() {
    setError(null);
    setGenerating(true);
    setPlaces(null);
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

  // Restored Buy Route handler: skips payment, just shows confirmation
  function handleBuyRoute() {
    if (!places || !location) return;
    setPurchaseRoute({ origin: location, places });
    setStep("purchase");
  }

  function parseOrigin(loc: string): string {
    return encodeURIComponent(loc.trim());
  }

  function makeGoogleMapsRoute(origin: string, places: LLMPlace[] = []) {
    if (!places.length) return `https://maps.google.com`;

    const originEnc = parseOrigin(origin);

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

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#F3FCF8] px-2 py-10">
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-md px-6 py-8 relative">
        {step === "welcome" && (
          <>
            <div className="text-2xl mb-3">👋</div>
            <div className="text-xl font-semibold mb-4">
              Hi! I'll help you find the best places nearby<br />
              for your business trip.
            </div>
            <div className="mb-6">Share your location and let's get started!</div>
            <PrimaryButton onClick={handleDetectLocation}>
              📍 Share Location
            </PrimaryButton>
            <div className="mt-4 flex items-center gap-2 text-base">
              <span>or enter location:</span>
              <input
                type="text"
                className="border rounded-lg px-3 py-2 w-full max-w-[60%] shadow"
                placeholder="e.g., 123 Main St, Paris"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
              <OutlineButton
                style={{ minWidth: "60px" }}
                onClick={() => location && setStep("time")}
                disabled={!location}
              >
                OK
              </OutlineButton>
            </div>
            {error && <div className="mt-3 text-red-600 text-sm">{error}</div>}
          </>
        )}

        {step === "time" && (
          <>
            <div className="text-2xl mb-3">⏱️</div>
            <div className="text-xl font-semibold mb-4">
              How much time do you have right now?
            </div>
            <div className="flex flex-col gap-2">
              {TIME_OPTIONS.map((option) => (
                <PrimaryButton key={option} onClick={() => handleSelectTime(option)}>
                  {option}
                </PrimaryButton>
              ))}
            </div>
          </>
        )}

        {step === "goals" && (
          <>
            <div className="text-2xl mb-3">🎯</div>
            <div className="text-xl font-semibold mb-4">
              What do you want to do now?
            </div>
            <div className="mb-1 text-base text-gray-500">You can select multiple options.</div>
            <div className="flex flex-col gap-2 mb-5">
              {GOAL_OPTIONS.map((goal) => (
                <OutlineButton
                  key={goal.value}
                  onClick={() => handleToggleGoal(goal.value)}
                  style={{
                    background: goals.includes(goal.value) ? "#f6fffb" : "white",
                    borderColor: goals.includes(goal.value) ? BRAND_COLOR : "#ddd",
                    color: goals.includes(goal.value) ? BRAND_COLOR : "#222",
                  }}
                  aria-pressed={goals.includes(goal.value)}
                >
                  {goal.label}
                  {goals.includes(goal.value) && (
                    <span className="ml-2" style={{ color: BRAND_COLOR }}>✓</span>
                  )}
                </OutlineButton>
              ))}
            </div>
            <PrimaryButton onClick={handleGoalsNext} disabled={goals.length === 0}>
              Next
            </PrimaryButton>
          </>
        )}

        {step === "generating" && (
          <>
            <div className="text-2xl mb-3 animate-pulse">🤖</div>
            <div className="text-xl mb-4">AI is creating the perfect local business route for you...</div>
            <div className="h-20 w-full bg-[#f3f3f3] animate-pulse rounded-lg" />
          </>
        )}

        {step === "results" && (
          <>
            <div className="text-2xl mb-2">📍</div>
            <div className="font-semibold text-lg mb-3">Here's what I found for you:</div>
            {error && (
              <div className="text-red-500 mb-3">{error}</div>
            )}
            {!error && (
              <div className="bg-[#F6FDF9] rounded-lg px-4 py-3 mb-5">
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
            <div className="flex flex-col gap-3">
              <OutlineButton onClick={regenerate} disabled={generating}>
                🔁 Generate Again
              </OutlineButton>
              <PrimaryButton onClick={handleBuyRoute}>
                💳 Buy Route
              </PrimaryButton>
            </div>
          </>
        )}

        {step === "purchase" && (
          <div className="chat-card text-center">
            <div className="text-3xl mb-5">✅</div>
            <div className="text-lg font-semibold mb-1">
              Thanks for your purchase!
            </div>
            {/* Duplicated list of route stops */}
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
              {"Here's your route link:"}{" "}
              {(purchaseRoute && purchaseRoute.places.length > 0) ? (
                <a
                  href={makeGoogleMapsRoute(purchaseRoute.origin, purchaseRoute.places)}
                  className="underline text-[#00BC72]"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Route
                </a>
              ) : (
                <span className="text-gray-400">No places</span>
              )}
            </div>
            {/* Route Rating component after purchase */}
            {routeRating === null ? (
              <RouteRating
                disabled={false}
                onSubmit={(rating) => setRouteRating(rating)}
              />
            ) : (
              <div className="my-5 text-green-700 font-semibold">
                Thank you for rating this route {routeRating} star{routeRating > 1 ? "s" : ""}! 🌟
              </div>
            )}
            <PrimaryButton onClick={reset}>Start New Search</PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}
