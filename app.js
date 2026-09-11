const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PORT = process.env.PORT || 3000;
const APP = __dirname;
const PUBLIC = path.join(APP, 'public');
const IMAGE_DIR = path.join(PUBLIC, 'images');
const VERSION = '1.1.0';

const parks = JSON.parse(zlib.gunzipSync(Buffer.from(
  require('./data1.js') + require('./data2.js') + require('./data3.js') + require('./data4.js'),
  'base64'
)).toString());
const css = require('./styles-v070.js');

const esc = s => String(s ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] || c));
const splitTags = v => String(v || '').split(',').map(s => s.trim()).filter(Boolean);
const sourceText = p => [p.review,p.pros,p.cons,p.criticalFactors].join(' ').toLowerCase();
const cleanName = p => p.name.replace(' State Park','');

const EXPERIENCE_RULES = [
  ['Waterfalls', /waterfall|falls/], ['Lakes', /\blake\b|\blakes\b|lake superior|lake michigan|mille lacs/], ['Rivers', /\briver\b|\brivers\b|mississippi|st\. croix/], ['Beaches', /\bbeach\b|\bbeaches\b|swimming pond/],
  ['Bridges', /\bbridge\b|\bbridges\b|suspension bridge/], ['Camping', /campground|campsite|camping|cart-in|walk-in|walk-to|hike-in|teepee/], ['Private campsites', /private site|private campsite|privacy.*site|sites.*privacy/],
  ['Hammocking', /hammock/], ['History', /history|historical|ccc|interpretive|mound|lighthouse/], ['Lookout towers', /lookout tower|tower/], ['Boardwalks', /boardwalk/], ['Dark sky', /dark sky|night sky|stargaz/],
  ['Wildlife', /loon|bear|bison|wildlife|deer|bird/], ['Scenic views', /scenic|scenery|views|overlook|sunset|sunrise|foliage/], ['Prairie', /prairie/], ['Rock formations', /rock face|rock faces|bluff|mound|cave|geology|natural bridge/]
];
const PRACTICAL_RULES = [
  ['Bugs', /bug|mosquito/], ['Limited cell coverage', /no cell|zero cell|limited cell/], ['Busy / crowded', /busy|crowd|overcrowd|parking situation|parking is challenging/], ['Hilly / steep', /hilly|uphill|bluff|steep/],
  ['Poor signage', /not well marked|poorly marked|signage isn.t great|wrong entrance/], ['Limited water', /no water|water availability|watch your water|limited water/], ['Hunting', /hunting/], ['Ferry access', /ferry|ferries/]
];
const tagsFor = (p,rules) => rules.filter(([,re]) => re.test(sourceText(p))).map(([n]) => n);
const expTags = p => tagsFor(p, EXPERIENCE_RULES);
const practicalTags = p => tagsFor(p, PRACTICAL_RULES);
const countTag = (n,rules) => parks.filter(p => tagsFor(p,rules).includes(n)).length;
const hasImage = p => Boolean(p && p.image && fs.existsSync(path.join(PUBLIC,p.image.replace(/^\//,''))));
const imageUrl = p => hasImage(p) ? p.image : null;
const pine = r => { const n=Number(r)||0,w=Math.floor(n),h=n%1?'<span class="half-pine">▲</span>':''; return `<span class="pines" aria-label="${n.toFixed(1)} out of 5 pine trees">${'▲'.repeat(w)}${h}</span><span class="rating-number">${n.toFixed(1)}</span>`; };

const extra = `
.site-header nav{display:flex;gap:20px;align-items:center}.site-header nav a{white-space:nowrap}
.save-park-btn,.trip-park-btn{margin-top:18px;background:#fff;color:#00558a;border:0;padding:11px 15px;font:800 11px Arial;text-transform:uppercase;letter-spacing:.08em;cursor:pointer}.save-park-btn.saved{background:#47745b;color:#fff}.trip-park-btn{margin-left:8px;background:#f4f1e9}.park-actions{display:flex;align-items:center;flex-wrap:wrap}.trip-adder{display:none;margin-top:12px;background:rgba(255,255,255,.96);padding:12px;color:#15212b;max-width:360px}.trip-adder.open{display:block}.trip-adder select{width:100%;height:38px;margin:6px 0}.trip-adder .mini-row{display:flex;gap:7px;flex-wrap:wrap}
.saved-grid,.collection-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin:30px 0}.saved-card,.collection-card{border:1px solid var(--line);background:#fff}.saved-card img{width:100%;height:190px;object-fit:cover}.saved-card-body,.collection-card{padding:18px}.saved-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.empty-state{background:var(--cream);padding:36px;margin:28px 0}.compare-table{width:100%;border-collapse:collapse;margin:30px 0}.compare-table th,.compare-table td{border-bottom:1px solid var(--line);padding:14px;vertical-align:top;text-align:left}.compare-table th:first-child{width:145px;color:var(--muted);font-size:11px;text-transform:uppercase}.project-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:28px}.project-stat{border:1px solid var(--line);padding:24px}.project-stat strong{display:block;font-size:42px;color:var(--blue)}.project-stat span{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--muted)}
.planner-head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;flex-wrap:wrap}.planner-section{padding:38px 0;border-top:1px solid var(--line)}.planner-section:first-of-type{border-top:0}.create-trip{background:var(--cream);padding:20px;display:grid;grid-template-columns:1.4fr 1fr auto;gap:10px;align-items:end}.create-trip label span,.field-label{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:var(--muted);margin-bottom:5px}.create-trip input,.trip-form input,.trip-form textarea,.trip-form select{width:100%;border:1px solid var(--line);padding:10px;font:inherit;background:#fff}.collection-card h3{margin:5px 0}.collection-card p{color:var(--muted);font-size:13px}.collection-meta{font-size:11px;color:var(--muted);margin:7px 0 14px}.trip-list{display:grid;gap:14px;margin:24px 0}.trip-stop{display:grid;grid-template-columns:90px 1fr auto;gap:15px;align-items:center;border:1px solid var(--line);padding:12px;background:#fff}.trip-stop img{width:90px;height:72px;object-fit:cover}.trip-stop h3{margin:0 0 5px}.trip-stop .controls{display:flex;gap:5px;flex-wrap:wrap}.trip-notes{background:var(--cream);padding:18px;margin:24px 0}.trip-form{display:grid;grid-template-columns:1fr 1fr;gap:14px}.trip-form .full{grid-column:1/-1}.status-note{font-size:12px;color:#47745b;margin-top:8px;min-height:18px}
.map-shell{display:grid;grid-template-columns:340px 1fr;height:calc(100vh - 78px)}.map-side{overflow:auto;border-right:1px solid var(--line)}.map-side-inner{padding:24px}.map-filters label{display:block;margin-bottom:12px}.map-filters span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:var(--muted);margin-bottom:5px}.map-filters select{width:100%;height:40px}.map-list-item{display:grid;grid-template-columns:60px 1fr;gap:10px;padding:10px 0;border-bottom:1px solid #edf1f3;cursor:pointer}.map-list-item img{width:60px;height:48px;object-fit:cover}.map-list-item b{display:block;font-size:13px}.map-list-item span{font-size:11px;color:var(--muted)}#map{width:100%;height:100%}.map-loading{position:absolute;z-index:800;top:20px;left:50%;transform:translateX(-50%);background:#fff;border:1px solid var(--line);padding:9px 12px;font-size:12px;box-shadow:0 8px 25px rgba(0,0,0,.12)}
@media(max-width:850px){.site-header nav{gap:9px}.site-header nav a{font-size:9px}.saved-grid,.collection-grid{grid-template-columns:1fr 1fr}.project-stats{grid-template-columns:1fr}.create-trip{grid-template-columns:1fr}.map-shell{grid-template-columns:1fr;height:auto}.map-list{display:none}#map{height:65vh;min-height:470px}}
@media(max-width:600px){.saved-grid,.collection-grid{grid-template-columns:1fr}.compare-table{display:block;overflow-x:auto}.trip-stop{grid-template-columns:72px 1fr}.trip-stop img{width:72px;height:60px}.trip-stop .controls{grid-column:1/-1}.trip-form{grid-template-columns:1fr}.trip-form .full{grid-column:auto}}
`;

const nav = () => '<nav><a href="/parks">Parks</a><a href="/explore">Explore</a><a href="/map">Map</a><a href="/project">Project</a><a href="/saved">Saved</a><a href="/about">About</a></nav>';
function layout(title,body,desc='First-hand reviews of all 116 designated state parks in Minnesota and Wisconsin.',head='',scripts=''){
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#00558a"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><style>${css}${extra}</style>${head}</head><body><header class="site-header"><a class="brand" href="/">STATE PARKS.<span>MN & WI</span></a>${nav()}</header>${body}<footer class="site-footer"><strong>STATE PARKS.</strong><span>116 parks. Two states. Every one visited.</span><small>Personal reviews — check official DNR sources for current conditions.</small></footer>${scripts}</body></html>`;
}

const imageBlock = (p,c='card-photo') => imageUrl(p) ? `<div class="${c}"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"></div>` : `<div class="${c} placeholder"><span>${esc(p.state)}</span></div>`;
const card = p => `<a class="park-card" href="/parks/${p.slug}">${imageBlock(p)}<div class="card-body"><div class="eyebrow">${esc(p.city)}, ${esc(p.state)}</div><h3>${esc(cleanName(p))}</h3><div class="rating">${pine(p.rating)}</div><div class="trip">${esc(p.idealTrip)}</div></div></a>`;

function home(){
  const f=['tettegouche','copper-falls','bear-head-lake'].map(s=>parks.find(p=>p.slug===s)).filter(Boolean);
  const hero=f.find(hasImage)||parks.find(hasImage),hs=hero?` style="--hero:url('${esc(hero.image)}')"`:'';
  return layout('State Parks — Minnesota & Wisconsin',`<main><section class="hero"${hs}><div class="hero-wash"></div><div class="hero-content"><div class="kicker">A COMPLETED PARK PROJECT</div><h1>116 parks.<br>Two states.<br><em>Every one visited.</em></h1><p>Candid, first-hand reviews of every designated state park in Minnesota and Wisconsin.</p><div class="actions"><a class="button light" href="/parks">Explore all parks</a><a class="button ghost" href="/saved">Plan a trip</a></div></div><div class="hero-count"><strong>116</strong><span>STATE PARKS</span><div><b>66</b> Minnesota</div><div><b>50</b> Wisconsin</div></div></section><section class="section"><div class="section-head"><div><div class="kicker blue">A FEW FAVORITES</div><h2>Featured parks.</h2></div></div><div class="cards">${f.map(card).join('')}</div></section></main>`);
}

function parksPage(url){
  const state=url.searchParams.get('state')||'',trip=url.searchParams.get('trip')||'',tag=url.searchParams.get('tag')||'',practical=url.searchParams.get('practical')||'',qRaw=url.searchParams.get('q')||'',q=qRaw.toLowerCase();
  const list=parks.filter(p=>(!state||p.state===state)&&(!trip||p.idealTrip.toLowerCase()===trip.toLowerCase())&&(!tag||expTags(p).includes(tag))&&(!practical||practicalTags(p).includes(practical))&&(!q||[p.name,p.city,p.review,p.pros,p.cons,p.criticalFactors].join(' ').toLowerCase().includes(q)));
  return layout('Explore Parks — MN & WI State Parks',`<main class="narrow"><section class="page-intro"><div class="kicker blue">EXPLORE</div><h1>All 116 parks.</h1></section><form class="filters" method="get"><label class="wide"><span>Search</span><input name="q" value="${esc(qRaw)}" placeholder="Waterfalls, camping, bridge..."></label><label><span>State</span><select name="state"><option value="">Both states</option><option value="MN" ${state==='MN'?'selected':''}>Minnesota</option><option value="WI" ${state==='WI'?'selected':''}>Wisconsin</option></select></label><label><span>Ideal trip</span><select name="trip"><option value="">Any trip</option>${['Weekend','Day trip','On the way'].map(x=>`<option ${trip.toLowerCase()===x.toLowerCase()?'selected':''}>${x}</option>`).join('')}</select></label><label><span>Experience</span><select name="tag"><option value="">Any experience</option>${EXPERIENCE_RULES.map(([x])=>`<option ${tag===x?'selected':''}>${x}</option>`).join('')}</select></label><label><span>Practical</span><select name="practical"><option value="">Any practical factor</option>${PRACTICAL_RULES.map(([x])=>`<option ${practical===x?'selected':''}>${x}</option>`).join('')}</select></label><button class="button blue">Filter</button></form><div class="results-row"><strong>${list.length}</strong> parks</div><div class="cards browse-cards">${list.map(card).join('')}</div></main>`);
}

function explorePage(){
  return layout('Explore by Experience | MN & WI State Parks',`<main class="narrow"><section class="page-intro"><div class="kicker blue">EXPLORE</div><h1>Find a park by experience.</h1></section><div class="experience-grid">${EXPERIENCE_RULES.map(([n])=>`<a class="experience-card" href="/parks?tag=${encodeURIComponent(n)}"><b>${esc(n)}</b><span>Parks mentioning this</span><strong>${countTag(n,EXPERIENCE_RULES)}</strong></a>`).join('')}</div></main>`);
}

function parkPage(p){
  const src=imageUrl(p),e=expTags(p),pr=practicalTags(p);
  const script=`<script>(function(){
    const SAVE_KEY='mnwiSavedParks',TRIP_KEY='mnwiTripCollections',slug=${JSON.stringify(p.slug)},saveBtn=document.getElementById('saveParkBtn'),tripBtn=document.getElementById('tripParkBtn'),adder=document.getElementById('tripAdder'),select=document.getElementById('tripSelect'),status=document.getElementById('tripAddStatus');
    let saved=[];try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'[]')}catch{}
    function getTrips(){try{return JSON.parse(localStorage.getItem(TRIP_KEY)||'[]')}catch{return[]}}
    function paintSave(){const on=saved.includes(slug);saveBtn.textContent=on?'Saved ✓':'Save park';saveBtn.classList.toggle('saved',on)}
    function fillTrips(){const trips=getTrips();select.innerHTML=trips.length?trips.map(t=>'<option value="'+t.id+'">'+t.name+'</option>').join(''):'<option value="">No trips yet</option>';document.getElementById('addToTripBtn').disabled=!trips.length}
    saveBtn.onclick=()=>{saved=saved.includes(slug)?saved.filter(x=>x!==slug):[...new Set([...saved,slug])];localStorage.setItem(SAVE_KEY,JSON.stringify(saved));paintSave()};
    tripBtn.onclick=()=>{adder.classList.toggle('open');fillTrips()};
    document.getElementById('addToTripBtn').onclick=()=>{const id=select.value,trips=getTrips(),t=trips.find(x=>x.id===id);if(!t)return;t.parks=[...new Set([...(t.parks||[]),slug])];localStorage.setItem(TRIP_KEY,JSON.stringify(trips));status.textContent='Added to '+t.name+' ✓'};
    document.getElementById('newTripLink').onclick=()=>{location.href='/saved#create-trip'};
    paintSave();
  })();</script>`;
  return layout(`${p.name} Review | MN & WI State Parks`,`<main class="park-page"><section class="park-hero ${src?'with-photo':'without-photo'}"${src?` style="--park-photo:url('${esc(src)}')"`:''}><div class="park-hero-shade"></div><div class="park-hero-copy"><a href="/parks" class="back">← All parks</a><div class="eyebrow light">${esc(p.city)}, ${esc(p.state)}</div><h1>${esc(cleanName(p))}</h1><div class="rating large">${pine(p.rating)}</div><div class="trip-pill">Ideal Trip · ${esc(p.idealTrip)}</div><div class="park-actions"><button id="saveParkBtn" class="save-park-btn" type="button">Save park</button><button id="tripParkBtn" class="trip-park-btn" type="button">Add to trip</button></div><div id="tripAdder" class="trip-adder"><label><span class="field-label">Trip</span><select id="tripSelect"></select></label><div class="mini-row"><button id="addToTripBtn" class="button blue" type="button">Add park</button><button id="newTripLink" class="button ghost" type="button">Create new trip</button></div><div id="tripAddStatus" class="status-note"></div></div></div></section><section class="review-grid"><article><div class="kicker blue">THE REVIEW</div><h2>My take</h2><p class="review">${esc(p.review)}</p><p class="source-note">Original booklet entry · page ${p.sourcePage}</p>${e.length?`<div class="tag-list">${e.map(x=>`<a class="tag-pill" href="/parks?tag=${encodeURIComponent(x)}">${esc(x)}</a>`).join('')}</div>`:''}${pr.length?`<div class="tag-list">${pr.map(x=>`<a class="tag-pill warn" href="/parks?practical=${encodeURIComponent(x)}">${esc(x)}</a>`).join('')}</div>`:''}</article><aside><div class="fact good"><b>THE GOOD</b>${splitTags(p.pros).map(x=>`<span>${esc(x)}</span>`).join('')}</div><div class="fact watch"><b>WATCH OUT FOR</b>${splitTags(p.cons).map(x=>`<span>${esc(x)}</span>`).join('')}</div><div class="fact critical"><b>CRITICAL FACTORS</b><p>${esc(p.criticalFactors)}</p></div></aside></section></main>`,p.review,'',script);
}

function projectPage(){
  const c=x=>parks.filter(p=>p.idealTrip.toLowerCase()===x.toLowerCase()).length;
  return layout('The Project | MN & WI State Parks',`<main class="narrow"><section class="page-intro"><div class="kicker blue">THE PROJECT</div><h1>116 / 116.</h1><p>Every designated state park in Minnesota and Wisconsin, visited and reviewed.</p></section><section class="project-stats"><div class="project-stat"><strong>66</strong><span>Minnesota</span></div><div class="project-stat"><strong>50</strong><span>Wisconsin</span></div><div class="project-stat"><strong>100%</strong><span>Complete</span></div></section><section class="section"><h2>Ideal Trip breakdown</h2><div class="project-stats"><div class="project-stat"><strong>${c('Weekend')}</strong><span>Weekend</span></div><div class="project-stat"><strong>${c('Day trip')}</strong><span>Day Trip</span></div><div class="project-stat"><strong>${c('On the way')}</strong><span>On the Way</span></div></div></section></main>`);
}

function savedPage(){
  const payload=parks.map(p=>({slug:p.slug,name:cleanName(p),city:p.city,state:p.state,idealTrip:p.idealTrip,rating:Number(p.rating),image:p.image}));
  const script=`<script>(function(){
    const PARKS=${JSON.stringify(payload)},SAVE_KEY='mnwiSavedParks',TRIP_KEY='mnwiTripCollections';
    let saved=[];try{saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'[]')}catch{}
    function getTrips(){try{return JSON.parse(localStorage.getItem(TRIP_KEY)||'[]')}catch{return[]}}
    function setTrips(v){localStorage.setItem(TRIP_KEY,JSON.stringify(v))}
    function drawSaved(){const root=document.getElementById('savedRoot'),list=saved.map(s=>PARKS.find(p=>p.slug===s)).filter(Boolean);if(!list.length){root.innerHTML='<div class="empty-state"><h2>No saved parks yet.</h2><p>Open any park review and choose <b>Save park</b>.</p><a class="button blue" href="/parks">Browse parks</a></div>';return}root.innerHTML='<div class="saved-grid">'+list.map(p=>'<article class="saved-card">'+(p.image?'<img src="'+p.image+'">':'')+'<div class="saved-card-body"><h3>'+p.name+'</h3><div>'+p.city+', '+p.state+' · '+p.idealTrip+'</div><div class="saved-actions"><label><input type="checkbox" class="cmp" value="'+p.slug+'"> Compare</label><a class="button blue" href="/parks/'+p.slug+'">Review</a><button class="button ghost addtrip" data-slug="'+p.slug+'">Add to trip</button><button class="button ghost remove" data-slug="'+p.slug+'">Remove</button></div></div></article>').join('')+'</div><button id="compareBtn" class="button blue" disabled>Compare selected</button>';document.querySelectorAll('.remove').forEach(b=>b.onclick=()=>{saved=saved.filter(x=>x!==b.dataset.slug);localStorage.setItem(SAVE_KEY,JSON.stringify(saved));drawSaved()});document.querySelectorAll('.cmp').forEach(c=>c.onchange=()=>{const a=[...document.querySelectorAll('.cmp:checked')];document.getElementById('compareBtn').disabled=a.length<2||a.length>3});document.getElementById('compareBtn').onclick=()=>{const a=[...document.querySelectorAll('.cmp:checked')].map(x=>x.value);location.href='/compare?parks='+a.join(',')};document.querySelectorAll('.addtrip').forEach(b=>b.onclick=()=>addParkToTrip(b.dataset.slug))}
    function drawTrips(){const root=document.getElementById('tripRoot'),trips=getTrips();if(!trips.length){root.innerHTML='<div class="empty-state"><h3>No trips yet.</h3><p>Create a trip below, then add parks from your saved list or directly from a park review.</p></div>';return}root.innerHTML='<div class="collection-grid">'+trips.map(t=>'<article class="collection-card"><div class="kicker blue">TRIP</div><h3>'+escapeHtml(t.name)+'</h3><div class="collection-meta">'+(t.date?escapeHtml(t.date)+' · ':'')+(t.parks||[]).length+' parks</div><p>'+escapeHtml(t.notes||'No trip notes yet.')+'</p><div class="saved-actions"><a class="button blue" href="/trip?id='+encodeURIComponent(t.id)+'">Open trip</a><button class="button ghost deltrip" data-id="'+t.id+'">Delete</button></div></article>').join('')+'</div>';document.querySelectorAll('.deltrip').forEach(b=>b.onclick=()=>{if(confirm('Delete this trip?')){setTrips(trips.filter(t=>t.id!==b.dataset.id));drawTrips()}})}
    function addParkToTrip(slug){const trips=getTrips();if(!trips.length){location.hash='create-trip';document.getElementById('tripName').focus();return}const names=trips.map((t,i)=>(i+1)+'. '+t.name).join('\n'),choice=prompt('Add to which trip?\n'+names+'\n\nEnter the number:');const idx=Number(choice)-1;if(!Number.isInteger(idx)||!trips[idx])return;trips[idx].parks=[...new Set([...(trips[idx].parks||[]),slug])];setTrips(trips);drawTrips()}
    function escapeHtml(s){return String(s||'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
    document.getElementById('createTripBtn').onclick=()=>{const name=document.getElementById('tripName').value.trim();if(!name)return;const date=document.getElementById('tripDate').value,trips=getTrips();trips.push({id:'trip-'+Date.now(),name,date,notes:'',parks:[]});setTrips(trips);document.getElementById('tripName').value='';document.getElementById('tripDate').value='';drawTrips()};
    drawSaved();drawTrips();
  })();</script>`;
  return layout('Saved Parks & Trips | MN & WI State Parks',`<main class="narrow"><section class="page-intro"><div class="kicker blue">PLAN</div><h1>Saved parks & trips.</h1><p>Keep a shortlist of parks, compare them, then group them into lightweight trip collections. Everything stays in this browser; no account is required.</p></section><section class="planner-section"><div class="planner-head"><div><div class="kicker blue">SAVED PARKS</div><h2>Your shortlist</h2></div></div><div id="savedRoot"></div></section><section class="planner-section" id="create-trip"><div class="planner-head"><div><div class="kicker blue">TRIPS</div><h2>Trip collections</h2></div></div><div id="tripRoot"></div><div class="create-trip"><label><span>Trip name</span><input id="tripName" placeholder="North Shore weekend"></label><label><span>Planned date (optional)</span><input id="tripDate" type="date"></label><button id="createTripBtn" class="button blue" type="button">Create trip</button></div></section></main>`,'Saved parks and lightweight trip planning','',''+script);
}

function tripPage(url){
  const payload=parks.map(p=>({slug:p.slug,name:cleanName(p),city:p.city,state:p.state,idealTrip:p.idealTrip,rating:Number(p.rating),image:p.image,pros:p.pros,cons:p.cons}));
  const id=url.searchParams.get('id')||'';
  const script=`<script>(function(){
    const PARKS=${JSON.stringify(payload)},TRIP_KEY='mnwiTripCollections',ID=${JSON.stringify(id)};
    function getTrips(){try{return JSON.parse(localStorage.getItem(TRIP_KEY)||'[]')}catch{return[]}}
    function setTrips(v){localStorage.setItem(TRIP_KEY,JSON.stringify(v))}
    function esc(s){return String(s||'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
    function current(){return getTrips().find(t=>t.id===ID)}
    function saveMeta(){const trips=getTrips(),t=trips.find(x=>x.id===ID);if(!t)return;t.name=document.getElementById('tripNameEdit').value.trim()||t.name;t.date=document.getElementById('tripDateEdit').value;t.notes=document.getElementById('tripNotesEdit').value;setTrips(trips);document.getElementById('tripStatus').textContent='Trip saved ✓';drawHeader(t)}
    function drawHeader(t){document.getElementById('tripTitle').textContent=t.name;document.title=t.name+' | MN & WI State Parks'}
    function move(slug,dir){const trips=getTrips(),t=trips.find(x=>x.id===ID);if(!t)return;const i=t.parks.indexOf(slug),j=i+dir;if(i<0||j<0||j>=t.parks.length)return;[t.parks[i],t.parks[j]]=[t.parks[j],t.parks[i]];setTrips(trips);drawStops(t)}
    function remove(slug){const trips=getTrips(),t=trips.find(x=>x.id===ID);if(!t)return;t.parks=(t.parks||[]).filter(s=>s!==slug);setTrips(trips);drawStops(t)}
    function drawStops(t){const root=document.getElementById('tripStops'),list=(t.parks||[]).map(s=>PARKS.find(p=>p.slug===s)).filter(Boolean);if(!list.length){root.innerHTML='<div class="empty-state"><h3>No parks in this trip yet.</h3><p>Add parks from a park review or from your Saved page.</p><a class="button blue" href="/saved">Back to saved parks</a></div>';return}root.innerHTML=list.map((p,i)=>'<article class="trip-stop">'+(p.image?'<img src="'+p.image+'">':'<div></div>')+'<div><h3>'+(i+1)+'. '+esc(p.name)+'</h3><div>'+esc(p.city)+', '+p.state+' · '+esc(p.idealTrip)+' · '+p.rating.toFixed(1)+'/5</div><small><b>Pros:</b> '+esc(p.pros||'—')+'</small></div><div class="controls"><a class="button blue" href="/parks/'+p.slug+'">Review</a><button class="button ghost up" data-slug="'+p.slug+'" '+(i===0?'disabled':'')+'>↑</button><button class="button ghost down" data-slug="'+p.slug+'" '+(i===list.length-1?'disabled':'')+'>↓</button><button class="button ghost rm" data-slug="'+p.slug+'">Remove</button></div></article>').join('');document.querySelectorAll('.up').forEach(b=>b.onclick=()=>move(b.dataset.slug,-1));document.querySelectorAll('.down').forEach(b=>b.onclick=()=>move(b.dataset.slug,1));document.querySelectorAll('.rm').forEach(b=>b.onclick=()=>remove(b.dataset.slug))}
    const t=current();if(!t){document.getElementById('tripApp').innerHTML='<div class="empty-state"><h2>Trip not found.</h2><a class="button blue" href="/saved">Back to saved parks</a></div>';return}drawHeader(t);document.getElementById('tripNameEdit').value=t.name;document.getElementById('tripDateEdit').value=t.date||'';document.getElementById('tripNotesEdit').value=t.notes||'';drawStops(t);document.getElementById('saveTripBtn').onclick=saveMeta;
  })();</script>`;
  return layout('Trip | MN & WI State Parks',`<main class="narrow" id="tripApp"><section class="page-intro"><div class="kicker blue">TRIP PLAN</div><h1 id="tripTitle">Trip</h1><p>Arrange the parks in the order you want to think about visiting them. This is a lightweight planning list, not turn-by-turn routing.</p></section><section class="trip-notes"><div class="trip-form"><label><span class="field-label">Trip name</span><input id="tripNameEdit"></label><label><span class="field-label">Planned date</span><input id="tripDateEdit" type="date"></label><label class="full"><span class="field-label">Notes</span><textarea id="tripNotesEdit" rows="4" placeholder="Campground, ferry timing, people joining, things to remember..."></textarea></label></div><button id="saveTripBtn" class="button blue" type="button">Save trip details</button><div id="tripStatus" class="status-note"></div></section><section class="planner-section"><div class="kicker blue">PARK ORDER</div><h2>Stops</h2><div id="tripStops" class="trip-list"></div></section></main>`,'Lightweight state park trip planning','',''+script);
}

function comparePage(url){
  const chosen=(url.searchParams.get('parks')||'').split(',').map(s=>parks.find(p=>p.slug===s)).filter(Boolean).slice(0,3);
  if(chosen.length<2)return layout('Compare Parks',`<main class="narrow"><section class="page-intro"><h1>Choose at least two parks.</h1></section></main>`);
  const row=(l,f)=>`<tr><th>${l}</th>${chosen.map(p=>`<td>${f(p)}</td>`).join('')}</tr>`;
  return layout('Compare Parks | MN & WI State Parks',`<main class="narrow"><section class="page-intro"><div class="kicker blue">COMPARE</div><h1>Which fits this trip?</h1></section><table class="compare-table"><thead><tr><th></th>${chosen.map(p=>`<th>${esc(cleanName(p))}</th>`).join('')}</tr></thead><tbody>${row('Location',p=>`${esc(p.city)}, ${esc(p.state)}`)}${row('Ideal trip',p=>esc(p.idealTrip))}${row('Pine rating',p=>`${Number(p.rating).toFixed(1)} / 5`)}${row('Pros',p=>esc(p.pros||'—'))}${row('Cons',p=>esc(p.cons||'—'))}${row('Critical factors',p=>esc(p.criticalFactors||'—'))}</tbody></table></main>`);
}

function about(){
  const cover=fs.existsSync(path.join(IMAGE_DIR,'booklet-cover.jpg'))?'/images/booklet-cover.jpg':null;
  return layout('About the Project | MN & WI State Parks',`<main class="narrow"><section class="page-intro about-hero"><div><div class="kicker blue">THE PROJECT</div><h1>Every designated state park in Minnesota and Wisconsin.</h1><p>This site grew out of a completed personal project and the review booklet that followed it.</p></div>${cover?`<img src="${cover}" alt="Original booklet cover">`:''}</section><section class="prose"><h2>About the reviews</h2><p>The reviews are candid impressions from actual visits.</p><h2>The pine ratings</h2><p>The ratings are not intended as rankings between parks.</p></section></main>`);
}

function mapPage(){
  const payload=parks.map(p=>({slug:p.slug,name:p.name,city:p.city,state:p.state,idealTrip:p.idealTrip,rating:Number(p.rating),image:p.image,tags:expTags(p),wikiTitle:p.slug==='interstate-mn'?'Interstate State Park (Minnesota)':p.slug==='interstate-wi'?'Interstate State Park (Wisconsin)':p.name}));
  const head='<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">';
  const script=`<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const PARKS=${JSON.stringify(payload)},map=L.map('map').setView([45.7,-91.1],6);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);const layer=L.layerGroup().addTo(map);let enriched=[];function batches(a,n=45){const x=[];for(let i=0;i<a.length;i+=n)x.push(a.slice(i,i+n));return x}async function load(){const coords=new Map();for(const b of batches(PARKS)){const u='https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles='+encodeURIComponent(b.map(p=>p.wikiTitle).join('|'))+'&props=claims|sitelinks&format=json&origin=*',d=await fetch(u).then(r=>r.json());for(const e of Object.values(d.entities||{})){const t=e.sitelinks&&e.sitelinks.enwiki&&e.sitelinks.enwiki.title,c=e.claims&&e.claims.P625&&e.claims.P625[0],v=c&&c.mainsnak&&c.mainsnak.datavalue&&c.mainsnak.datavalue.value;if(t&&v)coords.set(t,{lat:v.latitude,lng:v.longitude})}}}enriched=PARKS.map(p=>({...p,coord:coords.get(p.wikiTitle)||null}));render();document.getElementById('mapLoading').style.display='none'}function render(){const s=document.getElementById('mapState').value,t=document.getElementById('mapTrip').value,g=document.getElementById('mapTag').value,v=enriched.filter(p=>p.coord&&(!s||p.state===s)&&(!t||p.idealTrip===t)&&(!g||p.tags.includes(g)));layer.clearLayers();const list=document.getElementById('mapList');list.innerHTML='';const b=[];for(const p of v){const m=L.circleMarker([p.coord.lat,p.coord.lng],{radius:7,color:p.state==='MN'?'#00558a':'#47745b',fillOpacity:.82}).bindPopup('<b>'+p.name.replace(' State Park','')+'</b><br><a href="/parks/'+p.slug+'">Read review →</a>').addTo(layer);b.push([p.coord.lat,p.coord.lng]);const el=document.createElement('div');el.className='map-list-item';el.innerHTML=(p.image?'<img src="'+p.image+'">':'<div></div>')+'<div><b>'+p.name.replace(' State Park','')+'</b><span>'+p.city+', '+p.state+'</span></div>';el.onclick=()=>{map.setView([p.coord.lat,p.coord.lng],10);m.openPopup()};list.appendChild(el)}document.getElementById('mapCount').textContent=v.length;if(b.length>1)map.fitBounds(b,{padding:[25,25],maxZoom:8})}['mapState','mapTrip','mapTag'].forEach(id=>document.getElementById(id).onchange=render);load();</script>`;
  return layout('Park Map | MN & WI State Parks',`<main class="map-shell"><aside class="map-side"><div class="map-side-inner"><div class="kicker blue">GEOGRAPHY</div><h1>All parks on a map.</h1><div class="map-filters"><label><span>State</span><select id="mapState"><option value="">Both states</option><option value="MN">Minnesota</option><option value="WI">Wisconsin</option></select></label><label><span>Ideal trip</span><select id="mapTrip"><option value="">Any trip</option><option>Weekend</option><option>Day trip</option><option>On the way</option></select></label><label><span>Experience</span><select id="mapTag"><option value="">Any experience</option>${EXPERIENCE_RULES.map(([n])=>`<option>${esc(n)}</option>`).join('')}</select></label></div><p><strong id="mapCount">0</strong> mapped parks visible</p><div id="mapList" class="map-list"></div></div></aside><section style="position:relative"><div id="mapLoading" class="map-loading">Loading park locations…</div><div id="map"></div></section></main>`,'Interactive park map',head,script);
}

function renderPath(url){
  if(url.pathname==='/')return{status:200,body:home()};
  if(url.pathname==='/parks')return{status:200,body:parksPage(url)};
  if(url.pathname==='/explore')return{status:200,body:explorePage()};
  if(url.pathname==='/map')return{status:200,body:mapPage()};
  if(url.pathname==='/project')return{status:200,body:projectPage()};
  if(url.pathname==='/saved')return{status:200,body:savedPage()};
  if(url.pathname==='/trip')return{status:200,body:tripPage(url)};
  if(url.pathname==='/compare')return{status:200,body:comparePage(url)};
  if(url.pathname==='/about')return{status:200,body:about()};
  if(/^\/parks\/[^/]+\/?$/.test(url.pathname)){const p=parks.find(x=>x.slug===url.pathname.replace(/\/$/,'').split('/')[2]);if(p)return{status:200,body:parkPage(p)}}
  return{status:404,body:layout('Not found','<main class="narrow"><section class="page-intro"><h1>Not found.</h1></section></main>')};
}

function serveStatic(p,res){
  if(!p.startsWith('/images/'))return false;
  const f=path.normalize(path.join(PUBLIC,p.replace(/^\//,'')));
  if(!f.startsWith(IMAGE_DIR)||!fs.existsSync(f))return false;
  const e=path.extname(f).toLowerCase(),t=e==='.jpg'||e==='.jpeg'?'image/jpeg':e==='.png'?'image/png':'application/octet-stream';
  res.writeHead(200,{'content-type':t,'cache-control':'public, max-age=2592000, immutable'});
  fs.createReadStream(f).pipe(res);return true;
}

function createServer(){
  return http.createServer((req,res)=>{
    let u;try{u=new URL(req.url,'http://localhost')}catch{res.writeHead(400);return res.end('Bad request')}
    if(serveStatic(u.pathname,res))return;
    if(u.pathname==='/health'){res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify({ok:true,version:VERSION,parks:parks.length,parkImages:parks.filter(hasImage).length,nav:['parks','explore','map','project','saved','about'],features:['saved-parks','compare','trip-collections']}))}
    const o=renderPath(u);res.writeHead(o.status,{'content-type':'text/html; charset=utf-8'});res.end(o.body);
  });
}

if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT}`));
module.exports={VERSION,parks,renderPath,createServer};
