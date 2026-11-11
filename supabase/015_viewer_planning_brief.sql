-- Extend only the existing viewer projection. Keep owner writes and all other fields unchanged.
do $migration$
declare
  definition text := pg_get_functiondef('public.y27_access(text,jsonb)'::regprocedure);
  anchor text := $anchor$'color',p->'color','accent',p->'accent'$anchor$;
  addition text := $fields$,'planningBrief',case
    when p->>'id' ~ '^S0[1-7]$' and jsonb_typeof(p->'planningBrief')='object'
    then jsonb_build_object(
      'positioning',case when jsonb_typeof(p->'planningBrief'->'positioning')='string' then left(p->'planningBrief'->>'positioning',36) else '' end,
      'direction',case when jsonb_typeof(p->'planningBrief'->'direction')='string' then left(p->'planningBrief'->>'direction',24) else '' end,
      'difference',case when jsonb_typeof(p->'planningBrief'->'difference')='string' then left(p->'planningBrief'->>'difference',48) else '' end,
      'keywords',coalesce((
        select jsonb_agg(left(keyword #>> '{}',12) order by k.ord)
        from jsonb_array_elements(case when jsonb_typeof(p->'planningBrief'->'keywords')='array'
          then p->'planningBrief'->'keywords' else '[]'::jsonb end) with ordinality as k(keyword,ord)
        where k.ord<=3 and jsonb_typeof(keyword)='string'
      ),'[]'::jsonb)
    ) end$fields$;
begin
  if strpos(definition,anchor||addition)>0 then return; end if;
  if strpos(definition,anchor)=0 then
    raise exception 'Viewer projection does not match the expected definition';
  end if;
  execute replace(definition,anchor,anchor||addition);
end
$migration$;
