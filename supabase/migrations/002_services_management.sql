
-- Cult Contour: Services Management
-- Run once in Supabase SQL Editor.

ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2);

ALTER TABLE public.services
ADD CONSTRAINT services_price_nonnegative
CHECK (price IS NULL OR price >= 0);

-- Permissions for the Node.js server's secret key.
GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE
ON TABLE public.services TO service_role;

-- Keep RLS enabled.
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Public browser clients must not modify services.
REVOKE INSERT, UPDATE, DELETE
ON TABLE public.services FROM anon, authenticated;

-- Frequently used catalog ordering.
CREATE INDEX IF NOT EXISTS idx_services_catalog
ON public.services (published, display_order, created_at);

-- Existing records remain unchanged.
SELECT id, slug, title, price, published, display_order
FROM public.services
ORDER BY display_order, created_at;
