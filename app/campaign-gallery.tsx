'use client';
import {useRef,useState,type CSSProperties} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight} from 'lucide-react';
import {durationDays,type Project} from '../lib/planner';

type GalleryProject=Pick<Project,'id'|'code'|'name'|'start'|'end'|'status'|'color'>;
export type CampaignArtwork=Record<string,string>;

export function CampaignGallery({projects,artwork,openProject}:{
  projects:GalleryProject[];
  artwork:CampaignArtwork;
  openProject:(id:string)=>void;
}) {
  const rail=useRef<HTMLDivElement>(null);
  const [active,setActive]=useState(0);
  const items=projects.filter(project=>/^S0[1-7]$/.test(project.id)).sort((a,b)=>a.id.localeCompare(b.id));
  const index=Math.min(active,items.length-1);

  const go=(next:number)=>{
    const element=rail.current;
    const card=element?.children[next];
    if(!element||!card)return;
    element.scrollTo({left:element.scrollLeft+card.getBoundingClientRect().left-element.getBoundingClientRect().left});
  };

  const sync=()=>{
    const element=rail.current;
    if(!element||!items.length)return;
    if(element.scrollLeft>=element.scrollWidth-element.clientWidth-2){
      setActive(items.length-1);
      return;
    }
    const left=element.getBoundingClientRect().left;
    let closest=0;
    let distance=Infinity;
    Array.from(element.children).forEach((card,i)=>{
      const delta=Math.abs(card.getBoundingClientRect().left-left);
      if(delta<distance){closest=i;distance=delta;}
    });
    setActive(closest);
  };

  if(!items.length)return null;
  return <section className="campaign-gallery" aria-labelledby="campaign-gallery-title">
    <header className="campaign-gallery-header">
      <h2 id="campaign-gallery-title" lang="en">Scene Studies</h2>
      <div className="campaign-gallery-controls">
        <span aria-live="polite">{String(index+1).padStart(2,'0')} / {String(items.length).padStart(2,'0')}</span>
        <button type="button" aria-label="上一张封面" disabled={index===0} onClick={()=>go(index-1)}><ArrowLeft size={17}/></button>
        <button type="button" aria-label="下一张封面" disabled={index===items.length-1} onClick={()=>go(index+1)}><ArrowRight size={17}/></button>
      </div>
    </header>
    <div className="campaign-rail" ref={rail} onScroll={sync} aria-label="滑动浏览 S 级项目">
      {items.map(project=><button type="button" className="campaign-slide" key={project.id}
        style={{'--poster-color':project.color} as CSSProperties}
        aria-label={'打开项目 '+project.name} onClick={()=>openProject(project.id)}>
        <div className="campaign-artwork">
          {artwork[project.id]?<img src={artwork[project.id]} alt={project.name+' 项目封面'} width={1120} height={630} decoding="async"/>:
            <span className="campaign-artwork-placeholder">{project.code}</span>}
        </div>
        <div className="campaign-slide-info">
          <div><small>{project.code} · {project.status}</small><h3>{project.name||'未命名项目'}</h3></div>
          <span className="campaign-slide-date">{project.start.slice(5).replace('-','.')+'–'+project.end.slice(5).replace('-','.')}{project.start.slice(0,4)!==project.end.slice(0,4)?'（跨年）':''}<small>{durationDays(project.start,project.end)} 天</small></span>
          <ArrowUpRight size={17} aria-hidden="true"/>
        </div>
      </button>)}
    </div>
    <div className="campaign-gallery-index" aria-label="跳转到项目封面">
      {items.map((project,i)=><button type="button" key={project.id} aria-pressed={index===i} aria-label={'浏览 '+project.name} onClick={()=>go(i)}>{project.code}</button>)}
    </div>
  </section>;
}

const cardTitles:Record<string,{title:string;ink:string;glow:string;wash:string}>={
  S01:{title:'Lamb Ranch',ink:'#4a3157',glow:'#f3bb93',wash:'#b19acc'},
  S02:{title:'Spring Market',ink:'#154743',glow:'#f5a5b8',wash:'#73b5aa'},
  S03:{title:'Game World 4',ink:'#5b2765',glow:'#f481cb',wash:'#ad80c9'},
  S04:{title:'Summer Pool',ink:'#17486c',glow:'#b7ebf7',wash:'#73abd9'},
  S05:{title:'Rockwood',ink:'#703517',glow:'#fbbb72',wash:'#dc8868'},
  S06:{title:'Misty Theatre',ink:'#64223f',glow:'#ee8eb1',wash:'#a78bb8'},
  S07:{title:'Winter Museum',ink:'#622d39',glow:'#edca91',wash:'#81a49e'},
};

export function CampaignCardTitle({id}:{id:string}) {
  if(!Object.hasOwn(cardTitles,id))return null;
  const {title,ink,glow,wash}=cardTitles[id];
  const palette={'--title-ink':ink,'--title-glow':glow,'--title-wash':wash} as CSSProperties;
  return <div className="project-title-band" style={palette}>
    <p lang="en">{title}</p>
  </div>;
}
