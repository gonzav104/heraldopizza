-- public.soy_administrador() (U4): tells the admin panel whether the signed-in user is an administrator, so the
-- interface can show the panel or a "no access" screen. It decides nothing: row level security on every table stays
-- the only authority over reads and writes.
--
-- It takes no parameters and answers only about auth.uid(), so nobody can ask about another account. It lives in
-- public so the Data API can call it as an RPC; only authenticated may execute it.
create function public.soy_administrador()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.administradores a where a.user_id = (select auth.uid())
  );
$$;

comment on function public.soy_administrador() is
  'Whether the signed-in user is an administrator. Interface hint only; RLS is the authority (U4).';

-- Functions in public are executable by PUBLIC, and Supabase also grants anon, authenticated, and service_role by
-- default. Only authenticated keeps EXECUTE: the panel is its only caller.
revoke all on function public.soy_administrador() from public, anon, authenticated, service_role;
grant execute on function public.soy_administrador() to authenticated;
