create table if not exists public.y27_login_backdrop (
  id text primary key check (id = 'campaign-collage'),
  image_base64 text not null check (length(image_base64) between 1 and 350000)
);

alter table public.y27_login_backdrop enable row level security;
revoke all on public.y27_login_backdrop from public, anon, authenticated;
grant select on public.y27_login_backdrop to anon, authenticated;

create policy "Read the login backdrop"
  on public.y27_login_backdrop for select to anon, authenticated
  using (id = 'campaign-collage');
