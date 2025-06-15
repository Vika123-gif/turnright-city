import React, { useRef, useState } from "react";
import WelcomeStep from "./steps/WelcomeStep";
import TimeStep from "./steps/TimeStep";
import GoalsStep from "./steps/GoalsStep";
import GPTStep from "./steps/GPTStep";
import RoutePreviewStep from "./steps/RoutePreviewStep";
import PurchaseStep from "./steps/PurchaseStep";
import { useOpenAI } from "@/hooks/useOpenAI";
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
  "apiKey",
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
  const ApiKeyStep = ({
    value,
    onNext
  }: {
    value: string | null | undefined;
    onNext: (key: string) => void;
  }) => {
    const [key, setKey] = useState(value || localStorage.getItem(KEY_STORAGE) || "");
    const [visible, setVisible] = useState(false);
    return (
      <div className="chat-card text-left">
        <div className="mb-4 font-semibold text-lg">🔑 Enter your OpenAI API key <span className="text-base font-normal text-muted-foreground">(temporary, for dev/test ONLY)</span></div>
        <input
          type={visible ? "text" : "password"}
          className="border rounded-lg px-3 py-2 w-full text-base"
          value={key}
          onChange={e => setKey(e.target.value)}
          autoFocus
        />
        <label className="mt-2 block text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={visible}
            onChange={e => setVisible(e.target.checked)}
          /> Show API key
        </label>
        <button
          className="mt-6 bg-primary px-5 py-2 rounded text-white font-medium"
          disabled={!key}
          onClick={() => {
            localStorage.setItem(KEY_STORAGE, key);
            onNext(key);
          }}
        >
          Continue
        </button>
        <div className="mt-2 text-xs text-muted-foreground">
          Your key is never stored remotely. Only used to test route suggestions with OpenAI.
        </div>
      </div>
    );
  };

  // Step Components:
  const step = steps[stepIdx] || (state.purchased ? "done" : "preview");

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
          {step === "apiKey" && (
            <ApiKeyStep
              value={state.apiKey}
              onNext={(apiKey: string) => advance({ apiKey })}
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
        <div ref={scrollRef}></div>
      </div>
    </div>
  );
}
