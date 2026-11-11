'use client';
import {useCallback,useEffect,useRef,useState,type CSSProperties,type FormEvent} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,Pause,Play,X} from 'lucide-react';
import {durationDays} from '../lib/planner';
import {useLoginReel} from '../lib/storage';
import {campaignTitles} from './campaign-gallery';
import {useHorizontalWheel} from './use-horizontal-wheel';

const scenes=['S01','S02','S03','S04','S05','S06','S07'] as const;
// Public opening cards use the dates and named nodes from the supplied planning table.
const publicEditions:Record<typeof scenes[number],{name:string;start:string;end:string;nodes:string[]}>={
  S01:{name:'小羊牧场',start:'2027-01-22',end:'2027-03-15',nodes:['02.06 春节','02.14 情人节','02.20 元宵','03.08 女神月']},
  S02:{name:'春日市场',start:'2027-03-26',end:'2027-05-24',nodes:['05.01 五一','05.20 520']},
  S03:{name:'游戏世界4',start:'2027-06-04',end:'2027-07-26',nodes:['06.09 端午']},
  S04:{name:'夏夜泳池',start:'2027-07-30',end:'2027-08-30',nodes:['08.08 七夕']},
  S05:{name:'枫林假日',start:'2027-09-03',end:'2027-10-18',nodes:['09.15 中秋','10.01 国庆']},
  S06:{name:'迷雾剧场',start:'2027-10-29',end:'2027-11-15',nodes:['11.11 双11']},
  S07:{name:'冬博物馆',start:'2027-11-26',end:'2028-01-17',nodes:['12.25 圣诞','12.31 跨年','01.01 元旦']},
};
const cardDate=(date:string)=>date.startsWith('2027-')?date.slice(5).replace('-','.'):date.replaceAll('-','.');
const sceneIndex=(index:number)=>(index+scenes.length)%scenes.length;
const sparks=[[8,24,26],[16,43,15],[24,15,21],[34,31,13],[63,14,22],[76,35,15],[86,24,31],[93,43,21],[11,72,18],[89,80,24]];

export function LoginReel({busy,error,onLogin,onResume}:{
  busy:boolean;error:string;onResume?:()=>void;onLogin:(name:string,password:string,register:boolean)=>void;
}) {
  const image=useLoginReel();
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
  const scene=scenes[active];
  const palette=campaignTitles[scene];
  const edition=publicEditions[scene];

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
  useHorizontalWheel(step,!open&&!flipped,stage);
  useEffect(()=>{
    if(open||flipped)return;
    const navigate=(event:KeyboardEvent)=>{
      if(event.altKey||event.ctrlKey||event.metaKey||event.target instanceof HTMLInputElement)return;
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
        event.preventDefault();
        step(event.key==='ArrowLeft'?-1:1);
      }
    };
    window.addEventListener('keydown',navigate);
    return ()=>window.removeEventListener('keydown',navigate);
  },[open,flipped,step]);
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

  return <main className="login-reel" style={{
    '--scene-glow':palette.glow,'--scene-wash':palette.wash,'--scene-deep':palette.cover[0],
    '--scene-x':(active%3)*50+'%','--scene-y':Math.floor(active/3)*50+'%',
    ...(image?{'--reel-image':'url('+image+')'}:{}),
  } as CSSProperties} lang="en">
    <div className="reel-atmosphere" aria-hidden="true"/>
    <div className="reel-volume" aria-hidden="true"/>
    <div className="reel-sparks" aria-hidden="true">{sparks.map(([x,y,size],i)=><i key={i} style={{left:x+'%',top:y+'%',width:size,height:size,animationDelay:i*-.83+'s'}}/>)}</div>
    <header className="reel-header">
      <span className="reel-wordmark">INS LAND<small>2027</small></span><span className="reel-edition">THE CAMPAIGN EDITION</span>

    </header>

    <h1 className="reel-greeting"><span>Hi 2027</span></h1>

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
      <div className="reel-deck">
        {scenes.map((item,index)=>{
          const relative=sceneIndex(index-active+3)-3;
          const colors=campaignTitles[item];
          return <button key={item} type="button" className="reel-card" data-position={relative}
            tabIndex={relative===0?0:-1}
            aria-label={colors.title+(relative===0?', open edition details':', select edition')}
            aria-haspopup={relative===0?'dialog':undefined}
            style={{
              '--slot':relative,'--distance':Math.abs(relative),
              '--tile-x':(index%3)*50+'%','--tile-y':Math.floor(index/3)*50+'%',
              '--card-glow':colors.glow,'--card-wash':colors.wash,'--card-deep':colors.cover[0],
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
                <span className="reel-card-code"><span>{item} / EDITION</span><span>2027</span></span>
                <span className="reel-card-art"/>
                <span className="reel-card-title">{colors.title}</span>
                <span className="reel-paper-imprint">INS LAND <span>ARCHIVE PRINT</span></span>
              </span>
            </span>
          </button>;
        })}
      </div>
    </section>

    <dialog ref={details} className="reel-edition-dialog" lang="zh-CN" aria-labelledby="reel-detail-title"
      onClose={()=>setFlipped(false)}
      onClick={event=>{if(event.target===event.currentTarget)details.current?.close();}}
      style={{'--card-glow':palette.glow,'--card-wash':palette.wash,'--card-deep':palette.cover[0]} as CSSProperties}>
      <div className="reel-paper-back reel-edition-detail">
        <span className="reel-card-code">INS LAND / {scene}</span>
        <button type="button" className="reel-detail-close" aria-label="关闭卡片详情" onClick={()=>details.current?.close()}><X size={19}/></button>
        <h2 id="reel-detail-title" className="reel-back-title"><span className="reel-card-title" lang="en">{palette.title}</span><strong>{edition.name}</strong></h2>
        <dl className="reel-back-dates">
          <div><dt>上线</dt><dd>{cardDate(edition.start)}</dd></div>
          <div><dt>下线</dt><dd>{cardDate(edition.end)}</dd></div>
          <div><dt>周期</dt><dd>{durationDays(edition.start,edition.end)} 天</dd></div>
        </dl>
        <div className="reel-back-nodes"><span>同期节日及节点</span><span>{edition.nodes.map(node=><b key={node}>{node}</b>)}</span></div>
      </div>
    </dialog>

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
