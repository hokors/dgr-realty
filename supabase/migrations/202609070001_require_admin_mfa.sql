-- Require a completed second factor for every database policy that grants
-- administrator access. The application already checks AAL2 on admin pages
-- and mutation endpoints; this closes the direct PostgREST/RLS path as well.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
    and exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
