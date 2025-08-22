import { supabase } from "@/integrations/supabase/client";

interface TranscriptionSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  language?: string;
}

interface TranslationSegment extends TranscriptionSegment {
  translatedText: string;
  targetLanguage: string;
  audioUrl?: string;
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

  async startSystemAudioCapture(
    sourceLang: string, 
    targetLang: string, 
    shouldGenerateVoice: boolean = false
  ): Promise<void> {
    try {
      // Request system audio capture permission
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          // @ts-ignore - some browsers support this
          mediaSource: 'system'
        }
      });

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.processAudioChunkWithTranslation(event.data, sourceLang, targetLang, shouldGenerateVoice);
        }
      };

      // Record in 3-second chunks
      this.mediaRecorder.start(3000);
    } catch (error) {
      console.error('Error starting system audio capture:', error);
      throw error;
    }
  }

  async startTranscriptionOnly(sourceLang: string): Promise<void> {
    try {
      // Request system audio capture permission
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          // @ts-ignore - some browsers support this
          mediaSource: 'system'
        }
      });

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.processAudioChunkTranscriptionOnly(event.data, sourceLang);
        }
      };

      // Record in 3-second chunks
      this.mediaRecorder.start(3000);
    } catch (error) {
      console.error('Error starting transcription-only audio capture:', error);
      throw error;
    }
  }

  async startMicrophoneTranscriptionOnly(sourceLang: string): Promise<void> {
    try {
      // Fallback to microphone if system audio isn't available
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.processAudioChunkTranscriptionOnly(event.data, sourceLang);
        }
      };

      // Record in 3-second chunks
      this.mediaRecorder.start(3000);
    } catch (error) {
      console.error('Error starting microphone transcription-only capture:', error);
      throw error;
    }
  }

  async startMicrophoneCapture(
    sourceLang: string, 
    targetLang: string, 
    shouldGenerateVoice: boolean = false
  ): Promise<void> {
    try {
      // Fallback to microphone if system audio isn't available
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.processAudioChunkWithTranslation(event.data, sourceLang, targetLang, shouldGenerateVoice);
        }
      };

      // Record in 3-second chunks
      this.mediaRecorder.start(3000);
    } catch (error) {
      console.error('Error starting microphone capture:', error);
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
          id: `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

  private async processAudioChunkTranscriptionOnly(audioChunk: Blob, sourceLang: string): Promise<void> {
    try {
      // Convert blob to base64
      const base64Audio = await this.blobToBase64(audioChunk);
      
      // Transcribe the chunk
      const text = await RealTimeTranscriptionService.transcribeAudioChunk(base64Audio);
      
      if (text.trim()) {
        const segment: TranscriptionSegment = {
          id: `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: text.trim(),
          startTime: Date.now(),
          endTime: Date.now() + 3000,
          language: sourceLang
        };
        
        this.segments.push(segment);
        
        // Emit transcription-only event
        window.dispatchEvent(new CustomEvent('transcription-only', { 
          detail: segment 
        }));
      }
    } catch (error) {
      console.error('Error processing transcription-only audio chunk:', error);
    }
  }

  async processAudioChunkWithTranslation(
    audioChunk: Blob, 
    sourceLang: string, 
    targetLang: string, 
    shouldGenerateVoice: boolean = false
  ): Promise<void> {
    try {
      // Convert blob to base64
      const base64Audio = await this.blobToBase64(audioChunk);
      
      // Transcribe the chunk
      const originalText = await RealTimeTranscriptionService.transcribeAudioChunk(base64Audio);
      
      if (originalText.trim()) {
        let translatedText = '';
        let audioUrl: string | null = null;

        // Translate if target language is different from source
        if (targetLang && sourceLang !== targetLang) {
          translatedText = await RealTimeTranscriptionService.translateText(
            originalText.trim(), 
            sourceLang, 
            targetLang
          );

          // Generate voice-over if requested
          if (shouldGenerateVoice && translatedText) {
            audioUrl = await RealTimeTranscriptionService.generateVoiceSegment(
              translatedText, 
              targetLang
            );
          }
        }

        const synchronizedSegment = {
          originalText: originalText.trim(),
          translatedText: translatedText || originalText.trim(),
          startTime: Date.now(),
          endTime: Date.now() + 3000,
          language: sourceLang,
          targetLanguage: targetLang,
          audioUrl
        };
        
        // Store the segment
        const segment: TranscriptionSegment = {
          id: `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          text: originalText.trim(),
          startTime: synchronizedSegment.startTime,
          endTime: synchronizedSegment.endTime,
          language: sourceLang
        };
        this.segments.push(segment);
        
        // Emit synchronized event with all data
        window.dispatchEvent(new CustomEvent('synchronized-transcription', { 
          detail: synchronizedSegment 
        }));
      }
    } catch (error) {
      console.error('Error processing audio chunk with translation:', error);
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

  async translateAllSegments(targetLang: string): Promise<TranslationSegment[]> {
    const translatedSegments: TranslationSegment[] = [];
    
    for (const segment of this.segments) {
      try {
        const translatedText = await RealTimeTranscriptionService.translateText(
          segment.text,
          segment.language || 'auto',
          targetLang
        );
        
        const translatedSegment: TranslationSegment = {
          ...segment,
          translatedText,
          targetLanguage: targetLang
        };
        
        translatedSegments.push(translatedSegment);
        
        // Emit progress event
        window.dispatchEvent(new CustomEvent('translation-progress', {
          detail: {
            current: translatedSegments.length,
            total: this.segments.length,
            segment: translatedSegment
          }
        }));
      } catch (error) {
        console.error('Error translating segment:', error);
        // Keep original text if translation fails
        translatedSegments.push({
          ...segment,
          translatedText: segment.text,
          targetLanguage: targetLang
        });
      }
    }
    
    return translatedSegments;
  }

  async generateFullVoiceover(translatedSegments: TranslationSegment[], targetLang: string): Promise<string | null> {
    try {
      // Combine all translated text
      const fullText = translatedSegments
        .map(segment => segment.translatedText)
        .join(' ');
      
      if (!fullText.trim()) return null;
      
      // Generate single audio file
      const audioUrl = await RealTimeTranscriptionService.generateVoiceSegment(fullText, targetLang);
      return audioUrl;
    } catch (error) {
      console.error('Error generating full voiceover:', error);
      return null;
    }
  }
}