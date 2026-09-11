const fs=require('fs');
const path=require('path');
const zlib=require('zlib');

const source=path.join(__dirname,'park-coordinates.json');
const runtime=path.join(__dirname,'park-coordinates.generated.json');

if(!fs.existsSync(source))throw new Error('Checked-in park-coordinates.json is missing');
const data=JSON.parse(fs.readFileSync(source,'utf8'));
const parks=JSON.parse(zlib.gunzipSync(Buffer.from(require('./data1.js')+require('./data2.js')+require('./data3.js')+require('./data4.js'),'base64')).toString());

const records=Object.keys(data.parks||{});
if(data.count!==116||records.length!==116)throw new Error(`Static coordinate snapshot invalid: count=${data.count}, records=${records.length}`);
for(const [slug,c] of Object.entries(data.parks)){
  if(!Number.isFinite(c.lat)||!Number.isFinite(c.lng))throw new Error(`Invalid coordinate for ${slug}`);
}

const norm=s=>String(s||'').toLowerCase().replace(/state park/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const runtimeParks={...data.parks};
const missing=parks.filter(p=>!runtimeParks[p.slug]);
const remapped=[];
for(const p of missing){
  const target=norm(p.name);
  const candidates=Object.entries(data.parks).filter(([slug,c])=>!parks.some(x=>x.slug===slug)&&norm(c.sourceName)===target);
  if(candidates.length!==1){
    throw new Error(`Static coordinate slug mismatch for ${p.slug} (${p.name}); matching source-name candidates=${candidates.map(([s])=>s).join(',')||'none'}`);
  }
  const [oldSlug,coord]=candidates[0];
  delete runtimeParks[oldSlug];
  runtimeParks[p.slug]=coord;
  remapped.push(`${oldSlug}->${p.slug}`);
}

const stillMissing=parks.filter(p=>!runtimeParks[p.slug]);
const extras=Object.keys(runtimeParks).filter(slug=>!parks.some(p=>p.slug===slug));
if(stillMissing.length||extras.length||Object.keys(runtimeParks).length!==116){
  throw new Error(`Coordinate slug validation failed. missing=${stillMissing.map(p=>p.slug).join(',')||'none'} extras=${extras.join(',')||'none'} records=${Object.keys(runtimeParks).length}`);
}

const output={...data,count:116,parks:runtimeParks};
fs.writeFileSync(runtime,JSON.stringify(output,null,2));
console.log(`Static coordinates prepared: 116/116 canonical park slugs; no external GIS request required.${remapped.length?` Remapped ${remapped.join(', ')}`:''}`);
