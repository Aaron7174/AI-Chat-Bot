import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const menuItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'All Employees', path: '/employees' },
  { label: 'IT Employees', path: '/it-employees' },
  { label: 'Non-IT Employees', path: '/non-it-employees' },
  { label: 'Departments', path: '/departments' },
  { label: 'Chatbot', path: '/chat' },
];

function Sidebar({ isOpen, onClose }) {
  const { hasPermission } = useAuth();
  const visibleItems = hasPermission('ADMIN_EMPLOYEE_VIEW')
    ? [...menuItems, { label: 'Admin Management', path: '/admin/employees' }]
    : menuItems;

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h2>EMPLOYEE AI</h2>
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
            onClick={onClose}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

    </aside>
  );
}

export default Sidebar;
