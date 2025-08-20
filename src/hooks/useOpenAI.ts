
import { useState } from "react";
import { useMapbox } from "./useMapbox";

export type LLMPlace = {
  name: string;
  address: string;
  walkingTime: number;
  visitDuration?: number; // Time to spend at this location (in minutes)
  type?: string;
  reason?: string;
  lat?: number;
  lon?: number;
  coordinates?: [number, number]; // [lng, lat] from Mapbox
  photoUrl?: string; // Google Places photo URL
  description?: string; // Interesting facts and useful information
  openingHours?: string[]; // Opening hours for each day
  ticketPrice?: string; // Ticket price information
  website?: string; // Official website
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
    timeWindow: number; // Changed from string to number (minutes)
    userPrompt: string;
    regenerationAttempt?: number;
    maxPlaces?: number;
  }): Promise<LLMPlace[]> {
    
    console.log("=== DEBUG: TripAdvisor-only route generation ===");
    console.log("Location received in hook:", location);
    console.log("Goals received in hook:", goals);
    console.log("Time window (minutes):", timeWindow);
    
    try {
      // Call TripAdvisor function directly for route generation
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: tripAdvisorData, error } = await supabase.functions.invoke('tripadvisor-photos', {
        body: { 
          location: location,
          goals: goals,
          timeWindow: timeWindow // Pass as number directly
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
      
      // Convert TripAdvisor response to LLMPlace format with complete field validation
      const places: LLMPlace[] = tripAdvisorData.places.map((place: any) => {
        // Ensure we have coordinates in both formats
        const lat = place.lat || place.latitude;
        const lon = place.lon || place.longitude;
        const coordinates: [number, number] | undefined = 
          (lat && lon) ? [lon, lat] : undefined; // [lng, lat] format for Mapbox
        
        const mappedPlace: LLMPlace = {
          name: place.name || 'Unknown Place',
          address: place.address || place.vicinity || 'Address not available',
          walkingTime: place.walkingTime || place.walkingTimeFromPrevious || 5,
          visitDuration: place.visitDuration || 0, // Time to spend at this location
          type: place.type || place.typeNormalized || 'attraction',
          reason: place.reason || `Recommended ${place.type || 'place'}`,
          lat: lat,
          lon: lon,
          coordinates: coordinates,
          photoUrl: place.photoUrl || place.photo_url,
          description: place.description,
          openingHours: place.openingHours,
          ticketPrice: place.ticketPrice,
          website: place.website,
        };
        
        console.log("Mapped place data:", {
          name: mappedPlace.name,
          hasAddress: !!mappedPlace.address,
          hasCoordinates: !!(mappedPlace.lat && mappedPlace.lon),
          hasPhotoUrl: !!mappedPlace.photoUrl,
          coordinates: mappedPlace.coordinates
        });
        
        return mappedPlace;
      }).filter(place => place.name && (place.address || (place.lat && place.lon))); // Ensure minimum viable data
      
      console.log("=== DEBUG: Final Places from TripAdvisor ===", places);
      return places;
      
    } catch (err) {
      console.error("=== DEBUG: TripAdvisor Error ===", err);
      throw new Error("Could not generate route from TripAdvisor.\n\n" + err.message);
    }
  }
  
  return { getLLMPlaces };
}
