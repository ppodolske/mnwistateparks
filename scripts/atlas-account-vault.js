/* Atlas Stage 4 local account separation. UI-level isolation, not encryption.
   Preserves pre-upgrade browser data in a recovery snapshot until claimed. */
(()=>{'use strict';
const K=['mnwiTripCollections','mnwiSavedParks'],TAB='atlas-vault-tab-uid',SHARED='atlas-vault-active-uid',LEGACY='atlas-vault-legacy-backup-v1',GUEST='atlas-vault-guest-backup-v1',CLAIMED='atlas-vault-legacy-claimed-by';
const accountKey=uid=>'atlas-vault-account-v1:'+uid;
const read=(key,def)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??def}catch{return def}};
const raw=()=>Object.fromEntries(K.map(k=>[k,localStorage.getItem(k)||'[]']));
const visible=s=>K.some(k=>{try{return JSON.parse(s[k]||'[]').length>0}catch{return false}});
const blank=()=>{for(const k of K)localStorage.setItem(k,'[]')};
const apply=s=>{for(const k of K)localStorage.setItem(k,s?.[k]||'[]')};
const snapshot=(uid)=>{if(uid)localStorage.setItem(accountKey(uid),JSON.stringify(raw()))};
function preserveLegacy(value){
 if(!visible(value))return;
 const previous=read(LEGACY,null);
 if(!previous)localStorage.setItem(LEGACY,JSON.stringify({at:new Date().toISOString(),data:value}));
 else {
  // Distinct signed-out activity must not be lost or attributed automatically.
  const guest=read(GUEST,null);
  if(!guest)localStorage.setItem(GUEST,JSON.stringify({at:new Date().toISOString(),data:value}));
  else localStorage.setItem('atlas-vault-additional-recovery-'+Date.now(),JSON.stringify(value));
 }
}
let active=localStorage.getItem(SHARED)||sessionStorage.getItem(TAB)||null;
// Preserve and clear pre-Stage-4 data exactly once. Subsequent guest tabs do not
// clear another tab's current local storage. One Google account is active per
// browser profile; switching accounts updates every tab.
if(!active){
 if(!localStorage.getItem(LEGACY)){const old=raw();preserveLegacy(old);if(visible(old))blank()}
}else {
 const previous=read(accountKey(active),null);
 if(previous)apply(previous);
 else {preserveLegacy(raw());blank()}
 sessionStorage.setItem(TAB,active);
}

let last=JSON.stringify(raw());
function switchAccount(uid){
 uid=uid||null;
 const old=active;
 if(old===uid)return false;
 if(old){if(localStorage.getItem(SHARED)===old)snapshot(old)}else preserveLegacy(raw());
 blank();active=uid;
 if(uid){
  const saved=read(accountKey(uid),null);if(saved)apply(saved);
  sessionStorage.setItem(TAB,uid);localStorage.setItem(SHARED,uid);
 }else {sessionStorage.removeItem(TAB);localStorage.removeItem(SHARED);}
 last=JSON.stringify(raw());
 // All legacy renderers cache arrays at page load, so a reload is required to
 // remove previous account cards and re-read the next account's trip data.
 window.location.reload();return true;
}
function claim(dataType='legacy'){
 if(!active)throw Error('Sign in before restoring local data');
 const sourceKey=dataType==='guest'?GUEST:LEGACY;
 const claimedKey=dataType==='guest'?'atlas-vault-guest-claimed-by':CLAIMED;
 const owner=localStorage.getItem(claimedKey);
 if(owner&&owner!==active)throw Error('The preserved data belongs to another account.');
 const previous=read(sourceKey,null);
 if(!previous?.data)return false;
 const current=raw();
 const oldTrips=JSON.parse(previous.data.mnwiTripCollections||'[]');
 const newTrips=JSON.parse(current.mnwiTripCollections||'[]');
 if(!Array.isArray(oldTrips)||!Array.isArray(newTrips))throw Error('Invalid recovery data');
 const combined=newTrips.slice();
 for(const item of oldTrips){const match=combined.find(x=>x?.id===item?.id);
  if(match && JSON.stringify(match)!==JSON.stringify(item))throw Error('A trip ID has different versions. Resolve the existing copies before restoring.');
  if(!match)combined.push(item);
 }
 const oldParks=JSON.parse(previous.data.mnwiSavedParks||'[]');
 const newParks=JSON.parse(current.mnwiSavedParks||'[]');
 if(!Array.isArray(oldParks)||!Array.isArray(newParks))throw Error('Invalid saved-park recovery');
 const next={mnwiTripCollections:JSON.stringify(combined),mnwiSavedParks:JSON.stringify([...new Set([...newParks,...oldParks])])};
 const backup='atlas-vault-before-restore-v1:'+active+':'+Date.now();
 localStorage.setItem(backup,JSON.stringify(current));
 apply(next);snapshot(active);localStorage.setItem(claimedKey,active);
 // Existing Stage 3 revisions still enforce reconciliation after the restored
 // browser copies return. Clear only stale missing-local flags, not other conflicts.
 const mapsKey='atlas-sync-v1:'+active,maps=read(mapsKey,{});
 let changed=false;
 for(const entry of Object.values(maps)){
  if(entry?.conflict==='Local trip was deleted; recovery requires a decision'){
   entry.conflict='';entry.dirty=false;changed=true;
  }
 }
 if(changed)localStorage.setItem(mapsKey,JSON.stringify(maps));
 window.location.reload();return true;
}
window.AtlasAccountVault=Object.freeze({switchAccount,claimLegacy:()=>claim('legacy'),claimGuest:()=>claim('guest'),
 getState:()=>({activeUid:active,legacyAvailable:!!read(LEGACY,null)?.data&&!localStorage.getItem(CLAIMED),guestAvailable:!!read(GUEST,null)?.data&&!localStorage.getItem('atlas-vault-guest-claimed-by')}),
 snapshot:()=>snapshot(active)});
window.addEventListener('pagehide',()=>{if(active&&localStorage.getItem(SHARED)===active)snapshot(active)});
window.addEventListener('storage',event=>{
 if(event.key!==SHARED||event.newValue===active)return;
 // Another tab switched the browser profile's active Google account.
 // Do not save potentially foreign content over the previous account cache.
 window.location.reload();
});
setInterval(()=>{if(!active||localStorage.getItem(SHARED)!==active)return;const next=JSON.stringify(raw());if(next!==last){snapshot(active);last=next}},1200);
})();
