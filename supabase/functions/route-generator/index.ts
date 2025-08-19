import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY')
const TRIPADVISOR_API_KEY = Deno.env.get('TRIPADVISOR_API_KEY')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { location, goals, timeWindow } = await req.json()
    console.log('=== Route Generator Request ===')
    console.log('Location:', location)
    console.log('Goals:', goals)
    console.log('Time Window:', timeWindow)

    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key not configured')
    }

    if (!TRIPADVISOR_API_KEY) {
      throw new Error('TripAdvisor API key not configured')
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

    // Calculate how many places to suggest based on time window
    const timeToPlaces: Record<string, number> = {
      "30": 1,
      "60": 2,
      "90": 2,
      "120": 3
    }
    
    const maxPlaces = timeToPlaces[timeWindow] || 2

    // Get unique place types from selected goals
    const placeTypes = [...new Set(goals.flatMap((goal: string) => goalToPlaceTypes[goal] || []))]
    console.log('Place types to search:', placeTypes)

    const allPlaces: any[] = []

    // Search for each place type using Google Places
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

    console.log(`Found ${allPlaces.length} places total from Google Places`)

    // Remove duplicates and filter by rating
    const uniquePlaces = allPlaces
      .filter((place, index, arr) => 
        arr.findIndex(p => p.place_id === place.place_id) === index
      )
      .filter(place => place.rating >= 4.0) // Only high-rated places
      .sort((a, b) => (b.rating || 0) - (a.rating || 0)) // Sort by rating
      .slice(0, 15) // Take top 15 for processing

    // Process places and enrich with TripAdvisor data
    const formattedPlaces = await Promise.all(
      uniquePlaces.slice(0, maxPlaces * 2).map(async (place: any) => {
        try {
          // Get detailed place information including photos from Google Places
          const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,geometry,rating,types,photos,price_level,opening_hours&key=${GOOGLE_PLACES_API_KEY}`
          
          let detailedPlace = place
          let photoUrl = null
          
          try {
            const detailsResponse = await fetch(placeDetailsUrl)
            const detailsData = await detailsResponse.json()
            
            if (detailsData.status === 'OK' && detailsData.result) {
              detailedPlace = { ...place, ...detailsData.result }
              
              // Get the first photo if available
              if (detailsData.result.photos && detailsData.result.photos.length > 0) {
                const photo = detailsData.result.photos[0]
                photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
              }
            }
          } catch (error) {
            console.error('Error getting place details:', error)
          }

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

          // Try to enrich with TripAdvisor data
          let tripAdvisorInfo = null
          try {
            const searchQuery = `${detailedPlace.name} ${location}`
            const tripAdvisorSearchUrl = `https://api.content.tripadvisor.com/api/v1/location/search?key=${TRIPADVISOR_API_KEY}&searchQuery=${encodeURIComponent(searchQuery)}&language=en`
            
            const tripAdvisorResponse = await fetch(tripAdvisorSearchUrl)
            const tripAdvisorData = await tripAdvisorResponse.json()
            
            if (tripAdvisorData.data && tripAdvisorData.data.length > 0) {
              const tripAdvisorPlace = tripAdvisorData.data[0]
              
              // Get detailed info from TripAdvisor
              const detailsUrl = `https://api.content.tripadvisor.com/api/v1/location/${tripAdvisorPlace.location_id}/details?key=${TRIPADVISOR_API_KEY}&language=en`
              const detailsResponse = await fetch(detailsUrl)
              const detailsData = await detailsResponse.json()
              
              if (detailsData) {
                tripAdvisorInfo = {
                  description: detailsData.description,
                  web_url: detailsData.web_url,
                  ranking: detailsData.ranking,
                  num_reviews: detailsData.num_reviews,
                  awards: detailsData.awards
                }
              }
            }
          } catch (error) {
            console.error('Error fetching TripAdvisor data:', error)
          }

          // Generate reason based on place data and goals
          const generateReason = (place: any, goals: string[], tripAdvisorInfo: any) => {
            const goalDescriptions: Record<string, string> = {
              restaurants: "great food and dining experience",
              coffee: "excellent coffee and atmosphere",
              work: "good workspace with wifi",
              museums: "cultural and educational value",
              parks: "nature and outdoor relaxation",
              monuments: "historical and architectural significance"
            }

            const matchingGoals = goals.filter(goal => 
              place.types?.some((type: string) => 
                goalToPlaceTypes[goal]?.includes(type)
              )
            )

            let reason = `Highly rated (${place.rating}/5)`
            
            if (matchingGoals.length > 0) {
              const goalText = matchingGoals.map(goal => goalDescriptions[goal]).join(" and ")
              reason += ` with ${goalText}`
            }

            if (tripAdvisorInfo?.ranking) {
              reason += `. ${tripAdvisorInfo.ranking}`
            }

            if (place.price_level !== undefined) {
              const priceText = ['Free', 'Inexpensive', 'Moderate', 'Expensive', 'Very Expensive'][place.price_level]
              reason += `. ${priceText} pricing.`
            }

            return reason
          }

          return {
            name: detailedPlace.name,
            address: detailedPlace.formatted_address || detailedPlace.vicinity || '',
            walkingTime,
            type: place.searchType,
            reason: generateReason(detailedPlace, goals, tripAdvisorInfo),
            rating: detailedPlace.rating || null,
            coordinates: detailedPlace.geometry?.location ? 
              [detailedPlace.geometry.location.lng, detailedPlace.geometry.location.lat] : 
              undefined,
            photoUrl,
            tripAdvisorInfo
          }
        } catch (error) {
          console.error(`Error processing place ${place.name}:`, error)
          return null
        }
      })
    )

    // Filter out null results and places with walking time > 10 minutes
    const validPlaces = formattedPlaces
      .filter(place => place !== null && place.walkingTime <= 10)
      .slice(0, maxPlaces)

    console.log(`Returning ${validPlaces.length} curated places`)

    return new Response(
      JSON.stringify({
        success: true,
        places: validPlaces,
        source: 'google_places_tripadvisor'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error in route-generator function:', error)
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