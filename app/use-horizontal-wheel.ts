import {useEffect,useRef,type RefObject} from 'react';

export function useHorizontalWheel(target:RefObject<HTMLElement|null>,onStep:(direction:number)=>void,enabled=true) {
  const step=useRef(onStep);
  useEffect(()=>{step.current=onStep;},[onStep]);

  useEffect(()=>{
    const surface=target.current;
    if(!surface||!enabled)return;
    let distance=0, moved=false, lastEvent=0;
    const handleWheel=(event:WheelEvent)=>{
      if(event.ctrlKey||Math.abs(event.deltaX)<=Math.abs(event.deltaY))return;
      event.preventDefault();
      if(event.timeStamp-lastEvent>160){distance=0;moved=false;}
      lastEvent=event.timeStamp;
      if(moved)return;
      distance+=event.deltaX*(event.deltaMode===1?16:event.deltaMode===2?surface.clientWidth:1);
      if(Math.abs(distance)<34)return;
      moved=true;
      step.current(distance>0?1:-1);
    };
    surface.addEventListener('wheel',handleWheel,{passive:false});
    return ()=>surface.removeEventListener('wheel',handleWheel);
  },[target,enabled]);
}
