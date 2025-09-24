import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LLMPlace {
  name: string;
  address?: string;
  description?: string;
  walkingTime?: number;
  lat?: number;
  lon?: number;
  rating?: number;
  photoUrl?: string;
}

interface RouteData {
  routeName: string;
  location: string;
  scenario: string;
  days: number;
  goals: string[];
  places: LLMPlace[];
  totalWalkingTime: number;
  mapUrl?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { routeData }: { routeData: RouteData } = await req.json();

    // Generate HTML content for PDF
    const htmlContent = generateRouteHTML(routeData);

    // Generate PDF content
    const pdfContent = await generatePDF(htmlContent);

    return new Response(pdfContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="${routeData.routeName.replace(/[^a-zA-Z0-9]/g, '_')}.html"`,
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate PDF' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function generateRouteHTML(routeData: RouteData): string {
  const { routeName, location, scenario, days, goals, places, totalWalkingTime, mapUrl } = routeData;

  // Group places by days if it's a planning scenario
  let groupedPlaces: { day: number; places: LLMPlace[] }[] = [];
  
  if (scenario === 'planning' && days > 1) {
    const placesPerDay = Math.ceil(places.length / days);
    for (let day = 0; day < days; day++) {
      const startIndex = day * placesPerDay;
      const endIndex = Math.min(startIndex + placesPerDay, places.length);
      const dayPlaces = places.slice(startIndex, endIndex);
      if (dayPlaces.length > 0) {
        groupedPlaces.push({ day: day + 1, places: dayPlaces });
      }
    }
  } else {
    groupedPlaces = [{ day: 1, places }];
  }

  const goalsText = goals.length > 0 ? goals.join(', ') : 'General route';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${routeName}</title>
      <style>
        body {
          font-family: 'Arial', sans-serif;
          margin: 20px;
          padding: 0;
          color: #333;
          line-height: 1.6;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #3b82f6;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #1e40af;
          font-size: 24px;
          margin: 0;
        }
        .header p {
          color: #6b7280;
          margin: 5px 0;
        }
        .day-section {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        .day-title {
          background: #3b82f6;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 20px;
        }
        .place {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 15px;
          background: #f9fafb;
          display: flex;
          gap: 15px;
          align-items: flex-start;
        }
        .place-image {
          width: 120px;
          height: 80px;
          object-fit: cover;
          border-radius: 6px;
          flex-shrink: 0;
        }
        .place-content {
          flex: 1;
        }
        .place-name {
          font-size: 16px;
          font-weight: bold;
          color: #1e40af;
          margin-bottom: 5px;
        }
        .place-address {
          color: #6b7280;
          font-size: 14px;
          margin-bottom: 10px;
        }
        .place-description {
          margin-bottom: 10px;
          text-align: justify;
        }
        .place-details {
          display: flex;
          gap: 15px;
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 10px;
        }
        .place-link {
          color: #3b82f6;
          text-decoration: none;
          font-size: 12px;
        }
        .place-link:hover {
          text-decoration: underline;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #6b7280;
          font-size: 12px;
        }
        .map-link {
          background: #10b981;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 6px;
          display: inline-block;
          margin: 20px 0;
        }
        @page {
          margin: 20mm;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${routeName}</h1>
        <p><strong>Location:</strong> ${location}</p>
        <p><strong>Type:</strong> ${scenario === 'planning' ? 'Trip Planning' : 'On-site Route'}</p>
        <p><strong>Categories:</strong> ${goalsText}</p>
        <p><strong>Total Walking Time:</strong> ${totalWalkingTime} min</p>
        ${mapUrl ? `<a href="${mapUrl}" class="map-link">Open full route in Google Maps</a>` : ''}
      </div>

      ${groupedPlaces.map(group => `
        <div class="day-section">
          <div class="day-title">
            ${scenario === 'planning' && days > 1 ? `Day ${group.day}` : 'Route'}
          </div>
          
          ${group.places.map((place, index) => {
            const googleMapsLink = place.lat && place.lon 
              ? `https://www.google.com/maps/place/${place.lat},${place.lon}`
              : `https://www.google.com/maps/search/${encodeURIComponent(place.name + ' ' + place.address)}`;
            
            return `
            <div class="place">
              ${place.photoUrl ? `<img src="${place.photoUrl}" alt="${place.name}" class="place-image" />` : ''}
              <div class="place-content">
                <div class="place-name">${index + 1}. ${place.name}</div>
                ${place.address ? `<div class="place-address">📍 ${place.address}</div>` : ''}
                ${place.description ? `<div class="place-description">${place.description}</div>` : ''}
                <div class="place-details">
                  ${place.walkingTime ? `<span>🚶 ${place.walkingTime} min walk</span>` : ''}
                  ${place.rating ? `<span>⭐ ${place.rating}/5</span>` : ''}
                </div>
                <a href="${googleMapsLink}" class="place-link" target="_blank">View on Google Maps</a>
              </div>
            </div>
          `}).join('')}
        </div>
      `).join('')}

      <div class="footer">
        <p>Route created with TurnRight.city</p>
        <p>Generated: ${new Date().toLocaleString('en-US')}</p>
      </div>
    </body>
    </html>
  `;
}

async function generatePDF(htmlContent: string): Promise<string> {
  // For now, we'll return the HTML as downloadable content
  // In production, you'd want to use a proper PDF library
  
  return htmlContent;
}