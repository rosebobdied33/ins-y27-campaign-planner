import {
  ACESFilmicToneMapping, AmbientLight, BackSide, Color, DirectionalLight, FogExp2, Group,
  HemisphereLight, InstancedMesh, LineSegments, Material, Matrix4, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, PCFShadowMap, PerspectiveCamera, PlaneGeometry, PMREMGenerator,
  PointLight, Points, Raycaster, Scene, ShaderMaterial, SphereGeometry, Sprite, SRGBColorSpace, RepeatWrapping, Texture, TextureLoader,
  Vector2, Vector3, WebGLRenderer,
} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {finishSurface} from './dreamscape-surfaces';
import {connectParkDestinations} from './dreamscape-paths';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createBuildingDissolve} from './dreamscape-dissolve';
import {dreamscapeEntryModel,dreamscapeModel} from './dreamscape-assets';
import {createStoreCrystals} from './dreamscape-crystals';
import {initialWorldView,worldCameraPose,type StoreAnchor,type WorldMode,type WorldView} from '../lib/world-navigation';

type SceneCallbacks={
  ready:(metrics:{triangles:number;drawCalls:number})=>void;
  fallback:()=>void;
  buildingPick?:(objectId:string)=>void;
  modeChanged?:(mode:WorldMode)=>void;
  storeSelected?:(store:StoreAnchor|null)=>void;
};

function release(root:Object3D) {
  const geometries=new Set<Mesh['geometry']>();
  const materials=new Set<Material>();
  const textures=new Set<Texture>();
  root.traverse(item=>{
    if(!(item instanceof Mesh||item instanceof LineSegments||item instanceof Points||item instanceof Sprite))return;
    if(!(item instanceof Sprite))geometries.add(item.geometry);
    if(item instanceof InstancedMesh)item.dispose();
    for(const material of Array.isArray(item.material)?item.material:[item.material]){
      materials.add(material);
      for(const value of Object.values(material))if(value instanceof Texture)textures.add(value);
    }
  });
  geometries.forEach(geometry=>geometry.dispose());
  materials.forEach(material=>material.dispose());
  textures.forEach(texture=>{
    if(typeof ImageBitmap!=='undefined'&&texture.image instanceof ImageBitmap)texture.image.close();
    texture.dispose();
  });
}

function duskDome(){
  return new Mesh(new SphereGeometry(1000,32,20),new ShaderMaterial({
    side:BackSide,depthWrite:false,fog:false,
    uniforms:{time:{value:0}},
    vertexShader:`
      varying vec3 worldRay;
      void main(){worldRay=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
    `,
    fragmentShader:`
      varying vec3 worldRay;
      uniform float time;
      float hash(vec2 p){return fract(sin(dot(p,vec2(27.17,181.73)))*43758.545);}
      const float TAU=6.28318530718;
      float wrappedNoise(vec2 p,float cells){
        vec2 a=floor(p);vec2 f=smoothstep(0.0,1.0,fract(p));
        float left=mod(a.x,cells),right=mod(a.x+1.0,cells);
        return mix(
          mix(hash(vec2(left,a.y)),hash(vec2(right,a.y)),f.x),
          mix(hash(vec2(left,a.y+1.0)),hash(vec2(right,a.y+1.0)),f.x),f.y);
      }
      void main(){
        vec3 d=normalize(worldRay);
        float h=d.y;
        float az=atan(d.z,d.x);
        // The longitude field wraps across the same lattice cells at either edge.
        float longitude=az/TAU+.5;
        float hazeOffset=(h-.10)*4.7;
        float haze=exp(-hazeOffset*hazeOffset);
        vec3 col=mix(vec3(.008,.012,.036),vec3(.024,.02,.099),smoothstep(-.6,.2,h));
        col+=mix(vec3(.016,.019,.077),vec3(.139,.039,.071),.5+.5*sin(az*2.0+.65))*haze;
        float ribbonOffset=(h-.04-.019*sin(az*5.0+time*.08)-.014*sin(az*9.0))*74.0;
        float ribbon=exp(-ribbonOffset*ribbonOffset);
        col+=vec3(.085,.045,.19)*ribbon*smoothstep(.16,.88,sin(az*2.0+.4));
        float drift=longitude+time*.000266;
        float cloud=wrappedNoise(vec2(drift*19.0,h*24.0),19.0)*.55
          +wrappedNoise(vec2(drift*42.0,h*52.8),42.0)*.29
          +wrappedNoise(vec2(drift*104.0,h*132.0),104.0)*.16;
        col+=vec3(.102,.046,.127)*smoothstep(.49,.78,cloud)*haze;
        vec2 star=vec2(longitude*1225.0,h*195.0);
        vec2 starCell=floor(star);
        starCell.x=mod(starCell.x,1225.0);
        float starCore=(1.0-smoothstep(.032,.11,length(fract(star)-.5)))*step(.91,hash(starCell));
        col+=vec3(.31,.26,.43)*starCore*smoothstep(-.06,.31,h);
        gl_FragColor=vec4(col,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }));
}

function displayMaterial(east:boolean) {
  return new ShaderMaterial({
    uniforms:{time:{value:0},aspectBias:{value:east?1.8:1},direction:{value:east?-.7:1}},
    vertexShader:`varying vec2 displayUv;void main(){displayUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`
      varying vec2 displayUv;
      uniform float time,aspectBias,direction;
      void main(){
        vec2 p=displayUv;
        float phase=p.y*25.0-p.x*14.0*aspectBias+2.4*sin(p.x*6.5*aspectBias+p.y*4.2+time*.19)+time*.45*direction;
        float ridge=pow(.5+.5*sin(phase),5.0);
        float soft=pow(.5+.5*sin(phase*.63+1.6),3.0);
        vec3 shade=vec3(.029,.026,.115)+ridge*vec3(.48,.45,.98)+soft*vec3(.32,.085,.52);
        shade*=.90+.10*sin(p.y*630.0)*(1.0-smoothstep(.28,1.25,fwidth(p.y*630.0)));
        gl_FragColor=vec4(shade,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}

type FoliageDetail={mesh:InstancedMesh;matrices:Matrix4[];positions:Vector3[]};

function mountFoliage(model:Group,mobile:boolean){
  const basis=new Matrix4().makeRotationX(-Math.PI/2);
  const inverse=basis.clone().invert();
  const templates:Mesh[]=[];
  const details:FoliageDetail[]=[];

  model.traverse(object=>{
    if(object instanceof Mesh&&object.userData.foliage_instances)templates.push(object);
  });
  for(const template of templates){
    template.updateMatrix();
    const matrices=(JSON.parse(template.userData.foliage_instances) as number[][]).map(
      values=>basis.clone().multiply(new Matrix4().fromArray(values)).multiply(inverse).multiply(template.matrix),
    );
    const relief=template.userData.foliage_module==='relief';
    if(relief){
      const mesh=new InstancedMesh(template.geometry,template.material,Math.min(mobile?5:12,matrices.length));
      mesh.name=template.name;
      mesh.userData.foliageRelief=true;
      mesh.count=0;
      mesh.frustumCulled=false;
      template.parent?.add(mesh);
      details.push({mesh,matrices,positions:matrices.map(matrix=>new Vector3().setFromMatrixPosition(matrix))});
    }else{
      // One instance set per park section lets the frustum cull trees at every zoom.
      const tiles=new Map<string,Matrix4[]>();
      for(const matrix of matrices){
        const key=Math.floor(matrix.elements[12]/90)+':'+Math.floor(matrix.elements[14]/90);
        const tile=tiles.get(key);
        if(tile)tile.push(matrix);
        else tiles.set(key,[matrix]);
      }
      for(const tile of tiles.values()){
        const mesh=new InstancedMesh(template.geometry,template.material,tile.length);
        tile.forEach((matrix,index)=>mesh.setMatrixAt(index,matrix));
        mesh.computeBoundingSphere();
        template.parent?.add(mesh);
      }
    }
    template.removeFromParent();
  }
  return details;
}

function refineFoliage(details:FoliageDetail[],camera:Vector3,mobile:boolean){
  const distance=mobile?49:82;
  for(const {mesh,matrices,positions} of details){
    const nearest=positions.map((position,index)=>({index,distance:position.distanceToSquared(camera)}))
      .filter(item=>item.distance<distance*distance).sort((a,b)=>a.distance-b.distance);
    mesh.count=Math.min(mesh.instanceMatrix.count,nearest.length);
    for(let index=0;index<mesh.count;index++)mesh.setMatrixAt(index,matrices[nearest[index].index]);
    mesh.instanceMatrix.needsUpdate=true;
  }
}

export async function mountDreamscape(
  host:HTMLElement,buffer:ArrayBuffer,entryAsset:string,signal:AbortSignal,callbacks:SceneCallbacks,
){
  const mobile=matchMedia('(max-width: 700px)').matches;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let renderer:WebGLRenderer;
  try {renderer=new WebGLRenderer({antialias:true,powerPreference:'high-performance'});}
  catch {callbacks.fallback();return;}
  const canvas=renderer.domElement;
  canvas.setAttribute('aria-label','INS LAND park and building, interactive three-dimensional scene');
  canvas.tabIndex=0;
  renderer.outputColorSpace=SRGBColorSpace;
  renderer.toneMapping=ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.12;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=PCFShadowMap;
  renderer.shadowMap.autoUpdate=false;
  host.append(canvas);
  const scene=new Scene();
  scene.background=new Color('#19112c');
  scene.fog=new FogExp2('#30234f',.00119);
  const dome=duskDome();
  scene.add(dome);
  const pmrem=new PMREMGenerator(renderer);
  const env=new RoomEnvironment();
  const target=pmrem.fromScene(env,.03);
  scene.environment=target.texture;
  scene.environmentIntensity=.61;
  env.dispose();pmrem.dispose();
  scene.add(new AmbientLight('#a395ff',.16),new HemisphereLight('#adadff','#4c466c',.86));
  function light(color:string,intensity:number,x:number,y:number,z:number){
    const light=new DirectionalLight(color,intensity);
    light.position.set(x,y,z);scene.add(light);
  }
  const key=new DirectionalLight('#ffd0ae',1.95);
  key.position.set(-94,111,47);key.target.position.set(25,0,103);
  key.castShadow=true;
  Object.assign(key.shadow.camera,{left:-175,right:175,top:150,bottom:-150,near:5,far:405});
  key.shadow.mapSize.setScalar(mobile?1024:2048);
  key.shadow.bias=-.00018;key.shadow.normalBias=.10;
  scene.add(key,key.target);
  light('#8275fe',1.10,95,55,8);
  light('#e29ad7',1.22,21,70,-116);
  const floor=new Mesh(new PlaneGeometry(1450,1450),new MeshStandardMaterial({
    color:'#261d40',roughness:.93,metalness:0,transparent:true,depthWrite:false,
  }));
  floor.material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec2 horizonPoint;\n'+shader.vertexShader.replace(
      '#include <begin_vertex>','#include <begin_vertex>\nhorizonPoint=position.xy;',
    );
    shader.fragmentShader='varying vec2 horizonPoint;\n'+shader.fragmentShader.replace(
      '#include <alphatest_fragment>',
      '#include <alphatest_fragment>\ndiffuseColor.a*=1.0-smoothstep(185.,470.,length(horizonPoint));',
    );
  };
  floor.rotation.x=-Math.PI/2;
  floor.position.set(26,-3.07,76);
  floor.receiveShadow=true;
  scene.add(floor);
  for(const [x,y,z,color,intensity,distance] of [
    [0,6.7,3,'#ffb37b',105,24],[-25,15,9,'#9a76ff',285,28],[0,6,80,'#b1a2ff',510,30],
    [8,8,185,'#ff869e',1060,60],[119,7,168,'#6ba5ff',780,49],
  ] as const){
    const light=new PointLight(color,intensity,distance,1.8);light.position.set(x,y,z);scene.add(light);
  }
  const camera=new PerspectiveCamera(mobile?49:43,1,.6,1700);
  let frame=0,disposed=false,active=false,obscured=false,model:Group|undefined;
  const displays:ShaderMaterial[]=[];
  let pendingDetail:Group|undefined;
  let upgradeStarted=false;
  let upgradeTimer=0;
  const pickTargets:Mesh[]=[];
  let dissolve:ReturnType<typeof createBuildingDissolve>|undefined;
  let crystals:ReturnType<typeof createStoreCrystals>|undefined;
  let crystalProgress=0,crystalGoal=0;
  let mode:WorldMode='building';
  let buildingView:WorldView={...initialWorldView};
  let orbitConfirmed=false;
  function setMode(next:WorldMode){
    if(mode===next)return;
    mode=next;host.dataset.mode=next;callbacks.modeChanged?.(next);
  }
  function startCrystals(){
    if(!crystals||mode!=='building')return;
    orbitConfirmed=false;
    crystalGoal=1;
    buildingView={...view};
    Object.assign(aim,buildingView);
    setMode('transitioning');
    wake();
  }
  function restoreBuilding(){
    if(mode!=='store-crystals')return;
    crystalGoal=0;
    setMode('transitioning');
    aim.azimuth+=shortestAngle(aim.azimuth,buildingView.azimuth);
    aim.elevation=buildingView.elevation;
    aim.zoom=buildingView.zoom;
    wake();
  }
  let observer:ResizeObserver|undefined;
  const view:WorldView={...initialWorldView},aim:WorldView={...initialWorldView};
  let previous=0,lastPaint=0;
  const lastFoliage=new Vector3(Infinity,0,0), cameraTarget=new Vector3();
  let foliage:ReturnType<typeof mountFoliage>|undefined;
  let turf:Texture|undefined;
  const listeners=new AbortController();
  const onLoss=(event:Event)=>{event.preventDefault();callbacks.fallback();dispose();};
  function dispose(){
    if(disposed)return;
    disposed=true;clearTimeout(upgradeTimer);cancelAnimationFrame(frame);observer?.disconnect();listeners.abort();
    MeshoptDecoder.useWorkers(0);
    if(pendingDetail)release(pendingDetail);
    release(scene);turf?.dispose();target.dispose();renderer.dispose();renderer.forceContextLoss();canvas.remove();
  }
  canvas.addEventListener('webglcontextlost',onLoss,{signal:listeners.signal});
  signal.addEventListener('abort',dispose,{once:true,signal:listeners.signal});
  if(signal.aborted){dispose();return;}
  let widthBefore=0,heightBefore=0,ratioBefore=0;
  function resize(){
    if(disposed)return;
    const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);
    const pixelRatio=Math.min(devicePixelRatio,2,Math.sqrt(3400000/(width*height)));
    if(widthBefore===width&&heightBefore===height&&ratioBefore===pixelRatio)return;
    widthBefore=width;heightBefore=height;ratioBefore=pixelRatio;
    renderer.setDrawingBufferSize(width,height,pixelRatio);
    host.dataset.pixelRatio=pixelRatio.toFixed(2);
    camera.aspect=width/height;camera.updateProjectionMatrix();
    if(model)draw(performance.now(),true);
  }
  observer=new ResizeObserver(resize);observer.observe(host);resize();
  MeshoptDecoder.useWorkers(1);
  const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  function installModel(next:Group,asset:string){
    const buildingGroup=next.getObjectByName('NODE__Building')??next.children.find(node=>node.userData.runtime_group==='Building');
    if(!buildingGroup)throw new Error('Building node missing');
    const old=model;
    dissolve?.dispose();
    pickTargets.length=0;
    displays.length=0;
    model=next;
    host.dataset.asset=asset;
    model.name='INS_WORLD';
    foliage=mountFoliage(model,mobile);
    scene.add(model);
    renderer.shadowMap.needsUpdate=true;
    const styled=new Set<Material>();
    const screenObject=model.getObjectByProperty('name','INS_media_display');
    model.traverse(object=>{
      if(!(object instanceof Mesh))return;
      const region=object.parent?.userData.runtime_group;
      object.castShadow=region!=='Park'&&region!=='Ground'&&!object.userData.foliageRelief;
      object.receiveShadow=!['Facade','Back facade','Roof','Building base','Folded cladding','Media framing'].includes(region);
      if(object.userData.screen_surface||object===screenObject||object.name.includes('INS_media_display')){
        const art=displayMaterial(object.userData.screen_surface==='east'||object.name.includes('East_media'));
        object.material=art;
        object.castShadow=false;
        displays.push(art);
      }else{
        if(region==='Entrance stairs'&&object.material instanceof MeshStandardMaterial){
          const original=object.material;
          object.material=new MeshPhysicalMaterial({name:original.name,color:original.color,metalness:.23,roughness:.28,
            clearcoat:.72,clearcoatRoughness:.18,iridescence:.17,iridescenceIOR:1.37,
            iridescenceThicknessRange:[145,265]});
          original.dispose();
        }
        for(const material of Array.isArray(object.material)?object.material:[object.material]){
          if(!(material instanceof MeshStandardMaterial)||styled.has(material))continue;
          const name=material.name.toLowerCase();
          material.envMapIntensity=/iridescent polished/.test(name)?1.23:/glass|glaz|water|vitreous/.test(name)?1.08:.56;
          if(name.includes('indigo broad terrain')){
            material.color.set('#292042');
            material.roughness=1;
          }
          if(name.includes('vermilion clay'))material.color.multiplyScalar(.70);
          if(name.includes('laminated glass'))material.roughness=Math.min(.26,material.roughness);
          finishSurface(material,asset===dreamscapeModel?turf:undefined);
          styled.add(material);
        }
      }
    });
    dissolve=createBuildingDissolve(buildingGroup,scene);
    for(const group of buildingGroup.children){
      if(!['Facade','Back facade','Main entrance','Building base','Roof'].includes(group.userData.runtime_group))continue;
      group.traverse(object=>{if(object instanceof Mesh)pickTargets.push(object);});
    }
    if(old){old.removeFromParent();release(old);}
    lastFoliage.set(Infinity,0,0);
  }

  function queueDetail(){
    if(upgradeStarted||entryAsset!==dreamscapeEntryModel)return;
    clearTimeout(upgradeTimer);
    upgradeTimer=window.setTimeout(()=>{
      if(disposed||!active||upgradeStarted)return;
      upgradeStarted=true;
      void (async()=>{
        try{
          const response=await fetch(dreamscapeModel,{signal,priority:'low'});
          if(!response.ok)throw new Error('Detail geometry unavailable');
          const detail=await loader.parseAsync(await response.arrayBuffer(),new URL(dreamscapeModel,location.href).href);
          if(disposed){release(detail.scene);return;}
          pendingDetail=detail.scene;
          wake();
        }catch(error){
          if(!disposed)console.warn('Dreamscape detail could not load',error);
        }
      })();
    },140);
  }

  try{
    const initial=await loader.parseAsync(buffer,new URL(entryAsset,location.href).href);
    if(disposed){release(initial.scene);return;}
    turf=await new TextureLoader().loadAsync('./dreamscape/turf-detail.webp').catch(()=>undefined);
    if(disposed){release(initial.scene);turf?.dispose();return;}
    if(turf){turf.wrapS=RepeatWrapping;turf.wrapT=RepeatWrapping;turf.anisotropy=4;}
    installModel(initial.scene,entryAsset);
    scene.add(connectParkDestinations());
    crystals=createStoreCrystals(scene,wake,store=>{
      host.dataset.store=store?.id??'';
      callbacks.storeSelected?.(store);
    });
    host.dataset.crystals=String(crystals.count);
    host.dataset.displays=String(displays.length);
    const ray=new Raycaster();const ndc=new Vector2();
    const input=new Map<number,{x:number;y:number}>();
    let movement=0,usedPinch=false,orbitX=0,orbitY=0;
    let lastTap:{x:number;y:number;at:number;building:boolean}|undefined;
    let nativeScale:number|undefined;
    function span(){
      const [a,b]=input.values();
      return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;
    }
    const clearTap=()=>{lastTap=undefined;};
    function selectAt(x:number,y:number,doubleTap:boolean){
      const rect=canvas.getBoundingClientRect();
      ndc.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);
      ray.setFromCamera(ndc,camera);
      if(mode==='store-crystals'){
        const picked=crystals?.pick(ray)??false;
        if(picked)wake();
        return picked;
      }
      if(mode!=='building')return false;
      const match=ray.intersectObjects(pickTargets,false)[0];
      if(!match)return false;
      canvas.dataset.picked=match.object.name;
      callbacks.buildingPick?.(match.object.name);
      if(doubleTap||orbitConfirmed)startCrystals();
      else canvas.focus({preventScroll:true});
      return true;
    }
    canvas.addEventListener('pointerdown',event=>{
      if(!active||(event.pointerType==='mouse'&&event.button!==0))return;
      if(!input.size){movement=0;usedPinch=false;orbitX=0;orbitY=0;}
      input.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(input.size>1){usedPinch=true;clearTap();}
      canvas.setPointerCapture(event.pointerId);
      canvas.dataset.dragging='true';
    },{signal:listeners.signal});
    canvas.addEventListener('pointermove',event=>{
      if(!active||mode==='transitioning')return;
      const old=input.get(event.pointerId);
      if(!old)return;
      const before=span();
      const dx=event.clientX-old.x,dy=event.clientY-old.y;
      old.x=event.clientX;old.y=event.clientY;
      movement+=Math.hypot(dx,dy);
      if(movement>5&&lastTap)clearTap();
      if(input.size>1&&before>0){zoomBy(Math.log(Math.max(1,span())/before)*.78);return;}
      if(usedPinch)return;
      orbitX+=dx;orbitY+=dy;
      const scale=Math.max(.53,1-aim.zoom*.44);
      aim.azimuth-=dx*.0055*scale;
      aim.elevation=Math.min(.97,Math.max(.18,aim.elevation+dy*.004*scale));
      wake();
    },{signal:listeners.signal});
    function endPointer(event:PointerEvent){
      if(!input.delete(event.pointerId))return;
      canvas.dataset.dragging=String(input.size>0);
      if(event.type!=='pointerup'||input.size||usedPinch||mode==='transitioning')return;
      if(movement>5){
        if(mode==='building'&&Math.hypot(orbitX,orbitY)>=24)orbitConfirmed=true;
        return;
      }
      const {clientX:x,clientY:y,timeStamp:at}=event;
      const repeated=!!lastTap&&at-lastTap.at<310&&Math.hypot(lastTap.x-x,lastTap.y-y)<36;
      const picked=selectAt(x,y,repeated&&!!lastTap?.building);
      if(picked&&mode==='building')lastTap={x,y,at,building:true};
      else if(!picked&&repeated&&!lastTap?.building){clearTap();reset();}
      else if(!picked)lastTap={x,y,at,building:false};
      else clearTap();
    }
    for(const name of ['pointerup','pointercancel','lostpointercapture'] as const)canvas.addEventListener(name,endPointer,{signal:listeners.signal});
    canvas.addEventListener('wheel',event=>{
      if(!active||!event.ctrlKey)return;
      event.preventDefault();
      clearTap();
      if(nativeScale===undefined)zoomBy(-event.deltaY*(event.deltaMode===1?16:1)*.005);
    },{passive:false,signal:listeners.signal});
    canvas.addEventListener('gesturestart',event=>{
      if(!active)return;
      event.preventDefault();
      clearTap();
      nativeScale=1;
    },{passive:false,signal:listeners.signal});
    canvas.addEventListener('gesturechange',event=>{
      if(nativeScale===undefined||!active)return;
      event.preventDefault();
      const scale=(event as Event&{scale:number}).scale;
      if(!(scale>0))return;
      zoomBy(Math.log(scale/nativeScale)*.78);
      nativeScale=scale;
    },{passive:false,signal:listeners.signal});
    canvas.addEventListener('gestureend',event=>{
      if(nativeScale===undefined)return;
      event.preventDefault();
      nativeScale=undefined;
    },{passive:false,signal:listeners.signal});
    canvas.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&mode==='store-crystals'){event.preventDefault();restoreBuilding();return;}
      if(mode==='transitioning')return;
      if(mode==='store-crystals'&&(event.key==='ArrowUp'||event.key==='ArrowDown')){
        event.preventDefault();crystals?.cycle(event.key==='ArrowDown'?1:-1);wake();return;
      }
      if(event.key==='Enter'&&mode==='building'){
        event.preventDefault();
        startCrystals();
        return;
      }
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
        event.preventDefault();aim.azimuth+=event.key==='ArrowLeft'?-.23:.23;wake();
      }
      if(event.key==='+'||event.key==='='||event.key==='-'){
        event.preventDefault();zoomBy(event.key==='-'?-.12:.12);
      }
    },{signal:listeners.signal});
    draw(performance.now(),true);
    callbacks.ready({triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls});
  }catch(error){
    if(!signal.aborted){console.warn('Dreamscape could not load',error);callbacks.fallback();}
    dispose();return;
  }

  function shortestAngle(from:number,to:number){
    return Math.atan2(Math.sin(to-from),Math.cos(to-from));
  }
  function reset(){
    orbitConfirmed=false;
    if(mode!=='building'){
      crystalGoal=0;crystalProgress=0;crystals?.update(0,null);dissolve?.update(0,ratioBefore);
      setMode('building');renderer.shadowMap.needsUpdate=true;
    }
    aim.azimuth+=shortestAngle(aim.azimuth,initialWorldView.azimuth);
    aim.elevation=initialWorldView.elevation;
    aim.zoom=0;
    wake();
  }
  function draw(now:number,force=false){
    if(disposed)return;
    const moving=mode==='transitioning'||Math.abs(aim.azimuth-view.azimuth)>.002||
      Math.abs(aim.elevation-view.elevation)>.002||Math.abs(aim.zoom-view.zoom)>.001;
    if(pendingDetail&&active&&mode==='building'&&!moving&&canvas.dataset.dragging!=='true'){
      const detail=pendingDetail;
      pendingDetail=undefined;
      installModel(detail,dreamscapeModel);
    }
    if(!force&&!motion.matches&&!moving&&now-lastPaint<32)return;
    lastPaint=now;
    const dt=Math.min(96,now-(previous||now-16));previous=now;
    if(crystals&&mode==='transitioning'){
      const before=crystalProgress;
      const delta=dt/1650;
      crystalProgress=motion.matches?crystalGoal:crystalGoal?
        Math.min(1,crystalProgress+delta):Math.max(0,crystalProgress-delta);
      if(crystalGoal&&before<.32&&crystalProgress>=.32){
        aim.azimuth+=shortestAngle(aim.azimuth,.12);
        aim.elevation=.235;
      }
      if(crystalProgress===crystalGoal){
        setMode(crystalGoal?'store-crystals':'building');
        renderer.shadowMap.needsUpdate=true;
      }
      host.dataset.crystalProgress=crystalProgress.toFixed(3);
    }
    crystals?.update(crystalProgress,motion.matches?null:now*.001);
    dissolve?.update(crystalProgress,ratioBefore);
    const ease=motion.matches?1:1-Math.exp(-dt/77);
    view.azimuth+=(aim.azimuth-view.azimuth)*ease;
    view.elevation+=(aim.elevation-view.elevation)*ease;
    view.zoom+=(aim.zoom-view.zoom)*ease;
    const {position,target}=worldCameraPose(view,mobile);
    camera.position.set(...position);
    const nearFraming=view.zoom*view.zoom*(3-2*view.zoom);
    const framing=Math.max(0,(crystalProgress-.32)/.68);
    const blend=framing*framing*(3-2*framing);
    const worldFov=(mobile?49:43)-(mobile?11:12)*nearFraming;
    const fov=worldFov+((mobile?53:43)-worldFov)*blend;
    if(Math.abs(camera.fov-fov)>.05){
      camera.fov=fov;
      camera.updateProjectionMatrix();
    }
    cameraTarget.set(...target);
    if(blend>0){
      const theta=view.azimuth;
      const minimumDistance=87/(2*Math.tan(53*Math.PI/360)*camera.aspect);
      const distance=mobile?Math.max(196-view.zoom*10,minimumDistance):128-view.zoom*16;
      const elevation=Math.max(.21,Math.min(.78,view.elevation));
      camera.position.set(
        camera.position.x+(Math.sin(theta)*distance-camera.position.x)*blend,
        camera.position.y+(36+Math.sin(elevation)*distance-camera.position.y)*blend,
        camera.position.z+(Math.cos(theta)*distance-camera.position.z)*blend,
      );
      cameraTarget.set(cameraTarget.x*(1-blend),cameraTarget.y+(36-cameraTarget.y)*blend,cameraTarget.z*(1-blend));
    }
    camera.lookAt(cameraTarget);
    if(foliage&&(force||lastFoliage.distanceToSquared(camera.position)>100)){
      refineFoliage(foliage,camera.position,mobile);
      lastFoliage.copy(camera.position);
    }
    if(!motion.matches){
      dome.material.uniforms.time.value=now*.001;
      for(const display of displays)display.uniforms.time.value=now*.001;
    }
    renderer.render(scene,camera);
    host.classList.toggle('inspecting',view.zoom>.55);
    host.dataset.zoom=aim.zoom.toFixed(3);
    host.dataset.azimuth=aim.azimuth.toFixed(3);
    host.dataset.elevation=aim.elevation.toFixed(3);
    host.dataset.position=camera.position.toArray().map(v=>v.toFixed(1)).join(',');
  }
  function render(now:number){
    frame=0;
    if(!active||disposed||document.hidden)return;
    draw(now);
    if((!motion.matches&&(!obscured||mode==='transitioning'))||
      (pendingDetail&&mode==='building'&&canvas.dataset.dragging!=='true'))wake();
  }
  function wake(){
    if(!frame&&active&&!disposed&&!document.hidden)frame=requestAnimationFrame(render);
  }
  const zoomBy=(value:number)=>{
    if(mode==='transitioning')return aim.zoom;
    aim.zoom=Math.max(0,Math.min(1,aim.zoom+value));
    wake();return aim.zoom;
  };
  document.addEventListener('visibilitychange',wake,{signal:listeners.signal});
  return {
    setActive(enable:boolean){
      if(active===enable)return;
      active=enable;
      if(enable){previous=0;wake();queueDetail();}
      else{cancelAnimationFrame(frame);frame=0;}
    },
    setObscured(value:boolean){obscured=value;if(!value)wake();},
    zoomBy,
    zoom:()=>aim.zoom,
    reset,restoreBuilding,enterCrystals:startCrystals,
    transitioning:()=>mode==='transitioning',
    dispose,
  };
}
export type DreamscapeControls=NonNullable<Awaited<ReturnType<typeof mountDreamscape>>>;
