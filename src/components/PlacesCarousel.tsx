import React, { useRef, useState } from "react";
import type { LLMPlace } from "@/hooks/useOpenAI";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CategoryBadge from "./CategoryBadge";

type Props = {
  places: LLMPlace[];
  className?: string;
};

const SCROLL_BY = 300;

const PlacesCarousel: React.FC<Props> = ({ places, className }) => {
  const scrollerRef = useRef<HTMLDivElement>(null);

  const scrollBy = (delta: number) => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollBy({ left: delta, behavior: "smooth" });
  };

  if (!places || places.length === 0) return null;

  return (
    <div className={`relative ${className || ""}`}>
      <button
        aria-label="Scroll left"
        onClick={() => scrollBy(-SCROLL_BY)}
        className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-white border border-gray-200 shadow hover:bg-gray-50"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div
        ref={scrollerRef}
        className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x snap-mandatory"
      >
        {places.map((p, idx) => (
          <article
            key={`${p.name}-${idx}`}
            className="min-w-[260px] max-w-[260px] bg-white rounded-xl border border-gray-200 shadow-sm snap-start"
          >
            <div className="w-full h-40 overflow-hidden rounded-t-xl bg-gray-100 relative">
              {Array.isArray(p.photoUrls) && p.photoUrls.length > 0 ? (
                <CardPhotos urls={p.photoUrls} alt={p.name} />
              ) : p.photoUrl ? (
                <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <div className="text-blue-600 text-2xl">📍</div>
                </div>
              )}
            </div>
            <div className="p-3 space-y-2">
              <h3 className="font-semibold text-sm break-words leading-snug">{p.name}</h3>
              {p.goalMatched && (
                <CategoryBadge 
                  category={p.goalMatched} 
                  size="sm" 
                  showCoolScore={false}
                />
              )}
              {p.description && (
                <p className="text-xs text-gray-700 whitespace-normal break-words leading-relaxed line-clamp-3">
                  {p.description.length > 120 ? p.description.substring(0, 120) + '...' : p.description}
                </p>
              )}
              <div className="text-xs text-gray-600 space-y-1">
                {typeof p.rating === 'number' && (
                  <div>⭐ {p.rating.toFixed(1)}</div>
                )}
                {Array.isArray(p.openingHours) && p.openingHours.length > 0 && (
                  <div className="whitespace-normal break-words">{p.openingHours[0]}</div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <button
        aria-label="Scroll right"
        onClick={() => scrollBy(SCROLL_BY)}
        className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 items-center justify-center rounded-full bg-white border border-gray-200 shadow hover:bg-gray-50"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default PlacesCarousel;

// Simple inner photo carousel for a card
function CardPhotos({ urls, alt }: { urls: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  const next = () => setIdx((i) => (i + 1) % urls.length);
  const prev = () => setIdx((i) => (i - 1 + urls.length) % urls.length);
  if (!urls.length) return null;
  return (
    <div className="relative w-full h-40">
      <img src={urls[idx]} alt={alt} className="w-full h-full object-cover" />
      {urls.length > 1 && (
        <>
          <button
            aria-label="Prev photo"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full w-7 h-7 flex items-center justify-center text-xs"
          >
            ‹
          </button>
          <button
            aria-label="Next photo"
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full w-7 h-7 flex items-center justify-center text-xs"
          >
            ›
          </button>
          <div className="absolute bottom-1 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
            {idx + 1}/{urls.length}
          </div>
        </>
      )}
    </div>
  );
}


