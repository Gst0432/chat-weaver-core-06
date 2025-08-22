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
    if (!this.startTime) return 0;
    
    if (this.mediaRecorder?.state === 'recording') {
      return Date.now() - this.startTime - this.totalPausedTime;
    } else if (this.mediaRecorder?.state === 'paused') {
      return this.pauseTime - this.startTime - this.totalPausedTime;
    }
    
    return 0;
  }

  private getCurrentSize(): number {
    return this.chunks.reduce((total, chunk) => total + chunk.size, 0);
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
      this.startTime = Date.now();
      this.totalPausedTime = 0;

      this.mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
          this.updateState();
        }
      });

      this.mediaRecorder.addEventListener('start', () => {
        this.updateState();
        // Start timer update
        this.intervalId = setInterval(() => {
          this.updateState();
        }, 100);
      });

      this.mediaRecorder.addEventListener('pause', () => {
        this.pauseTime = Date.now();
        this.updateState();
      });

      this.mediaRecorder.addEventListener('resume', () => {
        this.totalPausedTime += Date.now() - this.pauseTime;
        this.updateState();
      });

      this.mediaRecorder.addEventListener('stop', () => {
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
        this.updateState();
      });

      // Start recording with 100ms chunks for better responsiveness
      this.mediaRecorder.start(100);
      
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
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  static formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
      // Convert blob to base64
      const arrayBuffer = await recording.blob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      // Import Supabase client
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL!,
        import.meta.env.VITE_SUPABASE_ANON_KEY!
      );

      // Call the voice-to-text function
      const { data, error } = await supabase.functions.invoke('voice-to-text', {
        body: {
          audio: base64Audio
        }
      });

      if (error) {
        throw new Error(error.message || 'Erreur de transcription');
      }

      return data?.text || '';
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error('Impossible de transcrire l\'audio. Réessayez.');
    }
  }
}