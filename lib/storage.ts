'use client';
import {createClient} from '@supabase/supabase-js';
import {useEffect,useRef,useState} from 'react';
import {validateProjects,type Project} from './planner';
import {weekdayPlanSchema,type WeekdayPlan} from './weekday';

const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const client=url&&key ? createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}) : null;
const SESSION='ins-y27-session';
export type ViewerProject=Omit<Project,'budget'|'spent'|'payments'|'settlement'|'build'|'experience'|'notes'|'accent'|'primaryDetail'|'secondaryDetail'> & {accent?:string|null;primaryDetail?:string|null;secondaryDetail?:string|null};
export type ViewerData={role:'viewer';name:string;projects:ViewerProject[];charts:{tier:number|null;build:number|null;quarters:number[]}};
export type BudgetReference={
  name:string;
  plan:{total:number;build:number;experience:number};
  adjusted:number;
  actual:{total:number|null;build:number|null;experience:number|null};
  status:'recorded'|'partial'|'unrecorded';
};
type OwnerData={role:'owner';name:string;projects:Project[];revision:number;baseline:number;weekdayPlan?:WeekdayPlan|null;budgetReference?:Record<string,BudgetReference>|null};
type Snapshot=OwnerData|ViewerData;
class AccessError extends Error { constructor(message:string, readonly code?:string){super(message);} }
async function rpc<T>(action:string,payload:Record<string,unknown>={}) {
  if(!client)throw new Error('工作台尚未配置云端连接。');
  const {data,error}=await client.rpc('y27_access',{action,payload});
  if(error)throw new Error('连接工作台失败，请检查网络后重试。');
  if(data.error)throw new AccessError(data.error,data.code);
  return data as T;
}
export function useLoginReel() {
  const [image,setImage]=useState('');
  useEffect(()=>{
    if(!client)return;
    const request=new AbortController();
    const backend=client;
    void (async()=>{
      try{
        const {data,error}=await backend.from('y27_login_backdrop').select('print_base64')
          .eq('id','campaign-collage').abortSignal(request.signal).maybeSingle();
        if(!error&&data?.print_base64&&!request.signal.aborted){
          setImage('data:image/webp;base64,'+data.print_base64.replace(/\s/g,''));
        }
      }catch{ /* The login form keeps its background color when artwork is unavailable. */ }
    })();
    return ()=>request.abort();
  },[]);
  return image;
}
export function useCampaignArtwork(role:Snapshot['role']|undefined) {
  const [images,setImages]=useState<Record<string,string>>({});
  useEffect(()=>{
    if(!role){setImages({});return;}
    const token=sessionStorage.getItem(SESSION);
    if(!token)return;
    let cancelled=false;
    async function fetchArtwork(projectId:string) {
      try{
        const data=await rpc<{image:string|null}>('artwork',{token,projectId});
        if(data.image&&!cancelled)setImages(previous=>({...previous,[projectId]:'data:image/webp;base64,'+data.image!.replace(/\s/g,'')}));
      }catch{ /* Project metadata remains browsable if an image request fails. */ }
    }
    const ids=['S01','S02','S03','S04','S05','S06','S07'];
    void (async()=>{
      for(let i=0;i<ids.length&&!cancelled;i+=2)await Promise.all(ids.slice(i,i+2).map(fetchArtwork));
    })();
    return ()=>{cancelled=true;};
  },[role]);
  return images;
}
export function useFullCampaignArtwork(projectId:string|undefined) {
  const [loaded,setLoaded]=useState<{id:string;image:string}|null>(null);
  useEffect(()=>{
    if(!projectId)return;
    const token=sessionStorage.getItem(SESSION);
    if(!token)return;
    let cancelled=false;
    void rpc<{image:string|null}>('artwork',{token,projectId,quality:'full'})
      .then(data=>{
        if(data.image&&!cancelled)setLoaded({id:projectId,image:'data:image/webp;base64,'+data.image.replace(/\s/g,'')});
      })
      .catch(()=>{ /* The optimized preview remains available. */ });
    return ()=>{cancelled=true;};
  },[projectId]);
  return loaded?.id===projectId?loaded?.image:undefined;
}
export function usePlanner() {
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
  const [loading,setLoading]=useState(true);
  const [status,setStatus]=useState('');
  const [error,setError]=useState('');
  const [dirty,setDirty]=useState(false);
  const token=useRef(''), revision=useRef(0), pending=useRef<Project[]|null>(null);
  const saving=useRef(false), conflict=useRef(false), generation=useRef(0);
  function apply(data:Snapshot) {
    if(data.role==='owner'){
      data={...data,projects:validateProjects(data.projects),weekdayPlan:weekdayPlanSchema.safeParse(data.weekdayPlan).data};
      revision.current=data.revision;
    }
    setSnapshot(data);
    setStatus(data.role==='owner'?'已同步':'浏览模式');
  }
  function clear() {
    generation.current++;token.current='';sessionStorage.removeItem(SESSION);
    pending.current=null;conflict.current=false;setDirty(false);setSnapshot(null);setStatus('');setLoading(false);
  }
  function failure(e:unknown) {
    if(e instanceof AccessError&&e.code==='auth'&&!pending.current)clear();
    setError(e instanceof Error?e.message:'操作失败，请重试。');
  }
  async function load(background=false) {
    const run=++generation.current;
    if(!background){setLoading(true);setError('');}
    try {
      if(!token.current)return;
      const data=await rpc<Snapshot>('read',{token:token.current});
      if(run!==generation.current || (background&&(pending.current||saving.current)))return;
      apply(data);pending.current=null;conflict.current=false;setDirty(false);setError('');
    }catch(e){if(run===generation.current)failure(e);}
    finally {if(run===generation.current)setLoading(false);}
  }
  useEffect(()=>{
    token.current=sessionStorage.getItem(SESSION)??'';
    void load();
    const refresh=()=>{if(token.current&&!pending.current&&!saving.current&&!document.hidden)void load(true);};
    const timer=setInterval(refresh,20000);
    window.addEventListener('focus',refresh);
    return ()=>{generation.current++;clearInterval(timer);window.removeEventListener('focus',refresh);};
  },[]);
  useEffect(()=>{
    if(!dirty)return;
    const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue='';};
    window.addEventListener('beforeunload',warn);
    return ()=>window.removeEventListener('beforeunload',warn);
  },[dirty]);
  async function flush() {
    if(!token.current||saving.current||conflict.current)return;
    saving.current=true;
    try{
      while(pending.current){
        const draft=pending.current;
        const data=await rpc<OwnerData>('save',{token:token.current,revision:revision.current,projects:draft});
        revision.current=data.revision;
        if(pending.current===draft)pending.current=null;
      }
      setDirty(false);setError('');setStatus('已同步');
    }catch(e){
      if(e instanceof AccessError&&e.code==='conflict')conflict.current=true;
      setStatus('尚未同步');failure(e);
    }finally{saving.current=false;}
  }
  function change(next:Project[]) {
    if(snapshot?.role!=='owner')return;
    generation.current++;
    setSnapshot({...snapshot,projects:next});
    pending.current=next;setDirty(true);setStatus('同步中…');void flush();
  }
  async function reset() {
    if(snapshot?.role!=='owner'||saving.current||pending.current)return false;
    saving.current=true;generation.current++;setStatus('同步中…');
    try{apply(await rpc<OwnerData>('reset',{token:token.current,revision:revision.current}));setError('');return true;}
    catch(e){setStatus('未能恢复');failure(e);return false;}
    finally{saving.current=false;}
  }
  async function login(handle:string,password:string,register=false) {
    setLoading(true);setError('');
    try {
      const data=await rpc<{token:string}>(register?'register':'login',{login:handle,password});
      token.current=data.token;
      sessionStorage.setItem(SESSION,data.token);
      await load();
    } catch(e){failure(e);}
    finally{setLoading(false);}
  }
  async function logout() {
    if(dirty||saving.current)return;
    try{if(token.current)await rpc('logout',{token:token.current});setError('');}
    catch(e){if(!(e instanceof AccessError&&e.code==='auth')){failure(e);return;}}
    clear();
  }
  return {snapshot,items:snapshot?.role==='owner'?snapshot.projects:null,loading,status,error,dirty,change,login,logout,load,flush,reset};
}
