(()=>{
  const page=document.querySelector('[data-page="trip"]');if(!page)return;
  const KEY='mnwiTripCollections',id=page.dataset.tripId;
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const getTrip=()=>read().find(t=>t.id===id);
  const style=document.createElement('style');
  style.textContent='.booklet-trip-logistics{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px}.booklet-logistics-block{background:#f7f7f4;padding:6px;min-height:36px}.booklet-logistics-block span{display:block;font-size:7px;text-transform:uppercase;letter-spacing:.1em;color:#667;font-weight:800;margin-bottom:2px}.booklet-logistics-block div{font-size:8px;line-height:1.3;white-space:pre-wrap}@media(max-width:700px){.booklet-trip-logistics{grid-template-columns:1fr}}@media print{.booklet-trip-logistics,.booklet-logistics-block{break-inside:avoid!important;page-break-inside:avoid!important}}';
  document.head.appendChild(style);
  function render(){
    const panel=document.getElementById('tripBookletOverview'),trip=getTrip();if(!panel||!trip)return;
    panel.querySelector('.booklet-trip-logistics')?.remove();
    const lodging=String(trip.lodgingNotes||'').trim(),resupply=String(trip.resupplyNotes||'').trim();
    if(!lodging&&!resupply)return;
    const block=document.createElement('div');block.className='booklet-trip-logistics';
    block.innerHTML=(lodging?'<div class="booklet-logistics-block"><span>Lodging / non-park stays</span><div>'+esc(lodging)+'</div></div>':'')+(resupply?'<div class="booklet-logistics-block"><span>Resupply / fuel / supplies</span><div>'+esc(resupply)+'</div></div>':'');
    const footer=panel.querySelector('.booklet-overview-footer');if(footer)panel.insertBefore(block,footer);else panel.appendChild(block);
  }
  render();setTimeout(render,200);setTimeout(render,700);
  document.addEventListener('trip-logistics-saved',()=>setTimeout(render,160));
  document.addEventListener('click',e=>{if(e.target?.id==='printTripBtn')render()});
  window.TripBookletLogistics={render};
})();
