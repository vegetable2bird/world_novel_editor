import { useEffect, useState } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Box, Button, Stack, Typography, Alert } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useWorkStore } from '../../store/workStore';
import { useCurrentWorldId } from '../../hooks/useWorldState';
import { countWords } from '../../utils/text';

interface Props {
  chapterId: string;
}

/**
 * 章节编辑器：基于 @uiw/react-md-editor 的 Markdown 编辑。
 * 本地草稿（draft）独立保存，点"保存修订"才写回 store（产生一条 human 版本，支持回溯）。
 * 作者保留最终裁定权——AI 只是实习生。
 */
export default function ChapterEditor({ chapterId }: Props): JSX.Element {
  const worldId = useCurrentWorldId();
  const currentVersionId = useWorkStore((s) =>
    worldId ? s.worlds[worldId]?.chapters[chapterId]?.currentVersionId : undefined,
  );
  const content = useWorkStore((s) =>
    worldId && currentVersionId
      ? s.worlds[worldId]?.chapterVersions[currentVersionId]?.content
      : undefined,
  );
  const saveChapterVersion = useWorkStore((s) => s.saveChapterVersion);

  const [draft, setDraft] = useState('');

  // 切换章节或版本时重置草稿
  useEffect(() => {
    setDraft(content ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, currentVersionId]);

  if (!worldId) {
    return <Alert severity="info">请先创建世界。</Alert>;
  }

  const handleSave = () => {
    if (!worldId) return;
    saveChapterVersion(worldId, chapterId, {
      content: draft,
      source: 'human',
      note: '人工修订',
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1 }}
      >
        <Typography variant="caption" color="text.secondary">
          字数：{countWords(draft)} ｜ 当前版本：{currentVersionId ?? '—'}
        </Typography>
        <Button
          startIcon={<SaveIcon />}
          variant="contained"
          size="small"
          onClick={handleSave}
        >
          保存修订
        </Button>
      </Stack>
      <Box
        sx={{
          height: 'calc(100vh - 230px)',
          minHeight: 360,
          '& .w-md-editor': { height: '100%' },
        }}
      >
        <MDEditor
          value={draft}
          onChange={(v) => setDraft(v ?? '')}
          preview="live"
          height="100%"
        />
      </Box>
    </Box>
  );
}
