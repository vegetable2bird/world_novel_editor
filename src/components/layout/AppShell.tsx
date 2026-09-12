import { Outlet } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { NavRail, MobileNav } from './NavRail';
import WorkSwitcher from './WorkSwitcher';
import { useAutosave } from '../../hooks/useAutosave';

/**
 * 应用外壳：左侧导航（移动端为底部导航）+ 顶栏世界切换 + 路由出口。
 * 所有子页面共享同一 useWorkStore。
 */
export default function AppShell(): JSX.Element {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  useAutosave();

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100%' }}>
      {!isMobile && <NavRail />}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar variant="dense">
            <Typography variant="h6" sx={{ flexShrink: 0, mr: 2 }}>
              世界小说编辑器
            </Typography>
            <Box sx={{ flex: 1 }} />
            <WorkSwitcher />
          </Toolbar>
        </AppBar>
        <Box
          component="main"
          sx={{
            flex: 1,
            overflow: 'auto',
            p: isMobile ? 1 : 2,
            pb: isMobile ? 8 : 2,
          }}
        >
          <Outlet />
        </Box>
        {isMobile && <MobileNav />}
      </Box>
    </Box>
  );
}
