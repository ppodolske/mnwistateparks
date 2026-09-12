(()=>{
  const page=document.querySelector('[data-page="trip"]');
  if(!page)return;
  const TRIPS='mnwiTripCollections';
  const read=()=>{try{return JSON.parse(localStorage.getItem(TRIPS)||'[]')}catch{return[]}};
  const getTrip=()=>read().find(t=>t.id===page.dataset.tripId);
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  const style=document.createElement('style');
  style.textContent=`
    .trip-next-actions{margin:0 0 24px;border:1px solid #d7dde1;background:#fff;padding:16px 18px}
    .trip-next-actions.ready{border-color:#b9d0c1;background:#f6faf7}
    .trip-next-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:11px}
    .trip-next-head h2{margin:2px 0 3px;font-size:21px}.trip-next-summary{font-size:11px;color:#667;margin:0}
    .trip-next-count{min-width:48px;text-align:center;background:#eef5f8;color:#00558a;padding:7px 10px;font-size:11px;font-weight:800}
    .trip-next-actions.ready .trip-next-count{background:#e8f2eb;color:#47745b}
    .trip-action-list{display:grid;gap:7px}.trip-action{display:grid;grid-template-columns:24px 1fr auto;gap:9px;align-items:center;padding:10px 11px;border:1px solid #e1e5e8;background:#fafbfb;text-decoration:none;color:#15212b}
    .trip-action:hover{border-color:#9bb9ca;background:#f4f8fa}.trip-action-icon{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#fff;border:1px solid #cfd8dd;color:#00558a;font-size:11px;font-weight:800}
    .trip-action b{display:block;font-size:12px}.trip-action small{display:block;color:#667;font-size:9px;margin-top:2px;line-height:1.3}.trip-action-go{color:#00558a;font-size:11px;font-weight:800;white-space:nowrap}
    .trip-ready-message{padding:11px 12px;background:#fff;border:1px solid #d6e3da;font-size:12px;line-height:1.4}.trip-ready-message b{color:#47745b}
    @media(max-width:650px){.trip-next-head{display:block}.trip-next-count{display:inline-block;margin-top:8px}.trip-action{grid-template-columns:24px 1fr}.trip-action-go{grid-column:2}}
    @media print{.trip-next-actions{display:none!important}}
  `;
  document.head.appendChild(style);

  let panel=document.getElementById('tripNextActions');
  if(!panel){
    panel=document.createElement('section');panel.id='tripNextActions';panel.className='trip-next-actions';
    const intro=page.querySelector('.trip-workspace-intro');
    if(intro)intro.insertAdjacentElement('afterend',panel);else{const summary=document.getElementById('tripSummary');if(summary)summary.insertAdjacentElement('beforebegin',panel);else page.prepend(panel)}
  }

  const action=(title,detail,target,icon='!')=>({title,detail,target,icon});
  function actionsFor(trip){
    if(!trip)return[];
    const parks=trip.parks||[],meta=trip.stopMeta||{},out=[];
    if(!parks.length)out.push(action('Add parks to this trip','A trip needs at least one park before day planning can begin.','/parks','+'));
    const unassigned=parks.filter(slug=>!String(meta[slug]?.day||'').trim()).length;
    if(unassigned)out.push(action('Assign '+unassigned+' unassigned park'+(unassigned===1?'':'s'),'Every stop should belong to a numbered day before the itinerary is ready.','#workspaceStops',String(unassigned)));
    const missingLocations=[];if(!String(trip.startLocation||'').trim())missingLocations.push('start');if(!String(trip.endLocation||'').trim())missingLocations.push('end');
    if(missingLocations.length)out.push(action('Set trip '+missingLocations.join(' and ')+' location'+(missingLocations.length>1?'s':''),'These locations anchor the first and final day of the itinerary.','#workspaceItinerary','↔'));
    if(!trip.startDate||!trip.endDate)out.push(action('Set trip dates','Add both start and end dates so each planned day can be tied to the calendar.','#workspaceLogistics','D'));
    if(!String(trip.emergencyContact||'').trim())out.push(action('Add emergency contact','Keep a useful emergency or reference contact with the trip information.','#workspaceLogistics','E'));
    const campingIncomplete=parks.filter(slug=>{const m=meta[slug]||{};return m.camping&&(!String(m.campground||'').trim()||!String(m.campsite||'').trim())}).length;
    if(campingIncomplete)out.push(action('Complete camping details for '+campingIncomplete+' stop'+(campingIncomplete===1?'':'s'),'Camping is marked, but the campground or campsite field is still blank.','#workspaceStops','C'));
    return out;
  }

  function render(){
    const trip=getTrip();if(!trip){panel.innerHTML='';return}
    const items=actionsFor(trip),ready=!items.length;
    panel.classList.toggle('ready',ready);
    if(ready){
      panel.innerHTML='<div class="trip-next-head"><div><div class="kicker blue">NEXT ACTIONS</div><h2>Trip ready.</h2><p class="trip-next-summary">The core planning fields are complete.</p></div><div class="trip-next-count">READY</div></div><div class="trip-ready-message"><b>Ready to export.</b> Review the itinerary once more, then generate the detailed booklet or compact plan.</div>';
      return;
    }
    panel.innerHTML='<div class="trip-next-head"><div><div class="kicker blue">NEXT ACTIONS</div><h2>'+items.length+' thing'+(items.length===1?'':'s')+' to finish.</h2><p class="trip-next-summary">Complete these items to get the trip into a ready-to-export state.</p></div><div class="trip-next-count">'+items.length+' LEFT</div></div><div class="trip-action-list">'+items.map(a=>'<a class="trip-action" href="'+esc(a.target)+'"><span class="trip-action-icon">'+esc(a.icon)+'</span><span><b>'+esc(a.title)+'</b><small>'+esc(a.detail)+'</small></span><span class="trip-action-go">Fix this →</span></a>').join('')+'</div>';
  }

  render();
  const refreshIds=new Set(['saveTripDetailsBtn','saveDayAssignmentsBtn','saveTripBtn','saveTripLocationsBtn']);
  document.addEventListener('click',e=>{if(e.target&&refreshIds.has(e.target.id))setTimeout(render,120)});
  document.addEventListener('change',e=>{if(e.target.closest?.('[data-page="trip"]'))setTimeout(render,50)});
  window.addEventListener('storage',e=>{if(e.key===TRIPS)render()});
  const stops=document.getElementById('tripStops');if(stops)new MutationObserver(()=>setTimeout(render,80)).observe(stops,{childList:true,subtree:true});
  window.TripNextActions={render,actionsFor};
})();
