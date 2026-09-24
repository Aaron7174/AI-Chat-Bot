import { useAuth } from '../context/AuthContext';

function Navbar({ onMenuToggle, title, onLogout }) {
  const { user } = useAuth();

  return (
    <header className="topbar">
      <button className="menu-button" onClick={onMenuToggle} aria-label="Toggle menu">
        ☰
      </button>
      <h1>{title}</h1>
      <div className="navbar-account">
        <span className="online-dot" />
        <span>{user?.role || 'User'}</span>
        <button className="logout-button" type="button" onClick={onLogout}>Log out</button>
      </div>
    </header>
  );
}

export default Navbar;
