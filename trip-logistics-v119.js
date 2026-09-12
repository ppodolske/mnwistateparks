(()=>{
  const page=document.querySelector('[data-page="trip"]');
  if(!page)return;
  const KEY='mnwiTripCollections',id=page.dataset.tripId;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const write=v=>localStorage.setItem(KEY,JSON.stringify(v));
  const getTrip=()=>read().find(t=>t.id===id);
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const iso=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))?String(v):'';
  const addDays=(d,n)=>{if(!iso(d))return'';const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
  const daysBetween=(a,b)=>{if(!iso(a)||!iso(b))return 0;const x=new Date(a+'T12:00:00Z'),y=new Date(b+'T12:00:00Z');return Math.round((y-x)/86400000)+1};
  const oldApi=window.TripLogisticsFix||{};
  const dayCount=trip=>Math.max(1,Number(window.TripItinerary?.dayCount?.(trip)||0));
  const inferredEnd=(trip,start)=>start?addDays(start,dayCount(trip)-1):'';

  const style=document.createElement('style');
  style.textContent=`
    .trip-logistics-card{padding:0!important;overflow:hidden}.trip-logistics-group{padding:16px;border-bottom:1px solid #e5e9eb}.trip-logistics-group:last-of-type{border-bottom:0}.trip-logistics-group-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:12px}.trip-logistics-group-head h3{margin:2px 0 0;font-size:16px}.trip-logistics-group-head p{margin:0;max-width:420px;text-align:right;font-size:9px;color:#667;line-height:1.4}.trip-logistics-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.trip-logistics-grid .full{grid-column:1/-1}.trip-logistics-grid label>span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#667;font-weight:800;margin-bottom:4px}.trip-logistics-grid input,.trip-logistics-grid textarea{width:100%;border:1px solid #d7dde1;padding:10px;background:#fff;font:inherit}.trip-logistics-grid textarea{min-height:84px;resize:vertical}.trip-logistics-help{font-size:9px;color:#667;line-height:1.4;margin:4px 0 0}.trip-logistics-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}.trip-logistics-stat{background:#f7f7f4;border:1px solid #e1e4e6;padding:9px}.trip-logistics-stat span{display:block;font-size:8px;color:#667;text-transform:uppercase;letter-spacing:.08em}.trip-logistics-stat strong{display:block;margin-top:2px;font-size:12px}.trip-return-toggle{display:flex!important;gap:8px;align-items:center;font-size:11px;color:#41505d}.trip-return-toggle input{width:auto}.trip-end-location-wrap.is-hidden{display:none}.trip-logistics-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 16px;background:#f7f7f4;border-top:1px solid #e1e4e6;margin:0!important}.trip-logistics-status{font-size:10px;color:#47745b}.trip-logistics-error{font-size:10px;color:#8a3d31;font-weight:700}.trip-optional{font-weight:400;text-transform:none;letter-spacing:0}@media(max-width:650px){.trip-logistics-grid{grid-template-columns:1fr}.trip-logistics-grid .full{grid-column:1}.trip-logistics-group-head{display:block}.trip-logistics-group-head p{text-align:left;margin-top:4px}.trip-logistics-summary{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  function ensureCard(){
    const section=document.getElementById('workspaceLogistics');if(!section)return null;
    section.querySelectorAll('.trip-form,.trip-notes,.trip-legacy-logistics').forEach(el=>el.classList.add('trip-legacy-logistics'));
    let card=document.getElementById('tripLogisticsCard');
    if(!card){card=document.createElement('div');card.id='tripLogisticsCard';card.className='trip-logistics-card';section.appendChild(card)}
    return card;
  }

  function renderForm(){
    const trip=getTrip(),card=ensureCard();if(!trip||!card)return;
    const start=trip.startDate||trip.date||'';
    const inferred=inferredEnd(trip,start);
    const storedEnd=trip.endDate||'';
    const explicitEnd=storedEnd&&storedEnd!==inferred?storedEnd:'';
    const differentEnd=Boolean(trip.endLocation&&trip.startLocation&&trip.endLocation!==trip.startLocation);
    const count=dayCount(trip);
    const displayEnd=explicitEnd||inferred||'';
    const duration=daysBetween(start,displayEnd)||count;
    card.innerHTML=`
      <section class="trip-logistics-group">
        <div class="trip-logistics-group-head"><div><div class="kicker blue">TRIP BASICS</div><h3>Dates and route endpoints</h3></div><p>Trip dates are trip-wide. Individual visit and camping details stay with each day.</p></div>
        <div class="trip-logistics-grid">
          <label><span>Start date</span><input id="tripLogStartDate" type="date" value="${esc(start)}"></label>
          <label><span>End date <span class="trip-optional">(optional override)</span></span><input id="tripLogEndDate" type="date" value="${esc(explicitEnd)}"><p class="trip-logistics-help">Leave blank to use the ${count}-day itinerary length${inferred?' ('+esc(inferred)+')':''}.</p></label>
          <label class="full"><span>Start / return location</span><input id="tripLogStartLocation" type="text" value="${esc(trip.startLocation||'')}" placeholder="e.g. Duluth, MN or home address"><p class="trip-logistics-help">Used as both the start and end unless you choose a different end point.</p></label>
          <label class="full trip-return-toggle"><input id="tripDifferentEnd" type="checkbox" ${differentEnd?'checked':''}> End the trip somewhere different</label>
          <label id="tripEndLocationWrap" class="full trip-end-location-wrap ${differentEnd?'':'is-hidden'}"><span>Different end location</span><input id="tripLogEndLocation" type="text" value="${esc(differentEnd?trip.endLocation:'')}" placeholder="e.g. Minneapolis, MN"></label>
        </div>
        <div class="trip-logistics-summary"><div class="trip-logistics-stat"><span>Itinerary days</span><strong>${count}</strong></div><div class="trip-logistics-stat"><span>Trip duration</span><strong>${duration} day${duration===1?'':'s'}</strong></div><div class="trip-logistics-stat"><span>Ends</span><strong>${differentEnd?'Different location':'Back at start'}</strong></div></div>
      </section>
      <section class="trip-logistics-group">
        <div class="trip-logistics-group-head"><div><div class="kicker blue">SAFETY + LOGISTICS</div><h3>Information that applies across the trip</h3></div><p>Keep campground-specific reservation details inside the relevant day card.</p></div>
        <div class="trip-logistics-grid">
          <label class="full"><span>Emergency contact <span class="trip-optional">(optional)</span></span><input id="tripLogEmergency" type="text" value="${esc(trip.emergencyContact||'')}" placeholder="Name, phone number, or other reference"></label>
          <label><span>Lodging notes <span class="trip-optional">(optional)</span></span><textarea id="tripLogLodging" placeholder="Hotels, non-park stays, check-in reminders…">${esc(trip.lodgingNotes||'')}</textarea></label>
          <label><span>Resupply notes <span class="trip-optional">(optional)</span></span><textarea id="tripLogResupply" placeholder="Groceries, fuel, ice, laundry, water…">${esc(trip.resupplyNotes||'')}</textarea></label>
        </div>
      </section>
      <section class="trip-logistics-group">
        <div class="trip-logistics-group-head"><div><div class="kicker blue">GENERAL NOTES</div><h3>Anything else for the whole trip</h3></div><p>Use day notes for stop-specific reminders so this stays genuinely trip-wide.</p></div>
        <div class="trip-logistics-grid"><label class="full"><span>Trip notes <span class="trip-optional">(optional)</span></span><textarea id="tripLogNotes" placeholder="Overall goals, reminders, constraints…">${esc(trip.notes||'')}</textarea></label></div>
      </section>
      <div class="trip-logistics-actions"><button id="saveTripLogisticsBtn" type="button" class="button blue">Save trip details</button><span id="tripLogisticsStatus" class="trip-logistics-status"></span></div>`;
    const toggle=card.querySelector('#tripDifferentEnd'),wrap=card.querySelector('#tripEndLocationWrap');
    toggle?.addEventListener('change',()=>{wrap?.classList.toggle('is-hidden',!toggle.checked);renderSummaryPreview()});
    card.querySelector('#tripLogStartDate')?.addEventListener('change',renderSummaryPreview);
    card.querySelector('#tripLogEndDate')?.addEventListener('change',renderSummaryPreview);
    card.querySelector('#saveTripLogisticsBtn')?.addEventListener('click',saveForm);
  }

  function renderSummaryPreview(){
    const trip=getTrip();if(!trip)return;
    const start=document.getElementById('tripLogStartDate')?.value||'';
    const entered=document.getElementById('tripLogEndDate')?.value||'';
    const end=entered||inferredEnd(trip,start);
    const stats=document.querySelectorAll('#tripLogisticsCard .trip-logistics-stat strong');
    if(stats[1]){const n=daysBetween(start,end)||dayCount(trip);stats[1].textContent=n+' day'+(n===1?'':'s')}
    if(stats[2])stats[2].textContent=document.getElementById('tripDifferentEnd')?.checked?'Different location':'Back at start';
  }

  function saveForm(){
    const trips=read(),trip=trips.find(t=>t.id===id);if(!trip)return false;
    const start=document.getElementById('tripLogStartDate')?.value||'';
    const enteredEnd=document.getElementById('tripLogEndDate')?.value||'';
    const end=enteredEnd||inferredEnd(trip,start)||start;
    const status=document.getElementById('tripLogisticsStatus');
    if(start&&end&&end<start){if(status){status.className='trip-logistics-error';status.textContent='End date cannot be before the start date.'}return false}
    const startLocation=(document.getElementById('tripLogStartLocation')?.value||'').trim();
    const different=Boolean(document.getElementById('tripDifferentEnd')?.checked);
    const customEnd=(document.getElementById('tripLogEndLocation')?.value||'').trim();
    trip.startDate=start;trip.date=start;trip.endDate=end;
    trip.startLocation=startLocation;trip.endLocation=different?(customEnd||startLocation):startLocation;
    trip.emergencyContact=(document.getElementById('tripLogEmergency')?.value||'').trim();
    trip.lodgingNotes=document.getElementById('tripLogLodging')?.value||'';
    trip.resupplyNotes=document.getElementById('tripLogResupply')?.value||'';
    trip.notes=document.getElementById('tripLogNotes')?.value||'';
    write(trips);
    if(status){status.className='trip-logistics-status';status.textContent='Trip details saved ✓';setTimeout(()=>{if(status.textContent.includes('saved'))status.textContent=''},2200)}
    oldApi.renderReadiness?.();
    document.dispatchEvent(new CustomEvent('trip-logistics-saved',{detail:{tripId:id}}));
    setTimeout(renderForm,120);
    return true;
  }

  function refreshAfterDays(){setTimeout(()=>{renderForm();oldApi.renderReadiness?.()},80)}
  renderForm();
  document.addEventListener('trip-days-changed',refreshAfterDays);
  document.addEventListener('click',e=>{if(e.target&&['addTripDay','saveTripDayEditor'].includes(e.target.id))refreshAfterDays()});
  window.addEventListener('storage',e=>{if(e.key===KEY)renderForm()});
  window.TripLogisticsFix={...oldApi,saveForm,renderForm};
})();
