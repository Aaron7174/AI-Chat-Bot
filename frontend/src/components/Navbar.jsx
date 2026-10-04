import { useAuth } from '../context/AuthContext';
import PwaControls from './PwaControls';

function Navbar({ onMenuToggle, isMenuOpen, title, onLogout }) {
  const { user } = useAuth();

  return (
    <header className="topbar">
      <button
        className="menu-button"
        onClick={onMenuToggle}
        aria-label="Toggle menu"
        aria-expanded={isMenuOpen}
        aria-controls="primary-sidebar"
      >
        ☰
      </button>
      <div className="topbar-title-wrap">
        <span className="topbar-eyebrow">WORKSPACE</span>
        <h1>{title}</h1>
      </div>
      <div className="navbar-account">
        <span className="navbar-role">{user?.role || 'User'}</span>
        <span className="navbar-avatar" aria-hidden="true">
          {(user?.name || user?.role || 'U').trim().charAt(0).toUpperCase()}
        </span>
        <PwaControls />
        <button className="logout-button" type="button" onClick={onLogout}>Log out</button>
      </div>
    </header>
  );
}

export default Navbar;
