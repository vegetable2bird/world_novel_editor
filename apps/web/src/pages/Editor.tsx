import { useTranslation } from 'react-i18next';

export function Editor() {
  const { t } = useTranslation();
  return (
    <section>
      <div className="eyebrow">写作</div>
      <h1 className="title serif">写作台</h1>
      <p className="lede">极简写作台：左侧章节，中间正文，右侧 AI 辅助与节奏提示；大纲 / 上下文 / AI 副驾以按需浮层呼出，零常驻侧栏。</p>
      <div className="card building">
        <h3 className="section-h" style={{ marginTop: 0 }}>
          即将上线
        </h3>
        <p className="muted">
          正在打磨：正文章节编辑、大纲与上下文浮层、AI 续写与设定一致性检查。世界观与角色管理已可正常使用，可先去「万界」搭建你的世界。
        </p>
      </div>
    </section>
  );
}
