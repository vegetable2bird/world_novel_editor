import { useState } from 'react';
import {
  Box,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  InputLabel,
  FormControl,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useWorkStore } from '../../store/workStore';
import {
  WORLD_TEMPLATES,
  DEFAULT_TEMPLATE_KEY,
} from '../../constants/worldTemplates';

/**
 * 世界切换器：下拉切换当前世界，并提供"新建世界"入口。
 * 切换/新建均只经 useWorkStore，保证以 worldId 为键的单一真相。
 */
export default function WorkSwitcher(): JSX.Element {
  const worlds = useWorkStore((s) => s.worlds);
  const currentWorldId = useWorkStore((s) => s.currentWorldId);
  const createWorld = useWorkStore((s) => s.createWorld);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [tpl, setTpl] = useState(DEFAULT_TEMPLATE_KEY);

  const worldList = Object.values(worlds);

  const handleCreate = () => {
    const finalName = name.trim() || '未命名世界';
    createWorld(finalName, undefined, tpl);
    setName('');
    setTpl(DEFAULT_TEMPLATE_KEY);
    setOpen(false);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="world-select-label">当前世界</InputLabel>
        <Select
          labelId="world-select-label"
          label="当前世界"
          value={currentWorldId ?? ''}
          onChange={(e) => {
            const wid = e.target.value || null;
            const bookId = wid
              ? Object.keys(useWorkStore.getState().worlds[wid]?.books ?? {})[0] ?? null
              : null;
            useWorkStore.setState({ currentWorldId: wid, currentBookId: bookId });
          }}
        >
          {worldList.map((w) => (
            <MenuItem key={w.world.id} value={w.world.id}>
              {w.world.name}
            </MenuItem>
          ))}
          {worldList.length === 0 && (
            <MenuItem value="" disabled>
              暂无世界
            </MenuItem>
          )}
        </Select>
      </FormControl>
      <Button
        startIcon={<AddIcon />}
        variant="contained"
        size="small"
        onClick={() => setOpen(true)}
      >
        新建世界
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>新建世界</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            世界是全部设定、操作与章节的根。新建后将预置国力/民心/灵气变量与全局风格配置。
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="世界名称"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>世界模板</InputLabel>
            <Select
              value={tpl}
              label="世界模板"
              onChange={(e) => setTpl(e.target.value)}
            >
              {Object.values(WORLD_TEMPLATES).map((t) => (
                <MenuItem key={t.key} value={t.key}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary">
            {WORLD_TEMPLATES[tpl]?.description}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate}>
            创建
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
