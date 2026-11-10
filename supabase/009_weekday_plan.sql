alter table y27_private.settings
  add column if not exists weekday_plan jsonb;

-- Exact weekday amounts are returned only by the existing owner branch.
do $migration$
declare
  original text := pg_get_functiondef('public.y27_access(text,jsonb)'::regprocedure);
  old_fields text := $fields$'baseline',config.baseline,'revision',plan.revision$fields$;
  new_fields text := $fields$'baseline',config.baseline,'weekdayPlan',config.weekday_plan,'revision',plan.revision$fields$;
begin
  if strpos(original,new_fields)>0 then return; end if;
  if strpos(original,old_fields)=0 then
    raise exception 'Owner projection differs from the expected definition';
  end if;
  execute replace(original,old_fields,new_fields);
end
$migration$;
