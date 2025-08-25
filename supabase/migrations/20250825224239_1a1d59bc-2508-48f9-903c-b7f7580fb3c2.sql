-- Clean up blocked pending generations
UPDATE public.ebook_generations 
SET 
  status = 'failed', 
  error_message = 'Génération interrompue - correction erreur technique',
  completed_at = now(),
  updated_at = now()
WHERE status = 'pending' 
  AND created_at < now() - interval '1 minute';