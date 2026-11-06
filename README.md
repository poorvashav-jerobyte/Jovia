# Cult Contour — maintainable React + Node.js + Supabase starter

This is a fresh, readable TypeScript implementation built around the **120 valid original brush frames** and the original saved webpage's layout styles. The original compiled bundle is **not** executed. Use source/brand assets only if you have the rights to use them.

## Structure

```text
apps/
  web/                  React 19, Vite, TypeScript (port 5174)
    src/components/     BrushHero, Header, Footer, Contact
    src/lib/            typed API client, local content fallbacks
    src/original.css    original saved homepage design CSS
    src/styles.css      focused compatibility and form styling
    public/brush/       120 original PNG animation frames
    public/pictures/    saved website photography
  api/                  Express + TypeScript (port 4000)
    src/server.ts       public content API, inquiries, protected admin endpoints
supabase/migrations/    PostgreSQL schema, policies and seed service data
```

## Start locally

1. Install Node.js 20+.
2. Run `npm install` in project root.
3. Copy `apps/api/.env.example` to `apps/api/.env`; add Supabase project URL and **service role** key.
4. In Supabase SQL editor, run `supabase/migrations/001_init.sql` once.
5. Run `npm run dev` at the project root.
6. Open http://localhost:5174/ (API health: http://localhost:4000/api/health).

The homepage can preview without Supabase using built-in content, but **the booking form will not falsely claim success** until Supabase is configured. Do not put the service role key in Vite env variables, frontend code, or git.

## Initial admin setup

1. Enable Supabase Auth and create an admin account in the Supabase dashboard (never publish admin credentials).
2. Run in the SQL editor: `insert into public.admin_users(user_id) values ('<your-auth-user-uuid>');`.
3. Authenticate with Supabase Auth to obtain a JWT. Protected API endpoints accept `Authorization: Bearer <access_token>`.
4. Admin endpoints: `GET /api/admin/inquiries`, `PATCH /api/admin/inquiries/:id` with `{ "status": "contacted" }`.

An admin visual dashboard, custom domain, email notifications, payment gateway, and image CMS are **not** included yet. These need separately reviewed workflows and production configuration.

## Notes on scroll animation

`BrushHero.tsx` renders original frame images in Canvas and maps the hero's **scroll progress** to frame index. It doesn't play a background video. Scroll events are passive and batched with `requestAnimationFrame`; frames are preloaded around the current frame rather than decoding all 120 immediately. It supports reverse scrolling. CSS keeps the hero sticky. For a production launch, consider generating WebP/AVIF variants with tested quality to reduce payload and improve low-end mobile performance.

## Security/production notes

- API applies Zod validation, payload limits, a honeypot, per-IP rate limiting (in-memory, adequate for single-instance development only), Helmet, CORS, authenticated admin access, and Supabase RLS.
- Add a shared distributed rate-limit store, monitoring, anti-bot verification and notifications before accepting high-volume public leads.
- PostgreSQL `service_role` bypasses RLS: keep it exclusively on the backend. User permissions are checked server-side for every admin request.
- Change WhatsApp and brand identity only if you are authorized to use them. Verify live contact information prior to launch.
