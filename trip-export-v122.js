(()=>{
  const page=document.querySelector('[data-page="trip"]');if(!page)return;
  const KEY='mnwiTripCollections',id=page.dataset.tripId;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const getTrip=()=>read().find(t=>t.id===id);
  const parksNode=document.getElementById('parksData');
  const parks=parksNode?JSON.parse(parksNode.textContent):[];
  const details=window.PARK_DETAILS||{};
  const refs=window.PARK_REFERENCES||{};
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmtDate=iso=>{if(!iso)return'Not set';const d=new Date(iso+'T12:00:00');return Number.isNaN(d.getTime())?iso:d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'})};
  const bySlug=new Map(parks.map(p=>[p.slug,p]));

  const style=document.createElement('style');
  style.textContent=`
    .booklet-export-readiness{margin:8px 0 0;padding:7px 9px;border:1px solid #d7dde1;background:#f7f7f4;font-size:8px;line-height:1.35}.booklet-export-readiness.ready{border-color:#c8dccf;background:#f4f9f5}.booklet-export-readiness.warn{border-color:#e2cfb6;background:#fbf7f0}.booklet-export-readiness b{display:block;margin-bottom:2px}.booklet-print-footer{display:none}
    @media print{
      .booklet-overview,.booklet-route-page,.booklet-reference-page,.booklet-notes-page{break-inside:avoid!important;page-break-inside:avoid!important}
      .booklet-day-page{break-before:page!important;page-break-before:always!important}
      .booklet-day-header,.booklet-route-strip,.booklet-continuation-head{break-after:avoid!important;page-break-after:avoid!important}
      .booklet-stop-card,.booklet-camp,.booklet-critical,.booklet-day-notes,.booklet-logistics-panel,.booklet-reference-row{break-inside:avoid!important;page-break-inside:avoid!important}
      .booklet-route-page,.booklet-reference-page,.booklet-notes-page{break-before:page!important;page-break-before:always!important}
      .booklet-export-readiness{break-inside:avoid!important;page-break-inside:avoid!important}
      a[href]:after{content:none!important}
    }
  `;
  document.head.appendChild(style);

  function analysis(trip){return window.TripReadiness?.analyze?.(trip,parks,details,window.TripItinerary)||{ready:true,blockers:[],recommendations:[],blockerCount:0,recommendationCount:0}}
  function readinessText(a){
    if(a.blockerCount)return `${a.blockerCount} blocker${a.blockerCount===1?'':'s'} · ${a.recommendationCount} review item${a.recommendationCount===1?'':'s'}`;
    if(a.recommendationCount)return `Ready · ${a.recommendationCount} review item${a.recommendationCount===1?'':'s'}`;
    return 'Ready · no planning warnings';
  }
  function enhanceBooklet(){
    const trip=getTrip(),overview=document.getElementById('tripBookletOverview');if(!trip||!overview)return;
    let box=overview.querySelector('.booklet-export-readiness');if(!box){box=document.createElement('div');box.className='booklet-export-readiness';overview.appendChild(box)}
    const a=analysis(trip);box.className='booklet-export-readiness '+(a.blockerCount?'warn':'ready');box.innerHTML='<b>Planning status: '+esc(readinessText(a))+'</b>'+(a.blockerCount?'This export is a draft. Resolve the blocking items in the trip workspace before relying on it as the final plan.':'Generated from the current itinerary, route, logistics and park-reference data.');
  }

  function dayCompact(d){
    const stops=(d.stops||[]).map((s,i)=>{const m=s.meta||{},camp=m.camping?'<div class="cp-camp"><b>Overnight:</b> '+esc([m.campground,m.loop,m.campsite].filter(Boolean).join(' · ')||'Camping details incomplete')+(m.reservation?' · Res # '+esc(m.reservation):'')+'</div>':'';return '<div class="cp-stop"><span class="cp-num">'+(i+1)+'</span><div><b>'+esc(s.park.name)+'</b><small>'+esc([s.park.city,s.park.state].filter(Boolean).join(', '))+'</small>'+(m.note?'<p>'+esc(m.note)+'</p>':'')+camp+'</div></div>'}).join('');
    const route=d.routeUrl?'<a class="cp-route-link" href="'+esc(d.routeUrl)+'">Open day route in Google Maps ↗</a>':'<span class="cp-route-missing">Route needs attention</span>';
    return '<section class="cp-day"><header><div><span>DAY '+esc(d.key)+'</span><h2>'+esc(fmtDate(d.date))+'</h2></div>'+route+'</header><div class="cp-route"><div><small>START</small><b>'+esc(d.start||'Not set')+'</b></div><div><small>END / OVERNIGHT</small><b>'+esc(d.overnight||d.routeEnd||'Not set')+'</b></div></div>'+(stops||'<div class="cp-empty">No parks assigned.</div>')+'</section>';
  }
  function compactReferences(trip){return (trip.parks||[]).map(slug=>{const p=bySlug.get(slug),r=refs[slug]||details[slug]||{};if(!p)return'';return '<tr><td><b>'+esc(p.name)+'</b><br><small>'+esc(r.address||[p.city,p.state].filter(Boolean).join(', '))+'</small></td><td>'+(r.officialUrl?'<a href="'+esc(r.officialUrl)+'">DNR</a>':'—')+'</td><td>'+(r.mapUrl?'<a href="'+esc(r.mapUrl)+'">Map</a>':'—')+'</td><td>'+(r.directionsUrl?'<a href="'+esc(r.directionsUrl)+'">Directions</a>':'—')+'</td></tr>'}).join('')}

  function compactHTML(trip){
    const itinerary=window.TripItinerary?.build?.(trip,parks,details)||{days:[]};
    const a=analysis(trip),numbered=itinerary.days.filter(d=>d.key!=='Unassigned');
    const logistics=[trip.emergencyContact&&'<div><small>EMERGENCY / REFERENCE</small><p>'+esc(trip.emergencyContact)+'</p></div>',trip.lodgingNotes&&'<div><small>LODGING</small><p>'+esc(trip.lodgingNotes)+'</p></div>',trip.resupplyNotes&&'<div><small>RESUPPLY</small><p>'+esc(trip.resupplyNotes)+'</p></div>',trip.notes&&'<div><small>TRIP NOTES</small><p>'+esc(trip.notes)+'</p></div>'].filter(Boolean).join('');
    const size=(localStorage.getItem('mnwiBookletPaper')||'A4').toUpperCase()==='LETTER'?'Letter':'A4';
    return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(trip.name||'Trip')+' — Compact Plan</title><style>@page{size:'+size+';margin:12mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#15212b;margin:0;font-size:10px;line-height:1.35;-webkit-print-color-adjust:exact;print-color-adjust:exact}a{color:#00558a;text-decoration:none}.cp-cover{border-top:6px solid #00558a;padding-top:11px;margin-bottom:14px}.cp-kicker,small{font-size:7px;letter-spacing:.09em;text-transform:uppercase;color:#667}.cp-cover h1{font-size:25px;line-height:1;margin:4px 0}.cp-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:10px}.cp-meta div,.cp-route div{border:1px solid #d7dde1;padding:7px}.cp-meta b,.cp-route b{display:block;margin-top:2px}.cp-status{margin-top:8px;padding:7px 9px;background:'+(a.blockerCount?'#fbf7f0':'#f4f9f5')+';border:1px solid '+(a.blockerCount?'#e2cfb6':'#c8dccf')+'}.cp-day{break-inside:auto;border-top:2px solid #00558a;padding-top:8px;margin:15px 0}.cp-day header{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.cp-day h2{font-size:17px;margin:1px 0}.cp-route-link,.cp-route-missing{font-size:8px;font-weight:700}.cp-route{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin:6px 0 4px}.cp-stop{display:grid;grid-template-columns:20px 1fr;gap:7px;padding:6px 0;border-bottom:1px solid #e7eaec;break-inside:avoid}.cp-stop small{display:block;margin-top:1px}.cp-stop p{margin:3px 0 0}.cp-num{width:18px;height:18px;border-radius:50%;display:grid;place-items:center;background:#00558a;color:#fff;font-size:8px;font-weight:700}.cp-camp{margin-top:3px;font-size:8px;background:#f7f7f4;padding:4px}.cp-logistics{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:14px 0;break-inside:avoid}.cp-logistics>div{border:1px solid #d7dde1;padding:7px}.cp-logistics p{white-space:pre-wrap;margin:3px 0 0}.cp-refs{break-before:page;margin-top:12px}.cp-refs h2{font-size:18px}.cp-refs table{width:100%;border-collapse:collapse}.cp-refs td{border-bottom:1px solid #e7eaec;padding:5px 4px;vertical-align:top}.cp-refs td:not(:first-child){width:55px;text-align:center}.cp-refs small{letter-spacing:0;text-transform:none}.cp-empty{padding:8px;color:#667}@media print{.cp-stop,.cp-route,.cp-logistics>div,tr{break-inside:avoid;page-break-inside:avoid}}</style></head><body><section class="cp-cover"><div class="cp-kicker">MN + WI STATE PARKS · COMPACT TRIP PLAN</div><h1>'+esc(trip.name||'Untitled trip')+'</h1><div>'+esc(fmtDate(trip.startDate||trip.date))+' → '+esc(fmtDate(trip.endDate))+'</div><div class="cp-meta"><div><small>PARKS</small><b>'+esc(itinerary.totalParks||0)+'</b></div><div><small>DAYS</small><b>'+esc(itinerary.plannedDays||numbered.length)+'</b></div><div><small>ROUTE</small><b>'+esc(trip.startLocation||'Not set')+' → '+esc(trip.endLocation||'Not set')+'</b></div></div><div class="cp-status"><b>'+esc(readinessText(a))+'</b>'+(a.blockerCount?'<br>Draft export — planning blockers remain.':'')+'</div></section>'+numbered.map(dayCompact).join('')+(logistics?'<section class="cp-logistics">'+logistics+'</section>':'')+'<section class="cp-refs"><h2>Park quick reference</h2><table>'+compactReferences(trip)+'</table></section><script>addEventListener("load",()=>setTimeout(()=>print(),300));<\/script></body></html>';
  }
  function compactExport(){const trip=getTrip();if(!trip)return;const w=window.open('','_blank');if(!w){alert('Please allow pop-ups to export the trip PDF.');return}w.document.open();w.document.write(compactHTML(trip));w.document.close()}
  window.TripCompactExport=compactExport;

  function updateHint(){
    enhanceBooklet();const trip=getTrip(),hint=document.getElementById('bookletExportHint');if(!trip||!hint)return;const a=analysis(trip);
    hint.className='booklet-export-hint'+(a.blockerCount?' warn':'');
    hint.textContent=a.blockerCount?`${a.blockerCount} planning blocker${a.blockerCount===1?'':'s'} remain. You can still export a draft.`:(a.recommendationCount?`Ready to export · ${a.recommendationCount} review item${a.recommendationCount===1?'':'s'}.`:'Ready to export.');
  }
  updateHint();setTimeout(updateHint,250);
  document.addEventListener('trip-logistics-saved',()=>setTimeout(updateHint,80));
  document.addEventListener('trip-days-changed',()=>setTimeout(updateHint,80));
  document.addEventListener('click',e=>{if(e.target?.id==='saveTripDayEditor'||e.target?.id==='saveTripLogisticsBtn')setTimeout(updateHint,120)});
  window.addEventListener('storage',e=>{if(e.key===KEY)updateHint()});
  window.TripExportV122={compactHTML,compactExport,enhanceBooklet,updateHint};
})();
