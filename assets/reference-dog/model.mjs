import * as THREE from 'three';

export const MODEL_SPEC = {
  name: 'Reference Dog',
  units: 'meters',
  pose: 'neutral standing on four paws',
  referenceCount: 8,
  seed: 23092026,
  reconstruction: 'Artist-authored multi-view interpretation, not a calibrated scan',
};

const palette = {
  ivory: '#e5dfce',
  warmWhite: '#d7cfb8',
  brown: '#79502e',
  brownLight: '#987046',
  chocolate: '#392820',
  eyePatch: '#241f1b',
  muzzle: '#bfb197',
};

function randomSequence(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function color(value) { return new THREE.Color(value); }
const colors = Object.fromEntries(Object.entries(palette).map(([key, value]) => [key, color(value)]));
const smooth = (minimum, maximum, value) => THREE.MathUtils.smoothstep(value, minimum, maximum);
const mix = (first, second, amount) => first.clone().lerp(second, THREE.MathUtils.clamp(amount, 0, 1));

export function coatColor(point, region = 'body') {
  const {x, y, z} = point;
  if (region === 'ear') {
    return mix(colors.chocolate, colors.brown, smooth(.165, .285, z));
  }
  if (region === 'tail') return mix(colors.brown, colors.ivory, smooth(.285, .335, z));
  if (region === 'muzzle') return mix(colors.muzzle, colors.ivory, 1 - smooth(.232, .275, z));
  if (region === 'leg' || region === 'chest') return colors.ivory.clone();
  if (y < -.182 && z > .229) {
    const blazeWidth = .006 + Math.max(0, z - .292) * .15;
    const blazeCenter = .0025 + Math.sin((z - .27) * 45) * .0025;
    let result = colors.brown.clone();
    const eyeLeft = ((x + .041) / .040) ** 2 + ((z - .307) / .030) ** 2;
    const eyeRight = ((x - .041) / .037) ** 2 + ((z - .309) / .031) ** 2;
    const eyeMask = (1 - smooth(.6, 1.4, Math.min(eyeLeft, eyeRight))) * (1 - smooth(-.282, -.240, y));
    result.lerp(colors.eyePatch, eyeMask);
    const blaze = 1 - smooth(blazeWidth, blazeWidth + .005, Math.abs(x - blazeCenter));
    result.lerp(colors.ivory, blaze * smooth(.272, .305, z));
    if (z < .279) result.lerp(colors.muzzle, 1 - smooth(.245, .279, z));
    return result;
  }
  const collar = smooth(-.135, -.071, y + .010 * Math.sin(x * 51));
  const saddleBoundary = .187 + .010 * Math.sin(y * 44) + .006 * Math.sin(x * 75 + y * 28);
  const saddle = smooth(saddleBoundary - .010, saddleBoundary + .012, z) * collar;
  const whiteWhorl = Math.exp(-(((x - .030) / .018) ** 2 + ((y - .095) / .040) ** 2)) * .55;
  return mix(colors.ivory, colors.brown, saddle * (1 - whiteWhorl));
}

function furTexture() {
  const size = 256, data = new Uint8Array(size * size * 4);
  const random = randomSequence(MODEL_SPEC.seed + 41);
  for (let row = 0; row < size; row++) for (let column = 0; column < size; column++) {
    const index = (row * size + column) * 4;
    const grain = .91 + .045 * Math.sin(column * .8 + Math.sin(row * .045)) + .025 * random();
    data[index] = data[index + 1] = data[index + 2] = Math.round(grain * 255);
    data[index + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.name = 'Coat_fine_fiber_albedo';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function hairCardTexture() {
  const width=256,height=512,data=new Uint8Array(width*height*4),random=randomSequence(9173);
  const fibers=Array.from({length:85},()=>({center:.04+random()*.92,length:.60+random()*.4,width:.8+random()*1.05,phase:random()*Math.PI*2,shade:.72+random()*.25}));
  for(let row=0;row<height;row++){
    const progress=row/(height-1);
    for(const fiber of fibers){
      if(progress>fiber.length)continue;
      const center=(fiber.center+Math.sin(progress*6+fiber.phase)*.010)*width;
      const radius=fiber.width*Math.max(.04,Math.min(1,(fiber.length-progress)*14));
      for(let column=Math.max(0,Math.floor(center-radius*2));column<=Math.min(width-1,Math.ceil(center+radius*2));column++){
        const opacity=Math.exp(-Math.pow((column-center)/radius,2))*Math.min(1,progress*35+.65),index=(row*width+column)*4;
        if(opacity*255<=data[index+3])continue;
        const shade=Math.round(fiber.shade*255);data[index]=data[index+1]=data[index+2]=shade;data[index+3]=Math.round(opacity*255);
      }
    }
  }
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);texture.name='Groom_Strand_Atlas_RGBA';texture.colorSpace=THREE.SRGBColorSpace;
  texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;
  return texture;
}

function makeMesh(name, positions, indices, uv, vertexColors, material, parent) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (vertexColors) geometry.setAttribute('color', new THREE.Float32BufferAttribute(vertexColors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const sections = [
  [-.324, .009, .279, .015], [-.312, .039, .284, .045],
  [-.287, .069, .294, .063], [-.253, .079, .298, .072],
  [-.219, .079, .294, .073], [-.184, .066, .264, .076],
  [-.143, .072, .219, .090], [-.097, .086, .199, .090],
  [-.035, .089, .193, .087], [.040, .087, .190, .086],
  [.111, .081, .188, .080], [.170, .070, .185, .074],
  [.213, .042, .185, .051], [.231, .008, .185, .013],
];

function sectionAt(longitudinal) {
  const segment = Math.min(sections.length - 2, Math.floor(longitudinal * (sections.length - 1)));
  const amount = Math.min(1, longitudinal * (sections.length - 1) - segment);
  const eased = amount * amount * (3 - 2 * amount);
  return sections[segment].map((value, index) => index === 0
    ? THREE.MathUtils.lerp(value, sections[segment + 1][index], amount)
    : THREE.MathUtils.lerp(value, sections[segment + 1][index], eased));
}

function bodyPoint(longitudinal, angle) {
  const [depth, radius, center, height] = sectionAt(longitudinal);
  return new THREE.Vector3(Math.sin(angle) * radius, depth, center + Math.cos(angle) * height);
}

function makeSkin(parent, material) {
  const rings = 65, sides = 64, positions = [], indices = [], uv = [], vertexColors = [];
  const branches = [
    {name:'Fore_L', start:31, end:35, low:19, high:27, side:1, depth:-.121},
    {name:'Fore_R', start:31, end:35, low:37, high:45, side:-1, depth:-.121},
    {name:'Hind_L', start:52, end:56, low:19, high:27, side:1, depth:.151},
    {name:'Hind_R', start:52, end:56, low:37, high:45, side:-1, depth:.151},
  ];
  const addVertex = (point, texture, tint) => {
    const index = positions.length / 3;
    positions.push(...point.toArray());uv.push(...texture);vertexColors.push(tint.r, tint.g, tint.b);
    return index;
  };
  const quad = (first, second, third, fourth) => indices.push(first, second, third, first, third, fourth);
  for (let ring = 0; ring < rings; ring++) for (let side = 0; side < sides; side++) {
    const point = bodyPoint(ring / (rings - 1), side / sides * Math.PI * 2);
    addVertex(point, [side / sides, ring / (rings - 1)], coatColor(point));
  }
  for (let ring = 0; ring < rings - 1; ring++) for (let side = 0; side < sides; side++) {
    if (branches.some(branch => ring >= branch.start && ring < branch.end && side >= branch.low && side < branch.high)) continue;
    const next = (side + 1) % sides;
    quad(ring * sides + side, ring * sides + next, (ring + 1) * sides + next, (ring + 1) * sides + side);
  }
  for (const end of [0, rings - 1]) {
    const [depth, , center] = sectionAt(end / (rings - 1));
    const cap = addVertex(new THREE.Vector3(0, depth, center), [.5, end / (rings - 1)], coatColor(new THREE.Vector3(0, depth, center)));
    for (let side = 0; side < sides; side++) {
      const current = end * sides + side, next = end * sides + (side + 1) % sides;
      indices.push(...(end === 0 ? [cap, next, current] : [cap, current, next]));
    }
  }
  for (const branch of branches) {
    const rim = [];
    for (let side = branch.low; side < branch.high; side++) rim.push(branch.start * sides + side);
    for (let ring = branch.start; ring < branch.end; ring++) rim.push(ring * sides + branch.high);
    for (let side = branch.high; side > branch.low; side--) rim.push(branch.end * sides + side);
    for (let ring = branch.end; ring > branch.start; ring--) rim.push(ring * sides + branch.low);
    const centerX = branch.side * .058;
    let previous = rim;
    const rimCenter = new THREE.Vector3();
    for (const index of rim) rimCenter.add(new THREE.Vector3().fromArray(positions, index * 3));
    rimCenter.divideScalar(rim.length);
    const angles = rim.map(index => Math.atan2(positions[index * 3 + 1] - rimCenter.y, positions[index * 3] - rimCenter.x));
    const rows = [[.118,.029,.029,0],[.090,.028,.026,0],[.056,.025,.025,-.003],[.026,.031,.036,-.009],[.005,.032,.037,-.012],[0,.024,.029,-.012]];
    rows.forEach(([height, width, depth, offset], row) => {
      const current = angles.map((angle, index) => {
        const point = new THREE.Vector3(centerX + Math.cos(angle) * width, branch.depth + offset + Math.sin(angle) * depth, height);
        return addVertex(point, [index / angles.length, row / (rows.length - 1)], colors.ivory);
      });
      for (let index = 0; index < current.length; index++) quad(previous[index], previous[(index + 1) % current.length], current[(index + 1) % current.length], current[index]);
      previous = current;
    });
    const center = addVertex(new THREE.Vector3(centerX, branch.depth - .012, 0), [.5,.5], colors.ivory);
    for (let index = 0; index < previous.length; index++) indices.push(previous[index], previous[(index + 1) % previous.length], center);
  }
  const mesh = makeMesh('Dog_Continuous_QuadDerived_Skin', positions, indices, uv, vertexColors, material, parent);
  mesh.userData.topology = 'Connected ring surface with bridged four-limb branches; triangulated for glTF';
  return mesh;
}

function ellipsoid(parent, name, center, scale, material, region) {
  const geometry = new THREE.SphereGeometry(1, 40, 28);
  geometry.scale(...scale);geometry.translate(...center);
  if (region) {
    const attribute = geometry.getAttribute('position'), tint = [];
    for (let index = 0; index < attribute.count; index++) {
      const shade = coatColor(new THREE.Vector3().fromBufferAttribute(attribute, index), region);
      tint.push(shade.r, shade.g, shade.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(tint, 3));
  }
  const mesh = new THREE.Mesh(geometry, material);mesh.name = name;mesh.castShadow = mesh.receiveShadow = true;parent.add(mesh);
  return mesh;
}

class Groom {
  constructor(random, material, parent, cardsMaterial) {
    this.random = random;this.material = material;this.parent = parent;
    this.positions = [];this.indices = [];this.uv = [];this.colors = [];
    this.cardsMaterial=cardsMaterial;this.cards={positions:[],indices:[],uv:[],colors:[]};
    this.strands = 0;
  }
  strand(points, width, tint, variation = 1) {
    const sides = 3, start = this.positions.length / 3;
    const direction = new THREE.Vector3(), reference = new THREE.Vector3(1, 0, 0);
    const sideways = new THREE.Vector3(), perpendicular = new THREE.Vector3();
    for (let step = 0; step < points.length; step++) {
      direction.subVectors(points[Math.min(points.length - 1, step + 1)], points[Math.max(0, step - 1)]).normalize();
      reference.set(Math.abs(direction.x) > .8 ? 0 : 1, Math.abs(direction.x) > .8 ? 1 : 0, 0);
      sideways.crossVectors(direction, reference).normalize();perpendicular.crossVectors(direction, sideways).normalize();
      const progress = step / (points.length - 1), radius = width * (.85 + .15 * Math.sin(progress * Math.PI)) * Math.max(.035, (1 - progress) ** .6);
      for (let side = 0; side < sides; side++) {
        const angle = side / sides * Math.PI * 2;
        const vertex = points[step].clone().addScaledVector(sideways, Math.cos(angle) * radius).addScaledVector(perpendicular, Math.sin(angle) * radius);
        vertex.z = Math.max(.0015, vertex.z);
        this.positions.push(...vertex.toArray());this.uv.push(side / sides, progress);
        const lift = variation * (.84 + .16 * progress);
        this.colors.push(tint.r * lift, tint.g * lift, tint.b * lift);
      }
      if (step) for (let side = 0; side < sides; side++) {
        const first = start + (step - 1) * sides + side, second = start + (step - 1) * sides + (side + 1) % sides;
        const third = start + step * sides + (side + 1) % sides, fourth = start + step * sides + side;
        this.indices.push(first, second, third, first, third, fourth);
      }
    }
    this.indices.push(start + 2, start + 1, start);
    const tip = start + (points.length - 1) * sides;this.indices.push(tip, tip + 1, tip + 2);
    this.strands++;
  }
  lock(root, normal, flow, length, tint, {width=.00025, fibers=5, wave=.002, lift=.005} = {}) {
    const tangent = flow.clone().addScaledVector(normal, -flow.dot(normal));
    if (tangent.lengthSq() < .01) tangent.set(.3, .2, -.5).addScaledVector(normal, .4);
    tangent.normalize();
    const across = new THREE.Vector3().crossVectors(normal, tangent).normalize();
    const phase = this.random() * Math.PI * 2;
    if(this.cardsMaterial){
      const start=this.cards.positions.length/3,cardWidth=Math.max(.0035,Math.min(.012,length*.20));
      for(let step=0;step<=8;step++){
        const progress=step/8,center=root.clone().addScaledVector(tangent,length*progress);
        center.addScaledVector(normal,.002+lift*Math.sin(Math.PI*progress*.78));center.z-=length*.14*progress*progress;
        center.addScaledVector(across,wave*Math.sin(progress*Math.PI*2+phase)*Math.sin(progress*Math.PI*.8));
        for(let column=0;column<3;column++){
          const point=center.clone().addScaledVector(across,(column-1)*cardWidth*(1-progress*.43));
          point.addScaledVector(normal,column===1?cardWidth*.10:0);point.z=Math.max(.001,point.z);
          this.cards.positions.push(...point.toArray());this.cards.uv.push(column/2,progress);
          const brightness=.92+progress*.08;this.cards.colors.push(tint.r*brightness,tint.g*brightness,tint.b*brightness);
        }
        if(step)for(let column=0;column<2;column++){
          const first=start+(step-1)*3+column,second=first+1,third=start+step*3+column+1,fourth=third-1;
          this.cards.indices.push(first,second,third,first,third,fourth);
        }
      }
    }
    for (let fiber = 0; fiber < Math.min(fibers,2); fiber++) {
      const spread = (this.random() - .5) * .0035;
      const start = root.clone().addScaledVector(across, spread).addScaledVector(tangent, this.random() * .002);
      const strandLength = length * (.77 + this.random() * .4), points = [];
      for (let step = 0; step <= 7; step++) {
        const progress = step / 7;
        const point = start.clone().addScaledVector(tangent, strandLength * progress);
        point.addScaledVector(normal, .0008 + lift * Math.sin(Math.PI * progress * .85));
        point.addScaledVector(across, wave * Math.sin(progress * Math.PI * 2 + phase) * Math.sin(progress * Math.PI * .8));
        point.z -= strandLength * .14 * progress * progress;
        points.push(point);
      }
      this.strand(points, width * (.7 + this.random() * .5), tint, .80 + this.random() * .43);
    }
  }
  finish(name) {
    if(this.cards.positions.length){
      const cards=makeMesh(name+'_Textured_Locks',this.cards.positions,this.cards.indices,this.cards.uv,this.cards.colors,this.cardsMaterial,this.parent);
      cards.userData.groom='UV-mapped folded hair cards with embedded strand alpha atlas';
    }
    const mesh = makeMesh(name, this.positions, this.indices, this.uv, this.colors, this.material, this.parent);
    mesh.userData.strands = this.strands;
    mesh.userData.groom = 'Closed tapered polygon fibers; UV along strand; no hair-extension dependency';
    return mesh;
  }
}

function sampleEllipsoid(random, center, scale) {
  const vertical = random() * 2 - 1, angle = random() * Math.PI * 2, radius = Math.sqrt(1 - vertical * vertical);
  const unit = new THREE.Vector3(radius * Math.cos(angle), radius * Math.sin(angle), vertical);
  const point = new THREE.Vector3(unit.x * scale[0] + center[0], unit.y * scale[1] + center[1], unit.z * scale[2] + center[2]);
  const normal = new THREE.Vector3(unit.x / scale[0], unit.y / scale[1], unit.z / scale[2]).normalize();
  return {point, normal};
}

export function buildDog({density = 1} = {}) {
  const random = randomSequence(MODEL_SPEC.seed), root = new THREE.Group();
  root.name = 'Reference_Dog_Standing';root.userData = {...MODEL_SPEC};
  const anatomy = new THREE.Group();anatomy.name = '01_Editable_Anatomy';root.add(anatomy);
  const face = new THREE.Group();face.name = '02_Eyes_Nose_Mouth';root.add(face);
  const coat = new THREE.Group();coat.name = '03_Region_Separated_Groom';root.add(coat);
  const texture = furTexture();
  const fur = new THREE.MeshPhysicalMaterial({name:'Fur_PBR_UV_Albedo_VertexTint',map:texture,vertexColors:true,roughness:.79,metalness:0,sheen:.045,sheenColor:'#b2a99a',sheenRoughness:.82});
  const cardsMaterial=new THREE.MeshStandardMaterial({name:'Fur_Locks_PBR_Alpha_Cutout',map:hairCardTexture(),vertexColors:true,alphaTest:.36,side:THREE.DoubleSide,roughness:.93});cardsMaterial.alphaToCoverage=true;
  const skinMaterial = fur.clone();skinMaterial.name = 'Undercoat_PBR_Painted_Pattern';skinMaterial.roughness = .91;skinMaterial.sheen=0;
  const eyeMaterial = new THREE.MeshPhysicalMaterial({name:'Eyes_Dark_Umber_Gloss',color:'#100e0b',roughness:.24,clearcoat:.5,clearcoatRoughness:.13,ior:1.4});
  const lidMaterial = new THREE.MeshStandardMaterial({name:'Eyelid_Warm_Charcoal',color:'#29211c',roughness:.67});
  const noseMaterial = new THREE.MeshPhysicalMaterial({name:'Nose_Charcoal_Satin',color:'#201c19',roughness:.39,clearcoat:.15});
  const recessMaterial = new THREE.MeshStandardMaterial({name:'Nostril_And_Lip_Recess',color:'#090706',roughness:.82});
  makeSkin(anatomy, skinMaterial);
  const ears = [];
  for (const side of [-1, 1]) {
    const center = [side * .079, -.230, .269], scale = [.031,.041,.058];
    ears.push({center,scale,side});ellipsoid(anatomy,`Ear_${side < 0 ? 'R' : 'L'}_Drooping_Cage`,center,scale,skinMaterial,'ear');
    ellipsoid(face,`Eye_${side < 0 ? 'R' : 'L'}_Lid`,[side*.039,-.297,.311],[.0190,.014,.0194],lidMaterial);
    ellipsoid(face,`Eye_${side < 0 ? 'R' : 'L'}_Cornea`,[side*.039,-.301,.311],[.0158,.0105,.0169],eyeMaterial);
    ellipsoid(anatomy,`Muzzle_${side < 0 ? 'R' : 'L'}_WhiskerPad`,[side*.023,-.302,.263],[.033,.024,.025],skinMaterial,'muzzle');
  }
  ellipsoid(anatomy,'Chin_Short_Beard_Cage',[0,-.292,.239],[.035,.024,.022],skinMaterial,'muzzle');
  const nose = ellipsoid(face,'Nose_Rounded_Triangle',[0,-.332,.282],[.0205,.012,.014],noseMaterial);
  const nosePositions = nose.geometry.getAttribute('position');
  for (let index = 0; index < nosePositions.count; index++) {
    const height = (nosePositions.getZ(index) - .268) / .028;
    nosePositions.setX(index,nosePositions.getX(index) * (.65 + .35 * smooth(0, .65, height)));
  }
  nose.geometry.computeVertexNormals();
  for (const side of [-1,1]) ellipsoid(face,`Nostril_${side < 0 ? 'R' : 'L'}`,[side*.009,-.341,.280],[.0047,.002,.0042],recessMaterial);
  ellipsoid(face,'Philtrum',[0,-.324,.270],[.0016,.0016,.0035],recessMaterial);
  const lip = new THREE.CatmullRomCurve3([new THREE.Vector3(-.015,-.316,.251),new THREE.Vector3(0,-.318,.250),new THREE.Vector3(.015,-.316,.251)]);
  const mouth = new THREE.Mesh(new THREE.TubeGeometry(lip,20,.0011,6,false),recessMaterial);mouth.name='Closed_Mouth_Line';face.add(mouth);

  const bodyGroom = new Groom(random,fur,coat,cardsMaterial);
  for (let guide = 0; guide < 2900*density; guide++) {
    const longitudinal = .40 + random() * .585, angle = random() * Math.PI * 2;
    const point = bodyPoint(longitudinal,angle);
    const normal = new THREE.Vector3(Math.sin(angle),0,Math.cos(angle)).normalize();
    const flow = new THREE.Vector3(normal.x*.18,.18,-1);
    const length = .036 + random()*.035;
    bodyGroom.lock(point,normal,flow,length,coatColor(point),{width:.00025,fibers:5,wave:.0035,lift:.008});
  }
  bodyGroom.finish('Groom_White_Chest_Brown_Saddle_Long_Coat');
  const legs = new Groom(random,fur,coat,cardsMaterial);
  for (const depth of [-.121,.151]) for (const side of [-1,1]) for (let guide = 0; guide < 430*density; guide++) {
    const angle = random()*Math.PI*2, height = .010 + random()*.129;
    const radius = .026 + .006*(1-smooth(.03,.09,height));
    const normal = new THREE.Vector3(Math.cos(angle),Math.sin(angle),.1).normalize();
    const point = new THREE.Vector3(side*.058+normal.x*radius,depth+normal.y*radius-.005,height);
    legs.lock(point,normal,new THREE.Vector3(normal.x*.28,normal.y*.14,-1),.025+random()*.03,colors.ivory,{width:.00023,fibers:5,wave:.003,lift:.006});
  }
  legs.finish('Groom_Four_White_Feathered_Legs');
  const head = new Groom(random,fur,coat,cardsMaterial);
  for (let guide = 0; guide < 1800*density; guide++) {
    const longitudinal = .035 + random()*.365, angle = random()*Math.PI*2;
    const point = bodyPoint(longitudinal,angle);
    const normal = new THREE.Vector3(Math.sin(angle),-.25,Math.cos(angle)).normalize();
    if (point.y < -.279 && Math.min(Math.hypot((point.x-.039)/1.05,point.z-.311),Math.hypot((point.x+.039)/1.05,point.z-.311)) < .021) continue;
    if (point.y < -.295 && point.z < .286 && Math.abs(point.x)<.037) continue;
    const side = point.x < 0 ? -1 : 1;
    const flow = point.z > .343 ? new THREE.Vector3(side*.6,.8,-.12) : new THREE.Vector3(side*.65,-.15,-.75);
    head.lock(point,normal,flow,.022+random()*.025,coatColor(point),{width:.00017,fibers:5,wave:.0015,lift:.0035});
  }
  head.finish('Groom_Head_White_Blaze_Dark_Eye_Patches');
  const earGroom = new Groom(random,fur,coat,cardsMaterial);
  for (const ear of ears) for (let guide = 0; guide < 850*density; guide++) {
    const {point,normal} = sampleEllipsoid(random,ear.center,ear.scale);
    earGroom.lock(point,normal,new THREE.Vector3(ear.side*.14,-.09,-1),.029+random()*.026,coatColor(point,'ear'),{width:.00019,fibers:5,wave:.0024,lift:.004});
  }
  earGroom.finish('Groom_Brown_Curtain_Ears_Dark_Tips');
  const beard = new Groom(random,fur,coat,cardsMaterial);
  for (const side of [-1,1]) for (let guide = 0; guide < 410*density; guide++) {
    const {point,normal} = sampleEllipsoid(random,[side*.023,-.302,.263],[.033,.024,.025]);
    if (point.y > -.297) continue;
    beard.lock(point,normal,new THREE.Vector3(side*.6,-.22,-.7),.020+random()*.024,coatColor(point,'muzzle'),{width:.00015,fibers:6,wave:.0013,lift:.0017});
  }
  for (let guide = 0; guide < 200*density; guide++) {
    const {point,normal}=sampleEllipsoid(random,[0,-.292,.239],[.035,.024,.022]);
    if (point.y > -.289) continue;
    beard.lock(point,normal,new THREE.Vector3(point.x*5,-.12,-1),.023+random()*.017,colors.ivory,{width:.00014,fibers:5,wave:.0017,lift:.002});
  }
  beard.finish('Groom_Cream_Moustache_And_White_Beard');
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0,.199,.245),new THREE.Vector3(.005,.246,.287),new THREE.Vector3(.011,.249,.343),
    new THREE.Vector3(.014,.216,.375),new THREE.Vector3(.012,.172,.369),new THREE.Vector3(.007,.150,.334),
  ]);
  const tailGeometry = new THREE.TubeGeometry(tailCurve,52,.011,16,false),tailColors=[];
  const tailPositions=tailGeometry.getAttribute('position');
  for(let index=0;index<tailPositions.count;index++){const tint=coatColor(new THREE.Vector3().fromBufferAttribute(tailPositions,index),'tail');tailColors.push(tint.r,tint.g,tint.b)}
  tailGeometry.setAttribute('color',new THREE.Float32BufferAttribute(tailColors,3));
  const tail = new THREE.Mesh(tailGeometry,skinMaterial);tail.name='Tail_Over_Back_Curl_Cage';tail.castShadow=true;anatomy.add(tail);
  const plume = new Groom(random,fur,coat,cardsMaterial);
  for (let guide=0;guide<1100*density;guide++) {
    const progress=random(),center=tailCurve.getPointAt(progress),tangent=tailCurve.getTangentAt(progress),angle=random()*Math.PI*2;
    const across=new THREE.Vector3(1,0,0),perpendicular=new THREE.Vector3().crossVectors(tangent,across).normalize();
    const normal=across.clone().multiplyScalar(Math.cos(angle)).addScaledVector(perpendicular,Math.sin(angle));
    const point=center.clone().addScaledVector(normal,.0105);
    const flow=tangent.clone().multiplyScalar(.6).addScaledVector(normal,.5);flow.z-=.2;
    const tint=mix(colors.brown,colors.ivory,smooth(.16,.44,progress));
    plume.lock(point,normal,flow,.035+random()*.045,tint,{width:.00019,fibers:5,wave:.0028,lift:.010});
  }
  plume.finish('Groom_Curled_Brown_Root_White_Tail_Plume');
  const whiskers=new Groom(random,fur,coat);
  for(const side of [-1,1])for(let index=0;index<12;index++){
    const rootPoint=new THREE.Vector3(side*(.020+random()*.009),-.326,.258+random()*.009);
    const curve=new THREE.CatmullRomCurve3([rootPoint,rootPoint.clone().add(new THREE.Vector3(side*.022,-.013,-.003)),rootPoint.clone().add(new THREE.Vector3(side*(.040+random()*.014),-.016,-.010-random()*.006))]);
    whiskers.strand(curve.getPoints(8),.000065,colors.ivory,.86);
  }
  whiskers.finish('Groom_Fine_Muzzle_Whiskers');
  root.traverse(object=>{
    if(!object.isMesh)return;
    const positions=object.geometry.getAttribute('position');
    for(let index=0;index<positions.count;index++){
      const height=positions.getZ(index),depth=positions.getY(index);
      positions.setZ(index,height<.14?height*.74:height-.0364);
      if(depth>-.18)positions.setY(index,-.18+(depth+.18)*.86);
    }
    object.geometry.computeVertexNormals();object.geometry.computeBoundingBox();
  });
  root.rotation.x = -Math.PI/2;
  root.updateMatrixWorld(true);
  return root;
}

export function modelStatistics(root) {
  const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());
  let triangles=0,vertices=0,strands=0,meshes=0;
  const materialNames=new Set();
  root.traverse(object=>{
    if(!object.isMesh)return;
    meshes++;vertices+=object.geometry.getAttribute('position').count;
    triangles+=(object.geometry.index?.count??object.geometry.getAttribute('position').count)/3;
    strands+=object.userData.strands??0;
    materialNames.add(object.material.name);
  });
  return {meshes,vertices,triangles,strands,materials:[...materialNames],bounds:{min:bounds.min.toArray(),max:bounds.max.toArray(),size:size.toArray()}};
}
