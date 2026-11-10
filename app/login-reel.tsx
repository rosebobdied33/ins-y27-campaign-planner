'use client';
import {useCallback,useEffect,useRef,useState,type CSSProperties,type FormEvent} from 'react';
import {ArrowLeft,ArrowRight,ArrowUpRight,Pause,Play,X} from 'lucide-react';
import {useLoginReel} from '../lib/storage';
import {campaignTitles} from './campaign-gallery';

const scenes=[
  {id:'S01',name:'小羊牧场'},{id:'S02',name:'春日市场'},{id:'S03',name:'游戏世界4'},
  {id:'S04',name:'夏夜泳池'},{id:'S05',name:'枫林假日'},{id:'S06',name:'迷雾剧场'},
  {id:'S07',name:'冬博物馆'},
];
const sceneIndex=(index:number)=>(index+scenes.length)%scenes.length;

export function LoginReel({busy,error,onLogin}:{
  busy:boolean;error:string;onLogin:(name:string,password:string,register:boolean)=>void;
}) {
  const image=useLoginReel();
  const [active,setActive]=useState(0);
  const [playing,setPlaying]=useState(false);
  const [open,setOpen]=useState(false);
  const [register,setRegister]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const swipeStart=useRef<number|null>(null);
  const swiped=useRef(false);
  const scene=scenes[active];
  const palette=campaignTitles[scene.id];

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
    setPlaying(false);
    setActive(index=>sceneIndex(index+offset));
  },[]);
  useEffect(()=>{
    if(open)return;
    const navigate=(event:KeyboardEvent)=>{
      if(event.altKey||event.ctrlKey||event.metaKey)return;
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
    '--scene-glow':palette.glow,'--scene-wash':palette.wash,
    ...(image?{'--reel-image':'url('+image+')'}:{}),
  } as CSSProperties}>
    <header className="reel-header">
      <span className="reel-wordmark">INS LAND<small>2027</small></span>

    </header>

    <div className="reel-intro">
      <button type="button" className="reel-enter reel-entry-window" onClick={enter}>
        <span className="reel-entry-kicker">INS LAND / 2027</span>
        <strong>进入工作台</strong><ArrowUpRight size={22} aria-hidden="true"/>
      </button>
    </div>

    <section className="reel-stage" aria-label="七个年度活动封面"
      onPointerDown={event=>{
        swiped.current=false;
        if(event.pointerType==='touch')swipeStart.current=event.clientX;
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
          const colors=campaignTitles[item.id];
          return <button key={item.id} type="button" className="reel-card" data-position={relative}
            tabIndex={relative===0?0:-1}
            aria-hidden={Math.abs(relative)>2?true:undefined}
            aria-label={relative===0?item.name+'，进入工作台':'翻到'+item.name}
            style={{
              '--slot':relative,'--distance':Math.abs(relative),
              '--tile-x':(index%3)*50+'%','--tile-y':Math.floor(index/3)*50+'%',
              '--card-glow':colors.glow,'--card-wash':colors.wash,
            } as CSSProperties}
            onClick={()=>{
              if(swiped.current){swiped.current=false;return;}
              if(relative===0)enter();else step(relative);
            }}>
            <span className="reel-card-art" aria-hidden="true"/>
            <span className="reel-card-code">{item.id}</span>
            <span className="reel-card-title" lang="en">{colors.title}</span>
          </button>;
        })}
      </div>
    </section>

    <footer className="reel-footer">
      <div className="reel-caption" aria-live={playing?'off':'polite'}><span>{scene.id}</span><strong>{scene.name}</strong></div>
      <div className="reel-controls">
        <button type="button" onClick={()=>step(-1)} aria-label="上一张封面"><ArrowLeft size={19}/></button>
        <span className="reel-counter">{String(active+1).padStart(2,'0')} <i>/</i> 07</span>
        <button type="button" onClick={()=>step(1)} aria-label="下一张封面"><ArrowRight size={19}/></button>
        <button type="button" className="reel-play" onClick={()=>setPlaying(!playing)} aria-label={playing?'暂停轮播':'播放轮播'}>
          {playing?<Pause size={15}/>:<Play size={15}/>}
        </button>
      </div>
    </footer>

    <dialog ref={dialog} className="auth-card reel-dialog" aria-labelledby="reel-auth-title" onClose={()=>setOpen(false)}>
      <button type="button" className="icon reel-close" aria-label="关闭登录" onClick={()=>dialog.current?.close()}><X size={19}/></button>
      <span className="eyebrow">INS LAND / 2027</span>
      <h2 id="reel-auth-title">进入工作台</h2>
      {error&&<p className="danger" role="alert">{error}</p>}
      <div className="segmented auth-tabs">
        <button type="button" aria-pressed={!register} onClick={()=>setRegister(false)} disabled={busy}>登录</button>
        <button type="button" aria-pressed={register} onClick={()=>setRegister(true)} disabled={busy}>注册浏览账号</button>
      </div>
      <form key={String(register)} method="post" onSubmit={submit}>
        <label>{register?'你的名字':'账号或注册姓名'}<input name="handle" required minLength={2} maxLength={32} autoComplete="username" placeholder={register?'输入 2–32 个字符':'输入账号或姓名'}/></label>
        <label>{register?'注册密码':'密码'}<input name="password" type="password" required maxLength={72} autoComplete={register?'new-password':'current-password'} placeholder="输入密码"/></label>
        {register&&<p className="helper">使用分享人提供的默认密码。注册后可查看规划和概览图。</p>}
        <button className="primary" disabled={busy}>{busy?'正在连接…':register?'注册并进入':'登录'}</button>
      </form>
    </dialog>
  </main>;
}
