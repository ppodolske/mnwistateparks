const fs=require('fs');const zlib=require('zlib');
const parks=JSON.parse(zlib.gunzipSync(Buffer.from(require('./data1.js')+require('./data2.js')+require('./data3.js')+require('./data4.js'),'base64')).toString());
const OUT='./park-coordinates.generated.json';
const MN_URL='https://enterprise.gisdata.mn.gov/aghost/rest/services/us_mn_state_dnr/bdry_dnr_lrs_prk/FeatureServer/0/query';
const WI_URL='https://dnrmaps.wi.gov/arcgis2/rest/services/PR_Recreation/PR_WSPS_Property_Info_WTM_Ext/MapServer/0/query';
function norm(s){return String(s||'').toLowerCase().normalize('NFKD').replace(/[’']/g,'').replace(/&/g,' and ').replace(/\bstate\s+(park|parks|recreation area|recreation areas|forest|forests|historical park)\b/g,' ').replace(/\bpark\b/g,' ').replace(/\bthe\b/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\bsaint\b/g,'st').replace(/\s+/g,' ').trim()}
const aliases={'father-hennepin':'father hennepin','grand-portage':'grand portage','john-a-latsch':'john a latsch','lake-louise':'lake louise','minneopa':'minneopa','old-mill':'old mill','st-croix':'st croix','interstate-mn':'interstate','interstate-wi':'interstate','devils-lake':'devils lake','governor-dodge':'governor dodge','heritage-hill':'heritage hill','new-glarus-woods':'new glarus woods','nelson-dewey':'nelson dewey','tower-hill':'tower hill','wyalusing':'wyalusing'};
function candidates(attrs){const out=[];for(const [k,v] of Object.entries(attrs||{})){if(typeof v==='string'&&v.trim()&&v.length<180)out.push({field:k,value:v,n:norm(v)})}return out}
function bestMatch(p,features){const target=aliases[p.slug]||norm(p.name);let best=null;for(const f of features){for(const c of candidates(f.attributes)){let score=0;if(c.n===target)score=100;else if(c.n.startsWith(target)||target.startsWith(c.n))score=85;else if(c.n.includes(target)||target.includes(c.n))score=75;else{const a=new Set(target.split(' ')),b=new Set(c.n.split(' '));const common=[...a].filter(x=>b.has(x)).length;score=Math.round(60*common/Math.max(a.size,b.size));}if(!best||score>best.score)best={score,feature:f,field:c.field,value:c.value,target}}}return best&&best.score>=70?best:null}
function largestRingCentroid(geom){if(!geom||!Array.isArray(geom.rings))return null;let best=null;for(const ring of geom.rings){if(!Array.isArray(ring)||ring.length<3)continue;let area2=0,cx=0,cy=0;for(let i=0;i<ring.length-1;i++){const [x1,y1]=ring[i],[x2,y2]=ring[i+1];const cross=x1*y2-x2*y1;area2+=cross;cx+=(x1+x2)*cross;cy+=(y1+y2)*cross;}if(Math.abs(area2)<1e-12)continue;const area=area2/2,c={lat:cy/(6*area),lng:cx/(6*area),weight:Math.abs(area)};if(!best||c.weight>best.weight)best=c;}return best?{lat:best.lat,lng:best.lng}:null}
async function query(url,params){const u=new URL(url);for(const [k,v] of Object.entries(params))u.searchParams.set(k,String(v));const r=await fetch(u,{headers:{'user-agent':'mn-wi-state-parks-coordinate-build/1.1'}});if(!r.ok)throw new Error(`GIS request failed ${r.status} ${u}`);const j=await r.json();if(j.error)throw new Error(`GIS error ${JSON.stringify(j.error)}`);return j.features||[]}
(async()=>{
 console.log('Coordinate build: fetching Minnesota DNR reference points…');
 const mn=await query(MN_URL,{where:'1=1',outFields:'*',returnGeometry:true,outSR:4326,f:'json'});
 console.log(`Coordinate build: Minnesota source features ${mn.length}`);
 console.log('Coordinate build: fetching Wisconsin DNR property names…');
 const wiAttrs=await query(WI_URL,{where:'1=1',outFields:'OBJECTID,PROP_NAME,PROP_TYPE',returnGeometry:false,f:'json'});
 console.log(`Coordinate build: Wisconsin source features ${wiAttrs.length}`);
 const matches=new Map(),unmatched=[];
 for(const p of parks){const src=p.state==='MN'?mn:wiAttrs,m=bestMatch(p,src);if(!m){unmatched.push({slug:p.slug,name:p.name,state:p.state});continue}matches.set(p.slug,m)}
 const wiIds=[...matches.entries()].filter(([slug])=>parks.find(p=>p.slug===slug)?.state==='WI').map(([,m])=>m.feature.attributes.OBJECTID).filter(Number.isFinite);
 console.log(`Coordinate build: fetching simplified geometry for ${wiIds.length} Wisconsin matches…`);
 const wiGeom=wiIds.length?await query(WI_URL,{objectIds:wiIds.join(','),outFields:'OBJECTID,PROP_NAME,PROP_TYPE',returnGeometry:true,outSR:4326,geometryPrecision:5,maxAllowableOffset:0.001,f:'json'}):[];
 const wiById=new Map(wiGeom.map(f=>[f.attributes.OBJECTID,f]));
 const out={};
 for(const p of parks){const m=matches.get(p.slug);if(!m)continue;let c=null,feature=m.feature;if(p.state==='MN'){const g=feature.geometry||{};c=Number.isFinite(g.y)&&Number.isFinite(g.x)?{lat:g.y,lng:g.x}:largestRingCentroid(g)}else{feature=wiById.get(m.feature.attributes.OBJECTID);c=largestRingCentroid(feature&&feature.geometry)}if(!c||!Number.isFinite(c.lat)||!Number.isFinite(c.lng)){unmatched.push({slug:p.slug,name:p.name,state:p.state,reason:'no geometry',matched:m.value});continue}out[p.slug]={lat:+c.lat.toFixed(6),lng:+c.lng.toFixed(6),source:p.state==='MN'?'Minnesota DNR':'Wisconsin DNR',sourceName:m.value,matchScore:m.score};}
 console.log(`Coordinate build: matched ${Object.keys(out).length}/${parks.length}`);
 if(unmatched.length){console.error('Coordinate build unmatched:',JSON.stringify(unmatched,null,2));throw new Error(`Coordinate build incomplete: ${Object.keys(out).length}/${parks.length}`)}
 fs.writeFileSync(OUT,JSON.stringify({generatedAt:new Date().toISOString(),count:parks.length,sources:{MN:MN_URL,WI:WI_URL},parks:out},null,2));
 console.log(`Coordinate build complete: ${parks.length}/${parks.length} written to ${OUT}`);
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
