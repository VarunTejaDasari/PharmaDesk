import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useParams, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Products  from './pages/Products';
import Sales     from './pages/Sales';
import Purchases from './pages/Purchases';
import Expiry    from './pages/Expiry';       //  NEW
import Forecast  from './pages/Forecast';     //  NEW
import Payments  from './pages/Payments';     //  NEW
import Login     from './pages/Login';
import Register  from './pages/Register';
import './App.css';

function RequireAuth({ children }) {
  const token = localStorage.getItem('mt_token');
  const uid   = localStorage.getItem('mt_uid');
  if (!token || !uid) return <Navigate to="/login" replace />;
  return children;
}

function AppLayout() {
  const { uniqueId } = useParams();
  const navigate = useNavigate();
  const name = localStorage.getItem('mt_name') || 'User';

  const NAV_ITEMS = [
    { to: `/${uniqueId}`,            label: 'Dashboard', icon: '◈',  end: true },
    { to: `/${uniqueId}/products`,   label: 'Products',  icon: '▦'  },
    { to: `/${uniqueId}/sales`,      label: 'Sales',     icon: '↗'  },
    { to: `/${uniqueId}/purchases`,  label: 'Purchases', icon: '↙'  },
    { to: `/${uniqueId}/expiry`,     label: 'Expiry',    icon: '📅' },  //  NEW
    { to: `/${uniqueId}/forecast`,   label: 'Forecast',  icon: '📊' },  //  NEW
    { to: `/${uniqueId}/payments`,   label: 'Payments',  icon: '💳' },  //  NEW
  ];

  const handleLogout = () => {
    localStorage.removeItem('mt_token');
    localStorage.removeItem('mt_uid');
    localStorage.removeItem('mt_name');
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div style={{ padding: '24px 20px 4px', display:'flex', alignItems:'center', gap:'8px' }}>
          <span className="brand-icon">✚</span>
          <span className="brand-name">MediTrack</span>
        </div>
        <div className="uid-badge">ID: {uniqueId}</div>
        <nav className="nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer" style={{ flexDirection:'column', alignItems:'flex-start', gap:'8px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <div className="status-dot" />
            <span>{name}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>⏻ Logout</button>
        </div>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/products"   element={<Products />}  />
          <Route path="/sales"      element={<Sales />}     />
          <Route path="/purchases"  element={<Purchases />} />
          <Route path="/expiry"     element={<Expiry />}    />  {/*  NEW */}
          <Route path="/forecast"   element={<Forecast />}  />  {/*  NEW */}
          <Route path="/payments"   element={<Payments />}  />  {/*  NEW */}
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login"    element={<Login />}    />
        <Route path="/register" element={<Register />} />
        <Route
          path="/:uniqueId/*"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
