import { useEffect, useState } from 'react';
import {
  Box,
  TextField,
  Typography,
  Button,
  Stack,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Divider,
  Alert,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useWorkStore } from '../../store/workStore';
import { useCurrentWorldId } from '../../hooks/useWorldState';
import {
  ENTITY_TYPE_FIELDS,
  ENTITY_TYPE_LABELS,
} from '../../constants/worldTemplates';
import type { WorldEntity } from '../../types/world';

interface Props {
  entityId: string;
  onDeleted?: () => void;
  onCancel?: () => void;
  onSaved?: () => void;
}

/**
 * 实体编辑表单：名称、摘要、类型专属结构化字段、富文本、标签、Lorebook 上下文开关。
 * 本地受控，点"保存"才写回 store（禁止组件内私藏最终状态，写回即真相）。
 */
export default function EntityForm({
  entityId,
  onDeleted,
  onCancel,
  onSaved,
}: Props): JSX.Element {
  const worldId = useCurrentWorldId();
  const entity = useWorkStore((s) =>
    worldId ? s.worlds[worldId]?.entities[entityId] : undefined,
  );
  const updateEntity = useWorkStore((s) => s.updateEntity);
  const removeEntity = useWorkStore((s) => s.removeEntity);

  const [name, setName] = useState('');
  const [summary, setSummary] = useState('');
  const [richText, setRichText] = useState('');
  const [inContext, setInContext] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [fields, setFields] = useState<Record<string, unknown>>({});

  // 切换实体时重新初始化表单（仅以 entityId 为依赖，避免输入过程中被外部更新覆盖）
  useEffect(() => {
    if (!entity) return;
    setName(entity.name);
    setSummary(entity.summary);
    setRichText(entity.richText ?? '');
    setInContext(entity.inContext);
    setTags([...entity.tags]);
    setFields({ ...entity.fields });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId]);

  if (!entity || !worldId) {
    return <Alert severity="info">请选择一个实体进行编辑。</Alert>;
  }

  const fieldDefs = ENTITY_TYPE_FIELDS[entity.type];

  const setField = (key: string, value: unknown) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const commitTag = () => {
    const v = tagInput.trim();
    if (v && !tags.includes(v)) setTags((prev) => [...prev, v]);
    setTagInput('');
  };

  const handleSave = () => {
    updateEntity(worldId, entityId, {
      name: name.trim() || '未命名',
      summary,
      richText,
      inContext,
      tags,
      fields,
    });
    onSaved?.();
  };

  const handleDelete = () => {
    removeEntity(worldId, entityId);
    onDeleted?.();
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Typography variant="h6">
          编辑 · {ENTITY_TYPE_LABELS[entity.type]}
        </Typography>
        <IconButton color="error" onClick={handleDelete} title="删除实体">
          <DeleteOutlineIcon />
        </IconButton>
      </Stack>
      <Divider sx={{ mb: 2 }} />

      <Stack spacing={2}>
        <TextField
          label="名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          size="small"
        />
        <TextField
          label="摘要"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          fullWidth
          size="small"
          multiline
          minRows={2}
        />

        {fieldDefs.map((def) => (
          <TextField
            key={def.key}
            label={def.label}
            placeholder={def.placeholder}
            value={String(fields[def.key] ?? '')}
            onChange={(e) =>
              setField(
                def.key,
                def.kind === 'number' ? Number(e.target.value) : e.target.value,
              )
            }
            fullWidth
            size="small"
            multiline={def.kind === 'textarea'}
            minRows={def.kind === 'textarea' ? 2 : undefined}
            type={def.kind === 'number' ? 'number' : 'text'}
          />
        ))}

        <TextField
          label="富文本描述（Markdown）"
          value={richText}
          onChange={(e) => setRichText(e.target.value)}
          fullWidth
          size="small"
          multiline
          minRows={3}
        />

        <Box>
          <Typography variant="caption" color="text.secondary">
            标签
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
            {tags.map((t) => (
              <Chip
                key={t}
                label={t}
                onDelete={() => setTags((prev) => prev.filter((x) => x !== t))}
                size="small"
              />
            ))}
            <TextField
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitTag();
                }
              }}
              placeholder="输入后回车"
              size="small"
              sx={{ width: 140 }}
            />
          </Stack>
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={inContext}
              onChange={(e) => setInContext(e.target.checked)}
            />
          }
          label="纳入 AI 上下文（Lorebook 开关）"
        />

        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={handleSave}>
            保存
          </Button>
          {onCancel && (
            <Button variant="text" onClick={onCancel}>
              取消
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
