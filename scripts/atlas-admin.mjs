/* Server-authorised metrics only; no user, trip or invitation identities. */
const root=document.getElementById('atlasAdminRoot');
const labels={users:'Registered users',active_users_30d:'Active users · 30 days',trips:'Total cloud trips',scheduled_trips:'Trips with dates',saved_parks:'Saved parks',collaborators:'Active collaborators',pending_invitations:'Pending invitations',trip_document_bytes:'Trip JSON bytes'};
const card=(label,note,value)=>{const box=document.createElement('article');box.className='ad-card';
 const title=document.createElement('p');title.textContent=label;
 const number=document.createElement('strong');number.textContent=new Intl.NumberFormat('en-AU').format(Number(value)||0);
 box.append(title,number);if(note){const small=document.createElement('small');small.textContent=note;box.append(small)}return box};
const status=(text)=>{if(root)root.textContent=text};
async function render(){
 if(!root)return;
 const token=await window.AtlasAccountBridge?.getToken?.();if(!token){status('Sign in with your administrator Google account using the Account button, then return here.');return}
 status('Loading private aggregate statistics…');
 try{
  const r=await fetch('/api/v1/admin/overview',{headers:{authorization:'Bearer '+token},cache:'no-store'});
  if(r.status===403){status('Access denied. Only the assigned Atlas administrator can view these statistics.');return}
  if(!r.ok)throw Error('Admin service returned HTTP '+r.status);
  const d=await r.json(),s=d.summary;
  if(!s||Object.keys(s).some(k=>!(k in labels)))throw Error('Unexpected dashboard response');
  root.replaceChildren();const stats=document.createElement('div');stats.className='ad-grid';
  for(const key of ['users','active_users_30d','trips','scheduled_trips','saved_parks','collaborators','pending_invitations','trip_document_bytes'])
   stats.append(card(labels[key],key==='trip_document_bytes'?'Trip documents only':'' ,s[key]));
  root.append(stats);
  const block=document.createElement('section');block.className='ad-trend';
  const h=document.createElement('h2');h.textContent='New trips by month';block.append(h);
  const now=new Date(d.asOf||Date.now()),monthly=new Map((d.monthlyTrips||[]).map(x=>[x.month,Number(x.trips)||0]));
  const months=[];
  for(let i=5;i>=0;i--){const dt=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-i,1));months.push({key:dt.toISOString().slice(0,7),label:dt.toLocaleString('en-AU',{month:'short',timeZone:'UTC'})})}
  const max=Math.max(1,...months.map(m=>monthly.get(m.key)||0));
  const recentTotal=months.reduce((total,m)=>total+(monthly.get(m.key)||0),0);
  const count=document.createElement('p');count.className='ad-trend-count';
  count.textContent=`${recentTotal} new trip${recentTotal===1?'':'s'} over the last six months`;
  block.append(count);
  const chart=document.createElement('div');chart.className='ad-bars';
  for(const m of months){const col=document.createElement('div');col.className='ad-bar-col';
   const value=monthly.get(m.key)||0;const n=document.createElement('strong');n.textContent=String(value);
   const bar=document.createElement('div');bar.className='ad-bar';bar.style.height=(value?Math.max(8,Math.round(35*value/max)):2)+'px';bar.setAttribute('aria-label',`${m.label}: ${value} trips`);
   const label=document.createElement('span');label.textContent=m.label;col.append(n,bar,label);chart.append(col)}
  block.append(chart);root.append(block);
  const info=document.createElement('p');info.className='ad-note';info.textContent=`Last refreshed ${new Date(d.asOf).toLocaleString('en-AU')}. ${d.storageNote} This dashboard deliberately excludes emails and trip contents.`;root.append(info);
 }catch(e){status('Unable to load statistics: '+e.message)}
}
document.addEventListener('atlas-account-changed',render);
const button=document.getElementById('atlasAdminRefresh');if(button)button.onclick=render;
setTimeout(render,250);
