const fs=require('fs');
const FILE='./park-coordinates.generated.json';
try{fs.unlinkSync(FILE)}catch{}
const realFetch=global.fetch;
global.fetch=async function(...args){
  let last;
  for(let attempt=1;attempt<=5;attempt++){
    try{
      const r=await realFetch(...args);
      if(r.ok)return r;
      last=new Error(`HTTP ${r.status}`);
    }catch(e){last=e}
    console.error(`Coordinate fetch attempt ${attempt}/5 failed: ${last&&last.message}`);
    if(attempt<5)await new Promise(r=>setTimeout(r,attempt*2000));
  }
  throw last;
};
require('./generate-coordinates.js');
let checks=0;
const timer=setInterval(()=>{
  checks++;
  if(fs.existsSync(FILE)){
    clearInterval(timer);
    const raw=fs.readFileSync(FILE);
    console.log('COORD_SNAPSHOT_BASE64_BEGIN');
    console.log(raw.toString('base64'));
    console.log('COORD_SNAPSHOT_BASE64_END');
  }else if(checks>90){
    clearInterval(timer);
    console.error('Coordinate snapshot file was not produced in time');
    process.exit(1);
  }
},1000);
