const fs=require('fs');
const path=require('path');
function assert(cond,msg){if(!cond)throw new Error(msg)}
const src=fs.readFileSync(path.join(__dirname,'trip-export-v122.js'),'utf8');
assert(src.includes('TripCompactExport'),'compact export function must be registered');
assert(src.includes('Planning status:'),'detailed booklet must include planning status');
assert(src.includes('Draft export — planning blockers remain.'),'compact export must distinguish draft exports');
assert(src.includes('Park quick reference'),'compact export must include park reference table');
assert(src.includes('officialUrl')&&src.includes('mapUrl')&&src.includes('directionsUrl'),'compact references must carry DNR/map/directions links');
assert(src.includes('trip.lodgingNotes')&&src.includes('trip.resupplyNotes')&&src.includes('trip.emergencyContact'),'compact export must include trip-wide logistics');
assert(src.includes('routeUrl'),'compact export must include route links');
assert(src.includes('break-before:page')&&src.includes('break-inside:avoid'),'print pagination rules must be present');
assert(src.includes('You can still export a draft.'),'export must remain available when blockers remain');
console.log('Trip export audit passed: unified detailed/compact status, route/logistics/reference carry-through, print page rules and draft-export behavior.');
