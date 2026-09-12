(()=>{
  const details=window.PARK_DETAILS||{};
  window.PARK_ADDRESSES=Object.fromEntries(Object.entries(details).map(([slug,d])=>[slug,d&&d.address||'']));

  const MN_IDS={
    'afton':'spk00100','banning':'spk00103','bear-head-lake':'spk00109','beaver-creek-valley':'spk00112','big-stone-lake':'spk00115','blue-mounds':'spk00121','buffalo-river':'spk00124','camden':'spk00127','carley':'spk00130','cascade-river':'spk00133','charles-a-lindbergh':'spk00136','crow-wing':'spk00139','father-hennepin':'spk00142','flandrau':'spk00145','forestville-mystery-cave':'spk00148','fort-ridgely':'spk00151','fort-snelling':'spk00154','franz-jevne':'spk00157','frontenac':'spk00160','george-h-crosby-manitou':'spk00163','glacial-lakes':'spk00166','glendalough':'spk00167','gooseberry-falls':'spk00172','grand-portage':'spk00173','hayes-lake':'spk00174','myre-big-island':'spk00175','hill-annex-mine':'spk00176','john-a-latsch':'spk00177','interstate':'spk00178','itasca':'spk00181','jay-cooke':'spk00187','judge-c-r-magney':'spk00193','kilen-woods':'spk00196','lac-qui-parle':'spk00197','lake-bemidji':'spk00205','lake-bronson':'spk00208','lake-carlos':'spk00211','lake-louise':'spk00214','lake-maria':'spk00217','lake-shetek':'spk00220','mccarthy-beach':'spk00226','maplewood':'spk00229','mille-lacs-kathio':'spk00232','minneopa':'spk00235','monson-lake':'spk00238','moose-lake':'spk00239','nerstrand-big-woods':'spk00241','great-river-bluffs':'spk00244','old-mill':'spk00247','rice-lake':'spk00250','st-croix':'spk00253','wild-river':'spk00254','sakatah-lake':'spk00256','savanna-portage':'spk00259','scenic':'spk00262','schoolcraft':'spk00263','sibley':'spk00265','split-rock-lighthouse':'spk00266','split-rock-creek':'spk00267','temperance-river':'spk00268','tettegouche':'spk00269','upper-sioux-agency':'spk00277','whitewater':'spk00280','william-o-brien':'spk00283','zippel-bay':'spk00284','lake-vermilion-soudan-underground-mine':'spk00285'
  };
  const WI_CODES={
    'interstate-park':'interstate','pattison':'pattison','amnicon-falls':'amnicon','aztalan':'aztalan','belmont-mound':'belmont','big-bay':'bigbay','big-foot-beach':'bigfoot','blue-mound':'bluemound','brunet-island':'brunetisland','buckhorn':'buckhorn','copper-culture':'copperculture','copper-falls':'copperfalls','council-grounds':'councilgrounds','cross-plains':'crossplains','devil-s-lake':'devilslake','governor-dodge':'govdodge','governor-nelson':'govnelson','governor-thompson':'govthompson','harrington-beach':'harringtonbeach','hartman-creek':'hartmancreek','heritage-hill':'heritagehill','high-cliff':'highcliff','kinnickinnic':'kinnickinnic','kohler-andrae':'kohlerandrae','lake-kegonsa':'lakekegonsa','lake-wissota':'lakewissota','lakeshore':'lakeshore','lizard-mound':'lizardmound','lost-dauphin':'lostdauphin','merrick':'merrick','mill-bluff':'millbluff','mirror-lake':'mirrorlake','natural-bridge':'naturalbridge','nelson-dewey':'nelsondewey','new-glarus-woods':'newglaruswoods','newport':'newport','peninsula':'peninsula','perrot':'perrot','potawatomi':'potawatomi','rib-mountain':'ribmt','roche-a-cri':'rocheacri','rock-island':'rockisland','rocky-arbor':'rockyarbor','straight-lake':'straightlake','tower-hill':'towerhill','whitefish-dunes':'whitefishdunes','wildcat-mountain':'wildcat','willow-river':'willowriver','wyalusing':'wyalusing','yellowstone-lake':'yellowstone'
  };
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const stateFor=slug=>MN_IDS[slug]?'MN':WI_CODES[slug]?'WI':'';
  const dnrSource=u=>/^https:\/\/(?:www\.)?dnr\.state\.mn\.us\//.test(String(u||''))||/^https:\/\/dnr\.wisconsin\.gov\//.test(String(u||''));
  const directionsUrl=(slug,d={})=>'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(d.address||d.mapsQuery||slug);
  const officialUrl=(slug,d={})=>{
    if(d.status==='closed'&&dnrSource(d.sourceUrl))return d.sourceUrl;
    if(MN_IDS[slug])return 'https://www.dnr.state.mn.us/state_parks/park.html?id='+MN_IDS[slug]+'#homepage';
    if(WI_CODES[slug]){
      const existing=String(d.sourceUrl||'');
      if(/^https:\/\/dnr\.wisconsin\.gov\/topic\/parks\/(?!findapark)/.test(existing))return existing.replace(/\/info\/?$/,'');
      return 'https://dnr.wisconsin.gov/topic/parks/'+WI_CODES[slug];
    }
    return d.sourceUrl||'';
  };
  const mapUrl=slug=>MN_IDS[slug]?'https://www.dnr.state.mn.us/state_parks/park.html?id='+MN_IDS[slug]+'#maps':WI_CODES[slug]?'https://dnr.wisconsin.gov/topic/parks/'+WI_CODES[slug]+'/maps':'';
  const enrich=(slug,d={})=>{
    const state=stateFor(slug);
    return {...d,state,agencyLabel:state==='MN'?'MN DNR':state==='WI'?'WI DNR':'Official site',directionsUrl:directionsUrl(slug,d),officialUrl:officialUrl(slug,d),mapUrl:mapUrl(slug)};
  };
  window.PARK_REFERENCES=Object.fromEntries(Object.entries(details).map(([slug,d])=>[slug,enrich(slug,d)]));
  window.ParkReferenceLinks={MN_IDS,WI_CODES,stateFor,directionsUrl,officialUrl,mapUrl,enrich};

  const page=document.querySelector('.park-page[data-park-slug]');
  if(!page)return;
  const slug=page.dataset.parkSlug;
  const d=window.PARK_REFERENCES[slug];
  if(!d)return;
  const style=document.createElement('style');
  style.textContent=`
    .park-reference{max-width:1180px;margin:0 auto;padding:28px 24px 0}.park-reference-card{border:1px solid var(--line,#d7dde1);background:#fff;padding:18px 20px;display:grid;grid-template-columns:minmax(0,1.5fr) minmax(280px,1fr);gap:24px;align-items:center}.park-reference h2{margin:3px 0 7px;font-size:22px}.park-reference-address{font-size:14px;line-height:1.5;margin:0;color:#27333d}.park-reference-meta{font-size:10px;color:#667;margin-top:5px;text-transform:uppercase;letter-spacing:.07em}.park-reference-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.park-reference-link{display:inline-block;border:1px solid #cbd5da;background:#fff;color:#00558a;padding:9px 11px;text-decoration:none;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}.park-reference-link.primary{background:#00558a;border-color:#00558a;color:#fff}.park-reference-note{font-size:9px;color:#667;margin:9px 0 0;line-height:1.4}.park-reference-status{margin-top:8px;font-size:10px;font-weight:700;color:#8a4e31}@media(max-width:760px){.park-reference{padding:18px 16px 0}.park-reference-card{grid-template-columns:1fr;gap:14px}.park-reference-actions{justify-content:flex-start}.park-reference-link{flex:1 1 120px;text-align:center}}@media print{.park-reference-actions{display:none}.park-reference{padding-top:10px}}
  `;
  document.head.appendChild(style);
  const section=document.createElement('section');
  section.className='park-reference';
  section.id='parkReference';
  const type=d.addressType==='park-location'?'Park location':'Park entrance / visitor address';
  section.innerHTML='<div class="park-reference-card"><div><div class="kicker blue">PARK DETAILS</div><h2>Plan the visit</h2><p class="park-reference-address">'+esc(d.address||'Address not available')+'</p><div class="park-reference-meta">'+esc(type)+'</div>'+(d.statusNote?'<div class="park-reference-status">'+esc(d.statusNote)+'</div>':'')+'<p class="park-reference-note">Use the official DNR links for current access, closures, facilities and map information before travel.</p></div><div class="park-reference-actions"><a class="park-reference-link primary" target="_blank" rel="noopener" href="'+esc(d.directionsUrl)+'">Directions ↗</a><a class="park-reference-link" target="_blank" rel="noopener" href="'+esc(d.mapUrl)+'">Park Map ↗</a><a class="park-reference-link" target="_blank" rel="noopener" href="'+esc(d.officialUrl)+'">'+esc(d.agencyLabel)+' ↗</a></div></div>';
  const hero=page.querySelector('.park-hero');
  if(hero)hero.insertAdjacentElement('afterend',section);else page.prepend(section);
})();
