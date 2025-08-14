import { supabase } from "@/integrations/supabase/client";

export interface RunwayVideoOptions {
  prompt: string;
  image?: string;
  duration?: number;
  quality?: 'high' | 'standard';
  cameraControls?: {
    pan?: 'left' | 'right' | 'none';
    tilt?: 'up' | 'down' | 'none';  
    zoom?: 'in' | 'out' | 'none';
  };
}

export interface RunwayVideoResult {
  taskId: string;
  status: 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  progress?: number;
  error?: string;
  provider: 'runwayml';
  model: 'gen3a_turbo';
}

export class RunwayService {
  
  static async generateVideo(options: RunwayVideoOptions): Promise<RunwayVideoResult> {
    try {
      console.log("🎬 Démarrage génération vidéo RunwayML:", options);
      
      const { data, error } = await supabase.functions.invoke('runwayml-video', {
        body: {
          prompt: options.prompt,
          image: options.image,
          duration: options.duration || 10,
          quality: options.quality || 'high',
          cameraControls: options.cameraControls
        }
      });

      if (error) {
        console.error("❌ Erreur RunwayML génération:", error);
        throw new Error(`Erreur RunwayML: ${error.message}`);
      }

      return {
        taskId: data.taskId,
        status: 'processing',
        provider: 'runwayml',
        model: 'gen3a_turbo'
      };
      
    } catch (error) {
      console.error("❌ Erreur service RunwayML:", error);
      throw error;
    }
  }

  static async checkVideoStatus(taskId: string): Promise<RunwayVideoResult> {
    try {
      const { data, error } = await supabase.functions.invoke('runwayml-status', {
        body: { taskId }
      });

      if (error) {
        console.error("❌ Erreur statut RunwayML:", error);
        throw new Error(`Erreur statut: ${error.message}`);
      }

      return {
        taskId,
        status: data.status,
        videoUrl: data.videoUrl,
        progress: data.progress,
        error: data.error,
        provider: 'runwayml',
        model: 'gen3a_turbo'
      };
      
    } catch (error) {
      console.error("❌ Erreur check statut RunwayML:", error);
      throw error;
    }
  }

  static async pollVideoUntilComplete(taskId: string, maxAttempts: number = 60): Promise<RunwayVideoResult> {
    console.log(`🔄 Polling RunwayML task ${taskId}...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.checkVideoStatus(taskId);
        
        console.log(`📊 Tentative ${attempt}/${maxAttempts} - Statut: ${result.status}`);
        
        if (result.status === 'completed' && result.videoUrl) {
          console.log("✅ Vidéo RunwayML prête:", result.videoUrl);
          return result;
        }
        
        if (result.status === 'failed') {
          throw new Error(result.error || 'Génération vidéo échouée');
        }
        
        // Attendre avant le prochain check (5 secondes)
        await new Promise(resolve => setTimeout(resolve, 5000));
        
      } catch (error) {
        console.error(`❌ Erreur polling tentative ${attempt}:`, error);
        if (attempt === maxAttempts) throw error;
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    throw new Error('Timeout: La génération vidéo prend trop de temps');
  }

  static isVideoRequest(message: string): boolean {
    const videoKeywords = [
      'vidéo', 'video', 'film', 'clip', 'animation', 'séquence',
      'génère une vidéo', 'crée une vidéo', 'fais une vidéo',
      'video of', 'create video', 'generate video', 'make video'
    ];
    
    return videoKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  static parseVideoRequest(message: string): Partial<RunwayVideoOptions> {
    const options: Partial<RunwayVideoOptions> = {};
    
    // Parse durée
    const durationMatch = message.match(/(\d+)\s*(secondes?|sec|s)/i);
    if (durationMatch) {
      const duration = parseInt(durationMatch[1]);
      options.duration = Math.min(Math.max(duration, 5), 10); // 5-10 secondes
    }
    
    // Parse qualité
    if (message.match(/haute\s*qualité|high\s*quality|hd|4k/i)) {
      options.quality = 'high';
    }
    
    // Parse contrôles caméra
    const cameraControls: any = {};
    if (message.match(/pan\s*left|gauche/i)) cameraControls.pan = 'left';
    if (message.match(/pan\s*right|droite/i)) cameraControls.pan = 'right';
    if (message.match(/tilt\s*up|haut/i)) cameraControls.tilt = 'up';
    if (message.match(/tilt\s*down|bas/i)) cameraControls.tilt = 'down';
    if (message.match(/zoom\s*in|rapprocher/i)) cameraControls.zoom = 'in';
    if (message.match(/zoom\s*out|éloigner/i)) cameraControls.zoom = 'out';
    
    if (Object.keys(cameraControls).length > 0) {
      options.cameraControls = cameraControls;
    }
    
    return options;
  }
}