import { useState } from 'react';
import { Box, Tabs, Tab, Typography, Grid, Paper, Alert } from '@mui/material';
import OperationConsole from '../components/console/OperationConsole';
import GenerationPanel from '../components/generation/GenerationPanel';
import TimelineView from '../components/timeline/TimelineView';
import PlotSuggestionPanel from '../components/narrative/PlotSuggestionPanel';
import { useCurrentWorld, useCurrentWorldId } from '../hooks/useWorldState';

/**
 * 操作台页面：核心循环的中枢。
 * 顶部展示世界时钟；主体为"操作台"（操作/变量/走向/事件）+ 右侧"AI 生成面板"；
 * 并可切换到"世界时间线"视图追溯演进，或"情节推演"获取叙事分支建议。
 */
export default function ConsolePage(): JSX.Element {
  const worldId = useCurrentWorldId();
  const world = useCurrentWorld();
  const [tab, setTab] = useState<'console' | 'suggestions' | 'timeline'>('console');

  if (!worldId || !world) {
    return <Alert severity="info">请先创建或选择一个世界。</Alert>;
  }

  const clock = world.clock;

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
        <Typography variant="h6">操作台</Typography>
        <Typography variant="caption" color="text.secondary">
          当前纪元：{clock.era} {clock.year} 年 · 季节：{clock.season} ｜ 通过操作推演驱动叙事，再交由 AI 按风格生成章节
        </Typography>
      </Paper>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab label="操作台" value="console" />
        <Tab label="情节推演" value="suggestions" />
        <Tab label="世界时间线" value="timeline" />
      </Tabs>

      {tab === 'console' ? (
        <Grid container spacing={2}>
          <Grid item xs={12} lg={8}>
            <OperationConsole />
          </Grid>
          <Grid item xs={12} lg={4}>
            <GenerationPanel />
          </Grid>
        </Grid>
      ) : tab === 'suggestions' ? (
        <PlotSuggestionPanel />
      ) : (
        <TimelineView />
      )}
    </Box>
  );
}
