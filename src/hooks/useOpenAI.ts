
import { useState } from "react";
import { useMapbox } from "./useMapbox";

export type LLMPlace = {
  name: string;
  address: string;
  walkingTime: number;
  type?: string;
  reason?: string;
  lat?: number;
  lon?: number;
  coordinates?: [number, number]; // [lng, lat] from Mapbox
  photoUrl?: string; // Google Places photo URL
};

// Inserted user-provided OpenAI API key below.
const OPENAI_API_KEY = "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";

// Simple place count logic
const TIME_TO_PLACES = {
  "30 minutes": 1,
  "1 hour": 2,
  "1.5 hours": 2,
  "2+ hours": 3,
};

export function useOpenAI() {
  const { geocodePlace } = useMapbox();

  async function getLLMPlaces({
    location,
    goals,
    timeWindow,
    userPrompt,
    regenerationAttempt = 0,
    maxPlaces = 2,
  }: {
    location: string;
    goals: string[];
    timeWindow: string;
    userPrompt: string;
    regenerationAttempt?: number;
    maxPlaces?: number;
  }): Promise<LLMPlace[]> {
    
    console.log("=== DEBUG: TripAdvisor-only route generation ===");
    console.log("Location received in hook:", location);
    console.log("Goals received in hook:", goals);
    console.log("Time window:", timeWindow);
    
    try {
      // Call TripAdvisor function directly for route generation
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: tripAdvisorData, error } = await supabase.functions.invoke('tripadvisor-photos', {
        body: { 
          location: location,
          goals: goals,
          timeWindow: timeWindow
        }
      });
      
      if (error) {
        console.error("TripAdvisor API error:", error);
        throw new Error("Failed to fetch places from TripAdvisor: " + error.message);
      }
      
      if (!tripAdvisorData?.success || !Array.isArray(tripAdvisorData.places)) {
        console.error("Invalid TripAdvisor response:", tripAdvisorData);
        throw new Error("Invalid response from TripAdvisor API");
      }
      
      console.log("=== DEBUG: TripAdvisor Places ===", tripAdvisorData.places);
      
      // Convert TripAdvisor response to LLMPlace format
      const places: LLMPlace[] = tripAdvisorData.places.map((place: any) => ({
        name: place.name,
        address: place.address,
        walkingTime: place.walkingTime,
        type: place.type,
        reason: place.reason,
        coordinates: place.coordinates,
        lat: place.lat,
        lon: place.lon,
        photoUrl: place.photoUrl,
      }));
      
      console.log("=== DEBUG: Final Places from TripAdvisor ===", places);
      return places;
      
    } catch (err) {
      console.error("=== DEBUG: TripAdvisor Error ===", err);
      throw new Error("Could not generate route from TripAdvisor.\n\n" + err.message);
    }
  }
  
  return { getLLMPlaces };
}
