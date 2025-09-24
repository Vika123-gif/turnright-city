-- Add user_id column to saved_routes table to link routes to authenticated users
ALTER TABLE public.saved_routes 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing records to maintain functionality during transition
-- Note: Existing records will have user_id as NULL until users re-save routes with authentication

-- Drop the insecure RLS policies
DROP POLICY "Users can view their own saved routes" ON public.saved_routes;
DROP POLICY "Users can create saved routes" ON public.saved_routes;
DROP POLICY "Users can update their own saved routes" ON public.saved_routes;
DROP POLICY "Users can delete their own saved routes" ON public.saved_routes;

-- Create secure RLS policies that require authentication and user ownership
CREATE POLICY "Users can view only their own saved routes" 
ON public.saved_routes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create their own routes" 
ON public.saved_routes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update only their own saved routes" 
ON public.saved_routes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete only their own saved routes" 
ON public.saved_routes 
FOR DELETE 
USING (auth.uid() = user_id);