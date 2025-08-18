-- First, create an admin role system for secure access to analytics
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = user_uuid
      AND role = 'admin'
  );
$$;

-- Create policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Now fix the analytics tables RLS policies
-- Drop existing overly permissive policies

-- location_exits
DROP POLICY IF EXISTS "Allow all operations on location_exits" ON public.location_exits;
CREATE POLICY "Allow app to insert location exits"
ON public.location_exits
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Only admins can view location exits"
ON public.location_exits
FOR SELECT
USING (public.is_admin());

-- user_feedback  
DROP POLICY IF EXISTS "Allow anonymous select for user_feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Allow authenticated select for user_feedback" ON public.user_feedback;
DROP POLICY IF EXISTS "Allow all inserts for user_feedback" ON public.user_feedback;

CREATE POLICY "Allow app to insert user feedback"
ON public.user_feedback
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Only admins can view user feedback"
ON public.user_feedback
FOR SELECT
USING (public.is_admin());

-- route_purchases
DROP POLICY IF EXISTS "Allow anonymous select for route_purchases" ON public.route_purchases;
DROP POLICY IF EXISTS "Allow authenticated select for route_purchases" ON public.route_purchases;
DROP POLICY IF EXISTS "Allow all inserts for route_purchases" ON public.route_purchases;

CREATE POLICY "Allow app to insert route purchases"
ON public.route_purchases
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Only admins can view route purchases"
ON public.route_purchases
FOR SELECT
USING (public.is_admin());

-- buy_button_clicks
DROP POLICY IF EXISTS "Allow anonymous select for buy_button_clicks" ON public.buy_button_clicks;
DROP POLICY IF EXISTS "Allow authenticated select for buy_button_clicks" ON public.buy_button_clicks;
DROP POLICY IF EXISTS "Allow all inserts for buy_button_clicks" ON public.buy_button_clicks;

CREATE POLICY "Allow app to insert buy button clicks"
ON public.buy_button_clicks
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Only admins can view buy button clicks"
ON public.buy_button_clicks
FOR SELECT
USING (public.is_admin());

-- route_generations
DROP POLICY IF EXISTS "Allow anonymous select for route_generations" ON public.route_generations;
DROP POLICY IF EXISTS "Allow authenticated select for route_generations" ON public.route_generations;
DROP POLICY IF EXISTS "Allow all inserts for route_generations" ON public.route_generations;

CREATE POLICY "Allow app to insert route generations"
ON public.route_generations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Only admins can view route generations"
ON public.route_generations
FOR SELECT
USING (public.is_admin());

-- visitor_sessions
DROP POLICY IF EXISTS "Allow all operations on visitor_sessions" ON public.visitor_sessions;

CREATE POLICY "Allow app to manage visitor sessions"
ON public.visitor_sessions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow app to update visitor sessions"
ON public.visitor_sessions
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Only admins can view visitor sessions"
ON public.visitor_sessions
FOR SELECT
USING (public.is_admin());

-- Insert first admin user (you'll need to update this with actual user ID after authentication is set up)
-- This is commented out as no auth users exist yet
-- INSERT INTO public.user_roles (user_id, role) 
-- VALUES ('your-user-id-here', 'admin');