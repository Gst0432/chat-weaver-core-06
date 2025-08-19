import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const log = (step: string, details?: unknown) => console.log(`[QUOTA-CHECK] ${step}`, details ?? "");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
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
    log("Start quota check");

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const body = await req.json().catch(() => ({}));
    const { action = 'check', type = 'code' } = body; // type can be 'code', 'image', 'voice'

    log("User and action", { email: user.email, action, type });

    // Check quota using the database function
    const { data: quotaCheck, error: quotaError } = await supabaseService.rpc(
      'check_free_generation_quota', 
      { user_email: user.email }
    );

    if (quotaError) {
      log("Quota check error", quotaError);
      throw new Error(`Quota check failed: ${quotaError.message}`);
    }

    log("Quota check result", quotaCheck);

    if (action === 'check') {
      return new Response(JSON.stringify(quotaCheck), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    if (action === 'increment') {
      if (!quotaCheck.can_generate) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Quota exceeded',
          quota: quotaCheck 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        });
      }

      // Increment usage for free users
      if (!quotaCheck.is_subscribed) {
        const { data: incrementResult, error: incrementError } = await supabaseService.rpc(
          'increment_free_generation', 
          { user_email: user.email }
        );

        if (incrementError) {
          log("Increment error", incrementError);
          throw new Error(`Failed to increment usage: ${incrementError.message}`);
        }

        log("Usage incremented", incrementResult);

        if (!incrementResult) {
          return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to increment usage - quota may be exceeded',
            quota: quotaCheck 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403,
          });
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Generation allowed and usage tracked' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log("ERROR", errorMessage);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});