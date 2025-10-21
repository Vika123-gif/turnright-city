-- Create user_credits table to store generation credits per user
CREATE TABLE public.user_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  generations_used INTEGER NOT NULL DEFAULT 0,
  free_generations INTEGER NOT NULL DEFAULT 2,
  purchased_generations INTEGER NOT NULL DEFAULT 0,
  feedback_given BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX idx_user_credits_email ON public.user_credits(email);

-- Enable Row Level Security
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own credits
CREATE POLICY "Users can view their own credits" 
ON public.user_credits 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy to allow users to update their own credits
CREATE POLICY "Users can update their own credits" 
ON public.user_credits 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own credits (first time)
CREATE POLICY "Users can create their own credits" 
ON public.user_credits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_credits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_credits_timestamp
BEFORE UPDATE ON public.user_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_user_credits_updated_at();

-- Create function to get or create user credits
CREATE OR REPLACE FUNCTION public.get_or_create_user_credits(p_user_id UUID, p_email TEXT)
RETURNS public.user_credits AS $$
DECLARE
  credits_record public.user_credits;
BEGIN
  -- Try to get existing credits
  SELECT * INTO credits_record
  FROM public.user_credits
  WHERE user_id = p_user_id;
  
  -- If not found, create new record
  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id, email, generations_used, free_generations, purchased_generations, feedback_given)
    VALUES (p_user_id, p_email, 0, 2, 0, false)
    RETURNING * INTO credits_record;
  END IF;
  
  RETURN credits_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

