
import React, { useState } from "react";
import { Star } from "lucide-react";

type Props = {
  onSubmit: (rating: number) => void;
  disabled?: boolean;
};

const RouteRating: React.FC<Props> = ({ onSubmit, disabled }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number>(0);

  return (
    <div className="w-full flex flex-col items-center my-5">
      <div className="mb-2 text-[#008457] font-medium text-base">Rate the quality of this route:</div>
      <div className="flex flex-row gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => !disabled && setHovered(star)}
            onMouseLeave={() => !disabled && setHovered(null)}
            onClick={() => {
              if (!disabled) {
                setSelected(star);
                onSubmit(star);
              }
            }}
            aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
            className="transition-transform"
            disabled={disabled}
          >
            <Star
              size={28}
              color={star <= (hovered ?? selected) ? "#F7B801" : "#ccd6df"}
              fill={star <= (hovered ?? selected) ? "#F7B801" : "none"}
              strokeWidth={1.8}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default RouteRating;
