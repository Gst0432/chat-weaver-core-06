import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EbookGeneration {
  id: string;
  title: string;
  author: string;
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

  // Poll for updates when generation is in progress
  useEffect(() => {
    if (!generationId || !generation) return;

    // Don't poll if generation is completed or failed
    if (generation.status === 'completed' || generation.status === 'failed') {
      return;
    }

    const interval = setInterval(() => {
      fetchGeneration(generationId);
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [generationId, generation?.status]);

  // Initial fetch
  useEffect(() => {
    if (generationId) {
      fetchGeneration(generationId);
    }
  }, [generationId]);

  // Real-time updates
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
          console.log('Generation update received:', payload);
          setGeneration(payload.new as EbookGeneration);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [generationId]);

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
    getStatusMessage,
    getEstimatedTimeRemaining,
    isCompleted: generation?.status === 'completed',
    isFailed: generation?.status === 'failed',
    isInProgress: generation && ['pending', 'generating_toc', 'generating_chapters', 'assembling'].includes(generation.status)
  };
}