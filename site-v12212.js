const previous=require('./site-v12211.js');
const VERSION='1.22.12';
const PORT=process.env.PORT||3000;

function createServer(){
  const server=previous.createServer();
  const original=server.listeners('request')[0];
  server.removeAllListeners('request');
  server.on('request',(req,res)=>{
    let url;try{url=new URL(req.url,'http://localhost')}catch{return original(req,res)}
    if(url.pathname==='/health'){
      const coords=previous.loadCoords();
      res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});
      return res.end(JSON.stringify({ok:true,version:VERSION,architecture:'current-runtime-v12212-planner-nav',parks:previous.parks.length,collections:previous.COLLECTIONS.length,parkReferenceRecords:Object.keys(previous.parkDetails||{}).length,mapCoordinates:coords?Object.keys(coords.parks||{}).length:0,features:['yellowstone-brand-system','planner-nav-label','home-hero-count-removed','legacy-trip-details-removed','top-trip-editor','redundant-park-order-hidden','booklet-source-hidden','owned-pdf-download-action','detailed-and-condensed-export-controls','isolated-iframe-pdf-rendering','download-only-pdf-export','export-state-synchronization','material-park-favicon','preston-run-footer-link']}));
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
          suppliedHeaders['x-parks-release']='v1.22.12';
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
          const marker='<meta name="parks-release-version" content="1.22.12">';
          html=html
            .replace(/<meta name="parks-release-version"[^>]*>/gi,'')
            .replace(/<a href="\/saved">Saved<\/a>/gi,'<a href="/saved">Planner</a>');
          html=html.includes('</head>')?html.replace('</head>',marker+'</head>'):marker+html;
          return downstreamEnd.call(this,html,...args);
        }
      }
      return downstreamEnd.call(this,body,...args);
    };
    return original(req,res);
  });
  return server;
}

if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT} (Planner navigation label)`));
module.exports={...previous,VERSION,createServer};
