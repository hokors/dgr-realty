# DGR Realty

A responsive Next.js property catalog for DGR Realty, with property search, SEO-friendly detail pages, a Supabase-backed admin dashboard, image management, and secure inquiry capture.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add the public URL and anon key from Supabase Project Settings → API.
3. Run `supabase/migrations/202608310001_initial_real_estate_schema.sql` in a new Supabase project.
4. Run `supabase/migrations/202609010002_inquiries.sql` to create the secure lead inbox.
5. Run `supabase/migrations/202609010003_recoverable_property_mutations.sql` to install transactional admin saves and recoverable image cleanup.
6. Create the first administrator in Supabase Auth, then run the one-line role update shown at the bottom of the initial migration.
7. Add a server-only Supabase secret key as `SUPABASE_SECRET_KEY`. Never prefix this value with `NEXT_PUBLIC_`.
8. Configure the matching Turnstile site and secret keys for production spam protection. Resend variables are optional and enable email notifications; inquiries are still stored in Supabase without them.
9. Add the public phone, email, Facebook, and Messenger values you want displayed.
10. Run `npm run dev`.

Without Supabase variables, the public website uses the polished sample dataset and the admin page shows setup guidance.

## Deployment

The repository is configured for Vercel. Copy the relevant values from `.env.example` into the Vercel project environment before deploying. Keep `SUPABASE_SECRET_KEY`, `TURNSTILE_SECRET_KEY`, `INQUIRY_RATE_LIMIT_SALT`, and `RESEND_API_KEY` server-only.

Property images use the public `property-images` Supabase Storage bucket. Database row-level security keeps public browsing read-only and restricts all writes to users whose profile role is `admin`.

Public inquiry forms post to a validated server route. Leads appear under **Admin → Inquiries**, with search, status tracking, optional Resend notifications, privacy consent, a honeypot, rate limiting, and Turnstile verification in production.
