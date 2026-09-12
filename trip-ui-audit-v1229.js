const assert=require('assert');
const fs=require('fs');
const http=require('http');
const ui=fs.readFileSync('trip-workspace-ui-v1229.js','utf8');
new Function(ui);
assert(ui.includes('Detailed booklet'),'trip UI must restore detailed booklet option');
assert(ui.includes('Condensed plan'),'trip UI must restore condensed plan option');
assert(ui.includes("button.textContent='Download PDF'"),'trip UI must replace outdated Print trip label');
assert(ui.includes('font-size:14px!important'),'trip editor inputs/body controls must use readable sizing');
assert(ui.includes('trip-export-panel-v1229'),'trip UI must create a dedicated export panel');
assert(ui.includes('TripPDFRuntimeV1228?.bind'),'trip UI must hand the controls to the isolated PDF runtime');

const app=require('./site-v1229.js');
(async()=>{
  const server=app.createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {port}=server.address();
  const body=await new Promise((resolve,reject)=>{
    http.get({host:'127.0.0.1',port,path:'/trip?id=audit'},res=>{
      let data='';res.setEncoding('utf8');res.on('data',c=>data+=c);res.on('end',()=>resolve(data));
    }).on('error',reject);
  });
  await new Promise(resolve=>server.close(resolve));
  assert(body.includes('parks-release-version" content="1.22.9'),'trip page must identify v1.22.9');
  assert(body.includes('/trip-pdf-runtime-v1228.js?v=1228'),'trip page must retain isolated PDF runtime');
  assert(body.includes('/trip-workspace-ui-v1229.js?v=1229'),'trip page must load v1.22.9 workspace UI');
  assert(body.includes('yellowstone-v1.22.6'),'trip page must retain Yellowstone theme');
  console.log('Trip UI audit passed: readable workspace styling and detailed/condensed PDF controls are delivered with the isolated exporter.');
})().catch(err=>{console.error(err);process.exit(1)});
