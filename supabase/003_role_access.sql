create schema if not exists y27_private;
revoke all on schema y27_private from public, anon, authenticated;

create table y27_private.accounts (
  login text primary key,
  display_name text not null,
  role text not null check (role in ('owner','viewer')),
  password_hash text not null
);
create unique index y27_one_owner on y27_private.accounts(role) where role='owner';
create table y27_private.settings (
  singleton boolean primary key default true check (singleton),
  viewer_hash text not null,
  baseline bigint not null check (baseline>0),
  initial_projects jsonb not null,
  attempts integer not null default 0,
  window_start timestamptz not null default now()
);
create table y27_private.sessions (
  token_hash bytea primary key,
  login text not null references y27_private.accounts(login) on delete cascade,
  expires_at timestamptz not null
);
create index y27_session_expiry on y27_private.sessions(expires_at);
-- This deployment uses the named-account gateway exclusively.
revoke select, update on public.y27_planner from anon, authenticated;
revoke update (projects, revision) on public.y27_planner from anon, authenticated;

create function public.y27_access(action text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  handle text := lower(btrim(coalesce(payload->>'login','')));
  secret text := coalesce(payload->>'password','');
  token text := coalesce(payload->>'token','');
  account y27_private.accounts%rowtype;
  config y27_private.settings%rowtype;
  plan public.y27_planner%rowtype;
  projected jsonb;
  tier_s numeric;
  tier_a numeric;
  build numeric;
  experience numeric;
  quarters jsonb;
begin
  if action in ('login','register') then
    if handle !~ '^[[:alnum:]一-龥 _.-]{2,32}$' or octet_length(secret) not between 1 and 72 then
      return jsonb_build_object('error','请输入有效的账号和密码。');
    end if;
    select * into account from y27_private.accounts where login=handle;
    select * into config from y27_private.settings where singleton;
    if not found then return jsonb_build_object('error','工作台尚未开放。'); end if;
    if account.role='owner' then
      if action='register' then return jsonb_build_object('error','该账号不可注册。'); end if;
      update y27_private.settings set
        attempts=case when window_start < now()-interval '10 minutes' then 1 else attempts+1 end,
        window_start=case when window_start < now()-interval '10 minutes' then now() else window_start end
        where singleton and (attempts<6 or window_start<now()-interval '10 minutes')
        returning * into config;
      if not found then return jsonb_build_object('error','尝试次数过多，请十分钟后再试。'); end if;
    end if;
    if action='register' then
      if account.login is not null then return jsonb_build_object('error','此名字已注册，请直接登录。'); end if;
      if extensions.crypt(secret,config.viewer_hash) is distinct from config.viewer_hash then
        return jsonb_build_object('error','注册密码不正确。');
      end if;
      -- Serialize signup cap and ensure the reserved owner is never replaced.
      perform 1 from y27_private.settings where singleton for update;
      if (select count(*) from y27_private.accounts)>=1000 then return jsonb_build_object('error','注册名额已满。'); end if;
      insert into y27_private.accounts values (handle,btrim(payload->>'login'),'viewer',config.viewer_hash)
        on conflict do nothing returning * into account;
      if not found then return jsonb_build_object('error','此名字已注册，请直接登录。'); end if;
    elsif account.login is null or extensions.crypt(secret,account.password_hash) is distinct from account.password_hash then
      return jsonb_build_object('error','账号或密码不正确。');
    end if;
    if account.role='owner' then update y27_private.settings set attempts=0 where singleton; end if;
    delete from y27_private.sessions where expires_at<now();
    token := encode(extensions.gen_random_bytes(32),'hex');
    insert into y27_private.sessions values (extensions.digest(token,'sha256'),account.login,now()+interval '12 hours');
    return jsonb_build_object('token',token);
  end if;

  if token !~ '^[a-f0-9]{64}$' then return jsonb_build_object('error','请先登录。','code','auth'); end if;
  select a.* into account from y27_private.sessions s join y27_private.accounts a on a.login=s.login
    where s.token_hash=extensions.digest(token,'sha256') and s.expires_at>now();
  if not found then return jsonb_build_object('error','登录已过期，请重新登录。','code','auth'); end if;
  if action='logout' then
    delete from y27_private.sessions where token_hash=extensions.digest(token,'sha256');
    return jsonb_build_object('ok',true);
  end if;

  if action in ('save','reset') then
    if account.role<>'owner' then return jsonb_build_object('error','此账号没有编辑权限。','code','forbidden'); end if;
    if action='reset' then select initial_projects into projected from y27_private.settings where singleton;
    else projected := payload->'projects'; end if;
    if jsonb_typeof(projected) is distinct from 'array' or jsonb_array_length(projected)>300 or octet_length(projected::text)>1500000 then
      return jsonb_build_object('error','计划数据无效。');
    end if;
    update public.y27_planner set projects=projected,revision=revision+1 where id=2027 and revision=(payload->>'revision')::integer returning * into plan;
    if not found then return jsonb_build_object('error','其他设备已保存新版本。请先导出草稿，再刷新。','code','conflict'); end if;
  elsif action='read' then
    select * into plan from public.y27_planner where id=2027;
    if not found then return jsonb_build_object('error','工作台未初始化。'); end if;
  else
    return jsonb_build_object('error','操作无效。');
  end if;

  if account.role='owner' then
    select * into config from y27_private.settings where singleton;
    return jsonb_build_object('role','owner','name',account.display_name,'projects',plan.projects,'baseline',config.baseline,'revision',plan.revision);
  end if;

  -- Use an allowlist; do not serialize amounts, remarks, or internal revision for visitors.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p->'id','code',p->'code','tier',p->'tier','name',p->'name','start',p->'start','end',p->'end',
    'status',p->'status','primary',p->'primary','secondary',p->'secondary','color',p->'color','accent',p->'accent'
  ) order by ord),'[]'::jsonb),
    coalesce(sum((p->>'budget')::numeric) filter(where p->>'tier'='S'),0),
    coalesce(sum((p->>'budget')::numeric) filter(where p->>'tier'='A'),0),
    coalesce(sum((p->>'build')::numeric),0),coalesce(sum((p->>'experience')::numeric),0)
  into projected,tier_s,tier_a,build,experience
  from jsonb_array_elements(plan.projects) with ordinality as source(p,ord);
  with amounts as (
    select q,coalesce(sum((p->>'budget')::numeric),0) as total
    from generate_series(1,4) q left join lateral jsonb_array_elements(plan.projects) p
      on (substring(p->>'start' from 6 for 2)::integer-1)/3+1=q group by q
  )
  select jsonb_agg(case when max_total=0 then 0 else round(total/max_total*10)*10 end order by q) into quarters
    from (select q,total,max(total) over() max_total from amounts) bands;
  return jsonb_build_object('role','viewer','name',account.display_name,'projects',projected,
    'charts',jsonb_build_object(
      'tier',case when tier_s+tier_a=0 then null else round(tier_s/(tier_s+tier_a)*10)*10 end,
      'build',case when build+experience=0 then null else round(build/(build+experience)*10)*10 end,
      'quarters',quarters
    ));
end;
$$;
revoke all on function public.y27_access(text,jsonb) from public, anon, authenticated;
grant execute on function public.y27_access(text,jsonb) to anon;
