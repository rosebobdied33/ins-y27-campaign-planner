create table if not exists y27_private.campaign_artwork (
  project_id text primary key check (project_id ~ '^S0[1-7]$'),
  image_data bytea not null check (octet_length(image_data) between 1 and 262144)
);
revoke all on y27_private.campaign_artwork from public, anon, authenticated;

-- Extend the existing session-checked API. Images are requested independently of project reads.
do $migration$
declare
  original text := pg_get_functiondef('public.y27_access(text,jsonb)'::regprocedure);
  anchor text := $anchor$  if action='logout' then$anchor$;
  addition text := $branch$
  if action='artwork' then
    return jsonb_build_object('image', (
      select encode(art.image_data, 'base64')
      from y27_private.campaign_artwork art
      where art.project_id=payload->>'projectId'
    ));
  end if;
$branch$;
begin
  if strpos(original,addition)>0 then return; end if;
  if strpos(original,anchor)=0 then
    raise exception 'Session API does not match the expected definition';
  end if;
  execute replace(original,anchor,addition||anchor);
end
$migration$;
