import { supabase } from "@/integrations/supabase/client";

interface TranscriptionSegment {
  text: string;
  startTime: number;
  endTime: number;
  language?: string;
}

interface TranslationSegment extends TranscriptionSegment {
  translatedText: string;
  targetLanguage: string;
}

export class RealTimeTranscriptionService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private segments: TranscriptionSegment[] = [];

  static async transcribeAudioChunk(audioBase64: string): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: { audio: audioBase64 }
      });

      if (error) {
        throw new Error(`Transcription error: ${error.message}`);
      }

      return data.text || '';
    } catch (error) {
      console.error('Transcription chunk error:', error);
      return '';
    }
  }

  static async translateText(text: string, sourceLang: string, targetLang: string): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke('translate-text', {
        body: { text, sourceLang, targetLang }
      });

      if (error) {
        throw new Error(`Translation error: ${error.message}`);
      }

      return data.translatedText || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }

  static async generateVoiceSegment(text: string, language: string): Promise<string | null> {
    try {
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

      if (error || !data.audioContent) {
        throw new Error('Voice generation failed');
      }

      // Convert base64 to blob URL
      const audioBlob = this.base64ToBlob(data.audioContent, 'audio/mpeg');
      return URL.createObjectURL(audioBlob);
    } catch (error) {
      console.error('Voice generation error:', error);
      return null;
    }
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

  async startCapturingFromElement(audioElement: HTMLAudioElement): Promise<void> {
    try {
      // Create audio context to capture from video/audio element
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaElementSource(audioElement);
      const destination = this.audioContext.createMediaStreamDestination();
      
      source.connect(destination);
      source.connect(this.audioContext.destination); // Still play audio
      
      this.stream = destination.stream;
      
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.processAudioChunk(event.data);
        }
      };

      // Record in 3-second chunks
      this.mediaRecorder.start(3000);
    } catch (error) {
      console.error('Error starting audio capture:', error);
      throw error;
    }
  }

  private async processAudioChunk(audioChunk: Blob): Promise<void> {
    try {
      // Convert blob to base64
      const base64Audio = await this.blobToBase64(audioChunk);
      
      // Transcribe the chunk
      const text = await RealTimeTranscriptionService.transcribeAudioChunk(base64Audio);
      
      if (text.trim()) {
        const segment: TranscriptionSegment = {
          text: text.trim(),
          startTime: Date.now(), // In real implementation, use proper timing
          endTime: Date.now() + 3000,
        };
        
        this.segments.push(segment);
        
        // Emit event for real-time updates
        window.dispatchEvent(new CustomEvent('transcription-segment', { 
          detail: segment 
        }));
      }
    } catch (error) {
      console.error('Error processing audio chunk:', error);
    }
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:audio/webm;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  stop(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  getSegments(): TranscriptionSegment[] {
    return this.segments;
  }

  clearSegments(): void {
    this.segments = [];
  }
}