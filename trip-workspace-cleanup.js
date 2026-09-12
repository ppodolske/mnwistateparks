(()=>{
  const page=document.querySelector('[data-page="trip"]');
  if(!page)return;

  const style=document.createElement('style');
  style.textContent=`
    #tripRouteOverview,#dayPlanHelp,#workspaceStops,#itineraryModelPanel{display:none!important}
    .trip-workspace-clean-note{font-size:10px;color:#667;line-height:1.4;margin-top:5px}
  `;
  document.head.appendChild(style);

  function removeRedundant(){
    ['tripRouteOverview','dayPlanHelp','workspaceStops','itineraryModelPanel'].forEach(id=>document.getElementById(id)?.remove());
    document.querySelectorAll('#workspaceLogistics .trip-legacy-logistics').forEach(el=>el.remove());

    const intro=page.querySelector('.trip-workspace-intro');
    const summary=document.getElementById('tripSummary');
    const next=document.getElementById('tripNextActions');
    const logistics=document.getElementById('workspaceLogistics');
    const itinerary=document.getElementById('workspaceItinerary');
    const exportSection=document.getElementById('workspaceExport');

    if(intro){
      const copy=intro.querySelector('p');
      if(copy)copy.textContent='Set the trip details, work through each day, then export the finished plan when it is ready.';
      const nav=intro.querySelector('.trip-workspace-jumps');
      if(nav)nav.innerHTML='<a href="#tripNextActions">Next actions</a><a href="#workspaceLogistics">Trip details</a><a href="#workspaceItinerary">Itinerary</a><a href="#workspaceExport">Export</a>';
    }

    // Canonical working order: summary → next actions → trip details → itinerary → export.
    let anchor=intro;
    for(const el of [summary,next,logistics,itinerary,exportSection]){
      if(!el||!anchor)continue;
      anchor.insertAdjacentElement('afterend',el);
      anchor=el;
    }

    if(logistics){
      const head=logistics.querySelector('.trip-workspace-section-head h2');
      if(head)head.textContent='Trip details';
      const help=logistics.querySelector('.trip-workspace-section-head p');
      if(help)help.textContent='Dates, start/return location and optional trip-wide information.';
    }
    if(itinerary){
      const head=itinerary.querySelector('.trip-workspace-section-head h2');
      if(head)head.textContent='Day-by-day itinerary';
      const help=itinerary.querySelector('.trip-workspace-section-head p');
      if(help)help.textContent='Resolve any unassigned parks first, then order stops, add notes and capture camping details by day.';
    }

    // The day editor remains the canonical assigned-stop editor. v1.17 adds a dedicated
    // unassigned queue immediately above it rather than treating Unassigned as a fake day.
    const dayEditor=document.getElementById('tripDayEditor');
    if(dayEditor&&itinerary&&!itinerary.contains(dayEditor))itinerary.appendChild(dayEditor);

    document.querySelectorAll('.trip-day-editor-head p').forEach(p=>{
      p.textContent='Change stop order, notes and camping details directly in the itinerary.';
    });

    // Canonical readiness renderer is the logistics/readiness implementation from v1.15.1+.
    if(window.TripLogisticsFix?.renderReadiness){
      window.TripNextActions=window.TripNextActions||{};
      window.TripNextActions.render=window.TripLogisticsFix.renderReadiness;
      window.TripNextActions.actionsFor=window.TripLogisticsFix.readinessActions;
      window.TripLogisticsFix.renderReadiness();
    }
  }

  removeRedundant();
  setTimeout(removeRedundant,150);
  setTimeout(removeRedundant,600);
  document.addEventListener('trip-logistics-saved',()=>setTimeout(removeRedundant,60));
  document.addEventListener('click',e=>{
    if(e.target&&['saveTripDayEditor','saveTripLogisticsBtn','saveTripLocationsBtn'].includes(e.target.id))setTimeout(removeRedundant,180);
  });
  window.TripWorkspaceCleanup={apply:removeRedundant};
})();

// v1.17.0 — dedicated unassigned-stop workflow.
(()=>{
  const page=document.querySelector('[data-page="trip"]');
  if(!page)return;
  const KEY='mnwiTripCollections';
  const id=page.dataset.tripId;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const write=v=>localStorage.setItem(KEY,JSON.stringify(v));
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const parksNode=document.getElementById('parksData');
  const parks=parksNode?JSON.parse(parksNode.textContent):[];
  const bySlug=new Map(parks.map(p=>[p.slug,p]));

  const style=document.createElement('style');
  style.textContent=`
    #tripDayEditor .trip-day-card.warn{display:none!important}
    .trip-unassigned{margin:0 0 18px;border:1px solid #d8b58d;background:#fff}
    .trip-unassigned-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:14px 16px;background:#fbf6ef;border-bottom:1px solid #ead7bf}
    .trip-unassigned-head h3{margin:2px 0 3px;font-size:18px}.trip-unassigned-head p{margin:0;font-size:10px;color:#667;line-height:1.4;max-width:560px}
    .trip-unassigned-count{min-width:42px;height:42px;border-radius:50%;background:#fff;border:1px solid #d8b58d;display:grid;place-items:center;font-weight:900;color:#8a4e31}
    .trip-unassigned-list{display:grid}.trip-unassigned-stop{padding:13px 16px;border-bottom:1px solid #edf0f2}.trip-unassigned-stop:last-child{border-bottom:0}
    .trip-unassigned-main{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center}.trip-unassigned-title b{display:block;font-size:13px}.trip-unassigned-title span{display:block;margin-top:2px;font-size:9px;color:#667}
    .trip-unassigned-actions{display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}.trip-unassigned-actions select{border:1px solid #cbd5da;background:#fff;padding:7px 8px;font:inherit;font-size:10px;min-width:112px}
    .trip-unassigned-btn{border:1px solid #cbd5da;background:#fff;color:#00558a;padding:7px 9px;font-size:9px;font-weight:800;cursor:pointer}.trip-unassigned-btn.primary{background:#00558a;border-color:#00558a;color:#fff}.trip-unassigned-btn.danger{color:#8a3d31}.trip-unassigned-btn:disabled{opacity:.45;cursor:default}
    .trip-unassigned-status{font-size:10px;color:#47745b;padding:0 16px 10px}.trip-unassigned-status:empty{display:none}
    @media(max-width:700px){.trip-unassigned-head{display:block}.trip-unassigned-count{margin-top:10px}.trip-unassigned-main{grid-template-columns:1fr}.trip-unassigned-actions{justify-content:flex-start}.trip-unassigned-actions select{flex:1 1 120px}.trip-unassigned-btn{flex:1 1 auto}}
    @media print{.trip-unassigned{display:none!important}}
  `;
  document.head.appendChild(style);

  function getTrip(){return read().find(t=>t.id===id)}
  function assignedDays(trip){
    const vals=(trip.parks||[]).map(slug=>String(trip.stopMeta?.[slug]?.day||'').trim()).filter(Boolean);
    return [...new Set(vals)].sort((a,b)=>{const an=Number(a),bn=Number(b);if(Number.isFinite(an)&&Number.isFinite(bn))return an-bn;return a.localeCompare(b,undefined,{numeric:true})});
  }
  function nextDay(trip){
    const nums=assignedDays(trip).map(Number).filter(n=>Number.isFinite(n)&&n>=1);
    return String(nums.length?Math.max(...nums)+1:1);
  }
  function unassignedSlugs(trip){return (trip.parks||[]).filter(slug=>bySlug.has(slug)&&!String(trip.stopMeta?.[slug]?.day||'').trim())}
  function persistOpenEdits(){try{window.TripDayEditor?.persist?.(false)}catch{}}
  function refresh(){
    try{window.TripDayEditor?.render?.()}catch{}
    render();
    window.TripLogisticsFix?.renderReadiness?.();
    window.TripWorkspaceCleanup?.apply?.();
  }
  function mutate(slug,fn,message){
    persistOpenEdits();
    const trips=read(),trip=trips.find(t=>t.id===id);if(!trip)return;
    trip.stopMeta=trip.stopMeta||{};
    fn(trip);
    write(trips);
    refresh();
    const status=document.getElementById('tripUnassignedStatus');
    if(status&&message){status.textContent=message;setTimeout(()=>{if(status.textContent===message)status.textContent=''},1800)}
  }
  function assign(slug,day){
    if(!String(day||'').trim())return;
    mutate(slug,trip=>{trip.stopMeta[slug]={...(trip.stopMeta[slug]||{}),day:String(day).trim()}},'Park assigned to Day '+day+' ✓');
  }
  function createDay(slug){
    const trip=getTrip();if(!trip)return;const day=nextDay(trip);
    assign(slug,day);
  }
  function removeStop(slug){
    const p=bySlug.get(slug);if(!p)return;
    if(!window.confirm('Remove '+p.name+' from this trip?'))return;
    mutate(slug,trip=>{trip.parks=(trip.parks||[]).filter(x=>x!==slug);if(trip.stopMeta)delete trip.stopMeta[slug]},p.name+' removed from trip ✓');
  }

  function cardHtml(slug,days){
    const p=bySlug.get(slug);if(!p)return'';
    const options=days.length?'<option value="">Choose day…</option>'+days.map(d=>'<option value="'+esc(d)+'">Day '+esc(d)+'</option>').join(''):'<option value="">No days yet</option>';
    return '<article class="trip-unassigned-stop" data-slug="'+esc(slug)+'"><div class="trip-unassigned-main"><div class="trip-unassigned-title"><b>'+esc(p.name)+'</b><span>'+esc([p.city,p.state].filter(Boolean).join(', '))+'</span></div><div class="trip-unassigned-actions"><select class="trip-unassigned-day" aria-label="Assign '+esc(p.name)+' to day" '+(days.length?'':'disabled')+'>'+options+'</select><button type="button" class="trip-unassigned-btn primary assign-existing" '+(days.length?'':'disabled')+'>Assign to Day</button><button type="button" class="trip-unassigned-btn create-day">Create New Day</button><button type="button" class="trip-unassigned-btn danger remove-stop">Remove from Trip</button></div></div></article>';
  }

  function render(){
    const itinerary=document.getElementById('workspaceItinerary'),trip=getTrip();if(!itinerary||!trip)return;
    const slugs=unassignedSlugs(trip);
    let root=document.getElementById('tripUnassignedWorkflow');
    if(!slugs.length){root?.remove();return}
    if(!root){root=document.createElement('section');root.id='tripUnassignedWorkflow';root.className='trip-unassigned';const editor=document.getElementById('tripDayEditor');if(editor&&editor.parentElement===itinerary)itinerary.insertBefore(root,editor);else itinerary.appendChild(root)}
    const days=assignedDays(trip);
    root.innerHTML='<div class="trip-unassigned-head"><div><div class="kicker blue">UNASSIGNED STOPS</div><h3>Decide where these parks belong.</h3><p>New parks stay here until you assign them to an existing day, create a new day for them, or remove them from the trip. This section disappears when everything is assigned.</p></div><div class="trip-unassigned-count">'+slugs.length+'</div></div><div class="trip-unassigned-list">'+slugs.map(slug=>cardHtml(slug,days)).join('')+'</div><div id="tripUnassignedStatus" class="trip-unassigned-status"></div>';
    root.querySelectorAll('.assign-existing').forEach(btn=>btn.addEventListener('click',()=>{const card=btn.closest('.trip-unassigned-stop'),sel=card.querySelector('.trip-unassigned-day');assign(card.dataset.slug,sel?.value)}));
    root.querySelectorAll('.create-day').forEach(btn=>btn.addEventListener('click',()=>createDay(btn.closest('.trip-unassigned-stop').dataset.slug)));
    root.querySelectorAll('.remove-stop').forEach(btn=>btn.addEventListener('click',()=>removeStop(btn.closest('.trip-unassigned-stop').dataset.slug)));
  }

  function wrapDayEditor(){
    const api=window.TripDayEditor;if(!api||api.__v117Wrapped)return;
    const original=api.render;
    if(typeof original==='function')api.render=function(){const out=original.apply(this,arguments);setTimeout(render,0);return out};
    api.__v117Wrapped=true;
  }
  wrapDayEditor();render();
  setTimeout(()=>{wrapDayEditor();render()},180);
  setTimeout(()=>{wrapDayEditor();render()},650);
  document.addEventListener('trip-logistics-saved',()=>setTimeout(render,80));
  window.addEventListener('storage',e=>{if(e.key===KEY)render()});
  window.TripUnassignedWorkflow={render,assign,createDay,removeStop,assignedDays,nextDay};
})();
