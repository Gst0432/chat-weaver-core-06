import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface QuotaInfo {
  can_generate: boolean;
  is_subscribed: boolean;
  free_used: number;
  free_limit: number;
  remaining_free: number;
}

export const useQuota = () => {
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const checkQuota = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc('check_free_generation_quota', {
        user_email: user.email
      });

      if (error) {
        console.error('Error checking quota:', error);
        return;
      }

      setQuota(data as unknown as QuotaInfo);
    } catch (error) {
      console.error('Error in checkQuota:', error);
    } finally {
      setLoading(false);
    }
  };

  const incrementUsage = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) return false;

      const { data, error } = await supabase.rpc('increment_free_generation', {
        user_email: user.email
      });

      if (error) {
        console.error('Error incrementing usage:', error);
        return false;
      }

      // Refresh quota after increment
      await checkQuota();
      return data as unknown as boolean;
    } catch (error) {
      console.error('Error in incrementUsage:', error);
      return false;
    }
  };

  useEffect(() => {
    checkQuota();
  }, []);

  return {
    quota,
    loading,
    checkQuota,
    incrementUsage,
    isTestMode: !quota?.is_subscribed,
    canGenerate: quota?.can_generate || false
  };
};