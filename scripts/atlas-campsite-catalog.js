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
  notes:'Loop names confirmed; 100 sites is a capacity, not a site list.'},
 {park:'Yellowstone Lake State Park',state:'WI',
  campgrounds:['Family Campground','Group Camp'],
  sites:['42','49','201','202','203','204','206'],
  source:'https://dnr.wisconsin.gov/topic/parks/yellowstone/recreation/camping',
  notes:'DNR explicitly identifies accessible family sites 42/49 and group sites 201–204 and 206. The 128-site campground capacity is not expanded.'},
 {park:'Hartman Creek State Park',state:'WI',
  campgrounds:['Family Campground','Group Camp'],sites:[],
  source:'https://dnr.wisconsin.gov/topic/parks/hartmancreek',
  notes:'Camping confirmed on park page; campground map is linked separately. Site labels not transcribed.'},
 {park:'Buckhorn State Park',state:'WI',
  campgrounds:['Family Campground','Group Camp','Cart-in Camping'],sites:[],
  source:'https://dnr.wisconsin.gov/topic/parks/buckhorn',
  notes:'Family, group and cart-in camping confirmed on official park page, site labels not transcribed.'}
,
 {park:'Amnicon Falls State Park',state:'WI',campgrounds:['Campground'],sites:[],source:'https://dnr.wisconsin.gov/topic/parks/amnicon/recreation/camping',notes:'36 family campsites, including two walk-in sites; numbers not listed in source.'},
 {park:'Big Bay State Park',state:'WI',campgrounds:['Family Campground','Outdoor Group Camp'],sites:['26','27','28','29','30'],source:'https://dnr.wisconsin.gov/topic/parks/bigbay/recreation/camping',notes:'Five winter plowed campsite IDs. Other 55 sites require map extraction; park campground closure may apply in 2026-27.'},
 {park:'Blue Mound State Park',state:'WI',campgrounds:['Family Campground','Bike/Hike-in Sites'],sites:['28','30','32'],source:'https://dnr.wisconsin.gov/topic/parks/bluemound/recreation/camping',notes:'28 and 32 listed as accessible; site 30 referenced as nearby shower facility. Other campsite identifiers not enumerated.'},
 {park:'Council Grounds State Park',state:'WI',campgrounds:['Family Campground','Group Campground'],sites:['A','B','C'],source:'https://dnr.wisconsin.gov/topic/parks/councilgrounds/recreation/camping',notes:'Group sites A, B, C verified; family site numbering not on page.'},
 {park:'Harrington Beach State Park',state:'WI',campgrounds:['Family Campground','Group Campsite','Kayak Campsite'],sites:['100'],source:'https://dnr.wisconsin.gov/topic/parks/harringtonbeach/recreation/camping',notes:'Site 100 identified as campground-host site; all other site identifiers need map inspection.'}
,
 {park:'Interstate State Park',state:'WI',campgrounds:['North Campground','South Campground','Group Camp'],sites:[],source:'https://dnr.wisconsin.gov/topic/parks/interstate/recreation/camping',notes:'82 family sites and two group areas; individual numbers need campground-map review.'},
 {park:'Merrick State Park',state:'WI',campgrounds:['North Campground','South Campground','Island Campground','Island Group Campsite'],sites:['6','11'],source:'https://dnr.wisconsin.gov/topic/parks/merrick/recreation/camping',notes:'North campsite 6 is accessible and campsite 11 is campground-host reference; other numbers need map.'},
 {park:'Mill Bluff State Park',state:'WI',campgrounds:['Family Campground'],sites:['7',...range(10,21)],source:'https://dnr.wisconsin.gov/topic/parks/millbluff/recreation/camping',notes:'DNR identifies 7 and sites 10-21 as flat/accessible; other numbers not on page.'},
 {park:'Nelson Dewey State Park',state:'WI',campgrounds:['Family Campground','Group Camp'],sites:['23'],source:'https://dnr.wisconsin.gov/topic/parks/nelsondewey/recreation/camping',notes:'Toilet/shower near site 23; other 44 family numbers not individually documented.'},
 {park:'New Glarus Woods State Park',state:'WI',campgrounds:['Drive-in Campground','Walk-to Campground','Group Camp','Lead Circle Campground'],sites:['52','53'],source:'https://dnr.wisconsin.gov/topic/parks/ngwoods/recreation/camping',notes:'DNR specifically names group sites 52 and accessible 53; remaining identifiers need map.'},
 {park:'Newport State Park',state:'WI',campgrounds:['Backpack Campsites'],sites:[],source:'https://dnr.wisconsin.gov/topic/parks/newport/recreation/camping',notes:'17 backpack sites including a group site; number list absent from page.'},
 {park:'Pattison State Park',state:'WI',campgrounds:['Family Campground','Backpack Campsites'],sites:[],source:'https://dnr.wisconsin.gov/topic/parks/pattison',notes:'Camping and campground construction documented; park map needed for numbers.'},
 {park:'Roche-A-Cri State Park',state:'WI',campgrounds:['Family Campground'],sites:[],source:'https://dnr.wisconsin.gov/topic/parks/rocheacri/recreation/camping',notes:'33 trailer/tent sites plus special sites; individual labels not on camping page.'},
 {park:'Rock Island State Park',state:'WI',campgrounds:['Walk-in Campsites','Group Campsites'],sites:[],source:'https://dnr.wisconsin.gov/topic/parks/rockisland/recreation/camping',notes:'40 primitive walk-in sites; individual site numbers require park map.'},
 {park:'Rocky Arbor State Park',state:'WI',campgrounds:['Family Campground'],sites:[],source:'https://dnr.wisconsin.gov/topic/parks/rockyarbor/recreation/camping',notes:'89 wooded family sites; campsite numbers not on page.'},
 {park:'Straight Lake State Park',state:'WI',campgrounds:['Hike-in Campsites'],sites:['4'],source:'https://dnr.wisconsin.gov/topic/parks/straightlake/recreation',notes:'Site 4 identified as accessible hike-in site. Ten total sites; remaining labels not on page.'},
 {park:'Tower Hill State Park',state:'WI',campgrounds:['Family Campground'],sites:['8'],source:'https://dnr.wisconsin.gov/topic/parks/towerhill/recreation',notes:'Ten tent sites; site 8 mentioned on official park trail description.'},
 {park:'Wildcat Mountain State Park',state:'WI',campgrounds:['Family Campground','Cart-in Campsites','Horse Campground','Outdoor Group Campground'],sites:['1','2','3'],source:'https://dnr.wisconsin.gov/topic/parks/wildcat/recreation/camping',notes:'Group sites 1, 2, 3 explicitly documented; not necessarily unique in other camping categories.'},
 {park:'Lake Kegonsa State Park',state:'WI',campgrounds:['Campground'],sites:[],source:'https://dnr.wisconsin.gov/topic/parks/lakekegonsa/recreation',notes:'Camping and accessible campsites confirmed in official recreation page; exact campground and sites need map.'},
 {park:'Lake Wissota State Park',state:'WI',campgrounds:['Campground'],sites:[],source:'https://dnr.wisconsin.gov/topic/parks/lakewissota',notes:'Camping confirmed, individual campground/site labels need map inspection.'}
,
 {park:'Governor Thompson State Park',state:'WI',campgrounds:['Family Campground'],sites:[],source:'https://dnr.wisconsin.gov/topic/parks/govthompson',notes:'Wisconsin DNR confirms a family campground but does not enumerate campsite IDs on the main park page.'}

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
 const wiStatus=typeof window!=='undefined'?window.AtlasWIParkStatus?.[slug]:null;
 const campgrounds=unique([...(entry?.campgrounds||[]),...officialMN]);
 return {entry:entry||null,campgrounds,loops:unique(entry?.loops||[]),sites:unique((entry?.sites||[]).map(String)),
  source:officialMN.length?'https://www.dnr.state.mn.us/data/reservation.html':entry?.source||wiStatus?.source||'',
  sourceStatus:officialMN.length?'official_facilities_listed':entry?'partial_reference':wiStatus?.status||'unverified',
  sourceNote:entry?.notes||wiStatus?.note||''};
}
return {version:3,reviewedAt:DATE,entries,findPark,suggestions};
});
