import { supabase } from '@/integrations/supabase/client';

export interface TTSSettings {
  provider: 'openai' | 'google' | 'openrouter' | 'azure';
  voice: string;
  language?: string;
  speed?: number;
  format?: 'mp3' | 'wav' | 'opus';
}

export interface TTSResult {
  audioContent: string;
  mime: string;
}

export class TextToSpeechService {
  static async generateSpeech(
    text: string, 
    settings: TTSSettings
  ): Promise<TTSResult> {
    if (!text?.trim()) {
      throw new Error('Texte vide');
    }

    try {
      if (settings.provider === 'openai') {
        return await this.generateOpenAISpeech(text, settings);
      } else if (settings.provider === 'google') {
        return await this.generateGoogleSpeech(text, settings);
      } else if (settings.provider === 'azure') {
        return await this.generateAzureSpeech(text, settings);
      } else {
        return await this.generateOpenRouterSpeech(text, settings);
      }
    } catch (error) {
      console.error('TTS Generation error:', error);
      throw new Error(`Erreur TTS: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  private static async generateOpenAISpeech(text: string, settings: TTSSettings): Promise<TTSResult> {
    const { data, error } = await supabase.functions.invoke('text-to-voice', {
      body: {
        text,
        voice: settings.voice || 'alloy',
        format: settings.format || 'mp3'
      }
    });

    if (error) throw new Error(error.message);
    if (!data?.audioContent) throw new Error('Pas de contenu audio reçu');

    return {
      audioContent: data.audioContent,
      mime: data.mime || 'audio/mpeg'
    };
  }

  private static async generateGoogleSpeech(text: string, settings: TTSSettings): Promise<TTSResult> {
    const { data, error } = await supabase.functions.invoke('google-tts', {
      body: {
        text,
        languageCode: settings.language || 'fr-FR',
        voiceName: settings.voice || '',
        ssmlGender: 'NEUTRAL',
        audioEncoding: settings.format === 'wav' ? 'LINEAR16' : 'MP3',
        speakingRate: settings.speed || 1.0
      }
    });

    if (error) throw new Error(error.message);
    if (!data?.audioContent) throw new Error('Pas de contenu audio reçu');

    return {
      audioContent: data.audioContent,
      mime: data.mime || 'audio/mpeg'
    };
  }

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

  private static async generateOpenRouterSpeech(text: string, settings: TTSSettings): Promise<TTSResult> {
    const { data, error } = await supabase.functions.invoke('openrouter-tts', {
      body: {
        text,
        model: 'openai/tts-1',
        voice: settings.voice,
        format: settings.format,
        speed: settings.speed
      }
    });

    if (error) {
      throw new Error(`Erreur OpenRouter TTS: ${error.message}`);
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      audioContent: data.audioContent,
      mime: data.mime || 'audio/mpeg'
    };
  }

  private static async generateAzureSpeech(text: string, settings: TTSSettings): Promise<TTSResult> {
    const { data, error } = await supabase.functions.invoke('openrouter-tts', {
      body: {
        text,
        model: 'microsoft/azure-tts',
        voice: settings.voice,
        format: settings.format,
        speed: settings.speed
      }
    });

    if (error) {
      throw new Error(`Erreur Azure TTS: ${error.message}`);
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      audioContent: data.audioContent,
      mime: data.mime || 'audio/mpeg'
    };
  }

  static base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  static getAvailableVoices(): Record<string, { openai: string[]; google: string[]; azure: string[] }> {
    return {
      'fr': {
        openai: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
        google: ['fr-FR-Neural2-A', 'fr-FR-Neural2-B', 'fr-FR-Neural2-C', 'fr-FR-Neural2-D'],
        azure: ['fr-FR-DeniseNeural', 'fr-FR-HenriNeural', 'fr-FR-AlainNeural', 'fr-FR-BrigitteNeural']
      },
      'en': {
        openai: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
        google: ['en-US-Neural2-A', 'en-US-Neural2-C', 'en-US-Neural2-D', 'en-US-Neural2-F'],
        azure: ['en-US-JennyNeural', 'en-US-GuyNeural', 'en-US-AriaNeural', 'en-US-DavisNeural']
      },
      'es': {
        openai: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
        google: ['es-ES-Neural2-A', 'es-ES-Neural2-B', 'es-ES-Neural2-C', 'es-ES-Neural2-D'],
        azure: ['es-ES-ElviraNeural', 'es-ES-AlvaroNeural', 'es-ES-AbrilNeural', 'es-ES-ArnauNeural']
      },
      'ar': {
        openai: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
        google: ['ar-XA-Wavenet-A', 'ar-XA-Wavenet-B', 'ar-XA-Wavenet-C'],
        azure: ['ar-SA-ZariyahNeural', 'ar-SA-HamedNeural', 'ar-EG-SalmaNeural', 'ar-EG-ShakirNeural']
      }
    };
  }
}