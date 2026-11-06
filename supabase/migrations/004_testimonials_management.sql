
-- Cult Contour: Testimonials Management

ALTER TABLE public.testimonials
ENABLE ROW LEVEL SECURITY;

-- Only the Node.js backend service role can modify reviews.
GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE
ON public.testimonials TO service_role;

-- Prevent direct browser-side modifications.
REVOKE INSERT, UPDATE, DELETE
ON public.testimonials FROM anon, authenticated;

-- Efficient public testimonial ordering.
CREATE INDEX IF NOT EXISTS
idx_testimonials_published_order
ON public.testimonials (
  published,
  display_order,
  created_at
);

-- Verify existing records.
SELECT
  id,
  author,
  quote,
  context,
  published,
  display_order
FROM public.testimonials
ORDER BY display_order, created_at;
