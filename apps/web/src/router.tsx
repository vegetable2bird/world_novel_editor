import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useUi } from './store/ui';
import { Login } from './pages/Login';
import { Worlds } from './pages/Worlds';
import { Books } from './pages/Books';
import { Characters } from './pages/Characters';
import { AppShell } from './components/AppShell';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useUi((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/wanjie',
    element: (
      <RequireAuth>
        <AppShell>
          <Worlds />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: '/books',
    element: (
      <RequireAuth>
        <AppShell>
          <Books />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    path: '/characters',
    element: (
      <RequireAuth>
        <AppShell>
          <Characters />
        </AppShell>
      </RequireAuth>
    ),
  },
  { path: '/', element: <Navigate to="/wanjie" replace /> },
  { path: '*', element: <Navigate to="/wanjie" replace /> },
]);
