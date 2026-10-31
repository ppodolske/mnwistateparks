/* Atlas Parks — curated official DNR campground reference (2026-10-31).
 * Not live inventory. List only explicitly documented site identifiers.
 * Unreviewed parks remain manual entry. These lists DO NOT imply availability.
 * Existing trip storage is untouched; values are suggestions only.
 * Park-level lists are independent of campground and loop.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.AtlasCampsiteCatalog=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
const range=(a,b,p='')=>Array.from({length:b-a+1},(_,i)=>p+String(a+i));
const unique=x=>[...new Set(x||[])];
const DATE='2026-10-31';
const entries=[
 {park:'Great River Bluffs State Park',state:'MN',
  campgrounds:['Campground','Cart-in Sites'],sites:range(1,38),source:'https://files.dnr.state.mn.us/maps/state_parks/spk00244.pdf',
  notes:'Main campground 1–38 and four independently numbered cart-in sites 1–4; duplicates are intentionally collapsed at park level.'},
 {park:'Gooseberry Falls State Park',state:'MN',
  campgrounds:['Main Campground','Group Camps'],loops:['Birch Ridge','Nestor Grade','Pebble Creek'],sites:range(1,70),
  source:'https://files.dnr.state.mn.us/maps/state_parks/spk00172_camp.pdf',notes:'Main campground numbers 1–70; group camp names are not individual site numbers.'},
 {park:'Potawatomi State Park',state:'WI',campgrounds:['Daisy Field Campground'],loops:['North Loop','South Loop'],sites:[],
  source:'https://dnr.wisconsin.gov/topic/parks/potawatomi/recreation/camping',notes:'Only campground/loop names verified; no guessed site numbers.'},
 {park:'Whitewater State Park',state:'MN',
  campgrounds:['Cedar Hill Campground','Minneiska Campground','Gooseberry Glen Cart-in Sites','Walk-in Sites','Group Camp'],
  loops:[],sites:[...range(1,69),...range(200,244),...range(1,4,'C'),...range(15,18,'C')],
  source:'https://files.dnr.state.mn.us/maps/state_parks/spk00280_camp.pdf',
  notes:'PDF labels 1–69 and 200–244; cart-in C1–C4 and C15–C18 seen on map; additional cart-in sites not assumed.'},
 {park:'Forestville/Mystery Cave State Park',state:'MN',
  campgrounds:['Main Campground','Equestrian Campground','Primitive Group Camp'],sites:[...range(1,73),...range(1,55,'H')],
  source:'https://files.dnr.state.mn.us/maps/state_parks/spk00148_camp.pdf',
  notes:'Main 1–73 and equestrian H1–H55 labelled on DNR campground map.'},
 {park:'Minneopa State Park',state:'MN',
  campgrounds:['Red Fox Campground'],
  sites:['A1','A2','A3','A4','A5','A6','A7','A8','A9','A10','A11','A12','A13','A14','A15','A16','A17','A18','A19','A20','A21','A22','A23','A24','A25','A26','A27','A28','A29','A30','A32','A34',
  'B1','B2','B3','B4','B5','B6','B7','B8','B9','B10','B11','B12','B13','B15','B17','B18','B19','B20','B21','B22','B23','B24','B25','B26','B27','B28','B29','B30','B31','B32','B33','B34'],
  source:'https://files.dnr.state.mn.us/maps/state_parks/spk00235.pdf',notes:'Explicit red A/B campsite labels from DNR Red Fox campground inset; gaps left blank.'},
 {park:'Itasca State Park',state:'MN',
  campgrounds:['Bear Paw Campground','Pine Ridge Campground'],
  loops:['Lakeview Loop','Basswood Loop','Poplar Loop','Pine Loop','Maple Loop','Spruce Loop','Oak Loop'],
  sites:[...range(1,28),...range(31,81),...range(100,116),...range(118,145),...range(147,220),222,...range(224,258)],
  source:'https://files.dnr.state.mn.us/maps/state_parks/spk00181_camp.pdf',
  notes:'Identified campground-map labels; some numbers are intentionally missing (29–30, 117, 146, 221, 223); electric suffix e omitted as amenity marking.'},
 {park:'Peninsula State Park',state:'WI',
  campgrounds:['North Nicolet Bay Campground','South Nicolet Bay Campground','Tennison Bay Campground','Weborg Point Campground',"Welcker's Point Campground",'Group Campground'],
  sites:['619E','783E','776E','779E','322E','324E','323E','525E'],
  source:'https://dnr.wisconsin.gov/topic/parks/peninsula/recreation/camping',
  notes:'Only explicit numbered sites mentioned on DNR camping page; campground number bands are not treated as complete lists.'},
 {park:'Governor Dodge State Park',state:'WI',
  campgrounds:['Cox Hollow Campground','Twin Valley Campground','Equestrian Campground','Hickory Ridge Group Camp','Backpack Sites'],
  sites:['16','55','241','355','765E'],source:'https://dnr.wisconsin.gov/topic/parks/govdodge/recreation/camping',
  notes:'Documented accessible site IDs; campground maps may have additional numbers not yet extracted.'},
 {park:"Devil's Lake State Park",state:'WI',
  campgrounds:['Quartzite Campground','Northern Lights Campground','Lower Ice Age Campground','Upper Ice Age Campground','Group Campground'],
  sites:['140'],source:'https://dnr.wisconsin.gov/topic/parks/devilslake/recreation/camping',
  notes:'Ranges 1–100, 104–246, 301–390, 401–535 are not expanded because capacity and numbering gaps do not reconcile.'},
 {park:'Copper Falls State Park',state:'WI',
  campgrounds:['North Campground','South Campground','Group Camp','Backpack Campsite'],
  sites:range(1,7),source:'https://dnr.wisconsin.gov/topic/parks/copperfalls/recreation/camping',
  notes:'DNR explicitly identifies winter sites 1–6 and accessible site 7. Other site numbers are not verified.'},
 {park:'Wyalusing State Park',state:'WI',
  campgrounds:['Wisconsin Ridge Campground','Homestead Campground','Outdoor Group Camp','Hugh Harper Indoor Group Camp'],
  sites:[],source:'https://dnr.wisconsin.gov/topic/parks/wyalusing/recreation/camping',
  notes:'Campground names recorded; 109 sites is a capacity, not a site-number list.'},
 {park:'Kohler-Andrae State Park',state:'WI',
  campgrounds:['Family Campground','Group Campground'],sites:['3','15','19','22','23','28','32','33','A','B'],
  source:'https://dnr.wisconsin.gov/topic/parks/kohlerandrae/recreation/camping',
  notes:'Explicit winter family sites and group sites A/B; 137 capacity is not expanded.'},
 {park:'Mirror Lake State Park',state:'WI',
  campgrounds:['Sandstone Ridge Campground','Cliffwood Campground','Bluewater Bay Campground','Group Campground'],
  sites:[...range(58,83),...range(84,105),...range(201,204),...range(106,121),127,128,130,131,132,135,136],
  source:'https://dnr.wisconsin.gov/topic/parks/mirrorlake/recreation/camping',
  notes:'DNR lists site bands 58–105, 201–204 and known Cliffwood double-site numbers. Other identifiers omitted.'},
 {park:'Willow River State Park',state:'WI',
  campgrounds:['100 Campground','200 Campground','300 Campground','Group Camp'],sites:[],
  source:'https://dnr.wisconsin.gov/topic/parks/willowriver/recreation/camping',
  notes:'DNR confirms campground names; not a verified site-number list.'},
 {park:'High Cliff State Park',state:'WI',
  campgrounds:['Family Campground','Group Camp'],sites:['58'],
  source:'https://dnr.wisconsin.gov/topic/parks/highcliff/recreation/camping',
  notes:'Confirmed campground host site 58 only; remaining 112 sites not enumerated.'},
 {park:'Perrot State Park',state:'WI',
  campgrounds:['Family Campground','Walk-in Group Camp'],sites:[],
  source:'https://dnr.wisconsin.gov/topic/parks/perrot/recreation/camping',
  notes:'DNR confirms campground types and 102 family-site capacity, not site labels.'},
 {park:'Brunet Island State Park',state:'WI',
  campgrounds:['North Campground','South Campground'],sites:[],
  source:'https://dnr.wisconsin.gov/topic/parks/brunetisland/recreation/camping',
  notes:'North/South campground names confirmed; no numbered campsite list on page.'},
 {park:'Big Foot Beach State Park',state:'WI',
  campgrounds:['Campground'],loops:['Upper Loop','Lower Loop'],sites:[],
  source:'https://dnr.wisconsin.gov/topic/parks/bigfoot/recreation/camping',
  notes:'Loop names confirmed; 100 sites is a capacity, not a site list.'}
];
const norm=x=>String(x||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,' ').replace(/\bstate park\b/g,'').trim();
function mnNames(slug){
 const record=typeof window!=='undefined'?window.AtlasMNReservationFacilities?.[slug]:null;
 return record?.facilityNames||[];
}
function findPark(parkName){
 const key=norm(parkName);if(!key)return null;
 return entries.find(x=>[x.park,...(x.aliases||[])].some(y=>norm(y)===key))||null;
}
function suggestions(parkName,campground='',loop='',slug=''){
 const entry=findPark(parkName);
 const officialMN=mnNames(slug);
 const campgrounds=unique([...(entry?.campgrounds||[]),...officialMN]);
 return {entry:entry||null,campgrounds,loops:unique(entry?.loops||[]),sites:unique((entry?.sites||[]).map(String)),
  source:officialMN.length?'https://www.dnr.state.mn.us/data/reservation.html':entry?.source||'',
  sourceStatus:officialMN.length?'official_facilities_listed':entry?'partial_reference':'unverified'};
}
return {version:3,reviewedAt:DATE,entries,findPark,suggestions};
});
