do $migration$
declare
  definition text := pg_get_functiondef('public.y27_access(text,jsonb)'::regprocedure);
  old_field text := $fields$'budgetReference',config.budget_reference_2026$fields$;
  new_field text := $fields$'budgetPlanReference',config.budget_reference_2026$fields$;
begin
  if strpos(definition,new_field)>0 then return; end if;
  if strpos(definition,old_field)=0 then
    raise exception 'Owner projection does not match the expected budget reference';
  end if;
  execute replace(definition,old_field,new_field);
end
$migration$;
