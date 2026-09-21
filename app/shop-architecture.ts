import * as T from 'three';
import {cityBlock,cityMaterials} from './city-architecture';
import {createArtificialTurf} from './city-gardens';

export function addShopArchitecture(parent:T.Object3D,kind:'kettle'|'shoe'|'radio'){
  const root=new T.Group();root.name='City_Storefront_'+kind;parent.add(root);
  const material=cityMaterials(kind==='kettle'?'#1b9296':kind==='shoe'?'#e87982':'#367daf');
  const box=(name:string,x:number,y:number,z:number,w:number,h:number,d:number,finish:T.Material,radius=.2)=>{
    const mesh=new T.Mesh(cityBlock(w,h,d,radius),finish);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);return mesh;
  };
  function glazing(x:number,y:number,z:number,width:number,height:number){
    box('Shop_WindowRecess',x,y,z,width+.18,height+.18,.12,material.ink);
    box('Shop_PanoramaGlazing',x,y,z+.09,width,height,.065,material.glass);
    for(const side of [-1,1])box('Shop_WindowMullion',x+side*width*.22,y,z+.13,.042,height,.035,material.pearl);
  }
  function rail(x:number,y:number,z:number,width:number){
    box('Shop_TerraceHandrail',x,y+.69,z,width,.055,.055,material.metal);
    const count=Math.ceil(width/.72);for(let index=0;index<=count;index++)box('Shop_TerraceBaluster',x-width/2+index/count*width,y+.35,z,.036,.7,.036,material.ink);
  }
  function sign(title:string,x:number,y:number,z:number,width:number){
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=180;const context=canvas.getContext('2d')!;
    context.fillStyle='#f1f2e9';context.fillRect(0,0,1024,180);context.fillStyle=kind==='shoe'?'#8d344b':'#185862';context.textAlign='center';context.textBaseline='middle';context.font='700 92px "Trebuchet MS", sans-serif';context.fillText(title,512,95,940);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
    const mesh=new T.Mesh(new T.PlaneGeometry(width,width*180/1024),new T.MeshBasicMaterial({map:texture,toneMapped:false}));mesh.name='Shop_BuildingWordmark';mesh.position.set(x,y,z);root.add(mesh);
  }
  if(kind==='kettle'){
    box('Kettle_SculptedGroundFloor',0,1.88,0,11.5,2.65,8.65,material.paint,.55);
    box('Kettle_ArchitecturalPlinth',0,.63,0,11.9,.23,9.1,material.pearl);
    box('Kettle_GalleryCornice',0,3.28,0,12,.27,9.15,material.pearl);
    for(const side of [-1,1]){
      glazing(side*3.25,1.93,4.37,2.8,1.82);
      box('Kettle_SideGalleryGlass',side*5.79,1.98,0,.05,1.77,6.4,material.glass);
      for(let mullion=0;mullion<5;mullion++)box('Kettle_SideGalleryMullion',side*5.825,1.98,-2.7+mullion*1.35,.035,1.83,.04,material.pearl);
    }
    glazing(0,1.81,4.47,2.3,2.3);box('Kettle_EntrancePull',.69,1.65,4.65,.035,.7,.04,material.metal);
    box('Kettle_EntryHood',0,3.69,4.64,5.1,.2,1.5,material.pearl);
    sign('COPPER KETTLE',0,3.52,5.41,4.8);
    for(const side of [-1,1]){
      const turf=createArtificialTurf(2.5,.64);turf.position.set(side*4.15,3.425,3.95);root.add(turf);
      rail(side*4.15,3.43,4.46,2.65);
    }
  }else if(kind==='shoe'){
    box('Sneaker_SculptedMidsole',0,.97,0,14.1,.36,8.45,material.pearl,.3);
    box('Sneaker_ContrastSoleBand',0,.72,0,14.18,.13,8.51,material.ink);
    glazing(3.14,2.83,4.02,4.72,1.72);
    box('Sneaker_GalleryEyebrow',3.14,3.87,4.12,5.27,.18,.85,material.pearl);
    const rim=new T.Mesh(new T.TorusGeometry(.94,.12,8,48),material.pearl);rim.position.set(-3.68,6.13,3.77);rim.name='Sneaker_StudioOculus';root.add(rim);
    const pane=new T.Mesh(new T.CircleGeometry(.86,40),material.glass);pane.position.set(-3.68,6.13,3.8);root.add(pane);
    for(const side of [-1,1]){const mullion=box('Sneaker_OculusMullion',-3.68,6.13,3.85,.05,1.7,.04,material.pearl);mullion.rotation.z=side*Math.PI/4}
    sign('SOLE STUDIO',2.7,1.34,4.28,4.7);
    const turf=createArtificialTurf(8,1.15);turf.position.set(1.7,.49,6.49);root.add(turf);
    for(const side of [-1,1]){
      const seat=box('Sneaker_TerraceSeat',1.7+side*2.5,.82,6.7,1.6,.17,.56,material.pearl);seat.rotation.y=.06*side;
      for(const end of [-1,1])box('Sneaker_SeatFoot',seat.position.x+end*.6,.63,6.7,.07,.32,.46,material.ink);
    }
  }else{
    box('Radio_RoofCornice',0,8.43,0,12.4,.21,6.4,material.pearl);
    const turf=createArtificialTurf(10.5,4.7);turf.position.set(0,8.57,0);root.add(turf);
    rail(0,8.57,2.7,10.4);
    sign('FREQUENCY',0,8.41,3.24,6.4);
  }
  return root;
}