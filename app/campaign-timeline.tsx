'use client';
import {useRef,type CSSProperties} from 'react';
import {crystalThemes} from './crystal-themes';
export function CampaignTimeline({active,onChange,disabled=false}:{active:number;onChange:(index:number)=>void;disabled?:boolean}){
 const drag=useRef<{start:number;width:number;moved:boolean}|null>(null);
 const locate=(x:number)=>{
  const element=track.current;if(!element)return active;
  const box=element.getBoundingClientRect();
  return Math.max(0,Math.min(6,Math.round((x-box.left-box.width/14)/(box.width/7))));
 };
 const track=useRef<HTMLElement>(null);
 return <nav ref={track} className="crystal-timeline" style={{'--charge':active/6,'--timeline-color':crystalThemes[active].crystalEmission} as CSSProperties} aria-label="Campaign 主题时间轴" onPointerDown={event=>{
  if(disabled||event.button!==0)return;
  drag.current={start:event.clientX,width:event.currentTarget.clientWidth,moved:false};
  event.currentTarget.setPointerCapture(event.pointerId);
 }} onPointerMove={event=>{
  if(!drag.current)return;
  if(Math.abs(event.clientX-drag.current.start)>5)drag.current.moved=true;
  if(drag.current.moved)onChange(locate(event.clientX));
 }} onPointerUp={event=>{
  if(!drag.current)return;
  onChange(locate(event.clientX));drag.current=null;
 }} onPointerCancel={()=>{drag.current=null;}}
 onWheel={event=>event.stopPropagation()}
 onKeyDown={event=>{
  if(disabled)return;
  const delta=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0;
  const next=event.key==='Home'?0:event.key==='End'?6:Math.max(0,Math.min(6,active+delta));
  if(delta||event.key==='Home'||event.key==='End'){
   event.preventDefault();onChange(next);track.current?.querySelectorAll('button')[next]?.focus();
  }
 }}>
 <span className="timeline-terminal timeline-terminal-left" aria-hidden="true"/><span className="timeline-terminal timeline-terminal-right" aria-hidden="true"/>
 {crystalThemes.map((theme,index)=><button key={theme.themeId} data-index={index} type="button" disabled={disabled} aria-pressed={active===index}
 onClick={()=>onChange(index)}><i aria-hidden="true"><b/><em/></i><span>{theme.themeId}</span><strong>{theme.themeName}</strong></button>)}
 </nav>;
}
