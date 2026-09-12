const assert=require('assert');
const fs=require('fs');
const download=fs.readFileSync('./trip-export-download-v1221.js','utf8');
const overview=fs.readFileSync('./trip-booklet-overview.js','utf8');
const days=fs.readFileSync('./trip-booklet-days.js','utf8');
const route=fs.readFileSync('./trip-booklet-route.js','utf8');
const reference=fs.readFileSync('./trip-booklet-reference.js','utf8');

assert(download.includes('synchronizeExportState'),'download export must explicitly synchronize current trip state');
assert(download.includes('TripDayEditor?.persist?.(false)'),'download export must persist open canonical day-editor fields first');
assert(download.includes("new CustomEvent('trip-days-changed'"),'download export must emit current day-change event');
assert(download.includes("new CustomEvent('trip-logistics-saved'"),'download export must emit current logistics-save event');
assert(download.includes("legacy.id='saveTripDetailsBtn'"),'download export must trigger the legacy booklet refresh bridge');
assert(download.indexOf('await synchronizeExportState()')<download.indexOf('makeCompactRoot()'),'state synchronization must occur before export root creation');
assert(overview.includes("saveTripDetailsBtn"),'overview must listen to refresh bridge');
assert(days.includes("saveTripDetailsBtn"),'day pages must listen to refresh bridge');
assert(route.includes("saveTripDetailsBtn"),'route page must listen to refresh bridge');
assert(reference.includes("saveTripDetailsBtn"),'reference page must listen to refresh bridge');
console.log('Trip export sync audit passed: open itinerary state is persisted and all hidden booklet sections refresh from current storage before PDF generation.');
