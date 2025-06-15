
import React, { useEffect } from "react";
import Button from "../Button";
import { Repeat } from "lucide-react";

type Props = {
  location?: string | null;
  time_window?: string | null;
  goals?: string[] | null;
  onGenerate: () => void;
  loading: boolean;
  gptResponse?: string | null;
  onDone: () => void;
};

const GPTStep: React.FC<Props> = ({
  location,
  time_window,
  goals,
  onGenerate,
  loading,
  gptResponse,
  onDone,
}) => {
  useEffect(() => {
    if (!gptResponse) onGenerate();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="chat-card text-left min-h-[220px] flex flex-col justify-between gap-5">
      <div>
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
