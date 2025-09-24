import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json()
    console.log('=== Google Places API Request ===')
    console.log('Request body:', requestBody)

    if (!GOOGLE_PLACES_API_KEY) {
      throw new Error('Google Places API key not configured')
    }

    // Check if this is a search by name request
    if (requestBody.searchMode === 'by_name') {
      return await handlePlaceNameSearch(requestBody)
    } else {
      return await handleNearbySearch(requestBody)
    }

  } catch (error) {
    console.error('Error in google-places function:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})

async function handlePlaceNameSearch(requestBody: any) {
  const { location, placeName, placeType } = requestBody
  
  console.log('=== Place Name Search ===')
  console.log('Location:', location)
  console.log('Place Name:', placeName)
  console.log('Place Type:', placeType)

  // First, geocode the location to get coordinates
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${GOOGLE_PLACES_API_KEY}`
  
  const geocodeResponse = await fetch(geocodeUrl)
  const geocodeData = await geocodeResponse.json()
  
  if (geocodeData.status !== 'OK' || !geocodeData.results.length) {
    throw new Error(`Could not geocode location: ${location}`)
  }

  const { lat, lng } = geocodeData.results[0].geometry.location
  console.log('Geocoded coordinates:', lat, lng)

  // Try multiple search strategies to find the exact place
  const searchStrategies = [
    // Strategy 1: Exact name with location
    `"${placeName}" ${location}`,
    // Strategy 2: Name with location and type
    `${placeName} ${location} ${placeType || 'restaurant'}`,
    // Strategy 3: Just the name in the area
    `${placeName} near ${location}`,
    // Strategy 4: Search without quotes
    `${placeName} ${location}`
  ]

  let bestResults: any[] = []
  
  for (const searchQuery of searchStrategies) {
    console.log(`Trying search strategy: "${searchQuery}"`)
    
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&location=${lat},${lng}&radius=5000&key=${GOOGLE_PLACES_API_KEY}`
    
    const searchResponse = await fetch(textSearchUrl)
    const searchData = await searchResponse.json()
    
    if (searchData.status === 'OK' && searchData.results && searchData.results.length > 0) {
      console.log(`Found ${searchData.results.length} results for: "${searchQuery}"`)
      
      // Filter results to find the best match
      const filteredResults = searchData.results.filter((place: any) => {
        const placeLowerName = place.name.toLowerCase()
        const searchLowerName = placeName.toLowerCase()
        
        // Check if the place name contains the search term or vice versa
        return placeLowerName.includes(searchLowerName) || searchLowerName.includes(placeLowerName)
      })
      
      if (filteredResults.length > 0) {
        bestResults = filteredResults
        console.log(`Found ${filteredResults.length} matching results`)
        break
      } else if (bestResults.length === 0) {
        // If no exact matches, use all results as fallback
        bestResults = searchData.results
      }
    }
  }

  if (bestResults.length === 0) {
    console.log('No results found for place name search')
    return new Response(
      JSON.stringify({
        success: true,
        places: []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  console.log(`Processing ${Math.min(bestResults.length, 3)} best results`)

  // Calculate walking times and format results
  const formattedPlaces = await Promise.all(
    bestResults.slice(0, 3).map(async (place: any) => {
      // Get detailed place information including photos
      const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,geometry,rating,types,photos&key=${GOOGLE_PLACES_API_KEY}`
      
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

      return {
        name: detailedPlace.name,
        address: detailedPlace.formatted_address || detailedPlace.vicinity || '',
        walkingTime,
        type: placeType || 'place',
        rating: detailedPlace.rating || null,
        place_id: detailedPlace.place_id,
        photoUrl,
        coordinates: detailedPlace.geometry?.location ? 
          [detailedPlace.geometry.location.lng, detailedPlace.geometry.location.lat] : 
          undefined
      }
    })
  )

  console.log(`Returning ${formattedPlaces.length} places from name search`)
  console.log('Final results:', formattedPlaces.map(p => ({ name: p.name, address: p.address })))

  return new Response(
    JSON.stringify({
      success: true,
      places: formattedPlaces
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  )
}

async function handleNearbySearch(requestBody: any) {
  const { location, goals, timeWindow } = requestBody
  
  console.log('=== Nearby Search ===')
  console.log('Location:', location)
  console.log('Goals:', goals)
  console.log('Time Window:', timeWindow)

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

  // Calculate walking times and format results with photos
  const formattedPlaces = await Promise.all(
    uniquePlaces.slice(0, 10).map(async (place: any) => {
      // Get detailed place information including photos
      const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,geometry,rating,types,photos&key=${GOOGLE_PLACES_API_KEY}`
      
      let photoUrl = null
      
      try {
        const detailsResponse = await fetch(placeDetailsUrl)
        const detailsData = await detailsResponse.json()
        
        if (detailsData.status === 'OK' && detailsData.result?.photos && detailsData.result.photos.length > 0) {
          const photo = detailsData.result.photos[0]
          photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
        }
      } catch (error) {
        console.error('Error getting place photos:', error)
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

      return {
        name: place.name,
        address: place.vicinity || place.formatted_address || '',
        walkingTime,
        type: place.searchType,
        rating: place.rating || null,
        place_id: place.place_id,
        photoUrl
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
}
