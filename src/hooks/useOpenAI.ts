
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
        
        // Generate description using OpenAI with improved error handling
        let generatedDescription = '';
        
        // Only call OpenAI if we have valid place data
        if (placeName && placeName !== 'Unknown Place') {
          try {
            console.log(`Calling OpenAI for: ${placeName}`);
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                  {
                    role: 'system',
                    content: 'You are a travel guide. Generate a comprehensive, informative description about a tourist attraction. Include what makes it special, interesting facts, what visitors can expect, and practical information. Always mention "Recommended visit: 20 minutes" for attractions. Be engaging but factual.'
                  },
                  {
                    role: 'user',
                    content: `Generate a detailed description for "${placeName}" in ${location}. Type: ${place.type || 'attraction'}. Address: ${placeAddress || 'Address not specified'}. Include interesting facts, visitor experience, and practical tips. End with "Recommended visit: 20 minutes."`
                  }
                ],
                max_tokens: 250,
                temperature: 0.7
              }),
            });

            console.log(`OpenAI API response status for ${placeName}:`, response.status);
            
            if (response.ok) {
              const data = await response.json();
              generatedDescription = data.choices[0]?.message?.content?.trim() || '';
              console.log(`✅ Generated description for ${placeName}:`, generatedDescription);
              
              if (!generatedDescription) {
                console.warn(`⚠️ Empty description returned from OpenAI for ${placeName}`);
              }
            } else {
              const errorText = await response.text();
              console.error(`❌ OpenAI API failed for ${placeName}:`, response.status, errorText);
            }
          } catch (error) {
            console.error(`❌ Error calling OpenAI for ${placeName}:`, error);
          }
        } else {
          console.warn(`⚠️ Skipping OpenAI call for invalid place data: ${placeName}`);
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
          description: generatedDescription || `A popular ${place.type || 'destination'} that offers a unique local experience.`,
          openingHours: place.openingHours,
          ticketPrice: place.ticketPrice,
          website: place.website,
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
      
      return places;
      
    } catch (err) {
      console.error("=== DEBUG: TripAdvisor Error ===", err);
      throw new Error("Could not generate route from TripAdvisor.\n\n" + err.message);
    }
  }
  
  return { getLLMPlaces };
}
