import { supabase } from "@/integrations/supabase/client";

interface TranslateVideoOptions {
  youtubeUrl: string;
  sourceLang: string;
  targetLang: string;
  generateVoiceover: boolean;
  onProgress?: (step: string, percentage: number) => void;
}

interface TranslationResult {
  originalText: string;
  translatedText: string;
  audioUrl?: string;
  sourceLang: string;
  targetLang: string;
  metadata?: any;
}

export class VideoTranslationService {
  static async translateVideo(options: TranslateVideoOptions): Promise<TranslationResult> {
    const { youtubeUrl, sourceLang, targetLang, generateVoiceover, onProgress } = options;

    try {
      // Step 1: Extract audio from YouTube (20%)
      onProgress?.("Extraction de l'audio depuis YouTube...", 20);
      const audioData = await this.extractYouTubeAudio(youtubeUrl);

      // Step 2: Transcribe audio to text (40%)
      onProgress?.("Transcription de l'audio en texte...", 40);
      const transcriptionResult = await this.transcribeAudio(audioData);

      // Step 3: Translate text (60%)
      onProgress?.("Traduction du texte...", 60);
      const translationResult = await this.translateText(
        transcriptionResult.text,
        sourceLang,
        targetLang
      );

      let audioUrl: string | undefined;

      // Step 4: Generate voiceover if requested (80%)
      if (generateVoiceover) {
        onProgress?.("Génération de la voix off...", 80);
        audioUrl = await this.generateVoiceover(
          translationResult.translatedText,
          targetLang
        );
      }

      onProgress?.("Finalisation...", 100);

      return {
        originalText: transcriptionResult.text,
        translatedText: translationResult.translatedText,
        audioUrl,
        sourceLang: translationResult.sourceLang,
        targetLang: translationResult.targetLang,
        metadata: {
          ...audioData.metadata,
          wordCount: transcriptionResult.text.split(' ').length,
          translatedWordCount: translationResult.translatedText.split(' ').length
        }
      };

    } catch (error: any) {
      console.error('Video translation error:', error);
      throw new Error(error.message || 'Erreur lors de la traduction vidéo');
    }
  }

  private static async extractYouTubeAudio(youtubeUrl: string) {
    const { data, error } = await supabase.functions.invoke('youtube-audio-extract', {
      body: { url: youtubeUrl }
    });

    if (error) {
      throw new Error(`Erreur d'extraction audio: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'Échec de l\'extraction audio');
    }

    return data;
  }

  private static async transcribeAudio(audioData: any) {
    if (!audioData.audioBase64) {
      throw new Error('Aucune donnée audio disponible pour la transcription');
    }

    const { data, error } = await supabase.functions.invoke('voice-to-text', {
      body: {
        audio: audioData.audioBase64
      }
    });

    if (error) {
      throw new Error(`Erreur de transcription: ${error.message}`);
    }

    if (!data.text) {
      throw new Error('Échec de la transcription audio');
    }

    return {
      text: data.text,
      language: audioData.detectedLanguage || 'auto',
      duration: audioData.metadata?.duration || 0
    };
  }

  private static async translateText(text: string, sourceLang: string, targetLang: string) {
    const { data, error } = await supabase.functions.invoke('translate-text', {
      body: {
        text,
        sourceLang,
        targetLang
      }
    });

    if (error) {
      throw new Error(`Erreur de traduction: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(data.error || 'Échec de la traduction');
    }

    return data;
  }

  private static async generateVoiceover(text: string, language: string): Promise<string> {
    // Map language codes to voice names
    const voiceMap: Record<string, string> = {
      'fr': 'alloy',
      'en': 'nova',
      'es': 'shimmer',
      'ar': 'onyx'
    };

    const voice = voiceMap[language] || 'alloy';

    const { data, error } = await supabase.functions.invoke('text-to-voice', {
      body: {
        text,
        voice,
        format: 'mp3'
      }
    });

    if (error) {
      throw new Error(`Erreur de génération vocale: ${error.message}`);
    }

    if (data.error) {
      throw new Error(data.error);
    }

    // Convert base64 to blob URL
    const audioBlob = this.base64ToBlob(data.audioContent, 'audio/mpeg');
    return URL.createObjectURL(audioBlob);
  }

  private static base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  static getSupportedLanguages() {
    return [
      { code: 'fr', name: 'Français', flag: '🇫🇷' },
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Español', flag: '🇪🇸' },
      { code: 'ar', name: 'العربية', flag: '🇸🇦' }
    ];
  }
}