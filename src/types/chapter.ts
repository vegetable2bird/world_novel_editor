/**
 * 章节与版本数据模型。
 */

/** 章节（作品的最小叙事单元） */
export interface Chapter {
  id: string;
  worldId: string;
  /** 所属作品（Book）id，章节经作品归属到世界 */
  bookId: string;
  index: number;
  title: string;
  outline?: string;
  /** 当前生效的版本 id */
  currentVersionId: string;
  status: 'draft' | 'revising' | 'published';
  createdAt: string;
  updatedAt: string;
}

/** 章节版本（每次 AI 生成或人工修订都会产生一个新版本，支持回溯） */
export interface ChapterVersion {
  id: string;
  chapterId: string;
  /** Markdown 正文 */
  content: string;
  source: 'ai' | 'human' | 'merged';
  generationRecordId?: string;
  wordCount: number;
  createdAt: string;
  note?: string;
}

/** 新建章节的输入载荷 */
export interface NewChapterInput {
  title: string;
  /** 所属作品 id；缺省时取当前激活作品（或世界首部作品） */
  bookId?: string;
  index?: number;
  outline?: string;
}
