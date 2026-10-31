import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import vm from 'node:vm';
const code=readFileSync(resolve(import.meta.dirname,'atlas-account-vault.js'),'utf8');
const L=new Map(),S=new Map();let reloads=0;
const storage=m=>({getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)});
const localStorage=storage(L),sessionStorage=storage(S);
function page(){const window={location:{reload(){reloads++}},addEventListener(){}};const context={window,localStorage,sessionStorage,setInterval(){},Date,JSON,Error,Set,Array,Object,console};vm.runInNewContext(code,context);return window.AtlasAccountVault}
test('Pre-existing shared browser data is preserved and hidden until verified sign-in',()=>{
 L.set('mnwiTripCollections',JSON.stringify([{id:'legacy',parks:['rice'],notes:'private'}]));L.set('mnwiSavedParks','["rice"]');
 const a=page();assert.equal(a.getState().legacyAvailable,true);
 assert.equal(JSON.parse(L.get('mnwiTripCollections')).length,0);assert.equal(JSON.parse(L.get('mnwiSavedParks')).length,0);
 assert.equal(a.switchAccount('owner'),true);assert.equal(reloads,1);
 const b=page();assert.equal(b.getState().activeUid,'owner');assert.equal(b.claimLegacy(),true);assert.equal(reloads,2);
 const c=page();assert.equal(JSON.parse(L.get('mnwiTripCollections'))[0].notes,'private');
 assert.equal(JSON.parse(L.get('mnwiSavedParks'))[0],'rice');
});
test('Signout and different Google UID do not show old trip or favourites',()=>{
 let a=page();assert.equal(a.switchAccount(null),true);
 assert.equal(JSON.parse(L.get('mnwiTripCollections')).length,0);assert.equal(JSON.parse(L.get('mnwiSavedParks')).length,0);
 a=page();assert.equal(a.switchAccount('another-user'),true);
 a=page();assert.equal(JSON.parse(L.get('mnwiTripCollections')).length,0);assert.equal(JSON.parse(L.get('mnwiSavedParks')).length,0);
 assert.equal(a.getState().legacyAvailable,false);
 a.switchAccount('owner');a=page();assert.equal(JSON.parse(L.get('mnwiTripCollections'))[0].notes,'private');
});
