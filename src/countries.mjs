// ISO country/area choices: UN M49, plus TW; English labels via Intl.DisplayNames.
// Source: https://unstats.un.org/unsd/methodology/m49/overview/
import countries from './countries.json' with { type: 'json' };
export {countries};
const codes=new Set(countries.map(row=>row.code));
const names=new Map(countries.map(row=>[row.name.toLowerCase(),row.code]));
for(const [name,code] of Object.entries({'south korea':'KR','republic of korea':'KR','usa':'US','united states of america':'US','uk':'GB','vietnam':'VN','viet nam':'VN','russia':'RU','hong kong':'HK','macau':'MO'}))names.set(name,code);
export const validCountry=code=>typeof code==='string'&&(code===''||codes.has(code));
export const countryName=code=>countries.find(row=>row.code===code)?.name||'Country not specified';
export function countryFromDestination(destination){
  if(typeof destination!=='string')return '';
  const normalized=destination.trim().toLowerCase(),exact=names.get(normalized);
  if(exact)return exact;
  const parts=normalized.split(',').map(part=>part.trim());
  return parts.length===2&&!names.has(parts[0])?names.get(parts[1])||'':'';
}
export const bookingCountry=row=>row.country||countryFromDestination(row.destination);
