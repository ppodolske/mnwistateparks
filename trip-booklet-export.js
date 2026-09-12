(()=>{
  const page=document.querySelector('[data-page="trip"]');
  if(!page)return;
  const printBtn=document.getElementById('printTripBtn');
  if(!printBtn)return;
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const TRIPS='mnwiTripCollections';
  const read=()=>{try{return JSON.parse(localStorage.getItem(TRIPS)||'[]')}catch{return[]}};
  const getTrip=()=>read().find(t=>t.id===page.dataset.tripId);

  const controls=document.createElement('span');
  controls.id='bookletExportControls';
  controls.className='booklet-export-controls';
  controls.innerHTML='<label>Export <select id="bookletExportMode"><option value="booklet">Detailed booklet</option><option value="compact">Compact plan</option></select></label><label>Paper <select id="bookletPaper"><option value="A4">A4</option><option value="LETTER">US Letter</option></select></label>';
  printBtn.insertAdjacentElement('beforebegin',controls);
  const mode=document.getElementById('bookletExportMode'),paper=document.getElementById('bookletPaper');
  paper.value=(localStorage.getItem('mnwiBookletPaper')||'A4').toUpperCase()==='LETTER'?'LETTER':'A4';
  paper.addEventListener('change',()=>{localStorage.setItem('mnwiBookletPaper',paper.value);window.TripBookletPagination?.paginate()});
  const style=document.createElement('style');
  style.textContent='.booklet-export-controls{display:inline-flex;gap:9px;align-items:end;margin-right:9px;vertical-align:middle}.booklet-export-controls label{font-size:9px;text-transform:uppercase;letter-spacing:.08em;color:#667;font-weight:800}.booklet-export-controls select{display:block;margin-top:3px;border:1px solid #cfd7dc;background:#fff;padding:7px 26px 7px 8px;font:inherit;color:#15212b}@media(max-width:650px){.booklet-export-controls{display:flex;margin:0 0 8px;flex-wrap:wrap}}@media print{.booklet-export-controls{display:none!important}}';
  document.head.appendChild(style);

  function collectStyles(){return [...document.querySelectorAll('style')].map(s=>s.textContent||'').join('\n')}
  function bookletBody(){return ['tripBookletOverview','tripBookletDays','tripBookletRoute','tripBookletReference','tripBookletNotes'].map(id=>document.getElementById(id)?.outerHTML||'').join('\n')}
  function exportBooklet(){
    localStorage.setItem('mnwiBookletPaper',paper.value);
    window.TripBookletPagination?.paginate();
    const trip=getTrip(),body=bookletBody();if(!body.trim()){alert('The booklet is still loading. Please try again in a moment.');return}
    const size=paper.value==='LETTER'?'Letter':'A4';
    const html='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(trip?.name||'Trip')+' — State Parks Trip Booklet</title><style>'+collectStyles()+'\n@page{size:'+size+';margin:11mm}html,body{background:#fff!important}body{font-family:Arial,Helvetica,sans-serif;color:#15212b;margin:0!important;padding:0!important}.booklet-overview,.booklet-day-page,.booklet-route-page,.booklet-reference-page,.booklet-notes-page{max-width:none!important;width:auto!important;margin-left:0!important;margin-right:0!important;box-shadow:none!important}.booklet-overview{break-after:page!important;page-break-after:always!important}.booklet-day-page,.booklet-route-page,.booklet-reference-page,.booklet-notes-page{break-before:page!important;page-break-before:always!important}.booklet-pagination-status,.booklet-export-controls{display:none!important}a{color:#00558a!important;text-decoration:none!important}</style></head><body>'+body+'<script>addEventListener("load",()=>setTimeout(()=>print(),450));<\/script></body></html>';
    const w=window.open('','_blank');if(!w){alert('Please allow pop-ups to export the trip PDF.');return}w.document.open();w.document.write(html);w.document.close();
  }
  function doExport(){if(mode.value==='compact'&&typeof window.TripCompactExport==='function')return window.TripCompactExport();return exportBooklet()}
  printBtn.textContent='Export trip PDF';
  printBtn.onclick=doExport;
  window.TripBookletExport={exportBooklet,bookletBody};
})();
