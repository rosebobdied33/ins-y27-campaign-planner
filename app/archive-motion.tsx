'use client';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import {loginEditions} from './login-editions';

export const archiveMotion:Record<string,{landscape:boolean}>={
 S02:{landscape:false},S03:{landscape:false},S04:{landscape:false},
 S05:{landscape:true},S06:{landscape:true},
};

export function ArchiveMotion({index,origin,onClose}:{index:number;origin:HTMLButtonElement;onClose:()=>void}){
 const edition=loginEditions[2026][index];
 const landscape=archiveMotion[edition.code].landscape;
 const dialog=useRef<HTMLDialogElement>(null);
 const panel=useRef<HTMLDivElement>(null);
 const video=useRef<HTMLVideoElement>(null);
 const [playing,setPlaying]=useState(false);
 const [failed,setFailed]=useState(false);
 useLayoutEffect(()=>{
  const modal=dialog.current!;
  modal.showModal();
  const overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const from=origin.getBoundingClientRect(),to=panel.current!.getBoundingClientRect();
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animation=panel.current!.animate([
   {transform:`translate(${from.x+from.width/2-to.x-to.width/2}px,${from.y+from.height/2-to.y-to.height/2}px) scale(${from.width/to.height},${from.height/to.width}) ${landscape?'rotate(-90deg)':'rotateY(-180deg)'}`,opacity:.45},
   {transform:'translate(0,0) scale(1) rotate(0deg) rotateY(0deg)',opacity:1}
  ],{duration:reduce?0:560,easing:'cubic-bezier(.2,.7,.2,1)'});
  return ()=>{animation.cancel();modal.close();document.body.style.overflow=overflow;origin.focus({preventScroll:true});};
 },[origin,landscape]);
 useEffect(()=>{
  const player=video.current!;
  player.src='./campaign-archive/2026/motion/'+edition.code+'.mp4';
  player.load();
  void player.play().catch(()=>{});
  return ()=>{player.pause();player.removeAttribute('src');player.load();};
 },[edition.code]);
 return <dialog ref={dialog} className="archive-motion" aria-label={edition.name+' 动画'} onCancel={e=>{e.preventDefault();onClose();}}
  onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
  <div ref={panel} className="archive-motion-panel" data-landscape={landscape}
   style={{'--archive-poster':`url("${edition.poster}")`,'--archive-glow':edition.glow} as React.CSSProperties}>
   <video ref={video} controls autoPlay playsInline loop muted preload="auto"
    onPlaying={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>setFailed(true)} />
   {!playing&&!failed&&<button className="archive-motion-play" onClick={()=>void video.current?.play().catch(()=>{})}>播放动画</button>}
   {failed&&<p className="archive-motion-play" role="status">视频暂时无法播放，请稍后重试</p>}
   <button className="archive-motion-close" aria-label="关闭动画" onClick={onClose}><X size={20}/></button>
   <div className="archive-motion-tag"><span>{edition.code} / 2026</span><strong>{edition.name}</strong>
    <small>{edition.start} — {edition.end} · {edition.nodes.join(' / ')}</small></div>
  </div>
 </dialog>;
}
