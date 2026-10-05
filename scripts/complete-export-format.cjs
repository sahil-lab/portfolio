const assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');

function parseGlb(bytes){
 assert.equal(bytes.toString('utf8',0,4),'glTF');assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length);assert.equal(bytes.readUInt32LE(16),0x4e4f534a);
 const jsonLength=bytes.readUInt32LE(12),document=JSON.parse(bytes.subarray(20,20+jsonLength).toString()),binaryOffset=20+jsonLength;assert.equal(bytes.readUInt32LE(binaryOffset+4),0x004e4942);
 const binary=bytes.subarray(binaryOffset+8,binaryOffset+8+bytes.readUInt32LE(binaryOffset));assert.equal(document.buffers.length,1);assert.equal(document.buffers[0].uri,undefined);return {document,binary};
}

function compactGlb(bytes){
 const {document,binary}=parseGlb(bytes),blocks=[],offsets=new Map();let length=0;
 for(const view of document.bufferViews){
  assert.equal(view.buffer,0);const start=view.byteOffset??0,data=binary.subarray(start,start+view.byteLength);assert.equal(data.length,view.byteLength);const key=hash(data);let offset=offsets.get(key);
  if(offset===undefined){const padding=(4-length%4)%4;if(padding){blocks.push(Buffer.alloc(padding));length+=padding}offset=length;offsets.set(key,offset);blocks.push(data);length+=data.length}view.byteOffset=offset;
 }
 document.buffers[0].byteLength=length;const json=Buffer.from(JSON.stringify(document)),jsonPadding=(4-json.length%4)%4,binaryPadding=(4-length%4)%4,header=Buffer.alloc(20),binaryHeader=Buffer.alloc(8);
 header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+json.length+jsonPadding+8+length+binaryPadding,8);header.writeUInt32LE(json.length+jsonPadding,12);header.writeUInt32LE(0x4e4f534a,16);binaryHeader.writeUInt32LE(length+binaryPadding,0);binaryHeader.writeUInt32LE(0x004e4942,4);
 const result=Buffer.concat([header,json,Buffer.alloc(jsonPadding,32),binaryHeader,...blocks,Buffer.alloc(binaryPadding)]);verifyEquivalent(bytes,result);return result;
}

function verifyEquivalent(original,result){
 const before=parseGlb(original),after=parseGlb(result);assert.equal(before.document.bufferViews.length,after.document.bufferViews.length);
 for(let index=0;index<before.document.bufferViews.length;index++){const first=before.document.bufferViews[index],second=after.document.bufferViews[index],firstBytes=before.binary.subarray(first.byteOffset??0,(first.byteOffset??0)+first.byteLength),secondBytes=after.binary.subarray(second.byteOffset??0,(second.byteOffset??0)+second.byteLength);assert.ok(firstBytes.equals(secondBytes),'Buffer view changed: '+index);first.byteOffset=second.byteOffset=0}
 before.document.buffers[0].byteLength=after.document.buffers[0].byteLength=0;assert.deepEqual(after.document,before.document);
}

module.exports={parseGlb,compactGlb,verifyEquivalent,hash};
