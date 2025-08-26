import { supabase } from '@/integrations/supabase/client';

export interface KlingVideoParams {
  mode: 'text-to-video' | 'image-to-video';
  prompt: string;
  negativePrompt?: string;
  duration: 5 | 10;
  aspectRatio: '16:9' | '9:16' | '1:1';
  imageUrl?: string;
}

export interface KlingVideoResult {
  taskId: string;
  videoUrl?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimatedTime?: number;
  errorMessage?: string;
}

export class KlingAIService {
  private static instance: KlingAIService;

  static getInstance(): KlingAIService {
    if (!KlingAIService.instance) {
      KlingAIService.instance = new KlingAIService();
    }
    return KlingAIService.instance;
  }

  async generateVideo(params: KlingVideoParams): Promise<KlingVideoResult> {
    try {
      const { data, error } = await supabase.functions.invoke('kling-official-video', {
        body: {
          mode: params.mode,
          prompt: params.prompt,
          negative_prompt: params.negativePrompt,
          duration: params.duration,
          aspect_ratio: params.aspectRatio,
          image_url: params.imageUrl
        }
      });

      if (error) {
        throw new Error(error.message || 'Erreur lors de la génération vidéo');
      }

      return {
        taskId: data.task_id,
        videoUrl: data.video_url,
        status: data.status || 'pending',
        estimatedTime: data.estimated_time,
        errorMessage: data.error_message
      };
    } catch (error) {
      console.error('Erreur KlingAI Service:', error);
      throw new Error(error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }

  async checkTaskStatus(taskId: string): Promise<KlingVideoResult> {
    try {
      const { data, error } = await supabase.functions.invoke('kling-official-video', {
        body: {
          action: 'check_status',
          task_id: taskId
        }
      });

      if (error) {
        throw new Error(error.message || 'Erreur lors de la vérification du statut');
      }

      return {
        taskId: data.task_id,
        videoUrl: data.video_url,
        status: data.status,
        estimatedTime: data.estimated_time,
        errorMessage: data.error_message
      };
    } catch (error) {
      console.error('Erreur vérification statut:', error);
      throw new Error(error instanceof Error ? error.message : 'Erreur inconnue');
    }
  }

  getAspectRatioDisplay(aspectRatio: string): string {
    switch (aspectRatio) {
      case '16:9':
        return 'Paysage (16:9)';
      case '9:16':
        return 'Portrait (9:16)';
      case '1:1':
        return 'Carré (1:1)';
      default:
        return aspectRatio;
    }
  }

  getAspectRatioDimensions(aspectRatio: string): { width: number; height: number } {
    switch (aspectRatio) {
      case '16:9':
        return { width: 1280, height: 720 };
      case '9:16':
        return { width: 720, height: 1280 };
      case '1:1':
        return { width: 1024, height: 1024 };
      default:
        return { width: 1280, height: 720 };
    }
  }
}

export const klingAIService = KlingAIService.getInstance();