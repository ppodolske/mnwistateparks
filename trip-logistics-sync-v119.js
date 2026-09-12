(()=>{
  const page=document.querySelector('[data-page="trip"]');if(!page)return;
  const KEY='mnwiTripCollections',id=page.dataset.tripId;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const write=v=>localStorage.setItem(KEY,JSON.stringify(v));
  const iso=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))?String(v):'';
  const addDays=(d,n)=>{if(!iso(d))return'';const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
  const count=trip=>Math.max(1,Number(window.TripItinerary?.dayCount?.(trip)||0));
  function reconcile(modeFromForm=false){
    const trips=read(),trip=trips.find(t=>t.id===id);if(!trip)return;
    const endInput=document.getElementById('tripLogEndDate');
    if(modeFromForm&&endInput)trip.endDateMode=endInput.value?'manual':'auto';
    if(!trip.endDateMode){
      const start=trip.startDate||trip.date||'';
      const auto=start?addDays(start,count(trip)-1):'';
      trip.endDateMode=trip.endDate&&trip.endDate!==auto?'manual':'auto';
    }
    if(trip.endDateMode==='auto'){
      const start=trip.startDate||trip.date||'';
      trip.endDate=start?addDays(start,count(trip)-1):'';
    }
    write(trips);
  }
  document.addEventListener('click',e=>{
    if(e.target?.id==='saveTripLogisticsBtn')setTimeout(()=>reconcile(true),20);
    if(e.target?.id==='addTripDay'||e.target?.closest?.('.move-day-up,.move-day-down,.remove-day'))setTimeout(()=>reconcile(false),80);
  });
  document.addEventListener('trip-days-changed',()=>setTimeout(()=>reconcile(false),30));
  reconcile(false);
  window.TripLogisticsDateSync={reconcile};
})();
