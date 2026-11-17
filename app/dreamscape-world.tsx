'use client';

import {useCallback,useEffect,useRef,useState,type RefObject} from 'react';
import {ArrowUp,Minus,Plus,RotateCcw} from 'lucide-react';
import {advanceWorldWheel,type WorldMode} from '../lib/world-navigation';
import {dreamscapeEntryModel,dreamscapeModel} from './dreamscape-assets';
import {crystalVenues} from './dreamscape-venues';
import type {DreamscapeControls} from './dreamscape-renderer';

type Phase='HOME'|'HOME_TO_WORLD'|'WORLD_EXPLORE'|'WORLD_ZOOM'|'WORLD_TO_HOME';
const worldPhase=(phase:Phase)=>phase==='WORLD_EXPLORE'||phase==='WORLD_ZOOM';

export function useDreamscapeNavigation(
  home:RefObject<HTMLElement|null>,cards:RefObject<HTMLElement|null>,blocked:boolean,enabled:boolean,
){
  const section=useRef<HTMLElement>(null);
  const controls=useRef<DreamscapeControls|null>(null);
  const current=useRef<Phase>('HOME');
  const timer=useRef(0);
  const [phase,setPhase]=useState<Phase>('HOME');
  const [requested,setRequested]=useState(false);
  const change=useCallback((next:Phase)=>{current.current=next;setPhase(next);},[]);
  const move=useCallback((toWorld:boolean)=>{
    const target=toWorld?section.current:home.current;
    if(!target)return;
    clearTimeout(timer.current);
    if(toWorld)setRequested(true);
    change(toWorld?'HOME_TO_WORLD':'WORLD_TO_HOME');
    const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({behavior:reduce?'instant':'smooth',block:'start'});
    timer.current=window.setTimeout(()=>{
      if(!toWorld)controls.current?.reset();
      change(toWorld?'WORLD_EXPLORE':'HOME');
      target.querySelector<HTMLElement>(toWorld?'h2':'.reel-world-link')?.focus({preventScroll:true});
    },reduce?0:640);
  },[change,home]);

  useEffect(()=>()=>clearTimeout(timer.current),[]);
  useEffect(()=>{
    if(!enabled||blocked||requested)return;
    const timer=window.setTimeout(()=>{
      if(!document.hidden)setRequested(true);
    },420);
    return ()=>clearTimeout(timer);
  },[blocked,enabled,requested]);
  useEffect(()=>{
    if(!enabled||!section.current)return;
    const observer=new IntersectionObserver(([entry])=>{
      if(blocked)return;
      if(entry.intersectionRatio>=.08)setRequested(true);
      if(entry.intersectionRatio>=.82&&current.current==='HOME'){
        change('WORLD_EXPLORE');
      }else if(entry.intersectionRatio<=.18&&worldPhase(current.current)){
        clearTimeout(timer.current);
        controls.current?.reset();
        change('HOME');
      }
    },{threshold:[.08,.18,.82]});
    observer.observe(section.current);
    return ()=>observer.disconnect();
  },[blocked,change,enabled]);

  useEffect(()=>{
    if(blocked||!enabled)return;
    let previous=-Infinity,direction=0,distance=0,returnLocked=false,entryLocked=false;
    const wheel=(event:WheelEvent)=>{
      if(event.defaultPrevented||event.ctrlKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||!event.deltaY)return;
      const target=event.target;
      if(target instanceof Element&&target.closest('dialog,input,select,textarea,[contenteditable=true]'))return;
      const phase=current.current;
      if(phase==='HOME'&&(event.deltaY<0||(target instanceof Node&&cards.current?.contains(target))))return;
      const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
      const nextDirection=Math.sign(delta);
      if(event.timeStamp-previous>165||nextDirection!==direction){
        distance=0;
        returnLocked=false;
        entryLocked=false;
      }
      previous=event.timeStamp;
      direction=nextDirection;
      distance+=Math.abs(delta);
      event.preventDefault();
      if(phase==='HOME'){
        if(delta>0){
          setRequested(true);
          if(distance>=64&&!entryLocked){entryLocked=true;move(true);}
        }
        return;
      }
      if(phase==='HOME_TO_WORLD'||phase==='WORLD_TO_HOME'){
        entryLocked=true;
        return;
      }
      if(entryLocked||controls.current?.transitioning())return;
      if(delta<0&&controls.current?.zoom()===0){
        if(distance>=62&&!returnLocked){entryLocked=true;move(false);}
        return;
      }
      if(!controls.current){if(delta<0&&distance>=62)move(false);return;}
      const zoom=controls.current.zoom();
      const advance=advanceWorldWheel(zoom,Math.max(-250,Math.min(250,delta)),returnLocked);
      controls.current.zoomBy(advance.zoom-zoom);
      if(advance.zoom===0&&zoom>0)returnLocked=true;
      change(advance.zoom>0?'WORLD_ZOOM':'WORLD_EXPLORE');
    };
    window.addEventListener('wheel',wheel,{passive:false});
    return ()=>window.removeEventListener('wheel',wheel);
  },[blocked,cards,change,enabled,move]);

  return {section,controls,requested,active:worldPhase(phase),atHome:phase==='HOME',move,
    preload:()=>setRequested(true)};
}

type Navigation=ReturnType<typeof useDreamscapeNavigation>;
export function DreamscapeWorld({navigation}:{navigation:Navigation}){
  const {section,controls,requested,active,move}=navigation;
  const host=useRef<HTMLDivElement>(null);
  const [status,setStatus]=useState<'loading'|'ready'|'fallback'>('loading');
  const [mode,setMode]=useState<WorldMode>('building');
  const [storeId,setStoreId]=useState<string|null>(null);
  const store=crystalVenues.find(venue=>venue.id===storeId);
  const details=useRef<HTMLDialogElement>(null);
  const closeStore=useCallback(()=>{
    const url=new URL(window.location.href);
    if(url.searchParams.has('store')){
      url.searchParams.delete('store');
      history.replaceState(history.state,'',url);
    }
    setStoreId(null);
  },[]);
  useEffect(()=>{
    const read=()=>setStoreId(new URLSearchParams(window.location.search).get('store'));
    read();
    window.addEventListener('popstate',read);
    return ()=>window.removeEventListener('popstate',read);
  },[]);
  useEffect(()=>{
    const dialog=details.current;
    if(!store||!dialog)return;
    if(!active){
      move(true);
      return;
    }
    if(status!=='loading'&&!dialog.open)dialog.showModal();
  },[active,move,status,store]);
  useEffect(()=>{
    if(store&&active&&status==='ready')controls.current?.enterCrystals();
  },[active,controls,status,store]);
  const [stats,setStats]=useState<{triangles:number;drawCalls:number}>();
  useEffect(()=>{
    if(!requested||!host.current)return;
    const node=host.current;
    const abort=new AbortController();
    const fallback=()=>{if(!abort.signal.aborted)setStatus('fallback');};
    const load=async (asset:string)=>{
      const response=await fetch(asset,{signal:abort.signal});
      if(!response.ok)throw new Error('Dreamscape geometry unavailable');
      return {buffer:await response.arrayBuffer(),asset};
    };
    const geometry=load(dreamscapeEntryModel).catch(error=>{
      if(abort.signal.aborted)throw error;
      return load(dreamscapeModel);
    });
    void Promise.all([import('./dreamscape-renderer'),geometry]).then(async ([{mountDreamscape},{buffer,asset}])=>{
      if(abort.signal.aborted)return;
      const runtime=await mountDreamscape(node,buffer,asset,abort.signal,{
        ready:metrics=>{if(!abort.signal.aborted){setStats(metrics);setStatus('ready');}},
        fallback,
        modeChanged:next=>{if(!abort.signal.aborted)setMode(next);},
        storeSelected:store=>{
          if(abort.signal.aborted)return;
          if(!store)return;
          const url=new URL(window.location.href);
          if(url.searchParams.get('store')!==store.id){
            url.searchParams.set('store',store.id);
            history.pushState(history.state,'',url);
          }
          setStoreId(store.id);
          node.dispatchEvent(new CustomEvent('ins-world:store-select',{detail:store,bubbles:true}));
        },
        buildingPick:objectId=>node.dispatchEvent(new CustomEvent('ins-world:building-pick',{
          detail:{mode:'building',objectId},bubbles:true,
        })),
      });
      if(abort.signal.aborted)runtime?.dispose();
      else controls.current=runtime??null;
    }).catch(fallback);
    return ()=>{abort.abort();controls.current?.dispose();controls.current=null;};
  },[controls,requested]);
  useEffect(()=>{controls.current?.setActive(active);},[status,active,controls]);
  useEffect(()=>{controls.current?.setObscured(Boolean(store));},[status,store,controls]);

  return <section ref={section} className="dreamscape" id="dreamscape" aria-labelledby="dreamscape-title"
    data-status={requested?status:'idle'} data-mode={mode}
    data-triangles={stats?.triangles} data-draw-calls={stats?.drawCalls} inert={!active}>
    <div className="dreamscape-poster" aria-hidden="true"/>
    <div ref={host} className="dreamscape-canvas"/>
    <header className="dreamscape-heading">
      <p>INS LAND / THE WORLD</p>
      <h2 id="dreamscape-title" tabIndex={-1}>{mode==='store-crystals'?'Brand crystals':'Dreamscape'}</h2>
      <img className="dreamscape-subtitle" src="./dreamscape/slogan-white.png" width={945} height={227} alt="为你造一座游乐园 · Into Nothing Serious."/>
    </header>
    {store&&<dialog ref={details} className="dreamscape-store-detail" aria-labelledby="dreamscape-store-name"
      onCancel={event=>{event.preventDefault();closeStore();}}>
      <div className="dreamscape-store-mark">
        <img src={'./dreamscape/engravings/'+store.id+'.png'} alt=""/>
      </div>
      <h3 id="dreamscape-store-name">{store.name}</h3>
      <button type="button" onClick={closeStore}>返回水晶阵列</button>
    </dialog>}
    <div className="dreamscape-bar">
      <button type="button" onClick={()=>move(false)}><ArrowUp size={15}/> Campaigns</button>
      {status==='ready'&&mode==='transitioning'&&<p role="status">重组中…</p>}
      {status==='ready'&&mode==='store-crystals'&&<p>拖拽旋转 · 点击选择水晶</p>}
      {status==='ready'&&mode==='building'&&<p><span className="dreamscape-desktop">左键拖转 · 滚轮推进／拉远 · 双击楼体晶化</span>
        <span className="dreamscape-touch">拖动旋转 · 双指缩放 · 双击楼体晶化</span></p>}
      {status==='fallback'&&<p role="status">3D unavailable. Showing the scene preview.</p>}
      {status==='loading'&&requested&&<p role="status">Loading the 3D scene…</p>}
      {status==='ready'&&mode==='store-crystals'&&<button type="button" onClick={()=>controls.current?.restoreBuilding()}><RotateCcw size={15}/> 还原大楼</button>}
      {status==='ready'&&mode==='building'&&<div className="dreamscape-zoom">
        <button type="button" aria-label="拉远" onClick={()=>controls.current?.zoomBy(-.19)}><Minus size={15}/></button>
        <button type="button" aria-label="推进" onClick={()=>controls.current?.zoomBy(.19)}><Plus size={15}/></button>
        <button type="button" aria-label="Reset view" title="返回默认视角" onClick={()=>controls.current?.reset()}><RotateCcw size={15}/></button>
      </div>}
    </div>
  </section>;
}
