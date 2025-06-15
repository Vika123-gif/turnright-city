
import React from "react";
import Button from "../Button";
import PlacesList from "../PlacesList";
import type { LLMPlace } from "@/hooks/useOpenAI";

type Props = {
  places: LLMPlace[];
  loading: boolean;
  onDone: () => void;
  error?: string | null;
};

const GPTStep: React.FC<Props> = ({
  places,
  loading,
  onDone,
  error,
}) => {
  return (
    <div className="chat-card text-left min-h-[220px] flex flex-col justify-between gap-5">
      <div>
        <div className="mb-3 text-lg">
          <span className="font-semibold">
            {loading
              ? "AI is creating local suggestions for you..."
              : "Your custom business route:"}
          </span>
        </div>
        {loading && (
          <div className="mt-6">
            <div className="w-full h-16 rounded-lg bg-[#f3f3f3] animate-pulse mb-2"></div>
            <div className="w-4/5 h-5 rounded bg-[#f3f3f3] animate-pulse"></div>
          </div>
        )}
        {error && (
          <div className="text-red-500 mb-3">
            {error}
          </div>
        )}
        {!loading && <PlacesList places={places} />}
      </div>
      {!loading && places.length > 0 && (
        <Button variant="primary" onClick={onDone}>
          Next
        </Button>
      )}
    </div>
  );
};
export default GPTStep;
