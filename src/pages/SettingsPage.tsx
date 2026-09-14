import { Box, Typography, Paper, Alert, Divider, Link } from '@mui/material';
import StyleConfigPanel from '../components/generation/StyleConfigPanel';
import AIModelConfigPanel from '../components/settings/AIModelConfigPanel';
import WorldIoMenu from '../components/common/WorldIoMenu';
import { useCurrentWorldId } from '../hooks/useWorldState';

/**
 * 设置页：风格配置 + AI 密钥/后端说明 + 云同步状态。
 */
export default function SettingsPage(): JSX.Element {
  const worldId = useCurrentWorldId();

  return (
    <Box sx={{ maxWidth: 760 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        设置
      </Typography>

      <AIModelConfigPanel />

      {!worldId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          请先创建或选择一个世界以配置描写风格。
        </Alert>
      )}
      {worldId && <StyleConfigPanel />}

      <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle1">AI 密钥与后端</Typography>
        <Divider sx={{ my: 1 }} />
        <Typography variant="body2" color="text.secondary">
          本应用采用<b>后端代理持有 AI 密钥</b>：前端只向 <code>/api/ai/generate</code>{' '}
          发送"世界观上下文 + 操作推演 + 风格参数"三段式请求，密钥仅在{' '}
          <code>server/.env</code> 中配置，<b>绝不进入前端 bundle</b>。
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          未配置密钥时，前端会自动降级为<b>离线演示模式</b>，生成按规则拼装的示意稿，主循环仍可完整体验。
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          后端启动：<code>cd server &amp;&amp; npm install &amp;&amp; npm run dev</code>
          （默认端口 8787，前端 Vite 已代理 <code>/api</code>）。
        </Typography>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle1">数据导入 / 导出</Typography>
        <Divider sx={{ my: 1 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          把整个世界（设定 / 章节 / 角色 / 时间线）导出为单个 JSON 文件，可作为备份或分享给他人；
          导入会以<b>全新 id</b> 落库为一个独立世界副本，不会覆盖现有世界。这是「世界模板分发 / 备份还原」的基础。
        </Typography>
        <WorldIoMenu />
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle1">云同步</Typography>
        <Divider sx={{ my: 1 }} />
        <Typography variant="body2" color="text.secondary">
          v1 为本地优先（IndexedDB 离线存储），云同步（syncService）已预留接口，将于 P1 接入。详见仓库 README 的"已排除 P2 项"。
        </Typography>
      </Paper>
    </Box>
  );
}
