import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Import Stripe for webhook signature verification
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("No Stripe signature found");
      return new Response("No signature", { status: 400, headers: corsHeaders });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(`Webhook Error: ${err.message}`, { status: 400, headers: corsHeaders });
    }

    console.log("Webhook event type:", event.type);

    // Handle successful payment
    if (event.type === "checkout.session.completed" || event.type === "payment_intent.succeeded") {
      const session = event.data.object as any;
      
      console.log("Payment successful:", session.id);
      console.log("Customer email:", session.customer_email || session.receipt_email);
      console.log("Amount:", session.amount_total || session.amount);

      // Get customer email from the session
      const customerEmail = session.customer_email || session.receipt_email || session.customer_details?.email;
      
      if (!customerEmail) {
        console.error("No customer email found in payment session");
        return new Response("No customer email", { status: 400, headers: corsHeaders });
      }

      // Create Supabase client with service role key (bypasses RLS)
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Find user by email
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error("Error fetching users:", authError);
        return new Response("Error fetching users", { status: 500, headers: corsHeaders });
      }

      const user = authData.users.find(u => u.email === customerEmail);
      
      if (!user) {
        console.error("User not found for email:", customerEmail);
        // Still return 200 to Stripe to avoid retries
        return new Response("User not found", { status: 200, headers: corsHeaders });
      }

      console.log("Found user:", user.id, user.email);

      // Get current credits
      const { data: credits, error: creditsError } = await supabase
        .from("user_credits")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (creditsError && creditsError.code !== "PGRST116") {
        console.error("Error fetching credits:", creditsError);
        return new Response("Error fetching credits", { status: 500, headers: corsHeaders });
      }

      // Calculate new purchased count
      const currentPurchased = credits?.purchased_generations || 0;
      const newPurchased = currentPurchased + 3;

      console.log("Current purchased credits:", currentPurchased);
      console.log("New purchased credits:", newPurchased);

      // Update credits (upsert to handle first purchase)
      const { error: updateError } = await supabase
        .from("user_credits")
        .upsert({
          user_id: user.id,
          email: customerEmail,
          purchased_generations: newPurchased,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "user_id"
        });

      if (updateError) {
        console.error("Error updating credits:", updateError);
        return new Response("Error updating credits", { status: 500, headers: corsHeaders });
      }

      // Log the purchase in both tables
      const purchaseAmount = (session.amount_total || session.amount) / 100; // Convert cents to dollars
      
      // Log in route_purchases table (existing)
      const { error: logError } = await supabase
        .from("route_purchases")
        .insert({
          user_email: customerEmail,
          amount: purchaseAmount,
          credits_purchased: 3,
          payment_method: "stripe_webhook",
          stripe_payment_id: session.id,
          purchased_at: new Date().toISOString(),
        });

      if (logError) {
        console.error("Error logging purchase in route_purchases:", logError);
      }

      // Log in user_interactions table (new comprehensive tracking)
      const { error: interactionError } = await supabase
        .rpc('log_user_interaction', {
          p_user_id: user.id,
          p_user_email: customerEmail,
          p_action_type: 'purchase',
          p_action_name: 'credits_purchased',
          p_purchase_amount: purchaseAmount,
          p_credits_purchased: 3,
          p_payment_method: 'stripe_webhook',
          p_stripe_payment_id: session.id
        });

      if (interactionError) {
        console.error("Error logging purchase in user_interactions:", interactionError);
      }

      console.log("✅ Successfully added 3 credits to user:", customerEmail);

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Credits added successfully",
        user_email: customerEmail,
        credits_added: 3,
        total_purchased: newPurchased
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return 200 for other event types
    console.log("Webhook event processed (not a payment):", event.type);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(`Webhook Error: ${error.message}`, { status: 500, headers: corsHeaders });
  }
});

