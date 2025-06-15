
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Stripe secret key from env
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(
      JSON.stringify({ error: "Missing STRIPE_SECRET_KEY" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

  try {
    // Try to parse the request body (not used in this example, but required for POST)
    let body: any = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch (_) {
        // silently proceed - allows graceful fallback if body is missing
      }
    }

    // Determine the origin for success/cancel URLs
    const origin = req.headers.get("origin") ?? "http://localhost:3000";

    // Create Stripe session (edit unit_amount as needed, e.g. 499 for $4.99)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Route Purchase" },
            unit_amount: 0, // change to correct price in cents, e.g. 499 for $4.99
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/?payment=success`,
      cancel_url: `${origin}/?payment=cancel`,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
