
import React, { useState } from "react";
import Button from "../Button";

const DAYS = ["1 day", "2 days", "3 days", "4 days", "5 days"];
const DAYS_TO_COUNT = { "1 day": 1, "2 days": 2, "3 days": 3, "4 days": 4, "5 days": 5 };

type Props = {
  onNext: (days: number) => void;
  value?: number;
};

const TimeStep: React.FC<Props> = ({ onNext, value }) => {
  const [selectedDays, setSelectedDays] = useState<string | null>(
    value ? Object.keys(DAYS_TO_COUNT).find(key => DAYS_TO_COUNT[key as keyof typeof DAYS_TO_COUNT] === value) || "Other" : null
  );
  const [customDays, setCustomDays] = useState(
    value && !Object.values(DAYS_TO_COUNT).includes(value) ? value.toString() : ""
  );

  const handleDaysSelect = (days: string) => {
    setSelectedDays(days);
    if (days !== "Other") {
      const daysCount = DAYS_TO_COUNT[days as keyof typeof DAYS_TO_COUNT];
      onNext(daysCount);
    }
  };

  const handleCustomDaysSubmit = () => {
    if (customDays) {
      const daysCount = parseInt(customDays);
      onNext(daysCount);
    }
  };

  const isFormValid = selectedDays && (selectedDays !== "Other" || customDays);

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-3">
        {DAYS.map((days) => (
          <button
            key={days}
            onClick={() => handleDaysSelect(days)}
            className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 ${
              selectedDays === days
                ? "bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white shadow-lg"
                : "bg-white border-2 border-gray-200 text-gray-700 hover:border-[hsl(var(--primary))] hover:bg-green-50"
            }`}
          >
            {days}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSelectedDays("Other")}
          className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 ${
            selectedDays === "Other"
              ? "bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white shadow-lg"
              : "bg-white border-2 border-gray-200 text-gray-700 hover:border-[hsl(var(--primary))] hover:bg-green-50"
          }`}
        >
          Other
        </button>
        {selectedDays === "Other" && (
          <input
            type="number"
            placeholder="Number of days"
            value={customDays}
            onChange={(e) => setCustomDays(e.target.value)}
            className="flex-1 h-10 px-3 rounded-xl border-2 border-gray-200 focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/20 text-sm font-medium"
            min="1"
          />
        )}
      </div>
      {selectedDays === "Other" && (
        <Button
          onClick={handleCustomDaysSubmit}
          disabled={!customDays}
          className="w-full h-12 font-semibold"
        >
          Continue
        </Button>
      )}
    </div>
  );
};

export default TimeStep;
