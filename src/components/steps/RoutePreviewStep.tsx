
import React from "react";
import Button from "../Button";
import { Repeat } from "lucide-react";
type Props = {
  gptResponse: string,
  onRegenerate: () => void;
  onBuy: () => void;
  purchasing: boolean;
};

const RoutePreviewStep: React.FC<Props> = ({
  gptResponse,
  onRegenerate,
  onBuy,
  purchasing
}) => {
  return (
    <div className="chat-card text-left">
      <div className="font-semibold text-lg mb-3 flex items-center gap-2">📍 Here's what I found for you:</div>
      <div className="bg-[#F6FDF9] px-4 py-3 rounded-lg text-base mb-6" dangerouslySetInnerHTML={{ __html: gptResponse.replace(/\n/g, "<br />") }} />
      <div className="flex flex-col gap-4">
        <Button variant="outline" onClick={onRegenerate} disabled={purchasing}>
          <Repeat className="w-5 h-5 mr-2 -ml-1" /> Generate Again
        </Button>
        <Button variant="primary" onClick={onBuy} disabled={purchasing}>
          {purchasing ? "Processing..." : "💳 Buy Route"}
        </Button>
      </div>
    </div>
  );
};
export default RoutePreviewStep;
