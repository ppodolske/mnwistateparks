(()=>{
  const page=document.querySelector('[data-page="trip"]');
  if(!page)return;

  const css=document.createElement('style');
  css.textContent=`
  [data-page="trip"].trip-workspace-enabled #tripBookletOverview,
  [data-page="trip"].trip-workspace-enabled #tripBookletDays,
  [data-page="trip"].trip-workspace-enabled #tripBookletRoute,
  [data-page="trip"].trip-workspace-enabled #tripBookletReference,
  [data-page="trip"].trip-workspace-enabled #tripBookletNotes{display:none!important}
  .trip-workspace-intro{margin:18px 0 22px;padding:20px 22px;background:#eef5f8;border-left:5px solid #00558a;display:flex;justify-content:space-between;gap:18px;align-items:flex-end}
  .trip-workspace-intro h2{margin:3px 0 5px;font-size:27px;line-height:1.04}.trip-workspace-intro p{margin:0;color:#667;max-width:650px;font-size:13px;line-height:1.45}
  .trip-workspace-jumps{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.trip-workspace-jumps a{display:inline-block;border:1px solid #b9ccd7;background:#fff;color:#00558a;text-decoration:none;padding:8px 10px;font-size:9px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}
  .trip-workspace-section{margin:26px 0 30px;padding-top:8px;border-top:1px solid #d7dde1}.trip-workspace-section-head{display:flex;justify-content:space-between;gap:16px;align-items:end;margin:0 0 12px}.trip-workspace-section-head h2{margin:2px 0 0;font-size:22px}.trip-workspace-section-head p{margin:0;color:#667;font-size:11px;max-width:470px;line-height:1.4;text-align:right}
  .trip-workspace-export{background:#f7f7f4;border:1px solid #d7dde1;padding:16px}.trip-workspace-export-row{display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap}.trip-workspace-export-copy{margin:0 0 12px;color:#667;font-size:12px;line-height:1.4}.trip-workspace-export #printTripBtn{margin:0}.trip-workspace-export #bookletExportControls{margin:0}
  .trip-workspace-section .itinerary-model-panel{margin:0;background:#fff;border:1px solid #d7dde1;border-left:4px solid #00558a}.trip-workspace-section .trip-detail-actions{margin-top:12px}
  @media(max-width:760px){.trip-workspace-intro{display:block}.trip-workspace-jumps{justify-content:flex-start;margin-top:14px}.trip-workspace-section-head{display:block}.trip-workspace-section-head p{text-align:left;margin-top:5px}.trip-workspace-export-row{display:block}.trip-workspace-export #bookletExportControls{margin-bottom:10px}}
  @media print{.trip-workspace-intro,.trip-workspace-section-head,.trip-workspace-export{display:none!important}}
  `;
  document.head.appendChild(css);
  page.classList.add('trip-workspace-enabled');

  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const section=(id,kicker,title,help)=>{
    let s=document.getElementById(id);if(s)return s;
    s=document.createElement('section');s.id=id;s.className='trip-workspace-section';
    s.innerHTML='<div class="trip-workspace-section-head"><div><div class="kicker blue">'+esc(kicker)+'</div><h2>'+esc(title)+'</h2></div><p>'+esc(help)+'</p></div>';
    return s;
  };

  const summary=document.getElementById('tripSummary');
  const intro=document.createElement('section');
  intro.className='trip-workspace-intro';
  intro.innerHTML='<div><div class="kicker blue">TRIP WORKSPACE</div><h2>Plan the trip. Export when it is ready.</h2><p>Use the itinerary and park-stop editors as the working view. The printable booklet is generated only when you export it.</p></div><nav class="trip-workspace-jumps" aria-label="Trip workspace sections"><a href="#workspaceItinerary">Itinerary</a><a href="#workspaceStops">Stops</a><a href="#workspaceLogistics">Logistics</a><a href="#workspaceExport">Export</a></nav>';
  if(summary)summary.insertAdjacentElement('beforebegin',intro);else page.prepend(intro);

  const itinerary=document.getElementById('itineraryModelPanel');
  if(itinerary){
    const s=section('workspaceItinerary','PLAN','Day-by-day itinerary','Set trip start/end locations and review the calculated structure for each day.');
    itinerary.insertAdjacentElement('beforebegin',s);s.appendChild(itinerary);
  }

  const stops=document.getElementById('tripStops');
  if(stops){
    const s=section('workspaceStops','EDIT','Park stops & assignments','Assign days, add visit notes and capture camping details for each stop.');
    const actions=document.getElementById('tripDetailActions');
    stops.insertAdjacentElement('beforebegin',s);if(actions)s.appendChild(actions);s.appendChild(stops);
    const saveDays=document.getElementById('saveDayAssignmentsBtn');if(saveDays&&!s.contains(saveDays)){const holder=saveDays.parentElement;if(holder&&holder!==page&&holder.children.length<=4)s.appendChild(holder);else s.appendChild(saveDays)}
  }

  const logisticsCandidates=[...page.querySelectorAll('.trip-notes,.trip-form')].filter(el=>!el.closest('#workspaceStops')&&!el.closest('[id^="tripBooklet"]'));
  if(logisticsCandidates.length){
    const first=logisticsCandidates[0];
    const s=section('workspaceLogistics','LOGISTICS','Trip-wide details','Keep general trip notes and trip-wide information here. Day-specific camping stays with the relevant park stop.');
    first.insertAdjacentElement('beforebegin',s);for(const el of logisticsCandidates){if(!s.contains(el))s.appendChild(el)}
  }else{
    const anchor=document.getElementById('workspaceStops')||document.getElementById('workspaceItinerary')||summary;
    if(anchor){const s=section('workspaceLogistics','LOGISTICS','Trip-wide details','Trip-wide logistics remain available through the existing trip controls.');anchor.insertAdjacentElement('afterend',s)}
  }

  const printBtn=document.getElementById('printTripBtn');
  if(printBtn){
    const controls=document.getElementById('bookletExportControls');
    const s=section('workspaceExport','OUTPUT','Trip booklet','Choose the export format when the trip is ready. Print-layout pages stay out of the working view.');
    s.classList.add('trip-workspace-export');
    const copy=document.createElement('p');copy.className='trip-workspace-export-copy';copy.textContent='The detailed booklet and compact plan are generated from the trip information above. You do not need to preview the print pages here.';
    const row=document.createElement('div');row.className='trip-workspace-export-row';
    const anchor=document.getElementById('workspaceLogistics')||document.getElementById('workspaceStops')||document.getElementById('workspaceItinerary')||summary||page.lastElementChild;
    if(anchor)anchor.insertAdjacentElement('afterend',s);else page.appendChild(s);
    s.appendChild(copy);s.appendChild(row);if(controls)row.appendChild(controls);row.appendChild(printBtn);
  }

  // Keep the existing toolbar, but remove empty spacing after moving export controls.
  const toolbar=page.querySelector('.trip-toolbar');if(toolbar&&!toolbar.textContent.trim()&&!toolbar.querySelector('button,a,input,select'))toolbar.remove();
})();
