const details=require('./park-details.js');
const site=require('./site.js');

const slugs=new Set(site.parks.map(p=>p.slug));
let bad=0;
for(const [slug,d] of Object.entries(details)){
  if(!slugs.has(slug)){console.error(`Unknown park slug in park-details.js: ${slug}`);bad++}
  for(const key of ['address','mapsQuery','source','sourceUrl','addressType'])if(!d[key]||typeof d[key]!=='string'){console.error(`${slug} missing ${key}`);bad++}
  if(d.sourceUrl&&!/^https:\/\//.test(d.sourceUrl)){console.error(`${slug} sourceUrl is not https`);bad++}
}
const covered=site.parks.filter(p=>details[p.slug]).length;
const missing=site.parks.filter(p=>!details[p.slug]).map(p=>p.slug);
if(bad)process.exit(1);
console.log(`Park reference audit passed: ${covered}/116 parks have sourced reference records.`);
if(missing.length)console.log(`Still to verify: ${missing.length} parks.`);
