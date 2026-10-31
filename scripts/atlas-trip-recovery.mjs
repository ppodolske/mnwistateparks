/* Atlas Stage 4.1 — explicit, non-destructive trip recovery for the static /trip route.
   Legacy page scripts paint "Trip not found" before asynchronous Firebase/cloud hydration.
   This code never publishes or deletes a cloud trip and never silently claims guest data. */
const ROOT='/api/v1';
const tripId=new URLSearchParams(window.location.search).get('id');
const key='mnwiTripCollections';
const safeId=id=>typeof id==='string'&&/^[\w.:~-]{1,128}$/.test(id);
const readArray=()=>{
 const raw=localStorage.getItem(key)||'[]';
 let v;try{v=JSON.parse(raw)}catch{throw Error('Browser trip storage is unreadable. Nothing has been changed.')}
 if(!Array.isArray(v))throw Error('Browser trip storage is not a list. Nothing has been changed.');
 return v;
};
const readMaps=uid=>{
 const raw=localStorage.getItem('atlas-sync-v1:'+uid)||'{}';
 let v;try{v=JSON.parse(raw)}catch{throw Error('Trip synchronization records are unreadable. Nothing has been changed.')}
 if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Trip synchronization records are invalid. Nothing has been changed.');
 return v;
};
async function api(path,token){
 const response=await fetch(ROOT+path,{cache:'no-store',credentials:'same-origin',headers:{Authorization:'Bearer '+token}});
 if(!response.ok){if(response.status===401||response.status===403)throw Error('Your sign-in has expired or access was denied.');throw Error('Cloud trip lookup failed (HTTP '+response.status+').')}
 return response.json();
}
export async function recoverCloudTrip(wanted){
 if(!safeId(wanted))throw Error('Invalid trip ID; no changes made.');
 const uid=window.AtlasAccountBridge?.getUid?.();
 if(!uid||window.AtlasAccountVault?.getState?.().activeUid!==uid)throw Error('Sign in to the correct Atlas account before recovery.');
 const existing=readArray();
 if(existing.some(t=>t?.id===wanted))return {alreadyPresent:true};
 const token=await window.AtlasAccountBridge?.getToken?.();
 if(!token)throw Error('Google sign-in is required.');
 const list=await api('/trips',token);
 if(!Array.isArray(list.trips))throw Error('Cloud trip list is invalid. No changes made.');
 const maps=readMaps(uid);
 const candidates=[...list.trips].sort((a,b)=>Number(maps[b.id]?.localId===wanted)-Number(maps[a.id]?.localId===wanted));
 let match=null;
 for(const summary of candidates){
  if(typeof summary.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(summary.id))continue;
  if(maps[summary.id]?.localId && maps[summary.id].localId!==wanted)continue;
  const full=await api('/trips/'+encodeURIComponent(summary.id),token);
  if(full.document?.id===wanted){match={summary,full};break;}
 }
 if(!match)throw Error('This signed-in account has no cloud copy of that trip. Your browser recovery data has not been changed.');
 const {summary,full}=match;
 if(!['owner','editor','viewer'].includes(full.role)||!Array.isArray(full.document?.parks))throw Error('Cloud trip failed validation. Nothing has been changed.');
 if(window.AtlasAccountBridge?.getUid?.()!==uid||window.AtlasAccountVault?.getState?.().activeUid!==uid)throw Error('The signed-in account changed. Nothing has been changed.');
 const before=readArray();
 if(before.some(t=>t?.id===wanted))return {alreadyPresent:true};
 // Never overwrite an unrelated browser trip or an earlier recovery snapshot.
 const map=maps[summary.id];
 if(map?.localId && map.localId!==wanted)throw Error('Another browser trip is linked to this cloud copy. Nothing has been changed.');
 const recoveryKey='atlas-trip-before-cloud-recovery-v1:'+uid+':'+Date.now();
 localStorage.setItem(recoveryKey,JSON.stringify({tripId:wanted,trips:before}));
 localStorage.setItem(key,JSON.stringify([...before,full.document]));
 maps[summary.id]={cloudId:summary.id,localId:wanted,role:full.role,revision:full.revision,base:JSON.stringify(full.document),conflict:'',dirty:false};
 localStorage.setItem('atlas-sync-v1:'+uid,JSON.stringify(maps));
 window.AtlasAccountVault?.snapshot?.();
 return {restored:true,role:full.role};
}
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
const page=()=>document.querySelector('[data-page="trip"]');
const missing=()=>page()?.querySelector('.empty-state');
function show(){
 if(!safeId(tripId)||!missing())return;
 let has=false;
 try{has=readArray().some(x=>x?.id===tripId)}catch{/* Keep recovery controls available for diagnostics. */}
 if(has){
  // The old trip renderer has already shown the missing state. Reload it once
  // after an asynchronous cloud download so its original editors initialize.
  const reloadKey='atlas-trip-reload-after-cloud-v1:'+tripId;
  if(sessionStorage.getItem(reloadKey)!=='1'){
   sessionStorage.setItem(reloadKey,'1');window.location.reload();
  }return;
 }
 const empty=missing(), heading=empty.querySelector('h2');
 if(heading)heading.textContent='Restore your trip';
 const previous=document.getElementById('atlasTripRecovery');if(previous)previous.remove();
 const box=make('div','atlas-trip-recovery');box.id='atlasTripRecovery';
 const uid=window.AtlasAccountBridge?.getUid?.();
 box.append(make('p','',uid?'This trip is not loaded in this browser. Your cloud copy can be restored safely.':'This trip is not loaded in this browser. Sign in to retrieve your private cloud copy.'));
 const note=make('p','atlas-trip-recovery-note','Recovery never deletes or publishes a trip. Existing browser backups stay available.');box.append(note);
 const actions=make('div','atlas-trip-recovery-actions');
 const account=make('button','aa-secondary','Open Account');account.type='button';
 account.onclick=()=>{const btn=document.querySelector('.aa-trigger'),panel=document.getElementById('atlasAccountPanel');if(btn&&panel?.dataset?.open!=='true')btn.click();};actions.append(account);
 if(uid){
  const vault=window.AtlasAccountVault?.getState?.();
  if(vault?.legacyAvailable){
   const restore=make('button','aa-primary','Restore preserved browser data');restore.type='button';
   restore.onclick=()=>{
    if(!window.confirm('Restore your saved browser trips and parks into this Google account? Nothing will be published over a cloud trip.'))return;
    try{window.AtlasAccountVault.claimLegacy()}catch(e){note.textContent=e.message;}
   };actions.append(restore);
  }
  const cloud=make('button','aa-secondary','Restore cloud copy');cloud.type='button';
  cloud.onclick=async()=>{
   if(!window.confirm('Restore this trip from your Google account to this browser? The existing preserved browser backup will remain available, and cloud data will not be changed.'))return;
   cloud.disabled=true;cloud.textContent='Checking cloud copy…';
   try{await recoverCloudTrip(tripId);window.location.reload()}
   catch(e){note.textContent=e.message;cloud.disabled=false;cloud.textContent='Restore cloud copy';}
  };actions.append(cloud);
 }
 box.append(actions);empty.append(box);
}
if(safeId(tripId)){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
 document.addEventListener('atlas-account-changed',show);
 document.addEventListener('atlas-cloud-trip-updated',show);
}
