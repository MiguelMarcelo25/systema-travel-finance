import test from 'node:test';
import assert from 'node:assert/strict';
import { packageForecast } from '../src/package-forecast.mjs';
const packages=[{id:'a',name:'Island escape',destination:'Palawan',active:1},{id:'b',name:'City break',destination:'Manila',active:1},{id:'c',name:'New package',destination:'Bohol',active:1},{id:'d',name:'Retired',destination:'Cebu',active:0}];
const records=[];
for(let month=1;month<=8;month++)for(const [id,count,price] of [['a',4,1000],['b',2,5000],['d',10,8000]])for(let n=0;n<count;n++)records.push({package_id:id,date:`2026-${String(month).padStart(2,'0')}-10`,total:price,status:'Completed'});
test('package ranking distinguishes demand from revenue and excludes inactive, cancelled and future records',()=>{
  const forecast=packageForecast(packages,records,{asOf:'2026-09-10',horizon:3});
  assert.equal(forecast.projected[0].id,'a');assert.equal(forecast.projected[0].estimate,12);assert.equal(forecast.projected[1].estimate,6);
  assert.equal(forecast.unavailable.length,2);assert.equal(forecast.unavailable.find(row=>row.id==='c').estimate,null);
  assert.equal(packageForecast(packages,records,{asOf:'2026-09-10',metric:'sales'}).projected[0].id,'b');
  const dirty=packageForecast(packages,[...records,{package_id:'b',date:'2026-08-15',total:999999,status:'Cancelled'},{package_id:'b',date:'2026-12-01',total:999999,status:'Confirmed'}],{asOf:'2026-09-10',horizon:3});
  assert.deepEqual(dirty,forecast);
});
test('current partial month affects recorded sales only; unlinked bookings and ties are explicit',()=>{
  const updated=packageForecast(packages,[...records,{package_id:'b',date:'2026-09-02',total:123,status:'Confirmed'},{package_id:null,date:'2026-08-02',total:123,status:'Completed'}],{asOf:'2026-09-10'});
  assert.equal(updated.projected.find(row=>row.id==='b').estimate,6);assert.equal(updated.historical.find(row=>row.id==='b').bookings,17);assert.equal(updated.unlinkedBookings,1);
  const tied=packageForecast(packages,records.map(row=>({...row,total:100})),{metric:'sales',asOf:'2026-09-10'});assert.equal(tied.projected[0].id,'a');
  const copy=[...records.filter(row=>row.package_id==='a'),...records.filter(row=>row.package_id==='a').map(row=>({...row,package_id:'b'}))];
  assert.deepEqual(packageForecast(packages,copy,{asOf:'2026-09-10'}).projected.map(row=>row.rank),[1,1]);
});
