-- Fix the security function with proper search path
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  -- Return false immediately if no user is authenticated
  SELECT CASE 
    WHEN user_uuid IS NULL THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = user_uuid
        AND role = 'admin'
    )
  END;
$$;

-- Fix visitor_sessions policies to properly restrict access
DROP POLICY IF EXISTS "Allow app to manage visitor sessions" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Allow app to update visitor sessions" ON public.visitor_sessions;
DROP POLICY IF EXISTS "Only admins can view visitor sessions" ON public.visitor_sessions;

-- Create secure policies that only allow service-level operations and admin viewing
CREATE POLICY "System can insert visitor sessions"
ON public.visitor_sessions
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "System can update visitor sessions"
ON public.visitor_sessions
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Only authenticated admins can view visitor sessions"
ON public.visitor_sessions
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND public.is_admin(auth.uid())
);

-- Also fix all other analytics tables to be more secure
-- location_exits
DROP POLICY IF EXISTS "Allow app to insert location exits" ON public.location_exits;
CREATE POLICY "System can insert location exits"
ON public.location_exits
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Only authenticated admins can view location exits"
ON public.location_exits
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND public.is_admin(auth.uid())
);

-- user_feedback
DROP POLICY IF EXISTS "Allow app to insert user feedback" ON public.user_feedback;
CREATE POLICY "System can insert user feedback"
ON public.user_feedback
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Only authenticated admins can view user feedback"
ON public.user_feedback
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND public.is_admin(auth.uid())
);

-- route_purchases
DROP POLICY IF EXISTS "Allow app to insert route purchases" ON public.route_purchases;
CREATE POLICY "System can insert route purchases"
ON public.route_purchases
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Only authenticated admins can view route purchases"
ON public.route_purchases
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND public.is_admin(auth.uid())
);

-- buy_button_clicks
DROP POLICY IF EXISTS "Allow app to insert buy button clicks" ON public.buy_button_clicks;
CREATE POLICY "System can insert buy button clicks"
ON public.buy_button_clicks
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Only authenticated admins can view buy button clicks"
ON public.buy_button_clicks
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND public.is_admin(auth.uid())
);

-- route_generations
DROP POLICY IF EXISTS "Allow app to insert route generations" ON public.route_generations;
CREATE POLICY "System can insert route generations"
ON public.route_generations
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Only authenticated admins can view route generations"
ON public.route_generations
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND public.is_admin(auth.uid())
);