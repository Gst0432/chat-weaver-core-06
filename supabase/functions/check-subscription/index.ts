import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// Stripe removed for Moneroo-based premium flow
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => console.log(`[CHECK-SUBSCRIPTION] ${step}`, details ?? "");

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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    log("User", { id: user.id, email: user.email });

    const nowIso = new Date().toISOString();
    const { data: existing } = await supabaseService
      .from('subscribers')
      .select('email,user_id,subscription_tier,subscription_end,subscribed,minutes_balance,total_minutes_purchased')
      .eq('email', user.email)
      .maybeSingle();

    let active = false;
    let tier: string | null = existing?.subscription_tier ?? null;
    let endAt: string | null = existing?.subscription_end ?? null;

    if (endAt) {
      const ends = new Date(endAt).getTime();
      active = ends > Date.now();
      if (!active) {
        // expired, keep tier for display but mark as unsubscribed
      }
    }

    // Ensure a row exists and keep it in sync
    await supabaseService.from('subscribers').upsert({
      email: user.email,
      user_id: user.id,
      subscribed: active,
      subscription_tier: tier,
      subscription_end: endAt,
      updated_at: nowIso,
    }, { onConflict: 'email' });

    return new Response(JSON.stringify({
      subscribed: active,
      subscription_tier: tier,
      subscription_end: endAt,
      minutes_balance: existing?.minutes_balance || 0,
      total_minutes_purchased: existing?.total_minutes_purchased || 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[CHECK-SUBSCRIPTION] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});