const fs=require('fs');
const path=require('path');
const vm=require('vm');
const previous=require('./site-v12212.js');
const VERSION='1.22.13';
const PORT=process.env.PORT||3000;
const MASTER_REVIEW_FILE=path.join(__dirname,'park-review-text.js');

function loadCanonicalReviews(){
  const source=fs.readFileSync(MASTER_REVIEW_FILE,'utf8');
  const sandbox={window:{},module:{exports:{}},exports:{}};
  vm.createContext(sandbox);
  vm.runInContext(source+'\n;globalThis.__PARK_REVIEW_TEXT__=(typeof PARK_REVIEW_TEXT!=="undefined"?PARK_REVIEW_TEXT:(window.PARK_REVIEW_TEXT||{}));',sandbox,{filename:'park-review-text.js'});
  const reviews=sandbox.__PARK_REVIEW_TEXT__||{};
  if(!reviews||typeof reviews!=='object')throw new Error('park-review-text.js did not expose a review map');
  return reviews;
}

const canonicalReviews=loadCanonicalReviews();
let appliedReviewCount=0;
for(const park of previous.parks||[]){
  const key=String(park.slug||'').toLowerCase()+'|'+String(park.state||'');
  const review=canonicalReviews[key];
  if(typeof review==='string'&&review.trim()){
    park.review=review.trim();
    appliedReviewCount+=1;
  }
}

const canonicalReviewClientJS=`(()=>{const d=${JSON.stringify(canonicalReviews)};window.PARK_REVIEW_TEXT=Object.assign(window.PARK_REVIEW_TEXT||{},d);})();`;

function createServer(){
  const server=previous.createServer();
  const original=server.listeners('request')[0];
  server.removeAllListeners('request');
  server.on('request',(req,res)=>{
    let url;try{url=new URL(req.url,'http://localhost')}catch{return original(req,res)}
    if(url.pathname==='/park-review-text.js'){
      res.writeHead(200,{'content-type':'application/javascript; charset=utf-8','cache-control':'no-cache, no-store, must-revalidate'});
      return res.end(canonicalReviewClientJS);
    }
    if(url.pathname==='/health'){
      const coords=previous.loadCoords();
      res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});
      return res.end(JSON.stringify({ok:true,version:VERSION,architecture:'current-runtime-v12213-canonical-review-source',parks:previous.parks.length,canonicalReviews:Object.keys(canonicalReviews).length,appliedReviewCount,collections:previous.COLLECTIONS.length,parkReferenceRecords:Object.keys(previous.parkDetails||{}).length,mapCoordinates:coords?Object.keys(coords.parks||{}).length:0,features:['canonical-review-source','park-review-text-master','server-rendered-review-sync','trip-booklet-review-sync','yellowstone-brand-system','planner-nav-label','top-trip-editor','detailed-and-condensed-export-controls','isolated-iframe-pdf-rendering','material-park-favicon','preston-run-footer-link']}));
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
          suppliedHeaders['x-parks-release']='v1.22.13';
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
          const marker='<meta name="parks-release-version" content="1.22.13">';
          const masterScript='<script src="/park-review-text.js?v=12213" defer></script>';
          html=html
            .replace(/<meta name="parks-release-version"[^>]*>/gi,'')
            .replace(/<script[^>]*src="\/park-review-text\.js[^>]*><\/script>/gi,'');
          html=html.includes('</head>')?html.replace('</head>',marker+'</head>'):marker+html;
          if(html.includes('<script src="/trip-booklet-review-source.js" defer></script>')){
            html=html.replace('<script src="/trip-booklet-review-source.js" defer></script>',masterScript+'<script src="/trip-booklet-review-source.js" defer></script>');
          }else if(html.includes('</body>')){
            html=html.replace('</body>',masterScript+'</body>');
          }else{
            html+=masterScript;
          }
          return downstreamEnd.call(this,html,...args);
        }
      }
      return downstreamEnd.call(this,body,...args);
    };
    return original(req,res);
  });
  return server;
}

if(require.main===module)createServer().listen(PORT,'0.0.0.0',()=>console.log(`State Parks v${VERSION} on ${PORT} (${appliedReviewCount} canonical reviews applied)`));
module.exports={...previous,VERSION,canonicalReviews,canonicalReviewClientJS,appliedReviewCount,createServer};
