import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const c=require('./atlas-campsite-catalog.js');
test('official-source entries are distinct, sourced, and park-level',()=>{
 assert(c.entries.length>=19);
 const names=new Set();
 for(const e of c.entries){
  assert(/^https:\/\/(files\.dnr\.state\.mn\.us|dnr\.wisconsin\.gov)\//.test(e.source),e.park);
  assert(!names.has(e.park));names.add(e.park);
  const z=c.suggestions(e.park);
  assert.deepEqual(z.sites,c.suggestions(e.park,'arbitrary campground','any loop').sites);
  assert.equal(z.sites.length,new Set(z.sites).size);
  assert(z.sites.every(x=>typeof x==='string'));
 }
});
test('never invent site identifiers for missing park',()=>{
 const s=c.suggestions('not a park');assert.equal(s.entry,null);assert.deepEqual(s.sites,[]);
});
test('build includes source catalog before workspace script',()=>{
 const b=fs.readFileSync(new URL('./build-cloudflare.js',import.meta.url),'utf8');
 assert(b.includes('atlas-campsite-catalog.js'));
 assert(b.indexOf('/atlas-campsite-catalog.js')<b.indexOf('/atlas-trip-experience.js'));
});
test('existing trip fields remain manually editable',()=>{
 const s=fs.readFileSync(new URL('./atlas-trip-experience.js',import.meta.url),'utf8');
 for(const id of ['ax2Source-campground','ax2Source-loop','ax2Source-campsite'])assert(s.includes(id));
 assert(s.includes('catalog.suggestions(parkName,cg,loop,slug)'));
});
