export const publicAsset=(path:string)=>(process.env.NEXT_PUBLIC_PLANNER_BASE_PATH||'')+'/'+path.replace(/^\.\//,'');
export const dreamscapeModel='./dreamscape/world-c32b6bc78376.glb';
export const dreamscapeEntryModel='./dreamscape/world-entry.glb';

// Gzip reduces transfer bytes without changing a single vertex or texture.
export async function loadDreamscapeGeometry(signal:AbortSignal){
  if(typeof DecompressionStream!=='undefined'){
    try{
      const response=await fetch(dreamscapeModel+'.gz',{signal,priority:'auto'});
      if(!response.ok||!response.body)throw new Error('Compressed geometry unavailable');
      return await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    }catch(error){if(signal.aborted)throw error;}
  }
  const response=await fetch(dreamscapeModel,{signal,priority:'auto'});
  if(!response.ok)throw new Error('Dreamscape geometry unavailable');
  return response.arrayBuffer();
}
