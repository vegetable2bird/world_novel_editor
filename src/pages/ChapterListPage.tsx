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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import EditIcon from '@mui/icons-material/Edit';
import { useWorkStore } from '../store/workStore';
import {
  useCurrentWorld,
  useCurrentWorldId,
  useCurrentBookId,
} from '../hooks/useWorldState';
import ConfirmDialog from '../components/common/ConfirmDialog';

/**
 * 章节列表页：先选作品（卷），再在其下列出章节，支持作品的新建/重命名/删除，
 * 以及章节的新建与删除，并进入编辑器。作品即 World 与 Chapter 之间的中间层。
 */
export default function ChapterListPage(): JSX.Element {
  const worldId = useCurrentWorldId();
  const world = useCurrentWorld();
  const currentBookId = useCurrentBookId();
  const createChapter = useWorkStore((s) => s.createChapter);
  const removeChapter = useWorkStore((s) => s.removeChapter);
  const createBook = useWorkStore((s) => s.createBook);
  const updateBook = useWorkStore((s) => s.updateBook);
  const removeBook = useWorkStore((s) => s.removeBook);
  const setCurrentBook = useWorkStore((s) => s.setCurrentBook);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [delChapterId, setDelChapterId] = useState<string | null>(null);

  // 作品（卷）相关弹窗状态
  const [newBookOpen, setNewBookOpen] = useState(false);
  const [newBookName, setNewBookName] = useState('');
  const [newBookDesc, setNewBookDesc] = useState('');

  const [manageOpen, setManageOpen] = useState(false);
  const [manageName, setManageName] = useState('');
  const [manageDesc, setManageDesc] = useState('');
  const [delBookId, setDelBookId] = useState<string | null>(null);

  if (!worldId || !world) {
    return <Alert severity="info">请先创建或选择一个世界。</Alert>;
  }

  const books = Object.values(world.books).sort((a, b) => a.order - b.order);
  const activeBookId =
    currentBookId && world.books[currentBookId] ? currentBookId : books[0]?.id ?? null;

  const chapters = Object.values(world.chapters)
    .filter((c) => c.bookId === activeBookId)
    .sort((a, b) => a.index - b.index);

  const chapterCountOf = (bookId: string) =>
    Object.values(world.chapters).filter((c) => c.bookId === bookId).length;

  const handleCreateChapter = () => {
    if (!worldId || !activeBookId) return;
    const id = createChapter(worldId, {
      title: title.trim() || `第 ${chapters.length + 1} 章`,
      bookId: activeBookId,
    });
    setTitle('');
    setChapterDialogOpen(false);
    navigate(`/chapters/${id}`);
  };

  const confirmDeleteChapter = () => {
    if (worldId && delChapterId) removeChapter(worldId, delChapterId);
    setDelChapterId(null);
  };

  // 作品新建
  const handleCreateBook = () => {
    if (!worldId) return;
    createBook(worldId, {
      name: newBookName.trim() || `第 ${books.length + 1} 部作品`,
      description: newBookDesc.trim() || undefined,
    });
    setNewBookName('');
    setNewBookDesc('');
    setNewBookOpen(false);
  };

  // 作品管理（重命名/删除）
  const openManage = () => {
    const b = activeBookId ? world.books[activeBookId] : undefined;
    setManageName(b?.name ?? '');
    setManageDesc(b?.description ?? '');
    setManageOpen(true);
  };
  const handleSaveManage = () => {
    if (!worldId || !activeBookId) return;
    updateBook(worldId, activeBookId, {
      name: manageName.trim() || '未命名作品',
      description: manageDesc.trim() || undefined,
    });
    setManageOpen(false);
  };
  const confirmDeleteBook = () => {
    if (worldId && delBookId) removeBook(worldId, delBookId);
    setDelBookId(null);
    setManageOpen(false);
  };

  return (
    <Box>
      {/* 作品（卷）栏 */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
          <LibraryBooksIcon color="primary" />
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel id="book-select-label">当前作品（卷）</InputLabel>
            <Select
              labelId="book-select-label"
              label="当前作品（卷）"
              value={activeBookId ?? ''}
              onChange={(e) => {
                if (worldId && e.target.value) setCurrentBook(worldId, e.target.value);
              }}
            >
              {books.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ width: '100%' }}>
                    <span>{b.name}</span>
                    <Chip size="small" label={`${chapterCountOf(b.id)} 章`} variant="outlined" />
                  </Stack>
                </MenuItem>
              ))}
              {books.length === 0 && (
                <MenuItem value="" disabled>
                  暂无作品
                </MenuItem>
              )}
            </Select>
          </FormControl>
          <Button
            size="small"
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={() => setNewBookOpen(true)}
          >
            新建作品
          </Button>
          <Button
            size="small"
            startIcon={<EditIcon />}
            variant="outlined"
            disabled={!activeBookId}
            onClick={openManage}
          >
            管理作品
          </Button>
          <Typography variant="caption" color="text.secondary">
            作品是章节的容器：一个世界可含多部作品（卷），便于分线叙事与跨书联动。
          </Typography>
        </Stack>
      </Paper>

      {/* 章节区 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Typography variant="h6">
          章节（{chapters.length}）
          {activeBookId ? ` · ${world.books[activeBookId]?.name ?? ''}` : ''}
        </Typography>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          disabled={!activeBookId}
          onClick={() => setChapterDialogOpen(true)}
        >
          新建章节
        </Button>
      </Box>

      {!activeBookId ? (
        <Alert severity="info">请先创建一部作品，再在其中新建章节。</Alert>
      ) : (
        <Paper variant="outlined">
          <List>
            {chapters.length === 0 && (
              <ListItemButton disabled>
                <ListItemText
                  primary="该作品还没有章节"
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
                      setDelChapterId(c.id);
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
      )}

      {/* 新建章节对话框 */}
      <Dialog open={chapterDialogOpen} onClose={() => setChapterDialogOpen(false)}>
        <DialogTitle>新建章节</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="章节标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateChapter();
            }}
            placeholder={`第 ${chapters.length + 1} 章`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChapterDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreateChapter}>
            创建并打开
          </Button>
        </DialogActions>
      </Dialog>

      {/* 新建作品对话框 */}
      <Dialog open={newBookOpen} onClose={() => setNewBookOpen(false)}>
        <DialogTitle>新建作品（卷）</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="作品名称"
            value={newBookName}
            onChange={(e) => setNewBookName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateBook();
            }}
            placeholder={`第 ${books.length + 1} 部作品`}
            sx={{ mb: 1.5, mt: 0.5 }}
          />
          <TextField
            fullWidth
            label="简介（可选）"
            value={newBookDesc}
            onChange={(e) => setNewBookDesc(e.target.value)}
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewBookOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleCreateBook}>
            创建
          </Button>
        </DialogActions>
      </Dialog>

      {/* 作品管理对话框（重命名 / 删除） */}
      <Dialog open={manageOpen} onClose={() => setManageOpen(false)}>
        <DialogTitle>管理作品</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="作品名称"
            value={manageName}
            onChange={(e) => setManageName(e.target.value)}
            sx={{ mb: 1.5, mt: 0.5 }}
          />
          <TextField
            fullWidth
            label="简介（可选）"
            value={manageDesc}
            onChange={(e) => setManageDesc(e.target.value)}
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button
            color="error"
            onClick={() => setDelBookId(activeBookId)}
            disabled={books.length <= 1}
          >
            删除此作品
          </Button>
          <Button onClick={() => setManageOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSaveManage}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={delChapterId !== null}
        title="删除章节"
        message="删除后该章节及其全部版本将不可恢复，确定继续？"
        confirmText="删除"
        onConfirm={confirmDeleteChapter}
        onCancel={() => setDelChapterId(null)}
      />

      <ConfirmDialog
        open={delBookId !== null}
        title="删除作品"
        message="删除作品将一并删除其下所有章节、版本与生成记录，且不可恢复，确定继续？"
        confirmText="删除作品"
        onConfirm={confirmDeleteBook}
        onCancel={() => setDelBookId(null)}
      />
    </Box>
  );
}
