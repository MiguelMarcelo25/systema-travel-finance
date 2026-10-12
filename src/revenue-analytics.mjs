import {bookingCountry,countryName} from './countries.mjs';
export const seasonMonths={all:null,spring:[3,4,5],christmas:[12]};
const add=(map,key,row)=>{const item=map.get(key)||{name:key,total:0,count:0};item.total+=row.total;item.count++;map.set(key,item);};
const ranked=map=>[...map.values()].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name));
export function revenueAnalytics(records,{asOf,basis='booking',year='all',country='all',season='all'}={}) {
  const key=basis==='travel'?'travel_date':'date';
  const eligible=records.filter(row=>row.status!=='Cancelled'&&row.date<=asOf&&/^\d{4}-\d{2}-\d{2}$/.test(row[key]||'')).map(row=>({...row,country:bookingCountry(row)}));
  const availableYears=[...new Set(eligible.map(row=>row[key].slice(0,4)))].sort().reverse();
  const availableCountries=[...new Set(eligible.map(row=>row.country))].map(code=>({code:code||'unspecified',name:countryName(code)})).sort((a,b)=>a.name.localeCompare(b.name));
  const selected=eligible.filter(row=>(year==='all'||row[key].startsWith(year+'-'))&&(country==='all'||(row.country||'unspecified')===country)&&(!seasonMonths[season]||seasonMonths[season].includes(Number(row[key].slice(5,7)))));
  const months=new Map(),countries=new Map(),services=new Map(),categories=new Map();
  const calendar=Array.from({length:12},(_,index)=>({month:index+1,total:0,count:0}));
  for(const row of selected){add(months,row[key].slice(0,7),row);add(countries,row.country||'unspecified',row);add(services,row.service,row);add(categories,row.category,row);const month=calendar[Number(row[key].slice(5,7))-1];month.total+=row.total;month.count++;}
  if(year!=='all')for(let month=1;month<=12;month++){if(basis==='booking'&&`${year}-${String(month).padStart(2,'0')}`>asOf.slice(0,7))continue;if(seasonMonths[season]&&!seasonMonths[season].includes(month))continue;const name=`${year}-${String(month).padStart(2,'0')}`;if(!months.has(name))months.set(name,{name,total:0,count:0});}
  const monthly=[...months.values()].sort((a,b)=>a.name.localeCompare(b.name)).map(row=>({...row,month:row.name,value:row.total,partial:basis==='booking'&&row.name===asOf.slice(0,7),scheduled:basis==='travel'&&row.name>asOf.slice(0,7)}));
  const total=selected.reduce((sum,row)=>sum+row.total,0),countryRows=ranked(countries).map(row=>({...row,code:row.name,name:countryName(row.name),share:total?row.total/total:0}));
  const top=countryRows.filter(row=>row.code!=='unspecified'),bestCountries=top.length?top.filter(row=>row.total===top[0].total):[];
  const maximumMonth=Math.max(0,...monthly.map(item=>item.total));
  const bestMonths=monthly.filter(row=>row.total>0&&row.total===maximumMonth);
  return {asOf,basis,year,country,season,availableYears,availableCountries,total,bookings:selected.length,average:selected.length?Math.round(total/selected.length):0,monthly,calendar,countries:countryRows,services:ranked(services),categories:ranked(categories),bestCountries,bestMonths,unclassified:countryRows.find(row=>row.code==='unspecified')||null};
}
