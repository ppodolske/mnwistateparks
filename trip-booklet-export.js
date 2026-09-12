(()=>{
  const page=document.querySelector('[data-page="trip"]');
  if(!page)return;
  const printBtn=document.getElementById('printTripBtn');
  if(!printBtn)return;
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const TRIPS='mnwiTripCollections';
  const read=()=>{try{return JSON.parse(localStorage.getItem(TRIPS)||'[]')}catch{return[]}};
  const getTrip=()=>read().find(t=>t.id===page.dataset.tripId);
  const isMobile=()=>/iPhone|iPad|iPod|Android/i.test(navigator.userAgent||'')||matchMedia('(max-width:700px)').matches;

  const controls=document.createElement('span');
  controls.id='bookletExportControls';
  controls.className='booklet-export-controls';
  controls.innerHTML='<label>Export <select id="bookletExportMode"><option value="booklet">Detailed booklet</option><option value="compact">Compact plan</option></select></label><label>Paper <select id="bookletPaper"><option value="A4">A4</option><option value="LETTER">US Letter</option></select></label><span id="bookletExportHint" class="booklet-export-hint"></span>';
  printBtn.insertAdjacentElement('beforebegin',controls);
  const mode=document.getElementById('bookletExportMode'),paper=document.getElementById('bookletPaper'),hint=document.getElementById('bookletExportHint');
  paper.value=(localStorage.getItem('mnwiBookletPaper')||'A4').toUpperCase()==='LETTER'?'LETTER':'A4';
  paper.addEventListener('change',()=>{localStorage.setItem('mnwiBookletPaper',paper.value);window.TripBookletPagination?.paginate()});
  const style=document.createElement('style');
  style.textContent='.booklet-export-controls{display:inline-flex;gap:9px;align-items:end;margin-right:9px;vertical-align:middle;flex-wrap:wrap}.booklet-export-controls label{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#667;font-weight:800}.booklet-export-controls select{display:block;margin-top:3px;border:1px solid #cfd7dc;background:#fff;padding:7px 26px 7px 8px;font:inherit;color:#15212b}.booklet-export-hint{font-size:9px;line-height:1.3;color:#667;max-width:340px}.booklet-export-hint.warn{color:#8a4e31;font-weight:700}@media(max-width:700px){.booklet-export-controls{display:flex;margin:0 0 8px}.booklet-export-hint{display:none}}@media print{.booklet-export-controls{display:none!important}}';
  document.head.appendChild(style);

  function updateHint(){const trip=getTrip();if(!trip||!hint)return;const assigned=(trip.parks||[]).filter(slug=>String(trip.stopMeta?.[slug]?.day||'').trim()).length;if((trip.parks||[]).length&&assigned===0){hint.className='booklet-export-hint warn';hint.textContent='All stops are unassigned. The booklet will label them as unassigned rather than Day 1.'}else{hint.className='booklet-export-hint';hint.textContent=isMobile()?'':'Desktop printing: disable browser headers/footers for the cleanest PDF.'}}
  updateHint();

  function collectStyles(){return [...document.querySelectorAll('style')].map(s=>s.textContent||'').join('\n')}
  function splitDayPages(root){
    const days=[...root.querySelectorAll('.booklet-day-page')];
    for(const day of days){
      const cards=[...day.querySelectorAll(':scope > .booklet-stop-card')];
      if(cards.length<=2)continue;
      const notes=day.querySelector(':scope > .booklet-day-notes');
      const header=day.querySelector(':scope > .booklet-day-header');
      const route=day.querySelector(':scope > .booklet-route-strip');
      const kicker=day.querySelector(':scope > .kicker');
      const label=day.dataset.bookletLabel||header?.querySelector('h2')?.textContent||'Trip day';
      const unassigned=day.dataset.unassigned==='true';
      const chunks=[];for(let i=0;i<cards.length;i+=2)chunks.push(cards.slice(i,i+2));
      const anchor=day;
      chunks.forEach((chunk,idx)=>{
        const section=document.createElement('section');section.className='booklet-day-page booklet-export-page';section.dataset.unassigned=String(unassigned);section.dataset.bookletLabel=label;
        if(idx===0){if(kicker)section.append(kicker.cloneNode(true));if(header)section.append(header.cloneNode(true));if(route)section.append(route.cloneNode(true))}
        else{const cont=document.createElement('div');cont.className='booklet-continuation-head';cont.innerHTML='<div class="kicker blue">'+(unassigned?'TRIP BOOKLET · UNASSIGNED STOPS':'TRIP BOOKLET · '+esc(label))+'</div><h2>'+esc(label)+' · continued</h2><div class="booklet-continuation-sub">Stops '+(idx*2+1)+'–'+Math.min(idx*2+chunk.length,cards.length)+' of '+cards.length+'</div>';section.append(cont)}
        chunk.forEach(card=>section.append(card.cloneNode(true)));
        if(idx===chunks.length-1&&notes)section.append(notes.cloneNode(true));
        anchor.parentNode.insertBefore(section,anchor);
      });
      day.remove();
    }
  }
  function bookletBody(){const wrap=document.createElement('div');['tripBookletOverview','tripBookletDays','tripBookletRoute','tripBookletReference','tripBookletNotes'].forEach(id=>{const el=document.getElementById(id);if(el)wrap.append(el.cloneNode(true))});splitDayPages(wrap);return wrap.innerHTML}
  function exportBooklet(){
    localStorage.setItem('mnwiBookletPaper',paper.value);
    window.TripBookletPagination?.paginate();
    const trip=getTrip(),body=bookletBody();if(!body.trim()){alert('The booklet is still loading. Please try again in a moment.');return}
    const size=paper.value==='LETTER'?'Letter':'A4';
    const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(trip?.name||'Trip')+' — State Parks Trip Booklet</title><style>'+collectStyles()+'\n@page{size:'+size+';margin:0}html,body{background:#fff!important}body{font-family:Arial,Helvetica,sans-serif;color:#15212b;margin:0!important;padding:0!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.booklet-overview,.booklet-day-page,.booklet-route-page,.booklet-reference-page,.booklet-notes-page{max-width:none!important;width:auto!important;margin-left:0!important;margin-right:0!important;box-shadow:none!important}.booklet-pagination-status,.booklet-export-controls{display:none!important}.booklet-continuation-head{padding-bottom:8px;margin-bottom:9px;border-bottom:1px solid #d7dde1}.booklet-continuation-head h2{font-size:23px;line-height:1;margin:4px 0}.booklet-continuation-sub{font-size:9px;color:#667}.booklet-export-page{break-before:page!important;page-break-before:always!important}a{color:#00558a!important;text-decoration:none!important}</style></head><body>'+body+'<script>addEventListener("load",()=>setTimeout(()=>print(),350));<\/script></body></html>';
    const w=window.open('','_blank');if(!w){alert('Please allow pop-ups to export the trip PDF.');return}w.document.open();w.document.write(html);w.document.close();
  }
  function doExport(){if(mode.value==='compact'&&typeof window.TripCompactExport==='function')return window.TripCompactExport();return exportBooklet()}
  printBtn.textContent='Export trip PDF';
  printBtn.onclick=doExport;
  document.addEventListener('click',e=>{if(e.target&&['saveTripDetailsBtn','saveDayAssignmentsBtn','saveTripBtn','saveTripLocationsBtn'].includes(e.target.id))setTimeout(updateHint,100)});
  window.TripBookletExport={exportBooklet,bookletBody,splitDayPages};
})();
