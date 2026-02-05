-- Add permissions field to profiles for granular access control
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- Example permissions: ['manage_inventory', 'view_reports', 'manage_recipes', etc.]
-- Admin can grant these to any staff member

COMMENT ON COLUMN public.profiles.permissions IS 'Array of permission strings for granular access control';
