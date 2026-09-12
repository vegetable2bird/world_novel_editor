import MDEditor from '@uiw/react-md-editor';
import { Box } from '@mui/material';

interface Props {
  content: string;
}

/** 生成正文预览（Markdown 渲染）。 */
export default function GenerationPreview({ content }: Props): JSX.Element {
  return (
    <Box
      sx={{
        '& .w-md-editor': {
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
        },
      }}
    >
      <MDEditor.Markdown source={content || '（暂无内容）'} />
    </Box>
  );
}
