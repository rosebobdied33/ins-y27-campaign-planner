"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[556],{5556:(e,t,a)=>{a.r(t),a.d(t,{mountDreamscape:()=>w});var i=a(1998),n=a(8517),o=a(5559),r=a(2895);let s=`
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
`,l={paving:`
    vec2 tile=site*vec2(.63,.95);
    tile.x+=.5*mod(floor(tile.y),2.0);
    vec2 cell=fract(tile);
    float edge=min(min(cell.x,1.0-cell.x),min(cell.y,1.0-cell.y));
    float grout=1.0-smoothstep(.009,.026+max(fwidth(tile.x),fwidth(tile.y)),edge);
    float mineral=surfaceNoise(site*11.2)*.55+surfaceNoise(site*37.7)*.45;
    float shade=.76+.24*surfaceHash(floor(tile))+.23*mineral;
    diffuseColor.rgb*=mix(shade,.55,grout*.74);
    relief=(.20*mineral-.62*grout)*.022;
  `,turf:`
    float meadow=surfaceNoise(site*.33);
    float tufts=surfaceNoise(site*9.0);
    float grains=surfaceNoise(site*47.0);
    vec3 turfTint=mix(vec3(.66,.83,.77),vec3(1.17,1.22,1.05),meadow);
    diffuseColor.rgb*=turfTint*(.69+.35*tufts+.15*grains);
    relief=(tufts*.58+grains*.26)*.016;
  `,bark:`
    vec2 fibers=vec2(sitePoint.x+sitePoint.z*.51,sitePoint.y);
    float cracks=surfaceNoise(fibers*vec2(13.0,1.5));
    float barkGrain=surfaceNoise(fibers*vec2(38.0,4.4));
    diffuseColor.rgb*=.60+.41*cracks+.27*barkGrain;
    relief=cracks*.027;
  `,canopy:`
    vec2 leaves=site+sitePoint.y*vec2(.63,.47);
    float sprouts=surfaceNoise(leaves*5.0);
    float foliage=surfaceNoise(leaves*18.4);
    diffuseColor.rgb*=.75+.31*sprouts+.22*foliage;
    relief=(sprouts*.43+foliage*.35)*.034;
  `,water:`
    float flow=surfaceNoise(site*.17);
    float swell=sin(site.x*2.5+site.y*.43+4.2*flow);
    float surface=sin(site.y*2.2-site.x*.67+3.2*flow);
    diffuseColor.rgb*=.79+.25*flow+.13*swell*surface;
    relief=(swell+surface*.38)*.018;
  `,ceramic:`
    vec2 tile=vec2(sitePoint.x+sitePoint.z*.79,sitePoint.y)*vec2(5.0,1.25);
    float join=1.0-smoothstep(.016,.062+fwidth(tile.x),min(fract(tile.x),1.0-fract(tile.x)));
    float tone=surfaceNoise(tile*vec2(.32,.58));
    diffuseColor.rgb*=.82+.28*tone-.26*join;
    relief=(tone*.17-join*.38)*.008;
  `,entrance:`
    float blend=clamp((sitePoint.x+4.3)/8.6,0.0,1.0);
    vec3 cool=mix(vec3(.067,.081,.195),vec3(.129,.063,.206),smoothstep(0.0,.65,blend));
    vec3 iris=mix(cool,vec3(.208,.105,.185),smoothstep(.43,1.0,blend));
    float grain=surfaceNoise(site*12.1);
    float wash=surfaceNoise(site*.78);
    float coverage=(1.0-smoothstep(4.15,9.5,abs(sitePoint.x)))
       *(1.0-smoothstep(3.2,4.2,abs(sitePoint.z)))
       *(1.0-smoothstep(.82,1.02,sitePoint.y));
    diffuseColor.rgb=mix(diffuseColor.rgb,iris*(.74+.36*wash+.18*grain),coverage);
    relief=(grain-.5)*coverage*.004;
  `,metal:`
    vec2 layer=vec2(sitePoint.x+sitePoint.z*.71,sitePoint.y);
    float weather=surfaceNoise(layer*vec2(1.1,.39));
    float grain=surfaceNoise(layer*vec2(60.0,8.0));
    diffuseColor.rgb*=.83+.19*weather+.15*grain;
    relief=grain*.003;
  `};function c(e,t){let a,i=e.name.toLowerCase();if(/iridescent polished stone|skp \| \*71$|skp \| altaqua$/.test(i)?a="entrance":/water|reflecting pool/.test(i)?a="water":/paving|pavement|limestone|piazza|walkway|stone promenade|stone flags|dressed stone|ride plaza/.test(i)?a="paving":/ground|turf|lawn|meadow|grass|landscaped terrain/.test(i)?a="turf":/bark|scaffold.*wood/.test(i)?a="bark":/canopy|foliage|botanic/.test(i)?a="canopy":/ceramic|terracotta|granite_f_80|skp \| \*53$/.test(i)?a="ceramic":/nickel|bronze|bitumen|anodized/.test(i)&&(a="metal"),!a)return;let n="turf"===a&&!!t,o=l[a];e.customProgramCacheKey=()=>`dreamscape:${a}:${n}`,e.onBeforeCompile=e=>{n&&(e.uniforms.turfDetail={value:t}),e.vertexShader="varying vec3 sitePoint;\n"+e.vertexShader.replace("#include <begin_vertex>",`#include <begin_vertex>
      vec4 siteVertex=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        siteVertex=instanceMatrix*siteVertex;
      #endif
      sitePoint=(modelMatrix*siteVertex).xyz;`),e.fragmentShader="varying vec3 sitePoint;\n"+(n?"uniform sampler2D turfDetail;\n":"")+s+e.fragmentShader.replace("#include <color_fragment>",`#include <color_fragment>
        vec2 site=sitePoint.xz;
        float relief=0.0;
        ${o}
        ${n?`float blades=texture2D(turfDetail,mat2(.82,-.57,.57,.82)*site*.65).r;
          diffuseColor.rgb*=.70+.60*blades;
          relief+=blades*.024;`:""}`).replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
        vec3 sx=dFdx(-vViewPosition), sy=dFdy(-vViewPosition);
        vec3 rx=cross(sy,normal), ry=cross(normal,sx);
        float det=dot(sx,rx);
        if(abs(det)>.0000001){
          normal=normalize(abs(det)*normal-sign(det)*(dFdx(relief)*rx+dFdy(relief)*ry));
        }`)}}let d=new i._4j({name:"Park / cut stone walkway",color:"#625366",roughness:.69,metalness:.07}),f=new i._4j({name:"Park / dressed basalt curb",color:"#302835",roughness:.73,metalness:.08});function u(e,t,a,n){let o=[],r=[];for(let e=0;e<t.length;e++){let[n,s,l]=t[e],c=t[Math.max(0,e-1)],d=t[Math.min(t.length-1,e+1)],f=new i.I9Y(d[1]-c[1],c[0]-d[0]).normalize();o.push(n+f.x*a*.5,l,s+f.y*a*.5),o.push(n-f.x*a*.5,l,s-f.y*a*.5);let u=2*e;e>0&&r.push(u-2,u-1,u,u-1,u+1,u)}let s=new i.LoY;s.setAttribute("position",new i.qtW(o,3)),s.setIndex(r),s.computeVertexNormals();let l=new i.eaF(s,n);return l.name=e,l.receiveShadow=!0,l}c(d);var m=a(480),p=a(9510),h=a(648),g=a(1007);function v(e){let t=new Set,a=new Set,n=new Set;e.traverse(e=>{if(e instanceof i.eaF||e instanceof i.DXC||e instanceof i.ONl||e instanceof i.kxk)for(let o of(e instanceof i.kxk||t.add(e.geometry),e instanceof i.ZLX&&e.dispose(),Array.isArray(e.material)?e.material:[e.material]))for(let e of(a.add(o),Object.values(o)))e instanceof i.gPd&&n.add(e)}),t.forEach(e=>e.dispose()),a.forEach(e=>e.dispose()),n.forEach(e=>{"u">typeof ImageBitmap&&e.image instanceof ImageBitmap&&e.image.close(),e.dispose()})}async function w(e,t,a,s){let l,w,y,x,b,M,z=matchMedia("(max-width: 700px)").matches,P=matchMedia("(prefers-reduced-motion: reduce)");try{l=new n.JeP({antialias:!0,powerPreference:"high-performance"})}catch{s.fallback();return}let S=l.domElement;S.setAttribute("aria-label","INS LAND park and building, interactive three-dimensional scene"),S.tabIndex=0,l.outputColorSpace=i.er$,l.toneMapping=i.FV,l.toneMappingExposure=1.12,l.shadowMap.enabled=!0,l.shadowMap.type=i.QP0,l.shadowMap.autoUpdate=!1,e.append(S);let k=new i.Z58;k.background=new i.Q1f("#19112c"),k.fog=new i.cRK("#30234f",.00119);let _=new i.eaF(new i.Gu$(1e3,32,20),new i.BKk({side:i.hsX,depthWrite:!1,fog:!1,uniforms:{time:{value:0}},vertexShader:`
      varying vec3 worldRay;
      void main(){worldRay=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}
    `,fragmentShader:`
      varying vec3 worldRay;
      uniform float time;
      float hash(vec2 p){return fract(sin(dot(p,vec2(27.17,181.73)))*43758.545);}
      float noise(vec2 p){
        vec2 a=floor(p);vec2 f=smoothstep(0.0,1.0,fract(p));
        return mix(mix(hash(a),hash(a+vec2(1,0)),f.x),mix(hash(a+vec2(0,1)),hash(a+1.0),f.x),f.y);
      }
      void main(){
        vec3 d=normalize(worldRay);
        float h=d.y;
        float az=atan(d.z,d.x);
        float haze=exp(-pow((h-.10)*4.7,2.0));
        vec3 col=mix(vec3(.008,.012,.036),vec3(.024,.02,.099),smoothstep(-.6,.2,h));
        col+=mix(vec3(.016,.019,.077),vec3(.139,.039,.071),.5+.5*sin(az*1.6+1.2))*haze;
        float ribbon=exp(-pow((h-.04-.019*sin(az*5.0+time*.08)-.014*sin(az*9.0))*74.0,2.0));
        col+=vec3(.085,.045,.19)*ribbon*smoothstep(.16,.88,sin(az*2.3));
        vec2 p=vec2(az*3.0+time*.005,h*24.0);
        float cloud=noise(p)*.55+noise(p*2.2)*.29+noise(p*5.5)*.16;
        col+=vec3(.102,.046,.127)*smoothstep(.49,.78,cloud)*haze;
        vec2 star=vec2(az,h)*195.0;
        float starCore=(1.0-smoothstep(.032,.11,length(fract(star)-.5)))*step(.91,hash(floor(star)));
        col+=vec3(.31,.26,.43)*starCore*smoothstep(-.06,.31,h);
        gl_FragColor=vec4(col,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `}));k.add(_);let C=new n.BdL(l),D=new m.l,A=C.fromScene(D,.03);function F(e,t,a,n,o){let r=new i.ZyN(e,t);r.position.set(a,n,o),k.add(r)}k.environment=A.texture,k.environmentIntensity=.61,D.dispose(),C.dispose(),k.add(new i.$p8("#a395ff",.16),new i.dth("#adadff","#4c466c",.86));let N=new i.ZyN("#ffd0ae",1.95);N.position.set(-94,111,47),N.target.position.set(25,0,103),N.castShadow=!0,Object.assign(N.shadow.camera,{left:-175,right:175,top:150,bottom:-150,near:5,far:405}),N.shadow.mapSize.setScalar(z?1024:2048),N.shadow.bias=-18e-5,N.shadow.normalBias=.1,k.add(N,N.target),F("#8275fe",1.1,95,55,8),F("#e29ad7",1.22,21,70,-116);let B=new i.eaF(new i.bdM(1450,1450),new i._4j({color:"#261d40",roughness:.93,metalness:0,transparent:!0,depthWrite:!1}));for(let[e,t,a,n,o,r]of(B.material.onBeforeCompile=e=>{e.vertexShader="varying vec2 horizonPoint;\n"+e.vertexShader.replace("#include <begin_vertex>","#include <begin_vertex>\nhorizonPoint=position.xy;"),e.fragmentShader="varying vec2 horizonPoint;\n"+e.fragmentShader.replace("#include <alphatest_fragment>","#include <alphatest_fragment>\ndiffuseColor.a*=1.0-smoothstep(185.,470.,length(horizonPoint));")},B.rotation.x=-Math.PI/2,B.position.set(26,-3.07,76),B.receiveShadow=!0,k.add(B),[[0,6.7,3,"#ffb37b",105,24],[-25,15,9,"#9a76ff",285,28],[0,6,80,"#b1a2ff",510,30],[8,8,185,"#ff869e",1060,60],[119,7,168,"#6ba5ff",780,49]])){let s=new i.HiM(n,o,r,1.8);s.position.set(e,t,a),k.add(s)}let R=new i.ubm(z?49:43,1,.6,1700),E=0,I=!1,L=!1,j=!1,q,O=[],V=0,W=0,T="building",U={...g.yo},Y=!1;function X(t){T!==t&&(T=t,e.dataset.mode=t,s.modeChanged?.(t))}function $(){y&&"building"===T&&(Y=!1,W=1,Object.assign(K,U={...H}),X("transitioning"),em())}function G(){"store-crystals"===T&&(W=0,X("transitioning"),K.azimuth+=ec(K.azimuth,U.azimuth),K.elevation=U.elevation,K.zoom=U.zoom,em())}let H={...g.yo},K={...g.yo},J=0,Z=0,Q=new i.Pq0(1/0,0,0),ee=new i.Pq0,et=new AbortController;function ea(){I||(I=!0,cancelAnimationFrame(E),x?.disconnect(),et.abort(),v(k),M?.dispose(),A.dispose(),l.dispose(),l.forceContextLoss(),S.remove())}if(S.addEventListener("webglcontextlost",e=>{e.preventDefault(),s.fallback(),ea()},{signal:et.signal}),a.addEventListener("abort",ea,{once:!0,signal:et.signal}),a.aborted)return void ea();let ei=0,en=0,eo=0;function er(){if(I)return;let t=Math.max(1,e.clientWidth),a=Math.max(1,e.clientHeight),i=Math.min(devicePixelRatio,2,Math.sqrt(34e5/(t*a)));(ei!==t||en!==a||eo!==i)&&(ei=t,en=a,eo=i,l.setDrawingBufferSize(t,a,i),e.dataset.pixelRatio=i.toFixed(2),R.aspect=t/a,R.updateProjectionMatrix(),q&&ef(performance.now(),!0))}(x=new ResizeObserver(er)).observe(e),er();try{let a,n,m,g=new i.Tap().loadAsync("./dreamscape/turf-detail.webp").catch(()=>void 0);g.then(e=>{I&&e?.dispose()});let x=await new o.B().setMeshoptDecoder(r.f).parseAsync(t,new URL(p.z,location.href).href);if(M=await g,I){v(x.scene),M?.dispose();return}M&&(M.wrapS=i.GJx,M.wrapT=i.GJx,M.anisotropy=4),q=x.scene,e.dataset.asset=p.z,q.name="INS_WORLD",b=function(e,t){let a=new i.kn4().makeRotationX(-Math.PI/2),n=a.clone().invert(),o=[],r=[];for(let s of(e.traverse(e=>{e instanceof i.eaF&&e.userData.foliage_instances&&o.push(e)}),o)){s.updateMatrix();let e=JSON.parse(s.userData.foliage_instances).map(e=>a.clone().multiply(new i.kn4().fromArray(e)).multiply(n).multiply(s.matrix));if("relief"===s.userData.foliage_module){let a=new i.ZLX(s.geometry,s.material,Math.min(t?5:12,e.length));a.name=s.name,a.userData.foliageRelief=!0,a.count=0,a.frustumCulled=!1,s.parent?.add(a),r.push({mesh:a,matrices:e,positions:e.map(e=>new i.Pq0().setFromMatrixPosition(e))})}else{let t=new Map;for(let a of e){let e=Math.floor(a.elements[12]/90)+":"+Math.floor(a.elements[14]/90),i=t.get(e);i?i.push(a):t.set(e,[a])}for(let e of t.values()){let t=new i.ZLX(s.geometry,s.material,e.length);e.forEach((e,a)=>t.setMatrixAt(a,e)),t.computeBoundingSphere(),s.parent?.add(t)}}s.removeFromParent()}return r}(q,z),q.add(((m=new i.YJl).name="Park / raised thresholds and shoreline access",m.add(u("Carousel garden / west entrance",[[-38,177,.105],[-34,180,.115],[-29,183,.145],[-24,184,.169],[-18,184,.204]],4.3,d),u("Carousel garden / southern entrance",[[-3.4,219,.104],[-3.2,216,.118],[-3.15,212,.16],[-3.15,207,.204]],4.7,d),u("Lotus circuit / pavilion approach",[[161,183,.115],[158,182.7,.132],[155,182.7,.17],[151.15,183.35,.224]],2.7,d),u("Carousel garden / north stone edging",[[-19.7,173,.221],[-19.7,170.1,.221],[5,158.2,.221],[28.7,166.15,.221],[31.8,197.9,.221]],.48,f),u("Carousel garden / south stone edging",[[-19.8,187,.219],[-19.8,213.8,.219],[-6.2,214.15,.219]],.48,f),u("Carousel garden / southeast stone edging",[[-.2,214.55,.221],[16.9,214.8,.221],[31.82,197.9,.221]],.48,f)),m)),k.add(q),l.shadowMap.needsUpdate=!0;let P=q.getObjectByName("NODE__Building"),_=new Set,C=q.getObjectByProperty("name","INS_media_display");q.traverse(e=>{if(!(e instanceof i.eaF))return;let t=e.parent?.userData.runtime_group;if(e.castShadow="Park"!==t&&"Ground"!==t&&!e.userData.foliageRelief,e.receiveShadow=!["Facade","Back facade","Roof","Building base","Folded cladding","Media framing"].includes(t),e.userData.screen_surface||e===C||e.name.includes("INS_media_display")){var a;let t=(a="east"===e.userData.screen_surface||e.name.includes("East_media"),new i.BKk({uniforms:{time:{value:0},aspectBias:{value:a?1.8:1},direction:{value:a?-.7:1}},vertexShader:"varying vec2 displayUv;void main(){displayUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",fragmentShader:`
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
    `}));e.material=t,e.castShadow=!1,O.push(t)}else{if("Entrance stairs"===t&&e.material instanceof i._4j){let t=e.material;e.material=new i.uSd({name:t.name,color:t.color,metalness:.23,roughness:.28,clearcoat:.72,clearcoatRoughness:.18,iridescence:.17,iridescenceIOR:1.37,iridescenceThicknessRange:[145,265]}),t.dispose()}for(let t of Array.isArray(e.material)?e.material:[e.material]){if(!(t instanceof i._4j)||_.has(t))continue;let e=t.name.toLowerCase();t.envMapIntensity=/iridescent polished/.test(e)?1.23:/glass|glaz|water|vitreous/.test(e)?1.08:.56,e.includes("indigo broad terrain")&&(t.color.set("#292042"),t.roughness=1),e.includes("vermilion clay")&&t.color.multiplyScalar(.7),e.includes("laminated glass")&&(t.roughness=Math.min(.26,t.roughness)),c(t,M),_.add(t)}}});let D=P??q.children.find(e=>"Building"===e.userData.runtime_group);if(!D)throw Error("Building node missing");w=function(e,t){let a={value:0},n=new Set;e.traverse(e=>n.add(e));let o=new Set;t.traverse(e=>{if(e instanceof i.eaF&&!n.has(e))for(let t of Array.isArray(e.material)?e.material:[e.material])o.add(t)});let r=new Map;function s(e){let t=r.get(e);if(t)return t;let i=o.has(e)?e.clone():e,n=e.onBeforeCompile,s=e.customProgramCacheKey();return i.customProgramCacheKey=()=>s+":building-dissolve",i.onBeforeCompile=(t,i)=>{n.call(e,t,i),t.uniforms.buildingDissolve=a,t.fragmentShader="uniform float buildingDissolve;\n"+t.fragmentShader.replace(/void main\s*\(\s*\)\s*\{/,`$&
        if(buildingDissolve>0.0){
          vec2 cell=floor(gl_FragCoord.xy);
          float grain=fract(52.9829189*fract(dot(cell,vec2(.06711056,.00583715))));
          if(grain<buildingDissolve)discard;
        }`)},r.set(e,i),i}e.updateWorldMatrix(!0,!0);let l=[],c=[],d=new i.Pq0,f=new i.Pq0,u=new i.Pq0,m=0x811c9dc5,p=()=>(m=Math.imul(1664525,m)+0x3c6ef35f>>>0)/0x100000000;e.traverse(e=>{if(!(e instanceof i.eaF)||!e.visible)return;e.material=Array.isArray(e.material)?e.material.map(s):s(e.material);let t=e.geometry.getAttribute("position");if(!t)return;let a=e.geometry.index,n=Math.floor((a?.count??t.count)/3),o=Math.min(180,Math.max(4,Math.floor(3*Math.sqrt(n))));for(let i=0;i<o&&n;i++){let i=3*Math.floor(p()*n),o=e=>a?.getX(i+e)??i+e,r=Math.sqrt(p()),s=p();d.fromBufferAttribute(t,o(0)).multiplyScalar(1-r).addScaledVector(f.fromBufferAttribute(t,o(1)),r*(1-s)).addScaledVector(u.fromBufferAttribute(t,o(2)),r*s).applyMatrix4(e.matrixWorld),l.push(d.x,d.y,d.z),c.push(p(),p(),p())}});let h=new i.LoY;h.setAttribute("position",new i.qtW(l,3)),h.setAttribute("seed",new i.qtW(c,3));let g=new i.BKk({uniforms:{phase:{value:0},pixelRatio:{value:1}},vertexShader:`
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
      }`,fragmentShader:`
      varying float glow,tone;
      void main(){
        float radius=length(gl_PointCoord-.5)*2.0;
        float alpha=(1.0-smoothstep(.06,1.0,radius))*glow;
        vec3 tint=mix(vec3(.52,.55,1.0),vec3(.98,.73,.95),tone);
        gl_FragColor=vec4(tint,alpha*.92);
      }`,transparent:!0,depthWrite:!1,blending:i.EZo}),v=new i.ONl(h,g);v.frustumCulled=!1,v.visible=!1;let w=new i.YJl;return w.name="Building surface particles",w.add(v),t.add(w),{update(t,i){let n=Math.max(0,Math.min(1,(t-.03)/.29));a.value=n*n*(3-2*n),e.visible=n<1,v.visible=t>0&&t<.88,g.uniforms.phase.value=Math.min(1,t/.88),g.uniforms.pixelRatio.value=i}}}(D,k),y=function(e,t,a){let n=new i.YJl;n.name="STORE_ANCHORS",n.visible=!1,e.add(n);let o=new i.Tap,r=h.x.map(({id:e,name:a,color:r,x:s,y:l,z:c,row:d,column:f},u)=>{let m=function(e){let t=13+e%4*1.1,a=4.05+e%3*.25,n=new i.Pq0(.54,t,.25),o=new i.Pq0(-.5,-4.2,.12),r=(e,n)=>{let o=e*Math.PI/3+.22*!!n,r=a*(n?.79:1);return new i.Pq0(r*Math.cos(o),n?-.7:.59*t,r*Math.sin(o))},s=[],l=[];function c(e,a,i,n,o,r=!1){for(let s of[a,i,n])e.push([s.x,(s.y-4.5)*.77,s.z,o,.5+(r?-1:1)*s.x/6.2,.47+(s.y-.28*t)/(.59*t+.7)])}for(let e=0;e<6;e++){let t=r(e,!1),a=r(e+1,!1),i=r(e,!0),d=r(e+1,!0),f=e>=3;c(s,n,a,t,.82+e%3*.09),c(l,t,a,i,.75+e%2*.16,f),c(l,a,d,i,.94-e%3*.05,f),c(s,o,i,d,.84)}let d=s.concat(l),f=new i.LoY;return f.setAttribute("position",new i.qtW(d.flatMap(([e,t,a])=>[e,t,a]),3)),f.setAttribute("color",new i.qtW(d.flatMap(([,,,e])=>[e,e,e]),3)),f.setAttribute("uv",new i.qtW(d.flatMap(([,,,,e,t])=>[e,t]),2)),f.addGroup(0,s.length,0),f.addGroup(s.length,l.length,1),f.computeVertexNormals(),f}(u),p=new i.Pq0(s,l,c),h={id:e,name:a,position:p.toArray(),objectId:"crystal:"+e,campaignIds:[]},g=new i.Q1f(r),v=new i.uSd({color:g.clone().multiplyScalar(.57),vertexColors:!0,metalness:.43,roughness:.18,clearcoat:1,clearcoatRoughness:.09,iridescence:.52,iridescenceIOR:1.38,iridescenceThicknessRange:[145,358],ior:1.46,envMapIntensity:1.32,emissive:g,emissiveIntensity:.18}),w=v.clone(),y={value:0},x=o.load("./dreamscape/engravings/"+e+"-relief.png",()=>{y.value=1,t()});x.anisotropy=4,w.bumpMap=x,w.bumpScale=.47,w.onBeforeCompile=e=>{e.uniforms.engravingReady=y,e.fragmentShader="uniform float engravingReady;\n"+e.fragmentShader.replace("#include <color_fragment>",`
        #include <color_fragment>
        float engraving=(1.0-texture2D(bumpMap,vBumpMapUv).r)*engravingReady;
        diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.73,.69,.61),engraving*.76);
      `).replace("#include <emissivemap_fragment>",`
        #include <emissivemap_fragment>
        totalEmissiveRadiance+=vec3(.35,.30,.25)*engraving;
        roughnessFactor=mix(roughnessFactor,.59,engraving);
      `)};let b=new i.eaF(m,[v,w]),M=new i.DXC(new i.TDQ(m,18),new i.mrM({color:g.clone().lerp(new i.Q1f("#fff2ff"),.6),transparent:!0,opacity:.42,depthWrite:!1}));return b.add(M),b.name=h.objectId,b.userData.store=h,n.add(b),{body:b,position:p,anchor:h,row:d,column:f}}),s=r.map(({body:e})=>e),l=-1;function c(e){l=e,a(r[e]?.anchor??null)}return{update(e,t){if(n.visible=e>0,!n.visible){l>=0&&c(-1);return}r.forEach(({body:a,position:i,row:n,column:o},r)=>{var s;let c,d=.015*o+.023*n,f=(c=Math.max(0,Math.min(1,(e-(s=.39+d))/(.96+.3*d-s))))*c*(3-2*c);a.visible=f>0,a.position.copy(i);let u=null===t?0:.36*Math.sin(.94*t+1.27*r)*f,m=null===t?0:.27*Math.sin(.61*t+.88*r)*f;a.position.y+=u-5.7*(1-f),a.position.z+=9*(1-f),a.rotation.set(-.055*f,(r%5-2)*.076+(.42+r%3*.12)*(1-f)+m,.06*Math.sin(2*r)*f);let p=Math.max(.001,f)*(l===r?1.045:1);a.scale.set(p,p*(.94+r%4*.025),p*(.95+r%3*.08))})},pick(e){let t=e.intersectObjects(s,!1)[0];return!!t&&(c(r.findIndex(({body:e})=>e===t.object)),!0)},cycle(e){c(l<0?e>0?0:r.length-1:(l+e+r.length)%r.length)},get count(){return r.length}}}(k,em,t=>{e.dataset.store=t?.id??"",s.storeSelected?.(t)}),e.dataset.crystals=String(y.count),e.dataset.displays=String(O.length);let A=new i.tBo,F=new i.I9Y,N=[];for(let e of D.children)["Facade","Back facade","Main entrance","Building base","Roof"].includes(e.userData.runtime_group)&&e.traverse(e=>{e instanceof i.eaF&&N.push(e)});let B=new Map,E=0,j=!1,V=0,W=0;function es(){let[e,t]=B.values();return e&&t?Math.hypot(e.x-t.x,e.y-t.y):0}let U=()=>{a=void 0};function el(e){if(!B.delete(e.pointerId)||(S.dataset.dragging=String(B.size>0),"pointerup"!==e.type||B.size||j||"transitioning"===T))return;if(E>5){"building"===T&&Math.hypot(V,W)>=24&&(Y=!0);return}let{clientX:t,clientY:i,timeStamp:n}=e,o=!!a&&n-a.at<310&&36>Math.hypot(a.x-t,a.y-i),r=function(e,t,a){let i=S.getBoundingClientRect();if(F.set((e-i.left)/i.width*2-1,-(t-i.top)/i.height*2+1),A.setFromCamera(F,R),"store-crystals"===T){let e=y?.pick(A)??!1;return e&&em(),e}if("building"!==T)return!1;let n=A.intersectObjects(N,!1)[0];return!!n&&(S.dataset.picked=n.object.name,s.buildingPick?.(n.object.name),a||Y?$():S.focus({preventScroll:!0}),!0)}(t,i,o&&!!a?.building);r&&"building"===T?a={x:t,y:i,at:n,building:!0}:r||!o||a?.building?r?U():a={x:t,y:i,at:n,building:!1}:(U(),ed())}for(let e of(S.addEventListener("pointerdown",e=>{L&&("mouse"!==e.pointerType||0===e.button)&&(B.size||(E=0,j=!1,V=0,W=0),B.set(e.pointerId,{x:e.clientX,y:e.clientY}),B.size>1&&(j=!0,U()),S.setPointerCapture(e.pointerId),S.dataset.dragging="true")},{signal:et.signal}),S.addEventListener("pointermove",e=>{if(!L||"transitioning"===T)return;let t=B.get(e.pointerId);if(!t)return;let i=es(),n=e.clientX-t.x,o=e.clientY-t.y;if(t.x=e.clientX,t.y=e.clientY,(E+=Math.hypot(n,o))>5&&a&&U(),B.size>1&&i>0)return void ep(.78*Math.log(Math.max(1,es())/i));if(j)return;V+=n,W+=o;let r=Math.max(.53,1-.44*K.zoom);K.azimuth-=.0055*n*r,K.elevation=Math.min(.97,Math.max(.18,K.elevation+.004*o*r)),em()},{signal:et.signal}),["pointerup","pointercancel","lostpointercapture"]))S.addEventListener(e,el,{signal:et.signal});S.addEventListener("wheel",e=>{L&&e.ctrlKey&&(e.preventDefault(),U(),void 0===n&&ep(-e.deltaY*(1===e.deltaMode?16:1)*.005))},{passive:!1,signal:et.signal}),S.addEventListener("gesturestart",e=>{L&&(e.preventDefault(),U(),n=1)},{passive:!1,signal:et.signal}),S.addEventListener("gesturechange",e=>{if(void 0===n||!L)return;e.preventDefault();let t=e.scale;t>0&&(ep(.78*Math.log(t/n)),n=t)},{passive:!1,signal:et.signal}),S.addEventListener("gestureend",e=>{void 0!==n&&(e.preventDefault(),n=void 0)},{passive:!1,signal:et.signal}),S.addEventListener("keydown",e=>{if("Escape"===e.key&&"store-crystals"===T){e.preventDefault(),G();return}if("transitioning"!==T){if("store-crystals"===T&&("ArrowUp"===e.key||"ArrowDown"===e.key)){e.preventDefault(),y?.cycle("ArrowDown"===e.key?1:-1),em();return}if("Enter"===e.key&&"building"===T){e.preventDefault(),$();return}("ArrowLeft"===e.key||"ArrowRight"===e.key)&&(e.preventDefault(),K.azimuth+="ArrowLeft"===e.key?-.23:.23,em()),("+"===e.key||"="===e.key||"-"===e.key)&&(e.preventDefault(),ep("-"===e.key?-.12:.12))}},{signal:et.signal}),ef(performance.now(),!0),s.ready({triangles:l.info.render.triangles,drawCalls:l.info.render.calls})}catch(e){a.aborted||(console.warn("Dreamscape could not load",e),s.fallback()),ea();return}function ec(e,t){return Math.atan2(Math.sin(t-e),Math.cos(t-e))}function ed(){Y=!1,"building"!==T&&(W=0,V=0,y?.update(0,null),w?.update(0,eo),X("building"),l.shadowMap.needsUpdate=!0),K.azimuth+=ec(K.azimuth,g.yo.azimuth),K.elevation=g.yo.elevation,K.zoom=0,em()}function ef(t,a=!1){if(I)return;let i="transitioning"===T||Math.abs(K.azimuth-H.azimuth)>.002||Math.abs(K.elevation-H.elevation)>.002||Math.abs(K.zoom-H.zoom)>.001;if(!a&&!P.matches&&!i&&t-Z<32)return;Z=t;let n=Math.min(96,t-(J||t-16));if(J=t,y&&"transitioning"===T){let t=V,a=n/1650;V=P.matches?W:W?Math.min(1,V+a):Math.max(0,V-a),W&&t<.32&&V>=.32&&(K.azimuth+=ec(K.azimuth,.12),K.elevation=.235),V===W&&(X(W?"store-crystals":"building"),l.shadowMap.needsUpdate=!0),e.dataset.crystalProgress=V.toFixed(3)}y?.update(V,P.matches?null:.001*t),w?.update(V,eo);let o=P.matches?1:1-Math.exp(-n/77);H.azimuth+=(K.azimuth-H.azimuth)*o,H.elevation+=(K.elevation-H.elevation)*o,H.zoom+=(K.zoom-H.zoom)*o;let{position:r,target:s}=(0,g.jh)(H,z);R.position.set(...r);let c=H.zoom*H.zoom*(3-2*H.zoom),d=Math.max(0,(V-.32)/.68),f=d*d*(3-2*d),u=(z?49:43)-(z?11:12)*c,m=u+((z?53:43)-u)*f;if(Math.abs(R.fov-m)>.05&&(R.fov=m,R.updateProjectionMatrix()),ee.set(...s),f>0){let e=H.azimuth,t=87/(2*Math.tan(53*Math.PI/360)*R.aspect),a=z?Math.max(196-10*H.zoom,t):128-16*H.zoom,i=Math.max(.21,Math.min(.78,H.elevation));R.position.set(R.position.x+(Math.sin(e)*a-R.position.x)*f,R.position.y+(36+Math.sin(i)*a-R.position.y)*f,R.position.z+(Math.cos(e)*a-R.position.z)*f),ee.set(ee.x*(1-f),ee.y+(36-ee.y)*f,ee.z*(1-f))}if(R.lookAt(ee),b&&(a||Q.distanceToSquared(R.position)>100)&&(!function(e,t,a){let i=a?49:82;for(let{mesh:a,matrices:n,positions:o}of e){let e=o.map((e,a)=>({index:a,distance:e.distanceToSquared(t)})).filter(e=>e.distance<i*i).sort((e,t)=>e.distance-t.distance);a.count=Math.min(a.instanceMatrix.count,e.length);for(let t=0;t<a.count;t++)a.setMatrixAt(t,n[e[t].index]);a.instanceMatrix.needsUpdate=!0}}(b,R.position,z),Q.copy(R.position)),!P.matches)for(let e of(_.material.uniforms.time.value=.001*t,O))e.uniforms.time.value=.001*t;l.render(k,R),e.classList.toggle("inspecting",H.zoom>.55),e.dataset.zoom=K.zoom.toFixed(3),e.dataset.azimuth=K.azimuth.toFixed(3),e.dataset.elevation=K.elevation.toFixed(3),e.dataset.position=R.position.toArray().map(e=>e.toFixed(1)).join(",")}function eu(e){E=0,L&&!I&&!document.hidden&&(ef(e),P.matches||j&&"transitioning"!==T||em())}function em(){E||!L||I||document.hidden||(E=requestAnimationFrame(eu))}let ep=e=>("transitioning"===T||(K.zoom=Math.max(0,Math.min(1,K.zoom+e)),em()),K.zoom);return document.addEventListener("visibilitychange",em,{signal:et.signal}),{setActive(e){L!==e&&(L=e,e?(J=0,em()):(cancelAnimationFrame(E),E=0))},setObscured(e){j=e,e||em()},zoomBy:ep,zoom:()=>K.zoom,reset:ed,restoreBuilding:G,enterCrystals:$,transitioning:()=>"transitioning"===T,dispose:ea}}}}]);