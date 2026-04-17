/**
 * 中英文混排字数统计
 * CJK 字符每字计 1，拉丁单词每词计 1
 */
export function countWords(content: string): number {
  // 去除 front matter
  const withoutFM = content.replace(/^---[\s\S]*?---\s*\n?/, '');
  // 去除代码块
  const clean = withoutFM
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[.*?\]\(.*?\)/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/[*_~`#>|[\]()]/g, '')
    .trim();

  if (!clean) return 0;

  const cjk = (
    clean.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) ?? []
  ).length;
  const latin = (clean.match(/\b[a-zA-Z''\u00C0-\u024F]+\b/g) ?? []).length;

  return cjk + latin;
}

export function readingTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 300));
}
