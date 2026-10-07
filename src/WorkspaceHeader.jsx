import { useEffect } from 'react';
import { CalendarDays, ChevronRight, Menu } from 'lucide-react';
import AccountMenu from './AccountMenu';
import { today } from './utils';

export default function WorkspaceHeader({ agency, page, user, refreshSession, mobile, onOpen }) {
  useEffect(() => { document.body.dataset.workspace = 'true'; return () => { delete document.body.dataset.workspace; }; }, []);
  const date = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(today() + 'T12:00:00'));
  return <header className="workspace-header no-print">
    <div className="workspace-breadcrumb"><button type="button" aria-label="Open navigation" aria-expanded={mobile} aria-controls="workspace-navigation" className="workspace-menu-button lg:hidden" onClick={onOpen}><Menu size={20} aria-hidden="true"/></button><span className="workspace-agency">{agency || 'Systema Travel'}</span><ChevronRight size={14} className="workspace-breadcrumb-separator" aria-hidden="true"/><span className="workspace-current-page">{page}</span></div>
    <div className="workspace-header-end"><span className="workspace-date"><CalendarDays size={15} aria-hidden="true"/>{date}</span><AccountMenu user={user} refreshSession={refreshSession}/></div>
  </header>;
}
