import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Grid, Button, Alert, Chip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChapterEditor from '../components/editor/ChapterEditor';
import ChapterSidebar from '../components/editor/ChapterSidebar';
import VersionHistory from '../components/editor/VersionHistory';
import ExportMenu from '../components/common/ExportMenu';
import { useCurrentWorld, useCurrentWorldId } from '../hooks/useWorldState';

/**
 * 编辑器页面：章节侧栏 + Markdown 编辑器 + 版本历史，顶部含返回与导出。
 * 串联"AI 生成 -> 人工审改 -> 版本回溯 -> 导出"的收尾闭环。
 */
export default function EditorPage(): JSX.Element {
  const { chapterId } = useParams();
  const worldId = useCurrentWorldId();
  const world = useCurrentWorld();
  const navigate = useNavigate();

  if (!chapterId) {
    navigate('/chapters');
    return <></>;
  }
  if (!worldId || !world || !world.chapters[chapterId]) {
    return (
      <Alert severity="warning">
        章节不存在或世界未选择。
        <Button sx={{ ml: 1 }} onClick={() => navigate('/chapters')}>
          返回章节列表
        </Button>
      </Alert>
    );
  }

  const chapter = world.chapters[chapterId];

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/chapters')}
          >
            章节
          </Button>
          <Typography variant="h6">{chapter.title}</Typography>
          <Chip size="small" label={chapter.status} />
        </Box>
        <ExportMenu chapterId={chapterId} />
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <ChapterSidebar chapterId={chapterId} />
        </Grid>
        <Grid item xs={12} md={6}>
          <ChapterEditor chapterId={chapterId} />
        </Grid>
        <Grid item xs={12} md={3}>
          <VersionHistory chapterId={chapterId} />
        </Grid>
      </Grid>
    </Box>
  );
}
