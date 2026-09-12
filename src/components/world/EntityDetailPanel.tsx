import {
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  Switch,
  FormControlLabel,
  Divider,
  Paper,
  Alert,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useWorkStore } from '../../store/workStore';
import { useCurrentWorldId } from '../../hooks/useWorldState';
import {
  ENTITY_TYPE_FIELDS,
  ENTITY_TYPE_LABELS,
} from '../../constants/worldTemplates';
import type { WorldEntity } from '../../types/world';

interface Props {
  entityId: string;
  onEdit: () => void;
}

/**
 * 实体详情面板（只读展示 + 快速上下文开关 + 进入编辑）。
 */
export default function EntityDetailPanel({
  entityId,
  onEdit,
}: Props): JSX.Element {
  const worldId = useCurrentWorldId();
  const entity = useWorkStore((s) =>
    worldId ? s.worlds[worldId]?.entities[entityId] : undefined,
  );
  const updateEntity = useWorkStore((s) => s.updateEntity);

  if (!entity || !worldId) {
    return <Alert severity="info">请选择左侧的一个实体查看详情。</Alert>;
  }

  const fieldDefs = ENTITY_TYPE_FIELDS[entity.type];
  const filledFields = fieldDefs.filter(
    (d) => entity.fields[d.key] !== '' && entity.fields[d.key] != null,
  );

  return (
    <Box sx={{ p: 2 }}>
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Box>
          <Typography variant="overline" color="text.secondary">
            {ENTITY_TYPE_LABELS[entity.type]}
          </Typography>
          <Typography variant="h6">{entity.name}</Typography>
        </Box>
        <Button
          startIcon={<EditOutlinedIcon />}
          variant="outlined"
          size="small"
          onClick={onEdit}
        >
          编辑
        </Button>
      </Stack>

      <Divider sx={{ mb: 2 }} />

      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, bgcolor: 'background.default' }}>
        <Typography variant="body2" color="text.secondary">
          {entity.summary || '（暂无摘要）'}
        </Typography>
      </Paper>

      {filledFields.length > 0 && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {filledFields.map((d) => (
            <Box key={d.key}>
              <Typography variant="caption" color="text.secondary">
                {d.label}
              </Typography>
              <Typography variant="body2">
                {String(entity.fields[d.key])}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}

      {entity.richText && (
        <Box
          sx={{
            whiteSpace: 'pre-wrap',
            fontSize: 14,
            color: 'text.secondary',
            mb: 2,
          }}
        >
          {entity.richText}
        </Box>
      )}

      {entity.tags.length > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
          {entity.tags.map((t) => (
            <Chip key={t} label={t} size="small" variant="outlined" />
          ))}
        </Stack>
      )}

      <FormControlLabel
        control={
          <Switch
            checked={entity.inContext}
            onChange={(e) =>
              updateEntity(worldId, entity.id, { inContext: e.target.checked })
            }
          />
        }
        label="纳入 AI 上下文（Lorebook）"
      />
    </Box>
  );
}
