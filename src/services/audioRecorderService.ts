export interface AudioRecording {
  id: string;
  blob: Blob;
  duration: number;
  size: number;
  createdAt: Date;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  size: number;
  currentRecording: AudioRecording | null;
}

export class AudioRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private startTime: number = 0;
  private pauseTime: number = 0;
  private totalPausedTime: number = 0;
  private intervalId: NodeJS.Timeout | null = null;
  
  private onStateChange: ((state: RecordingState) => void) | null = null;

  constructor(onStateChange?: (state: RecordingState) => void) {
    this.onStateChange = onStateChange || null;
  }

  setStateChangeCallback(callback: (state: RecordingState) => void) {
    this.onStateChange = callback;
  }

  private updateState() {
    if (this.onStateChange) {
      this.onStateChange({
        isRecording: this.mediaRecorder?.state === 'recording',
        isPaused: this.mediaRecorder?.state === 'paused',
        duration: this.getCurrentDuration(),
        size: this.getCurrentSize(),
        currentRecording: null
      });
    }
  }

  private getCurrentDuration(): number {
    if (!this.startTime || this.startTime <= 0) return 0;
    
    const now = performance.now();
    if (this.mediaRecorder?.state === 'recording') {
      return Math.max(0, now - this.startTime - this.totalPausedTime);
    } else if (this.mediaRecorder?.state === 'paused' && this.pauseTime > 0) {
      return Math.max(0, this.pauseTime - this.startTime - this.totalPausedTime);
    }
    
    return 0;
  }

  private getCurrentSize(): number {
    if (!this.chunks || this.chunks.length === 0) return 0;
    return this.chunks.reduce((total, chunk) => {
      return total + (chunk?.size || 0);
    }, 0);
  }

  async startRecording(): Promise<void> {
    try {
      console.log('🎤 Démarrage de l\'enregistrement...');
      
      // Request microphone access with enhanced settings
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 48000,  // Higher sample rate for better quality
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      console.log('🎵 Stream audio obtenu:', {
        audioTracks: this.stream.getAudioTracks().length,
        settings: this.stream.getAudioTracks()[0]?.getSettings()
      });

      // Test audio track
      const audioTrack = this.stream.getAudioTracks()[0];
      if (!audioTrack || !audioTrack.enabled) {
        throw new Error('Piste audio indisponible ou désactivée');
      }

      // Create MediaRecorder with optimal settings
      const options: MediaRecorderOptions = {};
      
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options.mimeType = 'audio/webm;codecs=opus';
        options.audioBitsPerSecond = 128000;
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = 'audio/webm';
        options.audioBitsPerSecond = 128000;
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options.mimeType = 'audio/mp4';
        options.audioBitsPerSecond = 128000;
      }
      
      console.log('📹 MediaRecorder options:', options);

      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.chunks = [];
      this.startTime = performance.now();
      this.totalPausedTime = 0;

      this.mediaRecorder.addEventListener('dataavailable', (event) => {
        console.log('📦 Données audio reçues:', event.data.size, 'bytes, type:', event.data.type);
        if (event.data.size > 0) {
          this.chunks.push(event.data);
          this.updateState();
        } else {
          console.warn('⚠️ Chunk vide reçu');
        }
      });

      this.mediaRecorder.addEventListener('error', (event) => {
        console.error('❌ Erreur MediaRecorder:', event);
      });

      this.mediaRecorder.addEventListener('start', () => {
        console.log('▶️ Enregistrement démarré');
        this.updateState();
        // Start timer update with more frequent updates
        this.intervalId = setInterval(() => {
          this.updateState();
        }, 50);
      });

      this.mediaRecorder.addEventListener('pause', () => {
        console.log('⏸️ Enregistrement en pause');
        this.pauseTime = performance.now();
        this.updateState();
      });

      this.mediaRecorder.addEventListener('resume', () => {
        console.log('▶️ Enregistrement repris');
        this.totalPausedTime += performance.now() - this.pauseTime;
        this.updateState();
      });

      this.mediaRecorder.addEventListener('stop', () => {
        console.log('⏹️ Enregistrement arrêté, chunks:', this.chunks.length);
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
        this.updateState();
      });

      // Start recording with 1000ms chunks for better transcription quality
      this.mediaRecorder.start(1000);
      
    } catch (error) {
      console.error('💥 Erreur lors du démarrage:', error);
      throw new Error(`Impossible de démarrer l'enregistrement: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  pauseRecording(): void {
    if (this.mediaRecorder?.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  resumeRecording(): void {
    if (this.mediaRecorder?.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }

  async stopRecording(): Promise<AudioRecording> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('Aucun enregistrement en cours'));
        return;
      }

      this.mediaRecorder.addEventListener('stop', () => {
        try {
          console.log('🎬 Création du blob final, chunks:', this.chunks.length);
          
          if (this.chunks.length === 0) {
            throw new Error('Aucune donnée audio enregistrée - vérifiez votre microphone');
          }
          
          // Log each chunk for debugging
          this.chunks.forEach((chunk, index) => {
            console.log(`📦 Chunk ${index + 1}:`, { size: chunk.size, type: chunk.type });
          });
          
          const blob = new Blob(this.chunks, { 
            type: this.mediaRecorder?.mimeType || 'audio/webm' 
          });
          
          console.log('📦 Blob créé:', {
            size: blob.size,
            type: blob.type,
            duration: this.getCurrentDuration()
          });
          
          if (blob.size === 0) {
            throw new Error('Fichier audio vide - l\'enregistrement a échoué');
          }

          const recording: AudioRecording = {
            id: Date.now().toString(),
            blob,
            duration: Math.max(this.getCurrentDuration(), 100), // Minimum 100ms
            size: blob.size,
            createdAt: new Date()
          };

          console.log('✅ Enregistrement terminé avec succès:', recording);
          this.cleanup();
          resolve(recording);
        } catch (error) {
          console.error('💥 Erreur lors de l\'arrêt:', error);
          this.cleanup();
          reject(error);
        }
      }, { once: true });

      this.mediaRecorder.stop();
    });
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        console.log('🛑 Arrêt de la piste:', track.kind, track.label);
        track.stop();
      });
      this.stream = null;
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.mediaRecorder = null;
    this.chunks = [];
    this.startTime = 0;
    this.pauseTime = 0;
    this.totalPausedTime = 0;
  }

  getState(): RecordingState {
    return {
      isRecording: this.mediaRecorder?.state === 'recording',
      isPaused: this.mediaRecorder?.state === 'paused',
      duration: this.getCurrentDuration(),
      size: this.getCurrentSize(),
      currentRecording: null
    };
  }

  // Utility methods
  static formatDuration(ms: number): string {
    if (!ms || isNaN(ms) || ms < 0) return '00:00';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  static formatSize(bytes: number): string {
    if (!bytes || isNaN(bytes) || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = bytes / Math.pow(k, i);
    return `${size.toFixed(1)} ${sizes[i]}`;
  }

  static downloadRecording(recording: AudioRecording, filename?: string): void {
    const url = URL.createObjectURL(recording.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `recording-${recording.id}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static async transcribeRecording(recording: AudioRecording, language?: string): Promise<string> {
    console.log('🎤 Début de transcription:', {
      id: recording.id,
      size: recording.blob.size,
      type: recording.blob.type,
      duration: recording.duration,
      language: language
    });
    
    try {
      // Check file size (limit to 25MB)
      const maxSize = 25 * 1024 * 1024;
      if (recording.blob.size > maxSize) {
        throw new Error('Fichier audio trop volumineux (max 25MB)');
      }

      if (recording.blob.size === 0) {
        throw new Error('Fichier audio vide - aucun contenu enregistré');
      }

      // Convert blob to base64 using chunk method to avoid stack overflow
      const arrayBuffer = await recording.blob.arrayBuffer();
      console.log('🎵 ArrayBuffer créé:', arrayBuffer.byteLength, 'bytes');
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('Données audio vides - l\'enregistrement n\'a pas fonctionné');
      }
      
      const base64Audio = this.convertToBase64Chunks(arrayBuffer);
      console.log('📦 Base64 converti:', base64Audio.length, 'caractères');

      // Use shared Supabase client instead of creating new instance
      const { supabase } = await import('@/integrations/supabase/client');

      // Call the voice-to-text function with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transcription timeout')), 60000)
      );

      const transcriptionPromise = supabase.functions.invoke('voice-to-text', {
        body: {
          audio: base64Audio,
          language: language
        }
      });

      const { data, error } = await Promise.race([transcriptionPromise, timeoutPromise]) as any;

      if (error) {
        console.error('❌ Erreur de transcription:', error);
        throw new Error(error.message || 'Erreur de transcription');
      }

      console.log('✅ Transcription réussie:', data?.text?.length || 0, 'caractères');
      return data?.text || '';
    } catch (error) {
      console.error('💥 Erreur dans transcribeRecording:', error);
      throw new Error(`Impossible de transcrire l'audio: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  private static convertToBase64Chunks(arrayBuffer: ArrayBuffer): string {
    const uint8Array = new Uint8Array(arrayBuffer);
    const chunkSize = 0x8000; // 32KB chunks to avoid stack overflow
    let result = '';
    
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      result += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    return btoa(result);
  }
}