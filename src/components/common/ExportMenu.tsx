import { useState } from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { useWorkStore } from '../../store/workStore';
import { useCurrentWorldId } from '../../hooks/useWorldState';

interface Props {
  chapterId: string;
}

function triggerDownload(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 导出菜单：将当前生效版本导出为 Markdown / 纯文本。
 */
export default function ExportMenu({ chapterId }: Props): JSX.Element {
  const worldId = useCurrentWorldId();
  const chapter = useWorkStore((s) =>
    worldId ? s.worlds[worldId]?.chapters[chapterId] : undefined,
  );
  const version = useWorkStore((s) =>
    worldId && chapter
      ? s.worlds[worldId]?.chapterVersions[chapter.currentVersionId]
      : undefined,
  );
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);

  const base = chapter ? `第${chapter.index}章_${chapter.title}` : 'chapter';
  const content = version?.content ?? '';

  const exportMd = () => {
    triggerDownload(`${base}.md`, content, 'text/markdown;charset=utf-8');
    setAnchor(null);
  };
  const exportTxt = () => {
    triggerDownload(`${base}.txt`, content, 'text/plain;charset=utf-8');
    setAnchor(null);
  };

  return (
    <>
      <Button
        startIcon={<DownloadIcon />}
        variant="outlined"
        size="small"
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        导出
      </Button>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
      >
        <MenuItem onClick={exportMd}>导出 Markdown（.md）</MenuItem>
        <MenuItem onClick={exportTxt}>导出 纯文本（.txt）</MenuItem>
      </Menu>
    </>
  );
}
