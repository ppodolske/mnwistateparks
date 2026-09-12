(()=>{
  const style=document.createElement('style');
  style.id='trip-home-cleanup-v12211';
  style.textContent=`
    @media screen{
      body>main .hero-count{display:none!important}
      [data-page="trip"] .trip-notes:has(#tripNameEdit){display:none!important}
    }
  `;
  document.head.appendChild(style);

  function cleanHome(){
    document.querySelector('body>main .hero-count')?.remove();
  }

  function cleanTrip(){
    const page=document.querySelector('[data-page="trip"]');
    if(!page)return;
    const name=document.getElementById('tripNameEdit');
    const legacy=name?.closest('.trip-notes');
    if(legacy){legacy.remove();return;}
    const date=document.getElementById('tripDateEdit');
    const notes=document.getElementById('tripNotesEdit');
    const fallback=(date||notes)?.closest('.trip-notes');
    fallback?.remove();
  }

  function apply(){cleanHome();cleanTrip()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  setTimeout(apply,180);
  setTimeout(apply,700);
  window.TripHomeCleanupV12211={apply,cleanHome,cleanTrip};
})();
