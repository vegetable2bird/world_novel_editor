/**
 * 描写风格配置数据模型（风格可控的核心）。
 */

/** 风格配置：全局或分卷 */
export interface StyleConfig {
  id: string;
  worldId: string;
  scope: 'global' | 'volume';
  volumeId?: string;
  /** 文风基调，如「雄浑苍凉」「瑰丽诡谲」 */
  tone: string;
  /** 叙事视角，如「第三人称限知」「第一人称」 */
  pov: string;
  /** 节奏，如「张弛有度」「快节奏」 */
  pacing: string;
  /** 修辞偏好，如「少比喻/重白描」 */
  rhetoric: string;
  /** 禁用写法 */
  forbiddenWritings: string[];
  /** 必须回收的伏笔 */
  requiredForeshadows: string[];
  extra: Record<string, unknown>;
}

/** 新建风格配置的输入载荷 */
export interface NewStyleConfigInput {
  scope: 'global' | 'volume';
  volumeId?: string;
  tone?: string;
  pov?: string;
  pacing?: string;
  rhetoric?: string;
  forbiddenWritings?: string[];
  requiredForeshadows?: string[];
  extra?: Record<string, unknown>;
}
