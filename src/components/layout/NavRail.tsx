import { NavLink, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from '@mui/material';
import PublicIcon from '@mui/icons-material/Public';
import HubIcon from '@mui/icons-material/Hub';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';

export interface NavItem {
  to: string;
  label: string;
  icon: JSX.Element;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/world', label: '世界观', icon: <PublicIcon /> },
  { to: '/console', label: '操作台', icon: <HubIcon /> },
  { to: '/chapters', label: '章节', icon: <MenuBookIcon /> },
  { to: '/characters', label: '角色', icon: <PeopleIcon /> },
  { to: '/settings', label: '设置', icon: <SettingsIcon /> },
];

/** 桌面端：左侧导航栏（Navigation Rail）。 */
export function NavRail(): JSX.Element {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 132,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 132,
          boxSizing: 'border-box',
          borderRight: '1px solid',
          borderColor: 'divider',
        },
      }}
    >
      <List sx={{ mt: 1 }}>
        {NAV_ITEMS.map((item) => (
          <ListItemButton
            key={item.to}
            component={NavLink}
            to={item.to}
            sx={{
              flexDirection: 'column',
              alignItems: 'center',
              borderRadius: 2,
              mx: 1,
              my: 0.5,
              '&.active': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 0, justifyContent: 'center' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              primaryTypographyProps={{ fontSize: 12, textAlign: 'center' }}
            />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}

/** 移动端：底部导航。 */
export function MobileNav(): JSX.Element {
  const location = useLocation();
  const current = NAV_ITEMS.find((i) =>
    location.pathname.startsWith(i.to),
  )?.to;
  return (
    <Paper
      sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200 }}
      elevation={3}
    >
      <BottomNavigation
        showLabels
        value={current ?? '/world'}
        onChange={(_, v) => {
          window.location.hash = ''; // no-op，保留导航语义
        }}
      >
        {NAV_ITEMS.map((item) => (
          <BottomNavigationAction
            key={item.to}
            component={NavLink}
            to={item.to}
            label={item.label}
            icon={item.icon}
            value={item.to}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
