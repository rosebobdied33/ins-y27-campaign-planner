'use client';
import {useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {ArrowDownToLine,ArrowUpRight,BarChart3,CalendarDays,Check,ChevronDown,Copy,Database,LayoutGrid,LockKeyhole,LogOut,Moon,Plus,Search,Sun,Trash2,Wallet} from 'lucide-react';
import {allocation,backup,COLORS,csv,durationDays,EXPERIENCE_MODES,experienceModeLabel,filterProjects,FORM_FILTERS,HEADERS,PRIMARY_FORMS,primaryFormLabel,nextCode,number,parseMoney,percent,QUARTERS,quarter,readBackup,recordedSpend,rows,settlementMonths,STATUSES,spending,summary,yuan,type Project,type Tier} from '../lib/planner';
import {useCampaignArtwork,usePlanner,type ViewerData} from '../lib/storage';

import {PlanOverview} from './overview';
import {CampaignGallery,campaignTitles,type CampaignArtwork} from './campaign-gallery';
import {ProjectSettlement} from './project-settlement';
import {ResourceAnalysis,WeekdayBudget} from './year-insights';
import {monthlyTotal,type WeekdayPlan} from '../lib/weekday';
import {LoginReel} from './login-reel';

const pct=(v:number,t:number)=>percent(v,t).toFixed(1)+'%';
const options=(values:readonly string[])=>values.map(x=><option key={x}>{x}</option>);
const dateLabel=(s:string)=>s.replaceAll('-','.');
function download(data:BlobPart,name:string,type:string) {
  const href=URL.createObjectURL(new Blob([data],{type}));
  const link=document.createElement('a');link.href=href;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(href),1000);
}
type Segment = { value:number; color:string };
function Ratio({segments,label,scale}:{segments:Segment[];label:string;scale?:number}) {
  const sum=scale??segments.reduce((n,s)=>n+s.value,0);
  return <div className="ratio" role="img" aria-label={label}>{segments.map((s,i)=><span key={i} style={{width:pct(s.value,sum),background:s.color}}/>)}</div>;
}
const tierSegments=(S:number,A:number):Segment[]=>[{value:S,color:'var(--tier-s)'},{value:A,color:'var(--tier-a)'}];
const splitSegments=(build:number,experience:number):Segment[]=>[{value:build,color:'var(--build)'},{value:experience,color:'var(--experience)'}];
function Money({label,value,onChange,required=false,commitOnBlur=false}:{
  label:string;value:number|null;onChange:(v:number|null)=>void;required?:boolean;commitOnBlur?:boolean;
}) {
  const [draft,setDraft]=useState('');
  const [editing,setEditing]=useState(false);
  const [error,setError]=useState(false);

  function read(raw:string) {
    const amount=parseMoney(raw);
    if(amount===null&&required)throw new Error('金额不能为空');
    return amount;
  }

  return <label className="money">
    <span>{label}</span>
    <span className="money-field"><b>¥</b><input aria-label={label} aria-invalid={error} inputMode="decimal"
      value={editing?draft:value===null?'':number(value)} placeholder="—"
      onFocus={e=>{setDraft(e.currentTarget.value);setEditing(true);setError(false);}}
      onChange={e=>{
        const raw=e.target.value;
        setDraft(raw);
        try{
          const amount=read(raw);
          if(!commitOnBlur)onChange(amount);
          setError(false);
        }catch{setError(true);}
      }}
      onBlur={e=>{
        setEditing(false);
        if(!commitOnBlur){setError(false);return;}
        try{
          const amount=read(e.currentTarget.value);
          if(amount!==value)onChange(amount);
          setError(false);
        }catch{setError(true);}
      }}
      onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}
    /></span>
    {error&&<small className="danger">{commitOnBlur&&!editing?'金额未更新，请重新输入':'请输入有效金额，最多两位小数'}</small>}
  </label>;
}
type Pane='overview'|'budget'|'projects'|'resources';
const PANE_INFO={
  overview:{label:'年度总览',icon:LayoutGrid},
  budget:{label:'预算看板',icon:Wallet},
  projects:{label:'项目规划',icon:CalendarDays},
  resources:{label:'资源分析',icon:BarChart3},
};
function usePane(owner:boolean) {
  const [requested,setRequested]=useState('');
  useEffect(()=>{
    const read=()=>{setRequested(window.location.hash.slice(1));window.scrollTo(0,0);};
    read();window.addEventListener('hashchange',read);
    return ()=>window.removeEventListener('hashchange',read);
  },[]);
  return (requested==='projects'||requested==='resources'||(requested==='budget'&&owner)?requested:'overview') as Pane;
}
function useProjectJump(pane:Pane) {
  const [target,setTarget]=useState<{id:string;budget:boolean}|null>(null);
  useEffect(()=>{
    if(pane!=='projects'||target===null)return;
    const project=document.getElementById(target.id);
    if(target.budget){
      const editor=project?.querySelector<HTMLDetailsElement>('.project-editor');
      const budget=editor?.querySelector<HTMLDetailsElement>('.budget-disclosure');
      if(editor)editor.open=true;
      if(budget)budget.open=true;
    }
    project?.scrollIntoView({block:'start'});
    project?.focus({preventScroll:true});
    setTarget(null);
  },[pane,target]);
  return (id:string,budget=false)=>{
    setTarget({id,budget});
    window.location.hash='projects';
  };
}
function Brand() {return <span className="brand">INS<sup>®</sup></span>;}
function Sidebar({pane,owner}:{pane:Pane;owner:boolean}) {
  const links:Pane[]=owner?['overview','budget','projects','resources']:['overview','projects','resources'];
  return <aside><a className="sidebar-brand" href="#overview"><Brand/><span className="eyebrow">年度规划</span></a>
    <div className="nav-caption">INS LAND / 2027</div>
    <nav aria-label="工作台导航">{links.map(key=>{
      const {icon:Icon,label}=PANE_INFO[key];
      return <a href={'#'+key} key={key} aria-current={pane===key?'page':undefined}><Icon aria-hidden="true"/><span>{label}</span></a>;
    })}</nav>
    <div className="side-bottom"><span>INS LAND</span><span>2027</span></div>
  </aside>;
}
function CampaignHero() {
  return <header className="campaign-hero">
    <p className="campaign-hero-mark">INS LAND <span>2027</span></p>
    <h1 lang="en">Campaign Planner
      <svg className="campaign-title-flourish" viewBox="0 0 650 116" preserveAspectRatio="none" aria-hidden="true">
        <path d="M146 51C91 21 17 6 11 38C5 68 69 81 114 57C160 32 170 23 203 36C229 46 190 76 144 82C94 89 40 85 10 105"/>
        <path d="M408 65C450 41 480 16 515 22C563 32 519 64 476 84C431 105 466 115 508 101C568 81 607 47 640 61C661 70 627 94 600 87"/>
      </svg>
    </h1>
  </header>;
}
function CampaignDates({start,end}:{start:string;end:string}) {
  const days=durationDays(start,end);
  return <div className="date-caption"><CalendarDays size={13} aria-hidden="true"/><span>{dateLabel(start)} — {dateLabel(end)}</span>{days!==null&&<strong className="duration" title="含开始日和结束日">共 {days} 天</strong>}</div>;
}
function ProjectIndexHeading({visible,total,children}:{visible:number;total:number;children?:ReactNode}) {
  return <header className="project-heading">
    <div className="project-index-heading">
      <span className="project-index-kicker" lang="en">PROJECT INDEX / 2027</span>
      <p className="project-index-display" lang="en" aria-hidden="true">Campaigns</p>
      <h2>项目规划 <small>{visible} / {total}</small></h2>
    </div>
    {children}
  </header>;
}
function CoverOrbit({className}:{className:string}) {
  return <svg className={className} viewBox="0 0 194 150" aria-hidden="true">
      <g transform="rotate(-30 97 75)" fill="none" stroke="currentColor" strokeWidth=".75">
        <ellipse cx="97" cy="75" rx="90" ry="59"/><ellipse cx="97" cy="75" rx="90" ry="41"/><ellipse cx="97" cy="75" rx="90" ry="23"/>
        <ellipse cx="97" cy="75" rx="65" ry="59"/><ellipse cx="97" cy="75" rx="32" ry="59"/>
      </g>
      <circle cx="162" cy="34" r="2" fill="currentColor"/>
    </svg>;
}
function ProjectCover({project}:{project:Pick<Project,'id'|'code'|'start'|'color'>}) {
  const art=Object.hasOwn(campaignTitles,project.id)?campaignTitles[project.id]:undefined;
  return <header className={'project-cover'+(art?'':' is-index')} style={{
    '--cover-light':art?.cover[2]??project.color,
    '--cover-shade':project.color,
    ...(art?{'--cover-deep':art.cover[0],'--cover-mid':art.cover[1]}:{}),
  } as CSSProperties}>
    <CoverOrbit className="project-cover-orbit"/>
    <p className="project-cover-meta">{art?project.code:'CAMPAIGN'} <span>/</span> {quarter(project.start)}</p>
    <p className="project-cover-title" lang="en">{art?.title??project.code}</p>
  </header>;
}
function ProjectSummary({project}:{project:Pick<Project,'name'|'status'|'start'|'end'>}) {
  return <div className="project-summary">
    <div className="project-summary-heading"><h3>{project.name||'未命名项目'}</h3><span className="project-status">{project.status}</span></div>
    <CampaignDates start={project.start} end={project.end}/>
  </div>;
}
function Card({p,edit,copy,remove}:{p:Project;edit:(patch:Partial<Project>)=>void;copy:()=>void;remove:()=>void}) {
  const gap=allocation(p), split=(p.build??0)+(p.experience??0);
  const [dateError,setDateError]=useState('');
  const changeDate=(which:'start'|'end', value:string)=>{
    if(!/^20\d\d-\d\d-\d\d$/.test(value)||(which==='start'?value>p.end:value<p.start)){
      setDateError('请填写有效日期，结束日期不得早于开始日期。');return;
    }
    setDateError('');edit({[which]:value});
  };
  return <article className="project" id={p.id} tabIndex={-1} style={{'--theme':p.color} as CSSProperties}>
    <ProjectCover project={p}/>
    <ProjectSummary project={p}/>
    <details className="project-editor">
      <summary>
        <span className="project-budget-preview"><small>总预算</small><strong>{yuan(p.budget)}</strong></span>
        <span className="project-edit-trigger"><span className="edit-show">编辑项目</span><span className="edit-hide">收起编辑</span><ChevronDown size={15} aria-hidden="true"/></span>
      </summary>
      <div className="project-edit-body">
        <div className="project-edit-head">
          <span>项目信息</span>
          <div className="card-actions"><button className="icon" title="复制项目" aria-label="复制项目" onClick={copy}><Copy/></button><button className="icon" title="删除项目" aria-label="删除项目" onClick={remove}><Trash2/></button></div>
        </div>
        <label className="project-edit-name">主题名称<input aria-label="主题名称" maxLength={100} placeholder="输入项目主题" value={p.name} onChange={e=>edit({name:e.target.value})}/></label>
        <div className="date-pair"><label>开始<input aria-label="开始日期" type="date" min="2000-01-01" max={p.end} value={p.start} onChange={e=>changeDate('start',e.target.value)}/></label><label>结束<input aria-label="结束日期" type="date" min={p.start} max="2099-12-31" value={p.end} onChange={e=>changeDate('end',e.target.value)}/></label></div>
        {dateError&&<small className="danger" role="alert">{dateError}</small>}
        <div className="fields"><label>级别<select aria-label="级别" value={p.tier} onChange={e=>edit({tier:e.target.value as Tier})}><option value="S">S 级</option><option value="A">A 级</option></select></label>
        <label>状态<select aria-label="状态" value={p.status} onChange={e=>edit({status:e.target.value as Project['status']})}>{options(STATUSES)}</select></label></div>
        <div className="fields project-categories">
          <div><label>搭建形式<select aria-label="搭建形式" value={p.primary} onChange={e=>edit({primary:e.target.value as Project['primary']})}>
            {!PRIMARY_FORMS.some(value=>value===p.primary)&&<option value={p.primary} disabled>{p.primary}（历史值）</option>}
            {options(PRIMARY_FORMS.filter(value=>value!==p.secondary||value==='其他'))}
          </select></label>
          {p.primary==='其他'&&<label className="primary-detail">自定义搭建形式<input aria-label="自定义搭建形式" maxLength={80} placeholder="输入搭建形式" value={p.primaryDetail??''} onChange={e=>edit({primaryDetail:e.target.value})}/></label>}</div>
          <div><label>体验模式<select aria-label="体验模式" value={p.secondary} onChange={e=>edit({secondary:e.target.value as Project['secondary']})}>
            <option value="不叠加">待定</option>
            {p.secondary!=='不叠加'&&!EXPERIENCE_MODES.some(value=>value===p.secondary)&&<option value={p.secondary} disabled>{p.secondary}（历史值）</option>}
            {options(EXPERIENCE_MODES)}
          </select></label>
          {p.secondary==='其他'&&<label className="primary-detail">自定义体验模式<input aria-label="自定义体验模式" maxLength={80} placeholder="输入体验模式" value={p.secondaryDetail??''} onChange={e=>edit({secondaryDetail:e.target.value})}/></label>}</div>
        </div>
        <details className="budget-disclosure">
          <summary>
            <span className="budget-disclosure-label">预算与结算</span>
            <ChevronDown className="budget-disclosure-chevron" size={15} aria-hidden="true"/>
          </summary>
          <div className="card-budget">
          <div className="budget-top"><Money label="预算总额" value={p.budget} required onChange={budget=>budget!==null&&edit({budget})}/>
          <span className={'budget-state '+(gap<0?'danger':gap===0?'success':'')}>{gap<0?'超额 '+yuan(-gap):gap===0?'已分配完成':'待分配 '+yuan(gap)}</span></div>
          <div className="split"><Money label="搭建" value={p.build} onChange={build=>edit({build})}/><Money label="体验" value={p.experience} onChange={experience=>edit({experience})}/></div>
          <Ratio segments={[...splitSegments(p.build??0,p.experience??0),{value:Math.max(0,gap),color:'var(--unassigned)'}]} label={'项目预算分配：搭建 '+yuan(p.build??0)+'，体验 '+yuan(p.experience??0)+'，'+(gap<0?'超额 ':'待分配 ')+yuan(Math.abs(gap))}/>
          <div className="split-legend"><span><i/>搭建 {split&&p.build!==null?pct(p.build,split):'—'}</span><span><i/>体验 {split&&p.experience!==null?pct(p.experience,split):'—'}</span>{gap>0&&<span className="unassigned"><i/>待分配</span>}</div>
          <ProjectSettlement project={p} onSave={settlement=>edit({settlement})}/>
          </div>
        </details>
        <details className="notes"><summary>备注 {p.notes&&<span className="dot"/>}<ChevronDown size={14}/></summary><textarea aria-label="备注" placeholder="记录创意方向、场景想法或特殊要求" maxLength={1000} rows={3} value={p.notes} onChange={e=>edit({notes:e.target.value})}/></details>
      </div>
    </details>
  </article>;
}
function SpendingBoard({items,baseline,weekday,openProject}:{items:Project[];baseline:number;weekday?:WeekdayPlan|null;openProject:(id:string)=>void}) {
  const [series,setSeries]=useState<'plan'|'paid'>('plan');
  const [selectedQuarter,setSelectedQuarter]=useState<string|null>(null);
  const totals=spending(items), plan=summary(items,baseline);
  const settledMonths=settlementMonths(items,'2027');
  const settledQuarters=QUARTERS.map((_,i)=>settledMonths.slice(i*3,i*3+3).reduce((sum,amount)=>sum+amount,0));
  const week=monthlyTotal(weekday);
  const weekQuarters=QUARTERS.map((_,i)=>weekday?.monthly.slice(i*3,i*3+3).reduce((sum,value)=>sum+value,0)??0);
  const values=series==='plan'?plan.quarters.map((value,i)=>value+weekQuarters[i]):settledQuarters;
  const total=values.reduce((sum,amount)=>sum+amount,0);
  const peak=Math.max(...values);
  const peakLabels=QUARTERS.filter((_,i)=>peak>0&&values[i]===peak).join('、');
  const coverage=totals.paid+totals.pending;
  const allocated=plan.build+plan.experience;
  const splitTotal=allocated+plan.unallocated;
  const actualSplit=items.reduce((split,project)=>{
    if(project.settlement){
      split.build+=project.settlement.build;
      split.experience+=project.settlement.experience;
      split.count++;
    }
    return split;
  },{build:0,experience:0,count:0});
  const paidLabel=totals.recorded?yuan(totals.paid):'—';

  return <>
    <div className="budget-tiles">
      <article className="panel budget-feature">
        <CoverOrbit className="budget-orbit"/>
        <h3 className="budget-title">{weekday?'年度合计规划':'年度预算基准'}</h3>
        <strong className="budget-number">{yuan(weekday?plan.total+week:baseline)}</strong>
        {weekday&&<div className="budget-program-split"><span>S / A {yuan(plan.total)}</span><span>周中 {yuan(week)}</span></div>}
        <div className="budget-feature-foot">
          <div className="budget-feature-meta"><span>S / A 基准 <b>{yuan(baseline)}</b> · {items.length} 项</span><span>项目规划率 <b>{pct(plan.total,baseline)}</b></span></div>
          <Ratio segments={[
            {value:Math.min(plan.total,baseline),color:'var(--budget-lilac)'},
            {value:Math.max(-plan.remaining,0),color:'var(--budget-coral)'},
          ]} scale={Math.max(plan.total,baseline)} label={'年度预算规划率 '+pct(plan.total,baseline)}/>
          <span className={'budget-feature-balance'+(plan.remaining<0?' is-over':'')}>{plan.remaining<0?'超出基准':'基准余量'} {yuan(Math.abs(plan.remaining))}</span>
        </div>
      </article>
      <article className="panel budget-snapshot budget-paid">
        <h3 className="budget-title">项目实际已支出</h3><strong className="budget-number">{paidLabel}</strong>
        <Ratio segments={[{value:totals.paid,color:'var(--budget-teal)'}]} scale={coverage} label={'已支出占已支出与待结算预算合计 '+pct(totals.paid,coverage)}/>
        <p>{totals.recorded?`${totals.withPayment} 项已有支出`:'暂无支出记录'}{totals.over>0&&<b className="danger"> · 超支 {yuan(totals.over)}</b>}</p>
        {actualSplit.count>0&&<p>已结算搭建 {yuan(actualSplit.build)} · 体验 {yuan(actualSplit.experience)}</p>}
      </article>
      <article className="panel budget-snapshot budget-pending">
        <h3 className="budget-title">项目待结算预算</h3><strong className="budget-number">{yuan(totals.pending)}</strong>
        <Ratio segments={[{value:totals.pending,color:'var(--budget-gold)'}]} scale={coverage} label={'待支出占已支出与待结算预算合计 '+pct(totals.pending,coverage)}/>
        <p>{totals.withBalance} 项有待结算预算 · {items.length-totals.recorded} 项未录入实际支出</p>
      </article>
    </div>

    <div className="budget-modules">
      <article className="panel budget-quarter">
        <div className="calendar-heading"><div><h3 className="budget-title">季度预算占比</h3></div>
          <div className="segmented" aria-label="季度金额口径"><button aria-pressed={series==='plan'} onClick={()=>{setSeries('plan');setSelectedQuarter(null);}}>规划预算</button><button aria-pressed={series==='paid'} onClick={()=>{setSeries('paid');setSelectedQuarter(null);}}>实际支出</button></div>
        </div>
        <div className="budget-peak"><span className="budget-pill">{peakLabels?peakLabels+' 最高':'暂无金额'}</span>{peakLabels&&<strong>{yuan(peak)} · {pct(peak,total)}</strong>}</div>
        <div className="budget-columns" role="group" aria-label="季度占全年比例，点击筛选下方明细">
          {QUARTERS.map((q,i)=><button key={q} className="budget-column" data-quarter={q}
            aria-pressed={selectedQuarter===q} aria-label={`${q} ${yuan(values[i])}，占全年 ${pct(values[i],total)}，筛选项目明细`}
            onClick={()=>setSelectedQuarter(selectedQuarter===q?null:q)}>
            <span className="budget-column-value">{total?pct(values[i],total):'—'}</span>
            <span className="budget-column-track" aria-hidden="true">
              {series==='plan'&&weekQuarters[i]>0&&<i className="budget-column-week" style={{height:pct(weekQuarters[i],peak)}}/>}
              <i style={{height:pct(series==='plan'?plan.quarters[i]:values[i],peak)}}/>
            </span>
            <strong>{q}</strong><small>{yuan(values[i])}</small>
          </button>)}
        </div>
        {series==='plan'&&weekday&&<div className="budget-program-legend"><span>▰ S / A 项目</span><span>▰ 周中活动</span></div>}
        <p className="budget-hint">{series==='plan'?(weekday?'项目按开始季度，周中按预算月份':'按项目开始季度归集'):'按 2027 年项目结算季度归集'} · 点柱图筛选项目明细</p>
      </article>

      <article className="panel budget-structure">
        <h3 className="budget-title">S / A 项目预算结构</h3>
        <section className="budget-tier">
          <h4>S / A 级别</h4>
          <Ratio segments={tierSegments(plan.S,plan.A)} label={'S 级 '+pct(plan.S,plan.total)+'，A 级 '+pct(plan.A,plan.total)}/>
          <div className="budget-legend">
            <div><span><i style={{background:'var(--tier-s)'}}/>S 级 <small>{pct(plan.S,plan.total)}</small></span><b>{yuan(plan.S)}</b></div>
            <div><span><i style={{background:'var(--tier-a)'}}/>A 级 <small>{pct(plan.A,plan.total)}</small></span><b>{yuan(plan.A)}</b></div>
          </div>
        </section>
        <section className="budget-allocation">
          <h4>费用分配</h4>
          <Ratio segments={[...splitSegments(plan.build,plan.experience),{value:plan.unallocated,color:'var(--unassigned)'}]} scale={splitTotal}
            label={`搭建 ${yuan(plan.build)}，体验 ${yuan(plan.experience)}，待分配 ${yuan(plan.unallocated)}`}/>
          <div className="budget-legend">
            <div><span><i style={{background:'var(--build)'}}/>搭建</span><b>{yuan(plan.build)}</b></div>
            <div><span><i style={{background:'var(--experience)'}}/>体验</span><b>{yuan(plan.experience)}</b></div>
            <div><span><i style={{background:'var(--unassigned)'}}/>待分配</span><b>{yuan(plan.unallocated)}</b></div>
          </div>
          {plan.over>0&&<p className="danger">分配超额 {yuan(plan.over)}</p>}
        </section>
      </article>
    </div>

    {weekday&&<WeekdayBudget items={items} plan={weekday}/>}
    <PaymentLedger items={items} selectedQuarter={selectedQuarter} bySettlement={series==='paid'} clearQuarter={()=>setSelectedQuarter(null)} openProject={openProject}/>
  </>;
}

const SETTLEMENT_STATUS = {unrecorded:'未录入',legacy:'旧支出记录',settled:'已结算',over:'超预算'} as const;

function settlementStatus(project:Project):keyof typeof SETTLEMENT_STATUS {
  const actual=recordedSpend(project);
  if(actual===null)return 'unrecorded';
  if(actual>project.budget)return 'over';
  return project.settlement?'settled':'legacy';
}

function PaymentLedger({items,selectedQuarter,bySettlement,clearQuarter,openProject}:{
  items:Project[];selectedQuarter:string|null;bySettlement:boolean;clearQuarter:()=>void;openProject:(id:string)=>void;
}) {
  const [view,setView]=useState<'project'|'time'>('project');
  const [filter,setFilter]=useState('all');
  const [query,setQuery]=useState('');
  const [year,setYear]=useState('2027');
  const [month,setMonth]=useState<string|null>(null);
  const needle=query.trim().toLocaleLowerCase();
  const visible=items.filter(project=>{
    const date=bySettlement?project.settlement?.date:project.start;
    return (!selectedQuarter||(date&&(!bySettlement||date.startsWith('2027-'))&&quarter(date)===selectedQuarter))
      &&(!needle||(project.code+' '+project.name).toLocaleLowerCase().includes(needle))
      &&(filter==='all'||settlementStatus(project)===filter);
  });
  const subtotal=spending(visible);
  const planned=visible.reduce((total,project)=>total+project.budget,0);
  const projectScale=Math.max(0,...visible.map(project=>Math.max(project.budget,recordedSpend(project)??0)));
  const dated=visible.flatMap(project=>project.settlement?[{project,settlement:project.settlement}]:[])
    .sort((a,b)=>b.settlement.date.localeCompare(a.settlement.date));
  const years=[...new Set(['2027',...dated.map(entry=>entry.settlement.date.slice(0,4))])].sort();
  const activeYear=years.includes(year)?year:'2027';
  const activeMonth=activeYear===year?month:null;
  const monthly=settlementMonths(visible,activeYear);
  const monthScale=Math.max(...monthly);
  const listed=dated.filter(({settlement})=>settlement.date.startsWith(activeYear+'-'+(activeMonth??'')));
  const undated=visible.reduce((sum,project)=>sum+(project.settlement?0:recordedSpend(project)??0),0);

  return <article className="panel payment-ledger">
    <div className="ledger-heading">
      <div><h3 className="budget-title">项目结算明细</h3><p>实际搭建费与实际体验费在项目规划填写。</p></div>
      <div className="segmented" aria-label="支出查看方式"><button aria-pressed={view==='project'} onClick={()=>setView('project')}>按项目</button><button aria-pressed={view==='time'} onClick={()=>setView('time')}>按结算时间</button></div>
    </div>
    <div className="ledger-tools">
      <label className="ledger-search"><Search size={15} aria-hidden="true"/><input aria-label="搜索支出项目" placeholder="搜项目名称或编号" value={query} onChange={e=>setQuery(e.target.value)}/></label>
      <select aria-label="结算状态筛选" value={filter} onChange={e=>setFilter(e.target.value)}>
        <option value="all">全部结算状态</option>
        {Object.entries(SETTLEMENT_STATUS).map(([key,label])=><option key={key} value={key}>{label}</option>)}
      </select>
      {selectedQuarter&&<button className="budget-pill" onClick={clearQuarter} aria-label="清除季度筛选">{selectedQuarter} ×</button>}
      <span className="ledger-count" aria-live="polite">{visible.length} / {items.length} 项</span>
    </div>
    {visible.length>0?<div className="spend-explorer">
      {view==='project'?<div className="spend-compare">
        <div className="spend-legend"><span><i/>预算</span><span><i/>实际支出</span><span><i/>超预算</span></div>
        <div className="spend-column-head" aria-hidden="true"><span>项目</span><span>预算水位</span><span>实际 / 预算</span></div>
        {visible.map(project=>{
          const actual=recordedSpend(project);
          const paid=actual??0;
          const {settlement}=project;
          return <details className="spend-project-row" key={project.id}>
            <summary className="spend-compare-row">
              <ChevronDown className="spend-expand" size={15} aria-hidden="true"/>
              <span><strong>{project.name||'未命名项目'}</strong><small>{project.code} · {SETTLEMENT_STATUS[settlementStatus(project)]}</small></span>
              <span className="spend-compare-track" aria-hidden="true">
                <i style={{width:pct(project.budget,projectScale)}}/>
                <i style={{width:pct(Math.min(paid,project.budget),projectScale)}}/>
                {paid>project.budget&&<i style={{left:pct(project.budget,projectScale),width:pct(paid-project.budget,projectScale)}}/>}
              </span>
              <span><b>{actual===null?'—':yuan(actual)}</b><small>{yuan(project.budget)}</small></span>
            </summary>
            <div className="spend-inline-detail">
              {settlement?<dl><div><dt>实际搭建费</dt><dd>{yuan(settlement.build)}</dd></div><div><dt>实际体验费</dt><dd>{yuan(settlement.experience)}</dd></div><div><dt>结算日期</dt><dd>{settlement.date}</dd></div></dl>:
                <p>{actual===null?'暂无实际支出。':'旧支出记录 '+yuan(actual)+'，待补结算日期与费用分类。'}</p>}
              <button onClick={()=>openProject(project.id)}>打开项目规划 <ArrowUpRight size={14}/></button>
            </div>
          </details>;
        })}
        <p className="budget-hint">各项目共用金额刻度。点左侧箭头展开结算详情。</p>
      </div>:<div className="spend-time">
        <div className="calendar-heading"><h4>月度结算</h4><select aria-label="结算年份" value={activeYear} onChange={e=>{setYear(e.target.value);setMonth(null);}}>{years.map(y=><option key={y}>{y}</option>)}</select></div>
        <div className="spend-months">{monthly.map((amount,i)=>{
          const key=String(i+1).padStart(2,'0');
          return <button className="spend-month" key={key} aria-pressed={activeMonth===key} aria-label={`${activeYear} 年 ${i+1} 月，${yuan(amount)}`} title={yuan(amount)} onClick={()=>setMonth(activeMonth===key?null:key)}>
            <span><i style={{height:pct(amount,monthScale)}}/></span><small>{i+1}月</small>
          </button>;
        })}</div>
        <div className="calendar-heading"><h4>{activeMonth?Number(activeMonth)+' 月结算':'全年结算'} · {yuan(listed.reduce((sum,{settlement})=>sum+settlement.build+settlement.experience,0))}</h4>{activeMonth&&<button onClick={()=>setMonth(null)}>查看全年</button>}</div>
        {listed.length>0?<ul>{listed.map(({project,settlement})=><li key={project.id}><span>{project.name||project.code}<small>{settlement.date} · 搭建 {yuan(settlement.build)} · 体验 {yuan(settlement.experience)}</small></span><b>{yuan(settlement.build+settlement.experience)}</b></li>)}</ul>:<p className="spend-undated">该期间暂无已结算项目。</p>}
        {undated>0&&<p className="spend-undated">未补结算日期的旧支出 {yuan(undated)}，已计入实际支出总额。</p>}
      </div>}
    </div>:<div className="ledger-empty"><p>当前条件下没有项目。</p><button onClick={()=>{setQuery('');setFilter('all');clearQuarter();}}>清除筛选</button></div>}
    {visible.length>0&&<div className="ledger-totals" aria-label="当前明细小计"><span>当前项目小计</span><span>预算 <b>{yuan(planned)}</b></span>
      <span>实际 <b>{subtotal.recorded?yuan(subtotal.paid):'—'}</b></span><span>待结算预算 <b>{yuan(subtotal.pending)}</b></span>
      {subtotal.over>0&&<span className="danger">超预算 <b>{yuan(subtotal.over)}</b></span>}
    </div>}
  </article>;
}

function Viewer({data,artwork,dark,toggle,logout,error}:{data:ViewerData;artwork:CampaignArtwork;dark:boolean;toggle:()=>void;logout:()=>void;error:string}) {
  const [filter,setFilter]=useState<'all'|Tier>('all');
  const [quarterFilter,setQuarterFilter]=useState('all');
  const pane=usePane(false);
  const jumpToProject=useProjectJump(pane);
  const projects=data.projects.filter(p=>(filter==='all'||p.tier===filter)&&(quarterFilter==='all'||quarter(p.start)===quarterFilter));
  return <div className="shell viewer">
    <Sidebar pane={pane} owner={false}/>
    <main>
      <header className="topbar"><div className="breadcrumb"><span>INS LAND</span><span>/</span><strong>{PANE_INFO[pane].label}</strong></div>
        <div className="actions"><span className="role-chip">浏览者</span><button className="icon" aria-label={dark?'切换浅色主题':'切换深色主题'} onClick={toggle}>{dark?<Sun/>:<Moon/>}</button><button className="icon" aria-label="退出登录" onClick={logout}><LogOut/></button></div>
      </header>
      <div className="content">
        <section id="overview" className="pane" hidden={pane!=='overview'}>
          <div className="campaign-masthead">
            <CampaignHero/>
            <CampaignGallery projects={data.projects} artwork={artwork} openProject={id=>{setFilter('all');setQuarterFilter('all');jumpToProject(id);}}/>
          </div>
          <PlanOverview items={data.projects} openQuarter={q=>{setFilter('all');setQuarterFilter(q);window.location.hash='projects';}} openProject={id=>{setFilter('all');setQuarterFilter('all');jumpToProject(id);}}/>
        </section>
        {error&&<p className="banner" role="alert">{error}</p>}
        <section id="projects" className="section pane" hidden={pane!=='projects'}><ProjectIndexHeading visible={projects.length} total={data.projects.length}/>
          <div className="filters"><div className="segmented">{(['all','S','A'] as const).map(f=><button key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f==='all'?'全部':f+' 级'}</button>)}</div><label><CalendarDays size={15}/><select aria-label="季度筛选" value={quarterFilter} onChange={e=>setQuarterFilter(e.target.value)}><option value="all">全年</option>{options(QUARTERS)}</select></label></div>
          <div className="cards">{projects.map(p=><article key={p.id} className="project viewer-project" id={p.id} tabIndex={-1} style={{'--theme':p.color} as CSSProperties}>
            <ProjectCover project={p}/>
            <ProjectSummary project={p}/>
            <dl className="viewer-categories"><div><dt>搭建形式</dt><dd>{primaryFormLabel(p)}</dd></div><div><dt>体验模式</dt><dd>{experienceModeLabel(p)}</dd></div></dl>
            <div className="viewer-budget"><span>预算 <b>****</b></span><span>搭建 <b>****</b></span><span>体验 <b>****</b></span></div>
          </article>)}</div>
          {!projects.length&&<p className="panel">这个级别暂无项目。</p>}
        </section>
        <ResourceAnalysis items={data.projects} approx={data.charts} hidden={pane!=='resources'}/>
        <footer><LockKeyhole size={14}/> 规划只读 · 费用隐藏<span>INS LAND / 2027</span></footer>
      </div>
    </main>
  </div>;
}
type Confirmation={title:string;description:string;action:()=>void};
export default function Planner() {
  const store=usePlanner();
  const artwork=useCampaignArtwork(store.snapshot?.role);
  const pane=usePane(true);
  const jumpToProject=useProjectJump(pane);
  const [tier,setTier]=useState('S'),[q,setQ]=useState('all'),[form,setForm]=useState('all');
  const [dark,setDark]=useState(false),[notice,setNotice]=useState('');
  const [confirm,setConfirm]=useState<Confirmation|null>(null);
  const [resetStep,setResetStep]=useState(false);
  const input=useRef<HTMLInputElement>(null),dialog=useRef<HTMLDialogElement>(null),menu=useRef<HTMLDetailsElement>(null);
  const [excelBusy,setExcelBusy]=useState(false);
  useEffect(()=>{try{setDark(localStorage.getItem('ins-y27-theme')==='dark');}catch{}},[]);
  useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';},[dark]);
  useEffect(()=>{if(confirm&&!dialog.current?.open)dialog.current?.showModal();else if(!confirm&&dialog.current?.open)dialog.current.close();},[confirm]);
  const ask=(value:Confirmation)=>{setResetStep(false);setConfirm(value);};
  const toggle=()=>{setDark(!dark);try{localStorage.setItem('ins-y27-theme',dark?'light':'dark');}catch{}};
  const items=store.items??[], shown=filterProjects(items,tier,q,form), baseline=store.snapshot?.role==='owner'?store.snapshot.baseline:0, t=summary(items,baseline);
  const weekday=store.snapshot?.role==='owner'?store.snapshot.weekdayPlan:undefined;
  const edit=(id:string,patch:Partial<Project>)=>{
    const active=items.find(x=>x.id===id);
    if(active&&patch.tier&&active.tier!==patch.tier){patch.code=nextCode(items,patch.tier);setTier(patch.tier);}
    if(patch.primary&&form!=='all'&&patch.primary!==form&&active?.secondary!==form)setForm('all');
    if(patch.secondary&&form!=='all'&&patch.secondary!==form&&active?.primary!==form)setForm('all');
    if(patch.start&&q!=='all'&&quarter(patch.start)!==q)setQ('all');
    store.change(items.map(p=>p.id===id?{...p,...patch}:p));
  };
  const add=(source?:Project)=>{
    if(items.length>=300){setNotice('已达 300 项上限。');return;}
    const chosen=source?.tier??(tier==='A'?'A':'S'), code=nextCode(items,chosen);
    const p:Project={build:null,experience:null,notes:'',primary:'待定',secondary:'不叠加',status:'规划中',name:'新建项目',start:'2027-01-01',end:'2027-01-01',budget:0,color:COLORS[items.length%COLORS.length],
      ...(source?{...source,name:source.name.slice(0,95)+'（副本）'}:{}),id:crypto.randomUUID(),code,tier:chosen,spent:null,payments:[],settlement:undefined};
    store.change([p,...items]);setTier(chosen);setQ('all');setForm('all');setNotice(source?'已复制 '+p.code:'已新增 '+p.code);
    requestAnimationFrame(()=>{
      const project=document.getElementById(p.id);
      const editor=project?.querySelector<HTMLDetailsElement>('.project-editor');
      if(editor)editor.open=true;
      project?.scrollIntoView({block:'nearest'});
    });
  };
  const exportExcel=async()=>{
    setExcelBusy(true);
    try{
      const {default:ExcelJS}=await import('exceljs');
      const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('2027 年度项目');
      sheet.addRow(HEADERS);rows(items).forEach(row=>sheet.addRow(row));
      sheet.getRow(1).font={bold:true};sheet.views=[{state:'frozen',ySplit:1}];
      sheet.columns.forEach((col,i)=>{col.width=i===2?25:i===14?36:18;if((i>=8&&i<=11)||(i>=15&&i<=18))col.numFmt='"¥"#,##0.00';});
      const bytes=await book.xlsx.writeBuffer();
      download(new Uint8Array(bytes),'INS-Y27-Campaign.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }catch{setNotice('Excel 导出失败，请重试或导出 CSV。');}finally{setExcelBusy(false);}
  };
  if(store.snapshot?.role==='viewer')return <Viewer data={store.snapshot} artwork={artwork} dark={dark} toggle={toggle} logout={()=>void store.logout()} error={store.error}/>;
  if(!store.items)return <LoginReel busy={store.loading} error={store.error} onLogin={(name,password,register)=>void store.login(name,password,register)}/>;

  return <div className="shell">
    <Sidebar pane={pane} owner/>
    <main>
      <header className="topbar"><div className="breadcrumb"><span>INS LAND</span><span>/</span><strong>{PANE_INFO[pane].label}</strong></div>
      <div className="actions"><span className="save" aria-live="polite"><span className="dot"/>{store.status}</span><button className="icon" aria-label={dark?'切换浅色主题':'切换深色主题'} onClick={toggle}>{dark?<Sun/>:<Moon/>}</button><span className="role-chip">管理者</span><button className="icon" aria-label="退出登录" disabled={store.dirty} onClick={()=>void store.logout()}><LogOut/></button></div></header>
      <div className="content">
      <section id="overview" className="pane" hidden={pane!=='overview'}>
        <div className="campaign-masthead">
          <CampaignHero/>
          <CampaignGallery projects={items} artwork={artwork} openProject={id=>{setTier('all');setQ('all');setForm('all');jumpToProject(id);}}/>
        </div>
        <PlanOverview items={items} budget={t} weekday={weekday} openQuarter={q=>{setTier('all');setQ(q);setForm('all');window.location.hash='projects';}} openProject={id=>{setTier('all');setQ('all');setForm('all');jumpToProject(id);}}/>
      </section>
      <section id="budget" className="section pane" hidden={pane!=='budget'}>
        <header className="budget-heading project-index-heading">
          <span className="project-index-kicker" lang="en">FINANCE / 2027</span>
          <p className="project-index-display" lang="en" aria-hidden="true">Budget</p>
          <h2>预算看板</h2>
        </header>
        <SpendingBoard items={items} baseline={baseline} weekday={weekday} openProject={id=>{setTier('all');setQ('all');setForm('all');jumpToProject(id,true);}}/>
      </section>
      {store.error&&<div className="banner" role="alert">{store.error}<div className="actions">
        {store.dirty&&<button onClick={()=>void store.flush()}>重试同步</button>}
        <button onClick={()=>ask({title:'重新加载工作台？',description:'未保存的修改会丢失。建议先导出 JSON 草稿。',action:()=>void store.load()})}>重新加载</button>
      </div></div>}
      <section id="projects" className="section pane" hidden={pane!=='projects'}>
        <ProjectIndexHeading visible={shown.length} total={items.length}>
        <div className="actions"><details className="menu" ref={menu} onClick={e=>{if(e.target instanceof Element&&e.target.closest('button')&&menu.current)menu.current.open=false;}}><summary><ArrowDownToLine size={15}/> 数据 <ChevronDown size={13}/></summary><div>
          <button disabled={excelBusy} onClick={()=>void exportExcel()}>导出 Excel</button><button onClick={()=>download(csv(items),'INS-Y27-Campaign.csv','text/csv;charset=utf-8')}>导出 CSV</button>
          <button onClick={()=>download(backup(items),'INS-Y27-Backup.json','application/json')}>导出 JSON 备份</button><button onClick={()=>input.current?.click()}>导入 JSON 备份</button>
          <button className="danger" onClick={()=>{setResetStep(true);setConfirm({title:'恢复初始化数据？',description:'此操作将用 17 个初始项目替换当前计划。建议先导出 JSON 备份。',action:()=>{void store.reset().then(ok=>{if(ok){setTier('S');setQ('all');setForm('all');setNotice('已恢复初始计划');}});}});}}>恢复初始化数据</button>
        </div></details>
        <button className="primary" onClick={()=>add()}><Plus size={16}/>新增项目</button></div></ProjectIndexHeading>
        <input type="file" accept=".json,application/json" hidden ref={input} onChange={async e=>{
          const file=e.target.files?.[0];e.target.value='';if(!file)return;
          try{if(file.size>2_000_000)throw new Error();const next=readBackup(await file.text());
            ask({title:'导入并替换当前计划？',description:'备份包含 '+next.length+' 个项目。导入后会替换当前所有项目。',action:()=>{store.change(next);setTier('all');setQ('all');setForm('all');setNotice('已导入 '+next.length+' 个项目');}});
          }catch{setNotice('导入失败：请选择有效的 2027 年度 JSON 备份。');}
        }}/>
        <div className="filters"><div className="segmented" aria-label="级别筛选">{[['S','S 级'],['A','A 级'],['all','全部']].map(([value,label])=><button key={value} aria-pressed={tier===value} onClick={()=>setTier(value)}>{label}</button>)}</div>
          <label><CalendarDays size={15}/><select aria-label="季度筛选" value={q} onChange={e=>setQ(e.target.value)}><option value="all">全年</option>{options(QUARTERS)}</select></label>
          <label><select aria-label="搭建形式与体验模式筛选" value={form} onChange={e=>setForm(e.target.value)}><option value="all">搭建 / 体验</option>{options(FORM_FILTERS.filter(value=>PRIMARY_FORMS.some(primary=>primary===value)||EXPERIENCE_MODES.some(mode=>mode===value)||items.some(p=>p.primary===value||p.secondary===value)))}</select></label></div>
        {notice&&<p className="notice" role="status">{notice}<button className="icon" onClick={()=>setNotice('')} aria-label="关闭提示">×</button></p>}
        <div className="cards">{shown.map(p=><Card key={p.id} p={p} edit={patch=>edit(p.id,patch)} copy={()=>add(p)} remove={()=>ask({title:'删除 '+p.code+'？',description:'将从年度计划移除「'+p.name+'」，预算会随之更新。',action:()=>store.change(items.filter(x=>x.id!==p.id))})}/>)}</div>
        {!shown.length&&<div className="empty panel">当前筛选下没有项目。<button onClick={()=>{setTier('all');setQ('all');setForm('all');}}>清除筛选</button></div>}
      </section>
      <ResourceAnalysis items={items} financial={{items,weekday}} hidden={pane!=='resources'}/>
      <footer><Database size={14}/> 云端工作台<span>INS LAND / 2027</span></footer>
      </div>
    </main>
    <dialog ref={dialog} onClose={()=>setConfirm(null)}><h2>{confirm?.title}</h2><p>{confirm?.description}</p><div className="actions"><button autoFocus onClick={()=>setConfirm(null)}>取消</button>
      <button className="primary" onClick={()=>{
        if(resetStep){setResetStep(false);setConfirm(v=>v&&{...v,title:'再次确认恢复？',description:'确认后将覆盖当前年度计划。'});return;}
        confirm?.action();setConfirm(null);
      }}><Check size={16}/>{resetStep?'继续':'确认'}</button></div></dialog>
  </div>;
}
