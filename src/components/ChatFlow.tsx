import React, { useRef, useState, useEffect } from "react";
import WelcomeStep from "./steps/WelcomeStep";
import TimeStep from "./steps/TimeStep";
import GoalsStep from "./steps/GoalsStep";
import GPTStep from "./steps/GPTStep";
import RoutePreviewStep from "./steps/RoutePreviewStep";
import PurchaseStep from "./steps/PurchaseStep";
import ApiKeyModal from "./ApiKeyModal";
import type { LLMPlace } from "@/hooks/useOpenAI";
// We'll use a helper to keep API key just in session during dev
const KEY_STORAGE = "openai_api_key_dev";

type StepKey = "welcome" | "time" | "goals" | "apiKey" | "places" | "preview" | "purchase" | "done";
type FlowState = {
  location?: string | null;
  time_window?: string | null;
  goals?: string[];
  places?: LLMPlace[];
  apiKey?: string | null;
  purchased?: boolean;
  [k: string]: any;
};

const steps: StepKey[] = [
  "welcome",
  "time",
  "goals",
  "places",
  "preview",
];

const initialState: FlowState = {
  location: null,
  time_window: null,
  goals: [],
  places: [],
  apiKey: "",
  purchased: false,
};

export default function ChatFlow() {
  const [stepIdx, setStepIdx] = useState(0);
  const [state, setState] = useState<FlowState>(initialState);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const { loading, error, getLLMPlaces } = useOpenAI();

  // For scroll-to-latest interaction
  const scrollRef = useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 180);
  }, [stepIdx, loadingPlaces]);

  // Step handler
  const advance = (fields: Partial<FlowState> = {}) => {
    setState((s) => ({ ...s, ...fields }));
    setStepIdx((idx) => Math.min(idx + 1, steps.length));
  };

  const backToPlaces = () => {
    setStepIdx(4); // places step
    setState((s) => ({ ...s, places: [] }));
  };

  const purchaseRoute = async () => {
    setState((s) => ({ ...s, purchasing: true }));
    await new Promise((r) => setTimeout(r, 1200));
    setState((s) => ({ ...s, purchasing: false, purchased: true }));
    setStepIdx(steps.length + 1);
  };

  // LLM fetch step: get places using OpenAI
  const fetchPlaces = async () => {
    setLoadingPlaces(true);
    setErrorMessage(null);
    try {
      const { location, time_window, goals, apiKey } = state;
      if (!location || !time_window || !goals || !apiKey) {
        throw new Error("Missing details for route generation.");
      }
      const places = await getLLMPlaces({
        apiKey,
        location,
        goals,
        timeWindow: time_window,
      });
      setState((s) => ({ ...s, places }));
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to generate places.");
      setState((s) => ({ ...s, places: [] }));
    } finally {
      setLoadingPlaces(false);
    }
  };

  // API Key entry step/component
  const handleApiKeySet = (key: string) => {
    setApiKey(key);
    setShowKeyModal(false);
    setState((s) => ({ ...s, apiKey: key }));
  };

  const handleResetKey = () => {
    localStorage.removeItem("openai_api_key_dev");
    setApiKey(null);
    setShowKeyModal(true);
    setState((s) => ({ ...s, apiKey: null }));
  };

  // On mount: check for stored key, open modal if missing
  useEffect(() => {
    const stored = localStorage.getItem("openai_api_key_dev");
    if (stored) {
      setApiKey(stored);
    } else {
      setShowKeyModal(true);
    }
  }, []);

  // Prevent progress until API key set (unless at the modal)
  if (!apiKey) {
    return (
      <ApiKeyModal open={showKeyModal} onSet={handleApiKeySet} />
    );
  }

  // Step Components:
  const step = steps[stepIdx] || (state.purchased ? "done" : "preview");

  useEffect(() => {
    // Refresh state.apiKey from updated value in ChatFlow
    setState((s) => ({ ...s, apiKey }));
  }, [apiKey]);

  React.useEffect(() => {
    if (step === "places" && (!state.places || state.places.length === 0)) {
      fetchPlaces();
    }
    // eslint-disable-next-line
  }, [step]);

  return (
    <div className="w-full min-h-screen flex justify-center bg-[#F3FCF8] pt-8 pb-24">
      <div className="w-full max-w-md relative">
        <div className="fade-in">
          {step === "welcome" && (
            <WelcomeStep
              onLocation={(loc) => advance({ location: loc })}
              value={state.location}
            />
          )}
          {step === "time" && (
            <TimeStep
              onNext={(time) => advance({ time_window: time })}
              value={state.time_window}
            />
          )}
          {step === "goals" && (
            <GoalsStep
              onNext={(goals) => advance({ goals })}
              value={state.goals || []}
            />
          )}
          {step === "places" && (
            <GPTStep
              places={state.places || []}
              loading={loadingPlaces || loading}
              onDone={() => advance()}
              error={errorMessage || error}
            />
          )}
          {step === "preview" && state.places && state.places.length > 0 && (
            <RoutePreviewStep
              gptResponse={
                state.places
                  .map(
                    (p, idx) =>
                      `${idx + 1}. ${p.name}\n${p.address}\nWalk: ${p.walkingTime} min`
                  )
                  .join("\n\n")
              }
              onRegenerate={backToPlaces}
              onBuy={purchaseRoute}
              purchasing={!!state.purchasing}
            />
          )}
          {step === "done" && (
            <PurchaseStep />
          )}
        </div>
        {errorMessage && (
          <div className="mt-2 text-center text-red-600 text-sm">{errorMessage}</div>
        )}
        <div className="pt-10 text-center">
          <button
            className="text-xs text-blue-600 underline underline-offset-2"
            onClick={handleResetKey}
            type="button"
          >
            Reset API Key
          </button>
        </div>
        <div ref={scrollRef}></div>
      </div>
    </div>
  );
}
