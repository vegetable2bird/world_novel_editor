import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Tabs,
  Tab,
  Typography,
  Paper,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Stack,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useWorkStore } from '../store/workStore';
import {
  useCurrentWorld,
  useCurrentWorldId,
  useCurrentBookId,
  useCurrentBook,
} from '../hooks/useWorldState';
import type { CharacterInstance } from '../types/character';
import CrossBookPanel from '../components/crossBook/CrossBookPanel';
import { buildCrossBookReport } from '../services/crossBook/continuity';

const STATUS_LABELS: Record<CharacterInstance['status'], string> = {
  active: '登场',
  minor: '配角',
  offstage: '暂离场',
};

type TabKey = 'registry' | 'instances' | 'mood' | 'crossbook';

/** 角色系统页面：三标签分别承载角色总库 / 本卷角色卡 / 心情时间线。 */
export default function CharacterPage(): JSX.Element {
  const worldId = useCurrentWorldId();
  const world = useCurrentWorld();
  const bookId = useCurrentBookId();
  const book = useCurrentBook();
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabKey>('registry');

  // 总库弹窗
  const [registryOpen, setRegistryOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regArchetype, setRegArchetype] = useState('');
  const [regTags, setRegTags] = useState('');
  const [regSummary, setRegSummary] = useState('');
  const [regRich, setRegRich] = useState('');
  const [editRegId, setEditRegId] = useState<string | null>(null);

  // 角色卡弹窗
  const [instOpen, setInstOpen] = useState(false);
  const [instName, setInstName] = useState('');
  const [instStatus, setInstStatus] = useState<CharacterInstance['status']>('active');
  const [instPortrait, setInstPortrait] = useState('');
  const [instBio, setInstBio] = useState('');
  const [instMood, setInstMood] = useState('');
  const [editInstId, setEditInstId] = useState<string | null>(null);

  // 心情弹窗
  const [moodOpen, setMoodOpen] = useState(false);
  const [moodInstId, setMoodInstId] = useState('');
  const [moodText, setMoodText] = useState('');
  const [moodNote, setMoodNote] = useState('');

  if (!worldId || !world) {
    return <Alert severity="info">请先创建或选择一个世界。</Alert>;
  }

  const registry = Object.values(world.characterRegistry).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const instances = Object.values(world.characterInstances);
  const bookInstances = instances
    .filter((c) => c.bookId === bookId)
    .sort((a, b) => a.name.localeCompare(b.name));

  // 总库条目 -> 跨书出演次数 / 最新心情
  const aggByRegistry = useMemo(() => {
    const m = new Map<string, { count: number; latestMood?: string }>();
    for (const inst of instances) {
      if (!inst.registryId) continue;
      const cur = m.get(inst.registryId) ?? { count: 0 };
      cur.count += 1;
      m.set(inst.registryId, cur);
    }
    return m;
  }, [instances]);

  const latestMoodByInst = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of Object.values(world.moodEntries)) {
      const prev = m.get(e.characterInstanceId);
      if (!prev || e.createdAt > prev) m.set(e.characterInstanceId, e.mood);
    }
    return m;
  }, [world.moodEntries]);

  // 跨书联动报告（冲突检测 + 联动矩阵）
  const crossBookReport = useMemo(() => buildCrossBookReport(world), [world]);

  // 联动提醒：本卷某角色卡若在其他卷也有出演，列出其它卷名，提示作者跨书一致
  const crossBookByInstance = useMemo(() => {
    const m = new Map<string, string[]>();
    const booksByReg = new Map<string, Set<string>>();
    for (const c of instances) {
      if (!c.registryId) continue;
      const s = booksByReg.get(c.registryId) ?? new Set<string>();
      s.add(c.bookId);
      booksByReg.set(c.registryId, s);
    }
    const bookNames = new Map(Object.entries(world.books).map(([id, b]) => [id, b.name]));
    for (const c of bookInstances) {
      if (!c.registryId) continue;
      const others = [...(booksByReg.get(c.registryId) ?? [])].filter(
        (bid) => bid !== c.bookId,
      );
      if (others.length > 0) {
        m.set(
          c.id,
          others.map((bid) => bookNames.get(bid) ?? bid),
        );
      }
    }
    return m;
  }, [instances, bookInstances, world.books]);

  // 本卷心情时间线（含角色名）
  const moodTimeline = Object.values(world.moodEntries)
    .filter((e) => {
      const inst = world.characterInstances[e.characterInstanceId];
      return inst && inst.bookId === bookId;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const store = useWorkStore.getState();

  // ---- 总库操作 ----
  const openNewRegistry = () => {
    setEditRegId(null);
    setRegName('');
    setRegArchetype('');
    setRegTags('');
    setRegSummary('');
    setRegRich('');
    setRegistryOpen(true);
  };
  const openEditRegistry = (id: string) => {
    const e = world.characterRegistry[id];
    if (!e) return;
    setEditRegId(id);
    setRegName(e.name);
    setRegArchetype(e.archetype);
    setRegTags(e.tags.join('、'));
    setRegSummary(e.summary ?? '');
    setRegRich(e.richText ?? '');
    setRegistryOpen(true);
  };
  const saveRegistry = () => {
    const tags = regTags
      .split(/[、,，]/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (editRegId) {
      store.updateRegistryCharacter(worldId, editRegId, {
        name: regName.trim() || '未命名角色',
        archetype: regArchetype.trim() || '待设定',
        tags,
        summary: regSummary,
        richText: regRich,
      });
    } else {
      store.createRegistryCharacter(worldId, {
        name: regName.trim() || '未命名角色',
        archetype: regArchetype.trim() || '待设定',
        tags,
        summary: regSummary,
        richText: regRich,
      });
    }
    setRegistryOpen(false);
  };
  const castToBook = (registryId: string) => {
    if (!bookId) return;
    const id = store.createCharacterInstance(worldId, { bookId, registryId });
    setTab('instances');
    void id;
  };

  // ---- 角色卡操作 ----
  const openNewInst = () => {
    setEditInstId(null);
    setInstName('');
    setInstStatus('active');
    setInstPortrait('');
    setInstBio('');
    setInstMood('');
    setInstOpen(true);
  };
  const openEditInst = (id: string) => {
    const c = world.characterInstances[id];
    if (!c) return;
    setEditInstId(id);
    setInstName(c.name);
    setInstStatus(c.status);
    const p = c.portrait?.['要点'];
    setInstPortrait(typeof p === 'string' ? p : '');
    setInstBio(c.biography ?? '');
    setInstMood(c.currentMood ?? '');
    setInstOpen(true);
  };
  const saveInst = () => {
    const portrait = instPortrait.trim() ? { 要点: instPortrait.trim() } : {};
    if (editInstId) {
      store.updateCharacterInstance(worldId, editInstId, {
        name: instName.trim() || '未命名角色',
        status: instStatus,
        portrait,
        biography: instBio,
        currentMood: instMood.trim() || undefined,
      });
    } else if (bookId) {
      store.createCharacterInstance(worldId, {
        bookId,
        name: instName.trim() || '未命名角色',
        status: instStatus,
        portrait,
        biography: instBio,
        currentMood: instMood.trim() || undefined,
      });
    }
    setInstOpen(false);
  };

  // ---- 心情操作 ----
  const openMood = (instId: string) => {
    setMoodInstId(instId);
    setMoodText('');
    setMoodNote('');
    setMoodOpen(true);
  };
  const saveMood = () => {
    if (!moodInstId) return;
    store.addMoodEntry(worldId, {
      characterInstanceId: moodInstId,
      mood: moodText.trim() || '平静',
      note: moodNote.trim() || undefined,
    });
    setMoodOpen(false);
  };

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
        <Typography variant="h6">角色系统</Typography>
        <Typography variant="caption" color="text.secondary">
          总库角色可跨作品（卷）出演；角色卡记录本卷化身与画像、生平、心情时间线。
          {book ? `当前作品：《${book.name}》` : '（未选择作品）'}
        </Typography>
      </Paper>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }}>
        <Tab label={`角色总库(${registry.length})`} value="registry" />
        <Tab label={`本卷角色卡(${bookInstances.length})`} value="instances" />
        <Tab label={`心情时间线(${moodTimeline.length})`} value="mood" />
        <Tab
          label={`跨书联动(${crossBookReport.conflicts.length})`}
          value="crossbook"
        />
      </Tabs>

      {tab === 'registry' && (
        <Box>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            sx={{ mb: 1 }}
            onClick={openNewRegistry}
          >
            新建角色
          </Button>
          {registry.length === 0 ? (
            <Alert severity="info">总库暂无角色，点击「新建角色」创建可跨书出演的人物。</Alert>
          ) : (
            <List>
              {registry.map((e) => {
                const agg = aggByRegistry.get(e.id);
                return (
                  <Paper key={e.id} variant="outlined" sx={{ mb: 1 }}>
                    <ListItem
                      secondaryAction={
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" onClick={() => castToBook(e.id)} title="加入当前作品">
                            <PersonAddIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => openEditRegistry(e.id)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => store.removeRegistryCharacter(worldId, e.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      }
                    >
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="subtitle1">{e.name}</Typography>
                            <Chip size="small" label={e.archetype} />
                            {agg && agg.count > 0 && (
                              <Chip size="small" color="info" label={`出演 ${agg.count} 部`} />
                            )}
                          </Stack>
                        }
                        secondary={
                          <span>
                            {e.summary}
                            {e.tags.length > 0 && ' ｜ ' + e.tags.join('、')}
                          </span>
                        }
                      />
                    </ListItem>
                  </Paper>
                );
              })}
            </List>
          )}
        </Box>
      )}

      {tab === 'instances' && (
        <Box>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            sx={{ mb: 1 }}
            disabled={!bookId}
            onClick={openNewInst}
          >
            新建角色卡
          </Button>
          {!bookId && <Alert severity="warning">请先选择一个作品（卷）再创建角色卡。</Alert>}
          {bookInstances.length === 0 ? (
            <Alert severity="info">
              本卷暂无角色卡。可从「角色总库」点「加入当前作品」，或直接新建。
            </Alert>
          ) : (
            <List>
              {bookInstances.map((c) => (
                <Paper key={c.id} variant="outlined" sx={{ mb: 1 }}>
                  <ListItem
                    secondaryAction={
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" onClick={() => openMood(c.id)} title="记录心情">
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => openEditInst(c.id)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => store.removeCharacterInstance(worldId, c.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    }
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle1">{c.name}</Typography>
                          <Chip size="small" label={STATUS_LABELS[c.status]} />
                          {c.registryId && (
                            <Chip size="small" color="primary" label="源自总库" />
                          )}
                        </Stack>
                      }
                      secondary={
                        <span>
                          {c.currentMood ? `当前心情：${c.currentMood} ｜ ` : ''}
                          {c.portrait?.['要点'] as string}
                          {crossBookByInstance.get(c.id) && (
                            <Alert
                              severity="info"
                              sx={{ mt: 0.5, py: 0 }}
                              variant="outlined"
                            >
                              联动提醒：该角色还出演于 {crossBookByInstance.get(c.id)!.join('、')}，
                              修改请注意跨书一致。
                            </Alert>
                          )}
                        </span>
                      }
                    />
                  </ListItem>
                </Paper>
              ))}
            </List>
          )}
        </Box>
      )}

      {tab === 'mood' && (
        <Box>
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            sx={{ mb: 1 }}
            disabled={bookInstances.length === 0}
            onClick={() => openMood(bookInstances[0]?.id ?? '')}
          >
            记录心情
          </Button>
          {moodTimeline.length === 0 ? (
            <Alert severity="info">本卷暂无心情记录。</Alert>
          ) : (
            <List>
              {moodTimeline.map((e) => {
                const inst = world.characterInstances[e.characterInstanceId];
                return (
                  <Paper key={e.id} variant="outlined" sx={{ mb: 1 }}>
                    <ListItem
                      secondaryAction={
                        <IconButton
                          size="small"
                          onClick={() => store.removeMoodEntry(worldId, e.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                    >
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="subtitle2">{inst?.name ?? '未知角色'}</Typography>
                            <Chip size="small" label={e.mood} color="secondary" />
                            <Typography variant="caption" color="text.secondary">
                              {e.clockLabel}
                            </Typography>
                          </Stack>
                        }
                        secondary={e.note}
                      />
                    </ListItem>
                  </Paper>
                );
              })}
            </List>
          )}
        </Box>
      )}

      {tab === 'crossbook' && (
        <CrossBookPanel
          bundle={world}
          onLocate={(bid) => {
            store.setCurrentBook(worldId, bid);
            setTab('instances');
          }}
        />
      )}

      {/* 总库编辑弹窗 */}
      <Dialog open={registryOpen} onClose={() => setRegistryOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editRegId ? '编辑角色（总库）' : '新建角色（总库）'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="名称"
            value={regName}
            onChange={(e) => setRegName(e.target.value)}
          />
          <TextField
            fullWidth
            margin="dense"
            label="一句话设定（身份/核心标签）"
            value={regArchetype}
            onChange={(e) => setRegArchetype(e.target.value)}
          />
          <TextField
            fullWidth
            margin="dense"
            label="标签（顿号/逗号分隔）"
            value={regTags}
            onChange={(e) => setRegTags(e.target.value)}
          />
          <TextField
            fullWidth
            margin="dense"
            label="概要"
            multiline
            minRows={2}
            value={regSummary}
            onChange={(e) => setRegSummary(e.target.value)}
          />
          <TextField
            fullWidth
            margin="dense"
            label="完整设定（Markdown）"
            multiline
            minRows={4}
            value={regRich}
            onChange={(e) => setRegRich(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegistryOpen(false)}>取消</Button>
          <Button variant="contained" onClick={saveRegistry}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 角色卡编辑弹窗 */}
      <Dialog open={instOpen} onClose={() => setInstOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editInstId ? '编辑角色卡' : '新建角色卡'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="名称"
            value={instName}
            onChange={(e) => setInstName(e.target.value)}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>出场状态</InputLabel>
            <Select
              value={instStatus}
              label="出场状态"
              onChange={(e) => setInstStatus(e.target.value as CharacterInstance['status'])}
            >
              <MenuItem value="active">登场</MenuItem>
              <MenuItem value="minor">配角</MenuItem>
              <MenuItem value="offstage">暂离场</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            margin="dense"
            label="画像要点"
            multiline
            minRows={2}
            value={instPortrait}
            onChange={(e) => setInstPortrait(e.target.value)}
          />
          <TextField
            fullWidth
            margin="dense"
            label="生平（Markdown）"
            multiline
            minRows={3}
            value={instBio}
            onChange={(e) => setInstBio(e.target.value)}
          />
          <TextField
            fullWidth
            margin="dense"
            label="当前心情基调"
            value={instMood}
            onChange={(e) => setInstMood(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstOpen(false)}>取消</Button>
          <Button variant="contained" onClick={saveInst}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 心情弹窗 */}
      <Dialog open={moodOpen} onClose={() => setMoodOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>记录心情</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>角色</InputLabel>
            <Select
              value={moodInstId}
              label="角色"
              onChange={(e) => setMoodInstId(e.target.value)}
            >
              {bookInstances.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="心情"
            value={moodText}
            onChange={(e) => setMoodText(e.target.value)}
          />
          <TextField
            fullWidth
            margin="dense"
            label="备注"
            value={moodNote}
            onChange={(e) => setMoodNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoodOpen(false)}>取消</Button>
          <Button variant="contained" onClick={saveMood}>
            保存
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
