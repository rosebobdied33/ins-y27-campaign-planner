'use client';
import {useEffect,useRef,useState,type CSSProperties,type FormEvent} from 'react';
import {ArrowDownToLine,BarChart3,CalendarDays,Check,ChevronDown,Copy,Database,LayoutGrid,LockKeyhole,LogOut,Moon,Plus,Sun,Trash2,Wallet} from 'lucide-react';
import {allocation,backup,COLORS,csv,durationDays,filterProjects,FORM_FILTERS,HEADERS,PRIMARY_FORMS,primaryFormLabel,nextCode,number,parseMoney,percent,QUARTERS,quarter,readBackup,rows,SECONDARY,STATUSES,spending,summary,yuan,type Project,type Tier} from '../lib/planner';
import {usePlanner,type ViewerData} from '../lib/storage';

import {PlanOverview} from './overview';

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
function Money({label,value,onChange,required=false}:{label:string;value:number|null;onChange:(v:number|null)=>void;required?:boolean}) {
  const [draft,setDraft]=useState('');
  const [editing,setEditing]=useState(false);
  const [error,setError]=useState(false);
  return <label className="money"><span>{label}</span><span className="money-field"><b>¥</b><input aria-label={label} aria-invalid={error} inputMode="decimal"
    value={editing?draft:value===null?'':number(value)} placeholder="—"
    onFocus={e=>{setDraft(e.currentTarget.value);setEditing(true);}}
    onChange={e=>{const raw=e.target.value;setDraft(raw);try{const v=parseMoney(raw);if(v===null&&required){setError(true);return;}onChange(v);setError(false);}catch{setError(true);}}}
    onBlur={()=>{setEditing(false);setError(false);}}
    onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}/></span>{error&&<small className="danger">请输入有效金额，最多两位小数</small>}</label>;
}
type Pane='overview'|'budget'|'projects'|'resources';
const PANE_INFO={
  overview:{label:'年度总览',caption:'Overview',icon:LayoutGrid},
  budget:{label:'预算看板',caption:'Budget',icon:Wallet},
  projects:{label:'项目规划',caption:'Projects',icon:CalendarDays},
  resources:{label:'资源分析',caption:'Resources',icon:BarChart3},
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
function Brand() {return <span className="brand">INS<sup>®</sup></span>;}
function Sidebar({pane,owner}:{pane:Pane;owner:boolean}) {
  const links:Pane[]=owner?['overview','budget','projects','resources']:['overview','projects','resources'];
  return <aside><a className="sidebar-brand" href="#overview"><Brand/><span className="eyebrow">CAMPAIGN PLANNER</span></a>
    <div className="nav-caption">INS LAND / 2027</div>
    <nav aria-label="工作台导航">{links.map(key=>{
      const {icon:Icon,label,caption}=PANE_INFO[key];
      return <a href={'#'+key} key={key} aria-current={pane===key?'page':undefined}><Icon aria-hidden="true"/><span>{label}<small>{caption}</small></span></a>;
    })}</nav>
    <div className="side-bottom"><span>INS STUDIO</span><span>Y27</span></div>
  </aside>;
}
function CampaignHero({viewer=false}:{viewer?:boolean}) {
  return <div className="hero"><div><div className="eyebrow">INS STUDIO / ANNUAL PLANNING</div>
    <h1><span>INS LAND</span><em className="hero-script">Campaign Planner
      <svg className="hero-flourish" viewBox="0 0 520 104" preserveAspectRatio="none" aria-hidden="true">
        <path d="M128 57C89 34 35 3 11 22C-14 43 34 78 84 62C125 49 150 21 192 28C220 33 205 60 178 72C116 100 16 77 4 93"/>
        <path d="M292 61C333 48 370 13 395 18C429 24 387 60 358 76C319 97 374 106 421 92C464 79 501 46 514 57C526 69 480 98 441 87"/>
      </svg></em></h1><p>2027 年度活动规划{viewer?' · 浏览模式':'与预算工作台'}</p>
  </div><span className="year">2027</span></div>;
}
function CampaignDates({start,end}:{start:string;end:string}) {
  const days=durationDays(start,end);
  return <div className="date-caption"><CalendarDays size={13} aria-hidden="true"/><span>{dateLabel(start)} — {dateLabel(end)}</span>{days!==null&&<strong className="duration" title="含开始日和结束日">共 {days} 天</strong>}</div>;
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
  return <article className="project" id={p.id} style={{'--theme':p.color} as CSSProperties}>
    <div className="project-stripe" aria-hidden="true"><span/>{p.accent&&<span style={{background:p.accent}}/>}</div>
    <div className="card-meta"><span className="dot"/><strong>{p.code}</strong><span className="tag">{quarter(p.start)}</span><div className="card-actions"><button className="icon" title="复制项目" aria-label="复制项目" onClick={copy}><Copy/></button><button className="icon" title="删除项目" aria-label="删除项目" onClick={remove}><Trash2/></button></div></div>
    <input className="project-name" aria-label="主题名称" maxLength={100} placeholder="输入项目主题" value={p.name} onChange={e=>edit({name:e.target.value})}/>
    <CampaignDates start={p.start} end={p.end}/>
    <div className="date-pair"><label>开始<input aria-label="开始日期" type="date" min="2000-01-01" max={p.end} value={p.start} onChange={e=>changeDate('start',e.target.value)}/></label><label>结束<input aria-label="结束日期" type="date" min={p.start} max="2099-12-31" value={p.end} onChange={e=>changeDate('end',e.target.value)}/></label></div>
    {dateError&&<small className="danger" role="alert">{dateError}</small>}
    <div className="fields"><label>级别<select aria-label="级别" value={p.tier} onChange={e=>edit({tier:e.target.value as Tier})}><option value="S">S 级</option><option value="A">A 级</option></select></label>
    <label>状态<select aria-label="状态" value={p.status} onChange={e=>edit({status:e.target.value as Project['status']})}>{options(STATUSES)}</select></label></div>
    <div className="card-budget">
      <div className="budget-top"><Money label="预算总额" value={p.budget} required onChange={budget=>budget!==null&&edit({budget})}/>
      <span className={'budget-state '+(gap<0?'danger':gap===0?'success':'')}>{gap<0?'超额 '+yuan(-gap):gap===0?'已分配完成':'待分配 '+yuan(gap)}</span></div>
      <div className="split"><Money label="搭建" value={p.build} onChange={build=>edit({build})}/><Money label="体验" value={p.experience} onChange={experience=>edit({experience})}/></div>
      <Ratio segments={[...splitSegments(p.build??0,p.experience??0),{value:Math.max(0,gap),color:'var(--unassigned)'}]} label={'项目预算分配：搭建 '+yuan(p.build??0)+'，体验 '+yuan(p.experience??0)+'，'+(gap<0?'超额 ':'待分配 ')+yuan(Math.abs(gap))}/>
      <div className="split-legend"><span><i/>搭建 {split&&p.build!==null?pct(p.build,split):'—'}</span><span><i/>体验 {split&&p.experience!==null?pct(p.experience,split):'—'}</span>{gap>0&&<span className="unassigned"><i/>待分配</span>}</div>
      <div className="card-payment"><Money label="实际已支出" value={p.spent??null} onChange={spent=>edit({spent})}/><small>{(p.spent??0)>p.budget?'超支 '+yuan((p.spent??0)-p.budget):'待支出 '+yuan(p.budget-(p.spent??0))}</small></div>
    </div>
    <div className="fields"><label>主导形式<select aria-label="主导形式" value={p.primary} onChange={e=>edit({primary:e.target.value as Project['primary']})}>
      {p.primary==='全楼运营'&&<option value="全楼运营" disabled>全楼运营（历史值）</option>}
      {options(PRIMARY_FORMS.filter(v=>v!==p.secondary))}
    </select></label>
    <label>叠加形式<select aria-label="叠加形式" value={p.secondary} onChange={e=>edit({secondary:e.target.value as Project['secondary']})}>{options(SECONDARY.filter(v=>v!==p.primary))}</select></label></div>
    {p.primary==='其他'&&<label className="primary-detail">自定义主导形式<input aria-label="自定义主导形式" maxLength={80} placeholder="输入活动形式" value={p.primaryDetail??''} onChange={e=>edit({primaryDetail:e.target.value})}/></label>}
    <details className="notes"><summary>备注 {p.notes&&<span className="dot"/>}<ChevronDown size={14}/></summary><textarea aria-label="备注" placeholder="记录创意方向、场景想法或特殊要求" maxLength={1000} rows={3} value={p.notes} onChange={e=>edit({notes:e.target.value})}/></details>
  </article>;
}
function SpendingBoard({items,onEdit}:{items:Project[];onEdit:(id:string,spent:number|null)=>void}) {
  const [series,setSeries]=useState<'plan'|'paid'>('plan');
  const [filter,setFilter]=useState('all');
  const totals=spending(items), plan=summary(items);
  const values=series==='plan'?plan.quarters:totals.quarters;
  const total=series==='plan'?plan.total:totals.paid;
  const peak=Math.max(...values);
  const peakLabels=QUARTERS.filter((_,i)=>peak>0&&values[i]===peak).join('、');
  const visible=items.filter(p=>filter==='all'||(filter==='paid'&&(p.spent??0)>0)||(filter==='pending'&&p.budget>(p.spent??0))||(filter==='unrecorded'&&p.spent==null));

  return <div className="year-section">
    <div className="section-heading"><span className="eyebrow">SPEND TRACKER</span><h2>支出进度</h2><p>按项目登记实际付款。待支出为每项预算减去已支出，未录入的项目按计划额计入待支出。</p></div>
    <div className="year-summary spend-metrics">
      <article className="panel year-metric"><span>实际已支出</span><strong>{totals.recorded?yuan(totals.paid):'—'}</strong><p>{totals.withPayment} 项已有付款</p></article>
      <article className="panel year-metric"><span>待支出</span><strong>{yuan(totals.pending)}</strong><p>{totals.withBalance} 项仍有待支出</p></article>
      <article className="panel year-metric"><span>支出录入进度</span><strong>{totals.recorded}<small> / {items.length} 项</small></strong><p>未录入 {items.length-totals.recorded} 项{totals.over>0&&<b className="danger"> · 超预算 {yuan(totals.over)}</b>}</p></article>
    </div>
    <article className="panel phase-budget">
      <div className="calendar-heading"><div><h3>全年预算占比</h3><p>按项目开始季度归集。实际支出也按项目归属统计。</p></div>
      <div className="segmented" aria-label="季度金额口径"><button aria-pressed={series==='plan'} onClick={()=>setSeries('plan')}>规划预算</button><button aria-pressed={series==='paid'} onClick={()=>setSeries('paid')}>实际支出</button></div></div>
      {peakLabels?<p className="peak-label">{peakLabels} {series==='plan'?'规划预算最高':'已登记支出最高'} · {yuan(peak)} · {pct(peak,total)}</p>:<p className="peak-label">{series==='plan'?'暂无规划预算':'暂无已登记的付款金额'}</p>}
      <div className="phase-rows">{QUARTERS.map((q,i)=><div key={q} className="phase-row"><strong>{q}</strong>
        <Ratio segments={[{value:values[i],color:values[i]===peak&&peak>0?'var(--tier-s)':'var(--tier-a)'}]} scale={total} label={q+' 占全年 '+pct(values[i],total)}/>
        <span>{pct(values[i],total)}</span><b>{yuan(values[i])}</b>
      </div>)}</div>
    </article>
    <article className="panel payment-ledger">
      <div className="calendar-heading"><div><h3>项目支出明细</h3><p>填写累计实际支出，图表和项目卡片会一起更新。</p></div>
        <select aria-label="支出明细筛选" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">全部项目</option><option value="paid">已有支出</option><option value="pending">仍有待支出</option><option value="unrecorded">未录入</option></select>
      </div>
      <div className="ledger-scroll"><table><thead><tr><th>项目</th><th>规划预算</th><th>实际已支出</th><th>待支出</th></tr></thead><tbody>
        {visible.map(p=>{
          const balance=p.budget-(p.spent??0);
          return <tr key={p.id}><th scope="row"><span>{p.code} · {quarter(p.start)}</span><b>{p.name||'未命名项目'}</b></th><td>{yuan(p.budget)}</td>
          <td><Money label={p.name+' 实际已支出'} value={p.spent??null} onChange={spent=>onEdit(p.id,spent)}/></td>
          <td className={balance<0?'danger':''}>{balance<0?'超支 ':''}{yuan(Math.abs(balance))}{p.spent==null&&<small>未录入实际支出</small>}</td></tr>;
        })}
      </tbody></table>{!visible.length&&<p className="calendar-empty">当前筛选没有项目。</p>}</div>
    </article>
  </div>;
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
    <div className="section-heading"><span className="eyebrow">03 / RESOURCE MIX</span><h2>年度资源分析</h2><p>统计范围为全年全部项目。季度按项目开始日期归属。</p></div>
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
function Viewer({data,dark,toggle,logout,error}:{data:ViewerData;dark:boolean;toggle:()=>void;logout:()=>void;error:string}) {
  const [filter,setFilter]=useState<'all'|Tier>('all');
  const [quarterFilter,setQuarterFilter]=useState('all');
  const pane=usePane(false);
  const projects=data.projects.filter(p=>(filter==='all'||p.tier===filter)&&(quarterFilter==='all'||quarter(p.start)===quarterFilter));
  const {tier,build,quarters}=data.charts;
  const approx=(p:number|null)=>p===null?'暂无细分':'约 '+p+'%';
  return <div className="shell viewer">
    <Sidebar pane={pane} owner={false}/>
    <main>
      <header className="topbar"><div className="breadcrumb"><span>INS STUDIO</span><span>/</span><strong>{PANE_INFO[pane].label}</strong></div>
        <div className="actions"><span className="role-chip">浏览者</span><button className="icon" aria-label={dark?'切换浅色主题':'切换深色主题'} onClick={toggle}>{dark?<Sun/>:<Moon/>}</button><button className="icon" aria-label="退出登录" onClick={logout}><LogOut/></button></div>
      </header>
      <div className="content">
        <section id="overview" className="pane" hidden={pane!=='overview'}>
          <CampaignHero viewer/>
          <PlanOverview items={data.projects} openQuarter={q=>{setFilter('all');setQuarterFilter(q);window.location.hash='projects';}}/>
        </section>
        {error&&<p className="banner" role="alert">{error}</p>}
        <section id="projects" className="section pane" hidden={pane!=='projects'}><div className="section-heading"><span className="eyebrow">02 / CAMPAIGN INDEX</span><h2>年度项目 <small>{projects.length} / {data.projects.length}</small></h2></div>
          <div className="filters"><div className="segmented">{(['all','S','A'] as const).map(f=><button key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f==='all'?'全部':f+' 级'}</button>)}</div><label><CalendarDays size={15}/><select aria-label="季度筛选" value={quarterFilter} onChange={e=>setQuarterFilter(e.target.value)}><option value="all">全年</option>{options(QUARTERS)}</select></label></div>
          <div className="cards">{projects.map(p=><article key={p.id} className="project viewer-project" style={{'--theme':p.color} as CSSProperties}>
            <div className="project-stripe" aria-hidden="true"><span/>{p.accent&&<span style={{background:p.accent}}/>}</div>
            <div className="card-meta"><span className="dot"/><strong>{p.code}</strong><span className="tag">{quarter(p.start)}</span><span className="viewer-status">{p.status}</span></div>
            <h3>{p.name||'未命名项目'}</h3><CampaignDates start={p.start} end={p.end}/>
            <p className="viewer-forms">{primaryFormLabel(p)}{p.secondary!=='不叠加'&&' · '+p.secondary}</p>
            <div className="viewer-budget"><span>预算 <b>****</b></span><span>搭建 <b>****</b></span><span>体验 <b>****</b></span></div>
          </article>)}</div>
          {!projects.length&&<p className="panel">这个级别暂无项目。</p>}
        </section>
        <section id="resources" className="section pane" hidden={pane!=='resources'}><div className="section-heading"><span className="eyebrow">03 / RESOURCE MIX</span><h2>年度资源概览</h2><p>占比按约 10 个百分点取整。季度条只显示相对规模。</p></div>
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
  const pane=usePane(true);
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
    const p:Project={build:null,experience:null,notes:'',primary:'待定',secondary:'不叠加',status:'规划中',name:'新建 Campaign',start:'2027-01-01',end:'2027-01-01',budget:0,color:COLORS[items.length%COLORS.length],
      ...(source?{...source,name:source.name.slice(0,95)+'（副本）'}:{}),id:crypto.randomUUID(),code,tier:chosen,spent:null};
    store.change([p,...items]);setTier(chosen);setQ('all');setForm('all');setNotice(source?'已复制 '+p.code:'已新增 '+p.code);
    requestAnimationFrame(()=>document.getElementById(p.id)?.scrollIntoView({block:'nearest'}));
  };
  const exportExcel=async()=>{
    setExcelBusy(true);
    try{
      const {default:ExcelJS}=await import('exceljs');
      const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('2027 Campaign');
      sheet.addRow(HEADERS);rows(items).forEach(row=>sheet.addRow(row));
      sheet.getRow(1).font={bold:true};sheet.views=[{state:'frozen',ySplit:1}];
      sheet.columns.forEach((col,i)=>{col.width=i===2?25:i===14?36:18;if((i>=8&&i<=11)||i>=15)col.numFmt='"¥"#,##0.00';});
      const bytes=await book.xlsx.writeBuffer();
      download(new Uint8Array(bytes),'INS-Y27-Campaign.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }catch{setNotice('Excel 导出失败，请重试或导出 CSV。');}finally{setExcelBusy(false);}
  };
  const login=(e:FormEvent<HTMLFormElement>)=>{
    e.preventDefault();const data=new FormData(e.currentTarget);
    void store.login(String(data.get('handle')).trim(),String(data.get('password')),register);
  };
  if(store.snapshot?.role==='viewer')return <Viewer data={store.snapshot} dark={dark} toggle={toggle} logout={()=>void store.logout()} error={store.error}/>;
  if(!store.items)return <div className="auth"><div className="auth-card panel">
    <Brand/><span className="eyebrow">CAMPAIGN PLANNER / 2027</span><h1>INS LAND 年度规划</h1>
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
      <header className="topbar"><div className="breadcrumb"><span>INS STUDIO</span><span>/</span><strong>{PANE_INFO[pane].label}</strong></div>
      <div className="actions"><span className="save" aria-live="polite"><span className="dot"/>{store.status}</span><button className="icon" aria-label={dark?'切换浅色主题':'切换深色主题'} onClick={toggle}>{dark?<Sun/>:<Moon/>}</button><span className="role-chip">管理者</span><button className="icon" aria-label="退出登录" disabled={store.dirty} onClick={()=>void store.logout()}><LogOut/></button></div></header>
      <div className="content">
      <section id="overview" className="pane" hidden={pane!=='overview'}>
        <CampaignHero/>
        <PlanOverview items={items} budget={t} openQuarter={q=>{setTier('all');setQ(q);setForm('all');window.location.hash='projects';}}/>
      </section>
      <section id="budget" className="section pane" hidden={pane!=='budget'}>
        <div className="section-heading pane-heading"><span className="eyebrow">02 / BUDGET</span><h2>预算看板</h2><p>项目预算实时汇总；搭建与体验单独核算。</p></div>
        <div className="overview panel">
          <div className="overview-head"><span><Wallet size={16}/> 年度预算总额</span><span className="eyebrow">ANNUAL BASELINE</span></div>
          <strong className="annual-amount">{yuan(baseline)}</strong>
          <div className="metrics">
            <div><span>S 级预算</span><b>{yuan(t.S)}</b></div><div><span>A 级预算</span><b>{yuan(t.A)}</b></div>
            <div><span>已分配至项目</span><b>{yuan(t.total)}</b></div><div><span>{t.remaining<0?'超出预算':'剩余预算'}</span><b className={t.remaining<0?'danger':''}>{yuan(Math.abs(t.remaining))}</b></div>
            <div><span>年度项目数</span><b>{items.length}<small> 项</small></b></div>
          </div>
          <div className="budget-charts">
            <div className="chart-pair budget-chart">
              <Donut segments={tierSegments(t.S,t.A)} value={t.total?pct(t.S,t.total):'—'} caption="S 级占比" label={'S 级 '+pct(t.S,t.total)+'，A 级 '+pct(t.A,t.total)}/>
              <div className="chart-list"><h3>级别预算占比</h3>
                <div><span><i style={{background:'var(--tier-s)'}}/>S 级</span><b>{pct(t.S,t.total)}</b></div>
                <div><span><i style={{background:'var(--tier-a)'}}/>A 级</span><b>{pct(t.A,t.total)}</b></div>
              </div>
            </div>
            <div className="budget-chart baseline-chart">
              <div className="chart-head"><h3>年度预算规划率</h3><strong className={t.remaining<0?'danger':''}>{pct(t.total,baseline)}</strong></div>
              <Ratio segments={[{value:Math.min(t.total,baseline),color:'var(--tier-s)'},{value:Math.max(-t.remaining,0),color:'var(--danger)'}]}
                scale={Math.max(t.total,baseline)} label={'年度预算规划率 '+pct(t.total,baseline)}/>
              <div className="chart-head chart-foot"><span>已规划 {yuan(t.total)}</span><span>基准 {yuan(baseline)}</span></div>
            </div>
          </div>
          <div className="allocation-summary"><span>搭建与体验已细分 <b>{yuan(t.build+t.experience)}</b></span><span>项目待分配 <b>{yuan(t.unallocated)}</b></span>{t.over>0&&<span className="danger">项目超额 <b>{yuan(t.over)}</b></span>}</div>
        </div>
        <SpendingBoard items={items} onEdit={(id,spent)=>edit(id,{spent})}/>
      </section>
      {store.error&&<div className="banner" role="alert">{store.error}<div className="actions">
        {store.dirty&&<button onClick={()=>void store.flush()}>重试同步</button>}
        <button onClick={()=>ask({title:'重新加载工作台？',description:'未保存的修改会丢失。建议先导出 JSON 草稿。',action:()=>void store.load()})}>重新加载</button>
      </div></div>}
      <section id="projects" className="section pane" hidden={pane!=='projects'}>
        <div className="section-heading project-heading"><div><span className="eyebrow">02 / CAMPAIGN INDEX</span><h2>年度项目 <small>{shown.length} / {items.length}</small></h2></div>
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
        <div className="cards">{shown.map(p=><Card key={p.id} p={p} edit={patch=>edit(p.id,patch)} copy={()=>add(p)} remove={()=>ask({title:'删除 '+p.code+'？',description:'将从年度计划移除「'+p.name+'」，预算会随之更新。',action:()=>store.change(items.filter(x=>x.id!==p.id))})}/>)}</div>
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
