
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { location, goals, timeWindow } = await req.json()
    
    console.log('=== Google Places API Request ===')
    console.log('Location:', location)
    console.log('Goals:', goals)
    console.log('Time Window:', timeWindow)

    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key not configured')
    }

    // First, geocode the location to get coordinates
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${GOOGLE_PLACES_API_KEY}`
    
    const geocodeResponse = await fetch(geocodeUrl)
    const geocodeData = await geocodeResponse.json()
    
    if (geocodeData.status !== 'OK' || !geocodeData.results.length) {
      throw new Error(`Could not geocode location: ${location}`)
    }

    const { lat, lng } = geocodeData.results[0].geometry.location
    console.log('Geocoded coordinates:', lat, lng)

    // Map goals to Google Places types
    const goalToPlaceTypes: Record<string, string[]> = {
      restaurants: ['restaurant', 'meal_takeaway', 'food'],
      coffee: ['cafe', 'bakery'],
      work: ['cafe', 'library'],
      museums: ['museum', 'art_gallery', 'tourist_attraction'],
      parks: ['park', 'tourist_attraction'],
      monuments: ['tourist_attraction', 'place_of_worship', 'cemetery']
    }

    // Get unique place types from selected goals
    const placeTypes = [...new Set(goals.flatMap((goal: string) => goalToPlaceTypes[goal] || []))]
    console.log('Place types to search:', placeTypes)

    const allPlaces: any[] = []

    // Search for each place type
    for (const type of placeTypes) {
      const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=800&type=${type}&key=${GOOGLE_PLACES_API_KEY}`
      
      const placesResponse = await fetch(placesUrl)
      const placesData = await placesResponse.json()
      
      if (placesData.status === 'OK' && placesData.results) {
        allPlaces.push(...placesData.results.map((place: any) => ({
          ...place,
          searchType: type
        })))
      }
    }

    console.log(`Found ${allPlaces.length} places total`)

    // Remove duplicates and filter
    const uniquePlaces = allPlaces.filter((place, index, arr) => 
      arr.findIndex(p => p.place_id === place.place_id) === index
    )

    // Calculate walking times and format results
    const formattedPlaces = await Promise.all(
      uniquePlaces.slice(0, 10).map(async (place: any) => {
        // Calculate walking distance/time using Distance Matrix API
        const distanceUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat},${lng}&destinations=place_id:${place.place_id}&mode=walking&key=${GOOGLE_PLACES_API_KEY}`
        
        let walkingTime = 5 // default fallback
        
        try {
          const distanceResponse = await fetch(distanceUrl)
          const distanceData = await distanceResponse.json()
          
          if (distanceData.status === 'OK' && distanceData.rows[0]?.elements[0]?.duration) {
            walkingTime = Math.round(distanceData.rows[0].elements[0].duration.value / 60)
          }
        } catch (error) {
          console.error('Error calculating walking time:', error)
        }

        return {
          name: place.name,
          address: place.vicinity || place.formatted_address || '',
          walkingTime,
          type: place.searchType,
          rating: place.rating || null,
          place_id: place.place_id
        }
      })
    )

    // Filter places within 10 minutes walking
    const nearbyPlaces = formattedPlaces.filter(place => place.walkingTime <= 10)
    
    console.log(`Returning ${nearbyPlaces.length} places within walking distance`)

    return new Response(
      JSON.stringify({
        success: true,
        places: nearbyPlaces
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in google-places function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
