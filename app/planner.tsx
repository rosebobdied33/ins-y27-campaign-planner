'use client';
import {useEffect,useRef,useState,type CSSProperties,type FormEvent} from 'react';
import {ArrowDownToLine,ArrowUpRight,BarChart3,CalendarDays,Check,ChevronDown,Copy,Database,LayoutGrid,LockKeyhole,LogOut,Moon,Plus,Search,Sun,Trash2,Wallet} from 'lucide-react';
import {allocation,backup,COLORS,csv,durationDays,filterProjects,FORM_FILTERS,HEADERS,PRIMARY_FORMS,primaryFormLabel,nextCode,number,parseMoney,percent,QUARTERS,quarter,readBackup,recordedSpend,rows,settlementMonths,SECONDARY,STATUSES,spending,summary,yuan,type Project,type Tier} from '../lib/planner';
import {useCampaignArtwork,usePlanner,type ViewerData} from '../lib/storage';

import {PlanOverview} from './overview';
import {CampaignGallery,ProjectArtwork,type CampaignArtwork} from './campaign-gallery';
import {ProjectSettlement} from './project-settlement';

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
function Donut({segments,caption,value,label}:{segments:Segment[];caption:string;value:string;label:string}) {
  const total=segments.reduce((n,s)=>n+s.value,0);
  let offset=0;
  return <div className="donut" role="img" aria-label={label}>
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="51" fill="none" stroke="var(--line)" strokeWidth="10"/>
      {segments.map((segment,i)=>{
        const length=percent(segment.value,total), start=offset;
        offset+=length;
        return length>0&&<circle key={i} cx="60" cy="60" r="51" fill="none" stroke={segment.color} strokeWidth="10"
          pathLength="100" strokeDasharray={`${length} ${100-length}`} strokeDashoffset={-start} transform="rotate(-90 60 60)"/>;
      })}
    </svg>
    <div aria-hidden="true"><b>{value}</b><small>{caption}</small></div>
  </div>;
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
  const [target,setTarget]=useState<string|null>(null);
  useEffect(()=>{
    if(pane!=='projects'||target===null)return;
    const project=document.getElementById(target);
    project?.scrollIntoView({block:'start'});
    project?.focus({preventScroll:true});
    setTarget(null);
  },[pane,target]);
  return (id:string)=>{
    setTarget(id);
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
function CampaignHero({viewer=false}:{viewer?:boolean}) {
  return <div className="hero"><div><div className="eyebrow">INS LAND · 2027</div>
    <h1>年度活动规划</h1><p>2027 年度活动规划{viewer?' · 浏览模式':'与预算工作台'}</p>
  </div><span className="year">2027</span></div>;
}
function CampaignDates({start,end}:{start:string;end:string}) {
  const days=durationDays(start,end);
  return <div className="date-caption"><CalendarDays size={13} aria-hidden="true"/><span>{dateLabel(start)} — {dateLabel(end)}</span>{days!==null&&<strong className="duration" title="含开始日和结束日">共 {days} 天</strong>}</div>;
}
function Card({p,artwork,edit,copy,remove}:{p:Project;artwork?:string;edit:(patch:Partial<Project>)=>void;copy:()=>void;remove:()=>void}) {
  const gap=allocation(p), split=(p.build??0)+(p.experience??0);
  const [dateError,setDateError]=useState('');
  const changeDate=(which:'start'|'end', value:string)=>{
    if(!/^20\d\d-\d\d-\d\d$/.test(value)||(which==='start'?value>p.end:value<p.start)){
      setDateError('请填写有效日期，结束日期不得早于开始日期。');return;
    }
    setDateError('');edit({[which]:value});
  };
  return <article className="project" id={p.id} tabIndex={-1} style={{'--theme':p.color} as CSSProperties}>
    <div className="project-stripe" aria-hidden="true"><span/>{p.accent&&<span style={{background:p.accent}}/>}</div>
    <ProjectArtwork src={artwork} name={p.name}/>
    <div className="card-meta"><span className="dot"/><strong>{p.code}</strong><span className="tag">{quarter(p.start)}</span><div className="card-actions"><button className="icon" title="复制项目" aria-label="复制项目" onClick={copy}><Copy/></button><button className="icon" title="删除项目" aria-label="删除项目" onClick={remove}><Trash2/></button></div></div>
    <input className="project-name" aria-label="主题名称" maxLength={100} placeholder="输入项目主题" value={p.name} onChange={e=>edit({name:e.target.value})}/>
    <CampaignDates start={p.start} end={p.end}/>
    <div className="date-pair"><label>开始<input aria-label="开始日期" type="date" min="2000-01-01" max={p.end} value={p.start} onChange={e=>changeDate('start',e.target.value)}/></label><label>结束<input aria-label="结束日期" type="date" min={p.start} max="2099-12-31" value={p.end} onChange={e=>changeDate('end',e.target.value)}/></label></div>
    {dateError&&<small className="danger" role="alert">{dateError}</small>}
    <div className="fields"><label>级别<select aria-label="级别" value={p.tier} onChange={e=>edit({tier:e.target.value as Tier})}><option value="S">S 级</option><option value="A">A 级</option></select></label>
    <label>状态<select aria-label="状态" value={p.status} onChange={e=>edit({status:e.target.value as Project['status']})}>{options(STATUSES)}</select></label></div>
    <details className="budget-disclosure">
      <summary>
        <span className="budget-disclosure-label">总预算</span>
        <strong className="budget-disclosure-amount">{yuan(p.budget)}</strong>
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
    <div className="fields"><label>主导形式<select aria-label="主导形式" value={p.primary} onChange={e=>edit({primary:e.target.value as Project['primary']})}>
      {p.primary==='全楼运营'&&<option value="全楼运营" disabled>全楼运营（历史值）</option>}
      {options(PRIMARY_FORMS.filter(v=>v!==p.secondary))}
    </select></label>
    <label>叠加形式<select aria-label="叠加形式" value={p.secondary} onChange={e=>edit({secondary:e.target.value as Project['secondary']})}>{options(SECONDARY.filter(v=>v!==p.primary))}</select></label></div>
    {p.primary==='其他'&&<label className="primary-detail">自定义主导形式<input aria-label="自定义主导形式" maxLength={80} placeholder="输入活动形式" value={p.primaryDetail??''} onChange={e=>edit({primaryDetail:e.target.value})}/></label>}
    <details className="notes"><summary>备注 {p.notes&&<span className="dot"/>}<ChevronDown size={14}/></summary><textarea aria-label="备注" placeholder="记录创意方向、场景想法或特殊要求" maxLength={1000} rows={3} value={p.notes} onChange={e=>edit({notes:e.target.value})}/></details>
  </article>;
}
function SpendingBoard({items,baseline,openProject}:{items:Project[];baseline:number;openProject:(id:string)=>void}) {
  const [series,setSeries]=useState<'plan'|'paid'>('plan');
  const [selectedQuarter,setSelectedQuarter]=useState<string|null>(null);
  const totals=spending(items), plan=summary(items,baseline);
  const settledMonths=settlementMonths(items,'2027');
  const settledQuarters=QUARTERS.map((_,i)=>settledMonths.slice(i*3,i*3+3).reduce((sum,amount)=>sum+amount,0));
  const values=series==='plan'?plan.quarters:settledQuarters;
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
        <div className="budget-feature-copy">
          <h3 className="budget-title">年度预算基准</h3>
          <strong className="budget-number">{yuan(baseline)}</strong>
          <p>已规划 <b>{yuan(plan.total)}</b> · {items.length} 项</p>
          <span className={'budget-pill '+(plan.remaining<0?'danger':'')}>{plan.remaining<0?'超出基准':'基准余量'} {yuan(Math.abs(plan.remaining))}</span>
        </div>
        <Donut segments={[
          {value:Math.min(plan.total,baseline),color:'var(--budget-lilac)'},
          {value:Math.max(-plan.remaining,0),color:'var(--budget-coral)'},
          {value:Math.max(plan.remaining,0),color:'var(--budget-ring-track)'},
        ]} value={pct(plan.total,baseline)} caption="规划率" label={'年度预算规划率 '+pct(plan.total,baseline)}/>
      </article>
      <article className="panel budget-snapshot budget-paid">
        <h3 className="budget-title">实际已支出</h3><strong className="budget-number">{paidLabel}</strong>
        <Ratio segments={[{value:totals.paid,color:'var(--budget-teal)'}]} scale={coverage} label={'已支出占已支出与待结算预算合计 '+pct(totals.paid,coverage)}/>
        <p>{totals.recorded?`${totals.withPayment} 项已有支出`:'暂无支出记录'}{totals.over>0&&<b className="danger"> · 超支 {yuan(totals.over)}</b>}</p>
        {actualSplit.count>0&&<p>已结算搭建 {yuan(actualSplit.build)} · 体验 {yuan(actualSplit.experience)}</p>}
      </article>
      <article className="panel budget-snapshot budget-pending">
        <h3 className="budget-title">待结算预算</h3><strong className="budget-number">{yuan(totals.pending)}</strong>
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
            aria-pressed={selectedQuarter===q} aria-label={`${q} ${yuan(values[i])}，占全年 ${pct(values[i],total)}，筛选明细`}
            onClick={()=>setSelectedQuarter(selectedQuarter===q?null:q)}>
            <span className="budget-column-value">{total?pct(values[i],total):'—'}</span>
            <span className="budget-column-track" aria-hidden="true"><i style={{height:pct(values[i],peak)}}/></span>
            <strong>{q}</strong><small>{yuan(values[i])}</small>
          </button>)}
        </div>
        <p className="budget-hint">{series==='plan'?'按项目开始季度归集':'按 2027 年结算季度归集'} · 点柱图筛选明细</p>
      </article>

      <div className="budget-structure">
        <article className="panel budget-tier">
          <h3 className="budget-title">S / A 预算结构</h3>
          <div className="chart-pair">
            <Donut segments={tierSegments(plan.S,plan.A)} value={plan.total?pct(plan.S,plan.total):'—'} caption="S 级占比" label={'S 级 '+pct(plan.S,plan.total)+'，A 级 '+pct(plan.A,plan.total)}/>
            <div className="chart-list">
              <div><span><i style={{background:'var(--tier-s)'}}/>S 级</span><b>{yuan(plan.S)}</b></div>
              <div><span><i style={{background:'var(--tier-a)'}}/>A 级</span><b>{yuan(plan.A)}</b></div>
            </div>
          </div>
        </article>
        <article className="panel budget-allocation">
          <h3 className="budget-title">费用分配结构</h3>
          <Ratio segments={[...splitSegments(plan.build,plan.experience),{value:plan.unallocated,color:'var(--unassigned)'}]} scale={splitTotal}
            label={`搭建 ${yuan(plan.build)}，体验 ${yuan(plan.experience)}，待分配 ${yuan(plan.unallocated)}`}/>
          <div className="chart-list">
            <div><span><i style={{background:'var(--build)'}}/>搭建</span><b>{yuan(plan.build)}</b></div>
            <div><span><i style={{background:'var(--experience)'}}/>体验</span><b>{yuan(plan.experience)}</b></div>
            <div><span><i style={{background:'var(--unassigned)'}}/>待分配</span><b>{yuan(plan.unallocated)}</b></div>
          </div>
          {plan.over>0&&<p className="danger">分配超额 {yuan(plan.over)}</p>}
        </article>
      </div>
    </div>

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

function Annual({items,hidden}:{items:Project[];hidden:boolean}) {
  const t=summary(items), used=t.build+t.experience;
  const types=FORM_FILTERS.map((name,i)=>{
    const group=items.filter(p=>p.primary===name);
    return {name,count:group.length,value:group.reduce((s,p)=>s+p.budget,0),color:COLORS[i%COLORS.length]};
  }).filter(g=>g.count);
  const track=(title:string,value:number,max:number,color:string,tag?:string)=><div className="track" key={title}><div><span>{title} {tag&&<small>{tag}</small>}</span><b>{yuan(value)}</b></div><Ratio segments={[{value,color}]} scale={max} label={title+' '+yuan(value)}/></div>;
  const quarterMix=QUARTERS.map(q=>summary(items.filter(p=>quarter(p.start)===q)));
  const peak=Math.max(...quarterMix.map(m=>m.total));
  const tierLegend=<div className="split-legend tier-legend"><span><i/>S 级</span><span><i/>A 级</span></div>;
  return <section id="resources" className="section pane" hidden={hidden}>
    <div className="section-heading"><h2>年度资源分析</h2><p>统计范围为全年全部项目。季度按项目开始日期归属。</p></div>
    <div className="analytics">
      <article className="panel"><h3>季度预算对比</h3><p>同一金额刻度 · 跨季度项目只计一次</p>
        {quarterMix.map((m,i)=><div className="track quarter-track" key={QUARTERS[i]}>
          <div><strong>{QUARTERS[i]}</strong><b>{yuan(m.total)}</b></div>
          <Ratio segments={tierSegments(m.S,m.A)} scale={peak} label={QUARTERS[i]+' S 级 '+yuan(m.S)+'，A 级 '+yuan(m.A)}/>
          <div className="quarter-detail"><span>S {yuan(m.S)}</span><span>A {yuan(m.A)}</span></div>
        </div>)}{tierLegend}
      </article>
      <article className="panel"><h3>搭建 / 体验预算结构</h3><p>环图只统计已填写的搭建和体验金额</p>
        <div className="chart-pair">
          <Donut segments={splitSegments(t.build,t.experience)} value={used?'100%':'—'} caption={used?'已细分':'待填费用'} label={'搭建 '+pct(t.build,used)+'，体验 '+pct(t.experience,used)}/>
          <div className="chart-list">
            <div><span><i style={{background:'var(--build)'}}/>搭建 {used?pct(t.build,used):'—'}</span><b>{yuan(t.build)}</b></div>
            <div><span><i style={{background:'var(--experience)'}}/>体验 {used?pct(t.experience,used):'—'}</span><b>{yuan(t.experience)}</b></div>
          </div>
        </div>
        <div className="key-value"><span>项目待分配合计</span><b>{yuan(t.unallocated)}</b></div>
        <div className={'key-value '+(t.over?'danger':'')}><span>项目超额合计</span><b>{yuan(t.over)}</b></div>
      </article>
      <article className="panel"><h3>项目类型分布</h3><p>按主导形式 · 数量与预算</p>{types.length?types.map(g=>track(g.name,g.value,t.total,g.color,g.count+' 项')):<p>暂无项目</p>}</article>
      <article className="panel"><h3>S 级 / A 级预算对比</h3><p>占全年项目预算比例</p>{track('S 级',t.S,t.total,'var(--tier-s)',pct(t.S,t.total))}{track('A 级',t.A,t.total,'var(--tier-a)',pct(t.A,t.total))}</article>
    </div>
  </section>;
}
function Viewer({data,artwork,dark,toggle,logout,error}:{data:ViewerData;artwork:CampaignArtwork;dark:boolean;toggle:()=>void;logout:()=>void;error:string}) {
  const [filter,setFilter]=useState<'all'|Tier>('all');
  const [quarterFilter,setQuarterFilter]=useState('all');
  const pane=usePane(false);
  const jumpToProject=useProjectJump(pane);
  const projects=data.projects.filter(p=>(filter==='all'||p.tier===filter)&&(quarterFilter==='all'||quarter(p.start)===quarterFilter));
  const {tier,build,quarters}=data.charts;
  const approx=(p:number|null)=>p===null?'暂无细分':'约 '+p+'%';
  return <div className="shell viewer">
    <Sidebar pane={pane} owner={false}/>
    <main>
      <header className="topbar"><div className="breadcrumb"><span>INS LAND</span><span>/</span><strong>{PANE_INFO[pane].label}</strong></div>
        <div className="actions"><span className="role-chip">浏览者</span><button className="icon" aria-label={dark?'切换浅色主题':'切换深色主题'} onClick={toggle}>{dark?<Sun/>:<Moon/>}</button><button className="icon" aria-label="退出登录" onClick={logout}><LogOut/></button></div>
      </header>
      <div className="content">
        <section id="overview" className="pane" hidden={pane!=='overview'}>
          <CampaignHero viewer/>
          <CampaignGallery projects={data.projects} artwork={artwork} openProject={id=>{setFilter('all');setQuarterFilter('all');jumpToProject(id);}}/>
          <PlanOverview items={data.projects} openQuarter={q=>{setFilter('all');setQuarterFilter(q);window.location.hash='projects';}} openProject={id=>{setFilter('all');setQuarterFilter('all');jumpToProject(id);}}/>
        </section>
        {error&&<p className="banner" role="alert">{error}</p>}
        <section id="projects" className="section pane" hidden={pane!=='projects'}><div className="section-heading"><h2>年度项目 <small>{projects.length} / {data.projects.length}</small></h2></div>
          <div className="filters"><div className="segmented">{(['all','S','A'] as const).map(f=><button key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f==='all'?'全部':f+' 级'}</button>)}</div><label><CalendarDays size={15}/><select aria-label="季度筛选" value={quarterFilter} onChange={e=>setQuarterFilter(e.target.value)}><option value="all">全年</option>{options(QUARTERS)}</select></label></div>
          <div className="cards">{projects.map(p=><article key={p.id} className="project viewer-project" id={p.id} tabIndex={-1} style={{'--theme':p.color} as CSSProperties}>
            <div className="project-stripe" aria-hidden="true"><span/>{p.accent&&<span style={{background:p.accent}}/>}</div>
            <ProjectArtwork src={artwork[p.id]} name={p.name}/>
            <div className="card-meta"><span className="dot"/><strong>{p.code}</strong><span className="tag">{quarter(p.start)}</span><span className="viewer-status">{p.status}</span></div>
            <h3>{p.name||'未命名项目'}</h3><CampaignDates start={p.start} end={p.end}/>
            <p className="viewer-forms">{primaryFormLabel(p)}{p.secondary!=='不叠加'&&' · '+p.secondary}</p>
            <div className="viewer-budget"><span>预算 <b>****</b></span><span>搭建 <b>****</b></span><span>体验 <b>****</b></span></div>
          </article>)}</div>
          {!projects.length&&<p className="panel">这个级别暂无项目。</p>}
        </section>
        <section id="resources" className="section pane" hidden={pane!=='resources'}><div className="section-heading"><h2>年度资源概览</h2><p>占比按约 10 个百分点取整。季度条只显示相对规模。</p></div>
          <div className="analytics">
            <article className="panel"><h3>级别预算结构</h3><div className="chart-pair"><Donut segments={tier===null?[]:tierSegments(tier,100-tier)} value={tier===null?'—':'约 '+tier+'%'} caption="S 级占比" label={'S 级 '+approx(tier)}/><div className="chart-list"><div><span>S 级</span><b>{approx(tier)}</b></div><div><span>A 级</span><b>{approx(tier===null?null:100-tier)}</b></div></div></div></article>
            <article className="panel"><h3>季度资源规模</h3>{QUARTERS.map((q,i)=><div className="track" key={q}><div><strong>{q}</strong></div><Ratio segments={[{value:quarters[i]??0,color:'var(--tier-s)'}]} scale={100} label={q+' 相对规模'}/></div>)}</article>
            <article className="panel"><h3>搭建 / 体验结构</h3><div className="chart-pair"><Donut segments={build===null?[]:splitSegments(build,100-build)} value={build===null?'—':'约 '+build+'%'} caption="搭建占比" label={'搭建 '+approx(build)}/><div className="chart-list"><div><span>搭建</span><b>{approx(build)}</b></div><div><span>体验</span><b>{approx(build===null?null:100-build)}</b></div></div></div></article>
            <article className="panel"><h3>活动形式分布</h3>{FORM_FILTERS.map(name=>[name,data.projects.filter(p=>p.primary===name).length] as const).filter(([,count])=>count>0).map(([name,count])=><div className="track" key={name}><div><span>{name}</span><b>{count} 项</b></div><Ratio segments={[{value:count,color:'var(--tier-a)'}]} scale={data.projects.length} label={name+' '+count+' 项'}/></div>)}</article>
          </div>
        </section>
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
  const [register,setRegister]=useState(false);
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
    requestAnimationFrame(()=>document.getElementById(p.id)?.scrollIntoView({block:'nearest'}));
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
  const login=(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();const data=new FormData(e.currentTarget);
    void store.login(String(data.get('handle')).trim(),String(data.get('password')),register);
  };
  if(store.snapshot?.role==='viewer')return <Viewer data={store.snapshot} artwork={artwork} dark={dark} toggle={toggle} logout={()=>void store.logout()} error={store.error}/>;
  if(!store.items)return <div className="auth"><div className="auth-card panel">
    <Brand/><span className="eyebrow">2027 年度工作台</span><h1>INS LAND 年度规划</h1>
    <p>登录查看 2027 活动规划。费用仅对管理者开放。</p>
    {store.error&&<p className="danger" role="alert">{store.error}</p>}
    <div className="segmented auth-tabs"><button aria-pressed={!register} onClick={()=>setRegister(false)} disabled={store.loading}>登录</button><button aria-pressed={register} onClick={()=>setRegister(true)} disabled={store.loading}>注册浏览账号</button></div>
    <form key={String(register)} onSubmit={login}>
      <label>{register?'你的名字':'账号或注册姓名'}<input name="handle" required minLength={2} maxLength={32} autoComplete="username" placeholder={register?'输入 2–32 个字符':'输入账号或姓名'}/></label>
      <label>{register?'注册密码':'密码'}<input name="password" type="password" required maxLength={72} autoComplete={register?'new-password':'current-password'} placeholder="输入密码"/></label>
      {register&&<p className="helper">使用分享人提供的默认密码。注册后可查看规划和概览图。</p>}
      <button className="primary" disabled={store.loading}>{store.loading?'正在连接…':register?'注册并进入':'登录'}</button>
    </form>
  </div></div>;

  return <div className="shell">
    <Sidebar pane={pane} owner/>
    <main>
      <header className="topbar"><div className="breadcrumb"><span>INS LAND</span><span>/</span><strong>{PANE_INFO[pane].label}</strong></div>
      <div className="actions"><span className="save" aria-live="polite"><span className="dot"/>{store.status}</span><button className="icon" aria-label={dark?'切换浅色主题':'切换深色主题'} onClick={toggle}>{dark?<Sun/>:<Moon/>}</button><span className="role-chip">管理者</span><button className="icon" aria-label="退出登录" disabled={store.dirty} onClick={()=>void store.logout()}><LogOut/></button></div></header>
      <div className="content">
      <section id="overview" className="pane" hidden={pane!=='overview'}>
        <CampaignHero/>
        <CampaignGallery projects={items} artwork={artwork} openProject={id=>{setTier('all');setQ('all');setForm('all');jumpToProject(id);}}/>
        <PlanOverview items={items} budget={t} openQuarter={q=>{setTier('all');setQ(q);setForm('all');window.location.hash='projects';}} openProject={id=>{setTier('all');setQ('all');setForm('all');jumpToProject(id);}}/>
      </section>
      <section id="budget" className="section pane" hidden={pane!=='budget'}>
        <div className="section-heading pane-heading"><h2>预算看板</h2></div>
        <SpendingBoard items={items} baseline={baseline} openProject={id=>{setTier('all');setQ('all');setForm('all');jumpToProject(id);}}/>
      </section>
      {store.error&&<div className="banner" role="alert">{store.error}<div className="actions">
        {store.dirty&&<button onClick={()=>void store.flush()}>重试同步</button>}
        <button onClick={()=>ask({title:'重新加载工作台？',description:'未保存的修改会丢失。建议先导出 JSON 草稿。',action:()=>void store.load()})}>重新加载</button>
      </div></div>}
      <section id="projects" className="section pane" hidden={pane!=='projects'}>
        <div className="section-heading project-heading"><div><h2>年度项目 <small>{shown.length} / {items.length}</small></h2></div>
        <div className="actions"><details className="menu" ref={menu} onClick={e=>{if(e.target instanceof Element&&e.target.closest('button')&&menu.current)menu.current.open=false;}}><summary><ArrowDownToLine size={15}/> 数据 <ChevronDown size={13}/></summary><div>
          <button disabled={excelBusy} onClick={()=>void exportExcel()}>导出 Excel</button><button onClick={()=>download(csv(items),'INS-Y27-Campaign.csv','text/csv;charset=utf-8')}>导出 CSV</button>
          <button onClick={()=>download(backup(items),'INS-Y27-Backup.json','application/json')}>导出 JSON 备份</button><button onClick={()=>input.current?.click()}>导入 JSON 备份</button>
          <button className="danger" onClick={()=>{setResetStep(true);setConfirm({title:'恢复初始化数据？',description:'此操作将用 17 个初始项目替换当前计划。建议先导出 JSON 备份。',action:()=>{void store.reset().then(ok=>{if(ok){setTier('S');setQ('all');setForm('all');setNotice('已恢复初始计划');}});}});}}>恢复初始化数据</button>
        </div></details>
        <button className="primary" onClick={()=>add()}><Plus size={16}/>新增项目</button></div></div>
        <input type="file" accept=".json,application/json" hidden ref={input} onChange={async e=>{
          const file=e.target.files?.[0];e.target.value='';if(!file)return;
          try{if(file.size>2_000_000)throw new Error();const next=readBackup(await file.text());
            ask({title:'导入并替换当前计划？',description:'备份包含 '+next.length+' 个项目。导入后会替换当前所有项目。',action:()=>{store.change(next);setTier('all');setQ('all');setForm('all');setNotice('已导入 '+next.length+' 个项目');}});
          }catch{setNotice('导入失败：请选择有效的 2027 年度 JSON 备份。');}
        }}/>
        <div className="filters"><div className="segmented" aria-label="级别筛选">{[['S','S 级'],['A','A 级'],['all','全部']].map(([value,label])=><button key={value} aria-pressed={tier===value} onClick={()=>setTier(value)}>{label}</button>)}</div>
          <label><CalendarDays size={15}/><select aria-label="季度筛选" value={q} onChange={e=>setQ(e.target.value)}><option value="all">全年</option>{options(QUARTERS)}</select></label>
          <label><select aria-label="活动形式筛选" value={form} onChange={e=>setForm(e.target.value)}><option value="all">全部形式</option>{options(FORM_FILTERS)}</select></label></div>
        {notice&&<p className="notice" role="status">{notice}<button className="icon" onClick={()=>setNotice('')} aria-label="关闭提示">×</button></p>}
        <div className="cards">{shown.map(p=><Card key={p.id} p={p} artwork={artwork[p.id]} edit={patch=>edit(p.id,patch)} copy={()=>add(p)} remove={()=>ask({title:'删除 '+p.code+'？',description:'将从年度计划移除「'+p.name+'」，预算会随之更新。',action:()=>store.change(items.filter(x=>x.id!==p.id))})}/>)}</div>
        {!shown.length&&<div className="empty panel">当前筛选下没有项目。<button onClick={()=>{setTier('all');setQ('all');setForm('all');}}>清除筛选</button></div>}
      </section>
      <Annual items={items} hidden={pane!=='resources'}/>
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
