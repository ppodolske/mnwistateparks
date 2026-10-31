import test from 'node:test';
import assert from 'node:assert/strict';
const L=new Map(),S=new Map();
const storage=m=>({getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)});
globalThis.localStorage=storage(L);globalThis.sessionStorage=storage(S);
let uid='owner',active='owner',snapshot=0,network=[];
const id='trip-1793358857730',cloudId='b5452b8b-18a2-466a-baa4-b30a26bda633';
const trip={id,name:'Existing trip',parks:['rice'],stopMeta:{rice:{reservation:'PRESERVE'}}};
globalThis.window={location:{pathname:'/trip/',search:'?id='+id,reload(){}},AtlasAccountBridge:{getUid:()=>uid,getToken:async()=>uid?'test-token':null},AtlasAccountVault:{getState:()=>({activeUid:active,legacyAvailable:true}),snapshot:()=>snapshot++}};
globalThis.document={readyState:'complete',querySelector:()=>null,addEventListener(){}};
let responseMap={
 '/api/v1/trips':{trips:[{id:cloudId,revision:3,role:'owner'}]},
 ['/api/v1/trips/'+cloudId]:{revision:3,role:'owner',document:trip}
};
globalThis.fetch=async(path,options)=>{
 network.push({path,method:options?.method||'GET',auth:options?.headers?.Authorization});
 const d=responseMap[path];return {ok:!!d,status:d?200:404,json:async()=>d};
};
const {recoverCloudTrip}=await import('./atlas-trip-recovery.mjs');
const reset=()=>{L.clear();S.clear();uid='owner';active='owner';snapshot=0;network=[];responseMap={
 '/api/v1/trips':{trips:[{id:cloudId,revision:3,role:'owner'}]},
 ['/api/v1/trips/'+cloudId]:{revision:3,role:'owner',document:trip}
};};
test('explicit cloud recovery restores exact trip, keeps legacy backup and revision mapping, never POSTs or PUTs',async()=>{
 reset();L.set('atlas-vault-legacy-backup-v1','{"protected":"old local version"}');
 L.set('mnwiTripCollections',JSON.stringify([{id:'unrelated',parks:['afton']} ]));
 const result=await recoverCloudTrip(id);assert.equal(result.restored,true);
 const trips=JSON.parse(L.get('mnwiTripCollections'));
 assert.equal(trips.length,2);assert.equal(trips[0].id,'unrelated');assert.equal(trips[1].stopMeta.rice.reservation,'PRESERVE');
 assert.equal(JSON.parse(L.get('atlas-sync-v1:owner'))[cloudId].revision,3);
 assert.equal(snapshot,1);assert.equal(L.get('atlas-vault-legacy-backup-v1'),'{"protected":"old local version"}');
 assert.deepEqual(network.map(x=>x.method),['GET','GET']);
 assert.ok(network.every(x=>x.auth==='Bearer test-token'));
 assert.ok([...L.keys()].some(k=>k.startsWith('atlas-trip-before-cloud-recovery-v1:owner:')));
});
test('other identities and wrong active cache cannot access recovery',async()=>{
 reset();uid=null;await assert.rejects(recoverCloudTrip(id),/Sign in/);assert.equal(network.length,0);
 uid='owner';active='other';await assert.rejects(recoverCloudTrip(id),/Sign in/);assert.equal(network.length,0);
 assert.equal(L.has('mnwiTripCollections'),false);
});
test('a missing or mismatched cloud trip cannot create a browser copy',async()=>{
 reset();responseMap['/api/v1/trips/'+cloudId]={revision:3,role:'owner',document:{...trip,id:'different'}};
 await assert.rejects(recoverCloudTrip(id),/no cloud copy/);
 assert.equal(L.has('mnwiTripCollections'),false);
});
test('existing local trip is never overwritten, even if cloud revision differs',async()=>{
 reset();L.set('mnwiTripCollections',JSON.stringify([{...trip,name:'LOCAL NEWER EDIT'}]));
 const result=await recoverCloudTrip(id);assert.deepEqual(result,{alreadyPresent:true});
 assert.equal(JSON.parse(L.get('mnwiTripCollections'))[0].name,'LOCAL NEWER EDIT');assert.equal(network.length,0);
});
test('invalid synchronization maps fail closed without modifying browser data',async()=>{
 reset();L.set('atlas-sync-v1:owner','{bad');
 await assert.rejects(recoverCloudTrip(id),/synchronization records are unreadable/);
 assert.equal(L.has('mnwiTripCollections'),false);
});
test('cloud trip with viewer role is restored read-only, not published',async()=>{
 reset();responseMap['/api/v1/trips/'+cloudId]={revision:4,role:'viewer',document:trip};
 const result=await recoverCloudTrip(id);assert.equal(result.role,'viewer');
 assert.equal(JSON.parse(L.get('atlas-sync-v1:owner'))[cloudId].role,'viewer');
 assert.equal(network.length,2);
});
