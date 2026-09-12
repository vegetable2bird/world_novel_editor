import { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Stack,
  Chip,
  Button,
  Autocomplete,
  Divider,
} from '@mui/material';
import { useWorkStore } from '../../store/workStore';
import { useCurrentWorld, useCurrentWorldId } from '../../hooks/useWorldState';
import type { StyleConfig } from '../../types/style';

const TONE_OPTIONS = ['史诗奇幻', '雄浑苍凉', '瑰丽诡谲', '冷峻写实', '轻快幽默', '古雅婉约'];
const POV_OPTIONS = ['第三人称限知', '第三人称全知', '第一人称'];
const PACING_OPTIONS = ['张弛有度', '快节奏', '慢热细腻', '紧张密集'];
const RHETORIC_OPTIONS = ['重白描、少堆砌比喻', '善用隐喻', '华丽铺陈', '克制冷峻'];

/**
 * 描写风格配置面板：全局文风 / 视角 / 节奏 / 修辞 + 禁用写法 + 必须回收的伏笔。
 * 这些是生成链路"风格可控"的核心参数。
 */
export default function StyleConfigPanel(): JSX.Element {
  const worldId = useCurrentWorldId();
  const world = useCurrentWorld();
  const upsert = useWorkStore((s) => s.upsertGlobalStyle);

  const style: StyleConfig | undefined = world
    ? Object.values(world.styleConfigs).find((c) => c.scope === 'global')
    : undefined;

  const [tone, setTone] = useState('');
  const [pov, setPov] = useState('');
  const [pacing, setPacing] = useState('');
  const [rhetoric, setRhetoric] = useState('');
  const [forbidden, setForbidden] = useState<string[]>([]);
  const [forbiddenInput, setForbiddenInput] = useState('');
  const [foreshadowIds, setForeshadowIds] = useState<string[]>([]);

  useEffect(() => {
    if (!style) return;
    setTone(style.tone);
    setPov(style.pov);
    setPacing(style.pacing);
    setRhetoric(style.rhetoric);
    setForbidden(style.forbiddenWritings);
    setForeshadowIds(style.requiredForeshadows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style?.id]);

  const foreshadows = world ? Object.values(world.foreshadows) : [];

  const save = () => {
    if (!worldId) return;
    upsert(worldId, {
      tone,
      pov,
      pacing,
      rhetoric,
      forbiddenWritings: forbidden,
      requiredForeshadows: foreshadowIds,
    });
  };

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        描写风格配置（全局）
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Stack spacing={2}>
        <Autocomplete
          freeSolo
          options={TONE_OPTIONS}
          value={tone}
          onInputChange={(_, v) => setTone(v ?? '')}
          renderInput={(params) => <TextField {...params} size="small" label="文风基调" />}
        />
        <Autocomplete
          options={POV_OPTIONS}
          value={pov}
          onChange={(_, v) => setPov(v ?? '')}
          renderInput={(params) => <TextField {...params} size="small" label="叙事视角" />}
        />
        <Autocomplete
          options={PACING_OPTIONS}
          value={pacing}
          onChange={(_, v) => setPacing(v ?? '')}
          renderInput={(params) => <TextField {...params} size="small" label="叙事节奏" />}
        />
        <Autocomplete
          options={RHETORIC_OPTIONS}
          value={rhetoric}
          onChange={(_, v) => setRhetoric(v ?? '')}
          renderInput={(params) => <TextField {...params} size="small" label="修辞偏好" />}
        />

        <Box>
          <Typography variant="caption" color="text.secondary">
            禁用写法（回车添加）
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
            {forbidden.map((f) => (
              <Chip
                key={f}
                label={f}
                onDelete={() => setForbidden((prev) => prev.filter((x) => x !== f))}
                size="small"
              />
            ))}
            <TextField
              size="small"
              placeholder="如：避免使用网络流行语"
              value={forbiddenInput}
              onChange={(e) => setForbiddenInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const v = forbiddenInput.trim();
                  if (v && !forbidden.includes(v)) setForbidden((prev) => [...prev, v]);
                  setForbiddenInput('');
                }
              }}
              sx={{ width: 220 }}
            />
          </Stack>
        </Box>

        <Autocomplete
          multiple
          options={foreshadows}
          getOptionLabel={(o) => o.title}
          value={foreshadows.filter((f) => foreshadowIds.includes(f.id))}
          onChange={(_, v) => setForeshadowIds(v.map((x) => x.id))}
          renderInput={(params) => (
            <TextField {...params} size="small" label="必须回收的伏笔" />
          )}
        />

        <Box>
          <Button variant="contained" onClick={save}>
            保存风格
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
