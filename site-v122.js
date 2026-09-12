const fs=require('fs');
const path=require('path');
const previous=require('./site-v121.js');
const VERSION='1.22.0';
const PORT=process.env.PORT||3000;
const EXPORT_FILE=path.join(__dirname,'trip-export-v122.js');
const tripExportV122JS=fs.readFileSync(EXPORT_FILE,'utf8');

function createServer(){
  const server=previous.createServer();
  const original=server.listeners('request')[0];
  server.removeAllListeners('request');
  server.on('request',(req,res)=>{
    let url;try{url=new URL(req.url,'http://localhost')}catch{return original(req,res)}
    if(url.pathname==='/trip-export-v122.js'){
      res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});
      return res.end(tripExportV122JS);
    }
    if(url.pathname==='/health'){
      const coords=previous.loadCoords();
      res.writeHead(200,{'content-type':'application/json'});
      return res.end(JSON.stringify({ok:true,version:VERSION,architecture:'current-runtime-v122-export-refinement-wrapper',parks:previous.parks.length,collections:previous.COLLECTIONS.length,parkReferenceRecords:Object.keys(previous.parkDetails||{}).length,mapCoordinates:coords?Object.keys(coords.parks||{}).length:0,features:['trip-workspace-cleanup','unassigned-stops-workflow','park-reference-details','first-class-day-management','consolidated-trip-logistics','route-intelligence','readiness-qa','unified-export-status','detailed-booklet-refinement','compact-plan-export','export-route-carry-through','export-logistics-carry-through','export-park-reference-links','draft-export-warning','print-page-break-refinement','a4-and-letter-export']}));
    }
    const end=res.end;
    res.end=function(body,...args){
      const type=String(res.getHeader('content-type')||'');
      if(type.includes('text/html')&&body!=null){
        let html=Buffer.isBuffer(body)?body.toString('utf8'):String(body);
        const script='<script src="/trip-export-v122.js" defer></script>';
        if(!html.includes('/trip-export-v122.js'))html=html.includes('</body>')?html.replace('</body>',script+'</body>'):html+script;
        return end.call(this,html,...args);
      }
      return end.call(this,body,...args);
    };
    return original(req,res);
  });
  return server;
}

if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT} (export refinement release)`));
module.exports={...previous,VERSION,tripExportV122JS,createServer};
