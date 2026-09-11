const http=require('http');
const fs=require('fs');
const path=require('path');
const base=require('./collections-runtime.js');

const VERSION='1.6.0';
const PORT=process.env.PORT||3000;
const PUBLIC=path.join(__dirname,'public');
const IMAGE_DIR=path.join(PUBLIC,'images');

const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c));
const sourceText=p=>[p.review,p.pros,p.cons,p.criticalFactors].join(' ');
const tags=(p,rules)=>rules.filter(([,re])=>re.test(sourceText(p))).map(([name])=>name);
const practical=p=>tags(p,base.PRACTICAL_RULES||[]);

function replaceMain(html,main,title){
  const start=html.indexOf('<main');
  const end=html.lastIndexOf('</main>');
  if(start<0||end<0)return html;
  let out=html.slice(0,start)+main+html.slice(end+7);
  if(title)out=out.replace(/<title>[^<]*<\/title>/,`<title>${esc(title)}</title>`);
  return out;
}

function enrichParkPage(html,p){
  const practicalTags=practical(p);
  if(!practicalTags.length)return html;
  const block=`<div class="practical-block" style="margin-top:18px"><div class="field-label">PRACTICAL NOTES FROM THE REVIEW</div><div class="tag-list">${practicalTags.map(x=>`<a class="tag-pill" href="/parks?practical=${encodeURIComponent(x)}">${esc(x)}</a>`).join('')}</div></div>`;
  const marker='</article><aside>';
  return html.includes(marker)?html.replace(marker,`${block}</article><aside>`):html;
}

function enrichCompare(html,url){
  const chosen=(url.searchParams.get('parks')||'').split(',').map(s=>base.parks.find(p=>p.slug===s)).filter(Boolean).slice(0,3);
  if(chosen.length<2||html.includes('<th>Critical factors</th>'))return html;
  const cells=chosen.map(p=>`<td>${esc(p.criticalFactors||'—')}</td>`).join('');
  return html.replace('</tbody>',`<tr><th>Critical factors</th>${cells}</tr></tbody>`);
}

function aboutPage(){
  const shell=base.renderPath(new URL('/about','http://localhost')).body;
  const main=`<main class="narrow"><section class="page-intro"><div class="kicker blue">ABOUT THE PROJECT</div><h1>Every designated state park in Minnesota and Wisconsin.</h1><p>This site is the web version of a completed 116-park review project: 66 Minnesota state parks and 50 Wisconsin state parks, all personally visited.</p></section><section class="section"><div class="review-grid"><article><div class="kicker blue">HOW THE REVIEWS WORK</div><h2>First-hand, not comprehensive field guides.</h2><p>Most visits took place between April and October, usually in fair weather, and many visits were a few hours rather than multi-day stays. The reviews describe the experience actually had on those visits rather than trying to catalogue every trail, campsite, or facility.</p><p>The project covers designated state parks only. It does not attempt to include state forests, recreation areas, natural areas, or national lands.</p></article><aside><div class="fact good"><b>ORIGINAL FIELDS</b><span>Review text</span><span>Pros</span><span>Cons</span><span>Critical Factors</span><span>Ideal Trip</span><span>Pine rating</span></div><div class="fact critical"><b>DERIVED ON THIS SITE</b><p>Experience and practical tags are generated from the original review text to make the project easier to browse. They are navigation aids, not rewritten reviews.</p></div></aside></div></section><section class="section"><div class="kicker blue">THE PINE RATING</div><h2>Not a leaderboard.</h2><p>The pine score is meant to reflect how well a park delivers the experience it offers. A lower-rated small or specialized park is not automatically “worse” than a large destination park. That is why the site emphasizes trip fit, Ideal Trip, collections, and the original review instead of a single ranked list.</p></section><section class="section"><div class="kicker blue">IDEAL TRIP</div><h2>Three ways the booklet framed a visit.</h2><div class="project-stats"><div class="project-stat"><strong>Weekend</strong><span>Worth building a destination trip around</span></div><div class="project-stat"><strong>Day Trip</strong><span>Strong standalone visit without needing a full weekend</span></div><div class="project-stat"><strong>On the Way</strong><span>Best as a stop, add-on, or part of a larger route</span></div></div></section><section class="section"><div class="empty-state"><h3>Current conditions can change.</h3><p>The reviews are historical first-hand impressions. Closures, reservations, ferries, facilities, water access, and other operating details should be checked with the relevant state DNR before a trip.</p></div></section></main>`;
  return replaceMain(shell,main,'About the Project | MN & WI State Parks');
}

function projectPage(html){
  if(html.includes('HOW TO READ THE SITE'))return html;
  const insert=`<section class="section"><div class="kicker blue">HOW TO READ THE SITE</div><h2>Original review vs. derived navigation.</h2><p>The review, Pros, Cons, Critical Factors, Ideal Trip, and pine rating come from the original project. Experience and practical tags are derived from that text to support search, filtering, the map, the park finder, and collections.</p><p class="source-note">Derived tags are intentionally kept separate from the original review fields.</p></section>`;
  return html.replace('</main>',`${insert}</main>`);
}

function renderPath(url){
  if(url.pathname==='/about')return{status:200,body:aboutPage()};
  const out=base.renderPath(url);
  if(out.status!==200)return out;
  const parkMatch=url.pathname.match(/^\/parks\/([^/]+)\/?$/);
  if(parkMatch){
    const p=base.parks.find(x=>x.slug===parkMatch[1]);
    if(p)out.body=enrichParkPage(out.body,p);
  }
  if(url.pathname==='/compare')out.body=enrichCompare(out.body,url);
  if(url.pathname==='/project')out.body=projectPage(out.body);
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

function createServer(){return http.createServer((req,res)=>{let url;try{url=new URL(req.url,'http://localhost')}catch{res.writeHead(400);return res.end('Bad request')}if(serveStatic(url.pathname,res))return;if(url.pathname==='/client.js'){res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});return res.end(base.clientJS)}if(url.pathname==='/health'){const coords=base.loadCoords();res.writeHead(200,{'content-type':'application/json'});return res.end(JSON.stringify({ok:true,version:VERSION,parks:base.parks.length,collections:base.COLLECTIONS.length,features:['saved-parks','compare','critical-factors-compare','trip-collections','trip-day-planner','trip-stop-notes','trip-map','print-trip','static-map','guided-park-finder','curated-collections','practical-tags','methodology'],mapCoordinates:coords?Object.keys(coords.parks).length:0}))}const out=renderPath(url);res.writeHead(out.status,{'content-type':'text/html; charset=utf-8'});res.end(out.body)})}

if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT}`));
module.exports={...base,VERSION,renderPath,createServer,practical};
