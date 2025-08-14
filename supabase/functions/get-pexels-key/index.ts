import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // For now, return empty since Pexels key is optional
    // User can configure this later in Supabase Edge Functions secrets
    const pexelsApiKey = Deno.env.get('PEXELS_API_KEY');
    
    return new Response(JSON.stringify({ 
      apiKey: pexelsApiKey || null,
      available: !!pexelsApiKey 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-pexels-key function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get Pexels API key',
      apiKey: null,
      available: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});