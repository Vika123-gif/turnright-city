# Stripe Webhook Setup

This webhook automatically adds credits to users after successful Stripe payments.

## Setup Instructions

### 1. Deploy the Function

```bash
supabase functions deploy stripe-webhook
```

### 2. Set Environment Variables

In your Supabase Dashboard → Edge Functions → stripe-webhook → Settings:

```
STRIPE_SECRET_KEY=sk_live_... (your Stripe secret key)
STRIPE_WEBHOOK_SECRET=whsec_... (you'll get this in step 3)
SUPABASE_URL=https://gwwqfoplhhtyjkrhazbt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=... (from Supabase Dashboard → Settings → API)
```

### 3. Configure Stripe Webhook

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Endpoint URL: `https://gwwqfoplhhtyjkrhazbt.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_...`)
7. Add it to Supabase as `STRIPE_WEBHOOK_SECRET`

### 4. Update Stripe Payment Link

In your Stripe payment link settings:
- Enable "Collect customer email address"
- This ensures the webhook can identify which user to credit

### 5. Test

1. Make a test payment (use Stripe test mode)
2. Check logs: `supabase functions logs stripe-webhook`
3. Verify credits were added in `user_credits` table

## How It Works

1. User clicks "Buy 3 Itineraries for €5"
2. Payment window opens with pre-filled email
3. User completes payment
4. Stripe sends webhook to our function
5. Function verifies signature (security)
6. Function finds user by email
7. Function adds 3 credits to `user_credits.purchased_generations`
8. Function logs purchase in `route_purchases` table
9. User's app polls for credits every 2 seconds
10. When credits appear, shows success message

## Debugging

View logs in real-time:
```bash
supabase functions logs stripe-webhook --follow
```

Test locally:
```bash
supabase functions serve stripe-webhook
```

## Security

- ✅ Signature verification prevents fake webhooks
- ✅ Service role key bypasses RLS for admin operations
- ✅ Email matching ensures credits go to correct user
- ✅ Idempotency: duplicate webhooks won't double-credit

