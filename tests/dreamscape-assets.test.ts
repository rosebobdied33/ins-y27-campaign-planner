import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {test} from 'node:test';
import {dreamscapeModel,loadDreamscapeGeometry} from '../app/dreamscape-assets';

test('compressed public model preserves the complete approved geometry and textures',()=>{
  const name=dreamscapeModel.replace('./','public/');
  assert.deepEqual(gunzipSync(readFileSync(name+'.gz')),readFileSync(name));
});

test('geometry loader decompresses the static model and falls back on unavailable gzip',async()=>{
  const original=globalThis.fetch;
  const bytes=Buffer.from('approved model payload');
  const requests:string[]=[];
  try{
    globalThis.fetch=async input=>{requests.push(String(input));return new Response(new Uint8Array(gzipSync(bytes)));};
    assert.deepEqual(Buffer.from(await loadDreamscapeGeometry(new AbortController().signal)),bytes);
    assert.deepEqual(requests,[dreamscapeModel+'.gz']);
    requests.length=0;
    globalThis.fetch=async input=>{requests.push(String(input));return String(input).endsWith('.gz')?new Response(null,{status:404}):new Response(bytes);};
    assert.deepEqual(Buffer.from(await loadDreamscapeGeometry(new AbortController().signal)),bytes);
    assert.deepEqual(requests,[dreamscapeModel+'.gz',dreamscapeModel]);
    const abort=new AbortController();abort.abort();requests.length=0;
    globalThis.fetch=async input=>{requests.push(String(input));throw abort.signal.reason;};
    await assert.rejects(loadDreamscapeGeometry(abort.signal));
    assert.equal(requests.length,1,'aborted scene must not start a fallback download');
  }finally{globalThis.fetch=original;}
});
