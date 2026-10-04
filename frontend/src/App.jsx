import { useState } from 'react';
import { BrowserRouter as Router, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import MobileNavigation from './components/MobileNavigation';
import PwaControls from './components/PwaControls';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import Employees from './pages/Employees';
import ITEmployees from './pages/ITEmployees';
import NonITEmployees from './pages/NonITEmployees';
import Departments from './pages/Departments';
import EmployeeDetails from './pages/EmployeeDetails';
import Chat from './pages/Chat';
import Attendance from './pages/Attendance';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionRoute from './components/PermissionRoute';
import './App.css';

function AppLayout() {
  const [openSidebarPath, setOpenSidebarPath] = useState(null);
  const { logout } = useAuth();
  const location = useLocation();
  const sidebarOpen = openSidebarPath === location.pathname;
  const isChatPage = location.pathname === '/chat';

  return (
    <div className={`app-shell${isChatPage ? ' chat-layout' : ''}`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setOpenSidebarPath(null)} />
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setOpenSidebarPath(null)}
        />
      )}

      <div className="main-panel">
        <Navbar
          onMenuToggle={() => setOpenSidebarPath(sidebarOpen ? null : location.pathname)}
          isMenuOpen={sidebarOpen}
          title="Employee AI"
          onLogout={logout}
        />

        <main className={`content-area${isChatPage ? ' chat-content-area' : ''}`}>
          <Routes>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/admin/employees" element={<PermissionRoute permission="ADMIN_EMPLOYEE_VIEW"><Employees isAdminManagement /></PermissionRoute>} />
            <Route path="/it-employees" element={<ITEmployees />} />
            <Route path="/non-it-employees" element={<NonITEmployees />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/employee/:id" element={<EmployeeDetails />} />
            <Route path="/chat" element={<Chat />} />
          </Routes>
        </main>
      </div>
      <MobileNavigation onNavigate={() => setOpenSidebarPath(null)} />
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  ) : (
    <div className="login-app-shell">
      <div className="login-pwa-toolbar"><PwaControls /></div>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;
