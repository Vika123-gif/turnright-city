
import React, { useState } from "react";
import Button from "../Button";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";

type Props = {
  onFeedbackSubmit?: (feedback: string) => void;
  onStartNew: () => void;
  purchaseRoute?: { origin: string; places: any[] } | null;
  makeGoogleMapsRoute: (origin: string, places: any[]) => string;
  makeAppleMapsRoute: (origin: string, places: any[]) => string;
  routeRating: number | null;
  onRatingSubmit: (rating: number) => void;
  RouteRatingComponent: React.ComponentType<{
    disabled: boolean;
    onSubmit: (rating: number) => void;
  }>;
};

const PurchaseStep: React.FC<Props> = ({
  onFeedbackSubmit,
  onStartNew,
  purchaseRoute,
  makeGoogleMapsRoute,
  makeAppleMapsRoute,
  routeRating,
  onRatingSubmit,
  RouteRatingComponent,
}) => {
  const [feedback, setFeedback] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleFeedbackSubmit = () => {
    if (feedback.trim() && onFeedbackSubmit) {
      onFeedbackSubmit(feedback.trim());
      setFeedbackSubmitted(true);
    }
  };

  return (
    <div className="chat-card text-center">
      <div className="text-3xl mb-5">✅</div>
      <div className="text-lg font-semibold mb-1">
        Thanks for your purchase!
      </div>
      
      {purchaseRoute && purchaseRoute.places && purchaseRoute.places.length > 0 && (
        <div className="mb-6 text-left">
          <div className="font-semibold mb-2 text-[#008457]">Your route stops:</div>
          <ul className="space-y-2">
            {purchaseRoute.places.map((p, i) => (
              <li key={i} className="p-2 rounded bg-[#F6FDF9] text-sm mb-1">
                <div className="font-semibold">{`${i + 1}. ${p.name}`}</div>
                <div className="text-gray-600">{p.address}</div>
                <div className="text-xs text-gray-500">
                  🚶 {p.walkingTime} min walk
                  {p.type && ` | Type: ${p.type}`}
                </div>
                {p.reason && (
                  <div className="mt-1 text-[#008457]">{p.reason}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="mb-6 text-[#008457] font-medium">
        {"Here's your route link:"}
        {(purchaseRoute && purchaseRoute.places.length > 0) ? (
          <div className="flex flex-col gap-1 mt-2">
            <a
              href={makeGoogleMapsRoute(purchaseRoute.origin, purchaseRoute.places)}
              className="underline text-[#00BC72]"
              target="_blank"
              rel="noopener noreferrer"
            >
              View in Google Maps
            </a>
            <a
              href={makeAppleMapsRoute(purchaseRoute.origin, purchaseRoute.places)}
              className="underline text-[#008457]"
              target="_blank"
              rel="noopener noreferrer"
            >
              View in Apple Maps
            </a>
          </div>
        ) : (
          <span className="text-gray-400">No places</span>
        )}
      </div>

      {routeRating === null ? (
        <RouteRatingComponent
          disabled={false}
          onSubmit={onRatingSubmit}
        />
      ) : (
        <div className="my-5 text-green-700 font-semibold">
          Thank you for rating this route {routeRating} star{routeRating > 1 ? "s" : ""}! 🌟
        </div>
      )}

      {/* Text Feedback Section */}
      <div className="my-6 text-left">
        <Label htmlFor="feedback" className="text-[#008457] font-medium text-base">
          Share your thoughts about this route:
        </Label>
        <Textarea
          id="feedback"
          placeholder="Tell us what you liked, what could be improved, or any other feedback..."
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="mt-2 min-h-[100px]"
          disabled={feedbackSubmitted}
        />
        {!feedbackSubmitted ? (
          <Button
            variant="outline"
            onClick={handleFeedbackSubmit}
            disabled={!feedback.trim()}
            className="mt-3 w-full"
          >
            Submit Feedback
          </Button>
        ) : (
          <div className="mt-3 text-green-700 font-medium text-center">
            Thank you for your feedback! 💚
          </div>
        )}
      </div>

      <Button
        variant="primary"
        onClick={onStartNew}
        className="w-full mb-6"
      >
        Start New Search
      </Button>

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
  );
};

export default PurchaseStep;
