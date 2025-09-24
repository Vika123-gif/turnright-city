import React, { useState } from "react";
import Button from "../Button";

const TIME_OPTIONS = ["3 hours", "6 hours", "Full day"];
const TIME_TO_MINUTES = { "3 hours": 180, "6 hours": 360, "Full day": 600 }; // Full day = 10 hours

type Props = {
  onNext: (timeMinutes: number) => void;
  value?: number;
};

const OnSiteTimeStep: React.FC<Props> = ({ onNext, value }) => {
  const [selectedTime, setSelectedTime] = useState<string | null>(
    value ? Object.keys(TIME_TO_MINUTES).find(key => TIME_TO_MINUTES[key as keyof typeof TIME_TO_MINUTES] === value) || null : null
  );

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    const timeMinutes = TIME_TO_MINUTES[time as keyof typeof TIME_TO_MINUTES];
    onNext(timeMinutes);
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-1 gap-3">
        {TIME_OPTIONS.map((time) => (
          <button
            key={time}
            onClick={() => handleTimeSelect(time)}
            className={`py-4 px-6 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 ${
              selectedTime === time
                ? "bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white shadow-lg"
                : "bg-white border-2 border-gray-200 text-gray-700 hover:border-[hsl(var(--primary))] hover:bg-green-50"
            }`}
          >
            {time}
          </button>
        ))}
      </div>
    </div>
  );
};

export default OnSiteTimeStep;