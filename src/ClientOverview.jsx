import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, FileText, MapPin, Users, Wallet } from 'lucide-react';
import { Badge, Card, DataTable } from './components';
import { money, pretty, sum, today } from './utils';
import TravelVideo from './TravelVideo';

export default function ClientOverview({ data, bookingColumns }) {
  const active = data.bookings.filter(row => row.status !== 'Cancelled');
  const next = active.filter(row => row.travel_date >= today() && row.status !== 'Completed').sort((a, b) => a.travel_date.localeCompare(b.travel_date))[0];
  const pending = data.requests.filter(row => row.status === 'Pending').length;
  const balance = sum(active, 'total') - sum(active, 'paid');
  return <div className="traveler-overview">
    <section className="traveler-journey" aria-labelledby="next-journey-title">
      <div className="traveler-journey-content">
        <h2 id="next-journey-title">{next ? 'Your next journey' : 'Where will your next journey take you?'}</h2>
        {next ? <>
          <div className="traveler-destination"><MapPin size={18} aria-hidden="true"/>{next.destination}</div>
          <h3>{next.service}</h3>
          <div className="traveler-trip-facts"><span><CalendarDays size={17} aria-hidden="true"/>{pretty(next.travel_date)}</span><span><Users size={17} aria-hidden="true"/>{next.passengers} traveler{next.passengers !== 1 ? 's' : ''}</span><Badge>{next.status}</Badge></div>
          <Link className="traveler-primary-link" to="/app/bookings">View my bookings<ArrowUpRight size={17} aria-hidden="true"/></Link>
        </> : <><p>Browse the agency’s packages, find a destination, and send a booking request when you’re ready.</p><Link className="traveler-primary-link" to="/app/packages">Explore travel packages<ArrowUpRight size={17} aria-hidden="true"/></Link></>}
      </div>
      <TravelVideo/>
    </section>
    <section className="traveler-status" aria-label="Your travel summary">
      <Link to="/app/requests"><CalendarDays size={21} aria-hidden="true"/><span><strong>{pending} request{pending !== 1 ? 's' : ''} in review</strong><small>{pending ? 'Track the agency’s response' : 'See your request history'}</small></span><ArrowUpRight size={17} aria-hidden="true"/></Link>
      <Link to="/app/bookings"><Wallet size={21} aria-hidden="true"/><span><strong>{money(balance)} outstanding</strong><small>View balances by booking</small></span><ArrowUpRight size={17} aria-hidden="true"/></Link>
      <Link to="/app/documents"><FileText size={21} aria-hidden="true"/><span><strong>Prepare your documents</strong><small>Upload and track your requirements</small></span><ArrowUpRight size={17} aria-hidden="true"/></Link>
    </section>
    <Card className="client-records"><div className="ui-section-heading"><div><h2>My recent bookings</h2><p>Your latest journeys and payment status.</p></div><Link className="ui-text-link" to="/app/bookings">View all bookings<ArrowUpRight size={16} aria-hidden="true"/></Link></div><DataTable caption="My recent bookings" rows={data.bookings.slice(0, 5)} columns={bookingColumns} empty={{ title: 'Your first journey starts with a request', description: 'Explore the packages and send your preferred date to the agency.', action: <Link className="ui-text-link" to="/app/packages">Explore packages</Link> }}/></Card>
  </div>;
}
