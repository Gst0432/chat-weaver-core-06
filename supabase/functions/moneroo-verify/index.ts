import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const log = (step: string, details?: unknown) => console.log(`[MONEROO-VERIFY] ${step}`, details ?? "");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    log("Start");

    const monerooKey = Deno.env.get("MONEROO_SECRET_KEY");
    if (!monerooKey) throw new Error("MONEROO_SECRET_KEY is not set");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    // Body
    const body = await req.json().catch(() => ({}));
    const reference = String(body?.reference || body?.ref || "");
    const planRaw = String(body?.plan || "").toLowerCase();
    if (!reference) throw new Error("Missing payment reference");
    const allowed = ["starter", "pro", "business"] as const;
    if (!allowed.includes(planRaw as any)) throw new Error("Invalid plan");

    // Verify payment with Moneroo API
    const monerooResponse = await fetch(`https://api.moneroo.io/v1/payments/${reference}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${monerooKey}`,
        "Accept": "application/json"
      }
    });

    if (!monerooResponse.ok) {
      const errorText = await monerooResponse.text();
      log("Moneroo API Error", { status: monerooResponse.status, error: errorText });
      throw new Error(`Payment verification failed: ${errorText}`);
    }

    const paymentData = await monerooResponse.json();
    log("Payment data retrieved", paymentData);

    // Check if payment was successful
    if (paymentData.data?.status !== 'success') {
      throw new Error(`Payment not successful. Status: ${paymentData.data?.status || 'unknown'}`);
    }

    // Verify payment matches expected plan and user
    const metadata = paymentData.data?.metadata || {};
    if (metadata.user_id !== user.id) {
      throw new Error("Payment user mismatch");
    }
    if (metadata.plan !== planRaw) {
      throw new Error("Payment plan mismatch");
    }

    const tier = planRaw === 'starter' ? 'Starter' : planRaw === 'pro' ? 'Pro' : 'Business';

    // Calculate subscription end (stack 30 days on existing if active)
    const now = new Date();

    const { data: existing, error: existingErr } = await supabaseService
      .from('subscribers')
      .select('subscription_end, subscribed, subscription_tier')
      .eq('email', user.email)
      .maybeSingle();

    if (existingErr) log('Fetch existing subscriber error', existingErr);

    let base = now;
    if (existing?.subscription_end) {
      const prevEnd = new Date(existing.subscription_end);
      if (!isNaN(prevEnd.getTime()) && prevEnd > now) {
        base = prevEnd;
      }
    }
    const end = new Date(base);
    end.setDate(end.getDate() + 30);

    await supabaseService.from('subscribers').upsert({
      email: user.email,
      user_id: user.id,
      subscribed: true,
      subscription_tier: tier,
      subscription_end: end.toISOString(),
      updated_at: now.toISOString(),
    }, { onConflict: 'email' });

    log("Premium activated", { email: user.email, tier, end: end.toISOString(), reference });

    return new Response(JSON.stringify({
      ok: true,
      subscribed: true,
      subscription_tier: tier,
      subscription_end: end.toISOString(),
      reference,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[MONEROO-VERIFY] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});