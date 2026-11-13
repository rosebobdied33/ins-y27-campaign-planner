-- Expose only the new non-financial store creative direction in viewer briefs.
do $migration$
declare
  definition text := pg_get_functiondef('public.y27_access(text,jsonb)'::regprocedure);
  anchor text := $anchor$'keywords',coalesce(($anchor$;
  addition text := $fields$'storeTitle',case when jsonb_typeof(p->'planningBrief'->'storeTitle')='string' then left(p->'planningBrief'->>'storeTitle',24) else '' end,
      'storeDirection',case when jsonb_typeof(p->'planningBrief'->'storeDirection')='string' then left(p->'planningBrief'->>'storeDirection',80) else '' end,
      'keywords',coalesce(($fields$;
begin
  if strpos(definition,addition)>0 then return; end if;
  if strpos(definition,anchor)=0 then
    raise exception 'Viewer planning brief projection does not match the expected definition';
  end if;
  execute replace(definition,anchor,addition);
end
$migration$;
