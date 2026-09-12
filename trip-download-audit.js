const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('trip-export-download-v1221.js','utf8');
const wrapper=fs.existsSync('site-v1221.js')?fs.readFileSync('site-v1221.js','utf8'):'';
assert(src.includes("button.textContent='Download PDF'"),'export button must be Download PDF');
assert(src.includes('html2pdf.bundle.min.js'),'PDF generator must be loaded for direct download');
assert(src.includes('.save()'),'PDF generator must save/download the file');
assert(src.includes("mode.value==='compact'?makeCompactRoot():makeDetailedRoot()"),'both export modes must use direct downloader');
assert(src.includes("window.TripCompactExport=()=>{mode.value='compact';return download()}"),'compact export must delegate to downloader');
assert(src.includes("window.TripBookletExport.exportBooklet=()=>{mode.value='booklet';return download()}"),'detailed export must delegate to downloader');
assert(!/\bprint\s*\(/.test(src),'download-only export layer must not call browser print');
assert(src.includes("copy.textContent='Choose the detailed booklet or compact plan, then download the finished PDF directly.'"),'workspace copy must describe direct download');
if(wrapper){assert(wrapper.includes('download-only-pdf-export'),'release wrapper must advertise download-only export');}
console.log('Trip download audit passed: download-only PDF action, detailed/compact parity, direct file save and no browser print call.');
