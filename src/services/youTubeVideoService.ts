import { supabase } from "@/integrations/supabase/client";

export interface YouTubeVideo {
  id: string;
  user_id: string;
  video_id: string;
  title: string;
  duration: number;
  url: string;
  extraction_status: string;
  audio_url?: string;
  created_at: string;
  updated_at: string;
}

export interface YouTubeTranscription {
  id: string;
  video_id: string;
  user_id: string;
  segments: any;
  source_language: string;
  confidence: number;
  processing_status: string;
  created_at: string;
  updated_at: string;
}

export interface YouTubeTranslation {
  id: string;
  transcription_id: string;
  user_id: string;
  target_language: string;
  translated_segments: any;
  voiceover_settings: any;
  voiceover_url?: string;
  created_at: string;
  updated_at: string;
}

export class YouTubeVideoService {
  static async processYouTubeUrl(url: string): Promise<YouTubeVideo> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    const { data, error } = await supabase.functions.invoke('youtube-audio-extract', {
      body: { url, userId: user.id }
    });

    if (error) {
      throw new Error(`Erreur lors du traitement: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'Échec du traitement de la vidéo');
    }

    return data.video;
  }

  static async getUserVideos(): Promise<YouTubeVideo[]> {
    const { data, error } = await supabase
      .from('youtube_videos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erreur lors de la récupération: ${error.message}`);
    }

    return data || [];
  }

  static async deleteVideo(videoId: string): Promise<void> {
    const { error } = await supabase
      .from('youtube_videos')
      .delete()
      .eq('id', videoId);

    if (error) {
      throw new Error(`Erreur lors de la suppression: ${error.message}`);
    }
  }

  static async createTranscription(
    videoId: string,
    segments: any[],
    sourceLanguage: string,
    confidence: number = 0.0
  ): Promise<YouTubeTranscription> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    const { data, error } = await supabase
      .from('youtube_transcriptions')
      .insert({
        video_id: videoId,
        user_id: user.id,
        segments,
        source_language: sourceLanguage,
        confidence,
        processing_status: 'completed'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur lors de la transcription: ${error.message}`);
    }

    return data;
  }

  static async createTranslation(
    transcriptionId: string,
    targetLanguage: string,
    translatedSegments: any[],
    voiceoverSettings: any = {}
  ): Promise<YouTubeTranslation> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    const { data, error } = await supabase
      .from('youtube_translations')
      .insert({
        transcription_id: transcriptionId,
        user_id: user.id,
        target_language: targetLanguage,
        translated_segments: translatedSegments,
        voiceover_settings: voiceoverSettings
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Erreur lors de la traduction: ${error.message}`);
    }

    return data;
  }

  static async getVideoTranscriptions(videoId: string): Promise<YouTubeTranscription[]> {
    const { data, error } = await supabase
      .from('youtube_transcriptions')
      .select('*')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erreur lors de la récupération: ${error.message}`);
    }

    return data || [];
  }

  static async getTranscriptionTranslations(transcriptionId: string): Promise<YouTubeTranslation[]> {
    const { data, error } = await supabase
      .from('youtube_translations')
      .select('*')
      .eq('transcription_id', transcriptionId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erreur lors de la récupération: ${error.message}`);
    }

    return data || [];
  }

  static async updateVoiceoverUrl(translationId: string, voiceoverUrl: string): Promise<void> {
    const { error } = await supabase
      .from('youtube_translations')
      .update({ voiceover_url: voiceoverUrl })
      .eq('id', translationId);

    if (error) {
      throw new Error(`Erreur lors de la mise à jour: ${error.message}`);
    }
  }
}