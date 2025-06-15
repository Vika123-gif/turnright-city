import React, { useRef, useState } from "react";
import WelcomeStep from "./steps/WelcomeStep";
import TimeStep from "./steps/TimeStep";
import GoalsStep from "./steps/GoalsStep";
import GPTStep from "./steps/GPTStep";
import RoutePreviewStep from "./steps/RoutePreviewStep";
import PurchaseStep from "./steps/PurchaseStep";
import DebugInfo from "./DebugInfo";
import { useOpenAI } from "@/hooks/useOpenAI";
import { useGooglePlaces } from "@/hooks/useGooglePlaces";

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
  const [openAIModal, setOpenAIModal] = React.useState(false);
  const [openAIKey, setOpenAIKey] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // For scroll-to-latest interaction
  const scrollRef = useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const key = localStorage.getItem("openai_api_key");
    if (key) setOpenAIKey(key);
  }, []);

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

  // Place debug info hook
  const { debugInfo } = useGooglePlaces();

  // Updated GPT generation step
  const { generateRoute, loading: openAILoading, error: openAIError } = useOpenAI();
  const generateGPT = async () => {
    if (!openAIKey) {
      setOpenAIModal(true);
      return;
    }
    setLoadingGPT(true);
    setErrorMessage(null);
    try {
      const { location, time_window, goals } = state;
      if (!location || !time_window || !goals) {
        throw new Error("Missing data for GPT prompt.");
      }
      const resp = await generateRoute({ location, time_window, goals, apiKey: openAIKey });
      setState((s) => ({ ...s, gptResponse: resp }));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate response.");
    } finally {
      setLoadingGPT(false);
    }
  };

  // Handle OpenAI key submit
  const handleOpenAIKeySubmit = () => {
    if (!openAIKey || openAIKey.trim().length < 20) {
      setErrorMessage("Please enter a valid OpenAI API key.");
      return;
    }
    // VERY basic validity check (should start with "sk-")
    if (!openAIKey.startsWith("sk-")) {
      setErrorMessage("This doesn't look like a valid OpenAI key.");
      return;
    }
    localStorage.setItem("openai_api_key", openAIKey);
    setOpenAIModal(false);
    setTimeout(() => {
      generateGPT();
    }, 120);
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

  // RESET API KEY HANDLER
  const handleResetApiKey = () => {
    localStorage.removeItem("openai_api_key");
    setOpenAIKey(null);
    setOpenAIModal(true);
    setErrorMessage(null);
  };

  return (
    <div className="w-full min-h-screen flex justify-center bg-[#F3FCF8] pt-8 pb-24">
      <div className="w-full max-w-md relative">
        {/* OpenAI key modal */}
        {openAIModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg px-6 py-7 max-w-xs w-full flex flex-col gap-2 items-center">
              <div className="font-semibold text-lg mb-2 text-center">Connect to OpenAI</div>
              <div className="text-sm text-gray-500 mb-4 text-center">
                Please paste your OpenAI API key to enable real AI-powered recommendations.<br />
                Your key is only stored in your browser.
              </div>
              <input
                type="password"
                className="border px-3 py-2 rounded text-base w-full mb-1"
                placeholder="sk-..."
                value={openAIKey || ""}
                onChange={e => setOpenAIKey(e.target.value)}
                spellCheck={false}
              />
              {errorMessage && (
                <div className="text-red-500 text-sm mb-2">{errorMessage}</div>
              )}
              <div className="w-full flex gap-2">
                <button
                  onClick={() => setOpenAIModal(false)}
                  className="outline-btn !w-auto px-5"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleOpenAIKeySubmit}
                  className="primary-btn !w-auto px-5"
                  type="button"
                >
                  Save & Continue
                </button>
              </div>
              <div className="text-xs text-gray-400 mt-2 text-center">
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">Get your API key</a>
              </div>
            </div>
          </div>
        )}
        <div className="fade-in">
          {/* Show debug info if in a step after location entered */}
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
          {step === "gpt" && (
            <GPTStep
              location={state.location}
              time_window={state.time_window}
              goals={state.goals}
              onGenerate={generateGPT}
              loading={loadingGPT || openAILoading}
              gptResponse={state.gptResponse}
              onDone={() => advance()}
              debugInfo={debugInfo}
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
        {errorMessage && !openAIModal && (
          <div className="mt-2 text-center text-red-600 text-sm">{errorMessage}</div>
        )}
        {/* Reset API Key Button */}
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            className="underline text-xs text-gray-400 hover:text-[#00BC72] transition"
            onClick={handleResetApiKey}
            aria-label="Reset OpenAI API Key"
          >
            Reset API Key
          </button>
        </div>
        <div ref={scrollRef}></div>
      </div>
    </div>
  );
}
