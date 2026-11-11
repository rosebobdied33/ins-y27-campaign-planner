'use client';
import {useRef,type CSSProperties} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight} from 'lucide-react';
import {durationDays,QUARTERS} from '../lib/planner';

import {coverageDays,monthBounds,weekdayWindows,type ScheduleProject} from '../lib/weekday';

import {useHorizontalWheel} from './use-horizontal-wheel';

type GalleryProject=ScheduleProject;
export type CampaignArtwork=Record<string,string>;

export function CampaignGallery({projects,artwork,activeId,onSelect,openProject}:{
  projects:GalleryProject[];
  artwork:CampaignArtwork;
  activeId:string|null;
  onSelect:(id:string)=>void;
  openProject:(id:string)=>void;
}) {
  const stage=useRef<HTMLDivElement>(null);
  const swipe=useRef<number|null>(null);
  const items=projects.filter(project=>/^S0[1-7]$/.test(project.id)).sort((a,b)=>a.id.localeCompare(b.id));
  const index=Math.max(0,items.findIndex(item=>item.id===activeId));
  const project=items[index];
  const go=(next:number)=>onSelect(items[Math.max(0,Math.min(items.length-1,next))].id);
  useHorizontalWheel(stage,direction=>go(index+direction),Boolean(project));
  if(!project)return null;
  const palette=campaignTitles[project.id];
  const image=artwork[project.id];
  const window=weekdayWindows([project])[0];
  const neighbors=[{item:items[index-1],offset:-1},{item:items[index+1],offset:1}];
  const days=durationDays(project.start,project.end);
  const milestones=[
    {label:'上线',date:project.start},
    ...(window?[{label:'周中启动',date:window.start}]:[]),
    {label:'下线',date:project.end},
  ];
  return <section className="campaign-gallery edition-screening" aria-labelledby="campaign-gallery-title"
    onKeyDown={event=>{
      if(event.altKey||event.ctrlKey||event.metaKey)return;
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
        event.preventDefault();
        go(index+(event.key==='ArrowRight'?1:-1));
      }
    }}
    style={{'--screen-wash':palette.wash,'--screen-glow':palette.glow,'--screen-deep':palette.cover[0],'--screen-mid':palette.cover[1]} as CSSProperties}>
    <div ref={stage} className="screening-stage">
    <div className="edition-screen" onPointerDown={e=>{if(e.pointerType==='touch')swipe.current=e.clientX;}}
      onPointerCancel={()=>{swipe.current=null;}} onPointerUp={e=>{
        if(swipe.current===null)return;
        const distance=e.clientX-swipe.current;swipe.current=null;
        if(Math.abs(distance)>35)go(index+(distance<0?1:-1));
      }}>
      {image?<img key={project.id} src={image} alt={project.name+' 项目封面'} width={1120} height={630} decoding="async"/>:
        <div className="edition-screen-fallback" aria-hidden="true">{project.code}</div>}
    </div>
    {neighbors.map(({item,offset})=>item&&artwork[item.id]&&<button key={item.id} className="screening-neighbor" data-side={offset<0?'previous':'next'}
      aria-label={'预览 '+item.name} onClick={()=>go(index+offset)}>
      <img src={artwork[item.id]} alt="" width={1120} height={630} decoding="async"/>
    </button>)}
    </div>
    <div className="edition-screen-guide">
      <div className="edition-screen-index"><span id="campaign-gallery-title">S 级场景档案</span><small>{String(index+1).padStart(2,'0')} / {String(items.length).padStart(2,'0')}</small></div>
      <div className="edition-screen-text" aria-live="polite"><small>{project.code} / {project.status}</small><p lang="en">{palette.title}</p><h2>{project.name||'未命名项目'}</h2></div>
      <div className="screening-brief">
        <div className="screening-brief-heading"><span>活动周期</span>{days!==null&&<strong>{days}<small> 天</small></strong>}</div>
        <dl className="screening-milestones" style={{gridTemplateColumns:'repeat('+milestones.length+', minmax(0,1fr))'}}>
          {milestones.map(({label,date})=><div key={label}><dt>{label}</dt><dd><time dateTime={date}>{date.slice(5).replace('-','.')}</time>{!date.startsWith('2027-')&&<small>{date.slice(0,4)}</small>}</dd></div>)}
        </dl>
        <div className="screening-quarter-load" aria-label="2027 年各季度占用天数">
          {QUARTERS.map((label,i)=>{
            const [start]=monthBounds(i*3), [,end]=monthBounds(i*3+2);
            const occupied=coverageDays([project],start,end);
            return <div key={label} data-active={occupied>0}><span>{label}</span><b>{occupied}<small> 天</small></b><i aria-hidden="true"><span style={{width:occupied/(end-start)*100+'%'}}/></i></div>;
          })}
        </div>
      </div>
      <div className="edition-screen-actions">
        <button className="edition-screen-open" onClick={()=>openProject(project.id)}>打开项目 <ArrowUpRight size={15}/></button>
        <button type="button" aria-label="上一张封面" disabled={index===0} onClick={()=>go(index-1)}><ArrowLeft size={16}/></button>
        <button type="button" aria-label="下一张封面" disabled={index===items.length-1} onClick={()=>go(index+1)}><ArrowRight size={16}/></button>
      </div>
    </div>
    <div className="screening-schedule" aria-live="polite">
      <header><strong>2027 年度时间带</strong><span><i/>活动周期{window&&<><i/>周中窗口 {window.start.slice(5)}–{window.end.startsWith('2027-')?window.end.slice(5):window.end}</>}</span></header>
      <div className="screening-calendar">
        <div className="screening-months" style={{gridTemplateColumns:Array.from({length:12},(_,month)=>{const [start,end]=monthBounds(month);return (end-start)+'fr';}).join(' ')}}>
          {Array.from({length:12},(_,month)=><span key={month}>{month+1}<small>月</small></span>)}
        </div>
        {[[project.start,project.end],...(window?[[window.start,window.end]]:[])].map(([start,end],i)=>{
          const first=monthBounds(0)[0], last=monthBounds(11)[1];
          const from=Math.max(first,Date.parse(start+'T00:00:00Z')/86_400_000);
          const through=Date.parse(end+'T00:00:00Z')/86_400_000+1;
          const to=Math.min(last,through);
          return <div className="screening-track" key={i} aria-label={(i?'周中窗口 ':'活动周期 ')+start+' 至 '+end}>
            {to>from&&<span style={{left:(from-first)/(last-first)*100+'%',width:(to-from)/(last-first)*100+'%'}}>{through>last?'›':''}</span>}
          </div>;
        })}
      </div>
    </div>
    <div className="edition-screen-rail" aria-label="跳转到项目封面">
      {items.map((item,i)=><button type="button" key={item.id} aria-pressed={index===i}
        style={{'--edition-swatch':campaignTitles[item.id].glow} as CSSProperties}
        aria-label={'浏览 '+item.name} onClick={()=>go(i)}>{item.code}</button>)}
    </div>
  </section>;
}

export const campaignTitles:Record<string,{title:string;glow:string;wash:string;cover:readonly [string,string,string]}>={
  S01:{title:'Lamb Ranch',glow:'#f3bb93',wash:'#b19acc',cover:['#342039','#8c536e','#efbda4']},
  S02:{title:'Spring Market',glow:'#f5a5b8',wash:'#73b5aa',cover:['#203436','#557370','#d8a6be']},
  S03:{title:'Game World 4',glow:'#f481cb',wash:'#ad80c9',cover:['#302039','#793e77','#d998d6']},
  S04:{title:'Summer Pool',glow:'#b7ebf7',wash:'#73abd9',cover:['#213047','#4d6687','#b1d4ec']},
  S05:{title:'Rockwood',glow:'#fbbb72',wash:'#dc8868',cover:['#3a2531','#865152','#e7ad87']},
  S06:{title:'Misty Theatre',glow:'#ee8eb1',wash:'#a78bb8',cover:['#342035','#753854','#ed9fba']},
  S07:{title:'Winter Museum',glow:'#edca91',wash:'#81a49e',cover:['#272b38','#6b454d','#e4c2a5']},
};
