'use client';
import {useRef,type CSSProperties} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight} from 'lucide-react';
import {durationDays} from '../lib/planner';
import {campaignBrief,type PlanningBrief} from '../lib/planning-brief';

import {monthBounds,weekdayWindows,type ScheduleProject} from '../lib/weekday';

import {useHorizontalWheel} from './use-horizontal-wheel';

type GalleryProject=ScheduleProject & {planningBrief?:PlanningBrief|null};
export type CampaignArtwork=Record<string,string>;

export function CampaignGallery({projects,artwork,activeId,onSelect,openProject,visible,fullArtwork}:{
  projects:GalleryProject[];
  artwork:CampaignArtwork;
  activeId:string|null;
  visible:boolean;
  fullArtwork?:string;
  onSelect:(id:string)=>void;
  openProject:(id:string)=>void;
}) {
  const swipe=useRef<number|null>(null);
  const items=projects.filter(project=>/^S0[1-7]$/.test(project.id)).sort((a,b)=>a.id.localeCompare(b.id));
  const index=Math.max(0,items.findIndex(item=>item.id===activeId));
  const project=items[index];
  const go=(next:number)=>onSelect(items[Math.max(0,Math.min(items.length-1,next))].id);
  useHorizontalWheel(direction=>go(index+direction),visible&&Boolean(project));
  if(!project)return null;
  const palette=campaignTitles[project.id];
  const image=fullArtwork??artwork[project.id];
  const window=weekdayWindows([project])[0];
  const neighbors=[{item:items[index-1],offset:-1},{item:items[index+1],offset:1}];
  const days=durationDays(project.start,project.end);
  const brief=campaignBrief(project);
  const keywords=brief?.keywords.map(value=>value.trim()).filter(Boolean)??[];
  return <section className="campaign-gallery edition-screening" aria-labelledby="campaign-gallery-title"
    onKeyDown={event=>{
      if(event.altKey||event.ctrlKey||event.metaKey)return;
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
        event.preventDefault();
        go(index+(event.key==='ArrowRight'?1:-1));
      }
    }}
    style={{'--screen-wash':palette.wash,'--screen-glow':palette.glow,'--screen-deep':palette.cover[0],'--screen-mid':palette.cover[1]} as CSSProperties}>
    <div className="screening-stage">
    <div className="edition-screen" onPointerDown={e=>{if(e.pointerType==='touch')swipe.current=e.clientX;}}
      onPointerCancel={()=>{swipe.current=null;}} onPointerUp={e=>{
        if(swipe.current===null)return;
        const distance=e.clientX-swipe.current;swipe.current=null;
        if(Math.abs(distance)>35)go(index+(distance<0?1:-1));
      }}>
      {image?<img key={project.id} src={image} alt={project.name+' 项目封面'} width={1920} height={1080} decoding="async"/>:
        <div className="edition-screen-fallback" aria-hidden="true">{project.code}</div>}
      <p className="screening-positioning">{brief?.positioning.trim()||'主题定位待补充'}</p>
    </div>
    {neighbors.map(({item,offset})=>item&&artwork[item.id]&&<button key={item.id} className="screening-neighbor" data-side={offset<0?'previous':'next'}
      aria-label={'预览 '+item.name} onClick={()=>go(index+offset)}>
      <img src={artwork[item.id]} alt="" width={1920} height={1080} decoding="async"/>
    </button>)}
    </div>
    <div className="edition-screen-guide">
      <div className="edition-screen-index"><span id="campaign-gallery-title">S 级场景档案</span><small>{String(index+1).padStart(2,'0')} / {String(items.length).padStart(2,'0')}</small></div>
      <div className="edition-screen-text" aria-live="polite"><small>{project.code} / {project.status}</small><p lang="en">{palette.title}</p><h2 className="screening-chinese-title">{project.name||'未命名项目'}</h2></div>
      <div className="screening-store-direction" aria-live="polite">
        <span>STORE CREATIVE DIRECTION</span>
        <h3>{brief?.storeTitle?.trim()||'门店创意方向'}</h3>
        <p>{brief?.storeDirection?.trim()||'创意方向待补充'}</p>
      </div>
      <div className="screening-editorial" aria-live="polite">
        <dl>
          <div className="screening-direction"><dt lang="en">PRIMARY DIRECTION</dt><dd>{brief?.direction.trim()||'待补充'}</dd></div>
          <div className="screening-difference"><dt lang="en">KEY DIFFERENCE</dt><dd>{brief?.difference.trim()||'待补充'}</dd></div>
        </dl>
        {keywords.length>0&&<ul aria-label="内容关键词">{keywords.map((word,i)=><li key={i}>{word}</li>)}</ul>}
      </div>
      <div className="screening-date-line">
        <span><time dateTime={project.start}>{project.start.replaceAll('-','.')}</time> – <time dateTime={project.end}>{project.end.startsWith(project.start.slice(0,4))?project.end.slice(5).replace('-','.'):project.end.replaceAll('-','.')}</time></span>
        {days!==null&&<strong>{days} 天</strong>}
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
