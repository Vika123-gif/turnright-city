import React from "react";
import Map from "../Map";
import type { LLMPlace } from "@/hooks/useOpenAI";
import CategoryBadge from "../CategoryBadge";
import { Button } from "@/components/ui/button";

type Props = {
  places: LLMPlace[];
  loading?: boolean;
  error?: string | null;
  mapUrl?: string | null;
  onSaveRoute: () => void;
  onShareRoute: () => void;
  onStartNew: () => void;
};

const RouteResultPage: React.FC<Props> = ({
  places,
  loading = false,
  error = null,
  mapUrl = null,
  onSaveRoute,
  onShareRoute,
  onStartNew
}) => {
  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* MapPanel */}
        <div className="w-full h-[320px] md:h-[420px] bg-gray-50">
          {loading ? (
            <div className="h-full flex items-center justify-center text-gray-500">Loading map…</div>
          ) : error ? (
            <div className="h-full flex items-center justify-center text-red-500">Couldn't generate route. Try again.</div>
          ) : (
            <Map places={places as any} />
          )}
        </div>

        {/* PlacesList */}
        <div className="p-4 divide-y divide-gray-100">
          {loading && (
            <div className="py-6 text-center text-gray-500">Loading places…</div>
          )}
          {!loading && !error && places && places.length > 0 && (
            places.map((p, idx) => (
              <div key={`${p.name}-${idx}`} className="py-4 flex gap-4">
                <div className="w-28 h-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {p.photoUrls && p.photoUrls.length > 0 ? (
                    <img src={p.photoUrls[0]} alt={p.name} className="w-full h-full object-cover" />
                  ) : p.photoUrl ? (
                    <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No photo</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-gray-900 truncate">{p.name}</div>
                    {typeof p.rating === 'number' && (
                      <div className="text-sm text-gray-600 ml-3">★ {p.rating}</div>
                    )}
                  </div>
                  {p.goalMatched && (
                    <div className="mt-1">
                      <CategoryBadge category={p.goalMatched} size="sm" showCoolScore={false} />
                    </div>
                  )}
                  <div className="mt-1 text-sm text-gray-600 flex items-center gap-3 flex-wrap">
                    {p.walkingTime ? (
                      <span>🚶 {p.walkingTime} min</span>
                    ) : null}
                    {Array.isArray(p.openingHours) && p.openingHours.length > 0 ? (
                      <span className="truncate">{p.openingHours[0]}</span>
                    ) : null}
                  </div>
                  {/* Audio placeholder */}
                  <div className="mt-2">
                    <button className="px-3 py-1.5 rounded-full border text-sm text-gray-500 border-gray-200 cursor-not-allowed" disabled>
                      ▶ Play  Audio guide — coming soon
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ActionBar */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex flex-col md:flex-row gap-2">
            <Button className="w-full md:w-auto" onClick={onSaveRoute}>Save route</Button>
            <Button className="w-full md:w-auto" variant="outline" onClick={onShareRoute}>Share</Button>
            <Button className="w-full md:w-auto" variant="secondary" onClick={onStartNew}>Start new</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteResultPage;


