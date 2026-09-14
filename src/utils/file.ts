/**
 * 浏览器端文件下载辅助：把文本内容以指定文件名/MIME 触发下载。
 * 从 ExportMenu 抽取为公共工具，供章节导出与整个世界导出复用。
 */
export function downloadText(filename: string, content: string, mime: string): void {
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
