import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StoredRecording {
  id: string;
  title: string;
  file_path: string;
  duration: number;
  file_size: number;
  mime_type: string;
  created_at: string;
  blob?: Blob;
}

interface TranscriptionData {
  id: string;
  recording_id: string;
  original_text: string;
  language: string;
  confidence: number;
}

interface TranslationSession {
  id: string;
  transcription_id: string;
  source_language: string;
  target_language: string;
  translated_text: string;
  voiceover_url?: string;
}

export const useRecordingStorage = () => {
  const [recordings, setRecordings] = useState<StoredRecording[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadRecordings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('audio_recordings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecordings(data || []);
    } catch (error) {
      console.error('Error loading recordings:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les enregistrements",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveRecording = async (
    recording: { blob: Blob; duration: number; size: number },
    title: string
  ): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Generate unique file path
      const fileName = `${user.id}/${Date.now()}-${title.replace(/[^a-zA-Z0-9]/g, '_')}.webm`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('audio-recordings')
        .upload(fileName, recording.blob, {
          contentType: 'audio/webm'
        });

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { data, error } = await supabase
        .from('audio_recordings')
        .insert({
          user_id: user.id,
          title,
          file_path: fileName,
          duration: Math.round(recording.duration / 1000), // Convert to seconds
          file_size: recording.size,
          mime_type: 'audio/webm'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Enregistrement sauvegardé"
      });

      await loadRecordings();
      return data.id;
    } catch (error) {
      console.error('Error saving recording:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder l'enregistrement",
        variant: "destructive"
      });
      return null;
    }
  };

  const deleteRecording = async (recordingId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get recording details
      const { data: recording } = await supabase
        .from('audio_recordings')
        .select('file_path')
        .eq('id', recordingId)
        .single();

      if (recording) {
        // Delete from storage
        await supabase.storage
          .from('audio-recordings')
          .remove([recording.file_path]);
      }

      // Delete from database (cascade will handle related records)
      const { error } = await supabase
        .from('audio_recordings')
        .delete()
        .eq('id', recordingId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Enregistrement supprimé"
      });

      await loadRecordings();
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'enregistrement",
        variant: "destructive"
      });
    }
  };

  const getRecordingBlob = async (filePath: string): Promise<Blob | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('audio-recordings')
        .download(filePath);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error downloading recording:', error);
      return null;
    }
  };

  const saveTranscription = async (
    recordingId: string,
    text: string,
    language: string,
    confidence: number = 0
  ): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('transcriptions')
        .insert({
          recording_id: recordingId,
          user_id: user.id,
          original_text: text,
          language,
          confidence
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error saving transcription:', error);
      return null;
    }
  };

  const saveTranslationSession = async (
    transcriptionId: string,
    sourceLanguage: string,
    targetLanguage: string,
    translatedText: string,
    voiceoverUrl?: string
  ): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('translation_sessions')
        .insert({
          transcription_id: transcriptionId,
          user_id: user.id,
          source_language: sourceLanguage,
          target_language: targetLanguage,
          translated_text: translatedText,
          voiceover_url: voiceoverUrl
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error saving translation session:', error);
      return null;
    }
  };

  useEffect(() => {
    loadRecordings();
  }, []);

  return {
    recordings,
    loading,
    loadRecordings,
    saveRecording,
    deleteRecording,
    getRecordingBlob,
    saveTranscription,
    saveTranslationSession
  };
};