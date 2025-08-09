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

    // Generate a reference (in real integration, call Moneroo API here)
    const ref = `mnr_${crypto.randomUUID()}`;
    const origin = req.headers.get("origin") || "http://localhost:3000";

    // In sandbox mode, we just send user back to /billing with ref & plan
    const url = `${origin}/billing?ref=${encodeURIComponent(ref)}&plan=${encodeURIComponent(planRaw)}`;

    return new Response(JSON.stringify({ url, reference: ref }), {
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