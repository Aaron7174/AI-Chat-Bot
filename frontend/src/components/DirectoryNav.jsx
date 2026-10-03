import { Link, useLocation } from 'react-router-dom';

const employeeCategories = [
  { label: 'All employees', to: '/employees' },
  { label: 'IT team', to: '/it-employees' },
  { label: 'Non-IT team', to: '/non-it-employees' },
];

function DirectoryNav() {
  const location = useLocation();

  return (
    <nav className="directory-nav" aria-label="Employee directory sections">
      {employeeCategories.map(({ label, to }) => (
        <Link key={to} className={`directory-nav-link${location.pathname === to ? ' active' : ''}`} to={to}>
          {label}
        </Link>
      ))}
      <Link className={`directory-nav-link directory-departments-link${location.pathname === '/departments' ? ' active' : ''}`} to="/departments">Departments</Link>
    </nav>
  );
}

export default DirectoryNav;
