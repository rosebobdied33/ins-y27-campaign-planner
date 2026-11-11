import {useEffect,useRef} from 'react';

export function useHorizontalWheel(onStep:(direction:number)=>void,enabled=true) {
  const step=useRef(onStep);
  useEffect(()=>{step.current=onStep;},[onStep]);

  useEffect(()=>{
    if(!enabled)return;
    let distance=0, lastEvent=0, direction=0, moved=false;
    const handleWheel=(event:WheelEvent)=>{
      if(event.defaultPrevented||event.ctrlKey||Math.abs(event.deltaX)<=Math.abs(event.deltaY))return;
      if(event.target instanceof Element){
        if(event.target.closest('dialog,input,select,textarea,[contenteditable=true]'))return;
        for(let element:Element|null=event.target;element;element=element.parentElement){
          if(element.scrollWidth>element.clientWidth+2&&/auto|scroll/.test(getComputedStyle(element).overflowX))return;
        }
      }
      event.preventDefault();
      const nextDirection=Math.sign(event.deltaX);
      if(event.timeStamp-lastEvent>105||direction!==nextDirection){
        distance=0;
        moved=false;
      }
      lastEvent=event.timeStamp;
      direction=nextDirection;
      if(moved)return;
      distance+=Math.abs(event.deltaX)*(event.deltaMode===1?16:event.deltaMode===2?window.innerWidth:1);
      if(distance<20)return;
      moved=true;
      step.current(direction);
    };
    window.addEventListener('wheel',handleWheel,{passive:false});
    return ()=>window.removeEventListener('wheel',handleWheel);
  },[enabled]);
}
