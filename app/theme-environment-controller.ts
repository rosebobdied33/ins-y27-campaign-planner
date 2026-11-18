import {AmbientLight,BufferGeometry,Color,Float32BufferAttribute,HemisphereLight,Points,ShaderMaterial,type FogExp2,type MeshStandardMaterial,type Scene,type ShaderMaterial as SkyMaterial} from 'three';
import {crystalThemes} from './crystal-themes';

export function createThemeEnvironment(scene:Scene,sky:SkyMaterial,ground:MeshStandardMaterial){
 const lights=scene.children.filter((item):item is AmbientLight|HemisphereLight=>item instanceof AmbientLight||item instanceof HemisphereLight);
 const baseLights=lights.map(light=>light.color.clone());
 const baseFog=(scene.fog as FogExp2).color.clone(),baseGround=ground.color.clone();
 const current={sky:new Color(1,1,1),fog:baseFog.clone(),ground:baseGround.clone(),light:new Color(1,1,1),emission:new Color('#e3caff')};
 const from={sky:new Color(),fog:new Color(),ground:new Color(),light:new Color(),emission:new Color()};
 const target={sky:new Color(),fog:new Color(),ground:new Color(),light:new Color(),emission:new Color()};
 const channels=['sky','fog','ground','light','emission'] as const;
 let theme=0,started=-Infinity,enabled=false;
 const positions=new Float32Array(180*3);
 for(let i=0;i<180;i++){
  positions[i*3]=Math.sin(i*19.31)*65;
  positions[i*3+1]=8+(i%43)*1.5;
  positions[i*3+2]=Math.cos(i*7.13)*27;
 }
 const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
 const material=new ShaderMaterial({uniforms:{tint:{value:new Color('#c8b6ff')},time:{value:0}},transparent:true,depthWrite:false,
 vertexShader:`uniform float time;varying float alpha;void main(){vec3 p=position;p.y+=sin(time*.45+position.x)*.5;vec4 v=modelViewMatrix*vec4(p,1.0);gl_Position=projectionMatrix*v;gl_PointSize=clamp(150.0/-v.z,1.0,2.5);alpha=.15+.17*sin(time*.6+position.y);}`,
 fragmentShader:`uniform vec3 tint;varying float alpha;void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(tint,alpha*(1.0-smoothstep(.15,.5,d)));}`});
 const particles=new Points(geometry,material);particles.visible=false;scene.add(particles);
 function begin(now:number){
  const config=crystalThemes[theme];
  for(const key of channels)from[key].copy(current[key]);
  target.sky.set(config.ambientColor).lerp(new Color(config.skyGradient[1]),.2).multiplyScalar(1.35);
  target.fog.set(config.fogColor).multiplyScalar(.36);target.ground.set(config.groundColor);
  target.light.set(config.ambientColor);target.emission.set(config.crystalEmission);started=now;
 }
 return {
  select(index:number,now:number){if(index<0||index>=7||index===theme)return;theme=index;if(enabled)begin(now);},
  update(active:boolean,now:number,reduce:boolean){
   if(active&&!enabled){enabled=true;begin(now);}
   particles.visible=active;
   if(!active){
    if(enabled){enabled=false;sky.uniforms.themeTint.value.setRGB(1,1,1);(scene.fog as FogExp2).color.copy(baseFog);ground.color.copy(baseGround);lights.forEach((light,i)=>light.color.copy(baseLights[i]));current.sky.setRGB(1,1,1);current.fog.copy(baseFog);current.ground.copy(baseGround);}
    return 0;
   }
   const t=reduce?1:Math.min(1,(now-started)/crystalThemes[theme].transitionDuration),ease=t*t*(3-2*t);
   for(const key of channels)current[key].lerpColors(from[key],target[key],ease);
   sky.uniforms.themeTint.value.copy(current.sky);(scene.fog as FogExp2).color.copy(current.fog);ground.color.copy(current.ground);
   lights.forEach((light,i)=>light.color.copy(baseLights[i]).lerp(current.light,.45));
   material.uniforms.tint.value.copy(current.emission);material.uniforms.time.value=reduce?0:now*.001;
   return reduce?0:Math.sin(Math.PI*Math.min(1,(now-started)/340));
  },
  get emission(){return current.emission;},
  dispose(){particles.removeFromParent();geometry.dispose();material.dispose();},
 };
}
