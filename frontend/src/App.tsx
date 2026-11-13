import { useState } from 'react';
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';
import {
  Bell,
  Clapperboard,
  CreditCard,
  LayoutDashboard,
  Link2,
  LogOut,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet2,
  Workflow,
  Wand2,
} from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ContentStudio from './pages/ContentStudio';
import VideoStudio from './pages/VideoStudio';
import Affiliate from './pages/Affiliate';
import Advertiser from './pages/Advertiser';
import Team from './pages/Team';
import WorkflowBuilder from './pages/WorkflowBuilder';
import Subscription from './pages/Subscription';
import Wallet from './pages/Wallet';
import AdminPanel from './pages/AdminPanel';

const menuMain = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/video', label: 'AI Video Studio', icon: Clapperboard, badge: 'AI' },
  { to: '/affiliate', label: 'Affiliate Center', icon: Link2 },
  { to: '/workflow', label: 'Workflow Builder', icon: Workflow },
];

const menuGrowth = [
  { to: '/advertiser', label: 'Advertiser', icon: Megaphone },
  { to: '/team', label: 'Tim', icon: Users },
];

const menuWorkspace = [
  { to: '/content', label: 'Content Studio', icon: Wand2 },
  { to: '/subscription', label: 'Langganan', icon: CreditCard },
  { to: '/wallet', label: 'Wallet', icon: Wallet2 },
  { to: '/admin', label: 'Admin Panel', icon: ShieldCheck },
];

function NavItem({
  to,
  label,
  icon: Icon,
  badge,
}: {
  to: string;
  label: string;
  icon: any;
  badge?: string;
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
    >
      <Icon size={17} />
      <span>{label}</span>
      {badge && <span className="nav-badge">{badge}</span>}
    </NavLink>
  );
}

function Shell({ onLogout }: { onLogout: () => void }) {
  const user = JSON.parse(localStorage.getItem('cpai_user') || '{}');
  const initials = (user.email || 'CP').slice(0, 2).toUpperCase();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">
            <Sparkles size={18} />
          </div>
          <div className="logo-text">
            <div className="logo-title">Creative Partner</div>
            <div className="logo-sub">AI STUDIO</div>
          </div>
        </div>

        <div className="side-label">Main Menu</div>
        {menuMain.map(item => (
          <NavItem key={item.to} {...item} />
        ))}

        <div className="side-label">Growth</div>
        {menuGrowth.map(item => (
          <NavItem key={item.to} {...item} />
        ))}

        <div className="side-label">Workspace</div>
        {menuWorkspace.map(item => (
          <NavItem key={item.to} {...item} />
        ))}

        <div className="plan-card">
          <div className="plan-label">Your plan</div>
          <div className="plan-name">Studio Pro</div>
          <div className="plan-limit">
            <span>Monthly limit</span>
            <span>72%</span>
          </div>
          <div className="plan-bar">
            <span style={{ width: '72%' }} />
          </div>
          <NavLink to="/subscription" className="btn sm">
            Upgrade Plan
          </NavLink>
        </div>

        <div className="user-box">
          <div className="avatar">{initials}</div>
          <div className="user-meta">
            <div className="user-email">{user.email || 'Pengguna'}</div>
            <div className="user-role">Creator workspace</div>
          </div>
          <button className="icon-btn" onClick={onLogout} title="Logout">
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-right">
            <div className="status-pill">
              <span className="dot" />
              API connected
            </div>
            <button className="icon-btn" title="Notifikasi">
              <Bell size={15} />
            </button>
            <div className="avatar" style={{ width: 32, height: 32 }}>
              {initials}
            </div>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('cpai_token'));

  const logout = () => {
    localStorage.removeItem('cpai_token');
    localStorage.removeItem('cpai_user');
    setToken(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            token ? (
              <Navigate to="/" replace />
            ) : (
              <Login onLogin={() => setToken(localStorage.getItem('cpai_token'))} />
            )
          }
        />
        <Route
          element={
            token ? <Shell onLogout={logout} /> : <Navigate to="/login" replace />
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="content" element={<ContentStudio />} />
          <Route path="video" element={<VideoStudio />} />
          <Route path="affiliate" element={<Affiliate />} />
          <Route path="advertiser" element={<Advertiser />} />
          <Route path="team" element={<Team />} />
          <Route path="workflow" element={<WorkflowBuilder />} />
          <Route path="subscription" element={<Subscription />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="admin" element={<AdminPanel />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
