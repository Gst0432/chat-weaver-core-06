import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const log = (step: string, details?: unknown) => console.log(`[MONEROO-MINUTES-INIT] ${step}`, details ?? "");

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

    // Parse body
    const body = await req.json().catch(() => ({}));
    const minutesPackage = String(body?.minutes || "");
    
    // Available minute packages
    const minutePackages = {
      "50": { minutes: 50, amount: 2500, currency: "XOF" },   // 50 min pour 2500 FCFA
      "100": { minutes: 100, amount: 4500, currency: "XOF" }, // 100 min pour 4500 FCFA
      "300": { minutes: 300, amount: 12000, currency: "XOF" }, // 300 min pour 12000 FCFA
      "500": { minutes: 500, amount: 18000, currency: "XOF" }, // 500 min pour 18000 FCFA
    };

    const selectedPackage = minutePackages[minutesPackage as keyof typeof minutePackages];
    if (!selectedPackage) throw new Error("Invalid minute package selected");

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
        amount: selectedPackage.amount,
        currency: selectedPackage.currency,
        description: `Achat de ${selectedPackage.minutes} minutes TTS - Chatelix`,
        customer: {
          email: user.email,
          first_name: user.user_metadata?.first_name || "User",
          last_name: user.user_metadata?.last_name || "Chatelix"
        },
        return_url: returnUrl,
        metadata: {
          user_id: user.id,
          email: user.email,
          minutes: selectedPackage.minutes.toString(),
          type: "minutes"
        }
      })
    });

    if (!monerooResponse.ok) {
      const errorText = await monerooResponse.text();
      log("Moneroo API Error", { status: monerooResponse.status, error: errorText });
      throw new Error(`Payment initialization failed: ${errorText}`);
    }

    const monerooData = await monerooResponse.json();
    log("Minutes payment initialized", { paymentId: monerooData.data?.id, minutes: selectedPackage.minutes });

    return new Response(JSON.stringify({ 
      url: monerooData.data?.checkout_url,
      reference: monerooData.data?.id,
      minutes: selectedPackage.minutes
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[MONEROO-MINUTES-INIT] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});