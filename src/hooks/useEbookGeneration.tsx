import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EbookGeneration {
  id: string;
  title: string;
  author: string;
  prompt?: string;
  model?: string;
  template?: string;
  status: 'pending' | 'generating_toc' | 'generating_chapters' | 'assembling' | 'completed' | 'failed';
  progress: number;
  current_chapter: number;
  total_chapters: number;
  generated_chapters: number;
  error_message?: string;
  ebook_id?: string;
  created_at: string;
  completed_at?: string;
}

export function useEbookGeneration(generationId?: string) {
  const [generation, setGeneration] = useState<EbookGeneration | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGeneration = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('ebook_generations')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      
      setGeneration(data as EbookGeneration);
    } catch (err: any) {
      console.error('Error fetching generation:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Check for stalled generations (zombie detection)
  const checkForStalledGeneration = () => {
    if (!generation) return false;
    
    const now = Date.now();
    const createdAt = new Date(generation.created_at).getTime();
    const elapsedMinutes = (now - createdAt) / (1000 * 60);
    
    // Consider generation stalled if:
    // - In progress for more than 15 minutes
    // - Or stuck at same progress for more than 5 minutes with no chapter progress
    const isStalled = (
      (['pending', 'generating_toc', 'generating_chapters', 'assembling'].includes(generation.status)) &&
      elapsedMinutes > 15
    );
    
    return isStalled;
  };

  // Retry failed generation
  const retryGeneration = async () => {
    if (!generation) return;
    
    try {
      setError(null);
      await supabase.from('ebook_generations').update({
        status: 'pending',
        progress: 0,
        current_chapter: 0,
        generated_chapters: 0,
        error_message: null
      }).eq('id', generation.id);
      
      // Trigger a new generation by calling the edge function
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Authentication required');
      }

      const response = await supabase.functions.invoke('generate-ebook', {
        body: {
          prompt: generation.prompt,
          title: generation.title,
          author: generation.author,
          model: generation.model,
          template: generation.template
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        }
      });

      if (response.error) {
        throw response.error;
      }
      
    } catch (err: any) {
      console.error('Error retrying generation:', err);
      setError(err.message);
    }
  };

  // Cancel ongoing generation
  const cancelGeneration = async () => {
    if (!generation) return;
    
    try {
      setError(null);
      await supabase.from('ebook_generations').update({
        status: 'failed',
        error_message: 'Génération annulée par l\'utilisateur'
      }).eq('id', generation.id);
      
    } catch (err: any) {
      console.error('Error canceling generation:', err);
      setError(err.message);
    }
  };

  // Real-time updates - replaced polling for better scalability
  useEffect(() => {
    if (!generationId) return;

    const channel = supabase
      .channel(`ebook-generation-${generationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ebook_generations',
          filter: `id=eq.${generationId}`
        },
        (payload) => {
          console.log('🔄 Generation update received:', payload);
          setGeneration(payload.new as EbookGeneration);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ebook_chapters',
          filter: `generation_id=eq.${generationId}`
        },
        (payload) => {
          console.log('📝 New chapter saved:', payload);
          // Trigger a refresh to get updated counts
          fetchGeneration(generationId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [generationId]);

  // Initial fetch
  useEffect(() => {
    if (generationId) {
      fetchGeneration(generationId);
    }
  }, [generationId]);

  // Get partial content for failed/stalled generations
  const getPartialContent = async () => {
    if (!generation) return null;
    
    try {
      const { data } = await supabase.functions.invoke('resume-ebook-generation', {
        body: {
          generation_id: generation.id,
          action: 'get_partial_content'
        }
      });
      return data;
    } catch (error) {
      console.error('Error getting partial content:', error);
      return null;
    }
  };

  // Save partial content as ebook
  const savePartialContent = async () => {
    if (!generation) return false;
    
    try {
      const { data } = await supabase.functions.invoke('resume-ebook-generation', {
        body: {
          generation_id: generation.id,
          action: 'save_partial_ebook'
        }
      });
      return data;
    } catch (error) {
      console.error('Error saving partial content:', error);
      return false;
    }
  };

  // Resume generation from where it left off
  const resumeFromCheckpoint = async () => {
    if (!generation) return;
    
    try {
      setError(null);
      await supabase.functions.invoke('resume-ebook-generation', {
        body: {
          generation_id: generation.id,
          action: 'resume'
        }
      });
    } catch (err: any) {
      console.error('Error resuming generation:', err);
      setError(err.message);
    }
  };

  const getStatusMessage = () => {
    if (!generation) return '';

    switch (generation.status) {
      case 'pending':
        return 'Préparation de la génération...';
      case 'generating_toc':
        return 'Création de la table des matières...';
      case 'generating_chapters':
        return `Génération des chapitres (${generation.generated_chapters}/${generation.total_chapters})...`;
      case 'assembling':
        return 'Assemblage final de l\'ebook...';
      case 'completed':
        return 'Génération terminée avec succès !';
      case 'failed':
        return `Erreur: ${generation.error_message}`;
      default:
        return 'Statut inconnu';
    }
  };

  const getEstimatedTimeRemaining = () => {
    if (!generation || generation.status === 'completed' || generation.status === 'failed') {
      return null;
    }

    const elapsedTime = Date.now() - new Date(generation.created_at).getTime();
    const elapsedMinutes = elapsedTime / (1000 * 60);
    
    if (generation.progress === 0) return '5-8 minutes';
    
    const estimatedTotalMinutes = (elapsedMinutes / generation.progress) * 100;
    const remainingMinutes = Math.max(0, estimatedTotalMinutes - elapsedMinutes);
    
    if (remainingMinutes < 1) return 'Moins d\'une minute';
    if (remainingMinutes < 60) return `${Math.round(remainingMinutes)} minutes`;
    
    const hours = Math.floor(remainingMinutes / 60);
    const mins = Math.round(remainingMinutes % 60);
    return `${hours}h ${mins}m`;
  };

  return {
    generation,
    loading,
    error,
    fetchGeneration,
    retryGeneration,
    cancelGeneration,
    checkForStalledGeneration,
    getStatusMessage,
    getEstimatedTimeRemaining,
    getPartialContent,
    savePartialContent,
    resumeFromCheckpoint,
    isCompleted: generation?.status === 'completed',
    isFailed: generation?.status === 'failed',
    isInProgress: generation && ['pending', 'generating_toc', 'generating_chapters', 'assembling'].includes(generation.status),
    isStalled: checkForStalledGeneration()
  };
}