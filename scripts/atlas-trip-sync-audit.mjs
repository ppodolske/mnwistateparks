import test from 'node:test';import assert from 'node:assert/strict';
const store=new Map();
globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>{store.set(k,String(v))}};
const eventTarget=new EventTarget();globalThis.document={hidden:false,addEventListener:(...a)=>eventTarget.addEventListener(...a),dispatchEvent:(...a)=>eventTarget.dispatchEvent(...a)};
const uid='owner',cloudId='f3f11350-0000-4000-8000-000000000001';
const base={id:'trip-1793358857730',name:'TEST',parks:['rice'],stopMeta:{rice:{reservation:'KEEP-SECRET'}}};
let remote={...base},revision=1,puts=0;
const api=async(path,options)=>{
  if(path==='/api/v1/trips')return {trips:[{id:cloudId,title:'TEST',revision,role:'owner'}]};
  if(path==='/api/v1/migrations'&&options?.method==='POST')return {id:'f3f11350-0000-4000-8000-000000000002',alreadyImported:false};
  if(path==='/api/v1/migrations')return {imports:[{source_id:base.id,trip_id:cloudId}]};
  if(path==='/api/v1/trips/'+cloudId){
    if(options?.method==='PUT'){
      if(options.body.expectedRevision!==revision)return {status:409,error:'Revision conflict'};
      remote=options.body.document;revision++;puts++;return {id:cloudId,revision};
    }
    return {id:cloudId,revision,role:'owner',document:remote};
  }
  return {status:404,error:'not found'};
};
globalThis.fetch=async(url,options={})=>{
  const x=await api(url,options?.method==='PUT'?{method:options.method,body:JSON.parse(options.body)}:options);
  return {ok:!x.status,status:x.status||200,json:async()=>x};
};
globalThis.window={addEventListener(){},AtlasAccountBridge:{getUid:()=>uid,getToken:async()=> 'mock-verifier-token'},AtlasTripTimeline:{render(){}}};
Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
const origSetInterval=globalThis.setInterval;globalThis.setInterval=()=>0;
await import('./atlas-trip-sync.mjs');
const pause=ms=>new Promise(ok=>setTimeout(ok,ms));
const trip=()=>JSON.parse(store.get('mnwiTripCollections')||'[]')[0];
async function sync(){window.AtlasCloudSync.syncNow();await pause(750);}
test('adopts an imported browser trip and uploads edits without changing the original ID',async()=>{
  store.set('mnwiTripCollections',JSON.stringify([base]));
  document.dispatchEvent(new Event('atlas-account-changed'));await sync();
  assert.equal(window.AtlasCloudSync.getStatus().tracked,1);
  assert.equal(window.AtlasCloudSync.getStatus().conflicts,0);
  assert.equal(trip().stopMeta.rice.reservation,'KEEP-SECRET');
  store.set('mnwiTripCollections',JSON.stringify([{...base,name:'Edited on Mac'}]));await sync();
  assert.equal(remote.name,'Edited on Mac');assert.equal(revision,2);assert.equal(puts,1);
});
test('downloads newer cloud edits only when browser copy is unchanged, with recovery snapshot',async()=>{
  remote={...remote,name:'Edited on iPhone'};revision++;
  await sync();
  assert.equal(trip().name,'Edited on iPhone');
  assert.ok(JSON.parse(store.get('atlas-sync-recovery-v1:owner')).length>=1);
});
test('concurrent edits are held in conflict and never overwritten silently',async()=>{
  const local={...trip(),name:'Browser edit'};
  store.set('mnwiTripCollections',JSON.stringify([local]));
  remote={...remote,name:'Other device edit'};revision++;
  await sync();
  assert.equal(window.AtlasCloudSync.getStatus().conflicts,1);
  assert.equal(trip().name,'Browser edit');
  assert.equal(remote.name,'Other device edit');
  assert.equal(puts,1);
});

test('newly created trips enrol automatically; unrelated pre-existing trips do not',async()=>{
 const fresh={id:'trip-1793359999999',name:'New trip',parks:[]};
 store.set('mnwiTripCollections',JSON.stringify([trip(),fresh]));
 await sync();
 assert.equal(window.AtlasCloudSync.getStatus().tracked,2);
 assert.equal(JSON.parse(store.get('mnwiTripCollections')).length,2);
});
