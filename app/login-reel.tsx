'use client';
import {useCallback,useEffect,useRef,useState,type CSSProperties,type FormEvent} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,Pause,Play,X} from 'lucide-react';
import {durationDays} from '../lib/planner';
import {useLoginReel} from '../lib/storage';
import {loginEditions,type EditionYear} from './login-editions';
import {useHorizontalWheel} from './use-horizontal-wheel';

const yearPreference='ins-land-opening-year';
const cardDate=(date:string,year:EditionYear)=>date.startsWith(year+'-')?date.slice(5).replace('-','.'):date.replaceAll('-','.');
const sceneIndex=(index:number,count:number)=>(index+count)%count;
const sparks=[[8,24,26],[16,43,15],[24,15,21],[34,31,13],[63,14,22],[76,35,15],[86,24,31],[93,43,21],[11,72,18],[89,80,24]];

export function LoginReel({busy,error,onLogin,onResume}:{
  busy:boolean;error:string;onResume?:()=>void;onLogin:(name:string,password:string,register:boolean)=>void;
}) {
  const image=useLoginReel();
  const [year,setYear]=useState<EditionYear>(2027);
  const [active,setActive]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [open,setOpen]=useState(false);
  const [flipped,setFlipped]=useState(false);
  const [register,setRegister]=useState(false);
  const stage=useRef<HTMLElement>(null);
  const details=useRef<HTMLDialogElement>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  const swipeStart=useRef<number|null>(null);
  const swiped=useRef(false);
  const scenes=loginEditions[year];
  const count=scenes.length;
  const edition=scenes[active];
  const archive=year===2026;
  useEffect(()=>{
    try{if(localStorage.getItem(yearPreference)==='2026')setYear(2026);}catch{}
  },[]);

  useEffect(()=>{
    const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
    setPlaying(!preference.matches);
    const stopOnPreference=(event:MediaQueryListEvent)=>{if(event.matches)setPlaying(false);};
    preference.addEventListener('change',stopOnPreference);
    return ()=>preference.removeEventListener('change',stopOnPreference);
  },[]);

  useEffect(()=>{
    if((!archive&&!image)||!playing||open||flipped)return;
    const timer=window.setInterval(()=>{
      if(!document.hidden)setActive(index=>sceneIndex(index+1,count));
    },4600);
    return ()=>window.clearInterval(timer);
  },[archive,count,image,playing,open,flipped]);

  const step=useCallback((offset:number)=>{
    setPlaying(false);setFlipped(false);
    setActive(index=>sceneIndex(index+offset,count));
  },[count]);
  useHorizontalWheel(step,!open&&!flipped,stage);
  useEffect(()=>{
    if(open||flipped)return;
    const navigate=(event:KeyboardEvent)=>{
      if(event.altKey||event.ctrlKey||event.metaKey||event.target instanceof Element&&event.target.closest('input,select,textarea'))return;
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
        event.preventDefault();
        step(event.key==='ArrowLeft'?-1:1);
      }
    };
    window.addEventListener('keydown',navigate);
    return ()=>window.removeEventListener('keydown',navigate);
  },[open,flipped,step]);
  const chooseYear=(next:EditionYear)=>{
    details.current?.close();
    setFlipped(false);
    setActive(0);
    setYear(next);
    try{localStorage.setItem(yearPreference,String(next));}catch{}
  };
  const enter=()=>{
    if(onResume){onResume();return;}
    dialog.current?.showModal();
    setOpen(true);
  };
  const submit=(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    const fields=new FormData(event.currentTarget);
    onLogin(String(fields.get('handle')).trim(),String(fields.get('password')),register);
  };

  return <main className="login-reel" data-year={year} style={{
    '--scene-glow':edition.glow,'--scene-wash':edition.wash,'--scene-deep':edition.deep,
    '--scene-x':(active%3)*50+'%','--scene-y':Math.floor(active/3)*50+'%',
    ...(!archive&&image?{'--reel-image':'url('+image+')'}:{}),
    ...(edition.poster?{'--scene-poster':'url('+edition.poster+')'}:{}),
  } as CSSProperties} lang="en">
    <div className="reel-atmosphere" aria-hidden="true"/>
    <div className="reel-volume" aria-hidden="true"/>
    <div className="reel-sparks" aria-hidden="true">{sparks.map(([x,y,size],i)=><i key={i} style={{left:x+'%',top:y+'%',width:size,height:size,animationDelay:i*-.83+'s'}}/>)}</div>
    <header className="reel-header">
      <div className="reel-year-mark"><span className="reel-wordmark">INS LAND</span><span aria-hidden="true">/</span>
        <select aria-label="Campaign year" value={year} onChange={event=>chooseYear(event.target.value==='2026'?2026:2027)}>
          <option value={2027}>2027 — Campaign Planning</option>
          <option value={2026}>2026 — Campaign Archive</option>
        </select>
        <span className="reel-year-caption" aria-hidden="true">{year}</span>
      </div>
      <span className="reel-edition">{archive?'CAMPAIGN ARCHIVE':'THE CAMPAIGN EDITION'}</span>

    </header>

    <h1 className="reel-greeting" key={year}><span>Hi {year}</span></h1>

    <div className="reel-intro">
      <button type="button" className="reel-enter reel-entry-window" onClick={enter}>
        <span className="reel-entry-kicker">INS LAND / CAMPAIGN PLANNING</span>
        <strong>Enter Workspace</strong><ArrowUpRight size={22} aria-hidden="true"/>
      </button>
    </div>

    <section ref={stage} className="reel-stage" aria-label="Seven campaign editions"
      onPointerDown={event=>{
        swiped.current=false;
        if(event.button===0)swipeStart.current=event.clientX;
      }}
      onPointerCancel={()=>{swipeStart.current=null;}}
      onPointerUp={event=>{
        if(swipeStart.current===null)return;
        const distance=event.clientX-swipeStart.current;
        swipeStart.current=null;
        if(Math.abs(distance)>30){swiped.current=true;step(distance<0?1:-1);}
      }}>
      <div className="reel-deck" key={year}>
        {scenes.map((item,index)=>{
          const relative=sceneIndex(index-active+3,count)-3;
          return <button key={item.id} type="button" className="reel-card" data-position={relative} data-edition={item.id}
            tabIndex={relative===0?0:-1}
            aria-label={item.title+(relative===0?', open edition details':', select edition')}
            aria-haspopup={relative===0?'dialog':undefined}
            style={{
              '--slot':relative,'--distance':Math.abs(relative),
              '--tile-x':(index%3)*50+'%','--tile-y':Math.floor(index/3)*50+'%',
              '--card-glow':item.glow,'--card-wash':item.wash,'--card-deep':item.deep,
            } as CSSProperties}
            onClick={()=>{
              if(swiped.current){swiped.current=false;return;}
              if(relative===0){
                setPlaying(false);
                setFlipped(true);
                details.current?.showModal();
              }else step(relative);
            }}>
            <span className="reel-paper" aria-hidden="true">
              <span className="reel-paper-front">
                {item.poster?<img className="reel-poster" src={item.poster} alt="" draggable={false} fetchPriority={relative===0?'high':'auto'} loading={Math.abs(relative)>1?'lazy':'eager'}/>:
                  <>
                    <span className="reel-card-code"><span>{item.code} / EDITION</span><span>{year}</span></span>
                    <span className="reel-card-art"/>
                    <span className="reel-card-title">{item.title}</span>
                    <span className="reel-paper-imprint">INS LAND <span>ARCHIVE PRINT</span></span>
                  </>}
              </span>
            </span>
          </button>;
        })}
      </div>
    </section>

    <dialog ref={details} className="reel-edition-dialog" data-archive={archive} lang="zh-CN" aria-labelledby="reel-detail-title"
      onClose={()=>setFlipped(false)}
      onClick={event=>{if(event.target===event.currentTarget)details.current?.close();}}
      style={{'--card-glow':edition.glow,'--card-wash':edition.wash,'--card-deep':edition.deep} as CSSProperties}>
      <div className={archive?'reel-archive-flip':undefined}>
      {edition.poster&&flipped&&<div className="reel-archive-front" aria-hidden="true"><img src={edition.poster} alt=""/></div>}
      <div className="reel-paper-back reel-edition-detail">
        <span className="reel-card-code">INS LAND / {year} · {edition.code}</span>
        <button type="button" className="reel-detail-close" aria-label="关闭卡片详情" onClick={()=>details.current?.close()}><X size={19}/></button>
        <h2 id="reel-detail-title" className="reel-back-title"><span className="reel-card-title" lang="en">{edition.title}</span><strong>{edition.name}</strong></h2>
        <dl className="reel-back-dates">
          <div><dt>上线</dt><dd>{cardDate(edition.start,year)}</dd></div>
          <div><dt>下线</dt><dd>{cardDate(edition.end,year)}</dd></div>
          <div><dt>周期</dt><dd>{durationDays(edition.start,edition.end)} 天</dd></div>
        </dl>
        <div className="reel-back-nodes"><span>{archive?'关联 A 级活动':'同期节日及节点'}</span><span>{edition.nodes.map(node=><b key={node}>{node}</b>)}</span></div>
        {archive&&<small className="reel-archive-imprint">ARCHIVE / {year}</small>}
      </div>
      </div>
    </dialog>

    <footer className="reel-footer">
      <div className="reel-caption" aria-live={playing?'off':'polite'}><span>{edition.code}</span><strong>{edition.title}</strong></div>
      <div className="reel-slider">
        <input type="range" aria-label="Select campaign edition" min={0} max={scenes.length-1} value={active} aria-valuetext={edition.title}
          onChange={event=>{setPlaying(false);setFlipped(false);setActive(Number(event.target.value));}}/>
        <div aria-hidden="true">{scenes.map(item=><i key={item.id}/>)}</div>
      </div>
      <div className="reel-controls">
        <button type="button" onClick={()=>step(-1)} aria-label="Previous cover"><ArrowLeft size={19}/></button>
        <span className="reel-counter">{String(active+1).padStart(2,'0')} <i>/</i> {String(count).padStart(2,'0')}</span>
        <button type="button" onClick={()=>step(1)} aria-label="Next cover"><ArrowRight size={19}/></button>
        <button type="button" className="reel-play" onClick={()=>{setFlipped(false);setPlaying(!playing);}} aria-label={playing?'Pause slideshow':'Play slideshow'}>
          {playing?<Pause size={15}/>:<Play size={15}/>}
        </button>
      </div>
    </footer>

    <dialog ref={dialog} className="auth-card reel-dialog" aria-labelledby="reel-auth-title" onClose={()=>setOpen(false)}>
      <button type="button" className="icon reel-close" aria-label="Close sign in" onClick={()=>dialog.current?.close()}><X size={19}/></button>
      <span className="eyebrow">INS LAND / 2027</span>
      <h2 id="reel-auth-title">Enter Workspace</h2>
      {error&&<p className="danger" role="alert">{error}</p>}
      <div className="segmented auth-tabs">
        <button type="button" aria-pressed={!register} onClick={()=>setRegister(false)} disabled={busy}>Sign in</button>
        <button type="button" aria-pressed={register} onClick={()=>setRegister(true)} disabled={busy}>Register</button>
      </div>
      <form key={String(register)} method="post" onSubmit={submit}>
        <label>{register?'Your name':'Account or registered name'}<input name="handle" required minLength={2} maxLength={32} autoComplete="username" placeholder={register?'Enter 2–32 characters':'Enter your account or name'}/></label>
        <label>{register?'Registration password':'Password'}<input name="password" type="password" required maxLength={72} autoComplete={register?'new-password':'current-password'} placeholder="Enter your password"/></label>
        {register&&<p className="helper">Use the access password provided by the person who shared this workspace.</p>}
        <button className="primary" disabled={busy}>{busy?'Connecting…':register?'Register and enter':'Sign in'}</button>
      </form>
    </dialog>
  </main>;
}
