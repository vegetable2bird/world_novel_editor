import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useUi } from './store/ui';
import { Login } from './pages/Login';
import { WanJie } from './pages/WanJie';

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
        <WanJie />
      </RequireAuth>
    ),
  },
  { path: '/', element: <Navigate to="/wanjie" replace /> },
  { path: '*', element: <Navigate to="/wanjie" replace /> },
]);
