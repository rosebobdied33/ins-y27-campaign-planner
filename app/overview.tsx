'use client';
import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {CalendarDays, Layers3, Wallet, ArrowUpRight, X} from 'lucide-react';
import {durationDays, experienceModeLabel, primaryFormLabel, percent, quarter, QUARTERS, STATUSES, yuan} from '../lib/planner';

import {monthWeeks} from '../lib/calendar';
import {monthlyTotal,weekdayWindows,type WeekdayPlan} from '../lib/weekday';
import {CampaignGallery,campaignTitles,type CampaignArtwork} from './campaign-gallery';
import type {ViewerData} from '../lib/storage';

type ScheduleItem = Pick<ViewerData['projects'][number],'id'|'code'|'tier'|'name'|'start'|'end'|'status'|'color'|'primary'|'primaryDetail'|'secondary'|'secondaryDetail'>;
type BudgetSummary = {total:number; S:number; A:number};
const YEAR = 2027;
const DAY = 86_400_000;
const startOfYear = Date.UTC(YEAR,0,1);
const endOfYear = Date.UTC(YEAR+1,0,1);
const months = Array.from({length:12}, (_,i)=>{
  const from=Date.UTC(YEAR,i,1);
  return {label:(i+1)+'月', from, to:Date.UTC(YEAR,i+1,1)};
});
const dayOffset=(date:number)=>(date-startOfYear)/DAY;
const dateRange=(item:ScheduleItem)=>item.start+' 至 '+item.end;
const shortDate=(date:string)=>date.startsWith(YEAR+'-')?date.slice(5).replace('-','.') :date.replaceAll('-','.');
const seasons=['一季度','二季度','三季度','四季度'];
const dateWithin=(item:{start:string;end:string},from:number,to:number)=>
  Date.parse(item.start+'T00:00:00Z')<to&&Date.parse(item.end+'T00:00:00Z')>=from;
const themeColor=(item:ScheduleItem)=>campaignTitles[item.id]?.glow??item.color;

export function PlanOverview({items,artwork,budget,weekday,openQuarter,openProject,visible}:{
  visible:boolean;items:ScheduleItem[];artwork:CampaignArtwork;budget?:BudgetSummary;weekday?:WeekdayPlan|null;openQuarter:(q:string)=>void;openProject:(id:string)=>void;
}) {
  const [filter,setFilter]=useState('all');
  const [status,setStatus]=useState('all');
  const [view,setView]=useState<'calendar'|'timeline'>('calendar');
  const [activeId,setActiveId]=useState<string|null>(null);
  const [showWeekday,setShowWeekday]=useState(true);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  const selected=items.find(p=>p.id===selectedId);
  const showDetails=Boolean(selected);
  useEffect(()=>{
    const current=dialog.current;
    if(showDetails&&!current?.open)current?.showModal();
    if(!showDetails&&current?.open)current.close();
  },[showDetails]);
  const ordered=[...items].sort((a,b)=>a.start.localeCompare(b.start)||a.code.localeCompare(b.code));
  const allWindows=weekdayWindows(ordered);
  const featureIds=ordered.map(p=>p.id).filter(id=>/^S0[1-7]$/.test(id)).sort();
  const featured=activeId&&featureIds.includes(activeId)?activeId:featureIds[0];
  const related=selected?.tier==='S'?ordered.filter(p=>p.tier==='A'&&p.start<=selected.end&&p.end>=selected.start):[];
  const counts={S:items.filter(p=>p.tier==='S').length,A:items.filter(p=>p.tier==='A').length};
  const completed=items.filter(p=>p.status==='已完成').length;
  const timeline=ordered.filter(p=>(filter==='all'||p.tier===filter)&&(status==='all'||p.status===status)
    &&p.end>=YEAR+'-01-01'&&p.start<=YEAR+'-12-31');
  const timelineColumns=months.map(m=>dayOffset(m.to)-dayOffset(m.from)).map(days=>days+'fr').join(' ');

  const timelineQuarters=QUARTERS.map((_,i)=>dayOffset(months[i*3+2].to)-dayOffset(months[i*3].from)).map(days=>days+'fr').join(' ');
  const week=showWeekday?weekdayWindows(timeline).filter(window=>window.start<=YEAR+'-12-31'):[];
  const timelineGroups=[
    {name:'S 级活动',entries:timeline.filter(p=>p.tier==='S').map(p=>({project:p,start:p.start,end:p.end,weekday:false}))},
    {name:'A 级节点',entries:timeline.filter(p=>p.tier==='A').map(p=>({project:p,start:p.start,end:p.end,weekday:false}))},
    {name:'周中活动',entries:week.map(window=>({...window,weekday:true}))},
  ].filter(group=>group.entries.length);
  return <>
    <div className="edition-gallery">
      <CampaignGallery projects={items} artwork={artwork} visible={visible&&!showDetails} activeId={featured??null} onSelect={setActiveId} openProject={openProject}/>
    </div>
    <div className="year-summary">
      <article className="panel year-metric"><span><Layers3 size={17}/>年度项目</span><strong>{items.length}<small> 项</small></strong><p>已完成 {completed} 项</p></article>
      <article className="panel year-metric"><span><Wallet size={17}/>总规划预算</span><strong>{budget?yuan(budget.total+monthlyTotal(weekday)):'****'}</strong><a href={budget?'#budget':'#resources'}>{budget?'查看预算看板':'查看资源概览'} <ArrowUpRight size={13}/></a></article>
      <article className="panel year-metric tier-metric"><span><CalendarDays size={17}/>S / A 项目结构</span>
        <div className="year-tier-count"><strong>S <b>{counts.S}</b><small> 项</small></strong><strong>A <b>{counts.A}</b><small> 项</small></strong></div>
        <div className="ratio" role="img" aria-label={`S 级 ${counts.S} 项，A 级 ${counts.A} 项`}><span style={{width:percent(counts.S,items.length)+'%',background:'var(--tier-s)'}}/><span style={{width:percent(counts.A,items.length)+'%',background:'var(--tier-a)'}}/></div>
        {budget&&<p>S {yuan(budget.S)} · A {yuan(budget.A)}</p>}
      </article>
    </div>
    <section className="year-section" aria-labelledby="quarter-map-heading">
      <div className="section-heading"><h2 id="quarter-map-heading">年度主题版图</h2></div>
      <div className="theme-atlas">
        {QUARTERS.map((q,i)=>{
          const group=ordered.filter(p=>quarter(p.start)===q&&p.start.startsWith(YEAR+'-'));
          const lead=group.filter(p=>p.tier==='S');
          const nodes=group.filter(p=>p.tier==='A');
          const windows=allWindows.filter(window=>lead.some(p=>p.id===window.project.id));
          return <article className="theme-quarter" key={q}>
            <button className="theme-quarter-heading" onClick={()=>openQuarter(q)} aria-label={'查看 '+q+' 的项目'}>
              <strong>{q}</strong><span>{3*i+1}–{3*i+3} 月</span><ArrowUpRight size={15}/>
            </button>
            <section className="theme-leads" aria-label={q+' S 级主线'}>
              {lead.map(p=><button key={p.id} className="theme-cover" data-current={p.id===featured} style={{'--theme-ink':themeColor(p)} as CSSProperties}
                onClick={()=>{if(featureIds.includes(p.id))setActiveId(p.id);setSelectedId(p.id);}}>
                {artwork[p.id]&&<img src={artwork[p.id]} alt="" loading="lazy" width={1120} height={630}/>}
                <span><strong>{p.name||p.code}</strong><small>{shortDate(p.start)} – {shortDate(p.end)}</small></span>
              </button>)}
              {!lead.length&&<p>本季无新上线主线</p>}
            </section>
            <section className="theme-nodes"><h3>A 级节点</h3>
              {nodes.map(p=><button key={p.id} onClick={()=>setSelectedId(p.id)}><span>{p.name||p.code}</span><time dateTime={p.start}>{shortDate(p.start)}</time></button>)}
              {!nodes.length&&<p>暂无节点</p>}
            </section>
            <section className="theme-windows"><h3>周中活动</h3>
              {windows.map(({project,start,end})=><button key={project.id} onClick={()=>setSelectedId(project.id)}><span>{project.name||project.code}</span><small>{shortDate(start)} – {shortDate(end)}</small></button>)}
              {!windows.length&&<p>暂无周中窗口</p>}
            </section>
          </article>;
        })}
      </div>
    </section>
    <section id="annual-schedule" className="year-section" aria-labelledby="calendar-heading" tabIndex={-1}>
      <div className="section-heading calendar-heading"><div><h2 id="calendar-heading">全年活动日历</h2></div>
        <div className="calendar-filters">
          <div className="segmented" aria-label="排期视图"><button aria-pressed={view==='calendar'} onClick={()=>setView('calendar')}>日历总表</button><button aria-pressed={view==='timeline'} onClick={()=>setView('timeline')}>全年时间线</button></div>
          <select aria-label="排期级别" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">全部级别</option><option value="S">S 级</option><option value="A">A 级</option></select>
          <label className="calendar-weekday-toggle"><input type="checkbox" checked={showWeekday} onChange={e=>setShowWeekday(e.target.checked)}/>周中窗口</label>
          <select aria-label="排期状态" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">全部状态</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
        </div>
      </div>
      {view==='calendar'?<div className="annual-quarter-calendar">
        {QUARTERS.map((q,i)=><section key={q} className="calendar-quarter-sheet" aria-label={seasons[i]}>
          <header className="calendar-quarter-heading"><strong>{q}</strong><h3>{seasons[i]}</h3><span>{3*i+1}–{3*i+3} 月</span></header>
          <div className="annual-month-grid">
            {months.slice(i*3,i*3+3).map((month,j)=>{
              const index=i*3+j;
              const visible=timeline.filter(p=>dateWithin(p,month.from,month.to));
              const entries=[
                ...visible.map(project=>({project,start:project.start,end:project.end,weekday:false})),
                ...week.filter(item=>dateWithin(item,month.from,month.to)).map(item=>({...item,weekday:true})),
              ];
              const tint=visible.find(p=>p.tier==='S');
              return <article className="annual-month" key={month.label} style={{'--month-color':tint?themeColor(tint):'var(--accent)'} as CSSProperties}>
                <header><h4><b>{String(index+1).padStart(2,'0')}</b> 月</h4><span>{visible.length} 项活动</span></header>
                <div className="month-weekdays" aria-hidden="true">{['一','二','三','四','五','六','日'].map(day=><span key={day}>{day}</span>)}</div>
                {monthWeeks(YEAR,index,entries).map((row,weekIndex)=><div className="month-week" key={weekIndex}>
                  {row.days.map((day,dayIndex)=><span className="month-day" data-weekend={dayIndex>=5} aria-hidden="true" key={dayIndex}>{day??''}</span>)}
                  {row.segments.map(({project:entry,lane,start,end,continuesFrom,continuesTo})=>{
                    const {project}=entry;
                    const label=entry.weekday?project.name+' 周中窗口':project.name||project.code;
                    const description=label+'，'+entry.start+' 至 '+entry.end;
                    return <button key={project.id+(entry.weekday?'-weekday':'')} className="month-event" data-kind={entry.weekday?'weekday':project.tier}
                      style={{gridColumn:`${start} / ${end}`,gridRow:lane+2,'--event-color':entry.weekday?'var(--weekday-color)':themeColor(project)} as CSSProperties}
                      aria-label={description} title={description} onClick={()=>setSelectedId(project.id)}>
                      {continuesFrom&&<i aria-hidden="true">‹</i>}
                      <span>{end-start<=2?(entry.weekday?'周中':project.code):(entry.weekday?'周中 · '+project.name:label)}</span>
                      {continuesTo&&<i aria-hidden="true">›</i>}
                    </button>;
                  })}
                </div>)}
              </article>;
            })}
          </div>
        </section>)}
      </div>:<div className="panel calendar-panel" tabIndex={0} role="region" aria-label="全年横向进度，可横向滚动">
        <div className="calendar-board" style={{'--months':timelineColumns,'--quarters':timelineQuarters} as CSSProperties}>
          <div className="calendar-row calendar-quarters"><b>季度</b><div>{QUARTERS.map(q=><span key={q}>{q}</span>)}</div></div>
          <div className="calendar-row calendar-months"><b>月份</b><div>{months.map(m=><span key={m.label}>{m.label}</span>)}</div></div>
          {timelineGroups.map(group=><div className="timeline-group" key={group.name}>
            <div className="calendar-row timeline-group-label"><b>{group.name}</b><span>{group.entries.length} 个周期</span></div>
            {group.entries.map(({project:p,start,end,weekday:weekdayRow})=>{
              const from=Date.parse(start+'T00:00:00Z'),to=Date.parse(end+'T00:00:00Z')+DAY;
              const left=percent(dayOffset(Math.max(startOfYear,from)),365);
              const width=percent((Math.min(endOfYear,to)-Math.max(startOfYear,from))/DAY,365);
              const label=`${p.name||'未命名项目'}${weekdayRow?' 周中窗口':''}，${start} 至 ${end}`;
              return <div className="calendar-row" key={p.id}>
                <div className="calendar-name"><b title={p.name}>{p.name||'未命名项目'}</b><small>{p.code} · {start.slice(5)}–{end.slice(5)}</small></div>
                <div className="calendar-track">
                  <div className="calendar-grid" aria-hidden="true">{months.map(m=><span key={m.label}/>)}</div>
                  <button className="calendar-bar" aria-label={label} onClick={()=>setSelectedId(p.id)} title={label} data-status={weekdayRow?undefined:p.status}
                    style={{left:left+'%',width:width+'%','--bar-color':weekdayRow?'var(--weekday-color)':themeColor(p)} as CSSProperties}>{from<startOfYear?'‹':''}{to>endOfYear?'›':''}</button>
                </div>
              </div>;
            })}
          </div>)}
          {weekday&&showWeekday&&filter==='all'&&status==='all'&&<div className="calendar-row timeline-month-budget"><b>周中月预算</b><div>{weekday.monthly.map((amount,i)=><span key={i}>{amount/1_000_000} 万</span>)}</div></div>}
          {!timeline.length&&<p className="calendar-empty">当前筛选没有落在 2027 年的排期。</p>}
        </div>
      </div>}
    </section>
    <dialog ref={dialog} className="calendar-detail" onClose={()=>setSelectedId(null)} aria-label="排期详情">
        {selected&&<>
          <div className="calendar-detail-head"><span className="eyebrow">{selected.code} · {selected.tier} 级</span><button className="icon" aria-label="关闭排期详情" onClick={()=>dialog.current?.close()}><X/></button></div>
          {artwork[selected.id]&&<img className="theme-detail-image" src={artwork[selected.id]} alt={selected.name+' 概念图'} width={1120} height={630}/>}
          <h3>{selected.name||'未命名项目'}</h3><p>{dateRange(selected)}</p>
          {weekdayWindows([selected]).map(window=><p key={window.start}>周中窗口 {window.start} 至 {window.end}</p>)}
          <dl className="theme-detail-formats"><div><dt>搭建形式</dt><dd>{primaryFormLabel(selected)}</dd></div><div><dt>体验模式</dt><dd>{experienceModeLabel(selected)}</dd></div></dl>
          {related.length>0&&<div className="theme-detail-nodes"><h4>同期 A 级节点</h4>{related.map(p=><button key={p.id} onClick={()=>setSelectedId(p.id)}>{p.name||p.code}</button>)}</div>}
          <div className="calendar-detail-meta"><span className="tag">共 {durationDays(selected.start,selected.end)} 天</span><span className="tag">{selected.status}</span></div>
          <button className="primary" onClick={()=>{dialog.current?.close();openProject(selected.id);}}>打开项目卡片 <ArrowUpRight size={15}/></button>
        </>}
    </dialog>
  </>;
}
