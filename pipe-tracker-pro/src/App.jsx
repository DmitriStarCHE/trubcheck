import { Outlet, NavLink } from 'react-router-dom'
import './App.css'
import logoImage from './assets/newlogo-dark-transparent.png'
import OfflineIndicator from './components/OfflineIndicator'

export default function App() {
  return (
    <div className="app-layout">
      <header className="app-header">
        <img src={logoImage} alt="Трубаметалл" className="app-logo" />
        <OfflineIndicator />
      </header>

      <main className="app-content">
        <Outlet />
      </main>

      <nav className="app-nav">
        <NavLink to="/" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="8" y1="10" x2="16" y2="10" />
            <line x1="8" y1="14" x2="12" y2="14" />
          </svg>
          <span>Калькулятор</span>
        </NavLink>
        <NavLink to="/accounting" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          <span>Учёт</span>
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>История</span>
        </NavLink>
      </nav>
    </div>
  )
}
