'use client';

import {useCallback,useEffect,useRef,useState,type RefObject} from 'react';
import {ArrowUp,RotateCcw} from 'lucide-react';
import {advanceWorldWheel,type WorldMode} from '../lib/world-navigation';
import type {DreamscapeControls} from './dreamscape-renderer';

type Phase='HOME'|'HOME_TO_WORLD'|'WORLD_INTRO'|'WORLD_EXPLORE'|'WORLD_ZOOM'|'WORLD_TO_HOME';
const worldPhase=(phase:Phase)=>phase==='WORLD_INTRO'||phase==='WORLD_EXPLORE'||phase==='WORLD_ZOOM';

export function useDreamscapeNavigation(
  home:RefObject<HTMLElement|null>,blocked:boolean,enabled:boolean,
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
      change(toWorld?'WORLD_INTRO':'HOME');
      target.querySelector<HTMLElement>(toWorld?'h2':'.reel-world-link')?.focus({preventScroll:true});
      if(toWorld)timer.current=window.setTimeout(()=>change('WORLD_EXPLORE'),reduce?0:1200);
    },reduce?0:640);
  },[change,home]);

  useEffect(()=>()=>clearTimeout(timer.current),[]);
  useEffect(()=>{
    if(!enabled||!section.current)return;
    const observer=new IntersectionObserver(([entry])=>{
      if(blocked)return;
      if(entry.intersectionRatio>=.82&&current.current==='HOME'){
        setRequested(true);
        change('WORLD_EXPLORE');
      }else if(entry.intersectionRatio<=.18&&worldPhase(current.current)){
        clearTimeout(timer.current);
        controls.current?.reset();
        change('HOME');
      }
    },{threshold:[.18,.82]});
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
      if(phase==='HOME'&&event.deltaY<0)return;
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
        if(delta>0&&distance>=64&&!entryLocked){entryLocked=true;move(true);}
        return;
      }
      if(phase==='HOME_TO_WORLD'||phase==='WORLD_TO_HOME'||phase==='WORLD_INTRO'){
        entryLocked=true;
        return;
      }
      if(entryLocked)return;
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
  },[blocked,change,enabled,move]);

  return {section,controls,requested,active:worldPhase(phase),atHome:phase==='HOME',move,
    preload:()=>setRequested(true)};
}

type Navigation=ReturnType<typeof useDreamscapeNavigation>;
const mode:WorldMode='building';
export function DreamscapeWorld({navigation}:{navigation:Navigation}){
  const {section,controls,requested,active,move}=navigation;
  const host=useRef<HTMLDivElement>(null);
  const [status,setStatus]=useState<'loading'|'ready'|'fallback'>('loading');
  const [stats,setStats]=useState<{triangles:number;drawCalls:number}>();
  useEffect(()=>{
    if(!requested||!host.current)return;
    const node=host.current;
    const abort=new AbortController();
    const fallback=()=>{if(!abort.signal.aborted)setStatus('fallback');};
    void import('./dreamscape-renderer').then(async ({mountDreamscape})=>{
      if(abort.signal.aborted)return;
      const runtime=await mountDreamscape(node,abort.signal,{
        ready:metrics=>{if(!abort.signal.aborted){setStats(metrics);setStatus('ready');}},
        fallback,
        buildingPick:objectId=>node.dispatchEvent(new CustomEvent('ins-world:building-pick',{
          detail:{mode,objectId},bubbles:true,
        })),
      });
      if(abort.signal.aborted)runtime?.dispose();
      else controls.current=runtime??null;
    }).catch(fallback);
    return ()=>{abort.abort();controls.current?.dispose();controls.current=null;};
  },[controls,requested]);
  useEffect(()=>{controls.current?.setActive(active);},[status,active,controls]);

  return <section ref={section} className="dreamscape" id="dreamscape" aria-labelledby="dreamscape-title"
    data-status={requested?status:'idle'} data-mode={mode}
    data-triangles={stats?.triangles} data-draw-calls={stats?.drawCalls} inert={!active}>
    <div className="dreamscape-poster" aria-hidden="true"/>
    <div ref={host} className="dreamscape-canvas"/>
    <header className="dreamscape-heading">
      <p>INS LAND / THE WORLD</p>
      <h2 id="dreamscape-title" tabIndex={-1}>Dreamscape</h2>
      <p className="dreamscape-subtitle" lang="zh-CN">一座持续发生奇想的乐园。</p>
    </header>
    <div className="dreamscape-bar">
      <button type="button" onClick={()=>move(false)}><ArrowUp size={15}/> Campaigns</button>
      {status==='ready'&&<p><span className="dreamscape-desktop">Drag to orbit · Scroll to zoom · Double-click to reset</span>
        <span className="dreamscape-touch">Drag to orbit · Pinch to zoom · Double-tap to reset</span></p>}
      {status==='fallback'&&<p role="status">3D unavailable. Showing the scene preview.</p>}
      {status==='loading'&&requested&&<p role="status">Loading the 3D scene…</p>}
      {status==='ready'&&<button type="button" onClick={()=>controls.current?.reset()}><RotateCcw size={15}/> Reset view</button>}
    </div>
  </section>;
}
