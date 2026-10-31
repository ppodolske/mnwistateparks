/* Atlas Cloud Sync Stage 3. No monkey-patching Storage: existing editors remain authoritative
   for local edits. Cloud changes are applied only after revision + baseline reconciliation. */
import {serialise,reconcile,collidingLocalId,applyTrip,summary} from './atlas-sync-core.mjs';
const KEY='mnwiTripCollections', PREFIX='atlas-sync-v1:', BACKUP='atlas-sync-recovery-v1:';
let uid=null, mappings={},busy=false,refreshPending=false,lastError='',lastRefresh=0,runTimer=0,loginLocalIds=new Set(),lastSignal='';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readJSON=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??fallback}catch{return fallback}};
const trips=()=>{const t=readJSON(KEY,[]);return Array.isArray(t)?t:[]};
const persist=()=>{if(uid)localStorage.setItem(PREFIX+uid,JSON.stringify(mappings));};
function signal(){
  const next=JSON.stringify({uid,error:lastError,entries:Object.values(mappings).map(x=>[x.cloudId,x.role,x.conflict,x.dirty,x.revision])});
  if(next===lastSignal)return;
  lastSignal=next;document.dispatchEvent(new CustomEvent('atlas-sync-status'));
}
function readEntry(id){return mappings[id]||null}
function recovery(reason,local,cloudId){
  const k=BACKUP+uid,prev=readJSON(k,[]);
  const copy=Array.isArray(prev)?prev.slice(-9):[];
  copy.push({at:new Date().toISOString(),reason,cloudId,document:local});
  localStorage.setItem(k,JSON.stringify(copy)); // STOP a destructive replacement if backup cannot fit.
}
function install(doc,entry,reason){
  const current=trips(),local=current.find(t=>t?.id===entry.localId);
  if(local)recovery(reason,local,entry.cloudId);
  const next=applyTrip(current,doc);
  localStorage.setItem(KEY,JSON.stringify(next));
  window.AtlasTripTimeline?.render?.();
  document.dispatchEvent(new CustomEvent('atlas-cloud-trip-updated',{detail:{tripId:entry.localId}}));
}
async function request(path,options={}){
  const token=await window.AtlasAccountBridge?.getToken?.();
  if(!token||!uid)throw Error('Sign-in required');
  const r=await fetch(path,{method:options.method||'GET',cache:'no-store',credentials:'same-origin',headers:{authorization:'Bearer '+token,...(options.body?{'Content-Type':'application/json'}:{})},body:options.body?JSON.stringify(options.body):undefined});
  let data;try{data=await r.json()}catch{throw Error('Invalid server response')}
  if(!r.ok){const e=Error(data.error||`Cloud API HTTP ${r.status}`);e.status=r.status;throw e;}
  return data;
}
async function syncEntry(entry,meta,expectedUid){
  const cloud=await request('/api/v1/trips/'+encodeURIComponent(entry.cloudId));
  if(uid!==expectedUid)return;
  const remote=cloud.document;
  if(!remote||!Array.isArray(remote.parks)||typeof remote.id!=='string')throw Error('Cloud trip data is invalid');
  entry.role=cloud.role;entry.revision=cloud.revision;
  let local=trips().find(x=>x?.id===entry.localId)||null;
  if(entry.conflict)return;
  if(!local && collidingLocalId(trips(),remote.id,entry.cloudId,mappings)){
    entry.conflict='Trip ID is already used by a different browser trip';entry.dirty=true;return;
  }
  if(!local&&entry.base===undefined){
    entry.localId=remote.id;install(remote,entry,'cloud download');entry.base=serialise(remote);entry.conflict='';entry.dirty=false;return;
  }
  if(!local){entry.conflict='Local trip was deleted; recovery requires a decision';entry.dirty=true;return;}
  if(local.id!==remote.id){entry.conflict='Trip identity differs between devices';entry.dirty=true;return;}
  const decision=reconcile({local,remote,base:entry.base,role:cloud.role});
  if(decision.action==='aligned'){entry.base=serialise(remote);entry.conflict='';entry.dirty=false;return;}
  if(decision.action==='download'){
    const page=document.querySelector?.('[data-page="trip"]');
    const focused=document.activeElement;
    const editing=page?.dataset?.tripId===entry.localId && focused &&
      /^(INPUT|TEXTAREA|SELECT)$/.test(focused.tagName||'');
    if(editing){entry.conflict='Cloud changed while a trip field was being edited; review before replacing';entry.dirty=true;return;}
    install(remote,entry,'before newer cloud revision');entry.base=serialise(remote);entry.conflict='';entry.dirty=false;return;
  }
  if(decision.action==='upload'){
    // A separate device may update while this PUT is in flight: server checks revision.
    const saved=serialise(local);
    try{
      const result=await request('/api/v1/trips/'+encodeURIComponent(entry.cloudId),{method:'PUT',body:{expectedRevision:cloud.revision,document:local}});
      if(uid!==expectedUid)return;
      entry.base=saved;entry.revision=result.revision;entry.conflict='';entry.dirty=serialise(trips().find(t=>t?.id===entry.localId))!==saved;
    }catch(e){if(e.status===409||e.status===403){entry.conflict='Server revision or permission changed; review both copies';entry.dirty=true;}else throw e;}
    return;
  }
  entry.conflict=decision.reason;entry.dirty=true;
}
async function run(full=true){
  if(busy||!uid||document.hidden||!navigator.onLine)return;
  busy=true;const session=uid;lastError='';try{
    const list=await request('/api/v1/trips');if(session!==uid)return;
    const remoteList=list.trips||[];
    const imports=(await request('/api/v1/migrations')).imports||[];
    const importMap=new Map(imports.map(x=>[x.trip_id,x.source_id]));
    for(const meta of remoteList){
      if(session!==uid)return;
      let e=readEntry(meta.id);
      if(!e){
        const cloud=await request('/api/v1/trips/'+encodeURIComponent(meta.id));
        if(session!==uid)return;
        const original=cloud.document;
        const sourceId=importMap.get(meta.id);
        const candidate=sourceId||original?.id;
        const local=trips().find(t=>t?.id===candidate);
        e={cloudId:meta.id,localId:candidate,role:meta.role,revision:cloud.revision,base:undefined,conflict:'',dirty:false};
        mappings[meta.id]=e;
        if(local){
          // First adoption of Stage 2 imports: never presume a later local edit is already in cloud.
          if(serialise(local)===serialise(original)){e.base=serialise(original)}
          else{e.conflict='Browser and cloud copies differ; choose which to keep';e.dirty=true}
        }else if(!collidingLocalId(trips(),original.id,meta.id,mappings)){
          e.localId=original.id;install(original,e,'initial cloud download');e.base=serialise(original);
        }else{e.conflict='Trip ID already exists locally';e.dirty=true;}
        persist();signal();continue;
      }
      // A new cloud revision or pending local edit must be reconciled with a fresh snapshot.
      const local=trips().find(t=>t?.id===e.localId)||null;
      const dirty=local&&e.base!==undefined&&serialise(local)!==e.base;
      if(e.conflict){e.dirty=!!dirty||e.dirty;continue;}
      if(!full&&!dirty&&Number(meta.revision)===Number(e.revision)&&meta.role===e.role)continue;
      if(full&&!dirty&&Number(meta.revision)===Number(e.revision)&&meta.role===e.role)continue;
      await syncEntry(e,meta,session);if(uid!==session)return;persist();signal();
    }
    const ids=new Set(remoteList.map(x=>x.id));
    for(const [id,e] of Object.entries(mappings)){
      if(!ids.has(id)){
        e.conflict='Trip access removed or trip deleted. Browser copy is preserved.';e.dirty=false;
      }
    }
    // Only trips created AFTER signing into this browser auto-enrol. Earlier browser
    // data always requires the existing explicit Stage 2 import/consent flow.
    const linked=new Set(Object.values(mappings).map(e=>e.localId));
    for(const local of trips()){
      if(session!==uid)return;
      const lid=local?.id;
      if(typeof lid!=='string'||lid.length>128||!(/^[\w.:~-]+$/).test(lid)||!Array.isArray(local.parks))continue;
      if(loginLocalIds.has(lid)||linked.has(lid))continue;
      const source=serialise(local);
      const result=await request('/api/v1/migrations',{method:'POST',body:{sourceId:lid,document:local}});
      if(session!==uid)return;
      mappings[result.id]={cloudId:result.id,localId:lid,role:'owner',revision:1,base:source,conflict:'',dirty:false};
      linked.add(lid);loginLocalIds.add(lid);persist();signal();
      document.dispatchEvent(new Event('atlas-sync-cloud-created'));
    }
    lastRefresh=Date.now();persist();
  }catch(err){lastError=err?.message||'Sync unavailable';console.warn('Atlas sync:',lastError)}
  finally{busy=false;signal();if(refreshPending){refreshPending=false;queue(true)}}
}
function queue(full=false){if(!uid)return;if(busy){refreshPending=true;return;}clearTimeout(runTimer);runTimer=setTimeout(()=>run(full),500);}
function pickLocal(id){return trips().find(t=>t?.id===mappings[id]?.localId)||null}
async function resolve(id,choice){
  const e=mappings[id];if(!uid||!e||!e.conflict)return;
  if(e.conflict.includes('access removed')||e.conflict.includes('already used'))throw Error('Trip cannot be restored automatically; keep existing browser copy');
  const remote=await request('/api/v1/trips/'+encodeURIComponent(id));
  const local=pickLocal(id);
  if(choice==='cloud'){
    if(!window.confirm('Use the cloud version? Your current browser version will be saved in Atlas recovery history first.'))return;
    if(local)recovery('conflict resolved with cloud',local,id);
    install(remote.document,e,'conflict recovery');e.base=serialise(remote.document);e.revision=remote.revision;e.conflict='';e.dirty=false;
  }else{
    if(!local||remote.role==='viewer')throw Error('Only owners or editors can publish browser edits');
    if(!window.confirm('Publish this browser version? It will replace the newer cloud copy for everyone sharing this trip.'))return;
    recovery('before publishing conflicting browser version',remote.document,id);
    const saved=serialise(local);
    try{
      const done=await request('/api/v1/trips/'+encodeURIComponent(id),{method:'PUT',body:{expectedRevision:remote.revision,document:local}});
      e.base=saved;e.revision=done.revision;e.conflict='';e.dirty=serialise(pickLocal(id))!==saved;
    }catch(err){e.conflict='Cloud changed again; compare before retrying';throw err;}
  }
  persist();signal();queue(true);
}
function panelSection(panel){
  if(!uid)return;
  const n=document.createElement('section');n.className='aa-section';
  const info=summary(mappings);
  n.innerHTML=`<h3>Trip synchronisation</h3><p class="aa-copy">${info.tracked} cloud trip${info.tracked===1?'':'s'} linked · ${info.conflicts} conflict${info.conflicts===1?'':'s'} · ${info.unsynced} pending</p><p class="aa-hint">${esc(lastError||'Browser edits sync when online. Other devices are checked about once per minute. Local versions are preserved for recovery.')}</p>`;
  const button=document.createElement('button');button.type='button';button.className='aa-secondary';button.textContent=busy?'Checking…':'Sync now';button.disabled=busy;
  button.onclick=()=>queue(true);n.append(button);
  for(const e of Object.values(mappings).filter(x=>x.conflict)){
    const box=document.createElement('div');box.className='aa-sync-conflict';
    const label=document.createElement('p');label.textContent=`${e.localId}: ${e.conflict}`;box.append(label);
    if(!e.conflict.includes('access removed')&&!e.conflict.includes('already used')){
      for(const [option,text] of [['cloud','Keep cloud version'],['browser','Publish browser version']]){
        if(option==='browser'&&e.role==='viewer')continue;
        const b=document.createElement('button');b.type='button';b.className='aa-secondary';b.textContent=text;
        b.onclick=async()=>{try{await resolve(e.cloudId,option)}catch(err){lastError=err.message;signal()}};box.append(b);
      }
    }n.append(box);
  }
  panel.append(n);
}
function accountChanged(){
  const next=window.AtlasAccountBridge?.getUid?.()||null;
  if(uid===next)return;
  clearTimeout(runTimer);uid=next;mappings=uid?readJSON(PREFIX+uid,{}):{};loginLocalIds=new Set(trips().map(t=>t?.id));
  // Do not erase old browser data on logout: the app's legacy editor still owns local state.
  signal();if(uid)queue(true);
}
window.AtlasCloudSync={appendPanel:panelSection,syncNow:()=>queue(true),getStatus:()=>summary(mappings),getLocalId:id=>mappings[id]?.conflict?null:(mappings[id]?.localId||null)};
document.addEventListener('atlas-account-changed',accountChanged);
document.addEventListener('atlas-cloud-data-changed',()=>queue(true));
document.addEventListener('atlas-timeline-updated',()=>queue(false));
document.addEventListener('trip-logistics-saved',()=>queue(false));
document.addEventListener('atlas-trip-date-saved',()=>queue(false));
window.addEventListener('online',()=>queue(true));
window.addEventListener('focus',()=>{if(Date.now()-lastRefresh>30000)queue(true)});
window.addEventListener('storage',e=>{if(e.key===KEY)queue(false)});
setInterval(()=>{if(uid&&!busy&&navigator.onLine&&!document.hidden){const dirty=Object.values(mappings).some(e=>!e.conflict&&e.base!==undefined&&serialise(pickLocal(e.cloudId))!==e.base);if(dirty||Date.now()-lastRefresh>60000)queue(!dirty);}},5000);
accountChanged();
