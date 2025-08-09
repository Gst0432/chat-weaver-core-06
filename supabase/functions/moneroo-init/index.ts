import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const log = (step: string, details?: unknown) => console.log(`[MONEROO-INIT] ${step}`, details ?? "");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

    try {
      log("Start");
      log("Headers", Object.fromEntries(req.headers.entries()));

      // Require auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    // Parse body
    const body = await req.json().catch(() => ({}));
    const planRaw = String(body?.plan || "").toLowerCase();
    const allowed = ["starter", "pro", "business"] as const;
    if (!allowed.includes(planRaw as any)) throw new Error("Invalid plan");

    const monerooKey = Deno.env.get("MONEROO_SECRET_KEY");
    if (!monerooKey) throw new Error("MONEROO_SECRET_KEY is not set");

    // Get plan pricing
    const planPricing = {
      starter: { amount: 7500, currency: "XOF" },
      pro: { amount: 22000, currency: "XOF" },
      business: { amount: 55000, currency: "XOF" }
    };

    const plan = planPricing[planRaw as keyof typeof planPricing];
    if (!plan) throw new Error("Invalid plan selected");

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const returnUrl = `${origin}/billing`;

    // Call Moneroo API to initialize payment
    const monerooResponse = await fetch("https://api.moneroo.io/v1/payments/initialize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${monerooKey}`,
        "Accept": "application/json"
      },
      body: JSON.stringify({
        amount: plan.amount,
        currency: plan.currency,
        description: `Abonnement ${planRaw.charAt(0).toUpperCase() + planRaw.slice(1)} - Chatelix`,
        customer: {
          email: user.email,
          first_name: user.user_metadata?.first_name || "User",
          last_name: user.user_metadata?.last_name || "Chatelix"
        },
        return_url: returnUrl,
        metadata: {
          user_id: user.id,
          plan: planRaw,
          email: user.email
        }
      })
    });

    if (!monerooResponse.ok) {
      const errorText = await monerooResponse.text();
      log("Moneroo API Error", { status: monerooResponse.status, error: errorText });
      throw new Error(`Payment initialization failed: ${errorText}`);
    }

    const monerooData = await monerooResponse.json();
    log("Payment initialized", { paymentId: monerooData.data?.id, plan: planRaw });

    return new Response(JSON.stringify({ 
      url: monerooData.data?.checkout_url,
      reference: monerooData.data?.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[MONEROO-INIT] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});