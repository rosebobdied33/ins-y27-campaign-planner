'use client';
import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {CalendarDays, Layers3, Wallet, ArrowUpRight, X} from 'lucide-react';
import {durationDays, percent, quarter, QUARTERS, STATUSES, yuan, type Project} from '../lib/planner';

import {monthWeeks} from '../lib/calendar';
import {monthlyTotal,weekdayWindows,type WeekdayPlan} from '../lib/weekday';

type ScheduleItem = Pick<Project,'id'|'code'|'tier'|'name'|'start'|'end'|'status'|'color'>;
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

export function PlanOverview({items,budget,weekday,openQuarter,openProject}:{
  items:ScheduleItem[];budget?:BudgetSummary;weekday?:WeekdayPlan|null;openQuarter:(q:string)=>void;openProject:(id:string)=>void;
}) {
  const [filter,setFilter]=useState('all');
  const [status,setStatus]=useState('all');
  const [view,setView]=useState<'calendar'|'timeline'>('timeline');
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
  const groups=QUARTERS.map(q=>ordered.filter(p=>quarter(p.start)===q&&p.start.startsWith(YEAR+'-')));
  const counts={S:items.filter(p=>p.tier==='S').length,A:items.filter(p=>p.tier==='A').length};
  const completed=items.filter(p=>p.status==='已完成').length;
  const timeline=ordered.filter(p=>(filter==='all'||p.tier===filter)&&(status==='all'||p.status===status)
    &&p.end>=YEAR+'-01-01'&&p.start<=YEAR+'-12-31');
  const timelineColumns=months.map(m=>dayOffset(m.to)-dayOffset(m.from)).map(days=>days+'fr').join(' ');

  const timelineQuarters=QUARTERS.map((_,i)=>dayOffset(months[i*3+2].to)-dayOffset(months[i*3].from)).map(days=>days+'fr').join(' ');
  const week=weekdayWindows(timeline).filter(window=>window.start<=YEAR+'-12-31');
  const timelineGroups=[
    {name:'S 级活动',entries:timeline.filter(p=>p.tier==='S').map(p=>({project:p,start:p.start,end:p.end,weekday:false}))},
    {name:'A 级节点',entries:timeline.filter(p=>p.tier==='A').map(p=>({project:p,start:p.start,end:p.end,weekday:false}))},
    {name:'周中活动',entries:week.map(window=>({...window,weekday:true}))},
  ].filter(group=>group.entries.length);
  return <>
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
      <div className="section-heading"><span className="edition-section-kicker">01 / PROGRAM MAP</span><h2 id="quarter-map-heading">年度版图</h2><p>按项目开始日期归入季度。点季度卡片查看对应项目。</p></div>
      <div className="quarter-map">
        {groups.map((group,i)=>{
          const q=QUARTERS[i], s=group.filter(p=>p.tier==='S').length;
          return <article className="panel quarter-tile" key={q} data-quarter={q}>
            <button className="quarter-open" onClick={()=>openQuarter(q)} aria-label={`查看 ${q} 的项目`}>
              <span><strong>{q}</strong><small>{3*i+1}–{3*i+3} 月</small></span><ArrowUpRight size={16}/>
            </button>
            <div className="quarter-count"><b>{group.length} 项</b><span>S {s} · A {group.length-s}</span></div>
            <ul>{group.map(p=><li key={p.id}><i style={{background:p.color}}/><span title={dateRange(p)}>{p.name||'未命名项目'}</span><small>{p.tier}</small></li>)}</ul>
            {!group.length&&<p>暂无启动项目</p>}
          </article>;
        })}
      </div>
    </section>
    <section id="annual-schedule" className="year-section" aria-labelledby="calendar-heading" tabIndex={-1}>
      <div className="section-heading calendar-heading"><div><span className="edition-section-kicker">02 / SCHEDULE</span><h2 id="calendar-heading">全年活动时间线</h2><p>按季度和月份对照 S 级、A 级与周中窗口。跨年的色带在年底保留续接标记。</p></div>
        <div className="calendar-filters">
          <div className="segmented" aria-label="排期视图"><button aria-pressed={view==='calendar'} onClick={()=>setView('calendar')}>日历总表</button><button aria-pressed={view==='timeline'} onClick={()=>setView('timeline')}>全年时间线</button></div>
          <select aria-label="排期级别" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">全部级别</option><option value="S">S 级</option><option value="A">A 级</option></select>
          <select aria-label="排期状态" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">全部状态</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
        </div>
      </div>
      {view==='calendar'?<div className="annual-month-grid">
        {months.map((month,index)=>{
          const visible=timeline.filter(p=>Date.parse(p.start+'T00:00:00Z')<month.to&&Date.parse(p.end+'T00:00:00Z')>=month.from);
          return <article className="panel annual-month" key={month.label}>
            <header><h3>{month.label}</h3><span>Q{Math.floor(index/3)+1} · {visible.length} 项</span></header>
            <div className="month-weekdays" aria-hidden="true">{['一','二','三','四','五','六','日'].map(day=><span key={day}>{day}</span>)}</div>
            {monthWeeks(YEAR,index,visible).map((week,weekIndex)=><div className="month-week" key={weekIndex}>
              {week.days.map((day,dayIndex)=><span className="month-day" data-weekend={dayIndex>=5} aria-hidden="true" key={dayIndex}>{day??''}</span>)}
              {week.segments.map(({project,lane,start,end,continuesFrom,continuesTo})=><button key={project.id} className="month-event"
                data-status={project.status}
                style={{gridColumn:`${start} / ${end}`,gridRow:lane+2,'--event-color':project.color} as CSSProperties}
                aria-label={`${project.name||project.code}，${dateRange(project)}，${project.status}`}
                title={`${project.name||project.code} · ${dateRange(project)}`}
                onClick={()=>setSelectedId(project.id)}>
                {continuesFrom&&<i aria-hidden="true">‹</i>}
                <span>{end-start===1?project.code:(project.name||project.code)}</span>
                {continuesTo&&<i aria-hidden="true">›</i>}
              </button>)}
            </div>)}
          </article>;
        })}
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
                    style={{left:left+'%',width:width+'%','--bar-color':weekdayRow?'var(--weekday-color)':p.color} as CSSProperties}>{from<startOfYear?'‹':''}{to>endOfYear?'›':''}</button>
                </div>
              </div>;
            })}
          </div>)}
          {weekday&&filter==='all'&&status==='all'&&<div className="calendar-row timeline-month-budget"><b>周中月预算</b><div>{weekday.monthly.map((amount,i)=><span key={i}>{amount/1_000_000} 万</span>)}</div></div>}
          {!timeline.length&&<p className="calendar-empty">当前筛选没有落在 2027 年的排期。</p>}
        </div>
      </div>}
      <dialog ref={dialog} className="calendar-detail" onClose={()=>setSelectedId(null)} aria-label="排期详情">
        {selected&&<>
          <div className="calendar-detail-head"><span className="eyebrow">{selected.code} · {selected.tier} 级</span><button className="icon" aria-label="关闭排期详情" onClick={()=>dialog.current?.close()}><X/></button></div>
          <h3>{selected.name||'未命名项目'}</h3><p>{dateRange(selected)}</p>
          {weekdayWindows([selected]).map(window=><p key={window.start}>周中窗口 {window.start} 至 {window.end}</p>)}
          <div className="calendar-detail-meta"><span className="tag">共 {durationDays(selected.start,selected.end)} 天</span><span className="tag">{selected.status}</span></div>
          <button className="primary" onClick={()=>{dialog.current?.close();openProject(selected.id);}}>打开项目卡片 <ArrowUpRight size={15}/></button>
        </>}
      </dialog>

    </section>
  </>;
}
