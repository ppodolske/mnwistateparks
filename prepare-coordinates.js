const fs=require('fs');
const path=require('path');

const source=path.join(__dirname,'park-coordinates.json');
const runtime=path.join(__dirname,'park-coordinates.generated.json');

if(!fs.existsSync(source))throw new Error('Checked-in park-coordinates.json is missing');
const data=JSON.parse(fs.readFileSync(source,'utf8'));
const records=Object.keys(data.parks||{});
if(data.count!==116||records.length!==116)throw new Error(`Static coordinate snapshot invalid: count=${data.count}, records=${records.length}`);
for(const [slug,c] of Object.entries(data.parks)){
  if(!Number.isFinite(c.lat)||!Number.isFinite(c.lng))throw new Error(`Invalid coordinate for ${slug}`);
}
fs.copyFileSync(source,runtime);
console.log('Static coordinates prepared: 116/116; no external GIS request required.');
