(()=>{
  const page=document.querySelector('[data-page="trip"]');
  if(!page||!window.TripReadiness)return;
  const KEY='mnwiTripCollections',id=page.dataset.tripId;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const parksNode=document.getElementById('parksData');
  const parks=parksNode?JSON.parse(parksNode.textContent):[];
  const details=window.PARK_DETAILS||{};
  const getTrip=()=>read().find(t=>t.id===id);

  const style=document.createElement('style');
  style.textContent=`
    .trip-next-section{margin-top:12px}.trip-next-section:first-of-type{margin-top:0}.trip-next-section-title{display:flex;align-items:center;gap:7px;margin:0 0 7px;font-size:9px;text-transform:uppercase;letter-spacing:.09em;color:#667;font-weight:900}.trip-next-pill{display:inline-flex;min-width:20px;height:20px;border-radius:12px;align-items:center;justify-content:center;padding:0 6px;font-size:9px;background:#eef1f3;color:#41505d}.trip-next-section.blockers .trip-next-pill{background:#f7e8e4;color:#8a3d31}.trip-next-section.recommendations .trip-next-pill{background:#fbf3df;color:#7a5a15}.trip-action.recommendation{border-style:dashed;background:#fffdf8}.trip-action.recommendation .trip-action-icon{background:#fbf3df;color:#7a5a15}.trip-ready-message+.trip-next-section{margin-top:12px}.trip-ready-with-notes{border-left:3px solid #d7aa4a;padding-left:10px}.trip-next-count.ready-review{background:#fbf3df;color:#7a5a15}.trip-action-go.optional{color:#7a5a15}
  `;
  document.head.appendChild(style);

  function card(a,recommendation=false){
    return '<a class="trip-action '+(recommendation?'recommendation':'')+'" href="'+esc(a.target)+'"><span class="trip-action-icon">'+esc(a.icon)+'</span><span><b>'+esc(a.title)+'</b><small>'+esc(a.detail)+'</small></span><span class="trip-action-go '+(recommendation?'optional':'')+'">'+(recommendation?'Review →':'Fix this →')+'</span></a>';
  }
  function section(label,items,cls){
    if(!items.length)return'';
    return '<div class="trip-next-section '+cls+'"><div class="trip-next-section-title">'+esc(label)+' <span class="trip-next-pill">'+items.length+'</span></div><div class="trip-action-list">'+items.map(a=>card(a,cls==='recommendations')).join('')+'</div></div>';
  }
  function analysisFor(trip){return window.TripReadiness.analyze(trip,parks,details,window.TripItinerary)}
  function render(){
    const panel=document.getElementById('tripNextActions'),trip=getTrip();if(!panel||!trip)return;
    const qa=analysisFor(trip),b=qa.blockers,r=qa.recommendations;
    panel.classList.toggle('ready',qa.ready);
    if(qa.ready){
      const countClass=r.length?'trip-next-count ready-review':'trip-next-count';
      panel.innerHTML='<div class="trip-next-head"><div><div class="kicker blue">NEXT ACTIONS</div><h2>Trip ready'+(r.length?' — with '+r.length+' review item'+(r.length===1?'':'s'):'')+'.</h2><p class="trip-next-summary">There are no planning blockers. '+(r.length?'The items below are recommendations and do not prevent export.':'The core trip, itinerary and routing inputs are complete.')+'</p></div><div class="'+countClass+'">'+(r.length?'REVIEW':'READY')+'</div></div><div class="trip-ready-message '+(r.length?'trip-ready-with-notes':'')+'"><b>Ready to export.</b> '+(r.length?'You can export now or review the optional items first.':'Review the itinerary once more, then generate the detailed booklet or compact plan.')+'</div>'+section('Recommended review',r,'recommendations');
    }else{
      panel.innerHTML='<div class="trip-next-head"><div><div class="kicker blue">NEXT ACTIONS</div><h2>'+b.length+' blocker'+(b.length===1?'':'s')+' to resolve.</h2><p class="trip-next-summary">Resolve the blocking items before treating the trip as ready. Recommendations are shown separately and remain optional.</p></div><div class="trip-next-count">'+b.length+' BLOCK'+(b.length===1?'':'S')+'</div></div>'+section('Blocking issues',b,'blockers')+section('Recommended review',r,'recommendations');
    }
  }
  function readinessActions(trip){return analysisFor(trip).blockers}
  const old=window.TripLogisticsFix||{};
  window.TripLogisticsFix={...old,renderReadiness:render,readinessActions};
  window.TripNextActions=window.TripNextActions||{};
  window.TripNextActions.render=render;
  window.TripNextActions.actionsFor=readinessActions;
  render();
  document.addEventListener('trip-logistics-saved',()=>setTimeout(render,60));
  document.addEventListener('trip-days-changed',()=>setTimeout(render,60));
  document.addEventListener('click',e=>{if(e.target&&['saveTripDayEditor','addTripDay','saveTripLogisticsBtn'].includes(e.target.id))setTimeout(render,120)});
  document.addEventListener('change',e=>{if(e.target.closest?.('[data-page="trip"]'))setTimeout(render,120)});
  window.addEventListener('storage',e=>{if(e.key===KEY)render()});
  window.TripReadinessUI={render,analysisFor};
})();
