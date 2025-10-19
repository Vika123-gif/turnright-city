
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

// Setup CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "x-debug-create-payment": "v4"
      }
    });
  }

  // Stripe secret key from Supabase secrets
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(JSON.stringify({
      error: "Missing STRIPE_SECRET_KEY in function environment."
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "x-debug-create-payment": "v4"
      }
    });
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: "2023-10-16"
  });

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({
        error: "Authentication required"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "x-debug-create-payment": "v4"
        }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Verify JWT token
    const verifyResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: supabaseServiceKey
      }
    });

    if (!verifyResponse.ok) {
      return new Response(JSON.stringify({
        error: "Invalid authentication token"
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "x-debug-create-payment": "v4"
        }
      });
    }

    const user = await verifyResponse.json();
    const userEmail = user.email || "user@example.com";

    // Determine the origin for Stripe redirect URLs
    const origin = req.headers.get("origin") ?? "http://localhost:3000";

    // Create the Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Route Purchase"
            },
            unit_amount: 200 // €2.00 in cents
          },
          quantity: 1
        }
      ],
      mode: "payment",
      success_url: `${origin}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?payment=cancel`,
      customer_email: userEmail
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "x-debug-create-payment": "v4"
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "x-debug-create-payment": "v4"
      }
    });
  }
});
