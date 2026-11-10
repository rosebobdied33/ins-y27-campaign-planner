alter table public.y27_login_backdrop
  add column if not exists reel_base64 text
    check (length(reel_base64) between 1 and 350000);
