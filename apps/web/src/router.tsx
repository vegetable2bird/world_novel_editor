import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useUi } from './store/ui';
import { Login } from './pages/Login';
import { Worlds } from './pages/Worlds';
import { WorldDetail } from './pages/WorldDetail';
import { Books } from './pages/Books';
import { Characters } from './pages/Characters';
import { Dashboard } from './pages/Dashboard';
import { Editor } from './pages/Editor';
import { Console } from './pages/Console';
import { Settings } from './pages/Settings';
import { AppShell } from './components/AppShell';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useUi((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const shell = (page: React.ReactNode) => (
  <RequireAuth>
    <AppShell>{page}</AppShell>
  </RequireAuth>
);

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/dashboard', element: shell(<Dashboard />) },
  { path: '/wanjie', element: shell(<Worlds />) },
  { path: '/wanjie/:worldId', element: shell(<WorldDetail />) },
  { path: '/books', element: shell(<Books />) },
  { path: '/characters', element: shell(<Characters />) },
  { path: '/editor', element: shell(<Editor />) },
  { path: '/console', element: shell(<Console />) },
  { path: '/settings', element: shell(<Settings />) },
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
