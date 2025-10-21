-- Create function to update user credits to new schema
CREATE OR REPLACE FUNCTION public.update_user_credits_schema(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Update the user's credits to new schema
  UPDATE public.user_credits 
  SET 
    free_generations = 2,
    generations_used = CASE 
      WHEN generations_used > 2 THEN 2  -- Cap at 2 if more than 2 were used
      ELSE generations_used 
    END,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Return updated record
  SELECT to_json(uc) INTO result
  FROM public.user_credits uc
  WHERE uc.user_id = p_user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update all existing users to new schema
UPDATE public.user_credits 
SET 
  free_generations = 2,
  generations_used = CASE 
    WHEN generations_used > 2 THEN 2
    ELSE generations_used 
  END,
  updated_at = now()
WHERE free_generations = 1;
