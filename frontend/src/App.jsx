import { BrowserRouter as Router, Navigate, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import ITEmployees from './pages/ITEmployees';
import NonITEmployees from './pages/NonITEmployees';
import Departments from './pages/Departments';
import EmployeeDetails from './pages/EmployeeDetails';
import Chat from './pages/Chat';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionRoute from './components/PermissionRoute';
import './App.css';

import { useState } from 'react';

function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-panel">
        <Navbar onMenuToggle={() => setSidebarOpen((prev) => !prev)} title="Employee AI" onLogout={logout} />

        <main className="content-area">
          <Routes>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/admin/employees" element={<PermissionRoute permission="ADMIN_EMPLOYEE_VIEW"><Employees /></PermissionRoute>} />
            <Route path="/it-employees" element={<ITEmployees />} />
            <Route path="/non-it-employees" element={<NonITEmployees />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/employee/:id" element={<EmployeeDetails />} />
            <Route path="/chat" element={<Chat />} />
          </Routes>
        </main>
      </div>
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
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
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
