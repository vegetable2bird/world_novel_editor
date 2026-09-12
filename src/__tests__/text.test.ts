import { describe, it, expect } from 'vitest';
import { countWords, truncateToWords, truncateByLength, toSingleLine } from '../utils/text';

const MARKER = '\n…（上下文已截断）';

describe('text utils', () => {
  it('countWords：CJK 逐字、拉丁按词', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('中'.repeat(10))).toBe(10);
    expect(countWords('hello world')).toBe(2);
    // 中文(2) + english(1) + 混合(2) = 5
    expect(countWords('中文english混合')).toBe(5);
  });

  it('truncateByLength：超长按字符硬截断并加标记', () => {
    const out = truncateByLength('abcdefghij', 5);
    expect(out).toContain('截断');
    expect(out).not.toBe('abcdefghij');
  });

  it('toSingleLine：去多余空白', () => {
    expect(toSingleLine('a   b\nc')).toBe('a b c');
    // max=10 → 保留 10 个字符后加 …
    expect(toSingleLine('x'.repeat(100), 10)).toBe('xxxxxxxxxx…');
  });

  // —— 以下为 truncateToWords 的回归测试：验证“按字数预算截断”的准确性 ——
  // 设计意图：10 个中文字、预算 5 字，应恰好在第 5 个字处截断。
  it('truncateToWords：10 个中文字按预算 5 截断到恰好 5 字', () => {
    const input = '中'.repeat(10);
    const out = truncateToWords(input, 5);
    const cut = out.endsWith(MARKER) ? out.slice(0, -MARKER.length) : out;
    expect(cut.length).toBe(5);            // 期望：恰好 5 个字符
    expect(countWords(cut)).toBe(5);       // 截断后字数应不超过预算
  });

  it('truncateToWords：截断后字数不超过预算', () => {
    const input = '天地玄黄宇宙洪荒日月盈昃辰宿列张寒来暑往秋收冬藏'.repeat(3);
    const out = truncateToWords(input, 30);
    const cut = out.endsWith(MARKER) ? out.slice(0, -MARKER.length) : out;
    expect(countWords(cut)).toBeLessThanOrEqual(30);
  });
});
