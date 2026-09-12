import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import WorldPage from './pages/WorldPage';
import ConsolePage from './pages/ConsolePage';
import ChapterListPage from './pages/ChapterListPage';
import EditorPage from './pages/EditorPage';
import SettingsPage from './pages/SettingsPage';

/**
 * 同一作品下 world / console / chapters / editor 路由，共享 store。
 * 所有路由都包裹在 AppShell（侧栏导航 + 顶栏世界切换）内。
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/world" replace /> },
      { path: 'world', element: <WorldPage /> },
      { path: 'console', element: <ConsolePage /> },
      { path: 'chapters', element: <ChapterListPage /> },
      { path: 'chapters/:chapterId', element: <EditorPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/world" replace /> },
    ],
  },
]);
