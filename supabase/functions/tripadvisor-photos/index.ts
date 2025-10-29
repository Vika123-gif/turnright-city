import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialize Supabase client for caching
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Caching functions
async function getCachedSearchResults(
  lat: number, 
  lng: number, 
  radius: number, 
  goal: string,
  searchType: string = 'nearby'
): Promise<Place[] | null> {
  const cacheKey = `${searchType}_${lat.toFixed(4)}_${lng.toFixed(4)}_${radius}_${goal}`;
  
  try {
    const { data: cached, error } = await supabase
      .from('search_cache')
      .select('results')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();
      
    if (cached && !error) {
      console.log(`🎯 Cache hit for ${goal} at ${lat},${lng} (${searchType})`);
      return cached.results;
    }
  } catch (error) {
    console.log(`Cache miss for ${goal} at ${lat},${lng}:`, error.message);
  }
  
  return null;
}

async function cacheSearchResults(
  lat: number, 
  lng: number, 
  radius: number, 
  goal: string, 
  results: Place[],
  searchType: string = 'nearby'
) {
  const cacheKey = `${searchType}_${lat.toFixed(4)}_${lng.toFixed(4)}_${radius}_${goal}`;
  
  try {
    await supabase
      .from('search_cache')
      .upsert({
        cache_key: cacheKey,
        search_type: searchType,
        location_lat: lat,
        location_lon: lng,
        radius: radius,
        goal: goal,
        results: results,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    
    console.log(`💾 Cached ${results.length} results for ${goal} at ${lat},${lng}`);
  } catch (error) {
    console.error('Failed to cache search results:', error);
  }
}

async function getCachedPlaceDetails(placeId: string): Promise<Place | null> {
  try {
    const { data: cached, error } = await supabase
      .from('places_cache')
      .select('*')
      .eq('place_id', placeId)
      .gt('expires_at', new Date().toISOString())
      .single();
      
    if (cached && !error) {
      console.log(`🎯 Cache hit for place details: ${cached.name}`);
      return {
        place_id: cached.place_id,
        name: cached.name,
        lat: cached.lat,
        lon: cached.lon,
        types: cached.types,
        rating: cached.rating,
        user_ratings_total: cached.user_ratings_total,
        photos: cached.photos,
        editorial_summary: cached.editorial_summary,
        business_status: cached.business_status,
        opening_hours: cached.opening_hours,
        price_level: cached.price_level,
        vicinity: cached.vicinity,
        formatted_address: cached.formatted_address
      };
    }
  } catch (error) {
    console.log(`Cache miss for place details: ${placeId}`);
  }
  
  return null;
}

async function cachePlaceDetails(place: Place) {
  try {
    await supabase
      .from('places_cache')
      .upsert({
        place_id: place.place_id,
        name: place.name,
        lat: place.lat,
        lon: place.lon,
        types: place.types,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        photos: place.photos,
        editorial_summary: place.editorial_summary,
        business_status: place.business_status,
        opening_hours: place.opening_hours,
        price_level: place.price_level,
        vicinity: place.vicinity,
        formatted_address: place.formatted_address,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    
    console.log(`💾 Cached place details: ${place.name}`);
  } catch (error) {
    console.error('Failed to cache place details:', error);
  }
}

async function getNearbyCachedPlaces(
  lat: number, 
  lng: number, 
  radius: number, 
  goal: string
): Promise<Place[]> {
  try {
    const { data: cached, error } = await supabase
      .rpc('get_cached_places_nearby', {
        p_lat: lat,
        p_lon: lng,
        p_radius: radius,
        p_goal: goal
      });
      
    if (cached && !error && cached.length > 0) {
      console.log(`🎯 Spatial cache hit: ${cached.length} places for ${goal} near ${lat},${lng}`);
      return cached.map((place: any) => ({
        place_id: place.place_id,
        name: place.name,
        lat: place.lat,
        lon: place.lon,
        types: place.types,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        photos: place.photos,
        editorial_summary: place.editorial_summary,
        business_status: place.business_status,
        opening_hours: place.opening_hours,
        price_level: place.price_level,
        vicinity: place.vicinity,
        formatted_address: place.formatted_address
      }));
    }
  } catch (error) {
    console.log(`Spatial cache miss for ${goal} near ${lat},${lng}:`, error.message);
  }
  
  return [];
}

// Category mappings embedded directly
const categoryMappings = {
  "Viewpoints": {
    "typesAllow": ["tourist_attraction","natural_feature","park","point_of_interest","establishment"],
    "keywords": ["viewpoint","observation deck","lookout","panorama","terrace","tower","scenic","widok","taras","punkt widokowy","mirador","belvedere","belvédère"],
    "osm": ["tourism=viewpoint","historic=monument","man_made=tower"]
  },
  "Specialty coffee": {
    "typesAllow": ["cafe","restaurant"],
    "keywords": [
      "specialty coffee","speciality coffee","roastery","roaster","third wave",
      "single-origin","single origin","V60","aeropress","pour over","brew bar",
      "flat white","filter coffee",
      "palarnia","palarnia kawy","kawa speciality","kawa specialty",
      "kawiarnia specialty","kawiarnia speciality"
    ]
  },
  "Coworking": {
    "typesAllow": ["point_of_interest","establishment"],
    "keywords": ["cowork","co-working","shared office","hot desk","day pass","flex office","biuro coworking","biura serwisowane","przestrzeń coworking","work hub","Workin","WeWork","Mindspace","Regus","Spaces","Brain Embassy","HubHub","Business Link","New Work"],
    "osm": ["amenity=coworking_space","office=coworking"]
  },
  "Bakery": {
    "typesAllow": ["bakery"],
    "keywords": ["bakery","boulangerie","piekarnia","panadería","ベーカリー","面包房"]
  },
  "Restaurants": {
    "typesAllow": ["restaurant"],
    "keywords": ["restaurant","restauracja","restaurante","レストラン","餐厅"]
  },
  "Bars": {
    "typesAllow": ["bar","night_club","restaurant"],
    "keywords": ["bar","pub","cocktail","wine","beer","bar","pub","koktajl","wino","piwo","cocktail bar","wine bar","beer bar","whiskey","vodka","gin","rum","tequila","sake","bar warszawa","pub warszawa","cocktail warszawa"]
  },
  "Museums": {
    "typesAllow": ["museum","art_gallery"],
    "keywords": ["museum","gallery","muzeum","galeria","museo","美術館","博物馆"]
  },
  "Parks": {
    "typesAllow": ["park"],
    "keywords": ["park","garden","park","ogród","parque","公園","公园"]
  },
  "Cafés": {
    "typesAllow": ["cafe"],
    "keywords": ["cafe","coffee","kawiarnia","café","咖啡","コーヒー"]
  },
  "Architectural landmarks": {
    "typesAllow": ["tourist_attraction","point_of_interest"],
    "keywords": ["architecture","landmark","monument","architektura","zabytek","arquitectura","建筑","建築"]
  }
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Place {
  place_id: string;
  name: string;
  lat: number;
  lon: number;
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  photos?: any[];
  editorial_summary?: string;
  business_status?: string;
  opening_hours?: any;
  price_level?: number;
  vicinity?: string;
  formatted_address?: string;
}

interface GoalMatch {
  match: boolean;
  matchedKeywords: string[];
  categoryFit: number;
}

interface BucketStats {
  raw: number;
  afterMatch: number;
  seeded: number;
  extras: number;
  dropped?: Array<{
    name: string;
    reason: string;
    types?: string[];
    keywordsHit?: string[];
  }>;
}

interface DebugInfo {
  perGoal: Record<string, BucketStats>;
  radiusProgression: number[];
  sourcesUsed: Array<"google" | "osm" | "seed">;
}

interface InsufficientCategory {
  goal: string;
  have: number;
  need: number;
  nextStep: string;
}

// --- Canonical identity and dedup helpers ---
function normalizeName(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function roundCoord(n: number, places = 5): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

function canonicalId(p: { place_id?: string | null; name: string; lat: number; lon: number }): string {
  if (p.place_id && typeof p.place_id === 'string' && p.place_id.length > 0) return p.place_id;
  return `${normalizeName(p.name)}|${roundCoord(p.lat)},${roundCoord(p.lon)}`;
}

function areNearby(a: { lat: number; lon: number }, b: { lat: number; lon: number }, meters = 60): boolean {
  const R = 6371000;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  const dist = 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  return dist <= meters;
}

function deduplicateCandidates(candidates: Place[]): Place[] {
  const byCanonical = new Map<string, Place>();
  for (const c of candidates) {
    const id = canonicalId(c);
    const existing = byCanonical.get(id);
    if (!existing) {
      byCanonical.set(id, c);
      continue;
    }
    const existingReviews = existing.user_ratings_total || 0;
    const cReviews = c.user_ratings_total || 0;
    const existingRating = existing.rating || 0;
    const cRating = c.rating || 0;
    if (cReviews > existingReviews || (cReviews === existingReviews && cRating > existingRating)) {
      byCanonical.set(id, c);
    }
  }
  // Fuzzy merge (same name within 60m)
  const out: Place[] = [];
  for (const p of byCanonical.values()) {
    const dup = out.find(q => normalizeName(q.name) === normalizeName(p.name) && areNearby({ lat: q.lat, lon: q.lon }, { lat: p.lat, lon: p.lon }, 60));
    if (!dup) out.push(p);
  }
  return out;
}

function collapseConsecutiveDuplicates(list: Place[]): Place[] {
  if (list.length < 2) return list;
  const out: Place[] = [list[0]];
  for (let i = 1; i < list.length; i++) {
    const prev = out[out.length - 1];
    const cur = list[i];
    const sameCanonical = canonicalId(prev) === canonicalId(cur);
    const sameNearbyName = normalizeName(prev.name) === normalizeName(cur.name) && areNearby({ lat: prev.lat, lon: prev.lon }, { lat: cur.lat, lon: cur.lon }, 40);
    if (sameCanonical || sameNearbyName) {
      // accumulate dwell for later display
      const dwellPrev = (prev as any)._combinedDwell ?? 0;
      const dwellCur = (cur as any)._combinedDwell ?? 0;
      (prev as any)._combinedDwell = dwellPrev + dwellCur;
      continue;
    }
    out.push(cur);
  }
  return out;
}

// Enhanced fits function with keyword matching
function fits(place: Place, goal: string): GoalMatch {
  const mapping = categoryMappings[goal];
  if (!mapping) {
    return { match: false, matchedKeywords: [], categoryFit: 0 };
  }

  const types = place.types || [];
  const name = place.name || '';
  const summary = place.editorial_summary || '';
  const businessStatus = place.business_status || '';
  const textToSearch = `${name} ${summary} ${businessStatus}`.toLowerCase();
  
  let categoryFit = 0;
  const matchedKeywords: string[] = [];

  // Check types
  const hasAllowedType = mapping.typesAllow.some(type => types.includes(type));
  if (hasAllowedType) {
    categoryFit += 1;
  }

  // Check keywords
  for (const keyword of mapping.keywords) {
    if (textToSearch.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
      categoryFit += 2;
    }
  }

  // Special rules for specific categories
  if (goal === 'Viewpoints') {
    // Reject if museum/theater present and no viewpoint keywords AND no allowed types
    const hasAllowedType = mapping.typesAllow.some(type => types.includes(type));
    if ((types.includes('museum') || types.includes('theater') || types.includes('art_gallery')) && matchedKeywords.length === 0 && !hasAllowedType) {
      return { match: false, matchedKeywords: [], categoryFit: 0 };
    }
    // Reject churches, zoos, shopping, etc.
    if (
      types.includes('church') || types.includes('place_of_worship') ||
      types.includes('zoo') || types.includes('library') || types.includes('cemetery') || types.includes('amusement_park') ||
      types.includes('shopping_mall') || types.includes('department_store')
    ) {
      return { match: false, matchedKeywords: [], categoryFit: 0 };
    }
    // Reject memorials, monuments, statues, and war-related places
    if (textToSearch.includes('memorial') || textToSearch.includes('monument') || textToSearch.includes('war') || textToSearch.includes('tomb') || textToSearch.includes('grave') || textToSearch.includes('statue') || textToSearch.includes('sculpture') || textToSearch.includes('powstaniec') || textToSearch.includes('insurgent')) {
      return { match: false, matchedKeywords: [], categoryFit: 0 };
    }
  }

  if (goal === 'Specialty coffee') {
    // Require cafe OR restaurant AND at least one specialty keyword hit
    const isCafeOrRestaurant = types.includes('cafe') || types.includes('restaurant');
    if (!isCafeOrRestaurant) {
      return { match: false, matchedKeywords: [], categoryFit: 0 };
    }
    // Enforce keyword requirement for specialty coffee
    if (matchedKeywords.length === 0) {
      return { match: false, matchedKeywords: [], categoryFit: 0 };
    }
  }

  if (goal === 'Coworking') {
    // Ignore library and church types; require coworking keywords/brands
    if ((types.includes('library') || types.includes('church') || types.includes('place_of_worship')) && matchedKeywords.length === 0) {
      return { match: false, matchedKeywords: [], categoryFit: 0 };
    }
    // Exclude pure cafe/restaurant unless coworking keywords hit
    if ((types.includes('cafe') || types.includes('restaurant')) && matchedKeywords.length === 0) {
      return { match: false, matchedKeywords: [], categoryFit: 0 };
    }
  }

  if (goal === 'Bars') {
    // Allow restaurants if they have bar-related keywords
    if (types.includes('restaurant') && matchedKeywords.length === 0) {
      return { match: false, matchedKeywords: [], categoryFit: 0 };
    }
  }

  const match = hasAllowedType && (matchedKeywords.length > 0 || categoryFit >= 1);
  
  return { match, matchedKeywords, categoryFit };
}

// Google Places API calls with comprehensive diagnostics
async function collectCandidatesForGoal(
  goal: string,
  lat: number,
  lng: number,
  locale: string,
  minPerGoal: number,
  targetRaw: number = 60,
  debug: boolean = false
): Promise<{ candidates: Place[], diagnostics: any }> {
  const mapping = categoryMappings[goal];
  if (!mapping) return { candidates: [], diagnostics: {} };

  // Check cache first for each radius
  const radii = goal === 'Specialty coffee' ? [5000, 15000] : [5000, 20000]; // Reduced from 4 to 2 radii
  const cachedCandidates: Place[] = [];
  
  for (const radius of radii) {
    const cached = await getCachedSearchResults(lat, lng, radius, goal, 'nearby');
    if (cached) {
      cachedCandidates.push(...cached);
    }
  }
  
  // If we have enough cached candidates, return them
  if (cachedCandidates.length >= minPerGoal) {
    console.log(`🎯 Using ${cachedCandidates.length} cached candidates for ${goal}`);
    return { 
      candidates: cachedCandidates.slice(0, targetRaw), 
      diagnostics: { cached: true, count: cachedCandidates.length } 
    };
  }

  const GOOGLE_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") || Deno.env.get("GOOGLE_MAPS_API_KEY");
  
  if (!GOOGLE_KEY) {
    console.error("No Google API key found in environment variables");
    return { candidates: [], diagnostics: { error: "No API key" } };
  }

  const allCandidates: Place[] = [...cachedCandidates]; // Start with cached results
  const seenPlaceIds = new Set<string>();
  const diagnostics: any = {
    legacy: { status: "not_tested", error: null, count: 0 },
    new: { status: "not_tested", error: null, count: 0 },
    textsearch: { status: "not_tested", error: null, count: 0 },
    radiusProgression: [],
    cached: cachedCandidates.length
  };

  // Ensure higher target for Specialty coffee
  const requiredTargetRaw = goal === 'Specialty coffee' ? Math.max(targetRaw, 40) : targetRaw;

  for (const radius of radii) {
    if (allCandidates.length >= requiredTargetRaw) {
      console.log(`Reached target ${requiredTargetRaw} candidates, stopping radius escalation`);
      break;
    }
    
    // Early exit if we have enough candidates for this goal
    const goalMatches = allCandidates.filter(place => fits(place, goal).match);
    if (goalMatches.length >= minPerGoal) {
      console.log(`Found ${goalMatches.length} matches for ${goal}, stopping early`);
      break;
    }
    console.log(`Searching ${goal} within ${radius/1000}km radius`);
    const radiusStartCount = allCandidates.length;
    
    // Specialty coffee: query both cafe and point_of_interest with keywords
    const nearbyTypes = goal === 'Specialty coffee' ? ['cafe','point_of_interest'] : mapping.typesAllow.slice(0, 1);
    for (const type of nearbyTypes) {
      // Check cache first for this specific search
      const cachedResults = await getCachedSearchResults(lat, lng, radius, `${goal}_${type}`, 'nearby');
      if (cachedResults) {
        console.log(`🎯 Using cached results for ${goal} ${type} at ${radius}m radius`);
        for (const place of cachedResults) {
          if (!seenPlaceIds.has(place.place_id)) {
            allCandidates.push(place);
            seenPlaceIds.add(place.place_id);
          }
        }
        break; // Skip API call
      }
      
      const keywordParam = goal === 'Specialty coffee' && type === 'point_of_interest' ? `&keyword=${encodeURIComponent(mapping.keywords.slice(0,4).join(' '))}` : '';
      const legacyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}${keywordParam}&language=${locale}&key=${GOOGLE_KEY}`;
      
      try {
        const response = await fetch(legacyUrl);
        const data = await response.json();
        
        diagnostics.legacy = {
          status: data.status || "unknown",
          error: data.error_message || null,
          count: data.results?.length || 0,
          url: legacyUrl.replace(`&key=${GOOGLE_KEY}`, '&key=***')
        };
        
        if (data.status === "OK" && data.results) {
          const newPlaces: Place[] = [];
          for (const place of data.results) {
            if (!seenPlaceIds.has(place.place_id)) {
              // Extract coordinates from Google Places API response format
              const enrichedPlace = {
                ...place,
                lat: place.geometry?.location?.lat || place.lat,
                lon: place.geometry?.location?.lng || place.lon
              };
              allCandidates.push(enrichedPlace);
              newPlaces.push(enrichedPlace);
              seenPlaceIds.add(place.place_id);
            }
          }
          
          // Cache the results for future use
          if (newPlaces.length > 0) {
            await cacheSearchResults(lat, lng, radius, `${goal}_${type}`, newPlaces, 'nearby');
          }
        } else if (data.status === "REQUEST_DENIED") {
          console.error("Bad API key or restrictions");
        } else if (data.status === "OVER_QUERY_LIMIT") {
          console.error("Quota exceeded");
        } else if (data.status === "ZERO_RESULTS") {
          console.log(`Zero results for ${goal} at ${radius/1000}km`);
        }
      } catch (error) {
        console.error(`Error in legacy nearby search for ${goal}:`, error);
        diagnostics.legacy = {
          status: "error",
          error: error.message,
          count: 0,
          url: legacyUrl.replace(`&key=${GOOGLE_KEY}`, '&key=***')
        };
      }
      break; // Only test first type for diagnostics
    }

    // Test new Places API (if available)
    try {
      const newApiUrl = `https://places.googleapis.com/v1/places:searchNearby`;
      const newApiBody = {
        includedTypes: mapping.typesAllow.slice(0, 1),
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radius
          }
        }
      };

      const response = await fetch(newApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.types,places.location,places.rating,places.userRatingCount'
        },
        body: JSON.stringify(newApiBody)
      });

      const data = await response.json();
      
      diagnostics.new = {
        status: response.ok ? "OK" : "error",
        error: data.error?.message || null,
        count: data.places?.length || 0,
        url: newApiUrl
      };

      if (response.ok && data.places) {
        for (const place of data.places) {
          const placeId = place.id || `new_${Math.random()}`;
          if (!seenPlaceIds.has(placeId)) {
            allCandidates.push({
              place_id: placeId,
              name: place.displayName?.text || 'Unknown',
              lat: place.location?.latitude || lat,
              lon: place.location?.longitude || lng,
              types: place.types || [],
              rating: place.rating || 0,
              user_ratings_total: place.userRatingCount || 0
            });
            seenPlaceIds.add(placeId);
          }
        }
      }
    } catch (error) {
      console.error(`Error in new Places API for ${goal}:`, error);
      diagnostics.new = {
        status: "error",
        error: error.message,
        count: 0,
        url: "https://places.googleapis.com/v1/places:searchNearby"
      };
    }

    // Text Search with multiple keywords in PL and EN (reduced from 6 to 3 keywords)
    const languages = goal === 'Specialty coffee' ? [locale,'en','pl'] : [locale];
    for (const lang of languages) {
      for (const keyword of mapping.keywords.slice(0, 3)) {
        const textUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(keyword)}&location=${lat},${lng}&radius=${radius}&language=${lang}&key=${GOOGLE_KEY}`;
      
      try {
        const response = await fetch(textUrl);
        const data = await response.json();
        
        diagnostics.textsearch = {
          status: data.status || "unknown",
          error: data.error_message || null,
          count: data.results?.length || 0,
          url: textUrl.replace(`&key=${GOOGLE_KEY}`, '&key=***')
        };
        
        if (data.status === "OK" && data.results) {
          for (const place of data.results) {
            if (!seenPlaceIds.has(place.place_id)) {
              // Extract coordinates from Google Places API response format
              const enrichedPlace = {
      ...place,
                lat: place.geometry?.location?.lat || place.lat,
                lon: place.geometry?.location?.lng || place.lon
              };
              allCandidates.push(enrichedPlace);
              seenPlaceIds.add(place.place_id);
            }
          }
        }
      } catch (error) {
        console.error(`Error in text search for ${goal}:`, error);
        diagnostics.textsearch = {
          status: "error",
          error: error.message,
          count: 0,
          url: textUrl.replace(`&key=${GOOGLE_KEY}`, '&key=***')
        };
      }
    }
    }

    // Check if we have enough candidates
    const goalMatchesInRadius = allCandidates.filter(place => fits(place, goal).match);
    const radiusEndCount = allCandidates.length;
    
    diagnostics.radiusProgression.push({
      radius: radius,
      radiusKm: radius/1000,
      startCount: radiusStartCount,
      endCount: radiusEndCount,
      newCandidates: radiusEndCount - radiusStartCount,
      goalMatches: goalMatchesInRadius.length
    });
    
    if (goalMatches.length >= minPerGoal) {
      console.log(`Found ${goalMatches.length} matches for ${goal} at ${radius/1000}km radius`);
          break;
    }
  }

  return { candidates: allCandidates, diagnostics };
}

// Enrich place with detailed information
async function enrichPlace(place: Place): Promise<Place> {
  // Check cache first
  const cachedPlace = await getCachedPlaceDetails(place.place_id);
  if (cachedPlace) {
    return {
      ...place,
      ...cachedPlace,
      photoUrls: place.photoUrls // Keep existing photoUrls if any
    };
  }

  const GOOGLE_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") || Deno.env.get("GOOGLE_MAPS_API_KEY");
  const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,geometry,types,rating,user_ratings_total,photos,editorial_summary,business_status,opening_hours,price_level,vicinity,formatted_address&key=${GOOGLE_KEY}`;
  
  try {
    const response = await fetch(detailsUrl);
    const data = await response.json();
    
    if (data.result) {
      const result = data.result;
      // Build multiple photo URLs if available
      const photoUrls: string[] = Array.isArray(result.photos)
        ? result.photos.slice(0, 6).map((ph: any) => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${ph.photo_reference}&key=${GOOGLE_KEY}`)
        : [];
      
      const enrichedPlace = {
        ...place,
        name: result.name || place.name,
        lat: result.geometry?.location?.lat || place.lat,
        lon: result.geometry?.location?.lng || place.lon,
        types: result.types || place.types,
        rating: result.rating || place.rating,
        user_ratings_total: result.user_ratings_total || place.user_ratings_total,
        photos: result.photos || place.photos,
        photoUrls,
        editorial_summary: result.editorial_summary?.overview || place.editorial_summary,
        business_status: result.business_status || place.business_status,
        opening_hours: result.opening_hours || place.opening_hours,
        price_level: result.price_level || place.price_level,
        vicinity: result.vicinity || place.vicinity,
        formatted_address: result.formatted_address || place.formatted_address
      };
      
      // Cache the enriched place details
      await cachePlaceDetails(enrichedPlace);
      
      return enrichedPlace;
    }
  } catch (error) {
    console.error(`Error enriching place ${place.place_id}:`, error);
  }
  
  return place;
}

// Feature extraction for AI scoring
function extractFeatures(place: Place, goal: string, originLat: number, originLng: number): any {
  const mapping = categoryMappings[goal];
  const textToSearch = `${place.name} ${place.editorial_summary || ''} ${place.vicinity || ''}`.toLowerCase();
  
  // Calculate distance
  const distanceMeters = Math.sqrt(
    Math.pow(place.lat - originLat, 2) + Math.pow(place.lon - originLng, 2)
  ) * 111000; // Convert to meters
  
  // Check for keyword hits
  const keywordHits: { [goal: string]: string[] } = {};
  const matchedKeywords: string[] = [];
  
  for (const keyword of mapping.keywords) {
    if (textToSearch.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
    }
  }
  keywordHits[goal] = matchedKeywords;
  
  // Check opening hours for late night
  const openLate = place.opening_hours?.weekday_text?.some((day: string) => 
    day.includes('01:') || day.includes('02:') || day.includes('03:')
  ) || false;
  
  // Detect chain/brand hints
  const chainHint = textToSearch.includes('mcdonald') || textToSearch.includes('starbucks') || 
                   textToSearch.includes('kfc') || textToSearch.includes('subway');
  
  const localBrandHint = !chainHint && (place.name?.length > 0);
  
  // Context bonuses
  const rooftopHint = textToSearch.includes('rooftop') || textToSearch.includes('sky') || 
                     textToSearch.includes('terrace') || textToSearch.includes('taras');
  
  const specialtyHint = textToSearch.includes('specialty') || textToSearch.includes('artisan') || 
                       textToSearch.includes('craft') || textToSearch.includes('handmade');
  
  const landmarkHint = textToSearch.includes('landmark') || textToSearch.includes('monument') || 
                      textToSearch.includes('historic') || textToSearch.includes('famous');
  
  const kidFriendly = textToSearch.includes('family') || textToSearch.includes('kids') || 
                     textToSearch.includes('children') || place.types?.includes('amusement_park');
  
  const queueRisk = textToSearch.includes('popular') || textToSearch.includes('busy') || 
                   textToSearch.includes('crowded') || (place.user_ratings_total || 0) > 1000;
  
  return {
    rating: place.rating || 0,
    reviews: place.user_ratings_total || 0,
    types: place.types || [],
    priceLevel: place.price_level,
    openLate,
    distanceMeters,
    editorialText: place.editorial_summary || '',
    name: place.name || '',
    keywordHits,
    rooftopHint,
    specialtyHint,
    landmarkHint,
    kidFriendly,
    queueRisk,
    chainHint,
    localBrandHint
  };
}

// Human-like coolness evaluator (compact, heuristic-LLM blend without external calls)
function evaluateCoolness(place: Place, goal: string, features: any): { fitScore: number, vibeScore: number, description: string } {
  const text = `${place.name || ''} ${features.editorialText || ''}`.toLowerCase();
  const types: string[] = Array.isArray(features.types) ? features.types : [];
  const kwHits: string[] = (features.keywordHits?.[goal] || []).map((k: string) => k.toLowerCase());

  // Fit score: based on allowed type + keyword hits
  let fitScore = 0;
  const mapping = categoryMappings[goal];
  const hasAllowedType = types.some((t: string) => mapping?.typesAllow?.includes(t));
  if (hasAllowedType) fitScore += 1;
  if (kwHits.length > 0) fitScore += Math.min(2, kwHits.length >= 2 ? 2 : 1);
  fitScore = Math.max(0, Math.min(3, fitScore));

  // Vibe score: language cues + uniqueness + rating context
  const positiveCues = [
    'rooftop','sky bar','speakeasy','panoramic','view','iconic','artisan','artisanal','craft',
    'signature','third wave','single-origin','single origin','historic','legendary','local beans',
    'micro roastery','hidden','cozy','intimate','scenic','terrace','lookout','belvedere'
  ];
  const negativeCues = [
    'tourist trap','souvenir','fast food','chain','hotel lobby','overpriced','crowded only'
  ];
  let vibeScore = 0;
  for (const cue of positiveCues) if (text.includes(cue)) vibeScore += 1;
  for (const cue of negativeCues) if (text.includes(cue)) vibeScore -= 1;
  if (features.chainHint) vibeScore -= 1;
  // Normalize and clamp 0..3
  if ((place.rating || 0) >= 4.6) vibeScore += 1;
  if ((place.user_ratings_total || 0) >= 500) vibeScore += 0.5;
  // Goal-specific boosts
  if (goal === 'Specialty coffee' && (text.includes('third wave') || text.includes('roastery'))) vibeScore += 1;
  if (goal === 'Bars' && (text.includes('rooftop') || text.includes('speakeasy'))) vibeScore += 1;
  if (goal === 'Viewpoints' && (text.includes('panoramic') || text.includes('terrace') || text.includes('view')))
    vibeScore += 1;
  vibeScore = Math.max(0, Math.min(3, Math.round(vibeScore * 2) / 2));

  // Short description based on strongest cue
  let desc = '';
  if (goal === 'Specialty coffee') {
    if (text.includes('roastery') || text.includes('roaster')) desc = 'hidden roastery with local beans';
    else if (text.includes('third wave')) desc = 'third-wave brew bar';
    else if (kwHits.length > 0) desc = 'specialty coffee spot';
  }
  if (!desc && goal === 'Bars') {
    if (text.includes('rooftop') || text.includes('sky')) desc = 'iconic rooftop bar';
    else if (text.includes('speakeasy')) desc = 'speakeasy vibe, craft cocktails';
  }
  if (!desc && goal === 'Viewpoints') {
    if (text.includes('panoramic') || text.includes('terrace')) desc = 'panoramic city views';
  }
  if (!desc) {
    desc = features.chainHint ? 'popular chain, less unique' : (vibeScore >= 2 ? 'local favorite, great vibe' : 'solid pick for this goal');
  }

  return { fitScore, vibeScore, description: desc };
}

// Heuristic scoring (fast, default)
function calculateHeuristicScore(features: any, goal: string): number {
  const { rating, reviews, keywordHits, types, rooftopHint, specialtyHint, landmarkHint, 
          chainHint, localBrandHint, distanceMeters } = features;
  
  // Base score from rating and reviews
  let coolScore = 2 * rating + 0.5 * Math.log(reviews + 1);
  
  // Goal-specific keyword hits
  const goalKeywordHit = keywordHits[goal]?.length > 0 ? 2 : 0;
  coolScore += goalKeywordHit;
  
  // Compatible types bonus
  const mapping = categoryMappings[goal];
  const compatibleType = types.some((type: string) => mapping.typesAllow.includes(type)) ? 1 : 0;
  coolScore += compatibleType;
  
  // Context bonuses based on goal
  let contextBonuses = 0;
  
  if (goal === 'Viewpoints') {
    if (rooftopHint || landmarkHint) contextBonuses += 2;
  } else if (goal === 'Specialty coffee') {
    if (specialtyHint) contextBonuses += 2;
  } else if (goal === 'Bars') {
    if (rooftopHint) contextBonuses += 2;
    if (specialtyHint) contextBonuses += 1; // Craft cocktails
  } else if (goal === 'Coworking') {
    if (specialtyHint) contextBonuses += 1; // Modern workspace
  } else if (goal === 'Bakery') {
    if (specialtyHint) contextBonuses += 2; // Artisan bakery
  }
  
  coolScore += contextBonuses;
  
  // Penalties
  const chainPenalty = chainHint && !goalKeywordHit ? 1 : 0;
  // Conflict penalties to avoid common misclassifications
  let conflictPenalty = 0;
  if (goal === 'Viewpoints') {
    if (types.includes('shopping_mall') || types.includes('department_store')) conflictPenalty += 2;
  }
  if (goal === 'Coworking') {
    if (types.includes('church') || types.includes('place_of_worship')) conflictPenalty += 2;
    if ((types.includes('cafe') || types.includes('restaurant')) && !(keywordHits[goal]?.length > 0)) conflictPenalty += 1.5;
  }
  const distanceKm = distanceMeters / 1000;
  // Specialty coffee: stronger distance penalty per brief
  const distancePenalty = goal === 'Specialty coffee'
    ? Math.min(distanceKm * 0.5, 2)
    : Math.min(distanceMeters / 10000, 1); // Mild default
  
  coolScore -= chainPenalty + distancePenalty + conflictPenalty;
  
  return Math.max(0, coolScore); // Ensure non-negative
}

// OSM/Overpass fallback
async function osmFallback(goal: string, lat: number, lng: number, radius: number): Promise<Place[]> {
  const mapping = categoryMappings[goal];
  if (!mapping?.osm) return [];

  const osmTags = mapping.osm.join('|');
  const overpassUrl = `https://overpass-api.de/api/interpreter`;
  
  const query = `
    [out:json][timeout:25];
    (
      node["${osmTags}"](around:${radius},${lat},${lng});
      way["${osmTags}"](around:${radius},${lat},${lng});
      relation["${osmTags}"](around:${radius},${lat},${lng});
    );
    out center;
  `;

  try {
    const response = await fetch(overpassUrl, {
      method: 'POST',
      body: query,
      headers: { 'Content-Type': 'text/plain' }
    });
    
    const data = await response.json();
    const places: Place[] = [];
    
    for (const element of data.elements || []) {
      const place: Place = {
        place_id: `osm_${element.id}`,
        name: element.tags?.name || `OSM ${goal}`,
        lat: element.lat || element.center?.lat,
        lon: element.lon || element.center?.lon,
        types: ['point_of_interest'],
        rating: 0,
        user_ratings_total: 0
      };
      
      if (place.lat && place.lon) {
        places.push(place);
      }
    }
    
    console.log(`OSM fallback found ${places.length} places for ${goal}`);
    return places;
      } catch (error) {
    console.error(`OSM fallback error for ${goal}:`, error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      location, 
      origin, 
      goals = [], 
      timeWindow = 180, 
      scenario = 'explore',
      strict = scenario === 'planning' ? false : true, // Less strict filtering for planning scenarios
      minPerGoal = scenario === 'planning' ? 3 : 2, // Ensure at least 3 places per goal for planning scenarios
      useLLMReRank = false,
      targetRaw = scenario === 'planning' ? 200 : 60, // More raw places for planning scenarios
      localeHint = 'en',
      debugMode = false,
      destinationType = 'none',
      destination,
      sessionId // Add sessionId for rate limiting
    } = await req.json();

    // Input validation
    if (!location || typeof location !== 'string' || location.length > 200 || location.length < 2) {
      throw new Error('Invalid location parameter: must be 2-200 characters');
    }

    // Validate safe characters for location
    const safePattern = /^[a-zA-Z0-9\s\-.,áéíóúàèìòùâêîôûãõñçüäöß]+$/;
    if (!safePattern.test(location)) {
      throw new Error('Location contains invalid characters');
    }

    // Validate goals array
    if (!Array.isArray(goals)) {
      throw new Error('Goals must be an array');
    }

    // Validate each goal string
    for (const goal of goals) {
      if (typeof goal !== 'string' || goal.length > 100) {
        throw new Error('Invalid goal: must be string with max 100 characters');
      }
    }

    // Validate timeWindow
    if (typeof timeWindow !== 'number' || timeWindow < 15 || timeWindow > 1440) {
      throw new Error('Invalid timeWindow: must be number between 15 and 1440 minutes');
    }

    // Validate scenario
    if (!['explore', 'planning', 'onsite'].includes(scenario)) {
      throw new Error('Invalid scenario: must be explore, planning, or onsite');
    }

    // Rate limiting check - TEMPORARILY DISABLED FOR TESTING
    // TODO: Re-enable rate limiting when ready for production
    if (false && sessionId) { // Changed to false to disable rate limiting
      try {
        const { data: rateLimitResult, error: rateLimitError } = await supabase
          .rpc('check_generation_limit', { p_session_id: sessionId });
        
        if (rateLimitError) {
          console.error('Rate limit check error:', rateLimitError);
        } else if (rateLimitResult && rateLimitResult.length > 0) {
          const { can_generate, attempts_used, attempts_remaining, reset_at } = rateLimitResult[0];
          
          if (!can_generate) {
            return new Response(JSON.stringify({
              success: false,
              error: 'RATE_LIMIT_EXCEEDED',
              message: 'You have reached the maximum number of route generations (3 per day).',
              attempts_used,
              attempts_remaining,
              reset_at,
              places: [],
              mapUrl: '',
              totalWalkingTime: 0,
              totalExploringTime: 0,
              totalTime: 0,
              requestedMinutes: timeWindow,
              computedMinutes: 0,
              source: 'rate_limited'
            }), {
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          
          console.log(`Rate limit check passed: ${attempts_used}/3 attempts used, ${attempts_remaining} remaining`);
        }
      } catch (error) {
        console.error('Rate limiting error:', error);
        // Continue without rate limiting if there's an error
      }
    }

    let lat = origin?.lat as number | undefined;
    let lng = origin?.lon as number | undefined;
    
    // If no origin coordinates provided, try geocoding the origin string first, then location
    if ((!lat || !lng)) {
      try {
        const GOOGLE_KEY_HANDLER = Deno.env.get("GOOGLE_PLACES_API_KEY") || Deno.env.get("GOOGLE_MAPS_API_KEY");
        if (GOOGLE_KEY_HANDLER) {
          // First try to geocode the origin (accommodation address)
          let queryToGeocode = '';
          if (typeof origin === 'string' && origin.trim().length > 0) {
            queryToGeocode = origin.trim();
          } else if (typeof location === 'string' && location.trim().length > 0) {
            // Strip "for X days" from location string for better geocoding
            queryToGeocode = location.trim().replace(/\s+for\s+\d+\s+days?$/i, '');
          }
          
          if (queryToGeocode) {
            const query = encodeURIComponent(queryToGeocode);
            const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&language=en&key=${GOOGLE_KEY_HANDLER}`;
            const resp = await fetch(url);
            if (resp.ok) {
              const data = await resp.json();
              if (Array.isArray(data.results) && data.results.length > 0 && data.results[0]?.geometry?.location) {
                lat = data.results[0].geometry.location.lat;
                lng = data.results[0].geometry.location.lng;
                console.log(`Geocoded "${queryToGeocode}" -> ${lat}, ${lng}`);
              }
            }
          }
        }
      } catch (_err) {
        // non-fatal; will fall back to default
      }
    }

    // Final fallback to Warsaw if still missing
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      console.log(`Geocoding failed, falling back to Warsaw coordinates`);
      lat = 52.2297;
      lng = 21.0122;
    } else {
      console.log(`Using coordinates: ${lat}, ${lng}`);
    }
    // Parse destination coordinates if provided ("lat,lon" or object)
    let destCoords: { lat: number; lon: number } | null = null;
    if (typeof destination === 'string') {
      const m = destination.trim().match(/(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)/);
      if (m) {
        const dlat = parseFloat(m[1]);
        const dlon = parseFloat(m[2]);
        if (!Number.isNaN(dlat) && !Number.isNaN(dlon)) destCoords = { lat: dlat, lon: dlon };
      }
    } else if (destination && typeof destination === 'object' && typeof destination.lat === 'number' && typeof destination.lon === 'number') {
      destCoords = { lat: destination.lat, lon: destination.lon };
    }
    const locale = localeHint === 'pl' ? 'pl' : 'en';

    // Normalize goal names against categoryMappings (handle accents/case)
    const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const mappingKeys = Object.keys(categoryMappings);
    const normToKey: Record<string, string> = {};
    for (const k of mappingKeys) normToKey[normalize(k)] = k;
    const goalsNormalized: string[] = (goals || []).map((g: string) => {
      const nk = normToKey[normalize(g)] || g;
      return nk;
    });

    console.log(`Processing request for ${goalsNormalized.join(', ')} at ${lat}, ${lng}`);

    const debug: DebugInfo = {
      perGoal: {},
      radiusProgression: [],
      sourcesUsed: []
    };

    const googleDiagnostics: any = {};
    const insufficientCategories: InsufficientCategory[] = [];
    const buckets: Record<string, Place[]> = {};
    const allCandidates: Place[] = [];
    const seenPlaceIds = new Set<string>();

    // Collect candidates for each goal
    for (const goal of goalsNormalized) {
      console.log(`\n=== Collecting candidates for ${goal} ===`);
      
      // Google Places collection with diagnostics
      const { candidates: googleCandidates, diagnostics } = await collectCandidatesForGoal(goal, lat, lng, locale, minPerGoal, targetRaw, debugMode);
      
      if (debugMode) {
        googleDiagnostics[goal] = diagnostics;
      }
      
      // Add to all candidates (dedupe)
      for (const candidate of googleCandidates) {
        if (!seenPlaceIds.has(candidate.place_id)) {
          allCandidates.push(candidate);
          seenPlaceIds.add(candidate.place_id);
        }
      }

      debug.sourcesUsed.push('google');
      
      // Filter to goal-compliant candidates
      const goalMatches = googleCandidates.filter(place => fits(place, goal).match);
      
      debug.perGoal[goal] = {
        raw: googleCandidates.length,
        afterMatch: goalMatches.length,
        seeded: 0,
        extras: 0,
        top5: [],
        dropped: googleCandidates
          .filter(place => !fits(place, goal).match)
          .map(place => ({
          name: place.name,
            reason: 'Does not match goal criteria',
            types: place.types,
            keywordsHit: []
          }))
      };

      // OSM fallback if insufficient
      if (goalMatches.length < minPerGoal) {
        console.log(`${goal}: Only ${goalMatches.length} Google matches, trying OSM fallback`);
        
        for (const radius of [5000, 10000, 20000]) {
          const osmCandidates = await osmFallback(goal, lat, lng, radius);
          
          for (const candidate of osmCandidates) {
            if (!seenPlaceIds.has(candidate.place_id)) {
              allCandidates.push(candidate);
              seenPlaceIds.add(candidate.place_id);
            }
          }
          
          const osmMatches = osmCandidates.filter(place => fits(place, goal).match);
          goalMatches.push(...osmMatches);
          
          if (goalMatches.length >= minPerGoal) {
            debug.sourcesUsed.push('osm');
            break;
          }
        }
      }

      // Update bucket stats
      debug.perGoal[goal].afterMatch = goalMatches.length;
      
      if (goalMatches.length < minPerGoal) {
        insufficientCategories.push({
          goal,
          have: goalMatches.length,
          need: minPerGoal,
          nextStep: 'Consider expanding search area or using seed data'
        });
      }

      buckets[goal] = goalMatches;
    }

    // Enrich only top candidates to reduce API calls
    console.log(`\n=== Enriching top ${Math.min(allCandidates.length, 50)} candidates ===`);
    
    // Sort candidates by potential score before enrichment
    const sortedCandidates = allCandidates
      .map(place => ({
        place,
        score: (place.rating || 4.0) * 0.5 + Math.log((place.user_ratings_total || 10) + 1) * 0.3
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 50) // Only enrich top 50 candidates
      .map(item => item.place);
    
    const enrichedCandidates = await Promise.all(
      sortedCandidates.map(place => enrichPlace(place))
    );
    
    // Add unenriched candidates back (they'll be enriched later if needed)
    const enrichedPlaceIds = new Set(enrichedCandidates.map(p => p.place_id));
    const unenrichedCandidates = allCandidates.filter(p => !enrichedPlaceIds.has(p.place_id));
    
    const uniqueCandidates = deduplicateCandidates([...enrichedCandidates, ...unenrichedCandidates]);

    // Build final itinerary with seeding
    console.log(`\n=== Building final itinerary ===`);
    const seeded: Place[] = [];
    const extras: Place[] = [];
    const usedPlaceIds = new Set<string>();
    
    // Helper function to add place if not already used
    const addUniquePlace = (place: Place, source: string) => {
      if (usedPlaceIds.has(place.place_id)) {
        console.log(`Skipping duplicate ${source} place: ${place.name} (${place.place_id})`);
        return false;
      }
      usedPlaceIds.add(place.place_id);
      console.log(`Adding ${source} place: ${place.name} (${place.place_id})`);
      return true;
    };

    // Seed minPerGoal from each bucket (force min 2 for Specialty coffee) with uniqueness across goals
    for (const goal of goalsNormalized) {
      const requiredMin = goal === 'Specialty coffee' ? Math.max(minPerGoal, 2) : Math.max(minPerGoal, scenario === 'planning' ? 3 : 1);
      const bucket = buckets[goal] || [];
      const ranked = bucket
        .map(place => {
          const features = extractFeatures(place, goal, lat, lng);
          const ai = evaluateCoolness(place, goal, features);
          const keywordHit = (features.keywordHits?.[goal] || []).length > 0 ? 1 : 0;
          const base = 2 * (place.rating || 0) + 0.5 * Math.log((place.user_ratings_total || 0) + 1);
          const distanceMeters = features.distanceMeters || 0;
          const distanceKm = distanceMeters / 1000;
          const chainPenalty = features.chainHint ? 0.8 : 0;
          const distancePenalty = 0.5 * Math.min(distanceKm, 4);
          const coolScore = base + 1.5 * (ai.fitScore + ai.vibeScore) + 2 * keywordHit - chainPenalty - distancePenalty;
          return { place: { ...place, coolScore, fitScore: ai.fitScore, vibeScore: ai.vibeScore, aiReason: ai.description }, score: coolScore, vibe: ai.vibeScore };
        })
        .sort((a, b) => b.score === a.score ? (b.vibe - a.vibe) : (b.score - a.score));

      let pickedForGoal = 0;
      for (const { place } of ranked) {
        if (!usedPlaceIds.has(place.place_id)) {
          seeded.push(place);
          usedPlaceIds.add(place.place_id);
          pickedForGoal += 1;
        }
        if (pickedForGoal >= requiredMin) break;
      }

      debug.perGoal[goal].seeded = pickedForGoal;
      // Add top5 for debugging from the ranked list
      debug.perGoal[goal].top5 = ranked.slice(0, 5).map(({ place, score }) => ({
      name: place.name,
        coolScore: score,
        keywordHits: extractFeatures(place, goal, lat, lng).keywordHits[goal] || [],
        types: place.types
      }));
    }

    // Deduplicate seeded places to prevent same place from multiple goals
    const uniqueSeeded = seeded.filter((place, index, self) => 
      index === self.findIndex(p => {
        if (place.place_id && p.place_id) {
          return place.place_id === p.place_id;
        }
        return place.name === p.name && 
               Math.abs(place.lat - p.lat) < 0.0001 && 
               Math.abs(place.lon - p.lon) < 0.0001;
      })
    );
    
    console.log(`Deduplicated seeded: ${seeded.length} -> ${uniqueSeeded.length} places`);

    // Add extras from leftovers
    const leftoverPlaces = uniqueCandidates.filter(place => !usedPlaceIds.has(place.place_id));
    const sortedLeftovers = leftoverPlaces
      .map(place => ({
        place,
        maxScore: Math.max(...goals.map(goal => {
          const features = extractFeatures(place, goal, lat, lng);
          return calculateHeuristicScore(features, goal);
        }))
      }))
      .sort((a, b) => b.maxScore - a.maxScore);

    // Guarantee at least 1 per goal by backfilling from each goal's bucket if missing
    for (const goal of goals) {
      const hasSeededForGoal = seeded.some(p => (buckets[goal] || []).some(bp => bp.place_id === p.place_id));
      if (!hasSeededForGoal) {
        const bucket = buckets[goal] || [];
        // Re-rank quickly to find the best unused candidate
        const rankedMissing = bucket
          .map(place => {
            const features = extractFeatures(place, goal, lat, lng);
            const ai = evaluateCoolness(place, goal, features);
            const keywordHit = (features.keywordHits?.[goal] || []).length > 0 ? 1 : 0;
            const base = 2 * (place.rating || 0) + 0.5 * Math.log((place.user_ratings_total || 0) + 1);
            const distanceKm = (features.distanceMeters || 0) / 1000;
            const chainPenalty = features.chainHint ? 0.8 : 0;
            const distancePenalty = 0.5 * Math.min(distanceKm, 4);
            const coolScore = base + 1.5 * (ai.fitScore + ai.vibeScore) + 2 * keywordHit - chainPenalty - distancePenalty;
            return { place, score: coolScore };
          })
          .sort((a, b) => b.score - a.score);

        for (const { place } of rankedMissing) {
          if (!usedPlaceIds.has(place.place_id)) {
            seeded.push(place);
            usedPlaceIds.add(place.place_id);
            debug.perGoal[goal].seeded = (debug.perGoal[goal].seeded || 0) + 1;
            break;
          }
        }
      }
    }

    for (const { place } of sortedLeftovers) {
      // In strict mode, only include if matches at least one goal
      if (strict) {
        const matchesAnyGoal = goals.some(goal => fits(place, goal).match);
        if (!matchesAnyGoal) continue;
      }
      
      extras.push(place);
    }

    // Update debug stats
    for (const goal of goals) {
      debug.perGoal[goal].extras = extras.filter(place => fits(place, goal).match).length;
    }

    // Constants for route limits
    const HARD_MAX_STOPS = scenario === 'planning' ? 70 : 20; // More places for planning scenarios (up to 10 days × 7 places)
    const MAX_TOTAL_MINUTES = 1440; // 24 hours
    const MAX_PLACES_COUNT = scenario === 'planning' ? 70 : 40; // Allow more places for planning scenarios

    // Visit duration defaults by goal (in minutes)
    const visitDurationsByGoal: Record<string, number> = {
      'Bakery': 10,
      'Specialty coffee': 20,
      'Bars': 50,
      'Restaurants': 75,
      'Parks': 25,
      'Viewpoints': 25,
      'Museums': 90,
      'Coworking': 15,
      'Architectural landmarks': 30
    };

    const toRad = (x: number) => x * Math.PI / 180;
    const haversineKm = (a: { lat: number, lon: number }, b: { lat: number, lon: number }) => {
      const R = 6371;
      const dLat = toRad(b.lat - a.lat);
      const dLon = toRad(b.lon - a.lon);
      const la1 = toRad(a.lat);
      const la2 = toRad(b.lat);
      const x = Math.sin(dLat/2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon/2) ** 2;
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
    };

    const crossesRiverPenalty = (a: { lat: number, lon: number }, b: { lat: number, lon: number }) => {
      // Simple heuristic: large longitudinal change suggests crossing a river in many cities
      return Math.abs((b.lon - a.lon)) > 0.02 ? 3 : 0; // minutes
    };

    const walkMinutes = (a: { lat: number, lon: number }, b: { lat: number, lon: number }) => {
      const km = haversineKm(a, b);
      const baseMinutes = km * 12; // ~12 min per km conservative
      return Math.round(baseMinutes + crossesRiverPenalty(a, b));
    };

    // Trim route to fit within time budget
    const trimToBudget = (places: Place[], walkMinBetween: number, isRoundtrip: boolean, requestedMinutes: number): Place[] => {
      if (places.length === 0) return places;
      
      let totalMinutes = 0;
      const trimmed: Place[] = [];
      
      for (let i = 0; i < places.length; i++) {
        const place = places[i];
        const dwellMin = getDwell(place);
        
        // Calculate walking time to this place
        let walkMin = 0;
        if (i === 0) {
          // First place: walk from origin
          walkMin = walkMinutes({ lat, lon: lng }, { lat: place.lat, lon: place.lon });
        } else {
          // Subsequent places: walk from previous place
          walkMin = walkMinutes({ lat: places[i-1].lat, lon: places[i-1].lon }, { lat: place.lat, lon: place.lon });
        }
        
        // Check if adding this place would exceed budget
        const newTotal = totalMinutes + walkMin + dwellMin;
        if (newTotal > requestedMinutes) {
          console.log(`Trimming at place ${i+1} (${place.name}): would exceed budget (${newTotal} > ${requestedMinutes})`);
          break;
        }
        
        totalMinutes = newTotal;
        trimmed.push(place);
      }
      
      // Add return walk for roundtrip
      if (isRoundtrip && trimmed.length > 0) {
        const lastPlace = trimmed[trimmed.length - 1];
        const returnWalkMin = walkMinutes({ lat: lastPlace.lat, lon: lastPlace.lon }, { lat, lon: lng });
        if (totalMinutes + returnWalkMin > requestedMinutes) {
          console.log(`Removing last place for roundtrip return walk`);
          trimmed.pop();
        }
      }
      
      console.log(`Trimmed route: ${places.length} -> ${trimmed.length} places, ${totalMinutes} minutes`);
      return trimmed;
    };

    const getPlaceGoal = (p: Place): string => {
      for (const g of goals) {
        if (buckets[g]?.some(bp => bp.place_id === p.place_id)) return g;
      }
      const match = goals.find(g => fits(p, g).match);
      return match || 'attraction';
    };

    const getDwell = (p: Place): number => {
      const g = getPlaceGoal(p);
      return visitDurationsByGoal[g] ?? 30;
    };

    // Improved route optimization with smart nearest-neighbor and quality scoring (canonical-aware)
    const optimizeRoute = (places: Place[], start: { lat: number, lon: number }, destinationType: string, destination?: { lat: number, lon: number }) => {
      if (places.length === 0) return [];
      if (places.length === 1) return places;

      console.log(`=== ROUTE OPTIMIZATION ===`);
      console.log(`Optimizing ${places.length} places from origin (${start.lat}, ${start.lon})`);
      
      // First deduplicate by canonical id
      const uniquePlaces = deduplicateCandidates(places);
      
      console.log(`After deduplication: ${uniquePlaces.length} unique places`);
      
      // Use improved nearest-neighbor with quality scoring
      const pool = [...uniquePlaces];
      const result: Place[] = [];
      let current = { ...start };
      
      while (pool.length > 0) {
        let bestIndex = 0;
        let bestScore = -Infinity;
        
        for (let i = 0; i < pool.length; i++) {
          const place = pool[i];
          const distance = haversineKm(current, { lat: place.lat, lon: place.lon });
          
          // Multi-factor scoring: distance penalty + quality bonus
          const distanceScore = -distance * 1.5; // Distance penalty
          const qualityScore = (place.rating || 4.0) * 0.3; // Quality bonus
          const reviewScore = Math.log((place.user_ratings_total || 10) + 1) * 0.2; // Review bonus
          
          const totalScore = distanceScore + qualityScore + reviewScore;
          
          if (totalScore > bestScore) {
            bestScore = totalScore;
            bestIndex = i;
          }
        }
        
        const selected = pool.splice(bestIndex, 1)[0];
        result.push(selected);
        current = { lat: selected.lat, lon: selected.lon };
      }
      
      console.log(`Final route has ${result.length} places`);
      return result;
    };

    // Apply hard cap before optimization
    const cappedSeeded = uniqueSeeded.slice(0, HARD_MAX_STOPS);
    console.log(`Applied HARD_MAX_STOPS cap: ${uniqueSeeded.length} -> ${cappedSeeded.length} places`);

    const orderedSeeded = optimizeRoute(cappedSeeded, { lat, lon: lng }, destinationType, destCoords);
    
    // Deduplicate orderedSeeded to prevent duplicates in route building
    const uniqueOrderedSeeded = orderedSeeded.filter((place, index, self) => 
      index === self.findIndex(p => {
        if (place.place_id && p.place_id) {
          return place.place_id === p.place_id;
        }
        return place.name === p.name && 
               Math.abs(place.lat - p.lat) < 0.0001 && 
               Math.abs(place.lon - p.lon) < 0.0001;
      })
    );
    
    console.log(`Deduplicated orderedSeeded: ${orderedSeeded.length} -> ${uniqueOrderedSeeded.length} places`);

    // Use trimToBudget for final route selection
    const isRoundtrip = destinationType === 'circle';
    const requestedMinutes = timeWindow; // Keep original logic for both scenarios
    
    console.log(`Trimming route to ${requestedMinutes} minutes (roundtrip: ${isRoundtrip}, scenario: ${scenario})`);
    
    let route: Place[];
    if (scenario === 'planning') {
      // For planning, just take the first N places without time constraints
      const placesNeeded = timeWindow * 7; // 7 places per day
      route = uniqueOrderedSeeded.slice(0, placesNeeded);
      console.log(`Planning scenario: taking first ${route.length} places without time constraints`);
    } else {
      // For onsite, use time-based trimming
      route = trimToBudget(uniqueOrderedSeeded, 0, isRoundtrip, requestedMinutes);
    }

    // Calculate final time totals in minutes
    let totalWalkMin = 0;
    let totalDwellMin = 0;
    
    for (let i = 0; i < route.length; i++) {
      const place = route[i];
      const dwellMin = getDwell(place);
      totalDwellMin += dwellMin;
      
      if (i === 0) {
        // First place: walk from origin
        totalWalkMin += walkMinutes({ lat, lon: lng }, { lat: place.lat, lon: place.lon });
    } else {
        // Subsequent places: walk from previous place
        totalWalkMin += walkMinutes({ lat: route[i-1].lat, lon: route[i-1].lon }, { lat: place.lat, lon: place.lon });
      }
    }
    
    // Add return walk for roundtrip
    if (isRoundtrip && route.length > 0) {
      const lastPlace = route[route.length - 1];
      totalWalkMin += walkMinutes({ lat: lastPlace.lat, lon: lastPlace.lon }, { lat, lon: lng });
    }
    
    const totalMin = totalWalkMin + totalDwellMin;
    
    // Sanity checks
    if (totalMin > MAX_TOTAL_MINUTES) {
      console.warn(`SANITY CHECK FAILED: Total time ${totalMin} minutes exceeds ${MAX_TOTAL_MINUTES} minutes`);
    }
    if (route.length > MAX_PLACES_COUNT) {
      console.warn(`SANITY CHECK FAILED: Route has ${route.length} places, exceeds ${MAX_PLACES_COUNT}`);
    }
    
    console.log(`Final route: ${route.length} places, ${totalWalkMin}min walking, ${totalDwellMin}min exploring, ${totalMin}min total`);

    // Simple multi-day splitting for planning scenario
    let finalPlaces: (Place & { day?: number })[] = route;
    let daysPlanned = 1;
    
    if (scenario === 'planning' && timeWindow > 1) {
      const plannedDays = timeWindow; // timeWindow is the number of days for planning
      const placesPerDay = 7; // Fixed: exactly 7 places per day
      
      console.log(`Planning scenario: generating ${plannedDays * placesPerDay} places across ${plannedDays} days (${placesPerDay} per day)`);
      
      // Generate more places to ensure we have enough for 7 per day
      const totalPlacesNeeded = plannedDays * placesPerDay;
      
      // If we don't have enough places, we need to generate more
      if (route.length < totalPlacesNeeded) {
        console.log(`Not enough places (${route.length}), need ${totalPlacesNeeded}. Generating more...`);
        
        // Use a larger time budget to get more places
        const extendedMinutes = totalPlacesNeeded * 60; // 60 minutes per place
        const extendedRoute = trimToBudget(uniqueOrderedSeeded, 0, isRoundtrip, extendedMinutes);
        
        // Use the extended route if it has more places
        if (extendedRoute.length > route.length) {
          finalPlaces = extendedRoute.map((place, index) => {
            const day = Math.floor(index / placesPerDay) + 1;
            return { ...place, day: Math.min(day, plannedDays) };
          });
        } else {
          // Fallback: distribute existing places
          finalPlaces = route.map((place, index) => {
            const day = Math.floor(index / placesPerDay) + 1;
            return { ...place, day: Math.min(day, plannedDays) };
          });
          }
        } else {
        // We have enough places, distribute them evenly
        finalPlaces = route.slice(0, totalPlacesNeeded).map((place, index) => {
          const day = Math.floor(index / placesPerDay) + 1;
          return { ...place, day };
        });
      }
      
      daysPlanned = plannedDays;
    }

    // Collapse consecutive duplicates before any per-day or onsite tweaks
    finalPlaces = collapseConsecutiveDuplicates(finalPlaces);

    // Move Bars to the end of the route for both onsite and planning scenarios
    if (finalPlaces.length > 0) {
      const withGoal = finalPlaces.map((p) => {
        const goal = goals.find(g => buckets[g]?.some(bp => bp.place_id === p.place_id)) || goals.find(g => fits(p, g).match) || 'attraction';
        return { p, goal };
      });
      const bars = withGoal.filter(x => x.goal === 'Bars').map(x => x.p);
      const nonBars = withGoal.filter(x => x.goal !== 'Bars').map(x => x.p);
      finalPlaces = [...nonBars, ...bars];
    }

    // Generate map URL and per-leg debug
    let mapUrl = '';
    const perLeg: any[] = [];
    if (finalPlaces.length > 0) {
      let cur = { lat, lon: lng };
      for (let i = 0; i < finalPlaces.length; i++) {
        const p = finalPlaces[i];
        const w = Math.round((() => {
          const R = 6371;
          const toRad = (x: number) => x * Math.PI / 180;
          const dLat = toRad(p.lat - cur.lat);
          const dLon = toRad(p.lon - cur.lon);
          const la1 = toRad(cur.lat);
          const la2 = toRad(p.lat);
          const x = Math.sin(dLat/2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon/2) ** 2;
          const km = 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
          return km * 12 + (Math.abs(p.lon - cur.lon) > 0.02 ? 3 : 0);
        })());
        const g = goals.find(g => buckets[g]?.some(bp => bp.place_id === p.place_id)) || goals.find(g => fits(p, g).match) || 'attraction';
        const d = visitDurationsByGoal[g] ?? 30;
        perLeg.push({ from: i === 0 ? 'origin' : finalPlaces[i-1].name, to: p.name, walk: w, dwell: d });
        cur = { lat: p.lat, lon: p.lon };
      }
      // Append final leg per destination choice
      if (destinationType === 'circle') {
        const last = finalPlaces[finalPlaces.length - 1];
        const R = 6371; const toRad = (x: number) => x * Math.PI / 180;
        const dLat = toRad(lat - last.lat); const dLon = toRad(lng - last.lon);
        const la1 = toRad(last.lat); const la2 = toRad(lat);
        const x = Math.sin(dLat/2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon/2) ** 2;
        const km = 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
        const w = Math.round(km * 12 + (Math.abs(lng - last.lon) > 0.02 ? 3 : 0));
        perLeg.push({ from: last.name, to: 'origin', walk: w, dwell: 0 });
      } else if (destinationType === 'specific' && destCoords) {
        const last = finalPlaces[finalPlaces.length - 1];
        const R = 6371; const toRad = (x: number) => x * Math.PI / 180;
        const dLat = toRad(destCoords.lat - last.lat); const dLon = toRad(destCoords.lon - last.lon);
        const la1 = toRad(last.lat); const la2 = toRad(destCoords.lat);
        const x = Math.sin(dLat/2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon/2) ** 2;
        const km = 2 * R * Math.asin(Math.min(1, Math.sqrt(x)));
        const w = Math.round(km * 12 + (Math.abs(destCoords.lon - last.lon) > 0.02 ? 3 : 0));
        perLeg.push({ from: last.name, to: 'destination', walk: w, dwell: 0 });
      }
      const totalWalkDebug = perLeg.reduce((s, l) => s + l.walk, 0);
      const totalDwellDebug = perLeg.reduce((s, l) => s + l.dwell, 0);
      if (finalPlaces.length > 0) {
        let destinationParam = '';
        if (destinationType === 'circle') destinationParam = `${lat},${lng}`;
        else if (destinationType === 'specific' && destCoords) destinationParam = `${destCoords.lat},${destCoords.lon}`;
        else destinationParam = `${finalPlaces[finalPlaces.length-1].lat},${finalPlaces[finalPlaces.length-1].lon}`;
        const waypoints = finalPlaces.length > 2 ? finalPlaces.slice(1, -1).map(p => `${p.lat},${p.lon}`).join('|') : '';
        mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${destinationParam}${waypoints ? `&waypoints=${waypoints}` : ''}&travelmode=walking`;
      }
      debug.totalWalkingTime = totalWalkMin;
      debug.timeTotals = { walk: totalWalkMin, dwell: totalDwellMin, all: totalMin };
      debug.perLeg = perLeg;
      debug.timeWindowMinutes = requestedMinutes;
      debug.requestedMinutes = requestedMinutes;
      debug.computedMinutes = totalMin;
      debug.destination = { type: destinationType, raw: destination, destCoords };
    }

    // Final deduplication before response mapping - handle null place_id
    const uniqueFinalPlaces = finalPlaces.filter((place, index, self) => 
      index === self.findIndex(p => {
        // Use place_id if available, otherwise use name + coordinates
        if (place.place_id && p.place_id) {
          return place.place_id === p.place_id;
        }
        // Fallback to name + coordinates for places without place_id
        return place.name === p.name && 
               Math.abs(place.lat - p.lat) < 0.0001 && 
               Math.abs(place.lon - p.lon) < 0.0001;
      })
    );
    
    console.log(`Final deduplication: ${finalPlaces.length} -> ${uniqueFinalPlaces.length} places`);
    
    // Format response
    const aiEvaluation: any[] = [];
    const responsePlaces = uniqueFinalPlaces.map(place => {
      // Find the primary goal this place matches by checking which bucket it came from
      let primaryGoal = 'attraction';
      
      // Check which bucket this place belongs to (prioritize seeded places)
      for (const goal of goalsNormalized) {
        if (buckets[goal] && buckets[goal].some(bucketPlace => bucketPlace.place_id === place.place_id)) {
          primaryGoal = goal;
          break;
        }
      }
      
      // Fallback: find first matching goal
      if (primaryGoal === 'attraction') {
        primaryGoal = goalsNormalized.find(goal => fits(place, goal).match) || 'attraction';
      }
      
      // Attach last known AI evaluation if present in seeding stage
      const features = extractFeatures(place, primaryGoal, lat, lng);
      const ai = evaluateCoolness(place, primaryGoal, features);
      const keywordHit = (features.keywordHits?.[primaryGoal] || []).length > 0 ? 1 : 0;
      const base = 2 * (place.rating || 0) + 0.5 * Math.log((place.user_ratings_total || 0) + 1);
      const distanceMeters = features.distanceMeters || 0;
      const distanceKm = distanceMeters / 1000;
      const chainPenalty = features.chainHint ? 0.8 : 0;
      const distancePenalty = 0.5 * Math.min(distanceKm, 4);
      const combinedCool = base + 1.5 * (ai.fitScore + ai.vibeScore) + 2 * keywordHit - chainPenalty - distancePenalty;
      aiEvaluation.push({ name: place.name, goal: primaryGoal, fitScore: ai.fitScore, vibeScore: ai.vibeScore, description: ai.description, coolScore: combinedCool });

      return {
        name: place.name,
        lat: place.lat,
        lon: place.lon,
        type: 'attraction',
        day: (place as any).day,
        webUrl: `https://maps.google.com/?cid=${place.place_id}`,
        photoUrl: place.photos?.[0] ? 
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${place.photos[0].photo_reference}&key=${Deno.env.get("GOOGLE_PLACES_API_KEY") || Deno.env.get("GOOGLE_MAPS_API_KEY")}` : 
          null,
        photoUrls: (place as any).photoUrls || [],
        reason: `${primaryGoal} - 30 min visit`,
        address: place.formatted_address || place.vicinity || place.name,
        walkingTime: 5,
        visitDuration: 30,
        description: place.editorial_summary || `${place.name} is a notable location in the area.`,
        openingHours: place.opening_hours?.weekday_text && place.opening_hours.weekday_text.length > 0 && !place.opening_hours.weekday_text[0].includes('Hours vary') 
          ? place.opening_hours.weekday_text 
          : place.opening_hours?.open_now !== undefined 
            ? [`Currently ${place.opening_hours.open_now ? 'Open' : 'Closed'}`]
            : ['Check website for hours'],
        ticketPrice: place.price_level ? `$${place.price_level}` : 'Check for entrance fees',
        website: place.formatted_address ? `https://maps.google.com/?cid=${place.place_id}` : null,
        walkingTimeFromPrevious: 10,
        goalMatched: primaryGoal, // Single primary goal instead of array
        types: place.types,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        coolScore: place.coolScore || combinedCool,
        fitScore: (place as any).fitScore ?? ai.fitScore,
        vibeScore: (place as any).vibeScore ?? ai.vibeScore,
        aiReason: (place as any).aiReason ?? ai.description
      };
    });

    return new Response(
      JSON.stringify({ 
        success: responsePlaces.length > 0,
        places: responsePlaces,
        mapUrl,
        totalWalkingTime: totalWalkMin,
        totalExploringTime: totalDwellMin,
        totalTime: totalMin,
        requestedMinutes: requestedMinutes,
        computedMinutes: totalMin,
        source: 'google_places_with_bucket_coverage_v2',
        insufficientCategories: insufficientCategories.length > 0 ? insufficientCategories : undefined,
        debug: {
          ...debug,
          google: debugMode ? googleDiagnostics : undefined,
          aiEvaluation,
          candidatesCollected: allCandidates.length,
          candidatesEnriched: enrichedCandidates.length,
          finalStopsReturned: responsePlaces.length,
          timeAvailableMinutes: requestedMinutes,
          location: { lat, lng },
          goals: goalsNormalized,
          timeWindow,
          strict,
          minPerGoal,
          coverageOK: insufficientCategories.length === 0,
          sourcesUsed: debug.sourcesUsed
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('TripAdvisor photos function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        places: [],
        debug: { error: error.message }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});