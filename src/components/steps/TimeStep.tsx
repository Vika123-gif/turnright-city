
import React, { useState } from "react";
import Button from "../Button";
import { Clock } from "lucide-react";

const TIMINGS = [
  "30 minutes",
  "1 hour",
  "1.5 hours",
  "2+ hours",
];

type Props = {
  onNext: (choice: string) => void;
  value?: string | null;
};

const TimeStep: React.FC<Props> = ({ onNext, value }) => {
  const [selected, setSelected] = useState<string | null>(value || null);

  return (
    <div className="chat-card text-left">
      <div className="flex items-center gap-2 mb-5">
        <Clock className="w-6 h-6" />
        <span className="font-semibold text-lg">How much time do you have right now?</span>
      </div>
      <div className="flex flex-col gap-4">
        {TIMINGS.map((t) => (
          <Button
            key={t}
            variant={selected === t ? "primary" : "outline"}
            onClick={() => { setSelected(t); onNext(t); }}
            aria-pressed={selected === t}
          >{t}</Button>
        ))}
      </div>
    </div>
  )
}
export default TimeStep;
