const http=require('http');
const fs=require('fs');
const path=require('path');
const base=require('./app.js');

const VERSION='1.9.0';
const PORT=process.env.PORT||3000;
const PUBLIC=path.join(__dirname,'public');
const IMAGE_DIR=path.join(PUBLIC,'images');
const PLANNER_FILE=path.join(__dirname,'planner-polish.js');
const plannerJS=fs.readFileSync(PLANNER_FILE,'utf8');

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
const exp=p=>tags(p,EXPERIENCE_RULES);
const practical=p=>tags(p,PRACTICAL_RULES);

function repairClientJS(source){
  return source
    .replace(".join('\n')", ".join('\\\\n')")
    .replace("prompt('Add to which trip?\n'+options+'\n\nEnter the number:')", "prompt('Add to which trip?\\\\n'+options+'\\\\n\\\\nEnter the number:')");
}
const clientJS=repairClientJS(base.clientJS);

const COLLECTIONS=[
  {slug:'waterfall-stops',title:'Waterfall stops',kicker:'WATERFALLS',description:'Parks where waterfalls are part of the experience described in the original review.',note:'Useful for building a trip around falls without treating every waterfall park as interchangeable.',match:p=>exp(p).includes('Waterfalls')},
  {slug:'dark-sky-parks',title:'Dark-sky parks',kicker:'NIGHT SKY',description:'Parks whose original review mentions dark skies, night skies, or stargazing.',note:'A focused set for trips where the evening experience matters as much as the daytime stop.',match:p=>exp(p).includes('Dark sky')},
  {slug:'camping-weekends',title:'Camping weekends',kicker:'WEEKEND CAMPING',description:'Weekend-designated parks whose reviews also mention camping or campsites.',note:'A practical starting point for overnight trips rather than day-trip-only browsing.',match:p=>p.idealTrip.toLowerCase()==='weekend'&&exp(p).includes('Camping')},
  {slug:'beaches-and-swimming',title:'Beaches & swimming',kicker:'WATER DAYS',description:'Parks where the review mentions beaches, swimming areas, or swimming ponds.',note:'Best used as a browse set; conditions and swimming access should still be checked with the relevant DNR.',match:p=>exp(p).includes('Beaches')},
  {slug:'history-in-the-landscape',title:'History in the landscape',kicker:'HISTORY',description:'Parks where historical sites, CCC-era features, interpretation, lighthouses, or mounds are part of the reviewed experience.',note:'For trips where the story of the place matters alongside scenery and hiking.',match:p=>exp(p).includes('History')},
  {slug:'scenic-views',title:'Scenic views & overlooks',kicker:'SCENERY',description:'Parks whose reviews call out scenic views, overlooks, sunsets, sunrises, or fall color.',note:'A broad visual collection rather than a ranking of which view is “best.”',match:p=>exp(p).includes('Scenic views')},
  {slug:'on-the-way',title:'Good “On the Way” stops',kicker:'ROAD TRIP STOPS',description:'Every park classified in the original booklet as an “On the Way” trip.',note:'These are parks the booklet framed as useful add-ons or stops rather than destination weekends.',match:p=>p.idealTrip.toLowerCase()==='on the way'},
  {slug:'five-pine-parks',title:'Five-pine entries',kicker:'5 PINE',description:'Parks given a 5.0-pine rating in the original booklet.',note:'This is not a leaderboard. The pine rating reflects how well each park delivers its own experience, not a universal ranking across parks.',match:p=>Number(p.rating)===5}
];

function replaceMain(html,main,title){
  const start=html.indexOf('<main');
  const end=html.lastIndexOf('</main>');
  if(start<0||end<0)return html;
  let out=html.slice(0,start)+main+html.slice(end+7);
  if(title)out=out.replace(/<title>[^<]*<\/title>/,`<title>${esc(title)}</title>`);
  return out;
}
function parkCard(p,reason){return `<article class="park-card"><a href="/parks/${p.slug}">${p.image?`<div class="card-photo"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"></div>`:''}<div class="card-body"><div class="eyebrow">${esc(p.city)}, ${esc(p.state)}</div><h3>${esc(clean(p))}</h3><div class="trip">${esc(p.idealTrip)}</div>${reason?`<p style="margin-top:10px;font-size:12px">${esc(reason)}</p>`:''}<span class="button blue" style="display:inline-block;margin-top:10px">Read review</span></div></a></article>`}

function finderPage(url){
  const state=url.searchParams.get('state')||'';
  const trip=url.searchParams.get('trip')||'';
  const wants=url.searchParams.getAll('experience').filter(Boolean);
  const avoids=url.searchParams.getAll('avoid').filter(Boolean);
  const submitted=url.searchParams.has('go');
  let matches=base.parks.filter(p=>(!state||p.state===state)&&(!trip||p.idealTrip.toLowerCase()===trip.toLowerCase())&&wants.every(t=>exp(p).includes(t))&&avoids.every(t=>!practical(p).includes(t)));
  const broader=!matches.length&&submitted;
  if(broader)matches=base.parks.filter(p=>(!state||p.state===state)&&(!trip||p.idealTrip.toLowerCase()===trip.toLowerCase())&&(wants.length===0||wants.some(t=>exp(p).includes(t)))&&avoids.every(t=>!practical(p).includes(t)));
  const resultCards=matches.slice(0,18).map(p=>{const why=[];if(trip&&p.idealTrip.toLowerCase()===trip.toLowerCase())why.push(p.idealTrip);for(const w of wants)if(exp(p).includes(w))why.push(w);if(!why.length)why.push(p.idealTrip);return parkCard(p,`Good fit because: ${why.join(' · ')}`)}).join('');
  const main=`<main class="narrow"><section class="page-intro"><div class="kicker blue">FIND A PARK</div><h1>What kind of trip are you planning?</h1><p>This does not rank the parks. It narrows the 116 reviews to parks that fit the trip you describe.</p></section><form class="filters" method="get" action="/find"><label><span>State</span><select name="state"><option value="">Either state</option><option value="MN" ${state==='MN'?'selected':''}>Minnesota</option><option value="WI" ${state==='WI'?'selected':''}>Wisconsin</option></select></label><label><span>Trip type</span><select name="trip"><option value="">Any trip</option>${['Weekend','Day trip','On the way'].map(x=>`<option ${trip.toLowerCase()===x.toLowerCase()?'selected':''}>${x}</option>`).join('')}</select></label><fieldset style="grid-column:1/-1;border:0;padding:0"><legend class="field-label">Experiences you want</legend><div class="tag-list">${EXPERIENCE_RULES.map(([x])=>`<label class="tag-pill" style="cursor:pointer"><input type="checkbox" name="experience" value="${esc(x)}" ${wants.includes(x)?'checked':''}> ${esc(x)}</label>`).join('')}</div></fieldset><fieldset style="grid-column:1/-1;border:0;padding:0"><legend class="field-label">Things you want to avoid</legend><div class="tag-list">${PRACTICAL_RULES.map(([x])=>`<label class="tag-pill" style="cursor:pointer"><input type="checkbox" name="avoid" value="${esc(x)}" ${avoids.includes(x)?'checked':''}> ${esc(x)}</label>`).join('')}</div></fieldset><button class="button blue" name="go" value="1">Find good fits</button><a class="button ghost" href="/find">Reset</a></form>${submitted?`<section class="section"><div class="section-head"><div><div class="kicker blue">MATCHES</div><h2>${matches.length} parks fit this trip.</h2>${broader?'<p>No park matched every requested experience, so these results match at least one requested experience while preserving your state/trip/avoid filters.</p>':'<p>These are filtered fits, not a best-to-worst ranking.</p>'}</div></div>${matches.length?`<div class="cards browse-cards">${resultCards}</div>${matches.length>18?`<p class="source-note">Showing 18 of ${matches.length}. Refine the filters to narrow the set.</p>`:''}`:'<div class="empty-state"><h3>No parks matched these constraints.</h3><p>Try removing one experience or avoidance filter.</p></div>'}</section>`:'<section class="section"><div class="empty-state"><h3>Start with the trip, not the rating.</h3><p>Choose the kind of visit you want, then use the original reviews to decide which park suits it.</p></div></section>'}</main>`;
  return replaceMain(base.renderPath(new URL('/explore','http://localhost')).body,main,'Find a Park | MN & WI State Parks');
}

function collectionsPage(){
  const cards=COLLECTIONS.map(c=>{const matches=base.parks.filter(c.match),hero=matches.find(p=>p.image)||matches[0];return `<a class="experience-card" href="/collections/${c.slug}" style="display:block;position:relative;overflow:hidden">${hero&&hero.image?`<div style="height:150px;margin:-18px -18px 16px"><img src="${esc(hero.image)}" alt="" style="width:100%;height:100%;object-fit:cover"></div>`:''}<span>${esc(c.kicker)}</span><b>${esc(c.title)}</b><p style="margin:8px 0 12px">${esc(c.description)}</p><strong>${matches.length}</strong><span>parks</span></a>`}).join('');
  const main=`<main class="narrow"><section class="page-intro"><div class="kicker blue">COLLECTIONS</div><h1>Browse the project by theme.</h1><p>These are editorial groupings built from the original reviews, Ideal Trip labels, and derived experience tags. They are not rankings.</p></section><div class="experience-grid">${cards}</div><section class="section"><div class="empty-state"><h3>Collections explain a trip idea, not a winner.</h3><p>Open any collection to see the parks that fit that theme, then use the original review to decide whether the park fits your trip.</p></div></section></main>`;
  return replaceMain(base.renderPath(new URL('/explore','http://localhost')).body,main,'Collections | MN & WI State Parks');
}
function collectionPage(slug){
  const c=COLLECTIONS.find(x=>x.slug===slug);if(!c)return null;
  const matches=base.parks.filter(c.match);
  const main=`<main class="narrow"><section class="page-intro"><a href="/collections" class="back">← All collections</a><div class="kicker blue">${esc(c.kicker)}</div><h1>${esc(c.title)}</h1><p>${esc(c.description)}</p><p class="source-note">${esc(c.note)}</p></section><section class="section"><div class="section-head"><div><div class="kicker blue">${matches.length} PARKS</div><h2>In this collection</h2></div></div><div class="cards browse-cards">${matches.map(p=>parkCard(p,`${p.idealTrip} · ${Number(p.rating).toFixed(1)} pine`)).join('')}</div></section></main>`;
  return replaceMain(base.renderPath(new URL('/explore','http://localhost')).body,main,`${c.title} | MN & WI State Parks`);
}

function aboutPage(){
  const main=`<main class="narrow"><section class="page-intro"><div class="kicker blue">ABOUT THE PROJECT</div><h1>Every designated state park in Minnesota and Wisconsin.</h1><p>This site is the web version of a completed 116-park review project: 66 Minnesota state parks and 50 Wisconsin state parks, all personally visited.</p></section><section class="section"><div class="review-grid"><article><div class="kicker blue">HOW THE REVIEWS WORK</div><h2>First-hand, not comprehensive field guides.</h2><p>Most visits took place between April and October, usually in fair weather, and many visits were a few hours rather than multi-day stays. The reviews describe the experience actually had on those visits rather than trying to catalogue every trail, campsite, or facility.</p><p>The project covers designated state parks only. It does not attempt to include state forests, recreation areas, natural areas, or national lands.</p></article><aside><div class="fact good"><b>ORIGINAL FIELDS</b><span>Review text</span><span>Pros</span><span>Cons</span><span>Critical Factors</span><span>Ideal Trip</span><span>Pine rating</span></div><div class="fact critical"><b>DERIVED ON THIS SITE</b><p>Experience and practical tags are generated from the original review text to make the project easier to browse. They are navigation aids, not rewritten reviews.</p></div></aside></div></section><section class="section"><div class="kicker blue">THE PINE RATING</div><h2>Not a leaderboard.</h2><p>The pine score is meant to reflect how well a park delivers the experience it offers. A lower-rated small or specialized park is not automatically “worse” than a large destination park. That is why the site emphasizes trip fit, Ideal Trip, collections, and the original review instead of a single ranked list.</p></section><section class="section"><div class="kicker blue">IDEAL TRIP</div><h2>Three ways the booklet framed a visit.</h2><div class="project-stats"><div class="project-stat"><strong>Weekend</strong><span>Worth building a destination trip around</span></div><div class="project-stat"><strong>Day Trip</strong><span>Strong standalone visit without needing a full weekend</span></div><div class="project-stat"><strong>On the Way</strong><span>Best as a stop, add-on, or part of a larger route</span></div></div></section><section class="section"><div class="empty-state"><h3>Current conditions can change.</h3><p>The reviews are historical first-hand impressions. Closures, reservations, ferries, facilities, water access, and other operating details should be checked with the relevant state DNR before a trip.</p></div></section></main>`;
  return replaceMain(base.renderPath(new URL('/about','http://localhost')).body,main,'About the Project | MN & WI State Parks');
}
function enrichParkPage(html,p){
  const practicalTags=practical(p);if(!practicalTags.length)return html;
  const block=`<div class="practical-block" style="margin-top:18px"><div class="field-label">PRACTICAL NOTES FROM THE REVIEW</div><div class="tag-list">${practicalTags.map(x=>`<a class="tag-pill" href="/parks?practical=${encodeURIComponent(x)}">${esc(x)}</a>`).join('')}</div></div>`;
  return html.includes('</article><aside>')?html.replace('</article><aside>',`${block}</article><aside>`):html;
}
function enrichCompare(html,url){
  const chosen=(url.searchParams.get('parks')||'').split(',').map(s=>base.parks.find(p=>p.slug===s)).filter(Boolean).slice(0,3);
  if(chosen.length<2||html.includes('<th>Critical factors</th>'))return html;
  return html.replace('</tbody>',`<tr><th>Critical factors</th>${chosen.map(p=>`<td>${esc(p.criticalFactors||'—')}</td>`).join('')}</tr></tbody>`);
}
function enrichProject(html){
  if(html.includes('HOW TO READ THE SITE'))return html;
  const block=`<section class="section"><div class="kicker blue">HOW TO READ THE SITE</div><h2>Original review vs. derived navigation.</h2><p>The review, Pros, Cons, Critical Factors, Ideal Trip, and pine rating come from the original project. Experience and practical tags are derived from that text to support search, filtering, the map, the park finder, and collections.</p><p class="source-note">Derived tags are intentionally kept separate from the original review fields.</p></section>`;
  return html.replace('</main>',`${block}</main>`);
}
function enrichExplore(html){
  if(html.includes('href="/find"')||html.includes('href="/collections"'))return html;
  const buttons='<div class="actions" style="margin-top:18px"><a class="button blue" href="/find">Find a park for my trip</a><a class="button blue" href="/collections" style="margin-left:10px">Browse collections</a></div>';
  return html.replace('</section><div class="experience-grid">',`${buttons}</section><div class="experience-grid">`);
}

function renderPath(url){
  if(url.pathname==='/find')return{status:200,body:finderPage(url)};
  if(url.pathname==='/collections')return{status:200,body:collectionsPage()};
  if(url.pathname.startsWith('/collections/')){const slug=url.pathname.replace(/^\/collections\//,'').replace(/\/$/,'');const body=collectionPage(slug);if(body)return{status:200,body}}
  if(url.pathname==='/about')return{status:200,body:aboutPage()};
  const out=base.renderPath(url);if(out.status!==200)return out;
  if(url.pathname==='/explore')out.body=enrichExplore(out.body);
  if(url.pathname==='/project')out.body=enrichProject(out.body);
  if(url.pathname==='/compare')out.body=enrichCompare(out.body,url);
  const parkMatch=url.pathname.match(/^\/parks\/([^/]+)\/?$/);if(parkMatch){const p=base.parks.find(x=>x.slug===parkMatch[1]);if(p)out.body=enrichParkPage(out.body,p)}
  return out;
}

function serveStatic(pathname,res){
  if(!pathname.startsWith('/images/'))return false;
  const file=path.normalize(path.join(PUBLIC,pathname.replace(/^\//,'')));
  if(!file.startsWith(IMAGE_DIR)||!fs.existsSync(file))return false;
  const ext=path.extname(file).toLowerCase(),type=ext==='.jpg'||ext==='.jpeg'?'image/jpeg':ext==='.png'?'image/png':'application/octet-stream';
  res.writeHead(200,{'content-type':type,'cache-control':'public,max-age=2592000,immutable'});fs.createReadStream(file).pipe(res);return true;
}
function injectPlanner(html){
  const safe=plannerJS.replace(/<\/script/gi,'<\\/script');
  return html.includes('</body>')?html.replace('</body>',`<script>${safe}</script></body>`):html;
}
function createServer(){
  return http.createServer((req,res)=>{let url;try{url=new URL(req.url,'http://localhost')}catch{res.writeHead(400);return res.end('Bad request')}
    if(serveStatic(url.pathname,res))return;
    if(url.pathname==='/client.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(clientJS)}
    if(url.pathname==='/health'){const coords=base.loadCoords();res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify({ok:true,version:VERSION,architecture:'single-runtime',parks:base.parks.length,collections:COLLECTIONS.length,features:['saved-parks','compare','critical-factors-compare','trip-collections','trip-day-planner','trip-stop-notes','trip-map','print-trip','static-map','guided-park-finder','curated-collections','practical-tags','methodology','trip-chooser-modal','direct-trip-add'],mapCoordinates:coords?Object.keys(coords.parks).length:0,clientScript:'repaired-in-canonical-runtime'}))}
    const out=renderPath(url);res.writeHead(out.status,{'content-type':'text/html; charset=utf-8'});res.end(out.status===200?injectPlanner(out.body):out.body);
  });
}
if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT} (single runtime)`));
module.exports={...base,VERSION,clientJS,plannerJS,renderPath,createServer,EXPERIENCE_RULES,PRACTICAL_RULES,COLLECTIONS,exp,practical,repairClientJS,injectPlanner};
