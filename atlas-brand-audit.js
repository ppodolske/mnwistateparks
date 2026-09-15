const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const site=require('./site-v12213.js');

function request(server,pathname){
  const {port}=server.address();
  return new Promise((resolve,reject)=>{
    http.get({host:'127.0.0.1',port,path:pathname},res=>{
      let body='';
      res.setEncoding('utf8');
      res.on('data',chunk=>body+=chunk);
      res.on('end',()=>resolve({status:res.statusCode,body}));
    }).on('error',reject);
  });
}

function titleOf(html){
  return html.match(/<title>([^<]*)<\/title>/i)?.[1]||'';
}

(async()=>{
  const server=site.createServer();
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  try{
    const home=await request(server,'/');
    assert.equal(home.status,200);
    assert.equal(titleOf(home.body),'Atlas — Minnesota & Wisconsin State Parks','home title must use Atlas with the descriptive park subtitle');
    assert.match(home.body,/class="brand" href="\/">ATLAS\.?<span>Minnesota (?:&|&amp;) Wisconsin State Parks<\/span><\/a>/i,'public brand must be Atlas with Minnesota & Wisconsin State Parks subtitle');
    assert.doesNotMatch(home.body,/STATE PARKS\.<span>MN & WI<\/span>/i,'legacy product masthead must not render');
    assert.match(home.body,/designated state park in Minnesota and Wisconsin/i,'ordinary state-park subject matter must remain intact');
    assert.match(home.body,/park-favicon\.svg/,'existing park favicon asset must remain in use');

    for(const pathname of ['/parks','/explore','/find','/collections','/about','/project','/saved','/map']){
      const response=await request(server,pathname);
      assert.equal(response.status,200,`${pathname} must render`);
      assert.match(titleOf(response.body),/Atlas/ ,`${pathname} title must identify the product as Atlas`);
    }

    const readme=fs.readFileSync('README.md','utf8');
    assert.match(readme,/^# Atlas$/m,'README title must use Atlas');
    assert.match(readme,/Minnesota & Wisconsin State Parks/,'README must retain the descriptive subtitle');
    assert.ok(fs.existsSync('park-favicon.svg'),'park-favicon.svg must remain unchanged and present');
    console.log('Atlas brand audit passed: product identity is Atlas while state-park subject matter and favicon remain intact.');
  }finally{
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(err=>{console.error(err);process.exitCode=1});
