import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const catalog=require('./atlas-campsite-catalog.js');
test('verified starter catalog has official links and no duplicate park names',()=>{
 assert.equal(catalog.entries.length,3);
 const names=new Set();
 for(const p of catalog.entries){
  assert(/^https:\/\/(files\.dnr\.state\.mn\.us|dnr\.wisconsin\.gov)\//.test(p.source),p.source);
  assert(p.checked==='2026-10-31');
  assert(!names.has(p.park));names.add(p.park);
 }
});
test('campground-specific site suggestions do not leak across sites',()=>{
 const main=catalog.suggestions('Great River Bluffs State Park','Main Campground');
 const cart=catalog.suggestions('Great River Bluffs State Park','Cart-in Sites');
 assert.deepEqual(main.sites,['1',...Array.from({length:37},(_,i)=>String(i+2))]);
 assert.deepEqual(cart.sites,['1','2','3','4']);
 assert.deepEqual(catalog.suggestions('Great River Bluffs State Park','Unknown').sites,[]);
 assert.equal(catalog.suggestions('Gooseberry Falls State Park','Main Campground').sites.at(-1),'70');
});
test('loops and sites are not invented from capacity counts',()=>{
 const p=catalog.suggestions('Potawatomi State Park','Daisy Field Campground');
 assert.deepEqual(p.loops,['North Loop','South Loop']);
 assert.deepEqual(p.sites,[]);
 assert.deepEqual(catalog.suggestions('Potawatomi State Park','Daisy Field Campground','North Loop').sites,[]);
 assert.equal(catalog.suggestions('Missing Park').entry,null);
});
test('UI keeps manual values and wires sourced suggestions before controller',()=>{
 const ui=fs.readFileSync(new URL('./atlas-trip-experience.js',import.meta.url),'utf8');
 const build=fs.readFileSync(new URL('./build-cloudflare.js',import.meta.url),'utf8');
 for(const part of ['ax2Source-campground','ax2Source-loop','ax2Source-campsite','updateSuggestions','View campground source'])assert(ui.includes(part),part);
 assert(ui.includes('catalog.suggestions(parkName,cg,loop)'));
 assert(build.includes("atlas-campsite-catalog.js"));
 assert(build.indexOf('/atlas-campsite-catalog.js')<build.indexOf('/atlas-trip-experience.js'));
 assert(!ui.includes('form.elements.namedItem(\'campsite\').value='));
});
