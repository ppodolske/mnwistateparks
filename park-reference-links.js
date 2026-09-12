(()=>{
  const MN_IDS={
    'afton':'spk00100','banning':'spk00103','bear-head-lake':'spk00109','beaver-creek-valley':'spk00112','big-stone-lake':'spk00115','blue-mounds':'spk00121','buffalo-river':'spk00124','camden':'spk00127','carley':'spk00130','cascade-river':'spk00133','charles-a-lindbergh':'spk00136','crow-wing':'spk00139','father-hennepin':'spk00142','flandrau':'spk00145','forestville-mystery-cave':'spk00148','fort-ridgely':'spk00151','fort-snelling':'spk00154','franz-jevne':'spk00157','frontenac':'spk00160','george-h-crosby-manitou':'spk00163','glacial-lakes':'spk00166','glendalough':'spk00167','gooseberry-falls':'spk00172','grand-portage':'spk00173','hayes-lake':'spk00174','myre-big-island':'spk00175','hill-annex-mine':'spk00176','john-a-latsch':'spk00177','interstate':'spk00178','itasca':'spk00181','jay-cooke':'spk00187','judge-c-r-magney':'spk00193','kilen-woods':'spk00196','lac-qui-parle':'spk00197','lake-bemidji':'spk00205','lake-bronson':'spk00208','lake-carlos':'spk00211','lake-louise':'spk00214','lake-maria':'spk00217','lake-shetek':'spk00220','mccarthy-beach':'spk00226','maplewood':'spk00229','mille-lacs-kathio':'spk00232','minneopa':'spk00235','monson-lake':'spk00238','moose-lake':'spk00239','nerstrand-big-woods':'spk00241','great-river-bluffs':'spk00244','old-mill':'spk00247','rice-lake':'spk00250','st-croix':'spk00253','wild-river':'spk00254','sakatah-lake':'spk00256','savanna-portage':'spk00259','scenic':'spk00262','schoolcraft':'spk00263','sibley':'spk00265','split-rock-lighthouse':'spk00266','split-rock-creek':'spk00267','temperance-river':'spk00268','tettegouche':'spk00269','upper-sioux-agency':'spk00277','whitewater':'spk00280','william-o-brien':'spk00283','zippel-bay':'spk00284','lake-vermilion-soudan-underground-mine':'spk00285'
  };
  const WI_CODES={
    'interstate-park':'interstate','pattison':'pattison','amnicon-falls':'amnicon','aztalan':'aztalan','belmont-mound':'belmont','big-bay':'bigbay','big-foot-beach':'bigfoot','blue-mound':'bluemound','brunet-island':'brunetisland','buckhorn':'buckhorn','copper-culture':'copperculture','copper-falls':'copperfalls','council-grounds':'councilgrounds','cross-plains':'crossplains','devil-s-lake':'devilslake','governor-dodge':'govdodge','governor-nelson':'govnelson','governor-thompson':'govthompson','harrington-beach':'harringtonbeach','hartman-creek':'hartmancreek','heritage-hill':'heritagehill','high-cliff':'highcliff','kinnickinnic':'kinnickinnic','kohler-andrae':'kohlerandrae','lake-kegonsa':'lakekegonsa','lake-wissota':'lakewissota','lakeshore':'lakeshore','lizard-mound':'lizardmound','lost-dauphin':'lostdauphin','merrick':'merrick','mill-bluff':'millbluff','mirror-lake':'mirrorlake','natural-bridge':'naturalbridge','nelson-dewey':'nelsondewey','new-glarus-woods':'newglaruswoods','newport':'newport','peninsula':'peninsula','perrot':'perrot','potawatomi':'potawatomi','rib-mountain':'ribmt','roche-a-cri':'rocheacri','rock-island':'rockisland','rocky-arbor':'rockyarbor','straight-lake':'straightlake','tower-hill':'towerhill','whitefish-dunes':'whitefishdunes','wildcat-mountain':'wildcat','willow-river':'willowriver','wyalusing':'wyalusing','yellowstone-lake':'yellowstone'
  };
  const dnrSource=u=>/^https:\/\/(?:www\.)?dnr\.state\.mn\.us\//.test(String(u||''))||/^https:\/\/dnr\.wisconsin\.gov\//.test(String(u||''));
  function stateFor(slug){return MN_IDS[slug]?'MN':WI_CODES[slug]?'WI':''}
  function directionsUrl(slug,d={}){
    const destination=d.address||d.mapsQuery||slug;
    return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(destination);
  }
  function officialUrl(slug,d={}){
    if(d.status==='closed'&&dnrSource(d.sourceUrl))return d.sourceUrl;
    const state=stateFor(slug);
    if(state==='MN')return `https://www.dnr.state.mn.us/state_parks/park.html?id=${MN_IDS[slug]}#homepage`;
    if(state==='WI')return `https://dnr.wisconsin.gov/topic/parks/${WI_CODES[slug]}`;
    return d.sourceUrl||'';
  }
  function mapUrl(slug){
    const state=stateFor(slug);
    if(state==='MN')return `https://www.dnr.state.mn.us/state_parks/park.html?id=${MN_IDS[slug]}#maps`;
    if(state==='WI')return `https://dnr.wisconsin.gov/topic/parks/${WI_CODES[slug]}/maps`;
    return '';
  }
  function enrich(slug,d={}){
    const state=stateFor(slug);
    return {...d,state,agencyLabel:state==='MN'?'MN DNR':state==='WI'?'WI DNR':'Official site',directionsUrl:directionsUrl(slug,d),officialUrl:officialUrl(slug,d),mapUrl:mapUrl(slug)};
  }
  const api={MN_IDS,WI_CODES,stateFor,directionsUrl,officialUrl,mapUrl,enrich};
  if(typeof window!=='undefined')window.ParkReferenceLinks=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
