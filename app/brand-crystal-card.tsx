'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {brandCardArt} from './brand-card-art';
import {ArrowLeft} from 'lucide-react';
import type {crystalVenues} from './dreamscape-venues';
import type {crystalThemes} from './crystal-themes';
export function BrandCrystalCard({brand,theme,onClose}:{brand:(typeof crystalVenues)[number];theme:(typeof crystalThemes)[number];onClose:()=>void}){
 const art=brandCardArt(brand.id);
 const [missingLogo,setMissingLogo]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);
 const [closing,setClosing]=useState(false);
 const closeTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 useEffect(()=>()=>clearTimeout(closeTimer.current),[]);
 const close=()=>{
  if(closing)return;
  setClosing(true);
  const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  closeTimer.current=setTimeout(onClose,reduce?0:180);
 };
 useEffect(()=>{
  const node=dialog.current!;let current=true;
  const logo=node.querySelector('img');
  const frame=new Image();frame.src='./dreamscape/card-engraved-frame.webp';
  void Promise.allSettled([logo?.decode(),frame.decode()]).then(()=>{if(current)node.showModal();});
  return ()=>{current=false;if(node.open)node.close();};
 },[brand.id]);
 return <dialog ref={dialog} className="brand-crystal-card" data-closing={closing} data-texture={art.texture} style={{'--brand-color':brand.color,'--card-ink':art.ink,'--card-paper':art.paper,'--card-metal':art.metal,'--card-turn':art.turn+'deg'} as CSSProperties}
 aria-label={theme.themeId+' 门店品牌卡片'} onCancel={event=>{event.preventDefault();close();}}>
  <div className="brand-card-depth" aria-hidden="true"/>
  <div className="brand-card-artwork" aria-hidden="true"/>
  <div className="brand-card-print" aria-hidden="true"/>
  <div className="brand-card-rim" aria-hidden="true"/>
  <div className="brand-card-crest" aria-hidden="true"><i/></div>
  <span className="brand-card-star brand-card-star-a" aria-hidden="true"/>
  <span className="brand-card-star brand-card-star-b" aria-hidden="true"/>
  <button className="brand-crystal-back" type="button" onClick={close} disabled={closing}><ArrowLeft size={18}/> 返回水晶阵列</button>
  <div className="brand-crystal-logo">{missingLogo?<span className="brand-card-fallback">Logo 待补</span>:<img src={'./dreamscape/engravings/'+brand.id+'.png'} alt="门店官方 Logo" onError={()=>setMissingLogo(true)}/>}</div>
  <footer><i aria-hidden="true"/><span>{theme.themeId} · {theme.themeName}</span><i aria-hidden="true"/></footer>
 </dialog>;
}
