const assert=require('assert');
const fs=require('fs');
const http=require('http');
const app=require('./site-v1228.js');

(async()=>{
  const runtime=fs.readFileSync('trip-pdf-runtime-v1228.js','utf8');
  assert(runtime.includes("filter(s=>!String(s.id||'').startsWith('parks-yellowstone-theme-'))"),'PDF runtime must exclude Yellowstone screen theme styles');
  assert(runtime.includes("document.createElement('iframe')"),'PDF runtime must render in an isolated iframe');
  assert(runtime.includes("button.addEventListener('click',download,true)"),'PDF runtime must bind in capture phase');
  assert(runtime.includes('event.stopImmediatePropagation()'),'PDF runtime must stop older competing export handlers');
  assert(runtime.includes('window.html2pdf().set(pdfOptions(filename,paper.value)).from(built.root).save()'),'PDF runtime must directly save the isolated root');

  const server=app.createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {port}=server.address();
  const body=await new Promise((resolve,reject)=>{
    http.get({host:'127.0.0.1',port,path:'/trip'},res=>{
      let data='';res.setEncoding('utf8');
      res.on('data',chunk=>data+=chunk);
      res.on('end',()=>resolve(data));
    }).on('error',reject);
  });
  await new Promise(resolve=>server.close(resolve));
  assert(body.includes('parks-release-version" content="1.22.8'),'trip HTML must include v1.22.8 marker');
  assert(body.includes('/trip-pdf-runtime-v1228.js?v=1228'),'trip HTML must include isolated PDF runtime');
  console.log('PDF runtime audit passed: isolated iframe rendering, screen-theme exclusion, capture handler, and live trip injection are configured.');
})().catch(err=>{console.error(err);process.exit(1)});
