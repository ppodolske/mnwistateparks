(()=>{
  const page=document.querySelector('[data-page="trip"]');
  if(!page)return;
  const KEY='mnwiTripCollections';
  const id=page.dataset.tripId;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const write=v=>localStorage.setItem(KEY,JSON.stringify(v));
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const getTrip=()=>read().find(t=>t.id===id);

  function applyDefaults(){
    const trips=read(),trip=trips.find(t=>t.id===id);if(!trip)return;
    let changed=false;
    if(trip.startLocation&&!trip.endLocation){trip.endLocation=trip.startLocation;changed=true}
    if(trip.startDate&&!trip.endDate){trip.endDate=trip.startDate;changed=true}
    if(changed)write(trips);
  }
  applyDefaults();

  const style=document.createElement('style');
  style.textContent=`
    .trip-location-editor,.trip-location-status{display:none!important}
    #workspaceLogistics .trip-legacy-logistics{display:none!important}
    .trip-logistics-card{background:#fff;border:1px solid #d7dde1;padding:16px}
    .trip-logistics-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .trip-logistics-grid .full{grid-column:1/-1}.trip-logistics-grid label>span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#667;font-weight:800;margin-bottom:4px}
    .trip-logistics-grid input,.trip-logistics-grid textarea{width:100%;border:1px solid #d7dde1;padding:10px;background:#fff;font:inherit}.trip-logistics-grid textarea{min-height:74px;resize:vertical}
    .trip-return-toggle{display:flex;gap:8px;align-items:center;margin:2px 0 0;font-size:11px;color:#41505d}.trip-return-toggle input{width:auto}.trip-end-location-wrap.is-hidden{display:none}
    .trip-logistics-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px}.trip-logistics-status{font-size:11px;color:#47745b}
    .trip-logistics-help{font-size:10px;color:#667;line-height:1.4;margin:4px 0 0}.trip-optional{font-weight:400;text-transform:none;letter-spacing:0}
    @media(max-width:650px){.trip-logistics-grid{grid-template-columns:1fr}.trip-logistics-grid .full{grid-column:1}}
    @media print{.trip-logistics-card{display:none!important}}
  `;
  document.head.appendChild(style);

  function buildForm(){
    const section=document.getElementById('workspaceLogistics');if(!section)return null;
    section.querySelectorAll('.trip-form,.trip-notes').forEach(el=>el.classList.add('trip-legacy-logistics'));
    let card=document.getElementById('tripLogisticsCard');if(card)return card;
    card=document.createElement('div');card.id='tripLogisticsCard';card.className='trip-logistics-card';section.appendChild(card);return card;
  }

  function renderForm(){
    const trip=getTrip(),card=buildForm();if(!trip||!card)return;
    const differentEnd=Boolean(trip.endLocation&&trip.startLocation&&trip.endLocation!==trip.startLocation);
    const endDateDifferent=Boolean(trip.endDate&&trip.startDate&&trip.endDate!==trip.startDate);
    card.innerHTML='<div class="trip-logistics-grid">'+
      '<label><span>Start date</span><input id="tripLogStartDate" type="date" value="'+esc(trip.startDate||trip.date||'')+'"></label>'+
      '<label><span>End date <span class="trip-optional">(optional)</span></span><input id="tripLogEndDate" type="date" value="'+esc(endDateDifferent?trip.endDate:'')+'"><p class="trip-logistics-help">Leave blank for a one-day trip.</p></label>'+
      '<label class="full"><span>Start / return location</span><input id="tripLogStartLocation" type="text" value="'+esc(trip.startLocation||'')+'" placeholder="e.g. Duluth, MN or home address"><p class="trip-logistics-help">This is used as both the start and end location by default.</p></label>'+
      '<label class="full trip-return-toggle"><input id="tripDifferentEnd" type="checkbox" '+(differentEnd?'checked':'')+'> End the trip somewhere different</label>'+
      '<label id="tripEndLocationWrap" class="full trip-end-location-wrap '+(differentEnd?'':'is-hidden')+'"><span>Different end location</span><input id="tripLogEndLocation" type="text" value="'+esc(differentEnd?trip.endLocation:'')+'" placeholder="e.g. Minneapolis, MN"></label>'+
      '<label class="full"><span>Emergency contact <span class="trip-optional">(optional)</span></span><input id="tripLogEmergency" type="text" value="'+esc(trip.emergencyContact||'')+'" placeholder="Name, phone number, or other reference"></label>'+
      '<label class="full"><span>Trip notes <span class="trip-optional">(optional)</span></span><textarea id="tripLogNotes">'+esc(trip.notes||'')+'</textarea></label>'+
      '<label><span>Lodging notes <span class="trip-optional">(optional)</span></span><textarea id="tripLogLodging">'+esc(trip.lodgingNotes||'')+'</textarea></label>'+
      '<label><span>Resupply notes <span class="trip-optional">(optional)</span></span><textarea id="tripLogResupply">'+esc(trip.resupplyNotes||'')+'</textarea></label>'+
      '</div><div class="trip-logistics-actions"><button id="saveTripLogisticsBtn" type="button" class="button blue">Save trip details</button><span id="tripLogisticsStatus" class="trip-logistics-status"></span></div>';
    const toggle=card.querySelector('#tripDifferentEnd'),wrap=card.querySelector('#tripEndLocationWrap');
    toggle?.addEventListener('change',()=>wrap?.classList.toggle('is-hidden',!toggle.checked));
    card.querySelector('#saveTripLogisticsBtn')?.addEventListener('click',saveForm);
  }

  function saveForm(){
    const trips=read(),trip=trips.find(t=>t.id===id);if(!trip)return;
    const startDate=document.getElementById('tripLogStartDate')?.value||'';
    const enteredEndDate=document.getElementById('tripLogEndDate')?.value||'';
    const startLocation=(document.getElementById('tripLogStartLocation')?.value||'').trim();
    const different=Boolean(document.getElementById('tripDifferentEnd')?.checked);
    const customEnd=(document.getElementById('tripLogEndLocation')?.value||'').trim();
    trip.startDate=startDate;trip.endDate=enteredEndDate||startDate;trip.date=startDate;
    trip.startLocation=startLocation;trip.endLocation=different?(customEnd||startLocation):startLocation;
    trip.emergencyContact=(document.getElementById('tripLogEmergency')?.value||'').trim();
    trip.notes=document.getElementById('tripLogNotes')?.value||'';
    trip.lodgingNotes=document.getElementById('tripLogLodging')?.value||'';
    trip.resupplyNotes=document.getElementById('tripLogResupply')?.value||'';
    write(trips);
    const status=document.getElementById('tripLogisticsStatus');if(status){status.textContent='Trip details saved ✓';setTimeout(()=>status.textContent='',2200)}
    renderReadiness();
    document.dispatchEvent(new CustomEvent('trip-logistics-saved',{detail:{tripId:id}}));
  }

  const action=(title,detail,target,icon='!')=>({title,detail,target,icon});
  function readinessActions(trip){
    const parks=trip?.parks||[],meta=trip?.stopMeta||{},out=[];
    if(!parks.length)out.push(action('Add parks to this trip','A trip needs at least one park before day planning can begin.','/parks','+'));
    const unassigned=parks.filter(slug=>!String(meta[slug]?.day||'').trim()).length;
    if(unassigned)out.push(action('Assign '+unassigned+' unassigned park'+(unassigned===1?'':'s'),'Every stop should belong to a numbered day before the itinerary is ready.','#workspaceItinerary',String(unassigned)));
    if(!String(trip?.startLocation||'').trim())out.push(action('Set start / return location','This location is used for both the start and end unless you choose a different end point.','#workspaceLogistics','↔'));
    if(!String(trip?.startDate||trip?.date||'').trim())out.push(action('Set trip date','Add a start date. End date is optional and defaults to the same day.','#workspaceLogistics','D'));
    const campingIncomplete=parks.filter(slug=>{const m=meta[slug]||{};return m.camping&&(!String(m.campground||'').trim()||!String(m.campsite||'').trim())}).length;
    if(campingIncomplete)out.push(action('Complete camping details for '+campingIncomplete+' stop'+(campingIncomplete===1?'':'s'),'Camping is marked, but the campground or campsite field is still blank.','#workspaceItinerary','C'));
    return out;
  }

  function renderReadiness(){
    const panel=document.getElementById('tripNextActions'),trip=getTrip();if(!panel||!trip)return;
    const items=readinessActions(trip),ready=!items.length;panel.classList.toggle('ready',ready);
    if(ready){panel.innerHTML='<div class="trip-next-head"><div><div class="kicker blue">NEXT ACTIONS</div><h2>Trip ready.</h2><p class="trip-next-summary">The core planning fields are complete. Emergency contact remains optional.</p></div><div class="trip-next-count">READY</div></div><div class="trip-ready-message"><b>Ready to export.</b> Review the itinerary once more, then generate the detailed booklet or compact plan.</div>';return}
    panel.innerHTML='<div class="trip-next-head"><div><div class="kicker blue">NEXT ACTIONS</div><h2>'+items.length+' thing'+(items.length===1?'':'s')+' to finish.</h2><p class="trip-next-summary">Complete these items to get the trip into a ready-to-export state. Emergency contact is optional.</p></div><div class="trip-next-count">'+items.length+' LEFT</div></div><div class="trip-action-list">'+items.map(a=>'<a class="trip-action" href="'+esc(a.target)+'"><span class="trip-action-icon">'+esc(a.icon)+'</span><span><b>'+esc(a.title)+'</b><small>'+esc(a.detail)+'</small></span><span class="trip-action-go">Fix this →</span></a>').join('')+'</div>';
  }

  renderForm();renderReadiness();
  document.addEventListener('click',e=>{if(e.target&&['saveTripDetailsBtn','saveDayAssignmentsBtn','saveTripBtn','saveTripLocationsBtn'].includes(e.target.id))setTimeout(()=>{applyDefaults();renderForm();renderReadiness()},220)});
  document.addEventListener('change',e=>{if(e.target.closest?.('[data-page="trip"]'))setTimeout(renderReadiness,180)});
  window.addEventListener('storage',e=>{if(e.key===KEY){renderForm();renderReadiness()}});
  window.TripLogisticsFix={saveForm,renderForm,renderReadiness,readinessActions};
})();

(()=>{
  const page=document.querySelector('[data-page="trip"]');
  if(!page||!window.TripItinerary)return;
  const KEY='mnwiTripCollections',id=page.dataset.tripId;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const write=v=>localStorage.setItem(KEY,JSON.stringify(v));
  const getTrip=()=>read().find(t=>t.id===id);
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const parksNode=document.getElementById('parksData');
  const parks=parksNode?JSON.parse(parksNode.textContent):[];
  const bySlug=new Map(parks.map(p=>[p.slug,p]));
  const details=window.PARK_DETAILS||{};
  const fmtDate=iso=>{if(!iso)return'Date not set';const d=new Date(iso+'T12:00:00');return Number.isNaN(d.getTime())?iso:d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})};
  const placeUrl=p=>'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(details[p.slug]?.mapsQuery||[p.name,p.city,p.state].filter(Boolean).join(', '));

  const style=document.createElement('style');
  style.textContent=`
    .trip-day-editor{margin:18px 0 0}.trip-day-editor-head{display:flex;justify-content:space-between;gap:12px;align-items:end;margin-bottom:12px}
    .trip-day-editor-head h3{margin:2px 0 0;font-size:19px}.trip-day-editor-head p{margin:0;color:#667;font-size:10px;max-width:480px;text-align:right;line-height:1.35}
    .trip-day-card{border:1px solid #d7dde1;background:#fff;margin:0 0 13px}.trip-day-card.warn{border-color:#d8b58d}.trip-day-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;background:#f7f7f4;padding:12px 14px;border-bottom:1px solid #d7dde1}.trip-day-card.warn .trip-day-card-head{background:#fbf6ef}
    .trip-day-card-head h3{margin:0;font-size:17px}.trip-day-card-meta{font-size:10px;color:#667;margin-top:3px;line-height:1.35}.trip-day-route-link{font-size:10px;font-weight:800;color:#00558a;white-space:nowrap}
    .trip-day-route{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:10px 14px;background:#eef5f8;border-bottom:1px solid #d7dde1}.trip-day-route span{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#667}.trip-day-route strong{font-size:11px}
    .trip-day-stop{padding:12px 14px;border-bottom:1px solid #edf0f2}.trip-day-stop:last-child{border-bottom:0}.trip-day-stop-head{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:start}.trip-day-stop-title b{display:block;font-size:13px}.trip-day-stop-title span{font-size:9px;color:#667}.trip-day-stop-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.trip-mini-btn{border:1px solid #cbd5da;background:#fff;color:#00558a;padding:5px 7px;font-size:9px;font-weight:800;cursor:pointer}.trip-mini-btn:disabled{opacity:.35;cursor:default}.trip-mini-link{display:inline-block;border:1px solid #cbd5da;background:#fff;color:#00558a;text-decoration:none;padding:5px 7px;font-size:9px;font-weight:800}
    .trip-day-stop-fields{display:grid;grid-template-columns:90px 1fr;gap:9px;margin-top:9px}.trip-day-stop-fields label>span{display:block;font-size:8px;text-transform:uppercase;letter-spacing:.08em;color:#667;font-weight:800;margin-bottom:3px}.trip-day-stop-fields input,.trip-day-stop-fields textarea{width:100%;border:1px solid #d7dde1;background:#fff;padding:8px;font:inherit}.trip-day-stop-fields textarea{min-height:55px;resize:vertical}.trip-day-camp{grid-column:1/-1;background:#f7f7f4;border:1px solid #e1e4e6;padding:9px;display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.trip-day-camp.hidden{display:none}.trip-day-camp-toggle{grid-column:1/-1;display:flex;gap:7px;align-items:center;font-size:10px;color:#41505d}.trip-day-camp-toggle input{width:auto}
    .trip-day-savebar{position:sticky;bottom:8px;z-index:15;display:flex;align-items:center;gap:10px;justify-content:flex-end;background:rgba(255,255,255,.96);border:1px solid #d7dde1;padding:9px 10px;margin-top:10px}.trip-day-save-status{font-size:10px;color:#47745b}.trip-day-warning{font-size:9px;color:#8a4e31;font-weight:700;margin-top:4px}
    #workspaceStops .trip-workspace-section-head h2:after{content:' (advanced)';font-size:11px;color:#667;font-weight:400}.itinerary-day-list{display:none!important}
    @media(max-width:700px){.trip-day-editor-head,.trip-day-card-head{display:block}.trip-day-editor-head p{text-align:left;margin-top:5px}.trip-day-route{grid-template-columns:1fr}.trip-day-route-link{display:inline-block;margin-top:7px}.trip-day-stop-head{grid-template-columns:1fr}.trip-day-stop-actions{justify-content:flex-start}.trip-day-stop-fields{grid-template-columns:1fr}.trip-day-camp,.trip-day-camp-toggle{grid-column:1}.trip-day-camp{grid-template-columns:1fr 1fr}.trip-day-savebar{justify-content:flex-start}}
    @media(max-width:470px){.trip-day-camp{grid-template-columns:1fr}}
    @media print{.trip-day-editor,.trip-day-savebar{display:none!important}}
  `;
  document.head.appendChild(style);

  let root=document.getElementById('tripDayEditor');
  if(!root){root=document.createElement('section');root.id='tripDayEditor';root.className='trip-day-editor';const panel=document.getElementById('itineraryModelPanel');if(panel)panel.insertAdjacentElement('afterend',root);else page.prepend(root)}

  function orderedSlugs(trip){return (trip.parks||[]).filter(slug=>bySlug.has(slug))}
  function moveSlug(slug,delta){const trips=read(),trip=trips.find(t=>t.id===id);if(!trip)return;const arr=[...(trip.parks||[])],i=arr.indexOf(slug),j=i+delta;if(i<0||j<0||j>=arr.length)return;[arr[i],arr[j]]=[arr[j],arr[i]];trip.parks=arr;write(trips);render();window.TripLogisticsFix?.renderReadiness?.()}
  function persist(showStatus=true){
    const trips=read(),trip=trips.find(t=>t.id===id);if(!trip)return false;trip.stopMeta=trip.stopMeta||{};
    root.querySelectorAll('.trip-day-stop').forEach((el,index)=>{const slug=el.dataset.slug,prev=trip.stopMeta[slug]||{};trip.stopMeta[slug]={...prev,day:(el.querySelector('.day-edit-day')?.value||'').trim(),order:index+1,note:el.querySelector('.day-edit-note')?.value||'',camping:Boolean(el.querySelector('.day-edit-camping')?.checked),campground:(el.querySelector('.day-edit-campground')?.value||'').trim(),loop:(el.querySelector('.day-edit-loop')?.value||'').trim(),campsite:(el.querySelector('.day-edit-campsite')?.value||'').trim(),reservation:(el.querySelector('.day-edit-reservation')?.value||'').trim(),checkIn:el.querySelector('.day-edit-checkin')?.value||'',checkOut:el.querySelector('.day-edit-checkout')?.value||''}});
    write(trips);if(showStatus){const s=document.getElementById('tripDaySaveStatus');if(s){s.textContent='Itinerary changes saved ✓';setTimeout(()=>s.textContent='',2200)}}setTimeout(()=>window.TripLogisticsFix?.renderReadiness?.(),80);return true;
  }

  function stopHtml(stop,allSlugs){const p=stop.park,m=stop.meta||{},idx=allSlugs.indexOf(p.slug),warn=!String(m.day||'').trim();return '<article class="trip-day-stop" data-slug="'+esc(p.slug)+'"><div class="trip-day-stop-head"><div class="trip-day-stop-title"><b>'+esc(p.name)+'</b><span>'+esc([p.city,p.state].filter(Boolean).join(', '))+'</span>'+(warn?'<div class="trip-day-warning">Day not assigned</div>':'')+'</div><div class="trip-day-stop-actions"><button type="button" class="trip-mini-btn move-up" '+(idx<=0?'disabled':'')+'>↑ Earlier</button><button type="button" class="trip-mini-btn move-down" '+(idx<0||idx>=allSlugs.length-1?'disabled':'')+'>↓ Later</button><a class="trip-mini-link" target="_blank" rel="noopener" href="'+esc(placeUrl(p))+'">Maps ↗</a></div></div><div class="trip-day-stop-fields"><label><span>Day</span><input class="day-edit-day" inputmode="numeric" value="'+esc(m.day||'')+'" placeholder="1"></label><label><span>Trip note</span><textarea class="day-edit-note" placeholder="What matters for this stop?">'+esc(m.note||'')+'</textarea></label><label class="trip-day-camp-toggle"><input type="checkbox" class="day-edit-camping" '+(m.camping?'checked':'')+'> Camping at this stop</label><div class="trip-day-camp '+(m.camping?'':'hidden')+'"><label><span>Campground</span><input class="day-edit-campground" value="'+esc(m.campground||'')+'"></label><label><span>Loop</span><input class="day-edit-loop" value="'+esc(m.loop||'')+'"></label><label><span>Campsite</span><input class="day-edit-campsite" value="'+esc(m.campsite||'')+'"></label><label><span>Reservation #</span><input class="day-edit-reservation" value="'+esc(m.reservation||'')+'"></label><label><span>Check-in</span><input type="time" class="day-edit-checkin" value="'+esc(m.checkIn||'')+'"></label><label><span>Check-out</span><input type="time" class="day-edit-checkout" value="'+esc(m.checkOut||'')+'"></label></div></div></article>'}

  function render(){
    const trip=getTrip();if(!trip){root.innerHTML='';return}
    const itinerary=window.TripItinerary.build(trip,parks,details),allSlugs=orderedSlugs(trip);
    const cards=itinerary.days.map(d=>'<section class="trip-day-card '+(d.key==='Unassigned'?'warn':'')+'"><div class="trip-day-card-head"><div><h3>'+esc(d.label)+'</h3><div class="trip-day-card-meta">'+esc(fmtDate(d.date))+' · '+d.stopCount+' stop'+(d.stopCount===1?'':'s')+'</div></div>'+(d.routeUrl?'<a class="trip-day-route-link" target="_blank" rel="noopener" href="'+esc(d.routeUrl)+'">Open day route ↗</a>':'')+'</div><div class="trip-day-route"><div><span>Start</span><strong>'+esc(d.start||'Not set')+'</strong></div><div><span>Overnight / end</span><strong>'+esc(d.overnight||'Not set')+'</strong></div></div>'+d.stops.map(s=>stopHtml(s,allSlugs)).join('')+'</section>').join('');
    root.innerHTML='<div class="trip-day-editor-head"><div><div class="kicker blue">DAY-BY-DAY EDITOR</div><h3>Edit the trip where you review it.</h3></div><p>Change day assignments, stop order, notes and camping details directly in the itinerary. The older stop editor remains below as an advanced fallback.</p></div>'+(cards||'<div class="empty-state"><h3>No parks yet.</h3><p>Add parks to start building the itinerary.</p></div>')+'<div class="trip-day-savebar"><span id="tripDaySaveStatus" class="trip-day-save-status"></span><button id="saveTripDayEditor" type="button" class="button blue">Save itinerary changes</button></div>';
    root.querySelector('#saveTripDayEditor')?.addEventListener('click',()=>{persist(true);render()});
    root.querySelectorAll('.move-up').forEach(btn=>btn.addEventListener('click',()=>{persist(false);moveSlug(btn.closest('.trip-day-stop').dataset.slug,-1)}));
    root.querySelectorAll('.move-down').forEach(btn=>btn.addEventListener('click',()=>{persist(false);moveSlug(btn.closest('.trip-day-stop').dataset.slug,1)}));
    root.querySelectorAll('.day-edit-camping').forEach(input=>input.addEventListener('change',()=>input.closest('.trip-day-stop').querySelector('.trip-day-camp')?.classList.toggle('hidden',!input.checked)));
  }

  render();
  document.addEventListener('click',e=>{if(e.target&&['saveTripLocationsBtn','saveTripLogisticsBtn','saveDayAssignmentsBtn','saveTripDetailsBtn'].includes(e.target.id))setTimeout(render,180)});
  window.addEventListener('storage',e=>{if(e.key===KEY)render()});
  window.TripDayEditor={render,persist,moveSlug};
})();
