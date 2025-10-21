-- Reset all user credits to give everyone fresh free credits
-- This will reset generations_used to 0 and purchased_generations to 0 for all users

-- Reset generations_used to 0 for all users
UPDATE user_credits 
SET 
  generations_used = 0,
  purchased_generations = 0,
  updated_at = NOW()
WHERE generations_used > 0 OR purchased_generations > 0;

-- Show summary of reset
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN generations_used = 0 THEN 1 END) as users_with_0_used,
  COUNT(CASE WHEN purchased_generations = 0 THEN 1 END) as users_with_0_purchased
FROM user_credits;
