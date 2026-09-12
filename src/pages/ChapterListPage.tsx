import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useWorkStore } from '../store/workStore';
import { useCurrentWorld, useCurrentWorldId } from '../hooks/useWorldState';
import ConfirmDialog from '../components/common/ConfirmDialog';

/**
 * 章节列表页：展示全部章节，支持新建与删除，进入编辑器。
 */
export default function ChapterListPage(): JSX.Element {
  const worldId = useCurrentWorldId();
  const world = useCurrentWorld();
  const createChapter = useWorkStore((s) => s.createChapter);
  const removeChapter = useWorkStore((s) => s.removeChapter);
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [delId, setDelId] = useState<string | null>(null);

  if (!worldId || !world) {
    return <Alert severity="info">请先创建或选择一个世界。</Alert>;
  }

  const chapters = Object.values(world.chapters).sort((a, b) => a.index - b.index);

  const handleCreate = () => {
    if (!worldId) return;
    const id = createChapter(worldId, {
      title: title.trim() || `第 ${chapters.length + 1} 章`,
    });
    setTitle('');
    setOpen(false);
    navigate(`/chapters/${id}`);
  };

  const confirmDelete = () => {
    if (worldId && delId) removeChapter(worldId, delId);
    setDelId(null);
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography variant="h6">章节（{chapters.length}）</Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => setOpen(true)}
        >
          新建章节
        </Button>
      </Box>

      <Paper variant="outlined">
        <List>
          {chapters.length === 0 && (
            <ListItemButton disabled>
              <ListItemText
                primary="还没有章节"
                secondary="在操作台执行操作并生成，或点击右上角新建"
              />
            </ListItemButton>
          )}
          {chapters.map((c) => (
            <ListItem
              key={c.id}
              disablePadding
              secondaryAction={
                <IconButton
                  edge="end"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDelId(c.id);
                  }}
                  aria-label="删除章节"
                >
                  <DeleteOutlineIcon />
                </IconButton>
              }
            >
              <ListItemButton onClick={() => navigate(`/chapters/${c.id}`)}>
                <MenuBookIcon sx={{ mr: 1.5, color: 'text.secondary' }} />
                <ListItemText
                  primary={c.title}
                  secondary={`第 ${c.index} 章 · ${c.status}`}
                />
                <Chip
                  size="small"
                  label={c.currentVersionId ? '有正文' : '空白'}
                  sx={{ ml: 1 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>新建章节</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="章节标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
            }}
            placeholder={`第 ${chapters.length + 1} 章`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreate}>
            创建并打开
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={delId !== null}
        title="删除章节"
        message="删除后该章节及其全部版本将不可恢复，确定继续？"
        confirmText="删除"
        onConfirm={confirmDelete}
        onCancel={() => setDelId(null)}
      />
    </Box>
  );
}
