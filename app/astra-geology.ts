import * as T from 'three';
import {motherboardBounds} from './world-config';
import {lowerWorks} from './city-districts';

export const substrateOpening={left:40,right:57,north:-49,south:49};

export function createAstraSubstrate(parent:T.Object3D,paint:T.Material,base:T.Material){
  const root=new T.Group();root.name='Astra_MotherboardGeology';parent.add(root);
  function slab(name:string,left:number,right:number,north:number,south:number,y:number,height:number,material:T.Material){
    const holeLeft=lowerWorks.x-lowerWorks.width/2,holeRight=lowerWorks.x+lowerWorks.width/2,holeNorth=lowerWorks.z-lowerWorks.depth/2,holeSouth=lowerWorks.z+lowerWorks.depth/2;
    if(left<holeLeft&&right>holeRight&&north<holeNorth&&south>holeSouth){
      slab(name+'_West',left,holeLeft,north,south,y,height,material);slab(name+'_East',holeRight,right,north,south,y,height,material);
      slab(name+'_North',holeLeft,holeRight,north,holeNorth,y,height,material);slab(name+'_South',holeLeft,holeRight,holeSouth,south,y,height,material);return;
    }
    const mesh=new T.Mesh(new T.BoxGeometry(right-left,height,south-north),material);mesh.name=name;
    mesh.position.set((left+right)/2,y,(north+south)/2);mesh.receiveShadow=true;root.add(mesh);
  }
  for(const [name,edge,north,south,y,height,material] of [
    ['Astra_Board',55,-53,211,-1.2,2,paint],
    ['Astra_Foundation',57,-55,213,-2.7,1,base],
  ] as const){
    slab(name+'_Walkable',-edge,40,north,south,y,height,material);
    slab(name+'_NorthCap',40,edge,north,-49,y,height,material);
    slab(name+'_SouthCap',40,edge,49,south,y,height,material);
    const border=name==='Astra_Foundation'?2:0;
    slab(name+'_CityWest',motherboardBounds.minX-border,-edge,motherboardBounds.minZ-border,motherboardBounds.maxZ+border,y,height,material);
    slab(name+'_CityEast',edge,motherboardBounds.maxX+border,motherboardBounds.minZ-border,motherboardBounds.maxZ+border,y,height,material);
    slab(name+'_CityNorth',-edge,edge,motherboardBounds.minZ-border,north,y,height,material);
    slab(name+'_CitySouth',-edge,edge,south,motherboardBounds.maxZ+border,y,height,material);
  }
  return root;
}

export function createAstraDataChannel(parent:T.Object3D){
  const geometry=new T.PlaneGeometry(14,98),material=new T.ShaderMaterial({
    uniforms:{time:{value:0},motion:{value:1}},
    vertexShader:'varying vec2 channelUv;void main(){channelUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform float time;uniform float motion;varying vec2 channelUv;
      void main(){float bank=smoothstep(0.0,.15,channelUv.x)*(1.0-smoothstep(.85,1.0,channelUv.x));
        float ripple=sin(channelUv.y*180.0+sin(channelUv.x*45.0)*.7-time*.4*motion);
        float pulse=pow(max(0.0,sin(channelUv.y*20.0-time*.18*motion)),18.0);
        vec3 deep=vec3(.015,.065,.08);vec3 current=vec3(.06,.17,.18);
        vec3 color=mix(deep,current,bank*(.32+ripple*.06))+vec3(.10,.16,.12)*pulse*bank*.3;
        gl_FragColor=vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side:T.DoubleSide,
  });
  const water=new T.Mesh(geometry,material);water.name='Astra_DeepDataCurrent';water.position.set(47,-16.8,0);water.rotation.x=-Math.PI/2;parent.add(water);
  return {water,update:(time:number,reduced:boolean)=>{material.uniforms.time.value=time;material.uniforms.motion.value=reduced?0:1}};
}