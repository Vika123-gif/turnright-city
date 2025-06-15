
import React, { useEffect } from "react";
import Button from "../Button";
import { Repeat } from "lucide-react";
import DebugInfo from "../DebugInfo";
import type { GooglePlacesDebug } from "@/hooks/useGooglePlaces";

type Props = {
  location?: string | null;
  time_window?: string | null;
  goals?: string[] | null;
  onGenerate: () => void;
  loading: boolean;
  gptResponse?: string | null;
  onDone: () => void;
  debugInfo?: GooglePlacesDebug | null;
};

const GPTStep: React.FC<Props> = ({
  location,
  time_window,
  goals,
  onGenerate,
  loading,
  gptResponse,
  onDone,
  debugInfo,
}) => {
  useEffect(() => {
    if (!gptResponse) onGenerate();
    // eslint-disable-next-line
  }, []);

  // Always log debug info to console for verification
  console.log("GPTStep: debugInfo:", debugInfo);

  return (
    <div className="chat-card text-left min-h-[220px] flex flex-col justify-between gap-5">
      {/* Debug panel is always visible and styled prominently */}
      <div>
        <DebugInfo
          debug={debugInfo}
          // Give DebugInfo a "force prominent" look during testing
          style={{
            border: "2px solid #FFA500",
            background: "#FFFBEA",
            marginBottom: "20px",
            marginTop: 0,
            fontSize: "0.94em",
          }}
        />
        <div className="mb-3 text-lg">
          <span className="font-semibold">Searching for best spots for you... </span>
        </div>
        {!gptResponse && (
          <div className="mt-6">
            <div className="w-full h-16 rounded-lg bg-[#f3f3f3] animate-pulse mb-2"></div>
            <div className="w-4/5 h-5 rounded bg-[#f3f3f3] animate-pulse"></div>
          </div>
        )}
        {gptResponse && (
          <div className="bg-[#F6FDF9] text-base rounded-lg px-4 py-3 whitespace-pre-line mb-4" dangerouslySetInnerHTML={{ __html: gptResponse.replace(/\n/g, "<br />") }} />
        )}
      </div>
      {gptResponse && (
        <Button variant="primary" onClick={onDone}>
          Next
        </Button>
      )}
    </div>
  );
};
export default GPTStep;
