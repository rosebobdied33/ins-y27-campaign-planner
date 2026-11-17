export type WorldMode = 'building' | 'transitioning' | 'store-crystals';
export type StoreAnchor = {
  id: string;
  name: string;
  floor?: string;
  objectId?: string;
  position: [number, number, number];
  campaignIds: string[];
};

export type WorldView = {azimuth:number;elevation:number;zoom:number};
export const initialWorldView:WorldView={azimuth:.24,elevation:.33,zoom:0};
const clamp=(n:number,min:number,max:number)=>Math.min(max,Math.max(min,n));
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;

export function advanceWorldWheel(zoom:number,delta:number,returnLocked:boolean) {
  const bounded=clamp(zoom,0,1);
  return {zoom:clamp(bounded+delta/1300,0,1),returnHome:delta<0&&bounded===0&&!returnLocked};
}

export function worldCameraPose(view:WorldView,mobile=false) {
  const t=clamp(view.zoom,0,1);
  const eased=t*t*(3-2*t);
  const target:[number,number,number]=[lerp(17,0,eased),lerp(8,5,eased),lerp(59,1,eased)];
  const elevation=clamp(view.elevation-.16*eased,lerp(.22,.16,eased),.97);
  const angle=view.azimuth;
  const radius=lerp(mobile?384:235,63,eased);
  const horizontal=radius*Math.cos(elevation);
  // Keep the orbital radius measured from the building rather than the moving look-at point.
  const orbitZ=lerp(39,-17,eased);
  return {target,position:[
    target[0]+Math.sin(angle)*horizontal,
    target[1]+Math.sin(elevation)*radius,
    orbitZ+Math.cos(angle)*horizontal,
  ] as [number,number,number]};
}
