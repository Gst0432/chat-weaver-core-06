-- Nettoyer les générations bloquées en mode TOC depuis plus de 3 minutes
UPDATE public.ebook_generations 
SET 
  status = 'failed', 
  error_message = 'Génération bloquée - timeout API en mode rapide',
  completed_at = now(),
  updated_at = now()
WHERE status = 'generating_toc' 
  AND created_at < now() - interval '3 minutes';