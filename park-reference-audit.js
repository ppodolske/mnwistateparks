const details={...require('./park-details.js'),...require('./park-details-extra.js')};
const links=require('./park-reference-links.js');
const site=require('./site.js');

const slugs=new Set(site.parks.map(p=>p.slug));
let bad=0;
for(const [slug,d] of Object.entries(details)){
  if(!slugs.has(slug)){console.error(`Unknown park slug in park reference data: ${slug}`);bad++}
  for(const key of ['address','mapsQuery','source','sourceUrl','addressType'])if(!d[key]||typeof d[key]!=='string'){console.error(`${slug} missing ${key}`);bad++}
  if(d.sourceUrl&&!/^https:\/\//.test(d.sourceUrl)){console.error(`${slug} sourceUrl is not https`);bad++}
  const ref=links.enrich(slug,d);
  if(!['MN','WI'].includes(ref.state)){console.error(`${slug} missing state-specific official link mapping`);bad++}
  for(const key of ['directionsUrl','officialUrl','mapUrl'])if(!ref[key]||!/^https:\/\//.test(ref[key])){console.error(`${slug} missing valid ${key}`);bad++}
  if(ref.state==='MN'&&!/dnr\.state\.mn\.us/.test(ref.officialUrl)){console.error(`${slug} officialUrl is not Minnesota DNR`);bad++}
  if(ref.state==='WI'&&!/dnr\.wisconsin\.gov/.test(ref.officialUrl)&&d.status!=='closed'){console.error(`${slug} officialUrl is not Wisconsin DNR`);bad++}
}
const covered=site.parks.filter(p=>details[p.slug]).length;
const linked=site.parks.filter(p=>links.stateFor(p.slug)).length;
const missing=site.parks.filter(p=>!details[p.slug]).map(p=>p.slug);
if(missing.length){console.error(`Missing sourced reference records: ${missing.join(', ')}`);bad++}
if(covered!==116){console.error(`Expected 116 park reference records, found ${covered}`);bad++}
if(linked!==116){console.error(`Expected 116 state-specific official link mappings, found ${linked}`);bad++}
if(Object.keys(links.MN_IDS).length!==66){console.error(`Expected 66 Minnesota DNR identifiers, found ${Object.keys(links.MN_IDS).length}`);bad++}
if(Object.keys(links.WI_CODES).length!==50){console.error(`Expected 50 Wisconsin DNR identifiers, found ${Object.keys(links.WI_CODES).length}`);bad++}
if(bad)process.exit(1);
console.log('Park reference audit passed: 116/116 parks have sourced addresses plus official DNR page and map targets.');
