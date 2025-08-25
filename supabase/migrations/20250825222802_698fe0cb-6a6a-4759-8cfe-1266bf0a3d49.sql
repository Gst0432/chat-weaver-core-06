-- Clean up blocked ebook generations
UPDATE public.ebook_generations 
SET 
  status = 'failed', 
  error_message = 'Generation interrompue (nettoyage automatique - timeout détecté)',
  completed_at = now(),
  updated_at = now()
WHERE status IN ('generating_chapters', 'generating_toc', 'assembling', 'pending') 
  AND created_at < now() - interval '3 minutes';