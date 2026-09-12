const fs=require('fs');
const assert=(ok,msg)=>{if(!ok){console.error('Trip UI refinement audit failed:',msg);process.exit(1)}};
const ui=fs.readFileSync('trip-workspace-refine-v12210.js','utf8');
const site=fs.readFileSync('site-v12210.js','utf8');

assert(ui.includes('trip-legacy-park-order-v12210'),'legacy Park Order section must be hidden');
assert(ui.includes("'tripBookletOverview','tripBookletDays','tripBookletRoute','tripBookletReference','tripBookletNotes'"),'booklet source sections must be explicitly hidden on screen');
assert(ui.includes("style.dataset.pdfDownload='true'"),'screen cleanup CSS must be excluded from PDF rendering');
assert(ui.includes("edit.textContent='Edit trip'"),'trip title must expose an Edit trip action');
assert(ui.includes('tripQuickNameV12210')&&ui.includes('tripQuickStartDateV12210')&&ui.includes('tripQuickStartLocationV12210'),'top editor must cover name, dates and route basics');
assert(ui.includes('old.replaceWith(fresh)'),'PDF button must replace legacy-bound button before taking ownership');
assert(ui.includes("fresh.addEventListener('click',fixedExport,true)"),'PDF button must own a capture-phase export action');
assert(ui.includes('TripPDFRuntimeV1228')&&ui.includes('runtime.download()'),'owned action must call the isolated PDF runtime directly');
assert(site.includes('/trip-workspace-refine-v12210.js?v=12210'),'v1.22.10 refinement must remain injected into the wrapper chain');
assert(site.includes("VERSION='1.22.10'"),'v1.22.10 compatibility wrapper must remain intact');
console.log('Trip UI refinement audit passed: PDF button ownership, top trip editing, redundant Park Order removal, and hidden booklet source rendering remain configured.');
