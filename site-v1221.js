const fs=require('fs');
const path=require('path');
const previous=require('./site-v122.js');
const VERSION='1.22.1';
const PORT=process.env.PORT||3000;
const DOWNLOAD_FILE=path.join(__dirname,'trip-export-download-v1221.js');
const tripExportDownloadV1221JS=fs.readFileSync(DOWNLOAD_FILE,'utf8');

function createServer(){
  const server=previous.createServer();
  const original=server.listeners('request')[0];
  server.removeAllListeners('request');
  server.on('request',(req,res)=>{
    let url;try{url=new URL(req.url,'http://localhost')}catch{return original(req,res)}
    if(url.pathname==='/trip-export-download-v1221.js'){
      res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});
      return res.end(tripExportDownloadV1221JS);
    }
    if(url.pathname==='/health'){
      const coords=previous.loadCoords();
      res.writeHead(200,{'content-type':'application/json'});
      return res.end(JSON.stringify({ok:true,version:VERSION,architecture:'current-runtime-v1221-download-only-export-wrapper',parks:previous.parks.length,collections:previous.COLLECTIONS.length,parkReferenceRecords:Object.keys(previous.parkDetails||{}).length,mapCoordinates:coords?Object.keys(coords.parks||{}).length:0,features:['trip-workspace-cleanup','park-reference-details','first-class-day-management','consolidated-trip-logistics','route-intelligence','readiness-qa','detailed-booklet-export','compact-plan-export','download-only-pdf-export','direct-pdf-file-save','a4-and-letter-export','no-print-dialog']}));
    }
    const end=res.end;
    res.end=function(body,...args){
      const type=String(res.getHeader('content-type')||'');
      if(type.includes('text/html')&&body!=null){
        let html=Buffer.isBuffer(body)?body.toString('utf8'):String(body);
        const script='<script src="/trip-export-download-v1221.js" defer></script>';
        if(!html.includes('/trip-export-download-v1221.js'))html=html.includes('</body>')?html.replace('</body>',script+'</body>'):html+script;
        return end.call(this,html,...args);
      }
      return end.call(this,body,...args);
    };
    return original(req,res);
  });
  return server;
}

if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT} (download-only PDF export release)`));
module.exports={...previous,VERSION,tripExportDownloadV1221JS,createServer};
