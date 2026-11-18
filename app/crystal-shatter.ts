import {Color,DynamicDrawUsage,InstancedMesh,MeshPhysicalMaterial,Object3D,OctahedronGeometry,Vector3,Light,Scene,WebGLRenderTarget,type Mesh,type Camera,type WebGLRenderer} from 'three';

export function createCrystalShatter(scene:Object3D,mobile:boolean){
 const count=mobile?320:900;
 const geometry=new OctahedronGeometry(1,0);
 const material=new MeshPhysicalMaterial({color:'#c3a4ff',metalness:.34,roughness:.15,clearcoat:1,clearcoatRoughness:.08,iridescence:.65,transmission:mobile?.15:.25,thickness:.35,ior:1.46,emissive:'#b294ef',emissiveIntensity:.25,transparent:true,depthWrite:false});
 const particles=new InstancedMesh(geometry,material,count);
 particles.instanceMatrix.setUsage(DynamicDrawUsage);
 particles.frustumCulled=false;particles.visible=false;
 particles.name='Selected crystal / reusable facets';scene.add(particles);
 const origin=new Float32Array(count*3),velocity=new Float32Array(count*3),sizes=new Float32Array(count);
 const transform=new Object3D(),center=new Vector3();
 let selected:Mesh|null=null;
 let elapsed=0,returning=false,opened=false,done:(()=>void)|null=null;
 let state=173;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 return {
  async prepare(renderer:WebGLRenderer,camera:Camera){
   particles.visible=true;particles.count=1;material.opacity=0;
   transform.position.set(0,-1000,0);transform.updateMatrix();particles.setMatrixAt(0,transform.matrix);
   particles.instanceMatrix.needsUpdate=true;
   await renderer.compileAsync(scene as Scene,camera);
   if(!particles.parent)return;
   // Warm the transmission pipeline at 4x4, without redrawing the whole park.
   const warm=new Scene();
   const source=scene as Scene;
   warm.environment=source.environment;warm.environmentIntensity=source.environmentIntensity;warm.fog=source.fog;
   for(const child of source.children)if(child instanceof Light)warm.add(child.clone());
   warm.add(particles);
   const previousTarget=renderer.getRenderTarget();
   const target=new WebGLRenderTarget(4,4);
   try{renderer.setRenderTarget(target);renderer.render(warm,camera);}
   finally{renderer.setRenderTarget(previousTarget);target.dispose();scene.add(particles);warm.clear();}
   particles.visible=false;particles.count=count;material.opacity=1;
  },
  begin(body:Mesh,color:Color,callback:()=>void){
   if(selected)return false;
   selected=body;elapsed=0;returning=false;opened=false;done=callback;
   body.getWorldPosition(center);
   material.color.copy(color);material.emissive.copy(color);material.opacity=1;
   for(let i=0;i<count;i++){
    const radius=Math.sqrt(random()),angle=random()*Math.PI*2;
    const y=random()*12-4;
    const taper=Math.max(.12,1-Math.abs(y-3)/10);
    origin[i*3]=Math.cos(angle)*3.7*radius*taper;origin[i*3+1]=y;origin[i*3+2]=Math.sin(angle)*3*radius*taper;
    velocity[i*3]=(random()-.5)*19;velocity[i*3+1]=(random()-.2)*15;velocity[i*3+2]=(random()-.5)*24;
    sizes[i]=.11+random()*.29;
   }
   return true;
  },
  restore(){if(!selected)return false;returning=true;elapsed=0;opened=false;done=null;return true;},
  reset(){if(selected)selected.visible=true;selected=null;particles.visible=false;done=null;},
  update(dt:number,reduce:boolean){
   if(!selected||opened&&!returning)return;
   elapsed+=dt;
   const progress=reduce?1:Math.min(1,elapsed/(returning?.7:1.05));
   const spread=returning?1-progress:Math.max(0,(progress-.14)/.86);
   const selectedVisible=returning?progress>.87:progress<.26;
   selected.visible=selectedVisible;
   particles.visible=spread>0&&spread<1;
   const travel=spread*spread*(3-2*spread);
   material.opacity=1-Math.max(0,(spread-.55)/.45);
   for(let i=0;i<count;i++){
    const offset=i*3;
    transform.position.set(center.x+origin[offset]+velocity[offset]*travel,center.y+origin[offset+1]+velocity[offset+1]*travel,center.z+origin[offset+2]+velocity[offset+2]*travel);
    transform.rotation.set(i*.71+travel*2,i*.23+travel*3,i*.47+travel);
    const size=sizes[i]*(.4+.6*Math.sin(Math.PI*spread));
    transform.scale.set(size*.72,size*1.5,size);
    transform.updateMatrix();particles.setMatrixAt(i,transform.matrix);
   }
   particles.instanceMatrix.needsUpdate=true;
   if(progress===1){
    particles.visible=false;
    if(returning){selected.visible=true;selected=null;}
    else if(!opened){opened=true;done?.();done=null;}
   }
  },
  get busy(){return !!selected&&(!opened||returning);},
  get selected(){return selected;},
  dispose(){particles.removeFromParent();particles.dispose();geometry.dispose();material.dispose();},
 };
}
