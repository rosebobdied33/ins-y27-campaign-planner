-- Expose the experience description to signed-in viewers through the existing allowlist.
do $migration$
declare
  original text := pg_get_functiondef('public.y27_access(text,jsonb)'::regprocedure);
  old_fields text := $fields$'secondary',p->'secondary','color',p->'color'$fields$;
  new_fields text := $fields$'secondary',p->'secondary','secondaryDetail',case when p->>'secondary'='其他' then p->'secondaryDetail' end,'color',p->'color'$fields$;
begin
  if strpos(original,new_fields)>0 then return; end if;
  if strpos(original,old_fields)=0 then
    raise exception 'Viewer projection differs from the expected definition';
  end if;
  execute replace(original,old_fields,new_fields);
end
$migration$;
