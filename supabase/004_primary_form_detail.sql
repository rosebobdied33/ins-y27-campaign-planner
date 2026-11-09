-- Add the public-facing activity form description to the existing viewer allowlist.
do $migration$
declare
  original text := pg_get_functiondef('public.y27_access(text,jsonb)'::regprocedure);
  old_fields text := $fields$'primary',p->'primary','secondary',p->'secondary'$fields$;
  new_fields text := $fields$'primary',p->'primary','primaryDetail',case when p->>'primary'='其他' then p->'primaryDetail' end,'secondary',p->'secondary'$fields$;
begin
  if strpos(original,new_fields)>0 then return; end if;
  if strpos(original,old_fields)=0 then
    raise exception 'Viewer projection differs from the expected definition';
  end if;
  execute replace(original,old_fields,new_fields);
end
$migration$;
