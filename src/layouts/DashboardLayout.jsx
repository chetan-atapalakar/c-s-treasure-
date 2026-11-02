import { useCallback, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Button from '../components/Button.jsx';
import Modal from '../components/Modal.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { supabase } from '../services/supabase.js';
import { NAV_ITEMS } from '../utils/navigation.js';
import { initials } from '../utils/format.js';
import '../styles/layout.css';

const MAIN = NAV_ITEMS.filter((i) => !i.menu);
const MOBILE = NAV_ITEMS.filter((i) => i.mobile);
const MORE = NAV_ITEMS.filter((i) => !i.mobile);

function useOutside(ref, onOutside, active) {
  useEffect(() => {
    if (!active) return undefined;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref, onOutside, active]);
}

export default function DashboardLayout() {
  const { profile, user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('cus.collapsed') === '1';
    } catch {
      return false;
    }
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [search, setSearch] = useState('');

  const menuRef = useRef(null);
  const notifRef = useRef(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const closeNotif = useCallback(() => setNotifOpen(false), []);
  useOutside(menuRef, closeMenu, menuOpen);
  useOutside(notifRef, closeNotif, notifOpen);

  useEffect(() => {
    try {
      localStorage.setItem('cus.collapsed', collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const loadNotifs = useCallback(async () => {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(8);
    if (data) setNotifs(data);
  }, []);

  // On entering the app: post any due recurring transactions, then load notifications.
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.rpc('run_due_recurring');
      if (active && !error && data > 0) toast.info(`${data} recurring transaction${data > 1 ? 's' : ''} posted.`);
      if (active) loadNotifs();
    })();
    return () => {
      active = false;
    };
  }, [loadNotifs, toast]);

  useEffect(() => {
    setMenuOpen(false);
    setNotifOpen(false);
    setMoreOpen(false);
  }, [location.pathname]);

  const unread = notifs.filter((n) => !n.read).length;

  async function toggleNotifs() {
    if (notifOpen) {
      setNotifOpen(false);
      setNotifs((list) => list.map((n) => ({ ...n, read: true })));
      return;
    }
    setNotifOpen(true);
    setMenuOpen(false);
    if (unread > 0) await supabase.from('notifications').update({ read: true }).eq('read', false);
  }

  function onSearch(e) {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/transactions?q=${encodeURIComponent(q)}` : '/transactions');
  }

  async function confirmLogout() {
    setLoggingOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      toast.error('Could not log out. Please try again.');
      setLoggingOut(false);
    }
  }

  const displayName = profile?.full_name || user?.email || '';

  return (
    <div className={`app-shell ${collapsed ? 'is-collapsed' : ''}`}>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar__brand">
          <img src="/logo.svg" alt="" />
          <span>CüS Treasure</span>
        </div>
        <nav className="stack" style={{ gap: 6 }}>
          {MAIN.map((item) => (
            <NavLink key={item.path} to={item.path} className="nav-link" title={item.label}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__spacer" />
        <button type="button" className="nav-link nav-link--button" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} />
          <span>Collapse</span>
        </button>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar__left show-mobile">
            <img src="/logo.svg" alt="CüS Treasure" width="34" height="34" />
          </div>
          <form className="topbar__search" onSubmit={onSearch} role="search">
            <div className="field__wrap">
              <span className="field__icon"><Icon name="search" size={18} /></span>
              <input className="field__input field__input--icon" type="search" placeholder="Search transactions" aria-label="Search transactions" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </form>
          <div className="topbar__right">
            <Button variant="ghost" iconOnly icon={theme === 'dark' ? 'sun' : 'moon'} aria-label="Toggle theme" onClick={toggle} />

            <div className="menu-anchor" ref={notifRef}>
              <Button variant="ghost" iconOnly icon="bell" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={notifOpen} onClick={toggleNotifs} />
              {unread > 0 && <span className="bell-badge" aria-hidden="true">{unread}</span>}
              {notifOpen && (
                <div className="dropdown" role="region" aria-label="Notifications">
                  <div className="dropdown__head"><strong>Notifications</strong></div>
                  {notifs.length === 0 ? (
                    <p className="muted" style={{ padding: '14px 12px' }}>You’re all caught up.</p>
                  ) : (
                    notifs.map((n) => (
                      <div key={n.id} className={`notif ${n.read ? '' : 'unread'}`}>
                        <strong>{n.title}</strong>
                        {n.body && <span>{n.body}</span>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="menu-anchor" ref={menuRef}>
              <button type="button" className="avatar" aria-label="Open profile menu" aria-expanded={menuOpen} onClick={() => { setMenuOpen((o) => !o); setNotifOpen(false); }}>
                {initials(profile?.full_name, user?.email)}
              </button>
              {menuOpen && (
                <div className="dropdown" role="menu">
                  <div className="dropdown__head">
                    <strong>{profile?.full_name || 'Your account'}</strong>
                    <span className="muted" style={{ fontSize: '0.82rem', wordBreak: 'break-all' }}>{user?.email}</span>
                  </div>
                  <NavLink to="/profile" className="dropdown__item" role="menuitem"><Icon name="user" size={18} />Profile</NavLink>
                  <NavLink to="/settings" className="dropdown__item" role="menuitem"><Icon name="settings" size={18} />Settings</NavLink>
                  <button type="button" className="dropdown__item dropdown__item--danger" role="menuitem" onClick={() => { setMenuOpen(false); setLogoutOpen(true); }}>
                    <Icon name="logout" size={18} />Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </div>

      <nav className="bottom-nav" aria-label="Primary">
        {MOBILE.map((item) => (
          <NavLink key={item.path} to={item.path} className="nav-link">
            <Icon name={item.icon} size={22} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button type="button" className="nav-link nav-link--button" onClick={() => setMoreOpen(true)}>
          <Icon name="menu" size={22} />
          <span>More</span>
        </button>
      </nav>

      <Modal open={moreOpen} title="More" onClose={() => setMoreOpen(false)}>
        <div className="more-grid">
          {MORE.map((item) => (
            <NavLink key={item.path} to={item.path} className="dropdown__item">
              <Icon name={item.icon} size={20} />{item.label}
            </NavLink>
          ))}
          <button type="button" className="dropdown__item dropdown__item--danger" onClick={() => { setMoreOpen(false); setLogoutOpen(true); }}>
            <Icon name="logout" size={20} />Log out
          </button>
        </div>
      </Modal>

      <Modal
        open={logoutOpen}
        title="Log out?"
        onClose={() => !loggingOut && setLogoutOpen(false)}
        footer={
          <>
            <Button onClick={() => setLogoutOpen(false)} disabled={loggingOut}>Stay</Button>
            <Button variant="danger" loading={loggingOut} onClick={confirmLogout}>Log out</Button>
          </>
        }
      >
        <p className="muted">You’ll need to log in again to see {displayName ? `${displayName.split(' ')[0]}’s` : 'your'} treasury.</p>
      </Modal>
    </div>
  );
}