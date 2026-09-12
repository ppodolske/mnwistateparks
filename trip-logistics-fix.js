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
    if(unassigned)out.push(action('Assign '+unassigned+' unassigned park'+(unassigned===1?'':'s'),'Every stop should belong to a numbered day before the itinerary is ready.','#workspaceStops',String(unassigned)));
    if(!String(trip?.startLocation||'').trim())out.push(action('Set start / return location','This location is used for both the start and end unless you choose a different end point.','#workspaceLogistics','↔'));
    if(!String(trip?.startDate||trip?.date||'').trim())out.push(action('Set trip date','Add a start date. End date is optional and defaults to the same day.','#workspaceLogistics','D'));
    const campingIncomplete=parks.filter(slug=>{const m=meta[slug]||{};return m.camping&&(!String(m.campground||'').trim()||!String(m.campsite||'').trim())}).length;
    if(campingIncomplete)out.push(action('Complete camping details for '+campingIncomplete+' stop'+(campingIncomplete===1?'':'s'),'Camping is marked, but the campground or campsite field is still blank.','#workspaceStops','C'));
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
