
import React, { useRef, useState } from "react";
import WelcomeStep from "./steps/WelcomeStep";
import TimeStep from "./steps/TimeStep";
import GoalsStep from "./steps/GoalsStep";
import GPTStep from "./steps/GPTStep";
import RoutePreviewStep from "./steps/RoutePreviewStep";
import PurchaseStep from "./steps/PurchaseStep";
import DebugInfo from "./DebugInfo";
import { useGooglePlaces } from "@/hooks/useGooglePlaces";
import type { Place } from "./PlacesList";

type StepKey = "welcome" | "time" | "goals" | "places" | "preview" | "purchase" | "done";
type FlowState = {
  location?: string | null;
  time_window?: string | null;
  goals?: string[];
  places?: Place[];
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
  purchased: false,
};

export default function ChatFlow() {
  const [stepIdx, setStepIdx] = useState(0);
  const [state, setState] = useState<FlowState>(initialState);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // For scroll-to-latest interaction
  const scrollRef = useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 180);
  }, [stepIdx, loadingPlaces, purchasing]);

  // Steps handler
  const advance = (fields: Partial<FlowState> = {}) => {
    setState((s) => ({ ...s, ...fields }));
    setStepIdx((idx) => Math.min(idx + 1, steps.length));
  };

  const backToPlaces = () => {
    setStepIdx(3); // places step
    setState((s) => ({ ...s, places: [] }));
  };

  // Place debug info hook
  const { getNearbyPlaces, debugInfo } = useGooglePlaces();

  // Results/generation step: fetch real places (no OpenAI)
  const fetchPlaces = async () => {
    setLoadingPlaces(true);
    setErrorMessage(null);
    try {
      const { location, time_window, goals } = state;
      if (!location || !time_window || !goals) {
        throw new Error("Missing data for Places search.");
      }
      const places = await getNearbyPlaces({
        location,
        goals,
        timeWindow: time_window,
      });
      setState((s) => ({ ...s, places }));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to find places.");
      setState((s) => ({ ...s, places: [] }));
    } finally {
      setLoadingPlaces(false);
    }
  };

  const purchaseRoute = async () => {
    setPurchasing(true);
    await new Promise((r) => setTimeout(r, 1200));
    setPurchasing(false);
    setStepIdx(steps.length + 1);
    setState((s) => ({ ...s, purchased: true }));
  };

  // Step Components:
  const step = steps[stepIdx] || (state.purchased ? "done" : "preview");

  // Start search on entering the "places" step
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
          {(stepIdx >= 1 && state.location) && (
            <DebugInfo debug={debugInfo} />
          )}
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
              loading={loadingPlaces}
              onDone={() => advance()}
              debugInfo={debugInfo}
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
              purchasing={purchasing}
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
