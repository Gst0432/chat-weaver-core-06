import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url, userId } = await req.json();

    if (!url) {
      throw new Error('URL YouTube requise');
    }

    if (!userId) {
      throw new Error('ID utilisateur requis');
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

    console.log('Processing YouTube video:', videoId);

    // Get video metadata from YouTube API
    const ytApiKey = Deno.env.get('GOOGLE_API_KEY');
    if (!ytApiKey) {
      throw new Error('Clé API Google non configurée');
    }

    const metadataResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${ytApiKey}&part=snippet,contentDetails`
    );

    if (!metadataResponse.ok) {
      throw new Error('Erreur lors de la récupération des métadonnées');
    }

    const metadataData = await metadataResponse.json();
    
    if (!metadataData.items || metadataData.items.length === 0) {
      throw new Error('Vidéo non trouvée');
    }

    const videoInfo = metadataData.items[0];
    const title = videoInfo.snippet.title;
    const durationStr = videoInfo.contentDetails.duration;
    
    // Parse ISO 8601 duration (PT4M13S -> 253 seconds)
    const durationMatch = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = parseInt(durationMatch?.[1] || '0');
    const minutes = parseInt(durationMatch?.[2] || '0');
    const seconds = parseInt(durationMatch?.[3] || '0');
    const duration = hours * 3600 + minutes * 60 + seconds;

    // Check if video already exists
    const { data: existingVideo } = await supabase
      .from('youtube_videos')
      .select('*')
      .eq('video_id', videoId)
      .eq('user_id', userId)
      .single();

    let videoRecord;

    if (existingVideo) {
      // Update existing record
      const { data, error } = await supabase
        .from('youtube_videos')
        .update({
          title,
          duration,
          url,
          extraction_status: 'processing'
        })
        .eq('id', existingVideo.id)
        .select()
        .single();

      if (error) throw error;
      videoRecord = data;
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('youtube_videos')
        .insert({
          user_id: userId,
          video_id: videoId,
          title,
          duration,
          url,
          extraction_status: 'processing'
        })
        .select()
        .single();

      if (error) throw error;
      videoRecord = data;
    }

    // For now, we'll simulate audio extraction
    // In production, you would use yt-dlp or similar tool
    const audioUrl = `https://audio-proxy.example.com/${videoId}.mp3`;

    // Update with audio URL (simulated)
    const { error: updateError } = await supabase
      .from('youtube_videos')
      .update({
        audio_url: audioUrl,
        extraction_status: 'completed'
      })
      .eq('id', videoRecord.id);

    if (updateError) throw updateError;

    console.log('YouTube video processed successfully:', videoId);

    return new Response(
      JSON.stringify({
        success: true,
        video: {
          ...videoRecord,
          audio_url: audioUrl,
          extraction_status: 'completed'
        },
        message: 'Vidéo YouTube traitée avec succès'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('YouTube processing error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erreur lors du traitement de la vidéo YouTube' 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});