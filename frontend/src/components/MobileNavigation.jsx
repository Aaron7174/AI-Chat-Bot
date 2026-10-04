import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function MobileNavigation({ onNavigate }) {
  const { hasPermission } = useAuth();
  const items = [
    { label: 'Home', path: '/', icon: '⌂', end: true },
    ...(hasPermission('VIEW_EMPLOYEES')
      ? [{ label: 'People', path: '/employees', icon: '▦' }]
      : []),
    ...(hasPermission('VIEW_ATTENDANCE') || hasPermission('VIEW_OWN_ATTENDANCE')
      ? [{ label: 'Attendance', path: '/attendance', icon: '◷' }]
      : []),
    ...(hasPermission('VIEW_ANALYTICS')
      ? [{ label: 'Analytics', path: '/analytics', icon: '▥' }]
      : []),
    ...(hasPermission('USE_AI')
      ? [{ label: 'AI', path: '/chat', icon: '✦' }]
      : []),
  ];

  return (
    <nav className="mobile-navigation" aria-label="Main navigation">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) => (isActive ? 'mobile-navigation-link active' : 'mobile-navigation-link')}
        >
          <span className="mobile-navigation-icon" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default MobileNavigation;
