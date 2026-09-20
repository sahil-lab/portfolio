const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {createDialogueDeck}=require('../app/resident-dialogue.ts');
test('residents use shuffled thematic lines without repeating until the deck is exhausted',()=>{
  for(const theme of ['home','copper','garden','prism']){
    const deck=createDialogueDeck(theme,()=>.31),first=Array.from({length:deck.size},()=>deck.next());
    assert.ok(deck.size>=28);assert.equal(new Set(first).size,deck.size);assert.ok(first.every(line=>line.length>15&&!/^(Hi!?|Hello!?|Good morning!?)$/i.test(line)));
    const next=deck.next();assert.notEqual(next,first[first.length-1]);assert.ok(first.some(line=>/river|weather|copper|crystal|garden/i.test(line)));
  }
});
test('characters retain their supplied personal lines among their random conversations',()=>{
  const deck=createDialogueDeck('home',()=>.4,['The library closes at moonrise.']);
  assert.ok(Array.from({length:deck.size},()=>deck.next()).includes('The library closes at moonrise.'));
});
