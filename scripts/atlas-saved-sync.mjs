/* Atlas Stage 4: revision-checked favourites sync with explicit first import. */
const KEY='mnwiSavedParks',PREFIX='atlas-saved-sync-v1:';
let uid=null,state=null,conflict='',error='',busy=false,lastCheck=0,lastSeen='',timer=0;
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch{return d}};
const valid=a=>Array.isArray(a)?[...new Set(a.filter(s=>typeof s==='string'&&/^[a-z0-9-]{1,128}$/.test(s)))].sort():[];
const local=()=>valid(read(KEY,[]));
const eq=(a,b)=>JSON.stringify(valid(a))===JSON.stringify(valid(b));
const persist=()=>{if(uid&&state)localStorage.setItem(PREFIX+uid,JSON.stringify(state));};
function changed(){document.dispatchEvent(new Event('atlas-saved-sync-status'))}
async function api(path,options={}){
 const token=await window.AtlasAccountBridge?.getToken?.();if(!token||!uid)throw Error('Sign in required');
 const r=await fetch(path,{method:options.method||'GET',cache:'no-store',headers:{authorization:'Bearer '+token,...(options.body?{'Content-Type':'application/json'}:{})},body:options.body?JSON.stringify(options.body):undefined});
 const data=await r.json();if(!r.ok){const e=Error(data.error||'Saved parks unavailable');e.status=r.status;throw e}return data;
}
function install(parks){
 const before=local();if(eq(before,parks))return;
 localStorage.setItem('atlas-saved-recovery-v1:'+uid+':'+Date.now(),JSON.stringify(before));
 localStorage.setItem(KEY,JSON.stringify(valid(parks)));
 window.AtlasAccountVault?.snapshot?.();
 const page=document.querySelector('[data-page="saved"],[data-page="park"]');
 if(page && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName||''))window.location.reload();
 else if(page)error='Saved parks updated. Reload this page to refresh the current cards.';
}
async function run(force=false){
 if(busy||!uid||!navigator.onLine||document.hidden)return;
 busy=true;const who=uid;error='';try{
  const remote=await api('/api/v1/saved-parks');if(who!==uid)return;
  const browser=local(),server=valid(remote.parks),base=state?.base;
  if(conflict)return;
  if(!state){
   if(!browser.length||eq(browser,server)){
    if(!browser.length)install(server);
    state={revision:remote.revision,base:server};persist();lastCheck=Date.now();return;
   }
   conflict=!server.length?'Confirm import of saved parks into this Google account':'Browser and cloud saved parks differ; choose a version';return;
  }
  if(eq(browser,server)){state={revision:remote.revision,base:server};persist();lastCheck=Date.now();return}
  if(eq(browser,base)){
   install(server);state={revision:remote.revision,base:server};persist();lastCheck=Date.now();return;
  }
  if(eq(server,base)){
   try{const result=await api('/api/v1/saved-parks',{method:'PUT',body:{expectedRevision:remote.revision,parks:browser}});
     if(who!==uid)return;state={revision:result.revision,base:browser};persist();lastCheck=Date.now();return;
   }catch(e){if(e.status===409){conflict='Cloud list changed during save; review both lists';return}throw e}
  }
  conflict='Saved parks changed independently on two devices; choose a version';
 }catch(e){error=e?.message||'Saved parks unavailable'}finally{busy=false;lastCheck=Date.now();changed()}
}
async function resolve(which){
 if(!uid)return;const cloud=await api('/api/v1/saved-parks');
 if(which==='cloud'){
  if(!confirm('Replace this browser’s saved parks with the cloud list? A recovery snapshot will be kept.'))return;
  install(cloud.parks);state={revision:cloud.revision,base:valid(cloud.parks)};
 }else{
  if(!confirm('Publish this browser’s saved parks to your Google account? This replaces the cloud list for your other devices.'))return;
  const browser=local();const result=await api('/api/v1/saved-parks',{method:'PUT',body:{expectedRevision:cloud.revision,parks:browser}});
  state={revision:result.revision,base:browser};
 }
 conflict='';error='';persist();changed();
}
function panel(node){if(!uid)return;
 const box=document.createElement('section');box.className='aa-section';
 const title=document.createElement('h3');title.textContent='Saved parks sync';box.append(title);
 const p=document.createElement('p');p.className='aa-hint';p.textContent=conflict||error||`${local().length} saved parks · ${state?'Synced to Google account':'Waiting for first check'}`;box.append(p);
 if(conflict){for(const [key,text] of [['cloud','Use cloud list'],['browser','Use browser list']]){
  const button=document.createElement('button');button.type='button';button.className='aa-secondary';button.textContent=text;button.disabled=busy;
  button.onclick=()=>resolve(key).catch(e=>{error=e.message;changed()});box.append(button);
 }}else{const b=document.createElement('button');b.className='aa-secondary';b.type='button';b.textContent=busy?'Checking…':'Sync saved parks now';b.disabled=busy;b.onclick=()=>run(true);box.append(b)}
 node.append(box);
}
function accountChanged(){const next=window.AtlasAccountBridge?.getUid?.()||null;if(next===uid)return;
 uid=next;state=uid?read(PREFIX+uid,null):null;conflict='';error='';lastSeen=JSON.stringify(local());lastCheck=0;clearTimeout(timer);changed();if(uid)timer=setTimeout(()=>run(true),700);
}
window.AtlasSavedSync={appendPanel:panel,syncNow:()=>run(true),status:()=>({conflict,error,revision:state?.revision||0})};
document.addEventListener('atlas-account-changed',accountChanged);
window.addEventListener('focus',()=>{if(uid&&Date.now()-lastCheck>15000)run(true)});
window.addEventListener('online',()=>run(true));
setInterval(()=>{if(!uid||busy||document.hidden)return;const next=JSON.stringify(local());if(next!==lastSeen){lastSeen=next;run(false)}else if(Date.now()-lastCheck>60000)run(true)},2500);
accountChanged();
