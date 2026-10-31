/* Atlas Accounts: opt-in Google identity, non-destructive trip import and sharing.
   Deliberately does not replace the legacy localStorage editor or pretend to autosync. */
const CONFIG='/atlas-firebase-config.json';
const TRIPS='mnwiTripCollections';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&quot;'}[c]));
const shorten=s=>String(s||'').slice(0,110);
let auth,fb,user=null,profile=null,cloud=[],imports=[],panel,trigger,notice='',working=false;
const inviteToken=()=>/^#invite=([a-f0-9]{64})$/.exec(location.hash)?.[1]||'';
const localTrips=()=>{try{const x=JSON.parse(localStorage.getItem(TRIPS)||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
const validSources=()=>localTrips().filter(t=>t&&typeof t==='object'&&Array.isArray(t.parks)&&typeof t.id==='string'&&t.id.length>0&&t.id.length<=128&&/^[\w.:~-]+$/.test(t.id));

function showMessage(text){notice=String(text||'');render();}
async function api(path,options={}){
  const token=await auth.currentUser?.getIdToken();
  if(!token)throw Error('Sign in with Google first');
  const res=await fetch(path,{method:options.method||'GET',cache:'no-store',credentials:'same-origin',
    headers:{Authorization:'Bearer '+token,...(options.body?{'Content-Type':'application/json'}:{})},
    body:options.body?JSON.stringify(options.body):undefined});
  let data;try{data=await res.json()}catch{throw Error('Server returned an unexpected response')}
  if(!res.ok)throw Error(data.error||'Account request failed');
  return data;
}
async function refresh(){
  if(!user){profile=null;cloud=[];imports=[];render();return}
  try{
    const [a,t,m]=await Promise.all([api('/api/v1/account'),api('/api/v1/trips'),api('/api/v1/migrations')]);
    profile=a;cloud=t.trips||[];imports=m.imports||[];notice='';
  }catch(err){profile=null;cloud=[];imports=[];notice='Account service unavailable: '+err.message}
  render();
}
function create(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
function render(){
  if(!trigger||!panel)return;
  const conflicts=window.AtlasCloudSync?.getStatus?.().conflicts||0;
  trigger.textContent=user?(conflicts?`Account · ${conflicts} conflict${conflicts===1?'':'s'}`:'Account'):'Sign in';
  const open=panel.dataset.open==='true';panel.hidden=!open;
  if(!open)return;
  const done=new Set(imports.map(x=>x.source_id)),local=validSources(),pending=local.filter(t=>!done.has(t.id));
  panel.replaceChildren();
  const top=create('div','aa-head');top.append(create('strong','',user?'Your Atlas account':'Atlas Accounts'));
  const close=create('button','aa-icon','✕');close.type='button';close.setAttribute('aria-label','Close account panel');close.onclick=()=>{panel.dataset.open='false';render()};top.append(close);panel.append(top);
  if(notice)panel.append(create('p','aa-notice',notice));
  if(!user){
    panel.append(create('p','aa-copy','Sign in to keep a private cloud copy of your trip plans and accept invitations.'));
    const btn=create('button','aa-primary','Continue with Google');btn.type='button';btn.disabled=working;
    btn.onclick=()=>perform(async()=>{await fb.signInWithPopup(auth,new fb.GoogleAuthProvider())});panel.append(btn);
    if(inviteToken())panel.append(create('p','aa-hint','An invitation is waiting. Sign in with the Google account it was addressed to.'));
    return;
  }
  panel.append(create('p','aa-copy',user.email||'Signed in'));
  if(!profile){panel.append(create('p','aa-hint','Cloud features will be available after the Atlas backend is configured.'));return}
  if(inviteToken()){
    const invite=create('section','aa-section');invite.append(create('h3','','Trip invitation'));
    invite.append(create('p','aa-copy','Accept this invitation for the Google email it was addressed to.'));
    const accept=create('button','aa-primary','Accept invitation');accept.disabled=working;
    accept.onclick=()=>perform(async()=>{
      const out=await api('/api/v1/invitations/accept',{method:'POST',body:{token:inviteToken()}});
      history.replaceState(null,'',location.pathname+location.search);
      await refresh();document.dispatchEvent(new Event('atlas-cloud-data-changed'));notice='Invitation accepted ('+out.role+'). Your shared trip appears below.';
    });invite.append(accept);panel.append(invite);
  }
  const trips=create('section','aa-section');trips.append(create('h3','',`Cloud trips · ${cloud.length}`));
  trips.append(create('p','aa-hint','Signed-in trips synchronize automatically when online. Shared viewers cannot publish edits. Conflicts require your decision.'));
  if(cloud.length){
    const list=create('ul','aa-trip-list');for(const trip of cloud){
      const li=create('li');const localId=window.AtlasCloudSync?.getLocalId?.(trip.id);
      if(localId){const link=create('a','',shorten(trip.title));link.href='/trip?id='+encodeURIComponent(localId);li.append(link)}
      else li.append(create('span','',shorten(trip.title)));
      li.append(create('small','',trip.role));list.append(li)
    }trips.append(list)
  }else trips.append(create('p','aa-copy','No cloud trips yet.'));
  panel.append(trips);
  const migrate=create('section','aa-section');migrate.append(create('h3','','Import browser trips'));
  migrate.append(create('p','aa-copy',`${pending.length} available to copy to your cloud account; ${local.length-pending.length} previously imported on this browser.`));
  if(pending.length){
    const list=create('ul','aa-trip-list');for(const t of pending.slice(0,20))list.append(create('li','',shorten(t.name||t.title||'Untitled trip')));migrate.append(list);
    const confirm=create('label','aa-confirm');const check=create('input');check.type='checkbox';check.id='aa-import-check';confirm.append(check,document.createTextNode(' I understand this makes a cloud copy. Atlas will reconcile edits with the original browser trip before enabling sync.'));migrate.append(confirm);
    const btn=create('button','aa-primary',`Copy ${pending.length} trip${pending.length===1?'':'s'} to cloud`);btn.disabled=working;
    btn.onclick=()=>perform(async()=>{
      if(!check.checked)throw Error('Confirm the import details first');
      let count=0;for(const t of pending){await api('/api/v1/migrations',{method:'POST',body:{sourceId:t.id,document:t}});count++}
      await refresh();document.dispatchEvent(new Event('atlas-cloud-data-changed'));notice=`${count} trip${count===1?'':'s'} copied. Your local versions were not changed.`;
    });migrate.append(btn)
  }else migrate.append(create('p','aa-hint','Nothing to import from this browser.'));
  panel.append(migrate);
  const own=cloud.filter(t=>t.role==='owner');
  if(own.length){
    const share=create('section','aa-section');share.append(create('h3','','Share a cloud trip'));
    share.append(create('p','aa-hint','Invitations expire after seven days and can only be accepted by the addressed Google account.'));
    const form=create('form','aa-share');const select=create('select');select.required=true;select.setAttribute('aria-label','Trip to share');
    for(const t of own){const option=create('option','',shorten(t.title));option.value=t.id;select.append(option)}form.append(select);
    const email=create('input');email.type='email';email.placeholder='Friend or family member’s Google email';email.required=true;email.maxLength=254;email.autocomplete='off';form.append(email);
    const role=create('select');role.setAttribute('aria-label','Permission');for(const x of ['viewer','editor']){const op=create('option','',x==='viewer'?'Can view':'Can edit');op.value=x;role.append(op)}form.append(role);
    const go=create('button','aa-primary','Create invitation');go.type='submit';go.disabled=working;form.append(go);
    const result=create('div','aa-link');form.onsubmit=e=>{e.preventDefault();perform(async()=>{
      const data=await api(`/api/v1/trips/${encodeURIComponent(select.value)}/invitations`,{method:'POST',body:{email:email.value.trim(),role:role.value}});
      result.replaceChildren();const copy=create('input');copy.readOnly=true;copy.value=data.inviteUrl;copy.setAttribute('aria-label','Invitation link');result.append(copy);
      const button=create('button','aa-secondary','Copy link');button.type='button';button.onclick=async()=>{try{await navigator.clipboard.writeText(copy.value);button.textContent='Copied'}catch{copy.select()}};result.append(button);
    })};share.append(form,result);panel.append(share);
  }
  window.AtlasCloudSync?.appendPanel?.(panel);
  window.AtlasSavedSync?.appendPanel?.(panel);
  window.AtlasStage4UI?.appendPanel?.(panel,{profile,cloud,api});
  const vault=window.AtlasAccountVault?.getState?.();
  if(vault?.legacyAvailable){
    const restore=create('section','aa-section');restore.append(create('h3','','Preserved browser trips & parks'));
    restore.append(create('p','aa-copy','Your pre-update browser data was saved before account isolation. Choose Restore to associate it with this signed-in account. Cloud trip revisions still require normal conflict checks.'));
    const b=create('button','aa-primary','Restore preserved browser data');
    b.onclick=()=>perform(async()=>{if(!confirm('Associate the preserved trips and saved parks with this Google account? Existing cloud data will not be overwritten.'))return;window.AtlasAccountVault.claimLegacy()});
    restore.append(b);panel.append(restore);
  }
  if(vault?.guestAvailable){
    const guest=create('section','aa-section');guest.append(create('h3','','Guest browser data'));
    guest.append(create('p','aa-copy','Saved while signed out. You can explicitly attach these browser trips and parks to this account.'));
    const button=create('button','aa-primary','Restore guest browser data');
    button.onclick=()=>perform(async()=>{if(!confirm('Associate guest browser data with this signed-in account?'))return;window.AtlasAccountVault.claimGuest()});
    guest.append(button);panel.append(guest);
  }
  if(profile.admin){const admin=create('section','aa-section');admin.append(create('h3','','Admin summary'));const btn=create('button','aa-secondary','Load aggregate counts');btn.onclick=()=>perform(async()=>{
    const r=await api('/api/v1/admin/summary');const d=r.summary;btn.textContent=`${d.users} users · ${d.trips} trips · ${d.scheduled_trips} scheduled`;
  });admin.append(btn);panel.append(admin)}
  const foot=create('div','aa-footer');const signout=create('button','aa-secondary','Sign out');signout.onclick=()=>perform(()=>fb.signOut(auth));foot.append(signout);panel.append(foot);
}
async function perform(fn){if(working)return;working=true;render();try{await fn()}catch(err){notice=err?.message||'Request failed'}finally{working=false;render()}}
async function init(){
  let cfg;try{const r=await fetch(CONFIG,{cache:'no-store'});if(!r.ok)return;cfg=await r.json()}catch{return}
  if(!cfg.enabled||!cfg.apiKey||!cfg.projectId||!cfg.authDomain||!cfg.appId)return;
  const [{initializeApp},authLib]=await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js')
  ]);
  fb=authLib;auth=authLib.getAuth(initializeApp({apiKey:cfg.apiKey,authDomain:cfg.authDomain,projectId:cfg.projectId,appId:cfg.appId}));
  await authLib.setPersistence(auth,authLib.browserLocalPersistence);
  trigger=create('button','aa-trigger','Sign in');trigger.type='button';trigger.setAttribute('aria-label','Atlas account');
  panel=create('aside','aa-panel');panel.id='atlasAccountPanel';panel.dataset.open=inviteToken()?'true':'false';panel.hidden=true;panel.setAttribute('aria-label','Atlas account settings');
  trigger.onclick=()=>{panel.dataset.open=panel.dataset.open==='true'?'false':'true';render()};
  document.body.append(trigger,panel);
  window.AtlasAccountBridge=Object.freeze({
    getUid:()=>auth.currentUser?.uid||null,
    getToken:async()=>auth.currentUser?.getIdToken()||null
  });
  document.addEventListener('atlas-sync-status',()=>render());
  document.addEventListener('atlas-saved-sync-status',()=>render());
  document.addEventListener('atlas-stage4-refresh',()=>render());
  document.addEventListener('atlas-sync-cloud-created',()=>refresh());
  authLib.onAuthStateChanged(auth,async u=>{
    if(window.AtlasAccountVault?.switchAccount?.(u?.uid||null))return;
    user=u;await refresh();document.dispatchEvent(new Event('atlas-account-changed'));
  });
  render();
}
init().catch(err=>console.error('Atlas Accounts unavailable:',err));
