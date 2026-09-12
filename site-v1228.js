const fs=require('fs');
const path=require('path');
const previous=require('./site-v1227.js');
const VERSION='1.22.8';
const PORT=process.env.PORT||3000;
const PDF_RUNTIME_FILE=path.join(__dirname,'trip-pdf-runtime-v1228.js');
const tripPDFRuntimeJS=fs.readFileSync(PDF_RUNTIME_FILE,'utf8');

function createServer(){
  const server=previous.createServer();
  const original=server.listeners('request')[0];
  server.removeAllListeners('request');
  server.on('request',(req,res)=>{
    let url;try{url=new URL(req.url,'http://localhost')}catch{return original(req,res)}
    if(url.pathname==='/trip-pdf-runtime-v1228.js'){
      res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache'});
      return res.end(tripPDFRuntimeJS);
    }
    if(url.pathname==='/health'){
      const coords=previous.loadCoords();
      res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});
      return res.end(JSON.stringify({ok:true,version:VERSION,architecture:'current-runtime-v1228-isolated-pdf-document',parks:previous.parks.length,collections:previous.COLLECTIONS.length,parkReferenceRecords:Object.keys(previous.parkDetails||{}).length,mapCoordinates:coords?Object.keys(coords.parks||{}).length:0,features:['trip-workspace-cleanup','park-reference-details','first-class-day-management','consolidated-trip-logistics','route-intelligence','readiness-qa','download-only-pdf-export','export-state-synchronization','isolated-iframe-pdf-rendering','capture-phase-export-handler','screen-theme-excluded-from-pdf','preston-run-footer-link','yellowstone-brand-system','material-park-favicon']}));
    }

    let htmlResponse=false;
    const downstreamWriteHead=res.writeHead;
    res.writeHead=function(statusCode,statusMessage,headers){
      let suppliedHeaders=null;
      let suppliedStatusMessage=statusMessage;
      if(statusMessage&&typeof statusMessage==='object'){
        suppliedHeaders={...statusMessage};
        suppliedStatusMessage=undefined;
      }else if(headers&&typeof headers==='object'){
        suppliedHeaders={...headers};
      }
      if(suppliedHeaders){
        const typeKey=Object.keys(suppliedHeaders).find(k=>k.toLowerCase()==='content-type');
        const type=typeKey?String(suppliedHeaders[typeKey]):'';
        if(type.includes('text/html')){
          htmlResponse=true;
          suppliedHeaders['cache-control']='no-cache, no-store, must-revalidate';
          suppliedHeaders['x-parks-release']='v1.22.8';
        }
      }
      return suppliedStatusMessage===undefined
        ? downstreamWriteHead.call(this,statusCode,suppliedHeaders||statusMessage)
        : downstreamWriteHead.call(this,statusCode,suppliedStatusMessage,suppliedHeaders||headers);
    };

    const downstreamEnd=res.end;
    res.end=function(body,...args){
      if(body!=null){
        let html=Buffer.isBuffer(body)?body.toString('utf8'):String(body);
        const looksLikeHtml=htmlResponse||/<!doctype html|<html[\s>]|<\/head>/i.test(html);
        if(looksLikeHtml){
          const marker='<meta name="parks-release-version" content="1.22.8">';
          const runtime='<script src="/trip-pdf-runtime-v1228.js?v=1228" defer></script>';
          html=html
            .replace(/<meta name="parks-release-version"[^>]*>/gi,'')
            .replace(/<script[^>]*trip-pdf-runtime-v1228\.js[^>]*><\/script>/gi,'');
          html=html.includes('</head>')?html.replace('</head>',marker+'</head>'):marker+html;
          html=html.includes('</body>')?html.replace('</body>',runtime+'</body>'):html+runtime;
          return downstreamEnd.call(this,html,...args);
        }
      }
      return downstreamEnd.call(this,body,...args);
    };
    return original(req,res);
  });
  return server;
}

if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT} (isolated trip PDF runtime)`));
module.exports={...previous,VERSION,tripPDFRuntimeJS,createServer};
