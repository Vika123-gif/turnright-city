import React, { useRef, useState, useEffect } from "react";
import { useOpenAI, type LLMPlace } from "@/hooks/useOpenAI";

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

export default function ChatFlow() {
  const [step, setStep] = useState<Step | "purchase">("welcome");
  const [apiKey, setApiKey] = useState(localStorage.getItem("openai_api_key_dev") || "");
  const [location, setLocation] = useState("");
  const [timeWindow, setTimeWindow] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [places, setPlaces] = useState<LLMPlace[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(() => {
    return !localStorage.getItem("openai_api_key_dev");
  });

  // Store origin + route for "purchase" step
  const [purchaseRoute, setPurchaseRoute] = useState<{ origin: string, places: LLMPlace[] } | null>(null);

  const { getLLMPlaces } = useOpenAI();

  // On mount or when apiKey changes, hide modal if key is present
  useEffect(() => {
    const storedKey = localStorage.getItem("openai_api_key_dev");
    if (storedKey && storedKey.length > 0) {
      setApiKey(storedKey);
      setShowKeyModal(false);
    }
  }, []);

  // Save API key on enter
  function handleApiKeyInput(e: React.ChangeEvent<HTMLInputElement>) {
    setApiKey(e.target.value);
  }
  function handleApiKeySubmit() {
    localStorage.setItem("openai_api_key_dev", apiKey);
    setShowKeyModal(false);
    setStep("welcome");
  }

  // Welcome/location step
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

  // Time select
  function handleSelectTime(t: string) {
    setTimeWindow(t);
    setStep("goals");
  }

  // Goals (multi-select)
  function handleToggleGoal(goal: string) {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  }
  function handleGoalsNext() {
    setStep("generating");
    fetchPlaces();
  }

  // OpenAI integration with your exact prompt
  async function fetchPlaces() {
    setError(null);
    setGenerating(true);
    setPlaces(null);
    try {
      const userPrompt = `You are a business travel assistant. User is at ${location}, has ${timeWindow}, wants to ${goals.join(", ")}. Suggest 1-2 realistic places nearby with walking times and reasons why they're perfect.`;
      const response: LLMPlace[] = await getLLMPlaces({
        apiKey,
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

  // Regenerate
  function regenerate() {
    setStep("generating");
    fetchPlaces();
  }

  // Reset
  function reset() {
    setLocation("");
    setTimeWindow(null);
    setGoals([]);
    setPlaces(null);
    setError(null);
    setStep("welcome");
  }

  // Buy Route handler (replace this later with Stripe integration)
  function handleBuyRoute() {
    if (places && location) {
      setPurchaseRoute({
        origin: location,
        places: places,
      });
    }
    setStep("purchase");
  }

  // Utilities: parse location to lat,lng string if possible (preserve manual addresses otherwise)
  function parseOrigin(loc: string): string {
    // Handles both "lat,lng" and manual address input
    // Google accepts both, as long as it's encoded
    return encodeURIComponent(loc.trim());
  }

  // Generate the Google Maps URL with walking directions
  function makeGoogleMapsRoute(origin: string, places: LLMPlace[] = []) {
    // If places is empty, just link to origin
    if (!places.length) return `https://maps.google.com`;

    // Start: user location (geo or manual)
    const originEnc = parseOrigin(origin);

    // Destinations: all but last are waypoints, last is destination
    // Use address if possible, fallback to name if not
    const waypointAddresses = places
      .slice(0, -1)
      .map(p => encodeURIComponent(p.address ? p.address : p.name));
    const destination =
      encodeURIComponent(
        (places[places.length - 1]?.address || places[places.length - 1]?.name || "")
      );

    // Google Maps "dir" syntax:
    // https://www.google.com/maps/dir/?api=1&origin=<start>&destination=<destination>&travelmode=walking&waypoints=wp1|wp2
    let url = `https://www.google.com/maps/dir/?api=1&origin=${originEnc}&destination=${destination}&travelmode=walking`;
    if (waypointAddresses.length > 0) {
      url += `&waypoints=${waypointAddresses.join("|")}`;
    }
    return url;
  }

  // Modal for API key
  if (showKeyModal) {
    return (
      <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-xl max-w-xs w-full p-7 shadow-lg flex flex-col items-center text-center">
          <div className="text-xl font-semibold mb-4">🔑 Enter your OpenAI API key</div>
          <input
            type="password"
            placeholder="sk-..."
            value={apiKey}
            className="border rounded-lg p-3 text-base w-full mb-4"
            onChange={handleApiKeyInput}
            autoFocus
          />
          <PrimaryButton onClick={handleApiKeySubmit} disabled={!apiKey}>
            Save & Continue
          </PrimaryButton>
          <div className="text-xs text-gray-500 mt-3">
            Your key is stored in your browser and never sent anywhere except OpenAI.
          </div>
        </div>
      </div>
    );
  }

  // Chat UI for each step
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
            <div className="mb-6 text-[#008457] font-medium">
              {"Here's your route link:"}{" "}
              {(purchaseRoute && purchaseRoute.places.length > 0) ? (
                <a
                  href={makeGoogleMapsRoute(purchaseRoute.origin, purchaseRoute.places)}
                  className="underline text-[#00BC72]"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    // (Optional: log or track click here)
                  }}
                >
                  View Route
                </a>
              ) : (
                <span className="text-gray-400">No places</span>
              )}
            </div>
            <PrimaryButton onClick={reset}>Start New Search</PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}
