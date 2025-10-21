-- Create function to reset all user credits
CREATE OR REPLACE FUNCTION public.reset_all_user_credits()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  generations_used_before INTEGER,
  purchased_generations_before INTEGER,
  generations_used_after INTEGER,
  purchased_generations_after INTEGER
) AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all users and reset their credits
  FOR user_record IN 
    SELECT uc.user_id, uc.email, uc.generations_used, uc.purchased_generations
    FROM public.user_credits uc
  LOOP
    -- Update the user's credits
    UPDATE public.user_credits 
    SET 
      generations_used = 0,
      purchased_generations = 0,
      updated_at = NOW()
    WHERE user_credits.user_id = user_record.user_id;
    
    -- Return the before/after values
    RETURN QUERY SELECT 
      user_record.user_id,
      user_record.email,
      user_record.generations_used,
      user_record.purchased_generations,
      0::INTEGER,
      0::INTEGER;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
