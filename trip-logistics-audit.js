const fs=require('fs');
const TripItinerary=require('./trip-itinerary.js');
function assert(ok,msg){if(!ok)throw new Error(msg)}
const ui=fs.readFileSync('./trip-logistics-v119.js','utf8');
const sync=fs.readFileSync('./trip-logistics-sync-v119.js','utf8');
const booklet=fs.readFileSync('./trip-booklet-logistics-v119.js','utf8');
new Function(ui);new Function(sync);new Function(booklet);
for(const token of ['TRIP BASICS','SAFETY + LOGISTICS','GENERAL NOTES','Trip duration','optional override','End date cannot be before the start date.','lodgingNotes','resupplyNotes'])assert(ui.includes(token),`Logistics UI missing ${token}`);
for(const token of ['endDateMode','manual','auto','addDays','TripItinerary?.dayCount','saveTripLogisticsBtn'])assert(sync.includes(token),`Date sync missing ${token}`);
for(const token of ['Lodging / non-park stays','Resupply / fuel / supplies','booklet-trip-logistics','trip-logistics-saved'])assert(booklet.includes(token),`Booklet logistics patch missing ${token}`);
const trip={startDate:'2026-09-12',parks:['a','b','c'],dayCount:3,stopMeta:{a:{day:'1'},b:{day:'2'},c:{day:'3'}}};
assert(TripItinerary.dayCount(trip)===3,'Explicit itinerary day count regression');
TripItinerary.addDayToTrip(trip);assert(TripItinerary.dayCount(trip)===4,'Add day regression affecting logistics dates');
TripItinerary.removeDayFromTrip(trip,2);assert(TripItinerary.dayCount(trip)===3,'Remove day regression affecting logistics dates');
console.log('Trip logistics audit passed: grouped trip-wide fields, itinerary-aware date mode, date validation, lodging/resupply persistence and booklet carry-through.');
