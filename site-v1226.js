const fs=require('fs');
const path=require('path');
const previous=require('./site-v1225.js');
const VERSION='1.22.6';
const PORT=process.env.PORT||3000;
const themeCSS=fs.readFileSync(path.join(__dirname,'parks-yellowstone-theme.css'),'utf8');
const faviconSVG=fs.readFileSync(path.join(__dirname,'park-favicon.svg'),'utf8');

function createServer(){
  const server=previous.createServer();
  const original=server.listeners('request')[0];
  server.removeAllListeners('request');
  server.on('request',(req,res)=>{
    let url;try{url=new URL(req.url,'http://localhost')}catch{return original(req,res)}
    if(url.pathname==='/health'){
      const coords=previous.loadCoords();
      res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});
      return res.end(JSON.stringify({ok:true,version:VERSION,architecture:'current-runtime-v1226-body-detected-yellowstone-theme',parks:previous.parks.length,collections:previous.COLLECTIONS.length,parkReferenceRecords:Object.keys(previous.parkDetails||{}).length,mapCoordinates:coords?Object.keys(coords.parks||{}).length:0,features:['trip-workspace-cleanup','park-reference-details','first-class-day-management','consolidated-trip-logistics','route-intelligence','readiness-qa','download-only-pdf-export','export-state-synchronization','preston-run-footer-link','yellowstone-brand-system','body-detected-theme-delivery','bebas-neue-headings','fredoka-body','pt-serif-metadata','compact-body-type','material-park-favicon']}));
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
          suppliedHeaders['x-parks-theme']='yellowstone-v1.22.6';
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
          const fonts='<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Fredoka:wght@400&family=PT+Serif:wght@400;700&display=swap" rel="stylesheet">';
          const favicon='<link rel="icon" href="/park-favicon.svg?v=1226" type="image/svg+xml">';
          const marker='<meta name="parks-theme-version" content="yellowstone-v1.22.6">';
          const inlineTheme='<style id="parks-yellowstone-theme-v1226">'+themeCSS+'</style>';
          const hub='<script src="/parks-hub-link.js?v=1226" defer></script>';
          const inject=fonts+favicon+marker+inlineTheme+hub;
          html=html
            .replace(/<link[^>]+parks-yellowstone-theme\.css[^>]*>/gi,'')
            .replace(/<style id="parks-yellowstone-theme-v\d+">[\s\S]*?<\/style>/gi,'')
            .replace(/<meta name="parks-theme-version"[^>]*>/gi,'')
            .replace(/<link rel="icon"[^>]*park-favicon\.svg[^>]*>/gi,'')
            .replace(/<script[^>]*parks-hub-link\.js[^>]*><\/script>/gi,'');
          html=html.includes('</head>')?html.replace('</head>',inject+'</head>'):inject+html;
          return downstreamEnd.call(this,html,...args);
        }
      }
      return downstreamEnd.call(this,body,...args);
    };
    return original(req,res);
  });
  return server;
}

if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT} (verified Yellowstone HTML delivery)`));
module.exports={...previous,VERSION,themeCSS,faviconSVG,createServer};
