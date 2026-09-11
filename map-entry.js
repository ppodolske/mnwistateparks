const http = require('http');
const zlib = require('zlib');
const parks = JSON.parse(zlib.gunzipSync(Buffer.from(require('./data1.js')+require('./data2.js')+require('./data3.js')+require('./data4.js'),'base64')).toString());
const originalCreateServer = http.createServer;

const esc = s => String(s ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] || c));
const EXPERIENCE_RULES = [
  ['Waterfalls', /waterfall|falls/], ['Lakes', /\blake\b|\blakes\b|lake superior|lake michigan|mille lacs/], ['Rivers', /\briver\b|\brivers\b|mississippi|st\. croix/], ['Beaches', /\bbeach\b|\bbeaches\b|swimming pond/],
  ['Bridges', /\bbridge\b|\bbridges\b|suspension bridge/], ['Camping', /campground|campsite|camping|cart-in|walk-in|walk-to|hike-in|teepee/], ['Private campsites', /private site|private campsite|privacy.*site|sites.*privacy/],
  ['Hammocking', /hammock/], ['History', /history|historical|ccc|interpretive|mound|lighthouse/], ['Lookout towers', /lookout tower|tower/], ['Boardwalks', /boardwalk/], ['Dark sky', /dark sky|night sky|stargaz/],
  ['Wildlife', /loon|bear|bison|wildlife|deer|bird/], ['Scenic views', /scenic|scenery|views|overlook|sunset|sunrise|foliage/], ['Prairie', /prairie/], ['Rock formations', /rock face|rock faces|bluff|mound|cave|geology|natural bridge/]
];
const sourceText = p => [p.review,p.pros,p.cons,p.criticalFactors].join(' ').toLowerCase();
const tagsFor = p => EXPERIENCE_RULES.filter(([,re])=>re.test(sourceText(p))).map(([name])=>name);
const wikiTitle = p => {
  const overrides = {
    'interstate-mn':'Interstate State Park (Minnesota)',
    'interstate-wi':'Interstate State Park (Wisconsin)'
  };
  return overrides[p.slug] || p.name;
};

function mapPage(){
  const payload = parks.map(p => ({slug:p.slug,name:p.name,city:p.city,state:p.state,idealTrip:p.idealTrip,rating:p.rating,image:p.image,tags:tagsFor(p),wikiTitle:wikiTitle(p)}));
  const tags = EXPERIENCE_RULES.map(([n])=>n);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Park Map | MN & WI State Parks</title><meta name="description" content="Interactive map of all 116 state parks reviewed across Minnesota and Wisconsin."><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>
  :root{--blue:#00558a;--deep:#032f4f;--cream:#f4f1e9;--ink:#15212b;--muted:#667681;--line:#d8e0e5}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:var(--ink);background:#fff}.site-header{height:78px;display:flex;align-items:center;justify-content:space-between;padding:0 max(18px,calc((100vw - 1180px)/2));border-bottom:1px solid var(--line)}.brand{font-weight:900;color:var(--blue);font-size:23px;text-decoration:none}.brand span{display:block;font-size:10px;letter-spacing:.22em;margin-top:-4px}.site-header nav{display:flex;gap:25px}.site-header nav a{text-decoration:none;color:inherit;font-size:12px;text-transform:uppercase;font-weight:800;letter-spacing:.1em}.map-shell{display:grid;grid-template-columns:350px 1fr;height:calc(100vh - 78px)}.map-side{border-right:1px solid var(--line);overflow:auto;background:#fff}.map-side-head{padding:28px 24px 18px}.kicker{font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--blue);margin-bottom:8px}.map-side h1{font-size:38px;line-height:1;margin:0 0 10px}.map-side p{margin:0;color:var(--muted);font-size:14px}.filters{padding:18px 24px;background:var(--cream);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.filters label{display:block;margin-bottom:12px}.filters label span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:var(--muted);margin-bottom:5px}.filters select{width:100%;height:40px;border:1px solid #c9d3d9;background:#fff;padding:0 9px}.count{padding:14px 24px;font-size:13px;color:var(--muted)}.count strong{font-size:22px;color:var(--blue)}.park-list{padding:0 14px 30px}.map-item{display:grid;grid-template-columns:64px 1fr;gap:11px;padding:10px;border-bottom:1px solid #edf1f3;cursor:pointer}.map-item:hover{background:#f7fafb}.map-item img{width:64px;height:52px;object-fit:cover;background:#dce8ef}.map-item b{display:block;font-size:14px;line-height:1.2}.map-item span{font-size:11px;color:var(--muted)}#map{width:100%;height:100%}.leaflet-popup-content{margin:12px 14px;min-width:210px}.popup img{width:100%;height:115px;object-fit:cover;margin-bottom:8px}.popup b{display:block;font-size:17px;line-height:1.1}.popup small{display:block;color:#64727c;margin:3px 0 8px}.popup a{color:var(--blue);font-weight:800;text-decoration:none}.loading{position:absolute;z-index:800;top:95px;left:50%;transform:translateX(-50%);background:#fff;border:1px solid var(--line);box-shadow:0 8px 28px rgba(0,0,0,.12);padding:10px 14px;font-size:12px}@media(max-width:800px){.site-header{padding:0 14px}.site-header nav{gap:12px}.map-shell{grid-template-columns:1fr;height:auto}.map-side{border-right:0;max-height:none}.map-side-head{padding:22px 16px 14px}.filters{padding:16px}.park-list{display:none}#map{height:65vh;min-height:470px}.count{padding:12px 16px}.map-side h1{font-size:32px}}
  </style></head><body><header class="site-header"><a class="brand" href="/">STATE PARKS.<span>MN & WI</span></a><nav><a href="/parks">Parks</a><a href="/explore">Explore</a><a href="/map">Map</a><a href="/about">About</a></nav></header><div class="map-shell"><aside class="map-side"><div class="map-side-head"><div class="kicker">GEOGRAPHY</div><h1>All 116 parks on a map.</h1><p>Filter the collection geographically, then open any park to read the original review.</p></div><div class="filters"><label><span>State</span><select id="state"><option value="">Both states</option><option value="MN">Minnesota</option><option value="WI">Wisconsin</option></select></label><label><span>Ideal trip</span><select id="trip"><option value="">Any trip</option><option>Weekend</option><option>Day trip</option><option>On the way</option></select></label><label><span>Experience</span><select id="tag"><option value="">Any experience</option>${tags.map(t=>`<option>${esc(t)}</option>`).join('')}</select></label></div><div class="count"><strong id="visible-count">0</strong> mapped parks visible <span id="mapped-note"></span></div><div id="park-list" class="park-list"></div></aside><main style="position:relative"><div id="loading" class="loading">Loading park locations…</div><div id="map"></div></main></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
const PARKS=${JSON.stringify(payload)};
const map=L.map('map',{zoomControl:true}).setView([45.7,-91.1],6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
const layer=L.layerGroup().addTo(map); let enriched=[];
function wikiBatches(items,size=45){const out=[];for(let i=0;i<items.length;i+=size)out.push(items.slice(i,i+size));return out}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function nominatimFallback(p){
  const cacheKey='parkcoord:'+p.slug;
  try{const cached=localStorage.getItem(cacheKey);if(cached)return JSON.parse(cached)}catch{}
  const stateName=p.state==='MN'?'Minnesota':'Wisconsin';
  const q=encodeURIComponent(p.name+', '+p.city+', '+stateName+', USA');
  try{
    const data=await fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&q='+q,{headers:{'Accept':'application/json'}}).then(r=>r.json());
    if(data&&data[0]){const c={lat:Number(data[0].lat),lng:Number(data[0].lon)};try{localStorage.setItem(cacheKey,JSON.stringify(c))}catch{};return c}
  }catch(e){}
  return null;
}
async function loadCoords(){
 const coords=new Map();
 for(const batch of wikiBatches(PARKS)){
   const titles=batch.map(p=>p.wikiTitle).join('|');
   const url='https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles='+encodeURIComponent(titles)+'&props=claims|sitelinks&format=json&origin=*';
   const data=await fetch(url).then(r=>r.json());
   for(const entity of Object.values(data.entities||{})){
     const title=entity.sitelinks&&entity.sitelinks.enwiki&&entity.sitelinks.enwiki.title;
     const claim=entity.claims&&entity.claims.P625&&entity.claims.P625[0];
     const v=claim&&claim.mainsnak&&claim.mainsnak.datavalue&&claim.mainsnak.datavalue.value;
     if(title&&v&&typeof v.latitude==='number')coords.set(title,{lat:v.latitude,lng:v.longitude});
   }
 }
 enriched=PARKS.map(p=>({...p,coord:coords.get(p.wikiTitle)||null}));
 let missing=enriched.filter(p=>!p.coord);
 if(missing.length){
   const loading=document.getElementById('loading');
   loading.textContent='Locating '+missing.length+' remaining parks…';
   for(const p of missing){
     const c=await nominatimFallback(p);
     if(c)p.coord=c;
     render();
     await sleep(1100);
   }
 }
 document.getElementById('loading').style.display='none';
 const mapped=enriched.filter(p=>p.coord).length; document.getElementById('mapped-note').textContent='of '+mapped+' located';
 render();
}
function popup(p){return '<div class="popup">'+(p.image?'<img src="'+p.image+'" alt="">':'')+'<b>'+p.name.replace(' State Park','')+'</b><small>'+p.city+', '+p.state+' · '+p.idealTrip+' · '+Number(p.rating).toFixed(1)+'/5</small><a href="/parks/'+p.slug+'">Read review →</a></div>'}
function render(){
 const s=document.getElementById('state').value,t=document.getElementById('trip').value,g=document.getElementById('tag').value;
 const visible=enriched.filter(p=>p.coord&&(!s||p.state===s)&&(!t||p.idealTrip===t)&&(!g||p.tags.includes(g)));
 layer.clearLayers(); const list=document.getElementById('park-list'); list.innerHTML='';
 const bounds=[];
 for(const p of visible){
   const m=L.circleMarker([p.coord.lat,p.coord.lng],{radius:7,weight:2,color:p.state==='MN'?'#00558a':'#47745b',fillColor:p.state==='MN'?'#00558a':'#47745b',fillOpacity:.82}).bindPopup(popup(p)); m.addTo(layer); bounds.push([p.coord.lat,p.coord.lng]);
   const el=document.createElement('div');el.className='map-item';el.innerHTML=(p.image?'<img src="'+p.image+'">':'<div></div>')+'<div><b>'+p.name.replace(' State Park','')+'</b><span>'+p.city+', '+p.state+' · '+p.idealTrip+'</span></div>';el.onclick=()=>{map.setView([p.coord.lat,p.coord.lng],10);m.openPopup()};list.appendChild(el);
 }
 document.getElementById('visible-count').textContent=visible.length;
 if(bounds.length>1)map.fitBounds(bounds,{padding:[25,25],maxZoom:8}); else if(bounds.length===1)map.setView(bounds[0],9); else map.setView([45.7,-91.1],6);
}
['state','trip','tag'].forEach(id=>document.getElementById(id).addEventListener('change',render));
loadCoords().catch(err=>{document.getElementById('loading').textContent='Map locations could not be loaded. Refresh to try again.';console.error(err)});
</script></body></html>`;
}

http.createServer = function(listener){
  return originalCreateServer.call(http,(req,res)=>{
    let url; try{url=new URL(req.url,'http://localhost')}catch{return listener(req,res)}
    if(url.pathname==='/map'){
      const html=mapPage(); res.writeHead(200,{'content-type':'text/html; charset=utf-8'}); return res.end(html);
    }
    const oldEnd=res.end.bind(res);
    res.end=(body,enc,cb)=>{
      const ct=String(res.getHeader('content-type')||'');
      if(ct.includes('text/html') && body!=null){
        const wasBuffer=Buffer.isBuffer(body);
        let html=wasBuffer?body.toString('utf8'):String(body);
        if(!html.includes('href="/map"')){
          html=html.replace('<a href="/explore">Explore</a><a href="/about">About</a>','<a href="/explore">Explore</a><a href="/map">Map</a><a href="/about">About</a>');
        }
        body=wasBuffer?Buffer.from(html,'utf8'):html;
      }
      return oldEnd(body,enc,cb);
    };
    return listener(req,res);
  });
};
require('./server.js');
