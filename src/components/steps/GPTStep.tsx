
import React from "react";
import Button from "../Button";
import PlacesList from "../PlacesList";
import type { LLMPlace } from "@/hooks/useOpenAI";

type Props = {
  places: LLMPlace[];
  loading: boolean;
  onDone: () => void;
  error?: string | null;
  onStartNew?: () => void;
};

const GPTStep: React.FC<Props> = ({
  places,
  loading,
  onDone,
  error,
  onStartNew,
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
      <div className="flex flex-col gap-4">
        {!loading && places.length > 0 && (
          <Button variant="primary" onClick={onDone}>
            Next
          </Button>
        )}

        {/* Start New Dialog Button */}
        {!loading && onStartNew && (
          <Button variant="outline" onClick={onStartNew}>
            Start New Dialog
          </Button>
        )}

        {/* MVP Link */}
        <div className="border-t pt-4 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Save for the next generations!
          </p>
          <a
            href="https://turnright.city/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#008457] underline font-medium text-sm hover:text-[#00BC72] transition-colors"
          >
            Visit TurnRight.city
          </a>
        </div>
      </div>
    </div>
  );
};
export default GPTStep;
