import { describe, it, expect } from 'vitest';
import {
  buildStyleBlock,
  buildOperationBlock,
  assembleAIRequest,
  composeMockChapter,
} from '../services/ai/promptBuilder';
import { emptyBundle } from '../store/types';
import type { World } from '../types/world';
import type { StyleConfig } from '../types/style';
import type { OperationResult } from '../types/console';

function mkWorld(): World {
  return { id: 'w', name: '界', createdAt: 't', updatedAt: 't' };
}

const baseStyle: StyleConfig = {
  id: 's', worldId: 'w', scope: 'global',
  tone: '雄浑', pov: '第三人称限知', pacing: '快', rhetoric: '白描',
  forbiddenWritings: ['网络语'], requiredForeshadows: ['伏笔A'], extra: {},
};

describe('promptBuilder', () => {
  it('buildStyleBlock 包含风格要素与伏笔', () => {
    const block = buildStyleBlock(baseStyle, baseStyle.requiredForeshadows);
    expect(block).toContain('雄浑');
    expect(block).toContain('伏笔A');
  });

  it('buildStyleBlock 包含禁用写法', () => {
    const block = buildStyleBlock(baseStyle, []);
    expect(block).toContain('网络语');
    expect(block).toContain('禁用写法');
  });

  it('buildStyleBlock 默认兜底（无 style）', () => {
    const block = buildStyleBlock(undefined, []);
    expect(block).toContain('史诗奇幻');
  });

  it('buildStyleBlock 无 requiredForeshadows 时不出现该字段', () => {
    const block = buildStyleBlock(baseStyle, []);
    expect(block).not.toContain('必须回收的伏笔');
  });

  it('buildOperationBlock 在无推演时给出兜底', () => {
    const block = buildOperationBlock(undefined, undefined);
    expect(block).toContain('暂无操作推演');
  });

  it('buildOperationBlock 输出变量变化与选定走向', () => {
    const result: OperationResult = {
      operationId: 'op1',
      narrativeSummary: '玄天宗北伐',
      affectedEntityIds: ['e1', 'e2'],
      newEvents: [],
      variableDeltas: { v_power: -3, v_morale: 2 },
      proposedDirections: [
        { id: 'd1', label: '乘胜追击', description: '扩大战果', estimatedSummary: '攻势如潮' },
        { id: 'd2', label: '稳固防线', description: '转入守势', estimatedSummary: '僵持' },
      ],
    };
    const block = buildOperationBlock(result, 'd1');
    expect(block).toContain('玄天宗北伐');
    expect(block).toContain('受影响实体：2');
    expect(block).toContain('-3');
    expect(block).toContain('+2');
    expect(block).toContain('作者选定走向');
    expect(block).toContain('乘胜追击');
    expect(block).not.toContain('候选走向');
  });

  it('buildOperationBlock 未选走向时列出候选', () => {
    const result: OperationResult = {
      operationId: 'op1', narrativeSummary: 'x', affectedEntityIds: [], newEvents: [],
      variableDeltas: {}, proposedDirections: [
        { id: 'd1', label: 'A', description: 'a', estimatedSummary: 'a' },
        { id: 'd2', label: 'B', description: 'b', estimatedSummary: 'b' },
      ],
    };
    const block = buildOperationBlock(result, undefined);
    expect(block).toContain('候选走向');
    expect(block).toContain('A');
    expect(block).toContain('B');
  });

  it('assembleAIRequest 三段式齐全', () => {
    const b = emptyBundle(mkWorld());
    b.entities['e1'] = {
      id: 'e1', worldId: 'w', type: 'faction', name: '玄天宗',
      summary: '正道魁首', fields: {}, tags: [], inContext: true, createdAt: 't', updatedAt: 't',
    };
    const req = assembleAIRequest({ bundle: b, style: baseStyle, index: 3, targetWords: 1500 });
    expect(req.contextBlock).toBeTruthy();
    expect(req.operationBlock).toBeTruthy();
    expect(req.styleBlock).toBeTruthy();
    expect(req.systemPrompt).toContain('第3章');
    // 风格参数必须落入 prompt（段3 与 systemPrompt）
    expect(req.styleBlock).toContain('网络语');
    expect(req.styleBlock).toContain('伏笔A');
  });

  it('composeMockChapter 生成占位正文且含伏笔/走向', () => {
    const c = composeMockChapter({
      worldName: '界', tone: '史诗', operationSummary: '战火起',
      selectedDirectionLabel: '乘胜追击', requiredForeshadows: ['伏笔A'], targetWords: 1000,
    });
    expect(c).toContain('离线演示');
    expect(c).toContain('界');
    expect(c).toContain('乘胜追击');
    expect(c).toContain('伏笔A');
    expect(c.startsWith('# 第 X 章')).toBe(true);
  });

  it('composeMockChapter 无走向/无伏笔时仍产出非空 Markdown', () => {
    const c = composeMockChapter({ worldName: '界', tone: '史诗', operationSummary: '战火起', requiredForeshadows: [], targetWords: 1000 });
    expect(c.length).toBeGreaterThan(0);
    expect(c).toContain('离线演示');
  });
});
