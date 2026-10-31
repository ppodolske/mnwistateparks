/* Atlas Parks — DNR-sourced campsite reference suggestions.
 * Sources are official MN/WI DNR pages or campground maps reviewed 2026-10-31.
 * Reference lists are intentionally partial: no guesses from capacity, no availability,
 * and no scraping of authenticated reservations or live bookings.
 * Never write to trip storage; existing campsite text remains authoritative.
 */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.AtlasCampsiteCatalog=api;
})(typeof window!=='undefined'?window:null,function(){
'use strict';
const numberRange=(a,b)=>Array.from({length:b-a+1},(_,i)=>String(a+i));
const entries=[
 {park:'Great River Bluffs State Park',state:'MN',source:'https://files.dnr.state.mn.us/maps/state_parks/spk00244.pdf',sourceType:'Official MN DNR park/campground map',checked:'2026-10-31',
  campgrounds:[{name:'Main Campground',sites:numberRange(1,38)},{name:'Cart-in Sites',sites:numberRange(1,4)}]},
 {park:'Gooseberry Falls State Park',state:'MN',source:'https://files.dnr.state.mn.us/maps/state_parks/spk00172_camp.pdf',sourceType:'Official MN DNR campground map',checked:'2026-10-31',
  campgrounds:[{name:'Main Campground',sites:numberRange(1,70)}]},
 {park:'Potawatomi State Park',state:'WI',source:'https://dnr.wisconsin.gov/topic/parks/potawatomi/recreation/camping',sourceType:'Official Wisconsin DNR camping page',checked:'2026-10-31',
  campgrounds:[{name:'Daisy Field Campground',loops:[{name:'North Loop',sites:[]},{name:'South Loop',sites:[]}]}]},

];
const norm=x=>String(x||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,' ').replace(/\bstate park\b/g,'').trim();
function findPark(parkName){
 const key=norm(parkName);if(!key)return null;
 return entries.find(x=>[x.park,...(x.aliases||[])].some(n=>norm(n)===key))||null;
}
function suggestions(parkName,campground='',loop=''){
 const entry=findPark(parkName);
 if(!entry)return {entry:null,campgrounds:[],loops:[],sites:[]};
 const cg=entry.campgrounds.find(x=>norm(x.name)===norm(campground));
 const loops=cg?.loops||[];
 const selected=loops.find(x=>norm(x.name)===norm(loop));
 const sites=selected?selected.sites||[]:loops.length?[]:cg?.sites||[];
 return {entry,campgrounds:entry.campgrounds.map(x=>x.name),loops:loops.map(x=>x.name),sites};
}
return {version:1,entries,findPark,suggestions};
});
