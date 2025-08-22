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
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Create MediaRecorder with optimal settings
      const options = {
        mimeType: 'audio/webm;codecs=opus'
      };
      
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        // Fallback to mp4 if webm is not supported
        options.mimeType = 'audio/mp4';
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.chunks = [];
      this.startTime = performance.now();
      this.totalPausedTime = 0;

      this.mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
          this.updateState();
        }
      });

      this.mediaRecorder.addEventListener('start', () => {
        this.updateState();
        // Start timer update with more frequent updates
        this.intervalId = setInterval(() => {
          this.updateState();
        }, 50);
      });

      this.mediaRecorder.addEventListener('pause', () => {
        this.pauseTime = performance.now();
        this.updateState();
      });

      this.mediaRecorder.addEventListener('resume', () => {
        this.totalPausedTime += performance.now() - this.pauseTime;
        this.updateState();
      });

      this.mediaRecorder.addEventListener('stop', () => {
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
        this.updateState();
      });

      // Start recording with 1000ms chunks for better transcription quality
      this.mediaRecorder.start(1000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error('Impossible d\'accéder au microphone. Vérifiez les permissions.');
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
        const blob = new Blob(this.chunks, { 
          type: this.mediaRecorder?.mimeType || 'audio/webm' 
        });
        
        const recording: AudioRecording = {
          id: Date.now().toString(),
          blob,
          duration: this.getCurrentDuration(),
          size: blob.size,
          createdAt: new Date()
        };

        // Cleanup
        this.cleanup();
        
        resolve(recording);
      });

      this.mediaRecorder.stop();
    });
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
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

  static async transcribeRecording(recording: AudioRecording): Promise<string> {
    try {
      // Check file size (limit to 25MB)
      const maxSize = 25 * 1024 * 1024;
      if (recording.blob.size > maxSize) {
        throw new Error('Fichier audio trop volumineux (max 25MB)');
      }

      // Convert blob to base64 using chunk method to avoid stack overflow
      const arrayBuffer = await recording.blob.arrayBuffer();
      const base64Audio = this.convertToBase64Chunks(arrayBuffer);

      // Import Supabase client
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        'https://jeurznrjcohqbevrzses.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpldXJ6bnJqY29ocWJldnJ6c2VzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3MDAyMTgsImV4cCI6MjA3MDI3NjIxOH0.0lLgSsxohxeWN3d4ZKmlNiMyGDj2L7K8XRAwMq9zaaI'
      );

      // Call the voice-to-text function with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Transcription timeout')), 60000)
      );

      const transcriptionPromise = supabase.functions.invoke('voice-to-text', {
        body: {
          audio: base64Audio
        }
      });

      const { data, error } = await Promise.race([transcriptionPromise, timeoutPromise]) as any;

      if (error) {
        throw new Error(error.message || 'Erreur de transcription');
      }

      return data?.text || '';
    } catch (error) {
      console.error('Transcription error:', error);
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