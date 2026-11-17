import {
  AdditiveBlending, BufferGeometry, Float32BufferAttribute, Group, Material, Mesh, Object3D,
  Points, ShaderMaterial, Vector3,
} from 'three';

export function createBuildingDissolve(building:Object3D,scene:Object3D){
  const progress={value:0};
  const members=new Set<Object3D>();
  building.traverse(object=>members.add(object));
  const outside=new Set<Material>();
  scene.traverse(object=>{
    if(object instanceof Mesh&&!members.has(object)){
      for(const material of Array.isArray(object.material)?object.material:[object.material])outside.add(material);
    }
  });
  const materials=new Map<Material,Material>();
  function withDissolve(source:Material){
    const previous=materials.get(source);
    if(previous)return previous;
    const material=outside.has(source)?source.clone():source;
    const compile=source.onBeforeCompile;
    const key=source.customProgramCacheKey();
    material.customProgramCacheKey=()=>key+':building-dissolve';
    material.onBeforeCompile=(shader,renderer)=>{
      compile.call(source,shader,renderer);
      shader.uniforms.buildingDissolve=progress;
      shader.fragmentShader='uniform float buildingDissolve;\n'+shader.fragmentShader.replace(
        /void main\s*\(\s*\)\s*\{/,
        `$&
        if(buildingDissolve>0.0){
          vec2 cell=floor(gl_FragCoord.xy);
          float grain=fract(52.9829189*fract(dot(cell,vec2(.06711056,.00583715))));
          if(grain<buildingDissolve)discard;
        }`,
      );
    };
    materials.set(source,material);
    return material;
  }
  building.updateWorldMatrix(true,true);
  const positions:number[]=[],seeds:number[]=[];
  const point=new Vector3(),a=new Vector3(),b=new Vector3();
  let state=2166136261;
  const random=()=>{
    state=(Math.imul(1664525,state)+1013904223)>>>0;
    return state/4294967296;
  };
  building.traverse(object=>{
    if(!(object instanceof Mesh)||!object.visible)return;
    object.material=Array.isArray(object.material)?object.material.map(withDissolve):withDissolve(object.material);
    const position=object.geometry.getAttribute('position');
    if(!position)return;
    const index=object.geometry.index;
    const triangles=Math.floor((index?.count??position.count)/3);
    const count=Math.min(180,Math.max(4,Math.floor(Math.sqrt(triangles)*3)));
    for(let i=0;i<count&&triangles;i++){
      const face=Math.floor(random()*triangles)*3;
      const vert=(offset:number)=>index?.getX(face+offset)??face+offset;
      const weight=Math.sqrt(random()),side=random();
      point.fromBufferAttribute(position,vert(0)).multiplyScalar(1-weight)
        .addScaledVector(a.fromBufferAttribute(position,vert(1)),weight*(1-side))
        .addScaledVector(b.fromBufferAttribute(position,vert(2)),weight*side)
        .applyMatrix4(object.matrixWorld);
      positions.push(point.x,point.y,point.z);
      seeds.push(random(),random(),random());
    }
  });
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.setAttribute('seed',new Float32BufferAttribute(seeds,3));
  const material=new ShaderMaterial({
    uniforms:{phase:{value:0},pixelRatio:{value:1}},
    vertexShader:`
      uniform float phase,pixelRatio;
      attribute vec3 seed;
      varying float glow,tone;
      void main(){
        float life=smoothstep(seed.x*.16,.70+seed.y*.29,phase);
        vec3 away=normalize(vec3(position.x*.15,1.6+seed.y,(seed.z-.5)*4.0+1.0));
        vec3 drift=away*(5.0+17.0*seed.z)*life+vec3(sin(seed.x*32.0+life*3.5),1.0,cos(seed.y*26.0))*life*3.0;
        vec4 viewPosition=modelViewMatrix*vec4(position+drift,1.0);
        gl_Position=projectionMatrix*viewPosition;
        gl_PointSize=pixelRatio*clamp((1.3+seed.z*2.6)*77.0/-viewPosition.z,1.1,4.8);
        glow=smoothstep(0.0,.14,life)*(1.0-smoothstep(.35,.89,life))*(.23+seed.y*.77);
        tone=seed.z;
      }`,
    fragmentShader:`
      varying float glow,tone;
      void main(){
        float radius=length(gl_PointCoord-.5)*2.0;
        float alpha=(1.0-smoothstep(.06,1.0,radius))*glow;
        vec3 tint=mix(vec3(.52,.55,1.0),vec3(.98,.73,.95),tone);
        gl_FragColor=vec4(tint,alpha*.92);
      }`,
    transparent:true,depthWrite:false,blending:AdditiveBlending,
  });
  const points=new Points(geometry,material);
  points.frustumCulled=false;
  points.visible=false;
  const layer=new Group();
  layer.name='Building surface particles';
  layer.add(points);
  scene.add(layer);
  return {
    update(value:number,pixelRatio:number){
      const t=Math.max(0,Math.min(1,(value-.03)/.29));
      progress.value=t*t*(3-2*t);
      building.visible=t<1;
      points.visible=value>0&&value<.88;
      material.uniforms.phase.value=Math.min(1,value/.88);
      material.uniforms.pixelRatio.value=pixelRatio;
    },
  };
}
