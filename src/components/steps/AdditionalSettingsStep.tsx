import React, { useState } from "react";
import Button from "../Button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAnalytics } from "@/hooks/useAnalytics";

const ADDITIONAL_SETTINGS = [
  "Barrier-free",
  "More greenery", 
  "Avoid bad air",
  "Safety"
];

type Props = {
  onNext: (settings: string[]) => void;
  value?: string[];
  buttonText?: string;
};

const AdditionalSettingsStep: React.FC<Props> = ({ onNext, value, buttonText = "Generate Route" }) => {
  const [additionalSettings, setAdditionalSettings] = useState<string[]>(value || []);
  const { trackButtonClick } = useAnalytics();

  const handleSettingToggle = (setting: string) => {
    setAdditionalSettings(prev =>
      prev.includes(setting)
        ? prev.filter(s => s !== setting)
        : [...prev, setting]
    );
  };

  const handleSubmit = () => {
    if (buttonText === "Generate Route") {
      trackButtonClick("click_generate_route", "Generate route");
    }
    onNext(additionalSettings);
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="space-y-3">
        {ADDITIONAL_SETTINGS.map((setting) => (
          <label key={setting} className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl border-2 border-gray-200 hover:border-[hsl(var(--primary))] hover:bg-green-50 transition-all duration-200 hover:scale-[1.02]">
            <Checkbox
              checked={additionalSettings.includes(setting)}
              onCheckedChange={() => handleSettingToggle(setting)}
            />
            <span className="text-sm font-medium text-gray-700">{setting}</span>
          </label>
        ))}
      </div>
      <Button
        onClick={handleSubmit}
        className="w-full h-12 font-semibold"
      >
        {buttonText}
      </Button>
    </div>
  );
};

export default AdditionalSettingsStep;