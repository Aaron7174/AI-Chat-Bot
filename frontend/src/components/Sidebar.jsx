import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import employeeAiLogo from '../assets/employee-assistant-logo.svg';

const menuItems = [
  { label: 'Dashboard', path: '/', icon: '⌂' },
  { label: 'Analytics', path: '/analytics', icon: '▥' },
  { label: 'All Employees', path: '/employees', icon: '◉' },
  { label: 'IT Employees', path: '/it-employees', icon: '◇' },
  { label: 'Non-IT Employees', path: '/non-it-employees', icon: '◌' },
  { label: 'Departments', path: '/departments', icon: '▦' },
  { label: 'Chatbot', path: '/chat', icon: '✳' },
];

function Sidebar({ isOpen, onClose }) {
  const { hasPermission } = useAuth();
  const visibleItems = [
    ...menuItems,
    ...(hasPermission('VIEW_ATTENDANCE') || hasPermission('VIEW_OWN_ATTENDANCE')
      ? [{ label: 'Attendance', path: '/attendance', icon: '◷' }]
      : []),
    ...(hasPermission('ADMIN_EMPLOYEE_VIEW')
      ? [{ label: 'Admin Management', path: '/admin/employees', icon: '⚙' }]
      : []),
  ];

  return (
    <aside id="primary-sidebar" className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand-mark">
          <img src={employeeAiLogo} alt="Employee AI logo" />
        </div>
        <div className="sidebar-brand-copy">
          <h2>EMPLOYEE AI</h2>
          <span>WORKFORCE INTELLIGENCE</span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        <span className="sidebar-nav-label">WORKSPACE</span>
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
            onClick={onClose}
          >
            <span className="nav-item-icon" aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

    </aside>
  );
}

export default Sidebar;
