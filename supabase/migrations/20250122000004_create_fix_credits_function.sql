-- Create function to fix credit consistency for all users
CREATE OR REPLACE FUNCTION public.fix_all_user_credits()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Update all users to have 2 free generations
  UPDATE public.user_credits 
  SET 
    free_generations = 2,
    updated_at = now()
  WHERE free_generations != 2;
  
  -- Reset generation count for users who have used more than their total available
  UPDATE public.user_credits 
  SET 
    generations_used = CASE 
      WHEN generations_used > (2 + COALESCE(purchased_generations, 0)) 
      THEN (2 + COALESCE(purchased_generations, 0))
      ELSE generations_used 
    END,
    updated_at = now()
  WHERE generations_used > (2 + COALESCE(purchased_generations, 0));
  
  -- Return summary of all users
  SELECT json_agg(
    json_build_object(
      'user_id', user_id,
      'email', email,
      'free_generations', free_generations,
      'purchased_generations', purchased_generations,
      'generations_used', generations_used,
      'total_available', (free_generations + COALESCE(purchased_generations, 0)),
      'remaining', (free_generations + COALESCE(purchased_generations, 0) - generations_used)
    )
  ) INTO result
  FROM public.user_credits;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
