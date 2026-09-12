import { ThemeProvider, CssBaseline } from '@mui/material';
import { RouterProvider } from 'react-router-dom';
import { theme } from './theme/theme';
import { router } from './router';

/**
 * 应用根组件：装配 MUI 主题与路由。
 * 所有页面共享同一 useWorkStore（以 worldId 为键），状态永不分裂。
 */
export default function App(): JSX.Element {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RouterProvider router={router} />
    </ThemeProvider>
  );
}
