import {
  Box,
  Typography,
  Paper,
  Stack,
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useWorkStore } from '../../store/workStore';
import { useCurrentWorldId } from '../../hooks/useWorldState';
import type { Variable } from '../../types/world';

/**
 * 变量面板：展示国力 / 民心 / 灵气等世界状态变量，并提供快捷 +/- 调整。
 */
export default function VariablePanel(): JSX.Element {
  const worldId = useCurrentWorldId();
  const variables = useWorkStore((s) =>
    worldId ? s.worlds[worldId]?.variables : undefined,
  );
  const updateVariable = useWorkStore((s) => s.updateVariable);

  const list: Variable[] = variables ? Object.values(variables) : [];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        世界状态变量
      </Typography>
      {list.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          暂无变量。新建世界时会预置国力 / 民心 / 灵气。
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {list.map((v) => {
            const min = v.min ?? 0;
            const max = v.max ?? Math.max(100, v.value);
            const pct = Math.round(((v.value - min) / (max - min || 1)) * 100);
            return (
              <Box key={v.id}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    mb: 0.5,
                  }}
                >
                  <Typography variant="body2">{v.name}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title="减少 5">
                      <IconButton
                        size="small"
                        onClick={() => updateVariable(worldId!, v.id, { value: v.value - 5 })}
                      >
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Typography variant="body2" sx={{ minWidth: 36, textAlign: 'right' }}>
                      {v.value}
                      {v.unit ? v.unit : ''}
                    </Typography>
                    <Tooltip title="增加 5">
                      <IconButton
                        size="small"
                        onClick={() => updateVariable(worldId!, v.id, { value: v.value + 5 })}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.max(0, Math.min(100, pct))}
                  sx={{ borderRadius: 1, height: 6 }}
                />
              </Box>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}
