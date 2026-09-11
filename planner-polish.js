(()=>{
  const TRIPS='mnwiTripCollections';
  const read=(k,d=[])=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const esc=s=>String(s||'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  const style=document.createElement('style');
  style.textContent='.trip-modal{display:none;position:fixed;inset:0;background:rgba(12,27,38,.58);z-index:9999;align-items:center;justify-content:center;padding:20px}.trip-modal.open{display:flex}.trip-modal-card{position:relative;background:#fff;width:min(520px,100%);max-height:80vh;overflow:auto;padding:26px;border:1px solid #d7dde1;box-shadow:0 18px 60px rgba(0,0,0,.25)}.trip-modal-close{position:absolute;right:14px;top:10px;border:0;background:transparent;font-size:28px;cursor:pointer}.trip-choice-list{display:grid;gap:10px;margin-top:18px}.trip-choice{display:flex;justify-content:space-between;gap:16px;text-align:left;border:1px solid #d7dde1;background:#fff;padding:14px;cursor:pointer}.trip-choice:hover{border-color:#00558a;background:#f7fbfd}.trip-choice strong{display:block}.trip-choice span{font-size:11px;color:#667}.trip-add-panel{margin:0 0 28px;background:#f4f1e9;padding:22px}.trip-add-row{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:end}.trip-add-row input{width:100%;border:1px solid #d7dde1;padding:10px;font:inherit;background:#fff}@media(max-width:600px){.trip-add-row{grid-template-columns:1fr}.trip-choice{display:block}.trip-choice span{display:block;margin-top:4px}}';
  document.head.appendChild(style);

  function ensureModal(){
    let modal=document.getElementById('tripChooserModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='tripChooserModal';
    modal.className='trip-modal';
    modal.innerHTML='<div class="trip-modal-card" role="dialog" aria-modal="true" aria-labelledby="tripChooserTitle"><button class="trip-modal-close" type="button" aria-label="Close">×</button><div class="kicker blue">ADD TO TRIP</div><h2 id="tripChooserTitle">Choose a trip</h2><div id="tripChooserList" class="trip-choice-list"></div><div id="tripChooserStatus" class="status-note"></div></div>';
    document.body.appendChild(modal);
    modal.querySelector('.trip-modal-close').onclick=()=>modal.classList.remove('open');
    modal.onclick=e=>{if(e.target===modal)modal.classList.remove('open')};
    document.addEventListener('keydown',e=>{if(e.key==='Escape')modal.classList.remove('open')});
    return modal;
  }

  const savedPage=document.querySelector('[data-page="saved"]');
  if(savedPage){
    const modal=ensureModal();
    function wireSavedButtons(){
      document.querySelectorAll('.add-saved-trip').forEach(btn=>{
        btn.onclick=()=>{
          const trips=read(TRIPS);
          if(!trips.length){
            location.hash='create-trip';
            const input=document.getElementById('tripName');
            if(input)input.focus();
            return;
          }
          const slug=btn.dataset.slug;
          const list=modal.querySelector('#tripChooserList');
          const status=modal.querySelector('#tripChooserStatus');
          status.textContent='';
          list.innerHTML=trips.map(t=>'<button type="button" class="trip-choice" data-id="'+esc(t.id)+'"><strong>'+esc(t.name)+'</strong><span>'+((t.parks||[]).length)+' parks'+(t.date?' · '+esc(t.date):'')+'</span></button>').join('');
          list.querySelectorAll('.trip-choice').forEach(choice=>choice.onclick=()=>{
            const current=read(TRIPS);
            const trip=current.find(t=>t.id===choice.dataset.id);
            if(!trip)return;
            trip.parks=[...new Set([...(trip.parks||[]),slug])];
            trip.stopMeta=trip.stopMeta||{};
            write(TRIPS,current);
            status.textContent='Added to '+trip.name+' ✓';
            setTimeout(()=>modal.classList.remove('open'),450);
          });
          modal.classList.add('open');
        };
      });
    }
    wireSavedButtons();
    const savedRoot=document.getElementById('savedRoot');
    if(savedRoot)new MutationObserver(wireSavedButtons).observe(savedRoot,{childList:true,subtree:true});
  }

  const tripPage=document.querySelector('[data-page="trip"]');
  if(tripPage){
    const dataNode=document.getElementById('parksData');
    const parks=dataNode?JSON.parse(dataNode.textContent):[];
    const id=tripPage.dataset.tripId;
    const stopsSection=document.getElementById('tripStops')?.closest('.planner-section');
    if(stopsSection&&parks.length&&!document.getElementById('tripAddParkDirect')){
      const panel=document.createElement('section');
      panel.className='trip-add-panel';
      panel.innerHTML='<div class="kicker blue">ADD A PARK</div><h2>Add another stop</h2><div class="trip-add-row"><label><span class="field-label">Park</span><input id="tripParkSearch" list="tripParkOptions" placeholder="Start typing a park name"></label><datalist id="tripParkOptions"></datalist><button id="tripAddParkDirect" class="button blue" type="button">Add park</button></div><div id="tripAddParkStatus" class="status-note"></div>';
      stopsSection.parentNode.insertBefore(panel,stopsSection);
      const input=panel.querySelector('#tripParkSearch');
      const datalist=panel.querySelector('#tripParkOptions');
      datalist.innerHTML=parks.map(p=>'<option value="'+esc(p.name)+'">'+esc(p.city)+', '+esc(p.state)+'</option>').join('');
      const add=()=>{
        const status=panel.querySelector('#tripAddParkStatus');
        const park=parks.find(p=>p.name.toLowerCase()===input.value.trim().toLowerCase());
        if(!park){status.textContent='Choose a park from the list first.';return}
        const trips=read(TRIPS);
        const trip=trips.find(t=>t.id===id);
        if(!trip){status.textContent='Trip could not be found.';return}
        trip.parks=trip.parks||[];
        if(trip.parks.includes(park.slug)){status.textContent=park.name+' is already in this trip.';return}
        trip.parks.push(park.slug);
        trip.stopMeta=trip.stopMeta||{};
        write(TRIPS,trips);
        status.textContent='Added '+park.name+' ✓';
        setTimeout(()=>location.reload(),350);
      };
      panel.querySelector('#tripAddParkDirect').onclick=add;
      input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();add()}});
    }
  }
})();
