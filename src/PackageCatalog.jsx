import { useState } from 'react';
import { MapPin, Search, Plane, Package } from 'lucide-react';
import { Button, Empty, Field } from './components';
import { money } from './utils';

export default function PackageCatalog({ packages, admin = false, onChoose }) {
  const [query, setQuery] = useState(''), [category, setCategory] = useState('all');
  const categories = [...new Set(packages.map(row => row.category))];
  const rows = packages.filter(row => (category === 'all' || row.category === category) && `${row.name} ${row.destination}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="package-catalog" aria-label={admin ? 'Manage travel packages' : 'Explore travel packages'}>
    <div className="catalog-intro"><div><h2>{admin ? 'Your package collection' : 'Where would you like to go?'}</h2><p>{admin ? 'Keep the destinations and base fares your clients see up to date.' : 'Find a package, choose your travel date, and send a request to the agency.'}</p></div><span className="catalog-count">{packages.length} package{packages.length !== 1 ? 's' : ''}</span></div>
    <div className="catalog-filters"><div className="catalog-search"><Search size={18} aria-hidden="true"/><input aria-label="Search packages or destinations" placeholder="Search packages or destinations" value={query} onChange={event=>setQuery(event.target.value)}/></div><Field label="Category" value={category} onChange={event=>setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(value=><option key={value}>{value}</option>)}</Field></div>
    {rows.length ? <div className="package-grid">{rows.map(row=><article className={`package-card ${!row.active ? 'package-inactive' : ''}`} key={row.id}><div className="package-card-top"><span>{row.category}</span>{admin && <span className="package-availability">{row.active ? 'Available' : 'Inactive'}</span>}</div><div className="package-destination"><MapPin size={17} aria-hidden="true"/>{row.destination}</div><h3>{row.name}</h3><div className="package-card-bottom"><div><span>Base price</span><strong>{money(row.price)}</strong></div><Button secondary={admin} onClick={()=>onChoose(row)}>{admin ? <Package size={16}/> : <Plane size={16}/>} {admin ? 'Edit package' : 'Request package'}</Button></div>{!admin && <p className="package-fare-note">Final fare is confirmed by the agency.</p>}</article>)}</div> : <Empty title={packages.length ? 'No matching packages' : 'New journeys are on the way'} description={packages.length ? 'Try another destination or category.' : admin ? 'Add your first package with a destination and base price.' : 'The agency hasn’t added any packages yet. Check back soon.'}/>}
  </section>;
}
