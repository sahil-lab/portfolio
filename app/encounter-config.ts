export type Encounter={id:string;name:string;kind:'resident'|'curiosity'|'press';x:number;z:number;recipient?:boolean;dialogue:string[]};
export const encounters:Encounter[]=[
 {id:'press',name:'Packet Press',kind:'press',x:1,z:21,dialogue:['Four little diagnostics. No delivery is required to explore this kingdom.']},
 {id:'owl',name:'Mora · RAM librarian owl',kind:'resident',recipient:true,x:20,z:-3,dialogue:['Borrow a memory, leave room for the next thought.','My balcony books are temporary. My fondness for visitors is not.']},
 {id:'chameleon',name:'Hue · GPU artist chameleon',kind:'resident',recipient:true,x:30,z:23,dialogue:['A different light can tell a different story. Watch my colors!','The cinema loops a tiny original film. Geometry has stage fright.']},
 {id:'cloud',name:'Lag · grumpy latency cloud',kind:'resident',recipient:true,x:-29,z:24,dialogue:['I am not late. Everyone else is impatient.','Fine. That was a pleasant conversation. Eventually.']},
 {id:'gopher',name:'Miss · cache gopher',kind:'resident',x:10,z:8,dialogue:['Cache hit! You found me. Now you see me…','Sometimes I vanish. My conversation never requires a delivery.']},
 {id:'tortoises',name:'The Ledger tortoise family',kind:'resident',recipient:true,x:0,z:44,dialogue:['One careful step, one durable record. The little ones are learning.','We remember every visitor. Nobody needs a capsule to say hello.']},
 {id:'birds',name:'Bit birds',kind:'resident',x:-10,z:8,dialogue:['Pip-pip! A bright little flock spells hello.','Follow our wings toward the compiler kiln.']},
 {id:'capacitors',name:'Musical capacitors',kind:'curiosity',x:-10,z:19,dialogue:['A stored charge becomes a little pentatonic tune.']},
 {id:'baths',name:'Cooling-water baths',kind:'curiosity',x:10,z:19,dialogue:['Cool ripples gather around your feet. Take a breath.']},
 {id:'kiln',name:'Compiler kiln',kind:'curiosity',x:-10,z:4,dialogue:['Source goes in. A tiny glowing object comes out. A playful metaphor for compilation.']},
 {id:'woodland',name:'Cable-vine woodland',kind:'curiosity',x:10,z:3,dialogue:['The copper vines bow as you pass beneath their branches.']},
 {id:'crystals',name:'Crystal path',kind:'curiosity',x:0,z:-5,dialogue:['Footsteps wake a trail of luminous crystals.']},
 {id:'cinema',name:'Miniature cinema',kind:'curiosity',x:39,z:10,dialogue:['Now showing: A Vertex Finds Its Shape and Three Bits in Orbit. Two original looping animated shorts.']}
];
