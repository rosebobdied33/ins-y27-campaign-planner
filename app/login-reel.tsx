'use client';
import {useCallback,useEffect,useRef,useState,type CSSProperties,type FormEvent} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,Pause,Play,X} from 'lucide-react';
import {useLoginReel} from '../lib/storage';
import {campaignTitles} from './campaign-gallery';

const scenes=['S01','S02','S03','S04','S05','S06','S07'] as const;
const sceneIndex=(index:number)=>(index+scenes.length)%scenes.length;
const sparks=[[9,22],[19,44],[28,16],[39,32],[59,19],[72,38],[84,25],[93,43]];

export function LoginReel({busy,error,onLogin}:{
  busy:boolean;error:string;onLogin:(name:string,password:string,register:boolean)=>void;
}) {
  const image=useLoginReel();
  const [active,setActive]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [open,setOpen]=useState(false);
  const [flipped,setFlipped]=useState(false);
  const [register,setRegister]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const swipeStart=useRef<number|null>(null);
  const swiped=useRef(false);
  const scene=scenes[active];
  const palette=campaignTitles[scene];

  useEffect(()=>{
    const preference=window.matchMedia('(prefers-reduced-motion: reduce)');
    setPlaying(!preference.matches);
    const stopOnPreference=(event:MediaQueryListEvent)=>{if(event.matches)setPlaying(false);};
    preference.addEventListener('change',stopOnPreference);
    return ()=>preference.removeEventListener('change',stopOnPreference);
  },[]);

  useEffect(()=>{
    if(!image||!playing||open)return;
    const timer=window.setInterval(()=>{
      if(!document.hidden)setActive(index=>sceneIndex(index+1));
    },4600);
    return ()=>window.clearInterval(timer);
  },[image,playing,open]);

  const step=useCallback((offset:number)=>{
    setPlaying(false);setFlipped(false);
    setActive(index=>sceneIndex(index+offset));
  },[]);
  useEffect(()=>{
    if(open)return;
    const navigate=(event:KeyboardEvent)=>{
      if(event.altKey||event.ctrlKey||event.metaKey||event.target instanceof HTMLInputElement)return;
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
        event.preventDefault();
        step(event.key==='ArrowLeft'?-1:1);
      }
    };
    window.addEventListener('keydown',navigate);
    return ()=>window.removeEventListener('keydown',navigate);
  },[open,step]);
  const enter=()=>{
    dialog.current?.showModal();
    setOpen(true);
  };
  const submit=(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    const fields=new FormData(event.currentTarget);
    onLogin(String(fields.get('handle')).trim(),String(fields.get('password')),register);
  };

  return <main className="login-reel" style={{
    '--scene-glow':palette.glow,'--scene-wash':palette.wash,'--scene-deep':palette.cover[0],
    '--scene-x':(active%3)*50+'%','--scene-y':Math.floor(active/3)*50+'%',
    ...(image?{'--reel-image':'url('+image+')'}:{}),
  } as CSSProperties} lang="en">
    <div className="reel-atmosphere" aria-hidden="true"/>
    <div className="reel-volume" aria-hidden="true"/>
    <div className="reel-sparks" aria-hidden="true">{sparks.map(([x,y],i)=><i key={i} style={{left:x+'%',top:y+'%',animationDelay:i*-.83+'s'}}/>)}</div>
    <header className="reel-header">
      <span className="reel-wordmark">INS LAND<small>2027</small></span><span className="reel-edition">THE CAMPAIGN EDITION</span>

    </header>

    <div className="reel-intro">
      <button type="button" className="reel-enter reel-entry-window" onClick={enter}>
        <span className="reel-entry-kicker">INS LAND / CAMPAIGN PLANNING</span>
        <strong>Enter Workspace</strong><ArrowUpRight size={22} aria-hidden="true"/>
      </button>
    </div>

    <section className="reel-stage" aria-label="Seven campaign editions"
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
      <div className="reel-deck">
        {scenes.map((item,index)=>{
          const relative=sceneIndex(index-active+3)-3;
          const colors=campaignTitles[item];
          return <button key={item} type="button" className="reel-card" data-position={relative}
            tabIndex={relative===0?0:-1}
            aria-label={colors.title+(relative===0?(flipped?', show front':', flip edition'):', select edition')}
            aria-pressed={relative===0&&flipped}
            style={{
              '--slot':relative,'--distance':Math.abs(relative),
              '--tile-x':(index%3)*50+'%','--tile-y':Math.floor(index/3)*50+'%',
              '--card-glow':colors.glow,'--card-wash':colors.wash,
            } as CSSProperties}
            onClick={()=>{
              if(swiped.current){swiped.current=false;return;}
              if(relative===0){setPlaying(false);setFlipped(!flipped);}else step(relative);
            }}>
            <span className="reel-paper" data-flipped={relative===0&&flipped} aria-hidden="true">
              <span className="reel-paper-front">
                <span className="reel-card-code"><span>{item} / EDITION</span><span>2027</span></span>
                <span className="reel-card-art"/>
                <span className="reel-card-title">{colors.title}</span>
                <span className="reel-paper-imprint">INS LAND <span>ARCHIVE PRINT</span></span>
              </span>
              <span className="reel-paper-back">
                <span className="reel-card-code">{item} / INS LAND</span>
                <span className="reel-back-stamp">✧</span>
                <span className="reel-card-title">{colors.title}</span>
                <span className="reel-paper-imprint">CAMPAIGN ARCHIVE <span>2027</span></span>
              </span>
            </span>
          </button>;
        })}
      </div>
    </section>

    <footer className="reel-footer">
      <div className="reel-caption" aria-live={playing?'off':'polite'}><span>{scene}</span><strong>{palette.title}</strong></div>
      <div className="reel-slider">
        <input type="range" aria-label="Select campaign edition" min={0} max={scenes.length-1} value={active} aria-valuetext={palette.title}
          onChange={event=>{setPlaying(false);setFlipped(false);setActive(Number(event.target.value));}}/>
        <div aria-hidden="true">{scenes.map(id=><i key={id}/>)}</div>
      </div>
      <div className="reel-controls">
        <button type="button" onClick={()=>step(-1)} aria-label="Previous cover"><ArrowLeft size={19}/></button>
        <span className="reel-counter">{String(active+1).padStart(2,'0')} <i>/</i> 07</span>
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
