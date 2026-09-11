const http=require('http');
const fs=require('fs');
const path=require('path');
const base=require('./app-runtime.js');

const VERSION='1.4.0';
const PORT=process.env.PORT||3000;
const PUBLIC=path.join(__dirname,'public');
const IMAGE_DIR=path.join(PUBLIC,'images');

const EXPERIENCE_RULES=[
  ['Waterfalls',/waterfall|\bfalls\b/i],['Lakes',/\blake\b|\blakes\b|lake superior|lake michigan|mille lacs/i],['Rivers',/\briver\b|\brivers\b|mississippi|st\. croix/i],['Beaches',/\bbeach\b|\bbeaches\b|swimming pond/i],['Bridges',/\bbridge\b|\bbridges\b|suspension bridge/i],['Camping',/campground|campsite|camping|cart-in|walk-in|walk-to|hike-in|teepee/i],['Private campsites',/private site|private campsite|privacy.*site|sites.*privacy/i],['Hammocking',/hammock/i],['History',/history|historical|ccc|interpretive|lighthouse|burial mound|effigy mound/i],['Lookout towers',/lookout tower|observation tower|fire tower/i],['Boardwalks',/boardwalk/i],['Dark sky',/dark sky|night sky|stargaz/i],['Wildlife',/loon|bear|bison|wildlife|deer|bird/i],['Scenic views',/scenic|scenery|views|overlook|sunset|sunrise|foliage/i],['Prairie',/prairie/i],['Rock formations',/rock face|rock faces|bluff|cave|geology|natural bridge|quartzite|sandstone|dolomite/i]
];
const PRACTICAL_RULES=[
  ['Bugs',/bug|mosquito/i],['Limited cell coverage',/no cell|zero cell|limited cell/i],['Busy / crowded',/busy|crowd|overcrowd|parking situation|parking is challenging/i],['Hilly / steep',/hilly|uphill|bluff|steep/i],['Poor signage',/not well marked|poorly marked|signage isn.t great|wrong entrance/i],['Limited water',/no water|water availability|watch your water|limited water/i],['Hunting',/hunting/i],['Ferry access',/ferry|ferries/i]
];
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c));
const clean=p=>p.name.replace(' State Park','');
const sourceText=p=>[p.review,p.pros,p.cons,p.criticalFactors].join(' ');
const tags=(p,rules)=>rules.filter(([,re])=>re.test(sourceText(p))).map(([name])=>name);
const exp=p=>tags(p,EXPERIENCE_RULES),practical=p=>tags(p,PRACTICAL_RULES);

function injectMain(html,main){
  const start=html.indexOf('<main');
  const end=html.lastIndexOf('</main>');
  if(start<0||end<0)return html;
  return html.slice(0,start)+main+html.slice(end+7);
}

function finderPage(url){
  const state=url.searchParams.get('state')||'';
  const trip=url.searchParams.get('trip')||'';
  const wants=url.searchParams.getAll('experience').filter(Boolean);
  const avoids=url.searchParams.getAll('avoid').filter(Boolean);
  const submitted=url.searchParams.has('go');
  let matches=base.parks.filter(p=>
    (!state||p.state===state)&&
    (!trip||p.idealTrip.toLowerCase()===trip.toLowerCase())&&
    wants.every(t=>exp(p).includes(t))&&
    avoids.every(t=>!practical(p).includes(t))
  );
  const broader=!matches.length&&submitted;
  if(broader){
    matches=base.parks.filter(p=>(!state||p.state===state)&&(!trip||p.idealTrip.toLowerCase()===trip.toLowerCase())&&(wants.length===0||wants.some(t=>exp(p).includes(t)))&&avoids.every(t=>!practical(p).includes(t)));
  }
  const resultCards=matches.slice(0,18).map(p=>{
    const why=[];
    if(trip&&p.idealTrip.toLowerCase()===trip.toLowerCase())why.push(p.idealTrip);
    for(const w of wants)if(exp(p).includes(w))why.push(w);
    if(!why.length)why.push(p.idealTrip);
    return `<article class="park-card"><a href="/parks/${p.slug}">${p.image?`<div class="card-photo"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"></div>`:''}<div class="card-body"><div class="eyebrow">${esc(p.city)}, ${esc(p.state)}</div><h3>${esc(clean(p))}</h3><div class="trip">${esc(p.idealTrip)}</div><p style="margin-top:10px;font-size:12px">Good fit because: ${esc(why.join(' · '))}</p><span class="button blue" style="display:inline-block;margin-top:10px">Read review</span></div></a></article>`;
  }).join('');
  const body=`<main class="narrow"><section class="page-intro"><div class="kicker blue">FIND A PARK</div><h1>What kind of trip are you planning?</h1><p>This does not rank the parks. It narrows the 116 reviews to parks that fit the trip you describe.</p></section><form class="filters" method="get" action="/find"><label><span>State</span><select name="state"><option value="">Either state</option><option value="MN" ${state==='MN'?'selected':''}>Minnesota</option><option value="WI" ${state==='WI'?'selected':''}>Wisconsin</option></select></label><label><span>Trip type</span><select name="trip"><option value="">Any trip</option>${['Weekend','Day trip','On the way'].map(x=>`<option ${trip.toLowerCase()===x.toLowerCase()?'selected':''}>${x}</option>`).join('')}</select></label><fieldset style="grid-column:1/-1;border:0;padding:0"><legend class="field-label">Experiences you want</legend><div class="tag-list">${EXPERIENCE_RULES.map(([x])=>`<label class="tag-pill" style="cursor:pointer"><input type="checkbox" name="experience" value="${esc(x)}" ${wants.includes(x)?'checked':''}> ${esc(x)}</label>`).join('')}</div></fieldset><fieldset style="grid-column:1/-1;border:0;padding:0"><legend class="field-label">Things you want to avoid</legend><div class="tag-list">${PRACTICAL_RULES.map(([x])=>`<label class="tag-pill" style="cursor:pointer"><input type="checkbox" name="avoid" value="${esc(x)}" ${avoids.includes(x)?'checked':''}> ${esc(x)}</label>`).join('')}</div></fieldset><button class="button blue" name="go" value="1">Find good fits</button><a class="button ghost" href="/find">Reset</a></form>${submitted?`<section class="section"><div class="section-head"><div><div class="kicker blue">MATCHES</div><h2>${matches.length} parks fit this trip.</h2>${broader?'<p>No park matched every requested experience, so these results match at least one requested experience while preserving your state/trip/avoid filters.</p>':'<p>These are filtered fits, not a best-to-worst ranking.</p>'}</div></div>${matches.length?`<div class="cards browse-cards">${resultCards}</div>${matches.length>18?`<p class="source-note">Showing 18 of ${matches.length}. Refine the filters to narrow the set.</p>`:''}`:'<div class="empty-state"><h3>No parks matched these constraints.</h3><p>Try removing one experience or avoidance filter.</p></div>'}</section>`:'<section class="section"><div class="empty-state"><h3>Start with the trip, not the rating.</h3><p>Choose the kind of visit you want, then use the original reviews to decide which park suits it.</p></div></section>'}</main>`;
  const shell=base.renderPath(new URL('/explore','http://localhost')).body;
  return injectMain(shell,body).replace('<title>Explore by Experience | MN & WI State Parks</title>','<title>Find a Park | MN & WI State Parks</title>');
}

function renderPath(url){
  if(url.pathname==='/find')return{status:200,body:finderPage(url)};
  const out=base.renderPath(url);
  if(url.pathname==='/explore'&&out.status===200){
    out.body=out.body.replace('</section><div class="experience-grid">','<div class="actions" style="margin-top:18px"><a class="button blue" href="/find">Find a park for my trip</a></div></section><div class="experience-grid">');
  }
  return out;
}

function serveStatic(pathname,res){
  if(!pathname.startsWith('/images/'))return false;
  const file=path.normalize(path.join(PUBLIC,pathname.replace(/^\//,'')));
  if(!file.startsWith(IMAGE_DIR)||!fs.existsSync(file))return false;
  const ext=path.extname(file).toLowerCase();
  const type=ext==='.jpg'||ext==='.jpeg'?'image/jpeg':ext==='.png'?'image/png':'application/octet-stream';
  res.writeHead(200,{'content-type':type,'cache-control':'public,max-age=2592000,immutable'});fs.createReadStream(file).pipe(res);return true;
}
function createServer(){return http.createServer((req,res)=>{let url;try{url=new URL(req.url,'http://localhost')}catch{res.writeHead(400);return res.end('Bad request')}if(serveStatic(url.pathname,res))return;if(url.pathname==='/client.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(base.clientJS)}if(url.pathname==='/health'){const coords=base.loadCoords();res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify({ok:true,version:VERSION,parks:base.parks.length,features:['saved-parks','compare','trip-collections','trip-day-planner','trip-stop-notes','trip-map','print-trip','static-map','guided-park-finder'],mapCoordinates:coords?Object.keys(coords.parks).length:0}))}const out=renderPath(url);res.writeHead(out.status,{'content-type':'text/html; charset=utf-8'});res.end(out.body)})}
if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT}`));
module.exports={...base,VERSION,renderPath,createServer,EXPERIENCE_RULES,PRACTICAL_RULES};
