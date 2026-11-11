alter table y27_private.settings
  add column if not exists budget_reference_2026 jsonb;

do $migration$
declare
  definition text := pg_get_functiondef('public.y27_access(text,jsonb)'::regprocedure);
  old_fields text := $fields$'weekdayPlan',config.weekday_plan,'revision',plan.revision$fields$;
  new_fields text := $fields$'weekdayPlan',config.weekday_plan,'budgetReference',config.budget_reference_2026,'revision',plan.revision$fields$;
begin
  if strpos(definition,new_fields)>0 then return; end if;
  if strpos(definition,old_fields)=0 then
    raise exception 'Owner projection does not match the expected definition';
  end if;
  execute replace(definition,old_fields,new_fields);
end
$migration$;
