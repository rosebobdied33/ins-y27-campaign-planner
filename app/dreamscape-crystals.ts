import {
  BufferGeometry, Color, EdgesGeometry, Float32BufferAttribute, Group, LineBasicMaterial, LineSegments, Mesh, MeshPhysicalMaterial,
  Object3D, Raycaster, TextureLoader, Vector3,
} from 'three';
import type {StoreAnchor} from '../lib/world-navigation';
import {crystalVenues} from './dreamscape-venues';

function ease(value:number,from:number,to:number){
  const t=Math.max(0,Math.min(1,(value-from)/(to-from)));
  return t*t*(3-2*t);
}

function crystalGeometry(index:number){
  const height=13+(index%4)*1.1;
  const radius=4.05+(index%3)*.25;
  const tip=new Vector3(.54,height,.25);
  const point=new Vector3(-.5,-4.2,.12);
  const ring=(step:number,lower:boolean)=>{
    const turn=step*Math.PI/3+(lower?.22:0);
    const r=radius*(lower?.79:1);
    return new Vector3(r*Math.cos(turn),lower?-.7:height*.59,r*Math.sin(turn));
  };
  const caps:number[][]=[],sides:number[][]=[];
  function triangle(target:number[][],a:Vector3,b:Vector3,c:Vector3,tone:number,mirror=false){
    for(const node of [a,b,c]){
      target.push([node.x,(node.y-4.5)*.77,node.z,tone,
        .5+(mirror?-1:1)*node.x/6.2,.47+(node.y-height*.28)/(height*.59+.7)]);
    }
  }
  for(let i=0;i<6;i++){
    const upper=ring(i,false),nextUpper=ring(i+1,false);
    const lower=ring(i,true),nextLower=ring(i+1,true);
    const mirror=i>=3;
    triangle(caps,tip,nextUpper,upper,.82+(i%3)*.09);
    triangle(sides,upper,nextUpper,lower,.75+(i%2)*.16,mirror);
    triangle(sides,nextUpper,nextLower,lower,.94-(i%3)*.05,mirror);
    triangle(caps,point,lower,nextLower,.84);
  }
  const vertices=caps.concat(sides);
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(vertices.flatMap(([x,y,z])=>[x,y,z]),3));
  geometry.setAttribute('color',new Float32BufferAttribute(vertices.flatMap(([, , ,tone])=>[tone,tone,tone]),3));
  geometry.setAttribute('uv',new Float32BufferAttribute(vertices.flatMap(([, , , ,u,v])=>[u,v]),2));
  geometry.addGroup(0,caps.length,0);
  geometry.addGroup(caps.length,sides.length,1);
  geometry.computeVertexNormals();
  return geometry;
}

export function createStoreCrystals(scene:Object3D,onReliefReady:()=>void,onSelect:(store:StoreAnchor|null)=>void){
  const root=new Group();
  root.name='STORE_ANCHORS';
  root.visible=false;
  scene.add(root);
  const loader=new TextureLoader();

  const crystals=crystalVenues.map(({id,name,color,x,y,z,row,column},index)=>{
    const geometry=crystalGeometry(index);
    const position=new Vector3(x,y,z);
    const anchor:StoreAnchor={id,name,position:position.toArray(),objectId:'crystal:'+id,campaignIds:[]};
    const pigment=new Color(color);
    const shell=new MeshPhysicalMaterial({
      color:pigment.clone().multiplyScalar(.57),vertexColors:true,metalness:.43,roughness:.18,clearcoat:1,
      clearcoatRoughness:.09,iridescence:.52,iridescenceIOR:1.38,iridescenceThicknessRange:[145,358],
      ior:1.46,
      envMapIntensity:1.32,emissive:pigment,emissiveIntensity:.18,
    });
    const face=shell.clone();
    const engravingReady={value:0};
    const relief=loader.load('./dreamscape/engravings/'+id+'-relief.png',()=>{engravingReady.value=1;onReliefReady();});
    relief.anisotropy=4;
    face.bumpMap=relief;
    face.bumpScale=.47;
    face.onBeforeCompile=shader=>{
      shader.uniforms.engravingReady=engravingReady;
      shader.fragmentShader='uniform float engravingReady;\n'+shader.fragmentShader.replace('#include <color_fragment>',`
        #include <color_fragment>
        float engraving=(1.0-texture2D(bumpMap,vBumpMapUv).r)*engravingReady;
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.73,.69,.61),engraving*.76);
      `).replace('#include <emissivemap_fragment>',`
        #include <emissivemap_fragment>
        totalEmissiveRadiance+=vec3(.35,.30,.25)*engraving;
        roughnessFactor=mix(roughnessFactor,.59,engraving);
      `);
    };
    const body=new Mesh(geometry,[shell,face]);
    const rim=new LineSegments(new EdgesGeometry(geometry,18),new LineBasicMaterial({
      color:pigment.clone().lerp(new Color('#fff2ff'),.60),transparent:true,opacity:.42,depthWrite:false,
    }));
    body.add(rim);
    body.name=anchor.objectId!;
    body.userData.store=anchor;
    root.add(body);
    return {body,position,anchor,row,column};
  });
  const hitObjects=crystals.map(({body})=>body);
  let selected=-1;
  function select(index:number){
    selected=index;
    onSelect(crystals[index]?.anchor??null);
  }

  return {
    update(progress:number,time:number|null){
      root.visible=progress>0;
      if(!root.visible){
        if(selected>=0)select(-1);
        return;
      }
      crystals.forEach(({body,position,row,column},index)=>{
        const delay=column*.015+row*.023;
        const travel=ease(progress,.39+delay,.96+delay*.3);
        body.visible=travel>0;
        body.position.copy(position);
        const float=time===null?0:Math.sin(time*.94+index*1.27)*.36*travel;
        const spin=time===null?0:Math.sin(time*.61+index*.88)*.27*travel;
        body.position.y+=float-5.7*(1-travel);
        body.position.z+=9*(1-travel);
        body.rotation.set(-.055*travel,(index%5-2)*.076+(.42+index%3*.12)*(1-travel)+spin,Math.sin(index*2)*.06*travel);
        const scale=Math.max(.001,travel)*(selected===index?1.045:1);
        body.scale.set(scale,scale*(.94+(index%4)*.025),scale*(.95+(index%3)*.08));
      });
    },
    pick(ray:Raycaster){
      const hit=ray.intersectObjects(hitObjects,false)[0];
      if(!hit)return false;
      select(crystals.findIndex(({body})=>body===hit.object));
      return true;
    },
    cycle(direction:number){
      select(selected<0?(direction>0?0:crystals.length-1):(selected+direction+crystals.length)%crystals.length);
    },
    get count(){return crystals.length;},
  };
}
