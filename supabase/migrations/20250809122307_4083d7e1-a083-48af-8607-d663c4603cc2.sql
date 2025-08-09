-- Add columns to subscribers table for tracking minutes
ALTER TABLE public.subscribers 
ADD COLUMN minutes_balance integer DEFAULT 0,
ADD COLUMN total_minutes_purchased integer DEFAULT 0;

-- Create table for minute purchases
CREATE TABLE public.minute_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  email text NOT NULL,
  minutes integer NOT NULL,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'XOF',
  payment_reference text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.minute_purchases ENABLE ROW LEVEL SECURITY;

-- Create policies for minute purchases
CREATE POLICY "Users can view their minute purchases" 
ON public.minute_purchases 
FOR SELECT 
USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "System can insert minute purchases" 
ON public.minute_purchases 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update minute purchases" 
ON public.minute_purchases 
FOR UPDATE 
USING (true);