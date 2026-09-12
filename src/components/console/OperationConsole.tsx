import { Grid, Typography, Box } from '@mui/material';
import OperationPalette from './OperationPalette';
import VariablePanel from './VariablePanel';
import DirectionSelector from './DirectionSelector';
import EventFeed from './EventFeed';

/**
 * 操作台主视图：编排"操作面板 + 变量面板 + 走向选择 + 事件流"。
 * 这是核心循环的"轻游戏化"操作区，所有操作都转化为叙事推演并记录事件。
 */
export default function OperationConsole(): JSX.Element {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1 }}>
        操作台
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <OperationPalette />
        </Grid>
        <Grid item xs={12} md={6}>
          <VariablePanel />
        </Grid>
        <Grid item xs={12} md={6}>
          <DirectionSelector />
        </Grid>
        <Grid item xs={12} md={6}>
          <EventFeed />
        </Grid>
      </Grid>
    </Box>
  );
}
