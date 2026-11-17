import {BufferGeometry,Float32BufferAttribute,Group,Mesh,MeshStandardMaterial,Vector2} from 'three';
import {finishSurface} from './dreamscape-surfaces';

// V4 park coordinates in metres. The walk approaches meet the two raised areas
// at their actual levels, including the lower bank by the pavilion.
type Waypoint=[x:number,z:number,height:number];
const approachStones=new MeshStandardMaterial({
  name:'Park / cut stone walkway',color:'#625366',roughness:.69,metalness:.07,
});
const curbStone=new MeshStandardMaterial({
  name:'Park / dressed basalt curb',color:'#302835',roughness:.73,metalness:.08,
});
finishSurface(approachStones);

function strip(name:string,points:Waypoint[],width:number,material:MeshStandardMaterial){
  const vertices:number[]=[];
  const faces:number[]=[];
  for(let i=0;i<points.length;i++){
    const [x,z,height]=points[i];
    const before=points[Math.max(0,i-1)];
    const after=points[Math.min(points.length-1,i+1)];
    const cross=new Vector2(after[1]-before[1],before[0]-after[0]).normalize();
    vertices.push(x+cross.x*width*.5,height,z+cross.y*width*.5);
    vertices.push(x-cross.x*width*.5,height,z-cross.y*width*.5);
    const a=i*2;
    if(i>0)faces.push(a-2,a-1,a,a-1,a+1,a);
  }
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute(vertices,3));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  const mesh=new Mesh(geometry,material);
  mesh.name=name;
  mesh.receiveShadow=true;
  return mesh;
}

export function connectParkDestinations(){
  const paths=new Group();
  paths.name='Park / raised thresholds and shoreline access';
  paths.add(
    strip('Carousel garden / west entrance',[
      [-38,177,.105],[-34,180,.115],[-29,183,.145],[-24,184,.169],[-18,184,.204],
    ],4.3,approachStones),
    strip('Carousel garden / southern entrance',[
      [-3.4,219,.104],[-3.2,216,.118],[-3.15,212,.16],[-3.15,207,.204],
    ],4.7,approachStones),
    strip('Lotus circuit / pavilion approach',[
      [161,183,.115],[158,182.7,.132],[155,182.7,.17],[151.15,183.35,.224],
    ],2.7,approachStones),
    strip('Carousel garden / north stone edging',[
      [-19.7,173,.221],[-19.7,170.1,.221],[5,158.2,.221],[28.7,166.15,.221],[31.8,197.9,.221],
    ],.48,curbStone),
    strip('Carousel garden / south stone edging',[
      [-19.8,187,.219],[-19.8,213.8,.219],[-6.2,214.15,.219],
    ],.48,curbStone),
    strip('Carousel garden / southeast stone edging',[
      [-.2,214.55,.221],[16.9,214.8,.221],[31.82,197.9,.221],
    ],.48,curbStone),
  );
  return paths;
}
