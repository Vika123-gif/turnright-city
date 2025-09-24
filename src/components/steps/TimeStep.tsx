
import React, { useState } from "react";
import Button from "../Button";

const DAYS = ["1 день", "2 дня", "3 дня", "4 дня", "5 дней"];
const DAYS_TO_COUNT = { "1 день": 1, "2 дня": 2, "3 дня": 3, "4 дня": 4, "5 дней": 5 };

type Props = {
  onNext: (days: number) => void;
  value?: number;
};

const TimeStep: React.FC<Props> = ({ onNext, value }) => {
  const [selectedDays, setSelectedDays] = useState<string | null>(
    value ? Object.keys(DAYS_TO_COUNT).find(key => DAYS_TO_COUNT[key as keyof typeof DAYS_TO_COUNT] === value) || "Другое" : null
  );
  const [customDays, setCustomDays] = useState(
    value && !Object.values(DAYS_TO_COUNT).includes(value) ? value.toString() : ""
  );

  const handleDaysSelect = (days: string) => {
    setSelectedDays(days);
    if (days !== "Другое") {
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

  const isFormValid = selectedDays && (selectedDays !== "Другое" || customDays);

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
          onClick={() => setSelectedDays("Другое")}
          className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 active:scale-95 ${
            selectedDays === "Другое"
              ? "bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary-glow))] text-white shadow-lg"
              : "bg-white border-2 border-gray-200 text-gray-700 hover:border-[hsl(var(--primary))] hover:bg-green-50"
          }`}
        >
          Другое
        </button>
        {selectedDays === "Другое" && (
          <input
            type="number"
            placeholder="Количество дней"
            value={customDays}
            onChange={(e) => setCustomDays(e.target.value)}
            className="flex-1 h-10 px-3 rounded-xl border-2 border-gray-200 focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary))]/20 text-sm font-medium"
            min="1"
          />
        )}
      </div>
      {selectedDays === "Другое" && (
        <Button
          onClick={handleCustomDaysSubmit}
          disabled={!customDays}
          className="w-full h-12 font-semibold"
        >
          Продолжить
        </Button>
      )}
    </div>
  );
};

export default TimeStep;
