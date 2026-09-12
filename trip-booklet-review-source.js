(()=>{
  const page=document.querySelector('[data-page="trip"]');
  if(!page)return;
  const dataNode=document.getElementById('parksData');
  const parks=dataNode?JSON.parse(dataNode.textContent):[];
  const reviews=window.PARK_REVIEW_TEXT||{};
  const keyFor=p=>String(p.slug||p.name||'').toLowerCase().replace(/state-park$/,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'|'+String(p.state||'');
  const excerpt=s=>{const t=String(s||'').trim();if(t.length<=360)return t;const cut=t.slice(0,360),i=cut.lastIndexOf(' ');return cut.slice(0,i>260?i:360)+'…'};
  function apply(){
    document.querySelectorAll('#tripBookletDays .booklet-stop-card').forEach(card=>{
      const name=(card.querySelector('.booklet-stop-head h3')?.textContent||'').replace(/^\d+\.\s*/,'').trim();
      const stateMatch=(card.querySelector('.booklet-stop-sub')?.textContent||'').match(/,\s*(MN|WI)\b/);
      const park=parks.find(p=>p.name===name&&(!stateMatch||p.state===stateMatch[1]));
      if(!park)return;
      const source=reviews[keyFor(park)];if(!source)return;
      const headings=[...card.querySelectorAll('.booklet-copy h4')];
      const h=headings.find(x=>x.textContent.trim().toLowerCase()==='what to expect');
      const p=h&&h.nextElementSibling;if(p&&p.tagName==='P'){p.textContent=excerpt(source);p.dataset.sourceReview='true'}
    })
  }
  apply();
  const root=document.getElementById('tripBookletDays');if(root)new MutationObserver(()=>setTimeout(apply,30)).observe(root,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target&&['saveTripDetailsBtn','saveDayAssignmentsBtn','saveTripBtn','saveTripLocationsBtn'].includes(e.target.id))setTimeout(apply,120)});
  window.TripBookletReviewSource={apply,count:Object.keys(reviews).length};
})();
