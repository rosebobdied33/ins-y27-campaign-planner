'use client';
import {useState,type CSSProperties} from 'react';
import {experienceModeLabel,percent,primaryFormLabel,QUARTERS,summary,yuan,type Project} from '../lib/planner';
import {coverageDays,monthBounds,monthlyTotal,weekdayWindows,type ScheduleProject,type WeekdayPlan} from '../lib/weekday';
import type {ViewerData} from '../lib/storage';
import {ChapterJump,WorkspaceChapter} from './workspace-chapter';

const short=(date:string)=>date.slice(5).replace('-','.');
const sum=(values:number[])=>values.reduce((total,value)=>total+value,0);
const share=(value:number,total:number)=>percent(value,total).toFixed(1)+'%';

export function WeekdayBudget({items,plan}:{items:Project[];plan:WeekdayPlan}) {
  const [month,setMonth]=useState<number|null>(null);
  const windows=weekdayWindows(items);
  const total=monthlyTotal(plan);
  const max=Math.max(...plan.monthly);
  const headroom=plan.max-total;
  const active=month===null?windows:windows.filter(window=>coverageDays([window],...monthBounds(month))>0);
  return <section id="weekday-budget" tabIndex={-1} className="panel weekday-budget" aria-labelledby="weekday-budget-heading">
    <header className="weekday-heading">
      <div><p className="project-index-kicker">WEEKDAY PROGRAM / 2027</p><h3 id="weekday-budget-heading">周中活动预算与周期</h3></div>
      <div className="weekday-total"><strong>{yuan(total)}</strong><span>年度目标 {yuan(plan.min)}–{yuan(plan.max)}</span></div>
    </header>
    <div className="weekday-kpis">
      <span>月均 <b>{yuan(Math.round(total/12))}</b></span>
      <span>{headroom>=0?'距上限':'超出上限'} <b>{yuan(Math.abs(headroom))}</b></span>
      <span>峰值 <b>{plan.monthly.flatMap((value,i)=>value===max?[i+1+'月']:[]).join('、')} {yuan(max)}</b></span>
    </div>
    <div className="weekday-months" role="group" aria-label="周中逐月预算，点击查看对应周期">
      {plan.monthly.map((value,i)=><button type="button" key={i} aria-pressed={month===i} onClick={()=>setMonth(month===i?null:i)}
        aria-label={i+1+'月周中预算 '+yuan(value)}>
        <strong>{(value/1_000_000).toLocaleString('zh-CN')} 万</strong>
        <span className="weekday-month-track" aria-hidden="true"><i style={{height:percent(value,max)+'%'}}/></span><small>{i+1} 月</small>
      </button>)}
    </div>
    <div className="weekday-periods">
      <header><h4>{month===null?'周中活动窗口':month+1+' 月关联窗口'}</h4>{month!==null&&<button onClick={()=>setMonth(null)}>查看全年</button>}</header>
      <p>按 S 级上线后第 7 天起算，与 S 级同日下线。金额按月独立规划，窗口显示覆盖区间。</p>
      {active.length?<div>{active.map(({project,start,end})=><article key={project.id}>
        <span><b>{project.code}</b> {project.name||'未命名项目'}</span><strong>{short(start)}–{end.slice(0,4)===start.slice(0,4)?short(end):end.replaceAll('-','.')}</strong>
      </article>)}</div>:<p>本月暂无与 S 级对应的周中窗口。</p>}
    </div>
  </section>;
}

type AnalysisProject=ScheduleProject & Pick<ViewerData['projects'][number],'primary'|'primaryDetail'|'secondary'|'secondaryDetail'>;
const colors=['var(--tier-s)','var(--tier-a)','var(--weekday-color)'];
const categories=['S 级','A 级','普通活动'];
const quarterBounds=QUARTERS.map((_,i)=>[monthBounds(i*3)[0],monthBounds(i*3+2)[1]] as const);

function distribution(items:AnalysisProject[],label:(item:AnalysisProject)=>string,budgets:Map<string,number>) {
  const groups=new Map<string,{count:number;budget:number}>();
  for(const item of items){
    const name=label(item);
    const entry=groups.get(name)??{count:0,budget:0};
    entry.count++;entry.budget+=budgets.get(item.id)??0;
    groups.set(name,entry);
  }
  return [...groups].sort((a,b)=>b[1].count-a[1].count||a[0].localeCompare(b[0],'zh'));
}
export function ResourceAnalysis({items,financial,approx,hidden}:{
  items:AnalysisProject[];financial?:{items:Project[];weekday?:WeekdayPlan|null};
  approx?:ViewerData['charts'];hidden:boolean;
}) {
  const [scope,setScope]=useState<'campaigns'|'ordinary'>('campaigns');
  const [type,setType]=useState<'build'|'experience'>('build');
  const t=financial?summary(financial.items):null;
  const amounts=[t?.S??0,t?.A??0,monthlyTotal(financial?.weekday)];
  const overall=sum(amounts);
  const windows=weekdayWindows(items);
  const ordered=[...items].sort((a,b)=>a.start.localeCompare(b.start)||a.code.localeCompare(b.code));
  const rows=scope==='campaigns'?ordered.map(project=>({project,start:project.start,end:project.end})):windows;
  const rowsInYear=rows.filter(row=>coverageDays([row])>0);
  const tiers=[ordered.filter(p=>p.tier==='S'),ordered.filter(p=>p.tier==='A'),windows];
  const budgets=new Map(financial?.items.map(p=>[p.id,p.budget]));
  const types=distribution(items,type==='build'?primaryFormLabel:experienceModeLabel,budgets);

  return <section id="resources" className="section pane resource-page" hidden={hidden}>
    <WorkspaceChapter pane="resources"><ChapterJump target="resource-periods">周期矩阵</ChapterJump><ChapterJump target="resource-allocation">预算构成</ChapterJump></WorkspaceChapter>
    <section className="edition-quarter-band" aria-label="季度排期覆盖率">
      <div className="edition-section-label"><span>2027 / COVERAGE</span><b>季度排期覆盖率</b></div>
        <div className="resource-quarter-grid">
          {quarterBounds.map(([start,end],i)=><section key={QUARTERS[i]}>
            <h4>{QUARTERS[i]} <small>{end-start} 天</small></h4>
            {tiers.map((group,j)=>{
              const days=coverageDays(group,start,end);
              return <div className="resource-quarter-track" key={categories[j]}>
                <span>{categories[j]}</span><b title={days+' 天'}>{share(days,end-start)}</b>
                <div className="ratio" aria-label={categories[j]+' '+days+' 天'} role="img"><span style={{width:percent(days,end-start)+'%',background:colors[j]}}/></div>
              </div>;
            })}
          </section>)}
        </div>
      <p>季度覆盖率以当季自然日为分母。同一类别重叠日期只计一次。</p>
    </section>
    <div className="resource-grid">
      <article className="panel resource-panel resource-schedule">
        <header><small>01 / SCHEDULE</small><h3>时间规划分析</h3></header>
        <div id="resource-periods" tabIndex={-1} className="resource-matrix-heading">
          <div><h4>活动周期明细</h4><p>各格为项目落在该季度的天数与占比。</p></div>
          <div className="segmented" aria-label="周期明细范围">
            <button aria-pressed={scope==='campaigns'} onClick={()=>setScope('campaigns')}>S / A 项目</button>
            <button aria-pressed={scope==='ordinary'} onClick={()=>setScope('ordinary')}>普通活动</button>
          </div>
        </div>
        <div className="resource-matrix-scroll" tabIndex={0} role="region" aria-label="按季度查看活动周期">
          <table className="resource-matrix">
            <thead><tr><th scope="col">活动 / 日期</th>{QUARTERS.map(q=><th key={q} scope="col">{q}</th>)}</tr></thead>
            <tbody>{rowsInYear.map(({project,start,end})=><tr key={project.id}>
              <th scope="row"><strong>{project.name||project.code}</strong><small>{project.code} · {short(start)}–{end.startsWith('2027-')?short(end):end.replaceAll('-','.')}</small></th>
              {quarterBounds.map(([from,to],i)=>{
                const days=coverageDays([{start,end}],from,to);
                const value=percent(days,to-from);
                return <td key={QUARTERS[i]}>{days?<span className="resource-period" style={{'--period-color':colors[scope==='ordinary'?2:project.tier==='S'?0:1],'--period-fill':value+'%'} as CSSProperties}>
                  <b>{days} 天</b><small>{share(days,to-from)}</small>
                </span>:<span className="resource-period-empty" aria-label="无排期">—</span>}</td>;
              })}
            </tr>)}</tbody>
          </table>
          {!rowsInYear.length&&<p>当前没有落在 2027 年的排期。</p>}
        </div>
        <p className="resource-note">跨季、跨年按实际落入 2027 年的日期分摊。普通活动按周中窗口计算，各类别可能重叠。</p>
      </article>
      <div className="resource-sidebar">
        <article id="resource-allocation" tabIndex={-1} className="panel resource-panel resource-allocation">
          <header><small>02 / ALLOCATION</small><h3>年度预算构成</h3></header>
          <div className="resource-budget-total"><span>全年规划总额</span><strong>{t?yuan(overall):'****'}</strong></div>
          {t&&overall>0&&<div className="ratio resource-budget-ratio" role="img" aria-label={amounts.map((amount,i)=>categories[i]+' '+share(amount,overall)).join('，')}>
            {amounts.map((amount,i)=><span key={i} style={{width:percent(amount,overall)+'%',background:colors[i]}}/>)}
          </div>}
          <dl className="resource-budget-breakdown">{categories.map((label,i)=><div key={label}>
            <dt><i style={{background:colors[i]}}/>{label}</dt><dd>{t?yuan(amounts[i]):'****'} <small>{t?share(amounts[i],overall):i<2&&approx?.tier!=null?'约 '+(i===0?approx.tier:100-approx.tier)+'%*':'—'}</small></dd>
          </div>)}</dl>
          <p className="resource-note">{t?'普通活动按周中预算计入全年大盘。':'* 浏览模式仅显示 S/A 项目内部的估算占比。'}</p>
        </article>
        <article className="panel resource-panel resource-types">
          <header><small>03 / PROGRAM MIX</small><h3>项目类型分析</h3><p>按已录入分类看项目数量{t?'与规划预算':''}。</p></header>
          <div className="segmented" aria-label="项目类型维度"><button aria-pressed={type==='build'} onClick={()=>setType('build')}>搭建形式</button><button aria-pressed={type==='experience'} onClick={()=>setType('experience')}>体验模式</button></div>
          <div className="resource-type-list">{types.map(([name,group])=><div className="insight-track" key={name}>
            <div><span>{name}</span><b>{group.count} 项 · {share(group.count,items.length)}</b></div>
            <div className="ratio" role="img" aria-label={name+' '+group.count+' 项'}><span style={{width:percent(group.count,items.length)+'%',background:type==='build'?colors[0]:'var(--experience)'}}/></div>
            {t&&<small>对应预算 {yuan(group.budget)}</small>}
          </div>)}{!types.length&&<p>暂无项目</p>}</div>
        </article>
      </div>
    </div>
  </section>;
}
