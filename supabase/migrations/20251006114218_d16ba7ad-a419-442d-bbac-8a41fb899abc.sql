-- Fix waitlist table: Add UPDATE and DELETE policies restricted to admins only
CREATE POLICY "Only admins can update waitlist entries"
ON public.waitlist
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only admins can delete waitlist entries"
ON public.waitlist
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- Fix button_clicks table: Add policies for system INSERT and admin SELECT
CREATE POLICY "System can insert button clicks"
ON public.button_clicks
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Only admins can view button clicks"
ON public.button_clicks
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));