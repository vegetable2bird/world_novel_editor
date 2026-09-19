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
          建设中
        </h3>
        <p className="muted">
          下一阶段落地：书籍枢纽 flow 分离（章节 / 大纲＝写作流；管理＝分卷 / 导出 / 世界绑定）、双线世界 fork（设定态 / 运行态）、以及
          AI 续写与一致性检查。
        </p>
      </div>
    </section>
  );
}
