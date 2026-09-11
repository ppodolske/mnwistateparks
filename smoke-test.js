const {VERSION,parks,renderPath}=require('./app.js');
function check(path,need=[]){const out=renderPath(new URL(path,'http://localhost'));if(out.status!==200)throw new Error(`${path} returned ${out.status}`);for(const token of need){if(!out.body.includes(token))throw new Error(`${path} missing ${token}`)}}
const nav=['href="/parks"','href="/explore"','href="/map"','href="/project"','href="/saved"','href="/about"'];
for(const p of ['/','/parks','/explore','/map','/project','/saved','/about'])check(p,nav);
check('/parks/tettegouche',[...nav,'id="saveParkBtn"','Save park','id="tripParkBtn"','Add to trip']);
check('/saved',['mnwiSavedParks','mnwiTripCollections','id="createTripBtn"','Trip collections']);
check('/trip?id=test-trip',['id="tripApp"','id="tripNameEdit"','id="tripStops"']);
check('/compare?parks=tettegouche,bear-head-lake',['Compare Parks']);
if(parks.length!==116)throw new Error(`Expected 116 parks, found ${parks.length}`);
if(VERSION!=='1.1.0')throw new Error(`Unexpected version ${VERSION}`);
console.log('Smoke tests passed: v1.1.0, 116 parks, canonical navigation, save/compare, trip collections, core routes.');
