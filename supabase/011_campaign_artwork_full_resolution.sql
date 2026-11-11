alter table y27_private.campaign_artwork
  drop constraint campaign_artwork_image_data_check,
  add constraint campaign_artwork_image_data_check check (octet_length(image_data) between 1 and 524288),
  add column full_image_data bytea check (octet_length(full_image_data) between 1 and 8388608);

do $migration$
declare
  definition text := pg_get_functiondef('public.y27_access(text,jsonb)'::regprocedure);
  old_expression text := $old$encode(art.image_data, 'base64')$old$;
  new_expression text := $new$encode(case when payload->>'quality'='full' then art.full_image_data else art.image_data end, 'base64')$new$;
begin
  if strpos(definition,old_expression)=0 then
    raise exception 'Session API does not match the expected artwork definition';
  end if;
  execute replace(definition,old_expression,new_expression);
end
$migration$;
