import {MeshStandardMaterial,type Texture} from 'three';

const surfaceShader = `
float surfaceHash(vec2 p){
  vec3 v=fract(vec3(p.xyx)*.1031);
  v+=dot(v,v.yzx+33.33);
  return fract((v.x+v.y)*v.z);
}
float surfaceNoise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(mix(surfaceHash(i),surfaceHash(i+vec2(1,0)),f.x),
    mix(surfaceHash(i+vec2(0,1)),surfaceHash(i+1.0),f.x),f.y);
}
`;

type Finish = 'paving'|'turf'|'bark'|'canopy'|'water'|'metal'|'ceramic';
const finishes:Record<Finish,string>={
  paving:`
    vec2 tile=site*vec2(.63,.95);
    tile.x+=.5*mod(floor(tile.y),2.0);
    vec2 cell=fract(tile);
    float edge=min(min(cell.x,1.0-cell.x),min(cell.y,1.0-cell.y));
    float grout=1.0-smoothstep(.009,.026+max(fwidth(tile.x),fwidth(tile.y)),edge);
    float mineral=surfaceNoise(site*11.2)*.55+surfaceNoise(site*37.7)*.45;
    float shade=.76+.24*surfaceHash(floor(tile))+.23*mineral;
    diffuseColor.rgb*=mix(shade,.55,grout*.74);
    relief=(.20*mineral-.62*grout)*.022;
  `,
  turf:`
    float meadow=surfaceNoise(site*.33);
    float tufts=surfaceNoise(site*9.0);
    float grains=surfaceNoise(site*47.0);
    vec3 turfTint=mix(vec3(.66,.83,.77),vec3(1.17,1.22,1.05),meadow);
    diffuseColor.rgb*=turfTint*(.69+.35*tufts+.15*grains);
    relief=(tufts*.58+grains*.26)*.016;
  `,
  bark:`
    vec2 fibers=vec2(sitePoint.x+sitePoint.z*.51,sitePoint.y);
    float cracks=surfaceNoise(fibers*vec2(13.0,1.5));
    float barkGrain=surfaceNoise(fibers*vec2(38.0,4.4));
    diffuseColor.rgb*=.60+.41*cracks+.27*barkGrain;
    relief=cracks*.027;
  `,
  canopy:`
    vec2 leaves=site+sitePoint.y*vec2(.63,.47);
    float sprouts=surfaceNoise(leaves*5.0);
    float foliage=surfaceNoise(leaves*18.4);
    diffuseColor.rgb*=.75+.31*sprouts+.22*foliage;
    relief=(sprouts*.43+foliage*.35)*.034;
  `,
  water:`
    float flow=surfaceNoise(site*.17);
    float swell=sin(site.x*2.5+site.y*.43+4.2*flow);
    float surface=sin(site.y*2.2-site.x*.67+3.2*flow);
    diffuseColor.rgb*=.79+.25*flow+.13*swell*surface;
    relief=(swell+surface*.38)*.018;
  `,
  ceramic:`
    vec2 tile=vec2(sitePoint.x+sitePoint.z*.79,sitePoint.y)*vec2(5.0,1.25);
    float join=1.0-smoothstep(.016,.062+fwidth(tile.x),min(fract(tile.x),1.0-fract(tile.x)));
    float tone=surfaceNoise(tile*vec2(.32,.58));
    diffuseColor.rgb*=.82+.28*tone-.26*join;
    relief=(tone*.17-join*.38)*.008;
  `,
  metal:`
    vec2 layer=vec2(sitePoint.x+sitePoint.z*.71,sitePoint.y);
    float weather=surfaceNoise(layer*vec2(1.1,.39));
    float grain=surfaceNoise(layer*vec2(60.0,8.0));
    diffuseColor.rgb*=.83+.19*weather+.15*grain;
    relief=grain*.003;
  `,
};

export function finishSurface(material:MeshStandardMaterial,turf?:Texture){
  const name=material.name.toLowerCase();
  let finish:Finish|undefined;
  if(/water|reflecting pool/.test(name))finish='water';
  else if(/paving|pavement|limestone|piazza|walkway|stone promenade|stone flags|dressed stone|ride plaza/.test(name))finish='paving';
  else if(/ground|turf|lawn|meadow|grass|landscaped terrain/.test(name))finish='turf';
  else if(/bark|scaffold.*wood/.test(name))finish='bark';
  else if(/canopy|foliage|botanic/.test(name))finish='canopy';
  else if(/ceramic|terracotta|granite_f_80|skp \| \*53$/.test(name))finish='ceramic';
  else if(/nickel|bronze|bitumen|anodized/.test(name))finish='metal';
  if(!finish)return;
  const hasTurf=finish==='turf'&&!!turf;
  const surface=finishes[finish];
  material.customProgramCacheKey=()=>`dreamscape:${finish}:${hasTurf}`;
  material.onBeforeCompile=shader=>{
    if(hasTurf)shader.uniforms.turfDetail={value:turf};
    shader.vertexShader='varying vec3 sitePoint;\n'+shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      vec4 siteVertex=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        siteVertex=instanceMatrix*siteVertex;
      #endif
      sitePoint=(modelMatrix*siteVertex).xyz;`,
    );
    shader.fragmentShader='varying vec3 sitePoint;\n'+(hasTurf?'uniform sampler2D turfDetail;\n':'')+surfaceShader+shader.fragmentShader
      .replace('#include <color_fragment>',`#include <color_fragment>
        vec2 site=sitePoint.xz;
        float relief=0.0;
        ${surface}
        ${hasTurf?`float blades=texture2D(turfDetail,mat2(.82,-.57,.57,.82)*site*.65).r;
          diffuseColor.rgb*=.70+.60*blades;
          relief+=blades*.024;`:''}`)
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        vec3 sx=dFdx(-vViewPosition), sy=dFdy(-vViewPosition);
        vec3 rx=cross(sy,normal), ry=cross(normal,sx);
        float det=dot(sx,rx);
        if(abs(det)>.0000001){
          normal=normalize(abs(det)*normal-sign(det)*(dFdx(relief)*rx+dFdy(relief)*ry));
        }`);
  };
}
