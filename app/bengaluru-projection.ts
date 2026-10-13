/**
 * Geographic core for the Bengaluru planet.
 *
 * Three coordinate representations are kept apart and every one stays recoverable:
 *   WGS84 longitude/latitude  ->  local metric East/North/Up around a documented origin
 *                              ->  fictional planet coordinates (Y-up, metres).
 * The planet mapping is a spherical cap built like an azimuthal-equidistant projection
 * centred on the origin: radial distance becomes arc length and bearing is preserved, so
 * the city keeps its proportions while the curvature is chosen independently of Earth.
 * Planet space is Y-up with x=East and z=-North (Three.js ground convention) so a view
 * from above reads north-up.
 */
export type LonLat=[lon:number,lat:number];
export type Vec3=[x:number,y:number,z:number];
export type LocalPoint={east:number;north:number;up:number};
export type GeodeticPoint={lon:number;lat:number;height:number};

export const wgs84={a:6378137,f:1/298.257223563,get b(){return this.a*(1-this.f)},get e2(){return this.f*(2-this.f)}};
const rad=Math.PI/180,deg=180/Math.PI;

export function geodeticToEcef(lon:number,lat:number,height=0):Vec3{
 const phi=lat*rad,lam=lon*rad,sinPhi=Math.sin(phi),cosPhi=Math.cos(phi),n=wgs84.a/Math.sqrt(1-wgs84.e2*sinPhi*sinPhi);
 return [(n+height)*cosPhi*Math.cos(lam),(n+height)*cosPhi*Math.sin(lam),(n*(1-wgs84.e2)+height)*sinPhi];
}

export function ecefToGeodetic([x,y,z]:Vec3):GeodeticPoint{
 const lam=Math.atan2(y,x),p=Math.hypot(x,y);let phi=Math.atan2(z,p*(1-wgs84.e2)),height=0;
 for(let i=0;i<6;i++){const sinPhi=Math.sin(phi),n=wgs84.a/Math.sqrt(1-wgs84.e2*sinPhi*sinPhi);height=p/Math.cos(phi)-n;phi=Math.atan2(z,p*(1-wgs84.e2*n/(n+height)))}
 return {lon:lam*deg,lat:phi*deg,height};
}

export type LocalFrame={
 origin:GeodeticPoint;
 /** WGS84 -> topocentric East/North/Up metres (PROJ "topocentric" convention). */
 toLocal(lon:number,lat:number,height?:number):LocalPoint;
 toGeodetic(east:number,north:number,up?:number):GeodeticPoint;
};

export function createLocalFrame(origin:{lon:number;lat:number;height?:number}):LocalFrame{
 const phi=origin.lat*rad,lam=origin.lon*rad,sinPhi=Math.sin(phi),cosPhi=Math.cos(phi),sinLam=Math.sin(lam),cosLam=Math.cos(lam),height=origin.height??0,[ox,oy,oz]=geodeticToEcef(origin.lon,origin.lat,height);
 return {
  origin:{lon:origin.lon,lat:origin.lat,height},
  toLocal(lon,lat,h=0){
   const [x,y,z]=geodeticToEcef(lon,lat,h),dx=x-ox,dy=y-oy,dz=z-oz;
   return {east:-sinLam*dx+cosLam*dy,north:-sinPhi*cosLam*dx-sinPhi*sinLam*dy+cosPhi*dz,up:cosPhi*cosLam*dx+cosPhi*sinLam*dy+sinPhi*dz};
  },
  toGeodetic(east,north,up=0){
   return ecefToGeodetic([ox-sinLam*east-sinPhi*cosLam*north+cosPhi*cosLam*up,oy+cosLam*east-sinPhi*sinLam*north+cosPhi*sinLam*up,oz+cosPhi*north+sinPhi*up]);
  },
 };
}

export type PlanetProjectionOptions={
 /** Horizontal distance from the origin to the furthest mapped point, metres. */
 cityRadiusM:number;
 /** Angular diameter the mapped city should occupy on the planet, degrees (90-140 reads well). */
 capAngleDeg:number;
};

export type PlanetProjection={
 readonly cityRadiusM:number;
 readonly capAngleDeg:number;
 /** Fictional planet radius in metres: cityRadius / (capAngle/2). */
 readonly radius:number;
 /** Local East/North/height -> planet position. Bearing from the origin is preserved; rho becomes arc length. */
 toPlanet(east:number,north:number,height?:number,target?:Vec3):Vec3;
 /** Inverse of toPlanet for picking, labels and debugging. */
 fromPlanet(x:number,y:number,z:number):{east:number;north:number;height:number};
 /** Unit radial direction (local "up") at a local point. */
 up(east:number,north:number,target?:Vec3):Vec3;
 /** Polar angle from the crown, radians. */
 theta(east:number,north:number):number;
};

export function createPlanetProjection({cityRadiusM,capAngleDeg}:PlanetProjectionOptions):PlanetProjection{
 if(!(cityRadiusM>0)||!(capAngleDeg>0)||capAngleDeg>=360)throw new RangeError('planet projection needs a positive city radius and a cap angle below 360 degrees');
 const thetaMax=capAngleDeg/2*rad,radius=cityRadiusM/thetaMax;
 const polar=(east:number,north:number)=>{const rho=Math.hypot(east,north),theta=rho/radius;return rho<1e-9?{theta,sx:0,sz:0}:{theta,sx:east/rho,sz:north/rho}};
 return {
  cityRadiusM,capAngleDeg,radius,
  theta:(east,north)=>polar(east,north).theta,
  up(east,north,target=[0,0,0]){const {theta,sx,sz}=polar(east,north),s=Math.sin(theta);target[0]=s*sx;target[1]=Math.cos(theta);target[2]=0-s*sz;return target},
  toPlanet(east,north,height=0,target=[0,0,0]){const {theta,sx,sz}=polar(east,north),r=radius+height,s=r*Math.sin(theta);target[0]=s*sx;target[1]=r*Math.cos(theta);target[2]=0-s*sz;return target},
  fromPlanet(x,y,z){const r=Math.hypot(x,y,z),theta=Math.acos(Math.max(-1,Math.min(1,y/r))),rho=theta*radius,horizontal=Math.hypot(x,z);return horizontal<1e-9?{east:0,north:0,height:r-radius}:{east:rho*x/horizontal,north:-rho*z/horizontal,height:r-radius}},
 };
}

export type WrappedPlanetOptions={localBounds:readonly [number,number,number,number];anchor?:readonly [number,number];radius?:number};

export function createWrappedPlanetProjection({localBounds,anchor=[0,0],radius}:WrappedPlanetOptions):PlanetProjection&{kind:'whole-globe';localBounds:readonly [number,number,number,number]}{
 const [west,south,east,north]=localBounds,width=east-west,height=north-south;
 if(!localBounds.every(Number.isFinite)||width<=0||height<=0||!anchor.every(Number.isFinite))throw new RangeError('whole-globe projection needs finite local bounds and anchor');
 const globeRadius=radius??Math.max(width/(2*Math.PI),height/Math.PI);
 if(!Number.isFinite(globeRadius)||globeRadius<=0)throw new RangeError('whole-globe radius must be finite and positive');
 const anchorLongitude=((anchor[0]-west)/width-.5)*Math.PI*2,anchorLatitude=((anchor[1]-south)/height-.5)*Math.PI;
 const sinLongitude=Math.sin(anchorLongitude),cosLongitude=Math.cos(anchorLongitude),sinLatitude=Math.sin(anchorLatitude),cosLatitude=Math.cos(anchorLatitude);
 const eastAxis:Vec3=[cosLongitude,0,-sinLongitude],northAxis:Vec3=[-sinLatitude*sinLongitude,cosLatitude,-sinLatitude*cosLongitude],upAxis:Vec3=[cosLatitude*sinLongitude,sinLatitude,cosLatitude*cosLongitude];
 const up=(localEast:number,localNorth:number,target:Vec3=[0,0,0])=>{
  const longitude=((localEast-west)/width-.5)*Math.PI*2,latitude=((localNorth-south)/height-.5)*Math.PI;
  const cosine=Math.cos(latitude),rawX=cosine*Math.sin(longitude),rawY=Math.sin(latitude),rawZ=cosine*Math.cos(longitude);
  target[0]=rawX*eastAxis[0]+rawZ*eastAxis[2];target[1]=rawX*upAxis[0]+rawY*upAxis[1]+rawZ*upAxis[2];target[2]=-(rawX*northAxis[0]+rawY*northAxis[1]+rawZ*northAxis[2]);return target;
 };
 return {
  kind:'whole-globe',localBounds,radius:globeRadius,capAngleDeg:360,
  cityRadiusM:Math.max(...[[west,south],[east,south],[east,north],[west,north]].map(([localEast,localNorth])=>Math.hypot(localEast-anchor[0],localNorth-anchor[1]))),
  up,
  theta:(localEast,localNorth)=>Math.acos(Math.max(-1,Math.min(1,up(localEast,localNorth)[1]))),
  toPlanet(localEast,localNorth,elevation=0,target=[0,0,0]){up(localEast,localNorth,target);const distance=globeRadius+elevation;target[0]*=distance;target[1]*=distance;target[2]*=distance;return target},
  fromPlanet(planetX,planetY,planetZ){
   const distance=Math.hypot(planetX,planetY,planetZ);
   if(!Number.isFinite(distance)||distance===0)throw new RangeError('planet centre has no geographic direction');
   const rawX=planetX*eastAxis[0]+planetY*upAxis[0]-planetZ*northAxis[0],rawY=planetY*upAxis[1]-planetZ*northAxis[1],rawZ=planetX*eastAxis[2]+planetY*upAxis[2]-planetZ*northAxis[2];
   const longitude=Math.atan2(rawX,rawZ),latitude=Math.asin(Math.max(-1,Math.min(1,rawY/distance)));
   return {east:west+(longitude/(Math.PI*2)+.5)*width,north:south+(latitude/Math.PI+.5)*height,height:distance-globeRadius};
  },
 };
}

/** Flat tangent-plane placement used at sphereMorph=0; identical formula to the vertex shader. */
export function toFlatPlane(radius:number,east:number,north:number,height=0,target:Vec3=[0,0,0]):Vec3{target[0]=east;target[1]=radius+height;target[2]=-north;return target}

/**
 * Inserts evenly spaced vertices so that no segment exceeds maxSegment metres. A GPU vertex
 * stage only moves existing vertices, so long edges must be densified before bending; the
 * insertion is deterministic for a given polyline so adjacent tiles agree on shared edges.
 */
export function densifyPolyline(points:readonly (readonly [number,number])[],maxSegment:number):[number,number][]{
 if(points.length<2||!(maxSegment>0))return points.map(([x,y])=>[x,y]);
 const out:[number,number][]=[[points[0][0],points[0][1]]];
 for(let i=1;i<points.length;i++){
  const [ax,ay]=points[i-1],[bx,by]=points[i],length=Math.hypot(bx-ax,by-ay),pieces=Math.max(1,Math.ceil(length/maxSegment-1e-9));
  for(let k=1;k<=pieces;k++){const t=k/pieces;out.push([ax+(bx-ax)*t,ay+(by-ay)*t])}
 }
 return out;
}

export function densifyRing(ring:readonly (readonly [number,number])[],maxSegment:number):[number,number][]{
 if(ring.length<3)return ring.map(([x,y])=>[x,y]);
 const closed=densifyPolyline([...ring,ring[0]],maxSegment);closed.pop();return closed;
}
