const current=require('./site-current.js');
const VERSION='1.17.0';
const PORT=process.env.PORT||3000;

const UNASSIGNED_JS=`(()=>{
  const page=document.querySelector('[data-page="trip"]');if(!page)return;
  const KEY='mnwiTripCollections',id=page.dataset.tripId;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const write=v=>localStorage.setItem(KEY,JSON.stringify(v));
  const trip=()=>read().find(t=>t.id===id);
  const parksNode=document.getElementById('parksData');
  const parks=parksNode?JSON.parse(parksNode.textContent):[];
  const bySlug=new Map(parks.map(p=>[p.slug,p]));
  const esc=s=>String(s??'').replace(/[&<>\\\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\"':'&quot;'}[c]));
  const style=document.createElement('style');style.textContent='.trip-unassigned-enabled .trip-day-card.warn{display:none!important}.trip-unassigned{margin:0 0 18px;border:1px solid #d8b58d;background:#fffaf4}.trip-unassigned[hidden]{display:none!important}.trip-unassigned-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;padding:14px 16px;border-bottom:1px solid #ead7bf;background:#fbf6ef}.trip-unassigned-head h3{margin:2px 0 3px;font-size:18px}.trip-unassigned-head p{margin:0;color:#6f6256;font-size:10px;line-height:1.4;max-width:620px}.trip-unassigned-count{background:#fff;border:1px solid #d8b58d;color:#8a4e31;font-size:10px;font-weight:800;padding:6px 8px;white-space:nowrap}.trip-unassigned-stop{padding:12px 16px;border-bottom:1px solid #efe2d2}.trip-unassigned-stop:last-child{border-bottom:0}.trip-unassigned-stop b{display:block;font-size:13px}.trip-unassigned-stop small{display:block;color:#76695d;font-size:9px;margin-top:2px}.trip-unassigned-actions{display:flex;gap:7px;align-items:end;flex-wrap:wrap;margin-top:9px}.trip-unassigned-actions label>span{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#76695d;font-weight:800;margin-bottom:3px}.trip-unassigned-actions select{border:1px solid #cfb997;background:#fff;padding:7px 24px 7px 8px;font:inherit;min-width:100px}.trip-unassigned-btn{border:1px solid #9bb9ca;background:#fff;color:#00558a;padding:7px 9px;font-size:9px;font-weight:800;cursor:pointer}.trip-unassigned-btn.primary{background:#00558a;border-color:#00558a;color:#fff}.trip-unassigned-btn.remove{color:#8a4e31;border-color:#d8b58d}@media(max-width:650px){.trip-unassigned-head{display:block}.trip-unassigned-count{display:inline-block;margin-top:8px}.trip-unassigned-actions label{width:100%}.trip-unassigned-actions select{width:100%}.trip-unassigned-btn{flex:1 1 auto;min-height:38px}}@media print{.trip-unassigned{display:none!important}}';document.head.appendChild(style);page.classList.add('trip-unassigned-enabled');
  let section=document.getElementById('tripUnassignedStops');if(!section){section=document.createElement('section');section.id='tripUnassignedStops';section.className='trip-unassigned';const editor=document.getElementById('tripDayEditor'),itinerary=document.getElementById('workspaceItinerary');if(editor)editor.insertAdjacentElement('beforebegin',section);else if(itinerary)itinerary.prepend(section);else page.appendChild(section)}
  const assignedDays=t=>[...new Set((t.parks||[]).map(s=>Number(t.stopMeta?.[s]?.day)).filter(n=>Number.isFinite(n)&&n>0))].sort((a,b)=>a-b);
  const nextDay=t=>{const d=assignedDays(t);return d.length?Math.max(...d)+1:1};
  const unassigned=t=>(t.parks||[]).filter(s=>!String(t.stopMeta?.[s]?.day||'').trim());
  function refresh(){window.TripDayEditor?.render?.();window.TripLogisticsFix?.renderReadiness?.();window.TripWorkspaceCleanup?.apply?.();setTimeout(render,20)}
  function assign(slug,day){const trips=read(),t=trips.find(x=>x.id===id);if(!t)return;t.stopMeta=t.stopMeta||{};t.stopMeta[slug]={...(t.stopMeta[slug]||{}),day:String(day)};write(trips);refresh()}
  function createDay(slug){const t=trip();if(t)assign(slug,nextDay(t))}
  function removeStop(slug){const t=trip(),p=bySlug.get(slug);if(!t||!confirm('Remove '+(p?.name||'this park')+' from this trip?'))return;const trips=read(),target=trips.find(x=>x.id===id);target.parks=(target.parks||[]).filter(s=>s!==slug);if(target.stopMeta)delete target.stopMeta[slug];write(trips);refresh()}
  function render(){const t=trip();if(!t){section.hidden=true;return}const slugs=unassigned(t);if(!slugs.length){section.hidden=true;section.innerHTML='';return}section.hidden=false;const days=assignedDays(t),base=days[0]||1,newDay=nextDay(t);section.innerHTML='<div class="trip-unassigned-head"><div><div class="kicker blue">UNASSIGNED STOPS</div><h3>Give every park a day.</h3><p>These parks are in the trip but are not yet part of a numbered day. Assign one to an existing day, create the next day, or remove it from the trip.</p></div><div class="trip-unassigned-count">'+slugs.length+' UNASSIGNED</div></div><div>'+slugs.map(slug=>{const p=bySlug.get(slug);if(!p)return'';const opts=(days.length?days:[1]).map(d=>'<option value="'+d+'">Day '+d+'</option>').join('');return '<article class="trip-unassigned-stop" data-slug="'+esc(slug)+'"><b>'+esc(p.name)+'</b><small>'+esc([p.city,p.state].filter(Boolean).join(', '))+'</small><div class="trip-unassigned-actions"><label><span>Assign to</span><select class="trip-unassigned-day">'+opts+'</select></label><button type="button" class="trip-unassigned-btn primary assign-existing">Assign to Day '+base+'</button><button type="button" class="trip-unassigned-btn create-new">Create Day '+newDay+'</button><button type="button" class="trip-unassigned-btn remove remove-stop">Remove from trip</button></div></article>'}).join('')+'</div>';section.querySelectorAll('.trip-unassigned-stop').forEach(card=>{const slug=card.dataset.slug,sel=card.querySelector('.trip-unassigned-day'),btn=card.querySelector('.assign-existing');const label=()=>btn.textContent='Assign to Day '+(sel.value||base);label();sel.addEventListener('change',label);btn.addEventListener('click',()=>assign(slug,sel.value||base));card.querySelector('.create-new').addEventListener('click',()=>createDay(slug));card.querySelector('.remove-stop').addEventListener('click',()=>removeStop(slug))})}
  render();document.addEventListener('click',e=>{if(e.target&&['saveTripDayEditor','saveTripLogisticsBtn','saveTripLocationsBtn'].includes(e.target.id))setTimeout(render,180)});window.addEventListener('storage',e=>{if(e.key===KEY)render()});window.TripUnassigned={render,assign,createDay,removeStop,unassigned,nextDay};
})();`;

function injectPhase4(body){
  const html=Buffer.isBuffer(body)?body.toString('utf8'):String(body??'');
  if(!html.includes('</body>'))return body;
  return html.replace('</body>',`<script>${UNASSIGNED_JS}</script></body>`);
}

function createServer(){
  const server=current.createServer();
  const original=server.listeners('request')[0];
  server.removeAllListeners('request');
  server.on('request',(req,res)=>{
    let url;try{url=new URL(req.url,'http://localhost')}catch{return original(req,res)}
    if(url.pathname==='/health'){
      const coords=current.loadCoords();
      res.writeHead(200,{'content-type':'application/json'});
      return res.end(JSON.stringify({
        ok:true,
        version:VERSION,
        architecture:'current-runtime-v117-wrapper',
        parks:current.parks.length,
        collections:current.COLLECTIONS.length,
        parkReferenceRecords:Object.keys(current.parkDetails||{}).length,
        mapCoordinates:coords?Object.keys(coords.parks||{}).length:0,
        features:['trip-workspace-cleanup','single-visible-logistics-editor','single-visible-day-by-day-editor','single-readiness-renderer','unassigned-stops-workflow','assign-to-existing-day','create-next-day','remove-unassigned-stop','mobile-explicit-actions','booklet-hidden-in-workspace','booklet-pdf-export']
      }));
    }
    if(url.pathname==='/trip'){
      const end=res.end.bind(res);
      res.end=(body,...args)=>end(injectPhase4(body),...args);
    }
    return original(req,res);
  });
  return server;
}

if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT} (unassigned stops release)`));
module.exports={...current,VERSION,UNASSIGNED_JS,injectPhase4,createServer};
