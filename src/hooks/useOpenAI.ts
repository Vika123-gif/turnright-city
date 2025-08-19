
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

// No longer using OpenAI - using Google Places + TripAdvisor instead

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
    
    console.log("=== DEBUG: getLLMPlaces using Google Places + TripAdvisor ===");
    console.log("Location received in hook:", location);
    console.log("Goals received in hook:", goals);
    
    // Use simple place count logic
    const placesCount = TIME_TO_PLACES[timeWindow as keyof typeof TIME_TO_PLACES] || 2;
    
    try {
      // Call the new route-generator edge function
      const response = await fetch(`https://gwwqfoplhhtyjkrhazbt.supabase.co/functions/v1/route-generator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location,
          goals,
          timeWindow: timeWindow.toString(),
          regenerationAttempt,
          maxPlaces: placesCount,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Route generation failed: ${errorText}`);
      }

      const data = await response.json();
      console.log("=== DEBUG: Route generator response ===", data);

      if (!data.places || !Array.isArray(data.places)) {
        throw new Error("Invalid response format from route generator");
      }

      // Convert response to LLMPlace format
      const places: LLMPlace[] = data.places.map((place: any) => ({
        name: place.name,
        address: place.address,
        walkingTime: place.walkingTime || 10,
        type: place.type,
        reason: place.reason || `Great ${place.type} option in ${location}`,
        coordinates: place.coordinates,
        lat: place.coordinates ? place.coordinates[1] : undefined,
        lon: place.coordinates ? place.coordinates[0] : undefined,
        photoUrl: place.photoUrl,
      }));
      
      console.log("=== DEBUG: Final Places from Google Places + TripAdvisor ===", places);
      return places;
      
    } catch (err) {
      console.error("=== DEBUG: Error in route generation ===", err);
      throw new Error("Could not generate route with Google Places and TripAdvisor data.");
    }
  }
  
  return { getLLMPlaces };
}
