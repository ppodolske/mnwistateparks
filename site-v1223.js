const fs=require('fs');
const path=require('path');
const previous=require('./site-v1222.js');
const VERSION='1.22.3';
const PORT=process.env.PORT||3000;
const HUB_LINK_FILE=path.join(__dirname,'parks-hub-link.js');
const parksHubLinkJS=fs.readFileSync(HUB_LINK_FILE,'utf8');

function createServer(){
  const server=previous.createServer();
  const original=server.listeners('request')[0];
  server.removeAllListeners('request');
  server.on('request',(req,res)=>{
    let url;try{url=new URL(req.url,'http://localhost')}catch{return original(req,res)}
    if(url.pathname==='/parks-hub-link.js'){
      res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});
      return res.end(parksHubLinkJS);
    }
    if(url.pathname==='/health'){
      const coords=previous.loadCoords();
      res.writeHead(200,{'content-type':'application/json'});
      return res.end(JSON.stringify({ok:true,version:VERSION,architecture:'current-runtime-v1223-preston-hub-link-wrapper',parks:previous.parks.length,collections:previous.COLLECTIONS.length,parkReferenceRecords:Object.keys(previous.parkDetails||{}).length,mapCoordinates:coords?Object.keys(coords.parks||{}).length:0,features:['trip-workspace-cleanup','park-reference-details','first-class-day-management','consolidated-trip-logistics','route-intelligence','readiness-qa','download-only-pdf-export','export-state-synchronization','preston-run-header-link']}));
    }
    const end=res.end;
    res.end=function(body,...args){
      const type=String(res.getHeader('content-type')||'');
      if(type.includes('text/html')&&body!=null){
        let html=Buffer.isBuffer(body)?body.toString('utf8'):String(body);
        const script='<script src="/parks-hub-link.js" defer></script>';
        if(!html.includes('/parks-hub-link.js'))html=html.includes('</body>')?html.replace('</body>',script+'</body>'):html+script;
        return end.call(this,html,...args);
      }
      return end.call(this,body,...args);
    };
    return original(req,res);
  });
  return server;
}

if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT} (Preston.run header link release)`));
module.exports={...previous,VERSION,parksHubLinkJS,createServer};
