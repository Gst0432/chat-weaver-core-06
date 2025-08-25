-- Add cover image support to ebooks table
ALTER TABLE public.ebooks ADD COLUMN cover_image_url text;