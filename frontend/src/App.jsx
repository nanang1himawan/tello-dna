import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Departments from './pages/Departments';
import Projects from './pages/Projects';
import Board from './pages/Board';
import Backlog from './pages/Backlog';
import ListView from './pages/ListView';
import Calendar from './pages/Calendar';
import Workload from './pages/Workload';
import Reports from './pages/Reports';
import Timeline from './pages/Timeline';
import TableView from './pages/TableView';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Role-based redirect component
function RoleBasedRedirect() {
  const { user } = useAuth();

  // Admin and manager go to dashboard, others go to projects
  if (user?.role === 'admin' || user?.role === 'manager') {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/projects" replace />;
}

// Protected route for admin/manager only pages
function AdminManagerRoute({ children }) {
  const { user } = useAuth();

  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return <Navigate to="/projects" replace />;
  }
  return children;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={
                <AdminManagerRoute>
                  <Dashboard />
                </AdminManagerRoute>
              } />
              <Route path="/users" element={<Users />} />
              <Route path="/departments" element={<Departments />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:projectId" element={<Board />} />
              <Route path="/projects/:projectId/boards/:boardId" element={<Board />} />
              <Route path="/projects/:projectId/backlog" element={<Backlog />} />
              <Route path="/projects/:projectId/timeline" element={<Timeline />} />
              <Route path="/projects/:projectId/table" element={<TableView />} />
              <Route path="/issues" element={<ListView />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/workload" element={<Workload />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<ComingSoon title="Settings" />} />
            </Route>

            {/* Default Redirect - role based */}
            <Route path="/" element={<RoleBasedRedirect />} />
            <Route path="*" element={<RoleBasedRedirect />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// Temporary placeholder for upcoming pages
function ComingSoon({ title }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="text-6xl mb-4">🚧</div>
      <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
      <p className="text-text-muted">Halaman ini akan tersedia di fase berikutnya.</p>
    </div>
  );
}

export default App;

