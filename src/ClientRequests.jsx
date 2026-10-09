import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2, CircleX, Clock3, Users } from 'lucide-react';
import { Badge, Empty } from './components';
import { pretty } from './utils';

export default function ClientRequests({ requests }) {
  if (!requests.length) return <Empty title="No requests yet" description="Choose a travel package and send your preferred date to the agency." action={<Link className="ui-text-link" to="/app/packages">Explore travel packages</Link>}/>;
  return <div className="traveler-requests">{requests.map(row => <article className="traveler-request" key={row.id}>
    <div className="traveler-request-top"><div><p>{row.destination}</p><h2>{row.service}</h2></div><Badge>{row.status}</Badge></div>
    <div className="traveler-request-facts"><span><CalendarDays size={16} aria-hidden="true"/>{pretty(row.travel_date)}</span><span><Users size={16} aria-hidden="true"/>{row.passengers} traveler{row.passengers !== 1 ? 's' : ''}</span></div>
    <div className="traveler-request-response">{row.status === 'Pending' ? <Clock3 size={20} aria-hidden="true"/> : row.status === 'Accepted' ? <CheckCircle2 size={20} aria-hidden="true"/> : <CircleX size={20} aria-hidden="true"/>}<div><h3>{row.status === 'Pending' ? 'Your request is with the agency' : row.status === 'Accepted' ? 'Your request has been accepted' : 'The agency has reviewed your request'}</h3><p>{row.decision_notes || (row.status === 'Pending' ? 'Your booking will be confirmed after the agency accepts your request.' : row.status === 'Accepted' ? 'View your booking for the confirmed fare and payment balance.' : 'This request was declined. You can explore other packages or submit a new request.')}</p>{row.booking_id && <Link className="ui-text-link" to="/app/bookings">View my bookings</Link>}</div></div>
    <p className="traveler-request-reference">Request {row.id}</p>
  </article>)}</div>;
}
