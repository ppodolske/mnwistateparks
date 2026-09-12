(()=>{
  const page=document.querySelector('[data-page="trip"]');
  if(!page||!window.TripItinerary)return;
  const KEY='mnwiTripCollections',id=page.dataset.tripId;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const parksNode=document.getElementById('parksData');
  const parks=parksNode?JSON.parse(parksNode.textContent):[];
  const details=window.PARK_DETAILS||{};
  const getTrip=()=>read().find(t=>t.id===id);

  const style=document.createElement('style');
  style.textContent=`
    .trip-route-intel{padding:10px 14px 12px;border-bottom:1px solid #d7dde1;background:#fff}.trip-route-intel.ready{background:#f4f8f5}.trip-route-intel.incomplete{background:#fbf6ef}.trip-route-intel-head{display:flex;justify-content:space-between;gap:10px;align-items:center}.trip-route-intel-title{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#667}.trip-route-intel-status{font-size:9px;font-weight:800}.trip-route-intel.ready .trip-route-intel-status{color:#47745b}.trip-route-intel.incomplete .trip-route-intel-status{color:#8a4e31}.trip-route-sequence{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin-top:7px}.trip-route-point{font-size:9px;border:1px solid #d7dde1;background:#fff;padding:5px 7px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.trip-route-arrow{font-size:10px;color:#83919a}.trip-route-message{font-size:9px;color:#667;line-height:1.4;margin-top:6px}.trip-route-open{font-size:9px;font-weight:900;color:#00558a;text-decoration:none;white-space:nowrap}@media(max-width:650px){.trip-route-intel-head{align-items:flex-start}.trip-route-point{max-width:180px}}@media print{.trip-route-intel{display:none!important}}
  `;
  document.head.appendChild(style);

  function labelPoint(point,index,total){
    if(index===0)return 'Start · '+point;
    if(index===total-1)return 'End · '+point;
    return point;
  }
  function block(day){
    const ready=day.routeStatus==='ready';
    const points=day.routePoints||[];
    const sequence=points.length?points.map((p,i)=>'<span class="trip-route-point">'+esc(labelPoint(p,i,points.length))+'</span>'+(i<points.length-1?'<span class="trip-route-arrow">→</span>':'')).join(''):'<span class="trip-route-point">No route points yet</span>';
    return '<div class="trip-route-intel '+(ready?'ready':'incomplete')+'"><div class="trip-route-intel-head"><span class="trip-route-intel-title">Driving route</span><span class="trip-route-intel-status">'+(ready?'Ready':'Needs attention')+'</span>'+(ready&&day.routeUrl?'<a class="trip-route-open" target="_blank" rel="noopener" href="'+esc(day.routeUrl)+'">Open in Google Maps ↗</a>':'')+'</div><div class="trip-route-sequence">'+sequence+'</div><div class="trip-route-message">'+esc(day.routeMessage||'')+'</div></div>';
  }
  function render(){
    const trip=getTrip(),root=document.getElementById('tripDayEditor');if(!trip||!root)return;
    const x=window.TripItinerary.build(trip,parks,details),days=x.days.filter(d=>d.key!=='Unassigned');
    root.querySelectorAll('.trip-route-intel').forEach(el=>el.remove());
    const cards=[...root.querySelectorAll('.trip-day-card')].filter(c=>!c.classList.contains('warn'));
    cards.forEach((card,i)=>{const day=days[i];if(!day)return;const route=card.querySelector('.trip-day-route');if(route)route.insertAdjacentHTML('afterend',block(day));else card.querySelector('.trip-day-card-head')?.insertAdjacentHTML('afterend',block(day))});
  }
  function wrapEditor(){const api=window.TripDayEditor;if(!api||api.__routeIntelWrapped)return;const original=api.render;if(typeof original==='function')api.render=function(){const out=original.apply(this,arguments);setTimeout(render,0);return out};api.__routeIntelWrapped=true}
  wrapEditor();render();
  setTimeout(()=>{wrapEditor();render()},180);
  setTimeout(render,650);
  document.addEventListener('trip-logistics-saved',()=>setTimeout(render,100));
  document.addEventListener('click',e=>{if(e.target&&['addTripDay','saveTripDayEditor'].includes(e.target.id))setTimeout(render,120)});
  window.addEventListener('storage',e=>{if(e.key===KEY)render()});
  window.TripRouteIntelligence={render};
})();
