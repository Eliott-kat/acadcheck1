-- Add original_text column to analyses table to store the full original text
ALTER TABLE public.analyses 
ADD COLUMN original_text TEXT;