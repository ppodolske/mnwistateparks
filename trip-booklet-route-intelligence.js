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
  style.textContent='.booklet-route-readiness{margin-top:9px;border-top:1px solid #d7dde1;padding-top:7px}.booklet-route-day{display:grid;grid-template-columns:52px 1fr auto;gap:7px;align-items:start;padding:4px 0;border-bottom:1px solid #edf0f2}.booklet-route-day:last-child{border-bottom:0}.booklet-route-day b{font-size:8px}.booklet-route-seq{font-size:7.5px;color:#41505d;line-height:1.3}.booklet-route-state{font-size:7px;font-weight:900;text-transform:uppercase;letter-spacing:.06em}.booklet-route-state.ready{color:#47745b}.booklet-route-state.issue{color:#8a4e31}@media(max-width:700px){.booklet-route-day{grid-template-columns:1fr}.booklet-route-state{text-align:left}}';
  document.head.appendChild(style);
  function render(){
    const trip=getTrip(),root=document.getElementById('tripBookletRoute');if(!trip||!root)return;
    let panel=root.querySelector('.booklet-route-readiness');if(panel)panel.remove();
    const x=window.TripItinerary.build(trip,parks,details),days=x.days.filter(d=>d.key!=='Unassigned');
    panel=document.createElement('div');panel.className='booklet-route-readiness';
    panel.innerHTML='<span class="booklet-section-title">Day route readiness</span>'+days.map(d=>{const ready=d.routeStatus==='ready',seq=(d.routePoints||[]).join(' → ')||d.routeMessage;return '<div class="booklet-route-day"><b>'+esc(d.label)+'</b><div class="booklet-route-seq">'+esc(seq)+'</div><span class="booklet-route-state '+(ready?'ready':'issue')+'">'+(ready?'Ready':'Needs attention')+'</span></div>'}).join('');
    root.appendChild(panel);
  }
  const root=document.getElementById('tripBookletRoute');if(root)new MutationObserver(()=>{if(!root.querySelector('.booklet-route-readiness'))render()}).observe(root,{childList:true});
  setTimeout(render,250);setTimeout(render,900);
  document.addEventListener('trip-logistics-saved',()=>setTimeout(render,150));
  document.addEventListener('click',e=>{if(e.target&&['saveTripDayEditor','addTripDay'].includes(e.target.id))setTimeout(render,160)});
})();
