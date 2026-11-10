'use client';
import {useState} from 'react';
import {durationDays,experienceModeLabel,percent,primaryFormLabel,quarter,QUARTERS,summary,yuan,type Project} from '../lib/planner';
import {coverageDays,monthBounds,monthlyTotal,weekdayWindows,type ScheduleProject,type WeekdayPlan} from '../lib/weekday';
import type {ViewerData} from '../lib/storage';

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
  return <section className="panel weekday-budget" aria-labelledby="weekday-budget-heading">
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
function track(label:string,value:number,max:number,caption:string,color='var(--tier-s)') {
  return <div className="insight-track" key={label}>
    <div><span>{label}</span><b>{caption}</b></div>
    <div className="ratio" role="img" aria-label={label+' '+caption}><span style={{width:percent(value,max)+'%',background:color}}/></div>
  </div>;
}
function distribution(items:AnalysisProject[],label:(item:AnalysisProject)=>string) {
  const counts=new Map<string,number>();
  for(const item of items){const key=label(item);counts.set(key,(counts.get(key)??0)+1);}
  return [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh'));
}
export function ResourceAnalysis({items,financial,approx,hidden}:{
  items:AnalysisProject[];financial?:{items:Project[];weekday?:WeekdayPlan|null};
  approx?:ViewerData['charts'];hidden:boolean;
}) {
  const t=financial?summary(financial.items):null;
  const week=monthlyTotal(financial?.weekday);
  const overall=(t?.total??0)+week;
  const windows=weekdayWindows(items);
  const monthly=Array.from({length:12},(_,i)=>coverageDays(items,...monthBounds(i)));
  const weekdayMonthly=Array.from({length:12},(_,i)=>coverageDays(windows,...monthBounds(i)));
  const maxMonth=Math.max(0,...monthly,...weekdayMonthly);
  const activeDays=sum(monthly);
  const builds=distribution(items,primaryFormLabel);
  const experiences=distribution(items,experienceModeLabel);
  return <section id="resources" className="section pane resource-page" hidden={hidden}>
    <header className="budget-heading project-index-heading">
      <span className="project-index-kicker">RESOURCES / 2027</span>
      <p className="project-index-display" lang="en" aria-hidden="true">Resources</p><h2>年度资源分析</h2>
    </header>
    <div className="resource-grid">
      <article className="panel resource-panel">
        <header><small>01 / SCHEDULE</small><h3>时间规划分析</h3></header>
        <div className="resource-kpis"><div><strong>{activeDays}</strong><span>S / A 有排期天数</span></div><div><strong>{coverageDays(windows)}</strong><span>周中窗口覆盖天数</span></div></div>
        <div className="resource-months" role="img" aria-label={monthly.map((n,i)=>i+1+'月，项目 '+n+' 天，周中窗口 '+weekdayMonthly[i]+' 天').join('；')}>
          {monthly.map((value,i)=><span key={i} title={'项目 '+value+' 天 / 周中 '+weekdayMonthly[i]+' 天'}><b>{value}</b><span className="resource-month-bars">
            <i style={{height:percent(value,maxMonth)*.55+'px'}}/><i style={{height:percent(weekdayMonthly[i],maxMonth)*.55+'px'}}/>
          </span><small>{i+1}月</small></span>)}
        </div>
        <div className="budget-program-legend"><span>▰ S / A 项目</span><span>▰ 周中窗口</span></div>
        <p>重叠日期只计一次。周中统计窗口覆盖区间，跨年仅计入 2027 年内。</p>
      </article>
      <article className="panel resource-panel">
        <header><small>02 / ALLOCATION</small><h3>预算拆解分析</h3></header>
        {t?<><div className="resource-kpis"><div><strong>{yuan(overall)}</strong><span>全年规划合计</span></div></div>
          {track('S / A 项目',t.total,overall,yuan(t.total))}
          {financial?.weekday&&track('周中活动',week,overall,yuan(week),'var(--weekday-color)')}
          <div className="resource-amounts"><span>搭建 <b>{yuan(t.build)}</b></span><span>体验 <b>{yuan(t.experience)}</b></span><span>项目待分配 <b>{yuan(t.unallocated)}</b></span>{t.over>0&&<span className="danger">项目分配超额 <b>{yuan(t.over)}</b></span>}</div></>:
          <><div className="resource-kpis"><div><strong>****</strong><span>金额仅管理者可见</span></div></div>
          {approx?.build!=null&&<>{track('搭建',approx.build,100,'约 '+approx.build+'%')}{track('体验',100-approx.build,100,'约 '+(100-approx.build)+'%','var(--experience)')}</>}</>}
      </article>
      <article className="panel resource-panel">
        <header><small>03 / PROGRAM MIX</small><h3>项目类型分析</h3></header>
        <div className="resource-type-grid">
          {([['搭建形式',builds],['体验模式',experiences]] as const).map(([label,groups])=><section key={label}>
            <h4>{label}</h4>{groups.map(([name,count])=>track(name,count,items.length,count+' 项',label==='搭建形式'?'var(--tier-s)':'var(--experience)'))}
          </section>)}
        </div>
      </article>
      <article className="panel resource-panel">
        <header><small>04 / S & A CAMPAIGNS</small><h3>S 级与 A 级分析</h3></header>
        <div className="resource-tier-grid">
          {(['S','A'] as const).map(tier=>{
            const group=items.filter(item=>item.tier===tier);
            const days=coverageDays(group);
            const average=group.length?sum(group.map(item=>durationDays(item.start,item.end)??0))/group.length:0;
            const launches=QUARTERS.map(q=>group.filter(item=>item.start.startsWith('2027-')&&quarter(item.start)===q).length);
            return <section key={tier}><h4>{tier} 级 <small>{group.length} 项</small></h4>
              <strong>{days}<small> 天</small></strong><p>年内有排期天数 · 单项平均 {average.toFixed(1)} 天</p>
              <div className="resource-tier-quarters">{launches.map((n,i)=><span key={i}>Q{i+1} <b>{n}</b></span>)}</div>
              {t?<p className="resource-tier-amount">{yuan(t[tier])} · {share(t[tier],t.total)}</p>:approx?.tier!=null?<p>预算约 {tier==='S'?approx.tier:100-approx.tier}%</p>:null}
            </section>;
          })}
        </div>
      </article>
    </div>
  </section>;
}
