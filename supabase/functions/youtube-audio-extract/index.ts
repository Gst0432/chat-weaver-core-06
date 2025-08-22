import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      throw new Error('URL YouTube requise');
    }

    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/(watch\?v=|embed\/|v\/)?([a-zA-Z0-9_-]{11})/;
    if (!youtubeRegex.test(url)) {
      throw new Error('URL YouTube invalide');
    }

    // Extract video ID
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
    if (!videoId) {
      throw new Error('Impossible d\'extraire l\'ID de la vidéo');
    }

    console.log('Extracting audio for video ID:', videoId);

    // Use yt-dlp to extract audio (simplified approach)
    // In a real implementation, you would use yt-dlp or similar tool
    // For now, we'll simulate the process and return metadata
    
    const videoMetadata = {
      id: videoId,
      title: `Vidéo YouTube ${videoId}`,
      duration: 0,
      audioUrl: `https://audio-proxy.example.com/${videoId}.mp3`, // Placeholder
      extractedAt: new Date().toISOString()
    };

    // In production, you would:
    // 1. Use yt-dlp to extract actual audio
    // 2. Upload to Supabase storage or return base64
    // 3. Handle various audio formats
    
    console.log('Audio extraction completed for:', videoId);

    return new Response(
      JSON.stringify({
        success: true,
        metadata: videoMetadata,
        message: 'Audio extrait avec succès (simulation)'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('YouTube audio extraction error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erreur lors de l\'extraction audio' 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});