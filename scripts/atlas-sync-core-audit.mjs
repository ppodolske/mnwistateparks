import test from 'node:test';import assert from 'node:assert/strict';
import {reconcile,collidingLocalId,applyTrip,summary} from './atlas-sync-core.mjs';
const base={id:'trip-123',name:'Trip',parks:['rice'],stopMeta:{rice:{reservation:'KEEP-ME'}}};
const later={...base,name:'New version'};
test('no lost updates; two-sided edits explicitly conflict',()=>{
 assert.equal(reconcile({local:base,remote:base,base:JSON.stringify(base),role:'owner'}).action,'aligned');
 assert.equal(reconcile({local:base,remote:later,base:JSON.stringify(base),role:'owner'}).action,'download');
 assert.equal(reconcile({local:later,remote:base,base:JSON.stringify(base),role:'editor'}).action,'upload');
 assert.equal(reconcile({local:later,remote:base,base:JSON.stringify(base),role:'viewer'}).action,'conflict');
 assert.equal(reconcile({local:later,remote:{...base,parks:['rice','afton']},base:JSON.stringify(base),role:'owner'}).action,'conflict');
 assert.equal(reconcile({local:later,remote:base,base:null,role:'owner'}).action,'conflict');
});
test('cloud imports never replace unrelated local IDs',()=>{
 const a=[base];assert.equal(collidingLocalId(a,'trip-123','remote-uuid',{}),true);
 assert.equal(collidingLocalId(a,'trip-123','remote-uuid',{x:{localId:'trip-123',cloudId:'remote-uuid'}}),false);
 assert.equal(collidingLocalId(a,'trip-999','remote-uuid',{}),false);
 assert.deepEqual(applyTrip(a,{...base,id:'trip-999'}).map(x=>x.id),['trip-123','trip-999']);
 assert.equal(applyTrip(a,{...later}).length,1);
 assert.equal(applyTrip(a,{...later})[0].stopMeta.rice.reservation,'KEEP-ME');
});
test('summary identifies conflicts and unsynced changes',()=>{
 assert.deepEqual(summary({a:{cloudId:'x',conflict:'both changed',dirty:true},b:{cloudId:'y'}}),{tracked:2,conflicts:1,unsynced:1});
});
