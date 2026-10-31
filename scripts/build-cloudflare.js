'use strict';
// Build-time only: preserve the accepted Node renderer; deploy static output to Cloudflare Pages.
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'dist');

async function main() {
  // The checked-in coordinates are canonical; generate the validated runtime snapshot before import.
  execFileSync(process.execPath, ['prepare-coordinates.js'], {cwd: root, stdio: 'inherit'});
  const site = require(path.join(root, 'site-v12213.js'));
  if (site.VERSION !== '1.22.13' || site.parks.length !== 116 || site.COLLECTIONS.length === 0) {
    throw new Error('STOP: Parks release/park-count/collections changed. Review export adapter before proceeding.');
  }
  fs.rmSync(out, {recursive: true, force: true});
  fs.mkdirSync(out, {recursive: true});
  fs.cpSync(path.join(root, 'public'), out, {recursive: true});
  fs.copyFileSync(path.join(__dirname, 'trip-pdf-native.js'), path.join(out, 'trip-pdf-native.js'));
  fs.copyFileSync(path.join(__dirname, 'atlas-print-reference.js'), path.join(out, 'atlas-print-reference.js'));
  for(const f of ['atlas-trip-experience-core.js','atlas-trip-experience.js','atlas-trip-experience.css','atlas-trip-mode-sw.js']) fs.copyFileSync(path.join(__dirname,f),path.join(out,f));
  fs.copyFileSync(path.join(__dirname, 'trip-timeline-model.js'), path.join(out, 'trip-timeline-model.js'));
  fs.copyFileSync(path.join(__dirname, 'trip-timeline-ui.js'), path.join(out, 'trip-timeline-ui.js'));
  fs.copyFileSync(path.join(__dirname, 'trip-timeline.css'), path.join(out, 'trip-timeline.css'));
  fs.copyFileSync(path.join(__dirname, 'atlas-account-ui.mjs'), path.join(out, 'atlas-account-ui.mjs'));
  fs.copyFileSync(path.join(__dirname, 'atlas-account.css'), path.join(out, 'atlas-account.css'));
  fs.copyFileSync(path.join(__dirname, 'atlas-sync-core.mjs'), path.join(out, 'atlas-sync-core.mjs'));
  fs.copyFileSync(path.join(__dirname, 'atlas-trip-sync.mjs'), path.join(out, 'atlas-trip-sync.mjs'));
  for(const f of ['atlas-trip-recovery.mjs','atlas-trip-recovery.css']) fs.copyFileSync(path.join(__dirname,f),path.join(out,f));
  for(const f of ['atlas-account-vault.js','atlas-saved-sync.mjs','atlas-stage4-ui.mjs','atlas-admin.mjs','atlas-admin.css'])
    fs.copyFileSync(path.join(__dirname,f),path.join(out,f));
  // The Firebase web configuration contains public identifiers, never a private key.
  // Absent configuration must leave all account UI disabled, not break the Parks site.
  const clientConfigPath=path.join(root, 'config', 'atlas-firebase-web.json');
  let authConfig={enabled:false};
  if(fs.existsSync(clientConfigPath)){
    const c=JSON.parse(fs.readFileSync(clientConfigPath,'utf8'));
    for(const key of ['apiKey','authDomain','projectId','appId']){
      if(typeof c[key]!=='string'||!c[key].trim()||c[key].includes('YOUR_')||c[key].includes('FIREBASE_WEB_'))
        throw new Error('STOP: Invalid Firebase web config: '+key);
    }
    authConfig={enabled:true,apiKey:c.apiKey,authDomain:c.authDomain,projectId:c.projectId,appId:c.appId};
  }
  fs.writeFileSync(path.join(out,'atlas-firebase-config.json'),JSON.stringify(authConfig));
  const server = site.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const get = async url => {
    const r = await fetch(origin + url, {redirect:'manual'});
    return {status:r.status, type:r.headers.get('content-type')||'', body:await r.text()};
  };
  const put = (pathname, content) => {
    const target = path.join(out, pathname.replace(/^\//, ''));
    fs.mkdirSync(path.dirname(target), {recursive:true});
    fs.writeFileSync(target, content);
  };
  const routes = ['/', '/parks', '/explore', '/map', '/project', '/saved', '/trip', '/compare', '/find', '/collections', '/about',
    ...site.parks.map(p => `/parks/${p.slug}`), ...site.COLLECTIONS.map(c => `/collections/${c.slug}`)];
  try {
    for (const url of routes) {
      const r = await get(url);
      if (r.status !== 200 || !r.type.includes('text/html')) throw new Error(`STOP: ${url}: ${r.status} ${r.type}`);
      let html = r.body;
      if (['/parks','/find','/compare','/trip'].includes(url)) {
        html = html.replace('</body>', '<script src="/cloudflare-query.js"></script></body>');
      }
      if (url === '/trip') {
        // The original Node wrapper used to inject the canonical day editor.
        // Some wrappers discard that injection in static snapshots. Explicitly
        // insert it after the legacy logistics script and BEFORE workspace cleanup,
        // which wraps the day editor and moves it into the itinerary section.
        const canonical = '<script src="/trip-day-editor.js" defer></script>';
        const cleanup = '<script src="/trip-workspace-cleanup.js" defer></script>';
        // Avoid duplicate script execution if the Node wrapper starts including it.
        html = html.replace(/<script\b[^>]*?\bsrc=["']\/trip-day-editor\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi, '');
        if (!html.includes(cleanup)) {
          throw new Error('STOP: Trip workspace cleanup anchor missing; day editor cannot be ordered safely');
        }
        html = html.replace(cleanup, canonical + cleanup);
        const positions = [
          html.indexOf('/trip-itinerary.js'),
          html.indexOf('/trip-logistics-fix.js'),
          html.indexOf('/trip-day-editor.js'),
          html.indexOf('/trip-workspace-cleanup.js')
        ];
        const refs = [...html.matchAll(/<script\b[^>]*?\bsrc=["']\/trip-day-editor\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi)];
        if (positions.some(p => p < 0) || positions.some((p, i) => i > 0 && p <= positions[i - 1]) || refs.length !== 1) {
          throw new Error('STOP: Canonical trip day editor missing, duplicated, or out of load order');
        }
        // Cloudflare-only: load the searchable text-PDF exporter after existing scripts.
        html = html.replace('</body>', '<link rel="stylesheet" href="/trip-timeline.css"><script src="/trip-timeline-model.js" defer></script><script src="/trip-timeline-ui.js" defer></script><script src="/atlas-print-reference.js" defer></script><script src="/trip-pdf-native.js" defer></script></body>');
      }
      // Only the trip page needs the explicit Stage 4.1 browser/cloud restoration controls.
      if(url === '/trip') html=html.replace('</body>', '<link rel="stylesheet" href="/atlas-trip-recovery.css"><script type="module" src="/atlas-trip-recovery.mjs"></script></body>');
      if(url === '/trip') html=html.replace('</body>', '<link rel="stylesheet" href="/atlas-trip-experience.css"><script src="/atlas-trip-experience-core.js" defer></script><script src="/atlas-trip-experience.js" defer></script></body>');
      // Optional Accounts shell: does nothing until a local public Firebase config is supplied.
      if(!html.includes('</head>'))throw Error('STOP: missing HTML head; cannot install account isolation guard');
      html=html.replace('</head>', '<script src="/atlas-account-vault.js"></script></head>');
      html=html.replace('</body>', '<link rel="stylesheet" href="/atlas-account.css"><link rel="stylesheet" href="/atlas-admin.css"><script type="module" src="/atlas-account-ui.mjs"></script><script type="module" src="/atlas-trip-sync.mjs"></script><script type="module" src="/atlas-saved-sync.mjs"></script><script type="module" src="/atlas-stage4-ui.mjs"></script></body>');
      if (!html.includes('</html>')) throw new Error(`STOP: Invalid HTML at ${url}`);
      put(url === '/' ? 'index.html' : `${url.slice(1)}/index.html`, html);
    }
    // Admin lives at /admin and preserves the canonical Parks header and navigation.
    const about=fs.readFileSync(path.join(out,'about','index.html'),'utf8');
    const main='<main class="ad-page"><section class="ad-head"><div><div class="ad-kicker">ATLAS / ADMINISTRATION</div><h1>Accounts overview</h1><p class="ad-lede">Private, aggregate-only usage statistics. No names, emails, or trip details.</p></div><button type="button" id="atlasAdminRefresh" class="ad-action">Refresh statistics</button></section><div id="atlasAdminRoot" aria-live="polite">Sign in with your administrator account to view this dashboard.</div></main>';
    const matches=about.match(/<main\b[^>]*>[\s\S]*?<\/main>/gi)||[];
    if(matches.length!==1)throw Error('STOP: Admin page shell changed; expected one main element');
    let adminHtml=about.replace(matches[0],main).replace(/<title>[^<]*<\/title>/i,'<title>Administration | Atlas Parks</title>');
    adminHtml=adminHtml.replace('</body>','<script type="module" src="/atlas-admin.mjs"></script></body>');
    put('admin/index.html',adminHtml);
    // Trip Mode is intentionally self-contained: cached shell contains no trip data.
    put('tripmode/index.html',fs.readFileSync(path.join(__dirname,'atlas-trip-mode-page.html'),'utf8'));
    // Capture script URLs from generated HTML as well as declared server source files.
    // /client.js is dynamically generated and does NOT exist as a file on disk.
    const requiredScripts = new Set();
    const htmlFiles = [...routes.map(url => path.join(out, url === '/' ? 'index.html' : url.slice(1) + '/index.html')),path.join(out,'admin','index.html')];
    for (const file of htmlFiles) {
      const html = fs.readFileSync(file, 'utf8');
      for (const match of html.matchAll(/<script\b[^>]*?\bsrc=[\"'](\/[^\"']+)[\"']/gi)) {
        const script = match[1].split(/[?#]/)[0];
        if (script.endsWith('.js') && script !== '/cloudflare-query.js' && !fs.existsSync(path.join(out, script.slice(1)))) requiredScripts.add(script);
      }
    }
    const optionalScripts = fs.readdirSync(root).filter(x => x.endsWith('.js') && x !== 'cloudflare-query.js').map(x => '/' + x);
    let scriptCount = 0;
    for (const script of new Set([...requiredScripts, ...optionalScripts])) {
      const r = await get(script);
      if (r.status === 200 && /(?:javascript|ecmascript)/i.test(r.type)) {
        put(script, r.body);
        scriptCount++;
      } else if (requiredScripts.has(script)) {
        throw new Error(`STOP: Referenced JavaScript asset not exported: ${script}, HTTP ${r.status} ${r.type}`);
      }
    }
    const coord = await get('/park-coordinates.json');
    if (coord.status !== 200 || !coord.type.includes('json')) throw new Error('STOP: validated park coordinates unavailable');
    put('park-coordinates.json', coord.body);
    fs.copyFileSync(path.join(root, 'park-favicon.svg'), path.join(out, 'park-favicon.svg'));
    const index = site.parks.map(p => ({
      slug:p.slug, name:p.name, city:p.city, state:p.state, image:p.image,
      idealTrip:p.idealTrip, rating:p.rating, review:p.review, pros:p.pros,
      cons:p.cons, criticalFactors:p.criticalFactors,
      experience:site.exp(p), practical:site.practical(p)
    }));
    if (index.some(p => !Array.isArray(p.experience) || !Array.isArray(p.practical))) throw new Error('STOP: Missing filter metadata');
    put('cloudflare-parks.json', JSON.stringify(index));
    fs.copyFileSync(path.join(__dirname, 'cloudflare-query.js'), path.join(out, 'cloudflare-query.js'));
    put('_headers', '/*.html\n  Cache-Control: no-cache\n');
    const candidates = [...routes.map(url => path.join(out, url === '/' ? 'index.html' : url.slice(1) + '/index.html')),path.join(out,'admin','index.html')];
    const missing = new Set();
    for (const file of candidates) {
      const html = fs.readFileSync(file, 'utf8');
      const assetRe = /<(?:script|link)\b[^>]*?\b(?:src|href)=[\"'](\/[^\"']+)[\"']/gi;
      for (const match of html.matchAll(assetRe)) {
        const asset = match[1].split(/[?#]/)[0];
        if (!/\.(?:js|mjs|css|svg)$/.test(asset)) continue;
        if (!fs.existsSync(path.join(out, asset.slice(1)))) missing.add(asset);
      }
    }
    if (missing.size) throw new Error('STOP: Missing assets: ' + [...missing].join(', '));
    const r404 = await get('/nonexistent-cloudflare-build-check');
    if (r404.status === 404 && r404.type.includes('text/html')) put('404.html', r404.body);
    console.log(`PASS: Cloudflare static build: ${routes.length} pages, ${scriptCount} dynamic JS assets, ${index.length} park records.`);
    console.log(`Output: ${out}`);
  } finally { await new Promise(resolve => server.close(resolve)); }
}
main().catch(err => {console.error(err.stack||err);process.exitCode=1;});
