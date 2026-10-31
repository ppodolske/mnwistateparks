import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const inventory=JSON.parse(fs.readFileSync(new URL('./atlas-dnr-park-inventory.json',import.meta.url),'utf8'));
const mn=JSON.parse(fs.readFileSync(new URL('./atlas-mn-official-reservation-facilities.json',import.meta.url),'utf8'));
const catalog=require('./atlas-campsite-catalog.js');
test('all Atlas parks accounted for, Minnesota reservation feed mapped exactly',()=>{
 assert.equal(inventory.parks.length,116);
 const m=inventory.parks.filter(p=>p.state==='MN'),w=inventory.parks.filter(p=>p.state==='WI');
 assert.equal(m.length,66);assert.equal(w.length,50);
 assert.equal(Object.keys(mn.parks).length,66);
 assert(m.every(p=>Object.hasOwn(mn.parks,p.slug)),'all Minnesota parks have an explicit facility-data status');
});
test('Minnesota reservation facility names load in browser into park-level picker',()=>{
 const window={};
 const js=fs.readFileSync(new URL('./atlas-mn-reservation-facilities.js',import.meta.url),'utf8');
 vm.runInNewContext(js,{window});
 assert.equal(Object.keys(window.AtlasMNReservationFacilities).length,66);
 const source=fs.readFileSync(new URL('./atlas-campsite-catalog.js',import.meta.url),'utf8');
 vm.runInNewContext(source,{window,module:{exports:{}}});
 const a=window.AtlasCampsiteCatalog;
 const list=a.suggestions('Lake Carlos State Park','','','lake-carlos');
 assert(list.campgrounds.includes('Upper Campground'));
 assert(list.campgrounds.includes('Lower Campground'));
 assert.deepEqual(JSON.stringify(list.sites),JSON.stringify([]));
 const none=a.suggestions('Unnamed Park','','','missing');
 assert.equal(none.campgrounds.length,0);
});
test('scripts and static build order preserve existing data sources',()=>{
 const b=fs.readFileSync(new URL('./build-cloudflare.js',import.meta.url),'utf8');
 const ui=fs.readFileSync(new URL('./atlas-trip-experience.js',import.meta.url),'utf8');
 assert(b.includes("fs.copyFileSync(path.join(__dirname, 'atlas-mn-reservation-facilities.js')"));
 assert(b.indexOf('/atlas-mn-reservation-facilities.js') < b.indexOf('/atlas-campsite-catalog.js'));
 assert(ui.includes('catalog.suggestions(parkName,cg,loop,slug)'));
 assert(ui.includes("type=\"'+attr(type)+'\""));
});

test('all 50 Wisconsin parks have sourced status and no synthetic site numbers',()=>{
 const wi=JSON.parse(fs.readFileSync(new URL('./atlas-wi-camping-status.json',import.meta.url),'utf8'));
 assert.equal(wi.parks.length,50);
 const all=inventory.parks.filter(x=>x.state==='WI');
 assert.equal(new Set(wi.parks.map(x=>x.slug)).size,50);
 assert(all.every(p=>wi.parks.some(w=>w.slug===p.slug)));
 assert(wi.parks.filter(p=>p.status==='camping_reference_in_catalog').length===37);
 assert(wi.parks.filter(p=>p.status!=='camping_reference_in_catalog').length===13);
 const window={};
 vm.runInNewContext(fs.readFileSync(new URL('./atlas-wi-park-status.js',import.meta.url),'utf8'),{window});
 assert.equal(Object.keys(window.AtlasWIParkStatus).length,50);
 vm.runInNewContext(fs.readFileSync(new URL('./atlas-campsite-catalog.js',import.meta.url),'utf8'),{window,module:{exports:{}}});
 const c=window.AtlasCampsiteCatalog;
 const day=c.suggestions('Whitefish Dunes State Park','','','whitefish-dunes');
 assert.equal(day.sourceStatus,'day_use');
 assert.equal(day.sites.length,0);
 assert(day.source.startsWith('https://dnr.wisconsin.gov/'));
});

test('116-park coverage report explicitly flags incomplete site identifiers',()=>{
 const csv=fs.readFileSync(new URL('./atlas-dnr-coverage-report.csv',import.meta.url),'utf8');
 const rows=csv.trim().split(/\r?\n/);
 assert.equal(rows.length,117);
 assert(rows[0].includes('site_list_complete'));
 assert(rows.slice(1).every(x=>x.includes(',"NO",')));
});
