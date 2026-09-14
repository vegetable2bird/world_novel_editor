import { useRef, useState } from 'react';
import { Button, Stack, Alert } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { useWorkStore } from '../../store/workStore';
import { useCurrentWorldId } from '../../hooks/useWorldState';
import { exportWorldToFile, importWorldBundle } from '../../services/worldIo';

/**
 * 世界级导入 / 导出菜单（v2 P5）。
 * - 导出：把当前整个 WorldBundle 序列化为 JSON 文件下载（含所有设定/章节/角色）。
 * - 导入：读取 JSON 文件，以全新 id 落库为一个独立世界副本并自动切换过去。
 */
export default function WorldIoMenu(): JSX.Element {
  const worldId = useCurrentWorldId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const onExport = () => {
    if (!worldId) return;
    try {
      exportWorldToFile(worldId);
      setDone('已导出当前世界为 JSON 文件。');
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const newId = importWorldBundle(String(reader.result));
        setDone(`已导入世界（已切换至该世界）。新世界 id 前缀：${newId.slice(0, 8)}`);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
      }
    };
    reader.onerror = () => setError('读取文件失败。');
    reader.readAsText(file);
  };

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button
          startIcon={<DownloadIcon />}
          variant="outlined"
          size="small"
          disabled={!worldId}
          onClick={onExport}
        >
          导出世界（.json）
        </Button>
        <Button
          startIcon={<FileUploadIcon />}
          variant="outlined"
          size="small"
          onClick={() => fileRef.current?.click()}
        >
          导入世界
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={onImportFile}
        />
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {done && <Alert severity="success">{done}</Alert>}
    </Stack>
  );
}
