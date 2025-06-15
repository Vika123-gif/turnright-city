
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
// Setup CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
serve(async (req)=>{
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(JSON.stringify({
      ok: true
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "x-debug-create-payment": "v2"
      }
    });
  }
  // Stripe secret key from Supabase secrets (must be set in Supabase dashboard)
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(JSON.stringify({
      error: "Missing STRIPE_SECRET_KEY in function environment."
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "x-debug-create-payment": "v2"
      }
    });
  }
  const stripe = new Stripe(stripeKey, {
    apiVersion: "2023-10-16"
  });
  try {
    // Optionally parse request body (not used but required for POST)
    let body = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch (_) {
      // ignore parse errors, allow empty body
      }
    }
    // Determine if user is authenticated via Authorization header
    let userEmail = "guest@example.com";
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
    // Optionally, you could look up a user if you want (not required for guest flow)
    // This assumes you do NOT require a logged-in user.
    // (you can add logic for a real user if you enable auth in the future)
    }
    // Determine the origin for Stripe redirect URLs
    const origin = req.headers.get("origin") ?? "http://localhost:3000";
    // Create the Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: [
        "card"
      ],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Route Purchase"
            },
            unit_amount: 499
          },
          quantity: 1
        }
      ],
      mode: "payment",
      success_url: `${origin}/?payment=success`,
      cancel_url: `${origin}/?payment=cancel`,
      customer_email: userEmail
    });
    return new Response(JSON.stringify({
      url: session.url
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "x-debug-create-payment": "v2"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message || "Unknown error"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "x-debug-create-payment": "v2"
      }
    });
  }
});
