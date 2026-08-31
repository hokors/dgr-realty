# DGR Realty

A responsive Next.js property catalog for DGR Realty, with sample listings, category/search filters, SEO-friendly property pages, and a Supabase-backed admin foundation.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add the public URL and anon key from Supabase Project Settings → API.
3. Run `supabase/migrations/202608310001_initial_real_estate_schema.sql` in a new Supabase project.
4. Create the first administrator in Supabase Auth, then run the one-line role update shown at the bottom of the migration.
5. Run `npm run dev`.

Without Supabase variables, the public website uses the polished sample dataset and the admin page shows setup guidance.

## Deployment

The repository is configured for Vercel. Add `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel project environment before deploying.

Property images use the public `property-images` Supabase Storage bucket. Database row-level security keeps public browsing read-only and restricts all writes to users whose profile role is `admin`.
