import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const log = (step: string, details?: unknown) => console.log(`[MONEROO-MINUTES-VERIFY] ${step}`, details ?? "");

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
    const minutes = Number(body?.minutes || 0);
    if (!reference) throw new Error("Missing payment reference");
    if (!minutes || minutes <= 0) throw new Error("Invalid minutes amount");

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

    // Verify payment matches expected user and type
    const metadata = paymentData.data?.metadata || {};
    if (metadata.user_id !== user.id) {
      throw new Error("Payment user mismatch");
    }
    if (metadata.type !== 'minutes') {
      throw new Error("Payment type mismatch");
    }
    if (Number(metadata.minutes) !== minutes) {
      throw new Error("Minutes amount mismatch");
    }

    const now = new Date();

    // Insert minute purchase record
    await supabaseService.from('minute_purchases').insert({
      user_id: user.id,
      email: user.email,
      minutes: minutes,
      amount: paymentData.data?.amount || 0,
      currency: paymentData.data?.currency || 'XOF',
      payment_reference: reference,
      status: 'completed'
    });

    // Update user's minute balance
    const { data: existingSubscriber, error: fetchError } = await supabaseService
      .from('subscribers')
      .select('minutes_balance, total_minutes_purchased')
      .eq('email', user.email)
      .maybeSingle();

    if (fetchError) {
      log('Fetch subscriber error', fetchError);
    }

    const currentMinutes = existingSubscriber?.minutes_balance || 0;
    const totalPurchased = existingSubscriber?.total_minutes_purchased || 0;

    await supabaseService.from('subscribers').upsert({
      email: user.email,
      user_id: user.id,
      minutes_balance: currentMinutes + minutes,
      total_minutes_purchased: totalPurchased + minutes,
      updated_at: now.toISOString(),
    }, { onConflict: 'email' });

    log("Minutes added", { 
      email: user.email, 
      addedMinutes: minutes, 
      newBalance: currentMinutes + minutes, 
      reference 
    });

    return new Response(JSON.stringify({
      ok: true,
      minutes_added: minutes,
      new_balance: currentMinutes + minutes,
      reference,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[MONEROO-MINUTES-VERIFY] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});