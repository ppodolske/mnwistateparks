const {VERSION,parks,renderPath,clientJS}=require('./app.js');
function check(path,need=[]){const out=renderPath(new URL(path,'http://localhost'));if(out.status!==200)throw new Error(`${path} returned ${out.status}`);for(const token of need){if(!out.body.includes(token))throw new Error(`${path} missing ${token}`)}}
const nav=['href="/parks"','href="/explore"','href="/map"','href="/project"','href="/saved"','href="/about"'];
for(const p of ['/','/parks','/explore','/map','/project','/saved','/about'])check(p,nav);
check('/parks/tettegouche',[...nav,'id="saveParkBtn"','Save park','id="tripParkBtn"','Add to trip','data-park-slug="tettegouche"']);
check('/saved',[...nav,'data-page="saved"','id="createTripBtn"','id="tripName"','id="tripRoot"','Trip collections']);
check('/trip?id=test-trip',[...nav,'data-page="trip"','id="tripNameEdit"','id="tripStops"','id="saveTripBtn"']);
check('/compare?parks=tettegouche,bear-head-lake',['Compare Parks']);
check('/map',['Map rebuild in progress.']);
if(parks.length!==116)throw new Error(`Expected 116 parks, found ${parks.length}`);
if(VERSION!=='1.1.1')throw new Error(`Unexpected version ${VERSION}`);
new Function(clientJS);
for(const token of ['createTripBtn','mnwiTripCollections','Trip created ✓','saveParkBtn','tripParkBtn'])if(!clientJS.includes(token))throw new Error(`client.js missing ${token}`);
console.log('Smoke tests passed: v1.1.1, 116 parks, canonical navigation, parseable client JS, save/compare, trip creation, and trip editing routes.');
