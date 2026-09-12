(()=>{
  const page=document.querySelector('[data-page="trip"]');
  if(!page||!window.TripItinerary)return;
  const TRIPS='mnwiTripCollections';
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const read=()=>{try{return JSON.parse(localStorage.getItem(TRIPS)||'[]')}catch{return[]}};
  const id=page.dataset.tripId;
  const parksNode=document.getElementById('parksData');
  const parks=parksNode?JSON.parse(parksNode.textContent):[];
  const details=window.PARK_DETAILS||{};
  const getTrip=()=>read().find(t=>t.id===id);
  const fmtDate=iso=>{if(!iso)return'';const d=new Date(iso+'T12:00:00');return Number.isNaN(d.getTime())?iso:d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'})};
  const style=document.createElement('style');
  style.textContent='.itinerary-model-panel{margin:0 0 28px;background:#eef5f8;border-left:4px solid #00558a;padding:22px}.itinerary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:16px 0}.itinerary-stat{background:#fff;border:1px solid #d7dde1;padding:10px}.itinerary-stat span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#667;margin-bottom:4px}.itinerary-stat strong{font-size:14px}.itinerary-day-list{display:grid;gap:10px}.itinerary-day{background:#fff;border:1px solid #d7dde1;padding:12px}.itinerary-day-head{display:flex;justify-content:space-between;gap:12px}.itinerary-day-meta{font-size:11px;color:#667;margin-top:4px}.itinerary-day-route{margin-top:8px;font-size:11px}.itinerary-note{font-size:11px;color:#667;margin-top:12px}@media(max-width:700px){.itinerary-grid{grid-template-columns:1fr 1fr}.itinerary-day-head{display:block}}';
  document.head.appendChild(style);
  let panel=document.getElementById('itineraryModelPanel');
  if(!panel){panel=document.createElement('section');panel.id='itineraryModelPanel';panel.className='itinerary-model-panel';const summary=document.getElementById('tripSummary');if(summary)summary.insertAdjacentElement('afterend',panel);else page.prepend(panel)}
  function render(){const trip=getTrip();if(!trip){panel.innerHTML='';return}const x=window.TripItinerary.build(trip,parks,details);const days=x.days.map(d=>'<article class="itinerary-day"><div class="itinerary-day-head"><div><strong>'+esc(d.label)+'</strong>'+(d.date?'<div class="itinerary-day-meta">'+esc(fmtDate(d.date))+'</div>':'')+'</div><div class="itinerary-day-meta">'+d.stopCount+' stop'+(d.stopCount===1?'':'s')+'</div></div><div class="itinerary-day-meta"><b>Start:</b> '+esc(d.start||'Not set')+' · <b>Overnight:</b> '+esc(d.overnight||'Not set')+'</div>'+(d.routeUrl?'<div class="itinerary-day-route"><a target="_blank" rel="noopener" href="'+esc(d.routeUrl)+'">Open day route in Google Maps ↗</a></div>':'')+'</article>').join('');panel.innerHTML='<div class="kicker blue">ITINERARY MODEL</div><h2>Calculated trip structure</h2><div class="itinerary-grid"><div class="itinerary-stat"><span>Parks</span><strong>'+x.totalParks+'</strong></div><div class="itinerary-stat"><span>Assigned days</span><strong>'+x.assignedDays+'</strong></div><div class="itinerary-stat"><span>Start date</span><strong>'+esc(x.startDate||'Not set')+'</strong></div><div class="itinerary-stat"><span>End date</span><strong>'+esc(x.endDate||'Not set')+'</strong></div></div><div class="itinerary-day-list">'+days+'</div><p class="itinerary-note">Road distance and drive time are intentionally not estimated here. Google Maps handles road routing externally so straight-line distance is never presented as driving distance.</p>'}
  render();
  document.addEventListener('click',e=>{if(e.target&&['saveTripDetailsBtn','saveDayAssignmentsBtn','saveTripBtn'].includes(e.target.id))setTimeout(render,50)});
  const stops=document.getElementById('tripStops');if(stops)new MutationObserver(()=>setTimeout(render,50)).observe(stops,{childList:true,subtree:true});
})();
