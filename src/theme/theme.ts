import { createTheme } from '@mui/material/styles';

/**
 * MUI 主题。Tailwind 仅用于布局/间距原子类，二者互不冲突。
 * 设计基调：深邃墨色 + 紫罗兰主色（"世界操作系统"的沉稳科技感）。
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#5b3cc4' },
    secondary: { main: '#e0a458' },
    background: { default: '#f6f5fb', paper: '#ffffff' },
    text: { primary: '#1f2330' },
  },
  typography: {
    fontFamily:
      'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif',
    h6: { fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});
