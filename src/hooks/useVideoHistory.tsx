import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface VideoHistoryItem {
  id: string;
  prompt: string;
  negative_prompt?: string;
  model: string;
  duration: number;
  cfg_scale: number;
  aspect_ratio: string;
  video_url: string;
  created_at: string;
}

export const useVideoHistory = () => {
  const [history, setHistory] = useState<VideoHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('video_history')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching video history:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique des vidéos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveToHistory = async (videoData: Omit<VideoHistoryItem, 'id' | 'created_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('video_history')
        .insert({
          user_id: user.id,
          ...videoData,
        });

      if (error) throw error;

      // Refresh history
      fetchHistory();
      
      toast({
        title: "Succès",
        description: "Vidéo sauvegardée dans l'historique",
      });
    } catch (error) {
      console.error('Error saving to history:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la vidéo",
        variant: "destructive",
      });
    }
  };

  const deleteFromHistory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('video_history')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setHistory(prev => prev.filter(item => item.id !== id));
      
      toast({
        title: "Succès",
        description: "Vidéo supprimée de l'historique",
      });
    } catch (error) {
      console.error('Error deleting from history:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la vidéo",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return {
    history,
    loading,
    saveToHistory,
    deleteFromHistory,
    refreshHistory: fetchHistory,
  };
};