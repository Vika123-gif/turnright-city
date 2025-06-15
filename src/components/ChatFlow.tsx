
import React, { useRef, useState } from "react";
import WelcomeStep from "./steps/WelcomeStep";
import TimeStep from "./steps/TimeStep";
import GoalsStep from "./steps/GoalsStep";
import GPTStep from "./steps/GPTStep";
import RoutePreviewStep from "./steps/RoutePreviewStep";
import PurchaseStep from "./steps/PurchaseStep";

type StepKey = "welcome" | "time" | "goals" | "gpt" | "preview" | "purchase" | "done";
type FlowState = {
  location?: string | null;
  time_window?: string | null;
  goals?: string[];
  gptResponse?: string | null;
  purchased?: boolean;
  [k: string]: any;
};

const steps: StepKey[] = [
  "welcome",
  "time",
  "goals",
  "gpt",
  "preview",
];

const initialState: FlowState = {
  location: null,
  time_window: null,
  goals: [],
  gptResponse: null,
  purchased: false,
};

export default function ChatFlow() {
  const [stepIdx, setStepIdx] = useState(0);
  const [state, setState] = useState<FlowState>(initialState);
  const [loadingGPT, setLoadingGPT] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  // For scroll-to-latest interaction
  const scrollRef = useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 180);
  }, [stepIdx, loadingGPT, purchasing]);

  // Steps handler
  const advance = (fields: Partial<FlowState> = {}) => {
    setState((s) => ({ ...s, ...fields }));
    setStepIdx((idx) => Math.min(idx + 1, steps.length));
  };

  const backToGPT = () => {
    setStepIdx(3); // gpt step
    setState((s) => ({ ...s, gptResponse: null }));
  };

  // Simulated GPT (replace with API call as needed)
  const generateGPT = async () => {
    setLoadingGPT(true);
    await new Promise((resolve) => setTimeout(resolve, 1300));
    const resp =
      `1. <b>Green & Bean Café</b>\n☕ Great for coffee, quick lunch & catch up on emails.\n5-min walk. Ideal: Fast WiFi, power outlets.\n\n2. <b>Innovation District Park</b>\n🧠 Scenic spot to explore, recharge creativity.\n7-min walk. Nice for a fresh air break.\n\n3. <b>Founders Hub Lounge</b>\n💻 Co-working zone for deep work or networking.\n4-min walk. Inspiring vibe, quiet zones.\n` +
      `<i>All spots close, perfect for your time and goals.</i>`;
    setState((s) => ({ ...s, gptResponse: resp }));
    setLoadingGPT(false);
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
  return (
    <div className="w-full min-h-screen flex justify-center bg-[#F3FCF8] pt-8 pb-24">
      <div className="w-full max-w-md">
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
          {step === "gpt" && (
            <GPTStep
              location={state.location}
              time_window={state.time_window}
              goals={state.goals}
              onGenerate={generateGPT}
              loading={loadingGPT}
              gptResponse={state.gptResponse}
              onDone={() => advance()}
            />
          )}
          {step === "preview" && state.gptResponse && (
            <RoutePreviewStep
              gptResponse={state.gptResponse}
              onRegenerate={backToGPT}
              onBuy={purchaseRoute}
              purchasing={purchasing}
            />
          )}
          {step === "done" && (
            <PurchaseStep />
          )}
        </div>
        <div ref={scrollRef}></div>
      </div>
    </div>
  );
}
