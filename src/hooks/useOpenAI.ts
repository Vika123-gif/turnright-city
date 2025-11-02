
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
  photoUrls?: string[]; // Multiple photos
  description?: string; // Interesting facts and useful information
  openingHours?: string[]; // Opening hours for each day
  ticketPrice?: string; // Ticket price information
  website?: string; // Official website
  day?: number; // Optional day property for multi-day planning
  rating?: number; // Optional rating from Google Places
  goalMatched?: string; // Primary category/goal this place matches
  coolScore?: number; // Optional AI coolness score
};

export type RouteTimeData = {
  requestedMinutes?: number;
  computedMinutes?: number;
  totalWalkingTime?: number;
  totalExploringTime?: number;
};

export type LLMResponse = {
  places: LLMPlace[];
  timeData?: RouteTimeData;
};

// OpenAI descriptions are now generated through edge function

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
    origin,
    destination,
    destinationType,
    goals,
    timeWindow,
    userPrompt,
    regenerationAttempt = 0,
    maxPlaces = 6,
    scenario = "planning"
  }: {
    location: string;
    origin?: string;
    destination?: string;
    destinationType?: "none" | "circle" | "specific";
    goals: string[];
    timeWindow: number; // Number of days for planning, minutes for onsite
    userPrompt: string;
    regenerationAttempt?: number;
    maxPlaces?: number;
    scenario?: "onsite" | "planning";
  }): Promise<LLMResponse> {
    
    console.log("=== DEBUG: TripAdvisor-only route generation ===");
    console.log("Location received in hook:", location);
    console.log("Goals received in hook:", goals);
    console.log("Time window:", timeWindow);
    console.log("Scenario:", scenario);
    
    // Calculate maxPlaces based on scenario
    let actualMaxPlaces = maxPlaces;
    if (scenario === "onsite") {
      // For onsite: 3h=2 places, 6h=4 places, 10h+ (full day)=6 places
      if (timeWindow <= 180) actualMaxPlaces = 2;      // 3 hours = 2 places
      else if (timeWindow <= 360) actualMaxPlaces = 4;  // 6 hours = 4 places
      else actualMaxPlaces = 6;                         // full day = 6 places
    } else if (scenario === "planning") {
      // For planning: 6 places per day, and timeWindow is number of days
      actualMaxPlaces = timeWindow * 6;
      console.log(`Planning scenario: ${timeWindow} days × 6 places = ${actualMaxPlaces} total places`);
    }
    
    console.log("Calculated max places:", actualMaxPlaces);
    
    // Convert timeWindow for API based on scenario
    let apiTimeWindow = timeWindow;
    if (scenario === "planning") {
      // For planning: call API multiple times for each day, but start with one day (480 minutes)
      // We'll generate places for each day separately in the edge function
      apiTimeWindow = 480 * timeWindow; // Total minutes for all days combined
      console.log(`Planning API call: ${timeWindow} days × 480 minutes = ${apiTimeWindow} total minutes`);
    }
    // For onsite scenario, timeWindow is already in minutes from the time selection
    
    console.log("API timeWindow (minutes):", apiTimeWindow);
    
    try {
      // Generate session ID for rate limiting
      const sessionId = localStorage.getItem('turnright_session_id') || 
        (() => {
          const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          localStorage.setItem('turnright_session_id', newSessionId);
          return newSessionId;
        })();

      // Call TripAdvisor function directly for route generation
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: tripAdvisorData, error } = await supabase.functions.invoke('tripadvisor-photos', {
        body: { 
          location: location,
          origin: origin || location,
          destination: destination,
          destinationType: destinationType || "none",
          goals: goals,
          timeWindow: apiTimeWindow,
          maxPlaces: actualMaxPlaces,
          scenario: scenario,  // planning | onsite
          strict: true,
          minPerGoal: scenario === 'planning' ? 1 : 2,
          debugMode: true,
          localeHint: 'en',
          sessionId: sessionId // Add session ID for rate limiting
        }
      });
      
      if (error) {
        console.error("TripAdvisor API error:", error);
        
        // Check if it's a rate limiting error
        if (error.message?.includes('RATE_LIMIT_EXCEEDED') || error.status === 429) {
          throw new Error("RATE_LIMIT_EXCEEDED");
        }
        
        throw new Error("Failed to fetch places from TripAdvisor: " + error.message);
      }
      
      // Check for rate limiting in response data
      if (tripAdvisorData?.error === 'RATE_LIMIT_EXCEEDED') {
        throw new Error("RATE_LIMIT_EXCEEDED");
      }
      
      if (!tripAdvisorData?.success || !Array.isArray(tripAdvisorData.places)) {
        console.error("Invalid TripAdvisor response:", tripAdvisorData);
        throw new Error("Invalid response from TripAdvisor API");
      }
      
      console.log("=== DEBUG: TripAdvisor Places ===", tripAdvisorData.places);
      
      // Convert TripAdvisor response to LLMPlace format and generate OpenAI descriptions
      const allPlaces = await Promise.all(tripAdvisorData.places.map(async (place: any, index: number) => {
        console.log(`=== PROCESSING PLACE ${index + 1} ===`);
        console.log("Raw place data:", JSON.stringify(place, null, 2));
        
        // Ensure we have coordinates in both formats
        const lat = place.lat || place.latitude;
        const lon = place.lon || place.longitude;
        const coordinates: [number, number] | undefined = 
          (lat && lon) ? [lon, lat] : undefined; // [lng, lat] format for Mapbox
        
        // Validate input data before calling OpenAI
        const placeName = place.name?.trim();
        const placeAddress = place.address?.trim();
        
        console.log(`=== OpenAI Input Validation for Place ${index + 1} ===`);
        console.log("Place name:", placeName);
        console.log("Place address:", placeAddress);
        console.log("Has valid name:", !!placeName);
        console.log("Has valid address:", !!placeAddress);
        
        // Generate description using edge function
        let generatedDescription = '';
        
        // Only call edge function if we have valid place data
        if (placeName && placeName !== 'Unknown Place') {
          try {
            console.log(`Calling edge function for: ${placeName}`);
            
            const { supabase } = await import("@/integrations/supabase/client");
            const { data: descriptionData, error: descriptionError } = await supabase.functions.invoke('generate-place-description', {
              body: { 
                placeName: placeName,
                placeType: place.type || 'attraction',
                city: location
              }
            });

            if (descriptionError) {
              console.error(`❌ Edge function error for ${placeName}:`, descriptionError);
            } else if (descriptionData?.description) {
              generatedDescription = descriptionData.description.trim();
              console.log(`✅ Generated description for ${placeName}:`, generatedDescription);
            } else {
              console.warn(`⚠️ Empty description returned from edge function for ${placeName}`);
            }
          } catch (error) {
            console.error(`❌ Error calling edge function for ${placeName}:`, error);
          }
        } else {
          console.warn(`⚠️ Skipping edge function call for invalid place data: ${placeName}`);
        }
        
        // Enhanced fallback descriptions based on place type and name
        if (!generatedDescription) {
          console.log(`🔄 Using fallback description for ${placeName || 'Unknown Place'}`);
          
          const placeType = place.type || 'attraction';
          const fallbackDescriptions = {
            'restaurant': `${placeName || 'This restaurant'} offers authentic local cuisine in ${location}. A great spot to experience the local flavors and dining culture. Recommended visit: 20 minutes.`,
            'museum': `${placeName || 'This museum'} showcases the rich history and culture of ${location}. Visitors can explore fascinating exhibits and learn about the local heritage. Recommended visit: 20 minutes.`,
            'park': `${placeName || 'This park'} provides a peaceful green space in ${location}. Perfect for a relaxing stroll and enjoying nature in the urban environment. Recommended visit: 20 minutes.`,
            'shopping': `${placeName || 'This shopping area'} is a popular destination for local goods and souvenirs in ${location}. Ideal for discovering unique items and local crafts. Recommended visit: 20 minutes.`,
            'attraction': `${placeName || 'This attraction'} is a notable point of interest in ${location}. A must-see destination that offers visitors a unique local experience and cultural insight. Recommended visit: 20 minutes.`,
            'default': `${placeName || 'This destination'} is a popular spot in ${location} worth visiting. It offers visitors an authentic local experience and insight into the area's character. Recommended visit: 20 minutes.`
          };
          
          generatedDescription = fallbackDescriptions[placeType as keyof typeof fallbackDescriptions] || fallbackDescriptions.default;
          console.log(`📝 Fallback description applied:`, generatedDescription);
        }
        
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
          photoUrls: Array.isArray(place.photoUrls) ? place.photoUrls : undefined,
          description: generatedDescription || `A popular ${place.type || 'destination'} that offers a unique local experience.`,
          openingHours: place.openingHours,
          ticketPrice: place.ticketPrice,
          website: place.website,
          day: place.day, // Preserve day assignment from backend
          rating: typeof place.rating === 'number' ? place.rating : undefined,
          goalMatched: place.goalMatched,
          coolScore: typeof place.coolScore === 'number' ? place.coolScore : undefined,
        };
        
        console.log("=== PLACE MAPPING DEBUG ===");
        console.log("Raw place from API:", place);
        console.log("Mapped place data:", {
          name: mappedPlace.name,
          hasAddress: !!mappedPlace.address,
          hasCoordinates: !!(mappedPlace.lat && mappedPlace.lon),
          hasPhotoUrl: !!mappedPlace.photoUrl,
          hasDescription: !!mappedPlace.description,
          description: mappedPlace.description,
          rawDescription: place.description,
          coordinates: mappedPlace.coordinates
        });
        
        // Log specific description debugging
        console.log("=== DESCRIPTION DEBUG ===");
        console.log("Raw place.description:", place.description);
        console.log("Mapped description:", mappedPlace.description);
        console.log("Description exists:", !!mappedPlace.description);
        console.log("Description length:", mappedPlace.description?.length || 0);
        
        return mappedPlace;
      }));
      
      // Filter places to ensure minimum viable data
      const places = allPlaces.filter(place => place.name && (place.address || (place.lat && place.lon)));
      
      console.log("=== DEBUG: Final Places from TripAdvisor ===", places);
      console.log("=== FINAL DESCRIPTION CHECK ===");
      places.forEach((place, i) => {
        console.log(`\n🔍 Place ${i + 1} - ${place.name}:`);
        console.log("  ✅ Has description:", !!place.description);
        console.log("  📝 Description:", place.description);
        console.log("  📏 Description length:", place.description?.length || 0);
        console.log("  🏠 Address:", place.address);
        console.log("  📍 Coordinates:", place.coordinates);
        console.log("  📷 Photo URL:", place.photoUrl || 'No photo');
        console.log("  ⏰ Visit duration:", place.visitDuration);
        console.log("  🚶 Walking time:", place.walkingTime);
      });
      
      // Additional validation check
      const placesWithDescriptions = places.filter(place => place.description && place.description.trim().length > 0);
      console.log(`\n📊 Summary: ${placesWithDescriptions.length}/${places.length} places have descriptions`);
      
      if (placesWithDescriptions.length !== places.length) {
        console.warn("⚠️ Some places are missing descriptions!");
        const missingDescriptions = places.filter(place => !place.description || place.description.trim().length === 0);
        missingDescriptions.forEach(place => {
          console.warn(`  - Missing description for: ${place.name}`);
        });
      }
      
      // Extract time data from backend response
      // Calculate totalExploringTime from actual places instead of backend value
      const calculatedExploringTime = places.reduce((sum, place) => sum + (place.visitDuration || 0), 0);
      const calculatedWalkingTime = places.reduce((sum, place) => sum + (place.walkingTime || 0), 0);
      
      // Detailed logging for walking time calculation
      console.log("=== WALKING TIME CALCULATION DEBUG ===");
      console.log("Number of places:", places.length);
      console.log("Individual walking times:");
      places.forEach((place, i) => {
        console.log(`  Place ${i + 1} (${place.name}): ${place.walkingTime} minutes`);
      });
      console.log("Total walking time (sum):", calculatedWalkingTime);
      console.log("Backend provided totalWalkingTime:", tripAdvisorData.totalWalkingTime);
      console.log("===================================");
      
      const timeData: RouteTimeData = {
        requestedMinutes: tripAdvisorData.requestedMinutes,
        computedMinutes: calculatedWalkingTime + calculatedExploringTime, // Recalculate based on actual places
        totalWalkingTime: calculatedWalkingTime, // Use calculated value
        totalExploringTime: calculatedExploringTime, // Use calculated value from places
      };
      
      console.log("=== TIME DATA DEBUG ===");
      console.log("Backend provided totalExploringTime:", tripAdvisorData.totalExploringTime);
      console.log("Calculated totalExploringTime from places:", calculatedExploringTime);
      console.log("Individual place visitDurations:", places.map(p => p.visitDuration));
      console.log("Final timeData:", timeData);
      
      return {
        places,
        timeData
      };
      
    } catch (err) {
      console.error("=== ROUTE GENERATION ERROR ===", err);
      console.error("Error details:", err instanceof Error ? err.message : String(err));
      
      // Throw error instead of returning mock data
      throw new Error(`Failed to generate route: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
  
  return { getLLMPlaces };
}
