'use client';

import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties,type ReactNode,type RefObject} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,Pause,Play,X} from 'lucide-react';
import {durationDays} from '../lib/planner';
import {campaignBrief} from '../lib/planning-brief';
import {loginEditions} from './login-editions';
import {openingMedia} from './campaign-opening-media';

const editions=loginEditions[2027];
const pageTurnMs=240;
const returnMs=180;
const openingMs=540;
const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const decodedPosters=new Map<string,Promise<string|null>>();

function preparePoster(index:number) {
  const original=openingMedia[editions[index]?.code]?.stillImage;
  if(!original)return Promise.resolve(null);
  const mobile=window.innerWidth<=700;
  const width=mobile?window.innerWidth*.8:Math.min(window.innerWidth-48,(window.innerHeight-48)*16/9)*.8;
  const pixels=width*Math.min(window.devicePixelRatio||1,2);
  const size=pixels<=1024?1024:pixels<=1600?1600:2560;
  const src=original.replace(/cover\.webp$/, `cover-${size}.webp`);
  const cached=decodedPosters.get(src);
  if(cached)return cached;
  const img=new Image();
  img.src=src;
  const decoded=img.decode().then(()=>src,()=>{
    decodedPosters.delete(src);
    return null;
  });
  decodedPosters.set(src,decoded);
  return decoded;
}

function OpeningPoster({index,play,src,atlas}:{index:number;play:boolean;src:string|null;atlas:string}) {
  const edition=editions[index];
  const brief=campaignBrief({id:edition.code});
  const media=openingMedia[edition.code];
  const [ready,setReady]=useState(false);
  const [paused,setPaused]=useState(false);
  const [failed,setFailed]=useState(false);
  const [stillVisible,setStillVisible]=useState(true);
  const [motion,setMotion]=useState(false);
  const video=useRef<HTMLVideoElement>(null);
  const enabled=!!(media?.videoEnabled&&(media.videoMp4||media.videoWebm));
  useEffect(()=>{
    const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>setMotion(!preference.matches);
    update();
    preference.addEventListener('change',update);
    return ()=>preference.removeEventListener('change',update);
  },[]);
  useEffect(()=>{
    const player=video.current;
    if(!player)return;
    let current=true;
    if(play&&motion&&!paused&&!failed) {
      void player.play().catch(()=>{
        if(current){setReady(false);setPaused(true);}
      });
    }else {
      player.pause();
      setReady(false);
    }
    return ()=>{current=false;player.pause();};
  },[play,motion,paused,failed]);
  return <article className="opening-poster" style={{
    '--opening-deep':media?.shade??edition.deep,'--opening-wash':edition.wash,
    '--opening-ink':edition.glow,'--opening-video-inset':media?.videoInset??'0',
  } as CSSProperties}>
    <div className="opening-art">
      {src&&stillVisible?<img src={src} alt="" draggable={false} onError={()=>setStillVisible(false)}/>:
        atlas&&<div className="opening-atlas" style={{backgroundImage:`url(${atlas})`,
          backgroundPosition:`${index%3*50}% ${Math.floor(index/3)*50}%`}}/>}
      {enabled&&play&&motion&&<video ref={video} muted loop playsInline preload="none"
        className={ready&&!paused?'is-playing':undefined}
        onPlaying={()=>setReady(true)} onError={()=>{setReady(false);setFailed(true);}}>
        {media?.videoMp4&&<source src={media.videoMp4} type="video/mp4"/>}
        {media?.videoWebm&&<source src={media.videoWebm} type="video/webm"/>}
      </video>}
    </div>
    <div className="opening-copy">
      <div className="opening-code">{edition.code} / 2027</div>
      <h2 className="opening-title">{edition.name}</h2>
      <div className="opening-dates">{edition.start.replaceAll('-','.')} — {edition.end.startsWith('2027-')?edition.end.slice(5).replace('-','.'):edition.end.replaceAll('-','.')} <span>/ {durationDays(edition.start,edition.end)} DAYS</span></div>
      <p className="opening-direction">{brief?.direction}</p>
      <p className="opening-slogan">{brief?.positioning}</p>
      <p className="opening-difference">{brief?.difference}</p>
      {brief?.storeTitle&&<section className="opening-store">
        <p lang="en">STORE CREATIVE DIRECTION</p>
        <h3>{brief.storeTitle}</h3>
        <p>{brief.storeDirection}</p>
      </section>}
      <ul className="opening-keywords">{brief?.keywords.map(keyword=><li key={keyword}>{keyword}</li>)}</ul>
    </div>
    {enabled&&play&&motion&&!failed&&<button type="button" className="opening-play" onClick={()=>setPaused(value=>!value)}
      aria-label={paused?'播放动态画面':'暂停动态画面'}>{paused?<Play size={17}/>:<Pause size={17}/>}</button>}
  </article>;
}

type Phase='home'|'opening'|'expanded'|'switching'|'closing';
type OpeningProps={
  index:number;
  image:string;
  request:{origin:HTMLButtonElement}|null;
  stage:RefObject<HTMLElement|null>;
  onIndex:(index:number)=>void;
  onClose:()=>void;
  onWorkshop:()=>void;
};

export function CampaignOpening({index,image,request,stage,onIndex,onClose,onWorkshop}:OpeningProps) {
  const dialog=useRef<HTMLDialogElement>(null);
  const frame=useRef<HTMLDivElement>(null);
  const flip=useRef<HTMLDivElement>(null);
  const phase=useRef<Phase>('home');
  const animations=useRef<Animation[]>([]);
  const [status,setStatus]=useState<Phase>('home');
  const [previous,setPrevious]=useState<number|null>(null);
  const [direction,setDirection]=useState(1);
  const [focusIndex,setFocusIndex]=useState(index);
  const workshop=useRef(false);
  const switchTimer=useRef<number|undefined>(undefined);
  const changePhase=(next:Phase)=>{phase.current=next;setStatus(next);};

  const [start,setStart]=useState<OpeningProps['request']>(null);
  const [stills,setStills]=useState<Partial<Record<number,string|null>>>({});
  const pendingPage=useRef<symbol|null>(null);

  useEffect(()=>{
    void preparePoster(index);
  },[index]);

  useEffect(()=>{
    if(!request)return;
    let current=true;
    void preparePoster(index).then(src=>{
      if(!current)return;
      setStills(stills=>({...stills,[index]:src}));
      setStart(request);
    });
    return ()=>{current=false;};
    // The request captures the initially selected card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[request]);

  useLayoutEffect(()=>{
    if(!request||start!==request||!dialog.current)return;
    const element=dialog.current;
    element.showModal();
    const overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    changePhase('opening');
    setFocusIndex(index);
    const origin=request.origin.getBoundingClientRect();
    const panel=frame.current!;
    const end=panel.getBoundingClientRect();
    const startTransform=`translate(-50%,-50%) translate(${origin.x+origin.width/2-end.x-end.width/2}px,${origin.y+origin.height/2-end.y-end.height/2}px) scale(${origin.width/end.width},${origin.height/end.height})`;
    const options:KeyframeAnimationOptions={duration:reduced()?0:openingMs,easing:'cubic-bezier(.3,.7,.25,1)',fill:'both'};
    animations.current=[
      panel.animate([{transform:startTransform},{transform:'translate(-50%,-50%)'}],options),
      flip.current!.animate([{transform:'rotateY(0deg)'},{transform:'rotateY(180deg)'}],options),
    ];
    void Promise.all(animations.current.map(animation=>animation.finished)).then(()=>{
      animations.current.forEach(animation=>animation.cancel());
      changePhase('expanded');
    }).catch(()=>{});
    return ()=>{
      pendingPage.current=null;
      window.clearTimeout(switchTimer.current);
      animations.current.forEach(animation=>animation.cancel());
      document.body.style.overflow=overflow;
      if(element.open)element.close();
      phase.current='home';
    };
    // The request identifies a single opening session, even as its active edition changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[request,start]);

  useEffect(()=>{
    if(status!=='expanded')return;
    if(index+1<editions.length)void preparePoster(index+1);
    if(index>0)void preparePoster(index-1);
  },[index,status]);

  function step(offset:number) {
    const next=index+offset;
    if(phase.current!=='expanded'||pendingPage.current||next<0||next>=editions.length)return;
    const load=Symbol();
    pendingPage.current=load;
    void preparePoster(next).then(src=>{
      if(pendingPage.current!==load)return;
      pendingPage.current=null;
      setStills(stills=>({...stills,[next]:src}));
      setDirection(offset);
      setPrevious(reduced()?null:index);
      setFocusIndex(next);
      changePhase('switching');
      onIndex(next);
      switchTimer.current=window.setTimeout(()=>{
        setPrevious(null);
        changePhase('expanded');
      },reduced()?0:pageTurnMs);
    });
  }

  function close(enterWorkshop=false) {
    if(phase.current!=='expanded'&&phase.current!=='switching')return;
    pendingPage.current=null;
    workshop.current=enterWorkshop;
    window.clearTimeout(switchTimer.current);
    setPrevious(null);
    changePhase('closing');
    const target=stage.current?.querySelector<HTMLButtonElement>('.reel-card[data-position="0"]')??request?.origin;
    const panel=frame.current;
    if(!panel||!target)return;
    const from=panel.getBoundingClientRect();
    const to=target.getBoundingClientRect();
    const shrink=panel.animate([
      {transform:'translate(-50%,-50%)',opacity:1},
      {transform:`translate(-50%,-50%) translate(${to.x+to.width/2-from.x-from.width/2}px,${to.y+to.height/2-from.y-from.height/2}px) scale(${to.width/from.width},${to.height/from.height})`,opacity:.35},
    ],{duration:reduced()?0:returnMs,easing:'cubic-bezier(.25,.8,.25,1)',fill:'both'});
    animations.current=[shrink];
    void shrink.finished.then(()=>{
      dialog.current?.close();
      changePhase('home');
      onClose();
      target.focus({preventScroll:true});
      if(workshop.current)onWorkshop();
    }).catch(()=>{});
  }

  const actions=useRef({step,close});
  actions.current={step,close};
  useEffect(()=>{
    const element=dialog.current;
    if(!request||!element)return;
    let last=-Infinity;
    let sum=0;
    let latched=false;
    let peak=0;
    let sign=0;
    const wheel=(event:WheelEvent)=>{
      // The mobile copy scrolls independently of gestures on the artwork.
      if(window.innerWidth<=700&&event.target instanceof Element&&event.target.closest('.opening-copy'))return;
      event.preventDefault();
      const now=event.timeStamp;
      const horizontal=Math.abs(event.deltaX)>Math.abs(event.deltaY);
      const delta=(horizontal?event.deltaX:event.deltaY)*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
      if(!delta)return;
      const idle=now-last;
      last=now;
      // Ignore a weaker same-direction tail even when wheel events arrive in bursts.
      const tail=latched&&idle<720&&Math.sign(delta)===sign&&Math.abs(delta)<peak*.55;
      if(idle>240&&!tail){sum=0;peak=0;latched=false;}
      peak=Math.max(peak,Math.abs(delta));
      if(latched)return;
      sum+=delta;
      if(Math.abs(sum)<35)return;
      latched=true;
      sign=Math.sign(sum);
      actions.current.step(sign);
    };
    element.addEventListener('wheel',wheel,{passive:false});
    return ()=>element.removeEventListener('wheel',wheel);
  },[request]);
  const touch=useRef<{x:number;y:number}|null>(null);
  const suppressClick=useRef(0);
  const front=editions[focusIndex];
  const poster=(posterIndex:number,classes:string,play:boolean):ReactNode=>
    <div key={posterIndex} className={classes} style={{'--opening-slip':direction*100+'%'} as CSSProperties}>
      <OpeningPoster index={posterIndex} play={play} src={stills[posterIndex]??null} atlas={image}/>
    </div>;

  return <dialog ref={dialog} className="campaign-opening" aria-label={editions[index].name} lang="zh-CN"
    data-phase={status}
    onCancel={event=>{event.preventDefault();close();}}
    onKeyDown={event=>{
      if(event.altKey||event.ctrlKey||event.metaKey)return;
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
        event.preventDefault();
        if(!event.repeat)step(event.key==='ArrowLeft'?-1:1);
      }
    }}
    onClick={event=>{
      if(event.button!==0||performance.now()<=suppressClick.current||!(event.target instanceof Element)||event.target.closest('button'))return;
      close();
    }}
    onTouchStart={event=>{
      if(event.target instanceof Element&&event.target.closest('button,.opening-copy'))return;
      const point=event.touches[0];
      touch.current={x:point.clientX,y:point.clientY};
    }}
    onTouchCancel={()=>{touch.current=null;}}
    onTouchEnd={event=>{
      const start=touch.current;
      touch.current=null;
      if(!start)return;
      const point=event.changedTouches[0];
      const dx=start.x-point.clientX;
      if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(start.y-point.clientY)){
        suppressClick.current=performance.now()+450;
        step(Math.sign(dx));
      }
    }}>
    {request&&<div ref={frame} className="opening-frame">
      <div ref={flip} className="opening-flip">
        <div className="opening-front reel-paper-front" aria-hidden="true" style={{
          '--tile-x':focusIndex%3*50+'%','--tile-y':Math.floor(focusIndex/3)*50+'%',
          '--card-glow':front.glow,'--card-deep':front.deep,'--card-wash':front.wash,
          ...(image?{'--reel-image':'url('+image+')'}:{}),
        } as CSSProperties}>
          <span className="reel-card-code"><span>{front.code} / EDITION</span><span>2027</span></span>
          <span className="reel-card-art"/>
          <span className="reel-card-title">{front.title}</span>
          <span className="reel-paper-imprint">INS LAND <span>ARCHIVE PRINT</span></span>
        </div>
        <div className="opening-back">
          {previous!==null&&poster(previous,'opening-layer opening-out',false)}
          {poster(index,'opening-layer'+(previous!==null?' opening-in':''),status==='expanded')}
          <div className="opening-controls">
            <button type="button" aria-label="进入 Workshop" onClick={()=>close(true)}>Workshop <ArrowUpRight size={15}/></button>
            <button type="button" aria-label="关闭画册" onClick={()=>close()} autoFocus><X size={20}/></button>
          </div>
          <nav className="opening-navigation" aria-label="浏览主题">
            <button type="button" aria-label="上一主题" disabled={index===0} onClick={()=>step(-1)}><ArrowLeft size={18}/></button>
            <span>{editions[index].code} / 07</span>
            <button type="button" aria-label="下一主题" disabled={index===editions.length-1} onClick={()=>step(1)}><ArrowRight size={18}/></button>
          </nav>
        </div>
      </div>
    </div>}
  </dialog>;
}
