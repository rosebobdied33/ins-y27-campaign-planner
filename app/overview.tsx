'use client';
import {useState, type CSSProperties} from 'react';
import {CalendarDays, Layers3, Wallet, ArrowUpRight} from 'lucide-react';
import {percent, quarter, QUARTERS, STATUSES, yuan, type Project} from '../lib/planner';

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

export function PlanOverview({items,budget,openQuarter}:{items:ScheduleItem[];budget?:BudgetSummary;openQuarter:(q:string)=>void}) {
  const [filter,setFilter]=useState('all');
  const [status,setStatus]=useState('all');
  const ordered=[...items].sort((a,b)=>a.start.localeCompare(b.start)||a.code.localeCompare(b.code));
  const groups=QUARTERS.map(q=>ordered.filter(p=>quarter(p.start)===q&&p.start.startsWith(YEAR+'-')));
  const counts={S:items.filter(p=>p.tier==='S').length,A:items.filter(p=>p.tier==='A').length};
  const completed=items.filter(p=>p.status==='已完成').length;
  const timeline=ordered.filter(p=>(filter==='all'||p.tier===filter)&&(status==='all'||p.status===status)
    &&p.end>=YEAR+'-01-01'&&p.start<=YEAR+'-12-31');
  const timelineColumns=months.map(m=>dayOffset(m.to)-dayOffset(m.from)).map(days=>days+'fr').join(' ');

  return <>
    <div className="year-summary">
      <article className="panel year-metric"><span><Layers3 size={17}/>年度项目</span><strong>{items.length}<small> 项</small></strong><p>已完成 {completed} 项</p></article>
      <article className="panel year-metric"><span><Wallet size={17}/>总规划预算</span><strong>{budget?yuan(budget.total):'****'}</strong><a href={budget?'#budget':'#resources'}>{budget?'查看预算看板':'查看资源概览'} <ArrowUpRight size={13}/></a></article>
      <article className="panel year-metric tier-metric"><span><CalendarDays size={17}/>S / A 项目结构</span>
        <div className="year-tier-count"><strong>S <b>{counts.S}</b><small> 项</small></strong><strong>A <b>{counts.A}</b><small> 项</small></strong></div>
        <div className="ratio" role="img" aria-label={`S 级 ${counts.S} 项，A 级 ${counts.A} 项`}><span style={{width:percent(counts.S,items.length)+'%',background:'var(--tier-s)'}}/><span style={{width:percent(counts.A,items.length)+'%',background:'var(--tier-a)'}}/></div>
        {budget&&<p>S {yuan(budget.S)} · A {yuan(budget.A)}</p>}
      </article>
    </div>
    <section className="year-section" aria-labelledby="quarter-map-heading">
      <div className="section-heading"><span className="eyebrow">QUARTER MAP</span><h2 id="quarter-map-heading">年度版图</h2><p>按项目开始日期归入季度。点季度卡片查看对应项目。</p></div>
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
    <section className="year-section" aria-labelledby="calendar-heading">
      <div className="section-heading calendar-heading"><div><span className="eyebrow">2027 CALENDAR</span><h2 id="calendar-heading">全年排期</h2><p>条形从开始日延伸至结束日。箭头表示排期延伸到年外。</p></div>
        <div className="calendar-filters"><select aria-label="排期级别" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">全部级别</option><option value="S">S 级</option><option value="A">A 级</option></select>
          <select aria-label="排期状态" value={status} onChange={e=>setStatus(e.target.value)}><option value="all">全部状态</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
      </div>
      <div className="panel calendar-panel" tabIndex={0} role="region" aria-label="全年排期，可横向滚动">
        <div className="calendar-board" style={{'--months':timelineColumns} as CSSProperties}>
          <div className="calendar-row calendar-months"><b>项目 / 进度</b><div>{months.map(m=><span key={m.label}>{m.label}</span>)}</div></div>
          {timeline.map(p=>{
            const from=Date.parse(p.start+'T00:00:00Z'),to=Date.parse(p.end+'T00:00:00Z')+DAY;
            const left=percent(dayOffset(Math.max(startOfYear,from)),365);
            const width=percent((Math.min(endOfYear,to)-Math.max(startOfYear,from))/DAY,365);
            const label=`${p.name||'未命名项目'}，${dateRange(p)}，${p.status}`;
            return <div className="calendar-row" key={p.id}>
              <div className="calendar-name"><b title={p.name}>{p.name||'未命名项目'}</b><small>{p.code} · {p.status}</small></div>
              <div className="calendar-track" role="img" aria-label={label}>
                <div className="calendar-grid" aria-hidden="true">{months.map(m=><span key={m.label}/>)}</div>
                <span className="calendar-bar" title={label} data-status={p.status} style={{left:left+'%',width:width+'%','--bar-color':p.color} as CSSProperties}>{from<startOfYear?'‹':''}{to>endOfYear?'›':''}</span>
              </div>
            </div>;
          })}
          {!timeline.length&&<p className="calendar-empty">当前筛选没有落在 2027 年的排期。</p>}
        </div>
      </div>
    </section>
  </>;
}
