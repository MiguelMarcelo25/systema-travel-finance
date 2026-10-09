import { useState } from 'react';
import { MapPin, Search, Plane, Package, Hotel, FileText, Compass, SlidersHorizontal } from 'lucide-react';
import { Button, Empty, Field } from './components';
import { money } from './utils';

const categoryIcons = { 'Tour package': Compass, 'Flight booking': Plane, 'Hotel reservation': Hotel, 'Visa assistance': FileText };
export default function PackageCatalog({ packages, admin = false, onChoose }) {
  const [query, setQuery] = useState(''), [category, setCategory] = useState('all'), [sort, setSort] = useState('name');
  const categories = [...new Set(packages.map(row => row.category))];
  const rows = packages.filter(row => (category === 'all' || row.category === category) && `${row.name} ${row.destination}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => sort === 'price-low' ? a.price - b.price : sort === 'price-high' ? b.price - a.price : a.name.localeCompare(b.name));
  const filtered = query || category !== 'all';
  function reset() { setQuery(''); setCategory('all'); setSort('name'); }
  return <section className="package-catalog" aria-label={admin ? 'Manage travel packages' : 'Explore travel packages'}>
    <div className="catalog-intro"><div><h2>{admin ? 'Your package collection' : 'Find your next destination'}</h2><p>{admin ? 'Manage the destinations and base fares shown to your clients.' : 'Compare the agency’s packages and request a date that works for you.'}</p></div><Compass size={36} aria-hidden="true"/></div>
    <div className="catalog-filters"><label className="catalog-search"><span>Destination or package</span><div><Search size={18} aria-hidden="true"/><input placeholder="Where would you like to go?" value={query} onChange={event => setQuery(event.target.value)}/></div></label><Field label="Category" value={category} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map(value => <option key={value}>{value}</option>)}</Field><Field label="Sort by" value={sort} onChange={event => setSort(event.target.value)}><option value="name">Package name</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></Field></div>
    <div className="catalog-results"><p role="status">{rows.length} of {packages.length} package{packages.length !== 1 ? 's' : ''}{filtered ? ' match your search' : ' in the collection'}</p>{filtered && <button type="button" onClick={reset}><SlidersHorizontal size={15} aria-hidden="true"/>Clear filters</button>}{!admin && <span>Final fares are confirmed by the agency.</span>}</div>
    {rows.length ? <div className="package-grid">{rows.map(row => { const Icon = categoryIcons[row.category] || Package; return <article className={`package-card ${!row.active ? 'package-inactive' : ''}`} key={row.id}>
      <div className="package-card-top"><span className="package-category"><Icon size={20} aria-hidden="true"/>{row.category}</span>{admin && <span className="package-availability">{row.active ? 'Available' : 'Inactive'}</span>}</div>
      <div className="package-destination"><MapPin size={16} aria-hidden="true"/>{row.destination}</div><h3>{row.name}</h3>
      <div className="package-card-bottom"><div><span>Base price</span><strong>{money(row.price)}</strong></div><Button secondary={admin} onClick={() => onChoose(row)}>{admin ? 'Edit package' : 'Request package'}</Button></div>
    </article>; })}</div> : <Empty title={packages.length ? 'No packages match these filters' : 'New journeys are on the way'} description={packages.length ? 'Try another destination or clear the filters to see all packages.' : admin ? 'Add your first package with a destination and base price.' : 'The agency hasn’t added any packages yet. Check back soon.'} action={filtered && <Button secondary onClick={reset}>Show all packages</Button>}/>}
  </section>;
}
