const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 3000;
const APP = __dirname;
const PUBLIC = path.join(APP, 'public');
const IMAGE_DIR = path.join(PUBLIC, 'images');
const PARK_IMAGE_DIR = path.join(IMAGE_DIR, 'parks');
const VERSION = '0.6.0';
const zlib = require('zlib');
const parks = JSON.parse(zlib.gunzipSync(Buffer.from(require('./data1.js')+require('./data2.js')+require('./data3.js')+require('./data4.js'),'base64')).toString());
const css = require('./styles-v060.js');
const esc = s => String(s ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] || c));
const splitTags = value => String(value || '').split(',').map(s => s.trim()).filter(Boolean);
const pine = rating => {
  const whole = Math.floor(Number(rating) || 0);
  const half = Number(rating) % 1 ? '<span class="half-pine">▲</span>' : '';
  return `<span class="pines" aria-label="${Number(rating).toFixed(1)} out of 5 pine trees">${'▲'.repeat(whole)}${half}</span><span class="rating-number">${Number(rating).toFixed(1)}</span>`;
};
const hasImage = p => Boolean(p && p.image && fs.existsSync(path.join(PUBLIC, p.image.replace(/^\//,''))));
const imageUrl = p => hasImage(p) ? p.image : null;

function layout(title, body, desc = 'First-hand reviews of all 116 designated state parks in Minnesota and Wisconsin.') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#00558a"><title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><style>${css}</style></head><body><header class="site-header"><a class="brand" href="/">STATE PARKS.<span>MN & WI</span></a><nav><a href="/parks">Parks</a><a href="/about">About</a></nav></header>${body}<footer class="site-footer"><strong>STATE PARKS.</strong><span>116 parks. Two states. Every one visited.</span><small>Personal reviews — check official DNR sources for current conditions.</small></footer></body></html>`;
}

function imageBlock(p, className='card-photo') {
  const src = imageUrl(p);
  if (src) return `<div class="${className}"><img src="${esc(src)}" alt="${esc(p.name)}" loading="lazy"></div>`;
  return `<div class="${className} placeholder"><span>${esc(p.state)}</span></div>`;
}

function card(p) {
  return `<a class="park-card" href="/parks/${p.slug}">${imageBlock(p)}<div class="card-body"><div class="eyebrow">${esc(p.city)}, ${esc(p.state)}</div><h3>${esc(p.name.replace(' State Park',''))}</h3><div class="rating">${pine(p.rating)}</div><div class="trip">${esc(p.idealTrip)}</div></div></a>`;
}

function home() {
  const featured = ['tettegouche','copper-falls','bear-head-lake'].map(s => parks.find(p => p.slug === s)).filter(Boolean);
  const cover = fs.existsSync(path.join(IMAGE_DIR,'booklet-cover.jpg')) ? '/images/booklet-cover.jpg' : null;
  const hero = featured.find(hasImage) || parks.find(hasImage);
  const heroStyle = hero ? ` style="--hero:url('${esc(hero.image)}')"` : '';
  return layout('State Parks — Minnesota & Wisconsin', `<main><section class="hero"${heroStyle}><div class="hero-wash"></div><div class="hero-content"><div class="kicker">A COMPLETED PARK PROJECT</div><h1>116 parks.<br>Two states.<br><em>Every one visited.</em></h1><p>Candid, first-hand reviews of every designated state park in Minnesota and Wisconsin.</p><div class="actions"><a class="button light" href="/parks">Explore all parks</a><a class="button ghost" href="/about">About the project</a></div></div><div class="hero-count"><strong>116</strong><span>STATE PARKS</span><div><b>66</b> Minnesota</div><div><b>50</b> Wisconsin</div></div></section><section class="stat-band"><div><strong>66</strong><span>Minnesota</span></div><div><strong>50</strong><span>Wisconsin</span></div><div><strong>100%</strong><span>Project complete</span></div></section><section class="section intro"><div><div class="kicker blue">THE REVIEWS</div><h2>What is each park actually like?</h2></div><p>These are practical impressions from actually visiting the parks. The pine rating measures how well each park delivers what it offers—not how many attractions it has—so it is not intended as a league table.</p></section><section class="trip-band"><div class="section"><div class="kicker">FIND YOUR TRIP</div><div class="trip-grid"><a href="/parks?trip=Weekend"><b>Weekend</b><span>Make a trip of it.</span></a><a href="/parks?trip=Day%20trip"><b>Day Trip</b><span>Worth a dedicated visit.</span></a><a href="/parks?trip=On%20the%20way"><b>On the Way</b><span>Stop when your route passes by.</span></a></div></div></section><section class="section"><div class="section-head"><div><div class="kicker blue">A FEW FAVORITES</div><h2>Featured parks.</h2></div><a href="/parks">See all 116 →</a></div><div class="cards">${featured.map(card).join('')}</div></section><section class="section booklet"><div class="book-cover">${cover ? `<img src="${cover}" alt="Original State Parks MN & WI booklet cover">` : '<div class="cover-placeholder">STATE PARKS.<br><small>MN & WI</small></div>'}</div><div><div class="kicker blue">THE ORIGINAL PROJECT</div><h2>From a booklet to a living guide.</h2><p>The reviews were originally compiled into a 32-page booklet after completing every designated state park in both states. This site preserves that project while making the collection easier to browse and use.</p><a class="button blue" href="/about">Read the methodology</a></div></section></main>`);
}

function parksPage(url) {
  const state = url.searchParams.get('state') || '';
  const trip = url.searchParams.get('trip') || '';
  const qRaw = url.searchParams.get('q') || '';
  const q = qRaw.toLowerCase();
  const list = parks.filter(p => (!state || p.state === state) && (!trip || p.idealTrip.toLowerCase() === trip.toLowerCase()) && (!q || [p.name,p.city,p.state,p.review,p.pros,p.cons,p.criticalFactors].join(' ').toLowerCase().includes(q)));
  return layout('Explore Parks — MN & WI State Parks', `<main class="narrow"><section class="page-intro"><div class="kicker blue">EXPLORE</div><h1>All 116 parks.</h1><p>Search the complete Minnesota and Wisconsin collection from the original project.</p></section><form class="filters" method="get"><label><span>Search</span><input name="q" value="${esc(qRaw)}" placeholder="Waterfalls, camping, bridge..."></label><label><span>State</span><select name="state"><option value="">Both states</option><option value="MN" ${state==='MN'?'selected':''}>Minnesota</option><option value="WI" ${state==='WI'?'selected':''}>Wisconsin</option></select></label><label><span>Ideal trip</span><select name="trip"><option value="">Any trip</option>${['Weekend','Day trip','On the way'].map(x => `<option value="${esc(x)}" ${trip.toLowerCase()===x.toLowerCase()?'selected':''}>${esc(x)}</option>`).join('')}</select></label><button class="button blue">Filter</button></form><div class="results-row"><strong>${list.length}</strong> parks${(state||trip||q) ? ' match your filters' : ''}${(state||trip||q) ? '<a href="/parks">Clear filters</a>' : ''}</div><div class="cards browse-cards">${list.map(card).join('')}</div></main>`);
}

function parkPage(p) {
  if (!p) return null;
  const idx = parks.findIndex(x => x.slug === p.slug);
  const prev = idx > 0 ? parks[idx-1] : null;
  const next = idx < parks.length-1 ? parks[idx+1] : null;
  const src = imageUrl(p);
  return layout(`${p.name} Review | MN & WI State Parks`, `<main class="park-page"><section class="park-hero ${src?'with-photo':'without-photo'}"${src?` style="--park-photo:url('${esc(src)}')"`:''}><div class="park-hero-shade"></div><div class="park-hero-copy"><a href="/parks" class="back">← All parks</a><div class="eyebrow light">${esc(p.city)}, ${esc(p.state)}</div><h1>${esc(p.name.replace(' State Park',''))}</h1><div class="rating large">${pine(p.rating)}</div><div class="trip-pill">Ideal Trip · ${esc(p.idealTrip)}</div></div></section><section class="review-grid"><article><div class="kicker blue">THE REVIEW</div><h2>My take</h2><p class="review">${esc(p.review)}</p><p class="source-note">Original booklet entry · page ${p.sourcePage}</p><div class="timing-note"><strong>Before you go</strong><p>This review reflects the original visit. Hours, closures, facilities, trails and other conditions can change, so check the relevant state DNR before visiting.</p></div></article><aside><div class="fact good"><b>THE GOOD</b>${splitTags(p.pros).map(x=>`<span>${esc(x)}</span>`).join('')}</div><div class="fact watch"><b>WATCH OUT FOR</b>${splitTags(p.cons).map(x=>`<span>${esc(x)}</span>`).join('')}</div><div class="fact critical"><b>CRITICAL FACTORS</b><p>${esc(p.criticalFactors)}</p></div><div class="fact meta"><b>PINE RATING</b><div class="rating">${pine(p.rating)}</div><small>Measures the quality of what this park offers, not its rank against other parks.</small></div></aside></section><nav class="park-nav">${prev?`<a href="/parks/${prev.slug}"><span>← Previous</span><strong>${esc(prev.name.replace(' State Park',''))}</strong></a>`:'<span></span>'}${next?`<a class="next" href="/parks/${next.slug}"><span>Next →</span><strong>${esc(next.name.replace(' State Park',''))}</strong></a>`:''}</nav></main>`, p.review);
}

function about() {
  const cover = fs.existsSync(path.join(IMAGE_DIR,'booklet-cover.jpg')) ? '/images/booklet-cover.jpg' : null;
  return layout('About the Project | MN & WI State Parks', `<main class="narrow"><section class="page-intro about-hero"><div><div class="kicker blue">THE PROJECT</div><h1>Every designated state park in Minnesota and Wisconsin.</h1><p>This site grew out of a completed personal project and the review booklet that followed it.</p></div>${cover?`<img src="${cover}" alt="Original State Parks MN & WI booklet cover">`:''}</section><section class="prose"><h2>About the reviews</h2><p>The reviews are candid impressions from actual visits, generally between April and October, usually in fair weather and often for only a few hours. They were written as practical advice for someone considering a visit—not as official park guides.</p><h2>The pine ratings</h2><p>Each park is rated up to five pine trees, with half-pine increments. The ratings are not intended as a ranking between parks; they reflect the quality and experience of what each individual park has to offer.</p><h2>Ideal Trip</h2><p><b>Weekend</b> means the park has enough to justify spending substantial time there. <b>Day trip</b> means it is worth a dedicated visit when reasonably nearby. <b>On the way</b> means it is a worthwhile stop when passing through.</p><h2>Scope</h2><p>The original project covers designated state parks in Minnesota and Wisconsin, not state forests, recreation areas, natural areas, national parks or other public lands.</p></section></main>`);
}

function serveStatic(urlPath, res) {
  if (!urlPath.startsWith('/images/')) return false;
  const file = path.normalize(path.join(PUBLIC, urlPath.replace(/^\//,'')));
  if (!file.startsWith(IMAGE_DIR)) return false;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  const ext = path.extname(file).toLowerCase();
  const type = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'application/octet-stream';
  res.writeHead(200, {'content-type':type,'cache-control':'public, max-age=2592000, immutable'});
  fs.createReadStream(file).pipe(res);
  return true;
}

http.createServer((req,res) => {
  let url; try { url = new URL(req.url, 'http://localhost'); } catch { res.writeHead(400); return res.end('Bad request'); }
  if (serveStatic(url.pathname,res)) return;
  if (url.pathname === '/health') {
    const images = parks.filter(hasImage).length;
    res.writeHead(200, {'content-type':'application/json'});
    return res.end(JSON.stringify({ok:true,version:VERSION,parks:parks.length,parkImages:images,bookletCover:fs.existsSync(path.join(IMAGE_DIR,'booklet-cover.jpg'))}));
  }
  let out, status=200;
  if (url.pathname === '/') out = home();
  else if (url.pathname === '/parks') out = parksPage(url);
  else if (url.pathname === '/about') out = about();
  else if (url.pathname.startsWith('/parks/')) out = parkPage(parks.find(p => p.slug === url.pathname.split('/')[2]));
  if (!out) { status=404; out=layout('Not found','<main class="narrow"><section class="page-intro"><h1>Park not found.</h1><p><a href="/parks">Browse all parks</a></p></section></main>'); }
  res.writeHead(status, {'content-type':'text/html; charset=utf-8'}); res.end(out);
}).listen(PORT, '0.0.0.0', () => console.log(`State Parks v${VERSION} on ${PORT}`));
