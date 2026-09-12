import { useState } from 'react';
import {
  Box,
  Button,
  Stack,
  TextField,
  MenuItem,
  Typography,
  Paper,
  Divider,
} from '@mui/material';
import { useWorkStore } from '../../store/workStore';
import { useCurrentWorld, useCurrentWorldId } from '../../hooks/useWorldState';
import { RELATION_TYPE_OPTIONS } from '../../constants/worldTemplates';
import type { OperationKind } from '../../types/console';

const KINDS: { kind: OperationKind; label: string; desc: string }[] = [
  { kind: 'dispatch', label: '调度势力', desc: '调兵 / 行动 / 布局' },
  { kind: 'advanceTime', label: '推进时间', desc: '季节 / 年份流转' },
  { kind: 'triggerEvent', label: '触发事件', desc: '突发事件' },
  { kind: 'adjustVariable', label: '调整变量', desc: '国力 / 民心 / 灵气' },
  { kind: 'diplomacy', label: '外交 / 战争', desc: '改变阵营关系' },
];

const SEASONS = ['春', '夏', '秋', '冬'];

/**
 * 操作面板：以"轻游戏化"的方式操作世界（不靠写文字定义剧情）。
 * 选择操作类型 -> 填写参数 -> 执行 -> 触发叙事推演。
 */
export default function OperationPalette(): JSX.Element {
  const worldId = useCurrentWorldId();
  const world = useCurrentWorld();
  const runOperation = useWorkStore((s) => s.runOperation);

  const [active, setActive] = useState<OperationKind | null>(null);
  const [factionId, setFactionId] = useState('');
  const [action, setAction] = useState('');
  const [targetId, setTargetId] = useState('');
  const [years, setYears] = useState(1);
  const [season, setSeason] = useState('');
  const [evTitle, setEvTitle] = useState('');
  const [evDesc, setEvDesc] = useState('');
  const [variableId, setVariableId] = useState('');
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [relTargetId, setRelTargetId] = useState('');
  const [relationType, setRelationType] = useState(RELATION_TYPE_OPTIONS[0]);

  const entitiesList = world ? Object.values(world.entities) : [];
  const variables = world ? Object.values(world.variables) : [];

  const reset = () => {
    setActive(null);
    setFactionId('');
    setAction('');
    setTargetId('');
    setYears(1);
    setSeason('');
    setEvTitle('');
    setEvDesc('');
    setVariableId('');
    setDelta(0);
    setReason('');
    setSourceId('');
    setRelTargetId('');
    setRelationType(RELATION_TYPE_OPTIONS[0]);
  };

  const execute = () => {
    if (!worldId || !active) return;
    let payload: Record<string, unknown> = {};
    let label = '';
    switch (active) {
      case 'dispatch':
        payload = { factionId, action, targetId: targetId || undefined };
        label = `调度·${action || '行动'}`;
        break;
      case 'advanceTime':
        payload = { years: Number(years), season: season || undefined };
        label = `推进时间·${years}年`;
        break;
      case 'triggerEvent':
        payload = { title: evTitle, description: evDesc };
        label = `事件·${evTitle || '未命名'}`;
        break;
      case 'adjustVariable':
        payload = {
          variableId,
          delta: Number(delta),
          reason: reason || undefined,
        };
        label = `调整·${variables.find((v) => v.id === variableId)?.name ?? '变量'}`;
        break;
      case 'diplomacy':
        payload = { sourceId, targetId: relTargetId, relationType };
        label = `外交·${relationType}`;
        break;
    }
    runOperation(worldId, { kind: active, payload, label });
    reset();
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        操作面板
      </Typography>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {KINDS.map((k) => (
          <Button
            key={k.kind}
            variant={active === k.kind ? 'contained' : 'outlined'}
            size="small"
            onClick={() => setActive(k.kind)}
            title={k.desc}
          >
            {k.label}
          </Button>
        ))}
      </Stack>

      {active && (
        <Box>
          <Divider sx={{ mb: 2 }} />
          <Stack spacing={2}>
            {active === 'dispatch' && (
              <>
                <TextField
                  select
                  size="small"
                  label="势力 / 主体"
                  value={factionId}
                  onChange={(e) => setFactionId(e.target.value)}
                >
                  {entitiesList.map((e) => (
                    <MenuItem key={e.id} value={e.id}>
                      {e.name}（{e.type}）
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  label="行动（如：北境增兵、暗杀）"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                />
                <TextField
                  select
                  size="small"
                  label="目标（可选）"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                >
                  <MenuItem value="">无</MenuItem>
                  {entitiesList.map((e) => (
                    <MenuItem key={e.id} value={e.id}>
                      {e.name}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            )}

            {active === 'advanceTime' && (
              <>
                <TextField
                  size="small"
                  type="number"
                  label="推进年数"
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                />
                <TextField
                  select
                  size="small"
                  label="季节（可选）"
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                >
                  <MenuItem value="">顺延</MenuItem>
                  {SEASONS.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            )}

            {active === 'triggerEvent' && (
              <>
                <TextField
                  size="small"
                  label="事件标题"
                  value={evTitle}
                  onChange={(e) => setEvTitle(e.target.value)}
                />
                <TextField
                  size="small"
                  label="事件描述"
                  multiline
                  minRows={2}
                  value={evDesc}
                  onChange={(e) => setEvDesc(e.target.value)}
                />
              </>
            )}

            {active === 'adjustVariable' && (
              <>
                <TextField
                  select
                  size="small"
                  label="变量"
                  value={variableId}
                  onChange={(e) => setVariableId(e.target.value)}
                >
                  {variables.map((v) => (
                    <MenuItem key={v.id} value={v.id}>
                      {v.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  type="number"
                  label="变化量（正增负减）"
                  value={delta}
                  onChange={(e) => setDelta(Number(e.target.value))}
                />
                <TextField
                  size="small"
                  label="原因（可选）"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </>
            )}

            {active === 'diplomacy' && (
              <>
                <TextField
                  select
                  size="small"
                  label="甲方"
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                >
                  {entitiesList.map((e) => (
                    <MenuItem key={e.id} value={e.id}>
                      {e.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="乙方"
                  value={relTargetId}
                  onChange={(e) => setRelTargetId(e.target.value)}
                >
                  {entitiesList.map((e) => (
                    <MenuItem key={e.id} value={e.id}>
                      {e.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="关系类型"
                  value={relationType}
                  onChange={(e) => setRelationType(e.target.value)}
                >
                  {RELATION_TYPE_OPTIONS.map((o) => (
                    <MenuItem key={o} value={o}>
                      {o}
                    </MenuItem>
                  ))}
                </TextField>
              </>
            )}

            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={execute}>
                执行操作
              </Button>
              <Button variant="text" onClick={reset}>
                取消
              </Button>
            </Stack>
          </Stack>
        </Box>
      )}
    </Paper>
  );
}
