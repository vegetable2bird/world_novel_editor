/**
 * 文本工具：字数统计与截断。
 * 中文按字计数，西文按词计数（符合"中文字数"直觉）。
 */

const CJK_REGEX = /[一-鿿㐀-䶿豈-﫿]/g;

/** 统计字数：CJK 逐字 + 拉丁文按词。 */
export function countWords(text: string): number {
  if (!text) return 0;
  const cjkCount = (text.match(CJK_REGEX) || []).length;
  const latinPart = text.replace(CJK_REGEX, ' ');
  const latinCount = (latinPart.match(/[A-Za-z0-9]+/g) || []).length;
  return cjkCount + latinCount;
}

/** 按字符长度硬截断（用于上下文预算控制）。 */
export function truncateByLength(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 6))}\n…（上下文已截断）`;
}

// 单字符判定专用：不带 /g 的副本。
// 注意：RegExp.prototype.test() 在带 `g` 标志时是有状态的（会推进 lastIndex），
// 在逐字符循环中复用 CJK_REGEX 会导致"隔一个字符误判"，故这里用无 /g 的匹配。
const CJK_SINGLE = /\p{Script=Han}/u;

/** 按近似字数截断（用于世界观上下文组装）。 */
export function truncateToWords(text: string, maxWords: number): string {
  if (countWords(text) <= maxWords) return text;
  let acc = 0;
  let out = '';
  for (const ch of text) {
    out += ch;
    if (CJK_SINGLE.test(ch)) {
      acc += 1;
    } else if (ch.trim() === '') {
      // 空白不计数
    } else {
      acc += 0.5;
    }
    if (acc >= maxWords) break;
  }
  return `${out}\n…（上下文已截断）`;
}

/** 将任意字符串转成单行、去多余空白的简短标签。 */
export function toSingleLine(text: string, max = 80): string {
  const one = text.replace(/\s+/g, ' ').trim();
  return one.length > max ? `${one.slice(0, max)}…` : one;
}
