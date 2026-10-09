import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Logo } from './components';

export default function Sidebar({ items, mobile, onClose, label = 'Workspace' }) {
  const sections = label === 'Client workspace' ? [{ name: 'My workspace', keys: items.map(item => item.key) }] : [{ name: 'Workspace', keys: ['overview'] }, { name: 'Operations', keys: ['bookings', 'requests', 'customers', 'packages', 'documents'] }, { name: 'Finance', keys: ['payments', 'expenses', 'financial'] }, { name: 'Insights', keys: ['analytics', 'forecast', 'reports'] }, { name: 'Administration', keys: ['team'] }];
  const root = useRef(null);
  const [pinned, setPinned] = useState(true), [hovered, setHovered] = useState(false), [suppressHover, setSuppressHover] = useState(false), [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 1023px)').matches);
  function toggle() { setPinned(!pinned); setSuppressHover(pinned); setHovered(false); }
  function hover(event) { if (!suppressHover && !event.target.closest('.sidebar-toggle')) setHovered(true); }
  useEffect(() => { const media = window.matchMedia('(max-width: 1023px)'); const update = () => setNarrow(media.matches); update(); media.addEventListener('change', update); return () => media.removeEventListener('change', update); }, []);
  useEffect(() => {
    if (!mobile) return;
    const previous = document.body.style.overflow, opener = document.activeElement;
    document.body.style.overflow = 'hidden'; root.current.querySelector('.sidebar-mobile-close')?.focus();
    const keydown = event => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const targets = [...root.current.querySelectorAll('a, button:not(:disabled)')].filter(element => element.offsetParent !== null), first = targets[0], last = targets.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', keydown); opener?.focus(); };
  }, [mobile, onClose]);
  return <>{mobile && <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-navy/60 lg:hidden" onClick={onClose}/>}
    <aside ref={root} id="workspace-navigation" inert={narrow && !mobile} aria-label={label + ' navigation'} onMouseEnter={hover} onMouseOver={hover} onMouseLeave={() => { setHovered(false); setSuppressHover(false); }} className={`sidebar no-print ${mobile ? 'is-mobile-open' : ''} ${pinned ? 'is-pinned' : ''} ${hovered ? 'is-hovered' : ''} ${suppressHover ? 'is-collapsed' : ''}`}>
      <div className="sidebar-heading"><Link to="/app" aria-label="Systema overview" className="sidebar-brand"><Logo light/></Link><button type="button" aria-label={pinned ? 'Close sidebar' : 'Open sidebar'} aria-expanded={pinned} onClick={toggle} className="sidebar-toggle">{pinned ? <ChevronLeft size={19}/> : <ChevronRight size={19}/>}</button><button type="button" aria-label="Close navigation" onClick={onClose} className="sidebar-mobile-close"><X size={20}/></button></div>
      <nav aria-label={label} className="sidebar-nav">{sections.map(section => {
        const links = section.keys.map(key => items.find(item => item.key === key)).filter(Boolean);
        return links.length ? <div className="sidebar-section" key={section.name}><p className="sidebar-section-title">{section.name}</p>{links.map(({ key, name, icon: Icon, to, count }) => <NavLink key={key} to={to} end aria-label={name} title={name} onClick={onClose} className={({ isActive }) => `sidebar-link ${isActive ? 'is-active' : ''}`}><Icon size={20} strokeWidth={1.7} aria-hidden="true"/><span className="sidebar-text">{name}</span>{count > 0 && <span className="sidebar-count" aria-hidden="true">{count}</span>}</NavLink>)}</div> : null;
      })}</nav>
    </aside>
  </>;
}
