import { supabase } from '@/integrations/supabase/client';

export interface TTSSettings {
  provider: string;
  voice: string;
  language: string;
  speed: number;
  format: string;
}

interface TTSResult {
  audioContent: string;
  mime: string;
}

/**
 * Service for Text-to-Speech functionality (OpenAI only)
 */
export class TextToSpeechService {
  /**
   * Generate speech from text using OpenAI TTS
   */
  static async generateSpeech(text: string, settings: TTSSettings): Promise<TTSResult> {
    const { data, error } = await supabase.functions.invoke('text-to-voice', {
      body: {
        text,
        voice: settings.voice,
        format: settings.format
      }
    });

    if (error) {
      throw new Error(`OpenAI TTS error: ${error.message}`);
    }

    return {
      audioContent: data.audioContent,
      mime: `audio/${settings.format}`
    };
  }

  /**
   * Play text audio directly in the browser
   */
  static async playTextAudio(text: string, settings: TTSSettings): Promise<HTMLAudioElement> {
    const result = await this.generateSpeech(text, settings);
    const audioBlob = this.base64ToBlob(result.audioContent, result.mime);
    const audioUrl = URL.createObjectURL(audioBlob);
    
    const audio = new Audio(audioUrl);
    audio.play();
    
    // Clean up URL when audio ends
    audio.addEventListener('ended', () => {
      URL.revokeObjectURL(audioUrl);
    });

    return audio;
  }

  /**
   * Generate full voiceover by combining multiple segments
   */
  static async generateFullVoiceover(
    segments: Array<{ translatedText?: string; originalText: string }>,
    settings: TTSSettings
  ): Promise<Blob> {
    const audioChunks: Blob[] = [];
    
    for (const segment of segments) {
      const text = segment.translatedText || segment.originalText;
      if (!text?.trim()) continue;

      const result = await this.generateSpeech(text, settings);
      const audioBlob = this.base64ToBlob(result.audioContent, result.mime);
      audioChunks.push(audioBlob);
    }

    if (audioChunks.length === 0) {
      throw new Error('Aucun contenu audio généré');
    }

    // Combine all audio chunks into one blob
    return new Blob(audioChunks, { type: settings.format === 'wav' ? 'audio/wav' : 'audio/mpeg' });
  }

  /**
   * Convert base64 string to Blob
   */
  static base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Get available OpenAI voices
   */
  static getAvailableVoices(): Record<string, { openai: string[] }> {
    return {
      'en': {
        openai: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
      },
      'fr': {
        openai: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
      },
      'es': {
        openai: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
      }
    };
  }
}