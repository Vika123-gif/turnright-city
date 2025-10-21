-- Update all users to have consistent credit system
-- All users should have 2 free generations + their purchased generations

-- First, update all users to have 2 free generations
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

-- Check the results
SELECT 
  user_id, 
  email, 
  free_generations, 
  purchased_generations, 
  generations_used,
  (free_generations + COALESCE(purchased_generations, 0)) as total_available,
  (free_generations + COALESCE(purchased_generations, 0) - generations_used) as remaining
FROM public.user_credits 
ORDER BY created_at DESC;
