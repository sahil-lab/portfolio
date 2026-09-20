const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const T=require('three'),{createSpeechBubble}=require('../app/speech-bubble.ts'),{disposeScene}=require('../app/scene-resources.ts');
const draws=[];
global.document={createElement:()=>{
  const canvas={width:0,height:0};
  const context=new Proxy({font:'',measureText(text){return {width:text.length*parseFloat(this.font.split(' ')[1])*.6}},fillText(text,x,y){draws.push({text,x,y,width:this.measureText(text).width,font:this.font,color:this.fillStyle})}}, {get:(object,key)=>object[key]??(()=>{}),set:(object,key,value)=>(object[key]=value,true)});
  canvas.getContext=()=>context;return canvas;
}};

test('comic bubbles use bold fitted uppercase text and retain depth-tested readable colors',()=>{
  for(const style of ['speech','thought','burst'])for(const text of ['Hi!','Hello!','Good morning!','HOT DOGS']){
    draws.length=0;const {sprite}=createSpeechBubble(text,{style});
    assert.equal(draws.map(draw=>draw.text).join(' '),text.toUpperCase());
    for(const draw of draws){
      assert.match(draw.font,/^900 /);assert.equal(draw.color,'#17212b');
      assert.ok(draw.width<=(style==='speech'?554:478));assert.ok(draw.y>65&&draw.y<260);
      assert.ok(parseFloat(draw.font.split(' ')[1])>=70);
    }
    assert.equal(sprite.material.toneMapped,false);assert.equal(sprite.material.depthTest,true);assert.equal(sprite.material.depthWrite,false);
    assert.equal(sprite.material.map.image.width,768);assert.equal(sprite.material.map.image.height,384);
    assert.equal(sprite.userData.bubbleStyle,style);assert.equal(sprite.center.y,0);disposeScene(sprite);
  }
});

test('speech pops in, floats gently and fades out without stretching its aspect ratio',()=>{
  const bubble=createSpeechBubble('Hello!');assert.equal(bubble.sprite.visible,false);
  bubble.update(.04,true,false);const initial=bubble.sprite.scale.x;
  assert.equal(bubble.sprite.visible,true);assert.ok(initial<3.4);assert.ok(bubble.sprite.material.opacity>0&&bubble.sprite.material.opacity<1);
  for(let frame=0;frame<12;frame++){
    bubble.update(.04,true,false);assert.ok(bubble.sprite.scale.x<=3.4*1.05);
    assert.ok(Math.abs(bubble.sprite.scale.x/bubble.sprite.scale.y-2)<1e-9);
  }
  assert.equal(bubble.sprite.material.opacity,1);assert.ok(Math.abs(bubble.sprite.scale.x-3.4)<1e-9);
  const height=bubble.sprite.position.y;bubble.update(.1,true,false);assert.notEqual(bubble.sprite.position.y,height);
  assert.ok(Math.abs(bubble.sprite.position.y-1.85)<=.045);
  bubble.update(.08,false,false);assert.equal(bubble.sprite.visible,true);assert.ok(bubble.sprite.material.opacity<1);
  bubble.update(.08,false,false);assert.equal(bubble.sprite.visible,false);assert.equal(bubble.sprite.material.opacity,0);
  bubble.update(.04,true,false);assert.ok(bubble.sprite.scale.x<3.4);disposeScene(bubble.sprite);
});

test('reduced motion keeps visible bubbles completely still and switches visibility immediately',()=>{
  const bubble=createSpeechBubble('Good morning!',{style:'burst',width:3,height:2.1,phase:2});
  bubble.update(.05,true,false);bubble.update(.01,true,true);
  assert.equal(bubble.sprite.material.opacity,1);assert.equal(bubble.sprite.visible,true);
  const snapshot=()=>[...bubble.sprite.position.toArray(),...bubble.sprite.scale.toArray(),bubble.sprite.material.rotation,bubble.sprite.material.opacity];
  const initial=snapshot();for(let frame=0;frame<30;frame++){bubble.update(.1,true,true);assert.deepEqual(snapshot(),initial)}
  assert.equal(bubble.sprite.position.y,2.1);assert.equal(bubble.sprite.scale.x,3);assert.equal(bubble.sprite.material.rotation,0);
  bubble.update(.01,false,true);assert.equal(bubble.sprite.visible,false);disposeScene(bubble.sprite);
});

test('animation clamps long frames and does not recreate textures',()=>{
  const bubble=createSpeechBubble('Hi!'),texture=bubble.sprite.material.map;
  bubble.update(1000,true,false);assert.ok(bubble.sprite.material.opacity<1);
  for(const elapsed of [NaN,-1,Infinity,.1,.1])bubble.update(elapsed,true,false);
  assert.ok(Number.isFinite(bubble.sprite.scale.x));assert.equal(bubble.sprite.material.map,texture);
  let textures=0,materials=0;texture.addEventListener('dispose',()=>textures++);bubble.sprite.material.addEventListener('dispose',()=>materials++);
  disposeScene(bubble.sprite);assert.deepEqual([textures,materials],[1,1]);
});

test('long random conversations fit every comic shape and replacing text releases the old texture',()=>{
  const {createDialogueDeck}=require('../app/resident-dialogue.ts'),deck=createDialogueDeck('copper',()=>.2);
  for(const style of ['speech','thought','burst']){
    const bubble=createSpeechBubble('A starting line.',{style,width:4.6});let disposed=0;const previous=bubble.sprite.material.map;previous.addEventListener('dispose',()=>disposed++);
    for(let index=0;index<deck.size;index++){
      draws.length=0;const text=deck.next();bubble.setText(text);assert.equal(draws.map(draw=>draw.text).join(' '),text.toUpperCase());
      for(const draw of draws){assert.ok(draw.width<=(style==='speech'?554:478));assert.ok(draw.y>65&&draw.y<260);assert.ok(parseFloat(draw.font.split(' ')[1])>=36)}
      const texture=bubble.sprite.material.map;bubble.setText(text);assert.equal(bubble.sprite.material.map,texture);
    }
    assert.equal(disposed,1);disposeScene(bubble.sprite);
  }
});

test('the neighborhood animates one nearby speaker and respects reduced motion',()=>{
  const {createNeighborhood}=require('../app/neighborhood.ts');
  const scene=new T.Scene(),player=new T.Group(),neighborhood=createNeighborhood(scene,player,()=>false,()=>{});
  const first=neighborhood.walkers.find(walker=>walker.seed===0),second=neighborhood.walkers.find(walker=>walker.seed===1);
  first.wait=second.wait=100;second.root.position.copy(first.root.position).add(new T.Vector3(.8,0,0));player.position.copy(first.root.position);
  neighborhood.update(.04,false);assert.equal(first.bubble.visible,true);assert.equal(second.bubble.visible,false);
  const before=first.bubble.scale.x;neighborhood.update(.08,false);assert.notEqual(first.bubble.scale.x,before);
  player.position.copy(second.root.position);
  for(let frame=0;frame<8;frame++){neighborhood.update(.04,false);assert.ok(neighborhood.walkers.filter(walker=>walker.bubble.visible).length<=1)}
  assert.equal(second.bubble.visible,true);assert.equal(first.bubble.visible,false);
  player.position.copy(first.root.position);
  neighborhood.update(.01,true);const height=first.bubble.position.y;neighborhood.update(.1,true);
  assert.equal(first.bubble.position.y,height);assert.equal(first.bubble.material.rotation,0);
  assert.equal(neighborhood.walkers.filter(walker=>walker.bubble.visible).length,1);
  player.position.set(500,0,500);neighborhood.update(.01,true);assert.equal(first.bubble.visible,false);disposeScene(scene);
});
