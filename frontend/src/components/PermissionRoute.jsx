import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function PermissionRoute({ permission, children }) {
  const { hasPermission } = useAuth();

  return hasPermission(permission) ? children : <Navigate to="/" replace />;
}

export default PermissionRoute;
